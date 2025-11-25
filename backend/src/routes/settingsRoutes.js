const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { csrfProtection } = require('../middleware/csrf');

// All settings routes require admin authentication
router.use(authenticate);
router.use(requireAdmin);

// GET /api/admin/settings/ai - Get AI configuration
router.get('/ai', settingsController.getAISettings);

// PUT /api/admin/settings/ai - Update AI configuration
router.put('/ai', csrfProtection, settingsController.updateAISettings);

// POST /api/admin/settings/ai/test - Test AI connection
router.post('/ai/test', csrfProtection, settingsController.testAIConnection);

// DELETE /api/admin/settings/ai/api-key - Clear stored API key
router.delete('/ai/api-key', csrfProtection, settingsController.clearApiKey);

module.exports = router;
