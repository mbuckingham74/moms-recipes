const express = require('express');
const router = express.Router();
const pdfController = require('../controllers/pdfController');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { uploadPDF, handleMulterError } = require('../middleware/upload');

// All routes require admin authentication
router.use(authenticate);
router.use(requireAdmin);

// Upload and parse PDF
router.post('/upload-pdf', uploadPDF.single('pdf'), handleMulterError, pdfController.uploadAndParse);

// Pending recipes management
router.get('/pending-recipes', pdfController.getPendingRecipes);
router.get('/pending-recipes/:id', pdfController.getPendingRecipe);
router.put('/pending-recipes/:id', pdfController.updatePendingRecipe);
router.delete('/pending-recipes/:id', pdfController.deletePendingRecipe);
router.post('/pending-recipes/:id/approve', pdfController.approvePendingRecipe);

module.exports = router;
