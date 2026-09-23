import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-gray-100 mt-auto">
      <div className="container mx-auto py-4 px-4 flex justify-between items-center">
        <p>&copy; 2024 OH Referral</p>
        <nav>
          <Link to="/about" className="text-gray-600 hover:text-gray-800 mr-4">About Us</Link>
          <Link to="/legal" className="text-gray-600 hover:text-gray-800">Legal</Link>
        </nav>
      </div>
    </footer>
  );
};

export default Footer;