import React from 'react';
import { Card, CardBody } from '../ui/card';
import { SocialPlatform } from './PlatformConnectButton';
import { ConnectionStatus, ConnectionStatusBadge } from './ConnectionStatusBadge';
import { PlatformConnectButton } from './PlatformConnectButton';

export interface PlatformCapability {
  id: string;
  name: string;
  available: boolean;
}

export interface PlatformCardProps {
  /**
   * The platform type
   */
  platform: SocialPlatform;
  /**
   * The platform display name
   */
  platformName?: string;
  /**
   * The connection status
   */
  status: ConnectionStatus;
  /**
   * Platform account name/handle
   */
  accountName?: string;
  /**
   * Platform account image URL
   */
  accountImageUrl?: string;
  /**
   * Platform capabilities
   */
  capabilities?: PlatformCapability[];
  /**
   * Last synced date
   */
  lastSynced?: Date;
  /**
   * Function to connect to the platform
   */
  onConnect?: (platform: SocialPlatform) => Promise<void>;
  /**
   * Function to disconnect from the platform
   */
  onDisconnect?: (platform: SocialPlatform) => Promise<void>;
  /**
   * Function to refresh token
   */
  onRefresh?: (platform: SocialPlatform) => Promise<void>;
  /**
   * Function to view details
   */
  onViewDetails?: (platform: SocialPlatform) => void;
  /**
   * Additional classes to apply
   */
  className?: string;
  /**
   * Whether the card is in loading state
   */
  isLoading?: boolean;
  /**
   * Error message
   */
  errorMessage?: string;
  /**
   * Token expiration date
   */
  expiresAt?: Date;
  /**
   * Whether the platform has limited access
   */
  hasLimitedAccess?: boolean;
  /**
   * Subscription plan required for this platform
   */
  requiredPlan?: 'creator' | 'influencer' | 'enterprise';
  /**
   * Whether the user has access to this platform
   */
  hasAccess?: boolean;
}

/**
 * PlatformCard component to display a social platform with connection status
 */
