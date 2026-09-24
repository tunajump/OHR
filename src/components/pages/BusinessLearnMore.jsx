import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../common/SEO';

const BusinessLearnMore = () => {
  return (
    <div className="flex-1 bg-white py-12 px-4 sm:px-6 lg:px-8">
      <SEO
        title="Occupational Health for Businesses | Referrals & Health Surveillance | OHReferral"
        description="Empower your business with accredited OH providers. Resolve employee issues, improve workplace mental health, submit management referrals, and ensure statutory health surveillance."
        keywords="occupational health, referral, employee issues, mental health, oh provider, health surveillance, sickness absence management"
      />

      <div className="max-w-6xl mx-auto space-y-10">
        {/* Title */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#111827] tracking-tight">
            Benefits of Occupational Health to Your Business
          </h1>
          <p className="text-base sm:text-lg font-bold text-[#dc2626]">
            What is the current challenge for UK employers?
          </p>
        </div>

        {/* 4 Problem Cards (Pink/Red) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-[#fef2f2] border border-[#fee2e2] rounded-xl p-5 shadow-sm flex flex-col justify-start">
            <h3 className="text-base font-bold text-[#1e293b] mb-2">
              3 in 10 Workers with Long Term Problems
            </h3>
            <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
              30% of workers report a physical or <strong>mental health</strong> problem lasting 12 months or more, creating complex <strong>employee issues</strong> for HR managers.
            </p>
          </div>

          <div className="bg-[#fef2f2] border border-[#fee2e2] rounded-xl p-5 shadow-sm flex flex-col justify-start">
            <h3 className="text-base font-bold text-[#1e293b] mb-2">
              35% of Workers Off Sick
            </h3>
            <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
              Around one-third (35%) of UK employees report sickness absence annually. An early <strong>management referral</strong> helps facilitate a timely return to work.
            </p>
          </div>

          <div className="bg-[#fef2f2] border border-[#fee2e2] rounded-xl p-5 shadow-sm flex flex-col justify-start">
            <h3 className="text-base font-bold text-[#1e293b] mb-2">
              8% on Long Term Sick
            </h3>
            <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
              Eight percent experience sickness absence lasting four weeks or more. Engaging an accredited <strong>OH provider</strong> delivers expert medical guidance.
            </p>
          </div>

          <div className="bg-[#fef2f2] border border-[#fee2e2] rounded-xl p-5 shadow-sm flex flex-col justify-start">
            <h3 className="text-base font-bold text-[#1e293b] mb-2">
              Workplace Stress & Mental Health
            </h3>
            <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
              One in six workers experience a <strong>mental health</strong> issue at any one time. Stress, anxiety, and depression account for nearly half of all lost working days.
            </p>
          </div>
        </div>

        {/* Blue Section Subtitle */}
        <div className="text-center pt-4">
          <p className="text-base sm:text-lg font-bold text-[#2563eb]">
            How does an accredited OH Provider help?
          </p>
        </div>

        {/* 4 Solution Cards (Green) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-[#f0fdf4] border border-[#dcfce7] rounded-xl p-5 shadow-sm flex flex-col justify-start">
            <h3 className="text-base font-bold text-[#1e293b] mb-2">
              Increased Productivity
            </h3>
            <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
              Healthy employees experience reduced sickness absence and presenteeism. Fast <strong>occupational health</strong> interventions resolve workplace friction quickly.
            </p>
          </div>

          <div className="bg-[#f0fdf4] border border-[#dcfce7] rounded-xl p-5 shadow-sm flex flex-col justify-start">
            <h3 className="text-base font-bold text-[#1e293b] mb-2">
              HSE & Health Surveillance Compliance
            </h3>
            <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
              Statutory <strong>health surveillance</strong> programs ensure compliance with HSE, RIDDOR 2013, COSHH, and the Health & Safety at Work Act 1974.
            </p>
          </div>

          <div className="bg-[#f0fdf4] border border-[#dcfce7] rounded-xl p-5 shadow-sm flex flex-col justify-start">
            <h3 className="text-base font-bold text-[#1e293b] mb-2">
              Corporate Reputation & Retention
            </h3>
            <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
              Organisations proactively addressing <strong>employee issues</strong> and <strong>mental health</strong> enjoy higher staff retention and lower recruitment turnover costs.
            </p>
          </div>

          <div className="bg-[#f0fdf4] border border-[#dcfce7] rounded-xl p-5 shadow-sm flex flex-col justify-start">
            <h3 className="text-base font-bold text-[#1e293b] mb-2">
              £5 Return for Every £1 Invested
            </h3>
            <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
              Investing in workplace <strong>mental health</strong> and timely <strong>referral</strong> assessments yields an average return of £5 for every £1 spent.
            </p>
          </div>
        </div>

        {/* Register for Free Button */}
        <div className="pt-6 flex justify-center">
          <Link
            to="/register?type=business"
            className="px-8 py-3 rounded-full text-sm font-semibold text-white bg-[#0014a8] hover:bg-[#000f80] active:bg-[#000a50] shadow-md hover:shadow-lg transition-all duration-150 text-center"
          >
            Register for Free
          </Link>
        </div>
      </div>
    </div>
  );
};

export default BusinessLearnMore;
