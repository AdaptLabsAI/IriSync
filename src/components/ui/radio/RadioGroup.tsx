import React, { useState, useEffect } from 'react';
import cn from 'classnames';
import { RadioButton } from './RadioButton';

export interface RadioOption {
  /**
   * Value of the radio option
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

export interface RadioGroupProps {
  /**
   * Group options
   */
  options: RadioOption[];
  /**
   * Selected value (controlled)
   */
  value?: string;
  /**
   * Default selected value (uncontrolled)
   */
  defaultValue?: string;
  /**
   * Called when selection changes
   */
  onChange?: (value: string) => void;
  /**
   * Alias for onChange (Radix-style API)
   */
  onValueChange?: (value: string) => void;
  /**
   * Group orientation
   */
  orientation?: 'horizontal' | 'vertical';
  /**
   * Group name (for form submission)
   */
  name: string;
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
 * RadioGroup component for managing related radio buttons
 */
export const RadioGroup: React.FC<RadioGroupProps> = ({
  options,
  value,
  defaultValue,
  onChange,
  onValueChange,
  orientation = 'vertical',
  name,
  label,
  error,
  disabled = false,
  required = false,
  className,
}) => {
  // State for uncontrolled component
  const [selectedValue, setSelectedValue] = useState<string | undefined>(defaultValue);
  
  // Determine if component is controlled
  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : selectedValue;
  
  // Update internal state if controlled value changes
  useEffect(() => {
    if (isControlled && value) {
      setSelectedValue(value);
    }
  }, [isControlled, value]);
  
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    
    // Update internal state if uncontrolled
    if (!isControlled) {
      setSelectedValue(newValue);
    }
    
    // Notify parent component
    if (onChange) {
      onChange(newValue);
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
          <RadioButton
            key={option.value}
            name={name}
            value={option.value}
            label={option.label}
            description={option.description}
            checked={currentValue === option.value}
            onChange={handleChange}
            disabled={disabled || option.disabled}
            required={required}
          />
        ))}
      </div>
      
      {error && (
        <p className="mt-1 text-xs text-destructive">{error}</p>
      )}
    </fieldset>
  );
};

export default RadioGroup;
