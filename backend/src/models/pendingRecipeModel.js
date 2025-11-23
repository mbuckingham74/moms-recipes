const db = require('../config/database');

class PendingRecipeModel {
  /**
   * Create a new pending recipe from PDF parse
   * @param {Object} recipeData
   * @param {number} recipeData.fileId - ID of uploaded file
   * @param {string} recipeData.title - Recipe title
   * @param {string} recipeData.source - Recipe source
   * @param {string} recipeData.instructions - Cooking instructions
   * @param {string} recipeData.rawText - Raw extracted PDF text
   * @param {Object} recipeData.parsedData - Full parsed data from LLM
   * @param {Array} recipeData.ingredients - Array of ingredient objects
   * @param {Array} recipeData.tags - Array of tag strings
   * @returns {Promise<number>} - Pending recipe ID
   */
  static async create({ fileId, title, source, instructions, rawText, parsedData, ingredients = [], tags = [] }) {
    const timestamp = Math.floor(Date.now() / 1000);

    // Use transaction for atomic insert
    const insertPending = db.transaction((txDb) => {
      // Insert pending recipe
      const recipeStmt = txDb.prepare(`
        INSERT INTO pending_recipes (file_id, title, source, instructions, raw_text, parsed_data, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const result = recipeStmt.run(
        fileId,
        title || null,
        source || null,
        instructions || null,
        rawText || null,
        JSON.stringify(parsedData),
        timestamp
      );

      const pendingRecipeId = result.lastInsertRowid;

      // Insert ingredients
      const ingredientStmt = txDb.prepare(`
        INSERT INTO pending_ingredients (pending_recipe_id, name, quantity, unit, position)
        VALUES (?, ?, ?, ?, ?)
      `);

      ingredients.forEach((ingredient, index) => {
        ingredientStmt.run(
          pendingRecipeId,
          ingredient.name,
          ingredient.quantity || null,
          ingredient.unit || null,
          index
        );
      });

      // Insert tags
      const tagStmt = txDb.prepare(`
        INSERT INTO pending_tags (pending_recipe_id, tag_name)
        VALUES (?, ?)
      `);

      tags.forEach((tag) => {
        tagStmt.run(pendingRecipeId, tag);
      });

      return pendingRecipeId;
    });

    return await insertPending();
  }

  /**
   * Get pending recipe by ID with all details
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  static async findById(id) {
    const recipeStmt = db.prepare(`
      SELECT pr.*, uf.original_name, uf.filename
      FROM pending_recipes pr
      JOIN uploaded_files uf ON pr.file_id = uf.id
      WHERE pr.id = ?
    `);

    const recipe = await recipeStmt.get(id);

    if (!recipe) {
      return null;
    }

    // Get ingredients
    const ingredientsStmt = db.prepare(`
      SELECT name, quantity, unit, position
      FROM pending_ingredients
      WHERE pending_recipe_id = ?
      ORDER BY position
    `);

    const ingredients = await ingredientsStmt.all(id);

    // Get tags
    const tagsStmt = db.prepare(`
      SELECT tag_name FROM pending_tags
      WHERE pending_recipe_id = ?
    `);

    const tagRows = await tagsStmt.all(id);
    const tags = tagRows.map(row => row.tag_name);

    // Parse JSON data
    if (recipe.parsed_data) {
      try {
        recipe.parsed_data = JSON.parse(recipe.parsed_data);
      } catch (e) {
        // Keep as string if invalid JSON
      }
    }

    return {
      ...recipe,
      ingredients,
      tags
    };
  }

  /**
   * Get all pending recipes
   * @returns {Promise<Array>}
   */
  static async getAll() {
    const stmt = db.prepare(`
      SELECT pr.*, uf.original_name, uf.filename
      FROM pending_recipes pr
      JOIN uploaded_files uf ON pr.file_id = uf.id
      ORDER BY pr.created_at DESC
    `);

    const recipes = await stmt.all();

    // For list view, we don't need full details, just include basic info
    return recipes.map(recipe => {
      if (recipe.parsed_data) {
        try {
          recipe.parsed_data = JSON.parse(recipe.parsed_data);
        } catch (e) {
          // Keep as string if invalid JSON
        }
      }
      return recipe;
    });
  }

  /**
   * Update pending recipe
   * @param {number} id
   * @param {Object} updates
   * @param {string} updates.title
   * @param {string} updates.source
   * @param {string} updates.instructions
   * @param {Array} updates.ingredients
   * @param {Array} updates.tags
   * @returns {Promise<void>}
   */
  static async update(id, { title, source, instructions, ingredients, tags }) {
    const updatePending = db.transaction((txDb) => {
      // Update main record
      const updateStmt = txDb.prepare(`
        UPDATE pending_recipes
        SET title = ?, source = ?, instructions = ?
        WHERE id = ?
      `);

      updateStmt.run(title, source, instructions, id);

      // Delete and re-insert ingredients if provided
      if (ingredients) {
        txDb.prepare('DELETE FROM pending_ingredients WHERE pending_recipe_id = ?').run(id);

        const ingredientStmt = txDb.prepare(`
          INSERT INTO pending_ingredients (pending_recipe_id, name, quantity, unit, position)
          VALUES (?, ?, ?, ?, ?)
        `);

        ingredients.forEach((ingredient, index) => {
          ingredientStmt.run(
            id,
            ingredient.name,
            ingredient.quantity || null,
            ingredient.unit || null,
            index
          );
        });
      }

      // Delete and re-insert tags if provided
      if (tags) {
        txDb.prepare('DELETE FROM pending_tags WHERE pending_recipe_id = ?').run(id);

        const tagStmt = txDb.prepare(`
          INSERT INTO pending_tags (pending_recipe_id, tag_name)
          VALUES (?, ?)
        `);

        tags.forEach((tag) => {
          tagStmt.run(id, tag);
        });
      }
    });

    await updatePending();
  }

  /**
   * Delete pending recipe
   * @param {number} id
   * @returns {Promise<void>}
   */
  static async delete(id) {
    const stmt = db.prepare(`
      DELETE FROM pending_recipes WHERE id = ?
    `);

    await stmt.run(id);
  }

  /**
   * Get pending recipes by file ID
   * @param {number} fileId
   * @returns {Promise<Array>}
   */
  static async findByFileId(fileId) {
    const stmt = db.prepare(`
      SELECT * FROM pending_recipes
      WHERE file_id = ?
    `);

    return await stmt.all(fileId);
  }
}

module.exports = PendingRecipeModel;
