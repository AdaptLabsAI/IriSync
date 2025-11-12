/**
 * Migrate Auth Users Script
 * 
 * This script creates Firestore user documents for all existing Firebase Auth users
 * who don't already have a corresponding document in the Firestore users collection.
 * 
 * Usage:
 * 1. Make sure environment variables are set in .env.local
 * 2. Run: node scripts/migrate-auth-users.js
 */

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');
const readline = require('readline');

// Initialize Firebase Admin with service account
const serviceAccount = {
  projectId: process.env.FIREBASE_ADMIN_PROJECT_ID || 'irisai-c83a1',
  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL || 'firebase-adminsdk-fbsvc@irisai-c83a1.iam.gserviceaccount.com',
  privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY 
    ? process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n')
    : "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDl08paa0GXSymZ\nkGlO1WAerZhS7mhxtM2O8PTX6QmYhhfqDfGq3q3F3JMx4UFGFEDW+eWtZeTxJ6mT\ndkfSbw0iWfo2QNVn95B24QRtnQ0R4WtCLy30Lk1ubW3zWy67DVY9ISFAaC9FuAGU\ntuMTVYG4dJ7/NwC3f72MNZJp8+/bH0owYLLEMtp22/BftTXcEqDSvSpUehTRDVPW\nGTSLti8AYivvf5F4hEiioJ/+fiDoe1lOGeJxF7IapUQkyW0XDNWclCmZTk3sfEsa\njujO+yIGOQDXScvb+cZmJdoOE90xsxFYpOXbWa8fUI+NDvti5OEKIBkYNaI/0prq\nSvfIf2kLAgMBAAECggEAXWanE/wG2f+X1mrUAU/CEnWmM/3jwGIkL/VI6/4vAids\nzJgCINkCcijkQR80MdDFURiZ+NAyLLdbuSwWoDS1d8JtZ2MN14TK1yU3cXyj9SJR\nPsKBwHyYx0n9pyrlYOtYots18kDlBUZ0jgWNXywe3eG3RC0MQ4bMd5DGAf06+yeF\nBztzSdsZ96L4PF6dVumYcGS54D1d8BxdF+kEdyOri0/J7yluWDV09gc7RpQxn8el\nxcGjEdwAOvyseU1SsHGYPNGZqtIFuF/mYj/qvljehVuc2A1C9r2MscsgeZBca1Hm\n/k8I6kvlYoh5O62l92Nyxm5Ey+82a16C1K8j+SlzUQKBgQD2YyHpxwWAPyFLYShd\nIukkhI6dpklUoeuN6l2FAaSKghuH1icR1SOeghBmP4WMNe98e1OZlPhXA6xy2mSn\n2/om6t4kfxWQ6ffsrTZZEbSUrQs/Oct9Hw6Ian8jSdqrhwD8vKY7sYcECeOM9/o4\nRagVylNAm7eJx+s6c918bn7sdwKBgQDuy0K4jzvjGfsyyyhPaf2Q5NhFi0S90xsc\nNnQ6aKNK9bL0J+xaBWtrIvbnvXoHwCnibFGW+FAp3jI0e/4KNQPL/KVeH2VQAiy4\nriVIYQaHhXzb+VLBqASaeUxNkY+zPI+SO7QpZCiZwlfPCuTNhf4CHUisBTDtyVhV\nG/ZARlKRDQKBgDip08LP4pP78MxFK+M/hB7B3YqkE3lDQ8j/fUJ5fj3cbjhvJ80S\nF378qojZUv1L6ifWtQM9H1/jmGVRlJSGIqGQokYCdBM/u6TSsQ0K5VzL7yo7QHEm\nE1GMLHERKxkHk1KMkC5qRYLIQ2zIGuOWIXHhdgQFy9AECjUHMIjNYKNBAoGBAL7I\nFl5t0WL39wH13hbUj4mbzE6DnkAq0ZYQy3t+7jeNZZQ78VFa0x+dp7YuY7idhtkn\nwWfkq+dHZsUX6zcsdAQdreEtJDxwAFrsh0z0d8r+k2sMH1opasQf9R5kFXMWB37F\nxILtSqLN6mm4QmURkIcP7mfBHf5cxv34gR2JEZ5hAoGABCrc6+XGjCcWoKj42V0z\nzxiqEsd0gccyrJ7zhLYv09sBgxOLK94s+HEtspIqcaxGsOMUweQFQ+vF4x8TUcBD\nAsfE3lzvc0hzVCprPeokchBBz8WU8QI7iPLmHBxHbaAswk9Qi2ZHe6D1bdNAHj9n\nJA5Cx9VQrUonOeF5ByRy8NA=\n-----END PRIVATE KEY-----"
};

// Initialize the app
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
    process.exit(1);
  }
}

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Generate a temporary password for users without Firestore documents
async function generateTemporaryPassword() {
  const tempPassword = Math.random().toString(36).slice(-10);
  const saltRounds = 12;
  const passwordHash = await bcrypt.hash(tempPassword, saltRounds);
  return { tempPassword, passwordHash };
}

