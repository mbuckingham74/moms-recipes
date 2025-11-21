const db = require('../config/database');

class RecipeModel {
  // Create a new recipe with ingredients and tags
  static create(recipeData) {
    const { title, source, instructions, imagePath, ingredients, tags } = recipeData;

    const insert = db.transaction(() => {
      // Insert recipe
      const recipeStmt = db.prepare(`
        INSERT INTO recipes (title, source, instructions, image_path)
        VALUES (?, ?, ?, ?)
      `);
      const result = recipeStmt.run(title, source, instructions, imagePath);
      const recipeId = result.lastInsertRowid;

      // Insert ingredients
      if (ingredients && ingredients.length > 0) {
        const ingredientStmt = db.prepare(`
          INSERT INTO ingredients (recipe_id, name, quantity, unit, position)
          VALUES (?, ?, ?, ?, ?)
        `);
        ingredients.forEach((ing, index) => {
          ingredientStmt.run(
            recipeId,
            ing.name,
            ing.quantity || null,
            ing.unit || null,
            index
          );
        });
      }

      // Insert tags
      if (tags && tags.length > 0) {
        const tagStmt = db.prepare(`
          INSERT OR IGNORE INTO tags (name) VALUES (?)
        `);
        const getTagStmt = db.prepare(`SELECT id FROM tags WHERE name = ?`);
        const recipeTagStmt = db.prepare(`
          INSERT INTO recipe_tags (recipe_id, tag_id) VALUES (?, ?)
        `);

        tags.forEach(tagName => {
          tagStmt.run(tagName);
          const tag = getTagStmt.get(tagName);
          recipeTagStmt.run(recipeId, tag.id);
        });
      }

      return recipeId;
    });

    const recipeId = insert();
    return this.getById(recipeId);
  }

  // Get recipe by ID with all related data
  static getById(id) {
    const recipe = db.prepare(`
      SELECT * FROM recipes WHERE id = ?
    `).get(id);

    if (!recipe) return null;

    // Get ingredients
    const ingredients = db.prepare(`
      SELECT name, quantity, unit, position
      FROM ingredients
      WHERE recipe_id = ?
      ORDER BY position
    `).all(id);

    // Get tags
    const tags = db.prepare(`
      SELECT t.name
      FROM tags t
      JOIN recipe_tags rt ON t.id = rt.tag_id
      WHERE rt.recipe_id = ?
    `).all(id);

    return {
      ...recipe,
      ingredients,
      tags: tags.map(t => t.name)
    };
  }

