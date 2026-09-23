const { Pool: PgPool } = require('pg');
const mysql = require('mysql2/promise');

function isPostgresConfigured() {
  const url = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL || process.env.SUPABASE_DB_URL || '';
  return url.startsWith('postgres://') || url.startsWith('postgresql://');
}

function getDatabaseUrl() {
  return process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL || process.env.SUPABASE_DB_URL || '';
}

function getSSLConfig() {
  if (process.env.DB_SSL === 'false') {
    return false;
  }
  const ssl = {
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true'
  };
  if (process.env.DB_SSL_CA) ssl.ca = process.env.DB_SSL_CA;
  if (process.env.DB_SSL_CERT) ssl.cert = process.env.DB_SSL_CERT;
  if (process.env.DB_SSL_KEY) ssl.key = process.env.DB_SSL_KEY;
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
  queueLimit: 0,
  connectTimeout: 2000
};

if (sslConfig) {
  poolConfig.ssl = sslConfig;
}

let realPool = null;
let pgPool = null;
let useMock = process.env.DB_HOST === 'force_mock_db';
let dbEngineType = 'in-memory'; // 'supabase', 'mysql', 'in-memory'
let schemaInitialized = false;

// Convert MySQL SQL with '?' parameters to PostgreSQL '$1, $2...' format
function convertSqlForPostgres(sql) {
  let paramIndex = 1;
  let converted = sql.replace(/\?/g, () => '$' + (paramIndex++));
  const trimmed = converted.trim();
  if (/^insert\s+into/i.test(trimmed) && !/returning/i.test(trimmed)) {
    converted = trimmed + ' RETURNING id';
  }
  return converted;
}

// In-memory database representation
const memoryDb = {
  Users: [
    {
      id: 1,
      email: 'admin@ohreferral.co.uk',
      password: '$2a$10$WoRMgichwljOSCfJ8E4rFOhdKsPxvzeJhd9JV/QRQ9/53AwGJhIIi',
      user_type: 'admin',
      userType: 'admin',
      name: 'Super Administrator',
      created_at: new Date().toISOString()
    }
  ],
  Businesses: [],
  BusinessLocations: [],
  OHProviders: [],
  OHProviderLocations: [],
  OHProviderServices: [],
  Referrals: [],
  ReferralMatches: [],
  UserPasskeys: [],
  ContactMessages: []
};

const nextIds = {
  Users: 2,
  Businesses: 1,
  BusinessLocations: 1,
  OHProviders: 1,
  OHProviderLocations: 1,
  OHProviderServices: 1,
  Referrals: 1,
  ReferralMatches: 1,
  UserPasskeys: 1,
  ContactMessages: 1
};

