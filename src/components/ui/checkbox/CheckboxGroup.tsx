import React, { useState, useEffect } from 'react';
import cn from 'classnames';
import { Checkbox, CheckboxProps } from './Checkbox';

export interface CheckboxOption {
  /**
   * Value of the checkbox option
   */
  value: string;
  /**
   * Label to display
   */
  label: string;
  /**
   * Optional description text
   */
  description?: string;
  /**
   * Whether the option is disabled
   */
  disabled?: boolean;
}

export interface CheckboxGroupProps {
  /**
   * Group options
   */
  options: CheckboxOption[];
  /**
   * Selected values (controlled)
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
   * Group orientation
   */
  orientation?: 'horizontal' | 'vertical';
  /**
   * Group label
   */
  label?: string;
  /**
   * Error message to display
   */
  error?: string;
  /**
   * Whether the entire group is disabled
   */
  disabled?: boolean;
  /**
   * Required field
   */
  required?: boolean;
  /**
   * Custom wrapper class name
   */
  className?: string;
}

/**
 * CheckboxGroup component for managing multiple related checkboxes
 */
export const CheckboxGroup: React.FC<CheckboxGroupProps> = ({
  options,
  value,
  defaultValue = [],
  onChange,
  orientation = 'vertical',
  label,
  error,
  disabled = false,
  required = false,
  className,
}) => {
  // State for uncontrolled component
  const [selectedValues, setSelectedValues] = useState<string[]>(defaultValue);
  
  // Determine if component is controlled
  const isControlled = value !== undefined;
  const currentValues = isControlled ? value : selectedValues;
  
  // Update internal state if controlled value changes
  useEffect(() => {
    if (isControlled && value) {
      setSelectedValues(value);
    }
  }, [isControlled, value]);
  
  const handleChange = (optionValue: string, isChecked: boolean) => {
    const newValues = isChecked
      ? [...currentValues, optionValue]
      : currentValues.filter(val => val !== optionValue);
    
    // Update internal state if uncontrolled
    if (!isControlled) {
      setSelectedValues(newValues);
    }
    
    // Notify parent component
    if (onChange) {
      onChange(newValues);
    }
  };
  
  return (
    <fieldset className={cn("space-y-2", className)}>
      {label && (
        <legend className="text-sm font-medium text-gray-900 mb-1">
          {label} {required && <span className="text-destructive">*</span>}
        </legend>
      )}
      
      <div className={cn(
        orientation === 'horizontal' ? "flex flex-row gap-6" : "flex flex-col gap-2"
      )}>
        {options.map((option) => (
          <Checkbox
            key={option.value}
            label={option.label}
            description={option.description}
            checked={currentValues.includes(option.value)}
            onChange={(e) => handleChange(option.value, e.target.checked)}
            disabled={disabled || option.disabled}
          />
        ))}
      </div>
      
      {error && (
        <p className="mt-1 text-xs text-destructive">{error}</p>
      )}
    </fieldset>
  );
};

export default CheckboxGroup; 