import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { UserProvider } from "./context/UserContext";
import { BoardProvider } from "./context/BoardContext";
import Login from "./components/Login";
import Register from "./components/Register";
import Board from "./components/Board";
import ProtectedRoute from "./components/ProtectedRoute";
import ActivityPage from "./components/ActivityPage";
import "./App.css";

function App() {
  return (
    <UserProvider>
      <BoardProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Board />
                </ProtectedRoute>
              }
            />
            <Route
              path="/activity"
              element={
                <ProtectedRoute>
                  <ActivityPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </BrowserRouter>
      </BoardProvider>
    </UserProvider>
  );
}

export default App;