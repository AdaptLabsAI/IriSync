import { getFirebaseFirestore } from '../core/firebase';
import { Firestore, doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { AuthUser, AuthResponse } from './auth-service';
import { sign } from 'jsonwebtoken';
import fetch from 'node-fetch';
import { SubscriptionTier, UserRole, SubscriptionTierValues } from '../core/models/User';
import { getTokenAllocationForTier } from '../subscription';
import { generateOrganizationId, validateUserOrganizationConnections } from '../utils';
import { getGoogleOAuthClientId } from '@/lib/server/env';

/**
 * Get Google OAuth client ID with runtime check
 */
function getGoogleClientId(): string {
  const clientId = getGoogleOAuthClientId();
  if (!clientId) {
    throw new Error('Google OAuth is not configured. Missing GOOGLE_OAUTH_CLIENT_ID.');
  }
  return clientId;
}

/**
 * Supported social providers
 */
export type SocialProvider = 'google' | 'apple';

/**
 * Social account info
 */
export interface SocialAccount {
  provider: SocialProvider;
  providerUserId: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  linkedAt: Date;
}

/**
 * Social Auth Service
 *
 * Provides OAuth2 login, registration, and account linking for Google and Apple.
 * Extensible for additional providers.
 */
export class SocialAuthService {
  private getFirestore() {
    const firestore = getFirebaseFirestore();
    if (!firestore) throw new Error('Firestore not configured');
    return firestore;
  }

  /**
   * Login or register with a social provider (Google, Apple)
   * @param provider Social provider
   * @param code OAuth2 code
   * @param redirectUri Redirect URI used in OAuth2 flow
   * @param deviceInfo Optional device/session info
   * @returns AuthResponse or null if failed
   */
  static async loginWithProvider(
    provider: SocialProvider,
    code: string,
    redirectUri: string,
    deviceInfo?: { ip?: string; userAgent?: string }
  ): Promise<AuthResponse | null> {
    try {
      let profile: SocialAccount | null = null;
      if (provider === 'google') {
        profile = await this.getGoogleProfile(code, redirectUri);
      } else if (provider === 'apple') {
        profile = await this.getAppleProfile(code, redirectUri);
      } else {
        throw new Error('Unsupported provider');
      }
      if (!profile) return null;
      // Check if user exists by providerUserId
      const socialRef = doc(this.getFirestore(), 'socialAccounts', `${provider}:${profile.providerUserId}`);
      const socialSnap = await getDoc(socialRef);
      let userId: string;
      if (socialSnap.exists()) {
        // Existing user, get userId
        userId = socialSnap.data().userId;
      } else {
        // New user, check if email exists
        const userSnap = await getDoc(doc(this.getFirestore(), 'users', profile.email));
        if (userSnap.exists()) {
          // Link social account to existing user
          userId = userSnap.id;
          await setDoc(socialRef, {
            userId,
            ...profile,
            linkedAt: new Date(),
          });
        } else {
          // Register new user
          const now = new Date();
          
          // Create a personal organization for the new user
          const personalOrgId = await generateOrganizationId(profile.email, firestore);
          
          // Get the correct token allocation for Creator tier with 1 seat
          const creatorTokenAllocation = getTokenAllocationForTier(SubscriptionTierValues.CREATOR, 1);
          
          // Set up the personal organization with default Creator tier
          await setDoc(doc(this.getFirestore(), 'organizations', personalOrgId), {
            name: `${profile.displayName || 'Personal'}'s Workspace`,
            owner: profile.email,
            members: [profile.email],
            createdAt: now,
            updatedAt: now,
            billing: {
              subscriptionTier: SubscriptionTierValues.CREATOR,
              subscriptionStatus: 'active',
              currentPeriodStart: now,
              currentPeriodEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
            },
            usageQuota: {
              aiTokens: {
                limit: creatorTokenAllocation, // Correct token allocation for Creator tier
                used: 0,
                resetDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
              }
            }
          });
          
          const user: AuthUser = {
            id: profile.email,
            email: profile.email,
            firstName: profile.displayName || '',
            lastName: '',
            role: UserRole.USER, // Use the proper enum value instead of string literal
            // Store organization IDs instead of subscription info directly
            personalOrganizationId: personalOrgId,
            currentOrganizationId: personalOrgId,
            createdAt: now,
            updatedAt: now,
          };
          await setDoc(doc(this.getFirestore(), 'users', user.id), {
            ...user,
            createdAt: now,
            updatedAt: now,
          });
          await setDoc(socialRef, {
            userId: user.id,
            ...profile,
            linkedAt: now,
          });
          userId = user.id;
        }
      }
      // Get user data
      const userSnap = await getDoc(doc(this.getFirestore(), 'users', userId));
      if (!userSnap.exists()) return null;
      const userData = userSnap.data();
      
      // Validate and get the organization ID for the user
      const orgValidation = await validateUserOrganizationConnections(userId, userData, firestore);
      
      // Update user document if organization connections were fixed
      if (!orgValidation.isValid) {
        console.warn('Fixed organization connections during social auth', { 
          userId, 
          errors: orgValidation.errors 
        });
        
        await updateDoc(doc(this.getFirestore(), 'users', userId), {
          personalOrganizationId: orgValidation.personalOrganizationId,
          currentOrganizationId: orgValidation.currentOrganizationId,
          updatedAt: new Date()
        });
      }
      
      const orgId = orgValidation.currentOrganizationId;
      
      // Create user object with organization-centric properties
      const user: AuthUser = {
        id: userId,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
        personalOrganizationId: orgValidation.personalOrganizationId,
        currentOrganizationId: orgValidation.currentOrganizationId,
        createdAt: userData.createdAt.toDate ? userData.createdAt.toDate() : userData.createdAt,
        updatedAt: userData.updatedAt.toDate ? userData.updatedAt.toDate() : userData.updatedAt,
      };
      
      // Issue tokens with the organization ID
      const JWT_SECRET = process.env.JWT_SECRET || 'irisync-jwt-secret';
      const TOKEN_EXPIRY = 3600;
      const token = sign({
        userId: user.id,
        email: user.email,
        role: user.role,
        organizationId: orgId, // Use organization ID for backward compatibility
      }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
      // Social logins do not issue refresh tokens directly; use main login for that
      return {
        token,
        refreshToken: '',
        expiresIn: TOKEN_EXPIRY,
        user,
      };
    } catch (error) {
      console.error('Error in loginWithProvider:', error);
      return null;
    }
  }

  /**
   * Link a social provider to an existing user
   * @param userId User ID
   * @param provider Social provider
   * @param code OAuth2 code
   * @param redirectUri Redirect URI
   * @returns true if successful
   */
  static async linkProviderToUser(
    userId: string,
    provider: SocialProvider,
    code: string,
    redirectUri: string
  ): Promise<boolean> {
    try {
      let profile: SocialAccount | null = null;
      if (provider === 'google') {
        profile = await this.getGoogleProfile(code, redirectUri);
      } else if (provider === 'apple') {
        profile = await this.getAppleProfile(code, redirectUri);
      } else {
        throw new Error('Unsupported provider');
      }
      if (!profile) return false;
      // Link social account
      await setDoc(doc(this.getFirestore(), 'socialAccounts', `${provider}:${profile.providerUserId}`), {
        userId,
        ...profile,
        linkedAt: new Date(),
      });
      return true;
    } catch (error) {
      console.error('Error in linkProviderToUser:', error);
      return false;
    }
  }

  /**
   * Get all linked social providers for a user
   * @param userId User ID
   * @returns Array of SocialAccount
   */
  static async getLinkedProviders(userId: string): Promise<SocialAccount[]> {
    try {
      const accounts: SocialAccount[] = [];
      const q = query(collection(this.getFirestore(), 'socialAccounts'), where('userId', '==', userId));
      const snap = await getDocs(q);
      snap.forEach(docSnap => {
        const data = docSnap.data();
        accounts.push({
          provider: data.provider,
          providerUserId: data.providerUserId,
          email: data.email,
          displayName: data.displayName,
          photoURL: data.photoURL,
          linkedAt: data.linkedAt instanceof Date ? data.linkedAt : data.linkedAt?.toDate?.() || new Date(),
        });
      });
      return accounts;
    } catch (error) {
      console.error('Error in getLinkedProviders:', error);
      return [];
    }
  }

  /**
   * Unlink a social provider from a user
   * @param userId User ID
   * @param provider Social provider
   * @returns true if successful
   */
  static async unlinkProvider(userId: string, provider: SocialProvider): Promise<boolean> {
    try {
      // Find the social account doc for this user and provider
      const q = query(collection(this.getFirestore(), 'socialAccounts'), where('userId', '==', userId), where('provider', '==', provider));
      const snap = await getDocs(q);
      let success = false;
      for (const docSnap of snap.docs) {
        await setDoc(docSnap.ref, {}, { merge: false }); // Remove the doc
        success = true;
      }
      return success;
    } catch (error) {
      console.error('Error in unlinkProvider:', error);
      return false;
    }
  }

  // --- Provider-specific helpers ---

  /**
   * Exchange Google OAuth2 code for profile
   */
  private static async getGoogleProfile(code: string, redirectUri: string): Promise<SocialAccount | null> {
    try {
      // Exchange code for tokens
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: getGoogleClientId(),
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });
      if (!tokenRes.ok) throw new Error('Failed to exchange Google code');
      const tokenData = await tokenRes.json();
      // Get user info
      const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      if (!profileRes.ok) throw new Error('Failed to fetch Google profile');
      const profile = await profileRes.json();
      return {
        provider: 'google',
        providerUserId: profile.id,
        email: profile.email,
        displayName: profile.name,
        photoURL: profile.picture,
        linkedAt: new Date(),
      };
    } catch (error) {
      console.error('Error in getGoogleProfile:', error);
      return null;
    }
  }

  /**
   * Exchange Apple OAuth2 code for profile
   * (Requires JWT validation and Apple public keys)
   */
  private static async getAppleProfile(code: string, redirectUri: string): Promise<SocialAccount | null> {
    // Apple OAuth2 is more complex; for brevity, this is a stub. In production, implement full JWT validation.
    try {
      // Exchange code for tokens
      const tokenRes = await fetch('https://appleid.apple.com/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: process.env.APPLE_CLIENT_ID!,
          client_secret: process.env.APPLE_CLIENT_SECRET!,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });
      if (!tokenRes.ok) throw new Error('Failed to exchange Apple code');
      const tokenData = await tokenRes.json();
      // Decode id_token (JWT) to get user info
      const idToken = tokenData.id_token;
      // In production, validate JWT signature and parse claims
      const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());
      return {
        provider: 'apple',
        providerUserId: payload.sub,
        email: payload.email,
        displayName: '',
        photoURL: '',
        linkedAt: new Date(),
      };
    } catch (error) {
      console.error('Error in getAppleProfile:', error);
      return null;
    }
  }
} 