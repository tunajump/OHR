const express = require('express');
const { 
  register, 
  login, 
  verifyEmail, 
  resendVerification, 
  getCurrentUser
} = require('../controllers/authControllers');
const auth = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Registration and Login with Rate Limiting and Honeypot check
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);

// Email Verification endpoints
router.get('/verify-email', verifyEmail);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', authLimiter, resendVerification);

// Current user profile & status
router.get('/me', auth, getCurrentUser);
router.get('/user/me', auth, getCurrentUser);

module.exports = router;