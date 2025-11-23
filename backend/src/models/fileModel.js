const db = require('../config/database');

class FileModel {
  /**
   * Create a new uploaded file record
   * @param {Object} fileData
   * @param {string} fileData.filename - Unique filename on disk
   * @param {string} fileData.originalName - Original uploaded filename
   * @param {string} fileData.filePath - Full path to file
   * @param {number} fileData.fileSize - File size in bytes
   * @param {string} fileData.mimeType - MIME type
   * @param {number} fileData.uploadedBy - User ID who uploaded
   * @returns {Promise<number>} - File ID
   */
  static async create({ filename, originalName, filePath, fileSize, mimeType, uploadedBy }) {
    const timestamp = Math.floor(Date.now() / 1000);

    const stmt = db.prepare(`
      INSERT INTO uploaded_files (filename, original_name, file_path, file_size, mime_type, uploaded_by, uploaded_at, processed)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = await stmt.run(
      filename,
      originalName,
      filePath,
      fileSize,
      mimeType,
      uploadedBy,
      timestamp,
      0 // not processed yet
    );

    return result.lastInsertRowid;
  }

  /**
   * Get file by ID
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  static async findById(id) {
    const stmt = db.prepare(`
      SELECT * FROM uploaded_files WHERE id = ?
    `);

    return await stmt.get(id);
  }

  /**
   * Get all files uploaded by a user
   * @param {number} userId
   * @returns {Promise<Array>}
   */
  static async findByUser(userId) {
    const stmt = db.prepare(`
      SELECT * FROM uploaded_files
      WHERE uploaded_by = ?
      ORDER BY uploaded_at DESC
    `);

    return await stmt.all(userId);
  }

  /**
   * Mark file as processed
   * @param {number} fileId
   * @returns {Promise<void>}
   */
  static async markAsProcessed(fileId) {
    const stmt = db.prepare(`
      UPDATE uploaded_files
      SET processed = 1
      WHERE id = ?
    `);

    await stmt.run(fileId);
  }

  /**
   * Delete file record
   * @param {number} fileId
   * @returns {Promise<void>}
   */
  static async delete(fileId) {
    const stmt = db.prepare(`
      DELETE FROM uploaded_files WHERE id = ?
    `);

    await stmt.run(fileId);
  }

  /**
   * Get all unprocessed files
   * @returns {Promise<Array>}
   */
  static async getUnprocessed() {
    const stmt = db.prepare(`
      SELECT * FROM uploaded_files
      WHERE processed = 0
      ORDER BY uploaded_at ASC
    `);

    return await stmt.all();
  }
}

module.exports = FileModel;
