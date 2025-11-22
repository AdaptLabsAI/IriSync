/**
 * Button Component
 *
 * Canonical API:
 * Variants: 'primary' | 'secondary' | 'tertiary' | 'outline' | 'ghost' | 'link' | 'danger' | 'success' | 'warning'
 * Sizes: 'sm' | 'md' | 'lg' | 'xl' | 'icon'
 *
 * DO NOT use MUI variants: 'contained', 'text', 'outlined'
 * Those are for MUI Button from @mui/material
 */
import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import cn from 'classnames';
import { Spinner } from '../spinner/Spinner';
import { Tooltip } from '../tooltip/Tooltip';
import { useFeatureAccess } from '../../../hooks/useFeatureAccess';
import { usePermissionCheck } from '../../../hooks/usePermissionCheck';

// Define button variant types
export type ButtonVariant = 
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'outline'
  | 'ghost'
  | 'link'
  | 'danger'
  | 'success'
  | 'warning';

// Define button size types
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl' | 'icon';

// The base Button component props
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  tooltipText?: string;
  featureTier?: 'creator' | 'influencer' | 'enterprise' | 'all';
  requiredPermission?: string;
}

// Function to generate class names based on props
const getButtonClasses = (
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  fullWidth: boolean = false,
  loading: boolean = false,
  className?: string
) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';
  
  const variantClasses = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    tertiary: 'bg-tertiary text-tertiary-foreground hover:bg-tertiary/80',
    outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
    link: 'text-primary underline-offset-4 hover:underline',
    danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
    success: 'bg-success text-success-foreground hover:bg-success/90',
    warning: 'bg-warning text-warning-foreground hover:bg-warning/90',
  };
  
  const sizeClasses = {
    sm: 'h-9 px-3 text-sm',
    md: 'h-10 px-4 py-2',
    lg: 'h-11 px-8',
    xl: 'h-12 px-10 text-lg',
    icon: 'h-10 w-10 p-0',
  };
  
  const widthClass = fullWidth ? 'w-full' : '';
  
  return cn(
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    widthClass,
    className
  );
};

/**
 * Primary UI component for user interaction
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    children,
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    loading = false,
    leftIcon,
    rightIcon,
    tooltipText,
    featureTier = 'all',
    requiredPermission,
    className,
    disabled,
    type = 'button',
    ...props
  }, ref) => {
    // Check if the user has access to this feature based on their subscription tier
    const canAccessFeature = useFeatureAccess(featureTier);
    
    // Check if the user has the required permission
    const hasPermission = usePermissionCheck(requiredPermission);
    
    // Determine if button should be disabled based on loading state, passed disabled prop,
    // feature access, and permission
    const isDisabled = disabled || loading || !canAccessFeature || !hasPermission;
    
    // Generate upgrade tooltip if feature is restricted
    let finalTooltip = tooltipText;
    if (!canAccessFeature) {
      finalTooltip = `Upgrade to ${featureTier} plan to access this feature`;
    } else if (!hasPermission) {
      finalTooltip = `You don't have the required permissions`;
    }
    
    const buttonElement = (
      <button
        ref={ref}
        type={type}
        className={getButtonClasses(variant, size, fullWidth, loading, className)}
        disabled={isDisabled}
        {...props}
      >
        {loading && (
          <Spinner className="mr-2 h-4 w-4" />
        )}
        
        {!loading && leftIcon && (
          <span className="mr-2">{leftIcon}</span>
        )}
        
        {children}
        
        {!loading && rightIcon && (
          <span className="ml-2">{rightIcon}</span>
        )}
      </button>
    );

    // If tooltipText is provided, wrap button in Tooltip component
    if (finalTooltip) {
      return (
        <Tooltip content={finalTooltip}>
          {buttonElement}
        </Tooltip>
      );
    }
    
    return buttonElement;
  }
);

Button.displayName = 'Button';

export default Button; 