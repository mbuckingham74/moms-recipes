const db = require('../config/database');

class SavedRecipeModel {
  /**
   * Save a recipe for a user
   * @param {number} userId
   * @param {number} recipeId
   * @returns {Promise<number>} - Saved recipe ID
   */
  static async save(userId, recipeId) {
    const timestamp = Math.floor(Date.now() / 1000);

    const stmt = db.prepare(`
      INSERT INTO user_saved_recipes (user_id, recipe_id, saved_at)
      VALUES (?, ?, ?)
    `);

    const result = await stmt.run(userId, recipeId, timestamp);
    return result.lastInsertRowid;
  }

  /**
   * Unsave (remove) a recipe for a user
   * @param {number} userId
   * @param {number} recipeId
   * @returns {Promise<boolean>} - Whether a record was deleted
   */
  static async unsave(userId, recipeId) {
    const stmt = db.prepare(`
      DELETE FROM user_saved_recipes
      WHERE user_id = ? AND recipe_id = ?
    `);

    const result = await stmt.run(userId, recipeId);
    return result.changes > 0;
  }

  /**
   * Check if a recipe is saved by a user
   * @param {number} userId
   * @param {number} recipeId
   * @returns {Promise<boolean>}
   */
  static async isSaved(userId, recipeId) {
    const stmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM user_saved_recipes
      WHERE user_id = ? AND recipe_id = ?
    `);

    const result = await stmt.get(userId, recipeId);
    return result.count > 0;
  }

  /**
   * Get all saved recipes for a user with full recipe details
   * @param {number} userId
   * @param {Object} options - Pagination options
   * @returns {Promise<Object>} - { recipes, total }
   */
  static async getByUserId(userId, { limit = 20, offset = 0 } = {}) {
    // Get total count
    const countStmt = db.prepare(`
      SELECT COUNT(*) as total
      FROM user_saved_recipes
      WHERE user_id = ?
    `);
    const countResult = await countStmt.get(userId);
    const total = countResult.total;

    // Get saved recipes with recipe details
    const stmt = db.prepare(`
      SELECT r.id, r.title, r.source, r.date_added, r.instructions,
             r.servings, r.estimated_calories, r.calories_confidence,
             r.image_path, r.times_cooked, r.created_at, r.updated_at,
             usr.saved_at
      FROM user_saved_recipes usr
      JOIN recipes r ON usr.recipe_id = r.id
      WHERE usr.user_id = ?
      ORDER BY usr.saved_at DESC
      LIMIT ?, ?
    `);

    const recipes = await stmt.all(userId, offset, limit);

    // Get tags for each recipe
    const recipesWithTags = await Promise.all(
      recipes.map(async (recipe) => {
        const tagsStmt = db.prepare(`
          SELECT t.name
          FROM recipe_tags rt
          JOIN tags t ON rt.tag_id = t.id
          WHERE rt.recipe_id = ?
        `);
        const tags = await tagsStmt.all(recipe.id);

        return {
          ...toCamelCase(recipe),
          tags: tags.map((t) => t.name),
        };
      })
    );

    return {
      recipes: recipesWithTags,
      total,
    };
  }

  /**
   * Get saved recipe IDs for a user (for bulk checking)
   * @param {number} userId
   * @returns {Promise<number[]>}
   */
  static async getSavedRecipeIds(userId) {
    const stmt = db.prepare(`
      SELECT recipe_id
      FROM user_saved_recipes
      WHERE user_id = ?
    `);

    const results = await stmt.all(userId);
    return results.map((r) => r.recipe_id);
  }
}

/**
 * Convert snake_case keys to camelCase
 */
const toCamelCase = (obj) => {
  if (obj === null || obj === undefined) return obj;

  const newObj = {};
  for (const key in obj) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) =>
      letter.toUpperCase()
    );
    newObj[camelKey] = obj[key];
  }
  return newObj;
};

module.exports = SavedRecipeModel;
