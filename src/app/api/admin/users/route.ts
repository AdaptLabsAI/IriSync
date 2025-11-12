import { NextRequest, NextResponse } from 'next/server';
import { withSuperAdmin, withAdmin } from '@/lib/auth/route-handlers';
import { firestore } from '@/lib/firebase';
import { firebaseAdmin, getFirestore, getAuth, serverTimestamp } from '@/lib/firebase/admin';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter,
  updateDoc, 
  deleteDoc, 
  setDoc,
  Timestamp 
} from 'firebase/firestore';
import { z } from 'zod';
import { UserRole, SubscriptionTier, SubscriptionTierValues, getDefaultFeaturesForTier } from '@/lib/models/User';
import { hash } from 'bcryptjs';
import { logger } from '@/lib/logging/logger';

// Collection name constants
const USERS_COLLECTION = 'users';
const AUDIT_LOGS_COLLECTION = 'auditLogs';

/**
 * Log admin actions for audit trail
 */
async function logAdminAction(adminUser: { id: string, email: string, role: string }, action: string, details: any) {
  try {
    const adminFirestore = getFirestore();
    const logRef = adminFirestore.collection(AUDIT_LOGS_COLLECTION).doc();
    await logRef.set({
      adminId: adminUser.id,
      adminEmail: adminUser.email,
      adminRole: adminUser.role,
      action,
      details,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    // Log but don't fail the request if audit logging fails
    logger.error('Failed to create audit log', { error, action, adminId: adminUser.id });
  }
}

/**
 * Convert Firestore user data to API response format
 * Removes sensitive fields and formats timestamps
 */
async function formatUserForResponse(userId: string, userData: any) {
  // Extract subscription data with proper date handling
  const subscription = userData.subscription ? {
    tier: userData.subscription.tier,
    status: userData.subscription.status,
    currentPeriodStart: userData.subscription.currentPeriodStart instanceof Timestamp 
      ? userData.subscription.currentPeriodStart.toDate().toISOString() 
      : userData.subscription.currentPeriodStart,
    currentPeriodEnd: userData.subscription.currentPeriodEnd instanceof Timestamp 
      ? userData.subscription.currentPeriodEnd.toDate().toISOString() 
      : userData.subscription.currentPeriodEnd,
    cancelAtPeriodEnd: userData.subscription.cancelAtPeriodEnd,
    seats: userData.subscription.seats,
    stripeCustomerId: userData.subscription.stripeCustomerId,
    stripeSubscriptionId: userData.subscription.stripeSubscriptionId
  } : null;

  // Format dates for consistency
  const createdAt = userData.createdAt instanceof Timestamp 
    ? userData.createdAt.toDate().toISOString() 
    : userData.createdAt;
  
  const updatedAt = userData.updatedAt instanceof Timestamp 
    ? userData.updatedAt.toDate().toISOString() 
    : userData.updatedAt;
  
  const lastLoginAt = userData.lastLoginAt instanceof Timestamp 
    ? userData.lastLoginAt.toDate().toISOString() 
    : userData.lastLoginAt;

  // Get organization data if available (for subscription info)
  let organizationData = null;
  const orgId = userData.currentOrganizationId || userData.personalOrganizationId;
  
  if (orgId) {
    try {
      const orgDoc = await getDoc(doc(firestore, 'organizations', orgId));
      if (orgDoc.exists()) {
        organizationData = {
          id: orgId,
          billing: orgDoc.data().billing || {}
        };
      }
    } catch (error) {
      logger.warn('Failed to get organization data for user', { userId, orgId, error });
    }
  }

  // Return user object with sensitive fields removed
  return {
    id: userId,
    email: userData.email,
    firstName: userData.firstName,
    lastName: userData.lastName,
    role: userData.role,
    status: userData.status || 'active',
    currentOrganizationId: userData.currentOrganizationId,
    personalOrganizationId: userData.personalOrganizationId,
    organization: organizationData,
    // Keep legacy fields for backward compatibility
    organizationId: userData.organizationId,
    subscriptionTier: userData.subscriptionTier,
    subscription,
    profileImageUrl: userData.profileImageUrl,
    bio: userData.bio,
    timezone: userData.timezone,
    lastLoginAt,
    createdAt,
    updatedAt,
    emailVerified: userData.emailVerified || false,
    marketingOptIn: userData.marketingOptIn || false
  };
}

/**
 * Validation schema for creating a new user
 */
const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  role: z.enum([
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.USER
  ]),
  organizationId: z.string().optional(),
  subscription: z.object({
    tier: z.enum([
      SubscriptionTierValues.CREATOR,
      SubscriptionTierValues.INFLUENCER,
      SubscriptionTierValues.ENTERPRISE,
      SubscriptionTierValues.NONE
    ]),
    status: z.string().optional(),
    seats: z.number().int().positive().optional(),
    stripeCustomerId: z.string().optional(),
    stripeSubscriptionId: z.string().optional()
  }).optional(),
  profileImageUrl: z.string().url().optional(),
  bio: z.string().optional(),
  timezone: z.string().optional(),
  emailVerified: z.boolean().optional(),
  marketingOptIn: z.boolean().optional()
});

