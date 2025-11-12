import React, { useState } from 'react';
import { Button } from '../ui/button';
import { ArrowUpRight, ArrowDownRight, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';

type PlanTier = 'free' | 'creator' | 'influencer' | 'enterprise';

interface SubscriptionButtonProps {
  /**
   * Current subscription plan of the user
   */
  currentPlan: PlanTier;
  /**
   * Target plan to upgrade or downgrade to
   */
  targetPlan: PlanTier;
  /**
   * Whether this is for upgrading or downgrading
   */
  actionType: 'upgrade' | 'downgrade';
  /**
   * Callback function when plan change is confirmed
   */
  onConfirm?: () => void;
  /**
   * Optional className for additional styling
   */
  className?: string;
  /**
   * Option to override default button size
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Whether to disable the button
   */
  disabled?: boolean;
  /**
   * Whether to show the button in a loading state
   */
  isLoading?: boolean;
  /**
   * Optional content to show when asking for confirmation
   */
  confirmationContent?: React.ReactNode;
  /**
   * Optional type of button
   */
  variant?: 'default' | 'outline' | 'secondary' | 'destructive' | 'ghost' | 'link';
}

// Plan tier hierarchy for upgrade/downgrade logic
const tierOrder: Record<PlanTier, number> = {
  'free': 0,
  'creator': 1,
  'influencer': 2,
  'enterprise': 3
};

// Plan tier display names
const tierNames: Record<PlanTier, string> = {
  'free': 'Free',
  'creator': 'Creator',
  'influencer': 'Influencer',
  'enterprise': 'Enterprise'
};

/**
 * SubscriptionButton - Button for upgrading or downgrading subscription plans
 */
export const SubscriptionButton: React.FC<SubscriptionButtonProps> = ({
  currentPlan,
  targetPlan,
  actionType = 'upgrade',
  onConfirm,
  className = '',
  size = 'md',
  disabled = false,
  isLoading = false,
  confirmationContent,
  variant = 'default'
}) => {
  const [open, setOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Validate if the action type matches the plan hierarchy
  const isValidUpgrade = tierOrder[targetPlan] > tierOrder[currentPlan];
  const isValidDowngrade = tierOrder[targetPlan] < tierOrder[currentPlan];
  const isValid = actionType === 'upgrade' ? isValidUpgrade : isValidDowngrade;
  
  // Button text and icon based on action type
  const getButtonText = () => {
    if (actionType === 'upgrade') {
      return `Upgrade to ${tierNames[targetPlan]}`;
    } else {
      return `Downgrade to ${tierNames[targetPlan]}`;
    }
  };
  
  const getButtonIcon = () => {
    if (actionType === 'upgrade') {
      return <ArrowUpRight className="h-4 w-4 mr-2" />;
    } else {
      return <ArrowDownRight className="h-4 w-4 mr-2" />;
    }
  };
  
  const handleConfirm = async () => {
    setProcessing(true);
    
    try {
      // This would be replaced with actual API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setSuccess(true);
      
      // Success cleanup after delay
      setTimeout(() => {
        if (onConfirm) {
          onConfirm();
        }
        setOpen(false);
        setSuccess(false);
      }, 1500);
    } catch (error) {
      console.error('Error changing subscription:', error);
    } finally {
      setProcessing(false);
    }
  };
  
  // Determine dialog content based on action type
  const getDialogContent = () => {
    if (confirmationContent) {
      return confirmationContent;
    }
    
    if (actionType === 'upgrade') {
      return (
        <div className="space-y-4">
          <p>
            You are about to upgrade from <strong>{tierNames[currentPlan]}</strong> to <strong>{tierNames[targetPlan]}</strong>.
          </p>
          <p>
            Your card will be charged immediately for the prorated amount for the remainder of your billing cycle.
          </p>
          <p>
            You'll get instant access to all {tierNames[targetPlan]} features.
          </p>
        </div>
      );
    } else {
      return (
        <div className="space-y-4">
          <p>
            You are about to downgrade from <strong>{tierNames[currentPlan]}</strong> to <strong>{tierNames[targetPlan]}</strong>.
          </p>
          <p>
            Your plan will be downgraded at the end of your current billing cycle. You'll continue to have access to {tierNames[currentPlan]} features until then.
          </p>
          <p className="text-amber-600">
            Note: You'll lose access to features exclusive to the {tierNames[currentPlan]} plan after downgrading.
          </p>
        </div>
      );
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={`flex items-center ${className}`}
          disabled={disabled || isLoading || !isValid}
          onClick={() => setOpen(true)}
        >
          {isLoading ? (
            <span className="animate-spin h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full" />
          ) : (
            getButtonIcon()
          )}
          {getButtonText()}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {actionType === 'upgrade' ? 'Upgrade Subscription' : 'Downgrade Subscription'}
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          {success ? (
            <div className="flex flex-col items-center justify-center space-y-3 py-6">
              <CheckCircle className="h-12 w-12 text-green-500" />
              <p className="text-center font-medium">
                {actionType === 'upgrade' 
                  ? 'Upgrade Successful!' 
                  : 'Downgrade Scheduled!'}
              </p>
              <p className="text-center text-sm text-gray-500">
                {actionType === 'upgrade'
                  ? `Your account has been upgraded to ${tierNames[targetPlan]}.`
                  : `Your account will be downgraded to ${tierNames[targetPlan]} at the end of your billing cycle.`}
              </p>
            </div>
          ) : (
            <>
              {getDialogContent()}
              
              <div className="flex justify-end gap-2 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={processing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={processing}
                  variant={actionType === 'downgrade' ? 'destructive' : 'default'}
                >
                  {processing ? (
                    <>
                      <span className="animate-spin h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full" />
                      Processing...
                    </>
                  ) : (
                    actionType === 'upgrade' ? 'Confirm Upgrade' : 'Confirm Downgrade'
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SubscriptionButton; 