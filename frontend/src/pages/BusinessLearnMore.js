import React from 'react';
import { Card, CardContent, CardHeader } from "../components/ui/card"
import { Link } from 'react-router-dom';

const BusinessLearnMore = () => {
  const currentProblems = [
    { title: '3 in 10 Workers with Long Term Problem', description: '30% of workers in a recent survey said they had a physical or mental health problem that they expected to last 12 months or more.' },
    { title: '35% of Workers off Sick', description: 'Around one-third (35%) of workers reported a sickness absence in the past 12 months.' },
    { title: '8% on Long Term Sick', description: 'Eight per cent of employees had experienced a long-term sickness absence lasting four weeks or more.' },
    { title: 'Stress and Anxiety', description: 'A sixth of workers experience a mental health problem at any one time and stress, anxiety and depression are thought to be responsible for almost half of working days lost in Britain due to health issues.' },
  ];

  const benefits = [
    { title: 'Increased Productivity', description: 'Healthy employees have reduced sick leave (absenteeism) and reduced presenteeism (when an employee is constantly present at work despite being unwell).' },
    { title: 'Legal Compliance', description: 'Occupational health supports compliance to a range of legislation and regulations, such as the Equality Act 2010, The Management of Health and Safety at Work Regulations 1999, Health and Safety at Work etc Act 1974, RIDDOR 2013 and other acts owned by the HSE.' },
    { title: 'Corporate reputation', description: 'Organisations that look after their employees are more attractive places to work. This in turn can support the recruitment and retention rates and reduce costs associated with staff turnover.' },
    { title: '£5 return for every £1 spent', description: 'There is a really positive case for Employers investing in Mental Health, with an average return of £5 for every £1 spent on assistance.' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">Benefits of Occupational Health to your Business</h1>
      
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4 text-red-600 text-center">What is the current problem?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {currentProblems.map((problem, index) => (
            <Card key={index} className="bg-red-50">
              <CardHeader className="font-bold text-center">{problem.title}</CardHeader>
              <CardContent>{problem.description}</CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4 text-blue-600 text-center">How can Occupational Health help?</h2>
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
        <Link to="/register/business" className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600">
          Register Your Business
        </Link>
      </div>
    </div>
  );
};

export default BusinessLearnMore;