/**
 * Validation schema for updating a user
 */
const updateUserSchema = z.object({
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional(),
  role: z.enum([
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.USER
  ]).optional(),
  organizationId: z.string().optional().nullable(),
  subscription: z.object({
    tier: z.enum([
      SubscriptionTierValues.CREATOR,
      SubscriptionTierValues.INFLUENCER,
      SubscriptionTierValues.ENTERPRISE,
      SubscriptionTierValues.NONE
    ]).optional(),
    status: z.string().optional(),
    seats: z.number().int().positive().optional(),
    stripeCustomerId: z.string().optional(),
    stripeSubscriptionId: z.string().optional(),
    cancelAtPeriodEnd: z.boolean().optional()
  }).optional(),
  profileImageUrl: z.string().url().optional().nullable(),
  bio: z.string().optional().nullable(),
  timezone: z.string().optional(),
  emailVerified: z.boolean().optional(),
  marketingOptIn: z.boolean().optional()
});

/**
 * GET handler for listing users with pagination, filtering, and sorting
 */
export const GET = withAdmin(async (request: NextRequest, adminUser: any) => {
  try {
    // Get query parameters
    const url = new URL(request.url);
    const pageSize = parseInt(url.searchParams.get('pageSize') || '25');
    const page = parseInt(url.searchParams.get('page') || '1');
    const sortField = url.searchParams.get('sortField') || 'createdAt';
    const sortOrder = url.searchParams.get('sortOrder') || 'desc';
    const role = url.searchParams.get('role') || null;
    const subscriptionTier = url.searchParams.get('subscriptionTier') || null;
    const search = url.searchParams.get('search') || '';
    const lastDocId = url.searchParams.get('lastDocId') || null;
    
    // Validate parameters
    if (isNaN(pageSize) || pageSize < 1 || pageSize > 100) {
      return NextResponse.json(
        { error: 'Invalid pageSize parameter. Must be between 1 and 100.' },
        { status: 400 }
      );
    }

    if (isNaN(page) || page < 1) {
      return NextResponse.json(
        { error: 'Invalid page parameter. Must be greater than 0.' },
        { status: 400 }
      );
    }

    // Build query with filters
    let usersQuery: any = query(collection(firestore, USERS_COLLECTION));
    
    // Apply filters if provided
    if (role) {
      usersQuery = query(usersQuery, where('role', '==', role));
    }
    
    if (subscriptionTier) {
      usersQuery = query(usersQuery, where('subscription.tier', '==', subscriptionTier));
    }
    
    // Apply sorting
    usersQuery = query(usersQuery, orderBy(sortField, sortOrder === 'asc' ? 'asc' : 'desc'));
    
    // Apply pagination using cursor if provided
    if (lastDocId) {
      try {
        const lastDocSnapshot = await getDoc(doc(firestore, USERS_COLLECTION, lastDocId));
        if (lastDocSnapshot.exists()) {
          usersQuery = query(usersQuery, startAfter(lastDocSnapshot));
        }
      } catch (error) {
        logger.warn('Invalid lastDocId provided for pagination', { lastDocId, error });
      }
    } else if (page > 1) {
      // Skip records if no cursor is provided but page is > 1
      // This is less efficient than cursor pagination but provides backward compatibility
      usersQuery = query(usersQuery, limit((page - 1) * pageSize));
      const skipSnapshot = await getDocs(usersQuery);
      if (!skipSnapshot.empty) {
        const lastVisible = skipSnapshot.docs[skipSnapshot.docs.length - 1];
        usersQuery = query(
          collection(firestore, USERS_COLLECTION),
          orderBy(sortField, sortOrder === 'asc' ? 'asc' : 'desc'),
          startAfter(lastVisible),
          limit(pageSize)
        );
      } else {
        // If we've skipped all documents, return empty array
        return NextResponse.json({ users: [], totalCount: 0, hasMore: false });
      }
    }
    
    // Apply final page size limit
    usersQuery = query(usersQuery, limit(pageSize));
    
    // Execute query
    const usersSnapshot = await getDocs(usersQuery);
    
    // Get total count (for pagination info)
    // Use a more efficient approach with a dedicated counter collection
    let totalCount = 0;
    try {
      // First, try to get from the counters collection
      const counterRef = doc(firestore, 'counters', 'users');
      const counterDoc = await getDoc(counterRef);
      
      if (counterDoc.exists() && counterDoc.data().count !== undefined) {
        // If we have a counter document, use its value
        totalCount = counterDoc.data().count;
        
        // Apply filter reduction if role filter is active
        if (role) {
          const roleCounts = counterDoc.data().roleCounts || {};
          totalCount = roleCounts[role] || 0;
        }
      } else {
        // Fall back to counting documents if counter doesn't exist
        if (role) {
          const countQuery = query(
            collection(firestore, USERS_COLLECTION), 
            where('role', '==', role)
          );
          const countSnapshot = await getDocs(countQuery);
          totalCount = countSnapshot.size;
        } else {
          const countSnapshot = await getDocs(collection(firestore, USERS_COLLECTION));
          totalCount = countSnapshot.size;
          
          // Create/update the counter document for future use
          await setDoc(counterRef, {
            count: totalCount,
            updatedAt: Timestamp.fromDate(new Date())
          }, { merge: true });
        }
      }
    } catch (error) {
      logger.warn('Error getting total user count', { error });
      
      // Fall back to a less accurate count from the current query results
      if (usersSnapshot.size < pageSize) {
        // If we have fewer results than the page size, use that directly
        totalCount = usersSnapshot.size;
      } else {
        // Otherwise estimate based on the current page
        totalCount = page * pageSize;
      }
    }
    
    // Format user data for response
    const userPromises = usersSnapshot.docs.map(async doc => {
      const formattedUser = await formatUserForResponse(doc.id, doc.data());
      
      // Filter by search term if provided
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesSearch = 
          formattedUser.email.toLowerCase().includes(searchLower) ||
          formattedUser.firstName.toLowerCase().includes(searchLower) ||
          formattedUser.lastName.toLowerCase().includes(searchLower) ||
          `${formattedUser.firstName} ${formattedUser.lastName}`.toLowerCase().includes(searchLower);
        
        if (!matchesSearch) return null;
      }
      
      return formattedUser;
      });
    
    // Wait for all user data to be processed and filter out nulls
    const users = (await Promise.all(userPromises)).filter(user => user !== null);
    
    // Calculate if there are more results
    const hasMore = !usersSnapshot.empty && users.length === pageSize;
    
    // Get the last document ID for cursor pagination
    const lastVisible = usersSnapshot.docs.length > 0 
      ? usersSnapshot.docs[usersSnapshot.docs.length - 1].id 
      : null;
    
    // Log admin action
    await logAdminAction(adminUser, 'LIST_USERS', {
      filters: { role, subscriptionTier, search },
      pagination: { page, pageSize },
      sorting: { field: sortField, order: sortOrder },
      resultCount: users.length
    });
    
    // Return formatted response
    return NextResponse.json({
      users,
      pagination: {
        totalCount,
        pageSize,
        currentPage: page,
        hasMore,
        lastDocId: lastVisible
      }
    });
  } catch (error) {
    // Log error details
    logger.error('Error in admin users GET handler', {
      error: error instanceof Error ? error.message : String(error),
      adminId: adminUser.id
    });
    
    // Return error response
    return NextResponse.json(
      { 
        error: 'Failed to retrieve users',
        message: 'An unexpected error occurred while retrieving users. Please try again or contact support.'
      },
      { status: 500 }
    );
  }
});

