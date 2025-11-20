import { addDoc, collection, Timestamp, serverTimestamp, getDoc, doc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { getFirebaseFirestore } from '../../core/firebase';
import { AnalyticsEvent, EventSource, EventValidationResult } from '../models/events';
import { validateEvent } from './validator';
import { getEventSchema } from './schemas';
import { User } from '../../models/User';
import { firestore } from '@/lib/core/firebase';

// Collection reference
const EVENTS_COLLECTION = 'analyticsEvents';

// Global session ID for the current session
let currentSessionId: string | null = null;

/**
 * Initialize the analytics system
 */
export function initAnalytics(): void {
  currentSessionId = getCurrentSessionId();
  
  // Set up unload handler to persist session end
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      trackEvent('session_end', {
        duration: getSessionDuration()
      });
    });
  }
}

/**
 * Get the current session ID, creating a new one if needed
 */
function getCurrentSessionId(): string {
  if (typeof window !== 'undefined') {
    // Browser environment
    let sessionId = sessionStorage.getItem('irisync_session_id');
    
    if (!sessionId) {
      sessionId = uuidv4();
      sessionStorage.setItem('irisync_session_id', sessionId);
      
      // Record session start
      const timestamp = new Date().toISOString();
      sessionStorage.setItem('irisync_session_start', timestamp);
      
      // Track session start event
      trackEvent('session_start', {
        timestamp,
        userAgent: navigator.userAgent,
        referrer: document.referrer || null,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        screenSize: `${window.innerWidth}x${window.innerHeight}`
      }).catch(err => console.error('Failed to track session start:', err));
    }
    
    return sessionId;
  }
  
  // Server environment - generate a one-time session ID
  return uuidv4();
}

/**
 * Get the duration of the current session in seconds
 */
function getSessionDuration(): number {
  if (typeof window !== 'undefined') {
    const startTime = sessionStorage.getItem('irisync_session_start');
    if (startTime) {
      const start = new Date(startTime).getTime();
      const now = new Date().getTime();
      return Math.floor((now - start) / 1000);
    }
  }
  return 0;
}

/**
 * Track an analytics event
 * @param eventName The name of the event
 * @param properties Properties associated with the event
 * @param options Optional tracking options
 * @returns Promise resolving to the event ID
 */
export async function trackEvent(
  eventName: string,
  properties: Record<string, any>,
  options: {
    userId?: string;
    source?: EventSource;
    validateBeforeTracking?: boolean;
  } = {}
): Promise<string> {
  // Ensure session is initialized
  if (!currentSessionId) {
    currentSessionId = getCurrentSessionId();
  }
  
  const userId = options.userId || getUserId() || 'anonymous';
  const source = options.source || getEventSource();
  const timestamp = Timestamp.now();
  
  // Prepare the event object
  const event: Omit<AnalyticsEvent, 'id'> = {
    eventName,
    userId,
    sessionId: currentSessionId,
    timestamp,
    properties,
    source,
    validated: false
  };
  
  // Validate the event if specified
  if (options.validateBeforeTracking) {
    const schema = getEventSchema(eventName);
    if (schema) {
      const validationResult = validateEvent(event, schema);
      if (!validationResult.isValid) {
        console.warn(`Invalid event tracked: ${eventName}`, validationResult.errors);
        event.validated = false;
      } else {
        event.validated = true;
      }
    }
  }
  
  // Save to Firestore
  try {
    const firestore = getFirebaseFirestore();
    if (!firestore) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }
    const docRef = await addDoc(collection(firestore, EVENTS_COLLECTION), event);
    
    // Send to external analytics if configured
    sendToIntegrations(eventName, properties, userId);
    
    return docRef.id;
  } catch (error) {
    console.error('Error tracking event:', error);
    
    // Fall back to browser storage if available for later syncing
    if (typeof window !== 'undefined' && window.localStorage) {
      const pendingEvents = JSON.parse(localStorage.getItem('irisync_pending_events') || '[]');
      pendingEvents.push({ ...event, createdAt: new Date().toISOString() });
      localStorage.setItem('irisync_pending_events', JSON.stringify(pendingEvents));
    }
    
    throw error;
  }
}

