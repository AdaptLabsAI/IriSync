import { User } from '../../models/User';

// Define the event mapping from our system to TikTok Pixel
const eventMapping: Record<string, string> = {
  'page_view': 'PageView',
  'signup': 'CompleteRegistration',
  'token_purchase': 'Purchase',
  'subscription_start': 'Subscribe',
  'content_generate': 'Contact',
  'post_publish': 'SubmitForm',
  'login': 'Login',
  'search': 'Search'
};

/**
 * Initialize TikTok Pixel
 * @param pixelId The TikTok Pixel ID
 */
export function initTikTokPixel(pixelId: string): void {
  if (typeof window === 'undefined' || !pixelId) return;

  // Initialize the TikTok pixel
  window.ttq = window.ttq || {
    _o: {},
    _e: [],
    ready: function(f) {
      this._e.push(f);
    }
  };

  // Load the TikTok pixel script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=${pixelId}`;
  document.head.appendChild(script);

  // Initialize the pixel
  window.ttq.load(pixelId);
  window.ttq.page();
}

/**
 * Identify user in TikTok Pixel
 * @param user The user to identify
 */
export function identifyUserTikTokPixel(user: User): void {
  if (typeof window === 'undefined' || !window.ttq) return;

  // Use advanced matching (limited options in TikTok compared to FB)
  if (user.email) {
    window.ttq.identify({
      email: user.email,
      external_id: user.id
    });
  }
}

/**
 * Track an event in TikTok Pixel
 * @param eventName The name of the event
 * @param properties Properties associated with the event
 */
export function trackEventTikTokPixel(
  eventName: string, 
  properties: Record<string, any> = {}
): void {
  if (typeof window === 'undefined' || !window.ttq) return;

  // Map to standard TikTok events if possible
  const ttEvent = eventMapping[eventName];
  
  // Track as appropriate event type
  if (ttEvent) {
    window.ttq.track(ttEvent, properties);
  } else {
    // TikTok doesn't support custom events in the same way as FB,
    // so we use a generic track
    window.ttq.track('CustomEvent', {
      ...properties,
      event_name: eventName
    });
  }
}

/**
 * Track page view in TikTok Pixel
 */
export function trackPageViewTikTokPixel(): void {
  if (typeof window === 'undefined' || !window.ttq) return;

  window.ttq.page();
}

/**
 * Track purchase in TikTok Pixel
 * @param value The purchase value
 * @param currency The currency code (e.g., USD)
 * @param contentIds Optional array of product IDs
 */
export function trackPurchaseTikTokPixel(
  value: number,
  currency: string,
  contentIds?: string[]
): void {
  if (typeof window === 'undefined' || !window.ttq) return;

  window.ttq.track('Purchase', {
    value: value,
    currency: currency,
    content_ids: contentIds
  });
}

/**
 * Track subscription in TikTok Pixel
 * @param value The subscription value
 * @param currency The currency code
 */
export function trackSubscriptionTikTokPixel(
  value: number,
  currency: string
): void {
  if (typeof window === 'undefined' || !window.ttq) return;

  window.ttq.track('Subscribe', {
    value: value,
    currency: currency
  });
}

// Types for window object
declare global {
  interface Window {
    ttq: {
      load: (id: string) => void;
      page: () => void;
      track: (eventName: string, params?: any) => void;
      identify: (userData: any) => void;
      _o: any;
      _e: any[];
      ready: (f: () => void) => void;
    };
  }
}
