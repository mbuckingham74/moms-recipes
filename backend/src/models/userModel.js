const bcrypt = require('bcrypt');
const db = require('../config/database');

const SALT_ROUNDS = 10;

class UserModel {
  /**
   * Create a new user
   * @param {Object} userData - User data
   * @param {string} userData.username - Username (unique)
   * @param {string} userData.email - Email (required for regular users)
   * @param {string} userData.password - Plain text password (will be hashed)
   * @param {string} userData.role - User role ('admin' or 'viewer')
   * @returns {Promise<number>} - User ID
   */
  static async create({ username, email, password, role = 'viewer' }) {
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const timestamp = Math.floor(Date.now() / 1000);

    const stmt = db.prepare(`
      INSERT INTO users (username, email, password_hash, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = await stmt.run(
      username,
      email || null,
      passwordHash,
      role,
      timestamp,
      timestamp
    );

    const userId = result.lastInsertRowid;

    // Create default preferences for the user
    const prefsStmt = db.prepare(`
      INSERT INTO user_preferences (user_id, theme, created_at, updated_at)
      VALUES (?, 'light', ?, ?)
    `);
    await prefsStmt.run(userId, timestamp, timestamp);

    return userId;
  }

  /**
   * Find user by username
   * @param {string} username
   * @returns {Promise<Object|null>} - User object or null
   */
  static async findByUsername(username) {
    const stmt = db.prepare(`
      SELECT id, username, email, password_hash, role, created_at, updated_at
      FROM users
      WHERE username = ?
    `);

    return await stmt.get(username);
  }

  /**
   * Find user by ID
   * @param {number} id
   * @returns {Promise<Object|null>} - User object or null
   */
  static async findById(id) {
    const stmt = db.prepare(`
      SELECT id, username, email, role, created_at, updated_at
      FROM users
      WHERE id = ?
    `);

    return await stmt.get(id);
  }

  /**
   * Verify user password
   * @param {string} username
   * @param {string} password
   * @returns {Promise<Object|null>} - User object (without password) if valid, null if invalid
   */
  static async verifyPassword(username, password) {
    const user = await this.findByUsername(username);

    if (!user) {
      return null;
    }

    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return null;
    }

    // Return user without password hash
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Update user password
   * @param {number} userId
   * @param {string} newPassword
   * @returns {Promise<void>}
   */
  static async updatePassword(userId, newPassword) {
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    const timestamp = Math.floor(Date.now() / 1000);

    const stmt = db.prepare(`
      UPDATE users
      SET password_hash = ?, updated_at = ?
      WHERE id = ?
    `);

    await stmt.run(passwordHash, timestamp, userId);
  }

  /**
   * Get all users (admin only)
   * @returns {Promise<Array>} - Array of users without passwords
   */
  static async getAll() {
    const stmt = db.prepare(`
      SELECT id, username, email, role, created_at, updated_at
      FROM users
      ORDER BY created_at DESC
    `);

    return await stmt.all();
  }

  /**
   * Delete user
   * @param {number} userId
   * @returns {Promise<void>}
   */
  static async delete(userId) {
    const stmt = db.prepare(`
      DELETE FROM users WHERE id = ?
    `);

    await stmt.run(userId);
  }

  /**
   * Check if username exists
   * @param {string} username
   * @returns {Promise<boolean>}
   */
  static async usernameExists(username) {
    const stmt = db.prepare(`
      SELECT COUNT(*) as count FROM users WHERE username = ?
    `);

    const result = await stmt.get(username);
    return result.count > 0;
  }

  /**
   * Check if email exists
   * @param {string} email
   * @returns {Promise<boolean>}
   */
  static async emailExists(email) {
    const stmt = db.prepare(`
      SELECT COUNT(*) as count FROM users WHERE email = ?
    `);

    const result = await stmt.get(email);
    return result.count > 0;
  }

  /**
   * Find user by email
   * @param {string} email
   * @returns {Promise<Object|null>} - User object or null
   */
  static async findByEmail(email) {
    const stmt = db.prepare(`
      SELECT id, username, email, password_hash, role, created_at, updated_at
      FROM users
      WHERE email = ?
    `);

    return await stmt.get(email);
  }

  /**
   * Get user preferences
   * @param {number} userId
   * @returns {Promise<Object|null>}
   */
  static async getPreferences(userId) {
    const stmt = db.prepare(`
      SELECT user_id, theme, created_at, updated_at
      FROM user_preferences
      WHERE user_id = ?
    `);

    return await stmt.get(userId);
  }

  /**
   * Update user preferences (upsert - creates if not exists)
   * @param {number} userId
   * @param {Object} preferences
   * @returns {Promise<void>}
   */
  static async updatePreferences(userId, { theme }) {
    const timestamp = Math.floor(Date.now() / 1000);

    // Use INSERT ... ON DUPLICATE KEY UPDATE for MySQL upsert
    const stmt = db.prepare(`
      INSERT INTO user_preferences (user_id, theme, created_at, updated_at)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE theme = VALUES(theme), updated_at = VALUES(updated_at)
    `);

    await stmt.run(userId, theme, timestamp, timestamp);
  }

  /**
   * Update user profile (email)
   * @param {number} userId
   * @param {Object} profileData
   * @returns {Promise<void>}
   */
  static async updateProfile(userId, { email }) {
    const timestamp = Math.floor(Date.now() / 1000);

    const stmt = db.prepare(`
      UPDATE users
      SET email = ?, updated_at = ?
      WHERE id = ?
    `);

    await stmt.run(email, timestamp, userId);
  }
}

module.exports = UserModel;
