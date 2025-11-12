import React, { useState } from 'react';
import Image from 'next/image';
import { Button, ButtonVariant, ButtonSize } from '../../ui/button/Button';
import { Filter, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover';
import { Badge } from '../../ui/Badge';
import { Separator } from '../../ui/separator';

export interface SocialPlatform {
  /**
   * Unique ID for the platform
   */
  id: string;
  /**
   * Display name of the platform
   */
  name: string;
  /**
   * Brand color of the platform
   */
  color: string;
  /**
   * Platform icon URL
   */
  iconUrl: string;
  /**
   * Number of unread messages for this platform
   */
  unreadCount?: number;
}

export interface PlatformFilterToggleProps {
  /**
   * Available platforms to filter by
   */
  platforms: SocialPlatform[];
  /**
   * Currently selected platform IDs
   */
  selectedPlatforms: string[];
  /**
   * Callback when platform selection changes
   */
  onChange: (platformIds: string[]) => void;
  /**
   * Whether to show the unread count badge
   */
  showUnreadCount?: boolean;
  /**
   * Whether the toggle is disabled
   */
  isDisabled?: boolean;
  /**
   * Button size
   */
  size?: ButtonSize;
  /**
   * Button variant
   */
  variant?: ButtonVariant;
  /**
   * Optional CSS class name
   */
  className?: string;
}

/**
 * PlatformFilterToggle - Filter messages by platform in the unified inbox
 */
export const PlatformFilterToggle: React.FC<PlatformFilterToggleProps> = ({
  platforms,
  selectedPlatforms,
  onChange,
  showUnreadCount = true,
  isDisabled = false,
  size = 'sm',
  variant = 'outline',
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  
  // Total unread count across selected platforms
  const totalUnreadCount = platforms
    .filter(p => selectedPlatforms.includes(p.id))
    .reduce((total, platform) => total + (platform.unreadCount || 0), 0);
  
  // Total unread count across all platforms
  const allUnreadCount = platforms
    .reduce((total, platform) => total + (platform.unreadCount || 0), 0);
  
  // Handle selecting all platforms
  const handleSelectAll = () => {
    onChange(platforms.map(p => p.id));
  };
  
  // Handle clearing all selections
  const handleClearAll = () => {
    onChange([]);
  };
  
  // Handle toggling a single platform
  const handleTogglePlatform = (platformId: string) => {
    const isSelected = selectedPlatforms.includes(platformId);
    
    if (isSelected) {
      onChange(selectedPlatforms.filter(id => id !== platformId));
    } else {
      onChange([...selectedPlatforms, platformId]);
    }
  };
  
  // Get summary text for the button
  const getSummaryText = () => {
    if (selectedPlatforms.length === 0) {
      return 'All Platforms';
    }
    
    if (selectedPlatforms.length === platforms.length) {
      return 'All Platforms';
    }
    
    if (selectedPlatforms.length === 1) {
      const platform = platforms.find(p => p.id === selectedPlatforms[0]);
      return platform ? platform.name : 'Platform';
    }
    
    return `${selectedPlatforms.length} Platforms`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={`flex items-center gap-2 ${className}`}
          disabled={isDisabled}
        >
          <Filter className="h-4 w-4" />
          <span className="text-sm">{getSummaryText()}</span>
          
          {showUnreadCount && selectedPlatforms.length > 0 && totalUnreadCount > 0 && (
            <Badge variant="filled" color="error" className="ml-1 h-5 min-w-5 px-1 text-xs font-medium">
              {totalUnreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-56 p-0" align="end">
        <div className="px-3 py-2 border-b">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Filter by Platform</h4>
            <div className="flex gap-2">
              <button 
                className="text-xs text-blue-600 hover:text-blue-800"
                onClick={handleSelectAll}
              >
                All
              </button>
              <button 
                className="text-xs text-gray-500 hover:text-gray-700"
                onClick={handleClearAll}
              >
                Clear
              </button>
            </div>
          </div>
        </div>
        
        <div className="max-h-60 overflow-y-auto py-1">
          {platforms.map(platform => (
            <div 
              key={platform.id}
              onClick={() => handleTogglePlatform(platform.id)}
              className="px-3 py-1.5 flex items-center hover:bg-gray-50 cursor-pointer"
            >
              <div className="flex items-center flex-1">
                <div 
                  className="h-6 w-6 rounded mr-2 flex items-center justify-center"
                  style={{ backgroundColor: platform.color + '20' }} // 20% opacity
                >
                  <Image 
                    src={platform.iconUrl} 
                    alt={platform.name} 
                    className="h-4 w-4" 
                    width={24}
                    height={24}
                  />
                </div>
                
                <span className="text-sm font-medium">{platform.name}</span>
                
                {showUnreadCount && platform.unreadCount !== undefined && platform.unreadCount > 0 && (
                  <Badge 
                    variant="filled" 
                    color="error"
                    className="ml-2 h-5 min-w-5 px-1 text-xs font-medium"
                  >
                    {platform.unreadCount}
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center">
                <div 
                  className={`h-4 w-4 rounded-sm flex items-center justify-center ${
                    selectedPlatforms.includes(platform.id) 
                      ? 'bg-blue-600 text-white' 
                      : 'border border-gray-300'
                  }`}
                >
                  {selectedPlatforms.includes(platform.id) && (
                    <Check className="h-3 w-3" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <Separator />
        
        <div className="p-2 text-xs text-gray-500 flex justify-between items-center">
          <span>
            {showUnreadCount && (
              <span>
                {allUnreadCount} unread message{allUnreadCount !== 1 ? 's' : ''}
              </span>
            )}
          </span>
          <button 
            className="text-blue-600 hover:text-blue-800"
            onClick={() => setOpen(false)}
          >
            Done
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default PlatformFilterToggle; 