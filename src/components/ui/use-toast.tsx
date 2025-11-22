'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Alert, Snackbar, AlertTitle, AlertColor } from '@mui/material';

interface ToastContextType {
  toast: (props: ToastProps) => void;
  close: (id: string) => void;
}

export interface ToastProps {
  title?: string;
  description: string;
  variant?: 'default' | 'destructive' | 'success';
  duration?: number;
  id?: string;
}

interface Toast extends ToastProps {
  id: string;
  open: boolean;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Global toast queue to handle toasts outside of context
const toastQueue: ToastProps[] = [];

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (props: ToastProps) => {
    const id = props.id || Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...props, id, open: true }]);

    if (props.duration !== Infinity) {
      setTimeout(() => {
        closeToast(id);
      }, props.duration || 5000);
    }
  };

  const closeToast = (id: string) => {
    setToasts((prev) =>
      prev.map((toast) =>
        toast.id === id ? { ...toast, open: false } : toast
      )
    );

    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 300);
  };

  // Process toasts from the global queue
  useEffect(() => {
    if (toastQueue.length > 0) {
      const props = toastQueue.shift();
      if (props) {
        addToast(props);
      }
    }
  }, [toasts]);

  return (
    <ToastContext.Provider value={{ toast: addToast, close: closeToast }}>
      {children}
      {toasts.map((toast) => (
        <Snackbar
          key={toast.id}
          open={toast.open}
          autoHideDuration={toast.duration || 5000}
          onClose={() => closeToast(toast.id)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert
            onClose={() => closeToast(toast.id)}
            severity={getAlertSeverity(toast.variant)}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {toast.title && <AlertTitle>{toast.title}</AlertTitle>}
            {toast.description}
          </Alert>
        </Snackbar>
      ))}
    </ToastContext.Provider>
  );
}

function getAlertSeverity(variant?: 'default' | 'destructive' | 'success'): AlertColor {
  switch (variant) {
    case 'destructive':
      return 'error';
    case 'success':
      return 'success';
    default:
      return 'info';
  }
}

export function useToast() {
  const context = useContext(ToastContext);

  if (context === undefined) {
    console.trace('useToast called outside ToastProvider'); // Debug trace
    throw new Error('useToast must be used within a ToastProvider');
  }

  return context;
}

export const toast = {
  custom: (props: ToastProps) => {
    toastQueue.push(props);
    window.dispatchEvent(new Event('toast-queue-updated'));
  },

  default: (props: Omit<ToastProps, 'variant'>) => {
    toast.custom({ ...props, variant: 'primary' });
  },

  error: (props: Omit<ToastProps, 'variant'>) => {
    toast.custom({ ...props, variant: 'destructive' });
  },

  success: (props: Omit<ToastProps, 'variant'>) => {
    toast.custom({ ...props, variant: 'success' });
  },
};

// Listen for queue updates to trigger ToastProvider re-render
if (typeof window !== 'undefined') {
  window.addEventListener('toast-queue-updated', () => {
    // Empty listener to trigger useEffect in ToastProvider
  });
}