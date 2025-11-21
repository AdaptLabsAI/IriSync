import React, { useState } from 'react';
import { Checkbox } from '../ui/checkbox/Checkbox';

export interface MediaItem {
  /**
   * Unique identifier for the media item
   */
  id: string;
  /**
   * URL of the media file
   */
  url: string;
  /**
   * Name of the media file
   */
  name: string;
  /**
   * Type of media (image, video, etc.)
   */
  type: 'image' | 'video' | 'gif' | 'audio' | 'document';
  /**
   * File size in bytes
   */
  size: number;
  /**
   * Tags associated with the media
   */
  tags?: string[];
  /**
   * Dimensions for images/videos (width x height)
   */
  dimensions?: {
    width: number;
    height: number;
  };
  /**
   * Date the media was uploaded
   */
  uploadedAt: Date;
  /**
   * URL of the thumbnail for videos
   */
  thumbnailUrl?: string;
  /**
   * Duration for videos/audio in seconds
   */
  duration?: number;
  /**
   * Whether the media is currently used in any published content
   */
  inUse?: boolean;
}

export interface MediaCardProps {
  /**
   * Media item to display
   */
  media: MediaItem;
  /**
   * Whether the card is currently selected
   */
  isSelected?: boolean;
  /**
   * Callback when the selection state changes
   */
  onSelectChange?: (id: string, selected: boolean) => void;
  /**
   * Callback when the card is clicked
   */
  onClick?: (id: string) => void;
  /**
   * Whether to show the checkbox for selection
   */
  selectable?: boolean;
  /**
   * Actions to show in the menu
   */
  actions?: Array<{
    label: string;
    icon?: React.ReactNode;
    onClick: (id: string) => void;
  }>;
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Whether to disable the card interaction
   */
  disabled?: boolean;
}

/**
 * MediaCard component for displaying media items in a grid or list
 */
