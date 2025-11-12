import React from 'react';
import { Check, X } from 'lucide-react';
import { Button } from '../ui/button';

export interface PlanFeature {
  /**
   * Feature title
   */
  title: string;
  /**
   * Detailed description of the feature
   */
  description?: string;
  /**
   * Whether the feature is included in this plan
   */
  included: boolean;
  /**
   * Optional limitation text (e.g., "Up to 10 users")
   */
  limitation?: string;
}

export interface PlanCardProps {
  /**
   * Plan name (e.g., "Creator", "Influencer", "Enterprise")
   */
  name: string;
  /**
   * Plan description
   */
  description: string;
  /**
   * Monthly price in dollars
   */
  monthlyPrice: number | null;
  /**
   * Yearly price in dollars (if applicable)
   */
  yearlyPrice?: number | null;
  /**
   * Whether to display yearly pricing
   */
  showYearly?: boolean;
  /**
   * Percentage discount for yearly billing
   */
  yearlyDiscount?: number;
  /**
   * Array of plan features
   */
  features: PlanFeature[];
  /**
   * Whether this is the most popular plan
   */
  isPopular?: boolean;
  /**
   * Whether this is the user's current plan
   */
  isCurrentPlan?: boolean;
  /**
   * Whether this requires custom pricing
   */
  isCustomPricing?: boolean;
  /**
   * Optional badge text (e.g., "MOST POPULAR")
   */
  badgeText?: string;
  /**
   * Callback for when the user selects this plan
   */
  onSelect?: () => void;
  /**
   * Optional className for additional styling
   */
  className?: string;
}

/**
 * PlanCard - Component to display a subscription plan option
 */
export const PlanCard: React.FC<PlanCardProps> = ({
  name,
  description,
  monthlyPrice,
  yearlyPrice,
  showYearly = false,
  yearlyDiscount = 0,
  features,
  isPopular = false,
  isCurrentPlan = false,
  isCustomPricing = false,
  badgeText,
  onSelect,
  className = ''
}) => {
  const priceToDisplay = showYearly ? yearlyPrice : monthlyPrice;
  const billingPeriod = showYearly ? '/year' : '/month';
  
  // If no badge text is provided but the plan is popular, use default
  const displayBadgeText = badgeText || (isPopular ? 'MOST POPULAR' : '');
  
  return (
    <div 
      className={`relative flex flex-col rounded-lg border p-6 shadow-sm transition-all
        ${isPopular ? 'border-primary shadow-md' : 'border-gray-200'}
        ${className}`}
    >
      {displayBadgeText && (
        <div className="absolute -top-3 right-6 rounded-full bg-primary px-3 py-1 text-xs font-medium text-white">
          {displayBadgeText}
        </div>
      )}
      
      <div className="mb-4">
        <h3 className="text-xl font-bold">{name}</h3>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>
      
      <div className="mb-6">
        {isCustomPricing ? (
          <div className="flex items-baseline">
            <span className="text-3xl font-bold">Custom</span>
            <span className="ml-1 text-sm text-gray-500">pricing</span>
          </div>
        ) : (
          <div className="flex items-baseline">
            <span className="text-3xl font-bold">
              {priceToDisplay !== null ? `$${priceToDisplay}` : 'Free'}
            </span>
            {priceToDisplay !== null && (
              <span className="ml-1 text-sm text-gray-500">{billingPeriod}</span>
            )}
          </div>
        )}
        
        {yearlyDiscount > 0 && showYearly && (
          <p className="mt-1 text-sm text-green-600">
            Save {yearlyDiscount}% with annual billing
          </p>
        )}
      </div>
      
      <ul className="mb-8 space-y-3 text-sm">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start">
            <div className="mr-2 mt-0.5">
              {feature.included ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <X className="h-4 w-4 text-gray-300" />
              )}
            </div>
            <div>
              <p className={`${!feature.included ? 'text-gray-400' : ''}`}>
                {feature.title}
                {feature.limitation && (
                  <span className="ml-1 text-xs text-gray-500">
                    ({feature.limitation})
                  </span>
                )}
              </p>
              {feature.description && feature.included && (
                <p className="mt-0.5 text-xs text-gray-500">{feature.description}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
      
      <div className="mt-auto">
        <Button
          variant={isPopular ? "default" : "outline"}
          className="w-full"
          onClick={onSelect}
          disabled={isCurrentPlan}
        >
          {isCurrentPlan ? 'Current Plan' : isCustomPricing ? 'Contact Sales' : 'Select Plan'}
        </Button>
        
        {isCurrentPlan && (
          <p className="mt-2 text-center text-xs text-gray-500">
            Your current subscription
          </p>
        )}
      </div>
    </div>
  );
};

export default PlanCard; 