const db = require('../config/database');
const RecipeImageModel = require('./recipeImageModel');

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

    // Use async transaction with connection-bound db
    const insert = db.transaction(async (txDb) => {
      // Insert recipe using transaction-bound connection
      const recipeStmt = txDb.prepare(`
        INSERT INTO recipes (title, source, instructions, image_path)
        VALUES (?, ?, ?, ?)
      `);
      const result = await recipeStmt.run(title, source, instructions, imagePath);
      const recipeId = result.lastInsertRowid;

      // Insert ingredients
      if (ingredients && ingredients.length > 0) {
        const ingredientStmt = txDb.prepare(`
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
        const tagStmt = txDb.prepare(`INSERT IGNORE INTO tags (name) VALUES (?)`);
        const getTagStmt = txDb.prepare(`SELECT id FROM tags WHERE name = ?`);
        const recipeTagStmt = txDb.prepare(`INSERT INTO recipe_tags (recipe_id, tag_id) VALUES (?, ?)`);

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

    // Get images (sanitized - no server paths exposed)
    const images = await RecipeImageModel.getByRecipeIdPublic(id);

    // Convert to camelCase and parse tags
    const camelRecipe = toCamelCase(recipe);
    camelRecipe.tags = recipe.tags ? recipe.tags.split(',') : [];
    camelRecipe.ingredients = ingredients.map(toCamelCase);
    camelRecipe.images = images;

    // Set heroImage for convenience (first hero image or first image)
    const heroImage = images.find(img => img.isHero) || images[0] || null;
    camelRecipe.heroImage = heroImage ? heroImage.url : null;

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
        GROUP_CONCAT(DISTINCT t.name) as tags,
        (SELECT ri.filename FROM recipe_images ri
         WHERE ri.recipe_id = r.id
         ORDER BY ri.is_hero DESC, ri.position ASC
         LIMIT 1) as hero_image_filename
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
      // Set heroImage URL if there's an uploaded image
      if (recipe.hero_image_filename) {
        camelRecipe.heroImage = `/uploads/images/${recipe.hero_image_filename}`;
      } else {
        camelRecipe.heroImage = null;
      }
      return camelRecipe;
    });
  }

  // Search recipes by ingredient
  static async searchByIngredient(ingredientName) {
    const trimmed = ingredientName.trim();
    const recipes = await db.prepare(`
      SELECT DISTINCT
        r.id, r.title, r.source, r.date_added, r.image_path,
        GROUP_CONCAT(DISTINCT t.name) as tags,
        (SELECT ri.filename FROM recipe_images ri
         WHERE ri.recipe_id = r.id
         ORDER BY ri.is_hero DESC, ri.position ASC
         LIMIT 1) as hero_image_filename
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
      camelRecipe.heroImage = recipe.hero_image_filename
        ? `/uploads/images/${recipe.hero_image_filename}`
        : null;
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
        GROUP_CONCAT(DISTINCT t.name) as tags,
        (SELECT ri.filename FROM recipe_images ri
         WHERE ri.recipe_id = r.id
         ORDER BY ri.is_hero DESC, ri.position ASC
         LIMIT 1) as hero_image_filename
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
      camelRecipe.heroImage = recipe.hero_image_filename
        ? `/uploads/images/${recipe.hero_image_filename}`
        : null;
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
        GROUP_CONCAT(DISTINCT t2.name) as tags,
        (SELECT ri.filename FROM recipe_images ri
         WHERE ri.recipe_id = r.id
         ORDER BY ri.is_hero DESC, ri.position ASC
         LIMIT 1) as hero_image_filename
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
      camelRecipe.heroImage = recipe.hero_image_filename
        ? `/uploads/images/${recipe.hero_image_filename}`
        : null;
      return camelRecipe;
    });
  }

  // Search recipes by title
  static async searchByTitle(title) {
    const trimmed = title.trim();
    const recipes = await db.prepare(`
      SELECT
        r.id, r.title, r.source, r.date_added, r.image_path,
        GROUP_CONCAT(DISTINCT t.name) as tags,
        (SELECT ri.filename FROM recipe_images ri
         WHERE ri.recipe_id = r.id
         ORDER BY ri.is_hero DESC, ri.position ASC
         LIMIT 1) as hero_image_filename
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
      camelRecipe.heroImage = recipe.hero_image_filename
        ? `/uploads/images/${recipe.hero_image_filename}`
        : null;
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
        GROUP_CONCAT(DISTINCT t2.name) as tags,
        (SELECT ri.filename FROM recipe_images ri
         WHERE ri.recipe_id = r.id
         ORDER BY ri.is_hero DESC, ri.position ASC
         LIMIT 1) as hero_image_filename
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
      camelRecipe.heroImage = recipe.hero_image_filename
        ? `/uploads/images/${recipe.hero_image_filename}`
        : null;
      return camelRecipe;
    });
  }

  // Update recipe
  static async update(id, recipeData) {
    const { title, source, instructions, imagePath, ingredients, tags } = recipeData;

    // Use async transaction with connection-bound db
    const update = db.transaction(async (txDb) => {
      // Update recipe using transaction-bound connection
      const updateStmt = txDb.prepare(`
        UPDATE recipes
        SET title = ?, source = ?, instructions = ?, image_path = ?, updated_at = UNIX_TIMESTAMP()
        WHERE id = ?
      `);
      await updateStmt.run(title, source, instructions, imagePath, id);

      // Delete and re-insert ingredients if provided
      if (ingredients !== undefined) {
        await txDb.prepare('DELETE FROM ingredients WHERE recipe_id = ?').run(id);

        if (ingredients.length > 0) {
          const ingredientStmt = txDb.prepare(`
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
        await txDb.prepare('DELETE FROM recipe_tags WHERE recipe_id = ?').run(id);

        if (tags.length > 0) {
          const tagStmt = txDb.prepare('INSERT IGNORE INTO tags (name) VALUES (?)');
          const getTagStmt = txDb.prepare('SELECT id FROM tags WHERE name = ?');
          const recipeTagStmt = txDb.prepare('INSERT INTO recipe_tags (recipe_id, tag_id) VALUES (?, ?)');

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
    // Delete associated image files from disk before removing DB records
    // (FK cascade will delete recipe_images rows, but not the actual files)
    await RecipeImageModel.deleteByRecipeId(id);

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

  // Update calorie information for a recipe
  static async updateCalories(id, { estimatedCalories, caloriesConfidence }) {
    const stmt = db.prepare(`
      UPDATE recipes
      SET estimated_calories = ?, calories_confidence = ?, updated_at = UNIX_TIMESTAMP()
      WHERE id = ?
    `);
    await stmt.run(estimatedCalories, caloriesConfidence, id);
    return this.getById(id);
  }

  // Get admin recipe list with all table columns
  static async getAdminList(limit = 50, offset = 0, sortBy = 'date_added', sortOrder = 'DESC') {
    // Cap limit to prevent abuse
    const cappedLimit = Math.min(Math.max(1, limit), 100);
    const cappedOffset = Math.max(0, offset);

    // Validate sort parameters
    const validSortColumns = ['title', 'date_added', 'estimated_calories', 'times_cooked'];
    const validSortOrders = ['ASC', 'DESC'];
    const safeSortBy = validSortColumns.includes(sortBy) ? sortBy : 'date_added';
    const safeSortOrder = validSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

    // Get the first tag for each recipe as the "category" and first ingredient as "main ingredient"
    const recipes = await db.prepare(`
      SELECT
        r.id,
        r.title,
        r.date_added,
        r.estimated_calories,
        r.times_cooked,
        (SELECT t.name FROM tags t
         INNER JOIN recipe_tags rt ON t.id = rt.tag_id
         WHERE rt.recipe_id = r.id
         LIMIT 1) as category,
        (SELECT i.name FROM ingredients i
         WHERE i.recipe_id = r.id
         ORDER BY i.position
         LIMIT 1) as main_ingredient
      FROM recipes r
      ORDER BY ${safeSortBy} ${safeSortOrder}
      LIMIT ?, ?
    `).all(cappedOffset, cappedLimit);

    return recipes.map(recipe => toCamelCase(recipe));
  }

  // Update times_cooked for a recipe
  static async incrementTimesCooked(id) {
    const stmt = db.prepare(`
      UPDATE recipes
      SET times_cooked = times_cooked + 1, updated_at = UNIX_TIMESTAMP()
      WHERE id = ?
    `);
    await stmt.run(id);
    return this.getById(id);
  }

  // Get dashboard statistics
  static async getDashboardStats() {
    // Get total recipes count
    const totalRecipesResult = await db.prepare('SELECT COUNT(*) as count FROM recipes').get();
    const totalRecipes = totalRecipesResult.count;

    // Get pending recipes count
    const pendingRecipesResult = await db.prepare('SELECT COUNT(*) as count FROM pending_recipes').get();
    const pendingRecipes = pendingRecipesResult.count;

    // Get categories (distinct tags) count
    const categoriesResult = await db.prepare(`
      SELECT COUNT(DISTINCT t.name) as count
      FROM tags t
      INNER JOIN recipe_tags rt ON t.id = rt.tag_id
    `).get();
    const categoriesCount = categoriesResult.count;

    // Get recent recipes (added this week)
    const oneWeekAgo = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);
    const recentRecipesResult = await db.prepare(`
      SELECT COUNT(*) as count
      FROM recipes
      WHERE date_added >= ?
    `).get(oneWeekAgo);
    const recentRecipes = recentRecipesResult.count;

    // Get average calories (only from recipes with calorie data)
    const avgCaloriesResult = await db.prepare(`
      SELECT AVG(estimated_calories) as avg
      FROM recipes
      WHERE estimated_calories IS NOT NULL
    `).get();
    const avgCalories = avgCaloriesResult.avg || 0;

    // Get count of recipes with calorie data
    const recipesWithCaloriesResult = await db.prepare(`
      SELECT COUNT(*) as count
      FROM recipes
      WHERE estimated_calories IS NOT NULL
    `).get();
    const recipesWithCalories = recipesWithCaloriesResult.count;

    return {
      totalRecipes,
      pendingRecipes,
      categoriesCount,
      recentRecipes,
      avgCalories: Math.round(avgCalories),
      recipesWithCalories
    };
  }
}

module.exports = RecipeModel;
