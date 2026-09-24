import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  UserPlus, 
  Mail, 
  Lock, 
  Building2, 
  Stethoscope, 
  User, 
  Phone, 
  AlertCircle, 
  ArrowRight,
  Fingerprint,
  ShieldCheck,
  Key
} from 'lucide-react';
import { registerPasswordlessUser, isPasskeySupported } from '../../services/passkeyService';

const Register = () => {
  const [searchParams] = useSearchParams();
  const initialType = searchParams.get('type') === 'provider' ? 'provider' : 'business';
  const [userType, setUserType] = useState(initialType);
  const [authMethod, setAuthMethod] = useState('passkey'); // 'passkey' (default) or 'password'

  const passkeySupported = typeof isPasskeySupported === 'function' ? isPasskeySupported() : false;

  useEffect(() => {
    const paramType = searchParams.get('type');
    if (paramType === 'provider' || paramType === 'business') {
      setUserType(paramType);
    }
  }, [searchParams]);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    organizationName: '',
    phone: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { register, setAuthSession } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = formData.email.trim();
    const trimmedPhone = formData.phone.trim();
    const trimmedName = formData.name.trim();
    const trimmedOrg = formData.organizationName.trim();

    if (!trimmedOrg) {
      setError('Please provide your company or practice name.');
      return;
    }

    if (!trimmedName) {
      setError('Please provide a contact person name.');
      return;
    }

    // Email Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      setError('Please provide a valid email address (e.g. name@company.co.uk).');
      return;
    }

    // Telephone Validation
    const digitsOnly = trimmedPhone.replace(/[^0-9]/g, '');
    const phoneRegex = /^[+]?[\d\s().-]{10,20}$/;
    if (!trimmedPhone || digitsOnly.length < 10 || digitsOnly.length > 15 || !phoneRegex.test(trimmedPhone)) {
      setError('Please provide a valid telephone number with at least 10 digits (e.g. 020 7946 0912).');
      return;
    }

    // PASSKEY (BIOMETRIC) SIGNUP
    if (authMethod === 'passkey' && passkeySupported) {
      setSubmitting(true);
      try {
        const result = await registerPasswordlessUser({
          email: trimmedEmail,
          userType,
          name: trimmedName,
          organizationName: trimmedOrg,
          phone: trimmedPhone
        });

        if (result && result.verified && result.token) {
          const userData = {
            id: result.userId,
            email: result.email,
            userType: result.userType
          };
          if (setAuthSession) {
            setAuthSession(result.token, userData);
          }
          const targetDashboard = result.userType === 'provider' ? '/provider/dashboard' : '/business/dashboard';
          navigate(targetDashboard, { replace: true });
        } else {
          setError(result?.message || 'Passkey registration could not be verified.');
        }
      } catch (err) {
        console.error('Passwordless registration failed:', err);
        setError(err.message || 'Passkey registration cancelled. You can choose "Password" below to register normally.');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // STANDARD PASSWORD SIGNUP
    if (!formData.password) {
      setError('Please enter a password.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    const result = await register({
      email: trimmedEmail,
      password: formData.password,
      userType,
      name: trimmedName,
      organizationName: trimmedOrg,
      phone: trimmedPhone,
    });
    setSubmitting(false);

    if (result.success) {
      navigate('/login', {
        state: {
          registeredEmail: trimmedEmail,
          message: 'Registration completed successfully! Please sign in with your credentials to access your dashboard.',
        },
        replace: true,
      });
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl w-full space-y-7 bg-white p-8 sm:p-10 rounded-2xl shadow-xl border border-slate-100">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 mb-4 shadow-inner">
            <UserPlus className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Create your OHR Account
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Fast, secure onboarding for employers and OH providers
          </p>
        </div>

        {/* User Type Selector */}
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setUserType('business')}
            className={`p-4 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between ${
              userType === 'business'
                ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20 text-blue-900 shadow-sm'
                : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <Building2 className={`w-6 h-6 ${userType === 'business' ? 'text-blue-600' : 'text-slate-400'}`} />
              {userType === 'business' && <span className="w-2 h-2 rounded-full bg-blue-600" />}
            </div>
            <div>
              <div className="font-semibold text-sm">Business Requester</div>
              <div className="text-xs text-slate-500 mt-0.5">Need OH services & employee referrals</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setUserType('provider')}
            className={`p-4 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between ${
              userType === 'provider'
                ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20 text-indigo-900 shadow-sm'
                : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <Stethoscope className={`w-6 h-6 ${userType === 'provider' ? 'text-indigo-600' : 'text-slate-400'}`} />
              {userType === 'provider' && <span className="w-2 h-2 rounded-full bg-indigo-600" />}
            </div>
            <div>
              <div className="font-semibold text-sm">OH Provider</div>
              <div className="text-xs text-slate-500 mt-0.5">Deliver health surveillance & referrals</div>
            </div>
          </button>
        </div>

        {/* Security / Auth Method Toggle */}
        <div className="bg-slate-50 p-1.5 rounded-xl border border-slate-200 flex items-center gap-1 text-xs">
          <button
            type="button"
            onClick={() => setAuthMethod('passkey')}
            className={`flex-1 py-2 px-3 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all ${
              authMethod === 'passkey'
                ? 'bg-white text-blue-700 shadow-xs border border-blue-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Fingerprint className="w-4 h-4 text-blue-600" />
            <span>Passkey / Biometrics (Passwordless)</span>
          </button>
          <button
            type="button"
            onClick={() => setAuthMethod('password')}
            className={`flex-1 py-2 px-3 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all ${
              authMethod === 'password'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Key className="w-4 h-4 text-slate-500" />
            <span>Password</span>
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        {/* Registration Form */}
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="reg-org" className="block text-sm font-medium text-slate-700 mb-1">
                {userType === 'provider' ? 'Practice / Company Name' : 'Company Name'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Building2 className="w-4 h-4" />
                </div>
                <input
                  id="reg-org"
                  name="organizationName"
                  type="text"
                  required
                  value={formData.organizationName}
                  onChange={handleChange}
                  placeholder={userType === 'provider' ? 'Apex Health Ltd' : 'Acme Logistics Ltd'}
                  className="input-field input-with-icon-left"
                />
              </div>
            </div>

            <div>
              <label htmlFor="reg-name" className="block text-sm font-medium text-slate-700 mb-1">
                Contact Person
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="reg-name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Jane Smith"
                  className="input-field input-with-icon-left"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="reg-email" className="block text-sm font-medium text-slate-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="reg-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="contact@company.co.uk"
                  className="input-field input-with-icon-left"
                />
              </div>
            </div>

            <div>
              <label htmlFor="reg-phone" className="block text-sm font-medium text-slate-700 mb-1">
                Telephone (Direct Dial)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  id="reg-phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="020 7946 0912"
                  className="input-field input-with-icon-left"
                />
              </div>
            </div>
          </div>

          {/* Passkey Mode Info vs Password Inputs */}
          {authMethod === 'passkey' ? (
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-xl space-y-1.5 text-xs text-blue-900">
              <div className="font-semibold flex items-center gap-1.5 text-blue-950">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>100% Passwordless Security</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                When you click continue, your device will prompt you to verify with Touch ID, Face ID, or Windows Hello. No passwords to remember or reset.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label htmlFor="reg-password" className="block text-sm font-medium text-slate-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="reg-password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required={authMethod === 'password'}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="input-field input-with-icon-left"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="reg-confirm-password" className="block text-sm font-medium text-slate-700 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="reg-confirm-password"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required={authMethod === 'password'}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="input-field input-with-icon-left"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className={`w-full py-3 px-4 rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                authMethod === 'passkey'
                  ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white'
                  : 'btn-primary'
              }`}
            >
              {submitting ? (
                <span>Setting up account...</span>
              ) : authMethod === 'passkey' ? (
                <>
                  <Fingerprint className="w-5 h-5" />
                  <span>Register with Passkey / Biometrics</span>
                </>
              ) : (
                <>
                  <span>Complete Registration</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="text-center pt-2 border-t border-slate-100">
          <p className="text-sm text-slate-600">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-700 hover:underline">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
