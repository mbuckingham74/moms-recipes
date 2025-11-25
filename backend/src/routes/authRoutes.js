const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { csrfProtection } = require('../middleware/csrf');

// Public routes
// Login doesn't need CSRF since it's the initial authentication
router.post('/login', authController.login);

// Logout and password change need CSRF protection
router.post('/logout', csrfProtection, authController.logout);

// Protected routes
router.get('/me', authenticate, authController.getCurrentUser);
router.post('/change-password', authenticate, csrfProtection, authController.changePassword);

module.exports = router;
