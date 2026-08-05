const { spawn } = require('child_process');
const axios = require('axios');

// Spawn the backend server on a clean port
const PORT = '5055';
const env = { ...process.env, PORT, DB_HOST: 'force_mock_db' };

console.log('Starting backend server on port', PORT);
const serverProcess = spawn('node', ['src/server.js'], { env, cwd: __dirname });

let stdoutData = '';
serverProcess.stdout.on('data', (data) => {
  stdoutData += data.toString();
  process.stdout.write('[Server STDOUT] ' + data);
});

serverProcess.stderr.on('data', (data) => {
  process.stderr.write('[Server STDERR] ' + data);
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTests() {
  const api = axios.create({
    baseURL: `http://localhost:${PORT}/api`,
    validateStatus: () => true // Do not throw on 4xx/5xx responses, we want to assert them
  });

  try {
    // Wait for server to initialize
    await sleep(2000);

    console.log('\n--- Starting Integration Tests ---\n');

    // TEST 1: Register Business User
    console.log('Test 1: Registering Business User...');
    const regBizRes = await api.post('/register', {
      email: 'business@example.com',
      userType: 'business'
    });
    console.log('Status:', regBizRes.status);
    if (regBizRes.status !== 201) throw new Error('Business registration failed');
    const bizToken = regBizRes.data.token;
    console.log('Token acquired.');

    // TEST 2: Login Business User
    console.log('\nTest 2: Logging in Business User...');
    const loginBizRes = await api.post('/login', {
      email: 'business@example.com',
      password: 'password'
    });
    console.log('Status:', loginBizRes.status);
    if (loginBizRes.status !== 200) throw new Error('Business login failed');

    // TEST 3: Create Business Profile
    console.log('\nTest 3: Creating Business Profile...');
    const createProfileRes = await api.post('/business/profile', 
      {
        companyName: 'Acme Corp',
        contactPerson: 'John Doe',
        phone: '0123456789'
      },
      { headers: { 'x-auth-token': bizToken } }
    );
    console.log('Status:', createProfileRes.status);
    if (createProfileRes.status !== 201) throw new Error('Creating business profile failed');
    console.log('Profile created:', createProfileRes.data);

    // TEST 4: Add Business Location (London SW1A 1AA)
    console.log('\nTest 4: Adding Business Location (SW1A 1AA)...');
    const addLocRes = await api.post('/business/location',
      {
        address: 'Buckingham Palace',
        city: 'London',
        state: 'London',
        country: 'United Kingdom',
        postalCode: 'SW1A 1AA',
        employeeCount: '51-100'
      },
      { headers: { 'x-auth-token': bizToken } }
    );
    console.log('Status:', addLocRes.status);
    if (addLocRes.status !== 201) throw new Error('Adding business location failed');
    console.log('Coordinates returned:', addLocRes.data.coordinates);
    if (!addLocRes.data.coordinates || !addLocRes.data.coordinates.latitude) {
      throw new Error('No coordinates returned for SW1A 1AA');
    }
    const businessLocationId = addLocRes.data.locationId;

    // TEST 5: Try to add Business Location with Invalid Postcode
    console.log('\nTest 5: Adding Business Location with Invalid Postcode (INVALID_POSTCODE)...');
    const addInvalidLocRes = await api.post('/business/location',
      {
        address: '123 Fake St',
        city: 'London',
        state: 'London',
        country: 'United Kingdom',
        postalCode: 'INVALID_POSTCODE',
        employeeCount: '1-10'
      },
      { headers: { 'x-auth-token': bizToken } }
    );
    console.log('Status (expected 400):', addInvalidLocRes.status);
    console.log('Message:', addInvalidLocRes.data.message);
    if (addInvalidLocRes.status !== 400) {
      throw new Error('Server did not reject invalid postcode with 400');
    }
    if (!addInvalidLocRes.data.message.includes('Invalid postcode')) {
      throw new Error('Helpful error message not returned');
    }

    // TEST 6: Register Provider User (London SW1A 2AA - very close)
    console.log('\nTest 6: Registering Provider User...');
    const regProvRes = await api.post('/register', {
      email: 'provider@example.com',
      userType: 'provider'
    });
    console.log('Status:', regProvRes.status);
    if (regProvRes.status !== 201) throw new Error('Provider registration failed');
    const provToken = regProvRes.data.token;

    // TEST 7: Create Provider Profile
    console.log('\nTest 7: Creating Provider Profile...');
    const createProvProfileRes = await api.post('/provider/profile',
      {
        companyName: 'London Occupational Health',
        contactPerson: 'Jane Smith',
        phone: '0987654321'
      },
      { headers: { 'x-auth-token': provToken } }
    );
    console.log('Status:', createProvProfileRes.status);
    if (createProvProfileRes.status !== 201) throw new Error('Creating provider profile failed');

    // TEST 8: Add Provider Location (London SW1A 2AA, coverage 30 miles)
    console.log('\nTest 8: Adding Provider Location (SW1A 2AA, 30 miles)...');
    const addProvLocRes = await api.post('/provider/location',
      {
        address: 'Downing Street',
        city: 'London',
        state: 'London',
        country: 'United Kingdom',
        postalCode: 'SW1A 2AA',
        coverageRadius: 30
      },
      { headers: { 'x-auth-token': provToken } }
    );
    console.log('Status:', addProvLocRes.status);
    if (addProvLocRes.status !== 201) throw new Error('Adding provider location failed');
    console.log('Coordinates returned:', addProvLocRes.data.coordinates);

    // TEST 9: Add Provider Service ("Management Referrals")
    console.log('\nTest 9: Adding Provider Service ("Management Referrals")...');
    const addProvServiceRes = await api.post('/provider/service',
      {
        serviceType: 'Management Referrals'
      },
      { headers: { 'x-auth-token': provToken } }
    );
    console.log('Status:', addProvServiceRes.status);
    if (addProvServiceRes.status !== 201) throw new Error('Adding provider service failed');

    // TEST 10: Create Referral for "Management Referrals" (Expected MATCH)
    console.log('\nTest 10: Submitting Referral for "Management Referrals" (Expected MATCH)...');
    const createRefRes = await api.post('/referrals',
      {
        businessLocationId,
        serviceType: 'Management Referrals'
      },
      { headers: { 'x-auth-token': bizToken } }
    );
    console.log('Status:', createRefRes.status);
    console.log('Result payload:', createRefRes.data);
    if (createRefRes.status !== 201) throw new Error('Referral creation failed');
    if (createRefRes.data.status !== 'matched') throw new Error('Referral should have been matched');
    if (!createRefRes.data.matchedProvider || createRefRes.data.matchedProvider.companyName !== 'London Occupational Health') {
      throw new Error('Referral matched to incorrect provider');
    }
    console.log(`Matched to ${createRefRes.data.matchedProvider.companyName} at distance of ${createRefRes.data.matchedProvider.distance} miles`);

    // TEST 11: Create Referral for "Preplacements" (Expected NO MATCH, defaults to pending)
    console.log('\nTest 11: Submitting Referral for "Preplacements" (Expected NO MATCH, status pending)...');
    const createPendingRefRes = await api.post('/referrals',
      {
        businessLocationId,
        serviceType: 'Preplacements'
      },
      { headers: { 'x-auth-token': bizToken } }
    );
    console.log('Status:', createPendingRefRes.status);
    console.log('Result payload:', createPendingRefRes.data);
    if (createPendingRefRes.status !== 201) throw new Error('Referral creation failed');
    if (createPendingRefRes.data.status !== 'pending') {
      throw new Error('Referral should have been pending (no provider offers Preplacements)');
    }

    // TEST 12: Add Manchester Provider (M1 1AE, further than coverage radius, Management Referrals)
    console.log('\nTest 12: Registering Manchester Provider (M1 1AE)...');
    const regMancRes = await api.post('/register', {
      email: 'manchester@example.com',
      userType: 'provider'
    });
    const mancToken = regMancRes.data.token;

    await api.post('/provider/profile',
      {
        companyName: 'Manchester Occupational Health',
        contactPerson: 'Liam Gallagher',
        phone: '0161111222'
      },
      { headers: { 'x-auth-token': mancToken } }
    );

    const addMancLocRes = await api.post('/provider/location',
      {
        address: 'Piccadilly',
        city: 'Manchester',
        state: 'Greater Manchester',
        country: 'United Kingdom',
        postalCode: 'M1 1AE',
        coverageRadius: 50 // 50 miles coverage (London is ~160 miles away, so they won't overlap)
      },
      { headers: { 'x-auth-token': mancToken } }
    );
    console.log('Manchester coords:', addMancLocRes.data.coordinates);

    await api.post('/provider/service',
      {
        serviceType: 'Management Referrals'
      },
      { headers: { 'x-auth-token': mancToken } }
    );

    // TEST 13: Submitting Referral from Buckingham Palace (London) for "Management Referrals"
    // Both London and Manchester providers offer "Management Referrals", but London is < 1 mile and Manchester is > 160 miles.
    // It should match the London provider because it's closest!
    console.log('\nTest 13: Submitting Referral from London (Expected closer London provider to be matched)...');
    const matchClosestRes = await api.post('/referrals',
      {
        businessLocationId,
        serviceType: 'Management Referrals'
      },
      { headers: { 'x-auth-token': bizToken } }
    );
    console.log('Status:', matchClosestRes.status);
    if (matchClosestRes.status !== 201) throw new Error('Referral creation failed');
    if (matchClosestRes.data.status !== 'matched') throw new Error('Should match');
    if (matchClosestRes.data.matchedProvider.companyName !== 'London Occupational Health') {
      throw new Error('Should have matched the London provider (closest)');
    }
    console.log('Closest provider matched successfully:', matchClosestRes.data.matchedProvider.companyName);

    // TEST 14: Submit Referral with a direct employee postcode in Manchester (M1 1AE)
    // The Manchester provider is ~0 miles away, the London provider is ~160 miles away (outside London provider's 30 miles coverage).
    // So it MUST match the Manchester provider!
    console.log('\nTest 14: Submitting Referral with direct Manchester employee postcode M1 1AE...');
    const matchMancRes = await api.post('/referrals',
      {
        businessLocationId,
        serviceType: 'Management Referrals',
        employeePostcode: 'M1 1AE'
      },
      { headers: { 'x-auth-token': bizToken } }
    );
    console.log('Status:', matchMancRes.status);
    console.log('Result payload:', matchMancRes.data);
    if (matchMancRes.status !== 201) throw new Error('Referral creation failed');
    if (matchMancRes.data.status !== 'matched') throw new Error('Should match Manchester provider');
    if (matchMancRes.data.matchedProvider.companyName !== 'Manchester Occupational Health') {
      throw new Error('Should have matched Manchester provider');
    }
    console.log('Matched Manchester provider successfully:', matchMancRes.data.matchedProvider);

    // TEST 15: Retrieve Referrals list for business
    console.log('\nTest 15: Retrieving business referrals list...');
    const listRefsRes = await api.get('/referrals', { headers: { 'x-auth-token': bizToken } });
    console.log('Status:', listRefsRes.status);
    console.log('Number of referrals:', listRefsRes.data.length);
    if (listRefsRes.status !== 200 || listRefsRes.data.length < 3) {
      throw new Error('Listing business referrals failed');
    }

    console.log('\n--- ALL INTEGRATION TESTS PASSED SUCCESSFULLY! ---');
    cleanup(0);
  } catch (error) {
    console.error('\n!!! TEST FAILURE !!!');
    console.error(error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    cleanup(1);
  }
}

function cleanup(exitCode) {
  console.log('Killing backend server...');
  serverProcess.kill('SIGTERM');
  setTimeout(() => {
    process.exit(exitCode);
  }, 500);
}

runTests();
