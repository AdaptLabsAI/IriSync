// src/lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Initialize Redis client only if credentials are available
let redis: Redis | null = null;
let ratelimit: Ratelimit | null = null;
let premiumRatelimit: Ratelimit | null = null;

// Check if Upstash Redis is configured
const isRedisConfigured = () => {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
};

// Initialize rate limiters if Redis is configured
if (isRedisConfigured()) {
  try {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });

    ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '10 s'),
      analytics: true,
      prefix: '@irisync/ratelimit',
    });

    premiumRatelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, '10 s'),
      analytics: true,
      prefix: '@irisync/ratelimit/premium',
    });
  } catch (error) {
    console.warn('Failed to initialize rate limiting:', error);
  }
}

export { ratelimit, premiumRatelimit, isRedisConfigured };
