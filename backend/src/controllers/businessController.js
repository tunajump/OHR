const pool = require('../utils/db');
const { geocodePostcode } = require('../utils/postcode');

exports.createBusinessProfile = async (req, res) => {
  const { companyName, contactPerson, phone } = req.body;
  const userId = req.user.id;

  try {
    const [existing] = await pool.query('SELECT id FROM Businesses WHERE user_id = ?', [userId]);
    if (existing.length > 0) {
      await pool.query(
        'UPDATE Businesses SET company_name = ?, contact_person = ?, phone = ? WHERE id = ?',
        [companyName, contactPerson, phone, existing[0].id]
      );
      return res.status(201).json({ message: 'Business profile updated', businessId: existing[0].id });
    }

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

exports.getBusinessProfile = async (req, res) => {
  const userId = req.user.id;
  try {
    const [businesses] = await pool.query('SELECT * FROM Businesses WHERE user_id = ?', [userId]);
    if (businesses.length === 0) {
      return res.status(404).json({ message: 'Business profile not found' });
    }
    res.json(businesses[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getBusinessLocations = async (req, res) => {
  const userId = req.user.id;
  try {
    const [businesses] = await pool.query('SELECT id FROM Businesses WHERE user_id = ?', [userId]);
    if (businesses.length === 0) {
      return res.json([]);
    }
    const businessId = businesses[0].id;

    const [locations] = await pool.query('SELECT * FROM BusinessLocations WHERE business_id = ?', [businessId]);
    res.json(locations);
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
    let [businesses] = await pool.query('SELECT id FROM Businesses WHERE user_id = ?', [userId]);
    let businessId;
    if (businesses.length === 0) {
      const [newBiz] = await pool.query(
        'INSERT INTO Businesses (user_id, company_name, contact_person, phone) VALUES (?, ?, ?, ?)',
        [userId, 'My Business Ltd', 'Contact Person', '']
      );
      businessId = newBiz.insertId;
    } else {
      businessId = businesses[0].id;
    }

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
    }

    const [result] = await pool.query(
      'INSERT INTO BusinessLocations (business_id, address, city, state, country, postal_code, employee_count, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [businessId, address || '', city || '', state || '', country || 'United Kingdom', postalCode, employeeCount || '11-50', latitude, longitude]
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

exports.updateBusinessLocation = async (req, res) => {
  const { id } = req.params;
  const { address, city, state, country, postalCode, employeeCount } = req.body;
  const userId = req.user.id;

  if (!postalCode) {
    return res.status(400).json({ message: 'Postal code is required' });
  }

  try {
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
      console.warn(`Geocoding warning for business location update ${postalCode}:`, err.message);
    }

    await pool.query(
      'UPDATE BusinessLocations SET address = ?, city = ?, state = ?, country = ?, postal_code = ?, employee_count = ?, latitude = ?, longitude = ? WHERE id = ? AND business_id = ?',
      [address || '', city || '', state || '', country || 'United Kingdom', postalCode, employeeCount || '11-50', latitude, longitude, id, businessId]
    );

    res.json({
      message: 'Business location updated successfully',
      locationId: id,
      coordinates: { latitude, longitude }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteBusinessLocation = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const [businesses] = await pool.query('SELECT id FROM Businesses WHERE user_id = ?', [userId]);
    if (businesses.length === 0) {
      return res.status(400).json({ message: 'Business profile not found' });
    }
    const businessId = businesses[0].id;

    await pool.query('DELETE FROM BusinessLocations WHERE id = ? AND business_id = ?', [id, businessId]);

    res.json({ message: 'Business location deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};
