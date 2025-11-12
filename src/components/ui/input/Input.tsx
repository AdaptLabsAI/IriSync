import React, { forwardRef, InputHTMLAttributes } from 'react';
import cn from 'classnames';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /**
   * Custom classes to apply to the input
   */
  className?: string;
  /**
   * Input size variant
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
   * Right side element or icon
   */
  rightElement?: React.ReactNode;
  /**
   * Whether the input is valid
   */
  isValid?: boolean;
  /**
   * The input takes full width of its container
   */
  fullWidth?: boolean;
}

/**
 * Primary input component for user text entry
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({
    className,
    size = 'md',
    error,
    leftElement,
    rightElement,
    isValid,
    fullWidth,
    disabled,
    ...props
  }, ref) => {
    // Base styles
    const baseClasses = 'rounded-md border bg-background px-3 py-2 text-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2';
    
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
    
    return (
      <div className={cn("relative", fullWidth && "w-full", className)}>
        {leftElement && (
          <div className="absolute inset-y-0 left-0 flex items-center pl-3">
            {leftElement}
          </div>
        )}
        
        <input
          ref={ref}
          className={cn(
            baseClasses,
            sizeClasses[size],
            stateClasses[stateClass as keyof typeof stateClasses],
            leftElement && "pl-10",
            rightElement && "pr-10",
            widthClass
          )}
          disabled={disabled}
          aria-invalid={error ? "true" : undefined}
          {...props}
        />
        
        {rightElement && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            {rightElement}
          </div>
        )}
        
        {error && (
          <p className="mt-1 text-xs text-destructive">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input; 