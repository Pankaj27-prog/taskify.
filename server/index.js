require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');

const app = express();
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://taskify-r4fv.onrender.com'
  ],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"]
}));
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["GET", "POST"]
  },
  // transports: ['websocket', 'polling'], // Removed explicit transports
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000
});
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key'; // Change this in production
const COLUMN_NAMES = ["todo", "in progress", "done"];

app.use(express.json());

// User schema for MongoDB
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Fallback in-memory user store for when MongoDB is not available
const fallbackUsers = [];

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/todo-board')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err.message);
    console.log('Continuing without MongoDB - using in-memory storage');
  });

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  assignedTo: { type: String, required: true },
  status: { type: String, required: true },
  priority: { type: String, required: true },
  assignedBy: { type: String, required: true },
  version: { type: Number, default: 1 }, // Track version for conflict detection
  lastModified: { type: Date, default: Date.now },
  lastModifiedBy: { type: String, required: true },
});

const Task = mongoose.model('Task', taskSchema);

// Activity logging schema
const activitySchema = new mongoose.Schema({
  user: { type: String, required: true },
  actionType: { type: String, required: true },
  description: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  taskId: String, // Optional reference to the task
  taskTitle: String, // Store task title for reference even if task is deleted
});

const Activity = mongoose.model('Activity', activitySchema);

// Middleware to verify JWT
function authenticateToken(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) {
    console.log('[AUTH] No Authorization header');
    return res.status(401).json({ message: 'No token' });
  }
  const token = auth.split(' ')[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    console.log('[AUTH] Invalid token:', err.message);
    res.status(401).json({ message: 'Invalid token' });
  }
}

// Helper function to log activities
async function logActivity(user, actionType, description, taskId = null, taskTitle = null) {
  try {
    const activity = new Activity({
      user,
      actionType,
      description,
      taskId,
      taskTitle,
      timestamp: new Date()
    });
    await activity.save();
    io.emit('activityLogged', activity);
    return activity;
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}

// Online users tracking
const onlineUsers = new Set();

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('error', (err) => {
    console.log('[SOCKET.IO] Error:', err);
  });
  socket.on('connect_error', (err) => {
    console.log('[SOCKET.IO] Connect error:', err);
  });
  // Listen for authentication (client should emit 'authenticate' with token after connecting)
  socket.on('authenticate', (token) => {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const email = decoded.email;
      if (email) {
        socket.userEmail = email;
        onlineUsers.add(email);
        io.emit('onlineUsers', Array.from(onlineUsers));
      }
    } catch (err) {
      // Invalid token, ignore
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    if (socket.userEmail) {
      onlineUsers.delete(socket.userEmail);
      io.emit('onlineUsers', Array.from(onlineUsers));
    }
  });
});

// Register endpoint
app.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: 'Name, email and password required' });
  
  try {
    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      // Use fallback in-memory storage
      if (fallbackUsers.find(u => u.email === email)) {
        return res.status(409).json({ message: 'Email already registered' });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      fallbackUsers.push({ name, email, password: hashedPassword });
      return res.status(201).json({ message: 'User registered (offline mode)' });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(409).json({ message: 'Email already registered' });
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword });
    await user.save();
    
    res.status(201).json({ message: 'User registered' });
  } catch (error) {
    console.error('Error registering user:', error);
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Email already registered' });
    }
    res.status(500).json({ message: 'Error registering user' });
  }
});

// Login endpoint
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      // Use fallback in-memory storage
      const user = fallbackUsers.find(u => u.email === email);
      if (!user) return res.status(401).json({ message: 'Invalid credentials' });
      
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return res.status(401).json({ message: 'Invalid credentials' });
      
      const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '1h' });
      return res.json({ token, email, name: user.name });
    }
    
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });
    
    const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, email, name: user.name });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ message: 'Error during login' });
  }
});

// Protected test route
app.get('/protected', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ message: 'No token' });
  const token = auth.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ message: 'Protected data', user: decoded });
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Get all tasks (protected)
app.get('/tasks', authenticateToken, async (req, res) => {
  console.log('[GET /tasks] Request received');
  try {
    const tasks = await Task.find();
    res.json(tasks);
  } catch (error) {
    console.error('[GET /tasks] Error:', error);
    res.status(500).json({ message: 'Error fetching tasks', error: error.message });
  }
});

