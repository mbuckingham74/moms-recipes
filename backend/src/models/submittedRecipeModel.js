const db = require('../config/database');

class SubmittedRecipeModel {
  /**
   * Create a new recipe submission
   * @param {number} userId - ID of the submitting user
   * @param {Object} recipeData - Recipe data
   * @returns {Promise<number>} - Submitted recipe ID
   */
  static async create(userId, { title, source, instructions, servings, ingredients = [], tags = [] }) {
    const timestamp = Math.floor(Date.now() / 1000);

    const insert = db.transaction(async (txDb) => {
      // Insert the submitted recipe
      const recipeStmt = txDb.prepare(`
        INSERT INTO user_submitted_recipes
        (user_id, title, source, instructions, servings, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)
      `);

      const result = await recipeStmt.run(
        userId,
        title,
        source || null,
        instructions || null,
        servings || null,
        timestamp,
        timestamp
      );

      const submittedRecipeId = result.lastInsertRowid;

      // Insert ingredients
      if (ingredients.length > 0) {
        const ingredientStmt = txDb.prepare(`
          INSERT INTO user_submitted_ingredients
          (submitted_recipe_id, name, quantity, unit, position)
          VALUES (?, ?, ?, ?, ?)
        `);

        for (let i = 0; i < ingredients.length; i++) {
          const ing = ingredients[i];
          await ingredientStmt.run(
            submittedRecipeId,
            ing.name,
            ing.quantity || null,
            ing.unit || null,
            i
          );
        }
      }

      // Insert tags
      if (tags.length > 0) {
        const tagStmt = txDb.prepare(`
          INSERT INTO user_submitted_tags (submitted_recipe_id, tag_name)
          VALUES (?, ?)
        `);

        for (const tagName of tags) {
          await tagStmt.run(submittedRecipeId, tagName);
        }
      }

      return submittedRecipeId;
    });

    return await insert();
  }

