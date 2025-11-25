const express = require('express');
const RecipeController = require('../controllers/recipeController');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { csrfProtection } = require('../middleware/csrf');

const router = express.Router();

// Public routes (read-only)
router.get('/recipes', RecipeController.getAllRecipes);
router.get('/recipes/search', RecipeController.searchRecipes);
router.get('/recipes/:id', RecipeController.getRecipeById);

// Admin-only routes (require authentication and CSRF)
router.post('/recipes', authenticate, requireAdmin, csrfProtection, RecipeController.createRecipe);
router.put('/recipes/:id', authenticate, requireAdmin, csrfProtection, RecipeController.updateRecipe);
router.delete('/recipes/:id', authenticate, requireAdmin, csrfProtection, RecipeController.deleteRecipe);
router.post('/recipes/:id/estimate-calories', authenticate, requireAdmin, csrfProtection, RecipeController.estimateCalories);

// Dashboard stats (admin-only, read-only so no CSRF needed)
router.get('/admin/stats', authenticate, requireAdmin, RecipeController.getDashboardStats);

// Admin recipe list for table view (admin-only, read-only so no CSRF needed)
router.get('/admin/recipes', authenticate, requireAdmin, RecipeController.getAdminRecipeList);

// Increment times cooked (admin-only, requires CSRF)
router.post('/recipes/:id/cooked', authenticate, requireAdmin, csrfProtection, RecipeController.incrementTimesCooked);

// Tags (public, read-only)
router.get('/tags', RecipeController.getAllTags);

module.exports = router;
