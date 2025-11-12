import { firestore } from 'firebase-admin';
import { AuthState, PlatformType } from '../PlatformProvider';
import { encryptAuthState, decryptAuthState, isTokenExpired } from './oauth';

// Environment variable for token encryption
const TOKEN_ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY || 'default-encryption-key-replace-in-production';

/**
 * Store authentication tokens for a platform
 */
export async function storeTokens(
  userId: string,
  platformType: PlatformType,
  accountId: string,
  authState: AuthState
): Promise<void> {
  try {
    // Encrypt the tokens before storing
    const encryptedState = encryptAuthState(authState, TOKEN_ENCRYPTION_KEY);
    
    // Store in Firestore
    await firestore().collection('users').doc(userId)
      .collection('socialAccounts').doc(accountId)
      .set({
        platformType,
        encryptedAuthState: encryptedState,
        lastUpdated: firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      
  } catch (error) {
    console.error('Error storing tokens:', error);
    throw new Error('Failed to store authentication tokens');
  }
}

/**
 * Retrieve authentication tokens for a platform
 */
export async function getTokens(
  userId: string,
  platformType: PlatformType,
  accountId: string
): Promise<AuthState | null> {
  try {
    // Get from Firestore
    const doc = await firestore().collection('users').doc(userId)
      .collection('socialAccounts').doc(accountId)
      .get();
      
    if (!doc.exists) {
      return null;
    }
    
    const data = doc.data();
    if (!data || !data.encryptedAuthState) {
      return null;
    }
    
    // Decrypt the tokens
    return decryptAuthState(data.encryptedAuthState, TOKEN_ENCRYPTION_KEY);
    
  } catch (error) {
    console.error('Error retrieving tokens:', error);
    throw new Error('Failed to retrieve authentication tokens');
  }
}

/**
 * Delete authentication tokens for a platform
 */
export async function deleteTokens(
  userId: string,
  platformType: PlatformType,
  accountId: string
): Promise<void> {
  try {
    // Update Firestore to remove tokens but keep the account record
    await firestore().collection('users').doc(userId)
      .collection('socialAccounts').doc(accountId)
      .update({
        encryptedAuthState: firestore.FieldValue.delete(),
        isConnected: false,
        hasValidCredentials: false,
        lastDisconnected: firestore.FieldValue.serverTimestamp()
      });
      
  } catch (error) {
    console.error('Error deleting tokens:', error);
    throw new Error('Failed to delete authentication tokens');
  }
}

/**
 * Check if tokens are valid and refresh if needed
 */
export async function ensureValidTokens(
  userId: string,
  platformType: PlatformType,
  accountId: string,
  refreshTokenFn: (refreshToken: string) => Promise<AuthState>
): Promise<AuthState> {
  // Get current tokens
  const tokens = await getTokens(userId, platformType, accountId);
  
  if (!tokens) {
    throw new Error('No authentication tokens found');
  }
  
  // Check if token is expired
  if (isTokenExpired(tokens.expiresAt)) {
    if (!tokens.refreshToken) {
      throw new Error('Access token expired and no refresh token available');
    }
    
    try {
      // Refresh the tokens
      const newTokens = await refreshTokenFn(tokens.refreshToken);
      
      // Store the new tokens
      await storeTokens(userId, platformType, accountId, newTokens);
      
      return newTokens;
    } catch (error) {
      console.error('Error refreshing tokens:', error);
      throw new Error('Failed to refresh authentication tokens');
    }
  }
  
  return tokens;
}

/**
 * Count total connected social accounts for a user
 * Used for subscription tier limits enforcement
 */
export async function countConnectedAccounts(userId: string): Promise<number> {
  try {
    const snapshot = await firestore().collection('users').doc(userId)
      .collection('socialAccounts')
      .where('isConnected', '==', true)
      .get();
      
    return snapshot.size;
  } catch (error) {
    console.error('Error counting connected accounts:', error);
    throw new Error('Failed to count connected social accounts');
  }
}

/**
 * Check if user has reached their account limit based on subscription
 */
export async function hasReachedAccountLimit(
  userId: string,
  subscriptionTier: 'creator' | 'influencer' | 'enterprise'
): Promise<boolean> {
  // Get account limit based on subscription tier
  let accountLimit = Infinity;
  
  if (subscriptionTier === 'creator') {
    accountLimit = 5; // Creator tier limit
  }
  
  // Count current connected accounts
  const connectedCount = await countConnectedAccounts(userId);
  
  return connectedCount >= accountLimit;
}
