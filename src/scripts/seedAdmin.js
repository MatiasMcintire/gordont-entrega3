/**
 * Seed script to create an initial admin user
 * Run with: node src/scripts/seedAdmin.js
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { User } from '../infrastructure/persistence/schemas/userSchema.js';

// Load environment variables
dotenv.config();

const ADMIN_DATA = {
  email: 'admin@gordont.com',
  name: 'Admin Gordont',
  password: 'Admin123!',
  weight: 75,
  height: 175,
  age: 30,
  role: 'admin'
};

async function seedAdmin() {
  try {
    console.log('Starting admin seed script...');

    // Connect to MongoDB
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gordont';
    console.log(`Connecting to MongoDB: ${MONGODB_URI}`);

    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB successfully');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: ADMIN_DATA.email });

    if (existingAdmin) {
      console.log(`Admin user already exists with email: ${ADMIN_DATA.email}`);
      console.log('Skipping creation.');

      // Show existing admin info
      console.log('\nExisting admin details:');
      console.log(`- ID: ${existingAdmin._id}`);
      console.log(`- Email: ${existingAdmin.email}`);
      console.log(`- Name: ${existingAdmin.name}`);
      console.log(`- Role: ${existingAdmin.role}`);

      await mongoose.connection.close();
      console.log('\nMongoDB connection closed');
      return;
    }

    // Hash password
    console.log('Hashing password...');
    const passwordHash = await bcrypt.hash(ADMIN_DATA.password, 10);

    // Create admin user
    console.log('Creating admin user...');
    const admin = new User({
      email: ADMIN_DATA.email,
      name: ADMIN_DATA.name,
      passwordHash: passwordHash,
      weight: ADMIN_DATA.weight,
      height: ADMIN_DATA.height,
      age: ADMIN_DATA.age,
      role: ADMIN_DATA.role
    });

    await admin.save();

    console.log('\n✅ Admin user created successfully!');
    console.log('\nAdmin credentials:');
    console.log('==================');
    console.log(`Email:    ${ADMIN_DATA.email}`);
    console.log(`Password: ${ADMIN_DATA.password}`);
    console.log(`Role:     ${ADMIN_DATA.role}`);
    console.log('==================');
    console.log('\n⚠️  IMPORTANT: Change the password after first login!');
    console.log('\nYou can now use these credentials to login at POST /api/v1/auth/login');

    // Close connection
    await mongoose.connection.close();
    console.log('\nMongoDB connection closed');

  } catch (error) {
    console.error('\n❌ Error seeding admin user:');
    console.error(error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run the seed function
seedAdmin()
  .then(() => {
    console.log('\nSeed script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nSeed script failed:', error.message);
    process.exit(1);
  });
