/**
 * Cache system for IriSync
 * Exports cache functionality for various components
 */

// Export cache components
export * from './api-cache';
export * from './redis-service';
export * from './rate-limiter';

// Default cache interface
export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  namespace?: string; // Cache namespace for grouping related items
  serialize?: boolean; // Whether to serialize/deserialize the data
}

// Default cache interface
export interface CacheProvider {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, options?: CacheOptions): Promise<void>;
  delete(key: string): Promise<void>;
  flush(namespace?: string): Promise<void>;
}

/**
 * Cache implementation for storing data with expiration
 */
export class Cache {
  private cache: Map<string, { data: any; expiry: number }>;
  private defaultTtl: number;
  
  /**
   * Create a new cache instance
   * @param defaultTtl Default TTL in seconds
   */
  constructor(defaultTtl: number = 3600) {
    this.cache = new Map();
    this.defaultTtl = defaultTtl;
  }
  
  /**
   * Set a value in the cache
   * @param key Cache key
   * @param value Value to store
   * @param ttl TTL in seconds (optional, uses default if not provided)
   */
  set(key: string, value: any, ttl?: number): void {
    const expiryTime = Date.now() + (ttl || this.defaultTtl) * 1000;
    this.cache.set(key, { data: value, expiry: expiryTime });
  }
  
  /**
   * Get a value from the cache
   * @param key Cache key
   * @returns Cached value or undefined if not found or expired
   */
  get<T>(key: string): T | undefined {
    const item = this.cache.get(key);
    
    // Return undefined if item doesn't exist
    if (!item) {
      return undefined;
    }
    
    // Check if the item has expired
    if (Date.now() > item.expiry) {
      this.delete(key);
      return undefined;
    }
    
    return item.data as T;
  }
  
  /**
   * Remove an item from the cache
   * @param key Cache key
   */
  delete(key: string): void {
    this.cache.delete(key);
  }
  
  /**
   * Clear the entire cache
   */
  clear(): void {
    this.cache.clear();
  }
  
  /**
   * Get all keys in the cache
   * @returns Array of keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }
  
  /**
   * Get the number of items in the cache
   * @returns Item count
   */
  size(): number {
    return this.cache.size;
  }
  
  /**
   * Clear expired items from the cache
   * @returns Number of items removed
   */
  clearExpired(): number {
    const now = Date.now();
    let removed = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
        removed++;
      }
    }
    
    return removed;
  }
  
  /**
   * Check if a key exists and is not expired
   * @param key Cache key
   * @returns Whether the key exists
   */
  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;
    
    if (Date.now() > item.expiry) {
      this.delete(key);
      return false;
    }
    
    return true;
  }
}

// Export a global singleton instance
export const globalCache = new Cache();

// Re-export the singleton as default
export default globalCache; 