/**
 * Send event to third-party analytics integrations
 */
function sendToIntegrations(
  eventName: string,
  properties: Record<string, any>,
  userId: string
): void {
  // Google Analytics 4
  sendToGA4(eventName, properties, userId);
  
  // Meta Pixel
  sendToMetaPixel(eventName, properties);
  
  // TikTok Pixel
  sendToTikTokPixel(eventName, properties);
  
  // LinkedIn Insight Tag
  sendToLinkedInInsight(eventName, properties);
}

/**
 * Send event to Google Analytics 4
 */
function sendToGA4(
  eventName: string,
  properties: Record<string, any>,
  userId: string
): void {
  if (typeof window !== 'undefined' && window.gtag) {
    // Convert to snake_case for GA4
    const gaEventName = eventName.replace(/([A-Z])/g, '_$1').toLowerCase();
    
    // Configure the event
    window.gtag('event', gaEventName, {
      ...properties,
      user_id: userId
    });
  }
}

/**
 * Send event to Meta Pixel
 */
function sendToMetaPixel(
  eventName: string,
  properties: Record<string, any>
): void {
  if (typeof window !== 'undefined' && window.fbq) {
    // Map common events to standard Facebook events
    const fbEventMap: Record<string, string> = {
      'page_view': 'PageView',
      'signup': 'CompleteRegistration',
      'subscription_start': 'Subscribe',
      'post_publish': 'CustomizeProduct',
      'content_generate': 'CustomizeProduct',
      'token_purchase': 'Purchase'
    };
    
    const fbEvent = fbEventMap[eventName] || 'CustomEvent';
    const customEventName = fbEvent === 'CustomEvent' ? eventName : undefined;
    
    // Track the event
    if (customEventName) {
      window.fbq('trackCustom', customEventName, properties);
    } else {
      window.fbq('track', fbEvent, properties);
    }
  }
}

/**
 * Send event to TikTok Pixel
 */
function sendToTikTokPixel(
  eventName: string,
  properties: Record<string, any>
): void {
  if (typeof window !== 'undefined' && window.ttq) {
    // Map common events to standard TikTok events
    const ttEventMap: Record<string, string> = {
      'page_view': 'PageView',
      'signup': 'CompleteRegistration',
      'subscription_start': 'Subscribe',
      'token_purchase': 'Purchase'
    };
    
    const ttEvent = ttEventMap[eventName] || 'CustomEvent';
    const customEventName = ttEvent === 'CustomEvent' ? eventName : undefined;
    
    // Track the event
    if (customEventName) {
      window.ttq.track(customEventName, properties);
    } else {
      window.ttq.track(ttEvent, properties);
    }
  }
}

/**
 * Send event to LinkedIn Insight Tag
 */
function sendToLinkedInInsight(
  eventName: string,
  properties: Record<string, any>
): void {
  if (typeof window !== 'undefined' && window.lintrk) {
    // LinkedIn only supports a limited set of events, so we map our events to their conversion events
    const liEventMap: Record<string, string> = {
      'signup': 'Sign Up',
      'subscription_start': 'Subscribe',
      'token_purchase': 'Purchase',
      'content_generate': 'Generate Lead'
    };
    
    const liEvent = liEventMap[eventName];
    if (liEvent) {
      window.lintrk('track', { conversion_id: liEvent });
    } else {
      // Default custom event tracking
      window.lintrk('track');
    }
  }
}

/**
 * Get the current user ID from various possible sources
 */
function getUserId(): string | null {
  // Try to get from global auth state or local storage
  if (typeof window !== 'undefined') {
    return localStorage.getItem('irisync_user_id');
  }
  
  return null;
}

/**
 * Determine the event source based on environment
 */
function getEventSource(): EventSource {
  if (typeof window !== 'undefined') {
    if (/Mobi|Android/i.test(navigator.userAgent)) {
      return EventSource.MOBILE_APP;
    }
    return EventSource.WEB_APP;
  }
  return EventSource.API;
}

/**
 * Track a page view
 * @param path The page path
 * @param title The page title
 * @param properties Additional properties
 */
