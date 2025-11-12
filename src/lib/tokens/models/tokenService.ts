import { firestore } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';

/**
 * Get a user's current token balance
 * @param userId User ID
 * @returns Promise resolving to token balance
 */
export async function getUserTokenBalance(userId: string): Promise<number> {
  try {
    // Get user document to find the organization
    const userDoc = await getDoc(doc(firestore, 'users', userId));
    
    if (!userDoc.exists()) {
      console.warn(`User ${userId} not found when getting token balance`);
      return 0;
    }
    
    const userData = userDoc.data();
    
    // Get the current organization ID (preferred) or personal organization
    const orgId = userData.currentOrganizationId || userData.personalOrganizationId;
    
    if (!orgId) {
      console.warn(`User ${userId} has no organization when getting token balance`);
      return 0;
    }
    
    // Get organization details
    const orgDoc = await getDoc(doc(firestore, 'organizations', orgId));
    
    if (!orgDoc.exists()) {
      console.warn(`Organization ${orgId} not found when getting token balance for user ${userId}`);
      return 0;
    }
    
    const organization = orgDoc.data();
    
    // Return token balance from organization usage quota
    return organization.usageQuota?.aiTokens?.limit || 0;
  } catch (error) {
    console.error('Error getting user token balance:', error);
    return 0;
  }
} 