import React, { useState } from 'react';
import { Button } from '../ui/button/Button';
import { Dialog } from '../ui/dialog';
import { Input } from '../ui/input/Input';

export interface PasswordResetButtonProps {
  /**
   * Button variant
   */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'link';
  /**
   * Button size
   */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /**
   * Additional classes to apply to the button
   */
  className?: string;
  /**
   * Custom button text
   */
  children?: React.ReactNode;
  /**
   * Function to handle the password reset request
   */
  onRequestReset?: (email: string) => Promise<void>;
  /**
   * Whether the button is disabled
   */
  disabled?: boolean;
  /**
   * Whether to take full width
   */
  fullWidth?: boolean;
  /**
   * Custom icon to display on the left side
   */
  leftIcon?: React.ReactNode;
  /**
   * Whether to show the dialog immediately
   */
  autoOpen?: boolean;
  /**
   * Initial email value
   */
  initialEmail?: string;
  /**
   * Whether to show as a link rather than a button
   */
  asLink?: boolean;
}

/**
 * PasswordResetButton component for initiating password reset flow
 */
export const PasswordResetButton: React.FC<PasswordResetButtonProps> = ({
  variant = 'link',
  size = 'md',
  className,
  children = 'Forgot password?',
  onRequestReset,
  disabled = false,
  fullWidth = false,
  leftIcon,
  autoOpen = false,
  initialEmail = '',
  asLink = true,
}) => {
  const [isOpen, setIsOpen] = useState(autoOpen);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleOpenDialog = () => {
    setIsOpen(true);
    setError(null);
    setSuccess(false);
  };

  const handleCloseDialog = () => {
    setIsOpen(false);
  };

  const handleSubmit = async () => {
    // Validate email
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (onRequestReset) {
        await onRequestReset(email);
      }
      setSuccess(true);
    } catch (error) {
      console.error('Password reset request failed:', error);
      setError(error instanceof Error ? error.message : 'Password reset request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={`${className} ${asLink ? 'underline hover:no-underline p-0 h-auto' : ''}`}
        onClick={handleOpenDialog}
        disabled={disabled}
        fullWidth={fullWidth}
        leftIcon={leftIcon}
      >
        {children}
      </Button>

      <Dialog
        isOpen={isOpen}
        onClose={handleCloseDialog}
        title="Reset Password"
      >
        <div className="p-4 flex flex-col gap-4">
          {!success ? (
            <>
              <p className="text-sm text-gray-600">
                Enter your email address and we'll send you a link to reset your password.
              </p>

              <div>
                <span className="block text-sm font-medium text-gray-900 mb-1">Email</span>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  fullWidth
                  autoFocus
                />
              </div>

              {error && (
                <div className="text-destructive text-sm">{error}</div>
              )}

              <div className="flex justify-end gap-2 mt-2">
                <Button
                  variant="outline"
                  size="md"
                  onClick={handleCloseDialog}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleSubmit}
                  loading={loading}
                  disabled={loading || !email}
                >
                  Reset Password
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-center my-4">
                <div className="bg-green-100 rounded-full p-3">
                  <CheckIcon className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <p className="text-center text-sm text-gray-600 mb-4">
                Password reset link sent! Please check your email.
              </p>
              <Button
                variant="primary"
                size="md"
                onClick={handleCloseDialog}
                fullWidth
              >
                Close
              </Button>
            </>
          )}
        </div>
      </Dialog>
    </>
  );
};

const CheckIcon = ({ className = '' }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export default PasswordResetButton; 