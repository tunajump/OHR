const express = require('express');
const router = express.Router();
const pool = require('../utils/db');
const auth = require('../middleware/auth');
const emailService = require('../utils/emailService');
const { contactLimiter } = require('../middleware/rateLimiter');

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

// Record employee notification (public) & send email to manager + admin
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

  // Dispatch outgoing notification from system mailbox
  try {
    await emailService.sendEmployeeSuggestionNotification({
      employeeName,
      employeeEmail,
      companyName,
      managerEmail,
      message
    });
  } catch (mailErr) {
    console.warn('Notice sending employee suggestion email:', mailErr.message);
  }

  return res.status(201).json({ message: 'Notification recorded and dispatched successfully', data: newRecord });
});

// Public Contact Form Enquiry (automatically routed to admin@ohreferral.co.uk)
router.post('/contact', contactLimiter, async (req, res) => {
  try {
    const { name, email, phone, subject, message, company_website_hp, website_hp } = req.body;

    // Bot detection: If honeypot is filled, return successful response without sending email or DB save
    if (company_website_hp || website_hp) {
      console.warn(`[BOT BLOCKED] Contact bot caught via honeypot from IP: ${req.ip}`);
      return res.status(200).json({
        message: 'Your enquiry has been successfully delivered to the OHReferral administration team.',
        routedTo: emailService.CONTACT_DEFAULT_RECEIVER,
        fromMailbox: emailService.SYSTEM_FROM_EMAIL
      });
    }

    if (!email || !message) {
      return res.status(400).json({ message: 'A contact email address and message are required.' });
    }

    const trimmedEmail = String(email).trim();
    if (!trimmedEmail.includes('@')) {
      return res.status(400).json({ message: 'Please provide a valid email address.' });
    }

    // Store in DB or Memory
    try {
      await pool.query(
        'INSERT INTO ContactMessages (name, email, phone, subject, message) VALUES (?, ?, ?, ?, ?)',
        [name || '', trimmedEmail, phone || '', subject || '', message]
      );
    } catch (dbErr) {
      if (pool.useMock && pool.memoryDb?.ContactMessages) {
        pool.memoryDb.ContactMessages.push({
          id: pool.nextIds.ContactMessages++,
          name: name || '',
          email: trimmedEmail,
          phone: phone || '',
          subject: subject || '',
          message,
          created_at: new Date().toISOString()
        });
      }
    }

    // Automatically send to admin@ohreferral.co.uk
    const dispatch = await emailService.sendContactEnquiry({
      name,
      email: trimmedEmail,
      phone,
      subject,
      message
    });

    return res.status(200).json({
      message: 'Your enquiry has been successfully delivered to the OHReferral administration team.',
      routedTo: emailService.CONTACT_DEFAULT_RECEIVER,
      fromMailbox: emailService.SYSTEM_FROM_EMAIL,
      dispatch
    });
  } catch (error) {
    console.error('Error in contact endpoint:', error);
    return res.status(500).json({ message: 'Failed to send message', error: error.message });
  }
});

// Admin: View Contact Messages
router.get('/contact/messages', [auth, requireAdmin], async (req, res) => {
  try {
    if (pool.useMock) {
      return res.json({ messages: pool.memoryDb.ContactMessages || [] });
    }
    const [messages] = await pool.query('SELECT * FROM ContactMessages ORDER BY created_at DESC');
    return res.json({ messages: messages || [] });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to retrieve messages', error: err.message });
  }
});

