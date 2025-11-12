import { NextApiRequest, NextApiResponse } from 'next';
import { RedisService } from './redis-service';

/**
 * Interface for rate limit configuration
 */
export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  max: number; // Maximum requests in window
  standardHeaders: boolean; // Add standard rate limit headers
  keyPrefix: string; // Prefix for Redis keys
}

/**
 * Type for API handler function
 */
type ApiHandler = (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void;

/**
 * Default rate limit configuration
 */
const defaultConfig: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  standardHeaders: true,
  keyPrefix: 'ratelimit:'
};

/**
 * Middleware for rate limiting API requests
 * @param config Rate limit configuration
 * @returns Middleware function
 */
export function rateLimiter(customConfig?: Partial<RateLimitConfig>) {
  // Merge custom config with defaults
  const config = { ...defaultConfig, ...customConfig };
  
  // Create Redis service
  const redis = new RedisService();
  
  return function (handler: ApiHandler): ApiHandler {
    return async (req: NextApiRequest, res: NextApiResponse) => {
      try {
        // Get IP address or client identifier
        const identifier = (req.headers['x-forwarded-for'] as string) || 
                          req.socket.remoteAddress || 
                          'unknown';
        
        // Create rate limit key
        const key = `${config.keyPrefix}${identifier}`;
        
        // Get current request count
        const currentRequests = await redis.increment(key, 1, Math.ceil(config.windowMs / 1000));
        
        // Calculate remaining requests
        const remaining = Math.max(0, config.max - currentRequests);
        
        // Calculate reset time
        const resetTime = new Date(Date.now() + config.windowMs);
        
        // Add rate limit headers if enabled
        if (config.standardHeaders) {
          res.setHeader('X-RateLimit-Limit', config.max.toString());
          res.setHeader('X-RateLimit-Remaining', remaining.toString());
          res.setHeader('X-RateLimit-Reset', Math.ceil(resetTime.getTime() / 1000).toString());
        }
        
        // Check if rate limit exceeded
        if (currentRequests > config.max) {
          return res.status(429).json({
            error: 'Too Many Requests',
            message: 'Rate limit exceeded. Please try again later.'
          });
        }
        
        // Call the original handler if not rate limited
        return handler(req, res);
      } catch (error) {
        console.error('Rate limiter error:', error);
        
        // Call the original handler if rate limiter fails
        return handler(req, res);
      }
    };
  };
}

/**
 * Rate limit middleware with different configurations based on endpoint
 * @param configMap Map of endpoint patterns to rate limit configurations
 * @returns Middleware function
 */
export function dynamicRateLimiter(
  configMap: Record<string, Partial<RateLimitConfig>>
) {
  return function (handler: ApiHandler): ApiHandler {
    return async (req: NextApiRequest, res: NextApiResponse) => {
      // Find matching endpoint pattern
      const path = req.url || '';
      let config: RateLimitConfig = defaultConfig;
      
      for (const pattern in configMap) {
        if (new RegExp(pattern).test(path)) {
          config = { ...defaultConfig, ...configMap[pattern] };
          break;
        }
      }
      
      // Apply rate limiter with selected config
      return rateLimiter(config)(handler)(req, res);
    };
  };
} 