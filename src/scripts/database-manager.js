import { MongoClient } from 'mongodb';
import {
  DATABASE_CONFIG,
  ENVIRONMENT_CONFIG,
  getActiveCollections,
  shouldCreateCollection,
} from './database-config.js';

export class DatabaseManager {
  constructor(uri) {
    this.uri = uri || process.env.MONGODB_URI || 'mongodb://localhost:27017/mmo';
    this.client = null;
    this.db = null;
    this.isAtlas = this.uri.includes('mongodb+srv://');
    this.environment = this.isAtlas ? 'atlas' : 'local';
  }

  async connect() {
    this.client = new MongoClient(this.uri);
    await this.client.connect();
    this.db = this.client.db(DATABASE_CONFIG.name);
    console.log(`Connected to ${this.environment} database: ${this.db.databaseName}`);
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
    }
  }

  async ping() {
    await this.db.admin().ping();
  }

  async setupDatabase(options = {}) {
    const { collectionsOnly = null, skipIndexes = false, skipDefaultData = false } = options;

    try {
      await this.connect();
      await this.ping();

      const collections = collectionsOnly || getActiveCollections();
      console.log(`Setting up collections: ${collections.join(', ')}`);

      for (const collectionName of collections) {
        if (!shouldCreateCollection(collectionName)) {
          console.log(`Skipping collection: ${collectionName}`);
          continue;
        }

        await this.setupCollection(collectionName, { skipIndexes, skipDefaultData });
      }

      console.log(`✅ ${this.environment} database setup completed`);
    } catch (error) {
      console.error('❌ Setup failed:', error.message);
      this.handleError(error);
      throw error;
    }
  }

  async setupCollection(collectionName, options = {}) {
    const { skipIndexes = false, skipDefaultData = false } = options;
    const config = DATABASE_CONFIG.collections[collectionName];

    if (!config) {
      throw new Error(`Collection configuration not found: ${collectionName}`);
    }

    console.log(`Setting up collection: ${collectionName}`);

    // Create collection
    await this.createCollection(collectionName, config);

    // Create indexes
    if (!skipIndexes) {
      await this.createIndexes(collectionName, config.indexes);
    }

    // Insert default data
    if (!skipDefaultData && config.defaultData) {
      await this.insertDefaultData(collectionName, config.defaultData);
    }
  }

  async createCollection(collectionName, config) {
    const envConfig = ENVIRONMENT_CONFIG[this.environment];

    try {
      if (envConfig.useValidation && config.validation) {
        // Create collection with validation for local MongoDB
        await this.db.createCollection(collectionName, {
          validator: config.validation,
        });
        console.log(`Created ${collectionName} with validation`);
      } else {
        // Create collection without validation (for Atlas or when disabled)
        const collections = await this.db.listCollections({ name: collectionName }).toArray();
        if (collections.length === 0) {
          // Create collection by inserting and removing a temporary document
          await this.db.collection(collectionName).insertOne({ _temp: true });
          await this.db.collection(collectionName).deleteOne({ _temp: true });
          console.log(`Created ${collectionName}`);
        }
      }
    } catch (error) {
      if (error.code === 48) {
        console.log(`Collection ${collectionName} already exists`);
      } else {
        throw error;
      }
    }
  }

  async createIndexes(collectionName, indexes) {
    if (!indexes || indexes.length === 0) return;

    const collection = this.db.collection(collectionName);

    for (const indexConfig of indexes) {
      try {
        await collection.createIndex(indexConfig.fields, indexConfig.options || {});
      } catch (error) {
        if (error.code === 85) {
          // Index already exists
          continue;
        }
        console.warn(`Failed to create index on ${collectionName}:`, error.message);
      }
    }

    console.log(`Created ${indexes.length} indexes for ${collectionName}`);
  }

  async insertDefaultData(collectionName, defaultDataFn) {
    const collection = this.db.collection(collectionName);

    // Check if default data already exists
    const existingDefault = await collection.findOne({ createdBy: 'setup-script' });
    if (existingDefault) {
      console.log(`Default data already exists for ${collectionName}`);
      return;
    }

    const defaultData = typeof defaultDataFn === 'function' ? defaultDataFn() : defaultDataFn;
    await collection.insertOne(defaultData);
    console.log(`Inserted default data for ${collectionName}`);
  }

  async getCollectionStats() {
    const stats = {};
    const collections = await this.db.listCollections().toArray();

    for (const col of collections) {
      stats[col.name] = await this.db.collection(col.name).countDocuments();
    }

    return stats;
  }

  async addNewCollection(collectionName, config) {
    // Dynamically add a new collection
    DATABASE_CONFIG.collections[collectionName] = config;
    await this.setupCollection(collectionName);
    console.log(`✅ Added new collection: ${collectionName}`);
  }

  async migrateCollection(sourceDb, collectionName) {
    const sourceCollection = sourceDb.collection(collectionName);
    const targetCollection = this.db.collection(collectionName);

    const documents = await sourceCollection.find({}).toArray();

    if (documents.length === 0) {
      console.log(`No data to migrate for ${collectionName}`);
      return 0;
    }

    // Clear target and insert source data
    await targetCollection.deleteMany({});
    await targetCollection.insertMany(documents);

    console.log(`Migrated ${documents.length} documents to ${collectionName}`);
    return documents.length;
  }

  handleError(error) {
    if (error.message.includes('authentication')) {
      console.log('💡 Check your credentials and IP whitelist (for Atlas)');
    }

    if (error.message.includes('ECONNREFUSED')) {
      console.log('💡 Make sure MongoDB is running locally');
    }

    if (error.message.includes('network')) {
      console.log('💡 Check your internet connection and Atlas cluster status');
    }
  }
}
