import { NextApiRequest, NextApiResponse } from 'next';
import { RedisService } from './redis-service';

/**
 * Interface for cache configuration
 */
export interface CacheConfig {
  ttl: number; // Time to live in seconds
  keyPrefix: string; // Prefix for cache keys
  methods: string[]; // HTTP methods to cache
  customKey?: (req: NextApiRequest) => string; // Custom key generator
}

/**
 * Type for API handler function
 */
type ApiHandler = (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void;

/**
 * Default cache configuration
 */
const defaultConfig: CacheConfig = {
  ttl: 60, // 1 minute
  keyPrefix: 'apicache:',
  methods: ['GET']
};

/**
 * Interface for cached response
 */
interface CachedResponse {
  status: number;
  headers: Record<string, string>;
  body: any;
  timestamp: number;
}

/**
 * Custom response object for caching
 */
class CacheableResponse {
  private originalJson: any;
  private originalStatus: any;
  private originalSetHeader: any;
  private originalEnd: any;
  private originalWrite: any;
  private res: NextApiResponse;
  private statusCode: number = 200;
  private headers: Record<string, string> = {};
  private body: any = null;
  private cacheKey: string;
  private redis: RedisService;
  private config: CacheConfig;
  
  constructor(res: NextApiResponse, cacheKey: string, redis: RedisService, config: CacheConfig) {
    this.res = res;
    this.cacheKey = cacheKey;
    this.redis = redis;
    this.config = config;
    
    // Store original methods
    this.originalJson = res.json;
    this.originalStatus = res.status;
    this.originalSetHeader = res.setHeader;
    this.originalEnd = res.end;
    this.originalWrite = res.write;
    
    // Override methods
    this.setupOverrides();
  }
  
  /**
   * Set up method overrides for capturing response
   */
  private setupOverrides() {
    const self = this;
    
    // Override status method
    this.res.status = (code: number) => {
      self.statusCode = code;
      return self.originalStatus.call(self.res, code);
    };
    
    // Override setHeader method
    this.res.setHeader = (name: string, value: string) => {
      self.headers[name.toLowerCase()] = value;
      return self.originalSetHeader.call(self.res, name, value);
    };
    
    // Override json method
    this.res.json = (body: any) => {
      self.body = body;
      
      // Cache response if status is 200
      if (self.statusCode === 200) {
        self.cacheResponse();
      }
      
      return self.originalJson.call(self.res, body);
    };
    
    // Override write and end for non-JSON responses
    this.res.write = (chunk: any) => {
      if (!self.body) {
        self.body = chunk;
      }
      return self.originalWrite.call(self.res, chunk);
    };
    
    this.res.end = (chunk?: any) => {
      if (chunk && !self.body) {
        self.body = chunk;
      }
      
      // Cache response if status is 200
      if (self.statusCode === 200 && self.body) {
        self.cacheResponse();
      }
      
      return self.originalEnd.call(self.res, chunk);
    };
  }
  
  /**
   * Cache the response in Redis
   */
  private async cacheResponse() {
    try {
      const cachedResponse: CachedResponse = {
        status: this.statusCode,
        headers: this.headers,
        body: this.body,
        timestamp: Date.now()
      };
      
      await this.redis.set(
        this.cacheKey,
        cachedResponse,
        this.config.ttl
      );
    } catch (error) {
      console.error('Error caching response:', error);
    }
  }
}

/**
 * Middleware for caching API responses
 * @param config Cache configuration
 * @returns Middleware function
 */
export function apiCache(customConfig?: Partial<CacheConfig>) {
  // Merge custom config with defaults
  const config = { ...defaultConfig, ...customConfig };
  
  // Create Redis service
  const redis = new RedisService();
  
  return function (handler: ApiHandler): ApiHandler {
    return async (req: NextApiRequest, res: NextApiResponse) => {
      // Only cache configured methods
      if (!config.methods.includes(req.method || 'GET')) {
        return handler(req, res);
      }
      
      // Generate cache key
      let cacheKey: string;
      if (config.customKey) {
        cacheKey = `${config.keyPrefix}${config.customKey(req)}`;
      } else {
        const queryString = JSON.stringify(req.query);
        cacheKey = `${config.keyPrefix}${req.url}:${queryString}`;
      }
      
      try {
        // Check cache for existing response
        const cachedData = await redis.get<CachedResponse>(cacheKey);
        
        if (cachedData) {
          // Add cache header
          res.setHeader('X-Cache', 'HIT');
          
          // Apply cached headers
          Object.entries(cachedData.headers).forEach(([name, value]) => {
            res.setHeader(name, value);
          });
          
          // Send cached response
          return res.status(cachedData.status).json(cachedData.body);
        }
        
        // Cache miss, add header
        res.setHeader('X-Cache', 'MISS');
        
        // Create cacheable response
        new CacheableResponse(res, cacheKey, redis, config);
        
        // Call the original handler
        return handler(req, res);
      } catch (error) {
        console.error('API cache error:', error);
        
        // Call the original handler if caching fails
        return handler(req, res);
      }
    };
  };
}

/**
 * Invalidate a specific cache entry
 * @param key Cache key
 */
export async function invalidateCache(key: string): Promise<void> {
  const redis = new RedisService();
  await redis.delete(key);
}

/**
 * Invalidate all cache entries matching a pattern
 * @param pattern Key pattern
 */
export async function invalidateCachePattern(pattern: string): Promise<void> {
  // This would normally use Redis SCAN and DEL commands
  // For Phase 0, we're just implementing the interface
  console.log(`Invalidating cache for pattern: ${pattern}`);
} 