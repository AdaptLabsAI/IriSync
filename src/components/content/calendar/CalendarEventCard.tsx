import React, { useState } from 'react';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button/Button';

export interface CalendarEventCardProps {
  /**
   * Unique identifier for the event
   */
  id: string;
  /**
   * Title of the event/content
   */
  title: string;
  /**
   * Event description or content preview
   */
  description?: string;
  /**
   * Event start date and time
   */
  startTime: Date;
  /**
   * Event end date and time
   */
  endTime?: Date;
  /**
   * Platforms the content is scheduled for
   */
  platforms: string[];
  /**
   * Content status
   */
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  /**
   * Author/creator of the content
   */
  author?: string;
  /**
   * URL to the author's avatar
   */
  authorAvatar?: string;
  /**
   * Content type (post, video, story, etc.)
   */
  contentType?: string;
  /**
   * URL to content media (thumbnail)
   */
  mediaUrl?: string;
  /**
   * Color class for the event card
   */
  colorClass?: string;
  /**
   * Whether the event needs approval
   */
  needsApproval?: boolean;
  /**
   * Tags associated with the event
   */
  tags?: string[];
  /**
   * Engagement statistics for published content
   */
  stats?: {
    likes?: number;
    comments?: number;
    shares?: number;
    views?: number;
  };
  /**
   * Callback for when edit button is clicked
   */
  onEdit?: (id: string) => void;
  /**
   * Callback for when delete button is clicked
   */
  onDelete?: (id: string) => void;
  /**
   * Callback for when reschedule button is clicked
   */
  onReschedule?: (id: string) => void;
  /**
   * Callback for when card is clicked
   */
  onClick?: (id: string) => void;
  /**
   * Callback for when duplicate button is clicked
   */
  onDuplicate?: (id: string) => void;
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Whether the card is selected
   */
  isSelected?: boolean;
  /**
   * Whether detailed view is enabled
   */
  detailed?: boolean;
  /**
   * The minimum subscription tier required to access features
   */
  featureTier?: 'creator' | 'influencer' | 'enterprise';
  /**
   * User's current subscription tier
   */
  userTier?: 'creator' | 'influencer' | 'enterprise';
}

/**
 * CalendarEventCard component for displaying calendar events with details
 */
