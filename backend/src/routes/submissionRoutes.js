const express = require('express');
const router = express.Router();
const submittedRecipeController = require('../controllers/submittedRecipeController');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { csrfProtection } = require('../middleware/csrf');

// All routes require admin authentication
router.use(authenticate, requireAdmin);

// Get submission counts
router.get('/count', submittedRecipeController.getPendingCount);

// Get all submissions (with optional status filter)
router.get('/', submittedRecipeController.getAllSubmissions);

// Get pending submissions
router.get('/pending', submittedRecipeController.getPendingSubmissions);

// Get specific submission for review
router.get('/:id', submittedRecipeController.getSubmissionForReview);

// Approve submission
router.post('/:id/approve', csrfProtection, submittedRecipeController.approveSubmission);

// Reject submission
router.post('/:id/reject', csrfProtection, submittedRecipeController.rejectSubmission);

module.exports = router;
