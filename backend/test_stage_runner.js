/**
 * Stage-by-Stage Test Runner for OHR (Occupational Health Referral Platform)
 * 
 * Verifies core functionality:
 * - STAGE 1: Authentication & User Lifecycle (Business & Provider registration, tokens, login)
 * - STAGE 2: Profiles, Multi-Location Management, Per-Location Services & UK Geocoding
 * - STAGE 3: Haversine Spatial Matching & Distance Radius Verification
 * - STAGE 4: Role-Based Authorization, Privacy Boundaries & Provider Queues
 */

const axios = require('axios');
const http = require('http');

let server;
let port = 5088;
const baseURL = `http://localhost:${port}/api`;

const api = axios.create({
  baseURL,
  validateStatus: () => true, // Don't throw on error status codes so we can assert them
});

// Setup request logging
api.interceptors.request.use((config) => {
  console.log(`${new Date().toISOString()} - ${config.method.toUpperCase()} ${config.url}`);
  return config;
});

function assert(condition, message) {
  if (!condition) {
    console.error(`  ✗ [FAIL] ${message}`);
    throw new Error(`Test assertion failed: ${message}`);
  }
  console.log(`  ✓ [PASS] ${message}`);
}

async function runStages() {
  console.log('====================================================');
  console.log('  OHR Full Application Stage-by-Stage Test Suite    ');
  console.log('====================================================');

  try {
    // =========================================================================
    // STAGE 1: Authentication & Account Lifecycle
    // =========================================================================
    console.log('\n----------------------------------------------------');
    console.log('STAGE 1: Authentication & User Lifecycle');
    console.log('----------------------------------------------------');

    const businessUser = {
      email: `test_biz_${Date.now()}@corporate.co.uk`,
      password: 'SecurePassword123!',
      userType: 'business',
      organizationName: 'Global Logistics Ltd',
      name: 'Sarah Connor',
      phone: '020 7946 0123'
    };

    const providerUser = {
      email: `test_prov_${Date.now()}@healthclinic.co.uk`,
      password: 'ClinicSecurePass456!',
      userType: 'provider',
      organizationName: 'Apex Health Ltd',
      name: 'Dr. John Smith',
      phone: '020 7123 4567'
    };

    // 1.1 Register Business Account
    const regBizRes = await api.post('/register', businessUser);
    assert(regBizRes.status === 201, 'Register Business Account returns 201 Created');
    assert(regBizRes.data.token && typeof regBizRes.data.token === 'string', 'Registration returns valid JWT token');
    const bizToken = regBizRes.data.token;

    // 1.1b Reject registration with invalid email format
    const invalidEmailReg = await api.post('/register', { ...businessUser, email: 'not-an-email' });
    assert(invalidEmailReg.status === 400, 'Registration with invalid email format is rejected with 400');

    // 1.1c Reject registration with missing or invalid telephone
    const invalidPhoneReg = await api.post('/register', { ...businessUser, email: `valid_${Date.now()}@co.uk`, phone: '123' });
    assert(invalidPhoneReg.status === 400, 'Registration with invalid telephone (< 10 digits) is rejected with 400');

    // 1.2 Reject Duplicate Registration
    const dupRes = await api.post('/register', businessUser);
    assert(dupRes.status === 400, 'Duplicate email registration is rejected with 400');

    // 1.3 Login with Valid Credentials
    const loginRes = await api.post('/login', {
      email: businessUser.email,
      password: businessUser.password,
    });
    assert(loginRes.status === 200, 'Login with correct credentials returns 200 OK');
    assert(loginRes.data.userType === 'business', 'User role correctly identified as business');

    // 1.4 Reject Invalid Password
    const invalidLogin = await api.post('/login', {
      email: businessUser.email,
      password: 'WrongPassword!',
    });
    assert(invalidLogin.status === 400, 'Login with invalid password is rejected with 400');

    // 1.5 Register OH Provider Account
    const regProvRes = await api.post('/register', providerUser);
    assert(regProvRes.status === 201, 'Register OH Provider Account returns 201 Created');
    const provToken = regProvRes.data.token;

    // =========================================================================
    // STAGE 2: Profiles, Multi-Locations, Per-Location Services & Geocoding
    // =========================================================================
    console.log('\n----------------------------------------------------');
    console.log('STAGE 2: Profiles, Multi-Locations & Per-Location Services');
    console.log('----------------------------------------------------');

    // 2.1 Create Business Profile
    const createBizProf = await api.post(
      '/business/profile',
      {
        companyName: 'Global Logistics Ltd',
        contactPerson: 'Sarah Connor',
        phone: '020 7946 0123',
      },
      { headers: { 'x-auth-token': bizToken } }
    );
    assert(createBizProf.status === 201, 'Business profile created successfully');

    // 2.2 Add Business London HQ Location (SW1A 1AA - Westminster)
    const addBizLoc = await api.post(
      '/business/location',
      {
        address: 'Buckingham Palace Road',
        city: 'London',
        state: 'Greater London',
        country: 'United Kingdom',
        postalCode: 'SW1A 1AA',
        employeeCount: '51-100',
      },
      { headers: { 'x-auth-token': bizToken } }
    );
    assert(addBizLoc.status === 201, 'Business London location added with 201 status');
    assert(
      addBizLoc.data.coordinates && typeof addBizLoc.data.coordinates.latitude === 'number',
      'Business UK postcode (SW1A 1AA) resolved to valid geographic coordinates'
    );
    const bizLocationId = addBizLoc.data.locationId;

    // 2.2b Verify Business Locations Retrieval & Update
    const getBizLocs = await api.get('/business/locations', { headers: { 'x-auth-token': bizToken } });
    assert(getBizLocs.status === 200, 'Business can retrieve all registered workplace locations');
    assert(getBizLocs.data.length >= 1, 'Business locations list contains added location');

    const updateBizLoc = await api.put(
      `/business/location/${bizLocationId}`,
      {
        address: 'Buckingham Palace Road Suite 4',
        city: 'London',
        state: 'Greater London',
        country: 'United Kingdom',
        postalCode: 'SW1A 1AA',
        employeeCount: '51-100',
      },
      { headers: { 'x-auth-token': bizToken } }
    );
    assert(updateBizLoc.status === 200, 'Business location updated successfully');

    // 2.2c Add Business Manchester & Edinburgh Workplace Locations
    const addMcrBizLoc = await api.post(
      '/business/location',
      {
        address: '20 Deansgate',
        city: 'Manchester',
        state: 'Greater Manchester',
        country: 'United Kingdom',
        postalCode: 'M1 2WD',
        employeeCount: '1-10',
      },
      { headers: { 'x-auth-token': bizToken } }
    );
    const mcrBizLocId = addMcrBizLoc.data.locationId;

    const addEdiBizLoc = await api.post(
      '/business/location',
      {
        address: '5 Princes St',
        city: 'Edinburgh',
        state: 'Midlothian',
        country: 'United Kingdom',
        postalCode: 'EH1 1YZ',
        employeeCount: '1-10',
      },
      { headers: { 'x-auth-token': bizToken } }
    );
    const ediBizLocId = addEdiBizLoc.data.locationId;

    // 2.3 Create Provider Profile
    const createProvProf = await api.post(
      '/provider/profile',
      {
        companyName: 'Apex Occupational Health Ltd',
        contactPerson: 'Dr. John Smith',
        phone: '020 7123 4567',
      },
      { headers: { 'x-auth-token': provToken } }
    );
    assert(createProvProf.status === 201, 'Provider profile created successfully');

    // 2.4 Add Provider Location 1 (London: EC1A 1BB, 30 miles) covering Management Referrals & Health Surveillance
    const addProvLoc1 = await api.post(
      '/provider/location',
      {
        address: '10 St Pauls Square',
        city: 'London',
        state: 'Greater London',
        country: 'United Kingdom',
        postalCode: 'EC1A 1BB',
        coverageRadius: '30',
        services: ['Management Referrals', 'Health Surveillance']
      },
      { headers: { 'x-auth-token': provToken } }
    );
    assert(addProvLoc1.status === 201, 'Provider London clinic added with 30 miles radius');
    assert(
      addProvLoc1.data.coordinates && typeof addProvLoc1.data.coordinates.latitude === 'number',
      'London clinic postcode (EC1A 1BB) geocoded successfully'
    );

    // 2.5 Add Provider Location 2 (Manchester: M1 1AE, 50 miles) covering ONLY Preplacements
    const addProvLoc2 = await api.post(
      '/provider/location',
      {
        address: '50 Piccadilly Plaza',
        city: 'Manchester',
        state: 'Greater Manchester',
        country: 'United Kingdom',
        postalCode: 'M1 1AE',
        coverageRadius: '50',
        services: ['Preplacements']
      },
      { headers: { 'x-auth-token': provToken } }
    );
    assert(addProvLoc2.status === 201, 'Provider Manchester clinic added with 50 miles radius');
    assert(
      addProvLoc2.data.coordinates && typeof addProvLoc2.data.coordinates.latitude === 'number',
      'Manchester clinic postcode (M1 1AE) geocoded successfully'
    );

    // 2.6 Fetch Provider Locations and verify per-location services
    const provLocationsRes = await api.get('/provider/locations', { headers: { 'x-auth-token': provToken } });
    assert(provLocationsRes.status === 200, 'Provider can retrieve their registered clinic locations');
    assert(provLocationsRes.data.length === 2, 'Provider has exactly 2 registered clinic branches');
    const loc1 = provLocationsRes.data.find(l => l.postal_code === 'EC1A 1BB');
    const loc2 = provLocationsRes.data.find(l => l.postal_code === 'M1 1AE');
    assert(loc1 && loc1.services.includes('Management Referrals'), 'London clinic covers Management Referrals');
    assert(loc2 && loc2.services.includes('Preplacements') && !loc2.services.includes('Health Surveillance'), 'Manchester clinic covers Preplacements specifically');

    // =========================================================================
    // STAGE 3: Referral Dispatch & Spatial/Service Matching
    // =========================================================================
    console.log('\n----------------------------------------------------');
    console.log('STAGE 3: Referral Dispatch & Haversine Spatial Matching');
    console.log('----------------------------------------------------');

    // 3.1 London referral with matching London clinic covering Management Referrals
    const refMatchRes = await api.post(
      '/referrals',
      {
        businessLocationId: bizLocationId,
        serviceType: 'Management Referrals',
        employeeCount: 4,
        contactName: 'Jane Smith',
        contactEmail: 'jane.smith@apexcorp.co.uk',
        contactPhone: '020 7946 0123',
        notes: 'Employee returning from medical leave, requires ergonomic and stress review.',
      },
      { headers: { 'x-auth-token': bizToken } }
    );
    console.log('[DEBUG refMatchRes]', refMatchRes.status, refMatchRes.data);
    assert(refMatchRes.status === 201, 'London referral submitted with 201 status');
    assert(refMatchRes.data.status === 'matched', 'London referral status automatically set to "matched"');
    assert(refMatchRes.data.matchedProvider.distance === 2.06, 'Closest provider matched correctly at calculated distance: 2.06 miles');

    // 3.2 Multi-service referral matching
    const refMultiRes = await api.post(
      '/referrals',
      {
        businessLocationId: bizLocationId,
        services: ['Management Referrals', 'Health Surveillance'],
        employeeCount: 8,
        contactName: 'John Davis (HR Manager)',
        contactEmail: 'john.davis@apexcorp.co.uk',
        contactPhone: '020 7946 0999',
        notes: 'Pre-placement statutory audio and respiratory check required.',
      },
      { headers: { 'x-auth-token': bizToken } }
    );
    assert(refMultiRes.status === 201, 'Multi-service referral submitted with 201 status');
    assert(refMultiRes.data.status === 'matched', 'Multi-service referral successfully matched to London clinic offering both services');

    // 3.3 Manchester Preplacement referral
    const refMcrRes = await api.post(
      '/referrals',
      {
        businessLocationId: mcrBizLocId,
        serviceType: 'Preplacements',
        employeeCount: 2,
        contactName: 'Emma Watson',
        contactEmail: 'emma@apexcorp.co.uk',
        contactPhone: '0161 834 9922',
        notes: 'Preplacement screening for warehouse operative.',
      },
      { headers: { 'x-auth-token': bizToken } }
    );
    assert(refMcrRes.status === 201, 'Manchester Preplacement referral submitted with 201 status');
    assert(refMcrRes.data.status === 'matched', 'Manchester referral correctly matched to Manchester clinic');

    // 3.3b Manchester referral requesting Health Surveillance (which Manchester clinic does NOT cover)
    const refMcrUnmatchedService = await api.post(
      '/referrals',
      {
        businessLocationId: mcrBizLocId,
        serviceType: 'Health Surveillance',
        employeeCount: 1,
        contactName: 'Emma Watson',
        contactEmail: 'emma@apexcorp.co.uk',
        contactPhone: '0161 834 9922',
        notes: 'Health surveillance for noise exposure.',
      },
      { headers: { 'x-auth-token': bizToken } }
    );
    assert(refMcrUnmatchedService.status === 201, 'Manchester Health Surveillance referral created');
    assert(
      refMcrUnmatchedService.data.status === 'pending',
      'Referral correctly remains pending when nearby clinic does not cover that specific service'
    );

    // 3.4 Referral outside all coverage radiuses (Edinburgh location vs London/Manchester clinics)
    const refFarRes = await api.post(
      '/referrals',
      {
        businessLocationId: ediBizLocId,
        serviceType: 'Management Referrals',
        employeeCount: 3,
        contactName: 'Sarah Connor',
        contactEmail: 'sarah@edinburgh-hub.co.uk',
        contactPhone: '0131 496 0888',
        notes: 'Remote employee assessment.',
      },
      { headers: { 'x-auth-token': bizToken } }
    );
    assert(refFarRes.status === 201, 'Edinburgh referral submitted successfully');
    assert(
      refFarRes.data.status === 'pending',
      'Referral outside coverage radius correctly remains in "pending" status'
    );

    // 3.5 Location capacity limit rejection test (exceeding Manchester '1-10' capacity with 25 employees)
    const overCapacityRes = await api.post(
      '/referrals',
      {
        businessLocationId: mcrBizLocId,
        serviceType: 'Preplacements',
        employeeCount: 25,
        contactName: 'Emma Watson',
        contactEmail: 'emma@apexcorp.co.uk',
        contactPhone: '0161 834 9922',
      },
      { headers: { 'x-auth-token': bizToken } }
    );
    assert(overCapacityRes.status === 400, 'Referral exceeding workplace location capacity is rejected with 400 status');

    // 3.6 Invalid contact info validation assertions
    const invalidEmailRes = await api.post(
      '/referrals',
      {
        businessLocationId: bizLocationId,
        serviceType: 'Management Referrals',
        employeeCount: 1,
        contactName: 'Test Referrer',
        contactEmail: 'invalid-email-format',
        contactPhone: '020 7946 0123',
      },
      { headers: { 'x-auth-token': bizToken } }
    );
    assert(invalidEmailRes.status === 400, 'Referral with invalid email address format is rejected with 400 status');

    const invalidPhoneRes = await api.post(
      '/referrals',
      {
        businessLocationId: bizLocationId,
        serviceType: 'Management Referrals',
        employeeCount: 1,
        contactName: 'Test Referrer',
        contactEmail: 'valid@company.co.uk',
        contactPhone: '123',
      },
      { headers: { 'x-auth-token': bizToken } }
    );
    assert(invalidPhoneRes.status === 400, 'Referral with invalid phone number (< 10 digits) is rejected with 400 status');

    // =========================================================================
    // STAGE 4: Role-Based Authorization, Consideration & Selection Lifecycle
    // =========================================================================
    console.log('\n----------------------------------------------------');
    console.log('STAGE 4: Role-Based Authorization, Consideration & Selection');
    console.log('----------------------------------------------------');

    // 4.1 Provider queue masks contact details prior to business selection
    const provListInitial = await api.get('/referrals', { headers: { 'x-auth-token': provToken } });
    assert(provListInitial.status === 200, 'Provider can retrieve available referral requests');
    assert(provListInitial.data.length >= 3, 'Provider sees matches within clinic radius');
    const matchedRef = provListInitial.data.find(r => r.id === refMatchRes.data.referralId);
    assert(matchedRef.company_name === null, 'Company name is masked prior to selection');
    assert(matchedRef.contact_name === null, 'Contact name is masked prior to selection');
    assert(matchedRef.notes === null, 'Notes are masked prior to selection');
    assert(matchedRef.employee_count === 4, 'Number of employees is visible to provider');
    assert(matchedRef.distance > 0, 'Distance from clinic is visible to provider');

    // 4.2 Unsubscribed provider requesting consideration is rejected with 403
    const unsubRequestRes = await api.post(
      `/referrals/${refMatchRes.data.referralId}/request-consideration`,
      {},
      { headers: { 'x-auth-token': provToken } }
    );
    assert(unsubRequestRes.status === 403, 'Unsubscribed provider cannot request consideration (403)');

    // 4.3 Provider activates subscription
    const subRes = await api.put(
      '/provider/profile/subscription',
      { is_subscribed: true },
      { headers: { 'x-auth-token': provToken } }
    );
    assert(subRes.status === 200, 'Provider activates subscription successfully');

    // 4.4 Subscribed provider requests consideration
    const reqConsiderRes = await api.post(
      `/referrals/${refMatchRes.data.referralId}/request-consideration`,
      {},
      { headers: { 'x-auth-token': provToken } }
    );
    assert(reqConsiderRes.status === 200, 'Subscribed provider requests consideration successfully');
    assert(reqConsiderRes.data.status === 'consideration_requested', 'Match status set to consideration_requested');

    // 4.5 Business lists referrals and sees candidate provider in interested_providers
    const bizListRes = await api.get('/referrals', { headers: { 'x-auth-token': bizToken } });
    assert(bizListRes.status === 200, 'Business can retrieve their referrals list');
    assert(bizListRes.data.length === 5, 'Business receives exactly 5 created referrals');
    const bizRef = bizListRes.data.find(r => r.id === refMatchRes.data.referralId);
    assert(bizRef.interested_providers && bizRef.interested_providers.length > 0, 'Business sees interested providers');

    // 4.6 Business selects and awards the provider
    const provId = bizRef.interested_providers[0].provider_id;
    const selectRes = await api.post(
      `/referrals/${refMatchRes.data.referralId}/select-provider`,
      { providerId: provId },
      { headers: { 'x-auth-token': bizToken } }
    );
    assert(selectRes.status === 200, 'Business selects and awards provider successfully');

    // 4.6b Business selects multiple providers
    const multiSelectRes = await api.post(
      `/referrals/${refMatchRes.data.referralId}/select-providers`,
      { providerIds: [provId] },
      { headers: { 'x-auth-token': bizToken } }
    );
    assert(multiSelectRes.status === 200, 'Business can select multiple providers');
    assert(multiSelectRes.data.selectedProviderIds.includes(provId), 'Selected provider IDs recorded');

    // 4.7 Provider now sees full company and contact details for the selected referral
    const provListAfterAward = await api.get('/referrals', { headers: { 'x-auth-token': provToken } });
    const awardedRef = provListAfterAward.data.find(r => r.id === refMatchRes.data.referralId);
    assert(awardedRef.match_status === 'selected', 'Referral match status is now selected');
    assert(awardedRef.company_name === 'Global Logistics Ltd', 'Selected provider can view company name');
    assert(awardedRef.contact_name === 'Jane Smith', 'Selected provider can view contact name');
    assert(awardedRef.notes.includes('Employee returning from medical leave'), 'Selected provider can view referral notes');

    // 4.8 Business closes referral
    const closeRes = await api.post(
      `/referrals/${refMatchRes.data.referralId}/close`,
      {},
      { headers: { 'x-auth-token': bizToken } }
    );
    assert(closeRes.status === 200, 'Business marks referral as closed successfully');
    assert(closeRes.data.status === 'closed', 'Referral status is updated to closed');

    // 4.9 Consideration request for closed referral is rejected
    const reqClosedRes = await api.post(
      `/referrals/${refMatchRes.data.referralId}/request-consideration`,
      {},
      { headers: { 'x-auth-token': provToken } }
    );
    assert(reqClosedRes.status === 400, 'Consideration request for closed referral is rejected with 400');

    // 4.10 Unauthenticated request is rejected
    const unauthRes = await api.get('/referrals');
    assert(unauthRes.status === 401, 'Unauthenticated request to protected route is rejected with 401');

    // =========================================================================
    // STAGE 5: Referral Lifecycle Modification & Deletion
    // =========================================================================
    console.log('\n----------------------------------------------------');
    console.log('STAGE 5: Referral Modification & Deletion Lifecycle');
    console.log('----------------------------------------------------');

    // 5.1 Edit a pending referral (Edinburgh referral #5 -> Update to London Postcode SW1A 1AA)
    const pendingRefId = refFarRes.data.referralId;
    const editRes = await api.put(
      `/referrals/${pendingRefId}`,
      {
        businessLocationId: bizLocationId,
        services: ['Management Referrals'],
        employeeCount: 4,
        contactName: 'Sarah Connor',
        contactEmail: 'sarah@edinburgh-hub.co.uk',
        contactPhone: '0131 496 0888',
      },
      { headers: { 'x-auth-token': bizToken } }
    );
    assert(editRes.status === 200, 'Pending referral can be edited and automatically re-evaluates matching');
    assert(editRes.data.status === 'matched', 'Updated referral successfully matched with nearby London clinic');

    // 5.2 Attempting to edit a matched referral is rejected with 400
    const res2 = await api.put(
      `/referrals/${pendingRefId}`,
      {
        businessLocationId: bizLocationId,
        services: ['Health Surveillance'],
      },
      { headers: { 'x-auth-token': bizToken } }
    );
    assert(res2.status === 400, 'Editing a matched referral is rejected with 400 status');

    // 5.3 Delete a matched referral
    const deleteMatchedRes = await api.delete(`/referrals/${pendingRefId}`, {
      headers: { 'x-auth-token': bizToken },
    });
    assert(deleteMatchedRes.status === 200, 'Business can cancel/delete a matched referral');

    // 5.4 Delete a pending referral
    const pendingMcrRefId = refMcrUnmatchedService.data.referralId;
    const deletePendingRes = await api.delete(`/referrals/${pendingMcrRefId}`, {
      headers: { 'x-auth-token': bizToken },
    });
    assert(deletePendingRes.status === 200, 'Business can delete a pending referral');

    console.log('\n====================================================');
    console.log('  ALL STAGES PASSED: Referral Lifecycle & Management Verified!  ');
    console.log('====================================================\n');
  } catch (error) {
    console.error('\n[FATAL ERROR IN STAGE RUNNER]', error.message, error);
    process.exit(1);
  } finally {
    if (server) {
      server.close();
    }
  }
}

// Start in-memory mock app for standalone testing
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

process.env.JWT_SECRET = 'stage_test_secret_key_12345';
process.env.DB_HOST = 'force_mock_db';

const authRoutes = require('./src/routes/authRoutes');
const businessRoutes = require('./src/routes/businessRoutes');
const providerRoutes = require('./src/routes/providerRoutes');
const referralRoutes = require('./src/routes/referralRoutes');
const adminRoutes = require('./src/routes/adminRoutes');

app.use('/api', authRoutes);
app.use('/api/business', businessRoutes);
app.use('/api/provider', providerRoutes);
app.use('/api', referralRoutes);
app.use('/api', adminRoutes);

console.log(`\n[INIT] Starting in-memory test server on port ${port}...`);
server = http.createServer(app);
server.listen(port, () => {
  runStages();
});
