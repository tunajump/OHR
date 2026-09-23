import React from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div className="flex-1 bg-white">
      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        {/* Main Headline & Subtitle */}
        <div className="text-center max-w-4xl mx-auto mb-12 sm:mb-14">
          <h1 className="text-3xl sm:text-4xl lg:text-[40px] font-extrabold text-[#09090b] tracking-tight leading-tight">
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
                  alt="Industrial warehouse logistics worker"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6">
                <h2 className="text-xl font-bold text-slate-900 mb-3">
                  For Businesses
                </h2>
                <p className="text-xs sm:text-sm text-[#475569] leading-relaxed font-normal">
                  This is a free service to help you to quickly find Occupational Health support near you. You can compare and select from the suppliers available to help improve the health of your workforce.
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
                  alt="Workplace employees collaborating safely"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6">
                <h2 className="text-xl font-bold text-slate-900 mb-3">
                  For Employees
                </h2>
                <p className="text-xs sm:text-sm text-[#475569] leading-relaxed font-normal">
                  Occupational Health helps you continue to do a good job. When you need advice or support when work becomes a burden OH is there for you. Tell your Employer about this site so they can sign up and help you in your work.
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
                  alt="Occupational health doctor in consultation"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6">
                <h2 className="text-xl font-bold text-slate-900 mb-3">
                  For OH Providers
                </h2>
                <p className="text-xs sm:text-sm text-[#475569] leading-relaxed font-normal">
                  Sign up to get access to requests from Businesses who need OH support. You can specify the area(s) you cover and what services you can provide to help Businesses with their staff issues.
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
      </div>
    </div>
  );
};

export default Home;
