import React, { createContext, useState, useEffect, useCallback } from "react";
import { socket } from "../socket";

export const BoardContext = createContext();

export function BoardProvider({ children }) {
  const [tasks, setTasks] = useState([]);
  const [activity, setActivity] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);

  // Helper to get auth token
  const getToken = () => localStorage.getItem("token");
  const getUserEmail = () => localStorage.getItem("userEmail");

  // Authenticate socket on connect
  useEffect(() => {
    const token = getToken();
    if (token && !socket.connected) {
      socket.connect();
      socket.emit('authenticate', token);
    }
    return () => {
      socket.disconnect();
    };
  }, []);

  // Listen for onlineUsers event
  useEffect(() => {
    function handleOnlineUsers(users) {
      setOnlineUsers(users);
    }
    socket.on('onlineUsers', handleOnlineUsers);
    return () => {
      socket.off('onlineUsers', handleOnlineUsers);
    };
  }, []);

  const API_URL = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production'
    ? 'https://taskify-r4fv.onrender.com'
    : 'http://localhost:5000');

  // Fetch tasks from backend
  const fetchTasks = useCallback(async () => {
    const token = getToken();
    const userEmail = getUserEmail();
    if (!token || !userEmail) return; // Only fetch if logged in
    
    try {
      const res = await fetch(`${API_URL}/tasks`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("userEmail");
        window.location.href = "/login";
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (error) {
      // Continue with empty tasks array if server is not available
    }
  }, [API_URL]);

  // Fetch activities from backend
  const fetchActivities = useCallback(async () => {
    const token = getToken();
    const userEmail = getUserEmail();
    if (!token || !userEmail) {
      // Only fetch if logged in
      return;
    }
    
    try {
      const res = await fetch(`${API_URL}/activities`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("userEmail");
        window.location.href = "/login";
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setActivity(data);
      } else {
        // Server responded with status
      }
    } catch (error) {
      // Continue with empty activity array if server is not available
    }
  }, [API_URL]);

  // Create a new task
  const createTask = async (task) => {
    const token = getToken();
    try {
      const res = await fetch(`${API_URL}/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(task)
      });
      if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("userEmail");
        window.location.href = "/login";
        return;
      }
      if (res.status === 409) {
        const err = await res.json();
        return { message: err.message || "A task with this title already exists." };
      }
      if (res.ok) {
        const newTask = await res.json();
        setTasks(prev => {
          // Check if task already exists to prevent duplicates
          const exists = prev.some(t => t._id === newTask._id);
          if (exists) {
            return prev.map(t => t._id === newTask._id ? newTask : t);
          }
          return [newTask, ...prev];
        });
        return newTask;
      }
    } catch (error) {
      // Continue with empty tasks array if server is not available
      const mockTask = {
        _id: Date.now().toString(),
        ...task,
        assignedBy: getUserEmail()
      };
      setTasks(prev => [mockTask, ...prev]);
      return mockTask;
    }
  };

  // Update a task
  const updateTask = async (id, updates) => {
    const token = getToken();
    try {
      const currentTask = tasks.find(t => t._id === id);
      if (!currentTask) return; // Defensive: don't update if task not found

      // Always send all required fields
      const requestBody = {
        ...currentTask,
        ...updates,
        version: updates.forceVersion !== undefined
          ? updates.forceVersion
          : (currentTask ? currentTask.version : 1)
      };
      delete requestBody._id;

      const res = await fetch(`${API_URL}/tasks/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });
      if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("userEmail");
        window.location.href = "/login";
        return;
      }
      if (res.status === 409) {
        const err = await res.json();
        if (err.conflict) return { conflict: err.conflict };
        return { message: err.message || "This task was updated by someone else. Please refresh and try again." };
      }
      if (!res.ok && res.status !== 409) {
        let errorText = '';
        try {
          errorText = await res.text();
        } catch (e) {}
        return { error: `Request failed: ${res.status}`, details: errorText };
      }
      if (res.ok) {
        const updated = await res.json();
        setTasks(prev => prev.map(t => t._id === updated._id ? updated : t));
        return updated;
      }
    } catch (error) {
      // Continue with empty tasks array if server is not available
      setTasks(prev => prev.map(t => t._id === id ? { ...t, ...updates, version: (t.version || 1) + 1 } : t));
      return { _id: id, ...updates, version: (updates.version || 1) + 1 };
    }
  };

  // Delete a task
  const deleteTask = async (id) => {
    const token = getToken();
    
    try {
      const res = await fetch(`${API_URL}/tasks/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("userEmail");
        window.location.href = "/login";
        return;
      }
      // Always resolve, never throw or print
      return;
    } catch (error) {
      // Silently ignore all errors
      return;
    }
  };

  // Log activity to backend
  const addActivity = async (action) => {
    const token = getToken();
    if (!token) {
      return;
    }
    
    try {
      const res = await fetch(`${API_URL}/activities`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(action)
      });
      
      if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("userEmail");
        window.location.href = "/login";
        return;
      }
      
      if (res.ok) {
        const newActivity = await res.json();
        // Do not update setActivity here; let the socket event handle it
        return newActivity;
      } else {
        // Server responded with status
      }
    } catch (error) {
      // Log activity locally
      const localActivity = {
        _id: Date.now().toString(),
        user: getUserEmail(),
        ...action,
        timestamp: new Date()
      };
      setActivity(prev => [localActivity, ...prev.slice(0, 19)]); // Keep only 20 activities
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchActivities();
  }, [fetchTasks, fetchActivities]); // Only run once on mount to avoid too many requests

  // Real-time sync with socket.io
  useEffect(() => {
    function handleTaskCreated(task) {
      setTasks(prev => {
        // Check if task already exists to prevent duplicates
        const exists = prev.some(t => t._id === task._id);
        if (exists) {
          return prev.map(t => t._id === task._id ? task : t);
        }
        return [task, ...prev];
      });
    }
    function handleTaskUpdated(task) {
      setTasks(prev => prev.map(t => t._id === task._id ? task : t));
    }
    function handleTaskDeleted(task) {
      setTasks(prev => prev.filter(t => t._id !== task._id));
    }
    function handleActivityLogged(activity) {
      setActivity(prev => {
        // Deduplicate by user, actionType, description, and timestamp (rounded to seconds)
        const isDuplicate = prev.some(a =>
          a.user === activity.user &&
          a.actionType === activity.actionType &&
          a.description === activity.description &&
          new Date(a.timestamp).toISOString().slice(0,19) === new Date(activity.timestamp).toISOString().slice(0,19)
        );
        if (isDuplicate) return prev;
        return [activity, ...prev].slice(0, 20);
      });
    }

    socket.on("taskCreated", handleTaskCreated);
    socket.on("taskUpdated", handleTaskUpdated);
    socket.on("taskDeleted", handleTaskDeleted);
    socket.on("activityLogged", handleActivityLogged);

    // Cleanup: remove listeners on unmount or re-run
    return () => {
      socket.off("taskCreated", handleTaskCreated);
      socket.off("taskUpdated", handleTaskUpdated);
      socket.off("taskDeleted", handleTaskDeleted);
      socket.off("activityLogged", handleActivityLogged);
    };
  }, []);

  // Resolve task conflict
  const resolveConflict = async (taskId, resolution, mergedData) => {
    const token = getToken();
    
    try {
      const res = await fetch(`${API_URL}/tasks/${taskId}/resolve-conflict`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ resolution, mergedData })
      });
      
      if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("userEmail");
        window.location.href = "/login";
        return;
      }
      
      if (res.ok) {
        const resolvedTask = await res.json();
        setTasks(prev => prev.map(t => t._id === taskId ? resolvedTask : t));
        return resolvedTask;
      }
    } catch (error) {
      // Resolve conflict locally
      const resolvedTask = {
        _id: taskId,
        ...mergedData,
        version: (mergedData.version || 1) + 1,
        lastModified: new Date(),
        lastModifiedBy: getUserEmail()
      };
      setTasks(prev => prev.map(t => t._id === taskId ? resolvedTask : t));
      return resolvedTask;
    }
  };

  return (
    <BoardContext.Provider value={{ 
      tasks, 
      setTasks, 
      activity, 
      addActivity, 
      fetchTasks, 
      fetchActivities, 
      createTask, 
      updateTask, 
      deleteTask,
      resolveConflict,
      onlineUsers,
      setOnlineUsers
    }}>
      {children}
    </BoardContext.Provider>
  );
}