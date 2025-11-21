import React from 'react';
import {
  Alert as MuiAlert,
  AlertTitle,
  IconButton,
  Box,
  Stack,
  AlertProps as MuiAlertProps,
  AlertColor,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

// Use MUI's AlertColor type instead of our custom type
export type AlertSeverity = AlertColor;
export type AlertVariant = 'standard' | 'filled' | 'outlined';

// Use proper type extension
export interface AlertProps extends Omit<MuiAlertProps, 'variant'> {
  title?: string;
  description?: string;
  variant?: AlertVariant;
  isClosable?: boolean;
  onClose?: () => void;
  icon?: React.ReactElement;
  className?: string;
  action?: React.ReactNode;
}

/**
 * Alert component for displaying important messages
 */
const Alert: React.FC<AlertProps> = ({
  title,
  description,
  severity = 'info',
  variant = 'standard',
  isClosable = false,
  onClose,
  icon,
  className,
  children,
  action,
  ...rest
}) => {
  return (
    <MuiAlert
      severity={severity}
      variant={variant}
      icon={icon}
      className={className}
      action={
        action || (isClosable ? (
          <IconButton
            aria-label="close"
            color="inherit"
            size="sm"
            onClick={onClose}
          >
            <CloseIcon fontSize="inherit" />
          </IconButton>
        ) : undefined)
      }
      {...rest}
    >
      {title && <AlertTitle>{title}</AlertTitle>}
      {description && <div>{description}</div>}
      {children}
    </MuiAlert>
  );
};

/**
 * Utility function to create specific alert variants
 */
export const createAlert = (severity: AlertSeverity) => {
  const AlertComponent = (props: Omit<AlertProps, 'severity'>) => <Alert severity={severity} {...props} />;
  AlertComponent.displayName = `${severity.charAt(0).toUpperCase() + severity.slice(1)}Alert`;
  return AlertComponent;
};

/**
 * Pre-configured alert components
 */
export const InfoAlert = createAlert('info');
export const WarningAlert = createAlert('warning');
export const SuccessAlert = createAlert('success');
export const ErrorAlert = createAlert('error');

Alert.displayName = 'Alert';

export default Alert; 