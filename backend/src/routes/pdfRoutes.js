const express = require('express');
const router = express.Router();
const pdfController = require('../controllers/pdfController');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { uploadPDF, handleMulterError } = require('../middleware/upload');
const { csrfProtection } = require('../middleware/csrf');

// All routes require admin authentication
router.use(authenticate);
router.use(requireAdmin);

// Upload and parse PDF (state-changing, needs CSRF)
router.post('/upload-pdf', csrfProtection, uploadPDF.single('pdf'), handleMulterError, pdfController.uploadAndParse);

// Import recipe from URL (state-changing, needs CSRF)
router.post('/import-url', csrfProtection, pdfController.importFromUrl);

// Pending recipes management
router.get('/pending-recipes', pdfController.getPendingRecipes);
router.get('/pending-recipes/:id', pdfController.getPendingRecipe);
router.put('/pending-recipes/:id', csrfProtection, pdfController.updatePendingRecipe);
router.delete('/pending-recipes/:id', csrfProtection, pdfController.deletePendingRecipe);
router.post('/pending-recipes/:id/approve', csrfProtection, pdfController.approvePendingRecipe);

module.exports = router;
