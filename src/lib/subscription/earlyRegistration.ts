/**
 * Early Registration Pricing Module
 * Handles early bird discounts and promotional pricing for new registrations
 */

export interface EarlyRegistrationDiscount {
  isEligible: boolean;
  discountPercentage: number;
  originalPrice: number;
  discountedPrice: number;
  expiresAt: Date;
  reason?: string;
}

// Early bird pricing configuration
const EARLY_BIRD_CONFIG = {
  enabled: true,
  discountPercentage: 20, // 20% off for early registrations
  expiresAt: new Date('2024-12-31'), // End of early bird period
  maxRegistrations: 1000 // Limit early bird registrations
};

// Base pricing tiers
const BASE_PRICING = {
  creator: 29,
  influencer: 79,
  enterprise: 199
};

/**
 * Get early registration pricing for a subscription tier
 */
export function getEarlyRegistrationPrice(tier: string): EarlyRegistrationDiscount {
  const originalPrice = BASE_PRICING[tier as keyof typeof BASE_PRICING] || 0;
  
  // Check if early bird is still active
  const now = new Date();
  const isEligible = EARLY_BIRD_CONFIG.enabled && 
                    now < EARLY_BIRD_CONFIG.expiresAt && 
                    originalPrice > 0;
  
  if (!isEligible) {
    return {
      isEligible: false,
      discountPercentage: 0,
      originalPrice,
      discountedPrice: originalPrice,
      expiresAt: EARLY_BIRD_CONFIG.expiresAt,
      reason: 'Early bird promotion has expired or tier not eligible'
    };
  }
  
  const discountAmount = (originalPrice * EARLY_BIRD_CONFIG.discountPercentage) / 100;
  const discountedPrice = originalPrice - discountAmount;
  
  return {
    isEligible: true,
    discountPercentage: EARLY_BIRD_CONFIG.discountPercentage,
    originalPrice,
    discountedPrice: Math.round(discountedPrice * 100) / 100, // Round to 2 decimal places
    expiresAt: EARLY_BIRD_CONFIG.expiresAt
  };
}

/**
 * Check if early registration is currently available
 */
export function isEarlyRegistrationAvailable(): boolean {
  const now = new Date();
  return EARLY_BIRD_CONFIG.enabled && now < EARLY_BIRD_CONFIG.expiresAt;
}

/**
 * Get the remaining time for early bird pricing
 */
export function getEarlyBirdTimeRemaining(): { days: number; hours: number; minutes: number } {
  const now = new Date();
  const timeDiff = EARLY_BIRD_CONFIG.expiresAt.getTime() - now.getTime();
  
  if (timeDiff <= 0) {
    return { days: 0, hours: 0, minutes: 0 };
  }
  
  const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
  
  return { days, hours, minutes };
}

/**
 * Apply early bird discount to Stripe price
 */
export function applyEarlyBirdDiscountToStripe(priceId: string): string {
  // In a real implementation, you would map to discounted Stripe price IDs
  // For now, return the same price ID (discount would be applied via Stripe coupons)
  return priceId;
}

/**
 * Get promotional message for early bird pricing
 */
export function getEarlyBirdMessage(): string {
  const timeRemaining = getEarlyBirdTimeRemaining();
  
  if (timeRemaining.days === 0 && timeRemaining.hours === 0 && timeRemaining.minutes === 0) {
    return 'Early bird pricing has ended';
  }
  
  return `🎉 Early Bird Special: ${EARLY_BIRD_CONFIG.discountPercentage}% off! Only ${timeRemaining.days} days, ${timeRemaining.hours} hours remaining!`;
} 