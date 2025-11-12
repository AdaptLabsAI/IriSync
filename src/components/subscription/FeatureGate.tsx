import React from 'react';
import { ENTERPRISE_FEATURES } from '@/types/todo';

interface FeatureGateProps {
  feature: string;
  subscriptionTier: 'creator' | 'influencer' | 'enterprise';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * FeatureGate component for controlling access to features based on subscription tier
 */
export const FeatureGate: React.FC<FeatureGateProps> = ({ 
  feature, 
  subscriptionTier, 
  children, 
  fallback = null 
}) => {
  // Check if the feature is available in the current subscription tier
  const hasAccess = ENTERPRISE_FEATURES[subscriptionTier]?.includes(feature as any) || false;
  
  return hasAccess ? <>{children}</> : <>{fallback}</>;
};

export default FeatureGate; 