import { io } from "socket.io-client";

// Create socket connection with error handling
const socket = io(process.env.REACT_APP_SOCKET_URL || "http://localhost:5000", {
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
  console.log("Socket connection failed:", error.message);
  console.log("Error details:", error);
});

socket.on("connect", () => {
  console.log("Socket connected successfully");
});

socket.on("disconnect", (reason) => {
  console.log("Socket disconnected:", reason);
});

socket.on("reconnect", (attemptNumber) => {
  console.log("Socket reconnected after", attemptNumber, "attempts");
});

socket.on("reconnect_error", (error) => {
  console.log("Socket reconnection failed:", error.message);
});

// Remove auto-connect on import. The socket should only connect when explicitly called after authentication.
// if (typeof window !== 'undefined') {
//   socket.connect();
// }

export { socket };
