import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../common/SEO';
import { 
  CheckCircle2, 
  MapPin, 
  ShieldCheck, 
  HelpCircle, 
  ArrowRight, 
  Zap, 
  Eye, 
  Sparkles, 
  Building2, 
  Stethoscope, 
  Calculator, 
  Plus, 
  Trash2,
  Lock,
  Compass
} from 'lucide-react';

const RADIUS_PRICING = [
  { radius: 10, price: 10, label: '10 Mile Radius', badge: 'Local Focus', desc: 'Ideal for local clinics servicing their immediate town or borough.' },
  { radius: 30, price: 20, label: '30 Mile Radius', badge: 'Most Popular', desc: 'Standard regional coverage covering greater metropolitan areas.' },
  { radius: 50, price: 30, label: '50 Mile Radius', badge: 'County-Wide', desc: 'Extended range covering surrounding counties and commuter belts.' },
  { radius: 100, price: 50, label: '100 Mile Radius', badge: 'Multi-County', desc: 'Broad coverage for regional hubs and mobile health surveillance units.' },
  { radius: 500, price: 300, label: '500 Miles (Nationwide)', badge: 'Complete UK', desc: 'Complete UK-wide coverage with a single registered practice location.' },
];

const ProvidersLearnMore = () => {
  // Interactive Calculator State
  const [calcLocations, setCalcLocations] = useState([
    { id: 1, name: 'London HQ Clinic', radius: 30 },
    { id: 2, name: 'Manchester Branch', radius: 10 },
  ]);

  const addCalcLocation = () => {
    const nextId = Date.now();
    setCalcLocations(prev => [
      ...prev,
      { id: nextId, name: `Clinic Location ${prev.length + 1}`, radius: 30 }
    ]);
  };

  const removeCalcLocation = (id) => {
    if (calcLocations.length <= 1) return;
    setCalcLocations(prev => prev.filter(loc => loc.id !== id));
  };

  const updateCalcRadius = (id, radius) => {
    setCalcLocations(prev => prev.map(loc => loc.id === id ? { ...loc, radius: Number(radius) } : loc));
  };

  const updateCalcName = (id, name) => {
    setCalcLocations(prev => prev.map(loc => loc.id === id ? { ...loc, name } : loc));
  };

  const calculateLocationPrice = (radius) => {
    const tier = RADIUS_PRICING.find(p => p.radius === Number(radius));
    return tier ? tier.price : 20;
  };

  const totalMonthlyCost = calcLocations.reduce((sum, loc) => sum + calculateLocationPrice(loc.radius), 0);

  return (
    <div className="flex-1 bg-white py-12 px-4 sm:px-6 lg:px-8 space-y-16">
      <SEO
        title="For OH Providers & Pricing Tiers | Occupational Health Network | OHReferral"
        description="Expand your clinical reach with fair, radius-based subscription pricing. Choose from 10 to 500 miles coverage per location. See all referral matches on our Free Tier."
        keywords="oh provider, occupational health, referral, health surveillance, mental health, employee issues, provider subscription, oh pricing"
      />

      <div className="max-w-6xl mx-auto space-y-16">
        {/* Header Hero */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
            <Stethoscope className="w-3.5 h-3.5 text-blue-600" />
            <span>Accredited Provider Network</span>
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#111827] tracking-tight">
            Grow Your Occupational Health Practice with High-Intent Corporate Referrals
          </h1>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
            Connect directly with UK employers searching for accredited <strong>OH providers</strong>. Receive qualified leads for <strong>health surveillance</strong>, <strong>mental health</strong> assessments, and statutory workplace checkups.
          </p>
        </div>

        {/* 4 Problem vs Solution Comparison */}
        <div className="space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              The Modern Way to Acquire Corporate Referral Clients
            </h2>
            <p className="text-sm text-slate-500">
              Traditional business acquisition vs OHReferral automated matching
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Old Outdated Methods */}
            <div className="bg-red-50/70 border border-red-200 rounded-2xl p-6 sm:p-7 space-y-4">
              <div className="flex items-center gap-2 text-red-700 font-bold text-base">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span>Traditional & Costly Acquisition</span>
              </div>
              <ul className="space-y-3 text-xs sm:text-sm text-slate-700">
                <li className="flex items-start gap-2.5">
                  <span className="text-red-500 font-bold mt-0.5">&times;</span>
                  <span>Relying on uncertain search engine rankings hoping businesses find your clinic for <strong>employee issues</strong>.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-red-500 font-bold mt-0.5">&times;</span>
                  <span>Paying expensive local PPC advertising campaigns with low conversion to actual clinical appointments.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-red-500 font-bold mt-0.5">&times;</span>
                  <span>Cold outreach to local businesses requiring statutory <strong>health surveillance</strong>.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-red-500 font-bold mt-0.5">&times;</span>
                  <span>Third-party broker agencies taking heavy commission percentages from every consultation fee.</span>
                </li>
              </ul>
            </div>

            {/* The OHReferral Advantage */}
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-6 sm:p-7 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-base">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>The OHReferral Advantage</span>
              </div>
              <ul className="space-y-3 text-xs sm:text-sm text-slate-700">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span><strong>Automated Referral Dispatch:</strong> Employers submit structured referrals which automatically match your clinic locations.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span><strong>Long-Term Client Relationships:</strong> Direct retention — when an employer chooses your clinic, you own the clinical relationship.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span><strong>Zero Referral Commission:</strong> Keep 100% of your consulting, surveillance, and assessment fees.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span><strong>Customizable Radius:</strong> Control exactly how far your practitioners travel or accept clients.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* SECTION: Transparent Subscription Tiers */}
        <div id="pricing" className="space-y-10 pt-4">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Subscription Pricing Model</span>
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Fair, Cumulative Radius-Based Subscriptions
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Start with our <strong>Free Tier</strong> to view live matching opportunities. When you're ready to accept referrals, choose your operational radius per location. Costs are cumulative per clinic branch.
            </p>
          </div>

          {/* 2 Core Tier Cards: Free vs Pro */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* Free Tier Card */}
            <div className="lg:col-span-4 bg-white border border-slate-200 rounded-3xl p-7 shadow-xs flex flex-col justify-between space-y-6">
              <div className="space-y-5">
                <div className="space-y-2">
                  <span className="badge bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold">
                    Free Match Preview
                  </span>
                  <h3 className="text-2xl font-extrabold text-slate-900">Free Tier</h3>
                  <div className="flex items-baseline gap-1 pt-1">
                    <span className="text-4xl font-black text-slate-900">£0</span>
                    <span className="text-xs font-semibold text-slate-500">/ forever</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    See what corporate opportunities match your clinic locations before subscribing.
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-700">What's included:</div>
                  <ul className="space-y-2.5 text-xs text-slate-600">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <span>Register unlimited clinic branches & practice locations</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <span>Live referral matching queue (Service types, distance, employee count)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <span>WebAuthn Passkey 1-Click Biometric Security</span>
                    </li>
                    <li className="flex items-start gap-2 text-slate-400">
                      <Lock className="w-4 h-4 text-slate-300 mt-0.5 flex-shrink-0" />
                      <span>Company name & contact info masked</span>
                    </li>
                    <li className="flex items-start gap-2 text-slate-400">
                      <Lock className="w-4 h-4 text-slate-300 mt-0.5 flex-shrink-0" />
                      <span>Request consideration & award disabled</span>
                    </li>
                  </ul>
                </div>
              </div>

              <Link
                to="/register?type=provider"
                className="w-full py-3 px-4 rounded-xl font-bold text-xs text-center border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800 transition-all block"
              >
                Join Free Tier
              </Link>
            </div>

            {/* Pro Radius-Based Subscription Card */}
            <div className="lg:col-span-8 bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 text-white rounded-3xl p-8 shadow-xl flex flex-col justify-between space-y-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <Compass className="w-48 h-48 text-white" />
              </div>

              <div className="space-y-6 relative z-10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <span className="badge bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 text-xs font-bold">
                      Full Referral Access
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                      Radius-Based Pro Subscription
                    </h3>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="text-xs text-blue-200">From only</span>
                    <div className="text-3xl font-black text-white">£10<span className="text-xs font-normal text-blue-200"> /mo per loc</span></div>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed max-w-2xl">
                  Unlocks direct business connections, full employer contact details, and the ability to request consideration and win ongoing referral accounts. Pricing scales simply by coverage radius and clinic count.
                </p>

                {/* Radius Breakdown Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                  {RADIUS_PRICING.map((item) => (
                    <div 
                      key={item.radius} 
                      className="p-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 transition-all space-y-1.5 backdrop-blur-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-blue-200">{item.label}</span>
                        <span className="text-base font-black text-white">£{item.price}<span className="text-[10px] font-normal text-blue-200">/m</span></span>
                      </div>
                      <p className="text-[11px] text-blue-100/70 line-clamp-2 leading-snug">
                        {item.desc}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Cumulative Rule Callout */}
                <div className="p-4 rounded-2xl bg-white/10 border border-white/20 text-xs text-blue-100 flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white">Cumulative Pricing Example: </span>
                    If your clinic operates 2 locations — e.g. London with 30 miles (£20/mo) and Manchester with 10 miles (£10/mo) — your total monthly subscription is simply <strong>£30/month</strong>.
                  </div>
                </div>
              </div>

              <div className="pt-2 relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-blue-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>No long-term contracts &bull; Cancel anytime &bull; VAT receipt provided</span>
                </div>

                <Link
                  to="/register?type=provider"
                  className="w-full sm:w-auto py-3 px-6 rounded-xl font-bold text-xs bg-white text-indigo-900 hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl text-center inline-flex items-center justify-center gap-2"
                >
                  <span>Start with Pro Subscription</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION: Dynamic Interactive Cost Calculator */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-3xl p-6 sm:p-10 space-y-8 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-blue-600" />
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Interactive Subscription Calculator
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-500">
                Add your practice clinic locations to calculate your exact monthly investment in real time.
              </p>
            </div>

            <button
              type="button"
              onClick={addCalcLocation}
              className="btn-secondary text-xs px-4 py-2 flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4 text-blue-600" />
              <span>Add Another Clinic</span>
            </button>
          </div>

          {/* Locations List */}
          <div className="space-y-4">
            {calcLocations.map((loc, index) => {
              const locPrice = calculateLocationPrice(loc.radius);
              return (
                <div 
                  key={loc.id} 
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 flex-1 w-full md:w-auto">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
                      #{index + 1}
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                        Clinic Name / Postcode Area
                      </label>
                      <input
                        type="text"
                        value={loc.name}
                        onChange={(e) => updateCalcName(loc.id, e.target.value)}
                        className="w-full text-xs font-semibold text-slate-800 bg-transparent border-0 border-b border-slate-200 focus:border-blue-600 focus:ring-0 px-0 py-0.5"
                        placeholder="e.g. Birmingham Clinic (B1 1TT)"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                    <div className="space-y-0.5">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Coverage Radius
                      </label>
                      <select
                        value={loc.radius}
                        onChange={(e) => updateCalcRadius(loc.id, e.target.value)}
                        className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="10">10 Miles (£10/mo)</option>
                        <option value="30">30 Miles (£20/mo)</option>
                        <option value="50">50 Miles (£30/mo)</option>
                        <option value="100">100 Miles (£50/mo)</option>
                        <option value="500">500 Miles Nationwide (£300/mo)</option>
                      </select>
                    </div>

                    <div className="text-right min-w-[80px]">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cost</div>
                      <div className="text-base font-extrabold text-blue-600">£{locPrice}<span className="text-xs font-normal text-slate-500">/mo</span></div>
                    </div>

                    {calcLocations.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCalcLocation(loc.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove location"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Total Bar */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
            <div className="space-y-0.5 text-center sm:text-left">
              <span className="text-xs text-slate-400 font-medium">
                Total Cumulative Subscription ({calcLocations.length} {calcLocations.length === 1 ? 'location' : 'locations'})
              </span>
              <div className="text-2xl sm:text-3xl font-black text-white">
                £{totalMonthlyCost} <span className="text-sm font-semibold text-slate-300">/ month (ex VAT)</span>
              </div>
            </div>

            <Link
              to="/register?type=provider"
              className="btn-primary py-3 px-6 text-xs font-bold flex items-center gap-2 whitespace-nowrap shadow-md hover:shadow-lg"
            >
              <span>Get Started with this Plan</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* SECTION: Frequently Asked Questions */}
        <div className="space-y-6 pt-4">
          <div className="text-center space-y-1">
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
              Provider Subscription FAQs
            </h3>
            <p className="text-xs sm:text-sm text-slate-500">
              Everything you need to know about our subscription and billing process
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs sm:text-sm">
            <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-2">
              <h4 className="font-bold text-slate-900 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-blue-600" />
                <span>How does cumulative pricing work?</span>
              </h4>
              <p className="text-slate-600 leading-relaxed text-xs">
                Each clinic location has its own independent coverage radius. If you have 2 clinics (e.g. 10 miles @ £10/m + 30 miles @ £20/m), your total invoice is simply £30/m. You can modify each location's radius anytime.
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-2">
              <h4 className="font-bold text-slate-900 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-blue-600" />
                <span>Can I test the platform before paying?</span>
              </h4>
              <p className="text-slate-600 leading-relaxed text-xs">
                Yes! Our <strong>Free Tier</strong> lets you register your clinics and see incoming referrals within your radius. You only activate a paid subscription when you want to request consideration and unlock full client details.
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-2">
              <h4 className="font-bold text-slate-900 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-blue-600" />
                <span>Are there contracts or cancellation fees?</span>
              </h4>
              <p className="text-slate-600 leading-relaxed text-xs">
                None. Subscriptions run month-to-month. You can upgrade, downgrade your radius, pause, or cancel at any time directly in your provider dashboard.
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-2">
              <h4 className="font-bold text-slate-900 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-blue-600" />
                <span>Do you take commission on referral fees?</span>
              </h4>
              <p className="text-slate-600 leading-relaxed text-xs">
                No. OHReferral charges only the flat radius subscription. You invoice employers directly according to your clinical fee structure and keep 100% of your earnings.
              </p>
            </div>
          </div>
        </div>

        {/* Final CTA */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 rounded-3xl p-8 sm:p-12 text-center text-white space-y-5 shadow-xl">
          <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Ready to Expand Your Occupational Health Practice?
          </h3>
          <p className="text-xs sm:text-sm text-blue-100 max-w-xl mx-auto leading-relaxed">
            Register your clinic in under 2 minutes with passwordless Passkeys and start receiving matched corporate referrals across the UK.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/register?type=provider"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-xs bg-white text-blue-900 hover:bg-blue-50 shadow-lg hover:shadow-xl transition-all"
            >
              Register Clinic as OH Provider
            </Link>
            <Link
              to="/contact"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold text-xs bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all"
            >
              Talk to Our Clinical Partnerships Team
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProvidersLearnMore;
