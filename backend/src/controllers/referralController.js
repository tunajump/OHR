const pool = require('../utils/db');
const { geocodePostcode } = require('../utils/postcode');
const { haversineDistance } = require('../utils/distance');

exports.createReferral = async (req, res) => {
  const userId = req.user.id;
  const businessLocationId = req.body.businessLocationId || req.body.business_location_id;
  const serviceType = req.body.serviceType || req.body.service_type;
  const employeePostcode = req.body.employeePostcode || req.body.employee_postcode || req.body.postalCode || req.body.postal_code;

  if (!businessLocationId || !serviceType) {
    return res.status(400).json({ message: 'businessLocationId and serviceType are required' });
  }

  try {
    // 1. Get the business ID for the authenticated user
    const [businesses] = await pool.query('SELECT id FROM Businesses WHERE user_id = ?', [userId]);
    if (businesses.length === 0) {
      return res.status(400).json({ message: 'Business profile not found' });
    }
    const businessId = businesses[0].id;

    // 2. Fetch business location to verify and get fallback coordinates
    const [locations] = await pool.query('SELECT * FROM BusinessLocations WHERE id = ?', [businessLocationId]);
    if (locations.length === 0) {
      return res.status(400).json({ message: 'Business location not found' });
    }
    const location = locations[0];

    // 3. Insert referral initially as 'pending'
    const [insertResult] = await pool.query(
      'INSERT INTO Referrals (business_id, business_location_id, service_type, status) VALUES (?, ?, ?, ?)',
      [businessId, businessLocationId, serviceType, 'pending']
    );
    const referralId = insertResult.insertId;

    // 4. Resolve coordinates for the referral (either from employee postcode, or fallback to business location)
    let refLat = null;
    let refLon = null;

    if (employeePostcode) {
      try {
        const coords = await geocodePostcode(employeePostcode);
        refLat = coords.latitude;
        refLon = coords.longitude;
      } catch (err) {
        if (err.message === 'Invalid postcode' || err.message.includes('Invalid')) {
          return res.status(400).json({ message: 'Invalid postcode. Please provide a valid UK postcode.' });
        }
        console.warn(`Geocoding warning for employee postcode ${employeePostcode}:`, err.message);
      }
    }

    // Fallback to location coordinates if we couldn't get them from employee postcode
    if (refLat === null || refLon === null) {
      refLat = location.latitude ? parseFloat(location.latitude) : null;
      refLon = location.longitude ? parseFloat(location.longitude) : null;
    }

    // 5. If we have no valid coordinates, fail gracefully and leave referral as pending
    if (refLat === null || refLon === null) {
      console.warn(`No valid coordinates for referral matching (referral ID: ${referralId})`);
      return res.status(201).json({
        message: 'Referral registered but pending: no coordinate location could be resolved.',
        referralId,
        status: 'pending'
      });
    }

    // 6. Query all provider locations offering the specified service type
    const [providerLocs] = await pool.query(
      `SELECT 
        opl.provider_id, 
        opl.latitude, 
        opl.longitude, 
        opl.coverage_radius,
        op.company_name,
        op.contact_person,
        op.phone
      FROM OHProviderLocations opl
      JOIN OHProviderServices ops ON opl.provider_id = ops.provider_id
      JOIN OHProviders op ON opl.provider_id = op.id
      WHERE ops.service_type = ?`,
      [serviceType]
    );

    console.log('[DEBUG] Matching Referral coords:', { refLat, refLon, serviceType });
    console.log('[DEBUG] Retrieved provider locations:', JSON.stringify(providerLocs));

    const candidates = [];

    // 7. Filter and calculate distances inside memory using Haversine formula
    for (const pLoc of providerLocs) {
      if (pLoc.latitude === null || pLoc.longitude === null) {
        console.log('[DEBUG] Skipping provider because lat/lon is null:', pLoc);
        continue;
      }

      const provLat = parseFloat(pLoc.latitude);
      const provLon = parseFloat(pLoc.longitude);
      const coverageRadius = parseFloat(pLoc.coverage_radius); // in miles

      const distance = haversineDistance(refLat, refLon, provLat, provLon, 'miles');
      console.log(`[DEBUG] Distance from ref to provider ${pLoc.provider_id} is ${distance} miles (coverage_radius: ${coverageRadius})`);

      if (distance <= coverageRadius) {
        candidates.push({
          providerId: pLoc.provider_id,
          companyName: pLoc.company_name,
          contactPerson: pLoc.contact_person,
          phone: pLoc.phone,
          distance
        });
      }
    }


    // 8. If candidates exist, match with the closest provider
    if (candidates.length > 0) {
      // Sort by distance ascending
      candidates.sort((a, b) => a.distance - b.distance);
      const closest = candidates[0];

      // Update referral status to 'matched'
      await pool.query('UPDATE Referrals SET status = ? WHERE id = ?', ['matched', referralId]);

      // Record the assignment in ReferralMatches
      await pool.query(
        'INSERT INTO ReferralMatches (referral_id, provider_id, status) VALUES (?, ?, ?)',
        [referralId, closest.providerId, 'pending']
      );

      return res.status(201).json({
        message: 'Referral created and matched to the closest qualified provider!',
        referralId,
        status: 'matched',
        matchedProvider: {
          providerId: closest.providerId,
          companyName: closest.companyName,
          contactPerson: closest.contactPerson,
          phone: closest.phone,
          distance: parseFloat(closest.distance.toFixed(2))
        }
      });
    } else {
      // No provider within their coverage radius
      console.log(`No providers within coverage radius for referral ID: ${referralId}`);
      return res.status(201).json({
        message: 'Referral created but remains pending: no matching providers found in service radius.',
        referralId,
        status: 'pending'
      });
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getReferral = async (req, res) => {
  const userId = req.user.id;
  const referralId = req.params.id;

  try {
    const [referrals] = await pool.query('SELECT * FROM Referrals WHERE id = ?', [referralId]);
    if (referrals.length === 0) {
      return res.status(404).json({ message: 'Referral not found' });
    }
    const referral = referrals[0];

    // Check if the user is authorized (must be the business that created it, or matched provider, or admin)
    // Fetch user type
    const [users] = await pool.query('SELECT user_type FROM Users WHERE id = ?', [userId]);
    const userType = users[0]?.user_type;

    let authorized = false;
    if (userType === 'admin') {
      authorized = true;
    } else if (userType === 'business') {
      const [businesses] = await pool.query('SELECT id FROM Businesses WHERE user_id = ?', [userId]);
      if (businesses.length > 0 && businesses[0].id === referral.business_id) {
        authorized = true;
      }
    } else if (userType === 'provider') {
      const [providers] = await pool.query('SELECT id FROM OHProviders WHERE user_id = ?', [userId]);
      if (providers.length > 0) {
        const [matches] = await pool.query(
          'SELECT * FROM ReferralMatches WHERE referral_id = ? AND provider_id = ?',
          [referralId, providers[0].id]
        );
        if (matches.length > 0) {
          authorized = true;
        }
      }
    }

    if (!authorized) {
      return res.status(403).json({ message: 'Unauthorized access to this referral' });
    }

    // Fetch matched provider details if matched
    let matchedProvider = null;
    if (referral.status === 'matched') {
      const [matches] = await pool.query('SELECT * FROM ReferralMatches WHERE referral_id = ?', [referralId]);
      if (matches.length > 0) {
        const [providers] = await pool.query('SELECT * FROM OHProviders WHERE id = ?', [matches[0].provider_id]);
        if (providers.length > 0) {
          matchedProvider = {
            providerId: providers[0].id,
            companyName: providers[0].company_name,
            contactPerson: providers[0].contact_person,
            phone: providers[0].phone,
            matchStatus: matches[0].status
          };
        }
      }
    }

    res.json({
      referral,
      matchedProvider
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.listReferrals = async (req, res) => {
  const userId = req.user.id;

  try {
    // Determine user type to filter referrals
    const [users] = await pool.query('SELECT user_type FROM Users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(401).json({ message: 'User not found' });
    }
    const userType = users[0].user_type;

    if (userType === 'business') {
      const [businesses] = await pool.query('SELECT id FROM Businesses WHERE user_id = ?', [userId]);
      if (businesses.length === 0) {
        return res.status(400).json({ message: 'Business profile not found' });
      }
      const [referrals] = await pool.query('SELECT * FROM Referrals WHERE business_id = ?', [businesses[0].id]);
      return res.json(referrals);
    } else if (userType === 'provider') {
      const [providers] = await pool.query('SELECT id FROM OHProviders WHERE user_id = ?', [userId]);
      if (providers.length === 0) {
        return res.status(400).json({ message: 'Provider profile not found' });
      }
      const [matches] = await pool.query(
        `SELECT r.* FROM Referrals r 
         JOIN ReferralMatches rm ON r.id = rm.referral_id 
         WHERE rm.provider_id = ?`,
        [providers[0].id]
      );
      return res.json(matches);
    } else if (userType === 'admin') {
      const [referrals] = await pool.query('SELECT * FROM Referrals');
      return res.json(referrals);
    }

    res.status(400).json({ message: 'Invalid user type' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};
