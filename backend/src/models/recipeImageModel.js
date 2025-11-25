const db = require('../config/database');
const fs = require('fs').promises;
const path = require('path');

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

class RecipeImageModel {
  /**
   * Add an image to a recipe
   * @param {Object} imageData - Image data
   * @param {number} imageData.recipeId - Recipe ID
   * @param {string} imageData.filename - Generated filename
   * @param {string} imageData.originalName - Original filename
   * @param {string} imageData.filePath - Path to the file
   * @param {number} imageData.fileSize - File size in bytes
   * @param {string} imageData.mimeType - MIME type
   * @param {boolean} imageData.isHero - Whether this is the hero image
   * @param {number} imageData.uploadedBy - User ID who uploaded
   * @returns {Object} Created image record
   */
  static async create(imageData) {
    const { recipeId, filename, originalName, filePath, fileSize, mimeType, isHero, uploadedBy } = imageData;

    // If this is a hero image, unset any existing hero for this recipe
    if (isHero) {
      await db.prepare(`
        UPDATE recipe_images SET is_hero = FALSE WHERE recipe_id = ? AND is_hero = TRUE
      `).run(recipeId);
    }

    // Get the next position for this recipe
    const positionResult = await db.prepare(`
      SELECT COALESCE(MAX(position), -1) + 1 as next_position
      FROM recipe_images
      WHERE recipe_id = ?
    `).get(recipeId);
    const position = positionResult.next_position;

    const result = await db.prepare(`
      INSERT INTO recipe_images (recipe_id, filename, original_name, file_path, file_size, mime_type, is_hero, position, uploaded_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(recipeId, filename, originalName, filePath, fileSize, mimeType, isHero ? 1 : 0, position, uploadedBy);

    return this.getById(result.lastInsertRowid);
  }

  /**
   * Get image by ID
   * @param {number} id - Image ID
   * @returns {Object|null} Image record or null
   */
  static async getById(id) {
    const image = await db.prepare(`
      SELECT * FROM recipe_images WHERE id = ?
    `).get(id);

    return image ? toCamelCase(image) : null;
  }

  /**
   * Get all images for a recipe
   * @param {number} recipeId - Recipe ID
   * @returns {Array} Array of image records
   */
  static async getByRecipeId(recipeId) {
    const images = await db.prepare(`
      SELECT * FROM recipe_images
      WHERE recipe_id = ?
      ORDER BY is_hero DESC, position ASC
    `).all(recipeId);

    return images.map(toCamelCase);
  }

  /**
   * Get hero image for a recipe
   * @param {number} recipeId - Recipe ID
   * @returns {Object|null} Hero image or null
   */
  static async getHeroByRecipeId(recipeId) {
    const image = await db.prepare(`
      SELECT * FROM recipe_images
      WHERE recipe_id = ? AND is_hero = TRUE
      LIMIT 1
    `).get(recipeId);

    return image ? toCamelCase(image) : null;
  }

  /**
   * Set an image as the hero image
   * @param {number} imageId - Image ID
   * @param {number} recipeId - Recipe ID
   * @returns {Object} Updated image record
   */
  static async setAsHero(imageId, recipeId) {
    // Unset current hero
    await db.prepare(`
      UPDATE recipe_images SET is_hero = FALSE WHERE recipe_id = ? AND is_hero = TRUE
    `).run(recipeId);

    // Set new hero
    await db.prepare(`
      UPDATE recipe_images SET is_hero = TRUE WHERE id = ? AND recipe_id = ?
    `).run(imageId, recipeId);

    return this.getById(imageId);
  }

  /**
   * Update image position
   * @param {number} imageId - Image ID
   * @param {number} position - New position
   * @returns {Object} Updated image record
   */
  static async updatePosition(imageId, position) {
    await db.prepare(`
      UPDATE recipe_images SET position = ? WHERE id = ?
    `).run(position, imageId);

    return this.getById(imageId);
  }

  /**
   * Delete an image
   * @param {number} id - Image ID
   * @returns {boolean} True if deleted
   */
  static async delete(id) {
    // Get the image first to delete the file
    const image = await this.getById(id);
    if (!image) return false;

    // Delete the database record
    const result = await db.prepare(`
      DELETE FROM recipe_images WHERE id = ?
    `).run(id);

    // Delete the file from disk
    if (result.changes > 0 && image.filePath) {
      try {
        await fs.unlink(image.filePath);
      } catch (err) {
        // Log but don't fail if file doesn't exist
        console.warn(`Failed to delete image file: ${image.filePath}`, err.message);
      }
    }

    return result.changes > 0;
  }

  /**
   * Delete all images for a recipe
   * @param {number} recipeId - Recipe ID
   * @returns {number} Number of images deleted
   */
  static async deleteByRecipeId(recipeId) {
    // Get all images first to delete files
    const images = await this.getByRecipeId(recipeId);

    // Delete database records
    const result = await db.prepare(`
      DELETE FROM recipe_images WHERE recipe_id = ?
    `).run(recipeId);

    // Delete files from disk
    for (const image of images) {
      if (image.filePath) {
        try {
          await fs.unlink(image.filePath);
        } catch (err) {
          console.warn(`Failed to delete image file: ${image.filePath}`, err.message);
        }
      }
    }

    return result.changes;
  }

  /**
   * Get image count for a recipe
   * @param {number} recipeId - Recipe ID
   * @returns {number} Count of images
   */
  static async getCountByRecipeId(recipeId) {
    const result = await db.prepare(`
      SELECT COUNT(*) as count FROM recipe_images WHERE recipe_id = ?
    `).get(recipeId);

    return result.count;
  }
}

module.exports = RecipeImageModel;
