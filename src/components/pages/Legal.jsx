import React from 'react';

const Legal = () => {
  return (
    <div className="flex-1 bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-extrabold text-slate-900">Legal & Privacy Notice</h1>
        <p className="text-sm text-slate-600 leading-relaxed">
          OHReferral is operated by <strong>Tunajump Services Ltd</strong>. All data processing is carried out in strict accordance with the UK Data Protection Act 2018 and UK GDPR regulations.
        </p>
        <div className="space-y-3 pt-2">
          <h2 className="text-lg font-bold text-slate-900">Terms of Use</h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            By accessing OHReferral.co.uk, businesses and providers agree to accurate representation of their credentials and medical registrations. OH Providers must hold active accreditations when delivering occupational health services.
          </p>
        </div>
        <div className="space-y-3 pt-2">
          <h2 className="text-lg font-bold text-slate-900">Privacy & Confidentiality</h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            All medical records and referral information are strictly confidential and encrypted at rest and in transit using TLS. Non-subscribed providers do not receive identifying details of business enquiries.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Legal;
