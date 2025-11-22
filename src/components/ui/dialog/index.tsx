import React, { useState } from 'react';
import {
  Dialog as MuiDialog,
  DialogTitle as MuiDialogTitle,
  DialogContent as MuiDialogContent,
  DialogActions as MuiDialogActions,
  Button,
  DialogProps as MuiDialogProps,
  IconButton,
  Box
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

export interface DialogProps extends Omit<MuiDialogProps, 'title' | 'open'> {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
}

// Convert Chakra size to MUI maxWidth
const sizeToMaxWidth = {
  'xs': 'xs',
  'sm': 'sm',
  'md': 'md',
  'lg': 'lg',
  'xl': 'xl',
  'full': false
} as const;

/**
 * Dialog component for modal interactions
 */
export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  className,
  ...props
}) => {
  return (
    <MuiDialog
      open={isOpen}
      onClose={onClose}
      maxWidth={sizeToMaxWidth[size] || 'md'}
      fullWidth={true}
      fullScreen={size === 'full'}
      className={className}
      {...props}
    >
      {title && (
        <MuiDialogTitle sx={{ px: 3, pt: 2, pb: 1 }}>
          {title}
          <IconButton
            aria-label="close"
            onClick={onClose}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
            }}
            size="sm"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </MuiDialogTitle>
      )}
      <MuiDialogContent sx={{ px: 3, py: 2 }}>
        {children}
      </MuiDialogContent>
      {footer && <MuiDialogActions sx={{ px: 3, py: 2 }}>{footer}</MuiDialogActions>}
    </MuiDialog>
  );
};

export interface DialogTriggerProps {
  children: React.ReactNode;
  trigger: React.ReactNode;
  title?: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  onOpen?: () => void;
  onClose?: () => void;
  isOpen?: boolean;
  className?: string;
}

/**
 * DialogTrigger component that includes a trigger element
 */
export const DialogTrigger: React.FC<DialogTriggerProps> = ({
  children,
  trigger,
  title,
  footer,
  size,
  onOpen: externalOnOpen,
  onClose: externalOnClose,
  isOpen: controlledIsOpen,
  className,
  ...props
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  
  const handleOpen = () => {
    if (externalOnOpen) {
      externalOnOpen();
    } else {
      setInternalIsOpen(true);
    }
  };
  
  const handleClose = () => {
    if (externalOnClose) {
      externalOnClose();
    } else {
      setInternalIsOpen(false);
    }
  };

  return (
    <>
      {React.cloneElement(trigger as React.ReactElement, { onClick: handleOpen })}
      <Dialog
        isOpen={isOpen}
        onClose={handleClose}
        title={title}
        footer={footer}
        size={size}
        className={className}
        {...props}
      >
        {children}
      </Dialog>
    </>
  );
};

/**
 * Pre-configured dialog components
 */
export const ConfirmDialog: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  variant?: 'danger' | 'warning' | 'info';
}> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isLoading = false,
  variant = 'danger',
}) => {
  const variantColor = {
    danger: 'error',
    warning: 'warning',
    info: 'primary'
  }[variant] as 'error' | 'warning' | 'primary';

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button 
            variant="ghost" 
            onClick={onClose}
            disabled={isLoading}
            sx={{ mr: 1 }}
          >
            {cancelLabel}
          </Button>
          <Button
            variant="primary"
            color={variantColor}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {confirmLabel}
          </Button>
        </>
      }
      size="sm"
    >
      <Box sx={{ py: 1 }}>
        {message}
      </Box>
    </Dialog>
  );
};

// Export individual dialog components for compatibility
export const DialogContent = MuiDialogContent;
export const DialogHeader = ({ children, ...props }: { children: React.ReactNode }) => (
  <MuiDialogTitle {...props}>{children}</MuiDialogTitle>
);
export const DialogTitle = MuiDialogTitle;
export const DialogFooter = MuiDialogActions;

export default Dialog; 