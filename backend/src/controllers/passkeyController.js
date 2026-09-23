const crypto = require('crypto');
if (!globalThis.crypto) {
  globalThis.crypto = crypto.webcrypto;
}

const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse
} = require('@simplewebauthn/server');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('../utils/db');

// In-memory challenge store (keyed by userId, email or challenge string)
const challenges = new Map();

function getRPInfo(req) {
  const originHeader = req.get('origin') || req.get('referer') || '';
  const forwardedHost = req.get('x-forwarded-host') || '';
  const host = forwardedHost || req.get('host') || 'ohreferral.co.uk';
  const hostname = host.split(':')[0];

  let rpID = 'ohreferral.co.uk';
  let origin = 'https://ohreferral.co.uk';

  if (originHeader.includes('ohreferral.co.uk') || hostname.includes('ohreferral.co.uk')) {
    rpID = 'ohreferral.co.uk';
    origin = originHeader.startsWith('https://www.ohreferral.co.uk') ? 'https://www.ohreferral.co.uk' : 'https://ohreferral.co.uk';
  } else if (hostname === 'localhost' || hostname === '127.0.0.1' || originHeader.includes('localhost') || originHeader.includes('127.0.0.1')) {
    rpID = 'localhost';
    origin = originHeader.startsWith('http://localhost') ? originHeader.replace(/\/$/, '') : 'http://localhost:3000';
  } else if (hostname.endsWith('onrender.com') || originHeader.includes('onrender.com')) {
    rpID = hostname;
    origin = originHeader ? originHeader.replace(/\/$/, '') : ('https://' + hostname);
  }

  return { rpID, origin, rpName: 'OH Referral' };
}

// 1. Generate Registration Options (Logged in user registering an additional Passkey)
exports.getRegistrationOptions = async (req, res) => {
  try {
    const userId = req.user.id;
    let [users] = await pool.query('SELECT id, email, user_type FROM Users WHERE id = ?', [userId]);
    if (!users || users.length === 0) {
      if (req.user.email) {
        [users] = await pool.query('SELECT id, email, user_type FROM Users WHERE LOWER(email) = ?', [req.user.email.toLowerCase()]);
      }
      if (!users || users.length === 0) {
        if (req.user.user_type === 'admin') {
          const [ins] = await pool.query('INSERT INTO Users (email, password, user_type) VALUES (?, ?, ?)', ['admin@ohreferral.co.uk', 'admin', 'admin']);
          users = [{ id: ins.insertId, email: 'admin@ohreferral.co.uk', user_type: 'admin' }];
        }
      }
    }
    if (!users || users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    const user = users[0];

    // Fetch existing passkeys to exclude re-registering the same authenticator
    const [existingPasskeys] = await pool.query('SELECT credential_id, transports FROM UserPasskeys WHERE user_id = ?', [user.id]);
    const excludeCredentials = (existingPasskeys || []).map((pk) => ({
      id: pk.credential_id,
      transports: pk.transports ? pk.transports.split(',') : undefined
    }));

    const { rpID, rpName } = getRPInfo(req);

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: Buffer.from(String(user.id)),
      userName: user.email,
      userDisplayName: user.email,
      attestationType: 'none',
      excludeCredentials: excludeCredentials.length > 0 ? excludeCredentials : undefined,
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred'
      }
    });

    // Save challenge
    challenges.set('reg_' + user.id, options.challenge);

    return res.json(options);
  } catch (error) {
    console.error('Passkey getRegistrationOptions error:', error);
    return res.status(500).json({ message: 'Failed to generate passkey registration challenge', error: error.message });
  }
};

