import { logger } from '@/lib/core/logging/logger';

/**
 * LinkedIn API Rate Limiting Configuration
 * Based on official LinkedIn API v2 and REST API rate limits
 */

export interface LinkedInRateLimit {
  endpoint: string;
  limits: {
    standard: {
      perHour: number;
      perDay: number;
      perMinute?: number;
    };
    partner?: {
      perHour: number;
      perDay: number;
      perMinute?: number;
    };
  };
}

export const LINKEDIN_RATE_LIMITS: Record<string, LinkedInRateLimit> = {
  // Core Content Management (REST API)
  'CREATE_rest_posts': {
    endpoint: 'POST /rest/posts',
    limits: {
      standard: { perHour: 250, perDay: 1000 },
      partner: { perHour: 500, perDay: 2000 }
    }
  },
  
  'DELETE_rest_posts': {
    endpoint: 'DELETE /rest/posts/{postUrn}',
    limits: {
      standard: { perHour: 250, perDay: 1000 },
      partner: { perHour: 500, perDay: 2000 }
    }
  },
  
  'UPDATE_rest_posts': {
    endpoint: 'PARTIAL_UPDATE /rest/posts/{postUrn}',
    limits: {
      standard: { perHour: 250, perDay: 1000 },
      partner: { perHour: 500, perDay: 2000 }
    }
  },
  
  'GET_rest_posts': {
    endpoint: 'GET /rest/posts/{postUrn}',
    limits: {
      standard: { perHour: 500, perDay: 5000 },
      partner: { perHour: 1000, perDay: 10000 }
    }
  },

  // Media Management (REST API)
  'BATCH_GET_rest_images': {
    endpoint: 'BATCH_GET /rest/images',
    limits: {
      standard: { perHour: 200, perDay: 2000 },
      partner: { perHour: 400, perDay: 4000 }
    }
  },
  
  'ACTION_rest_images_initializeUpload': {
    endpoint: 'ACTION /rest/images initializeUpload',
    limits: {
      standard: { perHour: 100, perDay: 1000 },
      partner: { perHour: 200, perDay: 2000 }
    }
  },
  
  'GET_rest_images': {
    endpoint: 'GET /rest/images/{imageId}',
    limits: {
      standard: { perHour: 500, perDay: 5000 },
      partner: { perHour: 1000, perDay: 10000 }
    }
  },
  
  'UPDATE_rest_images': {
    endpoint: 'PARTIAL_UPDATE /rest/images/{imageId}',
    limits: {
      standard: { perHour: 100, perDay: 1000 },
      partner: { perHour: 200, perDay: 2000 }
    }
  },

  // Video Management
  'BATCH_GET_rest_videos': {
    endpoint: 'BATCH_GET /rest/videos',
    limits: {
      standard: { perHour: 100, perDay: 1000 },
      partner: { perHour: 200, perDay: 2000 }
    }
  },
  
  'ACTION_rest_videos_initializeUpload': {
    endpoint: 'ACTION /rest/videos initializeUpload',
    limits: {
      standard: { perHour: 50, perDay: 500 },
      partner: { perHour: 100, perDay: 1000 }
    }
  },
  
  'ACTION_rest_videos_finalizeUpload': {
    endpoint: 'ACTION /rest/videos finalizeUpload',
    limits: {
      standard: { perHour: 50, perDay: 500 },
      partner: { perHour: 100, perDay: 1000 }
    }
  },
  
  'GET_rest_videos': {
    endpoint: 'GET /rest/videos/{videoId}',
    limits: {
      standard: { perHour: 200, perDay: 2000 },
      partner: { perHour: 400, perDay: 4000 }
    }
  },
  
  'UPDATE_rest_videos': {
    endpoint: 'PARTIAL_UPDATE /rest/videos/{videoId}',
    limits: {
      standard: { perHour: 50, perDay: 500 },
      partner: { perHour: 100, perDay: 1000 }
    }
  },

  // Document Management
  'BATCH_GET_rest_documents': {
    endpoint: 'BATCH_GET /rest/documents',
    limits: {
      standard: { perHour: 200, perDay: 2000 },
      partner: { perHour: 400, perDay: 4000 }
    }
  },
  
  'ACTION_rest_documents_initializeUpload': {
    endpoint: 'ACTION /rest/documents initializeUpload',
    limits: {
      standard: { perHour: 50, perDay: 500 },
      partner: { perHour: 100, perDay: 1000 }
    }
  },
  
  'FINDER_rest_documents_associatedAccount': {
    endpoint: 'FINDER /rest/documents associatedAccount',
    limits: {
      standard: { perHour: 200, perDay: 2000 },
      partner: { perHour: 400, perDay: 4000 }
    }
  },
  
  'GET_rest_documents': {
    endpoint: 'GET /rest/documents/{documentId}',
    limits: {
      standard: { perHour: 500, perDay: 5000 },
      partner: { perHour: 1000, perDay: 10000 }
    }
  },

  // Events Management
  'FINDER_rest_events_organizerLeadGenFormEnabledEvents': {
    endpoint: 'FINDER /rest/events organizerLeadGenFormEnabledEvents',
    limits: {
      standard: { perHour: 100, perDay: 1000 },
      partner: { perHour: 200, perDay: 2000 }
    }
  },
  
  'FINDER_rest_events_eventsByOrganizer': {
    endpoint: 'FINDER /rest/events eventsByOrganizer',
    limits: {
      standard: { perHour: 100, perDay: 1000 },
      partner: { perHour: 200, perDay: 2000 }
    }
  },
  
  'CREATE_rest_events': {
    endpoint: 'CREATE /rest/events',
    limits: {
      standard: { perHour: 25, perDay: 100 },
      partner: { perHour: 50, perDay: 200 }
    }
  },
  
  'UPDATE_rest_events': {
    endpoint: 'PARTIAL_UPDATE /rest/events/{id}',
    limits: {
      standard: { perHour: 50, perDay: 500 },
      partner: { perHour: 100, perDay: 1000 }
    }
  },
  
  'GET_rest_events': {
    endpoint: 'GET /rest/events/{id}',
    limits: {
      standard: { perHour: 200, perDay: 2000 },
      partner: { perHour: 400, perDay: 4000 }
    }
  },

  // Lead Forms Management
  'BATCH_GET_rest_leadForms': {
    endpoint: 'BATCH_GET /rest/leadForms',
    limits: {
      standard: { perHour: 100, perDay: 1000 },
      partner: { perHour: 200, perDay: 2000 }
    }
  },
  
  'FINDER_rest_leadForms_owner': {
    endpoint: 'FINDER /rest/leadForms owner',
    limits: {
      standard: { perHour: 100, perDay: 1000 },
      partner: { perHour: 200, perDay: 2000 }
    }
  },
  
  'CREATE_rest_leadForms': {
    endpoint: 'CREATE /rest/leadForms',
    limits: {
      standard: { perHour: 25, perDay: 100 },
      partner: { perHour: 50, perDay: 200 }
    }
  },
  
  'GET_rest_leadForms': {
    endpoint: 'GET /rest/leadForms/{id}',
    limits: {
      standard: { perHour: 200, perDay: 2000 },
      partner: { perHour: 400, perDay: 4000 }
    }
  },
  
  'UPDATE_rest_leadForms': {
    endpoint: 'PARTIAL_UPDATE /rest/leadForms/{id}',
    limits: {
      standard: { perHour: 50, perDay: 500 },
      partner: { perHour: 100, perDay: 1000 }
    }
  },

  // Reactions Management
  'DELETE_rest_reactions': {
    endpoint: 'DELETE /rest/reactions/{id}',
    limits: {
      standard: { perHour: 200, perDay: 2000 },
      partner: { perHour: 400, perDay: 4000 }
    }
  },
  
  'UPDATE_rest_reactions': {
    endpoint: 'PARTIAL_UPDATE /rest/reactions/{id}',
    limits: {
      standard: { perHour: 200, perDay: 2000 },
      partner: { perHour: 400, perDay: 4000 }
    }
  },
  
  'FINDER_rest_reactions_entity': {
    endpoint: 'FINDER /rest/reactions entity',
    limits: {
      standard: { perHour: 300, perDay: 3000 },
      partner: { perHour: 600, perDay: 6000 }
    }
  },

  // Profile & User Info
  'GET_v2_userinfo': {
    endpoint: 'GET /v2/userinfo',
    limits: {
      standard: { perHour: 500, perDay: 5000 },
      partner: { perHour: 1000, perDay: 10000 }
    }
  },

  'GET_v2_me': {
    endpoint: 'GET /v2/me',
    limits: {
      standard: { perHour: 500, perDay: 5000 },
      partner: { perHour: 1000, perDay: 10000 }
    }
  },

  // Legacy Endpoints (for backward compatibility)
  'CREATE_v2_ugcPosts': {
    endpoint: 'POST /v2/ugcPosts',
    limits: {
      standard: { perHour: 250, perDay: 1000 },
      partner: { perHour: 500, perDay: 2000 }
    }
  },
  
  'GET_v2_ugcPosts': {
    endpoint: 'GET /v2/ugcPosts',
    limits: {
      standard: { perHour: 500, perDay: 5000 },
      partner: { perHour: 1000, perDay: 10000 }
    }
  }
};

