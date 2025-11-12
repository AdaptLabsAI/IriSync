import React, { useState, useRef, useEffect } from 'react';
import cn from 'classnames';
import Button, { ButtonProps } from './Button';

export interface DropdownButtonProps extends ButtonProps {
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

export const DropdownButton: React.FC<DropdownButtonProps> = ({
  children,
  dropdownContent,
  defaultOpen = false,
  dropdownWidth,
  dropdownClassName,
  rightIcon = <ChevronDownIcon />,
  ...buttonProps
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
  
  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <Button
        {...buttonProps}
        rightIcon={rightIcon}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {children}
      </Button>
      
      {isOpen && (
        <div
          className={cn(
            'absolute mt-1 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50',
            dropdownClassName
          )}
          style={{ width: dropdownWidth }}
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="options-menu"
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

export default DropdownButton; 