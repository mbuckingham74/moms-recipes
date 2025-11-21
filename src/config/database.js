const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../../data/recipes.db');
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

  // Create indexes for better search performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_ingredients_name ON ingredients(name);
    CREATE INDEX IF NOT EXISTS idx_ingredients_recipe_id ON ingredients(recipe_id);
    CREATE INDEX IF NOT EXISTS idx_recipe_tags_recipe_id ON recipe_tags(recipe_id);
    CREATE INDEX IF NOT EXISTS idx_recipe_tags_tag_id ON recipe_tags(tag_id);
    CREATE INDEX IF NOT EXISTS idx_recipes_title ON recipes(title);
  `);

  console.log('Database initialized successfully');
};

// Initialize on module load
initDatabase();

module.exports = db;
