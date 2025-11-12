// CRM Rate Limiter Utility
// Manages API rate limits for different CRM platforms

import { CRMPlatform, CRMError, CRMErrorType, RateLimitConfig } from '../types';
import { logger } from '@/lib/core/logging/logger';

/**
 * Rate limit tracking for each platform
 */
interface RateLimitTracker {
  requestsThisMinute: number;
  requestsThisHour: number;
  requestsThisDay: number;
  lastMinuteReset: number;
  lastHourReset: number;
  lastDayReset: number;
  burstTokens: number;
  lastBurstReset: number;
}

/**
 * Default rate limit configurations for each platform
 */
const DEFAULT_RATE_LIMITS: Record<CRMPlatform, RateLimitConfig> = {
  [CRMPlatform.HUBSPOT]: {
    requestsPerMinute: 100,
    requestsPerHour: 40000,
    requestsPerDay: 1000000,
    burstLimit: 10,
    retryAfter: 1000
  },
  [CRMPlatform.SALESFORCE]: {
    requestsPerMinute: 20,
    requestsPerHour: 1000,
    requestsPerDay: 15000,
    burstLimit: 5,
    retryAfter: 1000
  },
  [CRMPlatform.ZOHO]: {
    requestsPerMinute: 10,
    requestsPerHour: 200,
    requestsPerDay: 1000,
    burstLimit: 3,
    retryAfter: 1000
  },
  [CRMPlatform.PIPEDRIVE]: {
    requestsPerMinute: 10,
    requestsPerHour: 1000,
    requestsPerDay: 10000,
    burstLimit: 5,
    retryAfter: 1000
  },
  [CRMPlatform.DYNAMICS]: {
    requestsPerMinute: 60,
    requestsPerHour: 3600,
    requestsPerDay: 86400,
    burstLimit: 10,
    retryAfter: 1000
  },
  [CRMPlatform.SUGARCRM]: {
    requestsPerMinute: 30,
    requestsPerHour: 1000,
    requestsPerDay: 10000,
    burstLimit: 5,
    retryAfter: 1000
  }
};

/**
 * Rate limiter for CRM API requests
 */
export class RateLimiter {
  private trackers: Map<CRMPlatform, RateLimitTracker> = new Map();
  private configs: Map<CRMPlatform, RateLimitConfig> = new Map();

  constructor(customConfigs?: Partial<Record<CRMPlatform, RateLimitConfig>>) {
    // Initialize with default configs
    Object.entries(DEFAULT_RATE_LIMITS).forEach(([platform, config]) => {
      this.configs.set(platform as CRMPlatform, config);
    });

    // Override with custom configs if provided
    if (customConfigs) {
      Object.entries(customConfigs).forEach(([platform, config]) => {
        if (config) {
          this.configs.set(platform as CRMPlatform, config);
        }
      });
    }

    // Initialize trackers
    this.initializeTrackers();
  }

  /**
   * Check if a request can be made for the given platform
   */
  async checkLimit(platform: CRMPlatform): Promise<void> {
    const config = this.configs.get(platform);
    if (!config) {
      throw new CRMError(
        `No rate limit configuration found for platform: ${platform}`,
        CRMErrorType.VALIDATION_ERROR,
        platform,
        400
      );
    }

    const tracker = this.getTracker(platform);
    const now = Date.now();

    // Reset counters if time windows have passed
    this.resetCountersIfNeeded(tracker, now);

    // Check rate limits
    if (tracker.requestsThisMinute >= config.requestsPerMinute) {
      const waitTime = 60000 - (now - tracker.lastMinuteReset);
      logger.warn('Rate limit exceeded for minute window', { 
        platform, 
        requests: tracker.requestsThisMinute,
        limit: config.requestsPerMinute,
        waitTime
      });
      
      throw new CRMError(
        `Rate limit exceeded for ${platform}. Try again in ${Math.ceil(waitTime / 1000)} seconds.`,
        CRMErrorType.RATE_LIMIT_ERROR,
        platform,
        429,
        { waitTime, retryAfter: waitTime }
      );
    }

    if (tracker.requestsThisHour >= config.requestsPerHour) {
      const waitTime = 3600000 - (now - tracker.lastHourReset);
      logger.warn('Rate limit exceeded for hour window', { 
        platform, 
        requests: tracker.requestsThisHour,
        limit: config.requestsPerHour,
        waitTime
      });
      
      throw new CRMError(
        `Hourly rate limit exceeded for ${platform}. Try again in ${Math.ceil(waitTime / 60000)} minutes.`,
        CRMErrorType.RATE_LIMIT_ERROR,
        platform,
        429,
        { waitTime, retryAfter: waitTime }
      );
    }

    if (tracker.requestsThisDay >= config.requestsPerDay) {
      const waitTime = 86400000 - (now - tracker.lastDayReset);
      logger.warn('Rate limit exceeded for day window', { 
        platform, 
        requests: tracker.requestsThisDay,
        limit: config.requestsPerDay,
        waitTime
      });
      
      throw new CRMError(
        `Daily rate limit exceeded for ${platform}. Try again in ${Math.ceil(waitTime / 3600000)} hours.`,
        CRMErrorType.RATE_LIMIT_ERROR,
        platform,
        429,
        { waitTime, retryAfter: waitTime }
      );
    }

    // Check burst limit
    if (tracker.burstTokens <= 0) {
      logger.warn('Burst limit exceeded', { platform, burstTokens: tracker.burstTokens });
      
      throw new CRMError(
        `Burst limit exceeded for ${platform}. Please slow down requests.`,
        CRMErrorType.RATE_LIMIT_ERROR,
        platform,
        429,
        { retryAfter: config.retryAfter }
      );
    }

    // Request is allowed, increment counters
    this.incrementCounters(tracker);
  }

