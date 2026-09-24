import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
  CreditCard, 
  ShieldCheck, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  Zap, 
  Sparkles, 
  Compass, 
  RefreshCw, 
  Edit3, 
  ArrowRight, 
  Lock, 
  Info,
  Calendar,
  ExternalLink,
  ChevronRight,
  Check,
  Receipt,
  FileText,
  TrendingUp,
  Building2,
  Layers,
  Calculator,
  HelpCircle
} from 'lucide-react';

export const RADIUS_PRICING = [
  { radius: 10, price: 10, yearlyPrice: 120, label: '10 Mile Radius (£10/mo)', description: 'Local town or city coverage' },
  { radius: 30, price: 20, yearlyPrice: 240, label: '30 Mile Radius (£20/mo)', description: 'Standard regional clinic coverage' },
  { radius: 50, price: 30, yearlyPrice: 360, label: '50 Mile Radius (£30/mo)', description: 'Expanded county-wide coverage' },
  { radius: 100, price: 50, yearlyPrice: 600, label: '100 Mile Radius (£50/mo)', description: 'Broad multi-county reach' },
  { radius: 500, price: 300, yearlyPrice: 3600, label: '500 Miles Nationwide (£300/mo)', description: 'Full UK-wide coverage (single location covers all UK)' },
];

export const calculateLocationPrice = (radius) => {
  const r = Number(radius) || 30;
  if (r <= 10) return 10;
  if (r <= 30) return 20;
  if (r <= 50) return 30;
  if (r <= 100) return 50;
  return 300;
};

