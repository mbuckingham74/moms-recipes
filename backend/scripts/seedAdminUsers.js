/**
 * Seed admin users script
 * This script creates the initial admin users in the database
 * Run with: node backend/scripts/seedAdminUsers.js
 */

require('dotenv').config();
const UserModel = require('../src/models/userModel');
const db = require('../src/config/database');

const ADMIN_USERS = [
  {
    username: 'michael',
    password: 'jag97Dorp',
    email: 'michael@tachyonfuture.com',
    role: 'admin'
  },
  {
    username: 'mom',
    password: 'Sohie@1!',
    email: null,
    role: 'admin'
  }
];

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
