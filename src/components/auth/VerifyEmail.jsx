import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Mail, 
  ArrowRight, 
  ShieldCheck, 
  Send 
} from 'lucide-react';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'error'
  const [message, setMessage] = useState('');
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const [resendError, setResendError] = useState('');
  const [emailInput, setEmailInput] = useState(user?.email || '');

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setStatus('error');
        setMessage('No verification token provided. Please check the link in your email.');
        return;
      }

      try {
        const res = await api.get(`/verify-email?token=${token}`);
        setStatus('success');
        setMessage(res.data?.message || 'Your email address has been successfully verified!');
      } catch (err) {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Invalid or expired verification link. Please request a new link.');
      }
    };

    verifyToken();
  }, [token]);

  const handleResend = async (e) => {
    if (e) e.preventDefault();
    setResending(true);
    setResendMsg('');
    setResendError('');

    try {
      const res = await api.post('/resend-verification', { email: emailInput || user?.email });
      setResendMsg(res.data?.message || 'Verification email sent! Please check your inbox.');
    } catch (err) {
      setResendError(err.response?.data?.message || 'Failed to resend verification email.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-6 bg-slate-50 min-h-[70vh]">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xl space-y-6 text-center">
        {/* State: Verifying */}
        {status === 'verifying' && (
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center mx-auto">
              <RefreshCw className="w-8 h-8 animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Verifying Your Email Address...</h2>
            <p className="text-xs text-slate-500">
              Please wait while we validate your security token.
            </p>
          </div>
        )}

        {/* State: Success */}
        {status === 'success' && (
          <div className="space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-2">
              <span className="badge bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                Account Verified
              </span>
              <h2 className="text-2xl font-bold text-slate-900">Email Confirmed!</h2>
              <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
                {message}
              </p>
            </div>

            <div className="pt-2">
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="btn-primary w-full py-3 text-xs font-bold flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                >
                  <span>Continue to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <Link
                  to="/login"
                  className="btn-primary w-full py-3 text-xs font-bold inline-flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                >
                  <span>Sign In to Your Account</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          </div>
        )}

        {/* State: Error / Expired */}
        {status === 'error' && (
          <div className="space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-200 text-red-500 flex items-center justify-center mx-auto">
              <AlertCircle className="w-9 h-9" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900">Verification Link Issue</h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                {message}
              </p>
            </div>

            {/* Resend Verification Form */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 text-left">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-indigo-600" />
                <span>Request a New Verification Link</span>
              </h4>

              {resendMsg && (
                <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl flex items-center gap-2 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{resendMsg}</span>
                </div>
              )}

              {resendError && (
                <div className="text-xs text-red-800 bg-red-50 border border-red-200 p-2.5 rounded-xl flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <span>{resendError}</span>
                </div>
              )}

              <form onSubmit={handleResend} className="space-y-2">
                <input
                  type="email"
                  required
                  placeholder="Enter your registered email address"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="input-field text-xs bg-white"
                />
                <button
                  type="submit"
                  disabled={resending}
                  className="btn-primary w-full py-2.5 text-xs font-bold flex items-center justify-center gap-2"
                >
                  {resending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Resend Verification Email</span>
                </button>
              </form>
            </div>

            <div className="pt-2">
              <Link to="/login" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline">
                &larr; Back to Login
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
