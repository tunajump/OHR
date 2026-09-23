import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Home from './components/home/Home';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import BusinessDashboard from './components/dashboard/BusinessDashboard';
import ProviderDashboard from './components/dashboard/ProviderDashboard';
import BusinessLearnMore from './components/pages/BusinessLearnMore';
import EmployeesLearnMore from './components/pages/EmployeesLearnMore';
import ProvidersLearnMore from './components/pages/ProvidersLearnMore';
import AboutUs from './components/pages/AboutUs';
import Legal from './components/pages/Legal';
import DatabaseViewer from './components/pages/DatabaseViewer';
import { useAuth } from './context/AuthContext';

// Helper for determining a user's home dashboard path
const getDashboardPath = (userType) => {
  if (userType === 'admin') return '/admin/database';
  return userType === 'provider' ? '/dashboard/provider' : '/dashboard/business';
};

// Root route: If logged in, home page is the dashboard; otherwise, public home landing page
const RootRoute = () => {
  const { isAuthenticated, user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="w-8 h-8 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }
  if (isAuthenticated) {
    return <Navigate to={getDashboardPath(user?.userType)} replace />;
  }
  return <Home />;
};

// Auth route: Logged-in users cannot access login or register; redirected to their dashboard
const PublicOnlyRoute = ({ children }) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="w-8 h-8 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }
  if (isAuthenticated) {
    return <Navigate to={getDashboardPath(user?.userType)} replace />;
  }
  return children;
};

// Protected Route Component for Dashboards
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="w-8 h-8 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.userType)) {
    return <Navigate to={getDashboardPath(user?.userType)} replace />;
  }

  return children;
};

function App() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900">
      <Header />
      <main className="flex-1 flex flex-col">
        <Routes>
          {/* Home Route: Dashboard for logged-in users, Landing page for public */}
          <Route path="/" element={<RootRoute />} />

          {/* Login and Register: Only accessible to logged-out users */}
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <Login />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicOnlyRoute>
                <Register />
              </PublicOnlyRoute>
            }
          />

          {/* Learn More Specification Pages */}
          <Route path="/business/learn-more" element={<BusinessLearnMore />} />
          <Route path="/employees/learn-more" element={<EmployeesLearnMore />} />
          <Route path="/providers/learn-more" element={<ProvidersLearnMore />} />

          {/* Public Legal & About Pages */}
          <Route path="/about" element={<AboutUs />} />
          <Route path="/legal" element={<Legal />} />

          {/* Protected Super-User / Admin Database Inspector */}
          <Route
            path="/admin/database"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <DatabaseViewer />
              </ProtectedRoute>
            }
          />
          <Route
            path="/database"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <DatabaseViewer />
              </ProtectedRoute>
            }
          />
          
          {/* Dashboards */}
          <Route
            path="/dashboard/business"
            element={
              <ProtectedRoute allowedRoles={['business', 'admin']}>
                <BusinessDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard/provider"
            element={
              <ProtectedRoute allowedRoles={['provider', 'admin']}>
                <ProviderDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Navigate to={getDashboardPath(user?.userType)} replace />
              </ProtectedRoute>
            }
          />

          {/* Catch all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;
