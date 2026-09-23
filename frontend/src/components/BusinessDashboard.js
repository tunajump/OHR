import React from 'react';
import { useNavigate } from 'react-router-dom';

const BusinessDashboard = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userType');
    navigate('/login');
  };

  return (
    <div>
      <h1>Business Dashboard</h1>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
};

export default BusinessDashboard;