const RecipeModel = require('../models/recipeModel');

// Helper to normalize and dedupe tags
const normalizeTags = (tags) => {
  if (!Array.isArray(tags)) return tags;

  // Trim, lowercase, and filter out empty strings
  const normalized = tags
    .map(tag => typeof tag === 'string' ? tag.trim().toLowerCase() : tag)
    .filter(tag => tag.length > 0);

  // Remove duplicates
  return [...new Set(normalized)];
};

// Helper to normalize ingredients
const normalizeIngredients = (ingredients) => {
  if (!Array.isArray(ingredients)) return ingredients;

  return ingredients.map(ingredient => ({
    name: ingredient.name ? ingredient.name.trim() : ingredient.name,
    quantity: ingredient.quantity ? ingredient.quantity.trim() : ingredient.quantity,
    unit: ingredient.unit ? ingredient.unit.trim() : ingredient.unit
  }));
};

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

  // Ingredients validation
  if (data.ingredients !== undefined) {
    if (!Array.isArray(data.ingredients)) {
      errors.push('Ingredients must be an array');
    } else {
      if (data.ingredients.length > 100) {
        errors.push('Maximum 100 ingredients allowed');
      }

      // Validate each ingredient
      data.ingredients.forEach((ingredient, index) => {
        if (typeof ingredient !== 'object' || ingredient === null || Array.isArray(ingredient)) {
          errors.push(`Ingredient at index ${index} must be an object`);
          return;
        }

        // name is required and must be a non-empty string
        if (!ingredient.name || typeof ingredient.name !== 'string' || ingredient.name.trim().length === 0) {
          errors.push(`Ingredient at index ${index} must have a non-empty 'name' string`);
        } else if (ingredient.name.length > 200) {
          errors.push(`Ingredient name at index ${index} must be less than 200 characters`);
        }

        // quantity is optional but must be a string if provided
        if (ingredient.quantity !== undefined && ingredient.quantity !== null) {
          if (typeof ingredient.quantity !== 'string') {
            errors.push(`Ingredient quantity at index ${index} must be a string`);
          } else if (ingredient.quantity.length > 50) {
            errors.push(`Ingredient quantity at index ${index} must be less than 50 characters`);
          }
        }

        // unit is optional but must be a string if provided
        if (ingredient.unit !== undefined && ingredient.unit !== null) {
          if (typeof ingredient.unit !== 'string') {
            errors.push(`Ingredient unit at index ${index} must be a string`);
          } else if (ingredient.unit.length > 50) {
            errors.push(`Ingredient unit at index ${index} must be less than 50 characters`);
          }
        }
      });
    }
  }

  // Tags validation
  if (data.tags !== undefined) {
    if (!Array.isArray(data.tags)) {
      errors.push('Tags must be an array');
    } else {
      if (data.tags.length > 50) {
        errors.push('Maximum 50 tags allowed');
      }

      // Validate each tag
      data.tags.forEach((tag, index) => {
        if (typeof tag !== 'string') {
          errors.push(`Tag at index ${index} must be a string`);
        } else if (tag.trim().length === 0) {
          errors.push(`Tag at index ${index} cannot be empty`);
        } else if (tag.length > 100) {
          errors.push(`Tag at index ${index} must be less than 100 characters`);
        }
      });
    }
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
        ingredients: normalizeIngredients(ingredients || []),
        tags: normalizeTags(tags || [])
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
        ingredients: ingredients !== undefined ? normalizeIngredients(ingredients) : undefined,
        tags: tags !== undefined ? normalizeTags(tags) : undefined
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
