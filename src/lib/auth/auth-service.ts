import { firestore } from '../core/firebase';
import { doc, getDoc, setDoc, updateDoc, Timestamp, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { compare, hash } from 'bcryptjs';
import { sign, verify } from 'jsonwebtoken';
import { SubscriptionTier, SubscriptionTierValues, UserRole } from '../core/models/User';
import { getTokenAllocationForTier } from '../subscription';
import { generateOrganizationId, validateUserOrganizationConnections } from '../utils';

/**
 * User interface for authentication
 */
export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  subscriptionTier?: SubscriptionTier; // Optional for backward compatibility
  organizationId?: string; // Kept for backward compatibility
  personalOrganizationId?: string;
  currentOrganizationId?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Token payload interface
 */
interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  organizationId?: string;
  iat?: number;
  exp?: number;
}

/**
 * Authentication response interface
 */
export interface AuthResponse {
  token: string;
  refreshToken: string;
  expiresIn: number;
  user: AuthUser;
}

/**
 * Authentication service for handling user login, registration, and token management
 *
 * Production best practices:
 * - Store refresh tokens in HttpOnly, Secure cookies (not in localStorage)
 * - Always rotate refresh tokens on use
 * - Track device/session info for each refresh token
 * - Log and monitor for suspicious activity (e.g., reuse of old tokens)
 * - Use scheduled cleanup of expired tokens
 *
 * Note: This implementation supports a single session per user. For true multi-device/session support,
 * use a subcollection (e.g., refreshTokens/{userId}/sessions/{sessionId}) or an array of sessions per user.
 */
export class AuthService {
  private readonly JWT_SECRET: string;
  private readonly JWT_REFRESH_SECRET: string;
  private readonly TOKEN_EXPIRY: number = 3600; // 1 hour in seconds
  private readonly REFRESH_EXPIRY: number = 2592000; // 30 days in seconds
  
  constructor() {
    // In production, these would be environment variables
    this.JWT_SECRET = process.env.JWT_SECRET || 'irisync-jwt-secret';
    this.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'irisync-refresh-secret';
  }
  
  /**
   * Authenticate a user with email and password
   * @param email User email
   * @param password User password
   * @param deviceInfo Optional device/session info (ip, userAgent)
   * @returns Authentication response or null if invalid
   */
  async login(email: string, password: string, deviceInfo?: { ip?: string; userAgent?: string }): Promise<AuthResponse | null> {
    try {
      // Find user by email
      const userSnapshot = await getDoc(doc(firestore, 'users', email));
      if (!userSnapshot.exists()) {
        return null;
      }
      const userData = userSnapshot.data();
      // Verify password
      const isPasswordValid = await compare(password, userData.passwordHash);
      if (!isPasswordValid) {
        return null;
      }
      
      // Validate and get the organization ID for the user
      const orgValidation = await validateUserOrganizationConnections(userSnapshot.id, userData, firestore);
      
      // Update user document if organization connections were fixed
      if (!orgValidation.isValid) {
        console.warn('Fixed organization connections during login', { 
          userId: userSnapshot.id, 
          errors: orgValidation.errors 
        });
        
        await updateDoc(doc(firestore, 'users', userSnapshot.id), {
          personalOrganizationId: orgValidation.personalOrganizationId,
          currentOrganizationId: orgValidation.currentOrganizationId,
          updatedAt: Timestamp.fromDate(new Date())
        });
      }
      
      const orgId = orgValidation.currentOrganizationId;
      
      // Create user object
      const user: AuthUser = {
        id: userSnapshot.id,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role || 'user',
        personalOrganizationId: orgValidation.personalOrganizationId,
        currentOrganizationId: orgValidation.currentOrganizationId,
        createdAt: userData.createdAt.toDate(),
        updatedAt: userData.updatedAt.toDate()
      };
      // Generate tokens
      const { token, refreshToken, expiresIn } = this.generateTokens(user, orgId);
      // Save refresh token to database with device/session info
      await this.saveRefreshToken(user.id, refreshToken, deviceInfo);
      return {
        token,
        refreshToken,
        expiresIn,
        user
      };
    } catch (error) {
      console.error('Error during login:', error, { email });
      return null;
    }
  }
  
