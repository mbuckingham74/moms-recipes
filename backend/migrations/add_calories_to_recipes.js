#!/usr/bin/env node
/**
 * Migration: Add calorie estimation fields to recipes table
 *
 * This migration adds fields to store AI-estimated calorie information:
 * - estimated_calories: The estimated calories per serving
 * - calories_confidence: Confidence level of the estimation (low/medium/high)
 * - servings: Number of servings the recipe makes
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
        AND TABLE_NAME = 'recipes'
        AND COLUMN_NAME IN ('estimated_calories', 'calories_confidence', 'servings')
    `, [process.env.DB_NAME || 'moms_recipes']);

    const existingColumns = columns.map(col => col.COLUMN_NAME);

    if (existingColumns.includes('estimated_calories') &&
        existingColumns.includes('calories_confidence') &&
        existingColumns.includes('servings')) {
      console.log('✓ Columns already exist. No migration needed.');
      return;
    }

    // Add servings column if it doesn't exist
    if (!existingColumns.includes('servings')) {
      console.log('Adding servings column...');
      await connection.query(`
        ALTER TABLE recipes
        ADD COLUMN servings INT DEFAULT NULL AFTER instructions
      `);
      console.log('✓ Added servings column');
    } else {
      console.log('✓ Servings column already exists');
    }

    // Add estimated_calories column if it doesn't exist
    if (!existingColumns.includes('estimated_calories')) {
      console.log('Adding estimated_calories column...');
      await connection.query(`
        ALTER TABLE recipes
        ADD COLUMN estimated_calories INT DEFAULT NULL AFTER servings
      `);
      console.log('✓ Added estimated_calories column');
    } else {
      console.log('✓ Estimated_calories column already exists');
    }

    // Add calories_confidence column if it doesn't exist
    if (!existingColumns.includes('calories_confidence')) {
      console.log('Adding calories_confidence column...');
      await connection.query(`
        ALTER TABLE recipes
        ADD COLUMN calories_confidence ENUM('low', 'medium', 'high') DEFAULT NULL AFTER estimated_calories
      `);
      console.log('✓ Added calories_confidence column');
    } else {
      console.log('✓ Calories_confidence column already exists');
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
