const axios = require('axios');
const bcrypt = require('bcryptjs');

const PORT = '5057';
process.env.PORT = PORT;
process.env.DB_HOST = 'force_mock_db';

console.log('Starting backend server for Sequelize Migration tests in-process on port', PORT);
// Import the server to run it inside the same process
require('./src/server.js');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTests() {
  const api = axios.create({
    baseURL: `http://localhost:${PORT}/api`,
    validateStatus: () => true
  });

  try {
    await sleep(2000);

    console.log('\n--- Running Sequelize User Migration Verification Tests ---\n');

    // 1. Register with a custom password
    console.log('Test 1: Registering a user with a unique custom password...');
    const signupRes = await api.post('/register', {
      email: 'custom_user@example.com',
      password: 'MySecretPassword123!',
      userType: 'business'
    });
    console.log('Status (expected 201):', signupRes.status);
    if (signupRes.status !== 201) throw new Error('Registration failed');

    // 2. Try to log in with the default/old fallback password ('password') - should fail!
    console.log('Test 2: Logging in with the old default fallback password ("password") - should be rejected...');
    const loginFailRes = await api.post('/login', {
      email: 'custom_user@example.com',
      password: 'password'
    });
    console.log('Status (expected 400):', loginFailRes.status);
    if (loginFailRes.status !== 400) throw new Error('Allowed login with default password!');
    console.log('Login correctly rejected with message:', loginFailRes.data.message);

    // 3. Log in with the correct custom password - should succeed!
    console.log('Test 3: Logging in with the actual custom password...');
    const loginSuccessRes = await api.post('/login', {
      email: 'custom_user@example.com',
      password: 'MySecretPassword123!'
    });
    console.log('Status (expected 200):', loginSuccessRes.status);
    if (loginSuccessRes.status !== 200) throw new Error('Login with custom password failed!');
    console.log('Successfully logged in. User Type from response:', loginSuccessRes.data.userType);

    // 4. Confirm that the password in database is NOT 'password' and is hashed
    // Since we are running in the same process, we can require the pool and access memoryDb
    const pool = require('./src/utils/db');
    const storedUser = pool.memoryDb.Users.find(u => u.email === 'custom_user@example.com');
    if (!storedUser) throw new Error('User not found in memory database!');

    console.log('Test 4: Verifying database record...');
    console.log('Is password hashed with bcrypt (length > 50)?', storedUser.password.length > 50);
    if (storedUser.password.length <= 50) throw new Error('Stored password is not hashed!');

    const isMatchWithDefault = await bcrypt.compare('password', storedUser.password);
    console.log('Is stored password matching "password"?', isMatchWithDefault);
    if (isMatchWithDefault) throw new Error('Stored password matches default fallback instead of the custom password!');

    const isMatchWithCustom = await bcrypt.compare('MySecretPassword123!', storedUser.password);
    console.log('Is stored password matching custom password?', isMatchWithCustom);
    if (!isMatchWithCustom) throw new Error('Stored password does not match custom password!');

    console.log('\n--- ALL SEQUELIZE USER MIGRATION VERIFICATION TESTS PASSED SUCCESSFULLY! ---');
    process.exit(0);
  } catch (err) {
    console.error('\n!!! VERIFICATION TEST FAILURE !!!');
    console.error(err.message);
    process.exit(1);
  }
}

runTests();
