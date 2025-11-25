const jwt = require('jsonwebtoken');
const UserModel = require('../models/userModel');
const { ApiError, asyncHandler } = require('../middleware/errorHandler');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/jwt');

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
 * Validate email format
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Register a new user
 * POST /api/users/register
 */
exports.register = asyncHandler(async (req, res) => {
  const { username, email, password, confirmPassword } = req.body;

  // Validate required fields
  if (!username || !email || !password) {
    throw new ApiError(400, 'Username, email, and password are required');
  }

  // Validate email format
  if (!isValidEmail(email)) {
    throw new ApiError(400, 'Invalid email format');
  }

  // Validate password length
  if (password.length < 8) {
    throw new ApiError(400, 'Password must be at least 8 characters');
  }

  // Validate password confirmation
  if (password !== confirmPassword) {
    throw new ApiError(400, 'Passwords do not match');
  }

  // Validate username format (alphanumeric and underscores only)
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    throw new ApiError(400, 'Username can only contain letters, numbers, and underscores');
  }

  // Validate username length
  if (username.length < 3 || username.length > 50) {
    throw new ApiError(400, 'Username must be between 3 and 50 characters');
  }

  // Check if username exists
  const usernameExists = await UserModel.usernameExists(username);
  if (usernameExists) {
    throw new ApiError(409, 'Username is already taken');
  }

  // Check if email exists
  const emailExists = await UserModel.emailExists(email);
  if (emailExists) {
    throw new ApiError(409, 'Email is already registered');
  }

  // Create user with 'viewer' role (regular user)
  const userId = await UserModel.create({
    username,
    email,
    password,
    role: 'viewer'
  });

  // Get created user
  const user = await UserModel.findById(userId);

  // Generate token
  const token = generateToken(user);

  // Set token in httpOnly cookie
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  });

  res.status(201).json({
    success: true,
    message: 'Registration successful',
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    }
  });
});

/**
 * Get current user's profile
 * GET /api/users/profile
 */
exports.getProfile = asyncHandler(async (req, res) => {
  const user = await UserModel.findById(req.user.id);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const preferences = await UserModel.getPreferences(req.user.id);

  res.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      createdAt: user.created_at
    },
    preferences: preferences ? {
      theme: preferences.theme
    } : {
      theme: 'light'
    }
  });
});

/**
 * Update current user's profile
 * PUT /api/users/profile
 */
exports.updateProfile = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (email) {
    // Validate email format
    if (!isValidEmail(email)) {
      throw new ApiError(400, 'Invalid email format');
    }

    // Check if email is taken by another user
    const existingUser = await UserModel.findByEmail(email);
    if (existingUser && existingUser.id !== req.user.id) {
      throw new ApiError(409, 'Email is already in use');
    }

    await UserModel.updateProfile(req.user.id, { email });
  }

  const user = await UserModel.findById(req.user.id);

  res.json({
    success: true,
    message: 'Profile updated successfully',
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    }
  });
});

/**
 * Update current user's preferences
 * PUT /api/users/preferences
 */
exports.updatePreferences = asyncHandler(async (req, res) => {
  const { theme } = req.body;

  // Validate theme
  const validThemes = ['light', 'dark', 'system'];
  if (theme && !validThemes.includes(theme)) {
    throw new ApiError(400, `Invalid theme. Must be one of: ${validThemes.join(', ')}`);
  }

  if (theme) {
    await UserModel.updatePreferences(req.user.id, { theme });
  }

  const preferences = await UserModel.getPreferences(req.user.id);

  res.json({
    success: true,
    message: 'Preferences updated successfully',
    preferences: {
      theme: preferences?.theme || 'light'
    }
  });
});
