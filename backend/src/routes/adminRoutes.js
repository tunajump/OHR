const express = require('express');
const router = express.Router();
const pool = require('../utils/db');
const auth = require('../middleware/auth');

// Middleware to restrict access to super-users (admin)
const requireAdmin = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    const [users] = await pool.query('SELECT user_type FROM Users WHERE id = ?', [userId]);
    if (!users || users.length === 0 || (users[0].user_type !== 'admin' && users[0].userType !== 'admin')) {
      return res.status(403).json({ message: 'Access denied: Super-User / Admin privileges required.' });
    }
    req.isAdmin = true;
    next();
  } catch (error) {
    return res.status(500).json({ message: 'Authorization verification failed', error: error.message });
  }
};

// In-memory store for employee notifications
let employeeNotifications = [];

// Record employee notification (public)
router.post('/employees/notify', async (req, res) => {
  const { employeeName, employeeEmail, companyName, managerEmail, message } = req.body;
  
  if (!companyName || !managerEmail) {
    return res.status(400).json({ message: 'Company name and manager email are required.' });
  }

  const newRecord = {
    id: employeeNotifications.length + 1,
    employee_name: employeeName || 'Anonymous',
    employee_email: employeeEmail || 'N/A',
    company_name: companyName,
    manager_email: managerEmail,
    message: message || '',
    created_at: new Date().toISOString()
  };

  employeeNotifications.push(newRecord);
  return res.status(201).json({ message: 'Notification recorded successfully', data: newRecord });
});

// Database Reset endpoint (Admin / Super-User only)
router.post('/database/reset', [auth, requireAdmin], async (req, res) => {
  try {
    if (pool.useMock) {
      pool.memoryDb.Users = [];
      pool.memoryDb.Businesses = [];
      pool.memoryDb.BusinessLocations = [];
      pool.memoryDb.OHProviders = [];
      pool.memoryDb.OHProviderLocations = [];
      pool.memoryDb.OHProviderServices = [];
      pool.memoryDb.Referrals = [];
      pool.memoryDb.ReferralMatches = [];
      pool.memoryDb.UserPasskeys = [];
      pool.nextIds.Users = 1;
      pool.nextIds.Businesses = 1;
      pool.nextIds.BusinessLocations = 1;
      pool.nextIds.OHProviders = 1;
      pool.nextIds.OHProviderLocations = 1;
      pool.nextIds.OHProviderServices = 1;
      pool.nextIds.Referrals = 1;
      pool.nextIds.ReferralMatches = 1;
      pool.nextIds.UserPasskeys = 1;
      employeeNotifications = [];
    } else {
      // In MySQL, truncate tables in foreign key order
      await pool.query('SET FOREIGN_KEY_CHECKS = 0');
      await pool.query('TRUNCATE TABLE UserPasskeys');
      await pool.query('TRUNCATE TABLE ReferralMatches');
      await pool.query('TRUNCATE TABLE Referrals');
      await pool.query('TRUNCATE TABLE OHProviderServices');
      await pool.query('TRUNCATE TABLE OHProviderLocations');
      await pool.query('TRUNCATE TABLE OHProviders');
      await pool.query('TRUNCATE TABLE BusinessLocations');
      await pool.query('TRUNCATE TABLE Businesses');
      await pool.query('TRUNCATE TABLE Users');
      await pool.query('SET FOREIGN_KEY_CHECKS = 1');
      employeeNotifications = [];
    }
    return res.json({ message: 'Database reset successfully' });
  } catch (error) {
    console.error('Reset error:', error);
    return res.status(500).json({ message: 'Failed to reset database', error: error.message });
  }
});

