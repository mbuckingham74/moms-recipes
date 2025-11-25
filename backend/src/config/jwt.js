// JWT configuration - centralized to avoid duplication and ensure security

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      console.error('FATAL: JWT_SECRET environment variable is required in production');
      console.error('Please set JWT_SECRET to a secure random string (at least 32 characters)');
      process.exit(1);
    }
    // In development/test, warn but allow a default for convenience
    console.warn('WARNING: JWT_SECRET not set. Using insecure default for development only.');
    return 'dev-only-insecure-secret-do-not-use-in-production';
  }

  // Validate secret strength in production
  if (process.env.NODE_ENV === 'production' && secret.length < 32) {
    console.error('FATAL: JWT_SECRET must be at least 32 characters in production');
    process.exit(1);
  }

  return secret;
};

const JWT_SECRET = getJwtSecret();
const JWT_EXPIRES_IN = '7d'; // Token expires in 7 days

module.exports = {
  JWT_SECRET,
  JWT_EXPIRES_IN
};
