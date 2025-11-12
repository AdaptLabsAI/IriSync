/**
 * Firebase Cloud Functions - Main Entry Point
 * 
 * This file exports all Firebase functions for deployment
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();

// Import user creation function
const { onUserCreated } = require('./src/auth/on-user-created');

// Export the onUserCreated function
exports.onUserCreated = onUserCreated;

// Helper function to create a timestamp
const now = () => admin.firestore.Timestamp.now();

// Function to initialize the Firestore database
exports.initializeFirestore = functions.https.onCall(async (data, context) => {
  // Verify that the user is an admin
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'The function must be called while authenticated.'
    );
  }
  
  // Get user information to verify admin status
  const userRecord = await admin.auth().getUser(context.auth.uid);
  
  // Verify user has custom claim for admin or check against Firestore
  const userDoc = await db.collection('users').doc(context.auth.uid).get();
  
  if (!userDoc.exists || userDoc.data().role !== 'super_admin') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only super_admin users can initialize the database.'
    );
  }
  
  try {
    const results = {};
    
    // Use a timestamp for creating unique demo data
    const timestamp = Date.now();
    
    // 1. Users Collection (skip creating users since we already have a super_admin)
    results.users = 'Skipped - Using existing user accounts';
    
    // 2. Create a demo content post
    const contentPostRef = db.collection('contentPosts').doc(`demo-post-${timestamp}`);
    await contentPostRef.set({
      userId: context.auth.uid,
      title: 'Welcome to Irisync',
      body: 'This is a sample post to demonstrate the Irisync platform capabilities.',
      status: 'draft',
      tags: ['welcome', 'getting-started'],
      mediaIds: [],
      platforms: [{
        platform: 'twitter',
        status: 'draft',
        scheduledFor: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000))
      }],
      aiGenerated: false,
      scheduledFor: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000)),
      createdAt: now(),
      updatedAt: now()
    });
    results.contentPosts = 'Created demo content post';
    
    // 3. Create demo calendar events
    const calendarRef = db.collection('users').doc(context.auth.uid).collection('calendarEvents');
    
    await calendarRef.doc(`event-${timestamp}-1`).set({
      title: 'Content Strategy Meeting',
      start: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)),
      end: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000)),
      allDay: false,
      type: 'meeting',
      description: 'Discuss content strategy for next month',
      color: '#4285F4',
      userId: context.auth.uid,
      createdAt: now(),
      updatedAt: now()
    });
    
    await calendarRef.doc(`event-${timestamp}-2`).set({
      title: 'Campaign Launch',
      start: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)),
      end: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)),
      allDay: true,
      type: 'deadline',
      description: 'Summer campaign launch day',
      color: '#EA4335',
      userId: context.auth.uid,
      createdAt: now(),
      updatedAt: now()
    });
    results.calendarEvents = 'Created demo calendar events';
    
    // 4. Create demo platforms
    const platformsRef = db.collection('platforms');
    
    await platformsRef.doc(`platform-twitter-${timestamp}`).set({
      userId: context.auth.uid,
      name: 'Twitter',
      followers: 842,
      engagement: 3.5,
      color: '#1DA1F2',
      progress: 75,
      updatedAt: now()
    });
    
    await platformsRef.doc(`platform-instagram-${timestamp}`).set({
      userId: context.auth.uid,
      name: 'Instagram',
      followers: 1253,
      engagement: 4.2,
      color: '#E1306C',
      progress: 82,
      updatedAt: now()
    });
    
    await platformsRef.doc(`platform-linkedin-${timestamp}`).set({
      userId: context.auth.uid,
      name: 'LinkedIn',
      followers: 532,
      engagement: 2.8,
      color: '#0077B5',
      progress: 65,
      updatedAt: now()
    });
    results.platforms = 'Created demo platforms';
    
    // 5. Create demo media items
    const mediaRef = db.collection('media');
    
    await mediaRef.doc(`media-image-${timestamp}`).set({
      userId: context.auth.uid,
      type: 'image',
      title: 'Product Image',
      description: 'Main product image for social media',
      url: 'https://via.placeholder.com/1200x800',
      thumbnailUrl: 'https://via.placeholder.com/300x200',
      filename: 'product_image.jpg',
      filesize: 245000,
      contentType: 'image/jpeg',
      tags: ['product', 'marketing'],
      metadata: {
        width: 1200,
        height: 800,
        format: 'jpeg'
      },
      aiGenerated: false,
      isPublic: true,
      createdAt: now(),
      updatedAt: now()
    });
    results.media = 'Created demo media items';
    
    // 6. Create a comprehensive content item 
    const contentRef = db.collection('content');
    
    await contentRef.doc(`content-post-${timestamp}`).set({
      userId: context.auth.uid,
      title: 'Comprehensive Content Item',
      content: 'This is a more comprehensive content item with rich features for multi-platform publishing.',
      status: 'scheduled',
      type: 'post',
      tags: ['content', 'social', 'marketing'],
      platformTargets: [
        {
          platformType: 'twitter',
          status: 'scheduled',
          publishedAt: null
        },
        {
          platformType: 'instagram',
          status: 'scheduled',
          publishedAt: null
        }
      ],
      schedule: {
        publishAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)),
        timezone: 'UTC',
        isRecurring: false
      },
      assets: [
        {
          assetId: `media-image-${timestamp}`,
          assetType: 'image',
          url: 'https://via.placeholder.com/1200x800'
        }
      ],
      analytics: {
        views: 0,
        engagements: 0,
        shares: 0
      },
      isRecurring: false,
      createdAt: now(),
      updatedAt: now()
    });
    results.content = 'Created comprehensive content item';
    
    return {
      success: true,
      message: 'Firestore collections initialized successfully',
      results
    };
  } catch (error) {
    console.error('Error initializing Firestore:', error);
    throw new functions.https.HttpsError('internal', error.message || 'An unknown error occurred');
  }
});

// Function to check Firestore access rights
exports.checkFirestoreAccess = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    return {
      success: false,
      authenticated: false,
      message: 'Not authenticated'
    };
  }
  
  try {
    // Get user document
    const userDoc = await db.collection('users').doc(context.auth.uid).get();
    
    if (!userDoc.exists) {
      return {
        success: false,
        authenticated: true,
        userDocExists: false,
        message: 'User document does not exist'
      };
    }
    
    const userData = userDoc.data();
    
    // Try to read from collections to verify access
    const accessTests = [];
    
    // Test contentPosts access
    try {
      const contentPostsQuery = await db.collection('contentPosts')
        .where('userId', '==', context.auth.uid)
        .limit(1)
        .get();
      accessTests.push({
        collection: 'contentPosts',
        success: true,
        count: contentPostsQuery.size
      });
    } catch (error) {
      accessTests.push({
        collection: 'contentPosts',
        success: false,
        error: error.message
      });
    }
    
    // Test platforms access
    try {
      const platformsQuery = await db.collection('platforms')
        .where('userId', '==', context.auth.uid)
        .limit(1)
        .get();
      accessTests.push({
        collection: 'platforms',
        success: true,
        count: platformsQuery.size
      });
    } catch (error) {
      accessTests.push({
        collection: 'platforms',
        success: false,
        error: error.message
      });
    }
    
    return {
      success: true,
      authenticated: true,
      userDocExists: true,
      userData: {
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role
      },
      accessTests
    };
  } catch (error) {
    console.error('Error checking Firestore access:', error);
    return {
      success: false,
      authenticated: true,
      error: error.message || 'An unknown error occurred'
    };
  }
});

const authFunctions = require('./src/auth/on-user-created');

// Export all functions
module.exports = {
  ...authFunctions  
}; 