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
  ArrowRight
} from 'lucide-react';

const Register = () => {
  const [searchParams] = useSearchParams();
  const initialType = searchParams.get('type') === 'provider' ? 'provider' : 'business';
  const [userType, setUserType] = useState(initialType);

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

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
      // Automatically redirect to login screen with success message
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
      <div className="max-w-xl w-full space-y-8 bg-white p-8 sm:p-10 rounded-2xl shadow-xl border border-slate-100">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 mb-4 shadow-inner">
            <UserPlus className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Create your OHR Account
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Select your account type to get started
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
                Email Address <span className="text-red-500">*</span>
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
                Telephone Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  id="reg-phone"
                  name="phone"
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="020 7946 0912"
                  className="input-field input-with-icon-left"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="reg-pass" className="block text-sm font-medium text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="reg-pass"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="input-field input-with-icon-left"
                />
              </div>
            </div>

            <div>
              <label htmlFor="reg-pass-confirm" className="block text-sm font-medium text-slate-700 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="reg-pass-confirm"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="input-field input-with-icon-left"
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              id="register-submit-btn"
              type="submit"
              disabled={submitting}
              className="w-full btn-primary py-3 text-base flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Creating Account...</span>
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

        {/* Existing User Login Link */}
        <div className="text-center text-sm text-slate-600 border-t border-slate-100 pt-4">
          Already registered?{' '}
          <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-500 underline">
            Sign in here
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
