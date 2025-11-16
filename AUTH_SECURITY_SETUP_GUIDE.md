# IriSync Authentication & Security Setup Guide

## 🚨 EMERGENCY FIX - BROKEN LOGIN RESOLVED

This guide documents the fixes implemented to resolve 400 errors and broken authentication.

---

## Phase 1: Authentication Fixes ✅

### 1.1 OAuth Providers Added

**What was fixed:**
- Added LinkedIn OAuth provider
- Added Twitter OAuth provider  
- Added Facebook OAuth provider
- Updated Google OAuth with proper authorization params

**Files modified:**
- `/src/lib/auth.ts` - Added all OAuth providers to NextAuth configuration

**Required Environment Variables:**
```bash
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# LinkedIn OAuth
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret

# Twitter OAuth
TWITTER_CLIENT_ID=your-twitter-client-id
TWITTER_CLIENT_SECRET=your-twitter-client-secret

# Facebook OAuth
FACEBOOK_CLIENT_ID=your-facebook-client-id
FACEBOOK_CLIENT_SECRET=your-facebook-client-secret
```

### 1.2 NextAuth Configuration Enhanced

**What was fixed:**
- Added explicit `secret` configuration using `NEXTAUTH_SECRET`
- Updated `pages` configuration to redirect errors to `/login`
- Added `redirect` callback for proper post-login navigation
- Fixed provider order (Credentials first, then OAuth providers)

**Critical:** You MUST set `NEXTAUTH_SECRET` environment variable:
```bash
# Generate with: openssl rand -base64 32
NEXTAUTH_SECRET=your-super-secret-key-min-32-characters
```

### 1.3 OAuth Redirect URIs Setup

For each OAuth provider, add these redirect URIs in their respective developer consoles:

