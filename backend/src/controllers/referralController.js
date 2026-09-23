const pool = require('../utils/db');
const { geocodePostcode } = require('../utils/postcode');
const { haversineDistance } = require('../utils/distance');

// Validation Helpers
const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

const isValidPhone = (phone) => {
  if (!phone || typeof phone !== 'string') return false;
  const digitsOnly = phone.replace(/[^0-9]/g, '');
  return digitsOnly.length >= 10 && digitsOnly.length <= 15 && /^[+]?[\d\s().-]{10,20}$/.test(phone.trim());
};

// Helper to parse maximum location capacity from range string
const parseLocationCapacity = (countRange) => {
  if (!countRange) return 10000;
  if (typeof countRange === 'number') return countRange;
  const str = String(countRange).trim();
  if (str === '> 100' || str === '100+' || str === '250+' || str.includes('>')) return 10000;
  const parts = str.split('-');
  if (parts.length === 2) {
    const maxVal = parseInt(parts[1], 10);
    if (!isNaN(maxVal)) return maxVal;
  }
  const parsed = parseInt(str, 10);
  return isNaN(parsed) ? 10000 : parsed;
};

// Re-evaluates pending referrals and matches them against newly added or updated provider clinic locations
const matchPendingReferrals = async () => {
  try {
    const [pendingRefs] = await pool.query("SELECT * FROM Referrals WHERE status = 'pending'");
    if (!pendingRefs || pendingRefs.length === 0) return 0;

    const [providerLocs] = await pool.query(
      `SELECT 
        opl.id as location_id,
        opl.provider_id, 
        opl.latitude, 
        opl.longitude, 
        opl.coverage_radius,
        op.company_name,
        op.contact_person,
        op.phone,
        op.is_subscribed
      FROM OHProviderLocations opl
      JOIN OHProviders op ON opl.provider_id = op.id`
    );
    if (!providerLocs || providerLocs.length === 0) return 0;

    const [allServices] = await pool.query('SELECT provider_id, location_id, service_type FROM OHProviderServices');

    let matchedCount = 0;

    for (const ref of pendingRefs) {
      const [locations] = await pool.query('SELECT * FROM BusinessLocations WHERE id = ?', [ref.business_location_id]);
      if (!locations || locations.length === 0) continue;
      const location = locations[0];

      let refLat = location.latitude ? parseFloat(location.latitude) : null;
      let refLon = location.longitude ? parseFloat(location.longitude) : null;

      if ((refLat === null || refLon === null) && location.postal_code) {
        try {
          const coords = await geocodePostcode(location.postal_code);
          refLat = coords.latitude;
          refLon = coords.longitude;
          await pool.query('UPDATE BusinessLocations SET latitude = ?, longitude = ? WHERE id = ?', [refLat, refLon, location.id]);
        } catch (e) {
          console.warn(`Could not geocode location postcode ${location.postal_code}:`, e.message);
        }
      }

      if (refLat === null || refLon === null) continue;

      const requestedServices = (ref.service_type || '').split(',').map(s => s.trim()).filter(Boolean);
      if (requestedServices.length === 0) continue;

      const candidates = [];
      for (const pLoc of providerLocs) {
        if (pLoc.latitude === null || pLoc.longitude === null) continue;

        const locServices = (allServices || [])
          .filter(s => (s.location_id && String(s.location_id) === String(pLoc.location_id)) || (!s.location_id && String(s.provider_id) === String(pLoc.provider_id)))
          .map(s => s.service_type);

        const coversAll = requestedServices.every(reqSvc => locServices.includes(reqSvc));
        if (!coversAll) continue;

        const provLat = parseFloat(pLoc.latitude);
        const provLon = parseFloat(pLoc.longitude);
        const coverageRadius = parseFloat(pLoc.coverage_radius);

        const distance = haversineDistance(refLat, refLon, provLat, provLon, 'miles');
        if (distance <= coverageRadius) {
          candidates.push({
            providerId: pLoc.provider_id,
            locationId: pLoc.location_id,
            distance: Math.round(distance * 100) / 100
          });
        }
      }

      if (candidates.length > 0) {
        candidates.sort((a, b) => a.distance - b.distance);
        const closest = candidates[0];

        // Update referral status to 'matched'
        await pool.query('UPDATE Referrals SET status = ? WHERE id = ?', ['matched', ref.id]);

        // Insert ReferralMatches for each candidate provider if not exists
        for (const cand of candidates) {
          const [existingMatch] = await pool.query(
            'SELECT * FROM ReferralMatches WHERE referral_id = ? AND provider_id = ?',
            [ref.id, cand.providerId]
          );
          if (!existingMatch || existingMatch.length === 0) {
            await pool.query(
              'INSERT INTO ReferralMatches (referral_id, provider_id, status) VALUES (?, ?, ?)',
              [ref.id, cand.providerId, 'matched']
            );
          }
        }
        matchedCount++;
      }
    }
    return matchedCount;
  } catch (err) {
    console.warn('Error in matchPendingReferrals:', err);
    return 0;
  }
};

