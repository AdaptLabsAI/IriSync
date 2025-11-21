'use client';

import React, { forwardRef } from 'react';
import {
  Select as MuiSelect,
  MenuItem,
  FormControl,
  SelectChangeEvent,
} from '@mui/material';

export interface RadixSelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
}

export interface SelectTriggerProps {
  children: React.ReactNode;
  className?: string;
}

export interface SelectContentProps {
  children: React.ReactNode;
  className?: string;
}

export interface SelectItemProps {
  value: string;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export interface SelectValueProps {
  placeholder?: string;
  className?: string;
}

/**
 * Radix-style Select component built on MUI
 */
export const Select = forwardRef<HTMLDivElement, RadixSelectProps>(
  ({ value, onValueChange, children, disabled }, ref) => {
    // Extract trigger and content from children
    const childArray = React.Children.toArray(children);
    const trigger = childArray.find(
      (child) => React.isValidElement(child) && child.type === SelectTrigger
    );
    const content = childArray.find(
      (child) => React.isValidElement(child) && child.type === SelectContent
    );

    const handleChange = (event: SelectChangeEvent<string>) => {
      if (onValueChange) {
        onValueChange(event.target.value);
      }
    };

    // Get placeholder from SelectValue in trigger
    let placeholder = '';
    if (React.isValidElement(trigger)) {
      const selectValue = React.Children.toArray(trigger.props.children).find(
        (child) => React.isValidElement(child) && child.type === SelectValue
      );
      if (React.isValidElement(selectValue)) {
        placeholder = selectValue.props.placeholder || '';
      }
    }

    return (
      <FormControl fullWidth disabled={disabled} ref={ref}>
        <MuiSelect
          value={value || ''}
          onChange={handleChange}
          displayEmpty={!!placeholder}
          size="small"
        >
          {placeholder && !value && (
            <MenuItem value="" disabled>
              {placeholder}
            </MenuItem>
          )}
          {React.isValidElement(content) && content.props.children}
        </MuiSelect>
      </FormControl>
    );
  }
);

Select.displayName = 'Select';

/**
 * SelectTrigger - wrapper for the select trigger (ignored in MUI implementation)
 */
export const SelectTrigger = forwardRef<HTMLDivElement, SelectTriggerProps>(
  ({ children, className }, ref) => {
    return <div ref={ref} className={className}>{children}</div>;
  }
);

SelectTrigger.displayName = 'SelectTrigger';

/**
 * SelectValue - displays the selected value or placeholder
 */
export const SelectValue: React.FC<SelectValueProps> = ({ placeholder, className }) => {
  return null; // This is extracted by the Select component
};

SelectValue.displayName = 'SelectValue';

/**
 * SelectContent - wrapper for select options
 */
export const SelectContent = forwardRef<HTMLDivElement, SelectContentProps>(
  ({ children, className }, ref) => {
    return <>{children}</>;
  }
);

SelectContent.displayName = 'SelectContent';

/**
 * SelectItem - individual select option
 */
export const SelectItem = forwardRef<HTMLLIElement, SelectItemProps>(
  ({ value, children, disabled, className }, ref) => {
    return (
      <MenuItem value={value} disabled={disabled} className={className}>
        {children}
      </MenuItem>
    );
  }
);

SelectItem.displayName = 'SelectItem';

export default Select;
