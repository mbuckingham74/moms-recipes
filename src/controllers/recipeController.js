const RecipeModel = require('../models/recipeModel');

// Validation helper
const validateRecipeInput = (data, isUpdate = false) => {
  const errors = [];

  // Title validation (required for create, optional for update)
  if (!isUpdate) {
    if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
      errors.push('Title is required and must be a non-empty string');
    }
  } else if (data.title !== undefined) {
    if (typeof data.title !== 'string' || data.title.trim().length === 0) {
      errors.push('Title must be a non-empty string');
    }
  }

  if (data.title && data.title.length > 500) {
    errors.push('Title must be less than 500 characters');
  }

  if (data.ingredients && !Array.isArray(data.ingredients)) {
    errors.push('Ingredients must be an array');
  }

  if (data.tags && !Array.isArray(data.tags)) {
    errors.push('Tags must be an array');
  }

  if (data.ingredients && data.ingredients.length > 100) {
    errors.push('Maximum 100 ingredients allowed');
  }

  if (data.tags && data.tags.length > 50) {
    errors.push('Maximum 50 tags allowed');
  }

  return errors;
};

class RecipeController {
  // Create a new recipe
  static createRecipe(req, res) {
    try {
      const { title, source, instructions, imagePath, ingredients, tags } = req.body;

      const validationErrors = validateRecipeInput(req.body);
      if (validationErrors.length > 0) {
        return res.status(400).json({ errors: validationErrors });
      }

      const recipe = RecipeModel.create({
        title: title.trim(),
        source: source ? source.trim() : null,
        instructions,
        imagePath,
        ingredients: ingredients || [],
        tags: tags || []
      });

      res.status(201).json({
        message: 'Recipe created successfully',
        recipe
      });
    } catch (error) {
      console.error('Error creating recipe:', error);
      res.status(500).json({ error: 'Failed to create recipe' });
    }
  }

  // Get all recipes
  static getAllRecipes(req, res) {
    try {
      let limit = parseInt(req.query.limit) || 50;
      let offset = parseInt(req.query.offset) || 0;

      // Validate pagination parameters
      if (isNaN(limit) || limit < 1) limit = 50;
      if (isNaN(offset) || offset < 0) offset = 0;

      const recipes = RecipeModel.getAll(limit, offset);
      const total = RecipeModel.getCount();

      res.json({
        recipes,
        pagination: {
          limit: Math.min(limit, 100), // Return actual capped limit
          offset,
          total
        }
      });
    } catch (error) {
      console.error('Error fetching recipes:', error);
      res.status(500).json({ error: 'Failed to fetch recipes' });
    }
  }

  // Get recipe by ID
  static getRecipeById(req, res) {
    try {
      const { id } = req.params;
      const recipe = RecipeModel.getById(id);

      if (!recipe) {
        return res.status(404).json({ error: 'Recipe not found' });
      }

      res.json({ recipe });
    } catch (error) {
      console.error('Error fetching recipe:', error);
      res.status(500).json({ error: 'Failed to fetch recipe' });
    }
  }

  // Search recipes
  static searchRecipes(req, res) {
    try {
      const { title, ingredient, ingredients, tags } = req.query;
      let recipes = [];

      if (title) {
        recipes = RecipeModel.searchByTitle(title);
      } else if (ingredient) {
        recipes = RecipeModel.searchByIngredient(ingredient);
      } else if (ingredients) {
        const ingredientList = ingredients.split(',').map(i => i.trim());
        recipes = RecipeModel.searchByIngredients(ingredientList);
      } else if (tags) {
        const tagList = tags.split(',').map(t => t.trim());
        recipes = RecipeModel.filterByTags(tagList);
      } else {
        return res.status(400).json({
          error: 'Please provide at least one search parameter: title, ingredient, ingredients, or tags'
        });
      }

      res.json({
        count: recipes.length,
        recipes
      });
    } catch (error) {
      console.error('Error searching recipes:', error);
      res.status(500).json({ error: 'Failed to search recipes' });
    }
  }

  // Update recipe
  static updateRecipe(req, res) {
    try {
      const { id } = req.params;
      const { title, source, instructions, imagePath, ingredients, tags } = req.body;

      const existingRecipe = RecipeModel.getById(id);
      if (!existingRecipe) {
        return res.status(404).json({ error: 'Recipe not found' });
      }

      // Validate update data
      const validationErrors = validateRecipeInput(req.body, true);
      if (validationErrors.length > 0) {
        return res.status(400).json({ errors: validationErrors });
      }

      const recipe = RecipeModel.update(id, {
        title: title !== undefined ? title.trim() : existingRecipe.title,
        source: source !== undefined ? (source ? source.trim() : null) : existingRecipe.source,
        instructions: instructions !== undefined ? instructions : existingRecipe.instructions,
        imagePath: imagePath !== undefined ? imagePath : existingRecipe.imagePath,
        ingredients,
        tags
      });

      res.json({
        message: 'Recipe updated successfully',
        recipe
      });
    } catch (error) {
      console.error('Error updating recipe:', error);
      res.status(500).json({ error: 'Failed to update recipe' });
    }
  }

  // Delete recipe
  static deleteRecipe(req, res) {
    try {
      const { id } = req.params;
      const deleted = RecipeModel.delete(id);

      if (!deleted) {
        return res.status(404).json({ error: 'Recipe not found' });
      }

      res.json({ message: 'Recipe deleted successfully' });
    } catch (error) {
      console.error('Error deleting recipe:', error);
      res.status(500).json({ error: 'Failed to delete recipe' });
    }
  }

  // Get all tags
  static getAllTags(req, res) {
    try {
      const tags = RecipeModel.getAllTags();
      res.json({ tags: tags.map(t => t.name) });
    } catch (error) {
      console.error('Error fetching tags:', error);
      res.status(500).json({ error: 'Failed to fetch tags' });
    }
  }
}

module.exports = RecipeController;
