import React, { useState, useCallback } from 'react';
import { Button } from '../../ui/button';
import { Link as LinkIcon, ExternalLink, Loader2 } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../ui/tooltip';

// Social platform types
export type SocialPlatform = 
  | 'facebook'
  | 'instagram'
  | 'twitter'
  | 'linkedin'
  | 'pinterest'
  | 'youtube'
  | 'reddit'
  | 'mastodon'
  | 'tiktok'
  | 'threads'
  | 'other';

// CRM platforms
export type CrmPlatform = 
  | 'hubspot'
  | 'salesforce'
  | 'zoho'
  | 'pipedrive'
  | 'dynamics'
  | 'sugarcrm';

// Design platforms
export type DesignPlatform =
  | 'canva'
  | 'adobe-express'
  | 'google-drive'
  | 'dropbox'
  | 'onedrive';

// Content platforms
export type ContentPlatform =
  | 'notion'
  | 'airtable';

// Workflow platforms
export type WorkflowPlatform =
  | 'slack'
  | 'teams'
  | 'asana'
  | 'trello'
  | 'zapier'
  | 'make';

export type PlatformType = 
  | SocialPlatform 
  | CrmPlatform 
  | DesignPlatform 
  | ContentPlatform
  | WorkflowPlatform;

// Implementation status for each platform
const PLATFORM_IMPLEMENTATION_STATUS: Record<string, 'complete' | 'partial' | 'planned'> = {
  // Social platforms
  'facebook': 'complete',
  'tiktok': 'complete',
  'instagram': 'partial',
  'twitter': 'partial',
  'linkedin': 'partial',
  'pinterest': 'partial',
  'youtube': 'partial',
  'reddit': 'partial',
  'mastodon': 'partial',
  'threads': 'partial',
  
  // CRM platforms
  'hubspot': 'planned',
  'salesforce': 'planned',
  'zoho': 'planned',
  'pipedrive': 'planned',
  'dynamics': 'planned',
  'sugarcrm': 'planned',
  
  // Design platforms
  'canva': 'partial',
  'adobe-express': 'partial',
  'google-drive': 'partial',
  'dropbox': 'partial',
  'onedrive': 'partial',
  
  // Content platforms
  'notion': 'planned',
  'airtable': 'planned',
  
  // Workflow platforms
  'slack': 'planned',
  'teams': 'planned',
  'asana': 'planned',
  'trello': 'planned',
  'zapier': 'planned',
  'make': 'planned'
};

// Status messages for different implementation states
const IMPLEMENTATION_STATUS_MESSAGES = {
  'complete': 'Fully implemented',
  'partial': 'Partially implemented - some features may be limited',
  'planned': 'Coming soon - basic integration only'
};

export interface PlatformConnectButtonProps {
  /**
   * Platform to connect to
   */
  platform: SocialPlatform;
  /**
   * Custom platform name (if not using a predefined platform)
   */
  customPlatformName?: string;
  /**
   * Custom redirect URL
   */
  customRedirectUrl?: string;
  /**
   * Custom platform color
   */
  platformColor?: string;
  /**
   * Custom platform icon
   */
  platformIcon?: React.ReactNode;
  /**
   * Button variant
   */
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'link';
  /**
   * Button size
   */
  size?: 'default' | 'sm' | 'lg' | 'icon';
  /**
   * Additional class names
   */
  className?: string;
  /**
   * Use the platform's brand color for the button
   */
  useBrandColor?: boolean;
  /**
   * Show implementation status badge
   */
  showStatus?: boolean;
}

/**
 * PlatformConnectButton - Button for connecting to social media platforms
 */
