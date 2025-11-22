/**
 * Dropdown Menu Component
 *
 * Canonical API (ShadCN/Radix style):
 * - DropdownMenu (root container)
 * - DropdownMenuTrigger (trigger button)
 * - DropdownMenuContent (popup content)
 * - DropdownMenuItem (individual menu item)
 * - DropdownMenuSeparator (separator)
 * - DropdownMenuLabel (label)
 *
 * DO NOT use: Dropdown, DropdownTrigger, DropdownItem (these are old names)
 */
import React, { useState, useRef, useEffect } from 'react';

export interface DropdownMenuProps {
  children: React.ReactNode;
  className?: string;
}

export interface DropdownMenuTriggerProps {
  asChild?: boolean;
  children: React.ReactNode;
  className?: string;
}

export interface DropdownMenuContentProps {
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'bottom' | 'left' | 'right';
  children: React.ReactNode;
  className?: string;
}

export interface DropdownMenuItemProps {
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}

export interface DropdownMenuSeparatorProps {
  className?: string;
}

/**
 * DropdownMenu - Main container component
 */
export const DropdownMenu: React.FC<DropdownMenuProps> = ({ children, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={dropdownRef} className={`relative inline-block text-left ${className}`}>
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            isOpen,
            setIsOpen
          });
        }
        return child;
      })}
    </div>
  );
};

/**
 * DropdownMenuTrigger - Trigger element that opens the dropdown
 */
export const DropdownMenuTrigger: React.FC<DropdownMenuTriggerProps & { isOpen?: boolean; setIsOpen?: (open: boolean) => void }> = ({
  asChild = false,
  children,
  className = '',
  isOpen,
  setIsOpen
}) => {
  const handleClick = () => {
    if (setIsOpen) {
      setIsOpen(!isOpen);
    }
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onClick: handleClick,
      'aria-expanded': isOpen,
      'aria-haspopup': true
    });
  }

  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center justify-center ${className}`}
      aria-expanded={isOpen}
      aria-haspopup={true}
    >
      {children}
    </button>
  );
};

/**
 * DropdownMenuContent - Container for dropdown items
 */
export const DropdownMenuContent: React.FC<DropdownMenuContentProps & { isOpen?: boolean; setIsOpen?: (open: boolean) => void }> = ({
  align = 'end',
  side = 'bottom',
  children,
  className = '',
  isOpen,
  setIsOpen
}) => {
  if (!isOpen) return null;

  const alignmentClasses = {
    start: 'left-0',
    center: 'left-1/2 transform -translate-x-1/2',
    end: 'right-0'
  };

  const sideClasses = {
    top: 'bottom-full mb-2',
    bottom: 'top-full mt-2',
    left: 'right-full mr-2',
    right: 'left-full ml-2'
  };

  return (
    <div
      className={`
        absolute z-50 min-w-[8rem] overflow-hidden rounded-md border border-gray-200 
        bg-white p-1 text-gray-950 shadow-md animate-in fade-in-0 zoom-in-95
        ${alignmentClasses[align]} ${sideClasses[side]} ${className}
      `}
    >
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            setIsOpen
          });
        }
        return child;
      })}
    </div>
  );
};

/**
 * DropdownMenuItem - Individual menu item
 */
export const DropdownMenuItem: React.FC<DropdownMenuItemProps & { setIsOpen?: (open: boolean) => void }> = ({
  onClick,
  disabled = false,
  className = '',
  children,
  setIsOpen
}) => {
  const handleClick = () => {
    if (!disabled && onClick) {
      onClick();
      if (setIsOpen) {
        setIsOpen(false);
      }
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`
        relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 
        text-sm outline-none transition-colors
        ${disabled 
          ? 'pointer-events-none opacity-50' 
          : 'hover:bg-gray-100 focus:bg-gray-100'
        }
        ${className}
      `}
    >
      {children}
    </button>
  );
};

/**
 * DropdownMenuSeparator - Visual separator between menu items
 */
export const DropdownMenuSeparator: React.FC<DropdownMenuSeparatorProps> = ({ className = '' }) => {
  return <div className={`-mx-1 my-1 h-px bg-gray-200 ${className}`} />;
};

/**
 * DropdownMenuLabel - Label for grouping menu items
 */
export const DropdownMenuLabel: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className = '' 
}) => {
  return (
    <div className={`px-2 py-1.5 text-sm font-semibold text-gray-900 ${className}`}>
      {children}
    </div>
  );
};

export default DropdownMenu; 