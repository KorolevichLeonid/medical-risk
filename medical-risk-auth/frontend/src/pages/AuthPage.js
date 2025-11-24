import React from 'react';
import { useMsal, useIsAuthenticated } from '@azure/msal-react';
import { useNavigate } from 'react-router-dom';
import { loginRequest } from '../authConfig';
import './AuthPage.css';

export default function AuthPage() {
  const { instance } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = () => {
    instance.loginRedirect(loginRequest).catch(error => {
      console.error("Login failed:", error);
      navigate('/auth-error');
    });
  };

  const handleMockLogin = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/azure-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ azure_token: 'dummy' })
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('token', data.access_token);
        navigate('/dashboard');
      } else {
        console.error('Mock login failed', data);
      }
    } catch (error) {
      console.error('Mock login error', error);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1>Medical Risk Assessment System</h1>
          <p>Система оценки медицинских рисков</p>
        </div>
        
        <div className="auth-card">
          <h2>Войти в систему</h2>
          <p>Используйте ваш корпоративный аккаунт Microsoft для входа</p>
          
          <button
            className="auth-button"
            onClick={handleLogin}
          >
            <img
              src={require('../assets/figma/image4.png')}
              alt="Microsoft"
              className="auth-icon"
            />
            Войти через Microsoft
          </button>

          {window.location.hostname === 'localhost' && (
            <button
              className="auth-button"
              onClick={handleMockLogin}
            >
              Local Mock Login
            </button>
          )}
          
          <div className="auth-info">
            <h3>Первый вход?</h3>
            <p>При первом входе ваш аккаунт будет создан автоматически.</p>
            <p>Для получения доступа к функциям системы обратитесь к администратору для назначения роли.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
