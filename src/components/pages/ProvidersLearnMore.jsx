import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../common/SEO';

const ProvidersLearnMore = () => {
  return (
    <div className="flex-1 bg-white py-12 px-4 sm:px-6 lg:px-8">
      <SEO
        title="For OH Providers | Join the UK Occupational Health Referral Network | OHReferral"
        description="Expand your clinical reach as an accredited OH provider. Receive direct referral requests for health surveillance, mental health assessments, and employee issues across your coverage radius."
        keywords="oh provider, occupational health, referral, health surveillance, mental health, employee issues, occupational medicine clinics"
      />

      <div className="max-w-6xl mx-auto space-y-10">
        {/* Title */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#111827] tracking-tight">
            Benefits of OHReferral for Your OH Clinic
          </h1>
          <p className="text-base sm:text-lg font-bold text-[#dc2626]">
            How do you currently acquire new corporate referral clients?
          </p>
        </div>

        {/* 4 Problem / Current Methods Cards (Pink/Red) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-[#fef2f2] border border-[#fee2e2] rounded-xl p-5 shadow-sm flex items-center justify-center text-center">
            <p className="text-sm font-medium text-[#334155] leading-relaxed">
              Hoping that generic search engine algorithms display your clinic to employers searching for an <strong>OH provider</strong>
            </p>
          </div>

          <div className="bg-[#fef2f2] border border-[#fee2e2] rounded-xl p-5 shadow-sm flex items-center justify-center text-center">
            <p className="text-sm font-medium text-[#334155] leading-relaxed">
              Relying strictly on word-of-mouth recommendations for complex <strong>employee issues</strong>
            </p>
          </div>

          <div className="bg-[#fef2f2] border border-[#fee2e2] rounded-xl p-5 shadow-sm flex items-center justify-center text-center">
            <p className="text-sm font-medium text-[#334155] leading-relaxed">
              Paying high local advertising budgets without guaranteed corporate <strong>referral</strong> leads
            </p>
          </div>

          <div className="bg-[#fef2f2] border border-[#fee2e2] rounded-xl p-5 shadow-sm flex items-center justify-center text-center">
            <p className="text-sm font-medium text-[#334155] leading-relaxed">
              Cold outreach to local businesses needing statutory <strong>health surveillance</strong>
            </p>
          </div>
        </div>

        {/* Green Section Subtitle */}
        <div className="text-center pt-4">
          <p className="text-base sm:text-lg font-bold text-[#2563eb]">
            There is now a better way with OHReferral!
          </p>
        </div>

        {/* 4 Solution Cards (Green) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-[#f0fdf4] border border-[#dcfce7] rounded-xl p-5 shadow-sm flex flex-col justify-start">
            <h3 className="text-base font-bold text-[#1e293b] mb-2">
              Automated Referral Inquiries
            </h3>
            <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
              UK businesses submit structured <strong>referral</strong> requests online. When their postcode and requested services match your clinic, you receive the lead instantly.
            </p>
          </div>

          <div className="bg-[#f0fdf4] border border-[#dcfce7] rounded-xl p-5 shadow-sm flex flex-col justify-start">
            <h3 className="text-base font-bold text-[#1e293b] mb-2">
              Ongoing Client Relationships
            </h3>
            <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
              Once an employer selects your clinic for workplace <strong>mental health</strong> or <strong>health surveillance</strong>, you establish a direct, long-term clinical relationship.
            </p>
          </div>

          <div className="bg-[#f0fdf4] border border-[#dcfce7] rounded-xl p-5 shadow-sm flex flex-col justify-start">
            <h3 className="text-base font-bold text-[#1e293b] mb-2">
              Verified OH Provider Accreditation
            </h3>
            <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
              Showcase your expertise across statutory surveillance, preplacements, and resolving complex <strong>employee issues</strong> to corporate clients.
            </p>
          </div>

          <div className="bg-[#f0fdf4] border border-[#dcfce7] rounded-xl p-5 shadow-sm flex flex-col justify-start">
            <h3 className="text-base font-bold text-[#1e293b] mb-2">
              Fair, Radius-Based Model
            </h3>
            <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
              You specify your coverage radius so you only receive <strong>occupational health</strong> inquiries you can conveniently service.
            </p>
          </div>
        </div>

        {/* Register for Free Button */}
        <div className="pt-6 flex justify-center">
          <Link
            to="/register?type=provider"
            className="px-8 py-3 rounded-full text-sm font-semibold text-white bg-[#0014a8] hover:bg-[#000f80] active:bg-[#000a50] shadow-md hover:shadow-lg transition-all duration-150 text-center"
          >
            Register as an OH Provider
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ProvidersLearnMore;
