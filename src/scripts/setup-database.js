import { MongoClient } from 'mongodb';
import { DATABASE_CONFIG, ENVIRONMENT_CONFIG, getRequiredCollections } from './database-config.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';

class DatabaseSetup {
  constructor() {
    this.client = new MongoClient(MONGODB_URI);
    this.db = null;
  }

  async connect() {
    await this.client.connect();
    this.db = this.client.db(DATABASE_CONFIG.name);
    console.log(`✅ Connected to database: ${DATABASE_CONFIG.name}`);
  }

  async setupCollections() {
    const requiredCollections = getRequiredCollections();
    const existingCollections = await this.db.listCollections().toArray();
    const existingNames = existingCollections.map((c) => c.name);

    for (const collectionName of requiredCollections) {
      const config = DATABASE_CONFIG.collections[collectionName];

      if (!existingNames.includes(collectionName)) {
        console.log(`📦 Creating collection: ${collectionName}`);
        await this.db.createCollection(collectionName, {
          validator: ENVIRONMENT_CONFIG.useValidation ? config.validation : undefined,
        });
      }

      // Create indexes
      if (config.indexes && ENVIRONMENT_CONFIG.createIndexes) {
        console.log(`🔍 Creating indexes for: ${collectionName}`);
        const collection = this.db.collection(collectionName);

        for (const indexConfig of config.indexes) {
          try {
            await collection.createIndex(indexConfig.fields, indexConfig.options || {});
          } catch (error) {
            if (error.code !== 85) {
              // Index already exists
              console.warn(`⚠️ Index warning for ${collectionName}:`, error.message);
            }
          }
        }
      }
    }
  }

  async createDefaultAdmin() {
    const users = this.db.collection('users');
    const adminExists = await users.findOne({ role: 'ADMIN' });

    if (!adminExists) {
      console.log('👤 Creating default admin user');
      await users.insertOne({
        username: 'admin',
        email: 'admin@securevault.com',
        passwordHash: '$2b$10$rQZ8kHWKtGXGvKWGz8WGxOYxJxGxGxGxGxGxGxGxGxGxGxGxGx',
        role: 'ADMIN',
        firstName: 'System',
        lastName: 'Administrator',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  async disconnect() {
    await this.client.close();
    console.log('🔌 Disconnected from database');
  }

  async run() {
    try {
      await this.connect();
      await this.setupCollections();
      await this.createDefaultAdmin();
      console.log('🎉 Database setup completed successfully!');
    } catch (error) {
      console.error('❌ Database setup failed:', error);
      throw error;
    } finally {
      await this.disconnect();
    }
  }
}

// Run setup if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const setup = new DatabaseSetup();
  setup.run().catch(console.error);
}

export { DatabaseSetup };
