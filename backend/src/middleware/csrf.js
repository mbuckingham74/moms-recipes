const { doubleCsrf } = require('csrf-csrf');
const { ApiError } = require('./errorHandler');

// Get CSRF secret from environment or generate warning
const getCsrfSecret = () => {
  const secret = process.env.CSRF_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      console.error('FATAL: CSRF_SECRET environment variable is required in production');
      console.error('Please set CSRF_SECRET to a secure random string (at least 32 characters)');
      process.exit(1);
    }
    console.warn('WARNING: CSRF_SECRET not set. Using insecure default for development only.');
    return 'dev-only-csrf-secret-do-not-use-in-production';
  }

  return secret;
};

const {
  generateCsrfToken,
  doubleCsrfProtection
} = doubleCsrf({
  getSecret: () => getCsrfSecret(),
  cookieName: '__Host-csrf',
  cookieOptions: {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/'
  },
  getTokenFromRequest: (req) => {
    // Check header first, then body
    return req.headers['x-csrf-token'] || req.body?._csrf;
  }
});

// Middleware to generate and send CSRF token
const csrfToken = (req, res, next) => {
  try {
    const token = generateCsrfToken(req, res);
    // Make token available for response
    res.locals.csrfToken = token;
    next();
  } catch (error) {
    next(new ApiError(500, 'Failed to generate CSRF token'));
  }
};

// Wrapper for double CSRF protection with better error handling
const csrfProtection = (req, res, next) => {
  doubleCsrfProtection(req, res, (err) => {
    if (err) {
      if (err.code === 'EBADCSRFTOKEN') {
        return next(new ApiError(403, 'Invalid or missing CSRF token'));
      }
      return next(err);
    }
    next();
  });
};

// Endpoint to get CSRF token
const getCsrfToken = (req, res) => {
  const token = generateCsrfToken(req, res);
  res.json({ csrfToken: token });
};

module.exports = {
  csrfToken,
  csrfProtection,
  getCsrfToken,
  generateCsrfToken
};
