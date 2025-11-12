import React from 'react';
import cn from 'classnames';
import Button, { ButtonProps } from './Button';

export interface ToggleButtonProps extends Omit<ButtonProps, 'onClick'> {
  /**
   * Whether the button is toggled on
   */
  isActive: boolean;
  /**
   * Called when the toggle state changes
   */
  onChange: (isActive: boolean) => void;
  /**
   * The aria-label to use when active
   */
  activeLabel?: string;
  /**
   * The aria-label to use when inactive
   */
  inactiveLabel?: string;
}

export const ToggleButton: React.FC<ToggleButtonProps> = ({
  children,
  isActive,
  onChange,
  activeLabel,
  inactiveLabel,
  variant = 'outline',
  className,
  ...buttonProps
}) => {
  // Derive the appropriate aria-label based on the active state
  const ariaLabel = isActive ? activeLabel : inactiveLabel;
  
  // Calculate the final class names based on the active state
  const toggledClasses = isActive
    ? 'bg-primary text-primary-foreground'
    : '';
  
  return (
    <Button
      variant={variant}
      className={cn(toggledClasses, className)}
      aria-pressed={isActive}
      aria-label={ariaLabel}
      onClick={() => onChange(!isActive)}
      {...buttonProps}
    >
      {children}
    </Button>
  );
};

export default ToggleButton; 