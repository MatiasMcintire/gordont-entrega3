import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdir } from 'fs/promises';
import { pathToFileURL } from 'url';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Migration Runner
 *
 * Usage:
 *   npm run migrate        - Run all pending migrations
 *   npm run migrate:down   - Rollback last migration
 */

class MigrationRunner {
  constructor() {
    this.migrationsDir = __dirname;
    this.db = null;
  }

  async connect() {
    try {
      const mongoUri = process.env.MONGODB_URI;

      if (!mongoUri) {
        throw new Error('MONGODB_URI not found in environment variables');
      }

      console.log('🔌 Connecting to MongoDB...');
      await mongoose.connect(mongoUri);

      this.db = mongoose.connection.db;
      console.log(' Connected to MongoDB');

      return true;
    } catch (error) {
      console.error(' Failed to connect to MongoDB:', error.message);
      throw error;
    }
  }

  async disconnect() {
    try {
      await mongoose.disconnect();
      console.log(' Disconnected from MongoDB');
    } catch (error) {
      console.error(' Failed to disconnect:', error.message);
    }
  }

  async getMigrationFiles() {
    try {
      const files = await readdir(this.migrationsDir);

      // Filter migration files (exclude this runner script)
      const migrationFiles = files
        .filter(file => file.endsWith('.js') && file !== 'runMigrations.js')
        .sort();

      return migrationFiles;
    } catch (error) {
      console.error(' Failed to read migration files:', error.message);
      throw error;
    }
  }

  async getExecutedMigrations() {
    try {
      // Create migrations collection if it doesn't exist
      const collections = await this.db.listCollections({ name: 'migrations' }).toArray();

      if (collections.length === 0) {
        await this.db.createCollection('migrations');
        console.log(' Created migrations tracking collection');
      }

      const migrationsCollection = this.db.collection('migrations');
      const executed = await migrationsCollection.find({}).toArray();

      return executed.map(m => m.name);
    } catch (error) {
      console.error(' Failed to get executed migrations:', error.message);
      throw error;
    }
  }

  async recordMigration(name) {
    try {
      const migrationsCollection = this.db.collection('migrations');

      await migrationsCollection.insertOne({
        name,
        executedAt: new Date()
      });

      console.log(` Recorded migration: ${name}`);
    } catch (error) {
      console.error(` Failed to record migration ${name}:`, error.message);
      throw error;
    }
  }

  async removeMigrationRecord(name) {
    try {
      const migrationsCollection = this.db.collection('migrations');

      await migrationsCollection.deleteOne({ name });

      console.log(` Removed migration record: ${name}`);
    } catch (error) {
      console.error(` Failed to remove migration record ${name}:`, error.message);
      throw error;
    }
  }

  async runMigrations() {
    try {
      console.log('\n Starting migrations...\n');

      await this.connect();

      const migrationFiles = await this.getMigrationFiles();
      const executedMigrations = await this.getExecutedMigrations();

      console.log(` Found ${migrationFiles.length} migration files`);
      console.log(` Already executed: ${executedMigrations.length} migrations\n`);

      // Find pending migrations
      const pendingMigrations = migrationFiles.filter(
        file => !executedMigrations.includes(file)
      );

      if (pendingMigrations.length === 0) {
        console.log(' No pending migrations. Database is up to date!');
        await this.disconnect();
        return;
      }

      console.log(` Pending migrations: ${pendingMigrations.length}\n`);

      // Execute pending migrations
      for (const migrationFile of pendingMigrations) {
        console.log(` Running migration: ${migrationFile}...`);

        try {
          // Dynamic import of migration file
          const migrationPath = join(this.migrationsDir, migrationFile);
          // Convert to file:// URL for Windows compatibility
          const migrationUrl = pathToFileURL(migrationPath).href;
          const migration = await import(migrationUrl);

          // Execute up() function
          await migration.up();

          // Record successful migration
          await this.recordMigration(migrationFile);

          console.log(` Migration ${migrationFile} completed\n`);
        } catch (error) {
          console.error(` Migration ${migrationFile} failed:`, error.message);
          console.error('Stack:', error.stack);
          console.log('\n  Migration stopped. Fix the error and run again.');
          await this.disconnect();
          process.exit(1);
        }
      }

      console.log(' All migrations completed successfully!\n');

      await this.disconnect();
    } catch (error) {
      console.error(' Migration process failed:', error.message);
      await this.disconnect();
      process.exit(1);
    }
  }

  async rollbackLastMigration() {
    try {
      console.log('\n Rolling back last migration...\n');

      await this.connect();

      const executedMigrations = await this.getExecutedMigrations();

      if (executedMigrations.length === 0) {
        console.log('  No migrations to rollback');
        await this.disconnect();
        return;
      }

      // Get last executed migration
      const lastMigration = executedMigrations[executedMigrations.length - 1];

      console.log(` Rolling back: ${lastMigration}...`);

      try {
        // Dynamic import of migration file
        const migrationPath = join(this.migrationsDir, lastMigration);
        // Convert to file:// URL for Windows compatibility
        const migrationUrl = pathToFileURL(migrationPath).href;
        const migration = await import(migrationUrl);

        // Execute down() function
        if (typeof migration.down !== 'function') {
          throw new Error('Migration does not have a down() function');
        }

        await migration.down();

        // Remove migration record
        await this.removeMigrationRecord(lastMigration);

        console.log(` Migration ${lastMigration} rolled back successfully\n`);
      } catch (error) {
        console.error(` Rollback failed for ${lastMigration}:`, error.message);
        console.error('Stack:', error.stack);
        await this.disconnect();
        process.exit(1);
      }

      await this.disconnect();
    } catch (error) {
      console.error(' Rollback process failed:', error.message);
      await this.disconnect();
      process.exit(1);
    }
  }
}

// Main execution
const command = process.argv[2];
const runner = new MigrationRunner();

if (command === 'down') {
  runner.rollbackLastMigration();
} else {
  runner.runMigrations();
}
