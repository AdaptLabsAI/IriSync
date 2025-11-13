import { verify } from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { firestore } from '../core/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { UserRole, SubscriptionTier } from '../core/models/User';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { Logger, LogLevel } from '../core/logging/logger';

const logger = new Logger({
  minLevel: LogLevel.INFO,
  enableConsole: true,
  enableRemote: process.env.NODE_ENV === 'production'
});

/**
 * User interface for authentication in App Router
 */
export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  subscriptionTier?: SubscriptionTier; // Make optional since we'll get it from the organization
  personalOrganizationId?: string;
  currentOrganizationId?: string;
  organizationId?: string; // Kept for backward compatibility
}

/**
 * Token payload interface
 */
export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  organizationId?: string;
  iat?: number;
  exp?: number;
}

/**
 * User data as represented in the authentication token
 */
export interface TokenUser {
  id: string;
  email: string;
  displayName?: string;
  role: string;
  organizationId?: string;
  emailVerified: boolean;
}

/**
 * Verify JWT token from cookie or Authorization header
 * @param token JWT token
 * @returns User object if token is valid, null otherwise
 */
export async function verifyAuthToken(token: string): Promise<AuthUser | null> {
  try {
    // Get JWT secret from environment variable
    const jwtSecret = process.env.JWT_SECRET || 'irisync-jwt-secret';
    
    // Verify token and get payload
    const payload = verify(token, jwtSecret) as TokenPayload;
    
    if (!payload || !payload.userId) {
      return null;
    }
    
    // Get user data from Firestore to ensure it's current
    const userSnapshot = await getDoc(doc(firestore, 'users', payload.userId));
    
    if (!userSnapshot.exists()) {
      return null;
    }
    
    const userData = userSnapshot.data();
    
    // Get the current organization ID using organization-centric approach
    const currentOrgId = userData.currentOrganizationId || userData.personalOrganizationId;
    
    // For backward compatibility, maintain the organizationId field
    const legacyOrgId = userData.organizationId;
    
    // Create and return user object
    return {
      id: payload.userId,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: userData.role,
      // Include subscription tier for backward compatibility but client code should use organization-level data
      subscriptionTier: userData.subscriptionTier,
      personalOrganizationId: userData.personalOrganizationId,
      currentOrganizationId: userData.currentOrganizationId,
      organizationId: currentOrgId || legacyOrgId
    };
  } catch (error) {
    console.error('Error verifying token:', error);
    return null;
  }
}

/**
 * Parses and validates the session token to extract the current user
 * @returns The current authenticated user or null if not authenticated
 */
export async function getCurrentUser(): Promise<TokenUser | null> {
  try {
    // Get the authentication token from cookies
    const cookieStore = cookies();
    const token = cookieStore.get('auth_token')?.value;
    
    if (!token) {
      return null;
    }
    
    // Verify the token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      logger.error('JWT_SECRET is not defined');
      return null;
    }
    
    // Decode and verify the JWT
    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
    
    if (typeof decoded !== 'object' || !decoded.sub) {
      logger.error('Invalid token format', { decoded });
      return null;
    }
    
    // Get the user from Firestore to confirm they still exist and get latest data
    const userDoc = await getDoc(doc(firestore, 'users', decoded.sub));
    
    if (!userDoc.exists()) {
      logger.warn('User from token not found in database', { userId: decoded.sub });
      return null;
    }
    
    const userData = userDoc.data();
    
    // Return user information from token and database
    return {
      id: decoded.sub,
      email: userData.email || decoded.email,
      displayName: userData.displayName || decoded.name,
      role: userData.role || decoded.role,
      organizationId: userData.organizationId || decoded.organizationId,
      emailVerified: userData.emailVerified || decoded.email_verified || false
    };
  } catch (error) {
    logger.error('Error getting current user', { error });
    return null;
  }
}

/**
 * Verify if the current user has admin access
 * @param user User object or null
 * @returns True if user is admin or super admin, false otherwise
 */
export function isAdmin(user: AuthUser | null): boolean {
  if (!user) return false;
  // Only platform admins (ADMIN) and super admins have global admin rights
  return user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;
}

/**
 * Verify if the current user has super admin access
 * @param user User object or null
 * @returns True if user is super admin, false otherwise
 */
export function isSuperAdmin(user: AuthUser | null): boolean {
  if (!user) return false;
  return user.role === UserRole.SUPER_ADMIN;
}

/**
 * Verify if the current user belongs to a specific organization
 * @param user User object or null
 * @param organizationId Organization ID to check
 * @returns True if user belongs to the organization, false otherwise
 */
export function hasOrganizationAccess(user: AuthUser | null, organizationId: string): boolean {
  if (!user) return false;
  // Platform admins and super admins have access to all organizations
  if (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN) {
    return true;
  }
  
  // Check if the user's current organization or personal organization matches
  const userOrgId = user.currentOrganizationId || user.personalOrganizationId;
  return userOrgId === organizationId;
}

/**
 * Checks if the current user is authenticated
 * @returns True if user is authenticated, false otherwise
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}

/**
 * Gets the authorization token from the cookie
 * @returns The authorization token or null if not found
 */
export function getAuthToken(): string | null {
  const cookieStore = cookies();
  return cookieStore.get('auth_token')?.value || null;
} 