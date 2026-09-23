import React from 'react';
import { Link } from 'react-router-dom';

const ProvidersLearnMore = () => {
  return (
    <div className="flex-1 bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-10">
        {/* Title */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#111827] tracking-tight">
            Benefits of OHReferral.co.uk to your Business
          </h1>
          <p className="text-base sm:text-lg font-bold text-[#dc2626]">
            How do you currently get leads?
          </p>
        </div>

        {/* 4 Problem / Current Methods Cards (Pink/Red) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-[#fef2f2] border border-[#fee2e2] rounded-xl p-5 shadow-sm flex items-center justify-center text-center">
            <p className="text-sm font-medium text-[#334155] leading-relaxed">
              Hope that a web search gives your details to prospective clients
            </p>
          </div>

          <div className="bg-[#fef2f2] border border-[#fee2e2] rounded-xl p-5 shadow-sm flex items-center justify-center text-center">
            <p className="text-sm font-medium text-[#334155] leading-relaxed">
              Hope that a current client tells someone else about your business
            </p>
          </div>

          <div className="bg-[#fef2f2] border border-[#fee2e2] rounded-xl p-5 shadow-sm flex items-center justify-center text-center">
            <p className="text-sm font-medium text-[#334155] leading-relaxed">
              Spend on advertising locally
            </p>
          </div>

          <div className="bg-[#fef2f2] border border-[#fee2e2] rounded-xl p-5 shadow-sm flex items-center justify-center text-center">
            <p className="text-sm font-medium text-[#334155] leading-relaxed">
              Cold calling businesses to see if they can use your services
            </p>
          </div>
        </div>

        {/* Green Section Subtitle */}
        <div className="text-center pt-4">
          <p className="text-base sm:text-lg font-bold text-[#2563eb]">
            There is now a Better way!
          </p>
        </div>

        {/* 4 Solution Cards (Green) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-[#f0fdf4] border border-[#dcfce7] rounded-xl p-5 shadow-sm flex flex-col justify-start">
            <h3 className="text-base font-bold text-[#1e293b] mb-2">
              More Enquiries
            </h3>
            <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
              OHReferral.co.uk allows Businesses to submit their enquiry online. If your Area and Services match, you get informed of the Lead.
            </p>
          </div>

          <div className="bg-[#f0fdf4] border border-[#dcfce7] rounded-xl p-5 shadow-sm flex flex-col justify-start">
            <h3 className="text-base font-bold text-[#1e293b] mb-2">
              New Client Relationships
            </h3>
            <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
              Once a Business has chosen you for their work, you are free to contract with them for additional work. A New Relationship has started.
            </p>
          </div>

          <div className="bg-[#f0fdf4] border border-[#dcfce7] rounded-xl p-5 shadow-sm flex flex-col justify-start">
            <h3 className="text-base font-bold text-[#1e293b] mb-2">
              Ratings System
            </h3>
            <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
              We allow Businesses to rate the Services they have been given. Show other Businesses why they should choose you for their next task.
            </p>
          </div>

          <div className="bg-[#f0fdf4] border border-[#dcfce7] rounded-xl p-5 shadow-sm flex flex-col justify-start">
            <h3 className="text-base font-bold text-[#1e293b] mb-2">
              Fair Pricing
            </h3>
            <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
              We charge a monthly fee based on the area covered by your Business, so you are not paying for enquiries that you can't provide service for.
            </p>
          </div>
        </div>

        {/* Register for Free Button */}
        <div className="pt-6 flex justify-center">
          <Link
            to="/register?type=provider"
            className="px-8 py-3 rounded-full text-sm font-semibold text-white bg-[#0014a8] hover:bg-[#000f80] active:bg-[#000a50] shadow-md hover:shadow-lg transition-all duration-150 text-center"
          >
            Register for Free
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ProvidersLearnMore;