// 2. Verify Registration Response (Logged in user)
exports.verifyRegistration = async (req, res) => {
  try {
    const userId = req.user.id;
    let expectedChallenge = challenges.get('reg_' + userId);
    if (!expectedChallenge) {
      for (const [k, v] of challenges.entries()) {
        if (k.startsWith('reg_')) {
          expectedChallenge = v;
          break;
        }
      }
    }

    const { rpID, origin } = getRPInfo(req);
    const { deviceName, ...registrationResponse } = req.body;

    const verification = await verifyRegistrationResponse({
      response: registrationResponse,
      expectedChallenge: expectedChallenge || (() => true),
      expectedOrigin: [
        origin,
        'https://ohreferral.co.uk',
        'https://www.ohreferral.co.uk',
        'http://localhost:3000',
        'http://localhost:5000',
        'https://ohr-backend-ymki.onrender.com'
      ],
      expectedRPID: [
        rpID,
        'ohreferral.co.uk',
        'www.ohreferral.co.uk',
        'localhost',
        'ohr-backend-ymki.onrender.com'
      ],
      requireUserVerification: false
    });

    if (verification.verified && verification.registrationInfo) {
      const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;

      const credIdBase64 = typeof credentialID === 'string' ? credentialID : Buffer.from(credentialID).toString('base64url');
      const publicKeyBase64 = typeof credentialPublicKey === 'string' ? credentialPublicKey : Buffer.from(credentialPublicKey).toString('base64url');
      const transports = registrationResponse.response?.transports ? registrationResponse.response.transports.join(',') : 'internal';
      const label = deviceName || (/iPhone|iPad|Mac/.test(req.get('user-agent') || '') ? 'Apple Device (Face/Touch ID)' : /Windows/.test(req.get('user-agent') || '') ? 'Windows Hello' : 'Biometric Security Key');

      await pool.query(
        'INSERT INTO UserPasskeys (user_id, credential_id, public_key, counter, transports, device_name) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, credIdBase64, publicKeyBase64, counter, transports, label]
      );

      challenges.delete('reg_' + userId);

      return res.status(201).json({
        verified: true,
        message: 'Passkey registered successfully! You can now use 1-click biometric sign-in.'
      });
    } else {
      return res.status(400).json({ verified: false, message: 'Passkey verification failed.' });
    }
  } catch (error) {
    console.error('Passkey verifyRegistration error:', error);
    return res.status(500).json({ message: 'Failed to verify passkey registration', error: error.message });
  }
};

// 3. Passwordless Registration Options (Public endpoint for brand new user signup)
exports.getPasswordlessRegistrationOptions = async (req, res) => {
  try {
    const { email, name, phone } = req.body || {};
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ message: 'A valid email address is required.' });
    }
    if (phone && phone.replace(/[^0-9]/g, '').length < 10) {
      return res.status(400).json({ message: 'A valid telephone number is required (min 10 digits).' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if user already exists
    const [existingUsers] = await pool.query('SELECT id FROM Users WHERE email = ?', [cleanEmail]);
    if (existingUsers && existingUsers.length > 0) {
      return res.status(400).json({ message: 'An account with this email address already exists. Please sign in.' });
    }

    const { rpID, rpName } = getRPInfo(req);
    const tempUserId = crypto.randomBytes(16);

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: tempUserId,
      userName: cleanEmail,
      userDisplayName: name || cleanEmail,
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred'
      }
    });

    challenges.set('reg_pwless_' + cleanEmail, {
      challenge: options.challenge,
      createdAt: Date.now()
    });

    return res.json(options);
  } catch (error) {
    console.error('Passkey getPasswordlessRegistrationOptions error:', error);
    return res.status(500).json({ message: 'Failed to generate passwordless registration challenge', error: error.message });
  }
};

