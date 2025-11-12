import { User } from '../../models/User';

// Define the conversion event mapping from our system to LinkedIn
const conversionMapping: Record<string, string> = {
  'signup': 'Sign Up',
  'subscription_start': 'Subscribe',
  'token_purchase': 'Purchase',
  'content_generate': 'Generate Lead',
  'post_publish': 'Key Page View',
  'login': 'Login'
};

/**
 * Initialize LinkedIn Insight Tag
 * @param partnerId The LinkedIn partner ID
 */
export function initLinkedInTag(partnerId: string): void {
  if (typeof window === 'undefined' || !partnerId) return;

  // Initialize the LinkedIn tracking object
  window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
  window._linkedin_data_partner_ids.push(partnerId);

  // Load the LinkedIn Insight Tag script
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://snap.licdn.com/li.lms-analytics/insight.min.js';
  document.head.appendChild(script);
  
  // Initialize lintrk if it doesn't exist
  window.lintrk = window.lintrk || function(){
    window.lintrk.q = window.lintrk.q || [];
    window.lintrk.q.push(arguments);
  };
}

/**
 * Identify user in LinkedIn (Note: LinkedIn has limited user identification capabilities)
 * @param user The user to identify
 */
export function identifyUserLinkedIn(user: User): void {
  if (typeof window === 'undefined' || !window.lintrk) return;

  // LinkedIn has limited advanced matching options
  // It primarily uses cookies and IP for tracking
}

/**
 * Track an event in LinkedIn Insight Tag
 * @param eventName The name of the event
 * @param properties Properties associated with the event
 */
export function trackEventLinkedIn(
  eventName: string, 
  properties: Record<string, any> = {}
): void {
  if (typeof window === 'undefined' || !window.lintrk) return;

  // Check if this is a defined conversion event
  const conversionId = conversionMapping[eventName];
  
  if (conversionId) {
    // Track as a conversion
    window.lintrk('track', { conversion_id: conversionId });
  } else {
    // Generic tracking - LinkedIn doesn't support custom events with properties
    // Instead, we just track a page view
    window.lintrk('track');
  }
}

/**
 * Track page view in LinkedIn Insight Tag
 */
export function trackPageViewLinkedIn(): void {
  if (typeof window === 'undefined' || !window.lintrk) return;

  window.lintrk('track');
}

/**
 * Track form submission in LinkedIn
 * @param formName The name of the form
 */
export function trackFormSubmissionLinkedIn(formName: string): void {
  if (typeof window === 'undefined' || !window.lintrk) return;

  window.lintrk('track', { conversion_id: 'Form Submit' });
}

/**
 * Track purchase in LinkedIn
 * @param value The purchase value
 * @param currency The currency code (e.g., USD)
 */
export function trackPurchaseLinkedIn(
  value?: number,
  currency?: string
): void {
  if (typeof window === 'undefined' || !window.lintrk) return;

  window.lintrk('track', { conversion_id: 'Purchase' });
}

// Types for window object
declare global {
  interface Window {
    _linkedin_data_partner_ids: string[];
    lintrk: any;
  }
}
