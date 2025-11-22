/**
 * Form Component
 *
 * Canonical API (ShadCN pattern):
 * - Form (root form wrapper)
 * - FormField (field wrapper with react-hook-form integration)
 * - FormItem (item container)
 * - FormLabel (label)
 * - FormControl (control wrapper)
 * - FormMessage (error/help message)
 *
 * This is a thin wrapper for react-hook-form integration
 */
import React from 'react';
import { Label } from './label';

export interface FormProps {
  onSubmit?: (e: React.FormEvent) => void;
  children: React.ReactNode;
  className?: string;
}

export const Form: React.FC<FormProps> = ({ onSubmit, children, className }) => {
  return (
    <form onSubmit={onSubmit} className={className}>
      {children}
    </form>
  );
};

export interface FormFieldProps {
  name: string;
  children: React.ReactNode;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({ children, className }) => {
  return <div className={`space-y-2 ${className || ''}`}>{children}</div>;
};

export interface FormItemProps {
  children: React.ReactNode;
  className?: string;
}

export const FormItem: React.FC<FormItemProps> = ({ children, className }) => {
  return <div className={`space-y-2 ${className || ''}`}>{children}</div>;
};

export interface FormLabelProps {
  children: React.ReactNode;
  htmlFor?: string;
  className?: string;
  required?: boolean;
}

export const FormLabel: React.FC<FormLabelProps> = ({ children, htmlFor, className, required }) => {
  return (
    <Label htmlFor={htmlFor} className={className}>
      {children}
      {required && <span className="text-destructive ml-1">*</span>}
    </Label>
  );
};

export interface FormControlProps {
  children: React.ReactNode;
  className?: string;
}

export const FormControl: React.FC<FormControlProps> = ({ children, className }) => {
  return <div className={className}>{children}</div>;
};

export interface FormMessageProps {
  children?: React.ReactNode;
  className?: string;
  error?: boolean;
}

export const FormMessage: React.FC<FormMessageProps> = ({ children, className, error }) => {
  if (!children) return null;

  return (
    <p className={`text-sm ${error ? 'text-destructive' : 'text-muted-foreground'} ${className || ''}`}>
      {children}
    </p>
  );
};

export default Form;
