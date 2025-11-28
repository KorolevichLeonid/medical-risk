import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AuthPage.css';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('token', data.access_token);
        navigate('/dashboard');
      } else {
        alert('Login failed: ' + data.detail);
      }
    } catch (error) {
      console.error('Login error', error);
      alert('Login error');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email })
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('token', data.access_token);
        navigate('/dashboard');
      } else {
        alert('Register failed: ' + data.detail);
      }
    } catch (error) {
      console.error('Register error', error);
      alert('Register error');
    }
  };

  React.useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const [view, setView] = useState('login'); // 'login' or 'register'

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1>Medical Risk Assessment System</h1>
          <p>Система оценки медицинских рисков</p>
        </div>

        <div className="auth-card">
          <div className="auth-tabs">
            <button onClick={() => setView('login')} className={view === 'login' ? 'active' : ''}>Login</button>
            <button onClick={() => setView('register')} className={view === 'register' ? 'active' : ''}>Register</button>
          </div>

          {view === 'login' ? (
            <form onSubmit={handleLogin}>
              <h2>Login</h2>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button type="submit" className="auth-button">Login</button>
            </form>
          ) : (
            <form onSubmit={handleRegister}>
              <h2>Register</h2>
              <input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button type="submit" className="auth-button">Register</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
