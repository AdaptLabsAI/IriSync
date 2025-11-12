/**
 * Error class for feature access restrictions based on subscription tier
 */
export class FeatureAccessError extends Error {
  /**
   * Create a new feature access error
   * @param message Error message
   */
  constructor(message: string) {
    super(message);
    this.name = 'FeatureAccessError';
    
    // Ensure prototype chain works properly in TypeScript
    Object.setPrototypeOf(this, FeatureAccessError.prototype);
  }
} 