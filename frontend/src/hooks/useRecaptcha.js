import { useState, useCallback, useEffect } from 'react';

const useRecaptcha = () => {
  const [recaptchaToken, setRecaptchaToken] = useState('');

  useEffect(() => {
    // Load the reCAPTCHA script
    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=6LcNoVAqAAAAABnX_1pSnApfZ5Fp-ayndl1eZnJo`;
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const executeRecaptcha = useCallback(async () => {
    if (window.grecaptcha) {
      try {
        console.log('Executing reCAPTCHA...');
        const token = await window.grecaptcha.execute('6LcNoVAqAAAAABnX_1pSnApfZ5Fp-ayndl1eZnJo', { action: 'submit' });
        console.log('reCAPTCHA token:', token);
        setRecaptchaToken(token);
        return token;
      } catch (error) {
        console.error('reCAPTCHA error:', error);
        return null;
      }
    } else {
      console.error('grecaptcha not available');
      return null;
    }
  }, []);

  return { recaptchaToken, executeRecaptcha };
};

export default useRecaptcha;