import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useMsal, useIsAuthenticated } from '@azure/msal-react';
import { loginRequest } from '../authConfig';

const ProtectedRoute = ({ children }) => {
  const { instance, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const navigate = useNavigate();
  const location = useLocation();
  const [isBackendAuthenticated, setIsBackendAuthenticated] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    console.log('🔄 ProtectedRoute useEffect triggered');
    console.log('isAuthenticated:', isAuthenticated);
    console.log('accounts:', accounts);
    console.log('accounts.length:', accounts.length);
    
    if (isAuthenticated && accounts.length > 0) {
      console.log('✅ User is authenticated, proceeding with backend auth');
      authenticateWithBackend();
    } else if (isAuthenticated && accounts.length === 0) {
      console.log('⚠️  Authenticated but no accounts found');
      setIsBackendAuthenticated(false);
      setIsLoading(false);
    } else {
      console.log('❌ User not authenticated with Azure');
      setIsBackendAuthenticated(false);
      setIsLoading(false);
    }
  }, [isAuthenticated, accounts]);

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
      const backendResponse = await fetch('http://localhost:8000/api/auth/azure-login', {
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
        const userResponse = await fetch('http://localhost:8000/api/auth/me', {
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

