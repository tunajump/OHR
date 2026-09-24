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
  FileText
} from 'lucide-react';

const RADIUS_PRICING = [
  { radius: 10, price: 10, label: '10 Mile Radius (£10/mo)' },
  { radius: 30, price: 20, label: '30 Mile Radius (£20/mo)' },
  { radius: 50, price: 30, label: '50 Mile Radius (£30/mo)' },
  { radius: 100, price: 50, label: '100 Mile Radius (£50/mo)' },
  { radius: 500, price: 300, label: '500 Miles Nationwide (£300/mo)' },
];

export const calculateLocationPrice = (radius) => {
  const r = Number(radius) || 30;
  if (r <= 10) return 10;
  if (r <= 30) return 20;
  if (r <= 50) return 30;
  if (r <= 100) return 50;
  return 300;
};

const ProviderSubscriptionManager = ({ locations = [], profile = null, onSubscriptionUpdated }) => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stripeCheckoutLoading, setStripeCheckoutLoading] = useState(false);
  const [stripePortalLoading, setStripePortalLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [actionMsg, setActionMsg] = useState('');
  const [actionError, setActionError] = useState('');
  const [editingRadiusMap, setEditingRadiusMap] = useState({});

  const isSubscribed = Boolean(profile?.is_subscribed || summary?.isSubscribed);

  const fetchSummary = async () => {
    try {
      const res = await api.get('/provider/subscription/summary');
      setSummary(res.data);
    } catch (err) {
      console.warn('Subscription summary fetch warning:', err);
    }
  };

  useEffect(() => {
    fetchSummary();

    // Check if returning from Stripe Checkout success
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('subscription_status') === 'success') {
      setActionMsg('🎉 Subscription activated successfully via Stripe Checkout! Welcome to Pro.');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (urlParams.get('subscription_status') === 'cancelled') {
      setActionError('Stripe Checkout was cancelled. Your account remains on the Free Match Preview tier.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [locations, profile]);

  const handleUpdateRadius = async (locationId, newRadius) => {
    setUpdatingId(locationId);
    setActionMsg('');
    setActionError('');
    try {
      await api.put(`/provider/location/${locationId}`, { coverageRadius: Number(newRadius) });
      setActionMsg('Coverage radius updated! Monthly subscription adjusted.');
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

  // Calculate cumulative monthly total
  const locList = summary?.itemizedLocations || locations.map(l => ({
    id: l.id,
    address: l.address,
    postalCode: l.postal_code,
    city: l.city,
    coverageRadius: Number(l.coverage_radius) || 30,
    monthlyCost: calculateLocationPrice(l.coverage_radius || 30)
  }));

  const totalCost = locList.reduce((sum, item) => sum + item.monthlyCost, 0);

  return (
    <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shadow-inner">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">
                Subscription & Coverage Management
              </h2>
              {isSubscribed ? (
                <span className="badge bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold flex items-center gap-1 text-[11px]">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Active Pro Subscription</span>
                </span>
              ) : (
                <span className="badge bg-amber-100 text-amber-800 border border-amber-200 text-[11px]">
                  Free Tier (Preview Mode)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Radius-based cumulative billing powered by Stripe.
            </p>
          </div>
        </div>

        <div className="text-left sm:text-right">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Current Monthly Investment
          </span>
          <div className="text-2xl font-black text-slate-900">
            £{totalCost}
            <span className="text-xs font-normal text-slate-500"> / month</span>
          </div>
        </div>
      </div>

      {/* Action Messages */}
      {actionMsg && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-900 font-medium">{actionMsg}</div>
        </div>
      )}

      {actionError && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-red-900 font-medium">{actionError}</div>
        </div>
      )}

      {/* Subscription Tier Overview Callout */}
      {!isSubscribed ? (
        <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-amber-950 flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-amber-700" />
              <span>You are currently on the Free Match Preview Tier</span>
            </h3>
            <p className="text-xs text-amber-800 leading-relaxed max-w-2xl">
              You can see incoming referral opportunities matching your clinic locations. Activate your Pro subscription for <strong>£{totalCost}/month</strong> across your {locList.length} {locList.length === 1 ? 'location' : 'locations'} to unlock full employer contact details and request consideration.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 w-full md:w-auto">
            <button
              type="button"
              onClick={handleStripeCheckout}
              disabled={stripeCheckoutLoading || locList.length === 0}
              className="btn-primary py-2.5 px-5 text-xs font-bold whitespace-nowrap flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-60"
            >
              {stripeCheckoutLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <CreditCard className="w-4 h-4" />
              )}
              <span>Subscribe with Stripe (£{totalCost}/mo)</span>
            </button>
            <button
              type="button"
              onClick={() => handleToggleSubscription(true)}
              disabled={loading || locList.length === 0}
              className="text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 transition-all flex items-center justify-center gap-1.5"
              title="Instant Direct Activation"
            >
              <span>Instant Activate</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-emerald-950 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Pro Subscription Active &bull; Unlimited Referral Requests</span>
            </h3>
            <p className="text-xs text-emerald-800 leading-relaxed max-w-2xl">
              Your clinic is active across {locList.length} {locList.length === 1 ? 'location' : 'locations'}. You have full access to request consideration, view client contact information, and receive direct appointments.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 w-full md:w-auto">
            {summary?.stripeCustomerId && (
              <button
                type="button"
                onClick={handleStripeCustomerPortal}
                disabled={stripePortalLoading}
                className="btn-secondary py-2 px-4 text-xs font-semibold flex items-center justify-center gap-2 whitespace-nowrap"
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
              onClick={() => handleToggleSubscription(false)}
              disabled={loading}
              className="text-xs font-semibold text-slate-600 hover:text-red-700 bg-white hover:bg-red-50 border border-slate-200 rounded-xl px-4 py-2 transition-all flex items-center justify-center"
            >
              Pause Subscription
            </button>
          </div>
        </div>
      )}

      {/* Itemized Locations Breakdown Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-indigo-600" />
            <span>Clinic Locations & Cumulative Cost Breakdown</span>
          </h3>
          <span className="text-xs text-slate-500">
            {locList.length} {locList.length === 1 ? 'clinic registered' : 'clinics registered'}
          </span>
        </div>

        {locList.length > 0 ? (
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4">Clinic Location</th>
                  <th className="py-3 px-4">UK Postcode</th>
                  <th className="py-3 px-4">Coverage Radius</th>
                  <th className="py-3 px-4 text-right">Monthly Tier Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {locList.map((loc) => {
                  const isEditing = editingRadiusMap[loc.id];
                  const isBusy = updatingId === loc.id;
                  return (
                    <tr key={loc.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                          <span>{loc.address || 'Clinic Location'}</span>
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
                                className="text-[11px] text-slate-400 hover:text-slate-600"
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
                                title="Change radius"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900 text-sm">
                        £{loc.monthlyCost}<span className="text-[10px] font-normal text-slate-500">/mo</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50/90 font-bold text-xs border-t-2 border-slate-200">
                  <td colSpan="3" className="py-3.5 px-4 text-slate-700 uppercase tracking-wider">
                    Total Cumulative Monthly Investment:
                  </td>
                  <td className="py-3.5 px-4 text-right text-base font-black text-indigo-900">
                    £{totalCost}<span className="text-xs font-normal text-slate-500">/mo</span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl space-y-2 text-xs text-slate-500">
            <p>No clinic locations registered. Add a clinic location above to configure your subscription.</p>
          </div>
        )}
      </div>

      {/* Radius Reference & Payment Methods Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100 text-xs">
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
          <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-blue-600" />
            <span>Radius Pricing Reference (Per Location)</span>
          </h4>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-600">
            <div>&bull; 10 Miles: <strong>£10/mo</strong></div>
            <div>&bull; 30 Miles: <strong>£20/mo</strong></div>
            <div>&bull; 50 Miles: <strong>£30/mo</strong></div>
            <div>&bull; 100 Miles: <strong>£50/mo</strong></div>
            <div className="col-span-2">&bull; 500 Miles (Nationwide): <strong>£300/mo</strong> (1 loc covers UK)</div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
          <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Billing & Invoice Guarantee</span>
          </h4>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Automated monthly billing via Stripe supporting UK Direct Debit (Bacs) and Credit/Debit Cards. HMRC-compliant itemized VAT receipts and invoices accessible 24/7.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProviderSubscriptionManager;
