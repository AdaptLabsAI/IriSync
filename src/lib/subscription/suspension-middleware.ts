import { NextApiRequest, NextApiResponse } from 'next';
import { getDoc, doc } from 'firebase/firestore';
import { firestore } from '../core/firebase';
import { logger } from '../logging/logger';

/**
 * Middleware to check if an organization is suspended for non-payment
 * This should be used on all API endpoints that provide paid features
 */
export async function checkAccountSuspension(
  organizationId: string,
  featureType?: 'aiToolkit' | 'contentScheduling' | 'analytics' | 'teamCollaboration'
): Promise<{ suspended: boolean; reason?: string }> {
  try {
    if (!organizationId) {
      return { suspended: false };
    }

    // Check organization status
    const orgRef = doc(firestore, 'organizations', organizationId);
    const orgDoc = await getDoc(orgRef);

    if (!orgDoc.exists()) {
      return { suspended: false };
    }

    const orgData = orgDoc.data();
    
    // Check if organization is suspended
    if (orgData.status === 'suspended') {
      const reason = orgData.suspensionReason || 'account_suspended';
      
      logger.warn('Blocked access to suspended organization', {
        organizationId,
        suspensionReason: reason,
        featureType
      });
      
      return { 
        suspended: true, 
        reason: reason === 'billing_past_due' ? 'Payment required to restore access' : 'Account suspended'
      };
    }

    // Check specific feature access if feature type is provided
    if (featureType && orgData.features) {
      if (!orgData.features[featureType]) {
        return {
          suspended: true,
          reason: 'Feature not available on current plan'
        };
      }
    }

    return { suspended: false };
  } catch (error) {
    logger.error('Error checking account suspension', {
      error: error instanceof Error ? error.message : String(error),
      organizationId,
      featureType
    });
    
    // Fail safely - don't block access on error
    return { suspended: false };
  }
}

/**
 * Express/Next.js middleware to check account suspension
 */
export function createSuspensionMiddleware(featureType?: 'aiToolkit' | 'contentScheduling' | 'analytics' | 'teamCollaboration') {
  return async (req: NextApiRequest, res: NextApiResponse, next?: () => void) => {
    try {
      // Extract organization ID from request (adjust based on your auth system)
      const organizationId = req.headers['x-organization-id'] as string || 
                            (req.body?.organizationId) || 
                            (req.query?.organizationId as string);

      if (!organizationId) {
        // If no organization ID, let the request through (might be handled by auth middleware)
        if (next) next();
        return;
      }

      const suspensionCheck = await checkAccountSuspension(organizationId, featureType);

      if (suspensionCheck.suspended) {
        return res.status(402).json({
          error: 'Account suspended',
          message: suspensionCheck.reason || 'Account access has been suspended',
          code: 'ACCOUNT_SUSPENDED',
          action: 'contact_billing'
        });
      }

      // Account is active, continue
      if (next) next();
    } catch (error) {
      logger.error('Suspension middleware error', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Fail safely - let request through on middleware error
      if (next) next();
    }
  };
}

/**
 * Check if user has access to AI tokens
 */
export async function checkAITokenAccess(organizationId: string): Promise<{ 
  hasAccess: boolean; 
  tokensRemaining: number; 
  reason?: string 
}> {
  try {
    const suspensionCheck = await checkAccountSuspension(organizationId, 'aiToolkit');
    
    if (suspensionCheck.suspended) {
      return {
        hasAccess: false,
        tokensRemaining: 0,
        reason: suspensionCheck.reason
      };
    }

    // Check token quota
    const orgRef = doc(firestore, 'organizations', organizationId);
    const orgDoc = await getDoc(orgRef);

    if (!orgDoc.exists()) {
      return { hasAccess: false, tokensRemaining: 0, reason: 'Organization not found' };
    }

    const orgData = orgDoc.data();
    const tokenQuota = orgData.usageQuota?.aiTokens || { limit: 0, used: 0 };
    const tokensRemaining = Math.max(0, tokenQuota.limit - tokenQuota.used);

    if (tokensRemaining <= 0) {
      return {
        hasAccess: false,
        tokensRemaining: 0,
        reason: 'AI token limit exceeded'
      };
    }

    return {
      hasAccess: true,
      tokensRemaining
    };
  } catch (error) {
    logger.error('Error checking AI token access', {
      error: error instanceof Error ? error.message : String(error),
      organizationId
    });
    
    return { hasAccess: false, tokensRemaining: 0, reason: 'Error checking access' };
  }
} 