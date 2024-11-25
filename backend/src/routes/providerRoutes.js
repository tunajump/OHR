const express = require('express');
const { createProviderProfile, addProviderLocation, addProviderService } = require('../controllers/providerController');
const auth = require('../middleware/auth');

const router = express.Router();

router.post('/profile', auth,createProviderProfile);
router.post('/location', auth,addProviderLocation);
router.post('/service', auth, addProviderService);

module.exports = router;