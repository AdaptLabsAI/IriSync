import { User } from '../../models/User';

// Define the event mapping from our system to Meta Pixel
const eventMapping: Record<string, string> = {
  'page_view': 'PageView',
  'signup': 'CompleteRegistration',
  'login': 'Lead',
  'token_purchase': 'Purchase',
  'subscription_start': 'Subscribe',
  'post_publish': 'CustomizeProduct',
  'content_generate': 'CustomizeProduct',
  'platform_connect': 'AddToWishlist'
};

/**
 * Initialize Meta Pixel
 * @param pixelId The Meta Pixel ID
 */
export function initMetaPixel(pixelId: string): void {
  if (typeof window === 'undefined' || !pixelId) return;

  // Initialize the Facebook pixel
  window.fbq = window.fbq || function() {
    window._fbq = window._fbq || [];
    window._fbq.push(arguments);
  };

  // Load the pixel code
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://connect.facebook.net/en_US/fbevents.js';
  document.head.appendChild(script);

  // Initialize the pixel
  window.fbq('init', pixelId);
}

/**
 * Identify user in Meta Pixel
 * @param user The user to identify
 */
export function identifyUserMetaPixel(user: User): void {
  if (typeof window === 'undefined' || !window.fbq) return;

  // Advanced matching parameters
  const userData: Record<string, any> = {
    external_id: user.id
  };

  if (user.email) {
    userData.email = user.email;
  }

  if (user.firstName && user.lastName) {
    userData.first_name = user.firstName;
    userData.last_name = user.lastName;
  }

  if (user.phone) {
    userData.phone = user.phone;
  }

  // Initialize with user data
  window.fbq('init', process.env.NEXT_PUBLIC_META_PIXEL_ID || '', userData);
}

/**
 * Track an event in Meta Pixel
 * @param eventName The name of the event
 * @param properties Properties associated with the event
 */
export function trackEventMetaPixel(
  eventName: string, 
  properties: Record<string, any> = {}
): void {
  if (typeof window === 'undefined' || !window.fbq) return;

  // Map to standard Facebook events if possible
  const fbEvent = eventMapping[eventName];
  
  // Track as appropriate event type
  if (fbEvent) {
    window.fbq('track', fbEvent, properties);
  } else {
    // Use custom event if not mapped
    window.fbq('trackCustom', eventName, properties);
  }
}

/**
 * Track page view in Meta Pixel
 */
export function trackPageViewMetaPixel(): void {
  if (typeof window === 'undefined' || !window.fbq) return;

  window.fbq('track', 'PageView');
}

/**
 * Track purchase in Meta Pixel
 * @param value The purchase value
 * @param currency The currency code (e.g., USD)
 * @param contentIds Optional array of product IDs
 * @param contentType The content type
 */
export function trackPurchaseMetaPixel(
  value: number,
  currency: string,
  contentIds?: string[],
  contentType: string = 'product'
): void {
  if (typeof window === 'undefined' || !window.fbq) return;

  window.fbq('track', 'Purchase', {
    value: value,
    currency: currency,
    content_ids: contentIds,
    content_type: contentType
  });
}

/**
 * Track subscription in Meta Pixel
 * @param tier The subscription tier
 * @param value The subscription value
 * @param currency The currency code
 * @param isAnnual Whether it's an annual subscription
 */
export function trackSubscriptionMetaPixel(
  tier: string,
  value: number,
  currency: string,
  isAnnual: boolean = false
): void {
  if (typeof window === 'undefined' || !window.fbq) return;

  window.fbq('track', 'Subscribe', {
    value: value,
    currency: currency,
    predicted_ltv: isAnnual ? value : value * 12,
    subscription_tier: tier,
    frequency: isAnnual ? 'annual' : 'monthly'
  });
}

// Types for window object
declare global {
  interface Window {
    _fbq: any[];
    fbq: (...args: any[]) => void;
  }
}