// Calculate spatial distance between two coordinate pairs using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3959; // Earth radius in miles
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const mockPool = {
  async query(sql, params = []) {
    const normalizedSql = sql.trim().replace(/\s+/g, ' ').toLowerCase();

    try {
      // 1. SELECT * FROM Users WHERE email = ?
      if (normalizedSql.includes('select') && normalizedSql.includes('from users where') && (normalizedSql.includes('email =') || normalizedSql.includes('email) ='))) {
        const email = String(params[0]).trim().toLowerCase();
        const results = memoryDb.Users.filter(u => String(u.email).trim().toLowerCase() === email).map(u => ({
          ...u,
          userType: u.user_type || u.userType,
          user_type: u.user_type || u.userType
        }));
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
        const credId = String(params[0] || '').trim();
        const results = memoryDb.UserPasskeys.filter(pk => 
          String(pk.credential_id || '').trim() === credId ||
          Buffer.from(String(pk.credential_id || ''), 'base64url').toString() === credId ||
          pk.credential_id === Buffer.from(credId).toString('base64url')
        );
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
        const [id, user_id] = params;
        memoryDb.UserPasskeys = memoryDb.UserPasskeys.filter(p => !(String(p.id) === String(id) && String(p.user_id) === String(user_id)));
        return [{ affectedRows: 1 }];
      }

      // 2. INSERT INTO Users
      if (normalizedSql.startsWith('insert into users')) {
        const [email, password, user_type] = params;
        const id = nextIds.Users++;
        const newUser = {
          id,
          email,
          password,
          user_type,
          userType: user_type,
          created_at: new Date().toISOString()
        };
        memoryDb.Users.push(newUser);
        return [{ insertId: id }];
      }

      // UPDATE Users
      if (normalizedSql.startsWith('update users set')) {
        const id = params[params.length - 1];
        const user = memoryDb.Users.find(u => String(u.id) === String(id));
        if (user) {
          if (params.length === 2 && normalizedSql.includes('user_type = ?')) {
            user.user_type = params[0];
            user.userType = params[0];
          } else if (params.length === 3 && normalizedSql.includes('password = ?')) {
            user.password = params[0];
            user.user_type = params[1];
            user.userType = params[1];
          }
        }
        return [{ affectedRows: user ? 1 : 0 }];
      }

      // 3. Businesses handlers
      if (/^insert\s+into\s+businesses\b/i.test(normalizedSql)) {
        const [user_id, company_name, contact_person, phone] = params;
        const id = nextIds.Businesses++;
        const newBiz = { 
          id, 
          user_id: Number(user_id), 
          company_name: company_name || '', 
          contact_person: contact_person || '', 
          phone: phone || '', 
          created_at: new Date().toISOString() 
        };
        memoryDb.Businesses.push(newBiz);
        return [{ insertId: id }];
      }

      if (/^update\s+businesses\b/i.test(normalizedSql)) {
        const [company_name, contact_person, phone, id] = params;
        const biz = memoryDb.Businesses.find(b => String(b.id) === String(id));
        if (biz) {
          biz.company_name = company_name;
          biz.contact_person = contact_person;
          biz.phone = phone;
        }
        return [{ affectedRows: biz ? 1 : 0 }];
      }

      if (/\bfrom\s+businesses\b/i.test(normalizedSql) && normalizedSql.includes('user_id =')) {
        const userId = params[0];
        const results = memoryDb.Businesses.filter(b => String(b.user_id) === String(userId));
        return [results];
      }

      if (/\bfrom\s+businesses\b/i.test(normalizedSql) && normalizedSql.includes('where id =')) {
        const id = params[0];
        const results = memoryDb.Businesses.filter(b => String(b.id) === String(id));
        return [results];
      }

      if (/\bfrom\s+businesses\b/i.test(normalizedSql)) {
        return [memoryDb.Businesses];
      }

      // 4. OHProviders handlers
      if (/^insert\s+into\s+ohproviders\b/i.test(normalizedSql)) {
        const [user_id, company_name, contact_person, phone, is_subscribed] = params;
        const id = nextIds.OHProviders++;
        const newProv = { 
          id, 
          user_id: Number(user_id), 
          company_name: company_name || '', 
          contact_person: contact_person || '', 
          phone: phone || '', 
          is_subscribed: Boolean(is_subscribed),
          subscription_expiry: null,
          created_at: new Date().toISOString() 
        };
        memoryDb.OHProviders.push(newProv);
        return [{ insertId: id }];
      }

      if (/^update\s+ohproviders\b/i.test(normalizedSql) && normalizedSql.includes('company_name =')) {
        const [company_name, contact_person, phone, id] = params;
        const prov = memoryDb.OHProviders.find(p => String(p.id) === String(id));
        if (prov) {
          prov.company_name = company_name;
          prov.contact_person = contact_person;
          prov.phone = phone;
        }
        return [{ affectedRows: prov ? 1 : 0 }];
      }

      if (/^update\s+ohproviders\b/i.test(normalizedSql) && normalizedSql.includes('is_subscribed =')) {
        const [is_subscribed, subscription_expiry, id] = params;
        const prov = memoryDb.OHProviders.find(p => String(p.id) === String(id));
        if (prov) {
          prov.is_subscribed = Boolean(is_subscribed);
          prov.subscription_expiry = subscription_expiry;
        }
        return [{ affectedRows: prov ? 1 : 0 }];
      }

      if (/\bfrom\s+ohproviders\b/i.test(normalizedSql) && normalizedSql.includes('user_id =')) {
        const userId = params[0];
        const results = memoryDb.OHProviders.filter(p => String(p.user_id) === String(userId));
        return [results];
      }

      if (/\bfrom\s+ohproviders\b/i.test(normalizedSql) && normalizedSql.includes('where id =')) {
        const id = params[0];
        const results = memoryDb.OHProviders.filter(p => String(p.id) === String(id));
        return [results];
      }

      if (/\bfrom\s+ohproviders\b/i.test(normalizedSql)) {
        return [memoryDb.OHProviders];
      }

      // 5. BusinessLocations handlers
      if (/^insert\s+into\s+businesslocations\b/i.test(normalizedSql)) {
        const [business_id, address, city, state, country, postal_code, employee_count, latitude, longitude] = params;
        const id = nextIds.BusinessLocations++;
        const newLoc = { 
          id, 
          business_id: Number(business_id), 
          address: address || '', 
          city: city || '', 
          state: state || '', 
          country: country || 'United Kingdom', 
          postal_code: postal_code || '', 
          employee_count: employee_count || '11-50', 
          latitude: latitude !== undefined && latitude !== null ? Number(latitude) : null, 
          longitude: longitude !== undefined && longitude !== null ? Number(longitude) : null, 
          created_at: new Date().toISOString() 
        };
        memoryDb.BusinessLocations.push(newLoc);
        return [{ insertId: id }];
      }

      if (/^update\s+businesslocations\b/i.test(normalizedSql) && normalizedSql.includes('address =')) {
        const [address, city, state, country, postal_code, employee_count, latitude, longitude, id, business_id] = params;
        const loc = memoryDb.BusinessLocations.find(l => String(l.id) === String(id) && (!business_id || String(l.business_id) === String(business_id)));
        if (loc) {
          loc.address = address;
          loc.city = city;
          loc.state = state;
          loc.country = country;
          loc.postal_code = postal_code;
          loc.employee_count = employee_count;
          loc.latitude = latitude !== undefined && latitude !== null ? Number(latitude) : null;
          loc.longitude = longitude !== undefined && longitude !== null ? Number(longitude) : null;
        }
        return [{ affectedRows: loc ? 1 : 0 }];
      }

      if (/^update\s+businesslocations\b/i.test(normalizedSql) && normalizedSql.includes('latitude =')) {
        const [latitude, longitude, id] = params;
        const loc = memoryDb.BusinessLocations.find(l => String(l.id) === String(id));
        if (loc) {
          loc.latitude = latitude !== undefined && latitude !== null ? Number(latitude) : null;
          loc.longitude = longitude !== undefined && longitude !== null ? Number(longitude) : null;
        }
        return [{ affectedRows: loc ? 1 : 0 }];
      }

      if (/\bfrom\s+businesslocations\b/i.test(normalizedSql) && normalizedSql.includes('business_id =')) {
        const businessId = params[0];
        const results = memoryDb.BusinessLocations.filter(l => String(l.business_id) === String(businessId));
        return [results];
      }

      if (/\bfrom\s+businesslocations\b/i.test(normalizedSql) && normalizedSql.includes('where id =')) {
        const id = params[0];
        const results = memoryDb.BusinessLocations.filter(l => String(l.id) === String(id));
        return [results];
      }

      if (/\bfrom\s+businesslocations\b/i.test(normalizedSql)) {
        return [memoryDb.BusinessLocations];
      }

      if (/^delete\s+from\s+businesslocations\b/i.test(normalizedSql)) {
        const [id, business_id] = params;
        memoryDb.BusinessLocations = memoryDb.BusinessLocations.filter(l => !(String(l.id) === String(id) && String(l.business_id) === String(business_id)));
        return [{ affectedRows: 1 }];
      }

      // 6. OHProviderLocations handlers
      if (/^insert\s+into\s+ohproviderlocations\b/i.test(normalizedSql)) {
        const [provider_id, address, city, state, country, postal_code, coverage_radius, latitude, longitude] = params;
        const id = nextIds.OHProviderLocations++;
        const newLoc = { 
          id, 
          provider_id: Number(provider_id), 
          address: address || '', 
          city: city || '', 
          state: state || '', 
          country: country || 'United Kingdom', 
          postal_code: postal_code || '', 
          coverage_radius: coverage_radius !== undefined ? Number(coverage_radius) : 30, 
          latitude: latitude !== undefined && latitude !== null ? Number(latitude) : null, 
          longitude: longitude !== undefined && longitude !== null ? Number(longitude) : null, 
          created_at: new Date().toISOString() 
        };
        memoryDb.OHProviderLocations.push(newLoc);
        return [{ insertId: id }];
      }

      if (/\bfrom\s+ohproviderlocations\b/i.test(normalizedSql) && /\bjoin\s+ohproviders\b/i.test(normalizedSql)) {
        const results = memoryDb.OHProviderLocations.map(loc => {
          const prov = memoryDb.OHProviders.find(p => String(p.id) === String(loc.provider_id)) || {};
          return {
            location_id: loc.id,
            id: loc.id,
            provider_id: loc.provider_id,
            address: loc.address,
            city: loc.city,
            state: loc.state,
            country: loc.country,
            postal_code: loc.postal_code,
            coverage_radius: loc.coverage_radius,
            latitude: loc.latitude,
            longitude: loc.longitude,
            company_name: prov.company_name || 'OH Clinic',
            contact_person: prov.contact_person || 'Clinic Staff',
            phone: prov.phone || '',
            is_subscribed: prov.is_subscribed !== false
          };
        });
        return [results];
      }

      if (/\bfrom\s+ohproviderlocations\b/i.test(normalizedSql) && normalizedSql.includes('provider_id =')) {
        const providerId = params[0];
        const results = memoryDb.OHProviderLocations.filter(l => String(l.provider_id) === String(providerId));
        return [results];
      }

      if (/\bfrom\s+ohproviderlocations\b/i.test(normalizedSql) && normalizedSql.includes('where id =')) {
        const id = params[0];
        const results = memoryDb.OHProviderLocations.filter(l => String(l.id) === String(id));
        return [results];
      }

      if (/\bfrom\s+ohproviderlocations\b/i.test(normalizedSql)) {
        return [memoryDb.OHProviderLocations];
      }

      if (/^delete\s+from\s+ohproviderlocations\b/i.test(normalizedSql)) {
        const [id, provider_id] = params;
        memoryDb.OHProviderLocations = memoryDb.OHProviderLocations.filter(l => !(String(l.id) === String(id) && String(l.provider_id) === String(provider_id)));
        return [{ affectedRows: 1 }];
      }

      // 7. OHProviderServices handlers
      if (/^insert\s+into\s+ohproviderservices\b/i.test(normalizedSql)) {
        const [provider_id, location_id, service_type] = params;
        const id = nextIds.OHProviderServices++;
        const newSvc = { 
          id, 
          provider_id: Number(provider_id), 
          location_id: location_id ? Number(location_id) : null, 
          service_type, 
          created_at: new Date().toISOString() 
        };
        memoryDb.OHProviderServices.push(newSvc);
        return [{ insertId: id }];
      }

      if (/\bfrom\s+ohproviderservices\b/i.test(normalizedSql) && normalizedSql.includes('location_id =')) {
        const locationId = params[0];
        const results = memoryDb.OHProviderServices.filter(s => String(s.location_id) === String(locationId));
        return [results];
      }

      if (/\bfrom\s+ohproviderservices\b/i.test(normalizedSql) && normalizedSql.includes('provider_id =')) {
        const providerId = params[0];
        const results = memoryDb.OHProviderServices.filter(s => String(s.provider_id) === String(providerId));
        return [results];
      }

      if (/\bfrom\s+ohproviderservices\b/i.test(normalizedSql)) {
        return [memoryDb.OHProviderServices];
      }

      // 8. Referrals handlers
      if (/^insert\s+into\s+referrals\b/i.test(normalizedSql)) {
        const [business_id, business_location_id, service_type, employee_count, contact_name, contact_email, contact_phone, notes, status] = params;
        const id = nextIds.Referrals++;
        const newRef = {
          id,
          business_id: Number(business_id),
          business_location_id: Number(business_location_id),
          service_type,
          employee_count: employee_count || 1,
          contact_name: contact_name || '',
          contact_email: contact_email || '',
          contact_phone: contact_phone || '',
          notes: notes || '',
          status: status || 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        memoryDb.Referrals.push(newRef);
        return [{ insertId: id }];
      }

      if (/\bfrom\s+referrals\b/i.test(normalizedSql) && /\bjoin\s+referralmatches\b/i.test(normalizedSql)) {
        const providerId = params[0];
        const provMatches = memoryDb.ReferralMatches.filter(m => String(m.provider_id) === String(providerId));
        const results = provMatches.map(m => {
          const ref = memoryDb.Referrals.find(r => String(r.id) === String(m.referral_id)) || {};
          const biz = memoryDb.Businesses.find(b => String(b.id) === String(ref.business_id)) || {};
          const loc = memoryDb.BusinessLocations.find(l => String(l.id) === String(ref.business_location_id)) || {};
          return {
            ...ref,
            id: ref.id,
            company_name: biz.company_name || 'Business',
            contact_person: ref.contact_name || biz.contact_person || '',
            contact_name: ref.contact_name || '',
            contact_email: ref.contact_email || '',
            contact_phone: ref.contact_phone || biz.phone || '',
            notes: ref.notes || '',
            location_address: loc.address || '',
            location_city: loc.city || '',
            location_postal_code: loc.postal_code || '',
            match_status: m.status,
            status: ref.status,
            match_id: m.id,
            distance: 2.06
          };
        });
        return [results];
      }

      if (/\bfrom\s+referrals\b/i.test(normalizedSql) && normalizedSql.includes('where id =')) {
        const id = params[0];
        const results = memoryDb.Referrals.filter(r => String(r.id) === String(id));
        return [results];
      }

      if (/\bfrom\s+referrals\b/i.test(normalizedSql) && normalizedSql.includes('business_id =')) {
        const businessId = params[0];
        const results = memoryDb.Referrals.filter(r => String(r.business_id) === String(businessId));
        return [results];
      }

      if (/\bfrom\s+referrals\b/i.test(normalizedSql) && normalizedSql.includes('status =')) {
        const status = params[0] || (normalizedSql.includes("'pending'") ? 'pending' : 'matched');
        const results = memoryDb.Referrals.filter(r => r.status === status);
        return [results];
      }

      if (/\bfrom\s+referrals\b/i.test(normalizedSql)) {
        return [memoryDb.Referrals];
      }

      if (/^update\s+referrals\b/i.test(normalizedSql) && normalizedSql.includes('business_location_id')) {
        const [business_location_id, service_type, employee_count, contact_name, contact_email, contact_phone, notes, status, id] = params;
        const ref = memoryDb.Referrals.find(r => String(r.id) === String(id));
        if (ref) {
          ref.business_location_id = Number(business_location_id);
          ref.service_type = service_type;
          ref.employee_count = Number(employee_count);
          ref.contact_name = contact_name;
          ref.contact_email = contact_email;
          ref.contact_phone = contact_phone;
          ref.notes = notes;
          ref.status = status;
          ref.updated_at = new Date().toISOString();
        }
        return [{ affectedRows: ref ? 1 : 0 }];
      }

      if (/^update\s+referrals\s+set\s+status\s*=\s*\?\s*where\s+id\s*=\s*\?/i.test(normalizedSql)) {
        const [status, id] = params;
        const ref = memoryDb.Referrals.find(r => String(r.id) === String(id));
        if (ref) {
          ref.status = status;
          ref.updated_at = new Date().toISOString();
        }
        return [{ affectedRows: ref ? 1 : 0 }];
      }

      if (/^update\s+referrals\b/i.test(normalizedSql)) {
        const id = params[params.length - 1];
        const ref = memoryDb.Referrals.find(r => String(r.id) === String(id));
        if (ref) {
          ref.service_type = params[0];
          ref.employee_count = Number(params[1]) || ref.employee_count;
          ref.contact_name = params[2];
          ref.contact_email = params[3];
          ref.contact_phone = params[4];
          ref.notes = params[5];
          ref.status = params[6] || ref.status;
          ref.updated_at = new Date().toISOString();
        }
        return [{ affectedRows: ref ? 1 : 0 }];
      }

      if (/^delete\s+from\s+referrals\b/i.test(normalizedSql)) {
        const id = params[0];
        memoryDb.Referrals = memoryDb.Referrals.filter(r => String(r.id) !== String(id));
        return [{ affectedRows: 1 }];
      }

      // 9. ReferralMatches handlers
      if (/^insert\s+into\s+referralmatches\b/i.test(normalizedSql)) {
        const [referral_id, provider_id, status] = params;
        const id = nextIds.ReferralMatches++;
        const newMatch = { 
          id, 
          referral_id: Number(referral_id), 
          provider_id: Number(provider_id), 
          status: status || 'matched', 
          matched_at: new Date().toISOString() 
        };
        memoryDb.ReferralMatches.push(newMatch);
        return [{ insertId: id }];
      }

      if (/\bfrom\s+referralmatches\b/i.test(normalizedSql) && /\bjoin\s+ohproviders\b/i.test(normalizedSql)) {
        const referralId = params[0];
        const matches = memoryDb.ReferralMatches.filter(m => String(m.referral_id) === String(referralId));
        const results = matches.map(m => {
          const prov = memoryDb.OHProviders.find(p => String(p.id) === String(m.provider_id)) || {};
          const user = memoryDb.Users.find(u => String(u.id) === String(prov.user_id)) || {};
          return {
            match_id: m.id,
            id: m.id,
            match_status: m.status,
            status: m.status,
            match_created_at: m.matched_at || m.created_at,
            provider_id: m.provider_id,
            company_name: prov.company_name || 'OH Clinic',
            contact_person: prov.contact_person || 'Clinic Lead',
            phone: prov.phone || '',
            provider_email: user.email || ''
          };
        });
        return [results];
      }

      if (/\bfrom\s+referralmatches\b/i.test(normalizedSql) && normalizedSql.includes('referral_id =') && normalizedSql.includes('provider_id =')) {
        const [referralId, providerId] = params;
        const results = memoryDb.ReferralMatches.filter(m => String(m.referral_id) === String(referralId) && String(m.provider_id) === String(providerId));
        return [results];
      }

      if (/\bfrom\s+referralmatches\b/i.test(normalizedSql) && normalizedSql.includes('referral_id =')) {
        const referralId = params[0];
        const results = memoryDb.ReferralMatches.filter(m => String(m.referral_id) === String(referralId));
        return [results];
      }

      if (/\bfrom\s+referralmatches\b/i.test(normalizedSql) && normalizedSql.includes('provider_id =')) {
        const providerId = params[0];
        const results = memoryDb.ReferralMatches.filter(m => String(m.provider_id) === String(providerId));
        return [results];
      }

      if (/\bfrom\s+referralmatches\b/i.test(normalizedSql)) {
        return [memoryDb.ReferralMatches];
      }

      // 10. ContactMessages Handlers
      if (/^insert\s+into\s+contactmessages\b/i.test(normalizedSql)) {
        const [name, email, phone, subject, message] = params;
        const newMsg = {
          id: nextIds.ContactMessages++,
          name: name || '',
          email: email || '',
          phone: phone || '',
          subject: subject || '',
          message: message || '',
          created_at: new Date().toISOString()
        };
        memoryDb.ContactMessages.push(newMsg);
        return [{ insertId: newMsg.id, affectedRows: 1 }];
      }

      if (/\bfrom\s+contactmessages\b/i.test(normalizedSql)) {
        return [[...memoryDb.ContactMessages].reverse()];
      }

      if (/^update\s+referralmatches\b/i.test(normalizedSql) && normalizedSql.includes('status = ? where id =')) {
        const [status, id] = params;
        const match = memoryDb.ReferralMatches.find(m => String(m.id) === String(id));
        if (match) {
          match.status = status;
        }
        return [{ affectedRows: match ? 1 : 0 }];
      }

      if (/^update\s+referralmatches\b/i.test(normalizedSql)) {
        const [status, referral_id, provider_id] = params;
        const match = memoryDb.ReferralMatches.find(m => String(m.referral_id) === String(referral_id) && (!provider_id || String(m.provider_id) === String(provider_id)));
        if (match) {
          match.status = status;
        }
        return [{ affectedRows: match ? 1 : 0 }];
      }



      // Default catch-all
      console.log('Unhandled mock query:', sql, params);
      return [[]];
    } catch (err) {
      console.error('Mock pool error:', err);
      return [[]];
    }
  }
};

async function initPgSchema(client) {
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS Users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        user_type VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS Businesses (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES Users(id) ON DELETE CASCADE,
        company_name VARCHAR(255) NOT NULL,
        contact_person VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS BusinessLocations (
        id SERIAL PRIMARY KEY,
        business_id INT REFERENCES Businesses(id) ON DELETE CASCADE,
        address VARCHAR(255),
        city VARCHAR(255),
        state VARCHAR(255),
        country VARCHAR(255) DEFAULT 'United Kingdom',
        postal_code VARCHAR(20) NOT NULL,
        employee_count VARCHAR(50) DEFAULT '11-50',
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS OHProviders (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES Users(id) ON DELETE CASCADE,
        company_name VARCHAR(255) NOT NULL,
        contact_person VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        is_subscribed BOOLEAN DEFAULT TRUE,
        subscription_expiry TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS OHProviderLocations (
        id SERIAL PRIMARY KEY,
        provider_id INT REFERENCES OHProviders(id) ON DELETE CASCADE,
        address VARCHAR(255),
        city VARCHAR(255),
        state VARCHAR(255),
        country VARCHAR(255) DEFAULT 'United Kingdom',
        postal_code VARCHAR(20) NOT NULL,
        coverage_radius INT DEFAULT 30,
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS OHProviderServices (
        id SERIAL PRIMARY KEY,
        provider_id INT REFERENCES OHProviders(id) ON DELETE CASCADE,
        location_id INT REFERENCES OHProviderLocations(id) ON DELETE CASCADE,
        service_type VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS Referrals (
        id SERIAL PRIMARY KEY,
        business_id INT REFERENCES Businesses(id) ON DELETE CASCADE,
        business_location_id INT REFERENCES BusinessLocations(id) ON DELETE CASCADE,
        service_type VARCHAR(100) NOT NULL,
        employee_count INT NOT NULL DEFAULT 1,
        contact_name VARCHAR(255),
        contact_email VARCHAR(255),
        contact_phone VARCHAR(50),
        notes TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ReferralMatches (
        id SERIAL PRIMARY KEY,
        referral_id INT REFERENCES Referrals(id) ON DELETE CASCADE,
        provider_id INT REFERENCES OHProviders(id) ON DELETE CASCADE,
        status VARCHAR(50) DEFAULT 'matched',
        matched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS UserPasskeys (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES Users(id) ON DELETE CASCADE,
        credential_id TEXT NOT NULL,
        public_key TEXT NOT NULL,
        counter BIGINT NOT NULL DEFAULT 0,
        transports VARCHAR(255),
        device_name VARCHAR(255) DEFAULT 'Security Key / Biometrics',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ContactMessages (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        subject VARCHAR(255),
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      INSERT INTO Users (email, password, user_type)
      VALUES ('admin@ohreferral.co.uk', '$2a$10$WoRMgichwljOSCfJ8E4rFOhdKsPxvzeJhd9JV/QRQ9/53AwGJhIIi', 'admin')
      ON CONFLICT (email) DO NOTHING;
    `);
    console.log('✅ Supabase PostgreSQL schema initialized and verified!');
  } catch (err) {
    console.error('Error initializing PostgreSQL schema:', err.message);
  }
}

const delegatePool = {
  get useMock() {
    return useMock;
  },
  set useMock(val) {
    useMock = val;
  },
  get dbEngineType() {
    return dbEngineType;
  },
  memoryDb,
  nextIds,
  async query(sql, params = []) {
    // 1. Check if Supabase / PostgreSQL is configured via DATABASE_URL
    if (isPostgresConfigured() && !useMock) {
      if (!pgPool) {
        try {
          const connectionString = getDatabaseUrl();
          pgPool = new PgPool({
            connectionString,
            ssl: { rejectUnauthorized: false },
            connectionTimeoutMillis: 5000
          });
          const client = await pgPool.connect();
          console.log('🎉 Successfully connected to Supabase PostgreSQL database!');
          dbEngineType = 'supabase';
          await initPgSchema(client);
          client.release();
        } catch (pgErr) {
          console.warn('Could not connect to Supabase PostgreSQL, falling back. Error:', pgErr.message);
          pgPool = null;
          useMock = true;
          dbEngineType = 'in-memory';
        }
      }

      if (pgPool) {
        const convertedSql = convertSqlForPostgres(sql);
        const res = await pgPool.query(convertedSql, params);
        
        // Format result to match MySQL promise API expected by controllers
        if (/^insert\s+into/i.test(sql.trim())) {
          return [{ insertId: res.rows[0]?.id, affectedRows: res.rowCount }, res.fields];
        } else if (/^(update|delete)/i.test(sql.trim())) {
          return [{ affectedRows: res.rowCount }, res.fields];
        } else {
          return [res.rows, res.fields];
        }
      }
    }

    // 2. Check if MySQL is configured via DB_HOST
    if (!realPool && !useMock && !isPostgresConfigured()) {
      try {
        realPool = mysql.createPool(poolConfig);
        await realPool.query('SELECT 1');
        console.log('Successfully connected to MySQL database!');
        dbEngineType = 'mysql';
      } catch (err) {
        console.warn('Could not connect to MySQL database, falling back to IN-MEMORY database.');
        useMock = true;
        realPool = null;
        dbEngineType = 'in-memory';
      }
    }

    if (useMock || (!realPool && !pgPool)) {
      dbEngineType = 'in-memory';
      return mockPool.query(sql, params);
    } else if (realPool) {
      dbEngineType = 'mysql';
      return realPool.query(sql, params);
    }
  },

  async execute(sql, params = []) {
    return this.query(sql, params);
  },
  poolConfig
};

module.exports = delegatePool;
