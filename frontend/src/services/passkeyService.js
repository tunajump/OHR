import { startRegistration, startAuthentication, browserSupportsWebAuthn } from '@simplewebauthn/browser';
import api from './api';

export const isPasskeySupported = () => {
  return typeof window !== 'undefined' && browserSupportsWebAuthn();
};

const safeStartRegistration = async (options) => {
  try {
    return await startRegistration(options);
  } catch (err) {
    if (err && err.message && err.message.includes('replace')) {
      return await startRegistration({ optionsJSON: options });
    }
    throw err;
  }
};

const safeStartAuthentication = async (options) => {
  try {
    return await startAuthentication(options);
  } catch (err) {
    if (err && err.message && err.message.includes('replace')) {
      return await startAuthentication({ optionsJSON: options });
    }
    throw err;
  }
};

export const registerPasswordlessUser = async (userData) => {
  if (!isPasskeySupported()) {
    throw new Error('Passkeys & biometric security are not supported on this browser/device.');
  }

  // 1. Request passwordless registration challenge from backend
  const optionsRes = await api.post('/auth/passkey/register-passwordless-options', {
    email: userData.email,
    name: userData.name,
    phone: userData.phone
  });
  const options = optionsRes.data;

  // 2. Prompt browser / OS biometric authenticator
  const registrationResponse = await safeStartRegistration(options);

  // 3. Verify on backend and create account
  const verifyRes = await api.post('/auth/passkey/register-passwordless-verify', {
    ...userData,
    ...registrationResponse
  });

  return verifyRes.data;
};

export const registerPasskey = async (deviceName = 'My Device (Face ID / Fingerprint)') => {
  if (!isPasskeySupported()) {
    throw new Error('Passkeys & biometric security are not supported on this browser/device.');
  }

  // 1. Get registration options from backend
  const optionsRes = await api.post('/auth/passkey/register-options');
  const options = optionsRes.data;

  // 2. Prompt browser / OS authenticator (Touch ID, Face ID, Windows Hello, YubiKey)
  const registrationResponse = await safeStartRegistration(options);

  // 3. Send response to backend for cryptographic verification and storage
  const verifyRes = await api.post('/auth/passkey/register-verify', {
    ...registrationResponse,
    deviceName
  });

  return verifyRes.data;
};

export const loginWithPasskey = async (email = '') => {
  if (!isPasskeySupported()) {
    throw new Error('Passkeys & biometric security are not supported on this browser/device.');
  }

  // 1. Get authentication challenge from backend
  const optionsRes = await api.post('/auth/passkey/login-options', { email: email.trim() });
  const options = optionsRes.data;

  // 2. Prompt browser authenticator for 1-click biometric login
  const authResponse = await safeStartAuthentication(options);

  // 3. Verify signature on backend and receive session token
  const verifyRes = await api.post('/auth/passkey/login-verify', authResponse);

  return verifyRes.data;
};

export const getRegisteredPasskeys = async () => {
  const res = await api.get('/auth/passkey/list');
  return res.data;
};

export const deletePasskey = async (id) => {
  const res = await api.delete('/auth/passkey/' + id);
  return res.data;
};
