const db = require('../config/database');

// Helper to convert snake_case to camelCase
const toCamelCase = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(toCamelCase);

  return Object.keys(obj).reduce((acc, key) => {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    acc[camelKey] = obj[key];
    return acc;
  }, {});
};

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
      SELECT
        r.*,
        GROUP_CONCAT(DISTINCT t.name) as tags
      FROM recipes r
      LEFT JOIN recipe_tags rt ON r.id = rt.recipe_id
      LEFT JOIN tags t ON rt.tag_id = t.id
      WHERE r.id = ?
      GROUP BY r.id
    `).get(id);

    if (!recipe) return null;

    // Get ingredients
    const ingredients = db.prepare(`
      SELECT name, quantity, unit, position
      FROM ingredients
      WHERE recipe_id = ?
      ORDER BY position
    `).all(id);

    // Convert to camelCase and parse tags
    const camelRecipe = toCamelCase(recipe);
    camelRecipe.tags = recipe.tags ? recipe.tags.split(',') : [];
    camelRecipe.ingredients = ingredients.map(toCamelCase);

    return camelRecipe;
  }

  // Get all recipes with optional pagination
  static getAll(limit = 50, offset = 0) {
    // Cap limit to prevent abuse
    const cappedLimit = Math.min(Math.max(1, limit), 100);
    const cappedOffset = Math.max(0, offset);

    const recipes = db.prepare(`
      SELECT
        r.id, r.title, r.source, r.date_added, r.image_path,
        GROUP_CONCAT(DISTINCT t.name) as tags
      FROM recipes r
      LEFT JOIN recipe_tags rt ON r.id = rt.recipe_id
      LEFT JOIN tags t ON rt.tag_id = t.id
      GROUP BY r.id
      ORDER BY r.date_added DESC
      LIMIT ? OFFSET ?
    `).all(cappedLimit, cappedOffset);

    return recipes.map(recipe => {
      const camelRecipe = toCamelCase(recipe);
      camelRecipe.tags = recipe.tags ? recipe.tags.split(',') : [];
      return camelRecipe;
    });
  }

  // Search recipes by ingredient
  static searchByIngredient(ingredientName) {
    const trimmed = ingredientName.trim();
    const recipes = db.prepare(`
      SELECT DISTINCT
        r.id, r.title, r.source, r.date_added, r.image_path,
        GROUP_CONCAT(DISTINCT t.name) as tags
      FROM recipes r
      JOIN ingredients i ON r.id = i.recipe_id
      LEFT JOIN recipe_tags rt ON r.id = rt.recipe_id
      LEFT JOIN tags t ON rt.tag_id = t.id
      WHERE LOWER(TRIM(i.name)) LIKE LOWER(?)
      GROUP BY r.id
      ORDER BY r.date_added DESC
    `).all(`%${trimmed}%`);

    return recipes.map(recipe => {
      const camelRecipe = toCamelCase(recipe);
      camelRecipe.tags = recipe.tags ? recipe.tags.split(',') : [];
      return camelRecipe;
    });
  }

  // Search recipes by multiple ingredients (recipes containing ALL specified ingredients)
  static searchByIngredients(ingredientNames) {
    if (!ingredientNames || ingredientNames.length === 0) {
      return [];
    }

    // Trim and normalize ingredient names
    const normalized = ingredientNames.map(name => name.trim().toLowerCase());
    const placeholders = normalized.map(() => '?').join(',');

    const recipes = db.prepare(`
      SELECT
        r.id, r.title, r.source, r.date_added, r.image_path,
        GROUP_CONCAT(DISTINCT t.name) as tags
      FROM recipes r
      LEFT JOIN recipe_tags rt ON r.id = rt.recipe_id
      LEFT JOIN tags t ON rt.tag_id = t.id
      WHERE r.id IN (
        SELECT recipe_id
        FROM ingredients
        WHERE LOWER(TRIM(name)) IN (${placeholders})
        GROUP BY recipe_id
        HAVING COUNT(DISTINCT LOWER(TRIM(name))) = ?
      )
      GROUP BY r.id
      ORDER BY r.date_added DESC
    `).all(...normalized, normalized.length);

    return recipes.map(recipe => {
      const camelRecipe = toCamelCase(recipe);
      camelRecipe.tags = recipe.tags ? recipe.tags.split(',') : [];
      return camelRecipe;
    });
  }

  // Filter recipes by tags
  static filterByTags(tagNames) {
    if (!tagNames || tagNames.length === 0) {
      return [];
    }

    const normalized = tagNames.map(name => name.trim().toLowerCase());
    const placeholders = normalized.map(() => '?').join(',');

    const recipes = db.prepare(`
      SELECT DISTINCT
        r.id, r.title, r.source, r.date_added, r.image_path,
        GROUP_CONCAT(DISTINCT t2.name) as tags
      FROM recipes r
      JOIN recipe_tags rt ON r.id = rt.recipe_id
      JOIN tags t ON rt.tag_id = t.id
      LEFT JOIN recipe_tags rt2 ON r.id = rt2.recipe_id
      LEFT JOIN tags t2 ON rt2.tag_id = t2.id
      WHERE LOWER(TRIM(t.name)) IN (${placeholders})
      GROUP BY r.id
      ORDER BY r.date_added DESC
    `).all(...normalized);

    return recipes.map(recipe => {
      const camelRecipe = toCamelCase(recipe);
      camelRecipe.tags = recipe.tags ? recipe.tags.split(',') : [];
      return camelRecipe;
    });
  }

  // Search recipes by title
  static searchByTitle(title) {
    const trimmed = title.trim();
    const recipes = db.prepare(`
      SELECT
        r.id, r.title, r.source, r.date_added, r.image_path,
        GROUP_CONCAT(DISTINCT t.name) as tags
      FROM recipes r
      LEFT JOIN recipe_tags rt ON r.id = rt.recipe_id
      LEFT JOIN tags t ON rt.tag_id = t.id
      WHERE LOWER(r.title) LIKE LOWER(?)
      GROUP BY r.id
      ORDER BY r.date_added DESC
    `).all(`%${trimmed}%`);

    return recipes.map(recipe => {
      const camelRecipe = toCamelCase(recipe);
      camelRecipe.tags = recipe.tags ? recipe.tags.split(',') : [];
      return camelRecipe;
    });
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

  // Get total count of recipes
  static getCount() {
    const result = db.prepare('SELECT COUNT(*) as count FROM recipes').get();
    return result.count;
  }
}

module.exports = RecipeModel;
