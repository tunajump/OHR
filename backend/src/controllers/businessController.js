const pool = require('../utils/db');
const { geocodePostcode } = require('../utils/postcode');

exports.createBusinessProfile = async (req, res) => {
  const { companyName, contactPerson, phone } = req.body;
  const userId = req.user.id;

  try {
    const [result] = await pool.query(
      'INSERT INTO Businesses (user_id, company_name, contact_person, phone) VALUES (?, ?, ?, ?)',
      [userId, companyName, contactPerson, phone]
    );

    res.status(201).json({ message: 'Business profile created', businessId: result.insertId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.addBusinessLocation = async (req, res) => {
  const { address, city, state, country, postalCode, employeeCount } = req.body;
  const userId = req.user.id;

  if (!postalCode) {
    return res.status(400).json({ message: 'Postal code is required' });
  }

  try {
    // Get the business ID for the authenticated user
    const [businesses] = await pool.query('SELECT id FROM Businesses WHERE user_id = ?', [userId]);
    if (businesses.length === 0) {
      return res.status(400).json({ message: 'Business profile not found' });
    }
    const businessId = businesses[0].id;

    let latitude = null;
    let longitude = null;

    try {
      const coords = await geocodePostcode(postalCode);
      latitude = coords.latitude;
      longitude = coords.longitude;
    } catch (err) {
      if (err.message === 'Invalid postcode' || err.message.includes('Invalid')) {
        return res.status(400).json({ message: 'Invalid postcode. Please provide a valid UK postcode.' });
      }
      console.warn(`Geocoding warning for business location postal code ${postalCode}:`, err.message);
      // For other transient errors, let it continue with null coordinates per "prevent systemic failures" / "fail gracefully"
    }

    const [result] = await pool.query(
      'INSERT INTO BusinessLocations (business_id, address, city, state, country, postal_code, employee_count, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [businessId, address, city, state, country, postalCode, employeeCount, latitude, longitude]
    );

    res.status(201).json({
      message: 'Business location added',
      locationId: result.insertId,
      coordinates: { latitude, longitude }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};
