const mysql = require('mysql2/promise');

function getSSLConfig() {
  if (process.env.DB_SSL === 'false') {
    return false;
  }
  const ssl = {
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true'
  };
  if (process.env.DB_SSL_CA) {
    ssl.ca = process.env.DB_SSL_CA;
  }
  if (process.env.DB_SSL_CERT) {
    ssl.cert = process.env.DB_SSL_CERT;
  }
  if (process.env.DB_SSL_KEY) {
    ssl.key = process.env.DB_SSL_KEY;
  }
  return ssl;
}

const sslConfig = getSSLConfig();

const poolConfig = {
  host: process.env.DB_HOST || 'db',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'your_root_password',
  database: process.env.DB_NAME || 'your_database_name',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

if (sslConfig) {
  poolConfig.ssl = sslConfig;
}

let realPool = null;
let useMock = process.env.DB_HOST === 'force_mock_db';

// In-memory database representation
const memoryDb = {
  Users: [],
  Businesses: [],
  BusinessLocations: [],
  OHProviders: [],
  OHProviderLocations: [],
  OHProviderServices: [],
  Referrals: [],
  ReferralMatches: [],
  UserPasskeys: []
};

const nextIds = {
  Users: 1,
  Businesses: 1,
  BusinessLocations: 1,
  OHProviders: 1,
  OHProviderLocations: 1,
  OHProviderServices: 1,
  Referrals: 1,
  ReferralMatches: 1,
  UserPasskeys: 1
};

const mockPool = {
  async query(sql, params = []) {
    const normalizedSql = sql.trim().replace(/\s+/g, ' ').toLowerCase();

    try {
      // 1. SELECT * FROM Users WHERE email = ?
      if (normalizedSql.includes('select') && normalizedSql.includes('from users where email =')) {
        const email = params[0];
        const results = memoryDb.Users.filter(u => u.email === email);
        return [results];
      }

      // SELECT from Users where id = ?
      if (normalizedSql.includes('select') && normalizedSql.includes('from users where id =')) {
        const id = params[0];
        const results = memoryDb.Users.filter(u => String(u.id) === String(id)).map(u => ({
          id: u.id,
          email: u.email,
          user_type: u.user_type || u.userType,
          userType: u.user_type || u.userType,
          created_at: u.created_at
        }));
        return [results];
      }

      // UserPasskeys handlers
      if (normalizedSql.startsWith('insert into userpasskeys')) {
        const [user_id, credential_id, public_key, counter, transports, device_name] = params;
        const id = nextIds.UserPasskeys++;
        const newPk = {
          id,
          user_id,
          credential_id,
          public_key,
          counter: counter || 0,
          transports: transports || '',
          device_name: device_name || 'Security Key / Biometrics',
          created_at: new Date().toISOString()
        };
        memoryDb.UserPasskeys.push(newPk);
        return [{ insertId: id }];
      }

      if (normalizedSql.includes('select') && normalizedSql.includes('from userpasskeys where credential_id =')) {
        const credId = params[0];
        const results = memoryDb.UserPasskeys.filter(pk => pk.credential_id === credId);
        return [results];
      }

      if (normalizedSql.includes('select') && normalizedSql.includes('from userpasskeys where user_id =')) {
        const userId = params[0];
        const results = memoryDb.UserPasskeys.filter(pk => String(pk.user_id) === String(userId));
        return [results];
      }

      if (normalizedSql.includes('select') && normalizedSql.includes('from userpasskeys')) {
        return [memoryDb.UserPasskeys];
      }

      if (normalizedSql.startsWith('update userpasskeys set counter =')) {
        const [counter, id] = params;
        const pk = memoryDb.UserPasskeys.find(p => String(p.id) === String(id));
        if (pk) {
          pk.counter = counter;
        }
        return [{ affectedRows: pk ? 1 : 0 }];
      }

      if (normalizedSql.startsWith('delete from userpasskeys where id =')) {
        const [id, userId] = params;
        const initialLen = memoryDb.UserPasskeys.length;
        memoryDb.UserPasskeys = memoryDb.UserPasskeys.filter(
          p => !(String(p.id) === String(id) && (!userId || String(p.user_id) === String(userId)))
        );
        return [{ affectedRows: initialLen - memoryDb.UserPasskeys.length }];
      }

      // 2. INSERT INTO Users
      if (normalizedSql.startsWith('insert into users')) {
        const [email, password, user_type] = params;
        const id = nextIds.Users++;
        const newUser = { id, email, password, user_type, created_at: new Date() };
        memoryDb.Users.push(newUser);
        return [{ insertId: id }];
      }

      // 3. INSERT INTO Businesses
      if (normalizedSql.startsWith('insert into businesses')) {
        const [user_id, company_name, contact_person, phone] = params;
        const id = nextIds.Businesses++;
        const newBiz = { id, user_id, company_name, contact_person, phone };
        memoryDb.Businesses.push(newBiz);
        return [{ insertId: id }];
      }

      // 4. SELECT FROM Businesses WHERE user_id = ?
      if (normalizedSql.includes('select') && normalizedSql.includes('from businesses where user_id')) {
        const userId = params[0];
        const results = memoryDb.Businesses.filter(b => b.user_id === userId);
        return [results];
      }

      // 5. INSERT INTO BusinessLocations
      if (normalizedSql.startsWith('insert into businesslocations')) {
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

      // SELECT * FROM BusinessLocations WHERE business_id = ?
      if (normalizedSql.includes('select * from businesslocations where business_id')) {
        const businessId = params[0];
        const results = memoryDb.BusinessLocations.filter(loc => String(loc.business_id) === String(businessId));
        return [results];
      }

      // UPDATE BusinessLocations
      if (normalizedSql.startsWith('update businesslocations set')) {
        const [address, city, state, country, postal_code, employee_count, latitude, longitude, id, business_id] = params;
        const loc = memoryDb.BusinessLocations.find(l => String(l.id) === String(id) && (!business_id || String(l.business_id) === String(business_id)));
        if (loc) {
          loc.address = address;
          loc.city = city;
          loc.state = state;
          loc.country = country;
          loc.postal_code = postal_code;
          loc.employee_count = employee_count;
          if (latitude !== null && latitude !== undefined) loc.latitude = latitude;
          if (longitude !== null && longitude !== undefined) loc.longitude = longitude;
        }
        return [{ affectedRows: loc ? 1 : 0 }];
      }

      // DELETE FROM BusinessLocations
      if (normalizedSql.startsWith('delete from businesslocations')) {
        const id = params[0];
        memoryDb.BusinessLocations = memoryDb.BusinessLocations.filter(loc => String(loc.id) !== String(id));
        return [{ affectedRows: 1 }];
      }

      // 6. INSERT INTO OHProviders
      if (normalizedSql.startsWith('insert into ohproviders ') || normalizedSql.startsWith('insert into ohproviders(')) {
        const [user_id, company_name, contact_person, phone] = params;
        const id = nextIds.OHProviders++;
        const newProv = { id, user_id, company_name, contact_person, phone, is_subscribed: false, subscription_expiry: null };
        memoryDb.OHProviders.push(newProv);
        return [{ insertId: id }];
      }

      // 7. SELECT FROM OHProviders WHERE user_id = ?
      if (normalizedSql.includes('from ohproviders where user_id =') || normalizedSql.includes('from ohproviders where user_id=')) {
        const userId = params[0];
        const results = memoryDb.OHProviders.filter(p => String(p.user_id) === String(userId));
        return [results];
      }

      // 8. INSERT INTO OHProviderLocations
      if (normalizedSql.startsWith('insert into ohproviderlocations')) {
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
      if (normalizedSql.startsWith('insert into ohproviderservices')) {
        const id = nextIds.OHProviderServices++;
        let provider_id, location_id, service_type;
        if (params.length === 3) {
          [provider_id, location_id, service_type] = params;
        } else {
          [provider_id, service_type] = params;
          location_id = null;
        }
        const newServ = { id, provider_id, location_id, service_type };
        memoryDb.OHProviderServices.push(newServ);
        return [{ insertId: id }];
      }

      // SELECT * FROM OHProviderLocations WHERE provider_id = ?
      if (normalizedSql.includes('select * from ohproviderlocations where provider_id')) {
        const providerId = params[0];
        const results = memoryDb.OHProviderLocations.filter(loc => String(loc.provider_id) === String(providerId));
        return [results];
      }

      // SELECT * FROM OHProviderServices WHERE provider_id = ?
      if (normalizedSql.includes('select * from ohproviderservices where provider_id')) {
        const providerId = params[0];
        const results = memoryDb.OHProviderServices.filter(s => String(s.provider_id) === String(providerId));
        return [results];
      }

      // DELETE FROM OHProviderLocations
      if (normalizedSql.startsWith('delete from ohproviderlocations')) {
        const id = params[0];
        memoryDb.OHProviderLocations = memoryDb.OHProviderLocations.filter(loc => String(loc.id) !== String(id));
        return [{ affectedRows: 1 }];
      }

      // DELETE FROM OHProviderServices
      if (normalizedSql.startsWith('delete from ohproviderservices')) {
        const locId = params[0];
        memoryDb.OHProviderServices = memoryDb.OHProviderServices.filter(s => String(s.location_id) !== String(locId));
        return [{ affectedRows: 1 }];
      }

      // 10. INSERT INTO Referrals
      if (normalizedSql.startsWith('insert into referrals')) {
        let business_id, business_location_id, service_type, employee_count, contact_name, contact_email, contact_phone, notes, status;
        if (params.length === 9) {
          [business_id, business_location_id, service_type, employee_count, contact_name, contact_email, contact_phone, notes, status] = params;
        } else if (params.length === 8) {
          [business_id, business_location_id, service_type, contact_name, contact_email, contact_phone, notes, status] = params;
          employee_count = 1;
        } else if (params.length === 4) {
          [business_id, business_location_id, service_type, status] = params;
          employee_count = 1;
          contact_name = null;
          contact_email = null;
          contact_phone = null;
          notes = null;
        } else {
          [business_id, business_location_id, service_type] = params;
          employee_count = 1;
          status = 'pending';
        }
        const id = nextIds.Referrals++;
        const newRef = { 
          id, 
          business_id, 
          business_location_id, 
          service_type, 
          employee_count: parseInt(employee_count, 10) || 1,
          contact_name: contact_name || '', 
          contact_email: contact_email || '', 
          contact_phone: contact_phone || '', 
          notes: notes || '', 
          status: status || 'pending', 
          created_at: new Date() 
        };
        memoryDb.Referrals.push(newRef);
        return [{ insertId: id }];
      }

      // 11. SELECT * FROM BusinessLocations WHERE id = ?
      if (normalizedSql.includes('select * from businesslocations where id =')) {
        const id = params[0];
        const results = memoryDb.BusinessLocations.filter(loc => loc.id === id);
        return [results];
      }

      // 12. JOIN query for OHProviderLocations and Providers
      if (
        normalizedSql.includes('from ohproviderlocations opl join ohproviders') ||
        normalizedSql.includes('from ohproviderlocations opl')
      ) {
        if (params.length > 0) {
          const serviceType = params[0];
          const matchingServices = memoryDb.OHProviderServices.filter(s => s.service_type === serviceType);
          const results = [];
          for (const s of matchingServices) {
            const locations = s.location_id 
              ? memoryDb.OHProviderLocations.filter(loc => String(loc.id) === String(s.location_id))
              : memoryDb.OHProviderLocations.filter(loc => String(loc.provider_id) === String(s.provider_id));

            const provider = memoryDb.OHProviders.find(p => String(p.id) === String(s.provider_id));
            for (const loc of locations) {
              if (!results.some(r => r.location_id === loc.id && r.provider_id === loc.provider_id)) {
                results.push({
                  location_id: loc.id,
                  provider_id: loc.provider_id,
                  latitude: loc.latitude,
                  longitude: loc.longitude,
                  coverage_radius: loc.coverage_radius,
                  company_name: provider ? provider.company_name : '',
                  contact_person: provider ? provider.contact_person : '',
                  phone: provider ? provider.phone : '',
                  is_subscribed: provider ? provider.is_subscribed : false
                });
              }
            }
          }
          return [results];
        }

        // When no params, return all provider locations with provider details
        const results = memoryDb.OHProviderLocations.map(loc => {
          const provider = memoryDb.OHProviders.find(p => String(p.id) === String(loc.provider_id));
          return {
            location_id: loc.id,
            provider_id: loc.provider_id,
            latitude: loc.latitude,
            longitude: loc.longitude,
            coverage_radius: loc.coverage_radius,
            company_name: provider ? provider.company_name : '',
            contact_person: provider ? provider.contact_person : '',
            phone: provider ? provider.phone : '',
            is_subscribed: provider ? provider.is_subscribed : false
          };
        });
        return [results];
      }

      // SELECT all from OHProviderServices
      if (normalizedSql.includes('from ohproviderservices') && !normalizedSql.includes('where')) {
        return [memoryDb.OHProviderServices];
      }

      // 13. UPDATE Referrals
      if (normalizedSql.startsWith('update referrals set')) {
        if (normalizedSql.includes('employee_count')) {
          const [business_location_id, service_type, employee_count, contact_name, contact_email, contact_phone, notes, status, id] = params;
          const ref = memoryDb.Referrals.find(r => String(r.id) === String(id));
          if (ref) {
            ref.business_location_id = business_location_id;
            ref.service_type = service_type;
            ref.employee_count = parseInt(employee_count, 10) || 1;
            ref.contact_name = contact_name;
            ref.contact_email = contact_email;
            ref.contact_phone = contact_phone;
            ref.notes = notes;
            ref.status = status;
          }
          return [{ affectedRows: ref ? 1 : 0 }];
        }
        if (normalizedSql.includes('contact_name') || normalizedSql.includes('notes')) {
          const [business_location_id, service_type, contact_name, contact_email, contact_phone, notes, status, id] = params;
          const ref = memoryDb.Referrals.find(r => String(r.id) === String(id));
          if (ref) {
            ref.business_location_id = business_location_id;
            ref.service_type = service_type;
            ref.contact_name = contact_name;
            ref.contact_email = contact_email;
            ref.contact_phone = contact_phone;
            ref.notes = notes;
            ref.status = status;
          }
          return [{ affectedRows: ref ? 1 : 0 }];
        }
        if (normalizedSql.includes('business_location_id') && normalizedSql.includes('service_type')) {
          const [business_location_id, service_type, status, id] = params;
          const ref = memoryDb.Referrals.find(r => String(r.id) === String(id));
          if (ref) {
            ref.business_location_id = business_location_id;
            ref.service_type = service_type;
            ref.status = status;
          }
          return [{ affectedRows: ref ? 1 : 0 }];
        }
        const [status, id] = params;
        const ref = memoryDb.Referrals.find(r => String(r.id) === String(id));
        if (ref) {
          ref.status = status;
        }
        return [{ affectedRows: ref ? 1 : 0 }];
      }

      // DELETE FROM Referrals
      if (normalizedSql.startsWith('delete from referrals')) {
        const id = params[0];
        memoryDb.Referrals = memoryDb.Referrals.filter(r => String(r.id) !== String(id));
        memoryDb.ReferralMatches = memoryDb.ReferralMatches.filter(m => String(m.referral_id) !== String(id));
        return [{ affectedRows: 1 }];
      }

      // DELETE FROM ReferralMatches
      if (normalizedSql.startsWith('delete from referralmatches')) {
        const referralId = params[0];
        memoryDb.ReferralMatches = memoryDb.ReferralMatches.filter(m => String(m.referral_id) !== String(referralId));
        return [{ affectedRows: 1 }];
      }

      // UPDATE OHProviders
      if (normalizedSql.startsWith('update ohproviders set')) {
        if (normalizedSql.includes('is_subscribed')) {
          const [is_subscribed, subscription_expiry, id] = params;
          const prov = memoryDb.OHProviders.find(p => String(p.id) === String(id));
          if (prov) {
            prov.is_subscribed = Boolean(is_subscribed);
            prov.subscription_expiry = subscription_expiry;
          }
          return [{ affectedRows: prov ? 1 : 0 }];
        }
        const [company_name, contact_person, phone, id] = params;
        const prov = memoryDb.OHProviders.find(p => String(p.id) === String(id));
        if (prov) {
          prov.company_name = company_name;
          prov.contact_person = contact_person;
          prov.phone = phone;
        }
        return [{ affectedRows: prov ? 1 : 0 }];
      }

      // UPDATE Businesses
      if (normalizedSql.startsWith('update businesses set')) {
        const [company_name, contact_person, phone, id] = params;
        const biz = memoryDb.Businesses.find(b => b.id === id);
        if (biz) {
          biz.company_name = company_name;
          biz.contact_person = contact_person;
          biz.phone = phone;
        }
        return [{ affectedRows: biz ? 1 : 0 }];
      }

      // 14. INSERT INTO ReferralMatches
      if (normalizedSql.startsWith('insert into referralmatches')) {
        const [referral_id, provider_id, status] = params;
        const id = nextIds.ReferralMatches++;
        const newMatch = { id, referral_id, provider_id, status: status || 'pending', created_at: new Date() };
        memoryDb.ReferralMatches.push(newMatch);
        return [{ insertId: id }];
      }

      // 15. SELECT Referrals for Business
      if (
        normalizedSql.includes('where r.business_id =') ||
        normalizedSql.includes('select * from referrals where business_id =')
      ) {
        const businessId = params[0];
        const results = memoryDb.Referrals
          .filter(ref => String(ref.business_id) === String(businessId))
          .map(ref => {
            const loc = memoryDb.BusinessLocations.find(l => String(l.id) === String(ref.business_location_id));
            const matches = memoryDb.ReferralMatches.filter(m => String(m.referral_id) === String(ref.id));
            const selectedMatches = matches.filter(m => m.status === 'selected' || m.status === 'accepted');
            const selected_providers = selectedMatches.map(m => {
              const op = memoryDb.OHProviders.find(p => String(p.id) === String(m.provider_id));
              const u = op ? memoryDb.Users.find(user => String(user.id) === String(op.user_id)) : null;
              return {
                provider_id: m.provider_id,
                company_name: op ? op.company_name : 'Provider Clinic',
                contact_person: op ? op.contact_person : 'Clinician',
                phone: op ? op.phone : '',
                email: u ? u.email : ''
              };
            });
            const selected_provider = selected_providers.length > 0 ? selected_providers[0] : null;
            const provider_name = selected_providers.length > 0
              ? selected_providers.map(p => p.company_name).join(', ')
              : null;
            
            const interested_providers = matches.map(m => {
              const op = memoryDb.OHProviders.find(p => String(p.id) === String(m.provider_id));
              const u = op ? memoryDb.Users.find(user => String(user.id) === String(op.user_id)) : null;
              return {
                match_id: m.id,
                provider_id: m.provider_id,
                company_name: op ? op.company_name : 'Provider Clinic',
                contact_person: op ? op.contact_person : 'Clinician',
                phone: op ? op.phone : '',
                email: u ? u.email : '',
                status: m.status,
                distance: 2.06
              };
            });

            return {
              ...ref,
              location_address: loc ? loc.address : '',
              location_city: loc ? loc.city : '',
              location_postcode: loc ? loc.postal_code : '',
              provider_name,
              selected_provider,
              selected_providers,
              interested_providers
            };
          });
        return [results];
      }

      // 16. SELECT * FROM Referrals WHERE id = ?
      if (normalizedSql.includes('select * from referrals where id =')) {
        const id = params[0];
        const results = memoryDb.Referrals.filter(ref => String(ref.id) === String(id));
        return [results];
      }

      // SELECT * FROM Referrals WHERE status = ?
      if (normalizedSql.includes('select * from referrals where status =')) {
        const status = params.length > 0 ? params[0] : (normalizedSql.includes("'pending'") ? 'pending' : (normalizedSql.includes("'matched'") ? 'matched' : ''));
        const results = memoryDb.Referrals.filter(ref => ref.status === status);
        return [results];
      }

      // SELECT * FROM Referrals (all)
      if (normalizedSql.includes('select * from referrals') && !normalizedSql.includes('where')) {
        return [memoryDb.Referrals];
      }

      // UPDATE ReferralMatches
      if (normalizedSql.startsWith('update referralmatches set')) {
        if (normalizedSql.includes('where id =')) {
          const [status, id] = params;
          const match = memoryDb.ReferralMatches.find(m => String(m.id) === String(id));
          if (match) {
            match.status = status;
          }
          return [{ affectedRows: match ? 1 : 0 }];
        }
        if (normalizedSql.includes('where referral_id =') && normalizedSql.includes('and provider_id !=')) {
          const [status, referral_id, provider_id] = params;
          memoryDb.ReferralMatches.forEach(m => {
            if (String(m.referral_id) === String(referral_id) && String(m.provider_id) !== String(provider_id)) {
              m.status = status;
            }
          });
          return [{ affectedRows: 1 }];
        }
        if (normalizedSql.includes('where referral_id =') && normalizedSql.includes('and provider_id =')) {
          const [status, referral_id, provider_id] = params;
          const match = memoryDb.ReferralMatches.find(m => String(m.referral_id) === String(referral_id) && String(m.provider_id) === String(provider_id));
          if (match) {
            match.status = status;
          }
          return [{ affectedRows: match ? 1 : 0 }];
        }
        if (normalizedSql.includes('where referral_id =')) {
          const [provider_id, status, referral_id] = params;
          const match = memoryDb.ReferralMatches.find(m => String(m.referral_id) === String(referral_id));
          if (match) {
            match.provider_id = provider_id;
            match.status = status;
          }
          return [{ affectedRows: match ? 1 : 0 }];
        }
      }

      // 19. SELECT * FROM ReferralMatches WHERE referral_id = ? AND provider_id = ?
      if (normalizedSql.includes('select * from referralmatches where referral_id =') && normalizedSql.includes('provider_id =')) {
        const [referral_id, provider_id] = params;
        const results = memoryDb.ReferralMatches.filter(m => String(m.referral_id) === String(referral_id) && String(m.provider_id) === String(provider_id));
        return [results];
      }

      // 17. SELECT * FROM ReferralMatches WHERE referral_id = ?
      if (
        normalizedSql.includes('from referralmatches rm join ohproviders op') ||
        (normalizedSql.includes('from referralmatches') && normalizedSql.includes('join ohproviders'))
      ) {
        const referralId = params[0];
        const matches = memoryDb.ReferralMatches.filter(m => String(m.referral_id) === String(referralId));
        const results = matches.map(m => {
          const prov = memoryDb.OHProviders.find(p => String(p.id) === String(m.provider_id));
          const user = prov ? memoryDb.Users.find(u => String(u.id) === String(prov.user_id)) : null;
          return {
            match_id: m.id,
            match_status: m.status,
            match_created_at: m.created_at,
            provider_id: m.provider_id,
            company_name: prov ? prov.company_name : 'Apex Clinic',
            contact_person: prov ? prov.contact_person : 'Clinician',
            phone: prov ? prov.phone : '020 7123 4567',
            provider_email: user ? user.email : 'provider@apexcorp.co.uk'
          };
        });
        return [results];
      }

      if (normalizedSql.includes('select * from referralmatches where referral_id =')) {
        const referralId = params[0];
        const results = memoryDb.ReferralMatches.filter(m => String(m.referral_id) === String(referralId));
        return [results];
      }

      // 20. SELECT * FROM OHProviders WHERE id = ?
      if (normalizedSql.includes('from ohproviders where id =') || normalizedSql.includes('from ohproviders where id=')) {
        const id = params[0];
        const results = memoryDb.OHProviders.filter(p => String(p.id) === String(id));
        return [results];
      }

      if (normalizedSql.includes('from ohproviders') && !normalizedSql.includes('where')) {
        return [memoryDb.OHProviders];
      }

      // 21. JOIN for listReferrals for provider
      if (normalizedSql.includes('from referrals r join referralmatches rm on r.id = rm.referral_id')) {
        const providerId = params[0];
        const results = [];
        const matches = memoryDb.ReferralMatches.filter(m => String(m.provider_id) === String(providerId));
        for (const m of matches) {
          const ref = memoryDb.Referrals.find(r => String(r.id) === String(m.referral_id));
          if (ref) {
            const biz = memoryDb.Businesses.find(b => String(b.id) === String(ref.business_id));
            const bizLoc = memoryDb.BusinessLocations.find(l => String(l.id) === String(ref.business_location_id));
            
            // Mask contact details unless provider is chosen/selected by business
            const isSelected = m.status === 'selected' || m.status === 'accepted';
            results.push({
              ...ref,
              company_name: isSelected ? (biz ? biz.company_name : '') : null,
              contact_person: isSelected ? (ref.contact_name || (biz ? biz.contact_person : '')) : null,
              contact_name: isSelected ? (ref.contact_name || (biz ? biz.contact_person : '')) : null,
              contact_email: isSelected ? (ref.contact_email || '') : null,
              contact_phone: isSelected ? (ref.contact_phone || (biz ? biz.phone : '')) : null,
              notes: isSelected ? (ref.notes || '') : null,
              distance: 2.06,
              match_status: m.status,
              postal_code: bizLoc ? bizLoc.postal_code : ''
            });
          }
        }
        return [results];
      }

      // 22. UserPasskeys queries
      if (normalizedSql.includes('select * from userpasskeys where user_id =')) {
        const userId = params[0];
        const results = memoryDb.UserPasskeys.filter(p => String(p.user_id) === String(userId));
        return [results];
      }

      if (normalizedSql.includes('select * from userpasskeys where credential_id =')) {
        const credId = params[0];
        const results = memoryDb.UserPasskeys.filter(p => String(p.credential_id) === String(credId));
        return [results];
      }

      if (normalizedSql.startsWith('insert into userpasskeys')) {
        const [user_id, credential_id, public_key, counter, transports, device_name] = params;
        const id = nextIds.UserPasskeys++;
        const newPasskey = {
          id,
          user_id,
          credential_id,
          public_key,
          counter: counter || 0,
          transports: transports || 'internal',
          device_name: device_name || 'Passkey / Biometrics',
          created_at: new Date()
        };
        memoryDb.UserPasskeys.push(newPasskey);
        return [{ insertId: id }];
      }

      if (normalizedSql.includes('update userpasskeys set counter =')) {
        const [counter, credId] = params;
        const pk = memoryDb.UserPasskeys.find(p => String(p.credential_id) === String(credId));
        if (pk) pk.counter = counter;
        return [{ affectedRows: 1 }];
      }

      if (normalizedSql.includes('delete from userpasskeys where id =') && normalizedSql.includes('user_id =')) {
        const [id, userId] = params;
        const idx = memoryDb.UserPasskeys.findIndex(p => String(p.id) === String(id) && String(p.user_id) === String(userId));
        if (idx !== -1) memoryDb.UserPasskeys.splice(idx, 1);
        return [{ affectedRows: 1 }];
      }

      if (normalizedSql.includes('from userpasskeys')) {
        return [memoryDb.UserPasskeys];
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

let schemaInitialized = false;

async function initSchema(p) {
  if (schemaInitialized) return;
  try {
    await p.query(`
      CREATE TABLE IF NOT EXISTS Users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        user_type ENUM('business', 'provider', 'admin') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await p.query(`
      CREATE TABLE IF NOT EXISTS Businesses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        company_name VARCHAR(255) NOT NULL,
        contact_person VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
      )
    `);

    await p.query(`
      CREATE TABLE IF NOT EXISTS BusinessLocations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        business_id INT NOT NULL,
        address VARCHAR(255) NOT NULL,
        city VARCHAR(100) NOT NULL,
        state VARCHAR(100),
        country VARCHAR(100) NOT NULL,
        postal_code VARCHAR(50),
        employee_count VARCHAR(50) NOT NULL,
        latitude DECIMAL(10, 8) NULL,
        longitude DECIMAL(11, 8) NULL,
        FOREIGN KEY (business_id) REFERENCES Businesses(id) ON DELETE CASCADE
      )
    `);

    await p.query(`
      CREATE TABLE IF NOT EXISTS OHProviders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        company_name VARCHAR(255) NOT NULL,
        contact_person VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        is_subscribed BOOLEAN DEFAULT FALSE,
        subscription_expiry DATE,
        FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
      )
    `);

    await p.query(`
      CREATE TABLE IF NOT EXISTS OHProviderLocations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        provider_id INT NOT NULL,
        address VARCHAR(255) NOT NULL,
        city VARCHAR(100) NOT NULL,
        state VARCHAR(100),
        country VARCHAR(100) NOT NULL,
        postal_code VARCHAR(50),
        coverage_radius INT NOT NULL DEFAULT 30,
        latitude DECIMAL(10, 8) NULL,
        longitude DECIMAL(11, 8) NULL,
        FOREIGN KEY (provider_id) REFERENCES OHProviders(id) ON DELETE CASCADE
      )
    `);

    await p.query(`
      CREATE TABLE IF NOT EXISTS OHProviderServices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        provider_id INT NOT NULL,
        location_id INT NULL,
        service_type VARCHAR(100) NOT NULL,
        FOREIGN KEY (provider_id) REFERENCES OHProviders(id) ON DELETE CASCADE
      )
    `);

    await p.query(`
      CREATE TABLE IF NOT EXISTS Referrals (
        id INT AUTO_INCREMENT PRIMARY KEY,
        business_id INT NOT NULL,
        business_location_id INT NOT NULL,
        service_type VARCHAR(255) NOT NULL,
        employee_count INT NOT NULL DEFAULT 1,
        contact_name VARCHAR(255) NULL,
        contact_email VARCHAR(255) NULL,
        contact_phone VARCHAR(50) NULL,
        notes TEXT NULL,
        status ENUM('pending', 'matched', 'completed') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (business_id) REFERENCES Businesses(id) ON DELETE CASCADE,
        FOREIGN KEY (business_location_id) REFERENCES BusinessLocations(id) ON DELETE CASCADE
      )
    `);

    // Ensure columns exist on existing table
    try { await p.query('ALTER TABLE Referrals ADD COLUMN employee_count INT NOT NULL DEFAULT 1'); } catch (e) {}
    try { await p.query('ALTER TABLE Referrals ADD COLUMN contact_name VARCHAR(255) NULL'); } catch (e) {}
    try { await p.query('ALTER TABLE Referrals ADD COLUMN contact_email VARCHAR(255) NULL'); } catch (e) {}
    try { await p.query('ALTER TABLE Referrals ADD COLUMN contact_phone VARCHAR(50) NULL'); } catch (e) {}
    try { await p.query('ALTER TABLE Referrals ADD COLUMN notes TEXT NULL'); } catch (e) {}

    await p.query(`
      CREATE TABLE IF NOT EXISTS ReferralMatches (
        id INT AUTO_INCREMENT PRIMARY KEY,
        referral_id INT NOT NULL,
        provider_id INT NOT NULL,
        status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (referral_id) REFERENCES Referrals(id) ON DELETE CASCADE,
        FOREIGN KEY (provider_id) REFERENCES OHProviders(id) ON DELETE CASCADE
      )
    `);

    await p.query(`
      CREATE TABLE IF NOT EXISTS EmployeeNotifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_name VARCHAR(255),
        employee_email VARCHAR(255),
        company_name VARCHAR(255),
        manager_email VARCHAR(255),
        message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await p.query(`
      CREATE TABLE IF NOT EXISTS UserPasskeys (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        credential_id VARCHAR(500) NOT NULL UNIQUE,
        public_key TEXT NOT NULL,
        counter BIGINT NOT NULL DEFAULT 0,
        transports VARCHAR(255),
        device_name VARCHAR(255) DEFAULT 'Security Key / Biometrics',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
      )
    `);

    schemaInitialized = true;
    console.log('Verified database schema tables in MySQL successfully!');
  } catch (err) {
    console.error('Error ensuring schema in MySQL:', err.message);
  }
}

const delegatePool = {
  get useMock() {
    return useMock;
  },
  set useMock(val) {
    useMock = val;
  },
  memoryDb,
  nextIds,
  async query(sql, params = []) {
    if (!realPool && !useMock) {
      try {
        realPool = mysql.createPool(poolConfig);
        // Test connection
        await realPool.query('SELECT 1');
        console.log('Successfully connected to the real MySQL database!');
        await initSchema(realPool);
      } catch (err) {
        console.warn('Could not connect to real MySQL database, falling back to IN-MEMORY database. Error:', err.message);
        useMock = true;
        realPool = null;
      }
    }

    if (useMock) {
      return mockPool.query(sql, params);
    } else {
      if (!schemaInitialized && realPool) {
        await initSchema(realPool);
      }
      return realPool.query(sql, params);
    }
  },

  async execute(sql, params = []) {
    return this.query(sql, params);
  },
  poolConfig
};

module.exports = delegatePool;
