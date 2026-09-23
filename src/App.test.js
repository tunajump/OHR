import React from 'react';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

jest.mock('@simplewebauthn/browser', () => ({
  startRegistration: jest.fn().mockResolvedValue({ id: 'mock_pk', response: {} }),
  startAuthentication: jest.fn().mockResolvedValue({ id: 'mock_pk', response: {} }),
  browserSupportsWebAuthn: jest.fn().mockReturnValue(true),
  browserSupportsWebAuthnAutofill: jest.fn().mockResolvedValue(true)
}));

import App from './App';
import { AuthProvider } from './context/AuthContext';

test('renders OHR application root cleanly', () => {
  const { container } = render(
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  );
  expect(container).toBeDefined();
});
