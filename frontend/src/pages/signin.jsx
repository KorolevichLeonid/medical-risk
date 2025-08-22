import { useMsal } from '@azure/msal-react';
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './signin.css';

export default function Login() {
  const { instance, accounts } = useMsal();
  const navigate = useNavigate();

  useEffect(() => {
    if (accounts && accounts.length > 0) {
      navigate('/protected', { replace: true });
    }
  }, [accounts, navigate]);

  const handlelogin = () => {
    instance.loginRedirect({
      scopes: ["openid", "profile", "email"]
    }).catch(error => {
      console.error("Login failed:", error);
      window.location.href = '/auth-error';
    });
  };

  const handleLoginRedirect = () => {
    window.location.href = '/login';
  };

  return (
    <div className="figma-signin-bg">
      <div className="figma-signin-container">
        <div className="figma-signin-title">First time?</div>
        <div className="figma-signin-return">return</div>
        <form className="figma-signin-form">
          <label className="figma-signin-label" htmlFor="email">Email</label>
          <div className="figma-signin-input-group">
            <input id="email" type="email" placeholder="Enter your mail address" className="figma-signin-input" />
          </div>
          <label className="figma-signin-label" htmlFor="password">Password</label>
          <div className="figma-signin-input-group">
            <input id="password" type="password" placeholder="Enter password" className="figma-signin-input" />
          </div>
          <label className="figma-signin-label" htmlFor="repeat-password">Repeat password</label>
          <div className="figma-signin-input-group">
            <input id="repeat-password" type="password" placeholder="Enter password" className="figma-signin-input" />
          </div>
          <div className="figma-signin-remember-row">
            <input type="checkbox" id="remember" />
            <label htmlFor="remember" className="figma-signin-remember-label">Remember me</label>
          </div>
          <button type="submit" className="figma-signin-btn">Sign In</button>
        </form>
        <div className="figma-signin-or-row">
          <div className="figma-signin-or-line" />
          <span className="figma-signin-or-text">Or, Sign in with</span>
          <div className="figma-signin-or-line" />
        </div>
        <div className="figma-signin-social-buttons">
          <div className="figma-signin-image3">
            <img src={require('../assets/figma/image3.png')} alt="Social signin option 1" />
          </div>
          <div className="figma-signin-image4"onClick={handlelogin}>
            <img src={require('../assets/figma/image4.png')} alt="Social signin option 2" />
          </div>
          <a href="#" className="figma-signin-register-link" onClick={handleLoginRedirect}>
            Already have an account? Login here
          </a>
        </div>
      </div>
    </div>
  );
}