// Create a new task (protected)
app.post('/tasks', authenticateToken, async (req, res) => {
  const { title, description, assignedTo, status, priority } = req.body;
  console.log('[POST /tasks] Body:', req.body);
  if (!title || !assignedTo || !status || !priority) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  // Enforce unique title and not matching column names
  const titleLower = title.trim().toLowerCase();
  if (COLUMN_NAMES.includes(titleLower)) {
    return res.status(409).json({ message: 'Task title cannot match a column name.' });
  }
  const existing = await Task.findOne({ title: { $regex: `^${title}$`, $options: 'i' } });
  if (existing) {
    return res.status(409).json({ message: 'Task title must be unique.' });
  }
  
  try {
    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      // Create a mock task for in-memory storage
      const mockTask = {
        _id: Date.now().toString(),
        title,
        description: description || '',
        assignedTo,
        status,
        priority,
        assignedBy: req.user.email
      };
      // Log the activity (this will emit the socket event)
      const mockActivity = {
        _id: Date.now().toString(),
        user: req.user.email,
        actionType: 'Created',
        description: `Created task '${title}'`,
        taskId: mockTask._id,
        taskTitle: title,
        timestamp: new Date()
      };
      io.emit('taskCreated', mockTask);
      // Only emit activityLogged from logActivity
      return res.status(201).json(mockTask);
    }
    
    const task = new Task({
      title,
      description: description || '',
      assignedTo,
      status,
      priority,
      assignedBy: req.user.email,
      lastModifiedBy: req.user.email
    });
    await task.save();
    
    // Log the activity (this will emit the socket event)
    await logActivity(req.user.email, 'Created', `Created task '${title}'`, task._id, title);
    
    io.emit('taskCreated', task);
    res.status(201).json(task);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ message: 'Error creating task' });
  }
});

// Update a task (protected)
app.put('/tasks/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  console.log('[PUT /tasks/:id] Request to update task with id:', id);
  if (!id) {
    return res.status(400).json({ message: 'Missing task ID' });
  }
  
  // Allow both MongoDB ObjectId format and numeric/string IDs for mock tasks
  const isValidMongoId = id.match(/^[0-9a-fA-F]{24}$/);
  const isValidMockId = /^[0-9]+$/.test(id) || id.length > 0;
  
  if (!isValidMongoId && !isValidMockId) {
    return res.status(400).json({ message: 'Invalid task ID format' });
  }
  
  const { title, description, assignedTo, status, priority, version, forceVersion } = req.body;
  console.log('[PUT /tasks/:id] Body:', req.body);
  
  // Enforce unique title and not matching column names (if title is being changed)
  if (title !== undefined) {
    const titleLower = title.trim().toLowerCase();
    if (COLUMN_NAMES.includes(titleLower)) {
      return res.status(409).json({ message: 'Task title cannot match a column name.' });
    }
    const existing = await Task.findOne({ title: { $regex: `^${title}$`, $options: 'i' }, _id: { $ne: id } });
    if (existing) {
      return res.status(409).json({ message: 'Task title must be unique.' });
    }
  }
  
  try {
    // Check if MongoDB is connected and ID is a valid MongoDB ObjectId
    if (mongoose.connection.readyState !== 1 || !isValidMongoId) {
      // Mock update for in-memory storage or non-MongoDB IDs
      const mockTask = {
        _id: id,
        title: title || 'Task',
        description: description || '',
        assignedTo: assignedTo || req.user.email,
        status: status || 'Todo',
        priority: priority || 'Medium',
        assignedBy: req.user.email,
        version: (version || 1) + 1,
        lastModified: new Date(),
        lastModifiedBy: req.user.email
      };
      
      io.emit('taskUpdated', mockTask);
      return res.json(mockTask);
    }
    
    // Get current task to check version (only for MongoDB ObjectIds)
    const currentTask = await Task.findById(id);
    if (!currentTask) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    // Only log for non-test operations to reduce noise
    const isTestOperation = currentTask.title && currentTask.title.includes('Conflict Test Task');
    if (!isTestOperation) {
      console.log('--- UPDATE TASK DEBUG ---');
      console.log('Client version:', version);
      console.log('DB version:', currentTask.version);
    }
    
    // Check for version conflict (only if forceVersion is not set)
    if (version && currentTask.version > version && !forceVersion) {
      if (!isTestOperation) {
        console.log('Conflict detected!');
      }
      return res.status(409).json({ 
        message: 'Conflict detected',
        conflict: {
          currentVersion: currentTask,
          clientVersion: { title, description, assignedTo, status, priority, version },
          conflictType: 'version_mismatch'
        }
      });
    }
    
    // Prepare update with version increment
    const update = {
      version: currentTask.version + 1,
      lastModified: new Date(),
      lastModifiedBy: req.user.email
    };
    
    if (title !== undefined) update.title = title;
    if (description !== undefined) update.description = description;
    if (assignedTo !== undefined) update.assignedTo = assignedTo;
    if (status !== undefined) update.status = status;
    if (priority !== undefined) update.priority = priority;
    
    if (!isTestOperation) {
      console.log('Update object:', update);
    }
    
    const task = await Task.findByIdAndUpdate(id, update, { new: true });
    
    // Log the activity
    await logActivity(req.user.email, 'Edited', `Edited task '${task.title}'`, task._id, task.title);
    
    io.emit('taskUpdated', task);
    res.json(task);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ message: 'Error updating task' });
  }
});

