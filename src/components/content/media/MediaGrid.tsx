import React, { useState } from 'react';
import MediaCard, { MediaItem } from './MediaCard';

export interface MediaGridProps {
  /**
   * Array of media items to display
   */
  mediaItems: MediaItem[];
  /**
   * Callback when an item is selected
   */
  onSelect?: (ids: string[]) => void;
  /**
   * Callback when an item is clicked
   */
  onClick?: (id: string) => void;
  /**
   * Whether to allow multi-selection
   */
  multiSelect?: boolean;
  /**
   * Number of columns in the grid
   */
  columns?: 2 | 3 | 4 | 5;
  /**
   * Currently selected items
   */
  selectedIds?: string[];
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Show loading skeleton instead of actual content
   */
  loading?: boolean;
  /**
   * Number of skeleton items to show when loading
   */
  loadingCount?: number;
  /**
   * Actions available on each media card
   */
  itemActions?: Array<{
    label: string;
    icon?: React.ReactNode;
    onClick: (id: string) => void;
  }>;
  /**
   * Message to display when there are no items
   */
  emptyMessage?: string;
}

/**
 * MediaGrid component for displaying a grid of media items
 */
const MediaGrid: React.FC<MediaGridProps> = ({
  mediaItems,
  onSelect,
  onClick,
  multiSelect = true,
  columns = 4,
  selectedIds = [],
  className = '',
  loading = false,
  loadingCount = 12,
  itemActions = [],
  emptyMessage = 'No media items found',
}) => {
  const [localSelectedIds, setLocalSelectedIds] = useState<string[]>(selectedIds);
  
  // Handle selection change
  const handleSelectChange = (id: string, selected: boolean) => {
    let newSelectedIds: string[];
    
    if (multiSelect) {
      newSelectedIds = selected 
        ? [...localSelectedIds, id]
        : localSelectedIds.filter(selectedId => selectedId !== id);
    } else {
      newSelectedIds = selected ? [id] : [];
    }
    
    setLocalSelectedIds(newSelectedIds);
    
    if (onSelect) {
      onSelect(newSelectedIds);
    }
  };

  // Handle card click
  const handleCardClick = (id: string) => {
    if (onClick) {
      onClick(id);
    }
  };

  // Determine grid column class
  const gridColClass = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
    5: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
  }[columns];

  // Render loading skeleton
  if (loading) {
    return (
      <div className={`grid ${gridColClass} gap-4 ${className}`}>
        {Array.from({ length: loadingCount }).map((_, index) => (
          <div 
            key={index} 
            className="h-64 bg-gray-100 rounded-md animate-pulse"
          />
        ))}
      </div>
    );
  }

  // Render empty state
  if (mediaItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="text-gray-400 mb-2">
          <EmptyIcon className="w-12 h-12 mx-auto" />
        </div>
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  // Render media grid
  return (
    <div className={`grid ${gridColClass} gap-4 ${className}`}>
      {mediaItems.map(item => (
        <MediaCard
          key={item.id}
          media={item}
          isSelected={localSelectedIds.includes(item.id)}
          onSelectChange={handleSelectChange}
          onClick={handleCardClick}
          selectable={multiSelect}
          actions={itemActions}
        />
      ))}
    </div>
  );
};

// Empty state icon
const EmptyIcon = ({ className = "" }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    className={className} 
    viewBox="0 0 20 20" 
    fill="currentColor"
  >
    <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
  </svg>
);

export default MediaGrid; 