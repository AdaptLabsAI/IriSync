import React, { useState } from 'react';
import { Button } from '../ui/button/Button';
import { ExternalLink, Loader2 } from 'lucide-react';

// Platform categories
export type PlatformCategory = 
  | 'social' 
  | 'crm' 
  | 'content' 
  | 'analytics' 
  | 'workflow'
  | 'auth';

// Social media platforms
export type SocialPlatform = 
  | 'facebook'
  | 'instagram'
  | 'twitter'
  | 'linkedin'
  | 'pinterest'
  | 'tiktok'
  | 'youtube'
  | 'reddit'
  | 'threads'
  | 'mastodon';

// CRM platforms
export type CrmPlatform = 
  | 'hubspot'
  | 'salesforce'
  | 'zoho'
  | 'pipedrive'
  | 'dynamics'
  | 'sugarcrm';

// Content & media platforms
export type ContentPlatform = 
  | 'canva'
  | 'adobe'
  | 'gdrive'
  | 'dropbox'
  | 'onedrive'
  | 'notion'
  | 'airtable';

// Analytics platforms
export type AnalyticsPlatform = 
  | 'googleanalytics'
  | 'metabusiness'
  | 'tiktokbusiness'
  | 'linkedininsight';

// Workflow platforms
export type WorkflowPlatform = 
  | 'slack'
  | 'teams'
  | 'trello'
  | 'asana'
  | 'clickup'
  | 'zapier'
  | 'make'
  | 'monday';

// Auth platforms
export type AuthPlatform = 
  | 'google'
  | 'apple';

// Union type for all platform types
export type Platform = 
  | SocialPlatform
  | CrmPlatform
  | ContentPlatform
  | AnalyticsPlatform
  | WorkflowPlatform
  | AuthPlatform
  | 'other';

export interface SocialPlatformOAuthButtonProps {
  /**
   * Platform to connect to
   */
  platform: Platform;
  /**
   * Category of the platform
   */
  category: PlatformCategory;
  /**
   * Custom platform name (if not using a predefined platform)
   */
  customPlatformName?: string;
  /**
   * Platform icon URL
   */
  platformIcon?: string;
  /**
   * Platform brand color (hex)
   */
  platformColor?: string;
  /**
   * Connection URL for the OAuth flow
   */
  connectionUrl: string;
  /**
   * Callback to execute when the OAuth window is opened
   */
  onConnect?: () => void;
  /**
   * When true, button will link directly instead of opening a popup
   */
  directLink?: boolean;
  /**
   * When true, display a different style for business/professional accounts
   */
  businessAccount?: boolean;
  /**
   * OAuth window width
   */
  popupWidth?: number;
  /**
   * OAuth window height
   */
  popupHeight?: number;
  /**
   * Button size
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Button variant
   */
  variant?: 'default' | 'outline' | 'ghost';
  /**
   * Whether button is loading
   */
  isLoading?: boolean;
  /**
   * Whether button is disabled
   */
  isDisabled?: boolean;
  /**
   * Optional class name for additional styling
   */
  className?: string;
  /**
   * Whether to use the platform's branding colors
   */
  useBrandColor?: boolean;
  /**
   * Custom button text
   */
  customText?: string;
  /**
   * Show only the icon
   */
  iconOnly?: boolean;
}

/**
 * SocialPlatformOAuthButton - A flexible button for connecting to various
 * platforms via OAuth, including social media, CRMs, content tools, etc.
 */
