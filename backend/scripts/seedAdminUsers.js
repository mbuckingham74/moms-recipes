/**
 * Seed admin users script
 * This script creates the initial admin users in the database
 *
 * IMPORTANT: Admin credentials must be set in environment variables
 * Add to your .env file:
 *   ADMIN1_USERNAME=your-username
 *   ADMIN1_PASSWORD=your-password
 *   ADMIN1_EMAIL=your-email@example.com
 *   ADMIN2_USERNAME=other-username
 *   ADMIN2_PASSWORD=other-password
 *   ADMIN2_EMAIL=other-email@example.com (optional)
 *
 * Run with: node backend/scripts/seedAdminUsers.js
 */

require('dotenv').config();
const UserModel = require('../src/models/userModel');
const db = require('../src/config/database');

// Load admin users from environment variables
const ADMIN_USERS = [];

// Admin 1
if (process.env.ADMIN1_USERNAME && process.env.ADMIN1_PASSWORD) {
  ADMIN_USERS.push({
    username: process.env.ADMIN1_USERNAME,
    password: process.env.ADMIN1_PASSWORD,
    email: process.env.ADMIN1_EMAIL || null,
    role: 'admin'
  });
}

// Admin 2
if (process.env.ADMIN2_USERNAME && process.env.ADMIN2_PASSWORD) {
  ADMIN_USERS.push({
    username: process.env.ADMIN2_USERNAME,
    password: process.env.ADMIN2_PASSWORD,
    email: process.env.ADMIN2_EMAIL || null,
    role: 'admin'
  });
}

// Validate that we have at least one admin user configured
if (ADMIN_USERS.length === 0) {
  console.error('❌ ERROR: No admin users configured!');
  console.error('');
  console.error('Please add admin credentials to your .env file:');
  console.error('  ADMIN1_USERNAME=your-username');
  console.error('  ADMIN1_PASSWORD=your-password');
  console.error('  ADMIN1_EMAIL=your-email@example.com (optional)');
  console.error('');
  console.error('For a second admin (optional):');
  console.error('  ADMIN2_USERNAME=other-username');
  console.error('  ADMIN2_PASSWORD=other-password');
  console.error('  ADMIN2_EMAIL=other-email@example.com (optional)');
  process.exit(1);
}

async function seedUsers() {
  console.log('🌱 Seeding admin users...\n');

  try {
    // Wait for database initialization if using MySQL
    if (db.ensureInitialized) {
      await db.ensureInitialized();
    }

    for (const userData of ADMIN_USERS) {
      // Check if user already exists
      const existing = await UserModel.findByUsername(userData.username);

      if (existing) {
        console.log(`⏭️  User "${userData.username}" already exists, skipping...`);
        continue;
      }

      // Create user
      const userId = await UserModel.create(userData);
      console.log(`✅ Created admin user "${userData.username}" (ID: ${userId})`);
    }

    console.log('\n✨ Admin users seeded successfully!');
    console.log('\nYou can now log in with:');
    ADMIN_USERS.forEach(user => {
      console.log(`  - Username: ${user.username}`);
    });

  } catch (error) {
    console.error('❌ Error seeding users:', error.message);
    process.exit(1);
  } finally {
    // Close database connection
    if (db.closeDatabase) {
      await db.closeDatabase();
    }
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  seedUsers();
}

module.exports = seedUsers;
