import '@testing-library/jest-dom';

jest.mock('@simplewebauthn/browser', () => ({
  startRegistration: jest.fn().mockResolvedValue({
    id: 'mock_cred_id_123',
    rawId: 'mock_raw_id_123',
    response: {
      clientDataJSON: 'mock_client_data',
      attestationObject: 'mock_attestation',
      transports: ['internal']
    },
    type: 'public-key'
  }),
  startAuthentication: jest.fn().mockResolvedValue({
    id: 'mock_cred_id_123',
    rawId: 'mock_raw_id_123',
    response: {
      clientDataJSON: 'mock_client_data',
      authenticatorData: 'mock_auth_data',
      signature: 'mock_signature',
      userHandle: 'mock_user_handle'
    },
    type: 'public-key'
  }),
  browserSupportsWebAuthn: jest.fn().mockReturnValue(true),
  browserSupportsWebAuthnAutofill: jest.fn().mockResolvedValue(true)
}), { virtual: true });

// Mock axios globally to handle Jest ESM module import compatibility in react-scripts
jest.mock('axios', () => {
  const mockInstance = {
    get: jest.fn().mockResolvedValue({ data: {} }),
    post: jest.fn().mockResolvedValue({ data: {} }),
    put: jest.fn().mockResolvedValue({ data: {} }),
    delete: jest.fn().mockResolvedValue({ data: {} }),
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() }
    }
  };

  return {
    __esModule: true,
    default: {
      ...mockInstance,
      create: jest.fn(() => mockInstance)
    },
    create: jest.fn(() => mockInstance),
    get: jest.fn().mockResolvedValue({ data: {} }),
    post: jest.fn().mockResolvedValue({ data: {} }),
    put: jest.fn().mockResolvedValue({ data: {} }),
    delete: jest.fn().mockResolvedValue({ data: {} })
  };
});
