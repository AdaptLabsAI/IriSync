import React, { useState } from 'react';
import { Button } from '../../ui/button';
import { Send, AlertCircle, CheckCircle, AlertTriangle, Globe } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../../ui/dialog';
import { Checkbox } from '../../ui/checkbox';
import { Badge } from '../../ui/Badge';

export interface PlatformStatus {
  /**
   * Platform identifier
   */
  id: string;
  /**
   * Platform display name
   */
  name: string;
  /**
   * Platform icon component or URL
   */
  icon?: React.ReactNode | string;
  /**
   * Whether the platform is connected
   */
  isConnected: boolean;
  /**
   * Whether the content is compatible with this platform
   */
  isCompatible: boolean;
  /**
   * Optional message about compatibility issues
   */
  compatibilityMessage?: string;
  /**
   * Whether this platform is selected for publishing
   */
  isSelected: boolean;
  /**
   * Optional account name (e.g. @username) for display
   */
  accountName?: string;
}

export interface PublishButtonProps {
  /**
   * Content data to be published
   */
  contentData: Record<string, any>;
  /**
   * Platform statuses for publishing
   */
  platforms: PlatformStatus[];
  /**
   * Function to update platform selection
   */
  onPlatformSelectionChange?: (selectedPlatformIds: string[]) => void;
  /**
   * Function to call when publishing content
   */
  onPublish: (platformIds: string[], contentData: Record<string, any>) => Promise<Record<string, { success: boolean; message?: string }>>;
  /**
   * Optional className for additional styling
   */
  className?: string;
  /**
   * Whether to disable the button
   */
  disabled?: boolean;
  /**
   * Whether to show the button in a loading state
   */
  isLoading?: boolean;
  /**
   * Optional custom label for the button
   */
  label?: string;
  /**
   * Optional tooltip
   */
  tooltip?: string;
  /**
   * Optional variant for the button
   */
  variant?: 'primary' | 'outline' | 'ghost';
  /**
   * Optional size for the button
   */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * PublishButton - Button to publish content directly to social media platforms
 */
export const PublishButton: React.FC<PublishButtonProps> = ({
  contentData,
  platforms,
  onPlatformSelectionChange,
  onPublish,
  className = '',
  disabled = false,
  isLoading = false,
  label = 'Publish Now',
  tooltip = 'Publish your content immediately',
  variant = 'default',
  size = 'sm',
}) => {
  const [open, setOpen] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(
    platforms.filter(p => p.isSelected).map(p => p.id)
  );
  const [publishStatus, setPublishStatus] = useState<Record<string, { success: boolean; message?: string }>>({});
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Count connected platforms
  const connectedPlatformsCount = platforms.filter(p => p.isConnected).length;
  
  // Handle platform selection toggle
  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms(prev => {
      const newSelection = prev.includes(platformId)
        ? prev.filter(id => id !== platformId)
        : [...prev, platformId];
      
      // Call the external handler if provided
      if (onPlatformSelectionChange) {
        onPlatformSelectionChange(newSelection);
      }
      
      return newSelection;
    });
  };
  
  // Select all compatible and connected platforms
  const selectAllPlatforms = () => {
    const allValidPlatforms = platforms
      .filter(p => p.isConnected && p.isCompatible)
      .map(p => p.id);
    
    setSelectedPlatforms(allValidPlatforms);
    
    // Call the external handler if provided
    if (onPlatformSelectionChange) {
      onPlatformSelectionChange(allValidPlatforms);
    }
  };
  
  // Clear all platform selections
  const clearPlatformSelection = () => {
    setSelectedPlatforms([]);
    
    // Call the external handler if provided
    if (onPlatformSelectionChange) {
      onPlatformSelectionChange([]);
    }
  };
  
  // Handle publish action
  const handlePublish = async () => {
    if (selectedPlatforms.length === 0) {
      setError('Please select at least one platform to publish to');
      return;
    }
    
    setIsPublishing(true);
    setError(null);
    
    try {
      const results = await onPublish(selectedPlatforms, contentData);
      setPublishStatus(results);
      
      // Check if all platforms published successfully
      const allSuccessful = Object.values(results).every(r => r.success);
      
      if (allSuccessful) {
        // Auto-close dialog after 3 seconds on success
        setTimeout(() => {
          setOpen(false);
          setPublishStatus({});
        }, 3000);
      }
    } catch (err) {
      setError('Failed to publish content. Please try again.');
      console.error('Error publishing content:', err);
    } finally {
      setIsPublishing(false);
    }
  };
  
  // Check if we're in results view (after publish attempt)
  const showResults = Object.keys(publishStatus).length > 0;
  
  // Check if at least one platform is available for publishing
  const hasPublishablePlatforms = platforms.some(p => p.isConnected && p.isCompatible);
  
