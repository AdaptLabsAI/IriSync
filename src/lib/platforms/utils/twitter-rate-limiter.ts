import { logger } from '@/lib/logging/logger';

/**
 * Twitter API Rate Limiting Configuration
 * Based on official Twitter API v2 rate limits
 */

export interface TwitterRateLimit {
  endpoint: string;
  limits: {
    free: {
      perUser?: string;
      perApp?: string;
      per15Min?: number;
      per24Hour?: number;
    };
    basic: {
      perUser?: string;
      perApp?: string;
      per15Min?: number;
      per24Hour?: number;
    };
    pro: {
      perUser?: string;
      perApp?: string;
      per15Min?: number;
      per24Hour?: number;
    };
    enterprise?: {
      perUser?: string;
      perApp?: string;
      per15Min?: number;
      per24Hour?: number;
    };
  };
}

export const TWITTER_RATE_LIMITS: Record<string, TwitterRateLimit> = {
  // Core Tweet Operations
  'POST_tweets': {
    endpoint: 'POST /2/tweets',
    limits: {
      free: { per24Hour: 17 }, // 17 requests / 24 hours PER USER
      basic: { per15Min: 100, per24Hour: 1667 }, // 100 requests / 15 mins PER USER, 1667 requests / 24 hours PER APP
      pro: { per15Min: 100, per24Hour: 10000 } // 100 requests / 15 mins PER USER, 10000 requests / 24 hours PER APP
    }
  },
  
  'DELETE_tweets': {
    endpoint: 'DELETE /2/tweets/:id',
    limits: {
      free: { per24Hour: 17 }, // 17 requests / 24 hours PER USER
      basic: { per15Min: 50, per24Hour: 17 }, // 50 requests / 15 mins PER USER, 17 requests / 24 hours PER USER
      pro: { per15Min: 50, per24Hour: 17 } // Same as basic
    }
  },
  
  // User Operations
  'GET_users_me': {
    endpoint: 'GET /2/users/me',
    limits: {
      free: { per24Hour: 25 }, // 25 requests / 24 hours PER USER
      basic: { per15Min: 75, per24Hour: 250 }, // 75 requests / 15 mins PER USER, 250 requests / 24 hours PER USER
      pro: { per15Min: 75, per24Hour: 250 } // Same as basic
    }
  },
  
  'GET_users_by_id': {
    endpoint: 'GET /2/users/:id',
    limits: {
      free: { per24Hour: 1 }, // 1 request / 24 hours PER USER
      basic: { per24Hour: 100 }, // 100 requests / 24 hours PER USER
      pro: { per15Min: 900, per24Hour: 500 } // 900 requests / 15 mins PER USER, 500 requests / 24 hours PER APP
    }
  },

  'GET_users_by_username': {
    endpoint: 'GET /2/users/by/username/:username',
    limits: {
      free: { per24Hour: 1 }, // 1 request / 24 hours PER USER
      basic: { per24Hour: 100 }, // 100 requests / 24 hours PER USER
      pro: { per15Min: 900, per24Hour: 500 } // 900 requests / 15 mins PER USER, 500 requests / 24 hours PER APP
    }
  },
  
  // Tweet Retrieval
  'GET_users_tweets': {
    endpoint: 'GET /2/users/:id/tweets',
    limits: {
      free: { per15Min: 1 }, // 1 request / 15 mins PER USER
      basic: { per15Min: 5 }, // 5 requests / 15 mins PER USER
      pro: { per15Min: 900 } // 900 requests / 15 mins PER USER
    }
  },
  
  'GET_tweets': {
    endpoint: 'GET /2/tweets',
    limits: {
      free: { per15Min: 1 }, // 1 request / 15 mins PER USER
      basic: { per15Min: 15 }, // 15 requests / 15 mins PER USER
      pro: { per15Min: 900 } // 900 requests / 15 mins PER USER
    }
  },

  // Direct Messages
  'GET_dm_events': {
    endpoint: 'GET /2/dm_events',
    limits: {
      free: { per24Hour: 1 }, // 1 request / 24 hours PER USER
      basic: { per15Min: 15, per24Hour: 100 }, // 15 requests / 15 mins PER USER, 100 requests / 24 hours PER USER
      pro: { per15Min: 60, per24Hour: 400 } // 60 requests / 15 mins PER USER, 400 requests / 24 hours PER USER
    }
  },

  'GET_dm_conversations': {
    endpoint: 'GET /2/dm_conversations/:id/dm_events',
    limits: {
      free: { per24Hour: 1 }, // 1 request / 24 hours PER USER
      basic: { per15Min: 15, per24Hour: 100 }, // 15 requests / 15 mins PER USER, 100 requests / 24 hours PER USER
      pro: { per15Min: 60, per24Hour: 400 } // 60 requests / 15 mins PER USER, 400 requests / 24 hours PER USER
    }
  },

  'GET_dm_conversations_with_participant': {
    endpoint: 'GET /2/dm_conversations/with/:participant_id/dm_events',
    limits: {
      free: { per24Hour: 1 }, // 1 request / 24 hours PER USER
      basic: { per15Min: 15, per24Hour: 100 }, // 15 requests / 15 mins PER USER, 100 requests / 24 hours PER USER
      pro: { per15Min: 60, per24Hour: 400 } // 60 requests / 15 mins PER USER, 400 requests / 24 hours PER USER
    }
  },

  'POST_dm_conversations_messages': {
    endpoint: 'POST /2/dm_conversations/:id/messages',
    limits: {
      free: { per24Hour: 1 }, // 1 request / 24 hours PER USER
      basic: { per15Min: 15, per24Hour: 1440 }, // 15 requests / 15 mins PER USER, 1440 requests / 24 hours PER USER
      pro: { per15Min: 15, per24Hour: 1440 } // Same as basic
    }
  },

  'POST_dm_conversations_with_participant_messages': {
    endpoint: 'POST /2/dm_conversations/with/:participant_id/messages',
    limits: {
      free: { per24Hour: 1 }, // 1 request / 24 hours PER USER
      basic: { per15Min: 15, per24Hour: 1440 }, // 15 requests / 15 mins PER USER, 1440 requests / 24 hours PER USER
      pro: { per15Min: 15, per24Hour: 1440 } // Same as basic
    }
  },

  // Mentions
  'GET_users_mentions': {
    endpoint: 'GET /2/users/:id/mentions',
    limits: {
      free: { per15Min: 1 }, // 1 request / 15 mins PER USER
      basic: { per15Min: 5 }, // 5 requests / 15 mins PER USER
      pro: { per15Min: 180 } // 180 requests / 15 mins PER USER
    }
  },
  
  // Engagement Operations
  'POST_users_likes': {
    endpoint: 'POST /2/users/:id/likes',
    limits: {
      free: { per15Min: 1 }, // 1 request / 15 mins PER USER
      basic: { per24Hour: 200 }, // 200 requests / 24 hours PER USER
      pro: { per24Hour: 1000 } // 1000 requests / 24 hours PER USER
    }
  },

  'DELETE_users_likes': {
    endpoint: 'DELETE /2/users/:id/likes/:tweet_id',
    limits: {
      free: { per15Min: 1 }, // 1 request / 15 mins PER USER
      basic: { per24Hour: 200 }, // 200 requests / 24 hours PER USER
      pro: { per24Hour: 1000 } // 1000 requests / 24 hours PER USER
    }
  },
  
  'POST_users_retweets': {
    endpoint: 'POST /2/users/:id/retweets',
    limits: {
      free: { per15Min: 1 }, // 1 request / 15 mins PER USER
      basic: { per15Min: 5 }, // 5 requests / 15 mins PER USER
      pro: { per15Min: 50 } // 50 requests / 15 mins PER USER
    }
  },

  'DELETE_users_retweets': {
    endpoint: 'DELETE /2/users/:id/retweets/:tweet_id',
    limits: {
      free: { per15Min: 1 }, // 1 request / 15 mins PER USER
      basic: { per15Min: 5 }, // 5 requests / 15 mins PER USER
      pro: { per15Min: 50 } // 50 requests / 15 mins PER USER
    }
  },

  // Engagement Tracking
  'GET_tweets_liking_users': {
    endpoint: 'GET /2/tweets/:id/liking_users',
    limits: {
      free: { per15Min: 1 }, // 1 request / 15 mins PER USER
      basic: { per15Min: 15 }, // 15 requests / 15 mins PER USER
      pro: { per15Min: 180 } // 180 requests / 15 mins PER USER
    }
  },

  'GET_tweets_retweeted_by': {
    endpoint: 'GET /2/tweets/:id/retweeted_by',
    limits: {
      free: { per15Min: 1 }, // 1 request / 15 mins PER USER
      basic: { per15Min: 15 }, // 15 requests / 15 mins PER USER
      pro: { per15Min: 180 } // 180 requests / 15 mins PER USER
    }
  },

  'GET_tweets_quote_tweets': {
    endpoint: 'GET /2/tweets/:id/quote_tweets',
    limits: {
      free: { per15Min: 1 }, // 1 request / 15 mins PER USER
      basic: { per15Min: 15 }, // 15 requests / 15 mins PER USER
      pro: { per15Min: 180 } // 180 requests / 15 mins PER USER
    }
  },

  // Search Operations
  'GET_tweets_search_recent': {
    endpoint: 'GET /2/tweets/search/recent',
    limits: {
      free: { per15Min: 1 }, // 1 request / 15 mins PER USER
      basic: { per15Min: 60 }, // 60 requests / 15 mins PER USER
      pro: { per15Min: 900 } // 900 requests / 15 mins PER USER
    }
  },

  'GET_tweets_search_all': {
    endpoint: 'GET /2/tweets/search/all',
    limits: {
      free: { per15Min: 0 }, // Not available on free tier
      basic: { per15Min: 0 }, // Not available on basic tier
      pro: { per15Min: 300 } // 300 requests / 15 mins PER USER (Pro+ only)
    }
  },

  'GET_tweets_counts_recent': {
    endpoint: 'GET /2/tweets/counts/recent',
    limits: {
      free: { per15Min: 1 }, // 1 request / 15 mins PER USER
      basic: { per15Min: 60 }, // 60 requests / 15 mins PER USER
      pro: { per15Min: 900 } // 900 requests / 15 mins PER USER
    }
  },

  'GET_tweets_counts_all': {
    endpoint: 'GET /2/tweets/counts/all',
    limits: {
      free: { per15Min: 0 }, // Not available on free tier
      basic: { per15Min: 0 }, // Not available on basic tier
      pro: { per15Min: 300 } // 300 requests / 15 mins PER USER (Pro+ only)
    }
  },

  // Follow Operations
  'POST_users_following': {
    endpoint: 'POST /2/users/:id/following',
    limits: {
      free: { per15Min: 1 }, // 1 request / 15 mins PER USER
      basic: { per15Min: 5 }, // 5 requests / 15 mins PER USER
      pro: { per15Min: 50 } // 50 requests / 15 mins PER USER
    }
  },

  'DELETE_users_following': {
    endpoint: 'DELETE /2/users/:source_user_id/following/:target_user_id',
    limits: {
      free: { per15Min: 1 }, // 1 request / 15 mins PER USER
      basic: { per15Min: 5 }, // 5 requests / 15 mins PER USER
      pro: { per15Min: 50 } // 50 requests / 15 mins PER USER
    }
  },

  // User Behavior Analysis
  'GET_users_liked_tweets': {
    endpoint: 'GET /2/users/:id/liked_tweets',
    limits: {
      free: { per15Min: 1 }, // 1 request / 15 mins PER USER
      basic: { per15Min: 15 }, // 15 requests / 15 mins PER USER
      pro: { per15Min: 180 } // 180 requests / 15 mins PER USER
    }
  },

  // Trends
  'GET_trends_by_woeid': {
    endpoint: 'GET /2/trends/by/woeid/:id',
    limits: {
      free: { per15Min: 1 }, // 1 request / 15 mins PER USER
      basic: { per15Min: 15 }, // 15 requests / 15 mins PER USER
      pro: { per15Min: 75 } // 75 requests / 15 mins PER USER
    }
  },

  'GET_users_personalized_trends': {
    endpoint: 'GET /2/users/personalized_trends',
    limits: {
      free: { per15Min: 1 }, // 1 request / 15 mins PER USER
      basic: { per15Min: 15 }, // 15 requests / 15 mins PER USER
      pro: { per15Min: 75 } // 75 requests / 15 mins PER USER
    }
  },
  
  // Media Upload (v1.1 endpoint)
  'POST_media_upload': {
    endpoint: 'POST /1.1/media/upload',
    limits: {
      free: { per15Min: 5 }, // Estimated based on posting limits
      basic: { per15Min: 50 }, // Estimated based on posting limits
      pro: { per15Min: 100 } // Estimated based on posting limits
    }
  }
};

