import React, { useState } from 'react';
import { Button, ButtonSize } from '../../ui/button/Button';
import { Mail, MailOpen, Loader2, Check, X } from 'lucide-react';
import { Badge } from '../../ui/Badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../ui/tooltip';

export interface MarkReadButtonProps {
  /**
   * IDs of messages to mark as read/unread
   */
  messageIds: string[];
  /**
   * Current read state of the selected messages
   * - true = all messages are read
   * - false = all messages are unread
   * - 'mixed' = selection contains both read and unread messages
   */
  currentReadState: boolean | 'mixed';
  /**
   * Function to call to mark messages as read
   */
  onMarkRead: (messageIds: string[]) => Promise<{ success: boolean; message?: string }>;
  /**
   * Function to call to mark messages as unread
   */
  onMarkUnread: (messageIds: string[]) => Promise<{ success: boolean; message?: string }>;
  /**
   * Optional class name for additional styling
   */
  className?: string;
  /**
   * Button size
   */
  size?: ButtonSize;
  /**
   * Whether the button is disabled
   */
  disabled?: boolean;
  /**
   * Whether the button is in a loading state
   */
  isLoading?: boolean;
  /**
   * Whether to show just an icon
   */
  iconOnly?: boolean;
  /**
   * Whether to show success/error toast on completion
   */
  showToast?: boolean;
  /**
   * Optional callback after operation completes
   */
  onComplete?: (success: boolean, wasMarkedRead: boolean) => void;
}

/**
 * MarkReadButton - Component for marking messages as read/unread
 */
export const MarkReadButton: React.FC<MarkReadButtonProps> = ({
  messageIds,
  currentReadState,
  onMarkRead,
  onMarkUnread,
  className = '',
  size = 'sm',
  disabled = false,
  isLoading = false,
  iconOnly = false,
  showToast = false,
  onComplete,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [toastState, setToastState] = useState<{
    show: boolean;
    success: boolean;
    message: string;
  }>({
    show: false,
    success: false,
    message: '',
  });

  // Determine if we should mark as read or unread
  const shouldMarkAsRead = currentReadState === false || currentReadState === 'mixed';
  
  // Get the right button text
  const getButtonText = () => {
    if (shouldMarkAsRead) {
      return messageIds.length > 1 ? 'Mark all as read' : 'Mark as read';
    } else {
      return messageIds.length > 1 ? 'Mark all as unread' : 'Mark as unread';
    }
  };
  
  // Handle the action
  const handleAction = async () => {
    if (disabled || messageIds.length === 0 || isProcessing) return;
    
    setIsProcessing(true);
    
    try {
      const result = shouldMarkAsRead
        ? await onMarkRead(messageIds)
        : await onMarkUnread(messageIds);
      
      if (showToast) {
        const readAction = shouldMarkAsRead ? 'read' : 'unread';
        const message = result.success 
          ? `${messageIds.length} message${messageIds.length === 1 ? '' : 's'} marked as ${readAction}`
          : result.message || `Failed to mark messages as ${readAction}`;
        
        setToastState({
          show: true,
          success: result.success,
          message,
        });
        
        // Auto-hide toast after 3 seconds
        setTimeout(() => {
          setToastState(prev => ({ ...prev, show: false }));
        }, 3000);
      }
      
      if (onComplete) {
        onComplete(result.success, shouldMarkAsRead);
      }
    } catch (error) {
      console.error('Error marking messages:', error);
      
      if (showToast) {
        setToastState({
          show: true,
          success: false,
          message: 'An error occurred while updating messages',
        });
        
        // Auto-hide toast after 3 seconds
        setTimeout(() => {
          setToastState(prev => ({ ...prev, show: false }));
        }, 3000);
      }
      
      if (onComplete) {
        onComplete(false, shouldMarkAsRead);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Determine the right icon
  const Icon = shouldMarkAsRead ? MailOpen : Mail;

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size={size}
              className={`${iconOnly ? 'p-0 h-8 w-8' : ''} ${className}`}
              disabled={disabled || isLoading || isProcessing || messageIds.length === 0}
              onClick={handleAction}
              aria-label={getButtonText()}
            >
              {isLoading || isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Icon className={`h-4 w-4 ${!iconOnly ? 'mr-2' : ''}`} />
                  {!iconOnly && getButtonText()}
                </>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{getButtonText()}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      {/* Simple toast notification */}
      {toastState.show && showToast && (
        <div
          className={`fixed bottom-4 right-4 px-4 py-3 rounded-md shadow-md text-white flex items-center space-x-2 ${
            toastState.success ? 'bg-[#00CC44]' : 'bg-red-600'
          }`}
        >
          {toastState.success ? (
            <Check className="h-5 w-5" />
          ) : (
            <X className="h-5 w-5" />
          )}
          <span>{toastState.message}</span>
        </div>
      )}
    </>
  );
};

export default MarkReadButton; 