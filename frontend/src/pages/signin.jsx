import { useMsal } from '@azure/msal-react';
import React from 'react';
import './signin.css';

export default function Login() {
  const { instance } = useMsal();

  const handleLogin = () => {
    instance.loginRedirect({
      scopes: ["openid", "profile", "email"]
    }).catch(error => {
      console.error("Login failed:", error);
      window.location.href = '/auth-error';
    });
  };
  return (
    <div className="figma-login-bg">
      <div className="figma-login-container">
        <div className="figma-login-header">
          <span className="figma-login-support">Support</span>
        </div>
        <div className="figma-login-image2">
          <img src={require('../assets/figma/image2.png')} alt="Figma visual" />
        </div>
        <div className="figma-login-title">First time?</div>
        <div className="figma-login-return">return</div>
        <form className="figma-login-form">
          <label className="figma-login-label" htmlFor="email">Email</label>
          <div className="figma-login-input-group">
            <input id="email" type="email" placeholder="Enter your mail address" className="figma-login-input" />
          </div>
          <label className="figma-login-label" htmlFor="password">Password</label>
          <div className="figma-login-input-group">
            <input id="password" type="password" placeholder="Enter password" className="figma-login-input" />
          </div>
          <label className="figma-login-label" htmlFor="repeat-password">Repeat password</label>
          <div className="figma-login-input-group">
            <input id="repeat-password" type="password" placeholder="Enter password" className="figma-login-input" />
          </div>
          <div className="figma-login-remember-row">
            <input type="checkbox" id="remember" />
            <label htmlFor="remember" className="figma-login-remember-label">Remember me</label>
          </div>
          <button type="submit" className="figma-login-btn">Sign In</button>
        </form>
        <div className="figma-login-or-row">
          <div className="figma-login-or-line" />
          <span className="figma-login-or-text">Or, Sign in with</span>
          <div className="figma-login-or-line" />
        </div>
        <div className="figma-login-social-buttons">
          <div className="figma-login-image3">
            <img src={require('../assets/figma/image3.png')} alt="Social login option 1" />
          </div>
          <div className="figma-login-image4"onClick={handleLogin}>
            <img src={require('../assets/figma/image4.png')} alt="Social login option 2" />
          </div>
        </div>
      </div>
    </div>
  );
}