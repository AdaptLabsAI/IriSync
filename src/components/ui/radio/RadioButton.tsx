import React, { forwardRef, InputHTMLAttributes } from 'react';
import cn from 'classnames';

export interface RadioButtonProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /**
   * Label for the radio button
   */
  label?: string;
  /**
   * Description text displayed below the label
   */
  description?: string;
  /**
   * Error message to display
   */
  error?: string;
  /**
   * Custom classes for the radio button wrapper
   */
  className?: string;
}

/**
 * RadioButton component
 */
export const RadioButton = forwardRef<HTMLInputElement, RadioButtonProps>(
  ({
    id,
    label,
    description,
    error,
    className,
    disabled,
    checked,
    name,
    value,
    onChange,
    ...props
  }, ref) => {
    // Generate a unique ID if one is not provided
    const uniqueId = id || `radio-${Math.random().toString(36).substring(2, 11)}`;
    
    return (
      <div className={cn("flex items-start gap-2", className)}>
        <div className="flex items-center h-5 mt-1">
          <input
            ref={ref}
            id={uniqueId}
            type="radio"
            className={cn(
              "h-4 w-4 border-gray-300 text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            disabled={disabled}
            checked={checked}
            name={name}
            value={value}
            onChange={onChange}
            aria-invalid={error ? "true" : undefined}
            {...props}
          />
        </div>
        <div className="text-sm">
          {label && (
            <label 
              htmlFor={uniqueId}
              className={cn(
                "font-medium text-gray-900",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              {label}
            </label>
          )}
          {description && (
            <p className="text-gray-500 mt-0.5">{description}</p>
          )}
          {error && (
            <p className="text-destructive mt-1 text-xs">{error}</p>
          )}
        </div>
      </div>
    );
  }
);

RadioButton.displayName = 'RadioButton';

export default RadioButton; 