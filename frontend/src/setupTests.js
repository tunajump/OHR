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