export const PlatformCard: React.FC<PlatformCardProps> = ({
  platform,
  platformName,
  status,
  accountName,
  accountImageUrl,
  capabilities = [],
  lastSynced,
  onConnect,
  onDisconnect,
  onRefresh,
  onViewDetails,
  className = '',
  isLoading = false,
  errorMessage,
  expiresAt,
  hasLimitedAccess = false,
  requiredPlan,
  hasAccess = true,
}) => {
  // Platform names mapping
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

  const displayName = platformName || platformNames[platform];
  
  // If token is expired but status is connected, override to expired
  const actualStatus = status === 'connected' && expiresAt && expiresAt < new Date() 
    ? 'expired' 
    : (hasLimitedAccess && status === 'connected' ? 'limited' : status);

  // Format last synced time
  const formattedLastSynced = lastSynced 
    ? new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
      }).format(lastSynced)
    : null;

  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardBody className="p-0">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-gray-100">
                {getPlatformIcon(platform)}
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-gray-900">{displayName}</h3>
                {accountName && (
                  <p className="text-xs text-gray-500">
                    {accountName}
                  </p>
                )}
              </div>
            </div>
            <ConnectionStatusBadge 
              platform={platform}
              status={actualStatus}
              size="sm"
              errorMessage={errorMessage}
              expiresAt={expiresAt}
            />
          </div>

          {status === 'connected' && (
            <div className="mt-3">
              {capabilities.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {capabilities.map(capability => (
                    <span
                      key={capability.id}
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium 
                        ${capability.available 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-gray-100 text-gray-500 line-through'}`}
                    >
                      {capability.name}
                    </span>
                  ))}
                </div>
              )}
              
              {lastSynced && (
                <p className="text-xs text-gray-500">
                  Last synced: {formattedLastSynced}
                </p>
              )}
            </div>
          )}

          {!hasAccess && requiredPlan && (
            <div className="mt-3">
              <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                Requires {requiredPlan.charAt(0).toUpperCase() + requiredPlan.slice(1)} plan or higher
              </div>
            </div>
          )}
        </div>
        
        <div className="bg-gray-50 px-4 py-3 flex justify-between">
          {status === 'connected' ? (
            <>
              <button 
                onClick={() => onViewDetails?.(platform)}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                View Details
              </button>
              <div className="flex space-x-2">
                {actualStatus === 'expired' && (
                  <button 
                    onClick={() => onRefresh?.(platform)}
                    className="text-xs text-green-600 hover:text-green-800 font-medium"
                  >
                    Reconnect
                  </button>
                )}
                <button 
                  onClick={() => onDisconnect?.(platform)}
                  className="text-xs text-gray-600 hover:text-gray-800 font-medium"
                >
                  Disconnect
                </button>
              </div>
            </>
          ) : (
            <div className="w-full">
              <PlatformConnectButton 
                platform={platform}
                onConnect={onConnect}
                isConnecting={isLoading}
                variant="primary"
                size="sm"
                branded={false}
                fullWidth
                disabled={!hasAccess}
                tooltip={!hasAccess ? `Upgrade to ${requiredPlan} plan to connect` : undefined}
              />
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
};

// Helper function to get platform icon
const getPlatformIcon = (platform: SocialPlatform) => {
  switch (platform) {
    case 'facebook':
      return (
        <svg width="20" height="20" fill="currentColor" className="text-[#1877F2]" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      );
    case 'instagram':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="24" height="24" fill="url(#instagram-gradient)" rx="6" />
          <path d="M12 9a3 3 0 100 6 3 3 0 000-6z" fill="#fff" />
          <path fillRule="evenodd" clipRule="evenodd" d="M16 3H8a5 5 0 00-5 5v8a5 5 0 005 5h8a5 5 0 005-5V8a5 5 0 00-5-5zm-4 14a5 5 0 100-10 5 5 0 000 10zm5-12a1 1 0 100-2 1 1 0 000 2z" fill="#fff" />
          <defs>
            <linearGradient id="instagram-gradient" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
              <stop stopColor="#4361EE" />
              <stop offset=".5" stopColor="#E0437C" />
              <stop offset="1" stopColor="#FCB045" />
            </linearGradient>
          </defs>
        </svg>
      );
    case 'twitter':
      return (
        <svg width="20" height="20" fill="currentColor" className="text-[#1DA1F2]" viewBox="0 0 24 24">
          <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
        </svg>
      );
    case 'linkedin':
      return (
        <svg width="20" height="20" fill="currentColor" className="text-[#0A66C2]" viewBox="0 0 24 24">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      );
    case 'pinterest':
      return (
        <svg width="20" height="20" fill="currentColor" className="text-[#E60023]" viewBox="0 0 24 24">
          <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z" />
        </svg>
      );
    case 'youtube':
      return (
        <svg width="20" height="20" fill="currentColor" className="text-[#FF0000]" viewBox="0 0 24 24">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      );
    case 'reddit':
      return (
        <svg width="20" height="20" fill="currentColor" className="text-[#FF4500]" viewBox="0 0 24 24">
          <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .
          716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
        </svg>
      );
    case 'mastodon':
      return (
        <svg width="20" height="20" fill="currentColor" className="text-[#6364FF]" viewBox="0 0 24 24">
          <path d="M23.268 5.313c-.35-2.578-2.617-4.61-5.304-5.004C17.51.242 15.792.103 12.483.103c-3.259 0-5.042.138-5.416.206-2.687.394-4.964 2.408-5.315 4.985-.195 1.4-.195 3.108-.134 4.631.1 2.971.763 5.842 2.144 8.283 1.237 2.175 2.833 3.862 4.993 4.571 2.161.71 4.149.488 6.13-.712.913-.556 1.65-1.397 1.894-2.587.044-.21.064-.431.064-.651 0-1.915-.35-2.723-.35-2.723h-4.33c0 1.34-.787 2.109-2.383 2.109-1.645 0-2.52-1.024-2.65-3.086v-.023a52.96 52.96 0 0 1-.013-.239l-.001-.031c0-.135-.01-.853-.01-1.061h7.957c.042-.289.074-.454.103-.66.016-.11.031-.225.049-.356.072-.54.143-1.156.143-1.838-.001-1.828-.396-3.291-1.14-4.358-1.21-1.716-3.047-2.584-5.518-2.584-2.501 0-4.428.944-5.778 2.84-1.273 1.8-1.924 4.103-1.924 6.905 0 2.486.496 4.521 1.48 6.107 1.082 1.705 2.679 2.578 4.74 2.578 2.36 0 4.146-.846 5.319-2.533.07.205.15.405.245.594.514 1.021 1.408 1.85 2.692 2.426 1.427.64 2.764.859 4.371.627 1.607-.231 3.083-.866 4.19-1.623 1.595-1.09 2.769-2.389 3.56-4.026.481-.997.771-1.982.936-3.14.151-1.016.17-1.397.181-2.038v-.242c.01-.599.011-1.171-.049-2.365-.08-1.599-.321-2.798-.711-4.006zm-3.261 7.517h-8.215c.006-.203.115-3.975 2.877-3.975 2.941-.001 2.998 3.975 2.998 3.975z" />
        </svg>
      );
    case 'tiktok':
      return (
        <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
          <path d="M22.5 9.84202C20.4357 9.84696 18.4221 9.12315 16.8159 7.78358V16.7705C16.8159 20.7242 13.3466 23.9256 9.15468 23.9256C7.71732 23.9256 6.38616 23.5328 5.2623 22.8616C3.38288 21.6715 2.16135 19.6452 2.16135 17.3062C2.16135 13.3525 5.63065 10.1511 9.82253 10.1511C10.162 10.1511 10.4939 10.1861 10.8222 10.2335V10.2437C10.8222 10.2437 10.8219 10.2433 10.8213 10.2433V13.8251C10.4939 13.7258 10.162 13.6709 9.82253 13.6709C7.57528 13.6709 5.7506 15.3362 5.7506 17.3062C5.7506 18.4728 6.40504 19.4972 7.38216 20.0793C8.04139 20.4558 8.82775 20.4049 9.15468 20.4049C11.3955 20.4049 13.2266 18.7363 13.2266 16.7705V0H16.8159C16.8159 0.421471 16.8709 0.819471 16.9234 1.21747C17.1677 2.71621 17.9134 4.03636 19.0176 4.97521C19.9519 5.77081 21.1559 6.27158 22.5 6.27158V9.84202Z" />
        </svg>
      );
    default:
      return null;
  }
};

export default PlatformCard; 