export type LinkedInTier = 'standard' | 'partner';

export class LinkedInRateLimiter {
  private requestCounts: Map<string, { count: number; resetTime: number; period: 'hour' | 'day' }> = new Map();
  private tier: LinkedInTier;
  
  constructor(tier: LinkedInTier = 'standard') {
    this.tier = tier;
    
    logger.info('LinkedInRateLimiter initialized', {
      tier,
      trackingEndpoints: Object.keys(LINKEDIN_RATE_LIMITS).length
    });
  }
  
  /**
   * Check if a request can be made to a specific endpoint
   */
  canMakeRequest(endpointKey: string): boolean {
    const rateLimit = LINKEDIN_RATE_LIMITS[endpointKey];
    if (!rateLimit) {
      logger.warn('No rate limit defined for LinkedIn endpoint', { endpointKey });
      return true; // Allow unknown endpoints
    }
    
    const limits = rateLimit.limits[this.tier] || rateLimit.limits.standard;
    
    if (!limits) {
      logger.warn('No limits defined for LinkedIn tier', { endpointKey, tier: this.tier });
      return true;
    }
    
    // Check hourly limit
    if (limits.perHour) {
      const hourlyKey = `${endpointKey}_hour`;
      if (!this.checkLimit(hourlyKey, limits.perHour, 60 * 60 * 1000)) {
        logger.warn('LinkedIn hourly rate limit exceeded', {
          endpoint: rateLimit.endpoint,
          tier: this.tier,
          limit: limits.perHour
        });
        return false;
      }
    }
    
    // Check daily limit
    if (limits.perDay) {
      const dailyKey = `${endpointKey}_day`;
      if (!this.checkLimit(dailyKey, limits.perDay, 24 * 60 * 60 * 1000)) {
        logger.warn('LinkedIn daily rate limit exceeded', {
          endpoint: rateLimit.endpoint,
          tier: this.tier,
          limit: limits.perDay
        });
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Record a request made to an endpoint
   */
  recordRequest(endpointKey: string): void {
    const rateLimit = LINKEDIN_RATE_LIMITS[endpointKey];
    if (!rateLimit) return;
    
    const limits = rateLimit.limits[this.tier] || rateLimit.limits.standard;
    if (!limits) return;
    
    const now = Date.now();
    
    // Record for hourly window
    if (limits.perHour) {
      const hourlyKey = `${endpointKey}_hour`;
      this.incrementCounter(hourlyKey, 60 * 60 * 1000);
    }
    
    // Record for daily window
    if (limits.perDay) {
      const dailyKey = `${endpointKey}_day`;
      this.incrementCounter(dailyKey, 24 * 60 * 60 * 1000);
    }
    
    logger.debug('Recorded LinkedIn API request', {
      endpoint: rateLimit.endpoint,
      tier: this.tier,
      timestamp: now
    });
  }
  
  /**
   * Get time until rate limit resets
   */
  getTimeUntilReset(endpointKey: string): number {
    const rateLimit = LINKEDIN_RATE_LIMITS[endpointKey];
    if (!rateLimit) return 0;
    
    const limits = rateLimit.limits[this.tier] || rateLimit.limits.standard;
    if (!limits) return 0;
    
    let minResetTime = 0;
    
    // Check hourly limit reset time
    if (limits.perHour) {
      const hourlyKey = `${endpointKey}_hour`;
      const hourlyCounter = this.requestCounts.get(hourlyKey);
      if (hourlyCounter && hourlyCounter.count >= limits.perHour) {
        minResetTime = Math.max(minResetTime, hourlyCounter.resetTime - Date.now());
      }
    }
    
    // Check daily limit reset time
    if (limits.perDay) {
      const dailyKey = `${endpointKey}_day`;
      const dailyCounter = this.requestCounts.get(dailyKey);
      if (dailyCounter && dailyCounter.count >= limits.perDay) {
        minResetTime = Math.max(minResetTime, dailyCounter.resetTime - Date.now());
      }
    }
    
    return Math.max(0, minResetTime);
  }
  
  /**
   * Get current usage for an endpoint
   */
  getCurrentUsage(endpointKey: string): { perHour?: { used: number; limit: number }; perDay?: { used: number; limit: number } } {
    const rateLimit = LINKEDIN_RATE_LIMITS[endpointKey];
    if (!rateLimit) return {};
    
    const limits = rateLimit.limits[this.tier] || rateLimit.limits.standard;
    if (!limits) return {};
    
    const usage: any = {};
    
    if (limits.perHour) {
      const hourlyKey = `${endpointKey}_hour`;
      const counter = this.requestCounts.get(hourlyKey);
      usage.perHour = {
        used: counter?.count || 0,
        limit: limits.perHour
      };
    }
    
    if (limits.perDay) {
      const dailyKey = `${endpointKey}_day`;
      const counter = this.requestCounts.get(dailyKey);
      usage.perDay = {
        used: counter?.count || 0,
        limit: limits.perDay
      };
    }
    
    return usage;
  }
  
  /**
   * Update the API tier
   */
  updateTier(newTier: LinkedInTier): void {
    const oldTier = this.tier;
    this.tier = newTier;
    
    logger.info('LinkedIn API tier updated', {
      oldTier,
      newTier,
      resetCounters: true
    });
    
    // Clear existing counters when tier changes
    this.requestCounts.clear();
  }
  
  /**
   * Check if we're within the limit for a specific counter
   */
  private checkLimit(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const counter = this.requestCounts.get(key);
    
    if (!counter) {
      return true; // No previous requests
    }
    
    // Check if window has expired
    if (now >= counter.resetTime) {
      this.requestCounts.delete(key);
      return true;
    }
    
    // Check if we're under the limit
    return counter.count < limit;
  }
  
  /**
   * Increment counter for a specific key
   */
  private incrementCounter(key: string, windowMs: number): void {
    const now = Date.now();
    const counter = this.requestCounts.get(key);
    
    if (!counter || now >= counter.resetTime) {
      // Start new window
      this.requestCounts.set(key, {
        count: 1,
        resetTime: now + windowMs,
        period: windowMs === 60 * 60 * 1000 ? 'hour' : 'day'
      });
    } else {
      // Increment existing counter
      counter.count++;
    }
  }
  
  /**
   * Get rate limiting status for debugging
   */
  getStatus(): Record<string, any> {
    const status: Record<string, any> = {
      tier: this.tier,
      activeCounters: this.requestCounts.size,
      endpoints: {}
    };
    
    for (const [endpointKey, rateLimit] of Object.entries(LINKEDIN_RATE_LIMITS)) {
      status.endpoints[endpointKey] = {
        endpoint: rateLimit.endpoint,
        usage: this.getCurrentUsage(endpointKey),
        timeUntilReset: this.getTimeUntilReset(endpointKey)
      };
    }
    
    return status;
  }
} 