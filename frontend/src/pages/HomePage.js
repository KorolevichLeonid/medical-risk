import React from 'react';
import { Link } from 'react-router-dom';
import './HomePage.css';

const HomePage = () => {
  return (
    <div className="home-page">
      <div className="home-container">
        <div className="home-content">
          <div className="logo-section">
            <div className="logo">
              <div className="logo-icon">🏥</div>
              <h1>Medical Risk Analysis</h1>
            </div>
            <p className="tagline">
              Professional risk analysis platform for medical devices
            </p>
          </div>

          <div className="features">
            <div className="feature">
              <div className="feature-icon">📊</div>
              <h3>Project Management</h3>
              <p>Organize and track your medical device risk analysis projects</p>
            </div>
            <div className="feature">
              <div className="feature-icon">⚠️</div>
              <h3>Risk Assessment</h3>
              <p>Comprehensive risk evaluation following medical standards</p>
            </div>
            <div className="feature">
              <div className="feature-icon">👥</div>
              <h3>Team Collaboration</h3>
              <p>Work together with your team on risk analysis projects</p>
            </div>
          </div>

          <div className="auth-buttons">
            <Link to="/login" className="btn btn-primary">
              Sign In
            </Link>
            <Link to="/register" className="btn btn-secondary">
              Sign Up
            </Link>
          </div>

          <div className="test-accounts">
            <h4>Getting Started:</h4>
            <div className="account-info">
              <strong>1.</strong> Register a new account using the Sign Up button
            </div>
            <div className="account-info">
              <strong>2.</strong> Wait for admin activation (contact administrator)
            </div>
            <div className="account-info">
              <strong>3.</strong> Login with your credentials after activation
            </div>
            <div className="account-info">
              <strong>Admin Panel:</strong> <a href="http://localhost:8000/admin" target="_blank">localhost:8000/admin</a>
            </div>
          </div>
        </div>

        <div className="home-image">
          <div className="placeholder-image">
            <div className="image-content">
              <h3>Medical Device Risk Analysis</h3>
              <p>Streamline your risk assessment process</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
