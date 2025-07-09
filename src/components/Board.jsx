import React, { useContext, useState, useEffect, useRef } from "react";
import { BoardContext } from "../context/BoardContext";
import { UserContext } from "../context/UserContext";
import { useNavigate } from "react-router-dom";
import TaskCard from "./TaskCard";
import ConflictResolutionModal from "./ConflictResolutionModal";

const columns = [
  { key: "Todo", icon: "📝" },
  { key: "In Progress", icon: "⏳" },
  { key: "Done", icon: "✅" }
];

// Self-check: Simulate conflict handling
let testRunCount = 0;
async function testConflictHandling({ createTask, updateTask, resolveConflict, fetchTasks }) {
  // Prevent multiple test runs
  if (testRunCount > 0) {
    console.log("[Test] Test already run, skipping...");
    return;
  }
  testRunCount++;
  
  console.log("[Test] Starting conflict handling test...");
  
  try {
    // Cleanup any existing test tasks first
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/tasks/test-cleanup`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log("[Test] Cleaned up existing test tasks");
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } catch (error) {
      console.log("[Test] Cleanup failed (server might be down):", error.message);
    }
    
    // 1. Create a new task with a more unique title
    const uniqueTitle = "Conflict Test Task " + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
    const newTask = await createTask({
      title: uniqueTitle,
      description: "Initial description",
      assignedTo: "user1@example.com",
      status: "Todo",
      priority: "Medium"
    });
    
    // Wait a bit for the task to be created
    await new Promise(resolve => setTimeout(resolve, 800));
    await fetchTasks();
    
    console.log("[Test] Created task:", newTask);
    if (!newTask || !newTask._id) {
      console.error("[Test] Task creation failed or no _id. Aborting conflict test.");
      return;
    }
    
    // 2. Simulate two users loading the same task
    const userA = { ...newTask };
    const userB = { ...newTask };
    
    // 3. User A edits and saves first
    userA.description = "Edited by User A";
    const resultA = await updateTask(userA._id, userA);
    console.log("[Test] User A saved:", resultA);
    
    // Wait a bit for the update to propagate
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 4. User B (with stale version) tries to save
    userB.description = "Edited by User B";
    if (!userB._id) {
      console.error("[Test] User B has no _id. Aborting.");
      return;
    }
    
    // Try to update without forceVersion first to trigger conflict
    const resultB = await updateTask(userB._id, userB);
    if (resultB && resultB.conflict) {
      console.log("[Test] Conflict detected as expected:", resultB.conflict);
      
      // 5. Simulate user choosing to merge (keep User B's description, rest from server)
      const merged = {
        ...resultB.conflict.currentVersion,
        description: userB.description
      };
      const resolved = await resolveConflict(userB._id, "merge", merged);
      console.log("[Test] Conflict resolved with merge:", resolved);
      
      // 6. Fetch tasks and verify
      await new Promise(resolve => setTimeout(resolve, 500));
      await fetchTasks();
      console.log("[Test] Final task after merge:", resolved);
      
      // 7. Cleanup the test task
      setTimeout(async () => {
        try {
          const token = localStorage.getItem('token');
          if (token) {
                    await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/tasks/test-cleanup`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
            console.log("[Test] Cleaned up test task after completion");
          }
        } catch (error) {
          console.log("[Test] Final cleanup failed:", error.message);
        }
      }, 2000);
    } else {
      console.error("[Test] Conflict was NOT detected when it should have been. resultB:", resultB);
      
      // Try with forceVersion as fallback to complete the test
      console.log("[Test] Trying fallback with forceVersion...");
      const resultBForce = await updateTask(userB._id, { ...userB, forceVersion: userB.version });
      if (resultBForce) {
        console.log("[Test] Fallback update successful:", resultBForce);
      }
    }
  } catch (error) {
    console.error("[Test] Error during conflict test:", error);
  }
}