const CalendarEventCard: React.FC<CalendarEventCardProps> = ({
  id,
  title,
  description,
  startTime,
  endTime,
  platforms,
  status,
  author,
  authorAvatar,
  contentType,
  mediaUrl,
  colorClass = 'bg-blue-50 border-blue-200',
  needsApproval = false,
  tags = [],
  stats,
  onEdit,
  onDelete,
  onReschedule,
  onClick,
  onDuplicate,
  className = '',
  isSelected = false,
  detailed = false,
  featureTier = 'creator',
  userTier = 'creator',
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  
  // Check if user has access to feature based on their subscription tier
  const hasAccess = () => {
    const tierLevels = {
      'creator': 1,
      'influencer': 2,
      'enterprise': 3
    };
    
    return tierLevels[userTier] >= tierLevels[featureTier];
  };

  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Format time for display
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Handle card click
  const handleCardClick = () => {
    if (onClick) onClick(id);
  };

  // Handle edit click
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) onEdit(id);
    setMenuOpen(false);
  };

  // Handle delete click
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirmDelete) {
      if (onDelete) onDelete(id);
      setConfirmDelete(false);
    } else {
      setConfirmDelete(true);
    }
    setMenuOpen(false);
  };

  // Handle reschedule click
  const handleReschedule = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onReschedule) onReschedule(id);
    setMenuOpen(false);
  };

  // Handle duplicate click
  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDuplicate) onDuplicate(id);
    setMenuOpen(false);
  };

  // Toggle menu open/closed
  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(!menuOpen);
  };

  // Cancel delete confirmation
  const cancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDelete(false);
  };

  // Get status badge
  const getStatusBadge = () => {
    switch (status) {
      case 'draft':
        return (
          <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full">
            Draft
          </span>
        );
      case 'scheduled':
        return (
          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
            Scheduled
          </span>
        );
      case 'published':
        return (
          <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
            Published
          </span>
        );
      case 'failed':
        return (
          <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
            Failed
          </span>
        );
    }
  };

  // Get content type icon
  const getContentTypeIcon = () => {
    switch (contentType?.toLowerCase()) {
      case 'video':
        return <VideoIcon />;
      case 'image':
        return <ImageIcon />;
      case 'carousel':
        return <CarouselIcon />;
      case 'story':
        return <StoryIcon />;
      case 'text':
      default:
        return <TextIcon />;
    }
  };

  return (
    <Card
      className={`
        overflow-hidden cursor-pointer transition-all
        ${colorClass}
        ${isSelected ? 'ring-2 ring-primary-500' : ''}
        ${className}
      `}
      onClick={handleCardClick}
    >
      <div className="p-4">
        {/* Header with status and actions */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center">
            {getStatusBadge()}
            {needsApproval && (
              <span className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full ml-2">
                Needs Approval
              </span>
            )}
          </div>
          
          <div className="relative">
            <button
              onClick={toggleMenu}
              className="p-1 rounded-full hover:bg-gray-200"
              aria-label="Event options"
            >
              <MoreIcon className="w-5 h-5 text-gray-600" />
            </button>
            
            {menuOpen && (
              <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg z-10 py-1">
                <button
                  onClick={handleEdit}
                  className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  disabled={!hasAccess()}
                >
                  <EditIcon className="w-4 h-4 mr-2" /> Edit
                </button>
                <button
                  onClick={handleReschedule}
                  className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  disabled={!hasAccess()}
                >
                  <ScheduleIcon className="w-4 h-4 mr-2" /> Reschedule
                </button>
                <button
                  onClick={handleDuplicate}
                  className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  disabled={!hasAccess()}
                >
                  <DuplicateIcon className="w-4 h-4 mr-2" /> Duplicate
                </button>
                <button
                  onClick={handleDelete}
                  className="flex w-full items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  disabled={!hasAccess()}
                >
                  <DeleteIcon className="w-4 h-4 mr-2" /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Title and content type */}
        <div className="flex items-start mb-3">
          <div className="mr-3 mt-1">
            {getContentTypeIcon()}
          </div>
          <div>
            <h3 className="font-medium text-gray-900">{title}</h3>
            {contentType && (
              <p className="text-xs text-gray-500 capitalize">
                {contentType}
              </p>
            )}
          </div>
        </div>
        
        {/* Description (if detailed view) */}
        {detailed && description && (
          <div className="mb-3">
            <p className="text-sm text-gray-700 line-clamp-2">{description}</p>
          </div>
        )}
        
        {/* Media preview (if available and detailed view) */}
        {detailed && mediaUrl && (
          <div className="mb-3 rounded-md overflow-hidden h-24 bg-gray-100">
            <img
              src={mediaUrl}
              alt={title}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        
        {/* Datetime */}
        <div className="mb-3">
          <div className="flex items-center text-xs text-gray-500 mb-1">
            <CalendarIcon className="w-3 h-3 mr-1" />
            <span>{formatDate(startTime)}</span>
          </div>
          <div className="flex items-center text-xs text-gray-500">
            <ClockIcon className="w-3 h-3 mr-1" />
            <span>
              {formatTime(startTime)}
              {endTime && ` - ${formatTime(endTime)}`}
            </span>
          </div>
        </div>
        
        {/* Platforms */}
        {platforms.length > 0 && (
          <div className="mb-3">
            <div className="flex flex-wrap gap-1">
              {platforms.map((platform, index) => (
                <span
                  key={index}
                  className="px-2 py-0.5 text-xs bg-white bg-opacity-70 rounded-full"
                >
                  {platform}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {/* Author (if available and detailed view) */}
        {detailed && author && (
          <div className="mb-3 flex items-center">
            {authorAvatar ? (
              <img
                src={authorAvatar}
                alt={author}
                className="w-5 h-5 rounded-full mr-2"
              />
            ) : (
              <UserIcon className="w-5 h-5 text-gray-400 mr-2" />
            )}
            <span className="text-xs text-gray-600">{author}</span>
          </div>
        )}
        
        {/* Tags (if available and detailed view) */}
        {detailed && tags.length > 0 && (
          <div className="mb-3">
            <div className="flex flex-wrap gap-1">
              {tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {/* Stats (if published and detailed view) */}
        {detailed && status === 'published' && stats && (
          <div className="flex space-x-3 text-xs text-gray-500">
            {stats.likes !== undefined && (
              <div className="flex items-center">
                <LikeIcon className="w-3 h-3 mr-1" />
                <span>{stats.likes}</span>
              </div>
            )}
            {stats.comments !== undefined && (
              <div className="flex items-center">
                <CommentIcon className="w-3 h-3 mr-1" />
                <span>{stats.comments}</span>
              </div>
            )}
            {stats.shares !== undefined && (
              <div className="flex items-center">
                <ShareIcon className="w-3 h-3 mr-1" />
                <span>{stats.shares}</span>
              </div>
            )}
            {stats.views !== undefined && (
              <div className="flex items-center">
                <ViewIcon className="w-3 h-3 mr-1" />
                <span>{stats.views}</span>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="p-3 bg-red-50 border-t border-red-100">
          <p className="text-xs text-red-700 mb-2">Are you sure you want to delete this event?</p>
          <div className="flex justify-end space-x-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={cancelDelete}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleDelete}
            >
              Delete
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};

// Icons
const MoreIcon = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
    <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
  </svg>
);

const EditIcon = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
  </svg>
);

const ScheduleIcon = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
  </svg>
);

const DuplicateIcon = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
    <path d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9z" />
    <path d="M5 3a2 2 0 00-2 2v6a2 2 0 002 2V5h8a2 2 0 00-2-2H5z" />
  </svg>
);

const DeleteIcon = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
  </svg>
);

const CalendarIcon = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
  </svg>
);

const ClockIcon = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
  </svg>
);

const VideoIcon = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className || "w-5 h-5 text-purple-500"} viewBox="0 0 20 20" fill="currentColor">
    <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
  </svg>
);

const ImageIcon = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className || "w-5 h-5 text-blue-500"} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
  </svg>
);

const CarouselIcon = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className || "w-5 h-5 text-indigo-500"} viewBox="0 0 20 20" fill="currentColor">
    <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
  </svg>
);

const StoryIcon = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className || "w-5 h-5 text-pink-500"} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4z" clipRule="evenodd" />
  </svg>
);

const TextIcon = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className || "w-5 h-5 text-gray-500"} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
  </svg>
);

const UserIcon = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
  </svg>
);

const LikeIcon = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
    <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
  </svg>
);

const CommentIcon = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" />
  </svg>
);

const ShareIcon = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
    <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
  </svg>
);

const ViewIcon = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
  </svg>
);

export default CalendarEventCard; 