const mysql = require('mysql2/promise');

// MySQL connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'meteo-mysql-prod',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'moms_recipes',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+00:00'
};

// Create connection pool
let pool;

const getPool = () => {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
  }
  return pool;
};

// Initialize database schema
const initDatabase = async () => {
  const connection = await getPool().getConnection();

  try {
    // Validate database name to prevent SQL injection
    const dbName = dbConfig.database;
    if (!dbName || !/^[a-zA-Z0-9_]+$/.test(dbName)) {
      throw new Error(`Invalid database name: ${dbName}`);
    }

    // Create database if it doesn't exist (using escapeId for safety)
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${connection.escapeId(dbName)}`);
    await connection.query(`USE ${connection.escapeId(dbName)}`);

    // Recipes table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS recipes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        source VARCHAR(255),
        date_added INT NOT NULL DEFAULT (UNIX_TIMESTAMP()),
        instructions TEXT,
        servings INT DEFAULT NULL,
        estimated_calories INT DEFAULT NULL,
        calories_confidence ENUM('low', 'medium', 'high') DEFAULT NULL,
        image_path VARCHAR(255),
        created_at INT NOT NULL DEFAULT (UNIX_TIMESTAMP()),
        updated_at INT NOT NULL DEFAULT (UNIX_TIMESTAMP()),
        INDEX idx_recipes_title (title),
        INDEX idx_recipes_date_added (date_added)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Ingredients table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS ingredients (
        id INT AUTO_INCREMENT PRIMARY KEY,
        recipe_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        quantity VARCHAR(50),
        unit VARCHAR(50),
        position INT NOT NULL,
        FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
        INDEX idx_ingredients_name (name),
        INDEX idx_ingredients_recipe_id (recipe_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Tags table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS tags (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        created_at INT NOT NULL DEFAULT (UNIX_TIMESTAMP()),
        INDEX idx_tags_name (name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Recipe-Tags junction table (many-to-many)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS recipe_tags (
        recipe_id INT NOT NULL,
        tag_id INT NOT NULL,
        PRIMARY KEY (recipe_id, tag_id),
        FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
        INDEX idx_recipe_tags_recipe_id (recipe_id),
        INDEX idx_recipe_tags_tag_id (tag_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Users table for authentication
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(255),
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('admin', 'viewer') NOT NULL DEFAULT 'viewer',
        created_at INT NOT NULL DEFAULT (UNIX_TIMESTAMP()),
        updated_at INT NOT NULL DEFAULT (UNIX_TIMESTAMP()),
        INDEX idx_users_username (username)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Uploaded files tracking
    await connection.query(`
      CREATE TABLE IF NOT EXISTS uploaded_files (
        id INT AUTO_INCREMENT PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_size INT NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        uploaded_by INT NOT NULL,
        uploaded_at INT NOT NULL DEFAULT (UNIX_TIMESTAMP()),
        processed BOOLEAN NOT NULL DEFAULT FALSE,
        FOREIGN KEY (uploaded_by) REFERENCES users(id),
        INDEX idx_uploaded_files_uploaded_by (uploaded_by)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Pending recipes (from PDF before approval)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS pending_recipes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        file_id INT NOT NULL,
        title VARCHAR(500),
        source VARCHAR(500),
        category VARCHAR(255),
        description TEXT,
        instructions TEXT,
        raw_text TEXT,
        parsed_data JSON,
        created_at INT NOT NULL DEFAULT (UNIX_TIMESTAMP()),
        FOREIGN KEY (file_id) REFERENCES uploaded_files(id) ON DELETE CASCADE,
        INDEX idx_pending_recipes_file_id (file_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Pending recipe ingredients
    await connection.query(`
      CREATE TABLE IF NOT EXISTS pending_ingredients (
        id INT AUTO_INCREMENT PRIMARY KEY,
        pending_recipe_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        quantity VARCHAR(50),
        unit VARCHAR(50),
        position INT NOT NULL,
        FOREIGN KEY (pending_recipe_id) REFERENCES pending_recipes(id) ON DELETE CASCADE,
        INDEX idx_pending_ingredients_recipe_id (pending_recipe_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Pending recipe tags
    await connection.query(`
      CREATE TABLE IF NOT EXISTS pending_tags (
        id INT AUTO_INCREMENT PRIMARY KEY,
        pending_recipe_id INT NOT NULL,
        tag_name VARCHAR(100) NOT NULL,
        FOREIGN KEY (pending_recipe_id) REFERENCES pending_recipes(id) ON DELETE CASCADE,
        INDEX idx_pending_tags_recipe_id (pending_recipe_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('MySQL database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  } finally {
    connection.release();
  }
};

// MySQL wrapper to provide similar interface to better-sqlite3
// This provides a prepare() method that returns an object with run/get/all methods
class MySQLDatabase {
  prepare(sql) {
    const pool = getPool();

    // Clean up SQL - remove extra whitespace and normalize
    const cleanSql = sql.trim().replace(/\s+/g, ' ');

    return {
      async run(...params) {
        const [result] = await pool.execute(cleanSql, params);
        return {
          lastInsertRowid: result.insertId,
          changes: result.affectedRows
        };
      },

      async get(...params) {
        const [rows] = await pool.execute(cleanSql, params);
        return rows[0] || null;
      },

      async all(...params) {
        // Use query instead of execute for complex queries
        // execute() has issues with GROUP BY and some SQL constructs
        const [rows] = await pool.query(cleanSql, params);
        return rows;
      }
    };
  }

  // Execute multiple statements (for exec)
  async exec(sql) {
    const connection = await getPool().getConnection();
    try {
      // Split statements and execute each
      const statements = sql.split(';').filter(s => s.trim());
      for (const statement of statements) {
        if (statement.trim()) {
          await connection.query(statement);
        }
      }
    } finally {
      connection.release();
    }
  }

  // Transaction support
  // Callback receives a connection-bound db interface for atomic operations
  transaction(callback) {
    return async () => {
      const connection = await getPool().getConnection();
      try {
        await connection.beginTransaction();

        // Create connection-bound prepare function for atomic operations
        const txDb = {
          prepare: (sql) => {
            const cleanSql = sql.trim().replace(/\s+/g, ' ');
            return {
              async run(...params) {
                const [result] = await connection.execute(cleanSql, params);
                return {
                  lastInsertRowid: result.insertId,
                  changes: result.affectedRows
                };
              },
              async get(...params) {
                const [rows] = await connection.execute(cleanSql, params);
                return rows[0] || null;
              },
              async all(...params) {
                const [rows] = await connection.query(cleanSql, params);
                return rows;
              }
            };
          }
        };

        const result = await callback(txDb);
        await connection.commit();
        return result;
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    };
  }

  // No-op for MySQL (doesn't have pragmas)
  pragma() {
    return this;
  }
}

// Cleanup function for tests
const clearDatabase = async () => {
  await getPool().execute('DELETE FROM recipe_tags');
  await getPool().execute('DELETE FROM ingredients');
  await getPool().execute('DELETE FROM tags');
  await getPool().execute('DELETE FROM recipes');
};

const closeDatabase = async () => {
  if (pool) {
    await pool.end();
    pool = null;
  }
};

// Create database instance
const db = new MySQLDatabase();

// Track initialization promise
let initPromise = null;

// Initialize database and return promise
const ensureInitialized = () => {
  if (!initPromise) {
    initPromise = initDatabase();
  }
  return initPromise;
};

// Start initialization on module load
ensureInitialized().catch(console.error);

module.exports = db;
module.exports.clearDatabase = clearDatabase;
module.exports.closeDatabase = closeDatabase;
module.exports.getPool = getPool;
module.exports.ensureInitialized = ensureInitialized;
