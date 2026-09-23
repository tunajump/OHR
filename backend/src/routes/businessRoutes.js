const express = require('express');
const { 
  createBusinessProfile, 
  getBusinessProfile,
  addBusinessLocation, 
  getBusinessLocations,
  updateBusinessLocation,
  deleteBusinessLocation 
} = require('../controllers/businessController');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/profile', auth, getBusinessProfile);
router.post('/profile', auth, createBusinessProfile);

router.get('/locations', auth, getBusinessLocations);
router.post('/location', auth, addBusinessLocation);
router.put('/location/:id', auth, updateBusinessLocation);
router.delete('/location/:id', auth, deleteBusinessLocation);

module.exports = router;