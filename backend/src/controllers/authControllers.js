const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.register = async (req, res) => {
  const { email, password, userType, name, organizationName } = req.body;

  if (!email || !password || !userType) {
    return res.status(400).json({ message: 'Email, password, and user type are required' });
  }

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user using the Sequelize User model
    const newUser = await User.create({
      email,
      password,
      userType,
      name: name || '',
      organizationName: organizationName || ''
    });

    const userId = newUser.id;

    // Create JWT token
    const token = jwt.sign({ id: userId }, process.env.JWT_SECRET || 'fallback_jwt_secret_key_123', { expiresIn: '1h' });

    res.status(201).json({ token, userId, userType: newUser.userType });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    // Find user using Sequelize User model
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password using the comparePassword instance method
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Create JWT token
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'fallback_jwt_secret_key_123', { expiresIn: '1h' });

    res.json({ token, userId: user.id, userType: user.userType });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};
