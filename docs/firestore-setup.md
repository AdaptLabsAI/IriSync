# Firestore Setup Guide

This document provides information on the Firestore setup for the Irisync application.

## Overview

The Irisync application uses Firebase Firestore as its database. The following components have been configured:

1. **Firestore Security Rules**: Defined in `firestore.rules`
2. **Firestore Indexes**: Defined in `firestore.indexes.json`
3. **Initialization Script**: Located at `scripts/initialize-firestore.js`

## Security Rules

The security rules implement the following permission model:

- Users can read and write their own data
- Admins can read all data
- Super admins can write all data
- Content posts can be read by any authenticated user
- Content items can be read by their creator or organization members
- Calendar events can be managed by their owner
- Organizations can be accessed by their members
- Public profiles and testimonials can be read by anyone

## Collections Structure

The database structure is documented in `docs/firestore-collections.md`. The main collections are:

- `users` - User accounts and profile information
- `contentPosts` - Social media content (basic posts)
- `content` - Comprehensive content items (rich features)
- `organizations` - Organization information
- `dashboardStats` - Statistics for dashboard widgets
- `platforms` - Social media platform connections
- `activities` - User activity logs
- `notifications` - User notifications
- `media` - Media files (images, videos, etc.)
- `analytics` - Performance analytics data
- `userProfiles` - Public user profile information
- `userSettings` - User preferences and settings

User subcollections include: `settings`, `activities`, `notifications`, and `calendarEvents`.

## Deployment Instructions

To deploy the Firestore rules and indexes:

```bash
# Login to Firebase
firebase login

# Deploy Firestore Rules
firebase deploy --only firestore:rules

# Deploy Firestore Indexes
firebase deploy --only firestore:indexes

# Deploy both rules and indexes
firebase deploy --only firestore
```

## Initialization

To initialize the Firestore database with test data:

```bash
# Requires Firebase admin credentials
npm run firebase:setup
```

Note: The initialization script requires proper Firebase credentials with admin access. You may need to configure a service account key or use Firebase authentication.

### Using Firebase Emulator (Recommended for Development)

For local development, you can use the Firebase emulators:

1. Make sure Java is installed on your system
2. Run the emulators:

```bash
firebase emulators:start
```

3. Update your application to connect to the emulators during development.

## Troubleshooting

### Permission Denied

If you receive "Missing or insufficient permissions" errors:

1. Verify your Firebase credentials
2. Make sure you're logged in using `firebase login`
3. Check that your account has the necessary permissions for the project

### Private Key Issues

If you encounter private key parsing errors:

1. Make sure the private key is properly formatted with newlines
2. Consider using a service account JSON file instead of environment variables
3. For development, use Firebase emulators to avoid authentication issues

## Next Steps

1. Complete the Firestore initialization with proper authentication
2. Test the security rules to ensure proper access control
3. Implement Firestore integration in all required components
4. Add data validation to ensure data integrity 