// Database Overview endpoint (Admin / Super-User only)
router.get('/database/overview', [auth, requireAdmin], async (req, res) => {
  try {
    const isMock = pool.useMock;
    
    if (isMock) {
      const memoryDb = pool.memoryDb || {};
      const usersList = memoryDb.Users || [];
      const businessesList = memoryDb.Businesses || [];
      const businessLocs = memoryDb.BusinessLocations || [];
      const providersList = memoryDb.OHProviders || [];
      const providerLocs = memoryDb.OHProviderLocations || [];
      const providerServs = memoryDb.OHProviderServices || [];
      const referralsList = memoryDb.Referrals || [];
      const referralMatchesList = memoryDb.ReferralMatches || [];

      const tables = [
        {
          name: 'Users',
          description: 'User accounts and auth credentials',
          count: usersList.length,
          columns: ['id', 'email', 'user_type', 'created_at'],
          rows: usersList.map(u => ({ 
            id: u.id, 
            email: u.email, 
            user_type: u.user_type || u.userType, 
            created_at: u.created_at || new Date().toISOString() 
          }))
        },
        {
          name: 'Businesses',
          description: 'Registered business profiles',
          count: businessesList.length,
          columns: ['id', 'user_id', 'company_name', 'contact_person', 'phone'],
          rows: businessesList
        },
        {
          name: 'BusinessLocations',
          description: 'Business branch offices and postal codes',
          count: businessLocs.length,
          columns: ['id', 'business_id', 'address', 'city', 'country', 'postal_code', 'employee_count', 'latitude', 'longitude'],
          rows: businessLocs
        },
        {
          name: 'OHProviders',
          description: 'Accredited occupational health providers',
          count: providersList.length,
          columns: ['id', 'user_id', 'company_name', 'contact_person', 'phone', 'is_subscribed', 'subscription_expiry'],
          rows: providersList
        },
        {
          name: 'OHProviderLocations',
          description: 'Provider clinic locations & coverage radius',
          count: providerLocs.length,
          columns: ['id', 'provider_id', 'address', 'city', 'country', 'postal_code', 'coverage_radius', 'latitude', 'longitude'],
          rows: providerLocs
        },
        {
          name: 'OHProviderServices',
          description: 'Services offered by OH providers',
          count: providerServs.length,
          columns: ['id', 'provider_id', 'service_type'],
          rows: providerServs
        },
        {
          name: 'Referrals',
          description: 'Dispatched OH service referrals',
          count: referralsList.length,
          columns: ['id', 'business_id', 'business_location_id', 'service_type', 'status', 'created_at'],
          rows: referralsList
        },
        {
          name: 'ReferralMatches',
          description: 'Spatial proximity match assignments',
          count: referralMatchesList.length,
          columns: ['id', 'referral_id', 'provider_id', 'status', 'created_at'],
          rows: referralMatchesList
        },
        {
          name: 'EmployeeNotifications',
          description: 'Employee-submitted employer notifications',
          count: employeeNotifications.length,
          columns: ['id', 'employee_name', 'employee_email', 'company_name', 'manager_email', 'message', 'created_at'],
          rows: employeeNotifications
        },
        {
          name: 'UserPasskeys',
          description: 'Registered WebAuthn FIDO2 Passkeys & biometric credentials',
          count: (memoryDb.UserPasskeys || []).length,
          columns: ['id', 'user_id', 'credential_id', 'counter', 'transports', 'device_name', 'created_at'],
          rows: (memoryDb.UserPasskeys || []).map(p => ({
            id: p.id,
            user_id: p.user_id,
            credential_id: p.credential_id ? `${p.credential_id.substring(0, 16)}...` : '',
            counter: p.counter,
            transports: p.transports,
            device_name: p.device_name,
            created_at: p.created_at
          }))
        }
      ];

      return res.json({
        engine: 'Embedded In-Memory Database (Self-Contained & Active)',
        host: 'Live Production Server (Render)',
        status: 'Online & Active',
        supabaseConfigurable: true,
        tables
      });
    } else {
      // Real MySQL queries
      const safeQuery = async (query) => {
        try {
          const [rows] = await pool.query(query);
          return rows || [];
        } catch (e) {
          console.warn('Safe query notice:', query, e.message);
          return [];
        }
      };

      const users = await safeQuery('SELECT id, email, user_type, created_at FROM Users');
      const businesses = await safeQuery('SELECT * FROM Businesses');
      const businessLocations = await safeQuery('SELECT * FROM BusinessLocations');
      const ohProviders = await safeQuery('SELECT * FROM OHProviders');
      const ohProviderLocations = await safeQuery('SELECT * FROM OHProviderLocations');
      const ohProviderServices = await safeQuery('SELECT * FROM OHProviderServices');
      const referrals = await safeQuery('SELECT * FROM Referrals');
      const referralMatches = await safeQuery('SELECT * FROM ReferralMatches');
      const passkeys = await safeQuery('SELECT id, user_id, credential_id, counter, transports, device_name, created_at FROM UserPasskeys');

      const tables = [
        { name: 'Users', description: 'User accounts and auth credentials', count: users.length, rows: users },
        { name: 'Businesses', description: 'Registered business profiles', count: businesses.length, rows: businesses },
        { name: 'BusinessLocations', description: 'Business branch offices and postal codes', count: businessLocations.length, rows: businessLocations },
        { name: 'OHProviders', description: 'Accredited occupational health providers', count: ohProviders.length, rows: ohProviders },
        { name: 'OHProviderLocations', description: 'Provider clinic locations & coverage radius', count: ohProviderLocations.length, rows: ohProviderLocations },
        { name: 'OHProviderServices', description: 'Services offered by OH providers', count: ohProviderServices.length, rows: ohProviderServices },
        { name: 'Referrals', description: 'Dispatched OH service referrals', count: referrals.length, rows: referrals },
        { name: 'ReferralMatches', description: 'Spatial proximity match assignments', count: referralMatches.length, rows: referralMatches },
        { name: 'EmployeeNotifications', description: 'Employee-submitted employer notifications', count: employeeNotifications.length, rows: employeeNotifications },
        { name: 'UserPasskeys', description: 'Registered WebAuthn FIDO2 Passkeys & biometric credentials', count: passkeys.length, rows: passkeys }
      ];

      const engineLabel = pool.dbEngineType === 'supabase'
        ? 'Supabase Managed PostgreSQL (Persistent Cloud Storage)'
        : (process.env.DB_HOST ? 'MySQL 8.0 Cloud Database' : 'Embedded In-Memory Database (Self-Contained & Active)');

      const hostLabel = pool.dbEngineType === 'supabase'
        ? 'Supabase Cloud (db.ljwydtioegzjpqarkjgp.supabase.co)'
        : (process.env.DB_HOST || 'Live Production Server (Render)');

      return res.json({
        engine: engineLabel,
        host: hostLabel,
        status: 'Online & Connected',
        supabaseConfigurable: true,
        tables
      });
    }
  } catch (error) {
    console.error('Database overview error:', error);
    return res.status(500).json({ message: 'Error retrieving database details', error: error.message });
  }
});

module.exports = router;
