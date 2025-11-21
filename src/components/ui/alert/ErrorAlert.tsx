import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ensureUserDocument } from '@/lib/features/auth/client';

interface ErrorAlertProps {
  title?: string;
  message: string;
  error?: any;
  onRetry?: () => void;
  className?: string;
}

/**
 * Error Alert Component
 * 
 * Displays a formatted error message with special handling for permission denied errors
 */
export function ErrorAlert({ 
  title = 'Error', 
  message, 
  error, 
  onRetry,
  className = '' 
}: ErrorAlertProps) {
  const [isFixing, setIsFixing] = React.useState(false);
  
  // Check if this is a permission denied error
  const isPermissionDenied = 
    error?.code === 'permission-denied' || 
    error?.error?.code === 'permission-denied' ||
    message?.includes('Permission denied') ||
    error?.message?.includes('Permission denied');
  
  // Handle trying to fix permission denied errors
  const handleFixPermissions = async () => {
    setIsFixing(true);
    try {
      // Try to ensure the user document exists
      await ensureUserDocument(true);
      
      // If there's a retry handler, call it
      if (onRetry) {
        onRetry();
      }
    } catch (fixError) {
      console.error('Error fixing permissions:', fixError);
    } finally {
      setIsFixing(false);
    }
  };
  
  return (
    <Alert variant="destructive" className={`border-red-500 ${className}`}>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{isPermissionDenied ? 'Permission Error' : title}</AlertTitle>
      <AlertDescription className="mt-2">
        {isPermissionDenied ? (
          <div>
            <p>
              You don't have permission to access this resource. This might be due to 
              missing user data in your account.
            </p>
            <div className="mt-4">
              <Button 
                variant="outline" 
                size="small" 
                onClick={handleFixPermissions}
                disabled={isFixing}
              >
                {isFixing ? (
                  <>
                    <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                    Fixing...
                  </>
                ) : (
                  <>
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    Fix & Retry
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <p>{message}</p>
        )}
        
        {onRetry && !isPermissionDenied && (
          <Button 
            variant="outline" 
            size="small" 
            onClick={onRetry} 
            className="mt-2"
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
} 