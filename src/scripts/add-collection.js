import { DatabaseManager } from './database-manager.js';

// Example script to add a new collection dynamically
async function addNewCollection() {
  const collectionName = process.argv[2];
  const configFile = process.argv[3];

  if (!collectionName) {
    console.error('Usage: node add-collection.js <collection-name> [config-file]');
    console.error(
      'Example: node add-collection.js user_sessions ./configs/user-sessions-config.js'
    );
    process.exit(1);
  }

  const manager = new DatabaseManager();

  try {
    await manager.connect();

    let config;
    if (configFile) {
      // Load configuration from external file
      const configModule = await import(configFile);
      config = configModule.default || configModule.config;
    } else {
      // Use a basic default configuration
      config = {
        validation: {
          $jsonSchema: {
            bsonType: 'object',
            required: ['createdAt'],
            properties: {
              createdAt: { bsonType: 'date' },
            },
          },
        },
        indexes: [{ fields: { createdAt: -1 } }],
        defaultData: null,
      };
    }

    await manager.addNewCollection(collectionName, config);
  } finally {
    await manager.disconnect();
  }
}

addNewCollection().catch(console.error);
