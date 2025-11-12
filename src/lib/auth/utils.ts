import { NextApiRequest } from 'next';
import { NextRequest } from 'next/server';
import { getAuth, getFirestore, increment } from '../firebase/admin';
import { cookies } from 'next/headers';
import { logger } from '../logging/logger';
import { isPermissionDeniedError } from './error-middleware';

/**
 * Extract and verify user ID from request authorization header
 * @param req API request
 * @returns User ID if authentication successful, null otherwise
 */
export async function verifyAuthentication(req: NextRequest | NextApiRequest): Promise<string | null> {
  try {
    // Get authorization header
    const authHeader = req.headers.get?.('authorization') || (req.headers as any).authorization;
    
    // If we have an authorization header with a Bearer token
    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      // Extract token
      const token = authHeader.split(' ')[1];
      
      // Verify token with Firebase Auth
      const auth = getAuth();
      try {
        const decodedToken = await auth.verifyIdToken(token);
        return decodedToken.uid;
      } catch (tokenError) {
        console.error('Token verification error:', tokenError);
        return null;
      }
    }
    
    // If no Bearer token, try to get from cookie
    // For API Routes (Pages Router)
    if ('cookies' in req && typeof req.cookies.get === 'function') {
      const sessionCookie = req.cookies.get('session')?.value;
      if (sessionCookie) {
        try {
          const auth = getAuth();
          const decodedCookie = await auth.verifySessionCookie(sessionCookie, true);
          return decodedCookie.uid;
        } catch (cookieError) {
          console.error('Session cookie verification error:', cookieError);
          return null;
        }
      }
    } 
    // For App Router - use cookies() function
    else {
      try {
        const cookieStore = cookies();
        const sessionCookie = cookieStore.get('session')?.value;
        
        if (sessionCookie) {
          const auth = getAuth();
          const decodedCookie = await auth.verifySessionCookie(sessionCookie, true);
          return decodedCookie.uid;
        }
      } catch (cookieError) {
        console.error('Cookie access error:', cookieError);
      }
    }
    
    return null;
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}

/**
 * Verify if a user has admin access
 * @param userId User ID
 * @returns True if user has admin access
 */
export async function verifyAdminAccess(userId: string): Promise<boolean> {
  try {
    if (!userId) {
      return false;
    }
    
    // Get Firestore
    const firestore = getFirestore();
    
    // Get user document
    const userDoc = await firestore.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return false;
    }
    
    const userData = userDoc.data();
    
    // Check for admin role
    return userData?.role === 'admin';
  } catch (error) {
    console.error('Admin verification error:', error);
    return false;
  }
}

/**
 * Extract user token balance from organization usageQuota
 * @param userId User ID
 * @returns Token balance amount
 */
export async function getUserTokenBalance(userId: string): Promise<number> {
  try {
    if (!userId) {
      return 0;
    }
    
    // Get Firestore
    const firestore = getFirestore();
    
    // Get user document to find their organization
    const userDoc = await firestore.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return 0;
    }
    
    const userData = userDoc.data();
    
    // Get organization ID (current or personal)
    const orgId = userData?.currentOrganizationId || userData?.personalOrganizationId;
    
    if (!orgId) {
      return 0;
    }
    
    // Get organization document
    const orgDoc = await firestore.collection('organizations').doc(orgId).get();
    
    if (!orgDoc.exists) {
      return 0;
    }
    
    const organization = orgDoc.data();
    
    // Return token balance from organization's usage quota
    return organization?.usageQuota?.aiTokens?.limit || 0;
  } catch (error) {
    console.error('Error getting token balance:', error);
    return 0;
  }
}

/**
 * Update organization token balance
 * @param userId User ID
 * @param amount Amount to add (positive) or subtract (negative)
 * @returns Updated balance
 */
export async function updateUserTokenBalance(userId: string, amount: number): Promise<number> {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    // Get Firestore
    const firestore = getFirestore();
    
    // Get user document to find their organization
    const userDoc = await firestore.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      throw new Error(`User not found: ${userId}`);
    }
    
    const userData = userDoc.data() || {};
    
    // Get organization ID (current or personal)
    const orgId = userData.currentOrganizationId || userData.personalOrganizationId;
    
    if (!orgId) {
      throw new Error(`No organization found for user: ${userId}`);
    }
    
    // Get organization details
    const orgDoc = await firestore.collection('organizations').doc(orgId).get();
    
    if (!orgDoc.exists) {
      throw new Error(`Organization not found: ${orgId}`);
    }
    
    const organization = orgDoc.data() || {};
    const currentLimit = organization.usageQuota?.aiTokens?.limit || 0;
    
    // Update token balance in the organization's usage quota
    await firestore.collection('organizations').doc(orgId).update({
      'usageQuota.aiTokens.limit': increment(amount),
      updatedAt: new Date()
    });
    
    // Get updated organization
    const updatedOrgDoc = await firestore.collection('organizations').doc(orgId).get();
    const updatedOrg = updatedOrgDoc.data() || {};
    const newBalance = updatedOrg.usageQuota?.aiTokens?.limit || 0;
    
    // Log token usage
    await firestore.collection('tokenUsage').add({
      userId,
      organizationId: orgId,
      tokensUsed: Math.abs(amount),
      change: amount,
      previousBalance: currentLimit,
      newBalance: newBalance,
      timestamp: new Date()
    });
    
    return newBalance;
  } catch (error) {
    console.error('Error updating token balance:', error);
    throw error;
  }
}

