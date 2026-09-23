import React from 'react';
import { Card, CardContent, CardHeader } from "../components/ui/card"
import { Link } from 'react-router-dom';

const ProviderLearnMore = () => {
  const currentMethods = [
    { title: 'Hope that a web search gives your details to prospective clients', description: '' },
    { title: 'Hope that a current client tells someone else about your business', description: '' },
    { title: 'Spend on advertising locally', description: '' },
    { title: 'Cold calling businesses to see if they can use your services', description: '' },
  ];

  const benefits = [
    { title: 'More Enquiries', description: 'OHReferral.co.uk allows Businesses to submit their enquiry online. If your Area and Services match, you get informed of the Lead.' },
    { title: 'New Client Relationships', description: 'Once a Business has chosen you for their work, you are free to contract with them for additional work. A New Relationship has started.' },
    { title: 'Ratings System', description: 'We allow Businesses to rate the Services they have been given. Show other Businesses why they should choose you for their next task.' },
    { title: 'Fair Pricing', description: 'We charge a monthly fee based on the area covered by your Business, so you are not paying for enquiries that you can\'t provide service for.' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">Benefits of OHReferral.co.uk to your Business</h1>
      
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4 text-red-600 text-center">How do you currently get leads?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {currentMethods.map((method, index) => (
            <Card key={index} className="bg-red-50">
              <CardHeader className="font-bold text-center">{method.title}</CardHeader>
              <CardContent>{method.description}</CardContent>
            </Card>
          ))}
        </div>
      </section>

      <h3 className="text-xl font-semibold mb-4 text-blue-600 text-center">There is now a Better way!</h3>

      <section>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {benefits.map((benefit, index) => (
            <Card key={index} className="bg-green-50">
              <CardHeader className="font-bold text-center">{benefit.title}</CardHeader>
              <CardContent>{benefit.description}</CardContent>
            </Card>
          ))}
        </div>
      </section>

      <div className="mt-8 text-center">
      <Link to="/register/provider" className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600">
          Register as an OH Provider
        </Link>
      </div>
    </div>
  );
};

export default ProviderLearnMore;