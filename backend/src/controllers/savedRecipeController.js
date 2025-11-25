const SavedRecipeModel = require('../models/savedRecipeModel');
const { ApiError, asyncHandler } = require('../middleware/errorHandler');

/**
 * Save a recipe for the current user
 * POST /api/users/saved-recipes/:recipeId
 */
exports.saveRecipe = asyncHandler(async (req, res) => {
  const { recipeId } = req.params;
  const userId = req.user.id;

  // Check if already saved
  const alreadySaved = await SavedRecipeModel.isSaved(userId, recipeId);
  if (alreadySaved) {
    throw new ApiError(409, 'Recipe is already saved');
  }

  try {
    await SavedRecipeModel.save(userId, recipeId);
  } catch (error) {
    // Handle foreign key constraint (recipe doesn't exist)
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      throw new ApiError(404, 'Recipe not found');
    }
    throw error;
  }

  res.status(201).json({
    success: true,
    message: 'Recipe saved successfully'
  });
});

/**
 * Unsave a recipe for the current user
 * DELETE /api/users/saved-recipes/:recipeId
 */
exports.unsaveRecipe = asyncHandler(async (req, res) => {
  const { recipeId } = req.params;
  const userId = req.user.id;

  const removed = await SavedRecipeModel.unsave(userId, recipeId);

  if (!removed) {
    throw new ApiError(404, 'Recipe was not saved');
  }

  res.json({
    success: true,
    message: 'Recipe removed from saved recipes'
  });
});

/**
 * Get all saved recipes for the current user
 * GET /api/users/saved-recipes
 */
exports.getSavedRecipes = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
  const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

  const { recipes, total } = await SavedRecipeModel.getByUserId(userId, { limit, offset });

  res.json({
    success: true,
    recipes,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + recipes.length < total
    }
  });
});

/**
 * Check if a recipe is saved by the current user
 * GET /api/users/saved-recipes/:recipeId/check
 */
exports.checkSaved = asyncHandler(async (req, res) => {
  const { recipeId } = req.params;
  const userId = req.user.id;

  const isSaved = await SavedRecipeModel.isSaved(userId, recipeId);

  res.json({
    success: true,
    isSaved
  });
});

/**
 * Get saved recipe IDs for the current user (for bulk checking)
 * GET /api/users/saved-recipes/ids
 */
exports.getSavedRecipeIds = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const savedIds = await SavedRecipeModel.getSavedRecipeIds(userId);

  res.json({
    success: true,
    savedIds
  });
});
