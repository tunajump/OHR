import React from 'react';
import { Link } from 'react-router-dom';
import businessImage from '../assets/businesses.png';
import employeeImage from '../assets/employees.png';
import providerImage from '../assets/providers.png';

const Home = () => {
  const handleEmployeeAction = () => {
    const subject = encodeURIComponent("Occupational Health Support for Our Company");
    const body = encodeURIComponent(
      "Dear Manager,\n\n" +
      "I recently came across a service called OH Referral that could benefit our company. " +
      "It's a platform that helps businesses find and manage Occupational Health support. " +
      "I think it could be valuable for improving workplace health and productivity.\n\n" +
      "You can find more information at: https://ohreferral.co.uk\n\n" +
      "Could we discuss the possibility of exploring this service for our team?\n\n" +
      "Best regards,\n[Your Name]"
    );
    
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const buttonClass = "inline-block px-6 py-2 rounded-full transition duration-300 text-center text-white";

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-center mb-4">Making Occupational Health Accessible to All</h1>
      <p className="text-center mb-12 text-gray-600">
        Only 45% of workers in Britain have access to some form of occupational health. We think every employee deserves that opportunity.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white p-6 rounded-lg shadow-md flex flex-col h-full">
          <img 
            src={businessImage} 
            alt="Warehouse worker operating a forklift"
            className="w-full h-48 object-cover mb-4 rounded"
          />
          <h2 className="text-2xl font-semibold mb-4">For Businesses</h2>
          <p className="mb-6 flex-grow">
            This is a free service to help you to quickly find Occupational Health support near you. You can compare and select from the suppliers available to help improve the health of your workforce.
          </p>
          <div className="text-center">
            <Link to="/business/learn-more" className={`${buttonClass} bg-blue-500 hover:bg-blue-600`}>Learn more</Link>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md flex flex-col h-full">
          <img 
            src={employeeImage} 
            alt="Construction workers using power tools"
            className="w-full h-48 object-cover mb-4 rounded"
          />
          <h2 className="text-2xl font-semibold mb-4">For Employees</h2>
          <p className="mb-6 flex-grow">
            Occupational Health helps you continue to do a good job. When you need advice or support when work becomes a burden, OH is there for you. Inform your manager about this site so they can explore options to support you and your colleagues.
          </p>
          <div className="text-center">
            <button 
              onClick={handleEmployeeAction} 
              className={`${buttonClass} bg-green-500 hover:bg-green-600`}
            >
              Email Your Manager
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md flex flex-col h-full">
          <img 
            src={providerImage} 
            alt="Healthcare professional consulting with a patient"
            className="w-full h-48 object-cover mb-4 rounded"
          />
          <h2 className="text-2xl font-semibold mb-4">For OH Providers</h2>
          <p className="mb-6 flex-grow">
            Sign up to get access to requests from Businesses who need OH support. You can specify the area(s) you cover and what services you can provide to help Businesses with their staff issues.
          </p>
          <div className="text-center">
            <Link to="/providers/learn-more" className={`${buttonClass} bg-blue-500 hover:bg-blue-600`}>Learn more</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;