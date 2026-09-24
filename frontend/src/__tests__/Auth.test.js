import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

jest.mock('@simplewebauthn/browser', () => ({
  startRegistration: jest.fn().mockResolvedValue({ id: 'mock_pk', response: {} }),
  startAuthentication: jest.fn().mockResolvedValue({ id: 'mock_pk', response: {} }),
  browserSupportsWebAuthn: jest.fn().mockReturnValue(true),
  browserSupportsWebAuthnAutofill: jest.fn().mockResolvedValue(true)
}), { virtual: true });

jest.mock('../services/passkeyService', () => ({
  __esModule: true,
  isPasskeySupported: () => true,
  registerPasswordlessUser: jest.fn((data) => Promise.resolve({
    verified: true,
    token: 'mock_jwt_token',
    userId: 1,
    userType: data?.userType || 'business',
    message: 'Account created with Passkey!'
  })),
  loginWithPasskey: jest.fn(() => Promise.resolve({
    verified: true,
    token: 'mock_jwt_token',
    userType: 'business'
  })),
  getPasskeys: jest.fn(() => Promise.resolve([])),
  registerPasskey: jest.fn(() => Promise.resolve({ verified: true }))
}));

import Login from '../components/auth/Login';
import Register from '../components/auth/Register';
import AuthContext from '../context/AuthContext';
import * as passkeyService from '../services/passkeyService';

describe('Auth Views - Stage Tests', () => {
  // STAGE 1: Login Form Inputs & Submission
  test('Stage 1: Login form renders email and password fields, and submits credentials', async () => {
    const mockLogin = jest.fn().mockResolvedValue({
      success: true,
      user: { id: 1, email: 'test@example.com', userType: 'business' }
    });

    render(
      <BrowserRouter>
        <AuthContext.Provider value={{ login: mockLogin, justRegistered: false }}>
          <Login />
        </AuthContext.Provider>
      </BrowserRouter>
    );

    const emailInput = screen.getByPlaceholderText('name@company.co.uk');
    const passwordInput = screen.getByPlaceholderText('••••••••');
    const submitBtn = screen.getByRole('button', { name: /^sign in$/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  // STAGE 2: Passwordless Passkey Registration
  test('Stage 2: Register form renders 1-Click Passkey onboarding by default', async () => {
    render(
      <BrowserRouter>
        <AuthContext.Provider value={{ register: jest.fn() }}>
          <Register />
        </AuthContext.Provider>
      </BrowserRouter>
    );

    expect(screen.getByText('Business Requester')).toBeInTheDocument();
    expect(screen.getByText('OH Provider')).toBeInTheDocument();
    expect(screen.getByText('100% Passwordless Security')).toBeInTheDocument();

    const emailInput = screen.getByPlaceholderText('contact@company.co.uk');
    const phoneInput = screen.getByPlaceholderText('020 7946 0912');
    const nameInput = screen.getByPlaceholderText('Jane Smith');
    const orgInput = screen.getByPlaceholderText('Acme Logistics Ltd');
    const submitBtn = screen.getByRole('button', { name: /register with passkey/i });

    fireEvent.change(orgInput, { target: { value: 'Acme Test Corp' } });
    fireEvent.change(nameInput, { target: { value: 'Alice Admin' } });
    fireEvent.change(emailInput, { target: { value: 'alice@acme.co.uk' } });
    fireEvent.change(phoneInput, { target: { value: '020 7946 0912' } });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(passkeyService.registerPasswordlessUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'alice@acme.co.uk',
          name: 'Alice Admin',
          organizationName: 'Acme Test Corp',
          phone: '020 7946 0912',
          userType: 'business'
        })
      );
    });
  });

  // STAGE 3: Password Fallback Registration Mode
  test('Stage 3: Register form allows switching to standard password signup', async () => {
    const mockRegister = jest.fn().mockResolvedValue({ success: true, data: { userId: 1 } });

    render(
      <BrowserRouter>
        <AuthContext.Provider value={{ register: mockRegister }}>
          <Register />
        </AuthContext.Provider>
      </BrowserRouter>
    );

    // Switch to Password tab
    const passwordTab = screen.getByRole('button', { name: /^password$/i });
    fireEvent.click(passwordTab);

    const emailInput = screen.getByPlaceholderText('contact@company.co.uk');
    const phoneInput = screen.getByPlaceholderText('020 7946 0912');
    const passwordInputs = screen.getAllByPlaceholderText('••••••••');
    const nameInput = screen.getByPlaceholderText('Jane Smith');
    const orgInput = screen.getByPlaceholderText('Acme Logistics Ltd');
    const submitBtn = screen.getByRole('button', { name: /complete registration/i });

    fireEvent.change(orgInput, { target: { value: 'Acme Test Corp' } });
    fireEvent.change(nameInput, { target: { value: 'Alice Admin' } });
    fireEvent.change(emailInput, { target: { value: 'alice@acme.co.uk' } });
    fireEvent.change(phoneInput, { target: { value: '020 7946 0912' } });
    fireEvent.change(passwordInputs[0], { target: { value: 'secretPass123' } });
    fireEvent.change(passwordInputs[1], { target: { value: 'secretPass123' } });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        email: 'alice@acme.co.uk',
        password: 'secretPass123',
        userType: 'business',
        name: 'Alice Admin',
        organizationName: 'Acme Test Corp',
        phone: '020 7946 0912',
      });
    });
  });
});
