import React from 'react';
import { Navigate } from 'react-router-dom';

const AuthWrapper = ({ children }) => {
  const token = localStorage.getItem('token');

  console.log('AuthWrapper triggered on:', window.location.pathname);
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // You might want to add a check here to verify the token's validity
  // This could involve decoding the token or making an API call

  return children;
};

export default AuthWrapper;