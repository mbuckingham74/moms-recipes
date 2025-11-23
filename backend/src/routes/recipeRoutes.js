const express = require('express');
const RecipeController = require('../controllers/recipeController');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Public routes (read-only)
router.get('/recipes', RecipeController.getAllRecipes);
router.get('/recipes/search', RecipeController.searchRecipes);
router.get('/recipes/:id', RecipeController.getRecipeById);

// Admin-only routes (require authentication)
router.post('/recipes', authenticate, requireAdmin, RecipeController.createRecipe);
router.put('/recipes/:id', authenticate, requireAdmin, RecipeController.updateRecipe);
router.delete('/recipes/:id', authenticate, requireAdmin, RecipeController.deleteRecipe);

// Tags
router.get('/tags', RecipeController.getAllTags);

module.exports = router;
