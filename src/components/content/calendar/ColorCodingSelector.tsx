import React, { useState } from 'react';
import { Button } from '../../ui/button';
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { RadioGroup } from '../../ui/radio/RadioGroup';

export type ColorCodingScheme = 
  | 'platform'   // Color code by social platform
  | 'status'     // Color code by post status
  | 'contentType' // Color code by content type
  | 'team';       // Color code by team member

export interface ColorSchemeOption {
  id: ColorCodingScheme;
  name: string;
  description: string;
  colors: {
    [key: string]: string; // Maps entity IDs to color classes
  };
}

export interface ColorCodingLegendItem {
  label: string;
  colorClass: string;
}

export interface ColorCodingSelectorProps {
  /**
   * Current selected color coding scheme
   */
  value: ColorCodingScheme;
  /**
   * Available color coding schemes
   */
  schemes: ColorSchemeOption[];
  /**
   * Callback when scheme changes
   */
  onChange: (scheme: ColorCodingScheme) => void;
  /**
   * Button size
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Button variant
   */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Whether to show the button as icon only
   */
  iconOnly?: boolean;
  /**
   * Whether the button is disabled
   */
  disabled?: boolean;
  /**
   * Whether to show a legend below the selector
   */
  showLegend?: boolean;
}

/**
 * ColorCodingSelector component for selecting and configuring calendar color schemes
 */
const ColorCodingSelector: React.FC<ColorCodingSelectorProps> = ({
  value,
  schemes,
  onChange,
  size = 'md',
  variant = 'outline',
  className = '',
  iconOnly = false,
  disabled = false,
  showLegend = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localValue, setLocalValue] = useState<ColorCodingScheme>(value);
  
  // Find the current scheme object
  const currentScheme = schemes.find(scheme => scheme.id === value) || schemes[0];

  // Handle opening the dialog
  const handleOpenDialog = () => {
    setIsOpen(true);
    setLocalValue(value);
  };

  // Handle closing the dialog
  const handleCloseDialog = () => {
    setIsOpen(false);
  };

  // Handle applying the color scheme
  const handleApply = () => {
    onChange(localValue);
    setIsOpen(false);
  };

  // Handle scheme selection change
  const handleSchemeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value as ColorCodingScheme);
  };

  // Generate legend items for the current scheme
  const getLegendItems = (): ColorCodingLegendItem[] => {
    if (!currentScheme || !showLegend) return [];
    
    const items: ColorCodingLegendItem[] = [];
    
    Object.entries(currentScheme.colors).forEach(([key, colorClass]) => {
      // Skip any internal keys that start with underscore
      if (key.startsWith('_')) return;
      
      // Try to format the key to make it more readable
      const label = key
        .replace(/([A-Z])/g, ' $1') // Add space before capital letters
        .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
        .trim();
      
      items.push({
        label,
        colorClass,
      });
    });
    
    return items;
  };

  // Get the appropriate name for the current color scheme
  const currentSchemeName = currentScheme?.name || 'Color Coding';
  
  // Generate legend items
  const legendItems = getLegendItems();

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={handleOpenDialog}
        disabled={disabled}
        leftIcon={!iconOnly && <PaletteIcon />}
        aria-label={iconOnly ? 'Color coding options' : undefined}
      >
        {iconOnly ? <PaletteIcon /> : currentSchemeName}
      </Button>

      <Dialog
        isOpen={isOpen}
        onClose={handleCloseDialog}
      >
        <DialogTitle>Calendar Color Coding</DialogTitle>
        <DialogContent>
          <div className="p-4 min-w-[300px]">
            <p className="text-sm text-gray-600 mb-4">
              Choose how events are color-coded in the calendar view.
            </p>

            <RadioGroup
              label="Color by"
              value={localValue}
              onChange={handleSchemeChange}
              options={schemes.map(scheme => ({
                value: scheme.id,
                label: scheme.name,
                description: scheme.description,
              }))}
            />
            
            {/* Preview of the currently selected scheme */}
            <div className="mt-6">
              <h3 className="text-sm font-medium mb-2">Preview</h3>
              <div className="p-3 bg-gray-50 rounded-md">
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(currentScheme?.colors || {}).slice(0, 6).map(([key, colorClass]) => {
                    // Skip any internal keys that start with underscore
                    if (key.startsWith('_')) return null;
                    
                    // Format key for display
                    const label = key
                      .replace(/([A-Z])/g, ' $1')
                      .replace(/^./, str => str.toUpperCase())
                      .trim();
                    
                    return (
                      <div key={key} className="flex items-center space-x-2">
                        <div className={`w-4 h-4 rounded-full ${colorClass}`}></div>
                        <span className="text-xs">{label}</span>
                      </div>
                    );
                  })}
                  
                  {/* Show ... if there are more colors */}
                  {Object.keys(currentScheme?.colors || {}).length > 6 && (
                    <div className="col-span-2 text-center text-xs text-gray-500">...</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
        <DialogActions>
          <Button
            variant="outline"
            size="small"
            onClick={handleCloseDialog}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="small"
            onClick={handleApply}
          >
            Apply
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Optional Legend Display */}
      {showLegend && legendItems.length > 0 && (
        <div className="mt-2 p-2 bg-white border rounded-md text-sm">
          <div className="text-xs font-medium mb-1">Legend</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {legendItems.map((item, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${item.colorClass}`}></div>
                <span className="text-xs truncate">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

// Palette Icon component
const PaletteIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="13.5" cy="6.5" r="2.5" />
    <circle cx="17.5" cy="10.5" r="2.5" />
    <circle cx="8.5" cy="7.5" r="2.5" />
    <circle cx="6.5" cy="12.5" r="2.5" />
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
  </svg>
);

export default ColorCodingSelector; 