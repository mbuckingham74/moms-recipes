const db = require('../config/database');

class PendingRecipeModel {
  /**
   * Create a new pending recipe from PDF parse or URL import
   * @param {Object} recipeData
   * @param {number} recipeData.fileId - ID of uploaded file
   * @param {string} recipeData.title - Recipe title
   * @param {string} recipeData.source - Recipe source
   * @param {string} recipeData.category - Recipe category
   * @param {string} recipeData.description - Recipe description
   * @param {string} recipeData.instructions - Cooking instructions
   * @param {string} recipeData.rawText - Raw extracted PDF text
   * @param {Object} recipeData.parsedData - Full parsed data from LLM
   * @param {Array} recipeData.ingredients - Array of ingredient objects
   * @param {Array} recipeData.tags - Array of tag strings
   * @param {Object} recipeData.imageData - Downloaded image data (optional)
   * @returns {Promise<number>} - Pending recipe ID
   */
  static async create({ fileId, title, source, category, description, instructions, rawText, parsedData, ingredients = [], tags = [], imageData = null }) {
    const timestamp = Math.floor(Date.now() / 1000);

    // Use async transaction with connection-bound db
    const insertPending = db.transaction(async (txDb) => {
      // Insert pending recipe with image data if available
      const recipeStmt = txDb.prepare(`
        INSERT INTO pending_recipes (file_id, title, source, category, description, instructions, raw_text, parsed_data, created_at, image_filename, image_original_name, image_file_path, image_file_size, image_mime_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = await recipeStmt.run(
        fileId,
        title || null,
        source || null,
        category || null,
        description || null,
        instructions || null,
        rawText || null,
        JSON.stringify(parsedData),
        timestamp,
        imageData?.filename || null,
        imageData?.originalName || null,
        imageData?.filePath || null,
        imageData?.fileSize || null,
        imageData?.mimeType || null
      );

      const newPendingRecipeId = result.lastInsertRowid;

      // Insert ingredients
      if (ingredients && ingredients.length > 0) {
        const ingredientStmt = txDb.prepare(`
          INSERT INTO pending_ingredients (pending_recipe_id, name, quantity, unit, position)
          VALUES (?, ?, ?, ?, ?)
        `);

        for (let index = 0; index < ingredients.length; index++) {
          const ingredient = ingredients[index];
          await ingredientStmt.run(
            newPendingRecipeId,
            ingredient.name,
            ingredient.quantity || null,
            ingredient.unit || null,
            index
          );
        }
      }

      // Insert tags
      if (tags && tags.length > 0) {
        const tagStmt = txDb.prepare(`
          INSERT INTO pending_tags (pending_recipe_id, tag_name)
          VALUES (?, ?)
        `);

        for (const tag of tags) {
          await tagStmt.run(newPendingRecipeId, tag);
        }
      }

      return newPendingRecipeId;
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

    // Format ingredients as text (one per line) for frontend
    const ingredients_text = ingredients.map(ing => {
      const parts = [];
      if (ing.quantity) parts.push(ing.quantity);
      if (ing.unit) parts.push(ing.unit);
      if (ing.name) parts.push(ing.name);
      return parts.join(' ');
    }).join('\n');

    // Use instructions as instructions_text for frontend compatibility
    const instructions_text = recipe.instructions || '';

    // Build image info if available (sanitized URL for frontend)
    const imageInfo = recipe.image_filename ? {
      filename: recipe.image_filename,
      originalName: recipe.image_original_name,
      url: `/uploads/images/${recipe.image_filename}`,
      fileSize: recipe.image_file_size,
      mimeType: recipe.image_mime_type
    } : null;

    return {
      ...recipe,
      ingredients,
      tags,
      ingredients_text,
      instructions_text,
      image: imageInfo
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
   * @param {string} updates.category
   * @param {string} updates.description
   * @param {string} updates.instructions
   * @param {Array} updates.ingredients
   * @param {Array} updates.tags
   * @returns {Promise<void>}
   */
  static async update(id, { title, source, category, description, instructions, ingredients, tags }) {
    // Use async transaction
    const updatePending = db.transaction(async (txDb) => {
      // Update main record
      const updateStmt = txDb.prepare(`
        UPDATE pending_recipes
        SET title = ?, source = ?, category = ?, description = ?, instructions = ?
        WHERE id = ?
      `);

      await updateStmt.run(title, source, category, description, instructions, id);

      // Delete and re-insert ingredients if provided
      if (ingredients) {
        await txDb.prepare('DELETE FROM pending_ingredients WHERE pending_recipe_id = ?').run(id);

        const ingredientStmt = txDb.prepare(`
          INSERT INTO pending_ingredients (pending_recipe_id, name, quantity, unit, position)
          VALUES (?, ?, ?, ?, ?)
        `);

        for (let index = 0; index < ingredients.length; index++) {
          const ingredient = ingredients[index];
          await ingredientStmt.run(
            id,
            ingredient.name,
            ingredient.quantity || null,
            ingredient.unit || null,
            index
          );
        }
      }

      // Delete and re-insert tags if provided
      if (tags) {
        await txDb.prepare('DELETE FROM pending_tags WHERE pending_recipe_id = ?').run(id);

        const tagStmt = txDb.prepare(`
          INSERT INTO pending_tags (pending_recipe_id, tag_name)
          VALUES (?, ?)
        `);

        for (const tag of tags) {
          await tagStmt.run(id, tag);
        }
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
