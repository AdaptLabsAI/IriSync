import React, { useState, createContext, useContext } from 'react';
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

// Context to provide close handler to DialogClose
const DialogCloseContext = createContext<(() => void) | undefined>(undefined);

export interface DialogProps extends Omit<MuiDialogProps, 'title' | 'open'> {
  isOpen?: boolean;
  open?: boolean;  // Support Radix UI style prop
  onClose?: () => void;
  onOpenChange?: (open: boolean) => void;  // Support Radix UI style prop
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
 * Supports both Material-UI style (isOpen/onClose) and Radix UI style (open/onOpenChange)
 */
export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  open,
  onClose,
  onOpenChange,
  title,
  children,
  footer,
  size = 'md',
  className,
  ...props
}) => {
  // Support both prop styles
  const dialogOpen = open !== undefined ? open : (isOpen !== undefined ? isOpen : false);
  const handleClose = () => {
    if (onOpenChange) {
      onOpenChange(false);
    } else if (onClose) {
      onClose();
    }
  };

  return (
    <DialogCloseContext.Provider value={handleClose}>
      <MuiDialog
        open={dialogOpen}
        onClose={handleClose}
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
              onClick={handleClose}
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
    </DialogCloseContext.Provider>
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
            variant="text" 
            onClick={onClose}
            disabled={isLoading}
            sx={{ mr: 1 }}
          >
            {cancelLabel}
          </Button>
          <Button
            variant="contained"
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
export const DialogHeader = ({ children, className, ...props }: { children: React.ReactNode; className?: string }) => (
  <MuiDialogTitle className={className} {...props}>{children}</MuiDialogTitle>
);
export const DialogTitle = MuiDialogTitle;
export const DialogDescription = ({ children, className, ...props }: { children: React.ReactNode; className?: string }) => (
  <Box
    sx={{
      fontSize: '0.875rem',
      color: 'text.secondary',
      mb: 2,
      mt: -0.5
    }}
    className={className}
    {...props}
  >
    {children}
  </Box>
);
export const DialogFooter = MuiDialogActions;

/**
 * DialogClose - Close button for dialog
 * Can be used as a standalone close button within dialog content
 * Supports 'asChild' prop to merge with a single child element
 * Automatically calls the dialog's close handler from context
 */
export const DialogClose: React.FC<{
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode;
  asChild?: boolean;
}> = ({ onClick, className, children, asChild = false }) => {
  const dialogClose = useContext(DialogCloseContext);

  const handleClick = (e?: React.MouseEvent) => {
    onClick?.(e as React.MouseEvent);
    dialogClose?.();
  };

  // If asChild is true, clone the single child and merge onClick
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      onClick: (e: React.MouseEvent) => {
        handleClick(e);
        // Call the child's original onClick if it exists
        if (children.props.onClick) {
          children.props.onClick(e);
        }
      }
    } as any);
  }

  // Default rendering
  return (
    <IconButton
      aria-label="close"
      onClick={handleClick}
      className={className}
      sx={{
        position: 'absolute',
        right: 8,
        top: 8,
      }}
      size="sm"
    >
      {children || <CloseIcon fontSize="small" />}
    </IconButton>
  );
};

export default Dialog; 