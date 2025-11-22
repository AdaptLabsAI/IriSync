import React, { useState } from 'react';
import { Button, ButtonVariant, ButtonSize } from '../../ui/button';
import { Reply, Loader2, X, Send, FileImage, Smile, PaperclipIcon, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../../ui/dialog';
import { Textarea } from '../../ui/textarea';
import { Avatar } from '../../ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover';

export interface MessageInfo {
  /**
   * Message ID
   */
  id: string;
  /**
   * Sender name
   */
  senderName: string;
  /**
   * Sender avatar URL
   */
  senderAvatarUrl?: string;
  /**
   * Message content
   */
  content: string;
  /**
   * Message platform
   */
  platform: string;
  /**
   * Platform icon element
   */
  platformIcon?: React.ReactNode;
  /**
   * Original message timestamp
   */
  timestamp: Date;
}

export interface ResponseTemplate {
  /**
   * Template ID
   */
  id: string;
  /**
   * Template name
   */
  name: string;
  /**
   * Template content
   */
  content: string;
  /**
   * Categories this template belongs to
   */
  categories?: string[];
}

export interface ReplyButtonProps {
  /**
   * Message to reply to
   */
  message: MessageInfo;
  /**
   * Function to call when a reply is submitted
   */
  onReply: (messageId: string, replyContent: string, attachments?: File[]) => Promise<{ success: boolean; message?: string }>;
  /**
   * Optional saved response templates
   */
  responseTemplates?: ResponseTemplate[];
  /**
   * Optional maximum character limit for the reply
   */
  characterLimit?: number;
  /**
   * Whether image attachments are allowed
   */
  allowAttachments?: boolean;
  /**
   * Optional class name for additional styling
   */
  className?: string;
  /**
   * Whether the button is disabled
   */
  disabled?: boolean;
  /**
   * Whether the button is in a loading state
   */
  isLoading?: boolean;
  /**
   * Button size
   */
  size?: ButtonSize;
  /**
   * Button variant
   */
  variant?: ButtonVariant;
  /**
   * Whether to show just an icon
   */
  iconOnly?: boolean;
}

/**
 * ReplyButton - Button for replying to messages in the unified inbox
 */
export const ReplyButton: React.FC<ReplyButtonProps> = ({
  message,
  onReply,
  responseTemplates = [],
  characterLimit = 2000,
  allowAttachments = true,
  className = '',
  disabled = false,
  isLoading = false,
  size = 'sm',
  variant = 'outline',
  iconOnly = false,
}) => {
  const [open, setOpen] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message?: string } | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  
  // Character count
  const charactersRemaining = characterLimit - replyContent.length;
  const isOverLimit = charactersRemaining < 0;
  
  // Handle submitting the reply
  const handleSubmitReply = async () => {
    if (isOverLimit || !replyContent.trim()) return;
    
    setIsSending(true);
    setResult(null);
    
    try {
      const result = await onReply(message.id, replyContent, attachments.length > 0 ? attachments : undefined);
      setResult(result);
      
      if (result.success) {
        // Auto-close on success after a brief delay
        setTimeout(() => {
          setOpen(false);
          setReplyContent('');
          setAttachments([]);
          setResult(null);
        }, 1500);
      }
    } catch (error) {
      setResult({
        success: false,
        message: 'An error occurred while sending your reply. Please try again.'
      });
      console.error('Error sending reply:', error);
    } finally {
      setIsSending(false);
    }
  };
  
  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const newFiles = Array.from(event.target.files);
      setAttachments(prev => [...prev, ...newFiles]);
    }
  };
  
  // Remove an attachment
  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };
  
  // Apply a response template
  const applyTemplate = (template: ResponseTemplate) => {
    setReplyContent(template.content);
    setShowTemplates(false);
  };
  
  // Format the timestamp
  const formatTimestamp = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    }).format(date);
  };

  return (
    <Dialog isOpen={open} onClose={() => setOpen(false)}>
      <Button
        variant={variant === 'primary' ? 'primary' : variant === 'ghost' ? 'ghost' : 'outline'}
        size={size}
        className={`${iconOnly ? 'p-0 h-8 w-8' : ''} ${className}`}
        disabled={disabled || isLoading}
        onClick={() => setOpen(true)}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Reply className="h-4 w-4" />
        )}
        {!iconOnly && <span className="ml-2">Reply</span>}
      </Button>
      
      <div className="sm:max-w-lg">
        <div>
          <h3 className="text-lg font-medium">Reply to Message</h3>
        </div>
        
        <div className="py-4">
          {/* Original message preview */}
          <div className="mb-4 p-3 bg-gray-50 rounded-md border-l-4 border-gray-300">
            <div className="flex items-start gap-3">
              <Avatar 
                src={message.senderAvatarUrl} 
                alt={message.senderName}
                className="h-8 w-8"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{message.senderName}</span>
                  {message.platformIcon}
                  <span className="text-xs text-gray-500">{formatTimestamp(message.timestamp)}</span>
                </div>
                <p className="text-sm text-gray-700 line-clamp-3">{message.content}</p>
              </div>
            </div>
          </div>
          
          {/* Reply composition */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Your Reply</label>
              <div className="flex items-center gap-2">
                {responseTemplates.length > 0 && (
                  <Popover open={showTemplates} onOpenChange={setShowTemplates}>
                    <button
                      type="button"
                      className="p-1 text-gray-400 hover:text-gray-600 rounded"
                      title="Response templates"
                      onClick={() => setShowTemplates(true)}
                    >
                      <FileText className="h-4 w-4 text-gray-500" />
                    </button>
                    
                    <div className="w-64 p-0">
                      <div className="px-3 py-2 border-b">
                        <h4 className="font-medium text-sm">Response Templates</h4>
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {responseTemplates.map(template => (
                          <button
                            key={template.id}
                            onClick={() => applyTemplate(template)}
                            className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                          >
                            <div className="font-medium text-sm">{template.name}</div>
                            <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                              {template.content}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </Popover>
                )}
                
                {allowAttachments && (
                  <label className="p-1 text-gray-400 hover:text-gray-600 rounded cursor-pointer">
                    <PaperclipIcon className="h-4 w-4" />
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
            
            <Textarea
              value={replyContent}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReplyContent(e.target.value)}
              placeholder="Write your reply..."
              rows={4}
              className="w-full"
            />
            
            <div className="flex items-center justify-between text-xs">
              <span className={`${isOverLimit ? 'text-red-600' : 'text-gray-500'}`}>
                {charactersRemaining} characters remaining
              </span>
            </div>
            
            {/* Attachments preview */}
            {attachments.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Attachments</label>
                <div className="space-y-1">
                  {attachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center gap-2">
                        <FileImage className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{file.name}</span>
                        <span className="text-xs text-gray-500">
                          ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <button
                        onClick={() => removeAttachment(index)}
                        className="p-1 text-gray-400 hover:text-red-600 rounded"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Result message */}
            {result && (
              <div className={`p-3 rounded-md ${result.success ? 'bg-[#00FF6A]/5 text-[#00CC44]' : 'bg-red-50 text-red-700'}`}>
                <p className="text-sm">
                  {result.success ? 'Reply sent successfully!' : result.message}
                </p>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={isSending}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={isSending || isOverLimit || !replyContent.trim()}
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Reply
              </>
            )}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

export default ReplyButton; 