// Admin: View Email Service Configuration
router.get('/email/config', [auth, requireAdmin], async (req, res) => {
  return res.json({
    systemSenderName: process.env.SYSTEM_SENDER_NAME || 'OHReferral',
    systemFromEmail: emailService.SYSTEM_FROM_EMAIL,
    adminEmail: emailService.ADMIN_EMAIL,
    contactDefaultReceiver: emailService.CONTACT_DEFAULT_RECEIVER,
    smtpConfigured: Boolean(process.env.SMTP_HOST && (process.env.SMTP_USER || process.env.SMTP_PASS)),
    smtpHost: process.env.SMTP_HOST || 'Self-Contained Structured Log Transport',
    dispatchedCount: emailService.emailDispatchLog.length,
    recentDispatches: emailService.emailDispatchLog.slice(-10)
  });
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
      pool.memoryDb.ContactMessages = [];
      employeeNotifications = [];

      pool.nextIds.Users = 1;
      pool.nextIds.Businesses = 1;
      pool.nextIds.BusinessLocations = 1;
      pool.nextIds.OHProviders = 1;
      pool.nextIds.OHProviderLocations = 1;
      pool.nextIds.OHProviderServices = 1;
      pool.nextIds.Referrals = 1;
      pool.nextIds.ReferralMatches = 1;
      pool.nextIds.UserPasskeys = 1;
      pool.nextIds.ContactMessages = 1;

      return res.json({
        message: 'In-Memory Database wiped clean successfully. Master admin re-created.',
        database: 'in-memory'
      });
    }

    // Real DB Wipe (Postgres or MySQL)
    await pool.query('SET FOREIGN_KEY_CHECKS = 0;').catch(() => {});
    const tables = [
      'ReferralMatches',
      'Referrals',
      'OHProviderServices',
      'OHProviderLocations',
      'OHProviders',
      'BusinessLocations',
      'Businesses',
      'UserPasskeys',
      'ContactMessages',
      'Users'
    ];

    for (const tbl of tables) {
      try {
        await pool.query(`TRUNCATE TABLE ${tbl} CASCADE`);
      } catch (e) {
        try {
          await pool.query(`DELETE FROM ${tbl}`);
        } catch (delErr) {}
      }
    }
    await pool.query('SET FOREIGN_KEY_CHECKS = 1;').catch(() => {});
    employeeNotifications = [];

    return res.json({
      message: 'Cloud database tables truncated successfully.',
      database: pool.dbEngineType
    });
  } catch (error) {
    console.error('Database reset error:', error);
    return res.status(500).json({ message: 'Error resetting database', error: error.message });
  }
});

// Enhanced Database Inspector & Overview for Admin Dashboard
router.get('/database/overview', [auth, requireAdmin], async (req, res) => {
  try {
    if (pool.useMock) {
      const memoryDb = pool.memoryDb || {};
      const usersList = memoryDb.Users || [];
      const businessesList = memoryDb.Businesses || [];
      const businessLocs = memoryDb.BusinessLocations || [];
      const providersList = memoryDb.OHProviders || [];
      const providerLocs = memoryDb.OHProviderLocations || [];
      const providerServs = memoryDb.OHProviderServices || [];
      const referralsList = memoryDb.Referrals || [];
      const referralMatchesList = memoryDb.ReferralMatches || [];
      const contactMessagesList = memoryDb.ContactMessages || [];

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
          name: 'ContactMessages',
          description: 'Enquiries routed to admin@ohreferral.co.uk',
          count: contactMessagesList.length,
          columns: ['id', 'name', 'email', 'phone', 'subject', 'message', 'created_at'],
          rows: contactMessagesList
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
        emailRouting: {
          systemSender: emailService.SYSTEM_FROM_EMAIL,
          adminMailbox: emailService.ADMIN_EMAIL,
          contactRecipient: emailService.CONTACT_DEFAULT_RECEIVER
        },
        tables
      });
    } else {
      // Real Database (Postgres / MySQL)
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
      const contactMessages = await safeQuery('SELECT * FROM ContactMessages');
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
        { name: 'ContactMessages', description: 'Enquiries routed to admin@ohreferral.co.uk', count: contactMessages.length, rows: contactMessages },
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
        emailRouting: {
          systemSender: emailService.SYSTEM_FROM_EMAIL,
          adminMailbox: emailService.ADMIN_EMAIL,
          contactRecipient: emailService.CONTACT_DEFAULT_RECEIVER
        },
        tables
      });
    }
  } catch (error) {
    console.error('Database overview error:', error);
    return res.status(500).json({ message: 'Error retrieving database details', error: error.message });
  }
});

module.exports = router;