  /**
   * Get a submitted recipe by ID
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  static async getById(id) {
    const stmt = db.prepare(`
      SELECT usr.*, u.username as submitter_username,
             reviewer.username as reviewer_username
      FROM user_submitted_recipes usr
      JOIN users u ON usr.user_id = u.id
      LEFT JOIN users reviewer ON usr.reviewed_by = reviewer.id
      WHERE usr.id = ?
    `);

    const recipe = await stmt.get(id);
    if (!recipe) return null;

    // Get ingredients
    const ingredientsStmt = db.prepare(`
      SELECT name, quantity, unit, position
      FROM user_submitted_ingredients
      WHERE submitted_recipe_id = ?
      ORDER BY position
    `);
    const ingredients = await ingredientsStmt.all(id);

    // Get tags
    const tagsStmt = db.prepare(`
      SELECT tag_name
      FROM user_submitted_tags
      WHERE submitted_recipe_id = ?
    `);
    const tags = await tagsStmt.all(id);

    return {
      ...toCamelCase(recipe),
      ingredients: ingredients.map(toCamelCase),
      tags: tags.map((t) => t.tag_name),
    };
  }

  /**
   * Get all submissions by a user
   * @param {number} userId
   * @param {Object} options - Pagination and filter options
   * @returns {Promise<Object>} - { submissions, total }
   */
  static async getByUserId(userId, { limit = 20, offset = 0, status = null } = {}) {
    let countSql = `
      SELECT COUNT(*) as total
      FROM user_submitted_recipes
      WHERE user_id = ?
    `;
    const countParams = [userId];

    if (status) {
      countSql += ` AND status = ?`;
      countParams.push(status);
    }

    const countStmt = db.prepare(countSql);
    const countResult = await countStmt.get(...countParams);
    const total = countResult.total;

    let sql = `
      SELECT id, title, source, status, admin_notes, created_at, updated_at
      FROM user_submitted_recipes
      WHERE user_id = ?
    `;
    const params = [userId];

    if (status) {
      sql += ` AND status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY created_at DESC LIMIT ?, ?`;
    params.push(offset, limit);

    const stmt = db.prepare(sql);
    const submissions = await stmt.all(...params);

    return {
      submissions: submissions.map(toCamelCase),
      total,
    };
  }

  /**
   * Get all pending submissions (for admin review)
   * @param {Object} options - Pagination options
   * @returns {Promise<Object>} - { submissions, total }
   */
  static async getPending({ limit = 20, offset = 0 } = {}) {
    const countStmt = db.prepare(`
      SELECT COUNT(*) as total
      FROM user_submitted_recipes
      WHERE status = 'pending'
    `);
    const countResult = await countStmt.get();
    const total = countResult.total;

    const stmt = db.prepare(`
      SELECT usr.id, usr.title, usr.source, usr.status, usr.created_at,
             u.username as submitter_username
      FROM user_submitted_recipes usr
      JOIN users u ON usr.user_id = u.id
      WHERE usr.status = 'pending'
      ORDER BY usr.created_at ASC
      LIMIT ?, ?
    `);

    const submissions = await stmt.all(offset, limit);

    return {
      submissions: submissions.map(toCamelCase),
      total,
    };
  }

  /**
   * Get all submissions (for admin - all statuses)
   * @param {Object} options - Pagination and filter options
   * @returns {Promise<Object>} - { submissions, total }
   */
  static async getAll({ limit = 20, offset = 0, status = null } = {}) {
    let countSql = `SELECT COUNT(*) as total FROM user_submitted_recipes`;
    const countParams = [];

    if (status) {
      countSql += ` WHERE status = ?`;
      countParams.push(status);
    }

    const countStmt = db.prepare(countSql);
    const countResult = await countStmt.get(...countParams);
    const total = countResult.total;

    let sql = `
      SELECT usr.id, usr.title, usr.source, usr.status, usr.created_at, usr.reviewed_at,
             u.username as submitter_username,
             reviewer.username as reviewer_username
      FROM user_submitted_recipes usr
      JOIN users u ON usr.user_id = u.id
      LEFT JOIN users reviewer ON usr.reviewed_by = reviewer.id
    `;
    const params = [];

    if (status) {
      sql += ` WHERE usr.status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY usr.created_at DESC LIMIT ?, ?`;
    params.push(offset, limit);

    const stmt = db.prepare(sql);
    const submissions = await stmt.all(...params);

    return {
      submissions: submissions.map(toCamelCase),
      total,
    };
  }

  /**
   * Approve a submission (creates actual recipe)
   * @param {number} id - Submitted recipe ID
   * @param {number} adminId - Admin user ID
   * @param {string} notes - Optional admin notes
   * @returns {Promise<number>} - New recipe ID
   */
  static async approve(id, adminId, notes = null) {
    const timestamp = Math.floor(Date.now() / 1000);

    const approve = db.transaction(async (txDb) => {
      // Get the submitted recipe
      const getStmt = txDb.prepare(`
        SELECT * FROM user_submitted_recipes WHERE id = ? AND status = 'pending'
      `);
      const submission = await getStmt.get(id);

      if (!submission) {
        throw new Error('Submission not found or already reviewed');
      }

      // Create the actual recipe
      const recipeStmt = txDb.prepare(`
        INSERT INTO recipes (title, source, instructions, servings, date_added, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const recipeResult = await recipeStmt.run(
        submission.title,
        submission.source,
        submission.instructions,
        submission.servings,
        timestamp,
        timestamp,
        timestamp
      );

      const newRecipeId = recipeResult.lastInsertRowid;

      // Copy ingredients
      const getIngredientsStmt = txDb.prepare(`
        SELECT name, quantity, unit, position
        FROM user_submitted_ingredients
        WHERE submitted_recipe_id = ?
      `);
      const ingredients = await getIngredientsStmt.all(id);

      if (ingredients.length > 0) {
        const ingredientStmt = txDb.prepare(`
          INSERT INTO ingredients (recipe_id, name, quantity, unit, position)
          VALUES (?, ?, ?, ?, ?)
        `);

        for (const ing of ingredients) {
          await ingredientStmt.run(
            newRecipeId,
            ing.name,
            ing.quantity,
            ing.unit,
            ing.position
          );
        }
      }

      // Copy tags (create if not exist)
      const getTagsStmt = txDb.prepare(`
        SELECT tag_name FROM user_submitted_tags WHERE submitted_recipe_id = ?
      `);
      const tags = await getTagsStmt.all(id);

      for (const tag of tags) {
        // Insert or ignore tag
        const insertTagStmt = txDb.prepare(`
          INSERT IGNORE INTO tags (name, created_at) VALUES (?, ?)
        `);
        await insertTagStmt.run(tag.tag_name, timestamp);

        // Get tag ID
        const getTagIdStmt = txDb.prepare(`SELECT id FROM tags WHERE name = ?`);
        const tagRecord = await getTagIdStmt.get(tag.tag_name);

        // Link to recipe
        const linkTagStmt = txDb.prepare(`
          INSERT INTO recipe_tags (recipe_id, tag_id) VALUES (?, ?)
        `);
        await linkTagStmt.run(newRecipeId, tagRecord.id);
      }

      // Update submission status
      const updateStmt = txDb.prepare(`
        UPDATE user_submitted_recipes
        SET status = 'approved', admin_notes = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ?
        WHERE id = ?
      `);
      await updateStmt.run(notes, adminId, timestamp, timestamp, id);

      return newRecipeId;
    });

    return await approve();
  }

  /**
   * Reject a submission
   * @param {number} id - Submitted recipe ID
   * @param {number} adminId - Admin user ID
   * @param {string} notes - Rejection reason
   * @returns {Promise<void>}
   */
  static async reject(id, adminId, notes) {
    const timestamp = Math.floor(Date.now() / 1000);

    const stmt = db.prepare(`
      UPDATE user_submitted_recipes
      SET status = 'rejected', admin_notes = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ?
      WHERE id = ? AND status = 'pending'
    `);

    const result = await stmt.run(notes, adminId, timestamp, timestamp, id);

    if (result.changes === 0) {
      throw new Error('Submission not found or already reviewed');
    }
  }

  /**
   * Delete a submission (only if pending and by owner)
   * @param {number} id
   * @param {number} userId
   * @returns {Promise<boolean>}
   */
  static async delete(id, userId) {
    const stmt = db.prepare(`
      DELETE FROM user_submitted_recipes
      WHERE id = ? AND user_id = ? AND status = 'pending'
    `);

    const result = await stmt.run(id, userId);
    return result.changes > 0;
  }

  /**
   * Get pending count for admin dashboard
   * @returns {Promise<number>}
   */
  static async getPendingCount() {
    const stmt = db.prepare(`
      SELECT COUNT(*) as count FROM user_submitted_recipes WHERE status = 'pending'
    `);

    const result = await stmt.get();
    return result.count;
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

module.exports = SubmittedRecipeModel;
