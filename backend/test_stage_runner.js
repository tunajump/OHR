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

    // 2.7 Verify Cumulative Radius-Based Subscription Summary (London 30 miles = £20 + Manchester 50 miles = £30 => Total £50/m)
    const subSummaryRes1 = await api.get('/provider/subscription/summary', { headers: { 'x-auth-token': provToken } });
    assert(subSummaryRes1.status === 200, 'Provider can retrieve subscription summary with 200 OK');
    assert(subSummaryRes1.data.itemizedLocations.length === 2, 'Summary itemizes all 2 registered clinic locations');
    assert(subSummaryRes1.data.totalMonthlyCost === 50, 'Initial cumulative subscription correctly totals £50/m (30m @ £20 + 50m @ £30)');

    // 2.8 Update Manchester location radius to 10 miles (£10/m) and verify recalculated cumulative total (£30/m)
    const updateLocRes = await api.put(`/provider/location/${loc2.id}`, { coverageRadius: 10 }, { headers: { 'x-auth-token': provToken } });
    assert(updateLocRes.status === 200, 'Provider location radius updated to 10 miles with 200 OK');
    const subSummaryRes2 = await api.get('/provider/subscription/summary', { headers: { 'x-auth-token': provToken } });
    assert(subSummaryRes2.data.totalMonthlyCost === 30, 'Recalculated cumulative subscription correctly totals £30/m (30m @ £20 + 10m @ £10)');

    // Reset Manchester radius back to 50 miles for subsequent referral matching stages
    await api.put(`/provider/location/${loc2.id}`, { coverageRadius: 50 }, { headers: { 'x-auth-token': provToken } });

    // 2.9 Stripe Webhook & Automated Subscription Lifecycle
    const stripeWebhookCheckoutRes = await api.post('/webhooks/stripe', {
      type: 'checkout.session.completed',
      data: {
        object: {
          client_reference_id: String(1), // Provider ID 1
          customer: 'cus_test_mock_12345',
          subscription: 'sub_test_mock_67890',
          metadata: { providerId: '1' }
        }
      }
    });
    assert(stripeWebhookCheckoutRes.status === 200, 'Stripe checkout.session.completed webhook processed successfully');

    const subSummaryAfterStripe = await api.get('/provider/subscription/summary', { headers: { 'x-auth-token': provToken } });
    assert(subSummaryAfterStripe.data.isSubscribed === true, 'Provider is now active Pro subscriber via Stripe Checkout');
    assert(subSummaryAfterStripe.data.stripeCustomerId === 'cus_test_mock_12345', 'Stripe customer ID linked to provider');

    // Test invoice.payment_succeeded webhook
    const stripeInvoiceRes = await api.post('/webhooks/stripe', {
      type: 'invoice.payment_succeeded',
      data: {
        object: {
          customer: 'cus_test_mock_12345',
          amount_paid: 5000
        }
      }
    });
    assert(stripeInvoiceRes.status === 200, 'Stripe invoice.payment_succeeded webhook processed successfully');

    // Test customer.subscription.deleted webhook
    const stripeCancelRes = await api.post('/webhooks/stripe', {
      type: 'customer.subscription.deleted',
      data: {
        object: {
          customer: 'cus_test_mock_12345',
          id: 'sub_test_mock_67890'
        }
      }
    });
    assert(stripeCancelRes.status === 200, 'Stripe customer.subscription.deleted webhook processed successfully');

    const subSummaryAfterCancel = await api.get('/provider/subscription/summary', { headers: { 'x-auth-token': provToken } });
    assert(subSummaryAfterCancel.data.isSubscribed === false, 'Provider is marked inactive following Stripe subscription cancellation');

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

    // =========================================================================
    // STAGE 6: Admin Database Security & WebAuthn Passkeys Endpoints
    // =========================================================================
    console.log('\n----------------------------------------------------');
    console.log('STAGE 6: Admin Database Security & WebAuthn Passkeys');
    console.log('----------------------------------------------------');

    // 6.1 Unauthenticated request to /api/database/overview is rejected with 401
    const unauthDbRes = await api.get('/database/overview');
    assert(unauthDbRes.status === 401, 'Unauthenticated request to /api/database/overview is rejected (401)');

    // 6.2 Non-admin request to /api/database/overview is rejected with 403 Forbidden
    const nonAdminDbRes = await api.get('/database/overview', { headers: { 'x-auth-token': bizToken } });
    assert(nonAdminDbRes.status === 403, 'Non-admin user cannot access database inspector (403 Forbidden)');

    // 6.3 Register / Login Admin Super-User Account
    const adminUser = {
      email: `test_admin_${Date.now()}@ohreferral.co.uk`,
      password: 'AdminMasterPass999!',
      userType: 'admin',
      organizationName: 'OHR Administration Team',
      name: 'Super Administrator',
      phone: '020 7946 0000'
    };
    const regAdminRes = await api.post('/register', adminUser);
    assert(regAdminRes.status === 201, 'Super-admin registered with 201 Created');
    const adminToken = regAdminRes.data.token;

    // 6.4 Authorized Super-Admin can access /api/database/overview
    const adminDbRes = await api.get('/database/overview', { headers: { 'x-auth-token': adminToken } });
    assert(adminDbRes.status === 200, 'Admin can inspect live database overview (200 OK)');
    assert(Array.isArray(adminDbRes.data.tables), 'Database overview returns table schemas and rows');
    assert(adminDbRes.data.tables.some(t => t.name === 'Users'), 'Tables overview includes Users');
    assert(adminDbRes.data.tables.some(t => t.name === 'Referrals'), 'Tables overview includes Referrals');
    assert(adminDbRes.data.tables.some(t => t.name === 'UserPasskeys'), 'Tables overview includes UserPasskeys');

    // 6.5 Passkey registration challenge requires authentication
    const unauthPasskeyReg = await api.post('/auth/passkey/register/options', {});
    assert(unauthPasskeyReg.status === 401, 'Passkey registration challenge without auth is rejected (401)');

    // 6.6 Authenticated user can request Passkey registration options
    const passkeyRegOptions = await api.post(
      '/auth/passkey/register/options',
      {},
      { headers: { 'x-auth-token': bizToken } }
    );
    assert(passkeyRegOptions.status === 200, 'User can generate WebAuthn registration challenge options (200 OK)');
    assert(passkeyRegOptions.data && passkeyRegOptions.data.challenge, 'Registration options contain WebAuthn cryptographic challenge');
    assert(passkeyRegOptions.data.rp && passkeyRegOptions.data.rp.name, 'Registration options contain Relying Party details');

    // 6.7 Passkey login options generation for registered email
    const passkeyLoginOptions = await api.post('/auth/passkey/login/options', {
      email: businessUser.email,
    });
    assert(passkeyLoginOptions.status === 200, 'Passkey authentication challenge generated (200 OK)');
    assert(passkeyLoginOptions.data && passkeyLoginOptions.data.challenge, 'Authentication options contain cryptographic challenge');

    // 6.8 List registered passkeys for user
    const userPasskeysList = await api.get('/auth/passkey/list', {
      headers: { 'x-auth-token': bizToken },
    });
    assert(userPasskeysList.status === 200, 'User can retrieve registered passkeys list (200 OK)');
    assert(Array.isArray(userPasskeysList.data), 'Passkeys list returns an array of credentials');

    
    // =========================================================================
    // STAGE 7: Direct 1-Click Passwordless Registration & Master Super-User
    // =========================================================================
    console.log('\n----------------------------------------------------');
    console.log('STAGE 7: Direct Passwordless Registration & Master Super-User');
    console.log('----------------------------------------------------');

    // 7.1 Auto-seed master super-user if not already present
    const bcrypt = require('bcryptjs');
    const pool = require('./src/utils/db');
    const masterAdminEmail = 'admin@ohreferral.co.uk';
    const masterAdminPass = 'AdminOHR2026!Secure';
    
    const [existingMaster] = await pool.query('SELECT id, email, user_type FROM Users WHERE email = ?', [masterAdminEmail]);
    if (!existingMaster || existingMaster.length === 0) {
      const hash = await bcrypt.hash(masterAdminPass, 10);
      await pool.query('INSERT INTO Users (email, password, user_type) VALUES (?, ?, ?)', [masterAdminEmail, hash, 'admin']);
    }

    // 7.2 Login as Master Admin Super-User
    const masterLoginRes = await api.post('/login', {
      email: masterAdminEmail,
      password: masterAdminPass,
    });
    assert(masterLoginRes.status === 200, 'Master Super-User admin@ohreferral.co.uk logs in successfully');
    assert(masterLoginRes.data.userType === 'admin', 'Master account correctly recognized as userType "admin"');
    const masterToken = masterLoginRes.data.token;

    // 7.3 Master Admin inspects full database tables
    const masterDbRes = await api.get('/database/overview', { headers: { 'x-auth-token': masterToken } });
    assert(masterDbRes.status === 200, 'Master Super-User accesses /api/database/overview (200 OK)');
    assert(masterDbRes.data.tables.some(t => t.name === 'UserPasskeys'), 'Overview includes UserPasskeys table schema');

    // 7.4 Master Admin generates Passkey Registration Options
    const masterPasskeyOptRes = await api.post('/auth/passkey/register-options', {}, {
      headers: { 'x-auth-token': masterToken }
    });
    assert(masterPasskeyOptRes.status === 200, 'Master Super-User generates passkey registration options (200 OK)');
    assert(masterPasskeyOptRes.data && masterPasskeyOptRes.data.challenge, 'Admin options return cryptographic challenge');
    assert(masterPasskeyOptRes.data.user && masterPasskeyOptRes.data.user.name === masterAdminEmail, 'Admin passkey user identifier matches admin email');

    // 7.4 Request Passwordless Registration Options (New Business User)
    const pwlessUser = {
      email: `pwless_biz_${Date.now()}@biometrics-inc.co.uk`,
      userType: 'business',
      organizationName: 'Biometrics Systems UK Ltd',
      name: 'Alice Cooper',
      phone: '020 7946 0888'
    };
    const pwlessOptRes = await api.post('/auth/passkey/register-passwordless-options', pwlessUser);
    assert(pwlessOptRes.status === 200, '1-Click Passwordless Registration options generated with 200 OK');
    assert(pwlessOptRes.data && pwlessOptRes.data.challenge, 'Passwordless options return WebAuthn cryptographic challenge');
    assert(pwlessOptRes.data.user && pwlessOptRes.data.user.name === pwlessUser.email, 'Options user identifier matches signup email');
    assert(pwlessOptRes.data.authenticatorSelection && pwlessOptRes.data.authenticatorSelection.residentKey === 'preferred', 'Resident key configured for biometric passkey storage');

    // 7.5 Passwordless Registration Options with invalid email format is rejected
    const invalidPwlessEmail = await api.post('/auth/passkey/register-passwordless-options', {
      ...pwlessUser,
      email: 'not-a-valid-email'
    });
    assert(invalidPwlessEmail.status === 400, 'Passwordless registration options with invalid email rejected with 400');

    // 7.6 Passwordless Registration Options with invalid phone is rejected
    const invalidPwlessPhone = await api.post('/auth/passkey/register-passwordless-options', {
      ...pwlessUser,
      email: `valid_phone_${Date.now()}@example.co.uk`,
      phone: '123'
    });
    assert(invalidPwlessPhone.status === 400, 'Passwordless registration options with invalid telephone rejected with 400');

    // 7.7 Passwordless Registration Options with duplicate email is rejected
    const dupPwlessEmail = await api.post('/auth/passkey/register-passwordless-options', {
      ...pwlessUser,
      email: masterAdminEmail
    });
    assert(dupPwlessEmail.status === 400, 'Passwordless registration options for existing account rejected with 400');

    // =========================================================================
    // STAGE 8: Unified Email Service, Contact Form & Master Mailbox Routing
    // =========================================================================
    console.log('\n----------------------------------------------------');
    console.log('STAGE 8: Single Mailbox & Contact Routing to admin@ohreferral.co.uk');
    console.log('----------------------------------------------------');

    // 8.1 Submit contact enquiry
    const contactPayload = {
      name: 'Dr. Jane Watson',
      email: 'jane.watson@nhs-clinic.co.uk',
      phone: '020 7946 0555',
      subject: 'OH Provider Accreditation Enquiry',
      message: 'Hello, we would like to register our London clinic as an accredited provider.'
    };
    const contactRes = await api.post('/contact', contactPayload);
    assert(contactRes.status === 200, 'Contact enquiry submitted with 200 OK');
    assert(contactRes.data && contactRes.data.routedTo === 'admin@ohreferral.co.uk', 'Contact enquiry automatically routed to admin@ohreferral.co.uk');
    assert(contactRes.data && contactRes.data.fromMailbox === 'admin@ohreferral.co.uk', 'Outgoing system emails set from admin@ohreferral.co.uk');

    // 8.2 Contact enquiry validation
    const invalidContactRes = await api.post('/contact', { name: 'Test', email: 'invalid-email' });
    assert(invalidContactRes.status === 400, 'Invalid contact enquiry is rejected with 400');

    // 8.3 Employee notification dispatch
    const empNotifyPayload = {
      employeeName: 'Tom Hardy',
      employeeEmail: 'tom.hardy@warehouse.co.uk',
      companyName: 'Midlands Logistics Ltd',
      managerEmail: 'hr.manager@midlands-logistics.co.uk',
      message: 'Please consider exploring Occupational Health support with OHReferral.'
    };
    const empNotifyRes = await api.post('/employees/notify', empNotifyPayload);
    assert(empNotifyRes.status === 201, 'Employee notification recorded and dispatched with 201 Created');

    // 8.4 Admin: Verify Email Service Config
    const emailConfigRes = await api.get('/email/config', {
      headers: { 'x-auth-token': masterToken }
    });
    assert(emailConfigRes.status === 200, 'Admin can retrieve email configuration (200 OK)');
    assert(emailConfigRes.data.systemFromEmail === 'admin@ohreferral.co.uk', 'System from email is admin@ohreferral.co.uk');
    assert(emailConfigRes.data.contactDefaultReceiver === 'admin@ohreferral.co.uk', 'Contact default receiver is admin@ohreferral.co.uk');

    // 8.5 Admin: Verify Contact Messages List
    const contactMessagesRes = await api.get('/contact/messages', {
      headers: { 'x-auth-token': masterToken }
    });
    assert(contactMessagesRes.status === 200, 'Admin can retrieve contact messages list (200 OK)');
    assert(Array.isArray(contactMessagesRes.data.messages), 'Contact messages returns array');
    assert(contactMessagesRes.data.messages.some(m => m.email === 'jane.watson@nhs-clinic.co.uk'), 'Submitted contact enquiry is present in admin messages store');

    // =========================================================================
    // STAGE 9: Anti-Bot Defense (Honeypot Traps) & Email Verification Flow
    // =========================================================================
    console.log('\n----------------------------------------------------');
    console.log('STAGE 9: Anti-Bot Defense (Honeypot) & Email Verification');
    console.log('----------------------------------------------------');

    // 9.1 Bot signup trap: honeypot field filled by automated bot
    const botSignupRes = await api.post('/register', {
      email: 'bot_scam_user@spambot.com',
      password: 'password123',
      userType: 'business',
      name: 'Bot Scraper',
      phone: '020 7946 0199',
      company_website_hp: 'http://spambot-malicious-link.ru'
    });
    assert(botSignupRes.status === 400, 'Automated bot registration caught by honeypot is blocked with 400');

    // 9.2 Legitimate registration gets verification token and soft activation
    const legitUserEmail = `verify_test_${Date.now()}@ohreferral-client.co.uk`;
    const legitUserRes = await api.post('/register', {
      email: legitUserEmail,
      password: 'LegitPassword2026!',
      userType: 'business',
      name: 'Verifiable Business Ltd',
      phone: '020 7946 0888'
    });
    assert(legitUserRes.status === 201, 'Legitimate business registration succeeds with 201 Created');
    assert(legitUserRes.data && legitUserRes.data.isVerified === false, 'New account starts with isVerified = false (soft activation)');
    const legitToken = legitUserRes.data.token;

    // 9.3 Check /me status
    const meRes = await api.get('/me', {
      headers: { 'x-auth-token': legitToken }
    });
    assert(meRes.status === 200, 'User can retrieve own account status (/api/me)');
    assert(meRes.data.isVerified === false, '/api/me confirms user is currently unverified');

    // 9.4 Resend verification email
    const resendRes = await api.post('/resend-verification', { email: legitUserEmail });
    assert(resendRes.status === 200, 'Resend verification email succeeds with 200 OK');

    // 9.5 Complete email verification with token
    const poolDb = require('./src/utils/db');
    const [userRows] = await poolDb.query('SELECT verification_token FROM Users WHERE LOWER(email) = ?', [legitUserEmail.toLowerCase()]);
    assert(userRows && userRows.length > 0 && userRows[0].verification_token, 'Verification token generated in database');
    const verifyToken = userRows[0].verification_token;

    const verifyRes = await api.get(`/verify-email?token=${verifyToken}`);
    assert(verifyRes.status === 200, 'Verify email link with valid token succeeds with 200 OK');
    assert(verifyRes.data && verifyRes.data.isVerified === true, 'Verification returns isVerified = true');

    // 9.6 Verify updated /me status
    const updatedMeRes = await api.get('/me', {
      headers: { 'x-auth-token': legitToken }
    });
    assert(updatedMeRes.data.isVerified === true, 'Subsequent /api/me confirms user is now fully verified');

    // 9.7 Bot referral trap: honeypot field filled
    const botReferralRes = await api.post('/referrals', {
      businessLocationId: 1,
      services: ['Management Referrals'],
      employeeCount: 10,
      contactName: 'Bot spam',
      contactEmail: 'bot@spam.com',
      contactPhone: '020 7946 0123',
      company_website_hp: 'http://bot-honeypot.xyz'
    }, {
      headers: { 'x-auth-token': legitToken }
    });
    assert(botReferralRes.status === 200, 'Referral bot trap silently returns 200 OK without creating database records');

    console.log('\n====================================================');
    console.log('  ALL STAGES PASSED: Full OHR Test Suite 100% SUCCESS!  ');
    console.log('====================================================\n');
    if (server) {
      server.close();
    }
    process.exit(0);
  } catch (error) {
    console.error('\n[FATAL ERROR IN STAGE RUNNER]', error.message, error);
    if (server) {
      server.close();
    }
    process.exit(1);
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
const passkeyRoutes = require('./src/routes/passkeyRoutes');

app.use('/api', authRoutes);
app.use('/api/auth/passkey', passkeyRoutes);
app.use('/api/passkey', passkeyRoutes);
app.use('/api/business', businessRoutes);
app.use('/api/provider', providerRoutes);
app.use('/api', providerRoutes);
app.use('/api', businessRoutes);
app.use('/api', referralRoutes);
app.use('/api', adminRoutes);

console.log(`\n[INIT] Starting in-memory test server on port ${port}...`);
server = http.createServer(app);
server.listen(port, () => {
  runStages();
});
