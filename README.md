# MMO Credential Manager - Optimized & Extensible

A professional Next.js application for managing user credentials with MongoDB, featuring admin controls, device activation, and extensible database architecture.

## 🚀 Quick Start

### 1. Environment Setup

\`\`\`bash
cp .env.example .env.local

# Edit .env.local with your MongoDB URI and JWT secret

\`\`\`

### 2. Database Setup

\`\`\`bash

# Install dependencies

npm install

# Setup database (auto-detects local/Atlas)

npm run db:setup

# Verify setup

npm run db:verify
\`\`\`

### 3. Run Application

\`\`\`bash
npm run dev
\`\`\`

Visit:

- **Homepage**: http://localhost:3000
- **Admin Portal**: http://localhost:3000/admin/login (admin/admin123)
- **User Portal**: http://localhost:3000/user/activate

## 📁 Project Structure

\`\`\`
├── app/ # Next.js App Router
│ ├── api/ # API Routes
│ │ ├── admin/ # Admin endpoints
│ │ └── user/ # User endpoints
│ ├── admin/ # Admin pages
│ ├── user/ # User pages
│ └── page.tsx # Homepage
├── scripts/ # Database management
│ ├── database-config.js # Collection configurations
│ ├── database-manager.js # Database operations
│ ├── setup-database.js # Setup script
│ ├── add-collection.js # Add new collections
│ ├── migrate-data.js # Data migration
│ └── integrated-utils.js # Utilities (backup/restore)
├── lib/ # Utilities
│ └── mongodb.ts # Database connection
├── types/ # TypeScript definitions
└── middleware.ts # Route protection & DB init
\`\`\`

## 🗄️ Database Collections

### activation_keys

- Stores activation keys with device limits
- Tracks registered devices and usage
- Supports expiration dates and metadata

### credentials

- User credential storage per device
- Bulk import/export capabilities
- Category and tag support

### user_profiles (extensible)

- User profile information
- Preferences and settings
- Avatar and display name

### audit_logs (extensible)

- Activity logging with TTL
- User action tracking
- Security monitoring

## 🛠️ Database Management

### Setup & Verification

\`\`\`bash
npm run db:setup # Full setup
npm run db:verify # Verify connection
npm run db:setup:selective # Setup specific collections
\`\`\`

### Adding New Collections

\`\`\`bash

# Method 1: Edit database-config.js

# Method 2: Dynamic addition

npm run db:add-collection user_sessions ./configs/sessions-config.js

# Method 3: Environment variables

COLLECTIONS_ONLY=new_collection npm run db:setup
\`\`\`

### Backup & Restore

\`\`\`bash
npm run db:backup # Create backup
npm run db:restore backup.json # Restore from backup
npm run db:cleanup # Clean expired data
\`\`\`

### Migration

\`\`\`bash
SOURCE_URI=mongodb://old-server npm run db:migrate
\`\`\`

## 🔧 Environment Variables

\`\`\`env

# Database

MONGODB_URI=mongodb://localhost:27017/mmo

# MONGODB_URI=mongodb+srv://user:pass@cluster.net/mmo

# Security

JWT_SECRET=your-jwt-secret-key
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123

# Setup Options (optional)

COLLECTIONS_ONLY=activation_keys,credentials
SKIP_COLLECTIONS=audit_logs
SKIP_INDEXES=false
SKIP_DEFAULT_DATA=false
\`\`\`

## 🎯 Features

### Admin Features

- ✅ Secure admin authentication
- ✅ Generate activation keys with device limits
- ✅ View/manage all activation keys
- ✅ Monitor device usage and registration
- ✅ Activate/deactivate keys
- ✅ Delete keys with confirmation
- ✅ View detailed key information

### User Features

- ✅ Device activation with unique keys
- ✅ Secure credential storage
- ✅ Bulk credential import (username|password format)
- ✅ Individual credential management
- ✅ Copy credentials to clipboard
- ✅ Show/hide password visibility
- ✅ Delete individual credentials

### Technical Features

- ✅ Extensible database architecture
- ✅ Auto-database initialization
- ✅ Environment detection (local/Atlas)
- ✅ JWT-based authentication
- ✅ Route protection middleware
- ✅ Responsive design with Tailwind CSS
- ✅ TypeScript support
- ✅ Error handling and validation

## 🔒 Security

- JWT tokens for user authentication
- HTTP-only cookies for admin sessions
- Device-based activation system
- Input validation and sanitization
- Protected API routes
- Secure password handling

## 📈 Extensibility

The database architecture is designed for easy expansion:

1. **Add Collections**: Edit `database-config.js` or use CLI tools
2. **Environment Control**: Use environment variables for selective setup
3. **Migration Support**: Built-in data migration capabilities
4. **Validation**: MongoDB schema validation for data integrity
5. **Indexing**: Automatic index creation for performance

## 🚀 Deployment

### Vercel Deployment

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push

### MongoDB Atlas Setup

1. Create MongoDB Atlas cluster
2. Whitelist your deployment IP
3. Update MONGODB_URI in environment variables
4. Run database setup

## 📝 Development

### Adding New Features

1. Define collection schema in `database-config.js`
2. Create API routes in `app/api/`
3. Build UI components
4. Add TypeScript types in `types/`
5. Update middleware if needed

### Testing

\`\`\`bash
npm run db:verify # Test database connection
npm run db:backup # Test backup functionality
\`\`\`

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request

## 📄 License

MIT License - see LICENSE file for details

######

# Security Implementation Guide

## Real-time Key Validation

This implementation ensures that users cannot continue using the application after their activation key is deleted or deactivated.

### Key Security Features

#### 1. **Middleware Protection**

- Real-time validation on every request
- Automatic token invalidation
- Seamless redirect to activation page

#### 2. **Token Management**

- Shorter token expiry (7 days instead of 30)
- HTTP-only cookies for better security
- Automatic token refresh on valid activation

#### 3. **Device Tracking**

- Last active timestamp updates
- Device-specific access control
- Admin ability to revoke individual devices

#### 4. **Session Validation**

- Periodic session checks (every 2 minutes)
- Graceful error handling
- User-friendly error messages

### Security Flow

1. **User Access**: Every request validates the activation key
2. **Key Deleted**: Immediate access revocation
3. **Key Deactivated**: Graceful session termination
4. **Device Revoked**: Individual device access control

### Admin Controls

- **Delete Keys**: Immediately revokes all associated devices
- **Deactivate Keys**: Temporarily suspends access
- **Revoke Devices**: Remove specific device access
- **Monitor Activity**: Track last active timestamps

### Error Handling

- **403 Forbidden**: Key deleted/deactivated
- **401 Unauthorized**: Invalid/expired token
- **Automatic Redirect**: Seamless user experience

This implementation provides enterprise-grade security with real-time access control.
