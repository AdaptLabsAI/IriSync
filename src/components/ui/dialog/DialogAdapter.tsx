import React from 'react';
import { Dialog } from './index';
import type { DialogProps } from './index';

interface DialogAdapterProps extends Omit<DialogProps, 'isOpen'> {
  open: boolean;
}

/**
 * Dialog adapter component to bridge between components using 'open' prop
 * and our Dialog component that uses 'isOpen'
 */
export const DialogAdapter: React.FC<DialogAdapterProps> = ({
  open,
  onClose,
  title,
  children,
  footer,
  size,
  className,
  ...props
}) => {
  return (
    <Dialog
      isOpen={open}
      onClose={onClose}
      title={title}
      footer={footer}
      size={size}
      className={className}
      {...props}
    >
      {children}
    </Dialog>
  );
};

export default DialogAdapter; 