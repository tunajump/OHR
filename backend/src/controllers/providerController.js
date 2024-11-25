const pool = require('../utils/db');

exports.createProviderProfile = async (req, res) => {
  const { companyName, contactPerson, phone } = req.body;
  const userId = req.user.id;

  try {
    const [result] = await pool.query(
      'INSERT INTO OHProviders (user_id, company_name, contact_person, phone) VALUES (?, ?, ?, ?)',
      [userId, companyName, contactPerson, phone]
    );

    res.status(201).json({ message: 'OH Provider profile created', providerId: result.insertId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.addProviderLocation = async (req, res) => {
  const { address, city, state, country, postalCode, coverageRadius } = req.body;
  const userId = req.user.id;

  try {
    // Get the provider ID for the authenticated user
    const [providers] = await pool.query('SELECT id FROM OHProviders WHERE user_id = ?', [userId]);
    if (providers.length === 0) {
      return res.status(400).json({ message: 'Provider profile not found' });
    }
    const providerId = providers[0].id;

    const [result] = await pool.query(
      'INSERT INTO OHProviderLocations (provider_id, address, city, state, country, postal_code, coverage_radius) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [providerId, address, city, state, country, postalCode, coverageRadius]
    );

    res.status(201).json({ message: 'Provider location added', locationId: result.insertId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.addProviderService = async (req, res) => {
  const { serviceType } = req.body;
  const userId = req.user.id;

  try {
    // Get the provider ID for the authenticated user
    const [providers] = await pool.query('SELECT id FROM OHProviders WHERE user_id = ?', [userId]);
    if (providers.length === 0) {
      return res.status(400).json({ message: 'Provider profile not found' });
    }
    const providerId = providers[0].id;

    const [result] = await pool.query(
      'INSERT INTO OHProviderServices (provider_id, service_type) VALUES (?, ?)',
      [providerId, serviceType]
    );

    res.status(201).json({ message: 'Provider service added', serviceId: result.insertId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};