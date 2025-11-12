'use client';

import React, { forwardRef } from 'react';
import {
  TextField,
  FormControl,
  FormHelperText,
  Typography
} from '@mui/material';
import { useTheme } from '@mui/material/styles';

export interface TextareaProps {
  label?: string;
  error?: string;
  helperText?: string;
  isRequired?: boolean;
  isDisabled?: boolean;
  isInvalid?: boolean;
  size?: 'small' | 'medium';
  minRows?: number;
  maxRows?: number;
  name?: string;
  id?: string;
  className?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  [key: string]: any;
}

/**
 * Textarea component for multi-line text input
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      helperText,
      isRequired = false,
      isDisabled = false,
      isInvalid = false,
      size = 'medium',
      minRows = 4,
      maxRows = 10,
      name,
      id,
      className,
      value,
      onChange,
      placeholder,
      ...props
    },
    ref
  ) => {
    const theme = useTheme();

    // Size-based configurations
    const sizeConfig = {
      small: { minRows: minRows || 3 },
      medium: { minRows: minRows || 4 }
    };

    return (
      <FormControl
        required={isRequired}
        error={isInvalid || !!error}
        disabled={isDisabled}
        fullWidth
        sx={{ mb: 3 }}
        className={className}
      >
        {label && (
          <Typography 
            component="label" 
            htmlFor={id || name}
            sx={{ 
              color: theme.palette.mode === 'light' ? theme.palette.grey[700] : theme.palette.grey[300],
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
          multiline
          {...sizeConfig[size as keyof typeof sizeConfig]}
          maxRows={maxRows}
          error={isInvalid || !!error}
          size={size}
          disabled={isDisabled}
          value={value || ''}
          onChange={onChange}
          placeholder={placeholder}
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: theme.palette.mode === 'light' ? 'white' : theme.palette.grey[800],
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: !isInvalid ? theme.palette.grey[300] : undefined
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: !isInvalid ? theme.palette.primary.main : undefined
              }
            }
          }}
          {...props}
        />

        {(error || helperText) && (
          <FormHelperText error={!!error}>
            {error || helperText}
          </FormHelperText>
        )}
      </FormControl>
    );
  }
);

Textarea.displayName = 'Textarea';

// Export aliases for different naming conventions
export const TextArea = Textarea;

export default Textarea; 