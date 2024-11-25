const pool = require('../utils/db');

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

  try {
    // Get the business ID for the authenticated user
    const [businesses] = await pool.query('SELECT id FROM Businesses WHERE user_id = ?', [userId]);
    if (businesses.length === 0) {
      return res.status(400).json({ message: 'Business profile not found' });
    }
    const businessId = businesses[0].id;

    const [result] = await pool.query(
      'INSERT INTO BusinessLocations (business_id, address, city, state, country, postal_code, employee_count) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [businessId, address, city, state, country, postalCode, employeeCount]
    );

    res.status(201).json({ message: 'Business location added', locationId: result.insertId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};