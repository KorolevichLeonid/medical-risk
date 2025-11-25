import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useMsal, useIsAuthenticated } from '@azure/msal-react';
import { loginRequest } from '../authConfig';

const ProtectedRoute = ({ children }) => {
  // Temporarily bypass authentication for testing
  // TODO: Re-enable after fixing auth issues
  return children;
};

export default ProtectedRoute;
