import React, { useState } from 'react';
import { Button, ButtonProps } from '../ui/button';
import { Calendar, LoaderCircle } from 'lucide-react';

export interface TrialButtonProps extends Omit<ButtonProps, 'onClick'> {
  /**
   * Number of trial days
   */
  trialDays: number;
  /**
   * Plan tier for the trial
   */
  planTier: 'creator' | 'influencer' | 'enterprise';
  /**
   * Whether user already had a trial before
   */
  hadTrialBefore?: boolean;
  /**
   * Callback when trial is activated
   */
  onActivateTrial: (planTier: string) => Promise<void>;
  /**
   * Optional callback when trial can't be activated
   */
  onTrialError?: (error: Error) => void;
}

/**
 * TrialButton - Component to activate a free trial
 */
const TrialButton: React.FC<TrialButtonProps> = ({
  trialDays,
  planTier,
  hadTrialBefore = false,
  onActivateTrial,
  onTrialError,
  disabled,
  variant = "primary",
  size = "md",
  className = '',
  children,
  ...props
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleActivateTrial = async () => {
    if (disabled || isLoading) return;
    
    setIsLoading(true);
    try {
      await onActivateTrial(planTier);
    } catch (error) {
      onTrialError?.(error as Error);
      console.error("Error activating trial:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const buttonText = children || `Start ${trialDays}-Day Free Trial`;
  const isDisabled = disabled || hadTrialBefore;
  
  return (
    <Button
      variant={variant}
      size={size}
      className={`flex items-center gap-2 ${className}`}
      onClick={handleActivateTrial}
      disabled={isDisabled}
      {...props}
    >
      {isLoading ? (
        <LoaderCircle className="h-4 w-4 animate-spin" />
      ) : (
        <Calendar className="h-4 w-4" />
      )}
      <span>{buttonText}</span>
      {hadTrialBefore && (
        <span className="text-xs opacity-70 ml-1">(Trial already used)</span>
      )}
    </Button>
  );
};

export default TrialButton; 