const jwt = require('jsonwebtoken');
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
    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'A user with this email address already exists' });
    }

    // Create new user using the User model
    const newUser = await User.create({
      email,
      password,
      userType,
      name: name || '',
      organizationName: organizationName || ''
    });

    const userId = newUser.id;

    // Also automatically create profile row if organizationName/companyName is passed
    const pool = require('../utils/db');
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
    const token = jwt.sign({ id: userId }, process.env.JWT_SECRET || 'fallback_jwt_secret_key_123', { expiresIn: '1h' });

    res.status(201).json({ token, userId, userType: newUser.userType || newUser.user_type });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: error.message || 'Server error during registration' });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    // Find user using User model
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Check password using the comparePassword instance method
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Create JWT token
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'fallback_jwt_secret_key_123', { expiresIn: '1h' });

    res.json({ token, userId: user.id, userType: user.userType || user.user_type });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: error.message || 'Server error during login' });
  }
};
