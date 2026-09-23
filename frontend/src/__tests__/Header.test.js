import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Header from '../components/layout/Header';
import AuthContext from '../context/AuthContext';

const renderWithContext = (authValues) => {
  return render(
    <BrowserRouter>
      <AuthContext.Provider value={authValues}>
        <Header />
      </AuthContext.Provider>
    </BrowserRouter>
  );
};

describe('Header Component - Stage Tests', () => {
  // STAGE 1: Unauthenticated State
  test('Stage 1: Displays Login and Register buttons when user is not authenticated', () => {
    renderWithContext({
      isAuthenticated: false,
      user: null,
      justRegistered: false,
      logout: jest.fn(),
      clearJustRegistered: jest.fn(),
    });

    const loginBtn = screen.getByRole('link', { name: /login/i });
    const registerBtn = screen.getByRole('link', { name: /register/i });

    expect(loginBtn).toBeInTheDocument();
    expect(registerBtn).toBeInTheDocument();
    expect(loginBtn).toHaveAttribute('href', '/login');
    expect(registerBtn).toHaveAttribute('href', '/register');
  });

  // STAGE 2: Post-Registration Notification on Header
  test('Stage 2: Shows post-registration banner and highlights Login button upon registration completion', () => {
    renderWithContext({
      isAuthenticated: false,
      user: null,
      justRegistered: true,
      logout: jest.fn(),
      clearJustRegistered: jest.fn(),
    });

    // Check banner
    const banner = screen.getByText(/Registration completed successfully! Please use the/i);
    expect(banner).toBeInTheDocument();

    // Check Ready badge / highlighted Login button
    expect(screen.getByText('Ready')).toBeInTheDocument();
    const loginLink = screen.getByRole('link', { name: /login/i });
    expect(loginLink).toBeInTheDocument();
  });

  // STAGE 3: Authenticated State (Business User)
  test('Stage 3: Displays Business User details, Dashboard link, and Logout button when authenticated', () => {
    const mockLogout = jest.fn();
    renderWithContext({
      isAuthenticated: true,
      user: { id: 1, email: 'company@example.com', userType: 'business' },
      justRegistered: false,
      logout: mockLogout,
      clearJustRegistered: jest.fn(),
    });

    expect(screen.getByText('company@example.com')).toBeInTheDocument();
    expect(screen.getByText('Business')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();

    // Login and Register buttons should not be visible in authenticated view
    expect(screen.queryByRole('link', { name: /^login$/i })).not.toBeInTheDocument();
  });

  // STAGE 4: Authenticated State (OH Provider) & Logout Trigger
  test('Stage 4: Displays OH Provider badge and allows logging out', () => {
    const mockLogout = jest.fn();
    renderWithContext({
      isAuthenticated: true,
      user: { id: 2, email: 'provider@clinic.co.uk', userType: 'provider' },
      justRegistered: false,
      logout: mockLogout,
      clearJustRegistered: jest.fn(),
    });

    expect(screen.getByText('provider@clinic.co.uk')).toBeInTheDocument();
    expect(screen.getByText('OH Provider')).toBeInTheDocument();

    const logoutBtn = screen.getByRole('button', { name: /logout/i });
    fireEvent.click(logoutBtn);
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});