/**
 * Check if user has sufficient token balance
 * @param userId User ID
 * @param requiredAmount Amount of tokens required
 * @returns True if user has sufficient balance
 */
export async function hasUserSufficientTokens(userId: string, requiredAmount: number): Promise<boolean> {
  if (requiredAmount <= 0) {
    return true;
  }
  
  const balance = await getUserTokenBalance(userId);
  return balance >= requiredAmount;
}

/**
 * Get user subscription tier from their organization
 * @param userId User ID
 * @returns Subscription tier or null if not found
 */
export async function getUserSubscriptionTier(userId: string): Promise<string | null> {
  try {
    if (!userId) {
      return null;
    }
    
    // Get Firestore
    const firestore = getFirestore();
    
    // Get user document to find their organization
    const userDoc = await firestore.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return null;
    }
    
    const userData = userDoc.data();
    
    // Get organization ID (current or personal)
    const orgId = userData?.currentOrganizationId || userData?.personalOrganizationId;
    
    if (!orgId) {
      return null;
    }
    
    // Get organization document
    const orgDoc = await firestore.collection('organizations').doc(orgId).get();
    
    if (!orgDoc.exists) {
      return null;
    }
    
    const organization = orgDoc.data();
    
    // Return subscription tier from organization billing
    return organization?.billing?.subscriptionTier || null;
  } catch (error) {
    console.error('Error getting subscription tier:', error);
    return null;
  }
}

/**
 * Check if user has an active subscription through their organization
 * @param userId User ID
 * @returns True if user has an active subscription
 */
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  try {
    if (!userId) {
      return false;
    }
    
    // Get Firestore
    const firestore = getFirestore();
    
    // Get user document to find their organization
    const userDoc = await firestore.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return false;
    }
    
    const userData = userDoc.data();
    
    // Get organization ID (current or personal)
    const orgId = userData?.currentOrganizationId || userData?.personalOrganizationId;
    
    if (!orgId) {
      // If no organization found, log the issue and return false
      logger.warn('No organization found for user when checking subscription status', { userId });
      return false;
    }
    
    // Get organization document
    const orgDoc = await firestore.collection('organizations').doc(orgId).get();
    
    if (!orgDoc.exists) {
      logger.warn('Organization document not found when checking subscription status', { userId, orgId });
      return false;
    }
    
    const organization = orgDoc.data();
    
    // Check if the organization has an active subscription in the billing data
    if (
      organization?.billing?.subscriptionStatus === 'active' && 
      organization?.billing?.subscriptionTier && 
      organization?.billing?.subscriptionTier !== 'none'
    ) {
      logger.debug('User has active subscription via organization', { 
        userId, 
        orgId, 
        tier: organization.billing.subscriptionTier 
      });
      return true;
    }
    
    // No active organization subscription found
    logger.debug('No active organization subscription found', { 
      userId, 
      orgId, 
      status: organization?.billing?.subscriptionStatus || 'none',
      tier: organization?.billing?.subscriptionTier || 'none'
    });
    
    return false;
  } catch (error) {
    logger.error('Error checking subscription status:', error);
    return false;
  }
}

/**
 * Handle API errors with consistent formatting
 */
export function handleApiError(error: any, endpoint: string, context?: string) {
  // Log the error
  console.error(`API error in ${endpoint} (${context || 'unknown context'}):`, error);
  
  // Check if it's a permission denied error from Firestore
  if (isPermissionDeniedError(error)) {
    return {
      error: 'permission_denied',
      message: 'You do not have permission to access this resource. This may be due to missing user data.',
      endpoint,
      status: 403
    };
  }
  
  // Standard error responses
  if (error.code === 'auth/user-not-found') {
    return {
      error: 'user_not_found',
      message: 'User not found',
      endpoint,
      status: 404
    };
  }
  
  if (error.code === 'auth/wrong-password') {
    return {
      error: 'invalid_credentials',
      message: 'Invalid credentials',
      endpoint,
      status: 401
    };
  }
  
  if (error.code === 'auth/email-already-exists') {
    return {
      error: 'email_exists',
      message: 'Email already in use',
      endpoint,
      status: 400
    };
  }
  
  // Generic error response
  return {
    error: 'server_error',
    message: error.message || 'An unknown error occurred',
    endpoint,
    status: 500
  };
} 