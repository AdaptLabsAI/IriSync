import React, { useState } from 'react';
import { Button, ButtonProps } from '../ui/button/Button';
import { MessageSquare, Send, X } from 'lucide-react';
import Dialog from '../ui/dialog';
import { Textarea } from '../ui/textarea/Textarea';
import { Avatar } from '../ui/Avatar';

export interface FeedbackItem {
  id: string;
  contentId: string;
  userId: string;
  userAvatar?: string;
  userName: string;
  message: string;
  timestamp: Date;
  resolved: boolean;
}

export interface FeedbackButtonProps extends Omit<ButtonProps, 'onClick'> {
  /**
   * Content ID that this feedback relates to
   */
  contentId: string;
  /**
   * Existing feedback items for this content
   */
  existingFeedback?: FeedbackItem[];
  /**
   * Callback when feedback is submitted
   */
  onSubmitFeedback?: (contentId: string, message: string) => Promise<void>;
  /**
   * Callback when a feedback item is resolved
   */
  onResolveFeedback?: (feedbackId: string) => Promise<void>;
  /**
   * Whether to show the feedback count badge
   */
  showCount?: boolean;
  /**
   * Whether to show only the icon
   */
  iconOnly?: boolean;
  /**
   * Custom user details
   */
  currentUser?: {
    id: string;
    name: string;
    avatar?: string;
  };
}

/**
 * A button for providing feedback on content.
 * This component allows team members to leave comments and suggestions on content.
 * This feature is available on all subscription tiers but requires 'team:provide_feedback' permission.
 */
const FeedbackButton: React.FC<FeedbackButtonProps> = ({
  contentId,
  existingFeedback = [],
  onSubmitFeedback,
  onResolveFeedback,
  showCount = true,
  iconOnly = false,
  currentUser,
  variant = 'outline',
  size = 'sm',
  children,
  ...buttonProps
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const unresolved = existingFeedback.filter(item => !item.resolved);
  
  const handleClick = () => {
    setIsDialogOpen(true);
  };

  const handleClose = () => {
    setIsDialogOpen(false);
    setFeedbackMessage('');
  };

  const handleSubmitFeedback = async () => {
    if (!onSubmitFeedback || !feedbackMessage.trim() || isLoading) return;
    
    setIsLoading(true);
    
    try {
      await onSubmitFeedback(contentId, feedbackMessage);
      setFeedbackMessage('');
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolveFeedback = async (feedbackId: string) => {
    if (!onResolveFeedback || isLoading) return;
    
    setIsLoading(true);
    
    try {
      await onResolveFeedback(feedbackId);
    } catch (error) {
      console.error('Error resolving feedback:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleClick}
        leftIcon={<MessageSquare className="h-4 w-4" />}
        requiredPermission="team:provide_feedback"
        {...buttonProps}
      >
        {iconOnly ? null : (
          <>
            {children || 'Feedback'}
            {showCount && unresolved.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-primary/20 text-primary text-xs rounded-full">
                {unresolved.length}
              </span>
            )}
          </>
        )}
      </Button>

      <Dialog
        open={isDialogOpen}
        onClose={handleClose}
        title="Content Feedback"
        className="max-w-md"
      >
        <div className="space-y-4">
          {existingFeedback.length > 0 ? (
            <div className="max-h-96 overflow-y-auto space-y-3 mb-4">
              {existingFeedback.map(item => (
                <div 
                  key={item.id} 
                  className={`p-3 rounded-lg border ${
                    item.resolved ? 'bg-gray-50 opacity-70' : 'bg-white'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <Avatar 
                        src={item.userAvatar} 
                        alt={item.userName} 
                        fallback={item.userName.charAt(0)} 
                        size="sm"
                      />
                      <div>
                        <div className="font-medium text-sm">{item.userName}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(item.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    
                    {!item.resolved && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleResolveFeedback(item.id)}
                        aria-label="Resolve feedback"
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  <p className={`mt-2 text-sm ${item.resolved ? 'line-through opacity-60' : ''}`}>
                    {item.message}
                  </p>
                  
                  {item.resolved && (
                    <div className="mt-1 text-xs text-green-600">Resolved</div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-3 text-center text-gray-500 text-sm">
              No feedback available for this content yet
            </div>
          )}
          
          <div className="space-y-3">
            <Textarea
              rows={3}
              placeholder="Enter your feedback..."
              value={feedbackMessage}
              onChange={(e) => setFeedbackMessage(e.target.value)}
            />
            <div className="flex justify-end">
              <Button
                variant="primary"
                size="sm"
                onClick={handleSubmitFeedback}
                disabled={!feedbackMessage.trim() || isLoading}
                leftIcon={<Send className="h-4 w-4" />}
                loading={isLoading}
              >
                Submit Feedback
              </Button>
            </div>
          </div>
        </div>
      </Dialog>
    </>
  );
};

export default FeedbackButton; 