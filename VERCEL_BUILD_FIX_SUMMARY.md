# Vercel Build Fix Summary

## Problem
The Next.js build was failing on Vercel during the "Collecting page data" phase with errors like:
- `Error: The default Firebase app does not exist. Make sure you call initializeApp() before using any of the Firebase services.`
- `✗ Stripe validation failed: Missing STRIPE_SECRET_KEY`
- `Error: Neither apiKey nor config.authenticator provided`
- `Error: A bucket name is needed to use Cloud Storage`

These errors occurred because environment variables were stored as GitHub Secrets (not available during build) and services were initializing at module import time.

## Root Cause
1. **Firebase client SDK** was calling `getFirestore()` at module level in multiple files
2. **Stripe client** was being instantiated with `new Stripe()` at module level
3. **Google OAuth client ID** was being read and validated at module import time
4. **Google Cloud Storage** was initializing at module level with bucket configuration
5. Next.js "Collecting page data" phase executes route code, triggering these initializations

## Solution
Implemented **lazy initialization pattern** across all services:

### 1. Firebase Changes
**Before:**
```typescript
import { getFirestore } from 'firebase/firestore';
const firestore = getFirestore(); // ❌ Fails at build time
```

**After:**
```typescript
let _firestoreInstance: any = null;
function getFirestoreInstance() {
  if (!_firestoreInstance) {
    const { firestore } = require('@/lib/core/firebase');
    _firestoreInstance = firestore;
  }
  return _firestoreInstance;
}
// Use: collection(getFirestoreInstance(), 'users')
```

### 2. Stripe Changes
**Before:**
```typescript
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || ''); // ❌ Fails at build time
```

**After:**
```typescript
let _stripe: Stripe | null = null;
function getStripeClient(): Stripe {
  if (!_stripe) {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      throw new Error('Stripe is not configured. Missing STRIPE_SECRET_KEY.');
    }
    _stripe = new Stripe(apiKey, { apiVersion: '2024-12-18.acacia' });
  }
  return _stripe;
}
```

### 3. Google OAuth Changes
**Before:**
```typescript
const GOOGLE_OAUTH_CLIENT_ID = getGoogleOAuthClientId(); // ❌ Throws if missing
```

**After:**
```typescript
export function getGoogleOAuthClientId(): string {
  return readEnv('GOOGLE_OAUTH_CLIENT_ID', { optional: true }); // ✅ Returns empty string
}

// In usage:
function getGoogleClientId(): string {
  const clientId = getGoogleOAuthClientId();
  if (!clientId) {
    throw new Error('Google OAuth is not configured. Missing GOOGLE_OAUTH_CLIENT_ID.');
  }
  return clientId;
}
```

### 4. API Route Changes
**Before:**
```typescript
import { UserService } from '@/lib/features/auth/user-service'; // ❌ Imports at module level
const userService = new UserService(); // ❌ Instantiates at module level

export async function POST(req: NextRequest) {
  // use userService
}
```

**After:**
```typescript
export async function POST(req: NextRequest) {
  // Lazy imports inside handler
  const { UserService } = await import('@/lib/features/auth/user-service');
  const userService = new UserService();
  
  try {
    // use userService
  } catch (error) {
    return NextResponse.json({
      error: 'Service Configuration Error',
      message: error.message
    }, { status: 500 });
  }
}
```

## Files Modified

### Core Services
1. `src/lib/core/firebase/index.ts` - Build-time detection, lazy initialization
2. `src/lib/features/billing/stripe.ts` - Lazy Stripe client
3. `src/lib/server/env.ts` - Build-safe environment reading
4. `src/lib/auth/user-service.ts` - Lazy Firebase & Stripe
5. `src/lib/auth/social-auth.ts` - Runtime OAuth validation
6. `src/lib/features/analytics/models/analyticsService.ts` - Lazy Firebase
7. `src/lib/features/content/SocialInboxService.ts` - Lazy Firebase

### API Routes Fixed
1. `src/app/api/analytics/ai-summary/route.ts`
2. `src/app/api/auth/register/route.ts`
3. `src/app/api/webhooks/stripe/route.ts`
4. `src/app/api/settings/connections/route.ts`
5. `src/app/api/upload/document/route.ts`

### Documentation
- `docs/ENVIRONMENT_VARIABLES.md` - Comprehensive guide

## Build Behavior

### Before
```
❌ Build fails at "Collecting page data" phase
Error: The default Firebase app does not exist
Build error occurred
```

### After
```
✅ Compiled successfully
✅ Collecting page data ...
✅ Build succeeded (even without environment variables)
```

## Runtime Behavior

When a service is not configured, clear errors are returned:

```json
{
  "error": "Service Configuration Error",
  "message": "Stripe is not configured. Missing STRIPE_SECRET_KEY.",
  "endpoint": "/api/webhooks/stripe"
}
```

## Testing Performed

1. ✅ Build without any environment variables - **SUCCESS**
2. ✅ Build logs show warnings but no failures
3. ✅ No breaking changes to existing functionality
4. ✅ Backward compatible with existing deployments

## Deployment Steps

1. **Build succeeds** without environment variables (unlike before)
2. **Set environment variables** in Vercel project settings:
   - Firebase Admin credentials
   - Stripe API keys
   - Google OAuth credentials
   - Other service credentials as needed
3. **Deploy** - features will work when variables are present, fail gracefully when missing

## Benefits

1. ✅ **CI/CD friendly** - Can build without secrets
2. ✅ **Clear errors** - Runtime failures have descriptive messages
3. ✅ **Security** - Secrets not required in build phase
4. ✅ **Best practices** - Follows Next.js 15 patterns
5. ✅ **Maintainable** - Pattern can be applied to new services

## Pattern for Future Services

When adding new external services:

```typescript
// ✅ Good: Lazy initialization
let _service: ServiceType | null = null;
function getService(): ServiceType {
  if (!_service) {
    const config = process.env.SERVICE_CONFIG;
    if (!config) {
      throw new Error('Service is not configured.');
    }
    _service = new ServiceType(config);
  }
  return _service;
}

// ❌ Bad: Module-level initialization
const service = new ServiceType(process.env.SERVICE_CONFIG);
```

## Additional Notes

- All environment variables documented in `docs/ENVIRONMENT_VARIABLES.md`
- Build-time detection uses `NEXT_PHASE` and `IS_BUILD_PHASE` checks
- Runtime initialization happens on first service access
- Error messages include specific missing variable names
- Compatible with Node 20.x and Next.js 15.5.6

## References

- Next.js Dynamic Rendering: https://nextjs.org/docs/app/building-your-application/rendering/server-components#dynamic-rendering
- Vercel Environment Variables: https://vercel.com/docs/projects/environment-variables
