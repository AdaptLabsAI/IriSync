import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Avatar } from '../../ui/avatar';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/button';
import { MarkReadButton } from './MarkReadButton';
import { ReplyButton } from './ReplyButton';
import { AssignMessageButton } from './AssignMessageButton';
import { Star, MoreHorizontal, MessageSquare, RefreshCw, AlertTriangle, AlertCircle, Trash2 } from 'lucide-react';
import { Card, CardBody } from '../../ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '../../ui/dropdown-menu';
import { MessageStatus } from '../../../lib/features/content/SocialInboxService';

export type MessagePriority = 'low' | 'normal' | 'high' | 'urgent';

export interface MessageAttachment {
  id: string;
  name: string;
  type: 'image' | 'video' | 'document' | 'link';
  url: string;
  thumbnailUrl?: string;
  size?: number;
}

export interface Author {
  id: string;
  name: string;
  handle?: string;
  avatarUrl?: string;
  isVerified?: boolean;
  followers?: number;
  role?: string;
}

export interface Message {
  id: string;
  content: string;
  platformId: string;
  platformName: string;
  platformIcon: string;
  platformColor: string;
  createdAt: Date | string;
  updatedAt?: Date | string;
  status: MessageStatus;
  author: Author;
  attachments?: MessageAttachment[];
  replyCount?: number;
  isPrivate?: boolean;
  parentId?: string;
  assignedTo?: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  priority?: MessagePriority;
  starred?: boolean;
  url?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  hasWarning?: boolean;
  warningMessage?: string;
}

export interface MessageCardProps {
  /**
   * Message data to display
   */
  message: Message;
  /**
   * Whether the card is selected
   */
  isSelected?: boolean;
  /**
   * Whether the card can be selected
   */
  selectable?: boolean;
  /**
   * Callback when message is selected
   */
  onSelect?: (messageId: string, selected: boolean) => void;
  /**
   * Callback when message is marked as read/unread
   */
  onMarkReadUnread?: (messageId: string, markAsRead: boolean) => Promise<{ success: boolean; message?: string }>;
  /**
   * Callback when a reply is initiated
   */
  onReply?: (messageId: string) => void;
  /**
   * Callback when message is assigned
   */
  onAssign?: (messageId: string, assigneeId: string) => Promise<{ success: boolean; message?: string }>;
  /**
   * Callback when message is unassigned
   */
  onUnassign?: (messageId: string) => Promise<{ success: boolean; message?: string }>;
  /**
   * Callback when message is starred/unstarred
   */
  onToggleStar?: (messageId: string, starred: boolean) => Promise<{ success: boolean }>;
  /**
   * Callback when message is deleted
   */
  onDelete?: (messageId: string) => Promise<{ success: boolean }>;
  /**
   * Callback when "View on platform" is clicked
   */
  onViewOnPlatform?: (messageId: string, url?: string) => void;
  /**
   * Available team members to assign to
   */
  teamMembers?: Array<{
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
    role?: string;
    status?: 'online' | 'away' | 'offline';
    currentTaskCount?: number;
  }>;
  /**
   * Optional CSS class name
   */
  className?: string;
}

/**
 * MessageCard - Component to display a social media message in the unified inbox
 */
