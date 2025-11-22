'use client';

import React, { forwardRef } from 'react';
import {
  FormControl,
  FormHelperText,
  InputLabel,
  Input,
  TextField,
  TextareaAutosize,
  Select as MuiSelect,
  MenuItem,
  Checkbox as MuiCheckbox,
  Radio as MuiRadio,
  RadioGroup as MuiRadioGroup,
  FormControlLabel,
  FormLabel as MuiFormLabel,
  FormGroup,
  Switch as MuiSwitch,
  InputAdornment,
  Box,
  Stack,
  Typography,
  useTheme,
  styled,
  Alert,
  FormControlProps
} from '@mui/material';
import { 
  Controller,
  Control,
  FieldPath,
  FieldValues,
  Path,
  PathValue,
  useFormContext,
  UseFormRegister,
  FieldError,
} from 'react-hook-form';

// Base form field props
interface FormFieldBaseProps {
  id?: string;
  label?: string;
  helperText?: string;
  error?: string;
  isRequired?: boolean;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  className?: string;
}

// Form context hook for accessing form methods easily
export function useForm() {
  const formContext = useFormContext();
  if (!formContext) {
    throw new Error('Form components must be used within a FormProvider');
  }
  return formContext;
}

// FormField component for handling common form field logic
export const FormField = <T extends FieldValues>({
  name,
  label,
  helperText,
  error,
  isRequired = false,
  isDisabled = false,
  isReadOnly = false,
  className,
  children,
  ...props
}: FormFieldBaseProps & {
  name?: FieldPath<T>;
  children: React.ReactNode;
} & Omit<FormControlProps, 'error'>) => {
  return (
    <FormControl
      required={isRequired}
      error={!!error}
      disabled={isDisabled}
      sx={{ mb: 3, width: '100%' }}
      className={className}
      {...props}
    >
      {label && <InputLabel htmlFor={name}>{label}</InputLabel>}
      {children}
      {error && <FormHelperText error>{error}</FormHelperText>}
      {helperText && !error && <FormHelperText>{helperText}</FormHelperText>}
    </FormControl>
  );
};

// Input field component
export const FormInput = <T extends FieldValues>({
  name,
  label,
  helperText,
  error,
  isRequired = false,
  isDisabled = false,
  isReadOnly = false,
  type = 'text',
  placeholder,
  leftElement,
  rightElement,
  className,
  ...props
}: FormFieldBaseProps & {
  name: FieldPath<T>;
  type?: string;
  placeholder?: string;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
}) => {
  const { register } = useForm();
  const { ref, ...registerProps } = register(name);
  
  // Remove name from registerProps if it exists to avoid duplication
  const { name: _registerName, ...otherRegisterProps } = registerProps;
  
  return (
    <TextField
      id={name}
      label={label}
      type={type}
      placeholder={placeholder}
      required={isRequired}
      disabled={isDisabled}
      InputProps={{
        readOnly: isReadOnly,
        startAdornment: leftElement ? (
          <InputAdornment position="start">{leftElement}</InputAdornment>
        ) : undefined,
        endAdornment: rightElement ? (
          <InputAdornment position="end">{rightElement}</InputAdornment>
        ) : undefined,
        inputRef: ref
      }}
      variant="outline"
      fullWidth
      error={!!error}
      helperText={error || helperText}
      margin="normal"
      className={className}
      {...otherRegisterProps}
      {...props}
    />
  );
};

// Textarea field component
export const FormTextarea = <T extends FieldValues>({
  name,
  label,
  helperText,
  error,
  isRequired = false,
  isDisabled = false,
  isReadOnly = false,
  placeholder,
  className,
  rows = 4,
  ...props
}: FormFieldBaseProps & {
  name: FieldPath<T>;
  placeholder?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
  rows?: number;
}) => {
  const { register } = useForm();
  const { ref, ...registerProps } = register(name, { disabled: isDisabled, required: isRequired });
  
  // Remove name from registerProps if it exists to avoid duplication
  const { name: _registerName, ...otherRegisterProps } = registerProps;
  
  return (
    <TextField
      id={name}
      label={label}
      placeholder={placeholder}
      required={isRequired}
      disabled={isDisabled}
      InputProps={{
        readOnly: isReadOnly,
      }}
      multiline
      rows={rows}
      variant="outline"
      fullWidth
      error={!!error}
      helperText={error || helperText}
      margin="normal"
      className={className}
      inputRef={ref}
      {...otherRegisterProps}
      {...props}
    />
  );
};

