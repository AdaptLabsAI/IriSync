# Environment-First Initialization Guide

## Overview

This document describes the updated initialization flow for IriSync, which prioritizes environment variable validation before service initialization. This ensures that all required configuration is present and valid before attempting to initialize Firebase, Stripe, Google APIs, and other services.

## Architecture Changes

### 1. Central Environment Validation

**Location**: `src/lib/env/validation.ts`

A new centralized validation module has been created that validates all required environment variables before any service initialization occurs. This module provides:

- Individual validators for each service (Firebase, Stripe, Google OAuth, NextAuth)
- Comprehensive error messages for missing or invalid variables
- Warning messages for optional but recommended variables
- Type-safe validation functions with detailed results

### 2. Initialization Order

The new initialization flow follows this order:

```
1. Environment Variable Validation
   ↓
2. Firebase Admin SDK Initialization (if env vars valid)
   ↓
3. Firebase Client SDK Initialization (if env vars valid)
   ↓
4. Stripe Client Initialization (if env vars valid)
   ↓
5. Other Services (Google OAuth, NextAuth, etc.)
```

### 3. Service-Specific Changes

#### Firebase Admin SDK (`src/lib/core/firebase/admin.ts`)

- Now validates environment variables using `validateFirebaseAdmin()` before initialization
- Logs validation results to console for debugging
- Skips initialization gracefully if validation fails
- Maintains build-time detection to skip initialization during builds

#### Firebase Client SDK (`src/lib/core/firebase/client.ts`)

- Uses centralized configuration from `firebaseConfig.ts`
- Validates configuration before attempting to initialize
- Provides clear error messages for missing configuration

#### Stripe (`src/lib/features/billing/stripe.ts`)

- Validates Stripe environment variables on module load
- Uses latest stable Stripe API version (2024-12-18.acacia)
- Provides detailed error messages for configuration issues

## Environment Variables

### Required for Firebase Admin

```env
FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_CLIENT_EMAIL=your-client-email@project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**Alternative**: You can use `FIREBASE_ADMIN_PRIVATE_KEY_BASE64` if you prefer base64-encoded keys.

### Required for Firebase Client

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

### Required for Stripe

```env
STRIPE_SECRET_KEY=sk_test_... (or sk_live_... for production)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... (or pk_live_... for production)
```

### Optional but Recommended

```env
# Storage
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com

# Webhooks
STRIPE_WEBHOOK_SECRET=whsec_...

# Google OAuth
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# NextAuth
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-32-char-secret
```

## Validation Results

When the application starts, you'll see validation results in the console:

### Success Example

```
✓ Firebase Admin validation passed
✓ Firebase Client validation passed
✓ Stripe validation passed
⚠ Google OAuth warnings:
  - Missing GOOGLE_OAUTH_CLIENT_ID (required for Google Sign-in)
```

### Failure Example

```
✗ Firebase Admin validation failed:
  - Missing FIREBASE_ADMIN_CLIENT_EMAIL
  - Missing Firebase Admin private key (FIREBASE_ADMIN_PRIVATE_KEY or FIREBASE_ADMIN_PRIVATE_KEY_BASE64)
```

## Usage in Code

### Validating Specific Services

```typescript
import { 
  validateFirebaseAdmin, 
  validateStripe,
  logValidationResults 
} from '@/lib/env/validation';

// Validate Firebase Admin
const result = validateFirebaseAdmin();
logValidationResults(result, 'Firebase Admin');

if (!result.isValid) {
  // Handle validation failure
  console.error('Firebase Admin configuration is invalid');
}
```

### Validating All Services at Startup

```typescript
import { validateEnvOrThrow } from '@/lib/env/validation';

// This will validate all services and throw an error if any critical validation fails
try {
  validateEnvOrThrow();
} catch (error) {
  console.error('Environment validation failed:', error.message);
  process.exit(1);
}
```

## Build-Time Behavior

During build time (`next build`), the validation system:

1. Detects build-time environment using `NEXT_PHASE` and other indicators
2. Skips validation for server-side environment variables (they won't be available)
3. Only validates client-side environment variables (prefixed with `NEXT_PUBLIC_`)
4. Allows the build to proceed even if some variables are missing

This ensures that builds can complete successfully in CI/CD environments where production secrets aren't available.

## Migration Guide

### For Existing Code

If you have existing code that initializes Firebase or Stripe, no changes are required. The validation happens automatically on module load.

However, if you want to add explicit validation, you can:

```typescript
// Old way (still works)
import { getStripeClient } from '@/lib/features/billing/stripe';

const stripe = getStripeClient();

// New way (with explicit validation)
import { validateStripe, logValidationResults } from '@/lib/env/validation';
import { getStripeClient } from '@/lib/features/billing/stripe';

const result = validateStripe();
logValidationResults(result, 'Stripe');

if (result.isValid) {
  const stripe = getStripeClient();
}
```

## Troubleshooting

### Issue: "Firebase Admin validation failed"

**Solution**: Ensure all required Firebase Admin environment variables are set in your `.env.local` file or deployment environment.

### Issue: "STRIPE_SECRET_KEY appears to be invalid"

**Solution**: Stripe secret keys should start with `sk_test_` (test mode) or `sk_live_` (production). Check that you haven't accidentally used the publishable key.

### Issue: "Firebase API key appears to be invalid"

**Solution**: Firebase API keys should start with `AIza`. If yours doesn't, you may have copied the wrong value from the Firebase console.

### Issue: Build fails with "Environment validation failed"

**Solution**: During builds, only client-side (`NEXT_PUBLIC_*`) variables are validated. Ensure these are set in your CI/CD environment or use `.env` file.

## Security Best Practices

1. **Never commit secrets to Git**
   - Use `.env.local` for local development
   - Add `.env.local` to `.gitignore`
   - Use environment variables in CI/CD and production

2. **Use different keys for development and production**
   - Test keys: `sk_test_...`, `pk_test_...`
   - Production keys: `sk_live_...`, `pk_live_...`

3. **Rotate secrets regularly**
   - Update Firebase service account keys periodically
   - Rotate Stripe webhook secrets if compromised
   - Change NextAuth secrets when team members leave

4. **Validate on every deployment**
   - The validation system runs automatically
   - Check logs for validation warnings
   - Fix any warnings before releasing to production

## Additional Resources

- [Firebase Admin SDK Setup](https://firebase.google.com/docs/admin/setup)
- [Stripe API Keys](https://stripe.com/docs/keys)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [NextAuth.js Configuration](https://next-auth.js.org/configuration/options)
