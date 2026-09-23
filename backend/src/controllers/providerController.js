const pool = require('../utils/db');
const { geocodePostcode } = require('../utils/postcode');

exports.createProviderProfile = async (req, res) => {
  const { companyName, contactPerson, phone } = req.body;
  const userId = req.user.id;

  try {
    const [existing] = await pool.query('SELECT id FROM OHProviders WHERE user_id = ?', [userId]);
    if (existing.length > 0) {
      await pool.query(
        'UPDATE OHProviders SET company_name = ?, contact_person = ?, phone = ? WHERE id = ?',
        [companyName, contactPerson, phone, existing[0].id]
      );
      return res.status(201).json({ message: 'OH Provider profile updated', providerId: existing[0].id });
    }

    const [result] = await pool.query(
      'INSERT INTO OHProviders (user_id, company_name, contact_person, phone) VALUES (?, ?, ?, ?)',
      [userId, companyName, contactPerson, phone]
    );

    res.status(201).json({ message: 'OH Provider profile created', providerId: result.insertId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getProviderProfile = async (req, res) => {
  const userId = req.user.id;
  try {
    const [providers] = await pool.query('SELECT * FROM OHProviders WHERE user_id = ?', [userId]);
    if (providers.length === 0) {
      return res.status(404).json({ message: 'Provider profile not found' });
    }
    res.json(providers[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateSubscription = async (req, res) => {
  const userId = req.user.id;
  const rawSub = req.body.isSubscribed !== undefined ? req.body.isSubscribed : req.body.is_subscribed;
  const isSubscribed = rawSub !== undefined ? Boolean(rawSub) : true;

  try {
    const [providers] = await pool.query('SELECT id FROM OHProviders WHERE user_id = ?', [userId]);
    if (providers.length === 0) {
      return res.status(404).json({ message: 'Provider profile not found' });
    }

    const providerId = providers[0].id;
    const expiryDate = isSubscribed ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : null;

    await pool.query(
      'UPDATE OHProviders SET is_subscribed = ?, subscription_expiry = ? WHERE id = ?',
      [Boolean(isSubscribed), expiryDate, providerId]
    );

    res.json({ 
      message: isSubscribed ? 'Subscription activated successfully' : 'Subscription cancelled',
      isSubscribed: Boolean(isSubscribed),
      subscriptionExpiry: expiryDate
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getProviderLocations = async (req, res) => {
  const userId = req.user.id;
  try {
    const [providers] = await pool.query('SELECT id FROM OHProviders WHERE user_id = ?', [userId]);
    if (providers.length === 0) {
      return res.json([]);
    }
    const providerId = providers[0].id;

    const [locations] = await pool.query('SELECT * FROM OHProviderLocations WHERE provider_id = ?', [providerId]);
    const [services] = await pool.query('SELECT * FROM OHProviderServices WHERE provider_id = ?', [providerId]);

    // Attach services to each location
    const locationsWithServices = locations.map(loc => {
      const locServices = services
        .filter(s => s.location_id === loc.id || !s.location_id)
        .map(s => s.service_type);
      return {
        ...loc,
        services: [...new Set(locServices)]
      };
    });

    res.json(locationsWithServices);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.addProviderLocation = async (req, res) => {
  const { address, city, state, country, postalCode, coverageRadius, services, serviceType } = req.body;
  const userId = req.user.id;

  if (!postalCode) {
    return res.status(400).json({ message: 'Postal code is required' });
  }

  try {
    // Get the provider ID for the authenticated user
    let [providers] = await pool.query('SELECT id FROM OHProviders WHERE user_id = ?', [userId]);
    let providerId;
    if (providers.length === 0) {
      const [newProv] = await pool.query(
        'INSERT INTO OHProviders (user_id, company_name, contact_person, phone, is_subscribed) VALUES (?, ?, ?, ?, ?)',
        [userId, 'OH Provider Practice', 'Clinic Lead', '', true]
      );
      providerId = newProv.insertId;
    } else {
      providerId = providers[0].id;
    }

    let latitude = null;
    let longitude = null;

    try {
      const coords = await geocodePostcode(postalCode);
      latitude = coords.latitude;
      longitude = coords.longitude;
    } catch (err) {
      if (err.message === 'Invalid postcode' || err.message.includes('Invalid')) {
        return res.status(400).json({ message: 'Invalid postcode. Please provide a valid UK postcode.' });
      }
      console.warn(`Geocoding warning for provider location postal code ${postalCode}:`, err.message);
    }

    const [result] = await pool.query(
      'INSERT INTO OHProviderLocations (provider_id, address, city, state, country, postal_code, coverage_radius, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [providerId, address || '', city || '', state || '', country || 'United Kingdom', postalCode, coverageRadius || 30, latitude, longitude]
    );

    const locationId = result.insertId;

    // Record services for this location
    const servicesToAdd = Array.isArray(services) 
      ? services 
      : (serviceType ? [serviceType] : ['Management Referrals']);

    for (const sType of servicesToAdd) {
      if (sType) {
        await pool.query(
          'INSERT INTO OHProviderServices (provider_id, location_id, service_type) VALUES (?, ?, ?)',
          [providerId, locationId, sType]
        );
      }
    }

    // Automatically re-evaluate and match any eligible pending referrals with this new clinic location
    let newlyMatched = 0;
    try {
      const { matchPendingReferrals } = require('./referralController');
      newlyMatched = await matchPendingReferrals();
    } catch (matchErr) {
      console.warn('Notice matching pending referrals on location add:', matchErr.message);
    }

    res.status(201).json({
      message: 'Provider location added with services',
      locationId,
      services: servicesToAdd,
      coordinates: { latitude, longitude },
      matchedPendingReferrals: newlyMatched
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.addProviderService = async (req, res) => {
  const { serviceType, locationId } = req.body;
  const userId = req.user.id;

  try {
    const [providers] = await pool.query('SELECT id FROM OHProviders WHERE user_id = ?', [userId]);
    if (providers.length === 0) {
      return res.status(400).json({ message: 'Provider profile not found' });
    }
    const providerId = providers[0].id;

    const [result] = await pool.query(
      'INSERT INTO OHProviderServices (provider_id, location_id, service_type) VALUES (?, ?, ?)',
      [providerId, locationId || null, serviceType]
    );

    res.status(201).json({ message: 'Provider service added', serviceId: result.insertId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteProviderLocation = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const [providers] = await pool.query('SELECT id FROM OHProviders WHERE user_id = ?', [userId]);
    if (providers.length === 0) {
      return res.status(400).json({ message: 'Provider profile not found' });
    }
    const providerId = providers[0].id;

    await pool.query('DELETE FROM OHProviderServices WHERE location_id = ? AND provider_id = ?', [id, providerId]);
    await pool.query('DELETE FROM OHProviderLocations WHERE id = ? AND provider_id = ?', [id, providerId]);

    res.json({ message: 'Provider location and associated services deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};