// Delete a task (protected)
app.delete('/tasks/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  console.log('[DELETE /tasks/:id] Request to delete task with id:', id);
  if (!id) {
    return res.status(400).json({ message: 'Missing task ID' });
  }
  
  // Allow both MongoDB ObjectId format and numeric/string IDs for mock tasks
  const isValidMongoId = id.match(/^[0-9a-fA-F]{24}$/);
  const isValidMockId = /^[0-9]+$/.test(id) || id.length > 0;
  
  if (!isValidMongoId && !isValidMockId) {
    return res.status(400).json({ message: 'Invalid task ID format' });
  }
  // Check if MongoDB is connected and ID is a valid MongoDB ObjectId
  if (mongoose.connection.readyState !== 1 || !isValidMongoId) {
    // Mock delete for in-memory storage or non-MongoDB IDs
    const mockTask = {
      _id: id,
      title: 'Mock Task',
      description: 'This was a mock task'
    };
    
    // Log the activity
    await logActivity(req.user.email, 'Deleted', `Deleted task '${mockTask.title}'`, mockTask._id, mockTask.title);
    
    io.emit('taskDeleted', mockTask);
    return res.json({ message: 'Task deleted' });
  }
  
  const task = await Task.findByIdAndDelete(id);
  if (!task) return res.status(404).json({ message: 'Task not found' });
  
  // Log the activity
  await logActivity(req.user.email, 'Deleted', `Deleted task '${task.title}'`, task._id, task.title);
  
  io.emit('taskDeleted', task);
  res.json({ message: 'Task deleted' });
});

// Get activity logs (protected) - returns last 20 actions
app.get('/activities', authenticateToken, async (req, res) => {
  console.log('[GET /activities] Request received');
  try {
    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      return res.json([]); // Return empty array if MongoDB not connected
    }
    const activities = await Activity.find()
      .sort({ timestamp: -1 })
      .limit(20);
    res.json(activities);
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.json([]); // Return empty array on error
  }
});

