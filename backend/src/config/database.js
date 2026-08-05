const { Sequelize } = require('sequelize');

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

const dialectOptions = {};
const sslConfig = getSSLConfig();
if (sslConfig) {
  dialectOptions.ssl = sslConfig;
}

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  dialect: 'mysql',
  logging: false, // set to console.log to see the raw SQL queries
  dialectOptions
});

module.exports = sequelize;