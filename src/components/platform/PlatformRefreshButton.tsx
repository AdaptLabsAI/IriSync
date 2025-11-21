import React, { useState } from 'react';
import { Button } from '../ui/button';
import { RefreshCw, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { useToast } from '../ui/use-toast';

export interface PlatformRefreshButtonProps {
  /**
   * Platform ID to refresh
   */
  platformId: string;
  /**
   * Platform name for display
   */
  platformName: string;
  /**
   * Function to call when platform connection is refreshed
   */
  onRefresh: (platformId: string) => Promise<{ success: boolean; message?: string }>;
  /**
   * Optional timestamp of when the token will expire
   */
  tokenExpiresAt?: Date | string | number;
  /**
   * Whether the button is disabled
   */
  isDisabled?: boolean;
  /**
   * Button size
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Button variant
   */
  variant?: 'default' | 'outline' | 'ghost';
  /**
   * Whether to show only an icon
   */
  iconOnly?: boolean;
  /**
   * Whether to show a toast notification when complete
   */
  showToast?: boolean;
  /**
   * Optional class name for additional styling
   */
  className?: string;
  /**
   * Optional callback when refresh completes
   */
  onComplete?: (success: boolean) => void;
}

/**
 * PlatformRefreshButton - Button for refreshing platform connection tokens
 */
export const PlatformRefreshButton: React.FC<PlatformRefreshButtonProps> = ({
  platformId,
  platformName,
  onRefresh,
  tokenExpiresAt,
  isDisabled = false,
  size = 'sm',
  variant = 'outline',
  iconOnly = false,
  showToast = true,
  className = '',
  onComplete,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshState, setRefreshState] = useState<'idle' | 'success' | 'error'>('idle');
  const { toast } = useToast();

  // Format the expiry date if provided
  const formattedExpiryDate = tokenExpiresAt
    ? new Date(tokenExpiresAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  // Check if token is expiring soon (within 3 days)
  const isExpiringSoon = () => {
    if (!tokenExpiresAt) return false;
    
    const expiryTime = new Date(tokenExpiresAt).getTime();
    const now = Date.now();
    const threeDays = 3 * 24 * 60 * 60 * 1000; // 3 days in milliseconds
    
    return expiryTime - now < threeDays && expiryTime > now;
  };

  // Check if token is expired
  const isExpired = () => {
    if (!tokenExpiresAt) return false;
    
    const expiryTime = new Date(tokenExpiresAt).getTime();
    const now = Date.now();
    
    return expiryTime <= now;
  };

  // Handle the refresh action
  const handleRefresh = async () => {
    if (isDisabled || isRefreshing) return;
    
    setIsRefreshing(true);
    setRefreshState('idle');
    
    try {
      const result = await onRefresh(platformId);
      
      setRefreshState(result.success ? 'success' : 'error');
      
      if (showToast) {
        toast({
          title: result.success ? 'Connection Refreshed' : 'Refresh Failed',
          description: result.message || (result.success 
            ? `Successfully refreshed ${platformName} connection.` 
            : `Failed to refresh ${platformName} connection.`),
          variant: result.success ? 'default' : 'destructive',
        });
      }
      
      if (onComplete) {
        onComplete(result.success);
      }
      
      // Reset the state after a delay
      setTimeout(() => {
        setRefreshState('idle');
      }, 3000);
    } catch (error) {
      console.error('Error refreshing platform connection:', error);
      
      setRefreshState('error');
      
      if (showToast) {
        toast({
          title: 'Refresh Failed',
          description: `An unexpected error occurred while refreshing ${platformName} connection.`,
          variant: 'destructive',
        });
      }
      
      if (onComplete) {
        onComplete(false);
      }
      
      // Reset the state after a delay
      setTimeout(() => {
        setRefreshState('idle');
      }, 3000);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Get the appropriate button color based on token expiry
  const getButtonClassNames = () => {
    if (isExpired()) {
      return 'text-red-600 hover:text-red-700 border-red-200 hover:border-red-300 hover:bg-red-50';
    }
    
    if (isExpiringSoon()) {
      return 'text-amber-600 hover:text-amber-700 border-amber-200 hover:border-amber-300 hover:bg-amber-50';
    }
    
    return '';
  };

  // Render the button
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={handleRefresh}
            disabled={isDisabled || isRefreshing}
            variant={variant}
            size={size}
            className={`${iconOnly ? 'p-0 h-8 w-8' : ''} ${getButtonClassNames()} ${className}`}
            aria-label={`Refresh ${platformName} connection`}
          >
            {isRefreshing ? (
              <Loader2 className={`h-4 w-4 animate-spin ${!iconOnly ? 'mr-2' : ''}`} />
            ) : refreshState === 'success' ? (
              <CheckCircle className={`h-4 w-4 text-[#00CC44] ${!iconOnly ? 'mr-2' : ''}`} />
            ) : refreshState === 'error' ? (
              <AlertCircle className={`h-4 w-4 text-red-500 ${!iconOnly ? 'mr-2' : ''}`} />
            ) : (
              <RefreshCw className={`h-4 w-4 ${!iconOnly ? 'mr-2' : ''}`} />
            )}
            {!iconOnly && 'Refresh'}
            {!iconOnly && isExpired() && ' (Expired)'}
            {!iconOnly && isExpiringSoon() && !isExpired() && ' (Expiring Soon)'}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {isExpired() ? (
            <p>Connection expired on {formattedExpiryDate}. Click to refresh.</p>
          ) : isExpiringSoon() ? (
            <p>Connection expires on {formattedExpiryDate}. Click to refresh.</p>
          ) : formattedExpiryDate ? (
            <p>Connection valid until {formattedExpiryDate}.</p>
          ) : (
            <p>Refresh {platformName} connection</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default PlatformRefreshButton; 