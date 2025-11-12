import { AnalyticsEvent, EventCategory, EventName } from './models/events';
import { AnalyticsRepository } from './repository';
import { getAnalyticsId } from './utils/browser';

// For server-side analytics
import { AxiosError } from 'axios';
import axios from 'axios';
import logger from '../logging/logger';

/**
 * Analytics configuration
 */
export interface AnalyticsConfig {
  /**
   * Google Analytics measurement ID
   */
  gaId?: string;
  
  /**
   * Whether to enable debug mode
   */
  debug?: boolean;
  
  /**
   * Custom endpoint URL for internal analytics
   */
  analyticsEndpoint?: string;
}

/**
 * Service for tracking user events and metrics
 */
export class Analytics {
  private config: AnalyticsConfig;
  private repository: AnalyticsRepository;
  private isInitialized: boolean = false;
  
  /**
   * Create an instance of the Analytics service
   * @param config Analytics configuration
   */
  constructor(config: AnalyticsConfig = {}) {
    this.config = {
      gaId: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
      debug: process.env.NODE_ENV !== 'production',
      analyticsEndpoint: process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT || '/api/analytics/events',
      ...config
    };
    
    this.repository = new AnalyticsRepository();
  }
  
  /**
   * Initialize the analytics service
   * This loads external scripts and prepares tracking
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    
    try {
      // Only initialize in browser environment
      if (typeof window !== 'undefined') {
        // Load Google Analytics if GA ID is provided
        if (this.config.gaId) {
          await this.loadGoogleAnalytics(this.config.gaId);
        }
        
        this.isInitialized = true;
        
        if (this.config.debug) {
          console.log('[Analytics] Initialized successfully');
        }
      }
    } catch (error) {
      console.error('[Analytics] Initialization error:', error);
    }
  }
  
  /**
   * Track a user event
   * @param name Event name
   * @param category Event category
   * @param data Additional event data
   * @param userId User ID (if available)
   */
  async trackEvent(
    name: EventName,
    category: EventCategory,
    data: Record<string, any> = {},
    userId?: string
  ): Promise<void> {
    try {
      // Create event object
      const event: AnalyticsEvent = {
        name,
        category,
        data,
        userId: userId || 'anonymous',
        clientId: getAnalyticsId(),
        timestamp: new Date(),
        sessionId: this.getSessionId()
      };
      
      // Track in Google Analytics
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', name, {
          event_category: category,
          ...data
        });
      }
      
      // Store in our analytics database
      if (typeof window !== 'undefined') {
        await this.sendEventToApi(event);
      } else {
        // Server-side tracking
        await this.repository.storeEvent(event);
      }
      
      if (this.config.debug) {
        console.log(`[Analytics] Tracked event: ${name} (${category})`, data);
      }
    } catch (error) {
      console.error('[Analytics] Error tracking event:', error);
    }
  }
  
  /**
   * Track a page view
   * @param path Page path
   * @param title Page title
   * @param userId User ID (if available)
   */
  async trackPageView(path: string, title: string, userId?: string): Promise<void> {
    try {
      // Only track in browser
      if (typeof window === 'undefined') {
        return;
      }
      
      // Track in Google Analytics
      if ((window as any).gtag) {
        (window as any).gtag('config', this.config.gaId, {
          page_path: path,
          page_title: title
        });
      }
      
      // Track in our custom analytics
      await this.trackEvent(
        EventName.PAGE_VIEW,
        EventCategory.NAVIGATION,
        { path, title },
        userId
      );
      
      if (this.config.debug) {
        console.log(`[Analytics] Tracked page view: ${path}`);
      }
    } catch (error) {
      console.error('[Analytics] Error tracking page view:', error);
    }
  }
  
  /**
   * Track a user conversion (signup, purchase, etc.)
   * @param conversionType Type of conversion
   * @param value Monetary value (if applicable)
   * @param data Additional conversion data
   * @param userId User ID (if available)
   */
  async trackConversion(
    conversionType: string,
    value?: number,
    data: Record<string, any> = {},
    userId?: string
  ): Promise<void> {
    try {
      // Track in Google Analytics
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'conversion', {
          send_to: `${this.config.gaId}/conversion`,
          value: value,
          currency: 'USD',
          transaction_id: data.transactionId,
          ...data
        });
      }
      
      // Track in our custom analytics
      await this.trackEvent(
        EventName.CONVERSION,
        EventCategory.BUSINESS,
        {
          conversionType,
          value,
          ...data
        },
        userId
      );
      
      if (this.config.debug) {
        console.log(`[Analytics] Tracked conversion: ${conversionType}`, { value, ...data });
      }
    } catch (error) {
      console.error('[Analytics] Error tracking conversion:', error);
    }
  }
  
  /**
   * Send an event to our API for storage
   * @param event Event to send
   */
  private async sendEventToApi(event: AnalyticsEvent): Promise<void> {
    try {
      await axios.post(this.config.analyticsEndpoint!, event);
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('[Analytics] Error sending event to API:', axiosError.message);
    }
  }
  
  /**
   * Get or create a session ID
   * @returns Session ID
   */
  private getSessionId(): string {
    if (typeof window === 'undefined') {
      return `server_${Date.now()}`;
    }
    
    let sessionId = sessionStorage.getItem('analytics_session_id');
    
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      sessionStorage.setItem('analytics_session_id', sessionId);
    }
    
    return sessionId;
  }
  
  /**
   * Load Google Analytics script
   * @param measurementId GA measurement ID
   */
  private loadGoogleAnalytics(measurementId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Create script element
        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
        
        // Set up the global gtag function
        window.dataLayer = window.dataLayer || [];
        function gtag(...args: any[]) {
          (window.dataLayer as any).push(arguments);
        }
        (window as any).gtag = gtag;
        
        // Initialize gtag
        gtag('js', new Date());
        gtag('config', measurementId);
        
        // Append script to head
        document.head.appendChild(script);
        
        // Resolve when loaded
        script.onload = () => resolve();
        script.onerror = (error) => reject(error);
      } catch (error) {
        reject(error);
      }
    });
  }
  
  /**
   * Track errors for monitoring
   * @param error Error object
   * @param context Error context
   * @param userId User ID (if available)
   */
  trackError(error: Error, context: string, userId?: string): void {
    try {
      // Log the error
      logger.error(`${context}: ${error.message}`, {
        stack: error.stack,
        userId
      });
      
      // Track in analytics
      this.trackEvent(
        EventName.ERROR,
        EventCategory.SYSTEM,
        {
          message: error.message,
          stack: error.stack,
          context
        },
        userId
      );
    } catch (e) {
      // Don't let error tracking cause additional errors
      console.error('[Analytics] Error while tracking error:', e);
    }
  }
}

// Export singleton instance
export const analytics = new Analytics();