export const PlatformConnectButton: React.FC<PlatformConnectButtonProps> = ({
  platform,
  customPlatformName,
  customRedirectUrl,
  platformColor,
  platformIcon,
  variant = 'default',
  size = 'default',
  className = '',
  useBrandColor = true,
  showStatus = true,
}) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const { tier, hasFeatureAccess } = useSubscription();
  
  // Define standard platforms
  const platformMap: Record<SocialPlatform, { name: string; color: string; icon: React.ReactNode }> = {
    facebook: { name: 'Facebook', color: '#1877F2', icon: <span>FB</span> },
    instagram: { name: 'Instagram', color: '#E1306C', icon: <span>IG</span> },
    twitter: { name: 'Twitter', color: '#1DA1F2', icon: <span>TW</span> },
    linkedin: { name: 'LinkedIn', color: '#0A66C2', icon: <span>LI</span> },
    pinterest: { name: 'Pinterest', color: '#E60023', icon: <span>PIN</span> },
    youtube: { name: 'YouTube', color: '#FF0000', icon: <span>YT</span> },
    reddit: { name: 'Reddit', color: '#FF4500', icon: <span>RD</span> },
    mastodon: { name: 'Mastodon', color: '#6364FF', icon: <span>M</span> },
    tiktok: { name: 'TikTok', color: '#000000', icon: <span>TT</span> },
    threads: { name: 'Threads', color: '#000000', icon: <span>TH</span> },
    other: { name: 'Other', color: '#CCCCCC', icon: <span>O</span> },
  };
  
  const getPlatformInfo = () => {
    if (platform === 'other' && !customPlatformName) {
      return {
        name: 'Custom Platform',
        color: platformColor || '#CCCCCC',
        icon: platformIcon || <span>?</span>,
      };
    }
  
    return {
      name: customPlatformName || platformMap[platform].name,
      color: platformColor || platformMap[platform].color,
      icon: platformIcon || platformMap[platform].icon,
    };
  };
  
  const { name: platformName, color: brandColor } = getPlatformInfo();
  
  const getButtonStyle = () => {
    if (!useBrandColor) return {};
    return {
      backgroundColor: brandColor,
      color: '#FFFFFF',
      border: 'none',
    };
  };
  
  const checkAccess = () => {
    if (tier === 'creator') {
      // Basic platforms only
      return ['facebook', 'instagram', 'twitter', 'linkedin'].includes(platform);
    }
    
    return true; // All platforms for higher tiers
  };
  
  const hasAccess = checkAccess();
  const isButtonDisabled = isConnecting || !hasAccess;
  
  const handleConnect = useCallback(() => {
    if (isButtonDisabled) return;
    
    setIsConnecting(true);
    
    // Redirect to the platform auth URL or custom URL
    const redirectUrl = customRedirectUrl || `/api/platforms/connect?platform=${platform}`;
    window.location.href = redirectUrl;
  }, [isButtonDisabled, customRedirectUrl, platform]);
  
  // Get implementation status
  const status = PLATFORM_IMPLEMENTATION_STATUS[platform] || 'planned';
  const statusMessage = IMPLEMENTATION_STATUS_MESSAGES[status];
  
  // Button content with implementation status badge if needed
  const buttonContent = (
    <Button
      onClick={handleConnect}
      disabled={isButtonDisabled || status === 'planned'}
      variant={variant}
      size={size}
      className={`flex items-center ${className} ${status !== 'complete' ? 'opacity-70' : ''}`}
      style={useBrandColor ? getButtonStyle() : undefined}
      aria-label={`Connect to ${platformName}`}
    >
      <span className="mr-2">Connect {platformName}</span>
      {!isConnecting && (
        <ExternalLink className="h-3 w-3 ml-2 opacity-70" />
      )}
      
      {showStatus && status !== 'complete' && (
        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
          {status === 'partial' ? 'Beta' : 'Soon'}
        </span>
      )}
    </Button>
  );
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-block">
            {buttonContent}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          {!hasAccess ? (
            <p className="text-sm">Upgrade your subscription to connect to {platformName}</p>
          ) : status !== 'complete' ? (
            <p className="text-sm">{statusMessage}</p>
          ) : (
            <p className="text-sm">Connect your {platformName} account to manage content</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default PlatformConnectButton; 