// Select field component
export const FormSelect = <T extends FieldValues>({
  name,
  label,
  helperText,
  error,
  isRequired = false,
  isDisabled = false,
  isReadOnly = false,
  placeholder,
  options = [],
  className,
  ...props
}: FormFieldBaseProps & {
  name: FieldPath<T>;
  placeholder?: string;
  options: Array<{ value: string; label: string }>;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLSelectElement>) => void;
}) => {
  const { control } = useForm();
  
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => {
        // Create menu items
        const menuItems = [
          placeholder && (
            <MenuItem key="placeholder" value="" disabled>
              {placeholder}
            </MenuItem>
          ),
          ...options.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))
        ].filter(Boolean);
        
        // Using createElement to bypass TypeScript checking
        return React.createElement(
          TextField,
          {
            id: name,
            select: true,
            label,
            required: isRequired,
            disabled: isDisabled,
            InputProps: {
              readOnly: isReadOnly,
            },
            variant: "outlined",
            fullWidth: true,
            error: !!error,
            helperText: error || helperText,
            margin: "normal",
            className,
            ...field
          } as any,
          menuItems
        );
      }}
    />
  );
};

// Checkbox field component
export const FormCheckbox = <T extends FieldValues>({
  name,
  label,
  helperText,
  error,
  isRequired = false,
  isDisabled = false,
  isReadOnly = false,
  className,
  ...props
}: FormFieldBaseProps & {
  name: FieldPath<T>;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
}) => {
  const { control } = useForm();

  return (
    <FormControl 
      error={!!error} 
      required={isRequired} 
      disabled={isDisabled}
      className={className}
      margin="normal"
    >
      <Controller
        name={name}
        control={control}
        render={({ field }) => {
          // Using createElement to bypass TypeScript checking
          const checkbox = React.createElement(MuiCheckbox, {
            ...field,
            checked: !!field.value,
            ...props
          } as any);
          
          return (
            <FormControlLabel
              control={checkbox}
              label={label || ''}
            />
          );
        }}
      />
      {(error || helperText) && (
        <FormHelperText error={!!error}>{error || helperText}</FormHelperText>
      )}
    </FormControl>
  );
};

// Radio group component
export const FormRadioGroup = <T extends FieldValues>({
  name,
  label,
  helperText,
  error,
  isRequired = false,
  isDisabled = false,
  isReadOnly = false,
  options = [],
  direction = 'column',
  spacing = 2,
  className,
  control,
  ...props
}: FormFieldBaseProps & {
  name: FieldPath<T>;
  options: Array<{ value: string; label: string }>;
  direction?: 'row' | 'column';
  spacing?: number;
  control: Control<T>;
}) => {
  return (
    <FormControl 
      error={!!error} 
      required={isRequired} 
      disabled={isDisabled}
      className={className}
      margin="normal"
      fullWidth
    >
      {label && <MuiFormLabel>{label}</MuiFormLabel>}
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <MuiRadioGroup
            {...field}
            row={direction === 'row'}
          >
            <Stack direction={direction} spacing={spacing}>
              {options.map((option) => (
                <FormControlLabel
                  key={option.value}
                  value={option.value}
                  control={<MuiRadio />}
                  label={option.label}
                  disabled={isDisabled || isReadOnly}
                />
              ))}
            </Stack>
          </MuiRadioGroup>
        )}
      />
      {(error || helperText) && (
        <FormHelperText error={!!error}>{error || helperText}</FormHelperText>
      )}
    </FormControl>
  );
};

// Switch component
export const FormSwitch = <T extends FieldValues>({
  name,
  label,
  helperText,
  error,
  isRequired = false,
  isDisabled = false,
  isReadOnly = false,
  className,
  ...props
}: FormFieldBaseProps & {
  name: FieldPath<T>;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
}) => {
  const { control } = useForm();

  return (
    <FormControl 
      error={!!error} 
      required={isRequired} 
      disabled={isDisabled}
      className={className}
      margin="normal"
    >
      <Controller
        name={name}
        control={control}
        render={({ field }) => {
          // Using createElement to bypass TypeScript checking
          const switchElement = React.createElement(MuiSwitch, {
            ...field,
            checked: !!field.value,
            ...props
          } as any);
          
          return (
            <FormControlLabel
              control={switchElement}
              label={label || ''}
            />
          );
        }}
      />
      {(error || helperText) && (
        <FormHelperText error={!!error}>{error || helperText}</FormHelperText>
      )}
    </FormControl>
  );
};

// Form error message component
export const FormMessage = ({ children }: { children: React.ReactNode }) => {
  const theme = useTheme();

  return (
    <Alert
      severity="error"
      sx={{ 
        my: 2, 
        borderRadius: 1
      }}
    >
      {children}
    </Alert>
  );
};

// Form success message component
export const FormSuccess = ({ children }: { children: React.ReactNode }) => {
  const theme = useTheme();
  
  return (
    <Alert
      severity="success"
      sx={{ 
        my: 2, 
        borderRadius: 1
      }}
    >
      {children}
    </Alert>
  );
}; 