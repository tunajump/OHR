const mysql = require('mysql2/promise');

const poolConfig = {
  host: process.env.DB_HOST || 'db',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'oh_referral',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

let realPool = null;
let useMock = false;

// In-memory database representation
const memoryDb = {
  Users: [],
  Businesses: [],
  BusinessLocations: [],
  OHProviders: [],
  OHProviderLocations: [],
  OHProviderServices: [],
  Referrals: [],
  ReferralMatches: []
};

const nextIds = {
  Users: 1,
  Businesses: 1,
  BusinessLocations: 1,
  OHProviders: 1,
  OHProviderLocations: 1,
  OHProviderServices: 1,
  Referrals: 1,
  ReferralMatches: 1
};

const mockPool = {
  async query(sql, params = []) {
    const normalizedSql = sql.trim().replace(/\s+/g, ' ').toLowerCase();

    try {
      // 1. SELECT * FROM Users WHERE email = ?
      if (normalizedSql.includes('select * from users where email =')) {
        const email = params[0];
        const results = memoryDb.Users.filter(u => u.email === email);
        return [results];
      }

      // 18. SELECT user_type FROM Users WHERE id = ?
      if (normalizedSql.includes('select user_type from users where id =')) {
        const id = params[0];
        const results = memoryDb.Users.filter(u => u.id === id).map(u => ({ user_type: u.user_type }));
        return [results];
      }

      // 2. INSERT INTO Users
      if (normalizedSql.startsWith('insert into users ')) {
        const [email, password, user_type] = params;
        const id = nextIds.Users++;
        const newUser = { id, email, password, user_type, created_at: new Date() };
        memoryDb.Users.push(newUser);
        return [{ insertId: id }];
      }

      // 3. INSERT INTO Businesses
      if (normalizedSql.startsWith('insert into businesses ')) {
        const [user_id, company_name, contact_person, phone] = params;
        const id = nextIds.Businesses++;
        const newBiz = { id, user_id, company_name, contact_person, phone };
        memoryDb.Businesses.push(newBiz);
        return [{ insertId: id }];
      }

      // 4. SELECT id FROM Businesses WHERE user_id = ?
      if (normalizedSql.includes('select id from businesses where user_id =')) {
        const userId = params[0];
        const results = memoryDb.Businesses.filter(b => b.user_id === userId).map(b => ({ id: b.id }));
        return [results];
      }

      // 5. INSERT INTO BusinessLocations
      if (normalizedSql.startsWith('insert into businesslocations ')) {
        const id = nextIds.BusinessLocations++;
        const newLoc = {
          id,
          business_id: params[0],
          address: params[1],
          city: params[2],
          state: params[3],
          country: params[4],
          postal_code: params[5],
          employee_count: params[6],
          latitude: params[7] !== undefined ? params[7] : null,
          longitude: params[8] !== undefined ? params[8] : null
        };
        memoryDb.BusinessLocations.push(newLoc);
        return [{ insertId: id }];
      }

      // 6. INSERT INTO OHProviders
      if (normalizedSql.startsWith('insert into ohproviders ')) {
        const [user_id, company_name, contact_person, phone] = params;
        const id = nextIds.OHProviders++;
        const newProv = { id, user_id, company_name, contact_person, phone, is_subscribed: false, subscription_expiry: null };
        memoryDb.OHProviders.push(newProv);
        return [{ insertId: id }];
      }

      // 7. SELECT id FROM OHProviders WHERE user_id = ?
      if (normalizedSql.includes('select id from ohproviders where user_id =')) {
        const userId = params[0];
        const results = memoryDb.OHProviders.filter(p => p.user_id === userId).map(p => ({ id: p.id }));
        return [results];
      }

      // 8. INSERT INTO OHProviderLocations
      if (normalizedSql.startsWith('insert into ohproviderlocations ')) {
        const id = nextIds.OHProviderLocations++;
        const newLoc = {
          id,
          provider_id: params[0],
          address: params[1],
          city: params[2],
          state: params[3],
          country: params[4],
          postal_code: params[5],
          coverage_radius: params[6],
          latitude: params[7] !== undefined ? params[7] : null,
          longitude: params[8] !== undefined ? params[8] : null
        };
        memoryDb.OHProviderLocations.push(newLoc);
        return [{ insertId: id }];
      }

      // 9. INSERT INTO OHProviderServices
      if (normalizedSql.startsWith('insert into ohproviderservices ')) {
        const [provider_id, service_type] = params;
        const id = nextIds.OHProviderServices++;
        const newServ = { id, provider_id, service_type };
        memoryDb.OHProviderServices.push(newServ);
        return [{ insertId: id }];
      }

      // 10. INSERT INTO Referrals
      if (normalizedSql.startsWith('insert into referrals ')) {
        const [business_id, business_location_id, service_type, status] = params;
        const id = nextIds.Referrals++;
        const newRef = { id, business_id, business_location_id, service_type, status: status || 'pending', created_at: new Date() };
        memoryDb.Referrals.push(newRef);
        return [{ insertId: id }];
      }

      // 11. SELECT * FROM BusinessLocations WHERE id = ?
      if (normalizedSql.includes('select * from businesslocations where id =')) {
        const id = params[0];
        const results = memoryDb.BusinessLocations.filter(loc => loc.id === id);
        return [results];
      }

      // 12. JOIN query for OHProviderLocations, Services and Providers
      if (
        normalizedSql.includes('from ohproviderlocations opl') ||
        (normalizedSql.includes('ohproviderlocations') &&
          normalizedSql.includes('ohproviderservices') &&
          normalizedSql.includes('ohproviders'))
      ) {
        const serviceType = params[0];
        const matchingServices = memoryDb.OHProviderServices.filter(s => s.service_type === serviceType);
        const results = [];
        for (const s of matchingServices) {
          const locations = memoryDb.OHProviderLocations.filter(loc => loc.provider_id === s.provider_id);
          const provider = memoryDb.OHProviders.find(p => p.id === s.provider_id);
          for (const loc of locations) {
            results.push({
              provider_id: loc.provider_id,
              latitude: loc.latitude,
              longitude: loc.longitude,
              coverage_radius: loc.coverage_radius,
              company_name: provider ? provider.company_name : '',
              contact_person: provider ? provider.contact_person : '',
              phone: provider ? provider.phone : ''
            });
          }
        }
        return [results];
      }

      // 13. UPDATE Referrals status
      if (normalizedSql.startsWith('update referrals set status =')) {
        const [status, id] = params;
        const ref = memoryDb.Referrals.find(r => r.id === id);
        if (ref) {
          ref.status = status;
        }
        return [{ affectedRows: ref ? 1 : 0 }];
      }

      // 14. INSERT INTO ReferralMatches
      if (normalizedSql.startsWith('insert into referralmatches ')) {
        const [referral_id, provider_id, status] = params;
        const id = nextIds.ReferralMatches++;
        const newMatch = { id, referral_id, provider_id, status: status || 'pending', created_at: new Date() };
        memoryDb.ReferralMatches.push(newMatch);
        return [{ insertId: id }];
      }

      // 15. SELECT * FROM Referrals WHERE business_id = ?
      if (normalizedSql.includes('select * from referrals where business_id =')) {
        const businessId = params[0];
        const results = memoryDb.Referrals.filter(ref => ref.business_id === businessId);
        return [results];
      }

      // 16. SELECT * FROM Referrals WHERE id = ?
      if (normalizedSql.includes('select * from referrals where id =')) {
        const id = params[0];
        const results = memoryDb.Referrals.filter(ref => ref.id === id);
        return [results];
      }

      // 19. SELECT * FROM ReferralMatches WHERE referral_id = ? AND provider_id = ?
      if (normalizedSql.includes('select * from referralmatches where referral_id =') && normalizedSql.includes('provider_id =')) {
        const [referral_id, provider_id] = params;
        const results = memoryDb.ReferralMatches.filter(m => m.referral_id === referral_id && m.provider_id === provider_id);
        return [results];
      }

      // 17. SELECT * FROM ReferralMatches WHERE referral_id = ?
      if (normalizedSql.includes('select * from referralmatches where referral_id =')) {
        const referralId = params[0];
        const results = memoryDb.ReferralMatches.filter(m => m.referral_id === referralId);
        return [results];
      }

      // 20. SELECT * FROM OHProviders WHERE id = ?
      if (normalizedSql.includes('select * from ohproviders where id =')) {
        const id = params[0];
        const results = memoryDb.OHProviders.filter(p => p.id === id);
        return [results];
      }

      // 21. JOIN for listReferrals for provider
      if (normalizedSql.includes('from referrals r join referralmatches rm on r.id = rm.referral_id')) {
        const providerId = params[0];
        const results = [];
        const matches = memoryDb.ReferralMatches.filter(m => m.provider_id === providerId);
        for (const m of matches) {
          const ref = memoryDb.Referrals.find(r => r.id === m.referral_id);
          if (ref) {
            results.push(ref);
          }
        }
        return [results];
      }

      console.warn('Unhandled mock query:', sql, params);
      return [[]];
    } catch (err) {
      console.error('Error in mockPool query:', err);
      throw err;
    }
  },

  async execute(sql, params = []) {
    return this.query(sql, params);
  }
};

const delegatePool = {
  memoryDb,
  nextIds,
  async query(sql, params = []) {
    if (!realPool && !useMock) {
      try {
        realPool = mysql.createPool(poolConfig);
        // Test connection
        await realPool.query('SELECT 1');
        console.log('Successfully connected to the real MySQL database!');
      } catch (err) {
        console.warn('Could not connect to real MySQL database, falling back to IN-MEMORY database. Error:', err.message);
        useMock = true;
        realPool = null;
      }
    }

    if (useMock) {
      return mockPool.query(sql, params);
    } else {
      return realPool.query(sql, params);
    }
  },

  async execute(sql, params = []) {
    return this.query(sql, params);
  }
};

module.exports = delegatePool;
