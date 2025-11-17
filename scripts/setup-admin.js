/**
 * Script to set up admin@irisync.com as an admin user
 * Run this after the user has been created in Firebase Authentication
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin (requires service account key)
// Set GOOGLE_APPLICATION_CREDENTIALS environment variable to point to your service account key
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
}

const firestore = admin.firestore();

async function setupAdmin() {
  try {
    const email = 'admin@irisync.com';

    console.log(`Setting up admin user for ${email}...`);

    // Get user from Firebase Authentication
    let user;
    try {
      user = await admin.auth().getUserByEmail(email);
      console.log(`✓ Found user in Firebase Auth with UID: ${user.uid}`);
    } catch (error) {
      console.error(`✗ User ${email} not found in Firebase Authentication`);
      console.log('Please create this user in Firebase Console first, then run this script again.');
      process.exit(1);
    }

    // Create admin document in Firestore
    const adminData = {
      id: user.uid,
      email: user.email,
      name: user.displayName || 'Admin',
      role: 'super_admin',
      createdAt: admin.firestore.Timestamp.now(),
      lastLogin: admin.firestore.Timestamp.now()
    };

    await firestore.collection('admins').doc(user.uid).set(adminData);
    console.log('✓ Created admin document in Firestore');

    // Update user document to mark as admin
    await firestore.collection('users').doc(user.uid).set({
      email: user.email,
      displayName: user.displayName || 'Admin',
      isAdmin: true,
      adminRole: 'super_admin',
      createdAt: admin.firestore.Timestamp.now(),
      lastLogin: admin.firestore.Timestamp.now(),
      emailVerified: user.emailVerified
    }, { merge: true });
    console.log('✓ Updated user document with admin flag');

    // Create audit log
    await firestore.collection('adminAuditLogs').add({
      action: 'create_admin',
      targetUserId: user.uid,
      performedBy: 'system',
      details: {
        email: user.email,
        role: 'super_admin'
      },
      timestamp: admin.firestore.Timestamp.now()
    });
    console.log('✓ Created audit log entry');

    console.log('\n✓ Admin setup complete!');
    console.log(`User ${email} (${user.uid}) is now a super admin.`);

    process.exit(0);
  } catch (error) {
    console.error('Error setting up admin:', error);
    process.exit(1);
  }
}

setupAdmin();
