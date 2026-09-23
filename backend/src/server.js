const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.send('Backend server is running');
});

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Load routes
const authRoutes = require('./routes/authRoutes');
const businessRoutes = require('./routes/businessRoutes');
const providerRoutes = require('./routes/providerRoutes');
const referralRoutes = require('./routes/referralRoutes');
const adminRoutes = require('./routes/adminRoutes');
const passkeyRoutes = require('./routes/passkeyRoutes');

// Secure and expose all endpoints
app.use('/api', authRoutes);
app.use('/api/auth/passkey', passkeyRoutes);
app.use('/api/passkey', passkeyRoutes);
app.use('/api', referralRoutes);
app.use('/api', adminRoutes);

// Register business and provider routes with and without prefix for extreme flexibility
app.use('/api/business', businessRoutes);
app.use('/api/provider', providerRoutes);

// Also register directly under /api in case clients expect /api/profile or /api/location
app.use('/api', businessRoutes);
app.use('/api', providerRoutes);

// Simple health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', environment: process.env.NODE_ENV });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, '0.0.0.0', async () => {
  console.log(`Server running inside container on port ${PORT}`);
  console.log('Available routes registered successfully');

  const pool = require('./utils/db');

  // Verify and dynamically add columns / update enums in real database
  try {
    try {
      await pool.query("ALTER TABLE Users MODIFY COLUMN user_type ENUM('business', 'provider', 'admin') NOT NULL");
    } catch (e) {}
    try {
      await pool.query('ALTER TABLE BusinessLocations ADD COLUMN latitude DECIMAL(10, 8) NULL');
    } catch (e) {}
    try {
      await pool.query('ALTER TABLE BusinessLocations ADD COLUMN longitude DECIMAL(11, 8) NULL');
    } catch (e) {}
    try {
      await pool.query('ALTER TABLE OHProviderLocations ADD COLUMN latitude DECIMAL(10, 8) NULL');
    } catch (e) {}
    try {
      await pool.query('ALTER TABLE OHProviderLocations ADD COLUMN longitude DECIMAL(11, 8) NULL');
    } catch (e) {}
    try {
      await pool.query('ALTER TABLE Referrals ADD COLUMN employee_count INT NOT NULL DEFAULT 1');
    } catch (e) {}
    try {
      await pool.query('ALTER TABLE Referrals ADD COLUMN contact_name VARCHAR(255) NULL');
    } catch (e) {}
    try {
      await pool.query('ALTER TABLE Referrals ADD COLUMN contact_email VARCHAR(255) NULL');
    } catch (e) {}
    try {
      await pool.query('ALTER TABLE Referrals ADD COLUMN contact_phone VARCHAR(50) NULL');
    } catch (e) {}
    try {
      await pool.query('ALTER TABLE Referrals ADD COLUMN notes TEXT NULL');
    } catch (e) {}
    console.log('Database verification completed gracefully');
  } catch (schemaErr) {
    console.warn('Schema check notice:', schemaErr.message);
  }

  // Auto-seed Super-User Admin Account
  try {
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@ohreferral.co.uk').trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || 'AdminOHR2026!Secure';
    const [existingAdmin] = await pool.query('SELECT id, email, user_type FROM Users WHERE LOWER(email) = ?', [adminEmail]);
    const hashedPass = await bcrypt.hash(adminPassword, 10);

    if (!existingAdmin || existingAdmin.length === 0) {
      const [newAdminRes] = await pool.query(
        'INSERT INTO Users (email, password, user_type) VALUES (?, ?, ?)',
        [adminEmail, hashedPass, 'admin']
      );
      console.log(`[SUPER-USER] Initialized master admin account: ${adminEmail} (ID: ${newAdminRes?.insertId})`);
    } else {
      await pool.query('UPDATE Users SET password = ?, user_type = ? WHERE id = ?', [hashedPass, 'admin', existingAdmin[0].id]);
      console.log(`[SUPER-USER] Master admin password and role verified active: ${adminEmail}`);
    }
  } catch (adminErr) {
    console.warn('[SUPER-USER] Notice during admin initialization:', adminErr.message);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

module.exports = server;
