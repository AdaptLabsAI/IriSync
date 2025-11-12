import React, { forwardRef, TextareaHTMLAttributes } from 'react';
import cn from 'classnames';

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /**
   * Custom classes to apply to the textarea
   */
  className?: string;
  /**
   * Error message to display
   */
  error?: string;
  /**
   * Whether the textarea is valid
   */
  isValid?: boolean;
  /**
   * The textarea takes full width of its container
   */
  fullWidth?: boolean;
  /**
   * Whether the textarea should auto-resize based on content
   */
  autoResize?: boolean;
  /**
   * Maximum number of rows for auto-resize
   */
  maxRows?: number;
}

/**
 * TextArea component for multi-line text input
 */
export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({
    className,
    error,
    isValid,
    fullWidth = true,
    autoResize = false,
    maxRows = 10,
    disabled,
    rows = 4,
    onChange,
    ...props
  }, ref) => {
    // Base styles
    const baseClasses = 'rounded-md border bg-background px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 min-h-[80px]';
    
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
    
    // Handle auto-resize
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (autoResize) {
        e.target.style.height = 'auto';
        const newHeight = Math.min(e.target.scrollHeight, maxRows * 20); // Assuming 20px per row
        e.target.style.height = `${newHeight}px`;
      }
      
      if (onChange) {
        onChange(e);
      }
    };
    
    return (
      <div className={cn("relative", fullWidth && "w-full")}>
        <textarea
          ref={ref}
          className={cn(
            baseClasses,
            stateClasses[stateClass as keyof typeof stateClasses],
            widthClass,
            className
          )}
          disabled={disabled}
          rows={rows}
          onChange={handleChange}
          aria-invalid={error ? "true" : undefined}
          {...props}
        />
        
        {error && (
          <p className="mt-1 text-xs text-destructive">{error}</p>
        )}
      </div>
    );
  }
);

TextArea.displayName = 'TextArea';

export default TextArea; 