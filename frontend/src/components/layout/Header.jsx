import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LogOut, 
  LayoutDashboard, 
  Building2, 
  Stethoscope, 
  Menu, 
  X, 
  CheckCircle2
} from 'lucide-react';

const Header = () => {
  const { isAuthenticated, user, logout, justRegistered, clearJustRegistered } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
    setMobileMenuOpen(false);
  };

  const dashboardPath = user?.userType === 'provider' 
    ? '/dashboard/provider' 
    : '/dashboard/business';

  const homePath = isAuthenticated ? dashboardPath : '/';

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-100 shadow-sm">
      {/* Registration Completed Alert Banner (Shown only if not authenticated) */}
      {justRegistered && !isAuthenticated && (
        <div 
          id="post-registration-banner" 
          className="bg-emerald-600 text-white text-xs sm:text-sm font-medium px-4 py-2 flex items-center justify-between shadow-inner"
        >
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-200" />
            <span>
              Registration completed successfully! Please use the <strong>Login</strong> button to sign in.
            </span>
            <button
              onClick={() => {
                clearJustRegistered();
                navigate('/login');
              }}
              className="ml-auto underline hover:text-emerald-100 font-semibold cursor-pointer"
            >
              Sign In Now &rarr;
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Authentic Logo -> Links to Dashboard for logged in users, or Home landing for guests */}
          <div className="flex items-center">
            <Link to={homePath} className="flex items-center gap-3">
              <img 
                src="/logo.png" 
                alt="OH Referral Logo" 
                className="h-12 w-auto object-contain"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.style.display = 'none';
                }}
              />
            </Link>
          </div>

          {/* Right Navigation & Auth Actions */}
          <div className="hidden md:flex items-center gap-4">
            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                <Link 
                  to={dashboardPath} 
                  className="text-sm font-semibold text-slate-700 hover:text-blue-600 flex items-center gap-1.5 transition-colors"
                >
                  <LayoutDashboard className="w-4 h-4 text-blue-600" />
                  <span>Dashboard</span>
                </Link>

                <div className="flex items-center gap-2 pl-4 border-l border-slate-200 text-xs">
                  <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-medium">
                    {user?.userType === 'provider' ? <Stethoscope className="w-4 h-4 text-blue-600" /> : <Building2 className="w-4 h-4 text-blue-600" />}
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-slate-900 leading-tight truncate max-w-[150px]">{user?.email}</p>
                    <span className="text-[10px] text-slate-500 font-medium capitalize">
                      {user?.userType === 'provider' ? 'OH Provider' : 'Business'}
                    </span>
                  </div>
                </div>

                {/* LOGOUT BUTTON (Only action for logged in user) */}
                <button
                  id="header-logout-btn"
                  onClick={handleLogout}
                  className="px-3.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-full border border-red-200 hover:border-red-300 transition-colors flex items-center gap-1.5 shadow-2xs"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                {/* LOGIN BUTTON */}
                <Link
                  id="header-login-btn"
                  to="/login"
                  className={`relative px-5 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
                    justRegistered
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700 ring-2 ring-emerald-500 ring-offset-2 animate-pulse shadow-md font-semibold'
                      : 'text-blue-600 bg-blue-50/80 hover:bg-blue-100/80'
                  }`}
                >
                  <span>Login</span>
                  {justRegistered && (
                    <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full shadow-sm">
                      Ready
                    </span>
                  )}
                </Link>

                {/* REGISTER BUTTON */}
                <Link
                  id="header-register-btn"
                  to="/register"
                  className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-full shadow-sm transition-colors duration-150"
                >
                  <span>Register</span>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white px-4 pt-3 pb-6 space-y-3">
          {isAuthenticated ? (
            <>
              <Link
                to={dashboardPath}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-semibold text-slate-800 hover:bg-slate-50 flex items-center gap-2"
              >
                <LayoutDashboard className="w-4 h-4 text-blue-600" />
                <span>Dashboard ({user?.userType === 'provider' ? 'Provider' : 'Business'})</span>
              </Link>
              <div className="pt-2 border-t border-slate-100">
                <p className="text-xs text-slate-500 px-3 pb-2">Signed in as {user?.email}</p>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 rounded-md text-base font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-50"
              >
                Home
              </Link>
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center block px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-full"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center block px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-full"
                >
                  Register
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </header>
  );
};

export default Header;