export async function trackPageView(
  path: string,
  title: string,
  properties: Record<string, any> = {}
): Promise<string> {
  return trackEvent('page_view', {
    path,
    title,
    url: typeof window !== 'undefined' ? window.location.href : path,
    referrer: typeof document !== 'undefined' ? document.referrer : null,
    ...properties
  });
}

/**
 * Track a user action
 * @param action The user action
 * @param properties Additional properties
 */
export async function trackUserAction(
  action: string,
  properties: Record<string, any> = {}
): Promise<string> {
  return trackEvent(action, properties);
}

/**
 * Track an AI-related event
 * @param action The AI action
 * @param properties Additional properties
 */
export async function trackAIAction(
  action: string,
  properties: Record<string, any> = {}
): Promise<string> {
  return trackEvent(action, properties);
}

/**
 * Sync any pending events stored locally
 */
export async function syncPendingEvents(): Promise<void> {
  if (typeof window !== 'undefined' && window.localStorage) {
    const pendingEvents = JSON.parse(localStorage.getItem('irisync_pending_events') || '[]');
    
    if (pendingEvents.length === 0) {
      return;
    }
    
    // Process each pending event
    const promises = pendingEvents.map(async (event: any) => {
      try {
  const firestore = getFirebaseFirestore();
  if (!firestore) throw new Error('Database not configured');

        await addDoc(collection(firestore, EVENTS_COLLECTION), {
          ...event,
          timestamp: Timestamp.now()
        });
        return true;
      } catch (error) {
        console.error('Error syncing pending event:', error);
        return false;
      }
    });
    
    // Wait for all to complete
    const results = await Promise.all(promises);
    
    // Remove successfully synced events
    const remainingEvents = pendingEvents.filter((_: any, index: number) => !results[index]);
    localStorage.setItem('irisync_pending_events', JSON.stringify(remainingEvents));
  }
}

/**
 * Set up UTM parameter tracking
 */
export function setupUTMTracking(): void {
  if (typeof window !== 'undefined') {
    const url = new URL(window.location.href);
    const utmParams: Record<string, string> = {};
    
    // Extract all UTM parameters
    url.searchParams.forEach((value, key) => {
      if (key.startsWith('utm_')) {
        utmParams[key] = value;
      }
    });
    
    // If UTM parameters exist, save them for the session
    if (Object.keys(utmParams).length > 0) {
      sessionStorage.setItem('irisync_utm_params', JSON.stringify(utmParams));
      
      // Track UTM arrival
      trackEvent('utm_arrival', {
        ...utmParams,
        landingPage: window.location.pathname
      });
    }
  }
}

/**
 * Get stored UTM parameters
 */
export function getUTMParameters(): Record<string, string> {
  if (typeof window !== 'undefined') {
    try {
      const utmParams = sessionStorage.getItem('irisync_utm_params');
      return utmParams ? JSON.parse(utmParams) : {};
    } catch (error) {
      console.error('Error retrieving UTM parameters:', error);
      return {};
    }
  }
  return {};
}

/**
 * Initialize analytics with user information
 * @param user The current user
 */
export async function identifyUser(user: User): Promise<void> {
  if (typeof window === 'undefined') return;
  
    // Store user ID for future events
    localStorage.setItem('irisync_user_id', user.id);
  
  // Get organization data
  const orgId = user.currentOrganizationId || user.personalOrganizationId;
  let orgData = null;
  
  if (orgId) {
    try {
  const firestore = getFirebaseFirestore();
  if (!firestore) throw new Error('Database not configured');

      const orgDoc = await getDoc(doc(firestore, 'organizations', orgId));
      orgData = orgDoc.data();
    } catch (error) {
      console.error('Failed to get organization data:', error);
    }
  }
    
    // Track user identification
    trackEvent('user_identify', {
      userId: user.id,
      email: user.email,
    subscriptionTier: orgData?.billing?.subscriptionTier,
      createdAt: user.createdAt,
    organizationId: orgId
    });
    
    // Identify user in third-party systems
    if (window.gtag) {
      window.gtag('set', { user_id: user.id });
    }
    
    if (window.fbq) {
      window.fbq('init', process.env.NEXT_PUBLIC_META_PIXEL_ID || '', { 
        external_id: user.id 
      });
  }
} 