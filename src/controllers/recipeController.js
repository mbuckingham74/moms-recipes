const RecipeModel = require('../models/recipeModel');

class RecipeController {
  // Create a new recipe
  static createRecipe(req, res) {
    try {
      const { title, source, instructions, imagePath, ingredients, tags } = req.body;

      if (!title) {
        return res.status(400).json({ error: 'Title is required' });
      }

      const recipe = RecipeModel.create({
        title,
        source,
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
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;

      const recipes = RecipeModel.getAll(limit, offset);
      const total = RecipeModel.getCount();

      res.json({
        recipes,
        pagination: {
          limit,
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

      const recipe = RecipeModel.update(id, {
        title: title !== undefined ? title : existingRecipe.title,
        source: source !== undefined ? source : existingRecipe.source,
        instructions: instructions !== undefined ? instructions : existingRecipe.instructions,
        imagePath: imagePath !== undefined ? imagePath : existingRecipe.image_path,
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