export const MessageCard: React.FC<MessageCardProps> = ({
  message,
  isSelected = false,
  selectable = true,
  onSelect,
  onMarkReadUnread,
  onReply,
  onAssign,
  onUnassign,
  onToggleStar,
  onDelete,
  onViewOnPlatform,
  teamMembers = [],
  className = '',
}) => {
  // Format the creation date
  const formattedDate = typeof message.createdAt === 'string' 
    ? formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })
    : formatDistanceToNow(message.createdAt, { addSuffix: true });
  
  // Handle selection
  const handleSelect = () => {
    if (selectable && onSelect) {
      onSelect(message.id, !isSelected);
    }
  };
  
  // Handle marking as read/unread
  const handleMarkReadUnread = async (messageIds: string[]) => {
    if (!onMarkReadUnread) return { success: false };
    
    const isUnread = message.status === 'unread';
    return onMarkReadUnread(message.id, isUnread);
  };
  
  // Handle reply
  const handleReply = () => {
    if (onReply) {
      onReply(message.id);
    }
  };
  
  // Handle star toggle
  const handleToggleStar = async () => {
    if (onToggleStar) {
      return onToggleStar(message.id, !message.starred);
    }
    return { success: false };
  };
  
  // Handle delete
  const handleDelete = async () => {
    if (onDelete) {
      return onDelete(message.id);
    }
    return { success: false };
  };
  
  // Handle view on platform
  const handleViewOnPlatform = () => {
    if (onViewOnPlatform) {
      onViewOnPlatform(message.id, message.url);
    }
  };
  
  // Get priority badge
  const getPriorityBadge = () => {
    if (!message.priority || message.priority === 'normal') return null;
    
    const priorityMap = {
      low: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Low' },
      high: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'High' },
      urgent: { bg: 'bg-red-100', text: 'text-red-800', label: 'Urgent' }
    };
    
    const priority = priorityMap[message.priority];
    
    return (
      <Badge className={`${priority.bg} ${priority.text} ml-2`} variant="outlined">
        {priority.label}
      </Badge>
    );
  };
  
  // Get sentiment indicator
  const getSentimentIndicator = () => {
    if (!message.sentiment || message.sentiment === 'neutral') return null;
    
    const sentimentMap = {
      positive: { color: 'text-[#00CC44]', label: 'Positive Sentiment' },
      negative: { color: 'text-red-500', label: 'Negative Sentiment' }
    };
    
    const sentiment = sentimentMap[message.sentiment];
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`h-2 w-2 rounded-full ${
              message.sentiment === 'positive' ? 'bg-[#00CC44]' : 'bg-red-500'
            } ml-2`} />
          </TooltipTrigger>
          <TooltipContent>
            <p>{sentiment.label}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <Card 
      className={`
        border ${message.status === 'unread' ? 'border-blue-200 bg-blue-50' : 'border-gray-200'} 
        transition-colors hover:border-blue-300 relative
        ${isSelected ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}
        ${className}
      `}
    >
      {/* Warning banner if message has warning */}
      {message.hasWarning && (
        <div className="bg-amber-50 border-b border-amber-200 px-3 py-1.5 flex items-center text-amber-800 text-xs">
          <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
          {message.warningMessage || 'This message requires attention'}
        </div>
      )}
      
      <CardBody className="p-4">
        <div className="flex items-start gap-3">
          {/* Platform indicator */}
          <div 
            className="h-8 w-8 rounded flex items-center justify-center"
            style={{ backgroundColor: message.platformColor + '20' }} // 20% opacity
          >
            <img 
              src={message.platformIcon} 
              alt={message.platformName} 
              className="h-4 w-4" 
            />
          </div>
          
          {/* Checkbox for selection */}
          {selectable && (
            <div 
              className="mt-1.5"
              onClick={(e) => {
                e.stopPropagation();
                handleSelect();
              }}
            >
              <div 
                className={`h-4 w-4 rounded flex items-center justify-center cursor-pointer ${
                  isSelected ? 'bg-blue-500 text-white' : 'border border-gray-300'
                }`}
              >
                {isSelected && (
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    className="h-3 w-3"
                  >
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                )}
              </div>
            </div>
          )}
          
          {/* Author */}
          <div className="flex-shrink-0">
            <Avatar className="h-8 w-8">
              {message.author.avatarUrl ? (
                <img src={message.author.avatarUrl} alt={message.author.name} />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-gray-200 text-gray-600 font-medium">
                  {message.author.name.charAt(0).toUpperCase()}
                </div>
              )}
            </Avatar>
          </div>
          
          {/* Message content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center">
              <span className="font-medium text-gray-900">
                {message.author.name}
              </span>
              
              {message.author.isVerified && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <svg 
                        className="h-4 w-4 text-blue-500 ml-1" 
                        xmlns="http://www.w3.org/2000/svg" 
                        viewBox="0 0 24 24" 
                        fill="currentColor"
                      >
                        <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Verified Account</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              
              {message.author.handle && (
                <span className="text-gray-500 text-sm ml-2">
                  @{message.author.handle}
                </span>
              )}
              
              {message.isPrivate && (
                <Badge variant="outlined" className="ml-2 text-xs px-1.5 bg-gray-100">
                  Private
                </Badge>
              )}
              
              {getPriorityBadge()}
              {getSentimentIndicator()}
              
              <span className="text-gray-400 text-xs ml-auto">
                {formattedDate}
              </span>
            </div>
            
            <div className="text-gray-700 text-sm mt-1 whitespace-pre-wrap">
              {message.content}
            </div>
            
            {/* Attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {message.attachments.map(attachment => (
                  <div key={attachment.id} className="relative group">
                    {attachment.type === 'image' && (
                      <a 
                        href={attachment.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="block h-16 w-16 rounded border border-gray-200 overflow-hidden"
                      >
                        <img 
                          src={attachment.thumbnailUrl || attachment.url} 
                          alt={attachment.name}
                          className="h-full w-full object-cover"
                        />
                      </a>
                    )}
                    
                    {attachment.type === 'video' && (
                      <a 
                        href={attachment.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="block h-16 w-16 rounded border border-gray-200 overflow-hidden bg-gray-100"
                      >
                        {attachment.thumbnailUrl ? (
                          <div className="relative h-full w-full">
                            <img 
                              src={attachment.thumbnailUrl} 
                              alt={attachment.name}
                              className="h-full w-full object-cover"
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="h-8 w-8 rounded-full bg-black bg-opacity-50 flex items-center justify-center">
                                <svg className="h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <svg className="h-6 w-6 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
                              <line x1="10" y1="8" x2="14" y2="8" />
                              <line x1="12" y1="6" x2="12" y2="10" />
                              <circle cx="12" cy="14" r="4" />
                            </svg>
                          </div>
                        )}
                      </a>
                    )}
                    
                    {attachment.type === 'document' && (
                      <a 
                        href={attachment.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="block h-16 w-16 rounded border border-gray-200 overflow-hidden bg-gray-100 p-2"
                      >
                        <div className="h-full w-full flex flex-col items-center justify-center">
                          <svg className="h-6 w-6 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                            <polyline points="10 9 9 9 8 9" />
                          </svg>
                          <span className="text-xs truncate w-full text-center text-gray-500">
                            {attachment.name.split('.').pop()?.toUpperCase()}
                          </span>
                        </div>
                      </a>
                    )}
                    
                    {attachment.type === 'link' && (
                      <a 
                        href={attachment.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="inline-flex items-center px-2.5 py-1 rounded border border-gray-200 bg-gray-50 text-xs hover:bg-gray-100"
                      >
                        <svg className="h-3.5 w-3.5 text-gray-500 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                        </svg>
                        {attachment.name || 'Link'}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {/* Assignment badge */}
            {message.assignedTo && (
              <div className="mt-2 flex items-center">
                <Badge variant="outlined" className="flex items-center space-x-1 bg-blue-50 text-blue-700 border-blue-200">
                  <span>Assigned to:</span>
                  <span className="font-medium">{message.assignedTo.name}</span>
                </Badge>
              </div>
            )}
            
            {/* Meta info & actions */}
            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {/* Reply count */}
                {message.replyCount !== undefined && message.replyCount > 0 && (
                  <span className="text-xs text-gray-500 flex items-center">
                    <MessageSquare className="h-3.5 w-3.5 mr-1" />
                    {message.replyCount}
                  </span>
                )}
                
                {/* Parent indicator */}
                {message.parentId && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-xs text-gray-500 flex items-center">
                          <RefreshCw className="h-3.5 w-3.5 mr-1" />
                          Reply
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>This is a reply to another message</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              
              {/* Action buttons */}
              <div className="flex items-center space-x-1">
                {/* Mark as read/unread */}
                {onMarkReadUnread && (
                  <MarkReadButton
                    messageIds={[message.id]}
                    currentReadState={message.status !== 'unread'}
                    onMarkRead={ids => handleMarkReadUnread(ids)}
                    onMarkUnread={ids => handleMarkReadUnread(ids)}
                    iconOnly
                    size="small"
                  />
                )}
                
                {/* Reply */}
                {onReply && (
                  <ReplyButton
                    message={{
                      id: message.id,
                      content: message.content,
                      senderName: message.author.name,
                      platform: message.platformName,
                      timestamp: typeof message.createdAt === 'string' ? new Date(message.createdAt) : message.createdAt
                    }}
                    onReply={async () => {
                      handleReply();
                      return { success: true };
                    }}
                    iconOnly
                    size="small"
                  />
                )}
                
                {/* Assign message */}
                {onAssign && onUnassign && teamMembers.length > 0 && (
                  <AssignMessageButton
                    messageIds={[message.id]}
                    teamMembers={teamMembers}
                    currentAssignees={message.assignedTo ? [message.assignedTo.id] : []}
                    onAssign={(ids, assigneeId) => onAssign(message.id, assigneeId)}
                    onUnassign={ids => onUnassign(message.id)}
                    iconOnly
                    size="small"
                  />
                )}
                
                {/* Star message */}
                {onToggleStar && (
                  <Button
                    onClick={handleToggleStar}
                    size="small"
                    className="p-0 h-8 w-8"
                    aria-label={message.starred ? "Unstar message" : "Star message"}
                  >
                    <Star className={`h-4 w-4 ${message.starred ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`} />
                  </Button>
                )}
                
                {/* More actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="small"
                      className="p-0 h-8 w-8"
                      aria-label="More actions"
                    >
                      <MoreHorizontal className="h-4 w-4 text-gray-500" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {onViewOnPlatform && (
                      <DropdownMenuItem onClick={handleViewOnPlatform}>
                        View on {message.platformName}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem 
                      onClick={() => navigator.clipboard.writeText(message.content)}
                    >
                      Copy Message
                    </DropdownMenuItem>
                    {onDelete && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleDelete} className="text-red-500">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
};

export default MessageCard; 