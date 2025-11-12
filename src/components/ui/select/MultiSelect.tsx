import React, { useState, useEffect, useRef } from 'react';
import cn from 'classnames';
import { SelectOption } from './Select';

export interface MultiSelectProps {
  /**
   * List of options to display
   */
  options: SelectOption[];
  /**
   * Array of selected values (controlled)
   */
  value?: string[];
  /**
   * Default selected values (uncontrolled)
   */
  defaultValue?: string[];
  /**
   * Called when selection changes
   */
  onChange?: (values: string[]) => void;
  /**
   * Select size variant
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Error message to display
   */
  error?: string;
  /**
   * Whether the select is valid
   */
  isValid?: boolean;
  /**
   * The select takes full width of its container
   */
  fullWidth?: boolean;
  /**
   * Placeholder text when no option is selected
   */
  placeholder?: string;
  /**
   * Maximum number of visible tags before showing "+X more"
   */
  maxVisibleTags?: number;
  /**
   * Label text
   */
  label?: string;
  /**
   * Whether the field is disabled
   */
  disabled?: boolean;
  /**
   * Whether the field is required
   */
  required?: boolean;
  /**
   * Custom wrapper class name
   */
  className?: string;
  /**
   * HTML id attribute
   */
  id?: string;
  /**
   * HTML name attribute
   */
  name?: string;
}

/**
 * MultiSelect component for selecting multiple options
 */
