const jwt = require('jsonwebtoken');
const UserModel = require('../models/userModel');
const { ApiError, asyncHandler } = require('../middleware/errorHandler');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d'; // Token expires in 7 days

/**
 * Generate JWT token for user
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

/**
 * Login user
 * POST /api/auth/login
 */
exports.login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  // Validate input
  if (!username || !password) {
    throw new ApiError(400, 'Username and password are required');
  }

  // Verify credentials
  const user = await UserModel.verifyPassword(username, password);

  if (!user) {
    throw new ApiError(401, 'Invalid username or password');
  }

  // Generate token
  const token = generateToken(user);

  // Set token in httpOnly cookie
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  res.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      role: user.role
    }
  });
});

/**
 * Logout user
 * POST /api/auth/logout
 */
exports.logout = asyncHandler(async (req, res) => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out successfully' });
});

/**
 * Get current user
 * GET /api/auth/me
 */
exports.getCurrentUser = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, 'Not authenticated');
  }

  const user = await UserModel.findById(req.user.id);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  res.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    }
  });
});

/**
 * Change password
 * POST /api/auth/change-password
 */
exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new ApiError(400, 'Current password and new password are required');
  }

  if (newPassword.length < 8) {
    throw new ApiError(400, 'New password must be at least 8 characters');
  }

  // Verify current password
  const user = await UserModel.verifyPassword(req.user.username, currentPassword);

  if (!user) {
    throw new ApiError(401, 'Current password is incorrect');
  }

  // Update password
  await UserModel.updatePassword(req.user.id, newPassword);

  res.json({
    success: true,
    message: 'Password updated successfully'
  });
});
