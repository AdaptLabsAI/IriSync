// Initialize Firestore Script
// This script creates the necessary collections for the Irisync application
require('dotenv').config();
const { initializeApp } = require('firebase/app');
const { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  serverTimestamp 
} = require('firebase/firestore');

// Get Firebase config from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Function to initialize Firestore with demo data
async function initializeFirestore() {
  console.log('Initializing Firebase...');
  
  // Check if required environment variables are set
  const requiredEnvVars = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID'
  ];
  
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.error(`Missing required environment variable: ${envVar}`);
      console.error('Please set it in your .env file or environment.');
      process.exit(1);
    }
  }
  
  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  
  // Create timestamp function
  const timestamp = serverTimestamp();
  
  try {
    console.log('Starting Firestore initialization...');
    
    // Get current timestamp for unique IDs
    const now = new Date();
    const uniqueId = now.getTime().toString();
    
    // Track created collections
    const results = {};
    
    // 1. Create a sample user (if you want to add a user)
    // Note: This is often handled by the authentication system
    // Uncomment and modify if you need to create a test user
    /*
    await setDoc(doc(db, 'users', 'testuser-' + uniqueId), {
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: 'user',
      createdAt: timestamp,
      updatedAt: timestamp
    });
    results.users = 'Created test user';
    */
    
    // 2. Create a demo content post
    await setDoc(doc(db, 'contentPosts', 'demo-post-' + uniqueId), {
      userId: 'current-user', // Replace with actual user ID if available
      title: 'Welcome to Irisync',
      body: 'This is a sample post to demonstrate the Irisync platform capabilities.',
      status: 'draft',
      tags: ['welcome', 'getting-started'],
      mediaIds: [],
      platforms: [{
        platform: 'twitter',
        status: 'draft',
        scheduledFor: new Date(now.getTime() + 24 * 60 * 60 * 1000)
      }],
      aiGenerated: false,
      scheduledFor: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      createdAt: timestamp,
      updatedAt: timestamp
    });
    results.contentPosts = 'Created demo content post';
    
    // 3. Create a sample organization
    await setDoc(doc(db, 'organizations', 'demo-org-' + uniqueId), {
      name: 'Demo Organization',
      createdAt: timestamp,
      updatedAt: timestamp,
      plan: 'free',
      members: ['current-user'], // Replace with actual user ID if available
      settings: {
        timezone: 'UTC',
        defaultPlatforms: ['twitter', 'instagram']
      }
    });
    
    // Organization members subcollection
    await setDoc(doc(db, 'organizations', 'demo-org-' + uniqueId, 'members', 'current-user'), {
      role: 'admin',
      joinedAt: timestamp,
      permissions: {
        canPublish: true,
        canInvite: true,
        canManageUsers: true,
        social_management: true
      }
    });
    
    // Organization teams subcollection
    await setDoc(doc(db, 'organizations', 'demo-org-' + uniqueId, 'teams', 'marketing-team-' + uniqueId), {
      name: 'Marketing Team',
      createdAt: timestamp,
      members: ['current-user'] // Replace with actual user ID if available
    });
    
    // Organization socialAccounts subcollection
    await setDoc(doc(db, 'organizations', 'demo-org-' + uniqueId, 'socialAccounts', 'twitter-account-' + uniqueId), {
      platform: 'twitter',
      name: 'Demo Twitter',
      createdAt: timestamp,
      updatedAt: timestamp,
      status: 'connected',
      tokenEncrypted: 'dummy-encrypted-token' // In production, this would be encrypted
    });
    
    results.organizations = 'Created demo organization with members, teams, and social accounts';
    
    // 4. Create dashboard stats
    await setDoc(doc(db, 'dashboardStats', 'stats-' + uniqueId), {
      userId: 'current-user', // Replace with actual user ID if available
      postCount: 5,
      scheduledCount: 2,
      platformStats: {
        twitter: {
          followers: 842,
          engagement: 3.5
        },
        instagram: {
          followers: 1253,
          engagement: 4.2
        }
      },
      updatedAt: timestamp
    });
    results.dashboardStats = 'Created dashboard stats';
    
    // 5. Create platforms
    await setDoc(doc(db, 'platforms', 'platform-twitter-' + uniqueId), {
      userId: 'current-user', // Replace with actual user ID if available
      name: 'Twitter',
      followers: 842,
      engagement: 3.5,
      color: '#1DA1F2',
      progress: 75,
      updatedAt: timestamp
    });
    results.platforms = 'Created platform record';
    
    // 6. Create activity entries
    await setDoc(doc(db, 'activities', 'activity-' + uniqueId), {
      userId: 'current-user', // Replace with actual user ID if available
      type: 'login',
      timestamp: timestamp,
      details: {
        location: 'Web app',
        device: 'Desktop browser'
      }
    });
    results.activities = 'Created activity record';
    
    // 7. Create notifications
    await setDoc(doc(db, 'notifications', 'notification-' + uniqueId), {
      userId: 'current-user', // Replace with actual user ID if available
      type: 'welcome',
      read: false,
      title: 'Welcome to Irisync',
      body: 'Thank you for joining Irisync. Get started by connecting your social accounts.',
      timestamp: timestamp
    });
    results.notifications = 'Created notification';
    
    // 8. Create media records
    await setDoc(doc(db, 'media', 'media-' + uniqueId), {
      userId: 'current-user', // Replace with actual user ID if available
      type: 'image',
      title: 'Sample Image',
      description: 'A sample image for testing',
      url: 'https://via.placeholder.com/800x600',
      thumbnailUrl: 'https://via.placeholder.com/200x150',
      filename: 'sample-image.jpg',
      filesize: 245000,
      contentType: 'image/jpeg',
      tags: ['sample', 'testing'],
      metadata: {
        width: 800,
        height: 600,
        format: 'jpeg'
      },
      isPublic: true,
      createdAt: timestamp,
      updatedAt: timestamp
    });
    results.media = 'Created media record';
    
    // 9. Create analytics records
    await setDoc(doc(db, 'analytics', 'analytics-' + uniqueId), {
      userId: 'current-user', // Replace with actual user ID if available
      period: 'last-week',
      platforms: {
        twitter: {
          impressions: 15234,
          engagements: 842,
          clicks: 325,
          followers: 1253
        },
        instagram: {
          impressions: 28534,
          engagements: 1842,
          clicks: 934,
          followers: 3251
        }
      },
      updatedAt: timestamp
    });
    results.analytics = 'Created analytics record';
    
    // 10. Create user profiles
    await setDoc(doc(db, 'userProfiles', 'profile-' + uniqueId), {
      userId: 'current-user', // Replace with actual user ID if available
      name: 'Demo User',
      bio: 'This is a demo user profile',
      avatarUrl: 'https://via.placeholder.com/150',
      website: 'https://example.com',
      socialLinks: {
        twitter: 'https://twitter.com/example',
        linkedin: 'https://linkedin.com/in/example'
      },
      createdAt: timestamp,
      updatedAt: timestamp
    });
    results.userProfiles = 'Created user profile';
    
    // 11. Create user settings
    await setDoc(doc(db, 'userSettings', 'settings-' + uniqueId), {
      userId: 'current-user', // Replace with actual user ID if available
      theme: 'light',
      language: 'en',
      notifications: {
        email: true,
        push: true,
        sms: false
      },
      timezone: 'UTC',
      updatedAt: timestamp
    });
    results.userSettings = 'Created user settings';
    
    console.log('Firestore initialization completed successfully!');
    console.log('Created collections:', Object.keys(results).join(', '));
    
    return {
      success: true,
      message: 'Firestore collections initialized successfully',
      results
    };
    
  } catch (error) {
    console.error('Error initializing Firestore:', error);
    return {
      success: false,
      message: 'Error initializing Firestore',
      error: error.message
    };
  }
}

// Run the initialization function
initializeFirestore()
  .then(result => {
    console.log('Initialization result:', result);
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unhandled error during initialization:', error);
    process.exit(1);
  }); 