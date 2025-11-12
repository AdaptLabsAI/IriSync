import { TokenService } from '../../../tokens/token-service';
import { Cache } from '../../../cache/Cache';
import { logger } from '../../../logging/logger';
import { AITaskResult } from '../interfaces';

/**
 * Base class for all AI toolkit tools
 * Provides common functionality like token validation and usage tracking
 */
export abstract class BaseTool {
  protected tokenService: TokenService;
  protected cache: Cache;
  
  /**
   * Create a new tool instance
   * @param tokenService Service for token management
   */
  constructor(tokenService: TokenService) {
    this.tokenService = tokenService;
    this.cache = new Cache('ai-toolkit', { 
      ttl: 24 * 60 * 60, // 1 day default TTL
      maxSize: 1000
    });
    
    logger.debug('BaseTool initialized', { 
      tool: this.constructor.name 
    });
  }
  
  /**
   * Check if user has enough tokens for an operation
   * @param userId User ID
   * @param tokenCost Number of tokens required
   * @param organizationId Optional organization ID
   * @returns Whether user has enough tokens
   */
  protected async hasEnoughTokens(
    userId: string, 
    tokenCost: number, 
    organizationId?: string
  ): Promise<boolean> {
    try {
      return await this.tokenService.hasSufficientTokens(userId, tokenCost, organizationId);
    } catch (error) {
      logger.error('Error checking token sufficiency', {
        error: error instanceof Error ? error.message : String(error),
        userId
      });
      return false;
    }
  }
  
  /**
   * Use tokens for an operation
   * @param userId User ID
   * @param operationType Type of operation
   * @param tokenCost Number of tokens to use
   * @param metadata Additional operation metadata
   * @returns Whether the operation was successful
   */
  protected async useTokens(
    userId: string, 
    operationType: string, 
    tokenCost: number, 
    metadata?: Record<string, any>
  ): Promise<boolean> {
    try {
      return await this.tokenService.useTokens(userId, operationType, tokenCost, metadata);
    } catch (error) {
      logger.error('Error using tokens', {
        error: error instanceof Error ? error.message : String(error),
        userId, 
        operationType
      });
      return false;
    }
  }
  
  /**
   * Create a response for insufficient tokens
   * @param tokenCost Number of tokens required
   * @returns Error response
   */
  protected createInsufficientTokensResponse<T>(tokenCost: number): AITaskResult<T> {
    return {
      success: false,
      error: `Insufficient tokens. This operation requires ${tokenCost} token(s).`
    };
  }
  
  /**
   * Create an error response
   * @param error Error object or message
   * @param defaultMessage Default message if error is not provided
   * @returns Error response
   */
  protected createErrorResponse<T>(error: any, defaultMessage: string): any {
    const errorMessage = error instanceof Error ? error.message : 
      (typeof error === 'string' ? error : defaultMessage);
    
    return {
      error: errorMessage,
      tokenCost: 0,
      fromCache: false
    };
  }
  
  /**
   * Get a cache key for the specified parameters
   * @param prefix Cache key prefix
   * @param args Additional arguments to include in the cache key
   * @returns Cache key string
   */
  protected getCacheKey(prefix: string, ...args: any[]): string {
    const params = args.map(arg => {
      if (typeof arg === 'object' && arg !== null) {
        return this.hashObject(arg);
      }
      return String(arg);
    }).join(':');
    
    return `${prefix}:${params}`;
  }
  
  /**
   * Save data to the cache
   * @param key Cache key
   * @param data Data to cache
   * @param ttl Optional TTL in seconds
   */
  protected async saveToCache<T>(key: string, data: T, ttl?: number): Promise<void> {
    try {
      this.cache.set(key, data, ttl);
    } catch (error) {
      logger.warn('Error saving to cache', {
        error: error instanceof Error ? error.message : String(error),
        key
      });
    }
  }
  
  /**
   * Get data from the cache
   * @param key Cache key
   * @returns Cached data or null if not found
   */
  protected async getFromCache<T>(key: string): Promise<T | null> {
    try {
      return this.cache.get<T>(key);
    } catch (error) {
      logger.warn('Error getting from cache', {
        error: error instanceof Error ? error.message : String(error),
        key
      });
      
      return null;
    }
  }
  
  /**
   * Create a simple hash of an object for cache keys
   * @param obj Object to hash
   * @returns Hash string
   */
  protected hashObject(obj: any): string {
    const str = JSON.stringify(obj);
    let hash = 0;
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash &= hash; // Convert to 32-bit integer
    }
    
    return hash.toString(36);
  }
  
  /**
   * Hash a string for cache keys
   * @param str String to hash
   * @returns Hash string
   */
  protected hashString(str: string): string {
    let hash = 0;
    
    if (str.length === 0) {
      return hash.toString(36);
    }
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash &= hash; // Convert to 32-bit integer
    }
    
    return hash.toString(36);
  }
} 