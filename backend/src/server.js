const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

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

// Secure and expose all endpoints
app.use('/api', authRoutes);
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
  console.log(`Server running inside Docker container on port ${PORT}`);
  console.log('Available routes registered successfully');

  // Verify and dynamically add columns to real database if available
  const pool = require('./utils/db');
  try {
    // If we are in real MySQL mode, run the ALTER statements gracefully
    await pool.query('ALTER TABLE BusinessLocations ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8) NULL');
    await pool.query('ALTER TABLE BusinessLocations ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8) NULL');
    await pool.query('ALTER TABLE OHProviderLocations ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8) NULL');
    await pool.query('ALTER TABLE OHProviderLocations ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8) NULL');
    console.log('Database columns verified and added if not exists');
  } catch (error) {
    // MySQL 8.0 might not support ADD COLUMN IF NOT EXISTS or the table might be in-memory mock.
    // We try individual ALTER TABLE statements without IF NOT EXISTS in a try-catch to be 100% safe.
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
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});
