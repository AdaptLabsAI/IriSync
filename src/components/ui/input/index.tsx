'use client';

import React, { forwardRef } from 'react';
import {
  TextField,
  InputAdornment,
  FormControl as MuiFormControl,
  FormHelperText,
  Typography,
  Box
} from '@mui/material';
import { useTheme } from '@mui/material/styles';

export interface InputProps extends Omit<React.ComponentProps<typeof TextField>, 'size' | 'error'> {
  label?: string;
  error?: string | boolean;
  helperText?: string;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
  icon?: React.ReactNode;
  isRequired?: boolean;
  isDisabled?: boolean;
  isInvalid?: boolean;
  size?: 'small' | 'medium';
  name?: string;
  id?: string;
  className?: string;
}

/**
 * Input component for text entry
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftElement,
      rightElement,
      icon,
      isRequired = false,
      isDisabled = false,
      isInvalid = false,
      size = 'medium',
      name,
      id,
      className,
      ...props
    },
    ref
  ) => {
    const theme = useTheme();
    // Material UI theme-based colors
    const inputBg = theme.palette.mode === 'light' ? 'white' : theme.palette.grey[800];
    const borderColor = theme.palette.mode === 'light' ? theme.palette.grey[200] : theme.palette.grey[700];
    const labelColor = theme.palette.mode === 'light' ? theme.palette.grey[700] : theme.palette.grey[300];

    return (
      <MuiFormControl 
        fullWidth 
        required={isRequired} 
        disabled={isDisabled}
        error={isInvalid || !!error}
        sx={{ mb: 3 }}
        className={className}
      >
        {label && (
          <Typography 
            component="label" 
            htmlFor={id || name}
            sx={{ 
              color: labelColor,
              fontSize: '0.875rem',
              fontWeight: 500,
              mb: 1,
              display: 'block'
            }}
          >
            {label}
          </Typography>
        )}

        <TextField
          inputRef={ref}
          id={id || name}
          name={name}
          error={isInvalid || !!error}
          size={size}
          disabled={isDisabled}
          InputProps={{
            startAdornment: leftElement ? (
              <InputAdornment position="start">{leftElement}</InputAdornment>
            ) : undefined,
            endAdornment: (rightElement || icon) ? (
              <InputAdornment position="end">{rightElement || icon}</InputAdornment>
            ) : undefined,
            sx: {
              bgcolor: inputBg,
              borderColor: borderColor,
              '&:hover': { 
                borderColor: !isInvalid ? theme.palette.grey[300] : undefined 
              },
              '&.Mui-focused': {
                borderColor: !isInvalid ? theme.palette.primary.main : undefined
              }
            }
          }}
          {...props}
        />

        {(error || helperText) && (
          <FormHelperText error={!!error}>
            {typeof error === 'string' ? error : helperText}
          </FormHelperText>
        )}
      </MuiFormControl>
    );
  }
);

Input.displayName = 'Input';

export default Input; 