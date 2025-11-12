// Storage Cache Manager
// Production-ready caching utilities for storage operations

import { Logger } from '../../logging';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  size: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  totalSize: number;
  entryCount: number;
}

export class CacheManager {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private maxSize: number;
  private strategy: 'lru' | 'fifo' | 'lfu';
  private accessOrder: string[] = [];
  private accessCount: Map<string, number> = new Map();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalSize: 0,
    entryCount: 0
  };
  private logger: Logger;

  constructor(
    maxSize: number = 100 * 1024 * 1024, // 100MB default
    strategy: 'lru' | 'fifo' | 'lfu' = 'lru'
  ) {
    this.maxSize = maxSize;
    this.strategy = strategy;
    this.logger = new Logger('CacheManager');
    
    // Start cleanup interval
    setInterval(() => this.cleanup(), 60000); // Cleanup every minute
  }

  /**
   * Get item from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (this.isExpired(entry)) {
      this.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update access tracking
    this.updateAccess(key);
    this.stats.hits++;
    
    return entry.data;
  }

  /**
   * Set item in cache
   */
  async set<T>(key: string, data: T, ttl: number = 3600): Promise<void> {
    const size = this.calculateSize(data);
    
    // Check if we need to make space
    while (this.stats.totalSize + size > this.maxSize && this.cache.size > 0) {
      this.evictOne();
    }

    // Remove existing entry if it exists
    if (this.cache.has(key)) {
      this.delete(key);
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl * 1000, // Convert to milliseconds
      size
    };

    this.cache.set(key, entry);
    this.stats.totalSize += size;
    this.stats.entryCount++;
    
    // Update access tracking
    this.updateAccess(key);
    
    this.logger.debug('Cache entry added', { key, size, ttl });
  }

  /**
   * Delete item from cache
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    this.cache.delete(key);
    this.stats.totalSize -= entry.size;
    this.stats.entryCount--;
    
    // Remove from access tracking
    this.removeFromAccess(key);
    
    return true;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    this.accessCount.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalSize: 0,
      entryCount: 0
    };
    
    this.logger.info('Cache cleared');
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    return entry !== undefined && !this.isExpired(entry);
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats & { hitRate: number } {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? this.stats.hits / total : 0;
    
    return {
      ...this.stats,
      hitRate
    };
  }

  /**
   * Get cache keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache size in bytes
   */
  size(): number {
    return this.stats.totalSize;
  }

  /**
   * Get number of entries
   */
  count(): number {
    return this.stats.entryCount;
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (this.isExpired(entry)) {
        this.delete(key);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      this.logger.debug('Cache cleanup completed', { cleanedCount });
    }
  }

  /**
   * Check if entry is expired
   */
  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * Evict one entry based on strategy
   */
  private evictOne(): void {
    let keyToEvict: string | undefined;

    switch (this.strategy) {
      case 'lru':
        keyToEvict = this.accessOrder[0];
        break;
        
      case 'fifo':
        keyToEvict = this.cache.keys().next().value;
        break;
        
      case 'lfu':
        let minCount = Infinity;
        for (const [key, count] of Array.from(this.accessCount.entries())) {
          if (count < minCount) {
            minCount = count;
            keyToEvict = key;
          }
        }
        break;
    }

    if (keyToEvict) {
      this.delete(keyToEvict);
      this.stats.evictions++;
      this.logger.debug('Cache entry evicted', { key: keyToEvict, strategy: this.strategy });
    }
  }

  /**
   * Update access tracking for cache strategies
   */
  private updateAccess(key: string): void {
    // Update LRU order
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);

    // Update LFU count
    this.accessCount.set(key, (this.accessCount.get(key) || 0) + 1);
  }

  /**
   * Remove key from access tracking
   */
  private removeFromAccess(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessCount.delete(key);
  }

  /**
   * Calculate approximate size of data
   */
  private calculateSize(data: any): number {
    if (Buffer.isBuffer(data)) {
      return data.length;
    }
    
    if (typeof data === 'string') {
      return Buffer.byteLength(data, 'utf8');
    }
    
    if (typeof data === 'object' && data !== null) {
      try {
        return Buffer.byteLength(JSON.stringify(data), 'utf8');
      } catch {
        return 1024; // Default size for objects that can't be stringified
      }
    }
    
    return 64; // Default size for primitives
  }

  /**
   * Get cache entry info (for debugging)
   */
  getEntryInfo(key: string): {
    exists: boolean;
    size?: number;
    age?: number;
    ttl?: number;
    accessCount?: number;
  } {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return { exists: false };
    }

    return {
      exists: true,
      size: entry.size,
      age: Date.now() - entry.timestamp,
      ttl: entry.ttl,
      accessCount: this.accessCount.get(key) || 0
    };
  }

  /**
   * Prune cache to target size
   */
  pruneToSize(targetSize: number): number {
    let evictedCount = 0;
    
    while (this.stats.totalSize > targetSize && this.cache.size > 0) {
      this.evictOne();
      evictedCount++;
    }
    
    if (evictedCount > 0) {
      this.logger.info('Cache pruned to target size', { 
        evictedCount, 
        targetSize, 
        currentSize: this.stats.totalSize 
      });
    }
    
    return evictedCount;
  }

  /**
   * Set cache configuration
   */
  configure(options: {
    maxSize?: number;
    strategy?: 'lru' | 'fifo' | 'lfu';
  }): void {
    if (options.maxSize !== undefined) {
      this.maxSize = options.maxSize;
      // Prune if current size exceeds new max
      if (this.stats.totalSize > this.maxSize) {
        this.pruneToSize(this.maxSize);
      }
    }
    
    if (options.strategy !== undefined) {
      this.strategy = options.strategy;
      // Reset access tracking for new strategy
      this.accessOrder = Array.from(this.cache.keys());
      this.accessCount.clear();
      for (const key of Array.from(this.cache.keys())) {
        this.accessCount.set(key, 1);
      }
    }
    
    this.logger.info('Cache configuration updated', options);
  }
} 