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
  Check, 
  X, 
  CreditCard, 
  Building2,
  Mail, 
  Phone, 
  User, 
  Users, 
  Send,
  Lock
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
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [requestingMap, setRequestingMap] = useState({});

  // New location form with multi-service support
  const [newLocation, setNewLocation] = useState({
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

  const handleToggleService = (service) => {
    setNewLocation(prev => {
      const exists = prev.services.includes(service);
      const updated = exists 
        ? prev.services.filter(s => s !== service)
        : [...prev.services, service];
      return { ...prev, services: updated };
    });
  };

  const handleAddLocation = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (newLocation.services.length === 0) {
      setError('Please select at least one service covered by this clinic location.');
      return;
    }

    try {
      await api.post('/provider/location', newLocation);
      setIsLocationModalOpen(false);
      setSuccessMsg('Clinic location and service capabilities added successfully!');
      setNewLocation({
        address: '',
        city: '',
        state: '',
        country: 'United Kingdom',
        postalCode: '',
        coverageRadius: '30',
        services: ['Management Referrals', 'Health Surveillance']
      });
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Error adding provider location.');
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
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-inner">
              <Stethoscope className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
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
              <p className="text-xs text-slate-500 mt-0.5">
                Contact: <span className="font-semibold text-slate-700">{profile?.contact_person || user?.name || 'Clinic Lead'}</span> &bull; Email: <span className="font-semibold text-slate-700">{user?.email}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
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
              onClick={() => setIsLocationModalOpen(true)}
              className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Clinic Location</span>
            </button>
          </div>
        </div>

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
              onClick={() => setIsLocationModalOpen(true)}
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
                Each clinic location specifies its operational coverage radius in miles and the exact Occupational Health services it handles.
              </p>
            </div>

            <button
              onClick={() => setIsLocationModalOpen(true)}
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
                          {loc.city && `${loc.city}, `}{loc.postal_code}
                        </p>
                      </div>
                      <span className="badge bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-bold">
                        {loc.coverage_radius || 30} miles radius
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

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => handleDeleteLocation(loc.id)}
                      className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 p-1 rounded hover:bg-red-50"
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
                onClick={() => setIsLocationModalOpen(true)}
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
                            <div className="mt-2.5 p-3 rounded-xl bg-emerald-50/90 border border-emerald-200 text-emerald-950 space-y-1.5 shadow-2xs">
                              <div className="font-bold flex items-center gap-1.5 text-xs text-emerald-950">
                                <Building2 className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                                <span>{item.company_name || 'Client Business'}</span>
                              </div>
                              {item.location_address && (
                                <div className="text-[11px] text-emerald-900 flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                                  <span>{item.location_address}, {item.location_city} ({item.location_postal_code})</span>
                                </div>
                              )}
                              <div className="text-[11px] text-emerald-900 flex flex-wrap items-center gap-x-3 gap-y-0.5 pt-0.5 border-t border-emerald-200/60">
                                <div className="flex items-center gap-1">
                                  <User className="w-3 h-3 text-emerald-600" />
                                  <span><strong>Contact:</strong> {item.contact_name || item.contact_person || 'HR Referrer'}</span>
                                </div>
                                {item.contact_phone && (
                                  <div className="flex items-center gap-1">
                                    <Phone className="w-3 h-3 text-emerald-600" />
                                    <span>{item.contact_phone}</span>
                                  </div>
                                )}
                                {item.contact_email && (
                                  <div className="flex items-center gap-1">
                                    <Mail className="w-3 h-3 text-emerald-600" />
                                    <span>{item.contact_email}</span>
                                  </div>
                                )}
                              </div>
                              {item.notes && (
                                <div className="text-[11px] text-emerald-900/90 italic bg-emerald-100/50 p-2 rounded-lg border border-emerald-200/40">
                                  <strong>Referral Notes:</strong> &ldquo;{item.notes}&rdquo;
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-700">
                          <div className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            <span>{item.employee_count || 1} {(item.employee_count || 1) === 1 ? 'employee' : 'employees'}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          {item.distance ? (
                            <span className="font-semibold text-slate-800">{Number(item.distance).toFixed(1)} miles away</span>
                          ) : (
                            <span className="text-slate-500">{item.postal_code || 'Matched in radius'}</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {isChosen ? (
                            <div className="space-y-0.5">
                              <span className="badge bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold flex items-center gap-1 w-fit">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Chosen by Business</span>
                              </span>
                              {(item.status === 'closed' || item.is_closed) && (
                                <span className="badge bg-slate-100 text-slate-600 border border-slate-200 text-[10px]">
                                  Referral Closed
                                </span>
                              )}
                            </div>
                          ) : (item.status === 'closed' || item.is_closed) ? (
                            <span className="badge bg-slate-100 text-slate-600 border border-slate-200">
                              Closed by Business
                            </span>
                          ) : isRequested ? (
                            <div className="space-y-0.5">
                              <span className="badge bg-blue-100 text-blue-800 border border-blue-200 font-semibold flex items-center gap-1 w-fit">
                                <Clock className="w-3.5 h-3.5 text-blue-600" />
                                <span>Consideration Requested</span>
                              </span>
                              <p className="text-[10px] text-slate-500">Awaiting business decision</p>
                            </div>
                          ) : isNotSelected ? (
                            <span className="badge bg-slate-100 text-slate-600 border border-slate-200">
                              Other Provider Chosen
                            </span>
                          ) : (
                            <span className="badge bg-indigo-50 text-indigo-700 border border-indigo-200">
                              Available in Area
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {isChosen ? (
                            <span className="text-xs font-bold text-emerald-700">Active Award</span>
                          ) : (item.status === 'closed' || item.is_closed) ? (
                            <span className="text-xs text-slate-400">Closed</span>
                          ) : isRequested ? (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-[11px] font-semibold cursor-default select-none shadow-2xs">
                              <Check className="w-3.5 h-3.5 text-blue-600" />
                              <span>Requested</span>
                            </div>
                          ) : isNotSelected ? (
                            <span className="text-xs text-slate-400">Closed</span>
                          ) : profile?.is_subscribed ? (
                            <button
                              onClick={() => handleRequestConsideration(item.id)}
                              disabled={requestingMap[item.id]}
                              className="btn-primary py-1.5 px-3 text-[11px] font-semibold inline-flex items-center gap-1.5 shadow-2xs hover:shadow-xs disabled:opacity-60"
                            >
                              {requestingMap[item.id] ? (
                                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              ) : (
                                <Send className="w-3 h-3" />
                              )}
                              <span>Request Consideration</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setError('An active subscription is required to request consideration for referrals. Click "Manage Subscription" above to activate.');
                              }}
                              className="px-3 py-1.5 text-[11px] font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-all inline-flex items-center gap-1.5"
                            >
                              <Lock className="w-3 h-3 text-amber-600" />
                              <span>Subscribe to Request</span>
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
            <div className="p-8 text-center text-slate-500 space-y-3">
              <Clock className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">No referral requests in your queue right now</p>
              {locations.length === 0 ? (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    You have not registered any clinic locations yet. Add a clinic location and set your coverage radius to start receiving matched referrals.
                  </p>
                  <button
                    onClick={() => setIsLocationModalOpen(true)}
                    className="btn-secondary text-xs px-3.5 py-1.5 inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Clinic Location</span>
                  </button>
                </div>
              ) : (
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Your registered clinic location(s) are active. When businesses submit referrals within your coverage radius that match your service capabilities, they will be matched here automatically.
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
          />
        </div>

        {/* Passkeys & Biometric Security Management */}
        <PasskeyManager />
      </div>

      {/* Add Location Modal with Multi-Service Selection */}
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
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Add Clinic Location</h3>
                <p className="text-xs text-slate-500">Configure clinic coverage radius and supported OH services</p>
              </div>
            </div>

            <form onSubmit={handleAddLocation} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Street Address / Clinic Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 10 St Pauls Square"
                  value={newLocation.address}
                  onChange={(e) => setNewLocation({ ...newLocation, address: e.target.value })}
                  className="input-field"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    City / Town
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. London"
                    value={newLocation.city}
                    onChange={(e) => setNewLocation({ ...newLocation, city: e.target.value })}
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
                    value={newLocation.postalCode}
                    onChange={(e) => setNewLocation({ ...newLocation, postalCode: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Coverage Radius (Miles from this clinic)
                </label>
                <select
                  value={newLocation.coverageRadius}
                  onChange={(e) => setNewLocation({ ...newLocation, coverageRadius: e.target.value })}
                  className="input-field"
                >
                  <option value="10">10 Miles</option>
                  <option value="30">30 Miles (Standard)</option>
                  <option value="50">50 Miles</option>
                  <option value="100">100 Miles</option>
                  <option value="500">500 Miles (Nationwide)</option>
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
                    const isChecked = newLocation.services.includes(service);
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
                  className="btn-secondary text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary text-xs px-5 py-2"
                >
                  Save Location & Services
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
