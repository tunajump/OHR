import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, HeartPulse, Stethoscope, Users } from 'lucide-react';
import SEO from '../common/SEO';

const Home = () => {
  return (
    <div className="flex-1 bg-white">
      <SEO
        title="OHReferral | UK Occupational Health Referral Platform & OH Provider Network"
        description="Connect UK businesses with accredited local OH providers. Fast referral matching for employee issues, mental health support, statutory health surveillance, and preplacements."
        keywords="employee issues, mental health, referral, occupational health, oh provider, health surveillance, management referral, workplace health"
      />

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-16">
        {/* Main Headline & Subtitle */}
        <div className="text-center max-w-4xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/60 text-blue-700 text-xs font-semibold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            UK Occupational Health Referral & Provider Network
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-extrabold text-[#09090b] tracking-tight leading-tight">
            Making Occupational Health Accessible to All
          </h1>
          <p className="mt-3 text-sm sm:text-base text-[#64748b] font-normal leading-relaxed max-w-2xl mx-auto">
            Only 45% of workers in Britain have access to some form of occupational health. We think every employee deserves that opportunity.
          </p>
        </div>

        {/* 3-Column Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch max-w-6xl mx-auto">
          {/* Card 1: For Businesses */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow duration-200">
            <div>
              <div className="aspect-[16/10] w-full overflow-hidden bg-slate-100">
                <img
                  src="/images/business.png"
                  onError={(e) => { e.target.src = '/images/business.jpg'; }}
                  alt="Industrial warehouse logistics worker receiving workplace support"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6">
                <h2 className="text-xl font-bold text-slate-900 mb-3">
                  For Businesses
                </h2>
                <p className="text-xs sm:text-sm text-[#475569] leading-relaxed font-normal">
                  This is a free service to help you quickly find <strong>Occupational Health</strong> support near you. Compare and select from accredited local providers to submit a <strong>referral</strong>, conduct <strong>health surveillance</strong>, and support <strong>employee issues</strong>.
                </p>
              </div>
            </div>

            <div className="px-6 pb-6 pt-2 flex justify-start">
              <Link
                to="/business/learn-more"
                className="border border-[#4338ca] text-[#4338ca] hover:bg-[#4338ca] hover:text-white px-7 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors duration-150 text-center"
              >
                Learn more
              </Link>
            </div>
          </div>

          {/* Card 2: For Employees */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow duration-200">
            <div>
              <div className="aspect-[16/10] w-full overflow-hidden bg-slate-100">
                <img
                  src="/images/employee.png"
                  onError={(e) => { e.target.src = '/images/employee.jpg'; }}
                  alt="Workplace employees collaborating safely with mental health support"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6">
                <h2 className="text-xl font-bold text-slate-900 mb-3">
                  For Employees
                </h2>
                <p className="text-xs sm:text-sm text-[#475569] leading-relaxed font-normal">
                  <strong>Occupational Health</strong> helps you continue to do a good job. When you need advice or support when work becomes a burden, or for workplace <strong>mental health</strong> and <strong>employee issues</strong>, OH is there for you. Tell your employer about OHReferral.
                </p>
              </div>
            </div>

            <div className="px-6 pb-6 pt-2 flex justify-start">
              <Link
                to="/employees/learn-more"
                className="border border-[#4338ca] text-[#4338ca] hover:bg-[#4338ca] hover:text-white px-7 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors duration-150 text-center"
              >
                Learn more
              </Link>
            </div>
          </div>

          {/* Card 3: For OH Providers */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow duration-200">
            <div>
              <div className="aspect-[16/10] w-full overflow-hidden bg-slate-100">
                <img
                  src="/images/provider.jpg"
                  alt="Accredited OH provider conducting clinical health surveillance consultation"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6">
                <h2 className="text-xl font-bold text-slate-900 mb-3">
                  For OH Providers
                </h2>
                <p className="text-xs sm:text-sm text-[#475569] leading-relaxed font-normal">
                  Register as an accredited <strong>OH provider</strong> to receive direct <strong>referral</strong> requests from UK businesses in your radius. Offer specialist <strong>health surveillance</strong>, management referrals, and assistance for complex <strong>employee issues</strong>.
                </p>
              </div>
            </div>

            <div className="px-6 pb-6 pt-2 flex justify-start">
              <Link
                to="/providers/learn-more"
                className="border border-[#4338ca] text-[#4338ca] hover:bg-[#4338ca] hover:text-white px-7 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors duration-150 text-center"
              >
                Learn more
              </Link>
            </div>
          </div>
        </div>

        {/* SEO Feature Breakdown Section */}
        <div className="max-w-6xl mx-auto pt-6 border-t border-slate-200/80 space-y-10">
          <div className="text-center max-w-3xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Complete Occupational Health & Referral Solutions
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Addressing the most pressing workforce challenges across the UK through intelligent clinical matching.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1: Employee Issues & Mental Health */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                <HeartPulse className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Employee Issues & Mental Health</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Workplace stress, depression, and anxiety account for almost half of lost working days. Our platform helps employers address <strong>employee issues</strong> early and provide structured <strong>mental health</strong> interventions with clinical confidentiality.
              </p>
            </div>

            {/* Feature 2: Fast Referral Matching */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Rapid Management Referral</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Submit a seamless <strong>management referral</strong> in minutes. Our postcode geocoding engine pairs you with the nearest qualified <strong>OH provider</strong> to provide impartial medical assessments and return-to-work plans.
              </p>
            </div>

            {/* Feature 3: Statutory Health Surveillance */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <Stethoscope className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Statutory Health Surveillance</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Fulfill HSE compliance effortlessly with statutory <strong>health surveillance</strong> programs covering audiometry, spirometry, skin checks, and HAVS assessments delivered by qualified occupational health practitioners.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
