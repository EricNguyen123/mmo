import { MongoClient } from 'mongodb';
import { DatabaseManager } from './database-manager.js';
import { getActiveCollections, DATABASE_CONFIG } from './database-config.js';

const SOURCE_URI = process.env.SOURCE_URI || 'mongodb://localhost:27017/credential-manager';

async function migrateData() {
  let sourceClient;
  const targetManager = new DatabaseManager();

  try {
    // Connect to source database
    sourceClient = new MongoClient(SOURCE_URI);
    await sourceClient.connect();
    const sourceDb = sourceClient.db();

    // Connect to target database
    await targetManager.connect();

    console.log('Connected to source and target databases');

    // Get collections to migrate
    const collections = process.env.MIGRATE_COLLECTIONS?.split(',') || getActiveCollections();

    let totalMigrated = 0;
    for (const collectionName of collections) {
      const count = await targetManager.migrateCollection(sourceDb, collectionName);
      totalMigrated += count;
    }

    // Recreate indexes for migrated collections
    console.log('Recreating indexes...');
    for (const collectionName of collections) {
      const config = DATABASE_CONFIG.collections[collectionName];
      if (config?.indexes) {
        await targetManager.createIndexes(collectionName, config.indexes);
      }
    }

    console.log(`✅ Migration completed - ${totalMigrated} total documents migrated`);
  } finally {
    if (sourceClient) await sourceClient.close();
    await targetManager.disconnect();
  }
}

migrateData().catch(console.error);
