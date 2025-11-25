const jwt = require('jsonwebtoken');
const { ApiError } = require('./errorHandler');
const { JWT_SECRET } = require('../config/jwt');

/**
 * Authenticate user from JWT token in cookie
 * Adds user object to req.user
 */
exports.authenticate = (req, res, next) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      throw new ApiError(401, 'Authentication required');
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Add user to request
    req.user = {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      next(new ApiError(401, 'Invalid token'));
    } else if (error.name === 'TokenExpiredError') {
      next(new ApiError(401, 'Token expired'));
    } else {
      next(error);
    }
  }
};

/**
 * Require admin role
 * Must be used after authenticate middleware
 */
exports.requireAdmin = (req, res, next) => {
  if (!req.user) {
    return next(new ApiError(401, 'Authentication required'));
  }

  if (req.user.role !== 'admin') {
    return next(new ApiError(403, 'Admin access required'));
  }

  next();
};

/**
 * Optional authentication
 * Adds user to req.user if token exists, but doesn't fail if no token
 */
exports.optionalAuth = (req, res, next) => {
  try {
    const token = req.cookies.token;

    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = {
        id: decoded.id,
        username: decoded.username,
        role: decoded.role
      };
    }

    next();
  } catch (error) {
    // Silently fail - just don't set req.user
    next();
  }
};
