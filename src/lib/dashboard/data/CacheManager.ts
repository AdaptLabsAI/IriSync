// CacheManager - Dashboard data caching service
// Production-ready caching following existing codebase patterns

import { logger } from '@/lib/logging/logger';
import {
  CacheConfig,
  DashboardErrorClass,
  DashboardErrorType
} from '../types';

/**
 * Cache entry interface
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  key: string;
}

/**
 * CacheManager - Manages dashboard data caching
 */
export class CacheManager {
  private cache: Map<string, CacheEntry<any>>;
  private config: CacheConfig;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config?: Partial<CacheConfig>) {
    this.cache = new Map();
    this.config = {
      enabled: true,
      ttl: 300, // 5 minutes default
      maxSize: 100, // 100MB default
      strategy: 'lru',
      keyPrefix: 'dashboard',
      ...config
    };

    // Start cleanup interval
    if (this.config.enabled) {
      this.startCleanupInterval();
    }
  }

  /**
   * Get data from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      if (!this.config.enabled) {
        return null;
      }

      const fullKey = this.getFullKey(key);
      const entry = this.cache.get(fullKey);

      if (!entry) {
        logger.debug('Cache miss', { key: fullKey });
        return null;
      }

      // Check if entry has expired
      const now = Date.now();
      if (now - entry.timestamp > entry.ttl * 1000) {
        logger.debug('Cache entry expired', { key: fullKey, age: now - entry.timestamp });
        this.cache.delete(fullKey);
        return null;
      }

      logger.debug('Cache hit', { key: fullKey });
      return entry.data;
    } catch (error) {
      logger.error('Error getting from cache', { key, error });
      return null;
    }
  }

  /**
   * Set data in cache
   */
  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    try {
      if (!this.config.enabled) {
        return;
      }

      const fullKey = this.getFullKey(key);
      const entryTtl = ttl || this.config.ttl;
      const timestamp = Date.now();

      const entry: CacheEntry<T> = {
        data,
        timestamp,
        ttl: entryTtl,
        key: fullKey
      };

      // Check cache size and evict if necessary
      await this.evictIfNecessary();

      this.cache.set(fullKey, entry);
      
      logger.debug('Cache set', { 
        key: fullKey, 
        ttl: entryTtl,
        cacheSize: this.cache.size
      });
    } catch (error) {
      logger.error('Error setting cache', { key, error });
      throw new DashboardErrorClass(
        DashboardErrorType.CACHE_ERROR,
        'Failed to set cache entry',
        undefined,
        undefined,
        new Date(),
        { key },
        error instanceof Error ? error.stack : undefined
      );
    }
  }

  /**
   * Delete data from cache
   */
  async delete(key: string): Promise<void> {
    try {
      const fullKey = this.getFullKey(key);
      const deleted = this.cache.delete(fullKey);
      
      if (deleted) {
        logger.debug('Cache entry deleted', { key: fullKey });
      }
    } catch (error) {
      logger.error('Error deleting from cache', { key, error });
    }
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    try {
      const size = this.cache.size;
      this.cache.clear();
      logger.info('Cache cleared', { entriesRemoved: size });
    } catch (error) {
      logger.error('Error clearing cache', { error });
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    entries: number;
    hitRate: number;
    memoryUsage: number;
  } {
    const entries = this.cache.size;
    const memoryUsage = this.estimateMemoryUsage();

    return {
      size: entries,
      entries,
      hitRate: 0, // Would need to track hits/misses for accurate calculation
      memoryUsage
    };
  }

  /**
   * Check if cache contains key
   */
  has(key: string): boolean {
    const fullKey = this.getFullKey(key);
    return this.cache.has(fullKey);
  }

  /**
   * Get or set pattern - get from cache or execute function and cache result
   */
  async getOrSet<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    try {
      // Try to get from cache first
      const cached = await this.get<T>(key);
      if (cached !== null) {
        return cached;
      }

      // Execute function and cache result
      const data = await fetchFunction();
      await this.set(key, data, ttl);
      
      return data;
    } catch (error) {
      logger.error('Error in getOrSet', { key, error });
      throw error;
    }
  }

  /**
   * Invalidate cache entries by pattern
   */
  async invalidatePattern(pattern: string): Promise<number> {
    try {
      let invalidated = 0;
      const regex = new RegExp(pattern);

      for (const [key] of Array.from(this.cache.entries())) {
        if (regex.test(key)) {
          this.cache.delete(key);
          invalidated++;
        }
      }

      logger.info('Cache pattern invalidated', { pattern, invalidated });
      return invalidated;
    } catch (error) {
      logger.error('Error invalidating cache pattern', { pattern, error });
      return 0;
    }
  }

  /**
   * Warm up cache with data
   */
  async warmUp(entries: Array<{ key: string; data: any; ttl?: number }>): Promise<void> {
    try {
      logger.info('Warming up cache', { entryCount: entries.length });

      for (const entry of entries) {
        await this.set(entry.key, entry.data, entry.ttl);
      }

      logger.info('Cache warm up completed', { entryCount: entries.length });
    } catch (error) {
      logger.error('Error warming up cache', { error });
      throw new DashboardErrorClass(
        DashboardErrorType.CACHE_ERROR,
        'Failed to warm up cache',
        undefined,
        undefined,
        new Date(),
        { entryCount: entries.length },
        error instanceof Error ? error.stack : undefined
      );
    }
  }

  /**
   * Get full cache key with prefix
   */
  private getFullKey(key: string): string {
    return `${this.config.keyPrefix}:${key}`;
  }

  /**
   * Evict entries if cache is too large
   */
  private async evictIfNecessary(): Promise<void> {
    const maxEntries = Math.floor(this.config.maxSize * 1024 * 1024 / 1000); // Rough estimate
    
    if (this.cache.size >= maxEntries) {
      const entriesToEvict = Math.floor(maxEntries * 0.1); // Evict 10%
      
      switch (this.config.strategy) {
        case 'lru':
          await this.evictLRU(entriesToEvict);
          break;
        case 'fifo':
          await this.evictFIFO(entriesToEvict);
          break;
        case 'ttl':
          await this.evictByTTL(entriesToEvict);
          break;
      }
    }
  }

  /**
   * Evict least recently used entries
   */
  private async evictLRU(count: number): Promise<void> {
    // Simple LRU - in production, would use a proper LRU implementation
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    for (let i = 0; i < Math.min(count, entries.length); i++) {
      this.cache.delete(entries[i][0]);
    }
    
    logger.debug('LRU eviction completed', { evicted: Math.min(count, entries.length) });
  }

  /**
   * Evict first in, first out entries
   */
  private async evictFIFO(count: number): Promise<void> {
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    for (let i = 0; i < Math.min(count, entries.length); i++) {
      this.cache.delete(entries[i][0]);
    }
    
    logger.debug('FIFO eviction completed', { evicted: Math.min(count, entries.length) });
  }

  /**
   * Evict entries by TTL (shortest TTL first)
   */
  private async evictByTTL(count: number): Promise<void> {
    const entries = Array.from(this.cache.entries());
    const now = Date.now();
    
    // Sort by remaining TTL
    entries.sort((a, b) => {
      const aRemaining = (a[1].timestamp + a[1].ttl * 1000) - now;
      const bRemaining = (b[1].timestamp + b[1].ttl * 1000) - now;
      return aRemaining - bRemaining;
    });
    
    for (let i = 0; i < Math.min(count, entries.length); i++) {
      this.cache.delete(entries[i][0]);
    }
    
    logger.debug('TTL eviction completed', { evicted: Math.min(count, entries.length) });
  }

  /**
   * Start cleanup interval to remove expired entries
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, 60000); // Run every minute
  }

  /**
   * Clean up expired entries
   */
  private cleanupExpired(): void {
    try {
      const now = Date.now();
      let cleaned = 0;

      for (const [key, entry] of Array.from(this.cache.entries())) {
        if (now - entry.timestamp > entry.ttl * 1000) {
          this.cache.delete(key);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        logger.debug('Cache cleanup completed', { cleaned, remaining: this.cache.size });
      }
    } catch (error) {
      logger.error('Error during cache cleanup', { error });
    }
  }

  /**
   * Estimate memory usage (rough calculation)
   */
  private estimateMemoryUsage(): number {
    let totalSize = 0;
    
    for (const [key, entry] of Array.from(this.cache.entries())) {
      // Rough estimation: key size + JSON string size
      totalSize += key.length * 2; // UTF-16 characters
      totalSize += JSON.stringify(entry.data).length * 2;
      totalSize += 100; // Overhead for entry metadata
    }
    
    return totalSize; // Returns bytes
  }

  /**
   * Destroy cache manager and cleanup
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    this.cache.clear();
    logger.info('Cache manager destroyed');
  }
} 