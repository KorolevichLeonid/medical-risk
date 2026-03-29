import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useMsal, useIsAuthenticated } from '@azure/msal-react';
import { InteractionStatus } from '@azure/msal-browser';
import { loginRequest } from '../authConfig';
import API_BASE_URL from '../config';

const ProtectedRoute = ({ children }) => {
  const { instance, accounts, inProgress } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const navigate = useNavigate();
  const location = useLocation();
  const [isBackendAuthenticated, setIsBackendAuthenticated] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    // Wait for MSAL to finish any in-progress interaction before deciding auth state
    if (inProgress !== InteractionStatus.None) {
      return;
    }

    if (isAuthenticated && accounts.length > 0) {
      authenticateWithBackend();
    } else if (!isAuthenticated) {
      setIsBackendAuthenticated(false);
      setIsLoading(false);
    }
    // If isAuthenticated && accounts.length === 0: MSAL still settling, keep loading
  }, [isAuthenticated, accounts, inProgress]);

  const authenticateWithBackend = async () => {
    try {
      console.log('🔐 Starting authentication with backend...');
      console.log('Accounts:', accounts);
      
      // Get Azure token
      const request = {
        ...loginRequest,
        account: accounts[0]
      };
      
      console.log('🎫 Acquiring Azure token...');
      const response = await instance.acquireTokenSilent(request);
      const azureToken = response.accessToken;
      console.log('✅ Azure token acquired successfully');

      // Send Azure token to backend
      console.log('🔄 Sending Azure token to backend...');
      const backendResponse = await fetch(`${API_BASE_URL}/api/auth/azure-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          azure_token: azureToken
        })
      });

      console.log('Backend response status:', backendResponse.status);
      
      if (backendResponse.ok) {
        const data = await backendResponse.json();
        console.log('✅ Backend authentication successful');
        localStorage.setItem('token', data.access_token);
        
        // Get user info from backend
        console.log('👤 Fetching user info...');
        const userResponse = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${data.access_token}`
          }
        });

        console.log('User info response status:', userResponse.status);
        
        if (userResponse.ok) {
          const userData = await userResponse.json();
          console.log('✅ User data received:', userData);
          setUserInfo(userData);
          localStorage.setItem('user', JSON.stringify(userData));
          setIsBackendAuthenticated(true);
        } else {
          const errorText = await userResponse.text();
          console.error('❌ Failed to get user info:', errorText);
          setIsBackendAuthenticated(false);
        }
      } else {
        const errorText = await backendResponse.text();
        console.error('❌ Backend authentication failed:', backendResponse.status, errorText);
        setIsBackendAuthenticated(false);
      }
    } catch (error) {
      console.error('❌ Authentication error:', error);
      setIsBackendAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontFamily: 'Inter, sans-serif'
      }}>
        <div>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #E8E8E8',
            borderTop: '4px solid #4A4A4A',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <p>Authenticating...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isBackendAuthenticated) {
    // Сохраняем путь, куда хотел попасть пользователь, чтобы восстановить его после авторизации
    const intendedPath = location.pathname + location.search;
    if (intendedPath !== '/login' && intendedPath !== '/') {
      sessionStorage.setItem('auth_redirect', intendedPath);
    }
    return <Navigate to="/login" replace />;
  }

  // Show role assignment message if user has no role and is not on account page
  if (userInfo && !userInfo.role && location.pathname !== '/account') {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontFamily: 'Inter, sans-serif',
        flexDirection: 'column',
        textAlign: 'center',
        padding: '20px'
      }}>
        <h2>Добро пожаловать!</h2>
        <p>Ваш аккаунт создан, но роль еще не назначена.</p>
        <p>Обратитесь к администратору для назначения роли.</p>
        <p>Пока что вы можете изменить только настройки своего профиля.</p>
        <button 
          onClick={() => {
            console.log('🔄 Redirecting to account page...');
            navigate('/account');
          }}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginTop: '20px'
          }}
        >
          Перейти к профилю
        </button>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
