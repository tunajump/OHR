const express = require('express');
const { createBusinessProfile, addBusinessLocation } = require('../controllers/businessController');
const auth = require('../middleware/auth');

const router = express.Router();

router.post('/profile',auth, createBusinessProfile);
router.post('/location',auth, addBusinessLocation);

module.exports = router;