import React from 'react';
import { Dialog, DialogProps } from './dialog';
import { Button } from './button';

export interface AlertDialogProps extends Omit<DialogProps, 'footer'> {
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

/**
 * AlertDialog component for confirmation dialogs
 */
export const AlertDialog: React.FC<AlertDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
  children,
  ...props
}) => {
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      onClose();
    }
  };

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
  };

  const variantColor = {
    danger: 'error',
    warning: 'warning',
    info: 'primary'
  }[variant] as 'error' | 'warning' | 'primary';

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      footer={
        <>
          <Button 
            variant="text" 
            onClick={handleCancel}
            disabled={isLoading}
            sx={{ mr: 1 }}
          >
            {cancelText}
          </Button>
          <Button
            variant="contained"
            color={variantColor}
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {confirmText}
          </Button>
        </>
      }
      size="sm"
      {...props}
    >
      {children}
    </Dialog>
  );
};

export default AlertDialog; 