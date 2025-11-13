import { getFirestore } from '../core/firebase/admin';

const firestore = getFirestore();

/**
 * Verify a user's subscription tier
 * @param userId The user ID to verify
 * @returns The user's subscription tier (creator, influencer, or enterprise)
 */
export async function verifySubscriptionTier(userId: string): Promise<string> {
  try {
    // Get user document
    const userDoc = await firestore.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return 'creator'; // Default to creator tier if user not found
    }
    
    const userData = userDoc.data() || {};
    
    // First, try to get the organization-level subscription tier
    const orgId = userData.currentOrganizationId || userData.personalOrganizationId;
    
    if (orgId) {
      // Get the organization document
      const orgDoc = await firestore.collection('organizations').doc(orgId).get();
      
      if (orgDoc.exists) {
        const orgData = orgDoc.data() || {};
        
        // Get subscription tier from organization billing data
        if (orgData.billing && orgData.billing.subscriptionTier) {
          return orgData.billing.subscriptionTier;
        }
      }
    }
    
    // Fallback to deprecated user-level subscription tier if organization doesn't have it
    if (userData.subscriptionTier) {
      console.warn('Using deprecated user.subscriptionTier field', { userId });
      return userData.subscriptionTier;
    }
    
    // Default to creator tier if no tier is found
    return 'creator';
  } catch (error) {
    console.error('Error verifying subscription tier:', error);
    return 'creator'; // Default to creator tier on error
  }
}

/**
 * Check if a user has access to a specific feature based on their subscription tier
 * @param userId The user ID to check
 * @param feature The feature to check access for
 * @returns Boolean indicating if the user has access
 */
export async function hasFeatureAccess(userId: string, feature: string): Promise<boolean> {
  const tier = await verifySubscriptionTier(userId);
  
  // Define feature access by tier
  const featureAccess: Record<string, string[]> = {
    // Creator tier features
    'creator': [
      'basic_analytics',
      'content_creation',
      'social_account_management',
      'media_storage',
      'ai_content_generation_limited',
      'unified_inbox',
      'alerts_notifications',
      'basic_support'
    ],
    
    // Influencer tier has all creator features plus more
    'influencer': [
      'basic_analytics',
      'content_creation',
      'social_account_management',
      'media_storage',
      'ai_content_generation_limited',
      'unified_inbox',
      'alerts_notifications',
      'basic_support',
      // Additional influencer features
      'video_scheduling',
      'bulk_scheduling',
      'custom_branded_urls',
      'post_approval_workflows',
      'custom_reports',
      'link_tracking',
      'custom_dashboard',
      'basic_social_listening',
      'sentiment_analysis',
      'access_permissions',
      'team_organization',
      'custom_user_roles',
      'data_export',
      'ad_management',
      'priority_support'
    ],
    
    // Enterprise tier has all features
    'enterprise': [
      'basic_analytics',
      'content_creation',
      'social_account_management',
      'media_storage',
      'ai_content_generation_unlimited',
      'unified_inbox',
      'alerts_notifications',
      'basic_support',
      // Additional influencer features
      'video_scheduling',
      'bulk_scheduling',
      'custom_branded_urls',
      'post_approval_workflows',
      'custom_reports',
      'link_tracking',
      'custom_dashboard',
      'basic_social_listening',
      'sentiment_analysis',
      'access_permissions',
      'team_organization',
      'custom_user_roles',
      'data_export',
      'ad_management',
      'priority_support',
      // Enterprise-only features
      'smart_replies',
      'brand_recognition',
      'advanced_social_listening',
      'enterprise_support',
      'custom_crm_integration'
    ]
  };
  
  // Check if the user's tier has access to the requested feature
  const tierFeatures = featureAccess[tier] || [];
  return tierFeatures.includes(feature);
} 