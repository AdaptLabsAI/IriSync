import React, { forwardRef, InputHTMLAttributes } from 'react';
import cn from 'classnames';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  /**
   * Label for the checkbox
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
   * Custom classes for the checkbox wrapper
   */
  className?: string;
  /**
   * Standard onChange handler
   */
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  /**
   * Radix-style onCheckedChange handler (receives boolean)
   */
  onCheckedChange?: (checked: boolean) => void;
}

/**
 * Checkbox component
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({
    id,
    label,
    description,
    error,
    className,
    disabled,
    checked,
    onChange,
    onCheckedChange,
    ...props
  }, ref) => {
    // Generate a unique ID if one is not provided
    const uniqueId = id || `checkbox-${Math.random().toString(36).substring(2, 11)}`;

    // Handle both onChange and onCheckedChange
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (onChange) {
        onChange(event);
      }
      if (onCheckedChange) {
        onCheckedChange(event.target.checked);
      }
    };

    return (
      <div className={cn("flex items-start gap-2", className)}>
        <div className="flex items-center h-5 mt-1">
          <input
            ref={ref}
            id={uniqueId}
            type="checkbox"
            className={cn(
              "h-4 w-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            disabled={disabled}
            checked={checked}
            onChange={handleChange}
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

Checkbox.displayName = 'Checkbox';

export default Checkbox; 