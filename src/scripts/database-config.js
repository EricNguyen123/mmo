// Optimized Database Configuration
export const DATABASE_CONFIG = {
  name: 'mmo',
  collections: {
    users: {
      validation: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['username', 'email', 'passwordHash', 'role', 'createdAt'],
          properties: {
            username: { bsonType: 'string', minLength: 3, maxLength: 50 },
            email: {
              bsonType: 'string',
              pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
            },
            passwordHash: { bsonType: 'string', minLength: 6 },
            role: { bsonType: 'string', enum: ['ADMIN', 'USER'] },
            firstName: { bsonType: 'string', maxLength: 50 },
            lastName: { bsonType: 'string', maxLength: 50 },
            isActive: { bsonType: 'bool' },
            createdAt: { bsonType: 'date' },
            updatedAt: { bsonType: 'date' },
            lastLoginAt: { bsonType: 'date' },
          },
        },
      },
      indexes: [
        { fields: { username: 1 }, options: { unique: true } },
        { fields: { email: 1 }, options: { unique: true } },
        { fields: { role: 1 } },
        { fields: { isActive: 1 } },
        { fields: { createdAt: -1 } },
      ],
    },

    activation_keys: {
      validation: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['key', 'deviceLimit', 'usedDevices', 'isActive', 'createdAt'],
          properties: {
            key: { bsonType: 'string', minLength: 10, maxLength: 100 },
            deviceLimit: { bsonType: 'int', minimum: 1, maximum: 1000 },
            usedDevices: { bsonType: 'int', minimum: 0 },
            isActive: { bsonType: 'bool' },
            createdAt: { bsonType: 'date' },
            updatedAt: { bsonType: 'date' },
            expiresAt: { bsonType: 'date' },
            description: { bsonType: 'string', maxLength: 500 },
            createdBy: { bsonType: 'string' },
            devices: {
              bsonType: 'array',
              items: {
                bsonType: 'object',
                required: ['deviceId', 'userId', 'registeredAt'],
                properties: {
                  deviceId: { bsonType: 'string' },
                  userId: { bsonType: 'string' },
                  assignmentId: { bsonType: 'objectId' },
                  registeredAt: { bsonType: 'date' },
                  lastActiveAt: { bsonType: 'date' },
                  isActive: { bsonType: 'bool' },
                  deviceInfo: {
                    bsonType: 'object',
                    properties: {
                      userAgent: { bsonType: 'string' },
                      ipAddress: { bsonType: 'string' },
                      platform: { bsonType: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      indexes: [
        { fields: { key: 1 }, options: { unique: true } },
        { fields: { isActive: 1 } },
        { fields: { createdAt: -1 } },
        { fields: { 'devices.userId': 1 } },
        { fields: { 'devices.assignmentId': 1 } },
      ],
    },

    user_key_assignments: {
      validation: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['userId', 'keyId', 'assignedAt', 'assignedBy', 'status'],
          properties: {
            userId: { bsonType: 'objectId' },
            keyId: { bsonType: 'objectId' },
            assignedAt: { bsonType: 'date' },
            assignedBy: { bsonType: 'string' },
            status: { bsonType: 'string', enum: ['ACTIVE', 'INACTIVE', 'EXPIRED', 'REVOKED'] },
            expiresAt: { bsonType: 'date' },
            notes: { bsonType: 'string', maxLength: 1000 },
            deviceCount: { bsonType: 'int', minimum: 0 },
            lastUsedAt: { bsonType: 'date' },
            metadata: {
              bsonType: 'object',
              properties: {
                department: { bsonType: 'string', maxLength: 100 },
                project: { bsonType: 'string', maxLength: 100 },
                tags: { bsonType: 'array', items: { bsonType: 'string' } },
              },
            },
          },
        },
      },
      indexes: [
        { fields: { keyId: 1 }, options: { unique: true } },
        { fields: { userId: 1 } },
        { fields: { status: 1 } },
        { fields: { assignedAt: -1 } },
        { fields: { expiresAt: 1 } },
      ],
    },

    credentials: {
      validation: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['userId', 'title', 'username', 'password', 'createdAt'],
          properties: {
            userId: { bsonType: 'string' },
            title: { bsonType: 'string', minLength: 1, maxLength: 200 },
            username: { bsonType: 'string', minLength: 1, maxLength: 100 },
            password: { bsonType: 'string', minLength: 1 },
            url: { bsonType: 'string', maxLength: 500 },
            notes: { bsonType: 'string', maxLength: 2000 },
            category: { bsonType: 'string', maxLength: 50 },
            createdAt: { bsonType: 'date' },
            updatedAt: { bsonType: 'date' },
          },
        },
      },
      indexes: [
        { fields: { userId: 1 } },
        { fields: { createdAt: -1 } },
        { fields: { category: 1 } },
        { fields: { title: 1, userId: 1 } },
      ],
    },
  },
};

// Simplified environment configuration
export const ENVIRONMENT_CONFIG = {
  useValidation: process.env.NODE_ENV !== 'production',
  createIndexes: true,
};

// Helper functions
export function getRequiredCollections() {
  return ['users', 'activation_keys', 'user_key_assignments', 'credentials'];
}

export function getCollectionConfig(name) {
  return DATABASE_CONFIG.collections[name];
}