// Determine user's organization or create a default one
async function getOrCreateOrganization(userId, userEmail) {
  try {
    // Check if user is already part of an organization as a member
    const orgMemberships = await admin.firestore()
      .collectionGroup('members')
      .where('userId', '==', userId)
      .get();
    
    if (!orgMemberships.empty) {
      // User is already a member of an organization, use that one
      const orgId = orgMemberships.docs[0].ref.parent.parent.id;
      console.log(`User ${userId} is already a member of organization ${orgId}`);
      return orgId;
    }
    
    // Check if user has an organization claim in Auth
    const userRecord = await admin.auth().getUser(userId);
    if (userRecord.customClaims && userRecord.customClaims.organizationId) {
      // Verify this organization exists
      const orgDoc = await admin.firestore()
        .collection('organizations')
        .doc(userRecord.customClaims.organizationId)
        .get();
      
      if (orgDoc.exists) {
        console.log(`User ${userId} has organization claim ${userRecord.customClaims.organizationId}`);
        return userRecord.customClaims.organizationId;
      }
    }
    
    // Create a new personal organization for this user
    const now = admin.firestore.Timestamp.now();
    const organizationId = userId; // Use user ID as organization ID
    
    const organizationData = {
      id: organizationId,
      name: userEmail.split('@')[0] + "'s Organization", // Create a simple org name from email
      ownerId: userId,
      createdAt: now,
      updatedAt: now,
      subscription: {
        tier: 'free', // Default to free tier
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: admin.firestore.Timestamp.fromDate(
          new Date(now.toDate().getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days
        ),
        seats: 1 // Single user
      },
      settings: {
        allowGuestAccess: false,
        requireEmailVerification: true
      }
    };
    
    await admin.firestore().collection('organizations').doc(organizationId).set(organizationData);
    
    // Add user as org owner
    const memberData = {
      userId: userId,
      email: userEmail,
      firstName: userEmail.split('@')[0], // Default first name based on email
      lastName: '',
      role: 'owner', // Organization role
      permissions: ['full_access'],
      joinedAt: now,
      invitedBy: userId
    };
    
    await admin.firestore().collection('organizations').doc(organizationId)
      .collection('members').doc(userId).set(memberData);
    
    console.log(`Created new organization ${organizationId} for user ${userId}`);
    return organizationId;
  } catch (error) {
    console.error(`Error handling organization for user ${userId}:`, error);
    return userId; // Fallback to using user ID as org ID
  }
}

// Process a batch of users to create Firestore documents
async function processUserBatch(userRecords) {
  console.log(`Processing batch of ${userRecords.length} users`);
  
  for (const user of userRecords) {
    try {
      // Check if user already has a Firestore document
      const userDoc = await admin.firestore().collection('users').doc(user.uid).get();
      
      if (userDoc.exists) {
        console.log(`User ${user.uid} already has a Firestore document, skipping...`);
        continue;
      }
      
      // Get or create organization for user
      const organizationId = await getOrCreateOrganization(user.uid, user.email);
      
      // Generate password hash for user
      const { passwordHash } = await generateTemporaryPassword();
      
      // Determine user role from custom claims or default to 'user'
      let role = 'user';
      if (user.customClaims && user.customClaims.role) {
        role = user.customClaims.role;
      }
      
      // Create user document in Firestore
      const now = admin.firestore.Timestamp.now();
      const userData = {
        email: user.email,
        passwordHash,
        firstName: user.displayName ? user.displayName.split(' ')[0] : '',
        lastName: user.displayName ? user.displayName.split(' ').slice(1).join(' ') : '',
        role,
        emailVerified: user.emailVerified,
        createdAt: admin.firestore.Timestamp.fromMillis(user.metadata.creationTime),
        updatedAt: now,
        firebaseUid: user.uid,
        organizationId,
        businessType: 'individual', // Default
        companyName: '',
        subscription: {
          tier: 'free', // Default to free tier
          status: 'active',
          currentPeriodStart: now,
          currentPeriodEnd: admin.firestore.Timestamp.fromDate(
            new Date(now.toDate().getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days
          ),
          cancelAtPeriodEnd: false,
          seats: 1
        }
      };
      
      // Save to Firestore
      await admin.firestore().collection('users').doc(user.uid).set(userData);
      
      // Ensure custom claims are set correctly
      if (!user.customClaims || !user.customClaims.organizationId) {
        await admin.auth().setCustomUserClaims(user.uid, {
          role,
          organizationId
        });
      }
      
      // Create audit log
      await admin.firestore().collection('auditLogs').add({
        action: 'MIGRATE_USER_TO_FIRESTORE',
        userId: user.uid,
        email: user.email,
        organizationId,
        performedBy: 'script',
        timestamp: now
      });
      
      console.log(`✅ Created Firestore document for user ${user.uid} (${user.email})`);
    } catch (error) {
      console.error(`Error processing user ${user.uid}:`, error);
    }
  }
}

// Get all Firebase Auth users and create Firestore documents
async function migrateUsers() {
  try {
    console.log('Starting migration of Firebase Auth users to Firestore...');
    
    // Keep track of processed users with pagination
    let pageToken;
    let totalProcessed = 0;
    let totalCreated = 0;
    let batchSize = 1000; // Firebase Auth list users batch size
    
    do {
      // Get batch of users from Firebase Auth
      const listUsersResult = await admin.auth().listUsers(batchSize, pageToken);
      pageToken = listUsersResult.pageToken;
      
      // Process this batch of users
      await processUserBatch(listUsersResult.users);
      
      totalProcessed += listUsersResult.users.length;
      console.log(`Processed ${totalProcessed} users so far...`);
      
      // If there are more users, continue with the next batch
    } while (pageToken);
    
    console.log('\n✅ MIGRATION COMPLETED SUCCESSFULLY');
    console.log(`Total users processed: ${totalProcessed}`);
    
    return { totalProcessed, totalCreated };
  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  }
}

// Main function
async function main() {
  try {
    console.log('\n=== FIREBASE AUTH TO FIRESTORE MIGRATION ===\n');
    console.log('This will create Firestore user documents for all Firebase Auth users who don\'t have one.');
    
    rl.question('Do you want to proceed? (yes/no): ', async (answer) => {
      if (answer.toLowerCase() === 'yes') {
        await migrateUsers();
      } else {
        console.log('Migration cancelled.');
      }
      rl.close();
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to migrate users:', error);
    rl.close();
    process.exit(1);
  }
}

// Run the script
main(); 