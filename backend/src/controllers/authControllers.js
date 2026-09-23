const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('../utils/db');
const User = require('../models/User');

const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

const isValidPhone = (phone) => {
  if (!phone || typeof phone !== 'string') return false;
  const digitsOnly = phone.replace(/[^0-9]/g, '');
  return digitsOnly.length >= 10 && digitsOnly.length <= 15 && /^[+]?[\d\s().-]{10,20}$/.test(phone.trim());
};

exports.register = async (req, res) => {
  const { email, password, userType, name, organizationName, phone } = req.body;

  if (!email || !password || !userType) {
    return res.status(400).json({ message: 'Email, password, and user type are required' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ message: 'A valid email address is required (e.g. name@company.co.uk)' });
  }

  if (!phone || !isValidPhone(phone)) {
    return res.status(400).json({ message: 'A valid telephone number is required (min 10 digits, e.g. 020 7946 0912)' });
  }

  try {
    const cleanEmail = String(email).trim().toLowerCase();
    
    // Check if user already exists
    const [existingUsers] = await pool.query('SELECT id FROM Users WHERE LOWER(email) = ?', [cleanEmail]);
    if (existingUsers && existingUsers.length > 0) {
      return res.status(400).json({ message: 'A user with this email address already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [insertUserRes] = await pool.query(
      'INSERT INTO Users (email, password, user_type) VALUES (?, ?, ?)',
      [cleanEmail, hashedPassword, userType]
    );
    const userId = insertUserRes.insertId;

    // Create profile row if business or provider
    if (userType === 'business') {
      try {
        await pool.query(
          'INSERT INTO Businesses (user_id, company_name, contact_person, phone) VALUES (?, ?, ?, ?)',
          [userId, organizationName || name || 'My Business Ltd', name || 'Contact Person', phone || '']
        );
      } catch (err) {
        console.warn('Auto profile insertion notice:', err.message);
      }
    } else if (userType === 'provider') {
      try {
        await pool.query(
          'INSERT INTO OHProviders (user_id, company_name, contact_person, phone, is_subscribed) VALUES (?, ?, ?, ?, ?)',
          [userId, organizationName || name || 'My OH Clinic Ltd', name || 'Clinician', phone || '', true]
        );
      } catch (err) {
        console.warn('Auto profile insertion notice:', err.message);
      }
    }

    // Create JWT token
    const token = jwt.sign(
      { id: userId, user_type: userType },
      process.env.JWT_SECRET || 'fallback_jwt_secret_key_123',
      { expiresIn: '7d' }
    );

    return res.status(201).json({ token, userId, userType });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ message: error.message || 'Server error during registration' });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const cleanEmail = String(email).trim().toLowerCase();
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@ohreferral.co.uk').trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || 'AdminOHR2026!Secure';

    // Direct database lookup
    const [users] = await pool.query('SELECT * FROM Users WHERE LOWER(email) = ?', [cleanEmail]);

    let user = null;
    let isMatch = false;

    if (users && users.length > 0) {
      user = users[0];
      isMatch = await bcrypt.compare(password, user.password);

      // If it is the admin super-user and password matches master password, allow and sync
      if (!isMatch && cleanEmail === adminEmail && password === adminPassword) {
        isMatch = true;
        const newHash = await bcrypt.hash(adminPassword, 10);
        await pool.query('UPDATE Users SET password = ?, user_type = ? WHERE id = ?', [newHash, 'admin', user.id]);
        user.user_type = 'admin';
      }
    } else if (cleanEmail === adminEmail && password === adminPassword) {
      // Auto-provision master admin immediately if not found
      const newHash = await bcrypt.hash(adminPassword, 10);
      const [insertRes] = await pool.query('INSERT INTO Users (email, password, user_type) VALUES (?, ?, ?)', [adminEmail, newHash, 'admin']);
      user = { id: insertRes.insertId, email: adminEmail, user_type: 'admin' };
      isMatch = true;
    }

    if (!user || !isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const userType = user.user_type || user.userType || 'business';

    // Create long-lived JWT token
    const token = jwt.sign(
      { id: user.id, user_type: userType },
      process.env.JWT_SECRET || 'fallback_jwt_secret_key_123',
      { expiresIn: '7d' }
    );

    return res.json({ token, userId: user.id, userType });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: error.message || 'Server error during login' });
  }
};
