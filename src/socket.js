import { io } from "socket.io-client";

// Always use the backend URL from the environment variable for Socket.IO
// In production, set REACT_APP_SOCKET_URL to your backend's public URL (e.g., https://your-backend.onrender.com)
const socket = io(process.env.REACT_APP_SOCKET_URL, {
  autoConnect: false, // Don't connect automatically
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  timeout: 10000,
  forceNew: true, // Force new connection to avoid conflicts
  withCredentials: true
});

// Handle connection errors with more detail
socket.on("connect_error", (error) => {
  // Optionally handle connection errors here
});

socket.on("connect", () => {
  // Optionally handle successful connection here
});

socket.on("disconnect", (reason) => {
  // Optionally handle disconnects here
});

socket.on("reconnect", (attemptNumber) => {
  // Optionally handle reconnection here
});

socket.on("reconnect_error", (error) => {
  // Optionally handle reconnection errors here
});

export { socket };
