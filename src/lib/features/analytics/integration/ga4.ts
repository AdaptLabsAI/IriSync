import { User } from '../../models/User';
import { getDoc, doc } from 'firebase/firestore';
import { firestore } from '../../firebase';

// Define the event mapping from our system to GA4
const eventMapping: Record<string, string> = {
  'page_view': 'page_view',
  'login': 'login',
  'signup': 'sign_up',
  'logout': 'user_logout',
  'profile_update': 'update_profile',
  'platform_connect': 'platform_connect',
  'subscription_change': 'subscription_change',
  'token_purchase': 'purchase',
  'post_create': 'content_creation',
  'post_publish': 'content_publish',
  'content_generate': 'ai_generate',
  'caption_generate': 'ai_generate',
  'sentiment_analyze': 'ai_analyze',
  'token_use': 'token_consumption'
};

/**
 * Initialize Google Analytics 4
 * @param gaId The Google Analytics 4 measurement ID
 */
export function initGA4(gaId: string): void {
  if (typeof window === 'undefined' || !gaId) return;

  // Load the Google Analytics script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
  document.head.appendChild(script);

  // Initialize the data layer
  window.dataLayer = window.dataLayer || [];
  window.gtag = function() {
    window.dataLayer.push(arguments);
  };

  // Set default configuration
  window.gtag('js', new Date());
  window.gtag('config', gaId, { 
    send_page_view: false,
    cookie_flags: 'samesite=none;secure'
  });
}

/**
 * Identify user in Google Analytics 4
 * @param user The user to identify
 */
export async function identifyUserGA4(user: User): Promise<void> {
  if (typeof window === 'undefined' || !window.gtag) return;

  // Get the organization data for the current organization
  const orgId = user.currentOrganizationId || user.personalOrganizationId;
  if (!orgId) return;

  try {
    const orgDoc = await getDoc(doc(firestore, 'organizations', orgId));
    const orgData = orgDoc.data();
    
    window.gtag('set', { 
      user_id: user.id,
      user_properties: {
        subscription_tier: orgData?.billing?.subscriptionTier,
        signup_date: user.createdAt ? user.createdAt.toDate().toISOString() : undefined,
        organization_id: orgId
      }
    });
  } catch (error) {
    console.error('Failed to get organization data for GA4 identification', error);
    
    // Fallback with just user ID if we can't get org data
  window.gtag('set', { 
    user_id: user.id,
    user_properties: {
        signup_date: user.createdAt ? user.createdAt.toDate().toISOString() : undefined
    }
  });
  }
}

/**
 * Track an event in Google Analytics 4
 * @param eventName The name of the event
 * @param properties Properties associated with the event
 */
export function trackEventGA4(
  eventName: string, 
  properties: Record<string, any> = {}
): void {
  if (typeof window === 'undefined' || !window.gtag) return;

  // Use mapped event name or convert to snake_case if not in mapping
  const gaEventName = eventMapping[eventName] || eventName.replace(/([A-Z])/g, '_$1').toLowerCase();

  // Configure the GA4 event params
  const eventParams: Record<string, any> = {
    ...properties
  };

  // Send the event to GA4
  window.gtag('event', gaEventName, eventParams);
}

/**
 * Track page view in Google Analytics 4
 * @param path The page path
 * @param title The page title
 * @param properties Additional properties
 */
export function trackPageViewGA4(
  path: string,
  title: string,
  properties: Record<string, any> = {}
): void {
  if (typeof window === 'undefined' || !window.gtag) return;

  // Build the page view parameters
  const pageViewParams = {
    page_title: title,
    page_location: window.location.href,
    page_path: path,
    ...properties
  };

  // Send the page view
  window.gtag('event', 'page_view', pageViewParams);
}

/**
 * Track ecommerce purchase in Google Analytics 4
 * @param transactionId The transaction ID
 * @param currency The currency code (e.g., USD)
 * @param value The total value
 * @param taxAmount The tax amount
 * @param items Items in the purchase
 */
export function trackPurchaseGA4(
  transactionId: string,
  currency: string,
  value: number,
  taxAmount: number = 0,
  items: Array<{
    item_id: string;
    item_name: string;
    price: number;
    quantity: number;
  }> = []
): void {
  if (typeof window === 'undefined' || !window.gtag) return;

  window.gtag('event', 'purchase', {
    transaction_id: transactionId,
    value: value,
    currency: currency,
    tax: taxAmount,
    items: items
  });
}

/**
 * Set consent mode for GA4 (useful for GDPR compliance)
 * @param consents Object with consent settings
 */
export function setConsentGA4(consents: {
  analytics_storage?: 'granted' | 'denied';
  ad_storage?: 'granted' | 'denied';
  ad_user_data?: 'granted' | 'denied';
  ad_personalization?: 'granted' | 'denied';
}): void {
  if (typeof window === 'undefined' || !window.gtag) return;

  window.gtag('consent', 'update', consents);
}

// Types for window object
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}
