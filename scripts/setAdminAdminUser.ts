/**
 * One-time script to promote admin@irisync.com to an admin using custom claims
 * 
 * This script uses the Firebase Admin SDK to set a custom claim { admin: true }
 * for the user with email admin@irisync.com.
 * 
 * Prerequisites:
 * 1. Firebase Authentication user with email admin@irisync.com must already exist
 * 2. Environment variables must be configured in .env.local
 * 
 * Usage:
 * npx ts-node scripts/setAdminAdminUser.ts
 */

// Load environment variables from .env.local
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as admin from 'firebase-admin';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Admin email to promote
const ADMIN_EMAIL = 'admin@irisync.com';

/**
 * Initialize Firebase Admin SDK
 */
function initializeFirebaseAdmin() {
  // Check if Firebase Admin is already initialized
  if (admin.apps.length > 0) {
    console.log('✓ Firebase Admin SDK already initialized');
    return;
  }

  // Get environment variables
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const rawPrivateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  // Validate required environment variables
  if (!projectId || !clientEmail || !rawPrivateKey) {
    console.error('❌ Missing required Firebase Admin environment variables:');
    console.error(`   - FIREBASE_ADMIN_PROJECT_ID: ${projectId ? '✓' : '✗'}`);
    console.error(`   - FIREBASE_ADMIN_CLIENT_EMAIL: ${clientEmail ? '✓' : '✗'}`);
    console.error(`   - FIREBASE_ADMIN_PRIVATE_KEY: ${rawPrivateKey ? '✓' : '✗'}`);
    console.error('\nPlease ensure these variables are set in your .env.local file.');
    process.exit(1);
  }

  // Normalize private key (replace escaped newlines with actual newlines)
  const privateKey = rawPrivateKey.replace(/\\n/g, '\n');

  try {
    // Initialize Firebase Admin
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });

    console.log('✓ Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing Firebase Admin SDK:', error);
    process.exit(1);
  }
}

/**
 * Set admin custom claim for the specified user
 */
async function setAdminRole() {
  try {
    console.log(`\nLooking up user: ${ADMIN_EMAIL}...`);

    // Look up the user by email
    const userRecord = await admin.auth().getUserByEmail(ADMIN_EMAIL);

    console.log(`✓ Found user with UID: ${userRecord.uid}`);

    // Check if user already has admin claim
    const currentClaims = userRecord.customClaims || {};
    if (currentClaims.admin === true) {
      console.log(`ℹ User ${ADMIN_EMAIL} already has admin role`);
      return;
    }

    // Set custom claim
    console.log(`Setting admin custom claim...`);
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      ...currentClaims,
      admin: true,
    });

    console.log(`✅ Admin role added to ${ADMIN_EMAIL}`);
    console.log(`\nℹ The user will need to sign out and sign back in for the changes to take effect.`);
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      console.error(`❌ Failed to add admin role: User ${ADMIN_EMAIL} not found`);
      console.error('\nPlease create this user in Firebase Console first:');
      console.error('   1. Go to Firebase Console > Authentication > Users');
      console.error('   2. Click "Add user"');
      console.error(`   3. Enter email: ${ADMIN_EMAIL}`);
      console.error('   4. Set a password');
      console.error('   5. Run this script again');
    } else {
      console.error('❌ Failed to add admin role:', error.message || error);
    }
    process.exit(1);
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log('='.repeat(60));
  console.log('Firebase Admin Role Setup Script');
  console.log('='.repeat(60));

  // Initialize Firebase Admin SDK
  initializeFirebaseAdmin();

  // Set the admin role
  await setAdminRole();

  console.log('\n' + '='.repeat(60));
  console.log('Script completed successfully!');
  console.log('='.repeat(60));

  process.exit(0);
}

// Run the script
main().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
