import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';

export interface MediaSelectionCheckboxProps {
  /**
   * Unique identifier for the media item
   */
  mediaId: string;
  /**
   * Whether the media item is currently selected
   */
  isSelected: boolean;
  /**
   * Callback when selection state changes
   */
  onSelectionChange: (mediaId: string, isSelected: boolean) => void;
  /**
   * Optional size for the checkbox
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Optional variant for different styling
   */
  variant?: 'default' | 'overlay';
  /**
   * Optional class name for additional styling
   */
  className?: string;
  /**
   * Whether the checkbox is disabled
   */
  disabled?: boolean;
}

/**
 * MediaSelectionCheckbox - Checkbox component for selecting media items 
 * with special styling for media grid and list views
 */
export const MediaSelectionCheckbox: React.FC<MediaSelectionCheckboxProps> = ({
  mediaId,
  isSelected,
  onSelectionChange,
  size = 'md',
  variant = 'default',
  className = '',
  disabled = false,
}) => {
  const [hover, setHover] = useState(false);
  const [localSelected, setLocalSelected] = useState(isSelected);

  // Update local state when props change
  useEffect(() => {
    setLocalSelected(isSelected);
  }, [isSelected]);

  // Handle checkbox click
  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    
    const newSelectedState = !localSelected;
    setLocalSelected(newSelectedState);
    onSelectionChange(mediaId, newSelectedState);
  };

  // Determine checkbox size
  const getSizeClasses = () => {
    switch (size) {
      case 'sm': return 'h-4 w-4';
      case 'lg': return 'h-6 w-6';
      case 'md':
      default: return 'h-5 w-5';
    }
  };

  // Get check icon size
  const getCheckSize = () => {
    switch (size) {
      case 'sm': return 'h-3 w-3';
      case 'lg': return 'h-4 w-4';
      case 'md':
      default: return 'h-3.5 w-3.5';
    }
  };

  // Get variant specific classes
  const getVariantClasses = () => {
    const baseClasses = "rounded flex items-center justify-center transition-all duration-150";
    
    if (variant === 'overlay') {
      return `${baseClasses} ${
        localSelected 
          ? 'bg-primary border-primary text-primary-foreground' 
          : hover 
            ? 'bg-black/30 border-white text-white' 
            : 'bg-black/20 border-transparent text-transparent'
      } border`;
    }
    
    return `${baseClasses} ${
      localSelected 
        ? 'bg-primary border-primary text-primary-foreground' 
        : 'bg-white border-gray-300 hover:bg-gray-50'
    } border-2`;
  };

  return (
    <div
      role="checkbox"
      aria-checked={localSelected}
      tabIndex={disabled ? -1 : 0}
      className={`
        ${getSizeClasses()} 
        ${getVariantClasses()} 
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} 
        ${className}
      `}
      onClick={handleToggle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleToggle(e as any);
        }
      }}
    >
      {localSelected && <Check className={getCheckSize()} />}
    </div>
  );
};

export default MediaSelectionCheckbox; 