  // Get all recipes with optional pagination
  static getAll(limit = 50, offset = 0) {
    const recipes = db.prepare(`
      SELECT id, title, source, date_added, image_path
      FROM recipes
      ORDER BY date_added DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);

    return recipes.map(recipe => ({
      ...recipe,
      tags: this.getRecipeTags(recipe.id)
    }));
  }

  // Search recipes by ingredient
  static searchByIngredient(ingredientName) {
    const recipes = db.prepare(`
      SELECT DISTINCT r.id, r.title, r.source, r.date_added, r.image_path
      FROM recipes r
      JOIN ingredients i ON r.id = i.recipe_id
      WHERE i.name LIKE ?
      ORDER BY r.date_added DESC
    `).all(`%${ingredientName}%`);

    return recipes.map(recipe => ({
      ...recipe,
      tags: this.getRecipeTags(recipe.id)
    }));
  }

  // Search recipes by multiple ingredients (recipes containing ALL specified ingredients)
  static searchByIngredients(ingredientNames) {
    if (!ingredientNames || ingredientNames.length === 0) {
      return [];
    }

    const placeholders = ingredientNames.map(() => '?').join(',');
    const recipes = db.prepare(`
      SELECT r.id, r.title, r.source, r.date_added, r.image_path
      FROM recipes r
      WHERE r.id IN (
        SELECT recipe_id
        FROM ingredients
        WHERE name IN (${placeholders})
        GROUP BY recipe_id
        HAVING COUNT(DISTINCT name) = ?
      )
      ORDER BY r.date_added DESC
    `).all(...ingredientNames, ingredientNames.length);

    return recipes.map(recipe => ({
      ...recipe,
      tags: this.getRecipeTags(recipe.id)
    }));
  }

  // Filter recipes by tags
  static filterByTags(tagNames) {
    if (!tagNames || tagNames.length === 0) {
      return [];
    }

    const placeholders = tagNames.map(() => '?').join(',');
    const recipes = db.prepare(`
      SELECT DISTINCT r.id, r.title, r.source, r.date_added, r.image_path
      FROM recipes r
      JOIN recipe_tags rt ON r.id = rt.recipe_id
      JOIN tags t ON rt.tag_id = t.id
      WHERE t.name IN (${placeholders})
      ORDER BY r.date_added DESC
    `).all(...tagNames);

    return recipes.map(recipe => ({
      ...recipe,
      tags: this.getRecipeTags(recipe.id)
    }));
  }

  // Search recipes by title
  static searchByTitle(title) {
    const recipes = db.prepare(`
      SELECT id, title, source, date_added, image_path
      FROM recipes
      WHERE title LIKE ?
      ORDER BY date_added DESC
    `).all(`%${title}%`);

    return recipes.map(recipe => ({
      ...recipe,
      tags: this.getRecipeTags(recipe.id)
    }));
  }

  // Update recipe
  static update(id, recipeData) {
    const { title, source, instructions, imagePath, ingredients, tags } = recipeData;

    const update = db.transaction(() => {
      // Update recipe
      const updateStmt = db.prepare(`
        UPDATE recipes
        SET title = ?, source = ?, instructions = ?, image_path = ?, updated_at = strftime('%s', 'now')
        WHERE id = ?
      `);
      updateStmt.run(title, source, instructions, imagePath, id);

      // Delete and re-insert ingredients if provided
      if (ingredients !== undefined) {
        db.prepare('DELETE FROM ingredients WHERE recipe_id = ?').run(id);

        if (ingredients.length > 0) {
          const ingredientStmt = db.prepare(`
            INSERT INTO ingredients (recipe_id, name, quantity, unit, position)
            VALUES (?, ?, ?, ?, ?)
          `);
          ingredients.forEach((ing, index) => {
            ingredientStmt.run(
              id,
              ing.name,
              ing.quantity || null,
              ing.unit || null,
              index
            );
          });
        }
      }

      // Delete and re-insert tags if provided
      if (tags !== undefined) {
        db.prepare('DELETE FROM recipe_tags WHERE recipe_id = ?').run(id);

        if (tags.length > 0) {
          const tagStmt = db.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)');
          const getTagStmt = db.prepare('SELECT id FROM tags WHERE name = ?');
          const recipeTagStmt = db.prepare('INSERT INTO recipe_tags (recipe_id, tag_id) VALUES (?, ?)');

          tags.forEach(tagName => {
            tagStmt.run(tagName);
            const tag = getTagStmt.get(tagName);
            recipeTagStmt.run(id, tag.id);
          });
        }
      }
    });

    update();
    return this.getById(id);
  }

  // Delete recipe
  static delete(id) {
    const stmt = db.prepare('DELETE FROM recipes WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  // Get all tags
  static getAllTags() {
    return db.prepare('SELECT name FROM tags ORDER BY name').all();
  }

  // Helper: Get tags for a recipe
  static getRecipeTags(recipeId) {
    const tags = db.prepare(`
      SELECT t.name
      FROM tags t
      JOIN recipe_tags rt ON t.id = rt.tag_id
      WHERE rt.recipe_id = ?
    `).all(recipeId);

    return tags.map(t => t.name);
  }

  // Get total count of recipes
  static getCount() {
    const result = db.prepare('SELECT COUNT(*) as count FROM recipes').get();
    return result.count;
  }
}

module.exports = RecipeModel;