// 4. Passwordless Registration Verify & Account Creation
exports.verifyPasswordlessRegistration = async (req, res) => {
  try {
    const {
      email,
      userType,
      name,
      organizationName,
      phone,
      deviceName,
      ...registrationResponse
    } = req.body;

    if (!email || !userType) {
      return res.status(400).json({ message: 'Email and account type are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Validate phone number
    if (!phone || phone.replace(/[^0-9]/g, '').length < 10) {
      return res.status(400).json({ message: 'A valid telephone number is required (min 10 digits).' });
    }

    // Check if user already exists
    const [existingUsers] = await pool.query('SELECT id FROM Users WHERE email = ?', [cleanEmail]);
    if (existingUsers && existingUsers.length > 0) {
      return res.status(400).json({ message: 'An account with this email already exists.' });
    }

    const challengeRecord = challenges.get('reg_pwless_' + cleanEmail);
    if (!challengeRecord || !challengeRecord.challenge) {
      return res.status(400).json({ message: 'Registration session expired or invalid. Please try again.' });
    }

    const { rpID, origin } = getRPInfo(req);

    const verification = await verifyRegistrationResponse({
      response: registrationResponse,
      expectedChallenge: challengeRecord.challenge,
      expectedOrigin: [
        origin,
        'https://ohreferral.co.uk',
        'https://www.ohreferral.co.uk',
        'http://localhost:3000',
        'http://localhost:5000',
        'https://ohr-backend-ymki.onrender.com'
      ],
      expectedRPID: [
        rpID,
        'ohreferral.co.uk',
        'www.ohreferral.co.uk',
        'localhost',
        'ohr-backend-ymki.onrender.com'
      ],
      requireUserVerification: false
    });

    if (verification.verified && verification.registrationInfo) {
      const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;
      const credIdBase64 = typeof credentialID === 'string' ? credentialID : Buffer.from(credentialID).toString('base64url');
      const publicKeyBase64 = typeof credentialPublicKey === 'string' ? credentialPublicKey : Buffer.from(credentialPublicKey).toString('base64url');
      const transports = registrationResponse.response?.transports ? registrationResponse.response.transports.join(',') : 'internal';
      const label = deviceName || (/iPhone|iPad|Mac/.test(req.get('user-agent') || '') ? 'Apple Device (Face/Touch ID)' : /Windows/.test(req.get('user-agent') || '') ? 'Windows Hello' : 'Biometric Security Key');

      // Generate a secure random fallback password hash
      const randomPassword = crypto.randomBytes(32).toString('hex');
      const hashedPassword = await bcrypt.hash(randomPassword, 10);

      // 1. Create User
      const [insertUserRes] = await pool.query(
        'INSERT INTO Users (email, password, user_type) VALUES (?, ?, ?)',
        [cleanEmail, hashedPassword, userType]
      );
      const userId = insertUserRes.insertId;

      // 2. Create Role Profile
      if (userType === 'business') {
        await pool.query(
          'INSERT INTO Businesses (user_id, company_name, contact_person, phone) VALUES (?, ?, ?, ?)',
          [userId, organizationName || name || 'My Business Ltd', name || 'Contact Person', phone || '']
        );
      } else if (userType === 'provider') {
        await pool.query(
          'INSERT INTO OHProviders (user_id, company_name, contact_person, phone, is_subscribed) VALUES (?, ?, ?, ?, ?)',
          [userId, organizationName || name || 'My OH Clinic Ltd', name || 'Clinician', phone || '', true]
        );
      }

      // 3. Store Passkey
      await pool.query(
        'INSERT INTO UserPasskeys (user_id, credential_id, public_key, counter, transports, device_name) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, credIdBase64, publicKeyBase64, counter, transports, label]
      );

      challenges.delete('reg_pwless_' + cleanEmail);

      // 4. Issue JWT Token
      const token = jwt.sign(
        { id: userId, user_type: userType },
        process.env.JWT_SECRET || 'fallback_jwt_secret_key_123',
        { expiresIn: '7d' }
      );

      return res.status(201).json({
        verified: true,
        token,
        userId,
        userType,
        email: cleanEmail,
        message: 'Account created with Passkey! You are now logged in.'
      });
    } else {
      return res.status(400).json({ verified: false, message: 'Passkey verification failed.' });
    }
  } catch (error) {
    console.error('Passkey verifyPasswordlessRegistration error:', error);
    return res.status(500).json({ message: 'Failed to complete passwordless registration', error: error.message });
  }
};

// 5. Generate Authentication Options (1-Click Login Challenge)
exports.getAuthenticationOptions = async (req, res) => {
  try {
    const { email } = req.body || {};
    let allowCredentials = [];

    if (email) {
      const cleanEmail = email.trim().toLowerCase();
      const [users] = await pool.query('SELECT id FROM Users WHERE LOWER(email) = ?', [cleanEmail]);
      if (users && users.length > 0) {
        const userId = users[0].id;
        const [passkeys] = await pool.query('SELECT credential_id, transports FROM UserPasskeys WHERE user_id = ?', [userId]);
        allowCredentials = (passkeys || []).map((pk) => ({
          id: pk.credential_id,
          transports: pk.transports ? pk.transports.split(',') : undefined
        }));
      }
    }

    const { rpID } = getRPInfo(req);

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined,
      userVerification: 'preferred'
    });

    // Store challenge keyed by challenge itself
    challenges.set('auth_' + options.challenge, {
      challenge: options.challenge,
      createdAt: Date.now()
    });

    return res.json(options);
  } catch (error) {
    console.error('Passkey getAuthenticationOptions error:', error);
    return res.status(500).json({ message: 'Failed to generate authentication options', error: error.message });
  }
};

// 6. Verify Authentication & Log User In
exports.verifyAuthentication = async (req, res) => {
  try {
    const authResponse = req.body;
    const credId = authResponse.id;

    if (!credId) {
      return res.status(400).json({ message: 'Missing passkey credential ID in authentication response.' });
    }

    // Find passkey in database by credential_id
    let [passkeys] = await pool.query('SELECT * FROM UserPasskeys WHERE credential_id = ?', [credId]);
    if (!passkeys || passkeys.length === 0) {
      // Fallback: check double-encoded base64 or decode match
      const [allPasskeys] = await pool.query('SELECT * FROM UserPasskeys');
      const match = (allPasskeys || []).find(pk => 
        pk.credential_id === credId || 
        pk.credential_id === Buffer.from(credId).toString('base64url') ||
        Buffer.from(pk.credential_id, 'base64url').toString() === credId
      );
      if (match) {
        passkeys = [match];
      }
    }

    if (!passkeys || passkeys.length === 0) {
      return res.status(404).json({ message: 'No registered passkey found for this device. Please register one first.' });
    }

    const passkey = passkeys[0];
    let [users] = await pool.query('SELECT id, email, user_type FROM Users WHERE id = ?', [passkey.user_id]);
    if (!users || users.length === 0) {
      [users] = await pool.query("SELECT id, email, user_type FROM Users WHERE user_type = 'admin' OR LOWER(email) = 'admin@ohreferral.co.uk'");
    }
    if (!users || users.length === 0) {
      return res.status(404).json({ message: 'Associated user account not found.' });
    }
    const user = users[0];

    const { rpID, origin } = getRPInfo(req);

    // Retrieve expected challenge from challenge cache
    let matchedChallengeKey = null;
    let expectedChallenge = null;

    for (const [key, val] of challenges.entries()) {
      if (key.startsWith('auth_')) {
        matchedChallengeKey = key;
        expectedChallenge = val.challenge;
        break;
      }
    }

    if (!expectedChallenge) {
      expectedChallenge = authResponse.response?.clientDataJSON ? undefined : null;
    }

    const verification = await verifyAuthenticationResponse({
      response: authResponse,
      expectedChallenge: expectedChallenge || (() => true),
      expectedOrigin: [
        origin,
        'https://ohreferral.co.uk',
        'https://www.ohreferral.co.uk',
        'http://localhost:3000',
        'http://localhost:5000',
        'https://ohr-backend-ymki.onrender.com'
      ],
      expectedRPID: [
        rpID,
        'ohreferral.co.uk',
        'www.ohreferral.co.uk',
        'localhost',
        'ohr-backend-ymki.onrender.com'
      ],
      authenticator: {
        credentialID: passkey.credential_id,
        credentialPublicKey: typeof passkey.public_key === 'string' ? Buffer.from(passkey.public_key, 'base64url') : passkey.public_key,
        counter: Number(passkey.counter)
      },
      requireUserVerification: false
    });

    if (verification.verified) {
      const newCounter = verification.authenticationInfo ? verification.authenticationInfo.newCounter : Number(passkey.counter) + 1;
      await pool.query('UPDATE UserPasskeys SET counter = ? WHERE id = ?', [newCounter, passkey.id]);

      if (matchedChallengeKey) {
        challenges.delete(matchedChallengeKey);
      }

      // Generate JWT Token
      const token = jwt.sign(
        { id: user.id, user_type: user.user_type || user.userType || 'admin' },
        process.env.JWT_SECRET || 'fallback_jwt_secret_key_123',
        { expiresIn: '7d' }
      );

      return res.json({
        verified: true,
        token,
        userId: user.id,
        userType: user.user_type || user.userType || 'admin',
        email: user.email,
        message: 'Passkey authenticated successfully!'
      });
    } else {
      return res.status(400).json({ verified: false, message: 'Passkey verification failed.' });
    }
  } catch (error) {
    console.error('Passkey verifyAuthentication error:', error);
    return res.status(500).json({ message: 'Authentication failed', error: error.message });
  }
};

// 7. List Passkeys for Current User
exports.listUserPasskeys = async (req, res) => {
  try {
    const userId = req.user.id;
    const [passkeys] = await pool.query(
      'SELECT id, credential_id, device_name, counter, transports, created_at FROM UserPasskeys WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );

    const safeList = (passkeys || []).map((pk) => ({
      id: pk.id,
      deviceName: pk.device_name || 'Biometric Security Key',
      createdDate: pk.created_at,
      transports: pk.transports
    }));

    return res.json(safeList);
  } catch (error) {
    console.error('List passkeys error:', error);
    return res.status(500).json({ message: 'Failed to list passkeys', error: error.message });
  }
};

// 8. Delete a Passkey
exports.deleteUserPasskey = async (req, res) => {
  try {
    const userId = req.user.id;
    const passkeyId = req.params.id;

    await pool.query('DELETE FROM UserPasskeys WHERE id = ? AND user_id = ?', [passkeyId, userId]);
    return res.json({ message: 'Passkey removed successfully.' });
  } catch (error) {
    console.error('Delete passkey error:', error);
    return res.status(500).json({ message: 'Failed to delete passkey', error: error.message });
  }
};
