import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NewReferralModal from '../components/referrals/NewReferralModal';
import api from '../services/api';

jest.mock('../services/api');

describe('Referral Submission & Proximity Modal - Stage Tests', () => {
  const mockLocations = [
    { id: 1, address: '10 Downing St', city: 'London', postal_code: 'SW1A 2AA' },
  ];

  test('Stage 1: Renders referral form modal with service selector and location', () => {
    render(
      <NewReferralModal
        isOpen={true}
        onClose={jest.fn()}
        onReferralCreated={jest.fn()}
        locations={mockLocations}
      />
    );

    expect(screen.getByText(/Create New Referral/i)).toBeInTheDocument();
    expect(screen.getByText(/Person Submitting Referral/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e.g. Jane Doe/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/jane@company.co.uk/i)).toBeInTheDocument();
    expect(screen.getByText(/Management Referrals/i)).toBeInTheDocument();
    expect(screen.getByText(/10 Downing St, London/i)).toBeInTheDocument();
    expect(screen.getByText(/Number of Employees Involved/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Explain the background, reason for referral/i)).toBeInTheDocument();
  });

  test('Stage 2: Submits referral with employee count and renders matched provider result with calculated proximity distance', async () => {
    api.post.mockResolvedValueOnce({
      data: {
        status: 'matched',
        message: 'Referral created and matched to the closest qualified provider!',
        referralId: 42,
        employeeCount: 3,
        matchedProvider: {
          providerId: 1,
          companyName: 'Apex Health Ltd',
          contactPerson: 'Dr. Smith',
          phone: '020 7123 4567',
          distance: 2.06,
        },
      },
    });

    const mockOnReferralCreated = jest.fn();

    render(
      <NewReferralModal
        isOpen={true}
        onClose={jest.fn()}
        onReferralCreated={mockOnReferralCreated}
        locations={mockLocations}
      />
    );

    const nameInput = screen.getByPlaceholderText(/e.g. Jane Doe/i);
    const emailInput = screen.getByPlaceholderText(/jane@company.co.uk/i);
    const phoneInput = screen.getByPlaceholderText(/020 7946 0991/i);
    const notesInput = screen.getByPlaceholderText(/Explain the background, reason for referral/i);
    const employeeInput = screen.getByPlaceholderText('1');

    fireEvent.change(nameInput, { target: { value: 'Jane Doe' } });
    fireEvent.change(emailInput, { target: { value: 'jane@company.co.uk' } });
    fireEvent.change(phoneInput, { target: { value: '020 7946 0123' } });
    fireEvent.change(employeeInput, { target: { value: '3' } });
    fireEvent.change(notesInput, { target: { value: 'Ergonomic assessment needed' } });

    const submitBtn = screen.getByRole('button', { name: /submit & match/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/referrals', {
        businessLocationId: 1,
        services: ['Management Referrals'],
        serviceType: 'Management Referrals',
        employeeCount: 3,
        contactName: 'Jane Doe',
        contactEmail: 'jane@company.co.uk',
        contactPhone: '020 7946 0123',
        notes: 'Ergonomic assessment needed',
      });
    });

    // Check matched display inside waitFor
    await waitFor(() => {
      expect(screen.getByText(/Referral Matched!/i)).toBeInTheDocument();
      expect(screen.getByText(/Matched Provider: Apex Health Ltd/i)).toBeInTheDocument();
      expect(screen.getByText(/Proximity Distance: 2.06 miles/i)).toBeInTheDocument();
      expect(mockOnReferralCreated).toHaveBeenCalledTimes(1);
    });
  });

  test('Stage 3: Submits referral with on-the-fly postcode & headcount when no locations exist', async () => {
    api.post.mockResolvedValueOnce({
      data: {
        status: 'matched',
        message: 'Referral created and matched to the closest qualified provider!',
        referralId: 99,
        employeeCount: 5,
        matchedProvider: {
          providerId: 2,
          companyName: 'Manchester OH Care',
          contactPerson: 'Dr. Jones',
          phone: '0161 123 4567',
          distance: 1.4,
        },
      },
    });

    const mockOnReferralCreated = jest.fn();

    render(
      <NewReferralModal
        isOpen={true}
        onClose={jest.fn()}
        onReferralCreated={mockOnReferralCreated}
        locations={[]}
      />
    );

    expect(screen.getByText(/Auto-Created/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e.g. M1 1AE or SW1A 1AA/i)).toBeInTheDocument();

    const nameInput = screen.getByPlaceholderText(/e.g. Jane Doe/i);
    const emailInput = screen.getByPlaceholderText(/jane@company.co.uk/i);
    const phoneInput = screen.getByPlaceholderText(/020 7946 0991/i);
    const postcodeInput = screen.getByPlaceholderText(/e.g. M1 1AE or SW1A 1AA/i);
    const employeeInput = screen.getByPlaceholderText('1');

    fireEvent.change(nameInput, { target: { value: 'Alex HR' } });
    fireEvent.change(emailInput, { target: { value: 'alex@startup.co.uk' } });
    fireEvent.change(phoneInput, { target: { value: '0161 789 0123' } });
    fireEvent.change(postcodeInput, { target: { value: 'M1 1AE' } });
    fireEvent.change(employeeInput, { target: { value: '5' } });

    const submitBtn = screen.getByRole('button', { name: /submit & match/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/referrals', {
        postalCode: 'M1 1AE',
        locationEmployeeCount: '11-50',
        services: ['Management Referrals'],
        serviceType: 'Management Referrals',
        employeeCount: 5,
        contactName: 'Alex HR',
        contactEmail: 'alex@startup.co.uk',
        contactPhone: '0161 789 0123',
        notes: '',
      });
    });

    await waitFor(() => {
      expect(screen.getByText(/Referral Matched!/i)).toBeInTheDocument();
      expect(screen.getByText(/Matched Provider: Manchester OH Care/i)).toBeInTheDocument();
      expect(mockOnReferralCreated).toHaveBeenCalledTimes(1);
    });
  });
});
