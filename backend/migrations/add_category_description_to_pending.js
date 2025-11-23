#!/usr/bin/env node
/**
 * Migration: Add category and description columns to pending_recipes table
 *
 * This migration adds two new columns to support better recipe categorization
 * and descriptions from PDF parsing.
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function runMigration() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'meteo-mysql-prod',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'moms_recipes'
  });

  try {
    console.log('Connected to MySQL database');
    console.log(`Database: ${process.env.DB_NAME || 'moms_recipes'}`);

    // Check if columns already exist
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'pending_recipes'
        AND COLUMN_NAME IN ('category', 'description')
    `, [process.env.DB_NAME || 'moms_recipes']);

    const existingColumns = columns.map(col => col.COLUMN_NAME);

    if (existingColumns.includes('category') && existingColumns.includes('description')) {
      console.log('✓ Columns already exist. No migration needed.');
      return;
    }

    // Add category column if it doesn't exist
    if (!existingColumns.includes('category')) {
      console.log('Adding category column...');
      await connection.query(`
        ALTER TABLE pending_recipes
        ADD COLUMN category VARCHAR(255) AFTER source
      `);
      console.log('✓ Added category column');
    } else {
      console.log('✓ Category column already exists');
    }

    // Add description column if it doesn't exist
    if (!existingColumns.includes('description')) {
      console.log('Adding description column...');
      await connection.query(`
        ALTER TABLE pending_recipes
        ADD COLUMN description TEXT AFTER category
      `);
      console.log('✓ Added description column');
    } else {
      console.log('✓ Description column already exists');
    }

    console.log('\n✓ Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

// Run migration
runMigration()
  .then(() => {
    console.log('Done.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
