const express = require('express');
const { 
  createProviderProfile, 
  getProviderProfile,
  updateSubscription,
  addProviderLocation, 
  getProviderLocations,
  deleteProviderLocation,
  addProviderService 
} = require('../controllers/providerController');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/profile', auth, getProviderProfile);
router.post('/profile', auth, createProviderProfile);
router.post('/subscribe', auth, updateSubscription);
router.put('/subscribe', auth, updateSubscription);
router.post('/profile/subscription', auth, updateSubscription);
router.put('/profile/subscription', auth, updateSubscription);

router.get('/locations', auth, getProviderLocations);
router.post('/location', auth, addProviderLocation);
router.delete('/location/:id', auth, deleteProviderLocation);

router.post('/service', auth, addProviderService);

module.exports = router;