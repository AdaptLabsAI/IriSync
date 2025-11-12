'use client';

import React, { forwardRef } from 'react';
import {
  Select as MuiSelect,
  MenuItem,
  FormControl,
  FormHelperText,
  Typography,
  SelectChangeEvent,
  InputLabel
} from '@mui/material';
import { useTheme } from '@mui/material/styles';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  options: SelectOption[];
  label?: string;
  error?: string;
  helperText?: string;
  isRequired?: boolean;
  isDisabled?: boolean;
  isInvalid?: boolean;
  size?: 'small' | 'medium';
  name?: string;
  id?: string;
  className?: string;
  onChange?: (e: SelectChangeEvent<string>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  value?: string;
  placeholder?: string;
  [key: string]: any;
}

/**
 * Select component for dropdown selections
 */
export const Select = forwardRef<HTMLInputElement, SelectProps>(
  (
    {
      options,
      label,
      error,
      helperText,
      isRequired = false,
      isDisabled = false,
      isInvalid = false,
      size = 'medium',
      name,
      id,
      className,
      placeholder,
      onChange,
      onBlur,
      value,
      ...props
    },
    ref
  ) => {
    const theme = useTheme();
    
    return (
      <FormControl
        required={isRequired}
        error={isInvalid || !!error}
        disabled={isDisabled}
        fullWidth
        size={size}
        sx={{ mb: 3 }}
        className={className}
      >
        {label && (
          <InputLabel id={`${id || name}-label`}>
            {label}
          </InputLabel>
        )}

        <MuiSelect
          inputRef={ref}
          id={id || name}
          name={name}
          displayEmpty={!!placeholder}
          labelId={`${id || name}-label`}
          label={label}
          onChange={onChange}
          onBlur={onBlur as any}
          value={value || ''}
          {...props}
        >
          {placeholder && (
            <MenuItem value="" disabled>
              {placeholder}
            </MenuItem>
          )}
          
          {options.map((option: SelectOption) => (
            <MenuItem 
              key={option.value} 
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </MenuItem>
          ))}
        </MuiSelect>

        {(error || helperText) && (
          <FormHelperText error={!!error}>
            {error || helperText}
          </FormHelperText>
        )}
      </FormControl>
    );
  }
);

Select.displayName = 'Select';

export default Select; 