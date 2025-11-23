// Database adapter - uses SQLite for development/testing, MySQL for production
const useMySQL = process.env.NODE_ENV === 'production' || process.env.USE_MYSQL === 'true';

if (useMySQL) {
  // Production: Use MySQL
  console.log('Using MySQL database (production mode)');
  const mysqlDb = require('./database.mysql');
  module.exports = mysqlDb;
} else {
  // Development/Testing: Use SQLite
  console.log('Using SQLite database (development mode)');
  const Database = require('better-sqlite3');
  const path = require('path');
  const fs = require('fs');

  // Allow database path to be overridden via environment variable (for testing)
  const getDbPath = () => {
    if (process.env.DB_PATH) {
      return process.env.DB_PATH;
    }

    // Default to data/recipes.db
    const dataDir = path.join(__dirname, '../../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    return path.join(dataDir, 'recipes.db');
  };

  const dbPath = getDbPath();
  const db = new Database(dbPath);

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Initialize database schema
  const initDatabase = () => {
    // Recipes table
    db.exec(`
      CREATE TABLE IF NOT EXISTS recipes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        source TEXT,
        date_added INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        instructions TEXT,
        image_path TEXT,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      )
    `);

    // Ingredients table - separate table for efficient searching
    db.exec(`
      CREATE TABLE IF NOT EXISTS ingredients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        recipe_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        quantity TEXT,
        unit TEXT,
        position INTEGER NOT NULL,
        FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
      )
    `);

    // Tags/Categories table
    db.exec(`
      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      )
    `);

    // Recipe-Tags junction table (many-to-many)
    db.exec(`
      CREATE TABLE IF NOT EXISTS recipe_tags (
        recipe_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        PRIMARY KEY (recipe_id, tag_id),
        FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      )
    `);

    // Users table for authentication
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'viewer',
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      )
    `);

    // Uploaded files tracking
    db.exec(`
      CREATE TABLE IF NOT EXISTS uploaded_files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        mime_type TEXT NOT NULL,
        uploaded_by INTEGER NOT NULL,
        uploaded_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        processed INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (uploaded_by) REFERENCES users(id)
      )
    `);

    // Pending recipes (from PDF before approval)
    db.exec(`
      CREATE TABLE IF NOT EXISTS pending_recipes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_id INTEGER NOT NULL,
        title TEXT,
        source TEXT,
        category TEXT,
        description TEXT,
        instructions TEXT,
        raw_text TEXT,
        parsed_data TEXT,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        FOREIGN KEY (file_id) REFERENCES uploaded_files(id) ON DELETE CASCADE
      )
    `);

    // Pending recipe ingredients
    db.exec(`
      CREATE TABLE IF NOT EXISTS pending_ingredients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pending_recipe_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        quantity TEXT,
        unit TEXT,
        position INTEGER NOT NULL,
        FOREIGN KEY (pending_recipe_id) REFERENCES pending_recipes(id) ON DELETE CASCADE
      )
    `);

    // Pending recipe tags
    db.exec(`
      CREATE TABLE IF NOT EXISTS pending_tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pending_recipe_id INTEGER NOT NULL,
        tag_name TEXT NOT NULL,
        FOREIGN KEY (pending_recipe_id) REFERENCES pending_recipes(id) ON DELETE CASCADE
      )
    `);

    // Create indexes for better search performance
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_ingredients_name ON ingredients(name);
      CREATE INDEX IF NOT EXISTS idx_ingredients_recipe_id ON ingredients(recipe_id);
      CREATE INDEX IF NOT EXISTS idx_recipe_tags_recipe_id ON recipe_tags(recipe_id);
      CREATE INDEX IF NOT EXISTS idx_recipe_tags_tag_id ON recipe_tags(tag_id);
      CREATE INDEX IF NOT EXISTS idx_recipes_title ON recipes(title);
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_uploaded_files_uploaded_by ON uploaded_files(uploaded_by);
      CREATE INDEX IF NOT EXISTS idx_pending_recipes_file_id ON pending_recipes(file_id);
    `);

    console.log('SQLite database initialized successfully');
  };

  // Cleanup function for tests
  const clearDatabase = () => {
    db.exec('DELETE FROM recipe_tags');
    db.exec('DELETE FROM ingredients');
    db.exec('DELETE FROM tags');
    db.exec('DELETE FROM recipes');
  };

  const closeDatabase = () => {
    db.close();
  };

  // Initialize on module load
  initDatabase();

  module.exports = db;
  module.exports.clearDatabase = clearDatabase;
  module.exports.closeDatabase = closeDatabase;
  module.exports.dbPath = dbPath;
}