  /**
   * Register a new user
   * @param email User email
   * @param password User password
   * @param firstName User first name
   * @param lastName User last name
   * @param deviceInfo Optional device/session info (ip, userAgent)
   * @returns Authentication response or null if registration fails
   */
  async register(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    deviceInfo?: { ip?: string; userAgent?: string }
  ): Promise<AuthResponse | null> {
    try {
      // Check if user already exists
      const userSnapshot = await getDoc(doc(firestore, 'users', email));
      if (userSnapshot.exists()) {
        return null;
      }
      // Hash password
      const passwordHash = await hash(password, 10);
      // Default to Creator tier for new users
      const subscriptionTier = SubscriptionTierValues.CREATOR;
      // Set role to USER by default
      const role = UserRole.USER;
      
      // Create timestamp for consistent date handling
      const now = new Date();
      
      // Create a personal organization for the new user
      const personalOrgId = await generateOrganizationId(email, firestore);
      
      // Get the correct token allocation for Creator tier with 1 seat
      const creatorTokenAllocation = getTokenAllocationForTier(SubscriptionTierValues.CREATOR, 1);
      
      // Set up the personal organization with default Creator tier
      await setDoc(doc(firestore, 'organizations', personalOrgId), {
        name: `${firstName}'s Workspace`,
        owner: email,
        members: [email],
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now),
        billing: {
          subscriptionTier: subscriptionTier,
          subscriptionStatus: 'active',
          currentPeriodStart: Timestamp.fromDate(now),
          currentPeriodEnd: Timestamp.fromDate(new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)), // 30 days from now
        },
        usageQuota: {
          aiTokens: {
            limit: creatorTokenAllocation, // Correct token allocation for Creator tier
            used: 0,
            resetDate: Timestamp.fromDate(new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000))
          }
        }
      });
      
      // Create user data with organization references
      const userData = {
        email,
        passwordHash,
        firstName,
        lastName,
        role,
        personalOrganizationId: personalOrgId,
        currentOrganizationId: personalOrgId,
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now)
      };
      
      // Save user to database
      await setDoc(doc(firestore, 'users', email), userData);
      
      // Create user object
      const user: AuthUser = {
        id: email,
        email,
        firstName,
        lastName,
        role,
        personalOrganizationId: personalOrgId,
        currentOrganizationId: personalOrgId,
        createdAt: now,
        updatedAt: now
      };
      
      // Generate tokens
      const { token, refreshToken, expiresIn } = this.generateTokens(user, personalOrgId);
      
      // Save refresh token to database with device/session info
      await this.saveRefreshToken(user.id, refreshToken, deviceInfo);
      
      return {
        token,
        refreshToken,
        expiresIn,
        user
      };
    } catch (error) {
      console.error('Error during registration:', error, { email });
      return null;
    }
  }
  
  /**
   * Refresh an access token using a refresh token (with rotation and session tracking)
   * @param refreshToken Refresh token
   * @param deviceInfo Optional device/session info (for new tokens)
   * @returns New tokens and expiry or null if invalid
   */
  async refreshToken(refreshToken: string, deviceInfo?: { ip?: string; userAgent?: string }): Promise<{ token: string; refreshToken: string; expiresIn: number } | null> {
    try {
      // Verify refresh token
      const payload = verify(refreshToken, this.JWT_REFRESH_SECRET) as TokenPayload & { jti?: string };
      const userId = payload.userId;

      // Check if refresh token exists in database and is valid
      const tokenDocRef = doc(firestore, 'refreshTokens', userId);
      const tokenSnapshot = await getDoc(tokenDocRef);
      if (!tokenSnapshot.exists()) {
        // Log suspicious activity
        console.warn(`[Auth] Refresh token not found for user ${userId}`);
        return null;
      }
      const tokenData = tokenSnapshot.data();
      if (tokenData.token !== refreshToken) {
        // Log suspicious activity (possible token reuse)
        console.warn(`[Auth] Attempted reuse of old/invalid refresh token for user ${userId}`);
        return null;
      }
      // Check expiry
      const now = Date.now();
      if (tokenData.expiresAt && tokenData.expiresAt.toMillis() < now) {
        // Token expired, cleanup
        await updateDoc(tokenDocRef, { token: null, updatedAt: Timestamp.fromDate(new Date()) });
        return null;
      }
      // Get user data
      const userSnapshot = await getDoc(doc(firestore, 'users', userId));
      if (!userSnapshot.exists()) {
        return null;
      }
      const userData = userSnapshot.data();
      
      // Validate and get the organization ID for the user
      const orgValidation = await validateUserOrganizationConnections(userId, userData, firestore);
      
      // Update user document if organization connections were fixed
      if (!orgValidation.isValid) {
        console.warn('Fixed organization connections during token refresh', { 
          userId, 
          errors: orgValidation.errors 
        });
        
        await updateDoc(doc(firestore, 'users', userId), {
          personalOrganizationId: orgValidation.personalOrganizationId,
          currentOrganizationId: orgValidation.currentOrganizationId,
          updatedAt: Timestamp.fromDate(new Date())
        });
      }
      
      const orgId = orgValidation.currentOrganizationId;
      
      // Generate new access and refresh tokens (rotate refresh token)
      const user: AuthUser = {
        id: userId,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
        personalOrganizationId: orgValidation.personalOrganizationId,
        currentOrganizationId: orgValidation.currentOrganizationId,
        createdAt: userData.createdAt.toDate(),
        updatedAt: userData.updatedAt.toDate(),
      };
      
      const { token, refreshToken: newRefreshToken, expiresIn } = this.generateTokens(user, orgId);
      
      // Save new refresh token and session info, invalidate old one
      await this.saveRefreshToken(userId, newRefreshToken, deviceInfo);
      
      // Optionally, log refresh event
      console.info(`[Auth] Refresh token rotated for user ${userId}`);
      
      return { token, refreshToken: newRefreshToken, expiresIn };
    } catch (error) {
      console.error('Error refreshing token:', error);
      return null;
    }
  }
  
  /**
   * Logout a user by invalidating their refresh token (delete all sessions)
   * @param userId User ID
   */
  async logout(userId: string): Promise<void> {
    try {
      // Delete refresh token document for the user (invalidate all sessions)
      await setDoc(doc(firestore, 'refreshTokens', userId), {
        token: null,
        updatedAt: Timestamp.fromDate(new Date()),
        expiresAt: Timestamp.fromDate(new Date()),
        sessionInfo: null,
      });
      console.info(`[Auth] User ${userId} logged out and all refresh tokens invalidated.`);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }
  
  /**
   * Verify an access token
   * @param token Access token
   * @returns Token payload or null if invalid
   */
  verifyToken(token: string): TokenPayload | null {
    try {
      const payload = verify(token, this.JWT_SECRET) as TokenPayload;
      return payload;
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Generate access and refresh tokens for a user
   * @param user User object
   * @param organizationId Organization ID to include in the token
   * @returns Tokens and expiry time
   */
  private generateTokens(user: AuthUser, organizationId?: string): { token: string; refreshToken: string; expiresIn: number } {
    // Generate access token
    const token = sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        organizationId: organizationId // Include organization ID in token for backward compatibility
      },
      this.JWT_SECRET,
      { expiresIn: this.TOKEN_EXPIRY }
    );
    
    // Generate refresh token
    const refreshToken = sign(
      {
        userId: user.id,
        email: user.email
      },
      this.JWT_REFRESH_SECRET,
      { expiresIn: this.REFRESH_EXPIRY }
    );
    
    return {
      token,
      refreshToken,
      expiresIn: this.TOKEN_EXPIRY
    };
  }
  
  /**
   * Save a refresh token to the database (with device/session info and expiry)
   * @param userId User ID
   * @param refreshToken Refresh token
   * @param deviceInfo Optional device/session info
   */
  private async saveRefreshToken(userId: string, refreshToken: string, deviceInfo?: { ip?: string; userAgent?: string }): Promise<void> {
    try {
      const now = new Date();
      const expiresAt = Timestamp.fromMillis(now.getTime() + this.REFRESH_EXPIRY * 1000);
      const sessionInfo = {
        ip: deviceInfo?.ip || null,
        userAgent: deviceInfo?.userAgent || null,
      };
      // Overwrite or create new token document
      await setDoc(doc(firestore, 'refreshTokens', userId), {
        userId,
        token: refreshToken,
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now),
        expiresAt,
        sessionInfo,
      });
    } catch (error) {
      console.error('Error saving refresh token:', error);
    }
  }
  
  /**
   * Cleanup expired refresh tokens from the database (should be called by a scheduled job)
   */
  static async cleanupExpiredRefreshTokens(): Promise<void> {
    try {
      // Query all refreshTokens where expiresAt < now
      const now = Date.now();
      const refreshTokensRef = collection(firestore, 'refreshTokens');
      const expiredQuery = query(refreshTokensRef, where('expiresAt', '<', Timestamp.fromMillis(now)));
      const expiredTokens = await getDocs(expiredQuery);
      const batch = writeBatch(firestore);
      expiredTokens.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();
      console.info(`[Auth] Cleaned up ${expiredTokens.size} expired refresh tokens.`);
    } catch (error) {
      console.error('Error cleaning up expired refresh tokens:', error);
    }
  }
  
  /**
   * Revoke all refresh tokens for a user (force logout everywhere)
   * @param userId User ID
   */
  static async revokeAllRefreshTokens(userId: string): Promise<void> {
    try {
      await setDoc(doc(firestore, 'refreshTokens', userId), {
        token: null,
        updatedAt: Timestamp.fromDate(new Date()),
        expiresAt: Timestamp.fromDate(new Date()),
        sessionInfo: null,
      });
      console.info(`[Auth] All refresh tokens revoked for user ${userId}`);
    } catch (error) {
      console.error('Error revoking all refresh tokens:', error, { userId });
    }
  }
  
  /**
   * List all active sessions for a user (device info, IP, user agent, expiry)
   * @param userId User ID
   * @returns Array of session info objects (if multi-session is supported, else single session)
   */
  static async listActiveSessions(userId: string): Promise<Array<{ ip: string | null; userAgent: string | null; expiresAt: Date | null }> | null> {
    try {
      const tokenDoc = await getDoc(doc(firestore, 'refreshTokens', userId));
      if (!tokenDoc.exists()) return null;
      const data = tokenDoc.data();
      return [{
        ip: data.sessionInfo?.ip || null,
        userAgent: data.sessionInfo?.userAgent || null,
        expiresAt: data.expiresAt ? data.expiresAt.toDate() : null,
      }];
    } catch (error) {
      console.error('Error listing active sessions:', error, { userId });
      return null;
    }
  }
} 