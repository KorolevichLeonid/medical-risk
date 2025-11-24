import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useMsal, useIsAuthenticated } from '@azure/msal-react';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import SupportButton from './components/SupportButton';
import HomePage from './pages/HomePage';
import ProductsPage from './pages/ProductsPage';
import AuthPage from './pages/AuthPage';
import AuthErrorPage from './pages/AuthErrorPage';
import Dashboard from './pages/Dashboard';
import ProjectView from './pages/ProjectView';
import ProjectTable from './pages/ProjectTable';
import ProjectForm from './pages/ProjectForm';
import RiskAnalysis from './pages/RiskAnalysis';
import RoleManagement from './pages/RoleManagement';
import PersonalAccount from './pages/PersonalAccount';
import Changelog from './pages/Changelog';
import ChangelogHistory from './pages/ChangelogHistory';
import ChangelogDetail from './pages/ChangelogDetail';
import DocumentView from './pages/DocumentView';
import './App.css';

function App() {
  const { instance, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await instance.initialize();
        // Handle redirect response after login
        instance.handleRedirectPromise().then((response) => {
          if (response) {
            console.log('Login successful:', response);
          }
        }).catch((error) => {
          console.error('Login error:', error);
        });
      } catch (error) {
        console.error('MSAL initialization error:', error);
      }
    };
    initializeApp();
  }, [instance]);

  const PublicPageWrapper = ({ children }) => (
    <>
      {children}
      <SupportButton />
    </>
  );

  return (
    <Router>
      <Routes>
        <Route path="/" element={
          <PublicPageWrapper>
            <HomePage />
          </PublicPageWrapper>
        } />
        <Route path="/products" element={
          <PublicPageWrapper>
            <ProductsPage />
          </PublicPageWrapper>
        } />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/auth-error" element={<AuthErrorPage />} />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/project/:id" element={
          <ProtectedRoute>
            <Layout>
              <ProjectView />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/project/:id/table" element={
          <ProtectedRoute>
            <Layout>
              <ProjectTable />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/project/:id/edit" element={
          <ProtectedRoute>
            <Layout>
              <ProjectForm />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/project/new" element={
          <ProtectedRoute>
            <Layout>
              <ProjectForm />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/project/:id/risks" element={
          <ProtectedRoute>
            <Layout>
              <RiskAnalysis />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/project/:id/documents" element={
          <ProtectedRoute>
            <Layout>
              <DocumentView />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/roles" element={
          <ProtectedRoute>
            <Layout>
              <RoleManagement />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/account" element={
          <ProtectedRoute>
            <Layout>
              <PersonalAccount />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/changelog" element={
          <ProtectedRoute>
            <Layout>
              <Changelog />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/changelog/project/:projectId" element={
          <ProtectedRoute>
            <Layout>
              <ChangelogHistory />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/changelog/change/:changelogId" element={
          <ProtectedRoute>
            <Layout>
              <ChangelogDetail />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
