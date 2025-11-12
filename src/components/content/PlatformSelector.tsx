import React from 'react';
import { SocialPlatform } from '../platform/PlatformConnectButton';
import { ConnectionStatus } from '../platform/ConnectionStatusBadge';

export interface PlatformConfig {
  id: SocialPlatform;
  name: string;
  status: ConnectionStatus;
  isSelected?: boolean;
  hasAccess?: boolean;
  requiredPlan?: 'creator' | 'influencer' | 'enterprise';
}

export interface PlatformSelectorProps {
  /**
   * Available platforms to choose from
   */
  platforms: PlatformConfig[];
  /**
   * Currently selected platforms
   */
  selectedPlatforms: SocialPlatform[];
  /**
   * Function to call when selection changes
   */
  onChange: (platforms: SocialPlatform[]) => void;
  /**
   * Display style
   */
  displayStyle?: 'icon' | 'button' | 'chip';
  /**
   * Label text
   */
  label?: string;
  /**
   * Helper text
   */
  helperText?: string;
  /**
   * Error message
   */
  error?: string;
  /**
   * Whether the component is in a loading state
   */
  isLoading?: boolean;
  /**
   * Whether the component is disabled
   */
  disabled?: boolean;
  /**
   * Maximum number of platforms that can be selected
   */
  maxSelections?: number;
  /**
   * Whether to automatically redirect to connect page if no platforms connected
   */
  redirectIfNoneConnected?: boolean;
  /**
   * Additional class names
   */
  className?: string;
  /**
   * Class to apply to selected items
   */
  selectedClassName?: string;
  /**
   * Class to apply to disabled items
   */
  disabledClassName?: string;
}

/**
 * PlatformSelector component for selecting social platforms to post to
 */
export const PlatformSelector: React.FC<PlatformSelectorProps> = ({
  platforms,
  selectedPlatforms,
  onChange,
  displayStyle = 'button',
  label = 'Post to',
  helperText,
  error,
  isLoading = false,
  disabled = false,
  maxSelections,
  className = '',
  selectedClassName = '',
  disabledClassName = '',
}) => {
  // Handle platform selection change
  const handleTogglePlatform = (platform: SocialPlatform) => {
    if (disabled || isLoading) return;

    let newSelected: SocialPlatform[];
    
    if (selectedPlatforms.includes(platform)) {
      // Remove platform if already selected
      newSelected = selectedPlatforms.filter(p => p !== platform);
    } else {
      // Add platform if not at max selections
      if (maxSelections && selectedPlatforms.length >= maxSelections) {
        // If at max, replace the last one
        newSelected = [...selectedPlatforms.slice(0, -1), platform];
      } else {
        // Otherwise just add
        newSelected = [...selectedPlatforms, platform];
      }
    }
    
    onChange(newSelected);
  };

  // Check if platform is selectable
  const isPlatformSelectable = (platform: PlatformConfig) => {
    return platform.status === 'connected' && platform.hasAccess !== false;
  };

  // Count connected platforms
  const connectedCount = platforms.filter(p => p.status === 'connected').length;
  const hasConnectedPlatforms = connectedCount > 0;

  // Render icon-only selector
  const renderIconSelector = () => (
    <div className="flex flex-wrap gap-2">
      {platforms.map(platform => {
        const isSelected = selectedPlatforms.includes(platform.id);
        const isSelectable = isPlatformSelectable(platform);
        
        return (
          <button
            key={platform.id}
            type="button"
            onClick={() => isSelectable && handleTogglePlatform(platform.id)}
            disabled={!isSelectable || disabled || isLoading}
            className={`
              w-10 h-10 flex items-center justify-center rounded-full
              ${isSelectable ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}
              ${isSelected 
                ? `ring-2 ring-offset-2 ring-primary bg-primary bg-opacity-10 ${selectedClassName}` 
                : 'bg-gray-100 hover:bg-gray-200'}
              ${!isSelectable ? disabledClassName : ''}
              transition-all duration-200
            `}
            title={
              !platform.hasAccess 
                ? `Requires ${platform.requiredPlan} plan` 
                : platform.status !== 'connected' 
                  ? 'Not connected' 
                  : platform.name
            }
          >
            {getPlatformIcon(platform.id)}
          </button>
        );
      })}
    </div>
  );

  // Render button-style selector
  const renderButtonSelector = () => (
    <div className="flex flex-wrap gap-2">
      {platforms.map(platform => {
        const isSelected = selectedPlatforms.includes(platform.id);
        const isSelectable = isPlatformSelectable(platform);
        
        return (
          <button
            key={platform.id}
            type="button"
            onClick={() => isSelectable && handleTogglePlatform(platform.id)}
            disabled={!isSelectable || disabled || isLoading}
            className={`
              px-3 py-2 rounded-md text-sm font-medium flex items-center
              ${isSelectable ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}
              ${isSelected 
                ? `bg-primary text-white ${selectedClassName}` 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
              ${!isSelectable ? disabledClassName : ''}
              transition-all duration-200
            `}
          >
            <span className="mr-2">{getPlatformIcon(platform.id)}</span>
            {platform.name}
          </button>
        );
      })}
    </div>
  );

  // Render chip-style selector
  const renderChipSelector = () => (
    <div className="flex flex-wrap gap-2">
      {platforms.map(platform => {
        const isSelected = selectedPlatforms.includes(platform.id);
        const isSelectable = isPlatformSelectable(platform);
        
        return (
          <button
            key={platform.id}
            type="button"
            onClick={() => isSelectable && handleTogglePlatform(platform.id)}
            disabled={!isSelectable || disabled || isLoading}
            className={`
              px-3 py-1 rounded-full text-xs font-medium flex items-center
              ${isSelectable ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}
              ${isSelected 
                ? `bg-primary text-white ${selectedClassName}` 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
              ${!isSelectable ? disabledClassName : ''}
              transition-all duration-200
            `}
          >
            <span className="mr-1.5">{getPlatformIcon(platform.id)}</span>
            {platform.name}
          </button>
        );
      })}
    </div>
  );

  // Get appropriate renderer based on display style
  const getSelector = () => {
    switch (displayStyle) {
      case 'icon':
        return renderIconSelector();
      case 'button':
        return renderButtonSelector();
      case 'chip':
        return renderChipSelector();
      default:
        return renderButtonSelector();
    }
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      
      {!hasConnectedPlatforms ? (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-800">
          No connected platforms. Please connect platforms in the settings.
        </div>
      ) : (
        <>
          {getSelector()}
          
          {helperText && !error && (
            <p className="mt-1 text-xs text-gray-500">{helperText}</p>
          )}
          
          {error && (
            <p className="mt-1 text-xs text-red-600">{error}</p>
          )}
          
          {maxSelections && (
            <p className="mt-1 text-xs text-gray-500">
              {selectedPlatforms.length}/{maxSelections} selected
            </p>
          )}
        </>
      )}
    </div>
  );
};