export type TwitterTier = 'free' | 'basic' | 'pro' | 'enterprise';

export class TwitterRateLimiter {
  private requestCounts: Map<string, { count: number; resetTime: number; period: '15min' | '24hour' }> = new Map();
  private tier: TwitterTier;
  
  constructor(tier: TwitterTier = 'basic') {
    this.tier = tier;
    
    logger.info('TwitterRateLimiter initialized', {
      tier,
      trackingEndpoints: Object.keys(TWITTER_RATE_LIMITS).length
    });
  }
  
  /**
   * Check if a request can be made to a specific endpoint
   */
  canMakeRequest(endpointKey: string): boolean {
    const rateLimit = TWITTER_RATE_LIMITS[endpointKey];
    if (!rateLimit) {
      logger.warn('No rate limit defined for endpoint', { endpointKey });
      return true; // Allow unknown endpoints
    }
    
    // For enterprise tier, use pro limits if no enterprise-specific limits exist
    const limits = rateLimit.limits[this.tier] || 
                   (this.tier === 'enterprise' ? rateLimit.limits.pro : undefined);
    
    if (!limits) {
      logger.warn('No limits defined for tier', { endpointKey, tier: this.tier });
      return true;
    }
    
    // Check 15-minute limit first (more restrictive)
    if (limits.per15Min) {
      const key15min = `${endpointKey}_15min`;
      if (!this.checkLimit(key15min, limits.per15Min, 15 * 60 * 1000)) {
        logger.warn('15-minute rate limit exceeded', {
          endpoint: rateLimit.endpoint,
          tier: this.tier,
          limit: limits.per15Min
        });
        return false;
      }
    }
    
    // Check 24-hour limit
    if (limits.per24Hour) {
      const key24hour = `${endpointKey}_24hour`;
      if (!this.checkLimit(key24hour, limits.per24Hour, 24 * 60 * 60 * 1000)) {
        logger.warn('24-hour rate limit exceeded', {
          endpoint: rateLimit.endpoint,
          tier: this.tier,
          limit: limits.per24Hour
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
    const rateLimit = TWITTER_RATE_LIMITS[endpointKey];
    if (!rateLimit) return;
    
    // For enterprise tier, use pro limits if no enterprise-specific limits exist
    const limits = rateLimit.limits[this.tier] || 
                   (this.tier === 'enterprise' ? rateLimit.limits.pro : undefined);
    if (!limits) return;
    
    const now = Date.now();
    
    // Record for 15-minute window
    if (limits.per15Min) {
      const key15min = `${endpointKey}_15min`;
      this.incrementCounter(key15min, 15 * 60 * 1000);
    }
    
    // Record for 24-hour window
    if (limits.per24Hour) {
      const key24hour = `${endpointKey}_24hour`;
      this.incrementCounter(key24hour, 24 * 60 * 60 * 1000);
    }
    
    logger.debug('Recorded Twitter API request', {
      endpoint: rateLimit.endpoint,
      tier: this.tier,
      timestamp: now
    });
  }
  
  /**
   * Get time until rate limit resets
   */
  getTimeUntilReset(endpointKey: string): number {
    const rateLimit = TWITTER_RATE_LIMITS[endpointKey];
    if (!rateLimit) return 0;
    
    // For enterprise tier, use pro limits if no enterprise-specific limits exist
    const limits = rateLimit.limits[this.tier] || 
                   (this.tier === 'enterprise' ? rateLimit.limits.pro : undefined);
    if (!limits) return 0;
    
    let minResetTime = 0;
    
    // Check 15-minute limit reset time
    if (limits.per15Min) {
      const key15min = `${endpointKey}_15min`;
      const counter15min = this.requestCounts.get(key15min);
      if (counter15min && counter15min.count >= limits.per15Min) {
        minResetTime = Math.max(minResetTime, counter15min.resetTime - Date.now());
      }
    }
    
    // Check 24-hour limit reset time
    if (limits.per24Hour) {
      const key24hour = `${endpointKey}_24hour`;
      const counter24hour = this.requestCounts.get(key24hour);
      if (counter24hour && counter24hour.count >= limits.per24Hour) {
        minResetTime = Math.max(minResetTime, counter24hour.resetTime - Date.now());
      }
    }
    
    return Math.max(0, minResetTime);
  }
  
  /**
   * Get current usage for an endpoint
   */
  getCurrentUsage(endpointKey: string): { per15Min?: { used: number; limit: number }; per24Hour?: { used: number; limit: number } } {
    const rateLimit = TWITTER_RATE_LIMITS[endpointKey];
    if (!rateLimit) return {};
    
    // For enterprise tier, use pro limits if no enterprise-specific limits exist
    const limits = rateLimit.limits[this.tier] || 
                   (this.tier === 'enterprise' ? rateLimit.limits.pro : undefined);
    if (!limits) return {};
    
    const usage: any = {};
    
    if (limits.per15Min) {
      const key15min = `${endpointKey}_15min`;
      const counter = this.requestCounts.get(key15min);
      usage.per15Min = {
        used: counter?.count || 0,
        limit: limits.per15Min
      };
    }
    
    if (limits.per24Hour) {
      const key24hour = `${endpointKey}_24hour`;
      const counter = this.requestCounts.get(key24hour);
      usage.per24Hour = {
        used: counter?.count || 0,
        limit: limits.per24Hour
      };
    }
    
    return usage;
  }
  
  /**
   * Update the API tier (when user upgrades/downgrades)
   */
  updateTier(newTier: TwitterTier): void {
    const oldTier = this.tier;
    this.tier = newTier;
    
    logger.info('Twitter API tier updated', {
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
        period: windowMs === 15 * 60 * 1000 ? '15min' : '24hour'
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
    
    for (const [endpointKey, rateLimit] of Object.entries(TWITTER_RATE_LIMITS)) {
      status.endpoints[endpointKey] = {
        endpoint: rateLimit.endpoint,
        usage: this.getCurrentUsage(endpointKey),
        timeUntilReset: this.getTimeUntilReset(endpointKey)
      };
    }
    
    return status;
  }
} 