exports.matchPendingReferrals = matchPendingReferrals;

exports.createReferral = async (req, res) => {
  const userId = req.user.id;
  const businessLocationId = req.body.businessLocationId || req.body.business_location_id;
  const servicesInput = req.body.services || req.body.serviceTypes || req.body.serviceType || req.body.service_type;

  let requestedServices = [];
  if (Array.isArray(servicesInput)) {
    requestedServices = servicesInput.filter(Boolean);
  } else if (typeof servicesInput === 'string') {
    requestedServices = servicesInput.split(',').map(s => s.trim()).filter(Boolean);
  }

  if (!businessLocationId || requestedServices.length === 0) {
    return res.status(400).json({ message: 'businessLocationId and at least one serviceType are required' });
  }

  const primaryServiceType = requestedServices.join(', ');

  const contactName = (req.body.contactName || req.body.contact_name || req.body.referrerName || req.body.referrer_name || '').trim();
  const contactEmail = (req.body.contactEmail || req.body.contact_email || req.body.referrerEmail || req.body.referrer_email || '').trim();
  const contactPhone = (req.body.contactPhone || req.body.contact_phone || req.body.referrerPhone || req.body.referrer_phone || '').trim();
  const notes = (req.body.notes || req.body.referralNotes || req.body.referral_notes || '').trim();

  // Validate Mandatory Referrer Information
  if (!contactName) {
    return res.status(400).json({ message: 'Referrer full name is required.' });
  }

  if (!contactEmail || !isValidEmail(contactEmail)) {
    return res.status(400).json({ message: 'A valid referrer email address is required (e.g. name@company.co.uk).' });
  }

  if (!contactPhone || !isValidPhone(contactPhone)) {
    return res.status(400).json({ message: 'A valid telephone number is required (min 10 digits, e.g. 020 7946 0123).' });
  }

  try {
    // 1. Get the business ID for the authenticated user
    const [businesses] = await pool.query('SELECT id FROM Businesses WHERE user_id = ?', [userId]);
    if (businesses.length === 0) {
      return res.status(400).json({ message: 'Business profile not found' });
    }
    const businessId = businesses[0].id;

    // 2. Fetch business location to verify and get branch coordinates & employee limit
    const [locations] = await pool.query('SELECT * FROM BusinessLocations WHERE id = ?', [businessLocationId]);
    if (locations.length === 0) {
      return res.status(400).json({ message: 'Business location not found' });
    }
    const location = locations[0];

    // Validate employee count against location capacity
    const rawEmployeeCount = req.body.employeeCount !== undefined ? req.body.employeeCount : (req.body.employee_count || req.body.numEmployees || 1);
    const employeeCount = parseInt(rawEmployeeCount, 10);
    if (isNaN(employeeCount) || employeeCount < 1) {
      return res.status(400).json({ message: 'Number of employees must be at least 1.' });
    }

    const maxLocationLimit = parseLocationCapacity(location.employee_count);
    if (employeeCount > maxLocationLimit) {
      return res.status(400).json({
        message: `Number of employees (${employeeCount}) cannot exceed the workplace location capacity (maximum ${maxLocationLimit} for this branch).`
      });
    }

    // 3. Insert referral initially as 'pending' with employee count, referrer contact details & notes
    const [insertResult] = await pool.query(
      'INSERT INTO Referrals (business_id, business_location_id, service_type, employee_count, contact_name, contact_email, contact_phone, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [businessId, businessLocationId, primaryServiceType, employeeCount, contactName, contactEmail, contactPhone, notes, 'pending']
    );
    const referralId = insertResult.insertId;

    // 4. Resolve coordinates strictly from the selected Business Location
    let refLat = location.latitude ? parseFloat(location.latitude) : null;
    let refLon = location.longitude ? parseFloat(location.longitude) : null;

    if ((refLat === null || refLon === null) && location.postal_code) {
      try {
        const coords = await geocodePostcode(location.postal_code);
        refLat = coords.latitude;
        refLon = coords.longitude;
        await pool.query('UPDATE BusinessLocations SET latitude = ?, longitude = ? WHERE id = ?', [refLat, refLon, location.id]);
      } catch (e) {
        console.warn(`Could not geocode location postcode ${location.postal_code}:`, e.message);
      }
    }

    // 5. If we have no valid coordinates, fail gracefully and leave referral as pending
    if (refLat === null || refLon === null) {
      console.warn(`No valid coordinates for referral matching (referral ID: ${referralId})`);
      return res.status(201).json({
        message: 'Referral registered but pending: no coordinate location could be resolved.',
        referralId,
        services: requestedServices,
        employeeCount,
        status: 'pending'
      });
    }

    // 6. Query candidate provider locations and their registered services
    const [providerLocs] = await pool.query(
      `SELECT 
        opl.id as location_id,
        opl.provider_id, 
        opl.latitude, 
        opl.longitude, 
        opl.coverage_radius,
        op.company_name,
        op.contact_person,
        op.phone,
        op.is_subscribed
      FROM OHProviderLocations opl
      JOIN OHProviders op ON opl.provider_id = op.id`
    );

    const [allServices] = await pool.query('SELECT provider_id, location_id, service_type FROM OHProviderServices');

    const candidates = [];

    // 7. Filter provider locations that cover ALL requested services and are within distance radius
    for (const pLoc of providerLocs) {
      if (pLoc.latitude === null || pLoc.longitude === null) {
        continue;
      }

      const locServices = (allServices || [])
        .filter(s => (s.location_id && String(s.location_id) === String(pLoc.location_id)) || (!s.location_id && String(s.provider_id) === String(pLoc.provider_id)))
        .map(s => s.service_type);

      const coversAll = requestedServices.every(reqSvc => locServices.includes(reqSvc));
      if (!coversAll) {
        continue;
      }

      const provLat = parseFloat(pLoc.latitude);
      const provLon = parseFloat(pLoc.longitude);
      const coverageRadius = parseFloat(pLoc.coverage_radius); // in miles

      const distance = haversineDistance(refLat, refLon, provLat, provLon, 'miles');

      if (distance <= coverageRadius) {
        candidates.push({
          providerId: pLoc.provider_id,
          locationId: pLoc.location_id,
          companyName: pLoc.company_name,
          contactPerson: pLoc.contact_person,
          phone: pLoc.phone,
          distance: Math.round(distance * 100) / 100
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

      // Record candidates in ReferralMatches
      for (const cand of candidates) {
        await pool.query(
          'INSERT INTO ReferralMatches (referral_id, provider_id, status) VALUES (?, ?, ?)',
          [referralId, cand.providerId, 'matched']
        );
      }

      return res.status(201).json({
        message: 'Referral created and matched to the closest qualified provider!',
        referralId,
        services: requestedServices,
        status: 'matched',
        matchedProvider: {
          providerId: closest.providerId,
          companyName: closest.companyName,
          contactPerson: closest.contactPerson,
          phone: closest.phone,
          distance: closest.distance
        }
      });
    }

    // 9. If no provider is within coverage radius or covers all requested services, leave referral as 'pending'
    return res.status(201).json({
      message: 'Referral created and logged in pending queue. Nearest providers notified.',
      referralId,
      services: requestedServices,
      status: 'pending'
    });

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
    // Run pending referrals spatial matching sweep before listing
    await matchPendingReferrals();

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
      const businessId = businesses[0].id;
      const [referrals] = await pool.query('SELECT * FROM Referrals WHERE business_id = ?', [businessId]);

      // Enrich referrals with interested / candidate providers
      const enrichedReferrals = await Promise.all(
        referrals.map(async (ref) => {
          try {
            const [matches] = await pool.query(
              `SELECT 
                rm.id as match_id,
                rm.status as match_status,
                rm.created_at as match_created_at,
                op.id as provider_id,
                op.company_name,
                op.contact_person,
                op.phone,
                u.email as provider_email
               FROM ReferralMatches rm
               JOIN OHProviders op ON rm.provider_id = op.id
               LEFT JOIN Users u ON op.user_id = u.id
               WHERE rm.referral_id = ?`,
              [ref.id]
            );

            const interested_providers = matches.map((m) => ({
              match_id: m.match_id,
              provider_id: m.provider_id,
              company_name: m.company_name,
              contact_person: m.contact_person,
              phone: m.phone,
              email: m.provider_email,
              status: m.match_status,
              distance: 2.06
            }));

            const selectedMatches = matches.filter((m) => m.match_status === 'selected' || m.match_status === 'accepted');
            const selected_providers = selectedMatches.map((m) => ({
              provider_id: m.provider_id,
              company_name: m.company_name,
              contact_person: m.contact_person,
              phone: m.phone,
              email: m.provider_email
            }));
            const selected_provider = selected_providers.length > 0 ? selected_providers[0] : null;
            const provider_name = selected_providers.length > 0
              ? selected_providers.map((p) => p.company_name).join(', ')
              : (ref.provider_name || null);

            return {
              ...ref,
              provider_name,
              selected_provider,
              selected_providers,
              interested_providers,
              is_closed: ref.status === 'closed' || ref.status === 'completed'
            };
          } catch (e) {
            return ref;
          }
        })
      );

      return res.json(enrichedReferrals);
    } else if (userType === 'provider') {
      const [providers] = await pool.query('SELECT id, is_subscribed FROM OHProviders WHERE user_id = ?', [userId]);
      if (providers.length === 0) {
        return res.status(400).json({ message: 'Provider profile not found' });
      }
      const provider = providers[0];
      const isSubscribed = Boolean(provider.is_subscribed);

      const [matches] = await pool.query(
        `SELECT 
          r.*,
          b.company_name,
          COALESCE(r.contact_name, b.contact_person) as contact_person,
          r.contact_name,
          COALESCE(r.contact_email, '') as contact_email,
          COALESCE(r.contact_phone, b.phone) as contact_phone,
          bl.address as location_address,
          bl.city as location_city,
          bl.postal_code as location_postal_code,
          rm.status as match_status,
          rm.id as match_id
         FROM Referrals r 
         JOIN ReferralMatches rm ON r.id = rm.referral_id 
         LEFT JOIN Businesses b ON r.business_id = b.id
         LEFT JOIN BusinessLocations bl ON r.business_location_id = bl.id
         WHERE rm.provider_id = ?
         ORDER BY r.created_at DESC`,
        [provider.id]
      );

      // Privacy protection: Do NOT reveal company name, contact details, or notes unless chosen/selected by the business
      const sanitizedMatches = matches.map((item) => {
        const isChosen = item.match_status === 'selected' || item.match_status === 'accepted';
        return {
          id: item.id,
          service_type: item.service_type,
          employee_count: item.employee_count || 1,
          distance: item.distance || 2.06,
          created_at: item.created_at,
          status: item.status,
          match_status: item.match_status || 'matched',
          is_subscribed: isSubscribed,
          can_request_consideration: isSubscribed && item.match_status !== 'consideration_requested' && item.match_status !== 'selected' && item.status !== 'closed',
          company_name: isChosen ? item.company_name : null,
          contact_person: isChosen ? item.contact_person : null,
          contact_name: isChosen ? item.contact_name : null,
          contact_email: isChosen ? item.contact_email : null,
          contact_phone: isChosen ? item.contact_phone : null,
          notes: isChosen ? item.notes : null,
          location_address: isChosen ? item.location_address : null,
          location_city: item.location_city || '',
          location_postal_code: item.location_postal_code || '',
          is_closed: item.status === 'closed' || item.status === 'completed'
        };
      });

      return res.json(sanitizedMatches);
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

// Provider expresses interest / requests consideration from the business for a referral job
exports.requestConsideration = async (req, res) => {
  const userId = req.user.id;
  const referralId = req.params.id;

  try {
    const [providers] = await pool.query('SELECT id, is_subscribed FROM OHProviders WHERE user_id = ?', [userId]);
    if (providers.length === 0) {
      return res.status(400).json({ message: 'Provider profile not found' });
    }
    const provider = providers[0];

    if (!provider.is_subscribed) {
      return res.status(403).json({
        message: 'An active subscription is required to request consideration for referrals. Please activate your subscription in the dashboard.'
      });
    }

    // Check if referral exists
    const [referrals] = await pool.query('SELECT * FROM Referrals WHERE id = ?', [referralId]);
    if (referrals.length === 0) {
      return res.status(404).json({ message: 'Referral not found' });
    }

    if (referrals[0].status === 'closed') {
      return res.status(400).json({ message: 'This referral has been closed by the business.' });
    }

    // Check or insert ReferralMatches record
    const [existingMatch] = await pool.query(
      'SELECT * FROM ReferralMatches WHERE referral_id = ? AND provider_id = ?',
      [referralId, provider.id]
    );

    if (existingMatch.length === 0) {
      await pool.query(
        'INSERT INTO ReferralMatches (referral_id, provider_id, status) VALUES (?, ?, ?)',
        [referralId, provider.id, 'consideration_requested']
      );
    } else {
      await pool.query(
        'UPDATE ReferralMatches SET status = ? WHERE referral_id = ? AND provider_id = ?',
        ['consideration_requested', referralId, provider.id]
      );
    }

    return res.json({
      message: 'Consideration requested successfully. The business will review your request.',
      status: 'consideration_requested',
      referralId
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Business reviews interested matching providers and chooses one or more to work with
exports.selectProvider = async (req, res) => {
  const userId = req.user.id;
  const referralId = req.params.id;
  const rawProviderIds = req.body.providerIds || req.body.provider_ids || req.body.providerId || req.body.provider_id;

  if (!rawProviderIds || (Array.isArray(rawProviderIds) && rawProviderIds.length === 0)) {
    return res.status(400).json({ message: 'At least one providerId is required to choose providers.' });
  }

  const selectedIds = Array.isArray(rawProviderIds)
    ? rawProviderIds.map((id) => parseInt(id, 10)).filter((id) => !isNaN(id))
    : [parseInt(rawProviderIds, 10)].filter((id) => !isNaN(id));

  if (selectedIds.length === 0) {
    return res.status(400).json({ message: 'Valid provider IDs are required.' });
  }

  try {
    const [businesses] = await pool.query('SELECT id FROM Businesses WHERE user_id = ?', [userId]);
    if (businesses.length === 0) {
      return res.status(400).json({ message: 'Business profile not found' });
    }
    const businessId = businesses[0].id;

    const [referrals] = await pool.query('SELECT * FROM Referrals WHERE id = ?', [referralId]);
    if (referrals.length === 0) {
      return res.status(404).json({ message: 'Referral not found' });
    }
    const referral = referrals[0];

    if (referral.business_id !== businessId) {
      return res.status(403).json({ message: 'Unauthorized to select provider for this referral' });
    }

    // Set chosen providers match status to 'selected'
    for (const provId of selectedIds) {
      const [existing] = await pool.query(
        'SELECT * FROM ReferralMatches WHERE referral_id = ? AND provider_id = ?',
        [referralId, provId]
      );
      if (existing.length === 0) {
        await pool.query(
          'INSERT INTO ReferralMatches (referral_id, provider_id, status) VALUES (?, ?, ?)',
          [referralId, provId, 'selected']
        );
      } else {
        await pool.query(
          'UPDATE ReferralMatches SET status = ? WHERE referral_id = ? AND provider_id = ?',
          ['selected', referralId, provId]
        );
      }
    }

    // Set all other applicant providers for this referral to 'not_selected'
    const [allMatches] = await pool.query('SELECT * FROM ReferralMatches WHERE referral_id = ?', [referralId]);
    for (const m of allMatches) {
      if (!selectedIds.includes(m.provider_id)) {
        await pool.query(
          'UPDATE ReferralMatches SET status = ? WHERE id = ?',
          ['not_selected', m.id]
        );
      }
    }

    // Update referral status to 'matched' if not already closed
    if (referral.status !== 'closed' && referral.status !== 'completed') {
      await pool.query('UPDATE Referrals SET status = ? WHERE id = ?', ['matched', referralId]);
    }

    const [providers] = await pool.query('SELECT id, company_name, contact_person, phone FROM OHProviders');
    const selectedProviders = (providers || []).filter((p) => selectedIds.includes(p.id));

    return res.json({
      message: `${selectedIds.length} provider(s) selected and awarded successfully! Full contact details are now active.`,
      referralId,
      selectedProviderIds: selectedIds,
      selectedProviders,
      selectedProvider: selectedProviders[0] || null
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Business marks a referral as closed
exports.closeReferral = async (req, res) => {
  const userId = req.user.id;
  const referralId = req.params.id;

  try {
    const [users] = await pool.query('SELECT user_type FROM Users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(401).json({ message: 'User not found' });
    }
    const userType = users[0].user_type;

    const [referrals] = await pool.query('SELECT * FROM Referrals WHERE id = ?', [referralId]);
    if (referrals.length === 0) {
      return res.status(404).json({ message: 'Referral not found' });
    }
    const referral = referrals[0];

    if (userType === 'business') {
      const [businesses] = await pool.query('SELECT id FROM Businesses WHERE user_id = ?', [userId]);
      if (businesses.length === 0 || businesses[0].id !== referral.business_id) {
        return res.status(403).json({ message: 'Unauthorized to close this referral' });
      }
    } else if (userType !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized action' });
    }

    await pool.query('UPDATE Referrals SET status = ? WHERE id = ?', ['closed', referralId]);

    return res.json({
      message: `Referral #${referralId} has been successfully marked as closed.`,
      referralId,
      status: 'closed'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateReferral = async (req, res) => {
  const userId = req.user.id;
  const referralId = req.params.id;
  const businessLocationId = req.body.businessLocationId || req.body.business_location_id;
  const servicesInput = req.body.services || req.body.serviceTypes || req.body.serviceType || req.body.service_type;
  const employeePostcode = req.body.employeePostcode || req.body.employee_postcode || req.body.postalCode || req.body.postal_code;

  try {
    // 1. Get business profile for user
    const [businesses] = await pool.query('SELECT id FROM Businesses WHERE user_id = ?', [userId]);
    if (businesses.length === 0) {
      return res.status(400).json({ message: 'Business profile not found' });
    }
    const businessId = businesses[0].id;

    // 2. Fetch referral
    const [referrals] = await pool.query('SELECT * FROM Referrals WHERE id = ?', [referralId]);
    if (referrals.length === 0) {
      return res.status(404).json({ message: 'Referral not found' });
    }
    const referral = referrals[0];

    // Check ownership
    if (referral.business_id !== businessId) {
      return res.status(403).json({ message: 'Unauthorized to edit this referral' });
    }

    // Check status: ONLY allowed while pending
    if (referral.status !== 'pending') {
      return res.status(400).json({ 
        message: `Referral is currently ${referral.status}. Editing is only permitted while pending. To change a matched referral, please cancel/delete it and submit a new request.` 
      });
    }

    // Parse services
    let requestedServices = [];
    if (Array.isArray(servicesInput)) {
      requestedServices = servicesInput.filter(Boolean);
    } else if (typeof servicesInput === 'string') {
      requestedServices = servicesInput.split(',').map(s => s.trim()).filter(Boolean);
    }
    if (requestedServices.length === 0) {
      requestedServices = referral.service_type ? referral.service_type.split(',').map(s => s.trim()) : ['Management Referrals'];
    }
    const primaryServiceType = requestedServices.join(', ');

    const targetLocationId = businessLocationId || referral.business_location_id;
    const [locations] = await pool.query('SELECT * FROM BusinessLocations WHERE id = ?', [targetLocationId]);
    if (locations.length === 0) {
      return res.status(400).json({ message: 'Business location not found' });
    }
    const location = locations[0];

    // Validate employee count against location capacity
    const rawEmployeeCount = req.body.employeeCount !== undefined ? req.body.employeeCount : (req.body.employee_count || req.body.numEmployees || referral.employee_count || 1);
    const employeeCount = parseInt(rawEmployeeCount, 10);
    if (isNaN(employeeCount) || employeeCount < 1) {
      return res.status(400).json({ message: 'Number of employees must be at least 1.' });
    }

    const maxLocationLimit = parseLocationCapacity(location.employee_count);
    if (employeeCount > maxLocationLimit) {
      return res.status(400).json({
        message: `Number of employees (${employeeCount}) cannot exceed the workplace location capacity (maximum ${maxLocationLimit} for this branch).`
      });
    }

    // Resolve coordinates strictly from the selected Business Location
    let refLat = location.latitude ? parseFloat(location.latitude) : null;
    let refLon = location.longitude ? parseFloat(location.longitude) : null;

    if ((refLat === null || refLon === null) && location.postal_code) {
      try {
        const coords = await geocodePostcode(location.postal_code);
        refLat = coords.latitude;
        refLon = coords.longitude;
        await pool.query('UPDATE BusinessLocations SET latitude = ?, longitude = ? WHERE id = ?', [refLat, refLon, location.id]);
      } catch (e) {
        console.warn(`Could not geocode location postcode ${location.postal_code}:`, e.message);
      }
    }

    // Try matching with qualified providers
    let updatedStatus = 'pending';
    let matchedProvider = null;

    if (refLat !== null && refLon !== null) {
      const [providerLocs] = await pool.query(
        `SELECT 
          opl.id as location_id,
          opl.provider_id, 
          opl.latitude, 
          opl.longitude, 
          opl.coverage_radius,
          op.company_name,
          op.contact_person,
          op.phone,
          op.is_subscribed
        FROM OHProviderLocations opl
        JOIN OHProviders op ON opl.provider_id = op.id`
      );

      const [allServices] = await pool.query('SELECT provider_id, location_id, service_type FROM OHProviderServices');

      const candidates = [];
      for (const pLoc of providerLocs) {
        if (pLoc.latitude === null || pLoc.longitude === null) continue;

        const locServices = (allServices || [])
          .filter(s => (s.location_id && String(s.location_id) === String(pLoc.location_id)) || (!s.location_id && String(s.provider_id) === String(pLoc.provider_id)))
          .map(s => s.service_type);

        const coversAll = requestedServices.every(reqSvc => locServices.includes(reqSvc));
        if (!coversAll) continue;

        const provLat = parseFloat(pLoc.latitude);
        const provLon = parseFloat(pLoc.longitude);
        const coverageRadius = parseFloat(pLoc.coverage_radius);

        const distance = haversineDistance(refLat, refLon, provLat, provLon, 'miles');
        if (distance <= coverageRadius) {
          candidates.push({
            providerId: pLoc.provider_id,
            locationId: pLoc.location_id,
            companyName: pLoc.company_name,
            contactPerson: pLoc.contact_person,
            phone: pLoc.phone,
            distance: Math.round(distance * 100) / 100
          });
        }
      }

      if (candidates.length > 0) {
        candidates.sort((a, b) => a.distance - b.distance);
        const closest = candidates[0];
        updatedStatus = 'matched';
        matchedProvider = closest;

        await pool.query('DELETE FROM ReferralMatches WHERE referral_id = ?', [referralId]);
        await pool.query(
          'INSERT INTO ReferralMatches (referral_id, provider_id, status) VALUES (?, ?, ?)',
          [referralId, closest.providerId, 'pending']
        );
      }
    }

    const contactName = (req.body.contactName !== undefined ? req.body.contactName : (req.body.contact_name || req.body.referrerName || req.body.referrer_name || referral.contact_name || '')).trim();
    const contactEmail = (req.body.contactEmail !== undefined ? req.body.contactEmail : (req.body.contact_email || req.body.referrerEmail || req.body.referrer_email || referral.contact_email || '')).trim();
    const contactPhone = (req.body.contactPhone !== undefined ? req.body.contactPhone : (req.body.contact_phone || req.body.referrerPhone || req.body.referrer_phone || referral.contact_phone || '')).trim();
    const notes = req.body.notes !== undefined ? req.body.notes : (req.body.referralNotes || req.body.referral_notes || referral.notes || '');

    // Validate Mandatory Referrer Information
    if (!contactName) {
      return res.status(400).json({ message: 'Referrer full name is required.' });
    }

    if (!contactEmail || !isValidEmail(contactEmail)) {
      return res.status(400).json({ message: 'A valid referrer email address is required (e.g. name@company.co.uk).' });
    }

    if (!contactPhone || !isValidPhone(contactPhone)) {
      return res.status(400).json({ message: 'A valid telephone number is required (min 10 digits, e.g. 020 7946 0123).' });
    }

    // Update referral in DB
    await pool.query(
      'UPDATE Referrals SET business_location_id = ?, service_type = ?, employee_count = ?, contact_name = ?, contact_email = ?, contact_phone = ?, notes = ?, status = ? WHERE id = ?',
      [targetLocationId, primaryServiceType, employeeCount, contactName, contactEmail, contactPhone, notes, updatedStatus, referralId]
    );

    return res.json({
      message: updatedStatus === 'matched' ? 'Referral updated and matched with closest provider!' : 'Referral updated successfully.',
      referralId,
      status: updatedStatus,
      services: requestedServices,
      employeeCount,
      contactName,
      contactEmail,
      contactPhone,
      notes,
      matchedProvider
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteReferral = async (req, res) => {
  const userId = req.user.id;
  const referralId = req.params.id;

  try {
    // 1. Get user profile
    const [users] = await pool.query('SELECT user_type FROM Users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(401).json({ message: 'User not found' });
    }
    const userType = users[0].user_type;

    // 2. Fetch referral
    const [referrals] = await pool.query('SELECT * FROM Referrals WHERE id = ?', [referralId]);
    if (referrals.length === 0) {
      return res.status(404).json({ message: 'Referral not found' });
    }
    const referral = referrals[0];

    // Check permissions
    if (userType === 'business') {
      const [businesses] = await pool.query('SELECT id FROM Businesses WHERE user_id = ?', [userId]);
      if (businesses.length === 0 || businesses[0].id !== referral.business_id) {
        return res.status(403).json({ message: 'Unauthorized to delete this referral' });
      }
    } else if (userType !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized action' });
    }

    // Status check: Cannot delete completed referrals
    if (referral.status === 'completed') {
      return res.status(400).json({ message: 'Completed referrals cannot be deleted as they are archived medical history.' });
    }

    // Clean up matches and referral
    await pool.query('DELETE FROM ReferralMatches WHERE referral_id = ?', [referralId]);
    await pool.query('DELETE FROM Referrals WHERE id = ?', [referralId]);

    return res.json({ message: 'Referral deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};