const MediaCard: React.FC<MediaCardProps> = ({
  media,
  isSelected = false,
  onSelectChange,
  onClick,
  selectable = true,
  actions = [],
  className = '',
  disabled = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  
  // Format the file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format the date
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Handle checkbox change
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onSelectChange) {
      onSelectChange(media.id, e.target.checked);
    }
  };

  // Handle card click
  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent click if clicking on checkbox or menu
    if (
      e.target instanceof HTMLElement && 
      (e.target.closest('.media-card-checkbox') || e.target.closest('.media-card-menu'))
    ) {
      return;
    }
    
    if (onClick && !disabled) {
      onClick(media.id);
    }
  };

  // Toggle menu
  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(!menuOpen);
  };

  // Handle action click
  const handleActionClick = (e: React.MouseEvent, actionFn: (id: string) => void) => {
    e.stopPropagation();
    actionFn(media.id);
    setMenuOpen(false);
  };

  // Get media type icon
  const getMediaTypeIcon = () => {
    switch (media.type) {
      case 'video':
        return <VideoIcon />;
      case 'audio':
        return <AudioIcon />;
      case 'document':
        return <DocumentIcon />;
      case 'gif':
        return <GifIcon />;
      case 'image':
      default:
        return <ImageIcon />;
    }
  };

  // Render the media preview
  const renderMediaPreview = () => {
    switch (media.type) {
      case 'video':
        return (
          <div className="relative h-full w-full">
            <img 
              src={media.thumbnailUrl || media.url} 
              alt={media.name}
              className="h-full w-full object-cover rounded-t-md"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-black bg-opacity-50 rounded-full p-2">
                <PlayIcon className="w-6 h-6 text-white" />
              </div>
            </div>
            {media.duration && (
              <div className="absolute bottom-1 right-1 bg-black bg-opacity-75 text-white text-xs px-1 rounded">
                {Math.floor(media.duration / 60)}:{(media.duration % 60).toString().padStart(2, '0')}
              </div>
            )}
          </div>
        );
      case 'audio':
        return (
          <div className="flex items-center justify-center h-full w-full bg-gray-100">
            <AudioIcon className="w-12 h-12 text-gray-500" />
          </div>
        );
      case 'document':
        return (
          <div className="flex items-center justify-center h-full w-full bg-gray-100">
            <DocumentIcon className="w-12 h-12 text-gray-500" />
          </div>
        );
      case 'image':
      case 'gif':
      default:
        return (
          <img 
            src={media.url} 
            alt={media.name}
            className="h-full w-full object-cover rounded-t-md"
          />
        );
    }
  };

  return (
    <div
      className={`
        rounded-md overflow-hidden border border-gray-200 transition-all
        ${isSelected ? 'ring-2 ring-primary-500' : ''}
        ${isHovered ? 'shadow-md' : 'shadow-sm'}
        ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
    >
      {/* Media Preview Section */}
      <div className="relative h-40 bg-gray-100">
        {renderMediaPreview()}
        
        {/* Selection Checkbox */}
        {selectable && (
          <div className="absolute top-2 left-2 media-card-checkbox z-10">
            <Checkbox
              checked={isSelected}
              onChange={handleCheckboxChange}
              aria-label={`Select ${media.name}`}
            />
          </div>
        )}
        
        {/* Media Type Indicator */}
        <div className="absolute top-2 right-2 bg-white bg-opacity-75 p-1 rounded-md">
          {getMediaTypeIcon()}
        </div>
        
        {/* Actions Menu */}
        {actions.length > 0 && (
          <div className="absolute bottom-2 right-2 media-card-menu z-10">
            <button
              className="rounded-full p-1 bg-white shadow-sm"
              onClick={toggleMenu}
              aria-label="Media options"
            >
              <MoreIcon className="w-5 h-5" />
            </button>
            
            {menuOpen && (
              <div className="absolute bottom-8 right-0 bg-white rounded-md shadow-lg p-1 w-36">
                {actions.map((action, index) => (
                  <button
                    key={index}
                    className="flex items-center w-full px-3 py-2 text-sm hover:bg-gray-100 rounded-md"
                    onClick={(e) => handleActionClick(e, action.onClick)}
                  >
                    {action.icon && <span className="mr-2">{action.icon}</span>}
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* In-Use Indicator */}
        {media.inUse && (
          <div className="absolute top-2 left-10 bg-[#00CC44] text-white text-xs px-1.5 py-0.5 rounded-md">
            In Use
          </div>
        )}
      </div>
      
      {/* Media Info Section */}
      <div className="p-3 bg-white">
        <div className="truncate font-medium text-sm" title={media.name}>
          {media.name}
        </div>
        
        <div className="flex justify-between items-center mt-1 text-xs text-gray-500">
          <span>{formatFileSize(media.size)}</span>
          <span>{formatDate(media.uploadedAt)}</span>
        </div>
        
        {/* Tags */}
        {media.tags && media.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {media.tags.slice(0, 3).map((tag, index) => (
              <span 
                key={index}
                className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-xs"
              >
                {tag}
              </span>
            ))}
            {media.tags.length > 3 && (
              <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-xs">
                +{media.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Icon components
const MoreIcon = ({ className = "" }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    className={className} 
    viewBox="0 0 20 20" 
    fill="currentColor"
  >
    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
  </svg>
);

const ImageIcon = ({ className = "" }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    className={className || "w-5 h-5"} 
    viewBox="0 0 20 20" 
    fill="currentColor"
  >
    <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
  </svg>
);

const VideoIcon = ({ className = "" }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    className={className || "w-5 h-5"} 
    viewBox="0 0 20 20" 
    fill="currentColor"
  >
    <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
  </svg>
);

const AudioIcon = ({ className = "" }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    className={className || "w-5 h-5"} 
    viewBox="0 0 20 20" 
    fill="currentColor"
  >
    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
  </svg>
);

const DocumentIcon = ({ className = "" }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    className={className || "w-5 h-5"} 
    viewBox="0 0 20 20" 
    fill="currentColor"
  >
    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
  </svg>
);

const GifIcon = ({ className = "" }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    className={className || "w-5 h-5"} 
    viewBox="0 0 20 20" 
    fill="currentColor"
  >
    <path d="M5 4a1 1 0 00-1 1v10a1 1 0 001 1h10a1 1 0 001-1V5a1 1 0 00-1-1H5z" />
  </svg>
);

const PlayIcon = ({ className = "" }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    className={className} 
    viewBox="0 0 20 20" 
    fill="currentColor"
  >
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
  </svg>
);

export default MediaCard; 