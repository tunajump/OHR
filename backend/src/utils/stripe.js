const Stripe = require('stripe');

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16'
});

module.exports = stripe;
