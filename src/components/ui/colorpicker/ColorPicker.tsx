import React, { useState, useRef, useEffect } from 'react';
import cn from 'classnames';
import { Input, InputProps } from '../input';

export interface ColorPickerProps extends Omit<InputProps, 'value' | 'onChange' | 'type'> {
  /**
   * The selected color (controlled)
   */
  value?: string;
  /**
   * Default selected color (uncontrolled)
   */
  defaultValue?: string;
  /**
   * Called when the color changes
   */
  onChange?: (color: string) => void;
  /**
   * Format of the color value ('hex', 'rgb', 'hsl')
   */
  format?: 'hex' | 'rgb' | 'hsl';
  /**
   * Whether to show the color preview swatch
   */
  showPreview?: boolean;
  /**
   * Whether the picker should include opacity
   */
  withOpacity?: boolean;
  /**
   * Array of predefined color options for quick selection
   */
  presetColors?: string[];
  /**
   * Placeholder text when no color is selected
   */
  placeholder?: string;
  /**
   * Whether the color picker is disabled
   */
  disabled?: boolean;
  /**
   * Whether the field is required
   */
  required?: boolean;
}

/**
 * ColorPicker component for selecting colors
 */
export const ColorPicker: React.FC<ColorPickerProps> = ({
  value,
  defaultValue = '#000000',
  onChange,
  format = 'hex',
  showPreview = true,
  withOpacity = false,
  presetColors = [
    '#000000', '#ffffff', '#f44336', '#e91e63', 
    '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', 
    '#03a9f4', '#00bcd4', '#009688', '#4caf50', 
    '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', 
    '#ff9800', '#ff5722', '#795548', '#607d8b'
  ],
  placeholder = 'Enter color value...',
  disabled = false,
  required = false,
  ...inputProps
}) => {
  // State for uncontrolled component
  const [selectedColor, setSelectedColor] = useState<string>(defaultValue);
  const [isOpen, setIsOpen] = useState(false);
  
  // Refs for click outside handling
  const colorPickerRef = useRef<HTMLDivElement>(null);
  
  // Determine if component is controlled
  const isControlled = value !== undefined;
  const currentColor = isControlled ? value : selectedColor;
  
  // Handle outside clicks to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Handle color input change
  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    
    // Update internal state if uncontrolled
    if (!isControlled) {
      setSelectedColor(newColor);
    }
    
    // Notify parent component
    onChange?.(newColor);
  };
  
  // Handle selection from preset colors
  const handlePresetSelect = (color: string) => {
    // Update internal state if uncontrolled
    if (!isControlled) {
      setSelectedColor(color);
    }
    
    // Close dropdown
    setIsOpen(false);
    
    // Notify parent component
    onChange?.(color);
  };
  
  // Handle input focus
  const handleInputFocus = () => {
    // Open the dropdown
    if (!disabled && presetColors.length > 0) {
      setIsOpen(true);
    }
  };
  
  // Determine the input type based on format and opacity
  const getInputType = () => {
    if (format === 'hex') {
      return withOpacity ? 'text' : 'color';
    }
    return 'text';
  };
  
  return (
    <div ref={colorPickerRef} className={cn("relative")}>
      <div className="flex">
        <Input
          type={getInputType()}
          value={currentColor}
          onChange={handleColorChange}
          onFocus={handleInputFocus}
          onClick={handleInputFocus}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className="flex-1"
          {...inputProps}
        />
        
        {showPreview && (
          <div 
            className="h-10 w-10 border border-input ml-2 rounded-md overflow-hidden"
            style={{ backgroundColor: currentColor }}
            onClick={() => !disabled && setIsOpen(!isOpen)}
          />
        )}
      </div>
      
      {isOpen && !disabled && presetColors.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg p-2">
          <div className="grid grid-cols-5 gap-1">
            {presetColors.map((color, index) => (
              <button
                key={index}
                type="button"
                className="h-6 w-6 rounded-md border border-gray-200 cursor-pointer overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary"
                style={{ backgroundColor: color }}
                onClick={() => handlePresetSelect(color)}
                aria-label={`Select color ${color}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ColorPicker; 