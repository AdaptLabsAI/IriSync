import { useNotification, NotificationOptions } from '../mui-components';

// Define toast variants
export type ToastVariant = 'default' | 'success' | 'error' | 'warning' | 'info';

// Define toast positions
export type ToastPosition =
  | 'top'
  | 'top-right'
  | 'top-left'
  | 'bottom'
  | 'bottom-right'
  | 'bottom-left';

// Toast options interface
export interface ToastOptions {
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
  position?: ToastPosition;
  isClosable?: boolean;
  onClose?: () => void;
}

/**
 * Toast hook that provides a consistent notification API based on Material UI
 */
export function useToast() {
  const notification = useNotification();

  // Map toast positions to MUI notifications positions
  const mapPosition = (position: ToastPosition): { vertical: 'top' | 'bottom'; horizontal: 'left' | 'center' | 'right' } => {
    switch (position) {
      case 'top':
        return { vertical: 'top', horizontal: 'center' };
      case 'top-right':
        return { vertical: 'top', horizontal: 'right' };
      case 'top-left':
        return { vertical: 'top', horizontal: 'left' };
      case 'bottom':
        return { vertical: 'bottom', horizontal: 'center' };
      case 'bottom-right':
        return { vertical: 'bottom', horizontal: 'right' };
      case 'bottom-left':
        return { vertical: 'bottom', horizontal: 'left' };
      default:
        return { vertical: 'bottom', horizontal: 'right' };
    }
  };

  // Generic toast function
  const toast = ({ 
    title, 
    description, 
    variant = 'default', 
    duration = 5000, 
    position = 'bottom-right',
    onClose 
  }: ToastOptions) => {
    const { vertical, horizontal } = mapPosition(position);
    
    const notificationOptions: NotificationOptions = {
      title,
      description,
      duration,
      vertical,
      horizontal,
    };

    // Map variant to appropriate notification type
    switch (variant) {
      case 'success':
        notification.success(notificationOptions);
        break;
      case 'error':
        notification.error(notificationOptions);
        break;
      case 'warning':
        notification.warning(notificationOptions);
        break;
      case 'info':
      case 'default':
      default:
        notification.info(notificationOptions);
        break;
    }

    // Return a dummy ID to maintain compatibility with old API
    return Math.random().toString();
  };

  // Convenience methods for common toast variants
  const success = (options: Omit<ToastOptions, 'variant'>) => toast({ ...options, variant: 'success' });
  const error = (options: Omit<ToastOptions, 'variant'>) => toast({ ...options, variant: 'error' });
  const warning = (options: Omit<ToastOptions, 'variant'>) => toast({ ...options, variant: 'warning' });
  const info = (options: Omit<ToastOptions, 'variant'>) => toast({ ...options, variant: 'info' });

  // These are stubs to maintain compatibility with the old API
  // The Material UI notification system doesn't have these functions
  const closeAll = () => {
    console.warn('closeAll is not supported in the new notification system');
  };

  const close = (id: string) => {
    console.warn('close is not supported in the new notification system');
  };

  const update = (id: string, options: ToastOptions) => {
    console.warn('update is not supported in the new notification system');
    toast(options);
  };

  return {
    toast,
    success,
    error,
    warning,
    info,
    closeAll,
    close,
    update,
  };
}

export default useToast; 