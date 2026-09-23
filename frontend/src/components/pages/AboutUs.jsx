import React from 'react';

const AboutUs = () => {
  return (
    <div className="flex-1 bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-extrabold text-slate-900">About OHReferral</h1>
        <p className="text-base text-slate-600 leading-relaxed">
          OHReferral is dedicated to bridging the occupational health gap across the UK. With only 45% of workers currently having access to occupational health support, our mission is to make workplace health services accessible, rapid, and transparent for every business and worker.
        </p>
        <div className="space-y-4 pt-4">
          <h2 className="text-xl font-bold text-slate-900">Our Services</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            We pair UK businesses with accredited local Occupational Health practitioners covering Management Referrals, Health Surveillance, and Preplacements through automated postcode geocoding.
          </p>
        </div>
        <div className="space-y-4 pt-4">
          <h2 className="text-xl font-bold text-slate-900">Contact Us</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            For enquiries or support, please email <strong>contact@ohreferral.co.uk</strong> or visit our office at Tunajump Services Ltd.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AboutUs;
