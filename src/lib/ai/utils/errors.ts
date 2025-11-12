/**
 * Custom error class for analysis-related errors
 */
export class AnalysisError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AnalysisError';
    
    // This is necessary for proper error handling in TypeScript
    Object.setPrototypeOf(this, AnalysisError.prototype);
  }
}

/**
 * Custom error class for AI provider related errors
 */
export class ProviderError extends Error {
  public readonly statusCode?: number;
  public readonly provider?: string;
  
  constructor(message: string, statusCode?: number, provider?: string) {
    super(message);
    this.name = 'ProviderError';
    this.statusCode = statusCode;
    this.provider = provider;
    
    // This is necessary for proper error handling in TypeScript
    Object.setPrototypeOf(this, ProviderError.prototype);
  }
}

/**
 * Custom error for when a user exceeds their usage quota
 */
export class UsageQuotaError extends Error {
  public readonly userId: string;
  public readonly quotaLimit: number;
  public readonly currentUsage: number;
  
  constructor(message: string, userId: string, quotaLimit: number, currentUsage: number) {
    super(message);
    this.name = 'UsageQuotaError';
    this.userId = userId;
    this.quotaLimit = quotaLimit;
    this.currentUsage = currentUsage;
    
    // This is necessary for proper error handling in TypeScript
    Object.setPrototypeOf(this, UsageQuotaError.prototype);
  }
}

/**
 * Custom error for when a feature is not available in the user's subscription tier
 */
export class FeatureAccessError extends Error {
  public readonly feature?: string;
  public readonly requiredTier?: string;
  
  constructor(message: string, feature?: string, requiredTier?: string) {
    super(message);
    this.name = 'FeatureAccessError';
    this.feature = feature;
    this.requiredTier = requiredTier;
    
    // This is necessary for proper error handling in TypeScript
    Object.setPrototypeOf(this, FeatureAccessError.prototype);
  }
} 