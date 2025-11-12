import React from 'react';
import { SocialPlatform } from './PlatformConnectButton';

export type ConnectionStatus = 
  | 'connected' 
  | 'disconnected' 
  | 'expired' 
  | 'pending' 
  | 'error'
  | 'limited';

export interface ConnectionStatusBadgeProps {
  /**
   * The social platform
   */
  platform: SocialPlatform;
  /**
   * The connection status
   */
  status: ConnectionStatus;
  /**
   * Additional classes to apply
   */
  className?: string;
  /**
   * Size of the badge
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Whether to show the platform icon
   */
  showIcon?: boolean;
  /**
   * Whether to show the platform name
   */
  showName?: boolean;
  /**
   * Custom label to display (overrides default status labels)
   */
  customLabel?: string;
  /**
   * Optional tooltip text
   */
  tooltip?: string;
  /**
   * Error message to display for error status
   */
  errorMessage?: string;
  /**
   * Optional expiration date for token
   */
  expiresAt?: Date;
}

/**
 * ConnectionStatusBadge component to display platform connection status
 */
export const ConnectionStatusBadge: React.FC<ConnectionStatusBadgeProps> = ({
  platform,
  status,
  className = '',
  size = 'md',
  showIcon = true,
  showName = false,
  customLabel,
  tooltip,
  errorMessage,
  expiresAt,
}) => {
  // Get platform name
  const platformNames: Record<SocialPlatform, string> = {
    facebook: 'Facebook',
    instagram: 'Instagram',
    twitter: 'Twitter',
    linkedin: 'LinkedIn',
    pinterest: 'Pinterest',
    youtube: 'YouTube',
    reddit: 'Reddit',
    mastodon: 'Mastodon',
    tiktok: 'TikTok',
  };

  const platformName = platformNames[platform];

  // Status configurations
  const statusConfig: Record<ConnectionStatus, { 
    label: string; 
    bgColor: string;
    textColor: string;
    icon: React.ReactNode;
  }> = {
    connected: {
      label: 'Connected',
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
      icon: <CheckIcon />,
    },
    disconnected: {
      label: 'Disconnected',
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-800',
      icon: <DisconnectIcon />,
    },
    expired: {
      label: 'Expired',
      bgColor: 'bg-amber-100',
      textColor: 'text-amber-800',
      icon: <ExpiredIcon />,
    },
    pending: {
      label: 'Pending',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-700',
      icon: <PendingIcon />,
    },
    error: {
      label: 'Error',
      bgColor: 'bg-red-100',
      textColor: 'text-red-800',
      icon: <ErrorIcon />,
    },
    limited: {
      label: 'Limited Access',
      bgColor: 'bg-purple-100',
      textColor: 'text-purple-800',
      icon: <LimitedIcon />,
    },
  };

  const config = statusConfig[status];
  
  // Size classes
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5',
  };

  // Determine what text to display
  let displayText = customLabel || config.label;
  if (showName) {
    displayText = `${platformName}: ${displayText}`;
  }

  // Expiry info
  const showExpiry = status === 'connected' && expiresAt;
  const daysToExpiry = showExpiry 
    ? Math.max(0, Math.floor((expiresAt!.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;
  
  let expiryText = '';
  if (showExpiry) {
    if (daysToExpiry === 0) {
      expiryText = 'Expires today';
    } else if (daysToExpiry === 1) {
      expiryText = 'Expires tomorrow';
    } else {
      expiryText = `Expires in ${daysToExpiry} days`;
    }
  }

  const finalClassName = `
    inline-flex items-center rounded-full
    ${config.bgColor} ${config.textColor}
    ${sizeClasses[size]}
    font-medium
    ${className}
  `;

  const tooltipText = tooltip || (status === 'error' && errorMessage ? errorMessage : '');

  return (
    <div 
      className={finalClassName}
      title={tooltipText || undefined}
    >
      {showIcon && (
        <span className="mr-1 flex-shrink-0">
          {config.icon}
        </span>
      )}
      <span>
        {displayText}
        {showExpiry && daysToExpiry < 7 && (
          <span className="ml-1 text-amber-700 font-normal">
            ({expiryText})
          </span>
        )}
      </span>
    </div>
  );
};

// Status icons
const CheckIcon = () => (
  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
  </svg>
);

const DisconnectIcon = () => (
  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
  </svg>
);

const ExpiredIcon = () => (
  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
  </svg>
);

const PendingIcon = () => (
  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const ErrorIcon = () => (
  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
  </svg>
);

const LimitedIcon = () => (
  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
  </svg>
);

export default ConnectionStatusBadge; 