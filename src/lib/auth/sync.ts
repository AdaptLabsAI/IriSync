/**
 * Auth Sync Utilities
 * 
 * These utilities ensure that Firebase Auth users always have corresponding Firestore documents
 * to prevent permission denied errors in security rules.
 */

import { getAuth, getFirestore, serverTimestamp } from '@/lib/core/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { hash } from 'bcryptjs';
import { logger } from '@/lib/core/logging/logger';
import { SubscriptionTier, UserRole, mapSubscriptionToRole } from '@/lib/core/models/User';

/**
 * Ensures that a user has a Firestore document
 * 
 * @param userId - Firebase Auth user ID
 * @param forceUpdate - Whether to update the document even if it exists
 * @returns The user document data or null if it couldn't be created
 */
export async function ensureUserDocument(userId: string, forceUpdate = false): Promise<any> {
  try {
    // Get Firebase Admin instances
    const auth = getAuth();
    const firestore = getFirestore();
    
    // Check if user document already exists
    const userDoc = await firestore.collection('users').doc(userId).get();
    
    // If document exists and we're not forcing an update, return it
    if (userDoc.exists && !forceUpdate) {
      logger.debug(`User document already exists for ${userId}`);
      return userDoc.data();
    }
    
    // Get user data from Firebase Auth
    const userRecord = await auth.getUser(userId);
    
    if (!userRecord) {
      logger.error(`User ${userId} not found in Firebase Auth`);
      return null;
    }
    
    // Generate a password hash if needed
    let passwordHash;
    if (!userDoc.exists) {
      const tempPassword = Math.random().toString(36).slice(-10);
      passwordHash = await hash(tempPassword, 12);
    }
    
    // Create or update organization ID
    let organizationId = userId; // Default to user ID
    
    // Check if user is already part of an organization as a member
    const orgMemberships = await firestore
      .collectionGroup('members')
      .where('userId', '==', userId)
      .get();
    
    if (!orgMemberships.empty) {
      // User is already a member of an organization, use that one
      const parent = orgMemberships.docs[0].ref.parent.parent;
      if (parent) {
        organizationId = parent.id;
        logger.debug(`User ${userId} is member of organization ${organizationId}`);
      }
    } else if (userRecord.customClaims?.organizationId) {
      // Verify this organization exists
      const orgDoc = await firestore
        .collection('organizations')
        .doc(userRecord.customClaims.organizationId)
        .get();
      
      if (orgDoc.exists) {
        organizationId = userRecord.customClaims.organizationId;
        logger.debug(`User ${userId} has organization claim ${organizationId}`);
      }
    } else {
      // Create a new organization for this user
      const now = serverTimestamp();
      const orgData = {
        id: organizationId,
        name: userRecord.email ? userRecord.email.split('@')[0] + "'s Organization" : "New Organization",
        ownerId: userId,
        createdAt: now,
        updatedAt: now,
        subscription: {
          tier: null, // No default tier - requires paid subscription
          status: 'pending_setup',
          currentPeriodStart: null,
          currentPeriodEnd: null,
          seats: 1 // Single user
        },
        settings: {
          allowGuestAccess: false,
          requireEmailVerification: true
        },
        requiresSubscription: true // Flag to indicate subscription is required
      };
      
      // Create the organization
      await firestore.collection('organizations').doc(organizationId).set(orgData);
      
      // Add user as org owner
      const memberData = {
        userId: userId,
        email: userRecord.email,
        firstName: userRecord.displayName ? userRecord.displayName.split(' ')[0] : '',
        lastName: userRecord.displayName ? userRecord.displayName.split(' ').slice(1).join(' ') : '',
        role: 'owner', // Organization role
        permissions: ['full_access'],
        joinedAt: now,
        invitedBy: userId
      };
      
      await firestore.collection('organizations').doc(organizationId)
        .collection('members').doc(userId).set(memberData);
      
      logger.info(`Created new organization ${organizationId} for user ${userId}`);
    }
    
    // Generate user data
    const now = serverTimestamp();
    
    // Map subscription tier to role if available
    const userDocData = userDoc.exists ? userDoc.data() : undefined;
    const subscriptionTier = userDocData?.subscription?.tier || null;
    
    // Map subscription tier to role or use custom claims role
    const mappedRole = mapSubscriptionToRole(subscriptionTier as SubscriptionTier);
    const roleFromClaims = userRecord.customClaims?.role;
    
    // Prioritize admin roles from custom claims, otherwise use mapped role
    const userRole = roleFromClaims === 'admin' || roleFromClaims === 'super_admin'
      ? roleFromClaims
      : mappedRole;
    
    const userData = {
      ...(userDoc.exists ? userDoc.data() : {}),
      uid: userId,
      firebaseUid: userId,
      email: userRecord.email,
      name: userRecord.displayName || '',
      firstName: userRecord.displayName ? userRecord.displayName.split(' ')[0] : '',
      lastName: userRecord.displayName ? userRecord.displayName.split(' ').slice(1).join(' ') : '',
      image: userRecord.photoURL || '',
      role: userRole, // Use the mapped role or admin role from claims
      emailVerified: userRecord.emailVerified,
      createdAt: userDocData?.createdAt || now,
      updatedAt: now,
      lastLogin: now,
      organizationId: organizationId,
      provider: 'firebase',
      businessType: userDocData?.businessType || 'individual',
      companyName: userDocData?.companyName || '',
      termsAccepted: true,
      subscription: {
        tier: subscriptionTier,
        status: subscriptionTier ? 'active' : 'pending_setup',
        currentPeriodStart: subscriptionTier ? now : null,
        currentPeriodEnd: subscriptionTier ? Timestamp.fromDate(
          new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days
        ) : null,
        cancelAtPeriodEnd: false,
        seats: 1
      },
      requiresSubscription: !subscriptionTier // Flag to indicate subscription is required
    };
    
    // Add password hash only for new users
    if (passwordHash && !userDoc.exists) {
      (userData as any).passwordHash = passwordHash;
    }
    
    // Save user data to Firestore
    await firestore.collection('users').doc(userId).set(userData, { merge: true });
    
    // Ensure custom claims are set
    if (!userRecord.customClaims?.organizationId || userRecord.customClaims.organizationId !== organizationId) {
      await auth.setCustomUserClaims(userId, {
        role: userData.role,
        organizationId: organizationId
      });
    }
    
    // Create user settings if they don't exist
    const settingsDoc = await firestore.collection('userSettings').doc(userId).get();
    
    if (!settingsDoc.exists) {
      await firestore.collection('userSettings').doc(userId).set({
        userId: userId,
        theme: 'light',
        emailNotifications: true,
        createdAt: now,
        updatedAt: now,
      });
    }
    
    // Log the operation
    logger.info(`Ensured Firestore document for user ${userId} with organization ${organizationId}`);
    
    // Create audit log
    await firestore.collection('auditLogs').add({
      action: userDoc.exists ? 'UPDATE_USER_DOCUMENT' : 'CREATE_USER_DOCUMENT',
      userId: userId,
      email: userRecord.email,
      organizationId: organizationId,
      performedBy: 'system',
      timestamp: now
    });
    
    return userData;
  } catch (error) {
    logger.error(`Error ensuring user document for ${userId}:`, error);
    return null;
  }
} 