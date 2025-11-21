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
  static async create(recipeData) {
    const { title, source, instructions, imagePath, ingredients, tags } = recipeData;

    const insert = db.transaction(async () => {
      // Insert recipe
      const recipeStmt = db.prepare(`
        INSERT INTO recipes (title, source, instructions, image_path)
        VALUES (?, ?, ?, ?)
      `);
      const result = await recipeStmt.run(title, source, instructions, imagePath);
      const recipeId = result.lastInsertRowid;

      // Insert ingredients
      if (ingredients && ingredients.length > 0) {
        const ingredientStmt = db.prepare(`
          INSERT INTO ingredients (recipe_id, name, quantity, unit, position)
          VALUES (?, ?, ?, ?, ?)
        `);
        for (let index = 0; index < ingredients.length; index++) {
          const ing = ingredients[index];
          await ingredientStmt.run(
            recipeId,
            ing.name,
            ing.quantity || null,
            ing.unit || null,
            index
          );
        }
      }

      // Insert tags
      if (tags && tags.length > 0) {
        const tagStmt = db.prepare(`
          INSERT IGNORE INTO tags (name) VALUES (?)
        `);
        const getTagStmt = db.prepare(`SELECT id FROM tags WHERE name = ?`);
        const recipeTagStmt = db.prepare(`
          INSERT INTO recipe_tags (recipe_id, tag_id) VALUES (?, ?)
        `);

        for (const tagName of tags) {
          await tagStmt.run(tagName);
          const tag = await getTagStmt.get(tagName);
          await recipeTagStmt.run(recipeId, tag.id);
        }
      }

      return recipeId;
    });

    const recipeId = await insert();
    return this.getById(recipeId);
  }

  // Get recipe by ID with all related data
  static async getById(id) {
    const recipe = await db.prepare(`
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
    const ingredients = await db.prepare(`
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
  static async getAll(limit = 50, offset = 0) {
    // Cap limit to prevent abuse
    const cappedLimit = Math.min(Math.max(1, limit), 100);
    const cappedOffset = Math.max(0, offset);

    const recipes = await db.prepare(`
      SELECT
        r.id, r.title, r.source, r.date_added, r.image_path,
        GROUP_CONCAT(DISTINCT t.name) as tags
      FROM recipes r
      LEFT JOIN recipe_tags rt ON r.id = rt.recipe_id
      LEFT JOIN tags t ON rt.tag_id = t.id
      GROUP BY r.id
      ORDER BY r.date_added DESC
      LIMIT ?, ?
    `).all(cappedOffset, cappedLimit);

    return recipes.map(recipe => {
      const camelRecipe = toCamelCase(recipe);
      camelRecipe.tags = recipe.tags ? recipe.tags.split(',') : [];
      return camelRecipe;
    });
  }

  // Search recipes by ingredient
  static async searchByIngredient(ingredientName) {
    const trimmed = ingredientName.trim();
    const recipes = await db.prepare(`
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
  static async searchByIngredients(ingredientNames) {
    if (!ingredientNames || ingredientNames.length === 0) {
      return [];
    }

    // Trim and normalize ingredient names
    const normalized = ingredientNames.map(name => name.trim().toLowerCase());
    const placeholders = normalized.map(() => '?').join(',');

    const recipes = await db.prepare(`
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
  static async filterByTags(tagNames) {
    if (!tagNames || tagNames.length === 0) {
      return [];
    }

    const normalized = tagNames.map(name => name.trim().toLowerCase());
    const placeholders = normalized.map(() => '?').join(',');

    const recipes = await db.prepare(`
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
  static async searchByTitle(title) {
    const trimmed = title.trim();
    const recipes = await db.prepare(`
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

  // Combined search with multiple filters
  static async combinedSearch(filters) {
    const { title, ingredients, tags } = filters;
    const conditions = [];
    const params = [];

    let query = `
      SELECT DISTINCT
        r.id, r.title, r.source, r.date_added, r.image_path,
        GROUP_CONCAT(DISTINCT t2.name) as tags
      FROM recipes r
      LEFT JOIN recipe_tags rt ON r.id = rt.recipe_id
      LEFT JOIN tags t2 ON rt.tag_id = t2.id
    `;

    // Add ingredient joins if needed
    if (ingredients && ingredients.length > 0) {
      ingredients.forEach((_, index) => {
        query += `
          INNER JOIN ingredients i${index} ON r.id = i${index}.recipe_id
        `;
      });
    }

    // Add tag joins if needed
    if (tags && tags.length > 0) {
      query += `
        LEFT JOIN recipe_tags rt2 ON r.id = rt2.recipe_id
        LEFT JOIN tags t ON rt2.tag_id = t.id
      `;
    }

    query += ' WHERE 1=1 ';

    // Title filter
    if (title) {
      conditions.push('LOWER(r.title) LIKE LOWER(?)');
      params.push(`%${title.trim()}%`);
    }

    // Ingredient filters (AND logic with partial matching)
    if (ingredients && ingredients.length > 0) {
      ingredients.forEach((ingredient, index) => {
        conditions.push(`LOWER(TRIM(i${index}.name)) LIKE LOWER(?)`);
        params.push(`%${ingredient.trim()}%`);
      });
    }

    // Tag filters (OR logic)
    if (tags && tags.length > 0) {
      const normalizedTags = tags.map(tag => tag.trim().toLowerCase());
      const tagPlaceholders = normalizedTags.map(() => '?').join(',');
      conditions.push(`LOWER(TRIM(t.name)) IN (${tagPlaceholders})`);
      params.push(...normalizedTags);
    }

    if (conditions.length > 0) {
      query += ' AND ' + conditions.join(' AND ');
    }

    query += ' GROUP BY r.id ORDER BY r.date_added DESC';

    const recipes = await db.prepare(query).all(...params);

    return recipes.map(recipe => {
      const camelRecipe = toCamelCase(recipe);
      camelRecipe.tags = recipe.tags ? recipe.tags.split(',') : [];
      return camelRecipe;
    });
  }

  // Update recipe
  static async update(id, recipeData) {
    const { title, source, instructions, imagePath, ingredients, tags } = recipeData;

    const update = db.transaction(async () => {
      // Update recipe
      const updateStmt = db.prepare(`
        UPDATE recipes
        SET title = ?, source = ?, instructions = ?, image_path = ?, updated_at = UNIX_TIMESTAMP()
        WHERE id = ?
      `);
      await updateStmt.run(title, source, instructions, imagePath, id);

      // Delete and re-insert ingredients if provided
      if (ingredients !== undefined) {
        await db.prepare('DELETE FROM ingredients WHERE recipe_id = ?').run(id);

        if (ingredients.length > 0) {
          const ingredientStmt = db.prepare(`
            INSERT INTO ingredients (recipe_id, name, quantity, unit, position)
            VALUES (?, ?, ?, ?, ?)
          `);
          for (let index = 0; index < ingredients.length; index++) {
            const ing = ingredients[index];
            await ingredientStmt.run(
              id,
              ing.name,
              ing.quantity || null,
              ing.unit || null,
              index
            );
          }
        }
      }

      // Delete and re-insert tags if provided
      if (tags !== undefined) {
        await db.prepare('DELETE FROM recipe_tags WHERE recipe_id = ?').run(id);

        if (tags.length > 0) {
          const tagStmt = db.prepare('INSERT IGNORE INTO tags (name) VALUES (?)');
          const getTagStmt = db.prepare('SELECT id FROM tags WHERE name = ?');
          const recipeTagStmt = db.prepare('INSERT INTO recipe_tags (recipe_id, tag_id) VALUES (?, ?)');

          for (const tagName of tags) {
            await tagStmt.run(tagName);
            const tag = await getTagStmt.get(tagName);
            await recipeTagStmt.run(id, tag.id);
          }
        }
      }
    });

    await update();

    // Clean up orphaned tags after update (in case tags were removed)
    await this.cleanupOrphanedTags();

    return this.getById(id);
  }

  // Delete recipe
  static async delete(id) {
    const stmt = db.prepare('DELETE FROM recipes WHERE id = ?');
    const result = await stmt.run(id);

    // Clean up orphaned tags after deletion
    if (result.changes > 0) {
      await this.cleanupOrphanedTags();
    }

    return result.changes > 0;
  }

  // Get all tags (only tags that are actually used by recipes)
  static async getAllTags() {
    return await db.prepare(`
      SELECT DISTINCT t.name
      FROM tags t
      INNER JOIN recipe_tags rt ON t.id = rt.tag_id
      ORDER BY t.name
    `).all();
  }

  // Clean up orphaned tags (tags not associated with any recipe)
  static async cleanupOrphanedTags() {
    await db.prepare(`
      DELETE FROM tags
      WHERE id NOT IN (SELECT DISTINCT tag_id FROM recipe_tags)
    `).run();
  }

  // Get total count of recipes
  static async getCount() {
    const result = await db.prepare('SELECT COUNT(*) as count FROM recipes').get();
    return result.count;
  }
}

module.exports = RecipeModel;
