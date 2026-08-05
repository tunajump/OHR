const express = require('express');
const { createReferral, getReferral, listReferrals } = require('../controllers/referralController');
const auth = require('../middleware/auth');

const router = express.Router();

router.post('/referrals', auth, createReferral);
router.post('/referral', auth, createReferral);
router.get('/referrals', auth, listReferrals);
router.get('/referrals/:id', auth, getReferral);

module.exports = router;
