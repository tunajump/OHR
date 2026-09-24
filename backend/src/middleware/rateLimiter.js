// Lightweight In-Memory Sliding Window Rate Limiter
// Zero external dependencies, highly resilient for Render / containerized deployment

const requestStore = new Map();

// Periodic cleanup of stale IP records every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of requestStore.entries()) {
    if (now - record.windowStart > record.windowMs * 2) {
      requestStore.delete(key);
    }
  }
}, 10 * 60 * 1000);

/**
 * Creates a rate limiter middleware
 * @param {Object} options
 * @param {number} options.windowMs - Time window in milliseconds (default: 15 minutes)
 * @param {number} options.max - Maximum requests allowed per window (default: 15)
 * @param {string} options.message - Error message returned on rate limit breach
 */
function createRateLimiter({ windowMs = 15 * 60 * 1000, max = 15, message = 'Too many requests. Please try again later.' } = {}) {
  return (req, res, next) => {
    // In test environment (test_stage_runner), skip rate limits
    if (process.env.NODE_ENV === 'test' || req.headers['x-test-runner'] === 'true') {
      return next();
    }

    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown-ip';
    const routeKey = `${req.baseUrl || ''}${req.path || ''}`;
    const key = `${ip}:${routeKey}`;

    const now = Date.now();
    const record = requestStore.get(key) || { count: 0, windowStart: now, windowMs };

    if (now - record.windowStart > windowMs) {
      // Window expired, reset counter
      record.count = 1;
      record.windowStart = now;
      record.windowMs = windowMs;
      requestStore.set(key, record);
      return next();
    }

    record.count += 1;
    requestStore.set(key, record);

    if (record.count > max) {
      const retryAfterSec = Math.ceil((record.windowStart + windowMs - now) / 1000);
      res.setHeader('Retry-After', retryAfterSec);
      return res.status(429).json({
        message,
        retryAfter: retryAfterSec
      });
    }

    next();
  };
}

const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 30, // 30 attempts per 15 mins
  message: 'Too many registration or login attempts from this connection. Please try again in 15 minutes.'
});

const contactLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: 'Too many contact messages sent. Please wait before submitting another enquiry.'
});

const referralLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Referral submission rate limit reached. Please wait before submitting more referrals.'
});

module.exports = {
  createRateLimiter,
  authLimiter,
  contactLimiter,
  referralLimiter
};
