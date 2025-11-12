import { createClient, RedisClientType, RedisClientOptions } from 'redis';
import { logger } from '@/lib/logging/logger';

/**
 * Cache analytics data structure
 */
export interface CacheAnalytics {
  hits: number;
  misses: number;
  hitRate: number;
  keyCount: number;
  averageResponseTime: number;
  mostFrequentKeys: Array<{ key: string, hits: number }>;
}

/**
 * Service for Redis caching and rate limiting
 * Compatible with Google Cloud Memorystore for Redis
 */
export class RedisService {
  private client: RedisClientType;
  private isConnected: boolean = false;
  private analytics: {
    hits: number;
    misses: number;
    responseTimes: number[];
    keyHits: Map<string, number>;
  } = {
    hits: 0,
    misses: 0,
    responseTimes: [],
    keyHits: new Map()
  };
  
  constructor() {
    // Configure Redis client based on environment
    // For Google Cloud Memorystore, use REDIS_HOST, REDIS_PORT, and REDIS_PASSWORD
    const options: RedisClientOptions = {};
    
    // Use REDIS_URL if provided (complete connection string)
    if (process.env.REDIS_URL) {
      options.url = process.env.REDIS_URL;
    } else {
      // For Google Cloud Memorystore, construct connection from individual parameters
      const host = process.env.REDIS_HOST || 'localhost';
      const port = parseInt(process.env.REDIS_PORT || '6379', 10);
      
      // Set socket options for GCP Memorystore
      options.socket = {
        host,
        port,
        reconnectStrategy: (retries) => {
          // Exponential backoff with max delay of 10 seconds
          return Math.min(retries * 100, 10000);
        }
      };
      
      // Add password if provided
      if (process.env.REDIS_PASSWORD) {
        options.password = process.env.REDIS_PASSWORD;
      }
    }
    
    // Create Redis client with appropriate configuration
    this.client = createClient(options);
    
    // Set up event handlers with improved logging
    this.client.on('error', (err) => {
      logger.error('Redis connection error', { error: err.message, stack: err.stack });
      this.isConnected = false;
    });
    
    this.client.on('connect', () => {
      logger.info('Connected to Redis', { 
        host: process.env.REDIS_HOST || 'localhost',
        isMemorystore: !!process.env.REDIS_HOST && process.env.REDIS_HOST.includes('.memorystore.windows.net') 
      });
      this.isConnected = true;
    });
    
    this.client.on('reconnecting', () => {
      logger.warn('Redis reconnecting');
    });
    
    this.client.on('end', () => {
      logger.info('Redis connection closed');
      this.isConnected = false;
    });
  }
  
