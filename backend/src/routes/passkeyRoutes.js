const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getRegistrationOptions,
  verifyRegistration,
  getPasswordlessRegistrationOptions,
  verifyPasswordlessRegistration,
  getAuthenticationOptions,
  verifyAuthentication,
  listUserPasskeys,
  deleteUserPasskey
} = require('../controllers/passkeyController');

// 1. Passwordless Registration (Public: Brand new user creates account with biometrics)
router.post('/register-passwordless-options', getPasswordlessRegistrationOptions);
router.post('/register/passwordless-options', getPasswordlessRegistrationOptions);
router.post('/register-passwordless-verify', verifyPasswordlessRegistration);
router.post('/register/passwordless-verify', verifyPasswordlessRegistration);

// 2. Authenticated Registration (User logged in adding another device/key)
router.post('/register-options', auth, getRegistrationOptions);
router.post('/register/options', auth, getRegistrationOptions);
router.post('/register-verify', auth, verifyRegistration);
router.post('/register/verify', auth, verifyRegistration);

// 3. Authentication (Public: 1-Click biometric login)
router.post('/login-options', getAuthenticationOptions);
router.post('/login/options', getAuthenticationOptions);
router.post('/login-verify', verifyAuthentication);
router.post('/login/verify', verifyAuthentication);

// 4. Manage Passkeys
router.get('/list', auth, listUserPasskeys);
router.delete('/:id', auth, deleteUserPasskey);

module.exports = router;
