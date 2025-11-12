import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { Button } from '../ui/button/Button';

export interface LoginButtonProps {
  /**
   * Additional classes to apply to the button
   */
  className?: string;
  /**
   * Button size variant
   */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /**
   * Button variant style
   */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  /**
   * Button text
   */
  children?: React.ReactNode;
  /**
   * Whether the button should take full width of its container
   */
  fullWidth?: boolean;
  /**
   * Icon to display on the left side
   */
  leftIcon?: React.ReactNode;
  /**
   * Whether to use a link instead of button
   */
  asLink?: boolean;
  /**
   * URL to navigate to when asLink is true
   */
  href?: string;
  /**
   * Function to handle login
   */
  onLogin?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  /**
   * Whether the button is in loading state
   */
  isLoading?: boolean;
}

/**
 * LoginButton component for user authentication
 */
export const LoginButton: React.FC<LoginButtonProps> = ({
  className,
  size = 'md',
  variant = 'primary',
  children = 'Log In',
  fullWidth = false,
  leftIcon,
  asLink = false,
  href = '/auth/login',
  onLogin,
  isLoading = false,
}) => {
  const router = useRouter();
  const [loading, setLoading] = useState(isLoading);

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (asLink) {
      e.preventDefault();
      router.push(href);
      return;
    }
    
    if (onLogin) {
      setLoading(true);
      try {
        await onLogin(e);
      } catch (error) {
        console.error('Login failed:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      fullWidth={fullWidth}
      className={className}
      onClick={handleClick}
      leftIcon={leftIcon}
      loading={loading}
      disabled={loading}
      aria-label="Log in to your account"
    >
      {children}
    </Button>
  );
};

export default LoginButton; 