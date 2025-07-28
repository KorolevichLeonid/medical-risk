import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { MsalProvider } from '@azure/msal-react';
import HomePage from './pages/HomePage';
import AuthPage from './pages/AuthPage';
import ProtectedPage from './pages/ProtectedPage';
import AuthErrorPage from './pages/AuthErrorPage';
import Layout from './components/Layout';
import Signin from './pages/signin';
import Login from './pages/login';

export default function App({ msalInstance }) {
  return (
    <MsalProvider instance={msalInstance}>
      <Router>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/protected" element={<ProtectedPage />} />
            <Route path="/auth-error" element={<AuthErrorPage />} />
            <Route path="/signin" element={<Signin />} />
            <Route path="/login" element={<Login />} />
          </Route>
        </Routes>
      </Router>
    </MsalProvider>
  );
}