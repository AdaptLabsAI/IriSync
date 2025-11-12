import React, { useState, useRef, useEffect } from 'react';
import cn from 'classnames';
import Button, { ButtonProps, ButtonVariant, ButtonSize } from './Button';

export interface SplitButtonProps extends Omit<ButtonProps, 'onClick'> {
  /**
   * Primary action handler
   */
  onPrimaryClick: () => void;
  /**
   * The dropdown menu content
   */
  dropdownContent: React.ReactNode;
  /**
   * Whether the dropdown is open by default
   */
  defaultOpen?: boolean;
  /**
   * Custom dropdown width
   */
  dropdownWidth?: number | string;
  /**
   * Custom classes for the dropdown content
   */
  dropdownClassName?: string;
}

export const SplitButton: React.FC<SplitButtonProps> = ({
  children,
  onPrimaryClick,
  dropdownContent,
  defaultOpen = false,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  dropdownWidth,
  dropdownClassName,
  className,
  ...otherProps
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownRef]);

  // Size classes for the divider
  const sizeToHeight = {
    sm: 'h-9',
    md: 'h-10',
    lg: 'h-11',
    xl: 'h-12',
    icon: 'h-10',
  };
  
  return (
    <div className={cn("inline-flex relative", fullWidth && "w-full")} ref={dropdownRef}>
      {/* Primary button */}
      <Button
        variant={variant}
        size={size}
        className={cn(
          "rounded-r-none border-r-0",
          fullWidth && "flex-1",
          className
        )}
        disabled={disabled}
        loading={loading}
        onClick={onPrimaryClick}
        {...otherProps}
      >
        {children}
      </Button>
      
      {/* Dropdown toggle button */}
      <Button
        variant={variant}
        size={size}
        className={cn(
          "rounded-l-none px-2",
          className
        )}
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <ChevronDownIcon />
      </Button>
      
      {/* Dropdown menu */}
      {isOpen && (
        <div
          className={cn(
            'absolute right-0 mt-1 top-full rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50',
            dropdownClassName
          )}
          style={{ width: dropdownWidth }}
          role="menu"
          aria-orientation="vertical"
        >
          {dropdownContent}
        </div>
      )}
    </div>
  );
};

// Simple chevron down icon component
const ChevronDownIcon = () => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="16" 
    height="16" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <path d="m6 9 6 6 6-6"/>
  </svg>
);

export default SplitButton; 