export const SocialPlatformOAuthButton: React.FC<SocialPlatformOAuthButtonProps> = ({
  platform,
  category,
  customPlatformName,
  platformIcon,
  platformColor,
  connectionUrl,
  onConnect,
  directLink = false,
  businessAccount = false,
  popupWidth = 600,
  popupHeight = 700,
  size = 'md',
  variant = 'outline',
  isLoading = false,
  isDisabled = false,
  className = '',
  useBrandColor = true,
  customText,
  iconOnly = false,
}) => {
  const [isConnecting, setIsConnecting] = useState(false);
  
  // Get platform-specific info
  const getPlatformInfo = () => {
    // Social media platforms
    const socialPlatforms: Record<SocialPlatform, { name: string, color: string, icon: string }> = {
      facebook: {
        name: 'Facebook',
        color: '#1877F2',
        icon: '/icons/facebook.svg',
      },
      instagram: {
        name: 'Instagram',
        color: '#E1306C',
        icon: '/icons/instagram.svg',
      },
      twitter: {
        name: 'Twitter',
        color: '#1DA1F2',
        icon: '/icons/twitter.svg',
      },
      linkedin: {
        name: 'LinkedIn',
        color: '#0A66C2',
        icon: '/icons/linkedin.svg',
      },
      pinterest: {
        name: 'Pinterest',
        color: '#E60023',
        icon: '/icons/pinterest.svg',
      },
      tiktok: {
        name: 'TikTok',
        color: '#000000',
        icon: '/icons/tiktok.svg',
      },
      youtube: {
        name: 'YouTube',
        color: '#FF0000',
        icon: '/icons/youtube.svg',
      },
      reddit: {
        name: 'Reddit',
        color: '#FF4500',
        icon: '/icons/reddit.svg',
      },
      threads: {
        name: 'Threads',
        color: '#000000',
        icon: '/icons/threads.svg',
      },
      mastodon: {
        name: 'Mastodon',
        color: '#6364FF',
        icon: '/icons/mastodon.svg',
      },
    };
    
    // CRM platforms
    const crmPlatforms: Record<CrmPlatform, { name: string, color: string, icon: string }> = {
      hubspot: {
        name: 'HubSpot',
        color: '#FF7A59',
        icon: '/icons/hubspot.svg',
      },
      salesforce: {
        name: 'Salesforce',
        color: '#00A1E0',
        icon: '/icons/salesforce.svg',
      },
      zoho: {
        name: 'Zoho CRM',
        color: '#C12121',
        icon: '/icons/zoho.svg',
      },
      pipedrive: {
        name: 'Pipedrive',
        color: '#26C281',
        icon: '/icons/pipedrive.svg',
      },
      dynamics: {
        name: 'Microsoft Dynamics',
        color: '#0078D4',
        icon: '/icons/dynamics.svg',
      },
      sugarcrm: {
        name: 'SugarCRM',
        color: '#E61718',
        icon: '/icons/sugarcrm.svg',
      },
    };
    
    // Content & media platforms
    const contentPlatforms: Record<ContentPlatform, { name: string, color: string, icon: string }> = {
      canva: {
        name: 'Canva',
        color: '#00C4CC',
        icon: '/icons/canva.svg',
      },
      adobe: {
        name: 'Adobe Express',
        color: '#FF0000',
        icon: '/icons/adobe.svg',
      },
      gdrive: {
        name: 'Google Drive',
        color: '#0F9D58',
        icon: '/icons/gdrive.svg',
      },
      dropbox: {
        name: 'Dropbox',
        color: '#0061FF',
        icon: '/icons/dropbox.svg',
      },
      onedrive: {
        name: 'OneDrive',
        color: '#0078D4',
        icon: '/icons/onedrive.svg',
      },
      notion: {
        name: 'Notion',
        color: '#000000',
        icon: '/icons/notion.svg',
      },
      airtable: {
        name: 'Airtable',
        color: '#F82B60',
        icon: '/icons/airtable.svg',
      },
    };
    
    // Analytics platforms
    const analyticsPlatforms: Record<AnalyticsPlatform, { name: string, color: string, icon: string }> = {
      googleanalytics: {
        name: 'Google Analytics',
        color: '#E37400',
        icon: '/icons/googleanalytics.svg',
      },
      metabusiness: {
        name: 'Meta Business Suite',
        color: '#1877F2',
        icon: '/icons/metabusiness.svg',
      },
      tiktokbusiness: {
        name: 'TikTok Business',
        color: '#000000',
        icon: '/icons/tiktokbusiness.svg',
      },
      linkedininsight: {
        name: 'LinkedIn Insight',
        color: '#0A66C2',
        icon: '/icons/linkedininsight.svg',
      },
    };
    
    // Workflow platforms
    const workflowPlatforms: Record<WorkflowPlatform, { name: string, color: string, icon: string }> = {
      slack: {
        name: 'Slack',
        color: '#4A154B',
        icon: '/icons/slack.svg',
      },
      teams: {
        name: 'Microsoft Teams',
        color: '#6264A7',
        icon: '/icons/teams.svg',
      },
      trello: {
        name: 'Trello',
        color: '#0079BF',
        icon: '/icons/trello.svg',
      },
      asana: {
        name: 'Asana',
        color: '#F06A6A',
        icon: '/icons/asana.svg',
      },
      clickup: {
        name: 'ClickUp',
        color: '#7B68EE',
        icon: '/icons/clickup.svg',
      },
      zapier: {
        name: 'Zapier',
        color: '#FF4A00',
        icon: '/icons/zapier.svg',
      },
      make: {
        name: 'Make',
        color: '#23C8B2',
        icon: '/icons/make.svg',
      },
      monday: {
        name: 'Monday.com',
        color: '#FF3D57',
        icon: '/icons/monday.svg',
      },
    };
    
    // Auth platforms
    const authPlatforms: Record<AuthPlatform, { name: string, color: string, icon: string }> = {
      google: {
        name: 'Google',
        color: '#4285F4',
        icon: '/icons/google.svg',
      },
      apple: {
        name: 'Apple',
        color: '#000000',
        icon: '/icons/apple.svg',
      },
    };
    
    // Generic other platform
    const otherPlatform = {
      name: customPlatformName || 'Connect',
      color: '#6E6E6E',
      icon: '/icons/globe.svg',
    };
    
    // Determine which category to use and get platform info
    let platformInfo;
    
    switch (category) {
      case 'social':
        platformInfo = socialPlatforms[platform as SocialPlatform] || otherPlatform;
        break;
      case 'crm':
        platformInfo = crmPlatforms[platform as CrmPlatform] || otherPlatform;
        break;
      case 'content':
        platformInfo = contentPlatforms[platform as ContentPlatform] || otherPlatform;
        break;
      case 'analytics':
        platformInfo = analyticsPlatforms[platform as AnalyticsPlatform] || otherPlatform;
        break;
      case 'workflow':
        platformInfo = workflowPlatforms[platform as WorkflowPlatform] || otherPlatform;
        break;
      case 'auth':
        platformInfo = authPlatforms[platform as AuthPlatform] || otherPlatform;
        break;
      default:
        platformInfo = otherPlatform;
    }

    return {
      name: customPlatformName || platformInfo.name,
      color: platformColor || platformInfo.color,
      icon: platformIcon || platformInfo.icon,
    };
  };

  const { name: platformName, color, icon } = getPlatformInfo();
  
  const isButtonDisabled = isDisabled || isLoading || isConnecting;
  
  // Handle connection
  const handleConnect = () => {
    if (isButtonDisabled) return;
    
    setIsConnecting(true);
    
    if (onConnect) {
      onConnect();
    }
    
    if (directLink) {
      window.location.href = connectionUrl;
      return;
    }
    
    // Open popup for OAuth
    const left = (window.innerWidth - popupWidth) / 2;
    const top = (window.innerHeight - popupHeight) / 2;
    
    const popup = window.open(
      connectionUrl,
      `Connect to ${platformName}`,
      `width=${popupWidth},height=${popupHeight},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );
    
    // Poll to check if popup is closed
    const checkPopup = setInterval(() => {
      if (!popup || popup.closed) {
        clearInterval(checkPopup);
        setIsConnecting(false);
      }
    }, 500);
  };
  
  // Get button text
  const getButtonText = () => {
    if (customText) {
      return customText;
    }
    
    switch (category) {
      case 'social':
        return `Connect ${platformName}`;
      case 'crm':
        return `Connect to ${platformName}`;
      case 'content':
        return `Connect ${platformName}`;
      case 'analytics':
        return `Connect ${platformName}`;
      case 'workflow':
        return `Connect ${platformName}`;
      case 'auth':
        return `Sign in with ${platformName}`;
      default:
        return `Connect ${platformName}`;
    }
  };
  
  // Get icon component
  const getIcon = () => {
    return (
      <img 
        src={icon}
        alt={`${platformName} icon`}
        className="w-5 h-5"
      />
    );
  };
  
  // Get button style based on platform branding
  const getButtonStyle = () => {
    if (!useBrandColor) return {};
    
    if (variant === 'default') {
      return {
        backgroundColor: color,
        color: '#FFFFFF',
        borderColor: color,
      };
    }
    
    return {
      color: color,
      borderColor: color,
    };
  };
  
  return (
    <Button
      variant={variant}
      size={size}
      className={`relative ${className}`}
      style={getButtonStyle()}
      onClick={handleConnect}
      disabled={isButtonDisabled}
    >
      {(isLoading || isConnecting) ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <span className="mr-2">
          {getIcon()}
        </span>
      )}
      
      {!iconOnly && getButtonText()}
      
      {!iconOnly && directLink && (
        <ExternalLink className="ml-2 h-4 w-4" />
      )}
    </Button>
  );
};

export default SocialPlatformOAuthButton; 