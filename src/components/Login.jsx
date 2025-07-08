import React, { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { UserContext } from "../context/UserContext";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { setUser } = useContext(UserContext);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("userEmail", data.email);
        setUser({ email: data.email });
        navigate("/");
      } else {
        setError(data.message || "Login failed");
      }
    } catch (err) {
      setError("Server error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="creative-auth-container">
      {/* Animated background elements */}
      <div className="auth-bg-elements">
        <div className="floating-shape shape-1"></div>
        <div className="floating-shape shape-2"></div>
        <div className="floating-shape shape-3"></div>
        <div className="floating-shape shape-4"></div>
      </div>
      
      <div className="creative-auth-card">
        {/* Logo and branding */}
        <div className="auth-header">
          <div className="auth-logo">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="24" cy="24" r="22" fill="url(#auth-gradient)" stroke="#fff" strokeWidth="2"/>
              <linearGradient id="auth-gradient" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                <stop stopColor="#3b82f6"/>
                <stop offset="1" stopColor="#1e40af"/>
              </linearGradient>
              <path d="M15 26L21 32L33 18" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="auth-title">Welcome Back</h1>
          <p className="auth-subtitle">Sign in to continue to Taskify</p>
        </div>

        <form className="creative-auth-form" onSubmit={handleLogin}>
          <div className="input-group">
            <div className="input-icon">📧</div>
            <input 
              type="email" 
              placeholder="Enter your email" 
              required 
              value={form.email} 
              onChange={e => setForm({ ...form, email: e.target.value })} 
              className="creative-input"
            />
          </div>
          
          <div className="input-group">
            <div className="input-icon">🔒</div>
            <input 
              type="password" 
              placeholder="Enter your password" 
              required 
              value={form.password} 
              onChange={e => setForm({ ...form, password: e.target.value })} 
              className="creative-input"
            />
          </div>
          
          {error && (
            <div className="creative-error">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}
          
          <button 
            type="submit" 
            className={`creative-submit-btn ${isLoading ? 'loading' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="spinner"></div>
                Signing in...
              </>
            ) : (
              <>
                <span className="btn-icon">🚀</span>
                Sign In
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p className="auth-link-text">
            Don't have an account? 
            <Link to="/register" className="creative-link">
              Create one here
            </Link>
          </p>
        </div>

        {/* Decorative elements */}
        <div className="auth-decoration">
          <div className="decoration-dot dot-1"></div>
          <div className="decoration-dot dot-2"></div>
          <div className="decoration-dot dot-3"></div>
        </div>
      </div>
    </div>
  );
}
