# Vercel Environment Variables - Quick Setup Guide

## 🚨 CRITICAL: Deploy These to Vercel Immediately

Go to: https://vercel.com/[your-team]/irisync/settings/environment-variables

---

## Step 1: Authentication (REQUIRED)

### Generate NEXTAUTH_SECRET
```bash
openssl rand -base64 32
```
Copy the output and add as `NEXTAUTH_SECRET` in Vercel.

### URLs
```
NEXTAUTH_URL = https://irisync.com
NEXT_PUBLIC_APP_URL = https://irisync.com
APP_URL = https://irisync.com
```

---

## Step 2: Google OAuth (REQUIRED)

Get from: https://console.cloud.google.com/apis/credentials

```
GOOGLE_CLIENT_ID = [your-google-client-id].apps.googleusercontent.com
GOOGLE_CLIENT_SECRET = GOCSPX-[your-secret]
GOOGLE_OAUTH_CLIENT_ID = [same as GOOGLE_CLIENT_ID]
```

**Add redirect URI in Google Console:**
- `https://irisync.com/api/auth/callback/google`

---

## Step 3: LinkedIn OAuth

Get from: https://www.linkedin.com/developers/apps

```
LINKEDIN_CLIENT_ID = [your-linkedin-app-id]
LINKEDIN_CLIENT_SECRET = [your-linkedin-secret]
```

**Add redirect URI in LinkedIn:**
- `https://irisync.com/api/auth/callback/linkedin`

---

## Step 4: Twitter OAuth

Get from: https://developer.twitter.com/en/portal/projects-and-apps

```
TWITTER_CLIENT_ID = [your-twitter-client-id]
TWITTER_CLIENT_SECRET = [your-twitter-client-secret]
```

**Add redirect URI in Twitter:**
- `https://irisync.com/api/auth/callback/twitter`

---

## Step 5: Facebook OAuth

Get from: https://developers.facebook.com/apps

```
FACEBOOK_CLIENT_ID = [your-facebook-app-id]
FACEBOOK_CLIENT_SECRET = [your-facebook-app-secret]
```

**Add redirect URI in Facebook:**
- `https://irisync.com/api/auth/callback/facebook`

---

## Step 6: Firebase Admin (REQUIRED)

Get from: Firebase Console > Project Settings > Service Accounts > Generate new private key

```
FIREBASE_ADMIN_PROJECT_ID = [your-project-id]
FIREBASE_ADMIN_CLIENT_EMAIL = firebase-adminsdk-xxxxx@[project-id].iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\nYOUR_FULL_KEY_HERE_WITH_\n_NEWLINES\n-----END PRIVATE KEY-----\n"
```

**⚠️ IMPORTANT:** Keep the private key as one line with `\n` for newlines. Include the quotes.

---

## Step 7: Firebase Client (REQUIRED)

Get from: Firebase Console > Project Settings > General > Your apps

```
NEXT_PUBLIC_FIREBASE_API_KEY = AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = [project-id].firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID = [project-id]
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = [project-id].appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = [sender-id]
NEXT_PUBLIC_FIREBASE_APP_ID = 1:[number]:web:[app-id]
```

---

## Step 8: Stripe (REQUIRED)

Get from: https://dashboard.stripe.com/apikeys

**⚠️ Use LIVE keys in production (sk_live_ not sk_test_)**

```
STRIPE_SECRET_KEY = sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = pk_live_...
STRIPE_WEBHOOK_SECRET = whsec_...
```

---

## Step 9: OpenAI (REQUIRED)

Get from: https://platform.openai.com/api-keys

```
OPENAI_API_KEY = sk-proj-...
AI_PROVIDER_TYPE = openai
AI_MODEL_ID = gpt-4-turbo-preview
```

---

## Step 10: Upstash Redis (RECOMMENDED for Rate Limiting)

Sign up at: https://upstash.com (Free tier available)

1. Create a Redis database
2. Copy REST URL and TOKEN

```
UPSTASH_REDIS_REST_URL = https://[your-db].upstash.io
UPSTASH_REDIS_REST_TOKEN = [your-token]
```

**Note:** Rate limiting will gracefully disable if these are not set, but it's highly recommended for production.

---

## Step 11: Figma (Optional - For Design Sync)

Get from: https://www.figma.com/developers/api#access-tokens

```
FIGMA_ACCESS_TOKEN = figd_...
FIGMA_PERSONAL_ACCESS_TOKEN = figd_...
FIGMA_FILE_KEY = YiFahCtPWUPWbB9TcvCpsj
```

---

## Step 12: Email (Optional but Recommended)

### SendGrid
Get from: https://sendgrid.com/

```
EMAIL_PROVIDER = sendgrid
EMAIL_PRIMARY_PROVIDER = sendgrid
SENDGRID_API_KEY = SG.xxx...
EMAIL_FROM = noreply@irisync.com
```

---

## Verification Checklist

After setting all variables in Vercel:

- [ ] Redeploy the application
- [ ] Test login at https://irisync.com/login
- [ ] Test Google OAuth login
- [ ] Test email/password login
- [ ] Check Vercel logs for any missing variable errors
- [ ] Verify redirect to /dashboard after login
- [ ] Test rate limiting (check X-RateLimit-* headers)

---

## How to Add Variables in Vercel

1. Go to https://vercel.com/[your-team]/irisync/settings/environment-variables
2. Click "Add New"
3. Enter variable name (e.g., `NEXTAUTH_SECRET`)
4. Enter value
5. Select environment: **Production** (and optionally Preview/Development)
6. Click "Save"
7. Repeat for all variables
8. **Redeploy** the application after adding variables

---

## Troubleshooting

### "Missing NEXTAUTH_SECRET" error
- Generate new secret: `openssl rand -base64 32`
- Add to Vercel with name `NEXTAUTH_SECRET`
- Redeploy

### OAuth redirect errors
- Verify redirect URIs in provider consoles exactly match:
  - `https://irisync.com/api/auth/callback/[provider]`
- Check for typos in URLs
- Ensure OAuth credentials are for the correct app/project

### Firebase errors
- Verify FIREBASE_ADMIN_PRIVATE_KEY has quotes and \n for newlines
- Check that all Firebase variables are from the same project
- Ensure service account has correct permissions

### Rate limiting not working
- Verify both UPSTASH variables are set
- Check Upstash dashboard shows database is active
- Test with curl: should see X-RateLimit-* headers in response

---

## Environment Scope

**Recommended settings:**
- **Production:** All variables required
- **Preview:** Same as production (for testing)
- **Development:** Optional (developers use .env.local)

Most developers will use their own `.env.local` file, so Development scope is optional.

---

## Security Notes

- Never share environment variables publicly
- Rotate secrets if compromised
- Use different NEXTAUTH_SECRET for dev/prod
- Use sk_test_ Stripe keys in preview/dev
- Monitor Vercel logs for security issues

---

**Last Updated:** November 2024
**Status:** Phase 1 & 2 Complete