/**
 * POST handler for creating a new user
 * Note: Only Super Admin can create Admin/Super Admin users
 */
export const POST = withAdmin(async (request: NextRequest, adminUser: any) => {
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate request data
    const validationResult = createUserSchema.safeParse(body);
    if (!validationResult.success) {
      const validationErrors = validationResult.error.format();
      return NextResponse.json(
        { error: 'Validation error', details: validationErrors },
        { status: 400 }
      );
    }
    
    const validatedUserData = validationResult.data;
    
    // Only Super Admins can create Admin or Super Admin users
    if (
      (validatedUserData.role === UserRole.ADMIN || validatedUserData.role === UserRole.SUPER_ADMIN) && 
      adminUser.role !== UserRole.SUPER_ADMIN
    ) {
      return NextResponse.json(
        { 
          error: 'Forbidden',
          message: 'Only Super Admins can create Admin or Super Admin users'
        },
        { status: 403 }
      );
    }
    
    // Check if the email is already in use
    const existingUser = await getDocs(
      query(collection(firestore, USERS_COLLECTION), where('email', '==', validatedUserData.email))
    );
    
    if (!existingUser.empty) {
      return NextResponse.json(
        { error: 'Email already in use' },
        { status: 409 }
      );
    }
    
    // Hash password securely
    const saltRounds = 12;
    const passwordHash = await hash(validatedUserData.password, saltRounds);
    
    // Prepare user data for Firestore
    const now = new Date();
    const firestoreUserData = {
      email: validatedUserData.email,
      passwordHash,
      firstName: validatedUserData.firstName,
      lastName: validatedUserData.lastName,
      role: validatedUserData.role,
      organizationId: validatedUserData.organizationId,
      subscription: validatedUserData.subscription ? {
        tier: validatedUserData.subscription.tier,
        status: validatedUserData.subscription.status || 'active',
        currentPeriodStart: Timestamp.fromDate(now),
        currentPeriodEnd: Timestamp.fromDate(new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)),
        cancelAtPeriodEnd: false,
        stripeCustomerId: validatedUserData.subscription.stripeCustomerId,
        stripeSubscriptionId: validatedUserData.subscription.stripeSubscriptionId,
        seats: validatedUserData.subscription.seats || 1
      } : {
        tier: SubscriptionTierValues.NONE,
        status: 'inactive',
        currentPeriodStart: Timestamp.fromDate(now),
        currentPeriodEnd: Timestamp.fromDate(new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)),
        cancelAtPeriodEnd: false,
        seats: 1
      },
      profileImageUrl: validatedUserData.profileImageUrl,
      bio: validatedUserData.bio,
      timezone: validatedUserData.timezone || 'UTC',
      emailVerified: validatedUserData.emailVerified || false,
      marketingOptIn: validatedUserData.marketingOptIn || false,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now)
    };
    
    // Generate a unique document ID
    const userId = validatedUserData.email.toLowerCase().replace(/[^a-z0-9]/g, '-');
    
    // Create the user in Firestore
    await setDoc(doc(firestore, USERS_COLLECTION, userId), firestoreUserData);
    
    // Create the user in Firebase Auth if needed
    try {
      // Create user in Firebase Auth
      const auth = getAuth();
      const userRecord = await auth.createUser({
        email: validatedUserData.email,
        password: validatedUserData.password,
        displayName: `${validatedUserData.firstName} ${validatedUserData.lastName}`,
        emailVerified: validatedUserData.emailVerified || false
      });
      
      // Set custom claims for role-based access
      await auth.setCustomUserClaims(userRecord.uid, {
        role: validatedUserData.role,
        organizationId: validatedUserData.organizationId
      });
      
      // Update the user in Firestore with the Firebase UID
      await updateDoc(doc(firestore, USERS_COLLECTION, userId), {
        firebaseUid: userRecord.uid
      });
    } catch (firebaseError) {
      // Log error but don't fail the request
      logger.error('Error creating user in Firebase Auth', { 
        error: firebaseError, 
        userId,
        email: validatedUserData.email 
      });
    }
    
    // Log admin action
    await logAdminAction(adminUser, 'CREATE_USER', {
      userId,
      email: validatedUserData.email,
      role: validatedUserData.role
    });
    
    // Return success response with the created user
    const createdUser = await formatUserForResponse(userId, {
      ...firestoreUserData,
      // Include any fields added during creation
    });
    
    return NextResponse.json(
      { message: 'User created successfully', user: createdUser },
      { status: 201 }
    );
  } catch (error) {
    // Log error details
    logger.error('Error in admin users POST handler', {
      error: error instanceof Error ? error.message : String(error),
      adminId: adminUser.id
    });
    
    // Return error response
    return NextResponse.json(
      { 
        error: 'Failed to create user',
        message: 'An unexpected error occurred while creating the user. Please try again or contact support.'
      },
      { status: 500 }
    );
  }
});

