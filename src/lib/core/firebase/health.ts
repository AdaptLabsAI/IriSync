/**
 * Firebase Client Configuration Health Check
 * 
 * This module provides utilities to validate Firebase client configuration
 * and check if all required environment variables are properly set.
 * 
 * IMPORTANT: This is specifically for CLIENT-SIDE Firebase configuration.
 * All required env vars MUST start with NEXT_PUBLIC_ to be accessible in the browser.
 * 
 * Required environment variables (set in hosting platform, e.g., Vercel):
 * - NEXT_PUBLIC_FIREBASE_API_KEY
 * - NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
 * - NEXT_PUBLIC_FIREBASE_PROJECT_ID
 * - NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
 * - NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID (must be string, e.g., "554117967400")
 * - NEXT_PUBLIC_FIREBASE_APP_ID
 * 
 * WHY: These env vars are inlined by Next.js at build time for client-side access.
 * They must be set in the hosting platform (not in code) to avoid hardcoding secrets.
 */

/**
 * List of required Firebase client environment variables
 * These must ALL be present for Firebase to initialize properly
 */
const REQUIRED_FIREBASE_ENV_VARS = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
] as const;

/**
 * Check if all required Firebase client environment variables are present and valid
 * 
 * Returns true only if ALL required env vars:
 * - Exist in process.env
 * - Are non-empty strings
 * - Have been trimmed of whitespace
 * 
 * @returns {boolean} True if all required Firebase env vars are valid, false otherwise
 */
export function hasValidFirebaseClientEnv(): boolean {
  return REQUIRED_FIREBASE_ENV_VARS.every((key) => {
    const value = process.env[key];
    return typeof value === 'string' && value.trim().length > 0;
  });
}

/**
 * Get detailed information about which Firebase env vars are missing
 * Useful for debugging configuration issues
 * 
 * @returns {object} Object containing arrays of present and missing env vars
 */
export function getFirebaseEnvStatus(): {
  isValid: boolean;
  present: string[];
  missing: string[];
  environment: string;
} {
  const present: string[] = [];
  const missing: string[] = [];

  REQUIRED_FIREBASE_ENV_VARS.forEach((key) => {
    const value = process.env[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      present.push(key);
    } else {
      missing.push(key);
    }
  });

  return {
    isValid: missing.length === 0,
    present,
    missing,
    environment: process.env.NODE_ENV || 'unknown',
  };
}

/**
 * Log Firebase configuration status to console
 * Safe for production - does NOT log actual secret values
 * Only logs which keys are present or missing
 * 
 * @param {string} context - Optional context string to help identify where the log is from
 */
export function logFirebaseConfigStatus(context?: string): void {
  const status = getFirebaseEnvStatus();
  const prefix = context ? `[${context}] ` : '';
  
  if (status.isValid) {
    console.log(`${prefix}Firebase client configuration: ✓ Valid (all required env vars present)`);
  } else {
    console.error(`${prefix}Firebase client configuration: ✗ Invalid`);
    console.error(`${prefix}Missing required environment variables:`, status.missing);
    
    if (status.environment === 'production') {
      console.error(`${prefix}In production, these must be set in your hosting platform (e.g., Vercel project settings).`);
      console.error(`${prefix}Ensure the following are configured:`);
      status.missing.forEach((key) => {
        console.error(`${prefix}  - ${key}`);
      });
    } else {
      console.error(`${prefix}In development, these should be in your .env.local file.`);
      console.error(`${prefix}Add the following to .env.local:`);
      status.missing.forEach((key) => {
        console.error(`${prefix}  ${key}=your-value-here`);
      });
    }
  }
}

/**
 * Get a safe, non-sensitive summary of Firebase config status
 * This can be safely exposed to clients or logged
 * 
 * @returns {object} Safe summary object with no secret values
 */
export function getFirebaseConfigSummary(): {
  configured: boolean;
  requiredCount: number;
  presentCount: number;
  missingCount: number;
} {
  const status = getFirebaseEnvStatus();
  
  return {
    configured: status.isValid,
    requiredCount: REQUIRED_FIREBASE_ENV_VARS.length,
    presentCount: status.present.length,
    missingCount: status.missing.length,
  };
}

/**
 * Validate that messagingSenderId is a string (not scientific notation)
 * Firebase messaging sender IDs can be large numbers like 554117967400
 * which JavaScript might convert to scientific notation (5.54118E+11)
 * 
 * @returns {boolean} True if messagingSenderId is present and is a string
 */
export function isMessagingSenderIdValid(): boolean {
  const value = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
  
  if (!value || typeof value !== 'string') {
    return false;
  }
  
  // Check if it contains scientific notation (E or e)
  // Valid format should be all digits as a string: "554117967400"
  const hasScientificNotation = /[eE]/.test(value);
  
  if (hasScientificNotation) {
    console.error('Firebase messaging sender ID contains scientific notation!');
    console.error('Value received:', value);
    console.error('Expected format: "554117967400" (as a string)');
    console.error('Fix: Ensure NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID is set as a string in quotes');
    return false;
  }
  
  return true;
}

export { REQUIRED_FIREBASE_ENV_VARS };
