import React, { forwardRef, useState, useEffect } from 'react';
import cn from 'classnames';

export interface SwitchProps {
  /**
   * Whether the switch is checked
   */
  checked?: boolean;
  /**
   * Default checked state (uncontrolled)
   */
  defaultChecked?: boolean;
  /**
   * Called when the switch state changes
   */
  onChange?: (checked: boolean) => void;
  /**
   * Disable the switch
   */
  disabled?: boolean;
  /**
   * Label for the switch
   */
  label?: string;
  /**
   * Label position
   */
  labelPosition?: 'left' | 'right';
  /**
   * Description text
   */
  description?: string;
  /**
   * Switch size
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * HTML name attribute
   */
  name?: string;
  /**
   * ID for the input element
   */
  id?: string;
  /**
   * Value for the input element
   */
  value?: string;
  /**
   * Required field
   */
  required?: boolean;
  /**
   * Error message to display
   */
  error?: string;
  /**
   * Custom wrapper class name
   */
  className?: string;
}

/**
 * Switch component for toggling between two states
 */
export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({
    checked,
    defaultChecked = false,
    onChange,
    disabled = false,
    label,
    labelPosition = 'right',
    description,
    size = 'md',
    name,
    id,
    value,
    required = false,
    error,
    className,
  }, ref) => {
    // State for uncontrolled component
    const [isChecked, setIsChecked] = useState(defaultChecked);
    
    // Determine if component is controlled
    const isControlled = checked !== undefined;
    const switchChecked = isControlled ? checked : isChecked;
    
    // Update internal state if controlled prop changes
    useEffect(() => {
      if (isControlled) {
        setIsChecked(checked);
      }
    }, [checked, isControlled]);
    
    // Generate a unique ID if one is not provided
    const uniqueId = id || `switch-${Math.random().toString(36).substring(2, 11)}`;
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newChecked = e.target.checked;
      
      // Update internal state if uncontrolled
      if (!isControlled) {
        setIsChecked(newChecked);
      }
      
      // Notify parent component
      if (onChange) {
        onChange(newChecked);
      }
    };
    
    // Size variants
    const sizeClasses = {
      sm: {
        switch: 'h-4 w-8',
        dot: 'h-3 w-3',
        translate: 'translate-x-4',
      },
      md: {
        switch: 'h-6 w-11',
        dot: 'h-5 w-5',
        translate: 'translate-x-5',
      },
      lg: {
        switch: 'h-7 w-14',
        dot: 'h-6 w-6',
        translate: 'translate-x-7',
      },
    };
    
    const switchElement = (
      <div className="flex items-center">
        <input
          ref={ref}
          type="checkbox"
          id={uniqueId}
          name={name}
          value={value}
          checked={switchChecked}
          onChange={handleChange}
          disabled={disabled}
          required={required}
          className="sr-only"
          aria-invalid={error ? "true" : undefined}
          aria-describedby={`${uniqueId}-description ${uniqueId}-error`}
        />
        <button
          type="button"
          role="switch"
          aria-checked={switchChecked}
          onClick={() => {
            if (!disabled) {
              handleChange({ target: { checked: !switchChecked } } as React.ChangeEvent<HTMLInputElement>);
            }
          }}
          disabled={disabled}
          className={cn(
            'relative inline-flex items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary',
            switchChecked ? 'bg-primary' : 'bg-gray-200',
            disabled && 'opacity-50 cursor-not-allowed',
            sizeClasses[size].switch
          )}
        >
          <span 
            className={cn(
              'inline-block rounded-full bg-white shadow-lg transform transition-transform',
              switchChecked ? sizeClasses[size].translate : 'translate-x-0.5',
              sizeClasses[size].dot
            )}
          />
        </button>
      </div>
    );
    
    if (!label) {
      return (
        <div className={className}>
          {switchElement}
          {error && (
            <p id={`${uniqueId}-error`} className="mt-1 text-xs text-destructive">{error}</p>
          )}
        </div>
      );
    }
    
    return (
      <div className={cn("flex items-start gap-2", labelPosition === 'left' && 'flex-row-reverse justify-end', className)}>
        {switchElement}
        
        <div className="text-sm">
          <label 
            htmlFor={uniqueId}
            className={cn(
              "font-medium text-gray-900",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {label}
          </label>
          {description && (
            <p id={`${uniqueId}-description`} className="text-gray-500 mt-0.5">{description}</p>
          )}
          {error && (
            <p id={`${uniqueId}-error`} className="text-destructive mt-1 text-xs">{error}</p>
          )}
        </div>
      </div>
    );
  }
);

Switch.displayName = 'Switch';

export default Switch; 