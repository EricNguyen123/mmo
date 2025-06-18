import { DatabaseManager } from './database-manager.js';
import { getActiveCollections } from './database-config.js';
import fs from 'fs';
import path from 'path';

export class IntegratedDatabaseUtils {
  constructor(uri) {
    this.manager = new DatabaseManager(uri);
  }

  async verifySetup() {
    try {
      await this.manager.connect();
      await this.manager.ping();

      const stats = await this.manager.getCollectionStats();
      console.log('✅ Database connection verified');
      console.log('📊 Collection Statistics:');
      Object.entries(stats).forEach(([name, count]) => {
        console.log(`  ${name}: ${count} documents`);
      });

      return true;
    } catch (error) {
      console.error('❌ Verification failed:', error.message);
      return false;
    } finally {
      await this.manager.disconnect();
    }
  }

  async backup(filename) {
    try {
      await this.manager.connect();

      const timestamp = new Date().toISOString().split('T')[0];
      const backupFile = filename || path.join(process.cwd(), `mmo-backup-${timestamp}.json`);

      const collections = getActiveCollections();
      const backup = { timestamp: new Date(), data: {} };

      for (const collectionName of collections) {
        backup.data[collectionName] = await this.manager.db
          .collection(collectionName)
          .find({})
          .toArray();
      }

      fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
      console.log(`✅ Backup saved: ${backupFile}`);

      return backupFile;
    } finally {
      await this.manager.disconnect();
    }
  }

  async restore(backupFile) {
    if (!fs.existsSync(backupFile)) {
      throw new Error(`Backup file not found: ${backupFile}`);
    }

    try {
      const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
      await this.manager.connect();

      for (const [collectionName, documents] of Object.entries(backupData.data)) {
        if (documents.length > 0) {
          await this.manager.db.collection(collectionName).deleteMany({});
          await this.manager.db.collection(collectionName).insertMany(documents);
          console.log(`Restored ${documents.length} documents to ${collectionName}`);
        }
      }

      console.log('✅ Restore completed');
    } finally {
      await this.manager.disconnect();
    }
  }

  async cleanupExpired() {
    try {
      await this.manager.connect();

      const result = await this.manager.db.collection('activation_keys').deleteMany({
        expiresAt: { $lt: new Date() },
        isActive: false,
      });

      console.log(`Cleaned up ${result.deletedCount} expired keys`);
      return result.deletedCount;
    } finally {
      await this.manager.disconnect();
    }
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];
  const utils = new IntegratedDatabaseUtils();

  switch (command) {
    case 'verify':
      await utils.verifySetup();
      break;
    case 'backup':
      await utils.backup(process.argv[3]);
      break;
    case 'restore':
      if (!process.argv[3]) {
        console.error('Usage: node integrated-utils.js restore <backup-file>');
        process.exit(1);
      }
      await utils.restore(process.argv[3]);
      break;
    case 'cleanup':
      await utils.cleanupExpired();
      break;
    default:
      console.log('Usage: node integrated-utils.js [verify|backup|restore|cleanup]');
  }
}
