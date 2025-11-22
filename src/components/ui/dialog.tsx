/**
 * Dialog Component
 *
 * Canonical API:
 * - Dialog (root container, supports both open/onOpenChange AND isOpen/onClose)
 * - DialogTrigger (trigger button with asChild support)
 * - DialogContent (content wrapper)
 * - DialogHeader (header wrapper, accepts className)
 * - DialogTitle (title)
 * - DialogDescription (description text)
 * - DialogClose (close button with asChild support)
 * - DialogFooter (footer actions)
 *
 * Props API supports both styles:
 * - Radix: open + onOpenChange
 * - MUI: isOpen + onClose
 */
import React, { createContext, useContext } from 'react';
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
  open?: boolean;
  onClose?: () => void;
  onOpenChange?: (open: boolean) => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
}

const sizeToMaxWidth = {
  'xs': 'xs',
  'sm': 'sm',
  'md': 'md',
  'lg': 'lg',
  'xl': 'xl',
  'full': false
} as const;

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
              size="small"
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

export interface DialogTriggerProps {
  asChild?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export const DialogTrigger: React.FC<DialogTriggerProps> = ({ asChild, children, onClick, className }) => {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onClick,
      className
    });
  }

  return (
    <button onClick={onClick} className={className}>
      {children}
    </button>
  );
};

export const DialogClose: React.FC<{
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode;
  asChild?: boolean;
}> = ({ onClick, className, children, asChild = false }) => {
  const dialogClose = useContext(DialogCloseContext);

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
    if (dialogClose) {
      dialogClose();
    }
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onClick: handleClick,
      className
    });
  }

  return (
    <button onClick={handleClick} className={className}>
      {children || 'Close'}
    </button>
  );
};

export default Dialog;
