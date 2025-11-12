import React from 'react';
import { Button as MuiButton, ButtonProps as MuiButtonProps, CircularProgress } from '@mui/material';

export type ButtonVariant = 'text' | 'outlined' | 'contained' | 'link' | 'outline';
export type ButtonColor = 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning' | 'danger' | 'default';
export type ButtonSize = 'small' | 'medium' | 'large' | 'sm';

export interface ButtonProps extends Omit<MuiButtonProps, 'variant' | 'color' | 'size'> {
  variant?: ButtonVariant;
  color?: ButtonColor;
  size?: ButtonSize;
  isFullWidth?: boolean;
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactElement;
  rightIcon?: React.ReactElement;
  icon?: React.ReactElement;
}

/**
 * Button component for triggering actions
 */
export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'contained',
  color = 'primary',
  size = 'medium',
  isFullWidth = false,
  isLoading = false,
  loadingText,
  leftIcon,
  rightIcon,
  icon,
  ...props
}) => {
  // Map custom variants to MUI variants
  const getMuiVariant = (v: ButtonVariant): 'text' | 'outlined' | 'contained' => {
    if (v === 'link') return 'text';
    if (v === 'outline') return 'outlined';
    return v as 'text' | 'outlined' | 'contained';
  };

  // Map custom colors to MUI colors
  const getMuiColor = (c: ButtonColor): 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning' => {
    if (c === 'danger') return 'error';
    if (c === 'default') return 'primary';
    return c as 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning';
  };

  // Map custom sizes to MUI sizes
  const getMuiSize = (s: ButtonSize): 'small' | 'medium' | 'large' => {
    if (s === 'sm') return 'small';
    return s as 'small' | 'medium' | 'large';
  };

  return (
    <MuiButton
      variant={getMuiVariant(variant)}
      color={getMuiColor(color)}
      size={getMuiSize(size)}
      fullWidth={isFullWidth}
      disabled={isLoading || props.disabled}
      startIcon={isLoading ? <CircularProgress size={24} color="inherit" /> : (icon || leftIcon)}
      endIcon={rightIcon}
      {...props}
    >
      {isLoading && loadingText ? loadingText : children}
    </MuiButton>
  );
};

/**
 * IconButton component that only shows an icon
 */
export const IconButton: React.FC<ButtonProps & { 'aria-label': string }> = ({
  variant = 'contained',
  color = 'primary',
  size = 'medium',
  isLoading = false,
  leftIcon,
  'aria-label': ariaLabel,
  ...props
}) => {
  return (
    <MuiButton
      variant={variant}
      color={color}
      size={size}
      disabled={isLoading || props.disabled}
      startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : leftIcon}
      aria-label={ariaLabel}
      {...props}
    />
  );
};

export default Button; 