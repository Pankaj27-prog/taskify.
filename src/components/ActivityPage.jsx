import React, { useContext, useState, useRef, useEffect } from "react";
import { BoardContext } from "../context/BoardContext";
import { UserContext } from "../context/UserContext";
import { useNavigate } from "react-router-dom";
import ActivityLog from "./ActivityLog";

export default function ActivityPage() {
  const { activity } = useContext(BoardContext);
  const { user, setUser } = useContext(UserContext);
  const navigate = useNavigate();
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const avatarRef = useRef();

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

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("userEmail");
    navigate("/login");
  };
  const goToBoard = () => {
    navigate("/");
  };

  return (
    <>
      <nav className="app-bar">
        <div className="app-bar-left">
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
          <span className="app-bar-link" onClick={goToBoard}>Back to Board</span>
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
                <span
                  className="app-bar-link"
                  onClick={() => { setAvatarMenuOpen(false); handleLogout(); }}
                >Log out</span>
              </div>
            )}
          </div>
        </div>
      </nav>
      <div className="activity-page-content">
        <h2>Recent Activity</h2>
        <ActivityLog logs={activity} />
      </div>
    </>
  );
} 