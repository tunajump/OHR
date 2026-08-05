const axios = require('axios');

/**
 * Looks up the coordinates of a UK postcode using api.postcodes.io
 * @param {string} postcode 
 * @returns {Promise<{latitude: number, longitude: number}>}
 */
async function geocodePostcode(postcode) {
  if (!postcode || typeof postcode !== 'string') {
    throw new Error('Invalid postcode format');
  }

  // Remove spaces and encode
  const cleanPostcode = encodeURIComponent(postcode.trim());
  const url = `https://api.postcodes.io/postcodes/${cleanPostcode}`;

  try {
    const response = await axios.get(url, { timeout: 5000 });
    if (response.data && response.data.status === 200 && response.data.result) {
      const { latitude, longitude } = response.data.result;
      if (typeof latitude === 'number' && typeof longitude === 'number') {
        return { latitude, longitude };
      }
    }
    throw new Error('Could not resolve coordinates from response');
  } catch (error) {
    if (error.response && error.response.status === 404) {
      throw new Error('Invalid postcode');
    }
    throw new Error(`Geocoding error: ${error.message}`);
  }
}

module.exports = { geocodePostcode };
