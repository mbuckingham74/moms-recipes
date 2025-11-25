const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const savedRecipeController = require('../controllers/savedRecipeController');
const submittedRecipeController = require('../controllers/submittedRecipeController');
const { authenticate } = require('../middleware/auth');
const { csrfProtection } = require('../middleware/csrf');

// Public routes
router.post('/register', csrfProtection, userController.register);

// Protected routes (require authentication)
router.get('/profile', authenticate, userController.getProfile);
router.put('/profile', authenticate, csrfProtection, userController.updateProfile);
router.put('/preferences', authenticate, csrfProtection, userController.updatePreferences);

// Saved recipes routes
router.get('/saved-recipes', authenticate, savedRecipeController.getSavedRecipes);
router.get('/saved-recipes/ids', authenticate, savedRecipeController.getSavedRecipeIds);
router.get('/saved-recipes/:recipeId/check', authenticate, savedRecipeController.checkSaved);
router.post('/saved-recipes/:recipeId', authenticate, csrfProtection, savedRecipeController.saveRecipe);
router.delete('/saved-recipes/:recipeId', authenticate, csrfProtection, savedRecipeController.unsaveRecipe);

// Recipe submissions routes
router.get('/submissions', authenticate, submittedRecipeController.getMySubmissions);
router.get('/submissions/:id', authenticate, submittedRecipeController.getSubmission);
router.post('/submissions', authenticate, csrfProtection, submittedRecipeController.submitRecipe);
router.delete('/submissions/:id', authenticate, csrfProtection, submittedRecipeController.deleteSubmission);

module.exports = router;
