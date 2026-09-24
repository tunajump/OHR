const express = require('express');
const { 
  createProviderProfile, 
  getProviderProfile,
  updateSubscription,
  getSubscriptionSummary,
  createCheckoutSession,
  createPortalSession,
  verifyCheckoutSession,
  handleStripeWebhook,
  addProviderLocation, 
  getProviderLocations,
  updateProviderLocation,
  deleteProviderLocation,
  addProviderService 
} = require('../controllers/providerController');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/profile', auth, getProviderProfile);
router.post('/profile', auth, createProviderProfile);
router.put('/profile', auth, createProviderProfile);
router.get('/subscription/summary', auth, getSubscriptionSummary);
router.post('/subscription/create-checkout-session', auth, createCheckoutSession);
router.post('/subscription/checkout', auth, createCheckoutSession);
router.post('/subscription/create-portal-session', auth, createPortalSession);
router.post('/subscription/portal', auth, createPortalSession);
router.post('/subscription/verify-session', auth, verifyCheckoutSession);
router.post('/subscription/verify', auth, verifyCheckoutSession);
router.post('/webhooks/stripe', handleStripeWebhook);

router.post('/subscribe', auth, updateSubscription);
router.put('/subscribe', auth, updateSubscription);
router.post('/profile/subscription', auth, updateSubscription);
router.put('/profile/subscription', auth, updateSubscription);

router.get('/locations', auth, getProviderLocations);
router.post('/location', auth, addProviderLocation);
router.put('/location/:id', auth, updateProviderLocation);
router.delete('/location/:id', auth, deleteProviderLocation);

router.post('/service', auth, addProviderService);

module.exports = router;