**Google Cloud Console** (https://console.cloud.google.com/apis/credentials):
```
Production: https://irisync.com/api/auth/callback/google
Development: http://localhost:3000/api/auth/callback/google
```

**LinkedIn Developer Portal** (https://www.linkedin.com/developers/apps):
```
Production: https://irisync.com/api/auth/callback/linkedin
Development: http://localhost:3000/api/auth/callback/linkedin
```

**Twitter Developer Portal** (https://developer.twitter.com/en/portal/projects-and-apps):
```
Production: https://irisync.com/api/auth/callback/twitter
Development: http://localhost:3000/api/auth/callback/twitter
```

**Facebook Developers** (https://developers.facebook.com/apps):
```
Production: https://irisync.com/api/auth/callback/facebook
Development: http://localhost:3000/api/auth/callback/facebook
```

---

## Phase 2: Security Enhancements ✅

### 2.1 Input Validation with Zod

**What was added:**
- Comprehensive validation schemas for all user inputs
- Type-safe validation for login, registration, posts, campaigns, and settings

**Files created:**
- `/src/lib/validation/schemas.ts` - All Zod validation schemas

**Usage example:**
```typescript
import { LoginSchema } from '@/lib/validation/schemas';

// In API route
const validated = LoginSchema.parse(requestBody);
```

### 2.2 API Error Handling

**What was added:**
- Centralized error handling utilities
- Custom error classes (AppError, ValidationError, AuthenticationError, etc.)
- Error handling middleware wrappers

**Files created:**
- `/src/lib/api-handler.ts` - Error handling utilities

**Usage example:**
```typescript
import { withErrorHandling, withAuth, validateRequest } from '@/lib/api-handler';
import { CreatePostSchema } from '@/lib/validation/schemas';

export const POST = withErrorHandling(withAuth(async (req) => {
  const body = await req.json();
  const data = validateRequest(CreatePostSchema, body);
  // ... handle request
}));
```

### 2.3 Rate Limiting with Upstash Redis

**What was added:**
- Rate limiting middleware for API routes
- Different rate limits for free and premium users
- Graceful handling when Redis is not configured

**Files created:**
- `/src/lib/rate-limit.ts` - Rate limiting configuration

**Files modified:**
- `/src/middleware.ts` - Added rate limiting to middleware

**Setup Upstash Redis:**
1. Create free account at https://upstash.com
2. Create a Redis database
3. Copy REST URL and TOKEN
4. Add to environment variables:
```bash
UPSTASH_REDIS_REST_URL=https://xxxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here
```

**Rate Limits:**
- Free users: 10 requests per 10 seconds
- Premium users: 100 requests per 10 seconds

---

## Phase 3: Environment Configuration

### 3.1 Updated Environment Files

**Files updated:**
- `/env.example` - Added all new OAuth and security variables
- `/.env.local.example` - Created comprehensive local development template

### 3.2 Vercel Environment Variables

**CRITICAL:** Update these in Vercel Dashboard (https://vercel.com/your-project/settings/environment-variables):

**Required for Production:**
```bash
# URLs
NEXTAUTH_URL=https://irisync.com
NEXT_PUBLIC_APP_URL=https://irisync.com

# Secret (Generate with: openssl rand -base64 32)
NEXTAUTH_SECRET=your-production-secret-min-32-chars

# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# LinkedIn OAuth
LINKEDIN_CLIENT_ID=...
LINKEDIN_CLIENT_SECRET=...

# Twitter OAuth
TWITTER_CLIENT_ID=...
TWITTER_CLIENT_SECRET=...

# Facebook OAuth
FACEBOOK_CLIENT_ID=...
FACEBOOK_CLIENT_SECRET=...

# Firebase Admin
FIREBASE_ADMIN_PROJECT_ID=...
FIREBASE_ADMIN_CLIENT_EMAIL=...
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Upstash Redis (for rate limiting)
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...

# Stripe (use sk_live_ keys in production)
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# OpenAI
OPENAI_API_KEY=...
AI_PROVIDER_TYPE=openai
AI_MODEL_ID=gpt-4-turbo-preview
```

---

## Phase 4: Figma MCP Integration (In Progress)

### 4.1 Figma Configuration

**Environment variables added:**
```bash
FIGMA_ACCESS_TOKEN=your-figma-token
FIGMA_PERSONAL_ACCESS_TOKEN=your-figma-token
FIGMA_FILE_KEY=your-figma-file-key
```

**How to get Figma tokens:**
1. Go to https://www.figma.com/developers/api#access-tokens
2. Navigate to Settings > Personal Access Tokens
3. Generate a new token
4. Copy the token and your file key from the Figma file URL

**File key location:**
```
Figma URL: https://www.figma.com/file/YiFahCtPWUPWbB9TcvCpsj/IriSync-Design
File Key: YiFahCtPWUPWbB9TcvCpsj (the part after /file/)
```

---

## Testing Checklist

### Local Development
- [ ] Copy `.env.local.example` to `.env.local`
- [ ] Fill in all required environment variables
- [ ] Generate NEXTAUTH_SECRET: `openssl rand -base64 32`
- [ ] Run `npm install` to ensure all dependencies are installed
- [ ] Run `npm run build` to test compilation
- [ ] Start dev server: `npm run dev`
- [ ] Test login at http://localhost:3000/login

### Production (Vercel)
- [ ] Update all environment variables in Vercel Dashboard
- [ ] Set NEXTAUTH_URL to production URL (https://irisync.com)
- [ ] Set NEXT_PUBLIC_APP_URL to production URL
- [ ] Use production OAuth credentials
- [ ] Use sk_live_ Stripe keys (not sk_test_)
- [ ] Configure OAuth redirect URIs for production domain
- [ ] Deploy and test login flow
- [ ] Verify rate limiting is working (check response headers)
- [ ] Test all OAuth providers (Google, LinkedIn, Twitter, Facebook)

### OAuth Provider Testing
- [ ] Google OAuth login works
- [ ] LinkedIn OAuth login works
- [ ] Twitter OAuth login works
- [ ] Facebook OAuth login works
- [ ] Email/password login works
- [ ] Proper redirect to /dashboard after login
- [ ] Error messages display correctly on /login page

---

## Troubleshooting

### Issue: 400 Bad Request on Login
**Solution:**
- Verify NEXTAUTH_SECRET is set and is at least 32 characters
- Check NEXTAUTH_URL matches your deployment URL
- Ensure OAuth redirect URIs are configured correctly

### Issue: "Missing credentials" error
**Solution:**
- Verify all OAuth provider credentials are set in environment variables
- Check that environment variables are not empty strings
- Restart the application after adding environment variables

### Issue: Rate limiting not working
**Solution:**
- Verify UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set
- Check Upstash dashboard to confirm database is active
- Rate limiting is optional - app works without it, just without rate protection

### Issue: OAuth redirect fails
**Solution:**
- Verify redirect URIs in OAuth provider consoles match exactly
- Include both http://localhost:3000 (dev) and https://irisync.com (prod)
- Clear browser cache and cookies
- Check OAuth provider dashboard for error logs

---

## Security Best Practices

1. **Never commit secrets to git**
   - Use `.env.local` for local development (gitignored)
   - Use Vercel environment variables for production
   - Run `npm run check-secrets` before committing

2. **Rotate secrets regularly**
   - Change NEXTAUTH_SECRET periodically
   - Rotate OAuth credentials if compromised
   - Update Stripe webhook secrets after changes

3. **Use strong NEXTAUTH_SECRET**
   - Minimum 32 characters
   - Generate with: `openssl rand -base64 32`
   - Different secret for dev and production

4. **Monitor rate limits**
   - Check X-RateLimit-* headers in API responses
   - Adjust limits in `/src/lib/rate-limit.ts` if needed
   - Upgrade to premium tier for higher limits

---

## Files Changed

### Created
- `/src/lib/validation/schemas.ts` - Zod validation schemas
- `/src/lib/api-handler.ts` - Error handling utilities
- `/src/lib/rate-limit.ts` - Rate limiting configuration
- `/.env.local.example` - Local development environment template
- `/AUTH_SECURITY_SETUP_GUIDE.md` - This guide

### Modified
- `/src/lib/auth.ts` - Added OAuth providers, secret, redirect callback
- `/src/middleware.ts` - Added rate limiting middleware
- `/env.example` - Added new environment variables

---

## Next Steps

1. **Immediate Actions (Production)**
   - [ ] Update all Vercel environment variables
   - [ ] Configure OAuth redirect URIs in provider consoles
   - [ ] Test login flow in production
   - [ ] Monitor for 400 errors in Vercel logs

2. **Short Term (This Week)**
   - [ ] Set up Upstash Redis for rate limiting
   - [ ] Complete Figma MCP integration
   - [ ] Sync UI components with Figma designs
   - [ ] Add integration tests for auth flow

3. **Medium Term (This Month)**
   - [ ] Implement advanced rate limiting strategies
   - [ ] Add authentication analytics
   - [ ] Set up monitoring and alerting
   - [ ] Document API endpoints with validation rules

---

## Support

For issues or questions:
- Email: contact@irisync.com
- Documentation: Check `/docs` folder
- Logs: Check Vercel deployment logs for errors

---

**Last Updated:** $(date)
**Status:** ✅ Phase 1 & 2 Complete, Phase 3 In Progress
