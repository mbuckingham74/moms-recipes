const express = require('express');
const RecipeController = require('../controllers/recipeController');

const router = express.Router();

// Recipe CRUD operations
router.post('/recipes', RecipeController.createRecipe);
router.get('/recipes', RecipeController.getAllRecipes);
router.get('/recipes/search', RecipeController.searchRecipes);
router.get('/recipes/:id', RecipeController.getRecipeById);
router.put('/recipes/:id', RecipeController.updateRecipe);
router.delete('/recipes/:id', RecipeController.deleteRecipe);

// Tags
router.get('/tags', RecipeController.getAllTags);

module.exports = router;
