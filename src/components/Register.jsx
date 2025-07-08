// src/components/Register.jsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function Register() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.status === 201) {
        navigate("/login");
      } else {
        const data = await res.json();
        setError(data.message || "Registration failed");
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
          <h1 className="auth-title">Join Taskify</h1>
          <p className="auth-subtitle">Create your account to get started</p>
        </div>

        <form className="creative-auth-form" onSubmit={handleRegister}>
          <div className="input-group">
            <div className="input-icon">👤</div>
            <input 
              type="text" 
              placeholder="Enter your full name" 
              required 
              value={form.name} 
              onChange={e => setForm({ ...form, name: e.target.value })} 
              className="creative-input"
            />
          </div>
          
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
              placeholder="Create a password" 
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
                Creating account...
              </>
            ) : (
              <>
                <span className="btn-icon">✨</span>
                Create Account
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p className="auth-link-text">
            Already have an account? 
            <Link to="/login" className="creative-link">
              Sign in here
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
