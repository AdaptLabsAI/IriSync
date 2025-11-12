import React, { useState } from 'react';

export interface DraggableCalendarItemProps {
  /**
   * Unique identifier for the calendar item
   */
  id: string;
  /**
   * Title of the content/event
   */
  title: string;
  /**
   * Current start date and time
   */
  startTime: Date;
  /**
   * Current end date and time
   */
  endTime?: Date;
  /**
   * Background color class for the item
   */
  colorClass?: string;
  /**
   * Whether the item is draggable
   */
  draggable?: boolean;
  /**
   * Whether the item is currently being dragged
   */
  isDragging?: boolean;
  /**
   * Callback when drag starts
   */
  onDragStart?: (id: string, event: React.DragEvent) => void;
  /**
   * Callback when drag ends
   */
  onDragEnd?: (id: string, event: React.DragEvent) => void;
  /**
   * Callback when the item is clicked
   */
  onClick?: (id: string, event: React.MouseEvent) => void;
  /**
   * Whether the item is selected
   */
  isSelected?: boolean;
  /**
   * Platforms the content is scheduled for
   */
  platforms?: string[];
  /**
   * Content status (draft, scheduled, published, failed)
   */
  status?: 'draft' | 'scheduled' | 'published' | 'failed';
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Flag to indicate if this is just a preview/placeholder
   */
  isPreview?: boolean;
}

/**
 * DraggableCalendarItem component for calendar events that can be drag-and-dropped
 * to reschedule content.
 */
const DraggableCalendarItem: React.FC<DraggableCalendarItemProps> = ({
  id,
  title,
  startTime,
  endTime,
  colorClass = 'bg-blue-100 border-blue-300 text-blue-800',
  draggable = true,
  isDragging = false,
  onDragStart,
  onDragEnd,
  onClick,
  isSelected = false,
  platforms = [],
  status = 'scheduled',
  className = '',
  isPreview = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  
  // Format the time display
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  // Get status-related styles
  const getStatusStyles = () => {
    switch (status) {
      case 'draft':
        return 'border-dashed';
      case 'published':
        return 'border-green-400';
      case 'failed':
        return 'border-red-400';
      case 'scheduled':
      default:
        return '';
    }
  };

  // Handle drag start
  const handleDragStart = (e: React.DragEvent) => {
    if (!draggable) return;
    
    // Set drag data
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
    
    // Add a small delay to ensure the drag image is created
    setTimeout(() => {
      if (isDragging && typeof document !== 'undefined') {
        const dragImage = document.createElement('div');
        dragImage.classList.add('bg-primary-100', 'p-2', 'rounded', 'border', 'border-primary-300', 'shadow-md');
        dragImage.innerText = title;
        dragImage.style.position = 'absolute';
        dragImage.style.top = '-1000px';
        document.body.appendChild(dragImage);
        e.dataTransfer.setDragImage(dragImage, 10, 10);
        
        // Clean up after drag is complete
        setTimeout(() => {
          document.body.removeChild(dragImage);
        }, 0);
      }
    }, 0);
    
    if (onDragStart) onDragStart(id, e);
  };

  // Handle drag end
  const handleDragEnd = (e: React.DragEvent) => {
    if (onDragEnd) onDragEnd(id, e);
  };

  // Handle click
  const handleClick = (e: React.MouseEvent) => {
    if (onClick) onClick(id, e);
  };

  return (
    <div
      className={`
        flex flex-col p-2 rounded-md cursor-pointer transition-all
        border ${getStatusStyles()}
        ${colorClass}
        ${isSelected ? 'ring-2 ring-primary-500' : ''}
        ${isHovered ? 'shadow-md' : ''}
        ${isDragging ? 'opacity-60' : ''}
        ${isPreview ? 'opacity-75 border-dashed' : ''}
        ${className}
      `}
      draggable={draggable}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-calendar-item-id={id}
      aria-label={`${title} scheduled at ${formatTime(startTime)}`}
    >
      <div className="flex justify-between items-start">
        <span className="font-medium truncate text-sm">{title}</span>
        {status === 'published' && <CheckIcon className="w-4 h-4 text-green-500" />}
        {status === 'failed' && <AlertIcon className="w-4 h-4 text-red-500" />}
      </div>
      
      <div className="text-xs mt-1">
        {formatTime(startTime)}
        {endTime && ` - ${formatTime(endTime)}`}
      </div>
      
      {platforms.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {platforms.map((platform, index) => (
            <div 
              key={index}
              className="rounded-full bg-white bg-opacity-50 px-1.5 py-0.5 text-xs"
            >
              {platform}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Icons
const CheckIcon = ({ className = "" }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    className={className} 
    viewBox="0 0 20 20" 
    fill="currentColor"
  >
    <path 
      fillRule="evenodd" 
      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" 
      clipRule="evenodd" 
    />
  </svg>
);

const AlertIcon = ({ className = "" }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    className={className} 
    viewBox="0 0 20 20" 
    fill="currentColor"
  >
    <path 
      fillRule="evenodd" 
      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" 
      clipRule="evenodd" 
    />
  </svg>
);

export default DraggableCalendarItem; 