const ProviderSubscriptionManager = ({ locations = [], profile = null, onSubscriptionUpdated, onEditLocation }) => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stripeCheckoutLoading, setStripeCheckoutLoading] = useState(false);
  const [stripePortalLoading, setStripePortalLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [actionMsg, setActionMsg] = useState('');
  const [actionError, setActionError] = useState('');
  const [syncingStripe, setSyncingStripe] = useState(false);
  const [editingRadiusMap, setEditingRadiusMap] = useState({});
  const [billingInterval, setBillingInterval] = useState('monthly'); // 'monthly' | 'yearly'
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'breakdown' | 'simulator'
  
  // Simulator state
  const [simulatedRadius, setSimulatedRadius] = useState(30);

  const isSubscribed = Boolean(profile?.is_subscribed || summary?.isSubscribed);

  const fetchSummary = async () => {
    try {
      const res = await api.get('/provider/subscription/summary');
      setSummary(res.data);
    } catch (err) {
      console.warn('Subscription summary fetch warning:', err);
    }
  };

  const handleSyncStripeStatus = async (sessionId = null) => {
    setSyncingStripe(true);
    setActionMsg('');
    setActionError('');
    try {
      const res = await api.post('/provider/subscription/verify-session', { sessionId });
      if (res.data?.isSubscribed) {
        setActionMsg('🎉 Active Stripe subscription verified & synced! Pro features unlocked.');
      } else {
        setActionMsg(res.data?.message || 'Subscription status refreshed.');
      }
      await fetchSummary();
      if (onSubscriptionUpdated) {
        onSubscriptionUpdated();
      }
    } catch (err) {
      console.warn('Sync Stripe error:', err);
      setActionError(err.response?.data?.message || 'Unable to sync with Stripe.');
    } finally {
      setSyncingStripe(false);
    }
  };

  useEffect(() => {
    const handleReturnFromStripe = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const subStatus = urlParams.get('subscription_status');
      const sessionId = urlParams.get('session_id');

      if (subStatus === 'success' || sessionId) {
        window.history.replaceState({}, document.title, window.location.pathname);
        await handleSyncStripeStatus(sessionId);
      } else if (subStatus === 'cancelled') {
        setActionError('Stripe Checkout was cancelled. Your account remains on the Free Match Preview tier.');
        window.history.replaceState({}, document.title, window.location.pathname);
        await fetchSummary();
      } else {
        await fetchSummary();
      }
    };

    handleReturnFromStripe();
  }, [locations, profile]);

  const handleUpdateRadius = async (locationId, newRadius) => {
    setUpdatingId(locationId);
    setActionMsg('');
    setActionError('');
    try {
      await api.put(`/provider/location/${locationId}`, { coverageRadius: Number(newRadius) });
      setActionMsg('Coverage radius updated! Monthly and annual totals recalculated.');
      setEditingRadiusMap(prev => ({ ...prev, [locationId]: false }));
      await fetchSummary();
      if (onSubscriptionUpdated) {
        onSubscriptionUpdated();
      }
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to update coverage radius.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleStripeCheckout = async () => {
    setStripeCheckoutLoading(true);
    setActionMsg('');
    setActionError('');
    try {
      const res = await api.post('/provider/subscription/create-checkout-session');
      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        throw new Error('Checkout session URL not received from Stripe');
      }
    } catch (err) {
      console.error('Stripe checkout error:', err);
      setActionError(err.response?.data?.message || err.message || 'Failed to initialize Stripe checkout. Please try again.');
      setStripeCheckoutLoading(false);
    }
  };

  const handleStripeCustomerPortal = async () => {
    setStripePortalLoading(true);
    setActionMsg('');
    setActionError('');
    try {
      const res = await api.post('/provider/subscription/create-portal-session');
      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        throw new Error('Portal session URL not received from Stripe');
      }
    } catch (err) {
      console.error('Stripe portal error:', err);
      setActionError(err.response?.data?.message || err.message || 'Failed to open Stripe Billing Portal.');
      setStripePortalLoading(false);
    }
  };

  const handleToggleSubscription = async (targetStatus) => {
    setLoading(true);
    setActionMsg('');
    setActionError('');
    try {
      await api.post('/provider/subscribe', { isSubscribed: targetStatus });
      setActionMsg(targetStatus ? 'Pro Subscription successfully activated! Full client contact details and consideration requests are now active.' : 'Subscription paused. Your account is now in Free Tier preview mode.');
      await fetchSummary();
      if (onSubscriptionUpdated) {
        onSubscriptionUpdated();
      }
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to update subscription status.');
    } finally {
      setLoading(false);
    }
  };

  // Calculate cumulative monthly and yearly totals
  const locList = summary?.itemizedLocations || locations.map(l => ({
    id: l.id,
    address: l.address,
    postalCode: l.postal_code || l.postalCode,
    city: l.city,
    coverageRadius: Number(l.coverage_radius || l.coverageRadius) || 30,
    services: l.services || ['Management Referrals'],
    monthlyCost: calculateLocationPrice(l.coverage_radius || l.coverageRadius || 30)
  }));

  const totalMonthlyCost = locList.reduce((sum, item) => sum + item.monthlyCost, 0);
  const totalYearlyCost = totalMonthlyCost * 12;
  const avgCostPerLocation = locList.length > 0 ? (totalMonthlyCost / locList.length).toFixed(0) : 0;

  // Simulator calculations
  const simAddedMonthly = calculateLocationPrice(simulatedRadius);
  const simProjectedMonthly = totalMonthlyCost + simAddedMonthly;
  const simProjectedYearly = simProjectedMonthly * 12;

  const nextBillingDate = summary?.subscriptionExpiry 
    ? new Date(summary.subscriptionExpiry).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-8">
      {/* Top Header & Title Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center shadow-md flex-shrink-0">
            <CreditCard className="w-7 h-7" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                Subscription & Billing Dashboard
              </h2>
              {isSubscribed ? (
                <span className="badge bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold flex items-center gap-1 text-xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Active Pro Plan ({summary?.subscriptionStatus || 'Active'})</span>
                </span>
              ) : (
                <span className="badge bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold">
                  Free Tier Preview
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Radius-based cumulative investment &bull; Automated billing powered by Stripe
            </p>
          </div>
        </div>

        {/* Monthly / Yearly Billing Toggle Switch */}
        <div className="flex items-center gap-3 self-start lg:self-auto bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          <button
            type="button"
            onClick={() => setBillingInterval('monthly')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              billingInterval === 'monthly'
                ? 'bg-white text-indigo-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Monthly View
          </button>
          <button
            type="button"
            onClick={() => setBillingInterval('yearly')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              billingInterval === 'yearly'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Yearly Projection (ARR)</span>
          </button>
        </div>
      </div>

      {/* Action Notifications */}
      {actionMsg && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-emerald-900 font-medium">{actionMsg}</div>
        </div>
      )}

      {actionError && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-red-900 font-medium">{actionError}</div>
        </div>
      )}

      {/* 4 Executive KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Monthly Total (MRR) */}
        <div className="bg-gradient-to-br from-indigo-50/70 to-slate-50 p-5 rounded-2xl border border-indigo-100/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-indigo-700">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Monthly Total (MRR)</span>
            <div className="p-2 bg-indigo-100/70 rounded-xl">
              <CreditCard className="w-4 h-4 text-indigo-600" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            £{totalMonthlyCost}
            <span className="text-xs font-normal text-slate-500"> / month</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Cumulative across {locList.length} {locList.length === 1 ? 'registered branch' : 'registered branches'}
          </p>
        </div>

        {/* Card 2: Annual Total (ARR) */}
        <div className="bg-gradient-to-br from-blue-50/70 to-slate-50 p-5 rounded-2xl border border-blue-100/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-blue-700">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Yearly Total (ARR)</span>
            <div className="p-2 bg-blue-100/70 rounded-xl">
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            £{totalYearlyCost}
            <span className="text-xs font-normal text-slate-500"> / year</span>
          </div>
          <p className="text-[11px] text-slate-500">
            12-month annualized investment value
          </p>
        </div>

        {/* Card 3: Registered Locations Covered */}
        <div className="bg-gradient-to-br from-purple-50/70 to-slate-50 p-5 rounded-2xl border border-purple-100/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-purple-700">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Active Clinic Branches</span>
            <div className="p-2 bg-purple-100/70 rounded-xl">
              <Building2 className="w-4 h-4 text-purple-600" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {locList.length}
            <span className="text-xs font-normal text-slate-500"> {locList.length === 1 ? 'clinic location' : 'clinic locations'}</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Avg. £{avgCostPerLocation}/location/month
          </p>
        </div>

        {/* Card 4: Plan Status & Cycle */}
        <div className="bg-gradient-to-br from-emerald-50/70 to-slate-50 p-5 rounded-2xl border border-emerald-100/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Billing Cycle</span>
            <div className="p-2 bg-emerald-100/70 rounded-xl">
              <Calendar className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <div className="text-base font-bold text-slate-900">
            {isSubscribed ? 'Active Recurring' : 'Free Preview'}
          </div>
          <p className="text-[11px] text-slate-500 flex items-center gap-1">
            <span>{isSubscribed ? `Next renewal: ${nextBillingDate}` : 'Subscribe to unlock direct client awards'}</span>
          </p>
        </div>
      </div>

      {/* Subscription Callout Banner & Action Controls */}
      {!isSubscribed ? (
        <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border border-amber-200 rounded-2xl p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 shadow-sm">
          <div className="space-y-1.5 max-w-2xl">
            <h3 className="text-base font-bold text-amber-950 flex items-center gap-2">
              <Lock className="w-5 h-5 text-amber-700" />
              <span>You are currently on the Free Match Preview Tier</span>
            </h3>
            <p className="text-xs text-amber-800 leading-relaxed">
              You can see incoming referral opportunities matching your clinic locations (distance, employees count, and services). Upgrade to Pro for <strong>£{totalMonthlyCost}/month (£{totalYearlyCost}/year)</strong> across your {locList.length} {locList.length === 1 ? 'location' : 'locations'} to unlock full employer contact details and request consideration.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <button
              type="button"
              onClick={handleStripeCheckout}
              disabled={stripeCheckoutLoading || locList.length === 0}
              className="btn-primary py-3 px-6 text-xs font-bold whitespace-nowrap flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-60"
            >
              {stripeCheckoutLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <CreditCard className="w-4 h-4" />
              )}
              <span>Subscribe with Stripe (£{totalMonthlyCost}/mo &bull; £{totalYearlyCost}/yr)</span>
            </button>

            <button
              type="button"
              onClick={() => handleSyncStripeStatus()}
              disabled={syncingStripe}
              className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 bg-white hover:bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-2.5 transition-all flex items-center justify-center gap-1.5 shadow-2xs"
              title="Verify & Sync Live Stripe Subscription"
            >
              {syncingStripe ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              <span>Sync with Stripe</span>
            </button>

            <button
              type="button"
              onClick={() => handleToggleSubscription(true)}
              disabled={loading || locList.length === 0}
              className="text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 transition-all flex items-center justify-center gap-1.5 shadow-2xs"
              title="Direct instant test activation without Stripe checkout"
            >
              <span>Instant Activate (Test Mode)</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200 rounded-2xl p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 shadow-sm">
          <div className="space-y-1.5 max-w-2xl">
            <h3 className="text-base font-bold text-emerald-950 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Pro Subscription Active &bull; Full Consideration & Direct Client Access</span>
            </h3>
            <p className="text-xs text-emerald-800 leading-relaxed">
              Your clinic is active across {locList.length} {locList.length === 1 ? 'location' : 'locations'} with an investment of <strong>£{totalMonthlyCost}/month (£{totalYearlyCost}/year)</strong>. You have full access to request consideration, view client contact information, and receive direct appointment awards.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {summary?.stripeCustomerId && (
              <button
                type="button"
                onClick={handleStripeCustomerPortal}
                disabled={stripePortalLoading}
                className="btn-primary bg-emerald-600 hover:bg-emerald-700 py-2.5 px-5 text-xs font-semibold flex items-center justify-center gap-2 whitespace-nowrap shadow-sm"
              >
                {stripePortalLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ExternalLink className="w-3.5 h-3.5" />
                )}
                <span>Manage Billing & VAT Invoices</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleSyncStripeStatus()}
              disabled={syncingStripe}
              className="text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 transition-all flex items-center justify-center gap-1.5 shadow-2xs"
              title="Sync Status with Stripe"
            >
              {syncingStripe ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              <span>Sync Stripe</span>
            </button>

            <button
              type="button"
              onClick={() => handleToggleSubscription(false)}
              disabled={loading}
              className="text-xs font-semibold text-slate-600 hover:text-red-700 bg-white hover:bg-red-50 border border-slate-200 rounded-xl px-4 py-2.5 transition-all flex items-center justify-center"
            >
              Pause Subscription
            </button>
          </div>
        </div>
      )}

      {/* Sub-Dashboard Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`pb-3 border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'border-indigo-600 text-indigo-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Location Subscriptions Breakdown ({locList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('simulator')}
          className={`pb-3 border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'simulator'
              ? 'border-indigo-600 text-indigo-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calculator className="w-4 h-4" />
          <span>Expansion & Cost Simulator</span>
        </button>
      </div>

      {/* TAB 1: Locations Subscriptions Breakdown Table */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-indigo-600" />
                <span>Registered Clinic Subscriptions & Radius Rates</span>
              </h3>
              <p className="text-xs text-slate-500">
                Itemized view showing monthly and yearly subscription allocations per clinic location.
              </p>
            </div>

            <div className="text-xs font-semibold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 w-max">
              Showing: <span className="text-indigo-600 font-bold uppercase">{billingInterval} rates</span>
            </div>
          </div>

          {locList.length > 0 ? (
            <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-2xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
                    <th className="py-3.5 px-4">Clinic Location</th>
                    <th className="py-3.5 px-4">UK Postcode</th>
                    <th className="py-3.5 px-4">Coverage Radius</th>
                    <th className="py-3.5 px-4 text-right">Monthly Cost</th>
                    <th className="py-3.5 px-4 text-right">Yearly Projection</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {locList.map((loc) => {
                    const isEditing = editingRadiusMap[loc.id];
                    const isBusy = updatingId === loc.id;
                    const monthly = loc.monthlyCost;
                    const yearly = monthly * 12;

                    return (
                      <tr key={loc.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-slate-900">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                              <span>{loc.address || loc.city || 'Clinic Location'}</span>
                            </div>
                            {onEditLocation && (
                              <button
                                type="button"
                                onClick={() => {
                                  const fullLoc = locations.find(l => String(l.id) === String(loc.id)) || loc;
                                  onEditLocation(fullLoc);
                                }}
                                className="text-[11px] text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 font-normal ml-2"
                                title="Edit address, postcode and services"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>Edit</span>
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                          {loc.postalCode || loc.postal_code || '—'}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            {isEditing ? (
                              <div className="flex items-center gap-2">
                                <select
                                  defaultValue={loc.coverageRadius}
                                  onChange={(e) => handleUpdateRadius(loc.id, e.target.value)}
                                  disabled={isBusy}
                                  className="text-xs font-semibold bg-white border border-indigo-400 rounded-lg px-2.5 py-1 text-indigo-900 focus:ring-2 focus:ring-indigo-500"
                                >
                                  {RADIUS_PRICING.map((p) => (
                                    <option key={p.radius} value={p.radius}>
                                      {p.label}
                                    </option>
                                  ))}
                                </select>
                                {isBusy && <RefreshCw className="w-3.5 h-3.5 text-indigo-600 animate-spin" />}
                                <button
                                  type="button"
                                  onClick={() => setEditingRadiusMap(prev => ({ ...prev, [loc.id]: false }))}
                                  className="text-[11px] text-slate-400 hover:text-slate-600 font-semibold"
                                >
                                  Done
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="badge bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold">
                                  {loc.coverageRadius} miles radius
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setEditingRadiusMap(prev => ({ ...prev, [loc.id]: true }))}
                                  className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                  title="Change coverage radius"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className={`py-3.5 px-4 text-right font-bold text-sm ${billingInterval === 'monthly' ? 'text-indigo-900' : 'text-slate-700'}`}>
                          £{monthly}<span className="text-[10px] font-normal text-slate-500">/mo</span>
                        </td>
                        <td className={`py-3.5 px-4 text-right font-bold text-sm ${billingInterval === 'yearly' ? 'text-indigo-900 font-black' : 'text-slate-700'}`}>
                          £{yearly}<span className="text-[10px] font-normal text-slate-500">/yr</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 font-bold text-xs border-t-2 border-slate-200">
                    <td colSpan="3" className="py-4 px-4 text-slate-800 uppercase tracking-wider">
                      Cumulative Total ({locList.length} {locList.length === 1 ? 'Location' : 'Locations'}):
                    </td>
                    <td className="py-4 px-4 text-right text-base font-black text-indigo-900">
                      £{totalMonthlyCost}<span className="text-xs font-normal text-slate-500">/mo</span>
                    </td>
                    <td className="py-4 px-4 text-right text-base font-black text-indigo-900">
                      £{totalYearlyCost}<span className="text-xs font-normal text-slate-500">/yr</span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center border border-dashed border-slate-200 rounded-2xl space-y-2 text-xs text-slate-500">
              <MapPin className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="font-semibold text-slate-700">No clinic locations registered yet.</p>
              <p>Add a clinic location in the section above to configure your subscription.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Expansion & Cost Simulator */}
      {activeTab === 'simulator' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 p-6 rounded-2xl border border-indigo-100 space-y-4">
            <div className="flex items-center gap-2 text-indigo-900">
              <Calculator className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-base">Interactive Clinic Expansion Simulator</h3>
            </div>
            <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
              Plan your expansion by simulating what adding a new clinic branch with various coverage radiuses will do to your monthly and yearly subscription before adding it.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2">
                <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">
                  Simulate New Branch Radius:
                </label>
                <select
                  value={simulatedRadius}
                  onChange={(e) => setSimulatedRadius(Number(e.target.value))}
                  className="input-field text-xs font-semibold"
                >
                  {RADIUS_PRICING.map((p) => (
                    <option key={p.radius} value={p.radius}>
                      {p.label} - {p.description}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-slate-500 block">
                  Additional branch investment: <strong>£{simAddedMonthly}/mo (£{simAddedMonthly * 12}/yr)</strong>
                </span>
              </div>

              <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-1 text-center flex flex-col justify-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  New Projected Monthly Total
                </span>
                <div className="text-2xl font-black text-indigo-600">
                  £{simProjectedMonthly}
                  <span className="text-xs font-normal text-slate-500"> / month</span>
                </div>
                <span className="text-[11px] text-emerald-600 font-semibold">
                  +{locList.length + 1} locations covered
                </span>
              </div>

              <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-1 text-center flex flex-col justify-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  New Projected Yearly Total (ARR)
                </span>
                <div className="text-2xl font-black text-indigo-900">
                  £{simProjectedYearly}
                  <span className="text-xs font-normal text-slate-500"> / year</span>
                </div>
                <span className="text-[11px] text-slate-500">
                  (£{simProjectedMonthly}/mo &times; 12)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Radius Tier Pricing Reference Guide (5 Tiers) */}
      <div className="space-y-3 pt-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <Compass className="w-4 h-4 text-indigo-600" />
          <span>Standard Radius Tier Rates (Per Registered Location)</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {RADIUS_PRICING.map((tier) => (
            <div 
              key={tier.radius}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-indigo-300 hover:shadow-xs transition-all space-y-1.5 flex flex-col justify-between"
            >
              <div>
                <span className="badge bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold text-[11px]">
                  {tier.radius >= 500 ? 'Nationwide UK' : `${tier.radius} Miles Radius`}
                </span>
                <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                  {tier.description}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-200/60">
                <div className="text-base font-black text-slate-900">
                  £{tier.price}
                  <span className="text-[10px] font-normal text-slate-500"> / month</span>
                </div>
                <div className="text-[11px] font-semibold text-slate-500">
                  £{tier.yearlyPrice} / year
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* VAT Compliance & Billing Guarantee */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h5 className="font-bold text-slate-900">HMRC-Compliant Automated Invoicing</h5>
            <p className="text-slate-500 text-[11px]">
              Itemized VAT receipts, Bacs Direct Debit and Card payments processed securely via Stripe. Access billing history anytime.
            </p>
          </div>
        </div>

        {summary?.stripeCustomerId && (
          <button
            type="button"
            onClick={handleStripeCustomerPortal}
            disabled={stripePortalLoading}
            className="text-indigo-600 hover:text-indigo-800 font-semibold text-xs flex items-center gap-1 hover:underline whitespace-nowrap"
          >
            <span>Open Stripe Customer Portal</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};

export default ProviderSubscriptionManager;
