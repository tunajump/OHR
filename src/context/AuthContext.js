import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [isLoading, setIsLoading] = useState(true);
  const [justRegistered, setJustRegistered] = useState(false);

  // Initialize auth state from localStorage on load
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch (err) {
        console.error('Error parsing stored user:', err);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);

    // Listen for unauthorized 401 events
    const handleUnauthorized = () => {
      setToken(null);
      setUser(null);
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/login', { email, password });
      const { token: receivedToken, userId, userType } = response.data;

      const userData = { id: userId, email, userType };

      localStorage.setItem('token', receivedToken);
      localStorage.setItem('user', JSON.stringify(userData));

      setToken(receivedToken);
      setUser(userData);
      setJustRegistered(false);

      return { success: true, user: userData };
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.response?.data?.msg ||
        'Login failed. Please check your credentials.';
      return { success: false, error: message };
    }
  };

  const register = async ({ email, password, userType, name, organizationName, phone }) => {
    setIsLoading(true);
    try {
      const response = await api.post('/register', {
        email,
        password,
        userType,
        name: name || organizationName,
        organizationName: organizationName || name,
        phone,
      });

      // Mark that user has just successfully completed registration
      setJustRegistered(true);

      return { success: true, data: response.data };
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.response?.data?.msg ||
        'Registration failed. Please try again.';
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setJustRegistered(false);
  };

  const setAuthSession = (receivedToken, userData) => {
    localStorage.setItem('token', receivedToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(receivedToken);
    setUser(userData);
    setJustRegistered(false);
  };

  const clearJustRegistered = () => {
    setJustRegistered(false);
  };

  const value = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    isLoading,
    justRegistered,
    login,
    register,
    logout,
    setAuthSession,
    clearJustRegistered,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
