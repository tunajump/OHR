import React from 'react';
import { Link } from 'react-router-dom';

const BusinessLearnMore = () => {
  return (
    <div className="flex-1 bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-10">
        {/* Title */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#111827] tracking-tight">
            Benefits of Occupational Health to your Business
          </h1>
          <p className="text-base sm:text-lg font-bold text-[#dc2626]">
            What is the current problem?
          </p>
        </div>

        {/* 4 Problem Cards (Pink/Red) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-[#fef2f2] border border-[#fee2e2] rounded-xl p-5 shadow-sm flex flex-col justify-start">
            <h3 className="text-base font-bold text-[#1e293b] mb-2">
              3 in 10 Workers with Long Term Problem
            </h3>
            <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
              30% of workers in a recent survey said they had a physical or mental health problem that they expected to last 12 months or more.
            </p>
          </div>

          <div className="bg-[#fef2f2] border border-[#fee2e2] rounded-xl p-5 shadow-sm flex flex-col justify-start">
            <h3 className="text-base font-bold text-[#1e293b] mb-2">
              35% of Workers off Sick
            </h3>
            <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
              Around one-third (35%) of workers reported a sickness absence in the past 12 months.
            </p>
          </div>

          <div className="bg-[#fef2f2] border border-[#fee2e2] rounded-xl p-5 shadow-sm flex flex-col justify-start">
            <h3 className="text-base font-bold text-[#1e293b] mb-2">
              8% on Long Term Sick
            </h3>
            <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
              Eight per cent of employees had experienced a long-term sickness absence lasting four weeks or more.
            </p>
          </div>

          <div className="bg-[#fef2f2] border border-[#fee2e2] rounded-xl p-5 shadow-sm flex flex-col justify-start">
            <h3 className="text-base font-bold text-[#1e293b] mb-2">
              Stress and Anxiety
            </h3>
            <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
              A sixth of workers experience a mental health problem at any one time and stress, anxiety and depression are thought to be responsible for almost half of working days lost in Britain due to health issues.
            </p>
          </div>
        </div>

        {/* Green Section Subtitle */}
        <div className="text-center pt-4">
          <p className="text-base sm:text-lg font-bold text-[#2563eb]">
            How can Occupational Health help?
          </p>
        </div>

        {/* 4 Solution Cards (Green) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-[#f0fdf4] border border-[#dcfce7] rounded-xl p-5 shadow-sm flex flex-col justify-start">
            <h3 className="text-base font-bold text-[#1e293b] mb-2">
              Increased Productivity
            </h3>
            <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
              Healthy employees have reduced sick leave (absenteeism) and reduced presenteeism (when an employee is constantly present at work despite being unwell).
            </p>
          </div>

          <div className="bg-[#f0fdf4] border border-[#dcfce7] rounded-xl p-5 shadow-sm flex flex-col justify-start">
            <h3 className="text-base font-bold text-[#1e293b] mb-2">
              Legal Compliance
            </h3>
            <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
              Occupational health supports compliance to a range of legislation and regulations, such as the Equality Act 2010, The Management of Health and Safety at Work Regulations 1999, Health and Safety at Work etc Act 1974, RIDDOR 2013 and other acts owned by the HSE.
            </p>
          </div>

          <div className="bg-[#f0fdf4] border border-[#dcfce7] rounded-xl p-5 shadow-sm flex flex-col justify-start">
            <h3 className="text-base font-bold text-[#1e293b] mb-2">
              Corporate reputation
            </h3>
            <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
              Organisations that look after their employees are more attractive places to work. This in turn and can support the recruitment and retention rates and reduce costs associated with staff turnover.
            </p>
          </div>

          <div className="bg-[#f0fdf4] border border-[#dcfce7] rounded-xl p-5 shadow-sm flex flex-col justify-start">
            <h3 className="text-base font-bold text-[#1e293b] mb-2">
              £5 return for every £1 spent
            </h3>
            <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
              There is a really positive case for Employers investing in Mental Health, with an average return of £5 for every £1 spent on assistance.
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
