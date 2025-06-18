/* eslint-disable @typescript-eslint/no-explicit-any */
import { MongoClient, type Db } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mmo';
const DB_NAME = 'mmo';

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(DB_NAME);

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}

// Simplified connection function
export async function getDatabase() {
  const { db } = await connectToDatabase();
  return db;
}

// Collection helpers for consistency
export async function getCollection(name: string) {
  const db = await getDatabase();
  return db.collection(name);
}

// Specific collection getters for type safety
export async function getUsersCollection() {
  return getCollection('users');
}

export async function getActivationKeysCollection() {
  return getCollection('activation_keys');
}

export async function getUserKeyAssignmentsCollection() {
  return getCollection('user_key_assignments');
}

export async function getCredentialsCollection() {
  return getCollection('credentials');
}

// Health check function
export async function checkDatabaseHealth() {
  try {
    const { client } = await connectToDatabase();
    await client.db(DB_NAME).admin().ping();
    return { status: 'healthy', database: DB_NAME };
  } catch (error) {
    return { status: 'unhealthy', error: error instanceof Error ? error.message : String(error) };
  }
}

// Enhanced connection with auto-setup (for backward compatibility)
export async function connectWithSetup() {
  try {
    const { client, db } = await connectToDatabase();

    // Verify collections exist, create if missing
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map((c) => c.name);

    const requiredCollections = ['activation_keys', 'credentials', 'users', 'user_key_assignments'];
    const missingCollections = requiredCollections.filter(
      (name) => !collectionNames.includes(name)
    );

    if (missingCollections.length > 0) {
      console.log(`Auto-creating missing collections: ${missingCollections.join(', ')}`);

      // Create missing collections
      for (const collectionName of missingCollections) {
        await db.createCollection(collectionName);
        console.log(`✅ Created collection: ${collectionName}`);
      }

      // Create basic indexes
      await ensureIndexes();
    }

    return { client, db };
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
}

// Utility function to ensure indexes exist
export async function ensureIndexes() {
  const db = await getDatabase();

  try {
    // Activation keys indexes
    await db.collection('activation_keys').createIndex({ key: 1 }, { unique: true });
    await db.collection('activation_keys').createIndex({ isActive: 1 });
    await db.collection('activation_keys').createIndex({ createdAt: -1 });

    // Credentials indexes
    await db.collection('credentials').createIndex({ userId: 1 });
    await db.collection('credentials').createIndex({ createdAt: -1 });

    // Users indexes
    await db.collection('users').createIndex({ username: 1 }, { unique: true });
    await db.collection('users').createIndex({ email: 1 }, { unique: true });

    // User key assignments indexes
    await db.collection('user_key_assignments').createIndex({ userId: 1 });
    await db.collection('user_key_assignments').createIndex({ keyId: 1 }, { unique: true });
    await db.collection('user_key_assignments').createIndex({ assignedAt: -1 });

    console.log('✅ Database indexes verified');
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as any).code !== 85
    ) {
      // Ignore "index already exists" error
      console.warn('Index creation warning:', (error as any).message);
    }
  }
}
