import React, { useEffect } from 'react';
import { useMsal } from '@azure/msal-react';
import { useNavigate } from 'react-router-dom';
import './login.css';

export default function Login() {
  const { instance, accounts } = useMsal();
  const navigate = useNavigate();

  useEffect(() => {
    if (accounts && accounts.length > 0) {
      navigate('/protected', { replace: true });
    }
  }, [accounts, navigate]);

  const handleLogin = () => {
    instance.loginRedirect({
      scopes: ["openid", "profile", "email"]
    }).catch(error => {
      console.error("Login failed:", error);
      window.location.href = '/auth-error';
    });
  };

  const handleForgotPassword = () => {
    // Здесь можно добавить логику для восстановления пароля
    console.log("Forgot password clicked");
  };

  const handleRegisterRedirect = () => {
    window.location.href = '/signin';
  };

  return (
    <div className="figma-login-bg">
      <div className="figma-login-container">
        <div className="figma-login-title">Welcome back!</div>
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
          <div className="figma-login-remember-row">
            <div className="figma-login-remember-left">
              <input type="checkbox" id="remember" />
              <label htmlFor="remember" className="figma-login-remember-label">Remember me</label>
            </div>
            <a href="#" className="figma-login-forgot-password" onClick={handleForgotPassword}>
              Forgot your password?
            </a>
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
          <div className="figma-login-image4" onClick={handleLogin}>
            <img src={require('../assets/figma/image4.png')} alt="Social login option 2" />
          </div>
        <a href="#" className="figma-login-register-link" onClick={handleRegisterRedirect}>
          Don't have an account? Register here
        </a>
        </div>
      </div>
    </div>
  );
}