  // Count successful and failed publishes
  const getPublishingResults = () => {
    const successful = Object.values(publishStatus).filter(s => s.success).length;
    const failed = Object.values(publishStatus).filter(s => !s.success).length;
    return { successful, failed };
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={`flex items-center gap-2 ${className}`}
          disabled={disabled || isLoading || !hasPublishablePlatforms}
          title={!hasPublishablePlatforms ? 'No connected platforms available' : tooltip}
        >
          {isLoading ? (
            <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {label}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {showResults ? 'Publishing Results' : 'Publish Content'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-2">
          {!hasPublishablePlatforms && (
            <div className="py-6 text-center">
              <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Platforms Available</h3>
              <p className="text-sm text-gray-500 mb-4">
                {connectedPlatformsCount === 0 
                  ? 'You need to connect at least one social media platform before publishing.' 
                  : 'Your content is not compatible with any of your connected platforms.'}
              </p>
              <Button className="mt-2">
                {connectedPlatformsCount === 0 ? 'Connect Platforms' : 'Edit Content'}
              </Button>
            </div>
          )}
          
          {hasPublishablePlatforms && !showResults && (
            <div className="space-y-4">
              <p className="text-sm">Select platforms to publish to:</p>
              
              <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                {platforms.map((platform) => {
                  const isDisabled = !platform.isConnected || !platform.isCompatible;
                  return (
                    <div 
                      key={platform.id} 
                      className={`flex items-center space-x-3 p-2 rounded-md border ${
                        isDisabled ? 'opacity-60 bg-gray-50' : 
                        selectedPlatforms.includes(platform.id) ? 'bg-primary/5 border-primary' : 'border-gray-200'
                      }`}
                    >
                      <Checkbox
                        id={`platform-${platform.id}`}
                        checked={selectedPlatforms.includes(platform.id)}
                        onCheckedChange={() => !isDisabled && togglePlatform(platform.id)}
                        disabled={isDisabled}
                      />
                      <div className="flex flex-1 items-center">
                        <div className="mr-2">
                          {typeof platform.icon === 'string' ? (
                            <img src={platform.icon} alt={platform.name} className="h-6 w-6" />
                          ) : platform.icon || (
                            <Globe className="h-6 w-6 text-gray-500" />
                          )}
                        </div>
                        <div className="flex-1">
                          <label 
                            htmlFor={`platform-${platform.id}`}
                            className="text-sm font-medium cursor-pointer"
                          >
                            {platform.name}
                          </label>
                          {platform.accountName && (
                            <p className="text-xs text-gray-500">{platform.accountName}</p>
                          )}
                        </div>
                        
                        {!platform.isConnected && (
                          <Badge variant="outline" className="ml-2 bg-gray-100">
                            Not Connected
                          </Badge>
                        )}
                        
                        {platform.isConnected && !platform.isCompatible && (
                          <Badge variant="outline" className="ml-2 bg-amber-50 text-amber-700">
                            Not Compatible
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {error && (
                <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm">
                  {error}
                </div>
              )}
              
              <div className="flex justify-between items-center text-xs">
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={selectAllPlatforms}
                >
                  Select All Compatible
                </button>
                <button
                  type="button"
                  className="text-gray-500 hover:underline"
                  onClick={clearPlatformSelection}
                >
                  Clear Selection
                </button>
              </div>
              
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="text-sm font-medium flex items-center">
                  <AlertTriangle className="h-4 w-4 text-amber-500 mr-2" />
                  Publishing will be immediate
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Content will appear on the selected platforms right away. This action cannot be undone.
                </p>
              </div>
            </div>
          )}
          
          {hasPublishablePlatforms && showResults && (
            <div className="space-y-4">
              {getPublishingResults().successful > 0 && (
                <div className="bg-[#00FF6A]/5 p-3 rounded-md">
                  <p className="text-sm font-medium flex items-center text-[#00CC44]">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Published successfully to {getPublishingResults().successful} platform(s)
                  </p>
                </div>
              )}
              
              {getPublishingResults().failed > 0 && (
                <div className="bg-red-50 p-3 rounded-md">
                  <p className="text-sm font-medium flex items-center text-red-700">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Failed to publish to {getPublishingResults().failed} platform(s)
                  </p>
                </div>
              )}
              
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {Object.entries(publishStatus).map(([platformId, status]) => {
                  const platform = platforms.find(p => p.id === platformId);
                  if (!platform) return null;
                  
                  return (
                    <div 
                      key={platformId} 
                      className={`flex items-start p-3 rounded-md ${
                        status.success ? 'bg-[#00FF6A]/5' : 'bg-red-50'
                      }`}
                    >
                      <div className="flex-shrink-0 mr-3">
                        {status.success ? (
                          <CheckCircle className="h-5 w-5 text-[#00FF6A]" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                      <div>
                        <p className={`text-sm font-medium ${
                          status.success ? 'text-[#00CC44]' : 'text-red-700'
                        }`}>
                          {platform.name}
                        </p>
                        <p className="text-xs mt-1">
                          {status.message || (status.success 
                            ? `Successfully published to ${platform.name}` 
                            : `Failed to publish to ${platform.name}`)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter>
          {!showResults ? (
            <>
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                className="mr-2"
                disabled={isPublishing}
              >
                Cancel
              </Button>
              <Button
                onClick={handlePublish}
                disabled={isPublishing || selectedPlatforms.length === 0}
              >
                {isPublishing ? (
                  <>
                    <span className="animate-spin h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Publish Now
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button onClick={() => {
              setOpen(false);
              setPublishStatus({});
            }}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PublishButton; 