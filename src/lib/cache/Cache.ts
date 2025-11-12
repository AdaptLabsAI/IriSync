/**
 * Configuration options for the cache
 */
export interface CacheOptions {
  /**
   * Default time-to-live in seconds
   */
  ttl?: number;
  
  /**
   * Maximum number of items to store
   */
  maxSize?: number;
  
  /**
   * Whether to use a least-recently-used (LRU) eviction policy
   */
  useLRU?: boolean;
}

/**
 * Cache entry with expiration
 */
interface CacheEntry<T> {
  /**
   * Cached data
   */
  data: T;
  
  /**
   * Expiration timestamp in milliseconds
   */
  expiry: number;
  
  /**
   * Last accessed timestamp for LRU
   */
  lastAccessed: number;
}

/**
 * In-memory cache implementation with TTL support
 */
export class Cache {
  private cache: Map<string, CacheEntry<any>>;
  private namespace: string;
  private options: CacheOptions;
  
  /**
   * Create a new cache instance
   * @param namespace Namespace for this cache instance
   * @param options Cache configuration options
   */
  constructor(namespace: string, options: CacheOptions = {}) {
    this.namespace = namespace;
    this.cache = new Map();
    this.options = {
      ttl: options.ttl || 3600, // Default to 1 hour
      maxSize: options.maxSize || 1000,
      useLRU: options.useLRU !== undefined ? options.useLRU : true
    };
    
    // Start the cleanup interval
    setInterval(() => this.cleanup(), 60000); // Clean up every minute
  }
  
  /**
   * Set a value in the cache
   * @param key Cache key
   * @param value Data to cache
   * @param ttl Optional TTL in seconds (overrides default)
   */
  set<T>(key: string, value: T, ttl?: number): void {
    const namespacedKey = `${this.namespace}:${key}`;
    
    // Check if we need to evict an item
    if (this.cache.size >= this.options.maxSize!) {
      this.evictOne();
    }
    
    // Calculate expiry time
    const expiry = Date.now() + ((ttl || this.options.ttl!) * 1000);
    
    // Store the item
    this.cache.set(namespacedKey, {
      data: value,
      expiry,
      lastAccessed: Date.now()
    });
  }
  
  /**
   * Get a value from the cache
   * @param key Cache key
   * @returns The cached value or null if not found or expired
   */
  get<T>(key: string): T | null {
    const namespacedKey = `${this.namespace}:${key}`;
    const entry = this.cache.get(namespacedKey);
    
    if (!entry) {
      return null;
    }
    
    // Check if expired
    if (entry.expiry < Date.now()) {
      this.cache.delete(namespacedKey);
      return null;
    }
    
    // Update last accessed time for LRU
    if (this.options.useLRU) {
      entry.lastAccessed = Date.now();
    }
    
    return entry.data;
  }
  
  /**
   * Check if a key exists and is not expired
   * @param key Cache key
   * @returns Whether the key exists and is not expired
   */
  has(key: string): boolean {
    const namespacedKey = `${this.namespace}:${key}`;
    const entry = this.cache.get(namespacedKey);
    
    if (!entry) {
      return false;
    }
    
    // Check if expired
    if (entry.expiry < Date.now()) {
      this.cache.delete(namespacedKey);
      return false;
    }
    
    return true;
  }
  
  /**
   * Delete a key from the cache
   * @param key Cache key
   */
  delete(key: string): void {
    const namespacedKey = `${this.namespace}:${key}`;
    this.cache.delete(namespacedKey);
  }
  
  /**
   * Clear all items in this namespace
   */
  clear(): void {
    this.cache.clear();
  }
  
  /**
   * Get the number of items in the cache
   */
  size(): number {
    return this.cache.size;
  }
  
  /**
   * Clean up expired items
   */
  private cleanup(): void {
    const now = Date.now();
    
    this.cache.forEach((entry, key) => {
      if (entry.expiry < now) {
        this.cache.delete(key);
      }
    });
  }
  
  /**
   * Evict one item based on policy
   */
  private evictOne(): void {
    if (this.cache.size === 0) {
      return;
    }
    
    if (this.options.useLRU) {
      // Evict least recently used
      let oldestKey: string | null = null;
      let oldestTime = Infinity;
      
      this.cache.forEach((entry, key) => {
        if (entry.lastAccessed < oldestTime) {
          oldestKey = key;
          oldestTime = entry.lastAccessed;
        }
      });
      
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    } else {
      // Random eviction if not using LRU
      const keys = Array.from(this.cache.keys());
      const randomKey = keys[Math.floor(Math.random() * keys.length)];
      this.cache.delete(randomKey);
    }
  }
}

// Export a global singleton instance
export const globalCache = new Cache('global');

// Re-export the singleton as default
export default globalCache; 