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
        .filter(s => String(s.location_id) === String(loc.id) || !s.location_id)
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
        [userId, 'OH Provider Practice', 'Clinic Lead', '', false]
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

exports.updateProviderLocation = async (req, res) => {
  const { id } = req.params;
  const { address, city, state, country, postalCode, coverageRadius, services } = req.body;
  const userId = req.user.id;

  try {
    const [providers] = await pool.query('SELECT id FROM OHProviders WHERE user_id = ?', [userId]);
    if (providers.length === 0) {
      return res.status(400).json({ message: 'Provider profile not found' });
    }
    const providerId = providers[0].id;

    // Check location belongs to provider
    const [existing] = await pool.query('SELECT * FROM OHProviderLocations WHERE id = ? AND provider_id = ?', [id, providerId]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Location not found or unauthorized' });
    }

    let latitude = existing[0].latitude;
    let longitude = existing[0].longitude;

    if (postalCode && postalCode !== existing[0].postal_code) {
      try {
        const coords = await geocodePostcode(postalCode);
        latitude = coords.latitude;
        longitude = coords.longitude;
      } catch (err) {
        if (err.message === 'Invalid postcode' || err.message.includes('Invalid')) {
          return res.status(400).json({ message: 'Invalid postcode. Please provide a valid UK postcode.' });
        }
      }
    }

    await pool.query(
      'UPDATE OHProviderLocations SET address = ?, city = ?, state = ?, country = ?, postal_code = ?, coverage_radius = ?, latitude = ?, longitude = ? WHERE id = ? AND provider_id = ?',
      [
        address !== undefined ? address : existing[0].address,
        city !== undefined ? city : existing[0].city,
        state !== undefined ? state : existing[0].state,
        country !== undefined ? country : existing[0].country,
        postalCode !== undefined ? postalCode : existing[0].postal_code,
        coverageRadius !== undefined ? coverageRadius : existing[0].coverage_radius,
        latitude,
        longitude,
        id,
        providerId
      ]
    );

    if (Array.isArray(services)) {
      await pool.query('DELETE FROM OHProviderServices WHERE location_id = ? AND provider_id = ?', [id, providerId]);
      for (const sType of services) {
        if (sType) {
          await pool.query(
            'INSERT INTO OHProviderServices (provider_id, location_id, service_type) VALUES (?, ?, ?)',
            [providerId, id, sType]
          );
        }
      }
    }

    res.json({ message: 'Provider location updated successfully', locationId: id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const calculateRadiusPrice = (radius) => {
  const r = Number(radius) || 30;
  if (r <= 10) return 10;
  if (r <= 30) return 20;
  if (r <= 50) return 30;
  if (r <= 100) return 50;
  return 300; // 500 miles (Nationwide)
};

exports.getSubscriptionSummary = async (req, res) => {
  const userId = req.user.id;
  try {
    const [providers] = await pool.query('SELECT * FROM OHProviders WHERE user_id = ?', [userId]);
    if (providers.length === 0) {
      return res.status(404).json({ message: 'Provider profile not found' });
    }
    const provider = providers[0];
    const [locations] = await pool.query('SELECT * FROM OHProviderLocations WHERE provider_id = ?', [provider.id]);

    const itemizedLocations = locations.map(loc => {
      const radius = Number(loc.coverage_radius) || 30;
      const monthlyCost = calculateRadiusPrice(radius);
      return {
        id: loc.id,
        address: loc.address || 'Clinic Branch',
        postalCode: loc.postal_code,
        city: loc.city,
        coverageRadius: radius,
        monthlyCost
      };
    });

    const totalMonthlyCost = itemizedLocations.reduce((sum, item) => sum + item.monthlyCost, 0);

    res.json({
      isSubscribed: Boolean(provider.is_subscribed),
      subscriptionExpiry: provider.subscription_expiry,
      stripeCustomerId: provider.stripe_customer_id || null,
      stripeSubscriptionId: provider.stripe_subscription_id || null,
      subscriptionStatus: provider.subscription_status || (provider.is_subscribed ? 'active' : 'inactive'),
      tier: provider.is_subscribed ? (totalMonthlyCost >= 300 ? 'Nationwide Pro' : 'Radius-Based Pro') : 'Free Tier',
      totalMonthlyCost,
      itemizedLocations,
      pricingTiers: [
        { radius: 10, label: '10 Mile Radius', pricePerMonth: 10, description: 'Local town or city coverage' },
        { radius: 30, label: '30 Mile Radius', pricePerMonth: 20, description: 'Standard regional clinic coverage' },
        { radius: 50, label: '50 Mile Radius', pricePerMonth: 30, description: 'Expanded county-wide coverage' },
        { radius: 100, label: '100 Mile Radius', pricePerMonth: 50, description: 'Broad multi-county reach' },
        { radius: 500, label: '500 Mile Radius (Nationwide)', pricePerMonth: 300, description: 'Full UK-wide coverage (single location covers all UK)' },
      ]
    });
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

const stripe = require('../utils/stripe');

exports.createCheckoutSession = async (req, res) => {
  const userId = req.user.id;

  try {
    const [providers] = await pool.query('SELECT * FROM OHProviders WHERE user_id = ?', [userId]);
    if (providers.length === 0) {
      return res.status(404).json({ message: 'Provider profile not found. Please complete profile first.' });
    }
    const provider = providers[0];

    const [locations] = await pool.query('SELECT * FROM OHProviderLocations WHERE provider_id = ?', [provider.id]);
    if (!locations || locations.length === 0) {
      return res.status(400).json({ message: 'Please add at least one clinic location in your dashboard before starting a subscription.' });
    }

    const [users] = await pool.query('SELECT email FROM Users WHERE id = ?', [userId]);
    const userEmail = users && users[0] ? users[0].email : '';

    let customerId = provider.stripe_customer_id;
    if (!customerId) {
      try {
        const customer = await stripe.customers.create({
          email: userEmail,
          name: provider.company_name,
          metadata: {
            providerId: String(provider.id),
            userId: String(userId)
          }
        });
        customerId = customer.id;
        await pool.query('UPDATE OHProviders SET stripe_customer_id = ? WHERE id = ?', [customerId, provider.id]);
      } catch (custErr) {
        console.warn('Notice creating Stripe customer:', custErr.message);
      }
    }

    const line_items = locations.map(loc => {
      const radius = Number(loc.coverage_radius) || 30;
      const priceInPounds = calculateRadiusPrice(radius);
      const isNationwide = radius >= 500;
      return {
        price_data: {
          currency: 'gbp',
          product_data: {
            name: `OH Clinic Coverage: ${isNationwide ? 'Nationwide UK' : `${radius} Mile Radius`}`,
            description: `Location: ${loc.address || loc.city || 'Clinic'} (${loc.postal_code})`
          },
          unit_amount: priceInPounds * 100, // Stripe expects amounts in pence
          recurring: {
            interval: 'month'
          }
        },
        quantity: 1
      };
    });

    const clientOrigin = req.headers.origin || req.headers.referer || process.env.FRONTEND_URL || 'http://localhost:3000';
    const baseUrl = clientOrigin.replace(/\/+$/, '');

    const sessionParams = {
      payment_method_types: ['card', 'bacs_debit'],
      mode: 'subscription',
      line_items,
      client_reference_id: String(provider.id),
      metadata: {
        providerId: String(provider.id),
        userId: String(userId)
      },
      subscription_data: {
        metadata: {
          providerId: String(provider.id),
          userId: String(userId)
        }
      },
      success_url: `${baseUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}&subscription_status=success`,
      cancel_url: `${baseUrl}/dashboard?subscription_status=cancelled`
    };

    if (customerId) {
      sessionParams.customer = customerId;
    } else if (userEmail) {
      sessionParams.customer_email = userEmail;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    res.json({
      url: session.url,
      sessionId: session.id
    });
  } catch (error) {
    console.error('Stripe Checkout Session Error:', error);
    res.status(500).json({ message: 'Unable to initialize Stripe checkout', error: error.message });
  }
};

exports.createPortalSession = async (req, res) => {
  const userId = req.user.id;

  try {
    const [providers] = await pool.query('SELECT * FROM OHProviders WHERE user_id = ?', [userId]);
    if (providers.length === 0) {
      return res.status(404).json({ message: 'Provider profile not found' });
    }
    const provider = providers[0];

    if (!provider.stripe_customer_id) {
      return res.status(400).json({ message: 'No active Stripe billing customer found. Please subscribe first.' });
    }

    const clientOrigin = req.headers.origin || req.headers.referer || process.env.FRONTEND_URL || 'http://localhost:3000';
    const returnUrl = `${clientOrigin.replace(/\/+$/, '')}/dashboard`;

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: provider.stripe_customer_id,
      return_url: returnUrl
    });

    res.json({ url: portalSession.url });
  } catch (error) {
    console.error('Stripe Customer Portal Error:', error);
    res.status(500).json({ message: 'Unable to open Stripe Customer Portal', error: error.message });
  }
};

exports.handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event;

  try {
    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      // In development or when webhook secret is pending, parse payload safely
      event = typeof req.body === 'string' || Buffer.isBuffer(req.body) 
        ? JSON.parse(req.body.toString('utf8')) 
        : req.body;
    }
  } catch (err) {
    console.error('⚠️ Stripe Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    const eventType = event.type;
    console.log(`🔔 Stripe Webhook Received: ${eventType}`);

    switch (eventType) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const providerId = session.client_reference_id || session.metadata?.providerId;
        const customerId = session.customer;
        const subscriptionId = session.subscription;
        const expiryDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

        if (providerId) {
          await pool.query(
            'UPDATE OHProviders SET is_subscribed = ?, stripe_customer_id = ?, stripe_subscription_id = ?, subscription_status = ?, subscription_expiry = ? WHERE id = ?',
            [true, customerId, subscriptionId, 'active', expiryDate, providerId]
          );
          console.log(`✅ Provider ID ${providerId} subscription activated via Stripe Checkout (Sub: ${subscriptionId})`);
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        const status = subscription.status; // 'active', 'past_due', 'canceled', 'trialing'
        const isSubscribed = status === 'active' || status === 'trialing';

        await pool.query(
          'UPDATE OHProviders SET is_subscribed = ?, subscription_status = ? WHERE stripe_customer_id = ?',
          [isSubscribed, status, customerId]
        );
        console.log(`🔄 Provider subscription updated: Customer ${customerId} -> Status: ${status}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        const subscriptionId = subscription.id;

        await pool.query(
          'UPDATE OHProviders SET is_subscribed = ?, subscription_status = ? WHERE stripe_subscription_id = ? OR stripe_customer_id = ?',
          [false, 'canceled', subscriptionId, customerId]
        );
        console.log(`🛑 Provider subscription canceled: Customer ${customerId} / Sub ${subscriptionId}`);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        if (customerId) {
          await pool.query(
            'UPDATE OHProviders SET is_subscribed = ?, subscription_status = ? WHERE stripe_customer_id = ?',
            [true, 'active', customerId]
          );
          console.log(`💳 Invoice payment succeeded for Customer ${customerId}`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        if (customerId) {
          await pool.query(
            'UPDATE OHProviders SET subscription_status = ? WHERE stripe_customer_id = ?',
            ['past_due', customerId]
          );
          console.warn(`⚠️ Invoice payment failed for Customer ${customerId} (marked past_due)`);
        }
        break;
      }

      default:
        console.log(`ℹ️ Unhandled Stripe event: ${eventType}`);
    }

    res.json({ received: true });
  } catch (processErr) {
    console.error('Error processing Stripe webhook event:', processErr);
    res.status(500).json({ message: 'Webhook processing error', error: processErr.message });
  }
};


