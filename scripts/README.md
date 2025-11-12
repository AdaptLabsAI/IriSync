# IriSync Utility Scripts

This directory contains utility scripts for development, deployment, and maintenance of the IriSync application.

## Available Scripts

### 1. Logo Resizer (`resize-logo.js`)

Automatically generates all required icon sizes from a square logo image.

**Setup:**
```bash
# Install required dependency
npm install sharp
```

**Usage:**
```bash
node scripts/resize-logo.js <path-to-source-logo> [output-directory]
```

**Example:**
```bash
# From project root
node scripts/resize-logo.js ./assets/logo-square.png ./public/icons
```

This script will generate:
- All PWA icon sizes in `/public/icons/`
- Favicon PNG files (16x16, 32x32) in `/public/`
- Apple touch icon (180x180) in `/public/`
- Microsoft tile icon (150x150) in `/public/`

**Note:** This script does not generate the multi-size favicon.ico file. Use an online tool like realfavicongenerator.net for that.

### 2. Knowledge Base Indexer (`index-knowledge-base.ts`)

Indexes knowledge base content into the vector database for RAG search.

**Usage:**
```bash
npx ts-node scripts/index-knowledge-base.ts [docs-path] [collection-name] [chunk-size] [chunk-overlap]
```

**Example:**
```bash
npx ts-node scripts/index-knowledge-base.ts ./docs/support support_docs 1000 200
```

### 3. Database Seeder (`db-seed.ts`)

Seeds the database with initial sample data for testing and development.

**Usage:**
```bash
npx ts-node scripts/db-seed.ts [data-type]
```

**Example:**
```bash
# Seed all data types
npx ts-node scripts/db-seed.ts all

# Seed only knowledge content
npx ts-node scripts/db-seed.ts knowledge
```

### 4. Data Backup (`data-backup.ts`)

Backs up Firestore collections to JSON files.

**Usage:**
```bash
npx ts-node scripts/data-backup.ts [output-dir] [collections]
```

**Example:**
```bash
# Backup all default collections
npx ts-node scripts/data-backup.ts ./backups

# Backup specific collections
npx ts-node scripts/data-backup.ts ./backups knowledgeContent,blogPosts
```

### 5. Performance Testing (`performance-test.ts`)

Runs performance tests against API endpoints.

**Usage:**
```bash
npx ts-node scripts/performance-test.ts [config-file] [results-file]
```

**Example:**
```bash
npx ts-node scripts/performance-test.ts ./scripts/performance-tests.json ./performance-results.json
```

# IriSync Admin Scripts

This directory contains administrative scripts for managing the IriSync application.

## Create Super Admin

The `create-super-admin.js` script allows you to create a super admin user directly in Firebase Auth and Firestore, bypassing the normal registration and payment flow.

### Prerequisites

- Node.js (v14 or higher)
- Firebase Admin SDK credentials configured in your `.env.local` file
- Firestore database access

### Environment Variables

Make sure the following variables are set in your `.env.local` file:

```
FIREBASE_ADMIN_PROJECT_ID=irisai-c83a1
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-fbsvc@irisai-c83a1.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...[full private key]...-----END PRIVATE KEY-----\n"
```

### Running the Script

```bash
# Install dependencies if not already done
npm install

# Run the script
node scripts/create-super-admin.js
```

The script will prompt you for:
- Email address
- Password
- First name
- Last name

### What It Does

1. Creates a user in Firebase Authentication
2. Sets custom claims for the super_admin role
3. Creates a user document in Firestore with required fields
4. Assigns enterprise-level subscription privileges
5. Creates an audit log entry for the action

### Notes

- This script should be used **only by trusted team members** with full system access
- It is intended for initial system setup or recovery situations
- The created super admin will have full system access
- Once created, the super admin can log in normally and create additional admin/super admin accounts through the admin interface

### Troubleshooting

If you encounter errors related to Firebase Admin initialization:

1. Check that your `.env.local` file has the correct Firebase Admin credentials
2. Ensure the private key is properly formatted with newlines as `\n`
3. Verify that the service account has the necessary permissions in Firebase 