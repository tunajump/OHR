import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import useRecaptcha from '../hooks/useRecaptcha';
import emailjs from 'emailjs-com';

const Registration = () => {
  const { userType } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    organizationName: '',
  });
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const { executeRecaptcha } = useRecaptcha();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleReturnHome = () => {
    navigate('/');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      console.log('Executing reCAPTCHA...');
      // const recaptchaToken = await executeRecaptcha();
      // console.log('reCAPTCHA token:', recaptchaToken);

      // if (!recaptchaToken) {
      //   setError('reCAPTCHA verification failed. Please try again.');
      //   return;
      // }

      // const response = await fetch('http://localhost:5000/api/register', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     ...formData,
      //     userType,
      //     recaptchaToken,
      //   }),
      // });

      emailjs.send('service_nl1tj5t', 'template_zwf536w', formData, 'W372M8SZkxZCrO8WA').then(
        () => {
          console.log('email sent successfully ===')
          setIsSuccess(true);
        },
        (error) => {
          console.log('email submit faild ===', error.text)
          setError(error.text || 'Registration failed');
          setIsSuccess(true);
        }
      )

      //   console.log('Response status:', response.status);
      //   console.log('Response headers:', response.headers);

      //   const contentType = response.headers.get("content-type");
      //   console.log('Content-Type:', contentType);

      //   if (contentType && contentType.indexOf("application/json") !== -1) {
      //     const data = await response.json();
      //     if (!response.ok) {
      //       throw new Error(data.message || 'Registration failed');
      //     }
      //     setIsSuccess(true);
      //   } else {
      //     const text = await response.text();
      //     console.error('Received non-JSON response:', text);
      //     throw new Error('Received invalid response from server');
      //   }
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.message || 'Registration failed');
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 p-8">
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-6 w-6 text-green-500" />
            <AlertTitle className="text-xl font-semibold text-green-800">Registration Successful!</AlertTitle>
            <AlertDescription className="mt-2 text-green-700">
              Thank you for registering with us! We will send you an email notification as soon as our service goes live.
              We appreciate your interest and look forward to serving you.
            </AlertDescription>
          </Alert>

          <button
            onClick={handleReturnHome}
            className="mt-6 w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
          >
            Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-center">
        Register as {userType === 'business' ? 'a Business' : 'an OH Provider'}
      </h1>
      <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-4">
        <div>
          <label htmlFor="name" className="block mb-1">Your Name</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border rounded"
          />
        </div>
        <div>
          <label htmlFor="email" className="block mb-1">Contact Email Address</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border rounded"
          />
        </div>
        <div>
          <label htmlFor="organizationName" className="block mb-1">Organization Name</label>
          <input
            type="text"
            id="organizationName"
            name="organizationName"
            value={formData.organizationName}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border rounded"
          />
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 transition-colors duration-200 font-medium">
          Register
        </button>
      </form>
    </div>
  );
};

export default Registration;