export const MultiSelect: React.FC<MultiSelectProps> = ({
  options,
  value,
  defaultValue = [],
  onChange,
  size = 'md',
  error,
  isValid,
  fullWidth = true,
  placeholder = 'Select options...',
  maxVisibleTags = 3,
  label,
  disabled = false,
  required = false,
  className,
  id,
  name,
}) => {
  // State for selected values (uncontrolled mode)
  const [selectedValues, setSelectedValues] = useState<string[]>(defaultValue);
  
  // State for dropdown visibility
  const [isOpen, setIsOpen] = useState(false);
  
  // Ref for the dropdown container
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Determine if component is controlled
  const isControlled = value !== undefined;
  const currentValues = isControlled ? value || [] : selectedValues;
  
  // Update internal state if controlled value changes
  useEffect(() => {
    if (isControlled && value) {
      setSelectedValues(value);
    }
  }, [isControlled, value]);
  
  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Toggle selection of an option
  const toggleOption = (optionValue: string) => {
    const newValues = currentValues.includes(optionValue)
      ? currentValues.filter(v => v !== optionValue)
      : [...currentValues, optionValue];
    
    // Update internal state if uncontrolled
    if (!isControlled) {
      setSelectedValues(newValues);
    }
    
    // Notify parent component
    onChange?.(newValues);
  };
  
  // Remove a selected option
  const removeOption = (optionValue: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent the dropdown from opening
    
    const newValues = currentValues.filter(v => v !== optionValue);
    
    // Update internal state if uncontrolled
    if (!isControlled) {
      setSelectedValues(newValues);
    }
    
    // Notify parent component
    onChange?.(newValues);
  };
  
  // Clear all selected options
  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent the dropdown from opening
    
    // Update internal state if uncontrolled
    if (!isControlled) {
      setSelectedValues([]);
    }
    
    // Notify parent component
    onChange?.([]);
  };
  
  // Get the label for a given value
  const getOptionLabel = (optionValue: string) => {
    const option = options.find(opt => opt.value === optionValue);
    return option ? option.label : optionValue;
  };
  
  // Size variants
  const sizeClasses = {
    sm: 'min-h-8 text-xs py-1',
    md: 'min-h-10 py-2',
    lg: 'min-h-12 text-base py-2.5'
  };
  
  // Generate a unique ID if needed
  const elementId = id || `multiselect-${Math.random().toString(36).substring(2, 11)}`;
  
  return (
    <div 
      ref={dropdownRef}
      className={cn("relative", fullWidth && "w-full", className)}
    >
      {label && (
        <label 
          htmlFor={elementId}
          className="block text-sm font-medium text-gray-900 mb-1"
        >
          {label} {required && <span className="text-destructive">*</span>}
        </label>
      )}
      
      {/* Trigger button */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          'rounded-md border bg-background px-3 flex flex-wrap items-center gap-1 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          sizeClasses[size],
          error ? 'border-destructive focus-visible:ring-destructive' : 'border-input',
          isValid && !error ? 'border-success focus-visible:ring-success' : '',
          disabled ? 'opacity-50 cursor-not-allowed bg-muted' : '',
          fullWidth ? 'w-full' : '',
          isOpen ? 'ring-2 ring-primary ring-offset-2' : ''
        )}
        tabIndex={disabled ? -1 : 0}
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={`${elementId}-listbox`}
        aria-haspopup="listbox"
        aria-disabled={disabled}
        aria-invalid={error ? "true" : undefined}
      >
        {currentValues.length === 0 ? (
          <span className="text-gray-500">{placeholder}</span>
        ) : (
          <>
            {/* Display selected items as tags */}
            {currentValues.slice(0, maxVisibleTags).map(value => (
              <span 
                key={value}
                className="bg-primary/10 text-primary rounded-md px-2 py-0.5 text-sm flex items-center gap-1"
              >
                {getOptionLabel(value)}
                <button
                  onClick={(e) => removeOption(value, e)}
                  className="text-primary hover:text-primary/80 focus:outline-none"
                  aria-label={`Remove ${getOptionLabel(value)}`}
                  type="button"
                  disabled={disabled}
                >
                  <XIcon />
                </button>
              </span>
            ))}
            
            {/* Show how many more are selected */}
            {currentValues.length > maxVisibleTags && (
              <span className="text-sm text-gray-500">
                +{currentValues.length - maxVisibleTags} more
              </span>
            )}
          </>
        )}
        
        {/* Spacer to push icons to the right */}
        <div className="flex-grow" />
        
        {/* Clear button (only when items are selected) */}
        {currentValues.length > 0 && !disabled && (
          <button
            onClick={clearAll}
            className="text-gray-400 hover:text-gray-600 focus:outline-none ml-1"
            aria-label="Clear all selected options"
            type="button"
          >
            <XCircleIcon />
          </button>
        )}
        
        {/* Dropdown indicator */}
        <ChevronDownIcon className={cn('ml-1', isOpen && 'transform rotate-180')} />
      </div>
      
      {/* Dropdown menu */}
      {isOpen && !disabled && (
        <div
          className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto"
          id={`${elementId}-listbox`}
          role="listbox"
          aria-multiselectable="true"
        >
          {options.map(option => (
            <div
              key={option.value}
              onClick={() => !option.disabled && toggleOption(option.value)}
              className={cn(
                'px-3 py-2 text-sm cursor-pointer flex items-center',
                currentValues.includes(option.value) ? 'bg-primary/10' : 'hover:bg-gray-100',
                option.disabled && 'opacity-50 cursor-not-allowed'
              )}
              role="option"
              aria-selected={currentValues.includes(option.value)}
              aria-disabled={option.disabled}
            >
              <input
                type="checkbox"
                className="mr-2 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                checked={currentValues.includes(option.value)}
                readOnly
                tabIndex={-1}
              />
              {option.label}
            </div>
          ))}
          
          {options.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-500">
              No options available
            </div>
          )}
        </div>
      )}
      
      {/* Hidden inputs for form submission */}
      {name && currentValues.map(value => (
        <input 
          key={value}
          type="hidden"
          name={name}
          value={value}
        />
      ))}
      
      {/* Error message */}
      {error && (
        <p className="mt-1 text-xs text-destructive">{error}</p>
      )}
    </div>
  );
};

// Chevron down icon
const ChevronDownIcon = ({ className }: { className?: string }) => (
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
    className={cn("text-gray-500", className)}
  >
    <path d="m6 9 6 6 6-6"/>
  </svg>
);

// X icon for removing tags
const XIcon = () => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="12" 
    height="12" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

// X in circle icon for clearing all
const XCircleIcon = () => (
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
    <circle cx="12" cy="12" r="10" />
    <path d="m15 9-6 6" />
    <path d="m9 9 6 6" />
  </svg>
);

export default MultiSelect; 