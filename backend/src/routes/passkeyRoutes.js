const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getRegistrationOptions,
  verifyRegistration,
  getAuthenticationOptions,
  verifyAuthentication,
  listUserPasskeys,
  deleteUserPasskey
} = require('../controllers/passkeyController');

// Registration routes (User must be logged in to register a passkey for their account)
router.post('/register-options', auth, getRegistrationOptions);
router.post('/register/options', auth, getRegistrationOptions);
router.post('/register-verify', auth, verifyRegistration);
router.post('/register/verify', auth, verifyRegistration);

// Authentication routes (Public: 1-click passwordless login)
router.post('/login-options', getAuthenticationOptions);
router.post('/login/options', getAuthenticationOptions);
router.post('/login-verify', verifyAuthentication);
router.post('/login/verify', verifyAuthentication);

// Manage passkeys
router.get('/list', auth, listUserPasskeys);
router.delete('/:id', auth, deleteUserPasskey);

module.exports = router;
