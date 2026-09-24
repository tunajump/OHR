import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import PasskeyManager from '../auth/PasskeyManager';
import ProviderSubscriptionManager from './ProviderSubscriptionManager';
import { 
  Stethoscope, 
  MapPin, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ShieldCheck, 
  Compass, 
  RefreshCw, 
  Trash2, 
  Edit3,
  Check, 
  X, 
  CreditCard, 
  Building2,
  Mail, 
  Phone, 
  User, 
  Users, 
  Send,
  Lock,
  Globe,
  Upload,
  Image as ImageIcon,
  ExternalLink
} from 'lucide-react';

const AVAILABLE_SERVICES = [
  'Management Referrals',
  'Health Surveillance',
  'Preplacements',
];

const ProviderDashboard = () => {
  const { user } = useAuth();

  const [matches, setMatches] = useState([]);
  const [locations, setLocations] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [resendingVerification, setResendingVerification] = useState(false);
  const [verificationBannerMsg, setVerificationBannerMsg] = useState('');

  const handleResendVerification = async () => {
    setResendingVerification(true);
    setVerificationBannerMsg('');
    try {
      const res = await api.post('/resend-verification', { email: user?.email });
      setVerificationBannerMsg(res.data?.message || 'Verification email sent! Please check your inbox.');
    } catch (err) {
      setVerificationBannerMsg(err.response?.data?.message || 'Failed to send verification email.');
    } finally {
      setResendingVerification(false);
    }
  };

  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [isSavingLocation, setIsSavingLocation] = useState(false);
  const [requestingMap, setRequestingMap] = useState({});

  // Profile Edit Modal State
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [modalError, setModalError] = useState('');
  const [profileForm, setProfileForm] = useState({
    companyName: '',
    contactPerson: '',
    phone: '',
    logoUrl: '',
    website: '',
    description: ''
  });

  // Keep profileForm in sync whenever profile data or user changes
  useEffect(() => {
    if (profile) {
      setProfileForm({
        companyName: profile.company_name || profile.companyName || profile.name || user?.organizationName || user?.company_name || '',
        contactPerson: profile.contact_person || profile.contactPerson || profile.contact || user?.name || user?.contact_person || '',
        phone: profile.phone || user?.phone || '',
        logoUrl: profile.logo_url || profile.logoUrl || '',
        website: profile.website || '',
        description: profile.description || ''
      });
    } else if (user) {
      setProfileForm(prev => ({
        ...prev,
        companyName: prev.companyName || user?.organizationName || user?.company_name || '',
        contactPerson: prev.contactPerson || user?.name || user?.contact_person || '',
        phone: prev.phone || user?.phone || ''
      }));
    }
  }, [profile, user]);

  // Location form state for both Add and Edit
  const [locationForm, setLocationForm] = useState({
    address: '',
    city: '',
    state: '',
    country: 'United Kingdom',
    postalCode: '',
    coverageRadius: '30',
    services: ['Management Referrals', 'Health Surveillance']
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [matchesRes, locationsRes, profileRes] = await Promise.allSettled([
        api.get('/referrals'),
        api.get('/provider/locations'),
        api.get('/provider/profile')
      ]);

      if (matchesRes.status === 'fulfilled') {
        setMatches(Array.isArray(matchesRes.value.data) ? matchesRes.value.data : []);
      }
      if (locationsRes.status === 'fulfilled') {
        setLocations(Array.isArray(locationsRes.value.data) ? locationsRes.value.data : []);
      }
      if (profileRes.status === 'fulfilled') {
        setProfile(profileRes.value.data);
      }
    } catch (err) {
      console.warn('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenEditProfile = () => {
    setProfileForm({
      companyName: profile?.company_name || profile?.companyName || profile?.name || user?.organizationName || user?.company_name || '',
      contactPerson: profile?.contact_person || profile?.contactPerson || profile?.contact || user?.name || user?.contact_person || '',
      phone: profile?.phone || user?.phone || '',
      logoUrl: profile?.logo_url || profile?.logoUrl || '',
      website: profile?.website || '',
      description: profile?.description || ''
    });
    setModalError('');
    setError('');
    setIsProfileModalOpen(true);
  };

  const handleLogoFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setModalError('Logo image must be smaller than 10MB.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setModalError('Please select a valid image file (PNG, JPG, WebP, SVG).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target.result;
      const img = new Image();
      img.onload = () => {
        // Optimize and resize image using canvas to ensure fast upload and compact storage
        const maxDim = 512;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const isPng = file.type === 'image/png' || file.type === 'image/svg+xml';
        const compressedDataUrl = isPng ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.9);

        setProfileForm((prev) => ({ ...prev, logoUrl: compressedDataUrl }));
        setModalError('');
      };
      img.onerror = () => {
        setProfileForm((prev) => ({ ...prev, logoUrl: rawDataUrl }));
        setModalError('');
      };
      img.src = rawDataUrl;
    };
    reader.onerror = () => {
      setModalError('Failed to read image file.');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setModalError('');
    setIsSavingProfile(true);

    try {
      await api.put('/provider/profile', {
        companyName: profileForm.companyName,
        contactPerson: profileForm.contactPerson,
        phone: profileForm.phone,
        logoUrl: profileForm.logoUrl,
        website: profileForm.website,
        description: profileForm.description
      });
      setSuccessMsg('Company profile updated successfully!');
      setIsProfileModalOpen(false);
      await fetchData();
    } catch (err) {
      const errMsg = err.response?.data?.message || err.response?.data?.msg || err.message || 'Failed to update company profile.';
      setModalError(errMsg);
      setError(errMsg);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleOpenAddLocation = () => {
    setEditingLocation(null);
    setLocationForm({
      address: '',
      city: '',
      state: '',
      country: 'United Kingdom',
      postalCode: '',
      coverageRadius: '30',
      services: ['Management Referrals', 'Health Surveillance']
    });
    setError('');
    setIsLocationModalOpen(true);
  };

  const handleOpenEditLocation = (loc) => {
    setEditingLocation(loc);
    setLocationForm({
      address: loc.address || '',
      city: loc.city || '',
      state: loc.state || '',
      country: loc.country || 'United Kingdom',
      postalCode: loc.postal_code || loc.postalCode || '',
      coverageRadius: String(loc.coverage_radius || loc.coverageRadius || 30),
      services: Array.isArray(loc.services) && loc.services.length > 0 
        ? [...loc.services] 
        : ['Management Referrals', 'Health Surveillance']
    });
    setError('');
    setIsLocationModalOpen(true);
  };

  const handleToggleService = (service) => {
    setLocationForm(prev => {
      const exists = prev.services.includes(service);
      const updated = exists 
        ? prev.services.filter(s => s !== service)
        : [...prev.services, service];
      return { ...prev, services: updated };
    });
  };

  const handleSaveLocation = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setIsSavingLocation(true);

    if (locationForm.services.length === 0) {
      setError('Please select at least one service covered by this clinic location.');
      setIsSavingLocation(false);
      return;
    }

    try {
      if (editingLocation) {
        await api.put(`/provider/location/${editingLocation.id}`, {
          ...locationForm,
          coverageRadius: Number(locationForm.coverageRadius)
        });
        setSuccessMsg(`Clinic location "${locationForm.address || locationForm.city || 'Location'}" updated successfully!`);
      } else {
        await api.post('/provider/location', {
          ...locationForm,
          coverageRadius: Number(locationForm.coverageRadius)
        });
        setSuccessMsg('Clinic location and service capabilities added successfully!');
      }
      setIsLocationModalOpen(false);
      setEditingLocation(null);
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Error saving provider location.');
    } finally {
      setIsSavingLocation(false);
    }
  };

  const handleDeleteLocation = async (locationId) => {
    if (!window.confirm('Are you sure you want to remove this clinic location?')) {
      return;
    }

    try {
      await api.delete(`/provider/location/${locationId}`);
      setSuccessMsg('Clinic location removed successfully.');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove location.');
    }
  };

  const handleToggleSubscription = async () => {
    const nextSubscribed = !profile?.is_subscribed;
    try {
      await api.post('/provider/subscribe', { isSubscribed: nextSubscribed });
      setSuccessMsg(nextSubscribed ? 'Subscription activated! Full enquiry details are now visible.' : 'Subscription paused.');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update subscription.');
    }
  };

  const handleRequestConsideration = async (referralId) => {
    setError('');
    setSuccessMsg('');
    setRequestingMap(prev => ({ ...prev, [referralId]: true }));

    // Optimistically update local state so the button instantly changes to "Requested"
    setMatches(prev => prev.map(m => m.id === referralId ? { 
      ...m, 
      match_status: 'consideration_requested',
      can_request_consideration: false 
    } : m));

    try {
      const res = await api.post(`/referrals/${referralId}/request-consideration`);
      setSuccessMsg(res.data.message || 'Consideration requested successfully! Your clinic is now awaiting business review.');
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to request consideration.');
      await fetchData();
    } finally {
      setRequestingMap(prev => ({ ...prev, [referralId]: false }));
    }
  };

  return (
    <div className="flex-1 bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Top Header & Profile Overview */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="relative group flex-shrink-0">
              {profile?.logo_url ? (
                <img
                  src={profile.logo_url}
                  alt={profile.company_name || 'Practice Logo'}
                  className="w-16 h-16 rounded-2xl object-cover shadow-inner border border-slate-200 bg-white"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-inner">
                  <Stethoscope className="w-8 h-8" />
                </div>
              )}
              <button
                type="button"
                onClick={handleOpenEditProfile}
                title="Change Company Logo & Profile"
                className="absolute -bottom-1 -right-1 p-1 bg-white border border-slate-300 rounded-full shadow-sm text-slate-600 hover:text-indigo-600 hover:border-indigo-400 transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900">
                  {profile?.company_name || user?.organizationName || 'OH Provider Portal'}
                </h1>
                <span className="badge bg-indigo-100 text-indigo-800 border border-indigo-200">
                  Accredited Provider
                </span>
                {profile?.is_subscribed ? (
                  <span className="badge bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Subscribed
                  </span>
                ) : (
                  <span className="badge bg-amber-100 text-amber-800 border border-amber-200">
                    Free Tier
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                <span>
                  Contact: <strong className="text-slate-700">{profile?.contact_person || user?.name || 'Clinic Lead'}</strong>
                </span>
                {profile?.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <strong className="text-slate-700">{profile.phone}</strong>
                  </span>
                )}
                {profile?.website && (
                  <a
                    href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 hover:underline font-medium"
                  >
                    <Globe className="w-3 h-3" />
                    <span>{profile.website.replace(/^https?:\/\//, '')}</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
                <span>
                  Email: <strong className="text-slate-700">{user?.email}</strong>
                </span>
              </div>

              {profile?.description && (
                <p className="text-xs text-slate-600 pt-1 line-clamp-2 max-w-2xl leading-relaxed">
                  {profile.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleOpenEditProfile}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-400 transition-all flex items-center gap-1.5 shadow-xs"
            >
              <Building2 className="w-4 h-4 text-slate-500" />
              <span>Edit Company Profile</span>
            </button>

            <button
              onClick={() => {
                const el = document.getElementById('subscription-manager');
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className={`px-4 py-2 text-xs font-semibold rounded-xl border transition-all flex items-center gap-1.5 ${
                profile?.is_subscribed
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>{profile?.is_subscribed ? 'Active Subscription' : 'Manage Subscription'}</span>
            </button>

            <button
              onClick={handleOpenAddLocation}
              className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Clinic Location</span>
            </button>
          </div>
        </div>

        {/* Email Verification Banner */}
        {user && user.isVerified === false && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200/80 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-start sm:items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-100 text-amber-700 flex-shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-amber-900">Please verify your clinic email address</h4>
                <p className="text-xs text-amber-700 mt-0.5">
                  We sent a confirmation link to <span className="font-semibold">{user.email}</span>. Please verify your email to unlock all referral matching notifications and live business enquiries.
                </p>
                {verificationBannerMsg && (
                  <p className="text-xs font-medium text-amber-900 mt-1.5">{verificationBannerMsg}</p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={resendingVerification}
              className="self-start sm:self-auto px-4 py-2 text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-700 text-white transition-all disabled:opacity-50 whitespace-nowrap shadow-sm"
            >
              {resendingVerification ? 'Sending...' : 'Resend Email'}
            </button>
          </div>
        )}

        {/* Notifications / Alerts */}
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-red-700">{error}</div>
          </div>
        )}

        {successMsg && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-emerald-800">{successMsg}</div>
          </div>
        )}

        {/* Step 1 Callout Banner if no clinic locations configured */}
        {locations.length === 0 && !loading && (
          <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border border-blue-200/80 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-md">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Step 1: Add Your Clinic Location & Coverage Radius
                </h3>
                <p className="text-xs text-slate-600 mt-1 max-w-xl leading-relaxed">
                  Referrals are matched using spatial proximity between business workplace locations and your clinic branches. Add your clinic postcode, coverage radius (e.g. 30 miles), and service capabilities to immediately receive eligible matches!
                </p>
              </div>
            </div>
            <button
              onClick={handleOpenAddLocation}
              className="btn-primary py-2.5 px-5 text-xs font-semibold flex items-center gap-2 whitespace-nowrap shadow-md hover:shadow-lg"
            >
              <Plus className="w-4 h-4" />
              <span>Add First Clinic Location</span>
            </button>
          </div>
        )}

        {/* SECTION 1: Clinic Locations & Location Services */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-indigo-600" />
                <span>Clinic Locations & Services Covered</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Each clinic location specifies its operational coverage radius in miles, address details, and the exact Occupational Health services it handles.
              </p>
            </div>

            <button
              onClick={handleOpenAddLocation}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Location</span>
            </button>
          </div>

          {locations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {locations.map((loc) => (
                <div 
                  key={loc.id}
                  className="p-5 rounded-2xl border border-slate-200/90 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">{loc.address || 'Clinic Branch'}</h3>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">
                          {loc.city && `${loc.city}, `}{loc.postal_code || loc.postalCode}
                        </p>
                      </div>
                      <span className="badge bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-bold">
                        {loc.coverage_radius || loc.coverageRadius || 30} miles radius
                      </span>
                    </div>

                    {/* Geocoded coordinates indicator */}
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5 text-slate-400" />
                      {loc.latitude && loc.longitude ? (
                        <span>Geocoded: {Number(loc.latitude).toFixed(4)}, {Number(loc.longitude).toFixed(4)}</span>
                      ) : (
                        <span className="text-amber-600">Pending geocoding</span>
                      )}
                    </div>

                    {/* Services covered by this specific location */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-200/70">
                      <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                        Services Covered at this Location:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {loc.services && loc.services.length > 0 ? (
                          loc.services.map((svc) => (
                            <span 
                              key={svc} 
                              className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-white text-slate-700 border border-slate-200 shadow-2xs"
                            >
                              {svc}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400 italic">All Standard Services</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 flex items-center justify-between border-t border-slate-200/70">
                    <button
                      type="button"
                      onClick={() => handleOpenEditLocation(loc)}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100/80 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                      title="Edit Address, Postcode, Radius & Services"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Location</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteLocation(loc.id)}
                      className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                      title="Remove Location"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 border border-dashed border-slate-200 rounded-2xl text-center space-y-3">
              <MapPin className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs sm:text-sm text-slate-600">
                No clinic locations registered yet. Add your primary clinic location to begin receiving referral matches.
              </p>
              <button
                onClick={handleOpenAddLocation}
                className="btn-secondary text-xs px-4 py-2 inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Your First Location</span>
              </button>
            </div>
          )}
        </div>

        {/* SECTION 2: Matched Referral Requests Queue */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <span>Available Opportunities & Requests Queue</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Work opportunities matched to your clinic locations and service capabilities. Request consideration from businesses to be selected.
              </p>
            </div>

            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl border border-slate-200 transition-colors"
              title="Refresh Queue"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {!profile?.is_subscribed && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 space-y-1">
                <p className="font-bold">Subscription Required to Request Consideration</p>
                <p>
                  You are viewing available requests within your clinic radius (services required, distance, and number of employees). To request consideration from businesses and be selected for referrals, activate your subscription above.
                </p>
              </div>
            </div>
          )}

          {matches.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Referral ID</th>
                    <th className="py-3 px-4">Service(s) Required</th>
                    <th className="py-3 px-4">Employees Involved</th>
                    <th className="py-3 px-4">Distance from Clinic</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {matches.map((item) => {
                    const isChosen = item.match_status === 'selected' || item.match_status === 'accepted';
                    const isRequested = item.match_status === 'consideration_requested' || item.match_status === 'requested' || Boolean(requestingMap[item.id]);
                    const isNotSelected = item.match_status === 'not_selected';

                    return (
                      <tr key={item.id} className={`hover:bg-slate-50/80 transition-colors ${isChosen ? 'bg-emerald-50/40' : ''}`}>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                          #{item.id}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800 flex flex-wrap gap-1">
                            {item.service_type?.split(',').map((svc) => (
                              <span key={svc.trim()} className="badge bg-blue-50 text-blue-700 border border-blue-200 font-semibold text-[11px]">
                                {svc.trim()}
                              </span>
                            )) || <span className="badge bg-blue-50 text-blue-700 border border-blue-200 font-semibold">Management Referral</span>}
                          </div>
                          {isChosen && (
                            <div className="mt-2 p-2 rounded-lg bg-emerald-100/70 border border-emerald-300/80 space-y-1 text-emerald-950 font-sans">
                              <div className="flex items-center gap-1 font-bold text-emerald-900">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>You Have Been Selected! Employer Contact Unlocked:</span>
                              </div>
                              <div className="text-[11px] grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-0.5">
                                <div><span className="text-emerald-800 font-medium">Company:</span> <strong className="font-bold">{item.company_name || 'Direct Employer'}</strong></div>
                                <div><span className="text-emerald-800 font-medium">Contact:</span> <strong className="font-bold">{item.contact_name || 'HR Manager'}</strong></div>
                                <div><span className="text-emerald-800 font-medium">Email:</span> <a href={`mailto:${item.contact_email}`} className="text-indigo-700 underline font-semibold">{item.contact_email}</a></div>
                                <div><span className="text-emerald-800 font-medium">Phone:</span> <a href={`tel:${item.contact_phone}`} className="text-indigo-700 underline font-semibold">{item.contact_phone}</a></div>
                              </div>
                              {item.notes && (
                                <div className="text-[11px] pt-1 border-t border-emerald-200 text-emerald-900">
                                  <span className="font-medium">Workplace Notes:</span> <em>"{item.notes}"</em>
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            <span>{item.employee_count || 1} {Number(item.employee_count) === 1 ? 'employee' : 'employees'}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-600">
                          {item.distance !== undefined && item.distance !== null ? (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-indigo-500" />
                              <span>{Number(item.distance).toFixed(1)} miles</span>
                            </span>
                          ) : (
                            <span className="text-slate-400">Within radius</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {isChosen ? (
                            <span className="badge bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold flex items-center gap-1 w-max">
                              <CheckCircle2 className="w-3 h-3" />
                              Selected by Business
                            </span>
                          ) : isRequested ? (
                            <span className="badge bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1 w-max">
                              <Clock className="w-3 h-3" />
                              Consideration Requested
                            </span>
                          ) : isNotSelected ? (
                            <span className="badge bg-slate-100 text-slate-600 border border-slate-200 w-max">
                              Another Provider Selected
                            </span>
                          ) : (
                            <span className="badge bg-blue-100 text-blue-800 border border-blue-200 w-max">
                              Available to Request
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {isChosen ? (
                            <a
                              href={`mailto:${item.contact_email}?subject=Occupational Health Appointment - Referral %23${item.id}`}
                              className="btn-primary py-1.5 px-3 text-xs inline-flex items-center gap-1"
                            >
                              <Mail className="w-3.5 h-3.5" />
                              <span>Contact Client</span>
                            </a>
                          ) : isRequested ? (
                            <span className="text-xs text-purple-700 font-semibold italic">
                              Awaiting Employer Decision
                            </span>
                          ) : isNotSelected ? (
                            <span className="text-xs text-slate-400 italic">
                              Closed
                            </span>
                          ) : (
                            <button
                              onClick={() => handleRequestConsideration(item.id)}
                              disabled={!profile?.is_subscribed || Boolean(requestingMap[item.id])}
                              className="btn-primary py-1.5 px-3 text-xs inline-flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
                              title={!profile?.is_subscribed ? 'Activate subscription to request consideration' : 'Submit your clinic for consideration'}
                            >
                              {requestingMap[item.id] ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Send className="w-3.5 h-3.5" />
                              )}
                              <span>Request Consideration</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 border border-dashed border-slate-200 rounded-2xl text-center space-y-2">
              <Clock className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs sm:text-sm text-slate-600 font-medium">
                No active matching referral requests currently in your area.
              </p>
              {locations.length > 0 && (
                <p className="text-xs text-slate-500">
                  Make sure your registered clinic postcodes and coverage radiuses encompass the areas you want to serve.
                </p>
              )}
            </div>
          )}
        </div>

        {/* SECTION 3: Radius-Based Cumulative Subscription Management */}
        <div id="subscription-manager">
          <ProviderSubscriptionManager 
            locations={locations} 
            profile={profile} 
            onSubscriptionUpdated={fetchData} 
            onEditLocation={handleOpenEditLocation}
          />
        </div>

        {/* Passkeys & Biometric Security Management */}
        <PasskeyManager />
      </div>

      {/* Add / Edit Location Modal with Multi-Service Selection */}
      {isLocationModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative">
            <button
              onClick={() => setIsLocationModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                {editingLocation ? <Edit3 className="w-5 h-5" /> : <MapPin className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {editingLocation ? 'Edit Clinic Location & Coverage' : 'Add Clinic Location'}
                </h3>
                <p className="text-xs text-slate-500">
                  {editingLocation ? 'Update clinic address, postcode, coverage radius, and services' : 'Configure clinic coverage radius and supported OH services'}
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveLocation} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Street Address / Clinic Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 10 St Pauls Square"
                  value={locationForm.address}
                  onChange={(e) => setLocationForm({ ...locationForm, address: e.target.value })}
                  className="input-field"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    City / Town *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. London"
                    value={locationForm.city}
                    onChange={(e) => setLocationForm({ ...locationForm, city: e.target.value })}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    UK Postcode *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. EC1A 1BB"
                    value={locationForm.postalCode}
                    onChange={(e) => setLocationForm({ ...locationForm, postalCode: e.target.value.toUpperCase() })}
                    className="input-field font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Coverage Radius (Miles from this clinic)
                </label>
                <select
                  value={locationForm.coverageRadius}
                  onChange={(e) => setLocationForm({ ...locationForm, coverageRadius: e.target.value })}
                  className="input-field"
                >
                  <option value="10">10 Miles (£10/month)</option>
                  <option value="30">30 Miles (£20/month - Standard)</option>
                  <option value="50">50 Miles (£30/month)</option>
                  <option value="100">100 Miles (£50/month)</option>
                  <option value="500">500 Miles (£300/month - Nationwide UK)</option>
                </select>
              </div>

              {/* Multi-Service Checkbox Selection */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Services Handled at this Location *
                </label>
                <p className="text-[11px] text-slate-500">
                  Select which services this specific clinic location can deliver:
                </p>
                <div className="space-y-2 pt-1">
                  {AVAILABLE_SERVICES.map((service) => {
                    const isChecked = locationForm.services.includes(service);
                    return (
                      <label 
                        key={service}
                        className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
                          isChecked 
                            ? 'bg-indigo-50/70 border-indigo-300 text-indigo-900' 
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleService(service)}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-xs font-semibold">{service}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsLocationModalOpen(false)}
                  disabled={isSavingLocation}
                  className="btn-secondary text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingLocation}
                  className="btn-primary text-xs px-5 py-2 flex items-center gap-1.5"
                >
                  {isSavingLocation && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingLocation ? 'Save Changes' : 'Add Location'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Company Profile Modal */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative max-h-[90vh] flex flex-col">
            <button
              onClick={() => setIsProfileModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Edit Company Profile
                </h3>
                <p className="text-xs text-slate-500">
                  Update your company logo, organization details, contact information, and accreditation summary.
                </p>
              </div>
            </div>

            {modalError && (
              <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-red-700 font-medium">{modalError}</div>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4 overflow-y-auto pr-1">
              {/* Company Logo Upload & Preview */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Company Logo
                </label>
                <div className="flex items-center gap-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  {profileForm.logoUrl ? (
                    <div className="relative flex-shrink-0">
                      <img
                        src={profileForm.logoUrl}
                        alt="Logo preview"
                        className="w-16 h-16 rounded-xl object-cover border border-slate-300 bg-white shadow-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setProfileForm(prev => ({ ...prev, logoUrl: '' }))}
                        className="absolute -top-1.5 -right-1.5 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 shadow-xs"
                        title="Remove Logo"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-slate-200 text-slate-400 flex items-center justify-center flex-shrink-0">
                      <ImageIcon className="w-8 h-8" />
                    </div>
                  )}

                  <div className="flex-1 space-y-1.5">
                    <label className="btn-secondary text-xs px-3 py-1.5 inline-flex items-center gap-1.5 cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{profileForm.logoUrl ? 'Change Logo Image' : 'Upload Logo Image'}</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        onChange={handleLogoFileUpload}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Supports PNG, JPG, WebP, SVG (Auto-optimized for crisp display).
                    </p>
                  </div>
                </div>

                {/* Direct image URL alternative */}
                <div className="mt-2">
                  <input
                    type="url"
                    placeholder="Or paste an image URL (https://...)"
                    value={profileForm.logoUrl && !profileForm.logoUrl.startsWith('data:') ? profileForm.logoUrl : ''}
                    onChange={(e) => setProfileForm({ ...profileForm, logoUrl: e.target.value })}
                    className="input-field text-xs"
                  />
                </div>
              </div>

              {/* Company / Practice Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Company / Practice Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MedOH Occupational Health Ltd"
                  value={profileForm.companyName}
                  onChange={(e) => setProfileForm({ ...profileForm, companyName: e.target.value })}
                  className="input-field"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Contact Person *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Sarah Jenkins"
                    value={profileForm.contactPerson}
                    onChange={(e) => setProfileForm({ ...profileForm, contactPerson: e.target.value })}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 020 7946 0192"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Website URL
                </label>
                <input
                  type="text"
                  placeholder="e.g. www.medoh-health.co.uk"
                  value={profileForm.website}
                  onChange={(e) => setProfileForm({ ...profileForm, website: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Company Overview & Accreditations
                </label>
                <textarea
                  rows={3}
                  placeholder="SEQOHS accredited provider specializing in statutory health surveillance, pre-placement fitness assessments, and sickness absence management..."
                  value={profileForm.description}
                  onChange={(e) => setProfileForm({ ...profileForm, description: e.target.value })}
                  className="input-field text-xs leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(false)}
                  disabled={isSavingProfile}
                  className="btn-secondary text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="btn-primary text-xs px-5 py-2 flex items-center gap-1.5"
                >
                  {isSavingProfile && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Company Profile</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProviderDashboard;
