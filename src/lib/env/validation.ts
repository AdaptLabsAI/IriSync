/**
 * Environment Variable Validation
 * 
 * This module ensures all required environment variables are present and valid
 * before any service initialization occurs. This should be imported first in the
 * application to catch configuration issues early.
 */

export interface EnvValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate Firebase Client environment variables
 */
export function validateFirebaseClient(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required Firebase client variables
  const required = {
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  // Check required variables
  Object.entries(required).forEach(([key, value]) => {
    if (!value || value.trim() === '') {
      errors.push(`Missing required Firebase client environment variable: ${key}`);
    }
  });

  // Validate API key format
  if (required.NEXT_PUBLIC_FIREBASE_API_KEY && 
      !required.NEXT_PUBLIC_FIREBASE_API_KEY.startsWith('AIza')) {
    errors.push('NEXT_PUBLIC_FIREBASE_API_KEY appears to be invalid (should start with "AIza")');
  }

  // Optional variables
  if (!process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET) {
    warnings.push('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET not set (may be required for storage features)');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate Firebase Admin environment variables
 */
export function validateFirebaseAdmin(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if we're in build time - skip validation during build
  const isBuildTime = 
    process.env.NEXT_PHASE === 'phase-production-build' || 
    (typeof window === 'undefined' && process.env.NODE_ENV === 'production' && process.argv.includes('build'));

  if (isBuildTime) {
    return { isValid: true, errors: [], warnings: ['Skipping Firebase Admin validation during build time'] };
  }

  // Required Firebase Admin variables
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.FIREBASE_ADMIN_PRIVATE_KEY_BASE64;

  if (!projectId) {
    errors.push('Missing Firebase Admin project ID (FIREBASE_ADMIN_PROJECT_ID or NEXT_PUBLIC_FIREBASE_PROJECT_ID)');
  }

  if (!clientEmail) {
    errors.push('Missing FIREBASE_ADMIN_CLIENT_EMAIL');
  }

  if (!privateKey) {
    errors.push('Missing Firebase Admin private key (FIREBASE_ADMIN_PRIVATE_KEY or FIREBASE_ADMIN_PRIVATE_KEY_BASE64)');
  }

  // Validate private key format
  if (privateKey && !privateKey.includes('BEGIN PRIVATE KEY')) {
    // Check if it's base64 encoded
    if (!process.env.FIREBASE_ADMIN_PRIVATE_KEY_BASE64) {
      errors.push('FIREBASE_ADMIN_PRIVATE_KEY appears to be invalid (should contain "BEGIN PRIVATE KEY")');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate Stripe environment variables
 */
export function validateStripe(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  if (!secretKey) {
    errors.push('Missing STRIPE_SECRET_KEY');
  } else if (!secretKey.startsWith('sk_')) {
    errors.push('STRIPE_SECRET_KEY appears to be invalid (should start with "sk_")');
  }

  if (!publishableKey) {
    warnings.push('Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (required for client-side Stripe features)');
  } else if (!publishableKey.startsWith('pk_')) {
    warnings.push('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY appears to be invalid (should start with "pk_")');
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    warnings.push('Missing STRIPE_WEBHOOK_SECRET (required for webhook verification)');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate Google OAuth environment variables
 */
export function validateGoogleOAuth(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId) {
    warnings.push('Missing GOOGLE_OAUTH_CLIENT_ID (required for Google Sign-in)');
  }

  if (!clientSecret) {
    warnings.push('Missing GOOGLE_CLIENT_SECRET (required for Google Sign-in)');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate NextAuth environment variables
 */
export function validateNextAuth(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!process.env.NEXTAUTH_URL) {
    errors.push('Missing NEXTAUTH_URL');
  }

  if (!process.env.NEXTAUTH_SECRET) {
    errors.push('Missing NEXTAUTH_SECRET');
  } else if (process.env.NEXTAUTH_SECRET.length < 32) {
    warnings.push('NEXTAUTH_SECRET should be at least 32 characters for security');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate all environment variables
 */
export function validateAllEnv(): EnvValidationResult {
  const results = [
    { name: 'Firebase Client', result: validateFirebaseClient() },
    { name: 'Firebase Admin', result: validateFirebaseAdmin() },
    { name: 'Stripe', result: validateStripe() },
    { name: 'Google OAuth', result: validateGoogleOAuth() },
    { name: 'NextAuth', result: validateNextAuth() },
  ];

  const allErrors: string[] = [];
  const allWarnings: string[] = [];

  results.forEach(({ name, result }) => {
    result.errors.forEach(error => allErrors.push(`[${name}] ${error}`));
    result.warnings.forEach(warning => allWarnings.push(`[${name}] ${warning}`));
  });

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  };
}

/**
 * Log validation results to console
 */
export function logValidationResults(result: EnvValidationResult, serviceName: string = 'Environment'): void {
  if (result.isValid) {
    console.log(`✓ ${serviceName} validation passed`);
  } else {
    console.error(`✗ ${serviceName} validation failed:`);
    result.errors.forEach(error => console.error(`  - ${error}`));
  }

  if (result.warnings.length > 0) {
    console.warn(`⚠ ${serviceName} warnings:`);
    result.warnings.forEach(warning => console.warn(`  - ${warning}`));
  }
}

/**
 * Validate environment and throw if critical errors exist
 * Should be called at application startup
 */
export function validateEnvOrThrow(): void {
  const result = validateAllEnv();
  
  logValidationResults(result, 'Environment Variables');

  if (!result.isValid) {
    throw new Error(
      `Environment validation failed:\n${result.errors.join('\n')}\n\n` +
      `Please ensure all required environment variables are set in your .env.local file.`
    );
  }
}