  /**
   * Record a successful request
   */
  recordRequest(platform: CRMPlatform): void {
    const tracker = this.getTracker(platform);
    // Counters are already incremented in checkLimit
    logger.debug('Request recorded', { 
      platform,
      requestsThisMinute: tracker.requestsThisMinute,
      requestsThisHour: tracker.requestsThisHour,
      requestsThisDay: tracker.requestsThisDay
    });
  }

  /**
   * Record a failed request (for potential retry logic)
   */
  recordFailure(platform: CRMPlatform, statusCode?: number): void {
    const tracker = this.getTracker(platform);
    
    // If it's a rate limit error, don't penalize further
    if (statusCode === 429) {
      logger.warn('Rate limit error recorded', { platform, statusCode });
      return;
    }

    logger.debug('Request failure recorded', { platform, statusCode });
  }

  /**
   * Get current rate limit status for a platform
   */
  getStatus(platform: CRMPlatform): {
    requestsThisMinute: number;
    requestsThisHour: number;
    requestsThisDay: number;
    burstTokens: number;
    limits: RateLimitConfig;
  } {
    const tracker = this.getTracker(platform);
    const config = this.configs.get(platform)!;
    
    return {
      requestsThisMinute: tracker.requestsThisMinute,
      requestsThisHour: tracker.requestsThisHour,
      requestsThisDay: tracker.requestsThisDay,
      burstTokens: tracker.burstTokens,
      limits: config
    };
  }

  /**
   * Reset rate limits for a platform (for testing or manual reset)
   */
  reset(platform: CRMPlatform): void {
    const now = Date.now();
    this.trackers.set(platform, {
      requestsThisMinute: 0,
      requestsThisHour: 0,
      requestsThisDay: 0,
      lastMinuteReset: now,
      lastHourReset: now,
      lastDayReset: now,
      burstTokens: this.configs.get(platform)?.burstLimit || 10,
      lastBurstReset: now
    });
    
    logger.info('Rate limits reset for platform', { platform });
  }

  /**
   * Update rate limit configuration for a platform
   */
  updateConfig(platform: CRMPlatform, config: Partial<RateLimitConfig>): void {
    const currentConfig = this.configs.get(platform) || DEFAULT_RATE_LIMITS[platform];
    const newConfig = { ...currentConfig, ...config };
    this.configs.set(platform, newConfig);
    
    logger.info('Rate limit configuration updated', { platform, newConfig });
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Initialize trackers for all platforms
   */
  private initializeTrackers(): void {
    const now = Date.now();
    
    Object.values(CRMPlatform).forEach(platform => {
      const config = this.configs.get(platform);
      this.trackers.set(platform, {
        requestsThisMinute: 0,
        requestsThisHour: 0,
        requestsThisDay: 0,
        lastMinuteReset: now,
        lastHourReset: now,
        lastDayReset: now,
        burstTokens: config?.burstLimit || 10,
        lastBurstReset: now
      });
    });
  }

  /**
   * Get tracker for a platform, creating if it doesn't exist
   */
  private getTracker(platform: CRMPlatform): RateLimitTracker {
    let tracker = this.trackers.get(platform);
    
    if (!tracker) {
      const now = Date.now();
      const config = this.configs.get(platform);
      tracker = {
        requestsThisMinute: 0,
        requestsThisHour: 0,
        requestsThisDay: 0,
        lastMinuteReset: now,
        lastHourReset: now,
        lastDayReset: now,
        burstTokens: config?.burstLimit || 10,
        lastBurstReset: now
      };
      this.trackers.set(platform, tracker);
    }
    
    return tracker;
  }

  /**
   * Reset counters if time windows have passed
   */
  private resetCountersIfNeeded(tracker: RateLimitTracker, now: number): void {
    // Reset minute counter
    if (now - tracker.lastMinuteReset >= 60000) {
      tracker.requestsThisMinute = 0;
      tracker.lastMinuteReset = now;
    }

    // Reset hour counter
    if (now - tracker.lastHourReset >= 3600000) {
      tracker.requestsThisHour = 0;
      tracker.lastHourReset = now;
    }

    // Reset day counter
    if (now - tracker.lastDayReset >= 86400000) {
      tracker.requestsThisDay = 0;
      tracker.lastDayReset = now;
    }

    // Reset burst tokens (every second)
    if (now - tracker.lastBurstReset >= 1000) {
      const config = this.configs.get(CRMPlatform.HUBSPOT); // Get any config for burst limit
      tracker.burstTokens = Math.min(
        tracker.burstTokens + 1, 
        config?.burstLimit || 10
      );
      tracker.lastBurstReset = now;
    }
  }

  /**
   * Increment request counters
   */
  private incrementCounters(tracker: RateLimitTracker): void {
    tracker.requestsThisMinute++;
    tracker.requestsThisHour++;
    tracker.requestsThisDay++;
    tracker.burstTokens--;
  }

  /**
   * Calculate wait time until next request is allowed
   */
  private calculateWaitTime(platform: CRMPlatform): number {
    const tracker = this.getTracker(platform);
    const config = this.configs.get(platform)!;
    const now = Date.now();

    // Check which limit is hit and return appropriate wait time
    if (tracker.requestsThisMinute >= config.requestsPerMinute) {
      return 60000 - (now - tracker.lastMinuteReset);
    }

    if (tracker.requestsThisHour >= config.requestsPerHour) {
      return 3600000 - (now - tracker.lastHourReset);
    }

    if (tracker.requestsThisDay >= config.requestsPerDay) {
      return 86400000 - (now - tracker.lastDayReset);
    }

    if (tracker.burstTokens <= 0) {
      return config.retryAfter;
    }

    return 0;
  }
} 