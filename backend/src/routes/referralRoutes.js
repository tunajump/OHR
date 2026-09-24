const express = require('express');
const { 
  createReferral, 
  getReferral, 
  listReferrals,
  updateReferral,
  deleteReferral,
  requestConsideration,
  selectProvider,
  closeReferral
} = require('../controllers/referralController');
const auth = require('../middleware/auth');
const { referralLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/referrals', auth, referralLimiter, createReferral);
router.post('/referral', auth, referralLimiter, createReferral);
router.get('/referrals', auth, listReferrals);
router.get('/referrals/:id', auth, getReferral);
router.put('/referrals/:id', auth, updateReferral);
router.delete('/referrals/:id', auth, deleteReferral);

// Consideration request by provider & provider selection / closure by business
router.post('/referrals/:id/request-consideration', auth, requestConsideration);
router.post('/referrals/:id/respond', auth, requestConsideration);
router.post('/referrals/:id/select-provider', auth, selectProvider);
router.post('/referrals/:id/select-providers', auth, selectProvider);
router.post('/referrals/:id/close', auth, closeReferral);
router.put('/referrals/:id/close', auth, closeReferral);

module.exports = router;
