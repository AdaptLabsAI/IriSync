import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { Button } from '../ui/button/Button';

export interface SignUpButtonProps {
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
   * Function to handle signup
   */
  onSignUp?: (e: React.MouseEvent<HTMLButtonElement>) => Promise<void>;
  /**
   * Whether the button is in loading state
   */
  isLoading?: boolean;
  /**
   * Additional plan parameter to pre-select a subscription plan
   */
  plan?: 'creator' | 'influencer' | 'enterprise';
}

/**
 * SignUpButton component for user registration
 */
export const SignUpButton: React.FC<SignUpButtonProps> = ({
  className,
  size = 'md',
  variant = 'primary',
  children = 'Sign Up',
  fullWidth = false,
  leftIcon,
  asLink = false,
  href = '/auth/register',
  onSignUp,
  isLoading = false,
  plan,
}) => {
  const router = useRouter();
  const [loading, setLoading] = useState(isLoading);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (asLink) {
      e.preventDefault();
      // If plan is specified, add it as a query parameter
      const url = plan ? `${href}?plan=${plan}` : href;
      router.push(url);
      return;
    }
    
    if (onSignUp) {
      setLoading(true);
      setError(null);
      try {
        await onSignUp(e);
      } catch (error) {
        console.error('Sign up failed:', error);
        setError(error instanceof Error ? error.message : 'Sign up failed');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        fullWidth={fullWidth}
        className={className}
        onClick={handleClick}
        leftIcon={leftIcon}
        loading={loading}
        disabled={loading}
        aria-label="Sign up for an account"
      >
        {children}
      </Button>
      
      {error && <div className="text-destructive text-sm mt-1">{error}</div>}
    </>
  );
};

export default SignUpButton; 