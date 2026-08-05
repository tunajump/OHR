const assert = require('assert');

function clearCache() {
  delete require.cache[require.resolve('./src/config/database')];
  delete require.cache[require.resolve('./src/utils/db')];
}

console.log('--- Starting DB TLS/SSL Configuration Tests ---');

// Test Case 1: Default behavior (no environment variables set)
console.log('Test Case 1: Verifying default SSL behavior...');
delete process.env.DB_SSL;
delete process.env.DB_SSL_REJECT_UNAUTHORIZED;
delete process.env.DB_SSL_CA;
delete process.env.DB_SSL_CERT;
delete process.env.DB_SSL_KEY;
clearCache();

const sequelizeDefault = require('./src/config/database');
const poolDefault = require('./src/utils/db');

// In Sequelize, dialectOptions.ssl should default to { rejectUnauthorized: false }
assert.deepStrictEqual(
  sequelizeDefault.options.dialectOptions.ssl,
  { rejectUnauthorized: false },
  'Sequelize default SSL should have rejectUnauthorized: false'
);
// In raw query pool, poolConfig.ssl should default to { rejectUnauthorized: false }
assert.deepStrictEqual(
  poolDefault.poolConfig.ssl,
  { rejectUnauthorized: false },
  'Pool config default SSL should have rejectUnauthorized: false'
);
console.log('✔ Test Case 1 Passed: Default self-signed TLS active.');


// Test Case 2: SSL explicitly disabled via DB_SSL=false
console.log('Test Case 2: Verifying DB_SSL=false behavior...');
process.env.DB_SSL = 'false';
clearCache();

const sequelizeDisabled = require('./src/config/database');
const poolDisabled = require('./src/utils/db');

// In Sequelize, dialectOptions.ssl should be undefined when DB_SSL is false
assert.strictEqual(
  sequelizeDisabled.options.dialectOptions.ssl,
  undefined,
  'Sequelize SSL should be undefined/disabled when DB_SSL=false'
);
// In raw query pool, poolConfig.ssl should be undefined when DB_SSL is false
assert.strictEqual(
  poolDisabled.poolConfig.ssl,
  undefined,
  'Pool config SSL should be undefined/disabled when DB_SSL=false'
);
console.log('✔ Test Case 2 Passed: TLS can be disabled successfully.');


// Test Case 3: SSL customization (rejectUnauthorized = true, custom CA)
console.log('Test Case 3: Verifying customized SSL configuration...');
process.env.DB_SSL = 'true';
process.env.DB_SSL_REJECT_UNAUTHORIZED = 'true';
process.env.DB_SSL_CA = '/path/to/ca.pem';
process.env.DB_SSL_CERT = '/path/to/cert.pem';
process.env.DB_SSL_KEY = '/path/to/key.pem';
clearCache();

const sequelizeCustom = require('./src/config/database');
const poolCustom = require('./src/utils/db');

const expectedSSL = {
  rejectUnauthorized: true,
  ca: '/path/to/ca.pem',
  cert: '/path/to/cert.pem',
  key: '/path/to/key.pem'
};

assert.deepStrictEqual(
  sequelizeCustom.options.dialectOptions.ssl,
  expectedSSL,
  'Sequelize did not match custom SSL environment variables'
);
assert.deepStrictEqual(
  poolCustom.poolConfig.ssl,
  expectedSSL,
  'Pool config did not match custom SSL environment variables'
);
console.log('✔ Test Case 3 Passed: Dynamic SSL customizations successfully loaded.');

console.log('\n--- ALL DB TLS/SSL CONFIGURATION TESTS PASSED! ---');
process.exit(0);