  /**
   * Connect to Redis
   */
  async connect(): Promise<void> {
    if (!this.isConnected) {
      try {
        await this.client.connect();
      } catch (error) {
        logger.error('Failed to connect to Redis', { 
          error: error instanceof Error ? error.message : String(error),
          host: process.env.REDIS_HOST || 'localhost'
        });
        throw error;
      }
    }
  }
  
  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.disconnect();
      this.isConnected = false;
    }
  }
  
  /**
   * Get a value from cache
   * @param key Cache key
   * @returns Cached value or null if not found
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const startTime = Date.now();
      await this.connect();
      
      const value = await this.client.get(key);
      const responseTime = Date.now() - startTime;
      
      if (!value) {
        // Record cache miss
        this.analytics.misses++;
        return null;
      }
      
      // Record cache hit and stats
      this.analytics.hits++;
      this.analytics.responseTimes.push(responseTime);
      
      // Track key hit frequency
      const currentHits = this.analytics.keyHits.get(key) || 0;
      this.analytics.keyHits.set(key, currentHits + 1);
      
      return JSON.parse(value) as T;
    } catch (error) {
      console.error('Redis get error:', error);
      // Record cache miss on error
      this.analytics.misses++;
      return null;
    }
  }
  
  /**
   * Set a value in cache
   * @param key Cache key
   * @param value Value to cache
   * @param ttl Time to live in seconds (optional)
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      await this.connect();
      
      const stringValue = JSON.stringify(value);
      
      if (ttl) {
        await this.client.set(key, stringValue, { EX: ttl });
      } else {
        await this.client.set(key, stringValue);
      }
    } catch (error) {
      console.error('Redis set error:', error);
    }
  }
  
  /**
   * Delete a value from cache
   * @param key Cache key
   */
  async delete(key: string): Promise<void> {
    try {
      await this.connect();
      await this.client.del(key);
      
      // Remove from analytics if tracked
      if (this.analytics.keyHits.has(key)) {
        this.analytics.keyHits.delete(key);
      }
    } catch (error) {
      console.error('Redis delete error:', error);
    }
  }
  
  /**
   * Check if a key exists in cache
   * @param key Cache key
   * @returns Boolean indicating if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      await this.connect();
      const exists = await this.client.exists(key);
      return exists === 1;
    } catch (error) {
      console.error('Redis exists error:', error);
      return false;
    }
  }
  
  /**
   * Increment a counter
   * @param key Counter key
   * @param increment Amount to increment (default: 1)
   * @param ttl Time to live in seconds (optional)
   * @returns New counter value
   */
  async increment(key: string, increment: number = 1, ttl?: number): Promise<number> {
    try {
      await this.connect();
      
      const value = await this.client.incrBy(key, increment);
      
      if (ttl && value === increment) {
        // Only set expiry if this is the first increment
        await this.client.expire(key, ttl);
      }
      
      return value;
    } catch (error) {
      console.error('Redis increment error:', error);
      return 0;
    }
  }
  
  /**
   * Clear entire cache (use with caution)
   */
  async clear(): Promise<void> {
    try {
      await this.connect();
      await this.client.flushAll();
      
      // Reset analytics
      this.resetAnalytics();
      
      logger.info('Redis cache cleared completely');
    } catch (error) {
      logger.error('Redis clear error:', { 
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
  
  /**
   * Get cache analytics
   * @returns Cache analytics data
   */
  getAnalytics(): CacheAnalytics {
    const totalRequests = this.analytics.hits + this.analytics.misses;
    const hitRate = totalRequests === 0 ? 0 : this.analytics.hits / totalRequests;
    
    // Calculate average response time
    const avgResponseTime = this.analytics.responseTimes.length === 0 
      ? 0 
      : this.analytics.responseTimes.reduce((sum, time) => sum + time, 0) / this.analytics.responseTimes.length;
    
    // Get most frequent keys
    const sortedKeys = Array.from(this.analytics.keyHits.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([key, hits]) => ({ key, hits }));
    
    return {
      hits: this.analytics.hits,
      misses: this.analytics.misses,
      hitRate,
      keyCount: this.analytics.keyHits.size,
      averageResponseTime: avgResponseTime,
      mostFrequentKeys: sortedKeys
    };
  }
  
  /**
   * Reset analytics data
   */
  resetAnalytics(): void {
    this.analytics = {
      hits: 0,
      misses: 0,
      responseTimes: [],
      keyHits: new Map()
    };
  }
  
  /**
   * Warm cache with predefined keys and values
   * @param entries Array of key-value pairs to cache
   * @param ttl Default TTL for all entries (optional)
   */
  async warmCache(entries: Array<{ key: string; value: any; ttl?: number }>): Promise<void> {
    try {
      await this.connect();
      
      // Set all entries
      for (const entry of entries) {
        await this.set(entry.key, entry.value, entry.ttl);
      }
      
      console.log(`Cache warmed with ${entries.length} entries`);
    } catch (error) {
      console.error('Cache warming error:', error);
    }
  }
  
  /**
   * Warm cache with the most frequently accessed keys
   * @param count Number of top keys to warm
   */
  async warmWithTopKeys(count: number = 20): Promise<void> {
    try {
      // Get the most frequently accessed keys
      const topKeys = Array.from(this.analytics.keyHits.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, count)
        .map(([key]) => key);
      
      // Log the operation
      console.log(`Warming cache with top ${topKeys.length} keys`);
      
      // No keys to warm
      if (topKeys.length === 0) {
        return;
      }
      
      await this.connect();
      
      // For each key, reset its TTL to keep it in cache longer
      for (const key of topKeys) {
        const value = await this.client.get(key);
        if (value) {
          // Extend TTL to 1 hour for frequently accessed keys
          await this.client.expire(key, 3600);
        }
      }
    } catch (error) {
      console.error('Top keys warming error:', error);
    }
  }

  /**
   * Delete keys with pattern (uses SCAN for efficiency)
   * Useful for clearing namespace-based keys
   * @param pattern Key pattern to delete (e.g., "prefix:*")
   * @returns Number of keys deleted
   */
  async delete(pattern: string): Promise<number> {
    try {
      await this.connect();
      
      // If the pattern doesn't include a wildcard, delete single key
      if (!pattern.includes('*')) {
        await this.client.del(pattern);
        return 1;
      }
      
      // For patterns, use scan to find and delete matching keys
      let deleted = 0;
      let cursor = 0;
      
      do {
        const scanResult = await this.client.scan(cursor, {
          MATCH: pattern,
          COUNT: 100 // Process in batches of 100 keys
        });
        
        cursor = parseInt(scanResult.cursor, 10);
        const keys = scanResult.keys;
        
        if (keys.length > 0) {
          // Delete keys in a pipeline for efficiency
          const pipeline = this.client.multi();
          
          keys.forEach(key => {
            pipeline.del(key);
          });
          
          await pipeline.exec();
          deleted += keys.length;
        }
      } while (cursor !== 0);
      
      return deleted;
    } catch (error) {
      logger.error('Redis delete error:', { 
        error: error instanceof Error ? error.message : String(error),
        pattern 
      });
      return 0;
    }
  }
} 