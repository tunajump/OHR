const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse
} = require('@simplewebauthn/server');
const jwt = require('jsonwebtoken');
const pool = require('../utils/db');

// In-memory challenge store (keyed by userId or challenge string)
const challenges = new Map();

function getRPInfo(req) {
  const host = req.get('host') || 'ohreferral.co.uk';
  const hostname = host.split(':')[0];
  const originHeader = req.get('origin') || req.get('referer') || '';
  const cleanOrigin = originHeader.replace(/\/$/, '');

  let rpID = 'ohreferral.co.uk';
  let origin = 'https://ohreferral.co.uk';

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    rpID = 'localhost';
    origin = cleanOrigin || 'http://localhost:3000';
  } else if (hostname.endsWith('onrender.com')) {
    rpID = hostname;
    origin = cleanOrigin || ('https://' + hostname);
  } else if (hostname.includes('ohreferral.co.uk')) {
    rpID = 'ohreferral.co.uk';
    origin = cleanOrigin.startsWith('https://www.ohreferral.co.uk') ? 'https://www.ohreferral.co.uk' : 'https://ohreferral.co.uk';
  }

  return { rpID, origin, rpName: 'OH Referral' };
}

// 1. Generate Registration Options (Logged in user registering a new Passkey)
exports.getRegistrationOptions = async (req, res) => {
  try {
    const userId = req.user.id;
    const [users] = await pool.query('SELECT id, email, user_type FROM Users WHERE id = ?', [userId]);
    if (!users || users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    const user = users[0];

    // Fetch existing passkeys to exclude re-registering the same authenticator
    const [existingPasskeys] = await pool.query('SELECT credential_id, transports FROM UserPasskeys WHERE user_id = ?', [userId]);
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
      attestationType: 'none',
      excludeCredentials,
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred'
      }
    });

    // Save challenge
    challenges.set('reg_' + userId, options.challenge);

    return res.json(options);
  } catch (error) {
    console.error('Passkey getRegistrationOptions error:', error);
    return res.status(500).json({ message: 'Failed to generate passkey registration challenge', error: error.message });
  }
};

// 2. Verify Registration Response & Save Passkey
exports.verifyRegistration = async (req, res) => {
  try {
    const userId = req.user.id;
    const expectedChallenge = challenges.get('reg_' + userId);
    if (!expectedChallenge) {
      return res.status(400).json({ message: 'Registration challenge expired or invalid. Please try again.' });
    }

    const { rpID, origin } = getRPInfo(req);
    const { deviceName, ...registrationResponse } = req.body;

    const verification = await verifyRegistrationResponse({
      response: registrationResponse,
      expectedChallenge,
      expectedOrigin: [origin, 'https://ohreferral.co.uk', 'https://www.ohreferral.co.uk', 'http://localhost:3000'],
      expectedRPID: [rpID, 'ohreferral.co.uk', 'localhost']
    });

    if (verification.verified && verification.registrationInfo) {
      const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;

      const credIdBase64 = Buffer.from(credentialID).toString('base64url');
      const publicKeyBase64 = Buffer.from(credentialPublicKey).toString('base64url');
      const transports = registrationResponse.response?.transports ? registrationResponse.response.transports.join(',') : 'internal';
      const label = deviceName || 'Security Key / Biometrics';

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

// 3. Generate Authentication Options (1-Click Login Challenge)
exports.getAuthenticationOptions = async (req, res) => {
  try {
    const { email } = req.body || {};
    let allowCredentials = [];

    if (email) {
      const [users] = await pool.query('SELECT id FROM Users WHERE email = ?', [email.trim()]);
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

// 4. Verify Authentication & Log User In
exports.verifyAuthentication = async (req, res) => {
  try {
    const authResponse = req.body;
    const credId = authResponse.id;

    // Find passkey in database by credential_id
    const [passkeys] = await pool.query('SELECT * FROM UserPasskeys WHERE credential_id = ?', [credId]);
    if (!passkeys || passkeys.length === 0) {
      return res.status(404).json({ message: 'No registered passkey found for this device. Please register one first.' });
    }

    const passkey = passkeys[0];
    const [users] = await pool.query('SELECT id, email, user_type FROM Users WHERE id = ?', [passkey.user_id]);
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
      // Fallback to client challenge if cache restarted
      expectedChallenge = authResponse.response?.clientDataJSON ? undefined : null;
    }

    const verification = await verifyAuthenticationResponse({
      response: authResponse,
      expectedChallenge: expectedChallenge || (() => true),
      expectedOrigin: [origin, 'https://ohreferral.co.uk', 'https://www.ohreferral.co.uk', 'http://localhost:3000'],
      expectedRPID: [rpID, 'ohreferral.co.uk', 'localhost'],
      authenticator: {
        credentialID: Buffer.from(passkey.credential_id, 'base64url'),
        credentialPublicKey: Buffer.from(passkey.public_key, 'base64url'),
        counter: Number(passkey.counter)
      }
    });

    if (verification.verified) {
      // Update authenticator counter
      const newCounter = verification.authenticationInfo.newCounter;
      await pool.query('UPDATE UserPasskeys SET counter = ? WHERE id = ?', [newCounter, passkey.id]);

      if (matchedChallengeKey) {
        challenges.delete(matchedChallengeKey);
      }

      // Generate JWT Token
      const token = jwt.sign(
        { id: user.id, user_type: user.user_type || user.userType },
        process.env.JWT_SECRET || 'fallback_jwt_secret_key_123',
        { expiresIn: '7d' }
      );

      return res.json({
        verified: true,
        token,
        userId: user.id,
        userType: user.user_type || user.userType,
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

// 5. List Passkeys for Current User
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

// 6. Delete a Passkey
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