export default function Board() {
  const { tasks, setTasks, onlineUsers, addActivity, createTask, updateTask, deleteTask, resolveConflict, fetchTasks } = useContext(BoardContext);
  const { user, setUser } = useContext(UserContext);
  const [dragged, setDragged] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", description: "", status: "Todo", assignedTo: user ? user.email : "", priority: "Medium" });
  const [menuOpen, setMenuOpen] = useState(false);
  const [editModal, setEditModal] = useState({ open: false, task: null });
  const [conflictModal, setConflictModal] = useState({ open: false, conflict: null });
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [addError, setAddError] = useState("");
  const [editError, setEditError] = useState("");
  const [toast, setToast] = useState("");
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const avatarRef = useRef();
  const [showOnlineDropdown, setShowOnlineDropdown] = useState(false);
  const communityRef = useRef();

  // Add debug log for online users
  console.log('Online users:', onlineUsers);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/users`);
        if (res.ok) {
          const data = await res.json();
          setUsers(data);
        }
      } catch (error) {
        console.log("Server not available - using empty users list");
        setUsers([]);
      }
    }
    fetchUsers();
  }, []);

  // Disable the conflict test by default
  useEffect(() => {
    localStorage.setItem('disableConflictTest', 'true'); // Disable conflict test
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    // Only run in development and only once, and only if not disabled
    const testDisabled = localStorage.getItem('disableConflictTest') === 'true';
    if (process.env.NODE_ENV === "development" && testRunCount === 0 && !testDisabled) {
      // Run the test after initial load with a longer delay
      const timer = setTimeout(() => {
        testConflictHandling({ createTask, updateTask, resolveConflict, fetchTasks });
      }, 3000);
      
      // Cleanup timer if component unmounts
      return () => clearTimeout(timer);
    }
  }, [createTask, fetchTasks, resolveConflict, updateTask]); // Added missing dependencies

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (avatarRef.current && !avatarRef.current.contains(event.target)) {
        setAvatarMenuOpen(false);
      }
    }
    if (avatarMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [avatarMenuOpen]);

  // Close online users dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (communityRef.current && !communityRef.current.contains(event.target)) {
        setShowOnlineDropdown(false);
      }
    }
    if (showOnlineDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showOnlineDropdown]);

  useEffect(() => {
    // Assuming 'socket' is available in the context or passed as a prop
    // For now, we'll just log the online users directly as a placeholder
    // In a real app, you'd have a WebSocket context or pass the socket instance
    // console.log('Online users:', onlineUsers); // This line is now redundant as onlineUsers is directly from context
  }, [onlineUsers]); // Add onlineUsers to dependency array

  if (!user) return null;

  const handleDragStart = (task) => setDragged(task);
  const handleDrop = async (status) => {
    if (dragged) {
      await updateTask(dragged._id, { status });
      await addActivity({ 
        actionType: "Moved", 
        description: `Moved '${dragged.title}' to ${status}`,
        taskId: dragged._id,
        taskTitle: dragged.title
      });
      setDragged(null);
    }
  };
  const handleAssign = async (task, assignedTo) => {
    await updateTask(task._id, { assignedTo });
    await addActivity({ 
      actionType: "Assigned", 
      description: `Assigned '${task.title}' to ${assignedTo}`,
      taskId: task._id,
      taskTitle: task.title
    });
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("userEmail");
    navigate("/login");
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    setAddError("");
    if (!newTask.title.trim()) return;
    try {
      const createdTask = await createTask(newTask);
      if (createdTask && createdTask.message) {
        setAddError(createdTask.message);
        // Optionally clear the error after 4 seconds
        setTimeout(() => setAddError(""), 4000);
        return;
      }
      if (createdTask) {
        await addActivity({ 
          actionType: "Created", 
          description: `Created task '${newTask.title}'`,
          taskId: createdTask._id,
          taskTitle: newTask.title
        });
      }
      setShowModal(false);
      setNewTask({ title: "", description: "", status: "Todo", assignedTo: user ? user.email : "", priority: "Medium" });
    } catch (err) {
      setAddError("Failed to create task. See console for details.");
    }
  };

  const goToActivityPage = () => {
    navigate("/activity");
    setMenuOpen(false);
  };

  const handleEditTask = (task) => {
    setEditModal({ open: true, task });
  };
  const handleDeleteTask = async (task) => {
    try {
      await deleteTask(task._id);
      setTasks(prev => prev.filter(t => t._id !== task._id)); // Always remove from UI
      await addActivity({
        actionType: "Deleted",
        description: `Deleted task '${task.title}'`,
        taskId: task._id,
        taskTitle: task.title
      });
    } catch (err) {
      // Silently ignore errors
    }
  };
  const handleUpdateTask = async (e) => {
    e.preventDefault();
    setEditError("");
    const { task } = editModal;
    try {
      const result = await updateTask(task._id, task);
      if (result && result.message) {
        setEditError(result.message);
        if (result.message.toLowerCase().includes("conflict")) {
          setToast("A conflict occurred while updating the task. Please resolve the conflict.");
          setTimeout(() => setToast(""), 3000);
        }
        return;
      }
      if (result && result.conflict) {
        setConflictModal({ open: true, conflict: result.conflict });
        setToast("A conflict was detected. Please resolve it below.");
        setTimeout(() => setToast(""), 3000);
        return;
      }
      if (result) {
        await addActivity({ 
          actionType: "Edited", 
          description: `Edited task '${task.title}'`,
          taskId: task._id,
          taskTitle: task.title
        });
      }
      setEditModal({ open: false, task: null });
    } catch (err) {
      console.error("[UpdateTask] Error updating task:", err, task);
      setEditError("Failed to update task. See console for details.");
    }
  };

  const handleConflictResolved = async (resolvedTask) => {
    await addActivity({ 
      actionType: "Resolved Conflict", 
      description: `Resolved conflict for task '${resolvedTask.title}'`,
      taskId: resolvedTask._id,
      taskTitle: resolvedTask.title
    });
  };

  // Smart Assign logic
  const handleSmartAssign = async (task) => {
    // Count active (not Done) tasks per user
    const activeTasks = tasks.filter(t => t.status !== "Done");
    const userCounts = {};
    users.forEach(u => {
      userCounts[u.email] = 0;
    });
    activeTasks.forEach(t => {
      if (t.assignedTo && userCounts.hasOwnProperty(t.assignedTo)) {
        userCounts[t.assignedTo]++;
      }
    });
    // Find user with fewest active tasks
    let minCount = Infinity;
    let bestUser = null;
    Object.entries(userCounts).forEach(([email, count]) => {
      if (count < minCount) {
        minCount = count;
        bestUser = email;
      }
    });
    if (bestUser) {
      const result = await updateTask(task._id, { assignedTo: bestUser });
      if (result && result.status === 404) {
        setTasks(prev => prev.filter(t => t._id !== task._id)); // Remove from UI if not found
        return;
      }
      await addActivity({
        actionType: "Smart Assigned",
        description: `Smart assigned '${task.title}' to ${bestUser}`,
        taskId: task._id,
        taskTitle: task.title
      });
      setToast(`Task smart assigned to ${bestUser}`);
      setTimeout(() => setToast(""), 3000);
    } else {
      setToast("No users available for smart assign.");
      setTimeout(() => setToast(""), 3000);
    }
  };

  // Manual cleanup function for development
  const handleCleanupTestTasks = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setToast("No authentication token found");
        setTimeout(() => setToast(""), 3000);
        return;
      }

      console.log("[Cleanup] Starting test task cleanup...");
      
      // First try the bulk cleanup endpoint
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/tasks/test-cleanup`, {
          method: 'DELETE',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        console.log("[Cleanup] Response status:", response.status);
        
        if (response.ok) {
          const result = await response.json();
          console.log("[Cleanup] Success:", result);
          setToast(result.message || "Test tasks cleaned up successfully");
          setTimeout(() => setToast(""), 3000);
          await fetchTasks();
          return;
        } else {
          console.log("[Cleanup] Bulk cleanup failed with status:", response.status);
          const errorText = await response.text();
          console.log("[Cleanup] Error response:", errorText);
        }
      } catch (bulkError) {
        console.log("[Cleanup] Bulk cleanup failed, trying individual deletion:", bulkError.message);
      }

      // Fallback: Delete test tasks individually
      console.log("[Cleanup] Using fallback cleanup method...");
      const testTasks = tasks.filter(task => 
        task.title && task.title.includes('Conflict Test Task')
      );
      
      if (testTasks.length === 0) {
        setToast("No test tasks found to clean up");
        setTimeout(() => setToast(""), 3000);
        return;
      }

      let deletedCount = 0;
      for (const task of testTasks) {
        try {
          await deleteTask(task._id);
          deletedCount++;
          console.log(`[Cleanup] Deleted test task: ${task.title}`);
        } catch (error) {
          console.error(`[Cleanup] Failed to delete task ${task.title}:`, error);
        }
      }

      setToast(`Cleaned up ${deletedCount} test tasks using fallback method`);
      setTimeout(() => setToast(""), 3000);
      await fetchTasks();
      
    } catch (error) {
      console.error("[Cleanup] Error:", error);
      setToast("Cleanup failed: " + error.message);
      setTimeout(() => setToast(""), 3000);
    }
  };

  // Toggle conflict test
  const handleToggleConflictTest = () => {
    const currentState = localStorage.getItem('disableConflictTest') === 'true';
    localStorage.setItem('disableConflictTest', (!currentState).toString());
    setToast(`Conflict test ${currentState ? 'enabled' : 'disabled'}. Refresh to apply.`);
    setTimeout(() => setToast(""), 3000);
  };

  return (
    <>
      <nav className="app-bar">
        <div className="app-bar-left">
          <button className="hamburger-menu" onClick={() => setMenuOpen(m => !m)} aria-label="Menu">
            <span />
            <span />
            <span />
          </button>
          <span className="logo-svg" aria-label="Taskify Logo">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="15" fill="url(#taskify-gradient)" stroke="#fff" strokeWidth="2"/>
              <linearGradient id="taskify-gradient" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                <stop stopColor="#3b82f6"/>
                <stop offset="1" stopColor="#2563eb"/>
              </linearGradient>
              <path d="M10 17.5L15 22L23 12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
          <span className="app-name">Taskify</span>
        </div>
        <div className="app-bar-right">
          {process.env.NODE_ENV === "development" && (
            <>
              <span
                className="app-bar-link"
                onClick={handleCleanupTestTasks}
                title="Clean up test tasks"
              >
                🧹 Cleanup
              </span>
              <span
                className="app-bar-link"
                onClick={handleToggleConflictTest}
                title="Toggle conflict test"
              >
                {localStorage.getItem('disableConflictTest') === 'true' ? '✅ Test' : '❌ Test'}
              </span>
            </>
          )}
          <span className="app-bar-link" onClick={goToActivityPage}>Recent Activity</span>
          {/* Community avatar for online users */}
          <div ref={communityRef} style={{ position: 'relative', display: 'inline-block', marginRight: 12 }}>
            <span
              className="community-avatar"
              title="Show online users"
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
                color: '#fff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '1.3rem',
                boxShadow: '0 2px 8px rgba(59,130,246,0.10)',
                border: '2px solid #fff',
                cursor: 'pointer',
                marginRight: 8,
                transition: 'transform 0.15s',
              }}
              onClick={() => setShowOnlineDropdown(v => !v)}
            >
              👥
            </span>
            {showOnlineDropdown && (
              <div className="online-users-dropdown" style={{
                position: 'absolute',
                top: 44,
                right: 0,
                minWidth: 220,
                maxWidth: 320,
                maxHeight: 300,
                overflowY: 'auto',
                background: '#fff',
                borderRadius: 12,
                boxShadow: '0 8px 32px rgba(59,130,246,0.13)',
                padding: '1rem 0.5rem',
                zIndex: 1000,
                border: '1px solid #e2e8f0',
              }}>
                <div style={{ fontWeight: 600, color: '#2563eb', marginBottom: 8, textAlign: 'center' }}>
                  Online Users ({onlineUsers.length})
                </div>
                {onlineUsers.length === 0 && (
                  <div style={{ color: '#64748b', textAlign: 'center', fontSize: '0.98rem' }}>No one online</div>
                )}
                {onlineUsers.map(email => {
                  const namePart = email.split('@')[0];
                  const avatar = namePart[0] ? namePart[0].toUpperCase() : "👤";
                  return (
                    <div key={email} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', borderRadius: 8, transition: 'background 0.2s', cursor: 'default' }}>
                      <span style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
                        color: '#fff',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '1rem',
                        border: '2px solid #fff',
                        boxShadow: '0 2px 8px rgba(59,130,246,0.10)',
                      }}>{avatar}</span>
                      <span style={{ color: '#334155', fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 }}>{email}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {/* Avatar dropdown */}
          <div className="avatar-menu-wrapper" ref={avatarRef} style={{ position: 'relative', display: 'inline-block' }}>
            <span
              className="app-bar-avatar"
              onClick={() => setAvatarMenuOpen((open) => !open)}
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #4f8cff 0%, #2563eb 100%)',
                color: '#fff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '1.2rem',
                cursor: 'pointer',
                boxShadow: avatarMenuOpen ? '0 4px 16px rgba(0,0,0,0.13)' : '0 2px 8px rgba(0,0,0,0.07)',
                border: avatarMenuOpen ? '2px solid #fff' : '2px solid transparent',
                transition: 'box-shadow 0.2s, border 0.2s',
                marginLeft: 12
              }}
              title={user?.email}
            >
              {user && user.email ? user.email[0].toUpperCase() : '👤'}
            </span>
            {avatarMenuOpen && (
              <div className="avatar-dropdown">
                <div className="dropdown-email">{user?.email}</div>
                <div className="dropdown-divider"></div>
                <div className="dropdown-divider dropdown-divider-blue"></div>
                <span
                  className="app-bar-link"
                  onClick={() => { setAvatarMenuOpen(false); handleLogout(); }}
                >Log out</span>
              </div>
            )}
          </div>
        </div>
        {menuOpen && (
          <div className="mobile-menu-dropdown">
            <span className="app-bar-link" onClick={goToActivityPage}>Recent Activity</span>
            <span className="user-email-btn">{user ? user.email : ""}</span>
            <span className="app-bar-link" onClick={handleLogout}>Log out</span>
          </div>
        )}
      </nav>
      <div className="main-content">
        <button
          className="add-task-fab"
          aria-label="Add Task"
          title="Add Task"
          onClick={() => {
            setNewTask({ title: '', description: '', status: 'Todo', assignedTo: user ? user.email : '', priority: 'Medium' });
            setShowModal(true);
          }}
        >
          <span style={{ fontSize: '2.2rem', fontWeight: 700, lineHeight: 1, marginTop: '-2px' }}>+</span>
        </button>
        <div className="board-and-log">
          <div className="board wide-board">
            {columns.map(({ key, icon }) => (
              <div
                className={`column wide-column column-${key.replace(/\s/g, '').toLowerCase()}`}
                key={key}
                onDragOver={e => e.preventDefault()}
                onDrop={() => handleDrop(key)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  height: 'calc(100vh - 200px)', // Adjust based on your header height
                  minHeight: '450px',
                  minWidth: '320px' // Make columns less wide
                }}
              >
                <div className={`column-header creative-header header-${key.replace(/\s/g, '').toLowerCase()}`}>
                  <span className="column-icon">{icon}</span>
                  <span className="column-title">{key}</span>
                </div>
                <div 
                  className="column-content"
                  style={{
                    flex: 1,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    padding: '10px',
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#cbd5e1 #f1f5f9'
                  }}
                >
                  {tasks.filter(t => t.status === key).map((t, index) => (
                    <TaskCard
                      key={`${t._id}-${index}`}
                      task={t}
                      onDragStart={() => handleDragStart(t)}
                      onAssign={handleAssign}
                      users={users}
                      onEdit={() => handleEditTask(t)}
                      onDelete={() => handleDeleteTask(t)}
                      onSmartAssign={handleSmartAssign}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <form className="modal" onClick={e => e.stopPropagation()} onSubmit={handleAddTask}>
            <h2>Add New Task</h2>
            {addError && <div className="form-error">{addError}</div>}
            <input
              type="text"
              placeholder="Task title"
              value={newTask.title}
              onChange={e => {
                setNewTask({ ...newTask, title: e.target.value });
                if (addError) setAddError(""); // Clear error when user starts typing
              }}
              required
            />
            <textarea
              placeholder="Description"
              value={newTask.description}
              onChange={e => setNewTask({ ...newTask, description: e.target.value })}
            />
            <select value={newTask.status} onChange={e => setNewTask({ ...newTask, status: e.target.value })}>
              {columns.map(c => <option key={c.key} value={c.key}>{c.key}</option>)}
            </select>
            <input
              type="email"
              placeholder="Assign to (email)"
              value={newTask.assignedTo}
              onChange={e => setNewTask({ ...newTask, assignedTo: e.target.value })}
              required
            />
            <select value={newTask.priority} onChange={e => setNewTask({ ...newTask, priority: e.target.value })}>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
            <button type="submit">Add Task</button>
          </form>
        </div>
      )}
      {editModal.open && (
        <div className="modal-overlay" onClick={() => setEditModal({ open: false, task: null })}>
          <form className="modal" onClick={e => e.stopPropagation()} onSubmit={handleUpdateTask}>
            <h2>Edit Task</h2>
            {editError && <div className="form-error">{editError}</div>}
            <input
              type="text"
              placeholder="Task title"
              value={editModal.task.title}
              onChange={e => setEditModal(m => ({ ...m, task: { ...m.task, title: e.target.value } }))}
              required
            />
            <textarea
              placeholder="Description"
              value={editModal.task.description}
              onChange={e => setEditModal(m => ({ ...m, task: { ...m.task, description: e.target.value } }))}
            />
            <select value={editModal.task.status} onChange={e => setEditModal(m => ({ ...m, task: { ...m.task, status: e.target.value } }))}>
              {columns.map(c => <option key={c.key} value={c.key}>{c.key}</option>)}
            </select>
            <input
              type="email"
              placeholder="Assign to (email)"
              value={editModal.task.assignedTo}
              onChange={e => setEditModal(m => ({ ...m, task: { ...m.task, assignedTo: e.target.value } }))}
              required
            />
            <select value={editModal.task.priority} onChange={e => setEditModal(m => ({ ...m, task: { ...m.task, priority: e.target.value } }))}>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
            <button type="submit">Update Task</button>
          </form>
        </div>
      )}
      
      <ConflictResolutionModal
        isOpen={conflictModal.open}
        onClose={() => setConflictModal({ open: false, conflict: null })}
        conflict={conflictModal.conflict}
        onResolve={handleConflictResolved}
      />
      {toast && (
        <div style={{
          position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)', background: toast.startsWith('Task smart assigned') ? '#2563eb' : '#e53e3e', color: '#fff', padding: '0.9em 2em', borderRadius: '1.2em', fontWeight: 600, fontSize: '1.1em', zIndex: 9999, boxShadow: '0 2px 12px rgba(0,0,0,0.13)'
        }}>{toast}</div>
      )}
      {/* Debug: Show online users */}
      <div style={{ padding: '8px', background: '#f0f4ff', borderBottom: '1px solid #cbd5e1', fontSize: '0.95em' }}>
        <strong>Online Users:</strong> {onlineUsers && onlineUsers.length > 0 ? onlineUsers.join(', ') : 'None'}
      </div>
    </>
  );
}
