import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LogIn, 
  Mail, 
  Lock, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Building2, 
  Stethoscope, 
  ArrowRight, 
  CheckCircle2, 
  Fingerprint,
  ShieldCheck
} from 'lucide-react';
import { loginWithPasskey, isPasskeySupported } from '../../services/passkeyService';

const Login = () => {
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.registeredEmail || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);

  const { login, justRegistered, setAuthSession } = useAuth();
  const navigate = useNavigate();

  const from = location.state?.from?.pathname || null;

  const redirectUser = (userType) => {
    if (from) {
      navigate(from, { replace: true });
    } else if (userType === 'admin') {
      navigate('/admin/database', { replace: true });
    } else if (userType === 'provider') {
      navigate('/dashboard/provider', { replace: true });
    } else {
      navigate('/dashboard/business', { replace: true });
    }
  };

  const handlePasskeyLogin = async () => {
    setError('');
    setPasskeyLoading(true);

    try {
      const data = await loginWithPasskey(email);
      if (data && data.verified && data.token) {
        const userData = {
          id: data.userId,
          email: data.email,
          userType: data.userType
        };
        setAuthSession(data.token, userData);
        redirectUser(data.userType);
      } else {
        setError(data.message || 'Passkey verification failed.');
      }
    } catch (err) {
      console.error('Passkey login error:', err);
      setError(err.message || 'Passkey sign-in cancelled or failed.');
    } finally {
      setPasskeyLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both your email address and password.');
      return;
    }

    setSubmitting(true);
    const result = await login(email, password);
    setSubmitting(false);

    if (result.success) {
      redirectUser(result.user.userType);
    } else {
      setError(result.error);
    }
  };

  const passkeySupported = isPasskeySupported();

  return (
    <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-7 bg-white p-8 sm:p-10 rounded-2xl shadow-xl border border-slate-100">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 mb-4 shadow-inner">
            <LogIn className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Sign in to your account
          </h2>
          <p className="mt-1.5 text-xs text-slate-500">
            Access your referrals, matching queue, and accredited services
          </p>
        </div>

        {/* Passkey 1-Click Login Option */}
        {passkeySupported && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={handlePasskeyLogin}
              disabled={passkeyLoading || submitting}
              className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-md hover:shadow-lg hover:from-blue-700 hover:to-indigo-800 transition-all flex items-center justify-center gap-2.5 disabled:opacity-60 cursor-pointer"
            >
              {passkeyLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying Passkey...</span>
                </>
              ) : (
                <>
                  <Fingerprint className="w-5 h-5" />
                  <span>Sign in with Passkey / Biometrics</span>
                </>
              )}
            </button>
            <p className="text-[11px] text-center text-slate-500 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Instant, passwordless login via Face ID, Touch ID, or PIN</span>
            </p>

            <div className="relative flex items-center justify-center pt-2">
              <div className="border-t border-slate-200 w-full" />
              <span className="bg-white px-3 text-[11px] text-slate-400 font-medium absolute">
                or sign in with password
              </span>
            </div>
          </div>
        )}

        {/* Post-Registration Notification */}
        {(location.state?.message || justRegistered) && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-semibold text-emerald-900">
                  Registration Successful!
                </h3>
                <p className="text-xs text-emerald-700 mt-0.5">
                  {location.state?.message || 'Your account has been created. Please log in with your email and password below.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        {/* Login Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-slate-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.co.uk"
                  className="input-field input-with-icon-left"
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 z-10">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field input-with-icon-left input-with-icon-right"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div>
            <button
              id="login-submit-btn"
              type="submit"
              disabled={submitting}
              className="w-full btn-primary py-2.5 text-base flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Quick Demo Credentials Help */}
        <div className="mt-6 border-t border-slate-100 pt-4">
          <p className="text-xs text-center text-slate-500 mb-2">Supported Account Types:</p>
          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
            <div className="p-2 bg-slate-50 rounded border border-slate-100 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Business Account</span>
            </div>
            <div className="p-2 bg-slate-50 rounded border border-slate-100 flex items-center gap-1.5">
              <Stethoscope className="w-3.5 h-3.5 text-indigo-600" />
              <span>OH Provider Account</span>
            </div>
          </div>
        </div>

        {/* Register Link */}
        <div className="text-center text-sm text-slate-600">
          Don't have an account yet?{' '}
          <Link to="/register" className="font-semibold text-blue-600 hover:text-blue-500 underline">
            Register now
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