// Resolve task conflict (protected)
app.post('/tasks/:id/resolve-conflict', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { resolution, mergedData } = req.body;
  console.log('[POST /tasks/:id/resolve-conflict] Request to resolve conflict for task with id:', id);
  console.log('[POST /tasks/:id/resolve-conflict] Body:', req.body);
  
  if (!id) {
    return res.status(400).json({ message: 'Missing task ID' });
  }
  
  // Allow both MongoDB ObjectId format and numeric/string IDs for mock tasks
  const isValidMongoId = id.match(/^[0-9a-fA-F]{24}$/);
  const isValidMockId = /^[0-9]+$/.test(id) || id.length > 0;
  
  if (!isValidMongoId && !isValidMockId) {
    return res.status(400).json({ message: 'Invalid task ID format' });
  }
  
  if (!resolution || !['merge', 'overwrite'].includes(resolution)) {
    return res.status(400).json({ message: 'Invalid resolution type' });
  }
  
  try {
    // Check if MongoDB is connected and ID is a valid MongoDB ObjectId
    if (mongoose.connection.readyState !== 1 || !isValidMongoId) {
      const mockTask = {
        _id: id,
        ...mergedData,
        version: (mergedData.version || 1) + 1,
        lastModified: new Date(),
        lastModifiedBy: req.user.email
      };
      
      io.emit('taskUpdated', mockTask);
      await logActivity(req.user.email, 'Resolved Conflict', `Resolved conflict for task '${mergedData.title}'`, id, mergedData.title);
      return res.json(mockTask);
    }
    
    const currentTask = await Task.findById(id);
    if (!currentTask) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    let updateData;
    if (resolution === 'merge') {
      // Merge the data
      updateData = {
        ...currentTask.toObject(),
        ...mergedData,
        version: currentTask.version + 1,
        lastModified: new Date(),
        lastModifiedBy: req.user.email
      };
    } else {
      // Overwrite with new data
      updateData = {
        ...mergedData,
        version: currentTask.version + 1,
        lastModified: new Date(),
        lastModifiedBy: req.user.email
      };
    }
    
    const task = await Task.findByIdAndUpdate(id, updateData, { new: true });
    
    // Log the conflict resolution
    await logActivity(req.user.email, 'Resolved Conflict', `Resolved conflict for task '${task.title}'`, task._id, task.title);
    
    io.emit('taskUpdated', task);
    res.json(task);
  } catch (error) {
    console.error('Error resolving conflict:', error);
    res.status(500).json({ message: 'Error resolving conflict' });
  }
});

// Log a custom activity (protected) - for drag-drop, assign, etc.
app.post('/activities', authenticateToken, async (req, res) => {
  const { actionType, description, taskId, taskTitle } = req.body;
  console.log('[POST /activities] Body:', req.body);
  if (!actionType || !description) {
    return res.status(400).json({ message: 'Action type and description required' });
  }
  
  try {
    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      // Create a mock activity object for in-memory storage
      const mockActivity = {
        _id: Date.now().toString(),
        user: req.user.email,
        actionType,
        description,
        taskId,
        taskTitle,
        timestamp: new Date()
      };
      io.emit('activityLogged', mockActivity);
      return res.status(201).json(mockActivity);
    }
    
    const activity = await logActivity(req.user.email, actionType, description, taskId, taskTitle);
    res.status(201).json(activity);
  } catch (error) {
    console.error('[POST /activities] Error:', error);
    // Create a mock activity object on error
    const mockActivity = {
      _id: Date.now().toString(),
      user: req.user.email,
      actionType,
      description,
      taskId,
      taskTitle,
      timestamp: new Date()
    };
    io.emit('activityLogged', mockActivity);
    res.status(201).json(mockActivity);
  }
});

// Get all users (no passwords)
app.get('/users', async (req, res) => {
  try {
    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      // Use fallback in-memory storage
      const usersWithoutPasswords = fallbackUsers.map(({ password, ...rest }) => rest);
      return res.json(usersWithoutPasswords);
    }
    
    const users = await User.find({}, { password: 0 }); // Exclude password field
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.json([]); // Return empty array on error
  }
});

// Cleanup test tasks (protected) - for development only
app.delete('/tasks/test-cleanup', authenticateToken, async (req, res) => {
  console.log('[DELETE /tasks/test-cleanup] Request received');
  try {
    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      return res.json({ message: 'Test cleanup completed (no MongoDB)' });
    }
    
    const result = await Task.deleteMany({ 
      title: { $regex: /^Conflict Test Task/ } 
    });
    
    console.log(`[Test Cleanup] Removed ${result.deletedCount} test tasks`);
    res.json({ message: `Removed ${result.deletedCount} test tasks` });
  } catch (error) {
    console.error('[DELETE /tasks/test-cleanup] Error:', error);
    res.status(500).json({ message: 'Error during test cleanup' });
  }
});

// Serve static files from the React app build folder
const path = require('path');
app.use(express.static(path.join(__dirname, '../build')));

// Only handle non-API GET requests (avoid interfering with API routes)
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, '../build', 'index.html'));
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 