/**
 * PATCH handler for updating an existing user
 * Requires userId in the request body
 */
export const PATCH = withAdmin(async (request: NextRequest, adminUser: any) => {
  try {
    // Parse request body
    const body = await request.json();
    
    // Ensure userId is provided
    if (!body.userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    const userId = body.userId;
    delete body.userId; // Remove userId from the data to be updated
    
    // Validate update data
    const validationResult = updateUserSchema.safeParse(body);
    if (!validationResult.success) {
      const validationErrors = validationResult.error.format();
      return NextResponse.json(
        { error: 'Validation error', details: validationErrors },
        { status: 400 }
      );
    }
    
    const validatedUpdateData = validationResult.data;
    
    // Check if user exists
    const userDocRef = doc(firestore, USERS_COLLECTION, userId);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    const existingUserData = userDoc.data();
    
    // Only Super Admins can update role to/from Admin or Super Admin
    if (
      (validatedUpdateData.role === UserRole.ADMIN || 
       validatedUpdateData.role === UserRole.SUPER_ADMIN ||
       existingUserData.role === UserRole.ADMIN || 
       existingUserData.role === UserRole.SUPER_ADMIN) && 
      adminUser.role !== UserRole.SUPER_ADMIN
    ) {
      return NextResponse.json(
        { 
          error: 'Forbidden',
          message: 'Only Super Admins can update Admin or Super Admin roles'
        },
        { status: 403 }
      );
    }
    
    // Prepare update data for Firestore
    const firestoreUpdateData: any = {
      ...validatedUpdateData,
      updatedAt: Timestamp.fromDate(new Date())
    };
    
    // Handle subscription updates if provided
    if (validatedUpdateData.subscription) {
      // Get existing subscription data
      const existingSubscription = existingUserData.subscription || {
        tier: SubscriptionTierValues.NONE,
        status: 'inactive',
        currentPeriodStart: Timestamp.fromDate(new Date()),
        currentPeriodEnd: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
        cancelAtPeriodEnd: false,
        seats: 1
      };
      
      // Merge with updates, preserving existing fields
      firestoreUpdateData.subscription = {
        ...existingSubscription,
        ...validatedUpdateData.subscription
      };
    }
    
    // Update the user in Firestore
    await updateDoc(userDocRef, firestoreUpdateData);
    
    // Update Firebase Auth user if needed
    if (existingUserData.firebaseUid && (validatedUpdateData.role || validatedUpdateData.organizationId !== undefined)) {
      try {
        const auth = getAuth();
        
        // Update custom claims
        const newClaims: any = {};
        
        if (validatedUpdateData.role) {
          newClaims.role = validatedUpdateData.role;
        }
        
        if (validatedUpdateData.organizationId !== undefined) {
          newClaims.organizationId = validatedUpdateData.organizationId;
        }
        
        await auth.setCustomUserClaims(existingUserData.firebaseUid, {
          ...existingUserData.customClaims, // Preserve existing claims
          ...newClaims
        });
      } catch (firebaseError) {
        // Log error but don't fail the request
        logger.error('Error updating user in Firebase Auth', { 
          error: firebaseError, 
          userId,
          firebaseUid: existingUserData.firebaseUid
        });
      }
    }
    
    // Get updated user data
    const updatedUserDoc = await getDoc(userDocRef);
    const updatedUserData = updatedUserDoc.exists() ? updatedUserDoc.data() : existingUserData;
    
    // Log admin action
    await logAdminAction(adminUser, 'UPDATE_USER', {
      userId,
      updatedFields: Object.keys(validatedUpdateData),
      roleChange: validatedUpdateData.role !== undefined ? {
        from: existingUserData.role,
        to: validatedUpdateData.role
      } : undefined
    });
    
    // Return success response with the updated user
    return NextResponse.json({
      message: 'User updated successfully',
      user: await formatUserForResponse(userId, updatedUserData)
    });
  } catch (error) {
    // Log error details
    logger.error('Error in admin users PATCH handler', {
      error: error instanceof Error ? error.message : String(error),
      adminId: adminUser.id
    });
    
    // Return error response
    return NextResponse.json(
      { 
        error: 'Failed to update user',
        message: 'An unexpected error occurred while updating the user. Please try again or contact support.'
      },
      { status: 500 }
    );
  }
});

/**
 * DELETE handler for removing a user
 * Requires userId as a query parameter
 * Note: Only Super Admin can delete Admin/Super Admin users
 */
export const DELETE = withAdmin(async (request: NextRequest, adminUser: any) => {
  try {
    // Get user ID from query parameters
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Check if user exists
    const userDocRef = doc(firestore, USERS_COLLECTION, userId);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    const userData = userDoc.data();
    
    // Only Super Admins can delete Admin or Super Admin users
    if (
      (userData.role === UserRole.ADMIN || userData.role === UserRole.SUPER_ADMIN) && 
      adminUser.role !== UserRole.SUPER_ADMIN
    ) {
      return NextResponse.json(
        { 
          error: 'Forbidden',
          message: 'Only Super Admins can delete Admin or Super Admin users'
        },
        { status: 403 }
      );
    }
    
    // Prevent deleting the last Super Admin
    if (userData.role === UserRole.SUPER_ADMIN) {
      // Check if this is the last Super Admin
      const superAdminQuery = query(
        collection(firestore, USERS_COLLECTION),
        where('role', '==', UserRole.SUPER_ADMIN)
      );
      
      const superAdminSnapshot = await getDocs(superAdminQuery);
      
      if (superAdminSnapshot.size <= 1) {
        return NextResponse.json(
          { 
            error: 'Forbidden',
            message: 'Cannot delete the last Super Admin user'
          },
          { status: 403 }
        );
      }
    }
    
    // Delete from Firebase Auth if UID exists
    if (userData.firebaseUid) {
      try {
        const auth = getAuth();
        await auth.deleteUser(userData.firebaseUid);
      } catch (firebaseError) {
        // Log error but don't fail the request
        logger.error('Error deleting user from Firebase Auth', { 
          error: firebaseError, 
          userId,
          firebaseUid: userData.firebaseUid
        });
      }
    }
    
    // Delete user from Firestore
    await deleteDoc(userDocRef);
    
    // Log admin action
    await logAdminAction(adminUser, 'DELETE_USER', {
      userId,
      email: userData.email,
      role: userData.role
    });
    
    // Return success response
    return NextResponse.json({
      message: 'User deleted successfully'
    });
  } catch (error) {
    // Log error details
    logger.error('Error in admin users DELETE handler', {
      error: error instanceof Error ? error.message : String(error),
      adminId: adminUser.id
    });
    
    // Return error response
    return NextResponse.json(
      { 
        error: 'Failed to delete user',
        message: 'An unexpected error occurred while deleting the user. Please try again or contact support.'
      },
      { status: 500 }
    );
  }
}); 