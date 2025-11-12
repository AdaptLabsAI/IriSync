import React, { useState } from 'react';
import { Button } from '../../ui/button';
import { Unlink, Loader2, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog';

export interface PlatformDisconnectButtonProps {
  /**
   * Platform ID to disconnect
   */
  platformId: string;
  /**
   * Platform name for display
   */
  platformName: string;
  /**
   * Platform icon URL
   */
  platformIcon?: string;
  /**
   * Platform color
   */
  platformColor?: string;
  /**
   * Function to call when platform is disconnected
   */
  onDisconnect: (platformId: string) => Promise<{ success: boolean; message?: string }>;
  /**
   * Additional information to display in confirmation dialog
   */
  warningText?: string;
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
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  /**
   * Whether to show only an icon
   */
  iconOnly?: boolean;
  /**
   * Optional class name for additional styling
   */
  className?: string;
  /**
   * Optional callback when disconnection completes
   */
  onComplete?: (success: boolean) => void;
}

/**
 * PlatformDisconnectButton - Button for disconnecting social media platform accounts
 */
export const PlatformDisconnectButton: React.FC<PlatformDisconnectButtonProps> = ({
  platformId,
  platformName,
  platformIcon,
  platformColor,
  onDisconnect,
  warningText,
  isDisabled = false,
  size = 'sm',
  variant = 'outline',
  iconOnly = false,
  className = '',
  onComplete,
}) => {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message?: string;
  } | null>(null);

  // Handle opening confirmation dialog
  const handleOpenConfirm = () => {
    if (isDisabled) return;
    setIsConfirmOpen(true);
    setResult(null);
  };

  // Handle closing confirmation dialog
  const handleCloseConfirm = () => {
    if (isDisconnecting) return;
    setIsConfirmOpen(false);
  };

  // Handle disconnection
  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    setResult(null);

    try {
      const result = await onDisconnect(platformId);
      setResult(result);

      if (result.success) {
        // Auto-close after success, with a short delay
        setTimeout(() => {
          setIsConfirmOpen(false);
          if (onComplete) onComplete(true);
        }, 1500);
      } else {
        // Just set the result, but don't close
        if (onComplete) onComplete(false);
      }
    } catch (error) {
      console.error('Error disconnecting platform:', error);
      setResult({
        success: false,
        message: 'An unexpected error occurred while disconnecting.',
      });
      if (onComplete) onComplete(false);
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <>
      <Button
        onClick={handleOpenConfirm}
        disabled={isDisabled}
        variant={variant}
        size={size}
        className={`${iconOnly ? 'p-0 h-8 w-8' : ''} ${className}`}
        aria-label={`Disconnect ${platformName}`}
      >
        <Unlink className={`h-4 w-4 ${!iconOnly ? 'mr-2' : ''}`} />
        {!iconOnly && 'Disconnect'}
      </Button>

      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              {platformIcon && (
                <div 
                  className="h-6 w-6 rounded mr-2 flex items-center justify-center"
                  style={{ backgroundColor: platformColor ? platformColor + '20' : 'rgba(0,0,0,0.1)' }}
                >
                  <img src={platformIcon} alt={platformName} className="h-4 w-4" />
                </div>
              )}
              Disconnect {platformName}
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to disconnect your {platformName} account?
            </DialogDescription>
          </DialogHeader>

          {warningText && (
            <div className="flex p-3 bg-amber-50 text-amber-800 rounded-md text-sm">
              <AlertTriangle className="h-5 w-5 flex-shrink-0 mr-2" />
              <p>{warningText}</p>
            </div>
          )}

          {result && (
            <div className={`p-3 rounded-md text-sm ${result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
              {result.message || (result.success ? 'Successfully disconnected.' : 'Failed to disconnect.')}
            </div>
          )}

          <DialogFooter className="flex space-x-2 justify-end">
            <Button
              variant="outline"
              onClick={handleCloseConfirm}
              disabled={isDisconnecting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisconnect}
              disabled={isDisconnecting}
            >
              {isDisconnecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Disconnecting...
                </>
              ) : (
                'Disconnect'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PlatformDisconnectButton; 