Collaborative Kanban Board
https://youtu.be/JnQJRWSK2Jg

🚀 Project Overview
This is a real-time collaborative Kanban board application designed for teams to manage tasks efficiently. Users can register, log in, create and assign tasks, move them across columns, and experience instant updates across all connected clients. The app features Smart Assign for fair task distribution and robust conflict handling for simultaneous edits.

🛠️ Tech Stack
Frontend: React, CSS
Backend: Node.js, Express
Database: MongoDB (Mongoose)
Real-Time: Socket.IO
Authentication: JWT (JSON Web Tokens)

⚙️ Setup & Installation
1. Clone the Repository
     git clone https://github.com/Pankaj27-prog/taskify.
     cd your-repo

2. Backend Setup
     git clone https://github.com/Pankaj27-prog/taskify.
     cd your-repo

4. Frontend Setup
     cd ..
     npm install
     npm start

   - The frontend will run on http://localhost:3000
   - The backend will run on http://localhost:5000

✨ Features & Usage Guide
  
  1. User Registration & Login: Secure authentication with JWT.
  2. Kanban Board: Drag-and-drop tasks between Todo, In Progress, and Done columns.
  3. Task Management: Add, edit, delete, and assign tasks to users.
  4. Smart Assign: Automatically assigns tasks to the user with the fewest active tasks.
  5. Real-Time Sync: All changes are instantly reflected for all users via Socket.IO.
  6. Conflict Handling: Prevents accidental overwrites when multiple users edit the same task.
  7. Activity Log: View recent actions and changes on the board.
     
🧠 Smart Assign & Conflict Handling Logic
   Smart Assign
      Smart Assign ensures tasks are distributed fairly among users. When you click the Smart Assign button on a task, the system:
      Counts the number of active (not done) tasks for each user.
      Finds the user with the fewest active tasks.
      Assigns the task to that user, balancing the workload across the team.
      
   Conflict Handling
      To prevent data loss from simultaneous edits:
      Each task has a version number.
      When a user saves changes, the version is checked.
      If another user has already updated the task, a conflict is detected.
      The user is prompted to resolve the conflict by merging or overwriting changes, ensuring no work is lost.

🌐 Live Demo
    Deployed App
     https://taskify-r4fv.onrender.com
Demo Video: Watch on YouTube
   📹 Demo Video
     https://youtu.be/JnQJRWSK2Jg
