'use client';

import React, { createContext, useContext, useState } from 'react';
import {
  Box,
  Button,
  Container,
  Typography,
  Switch,
  Stack,
  Alert as MuiAlert,
  CircularProgress,
  CardMedia,
  TextField,
  Chip,
  Select as MuiSelect,
  Grid,
  Card,
  CardContent,
  IconButton,
  Modal,
  useTheme,
  Snackbar,
  AlertProps
} from '@mui/material';
import { alpha, styled } from '@mui/material/styles';

// Re-export MUI components
export {
  Box,
  Button,
  Container,
  CircularProgress as Spinner,
  CardMedia as Image,
  TextField as Input,
  Chip as Badge,
  Grid as SimpleGrid,
  Card,
  CardContent as CardBody,
  IconButton
};

// Rename and export Typography as Heading/Text
export const Heading = Typography;
export const Text = Typography;

// Vertical and Horizontal Stack exports
export const VStack = (props: any) => <Stack direction="column" spacing={2} {...props} />;
export const HStack = (props: any) => <Stack direction="row" spacing={2} {...props} />;
export const Flex = (props: any) => <Box display="flex" {...props} />;

// Alert with icon
export const Alert = MuiAlert;

// Form Components
export const FormControl = ({ children, ...props }: { children: React.ReactNode, [key: string]: any }) => (
  <Box sx={{ mb: 2 }} {...props}>
    {children}
  </Box>
);

export const FormLabel = ({ children, ...props }: { children: React.ReactNode, [key: string]: any }) => (
  <Typography component="label" fontWeight="medium" sx={{ mb: 1, display: 'block' }} {...props}>
    {children}
  </Typography>
);

// Toast/Notification Functionality
export interface NotificationOptions {
  title?: string;
  description?: string;
  duration?: number;
  variant?: 'filled' | 'outlined' | 'standard';
  vertical?: 'top' | 'bottom';
  horizontal?: 'left' | 'center' | 'right';
}

interface NotificationState {
  open: boolean;
  message: string;
  title?: string;
  severity: AlertProps['severity'];
  duration: number;
  variant: 'filled' | 'outlined' | 'standard';
  vertical: 'top' | 'bottom';
  horizontal: 'left' | 'center' | 'right';
}

const NotificationContext = createContext<{
  notify: (options: NotificationState) => void;
  closeNotification: () => void;
}>({
  notify: () => {},
  closeNotification: () => {},
});

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notification, setNotification] = useState<NotificationState>({
    open: false,
    message: '',
    severity: 'info',
    duration: 5000,
    variant: 'filled',
    vertical: 'top',
    horizontal: 'right',
  });

  const notify = (options: NotificationState) => {
    setNotification({
      ...notification,
      ...options,
      open: true,
    });
  };

  const closeNotification = () => {
    setNotification({ ...notification, open: false });
  };

  return (
    <NotificationContext.Provider value={{ notify, closeNotification }}>
      {children}
      <Snackbar
        open={notification.open}
        autoHideDuration={notification.duration}
        onClose={closeNotification}
        anchorOrigin={{
          vertical: notification.vertical,
          horizontal: notification.horizontal,
        }}
      >
        <MuiAlert
          onClose={closeNotification}
          severity={notification.severity}
          variant={notification.variant}
          sx={{ width: '100%' }}
        >
          {notification.title && (
            <Typography variant="subtitle2" component="div" fontWeight="bold">
              {notification.title}
            </Typography>
          )}
          {notification.message}
        </MuiAlert>
      </Snackbar>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  
  return {
    success: (options: NotificationOptions) => {
      context.notify({
        open: true,
        severity: 'success',
        message: options.description || '',
        title: options.title,
        duration: options.duration || 5000,
        variant: options.variant || 'filled',
        vertical: options.vertical || 'top',
        horizontal: options.horizontal || 'right',
      });
    },
    error: (options: NotificationOptions) => {
      context.notify({
        open: true,
        severity: 'error',
        message: options.description || '',
        title: options.title,
        duration: options.duration || 5000,
        variant: options.variant || 'filled', 
        vertical: options.vertical || 'top',
        horizontal: options.horizontal || 'right',
      });
    },
    warning: (options: NotificationOptions) => {
      context.notify({
        open: true,
        severity: 'warning',
        message: options.description || '',
        title: options.title,
        duration: options.duration || 5000,
        variant: options.variant || 'filled',
        vertical: options.vertical || 'top',
        horizontal: options.horizontal || 'right',
      });
    },
    info: (options: NotificationOptions) => {
      context.notify({
        open: true,
        severity: 'info',
        message: options.description || '',
        title: options.title,
        duration: options.duration || 5000,
        variant: options.variant || 'filled',
        vertical: options.vertical || 'top',
        horizontal: options.horizontal || 'right',
      });
    }
  };
};

// Dialog/Modal Components
export const useModal = (initialState = false) => {
  const [isOpen, setIsOpen] = React.useState(initialState);
  const onOpen = () => setIsOpen(true);
  const onClose = () => setIsOpen(false);
  
  return { isOpen, onOpen, onClose };
};

// Backward compatibility for existing code
export const useDisclosure = useModal;

// Select component
export const Select = ({ children, ...props }: { children: React.ReactNode, [key: string]: any }) => (
  <MuiSelect {...props}>{children}</MuiSelect>
); 