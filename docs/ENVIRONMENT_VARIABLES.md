# Environment Variables Guide

This document describes all environment variables required by IriSync and explains the runtime behavior when they are missing.

## Build-Time vs Runtime Behavior

**Important**: IriSync is designed to **build successfully even without environment variables**. Missing environment variables will not cause build failures.

Instead:
- The build process will log warnings about missing variables
- At **runtime**, when a feature that requires a missing variable is accessed, it will return a clear error response (HTTP 500) with a descriptive message
- This allows the application to be built in CI/CD pipelines without requiring all production secrets

## Required Environment Variables

### Firebase Configuration

#### Firebase Client SDK (NEXT_PUBLIC_*)
These variables are required for client-side Firebase operations:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
```

**Runtime behavior if missing**: Firebase features will use a mock implementation during build. At runtime, Firebase operations will fail with descriptive errors.

#### Firebase Admin SDK
These variables are required for server-side Firebase operations:

```bash
FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
# OR use base64 encoded key:
FIREBASE_ADMIN_PRIVATE_KEY_BASE64=base64_encoded_private_key
# OR provide full service account JSON:
FIREBASE_ADMIN_SERVICE_ACCOUNT='{"project_id":"...","private_key":"...","client_email":"..."}'
```

**Runtime behavior if missing**: API routes that require Firebase Admin (user management, database operations) will return:
```json
{
  "error": "Service Configuration Error",
  "message": "Firebase is not configured."
}
```

#### Firebase Storage
Required for file uploads:

```bash
FIREBASE_ADMIN_STORAGE_BUCKET=your-project.appspot.com
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_SERVICE_ACCOUNT_KEY='{"project_id":"...","private_key":"...","client_email":"..."}'
```

**Runtime behavior if missing**: Upload routes will return:
```json
{
  "error": "Service Configuration Error",
  "message": "Firebase Storage is not configured. Missing required environment variables."
}
```

### Stripe Configuration

```bash
STRIPE_SECRET_KEY=sk_test_... or sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... or pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Runtime behavior if missing**:
- Routes using Stripe will return: `{"error": "Service Configuration Error", "message": "Stripe is not configured. Missing STRIPE_SECRET_KEY."}`
- Webhook routes will return: `{"error": "Server Configuration Error", "message": "Webhook secret not configured. Missing STRIPE_WEBHOOK_SECRET."}`
- Client-side Stripe features will be disabled

### Google OAuth Configuration

```bash
GOOGLE_OAUTH_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
```

**Runtime behavior if missing**: 
- Google Sign-in will return: `{"error": "Service Configuration Error", "message": "Google OAuth is not configured. Missing GOOGLE_OAUTH_CLIENT_ID."}`
- Google Drive, YouTube, and Analytics integrations will be unavailable

### NextAuth Configuration

```bash
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your-secret-key-at-least-32-characters
```

**Runtime behavior if missing**: Authentication will fail to initialize.

### AI Services (Optional)

```bash
OPENAI_API_KEY=sk-...
GEN_LANG_API_KEY=...
```

**Runtime behavior if missing**: AI-powered features (content generation, analytics insights) will return errors indicating the service is unavailable.

### Other Platform Integrations (Optional)

```bash
# Social Media Platform Credentials
TWITTER_API_KEY=...
TWITTER_API_SECRET=...
FACEBOOK_APP_ID=...
FACEBOOK_APP_SECRET=...
LINKEDIN_CLIENT_ID=...
LINKEDIN_CLIENT_SECRET=...

# Email Service
SENDGRID_API_KEY=...
```

**Runtime behavior if missing**: Specific platform integrations will be unavailable, returning clear error messages when accessed.

## Deployment on Vercel

### Setting Environment Variables

1. Navigate to your Vercel project dashboard
2. Go to **Settings** > **Environment Variables**
3. Add each variable with the appropriate value
4. Select the appropriate environments (Production, Preview, Development)

### From GitHub Secrets to Vercel

If your secrets are currently in GitHub:
1. Copy each secret value from GitHub repository settings
2. Paste into Vercel environment variables
3. Ensure you include all required variables listed above

### Vercel-Specific Variables

Vercel automatically provides:
```bash
NEXT_RUNTIME=nodejs  # or edge
VERCEL=1
```

These are used by the application to detect runtime environment.

## Environment Variable Validation

The application includes built-in validation that:
- **During build**: Logs warnings about missing variables but does not fail
- **During runtime**: Validates variables when features are accessed
- **Returns clear errors**: HTTP 500 responses with descriptive JSON errors

Example validation log during build:
```
Skipping Firebase Admin initialization - build time or missing required env vars
Environment variable GOOGLE_OAUTH_CLIENT_ID not available during build
```

Example runtime error response:
```json
{
  "error": "Service Configuration Error",
  "message": "Stripe is not configured. Missing STRIPE_SECRET_KEY.",
  "endpoint": "/api/webhooks/stripe"
}
```

## Security Best Practices

1. **Never commit** `.env.local` or `.env` files to version control
2. **Use separate** environment variables for development, staging, and production
3. **Rotate secrets** regularly, especially API keys
4. **Limit access** to environment variables in your deployment platform
5. **Use service accounts** with minimal required permissions
6. **Enable monitoring** for failed authentication attempts

## Troubleshooting

### Build Succeeds but Runtime Fails

If your build succeeds but features fail at runtime:
1. Check Vercel logs for specific error messages
2. Verify environment variables are set in Vercel dashboard
3. Ensure variable names match exactly (case-sensitive)
4. Check that multi-line variables (like private keys) are properly formatted

### Firebase Initialization Errors

If you see "Firebase app does not exist" errors:
1. Verify all Firebase Admin environment variables are set
2. Check that the private key is properly formatted (with `\n` for newlines)
3. Ensure the service account has the necessary permissions

### Stripe Errors

If Stripe operations fail:
1. Verify `STRIPE_SECRET_KEY` starts with `sk_`
2. Check that `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` starts with `pk_`
3. Ensure webhook secret is configured if using webhooks

## Testing Locally

To test locally with environment variables:

1. Copy `.env.example` to `.env.local`
2. Fill in your development credentials
3. Run `npm run dev`
4. Test features that require specific variables

To test build without variables:
```bash
npm run build
```
The build should succeed even without `.env.local`

## Migration Guide

If migrating from an older version where builds failed without environment variables:

1. **No code changes needed** - the application now handles missing variables gracefully
2. **Update CI/CD** - builds will succeed without secrets
3. **Set runtime variables** - configure all required variables in your deployment platform
4. **Test** - verify features work correctly with variables present, and fail gracefully without them
