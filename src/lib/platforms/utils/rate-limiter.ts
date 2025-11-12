import { PlatformType } from '../PlatformProvider';

/**
 * Rate limit configuration for each platform
 */
interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  cooldownPeriod: number; // milliseconds to wait after hitting limit
}

/**
 * Rate limit status for tracking API usage
 */
interface RateLimitStatus {
  minuteRequests: number;
  hourRequests: number;
  dayRequests: number;
  lastMinuteReset: number;
  lastHourReset: number;
  lastDayReset: number;
  isLimited: boolean;
  limitUntil?: number;
}

/**
 * Rate limit configurations by platform
 */
const RATE_LIMITS: Record<PlatformType, RateLimitConfig> = {
  [PlatformType.FACEBOOK]: {
    requestsPerMinute: 200,
    requestsPerHour: 1000,
    requestsPerDay: 4800,
    cooldownPeriod: 60000 // 1 minute
  },
  [PlatformType.INSTAGRAM]: {
    requestsPerMinute: 60,
    requestsPerHour: 200,
    requestsPerDay: 1000,
    cooldownPeriod: 120000 // 2 minutes
  },
  [PlatformType.TWITTER]: {
    requestsPerMinute: 50,
    requestsPerHour: 300,
    requestsPerDay: 1500,
    cooldownPeriod: 60000 // 1 minute
  },
  [PlatformType.LINKEDIN]: {
    requestsPerMinute: 60,
    requestsPerHour: 100,
    requestsPerDay: 1000,
    cooldownPeriod: 60000 // 1 minute
  },
  [PlatformType.YOUTUBE]: {
    requestsPerMinute: 60,
    requestsPerHour: 300,
    requestsPerDay: 10000,
    cooldownPeriod: 60000 // 1 minute
  },
  [PlatformType.TIKTOK]: {
    requestsPerMinute: 60,
    requestsPerHour: 300,
    requestsPerDay: 2000,
    cooldownPeriod: 60000 // 1 minute
  },
  [PlatformType.REDDIT]: {
    requestsPerMinute: 60,
    requestsPerHour: 600,
    requestsPerDay: 1000,
    cooldownPeriod: 60000 // 1 minute
  },
  [PlatformType.MASTODON]: {
    requestsPerMinute: 30,
    requestsPerHour: 300,
    requestsPerDay: 2400,
    cooldownPeriod: 60000 // 1 minute
  },
  [PlatformType.THREADS]: {
    requestsPerMinute: 60,
    requestsPerHour: 200,
    requestsPerDay: 1000,
    cooldownPeriod: 120000 // 2 minutes (same as Instagram)
  }
};

// Store rate limit status by platform and account
const rateLimitStatus: Map<string, RateLimitStatus> = new Map();

/**
 * Generate a unique key for tracking rate limits
 */
function getRateLimitKey(platformType: PlatformType, accountId: string): string {
  return `${platformType}:${accountId}`;
}

/**
 * Initialize or get rate limit status for a platform/account
 */
function getStatus(platformType: PlatformType, accountId: string): RateLimitStatus {
  const key = getRateLimitKey(platformType, accountId);
  let status = rateLimitStatus.get(key);
  
  if (!status) {
    const now = Date.now();
    status = {
      minuteRequests: 0,
      hourRequests: 0,
      dayRequests: 0,
      lastMinuteReset: now,
      lastHourReset: now,
      lastDayReset: now,
      isLimited: false
    };
    rateLimitStatus.set(key, status);
  }
  
  return status;
}

/**
 * Update rate limit counters and check for reset periods
 */
function updateCounters(status: RateLimitStatus): void {
  const now = Date.now();
  
  // Reset minute counter if needed
  if (now - status.lastMinuteReset >= 60000) {
    status.minuteRequests = 0;
    status.lastMinuteReset = now;
  }
  
  // Reset hour counter if needed
  if (now - status.lastHourReset >= 3600000) {
    status.hourRequests = 0;
    status.lastHourReset = now;
  }
  
  // Reset day counter if needed
  if (now - status.lastDayReset >= 86400000) {
    status.dayRequests = 0;
    status.lastDayReset = now;
  }
  
  // Check if cooldown period is over
  if (status.isLimited && status.limitUntil && now >= status.limitUntil) {
    status.isLimited = false;
    status.limitUntil = undefined;
  }
  
  // Increment counters
  status.minuteRequests++;
  status.hourRequests++;
  status.dayRequests++;
}

/**
 * Check if an API request would exceed rate limits
 */
export function checkRateLimit(platformType: PlatformType, accountId: string): boolean {
  const status = getStatus(platformType, accountId);
  const limits = RATE_LIMITS[platformType];
  
  // If currently limited, block the request
  if (status.isLimited) {
    return false;
  }
  
  // Update counters for time-based resets
  updateCounters(status);
  
  // Check if any limits are exceeded
  if (
    status.minuteRequests > limits.requestsPerMinute ||
    status.hourRequests > limits.requestsPerHour ||
    status.dayRequests > limits.requestsPerDay
  ) {
    // Set cooldown period
    status.isLimited = true;
    status.limitUntil = Date.now() + limits.cooldownPeriod;
    return false;
  }
  
  return true;
}

/**
 * Try to make an API request with rate limiting
 */
export async function withRateLimit<T>(
  platformType: PlatformType,
  accountId: string,
  apiCall: () => Promise<T>,
  maxRetries: number = 3,
  retryDelay: number = 1000
): Promise<T> {
  let attempts = 0;
  
  while (attempts < maxRetries) {
    // Check if rate limited
    if (!checkRateLimit(platformType, accountId)) {
      // Get status to check when rate limit will be lifted
      const status = getStatus(platformType, accountId);
      const waitTime = status.limitUntil ? status.limitUntil - Date.now() : retryDelay;
      
      // Wait and try again
      // Used for real rate limiting/retry logic in production
      await new Promise(resolve => setTimeout(resolve, waitTime));
      attempts++;
      continue;
    }
    
    try {
      // Make the API call
      return await apiCall();
    } catch (error: any) {
      // Check if error is rate limiting related
      if (error.status === 429 || (error.message && error.message.includes('rate limit'))) {
        // Mark as rate limited
        const status = getStatus(platformType, accountId);
        status.isLimited = true;
        
        // Calculate retry time based on headers or default
        const retryAfter = error.headers?.['retry-after'];
        const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : RATE_LIMITS[platformType].cooldownPeriod;
        
        status.limitUntil = Date.now() + waitTime;
        
        // Retry after waiting
        await new Promise(resolve => setTimeout(resolve, waitTime));
        attempts++;
      } else {
        // Not a rate limit error, rethrow
        throw error;
      }
    }
  }
  
  throw new Error(`Rate limit exceeded after ${maxRetries} attempts`);
}

/**
 * Reset rate limit status for testing or error recovery
 */
export function resetRateLimit(platformType: PlatformType, accountId: string): void {
  const key = getRateLimitKey(platformType, accountId);
  rateLimitStatus.delete(key);
}
