import React, { forwardRef, SelectHTMLAttributes } from 'react';
import cn from 'classnames';

export interface SelectOption {
  /**
   * Option value
   */
  value: string;
  /**
   * Option label
   */
  label: string;
  /**
   * Whether the option is disabled
   */
  disabled?: boolean;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  /**
   * List of options to display
   */
  options: SelectOption[];
  /**
   * The currently selected value
   */
  value?: string;
  /**
   * Called when selection changes
   */
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  /**
   * Select size variant
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Error message to display
   */
  error?: string;
  /**
   * Left side element or icon
   */
  leftElement?: React.ReactNode;
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
   * Label text
   */
  label?: string;
  /**
   * Custom classes to apply
   */
  className?: string;
}

/**
 * Select component for dropdown selection
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({
    options,
    value,
    onChange,
    size = 'md',
    error,
    leftElement,
    isValid,
    fullWidth = true,
    placeholder,
    label,
    disabled,
    required,
    className,
    ...props
  }, ref) => {
    // Base styles
    const baseClasses = 'rounded-md border bg-background px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 appearance-none';
    
    // Size variants
    const sizeClasses = {
      sm: 'h-8 text-xs',
      md: 'h-10',
      lg: 'h-12 text-base'
    };
    
    // State styles
    const stateClasses = {
      default: 'border-input',
      error: 'border-destructive focus-visible:ring-destructive',
      valid: 'border-success focus-visible:ring-success',
      disabled: 'opacity-50 cursor-not-allowed bg-muted'
    };
    
    // Width classes
    const widthClass = fullWidth ? 'w-full' : '';
    
    // Calculate the state class
    let stateClass = 'default';
    if (error) stateClass = 'error';
    else if (isValid) stateClass = 'valid';
    if (disabled) stateClass = 'disabled';
    
    // Generate a unique ID if needed
    const id = props.id || `select-${Math.random().toString(36).substring(2, 11)}`;
    
    return (
      <div className={cn("relative", fullWidth && "w-full", className)}>
        {label && (
          <label 
            htmlFor={id}
            className="block text-sm font-medium text-gray-900 mb-1"
          >
            {label} {required && <span className="text-destructive">*</span>}
          </label>
        )}
        
        <div className="relative">
          {leftElement && (
            <div className="absolute inset-y-0 left-0 flex items-center pl-3">
              {leftElement}
            </div>
          )}
          
          <select
            ref={ref}
            id={id}
            value={value}
            onChange={onChange}
            disabled={disabled}
            required={required}
            className={cn(
              baseClasses,
              sizeClasses[size],
              stateClasses[stateClass as keyof typeof stateClasses],
              leftElement && "pl-10",
              widthClass,
              "pr-10" // Make room for the dropdown icon
            )}
            aria-invalid={error ? "true" : undefined}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            
            {options.map((option) => (
              <option 
                key={option.value} 
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>
          
          {/* Custom dropdown icon */}
          <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
            <ChevronDownIcon />
          </div>
        </div>
        
        {error && (
          <p className="mt-1 text-xs text-destructive">{error}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

// Chevron down icon
const ChevronDownIcon = () => (
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
    className="text-gray-500"
  >
    <path d="m6 9 6 6 6-6"/>
  </svg>
);

export default Select; 