// Helper function to get platform icon
const getPlatformIcon = (platform: SocialPlatform) => {
  switch (platform) {
    case 'facebook':
      return (
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      );
    case 'instagram':
      return (
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z" />
        </svg>
      );
    case 'twitter':
      return (
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
          <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
        </svg>
      );
    case 'linkedin':
      return (
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      );
    case 'pinterest':
      return (
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z" />
        </svg>
      );
    case 'youtube':
      return (
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      );
    case 'reddit':
      return (
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
        </svg>
      );
    case 'mastodon':
      return (
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
          <path d="M23.268 5.313c-.35-2.578-2.617-4.61-5.304-5.004C17.51.242 15.792.103 12.483.103c-3.259 0-5.042.138-5.416.206-2.687.394-4.964 2.408-5.315 4.985-.195 1.4-.195 3.108-.134 4.631.1 2.971.763 5.842 2.144 8.283 1.237 2.175 2.833 3.862 4.993 4.571 2.161.71 4.149.488 6.13-.712.913-.556 1.65-1.397 1.894-2.587.044-.21.064-.431.064-.651 0-1.915-.35-2.723-.35-2.723h-4.33c0 1.34-.787 2.109-2.383 2.109-1.645 0-2.52-1.024-2.65-3.086v-.023a52.96 52.96 0 0 1-.013-.239l-.001-.031c0-.135-.01-.853-.01-1.061h7.957c.042-.289.074-.454.103-.66.016-.11.031-.225.049-.356.072-.54.143-1.156.143-1.838-.001-1.828-.396-3.291-1.14-4.358-1.21-1.716-3.047-2.584-5.518-2.584-2.501 0-4.428.944-5.778 2.84-1.273 1.8-1.924 4.103-1.924 6.905 0 2.486.496 4.521 1.48 6.107 1.082 1.705 2.679 2.578 4.74 2.578 2.36 0 4.146-.846 5.319-2.533.07.205.15.405.245.594.514 1.021 1.408 1.85 2.692 2.426 1.427.64 2.764.859 4.371.627 1.607-.231 3.083-.866 4.19-1.623 1.595-1.09 2.769-2.389 3.56-4.026.481-.997.771-1.982.936-3.14.151-1.016.17-1.397.181-2.038v-.242c.01-.599.011-1.171-.049-2.365-.08-1.599-.321-2.798-.711-4.006zm-3.261 7.517h-8.215c.006-.203.115-3.975 2.877-3.975 2.941-.001 2.998 3.975 2.998 3.975z" />
        </svg>
      );
    case 'tiktok':
      return (
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
          <path d="M22.5 9.84202C20.4357 9.84696 18.4221 9.12315 16.8159 7.78358V16.7705C16.8159 20.7242 13.3466 23.9256 9.15468 23.9256C7.71732 23.9256 6.38616 23.5328 5.2623 22.8616C3.38288 21.6715 2.16135 19.6452 2.16135 17.3062C2.16135 13.3525 5.63065 10.1511 9.82253 10.1511C10.162 10.1511 10.4939 10.1861 10.8222 10.2335V10.2437C10.8222 10.2437 10.8219 10.2433 10.8213 10.2433V13.8251C10.4939 13.7258 10.162 13.6709 9.82253 13.6709C7.57528 13.6709 5.7506 15.3362 5.7506 17.3062C5.7506 18.4728 6.40504 19.4972 7.38216 20.0793C8.04139 20.4558 8.82775 20.4049 9.15468 20.4049C11.3955 20.4049 13.2266 18.7363 13.2266 16.7705V0H16.8159C16.8159 0.421471 16.8709 0.819471 16.9234 1.21747C17.1677 2.71621 17.9134 4.03636 19.0176 4.97521C19.9519 5.77081 21.1559 6.27158 22.5 6.27158V9.84202Z" />
        </svg>
      );
    default:
      return null;
  }
};

export default PlatformSelector; 