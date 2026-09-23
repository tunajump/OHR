import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="w-full bg-white border-t border-slate-200 py-3.5 px-4 sm:px-6 lg:px-8 text-xs text-[#64748b] shadow-sm">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
        {/* Left: Copyright */}
        <div className="font-medium text-[#475569]">
          &copy; 2026 Tunajump Services Ltd
        </div>

        {/* Right: Contact & Links */}
        <div className="flex flex-wrap items-center gap-5 sm:gap-6 font-medium">
          <a 
            href="mailto:contact@ohreferral.co.uk" 
            className="text-[#475569] hover:text-[#2563eb] transition-colors"
          >
            contact@ohreferral.co.uk
          </a>
          <Link 
            to="/about" 
            className="text-[#475569] hover:text-[#2563eb] transition-colors"
          >
            About Us
          </Link>
          <Link 
            to="/database" 
            className="text-[#475569] hover:text-[#2563eb] transition-colors"
          >
            Database
          </Link>
          <Link 
            to="/legal" 
            className="text-[#475569] hover:text-[#2563eb] transition-colors"
          >
            Legal
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
