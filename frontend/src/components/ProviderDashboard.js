import React from 'react';
import { useNavigate } from 'react-router-dom';

const ProviderDashboard = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userType');
    navigate('/login');
  };

  return (
    <div>
      <h1>Provider Dashboard</h1>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
};

export default ProviderDashboard;