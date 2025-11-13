# Environment Variables Setup Guide

This guide explains all required environment variables, which Firebase/Stripe services are used, and how to configure them in GitHub Secrets for Vercel deployment.

## Overview

**IriSync uses:**
- ✅ Firebase Authentication (user login/signup)
- ✅ Firebase Firestore (database for all data)
- ✅ Firebase Storage (file uploads, media library)
- ❌ Firebase Hosting (NOT used - Vercel handles hosting)
- ✅ Stripe (payment processing for subscriptions)
- ✅ OpenAI (AI content generation)

---

## Part 1: Firebase Setup

### What Firebase Services Are Used

1. **Firebase Authentication** - User login/signup with email, Google, Facebook, etc.
2. **Firestore Database** - Stores all application data (users, posts, analytics, etc.)
3. **Firebase Storage** - Stores user-uploaded images, videos, and media files

**Note:** Firebase Hosting is NOT used because Vercel handles the hosting.

### Step-by-Step Firebase Configuration

#### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** or select existing project
3. Enter project name: `irisync-production`
4. Disable Google Analytics (optional)
5. Click **"Create project"**

#### 2. Enable Firebase Authentication

1. In Firebase Console, go to **Build** → **Authentication**
2. Click **"Get started"**
3. Enable these sign-in methods:
   - **Email/Password** - Toggle ON
   - **Google** - Toggle ON (requires OAuth consent screen)
   - Facebook/Twitter - Optional

#### 3. Create Firestore Database

1. Go to **Build** → **Firestore Database**
2. Click **"Create database"**
3. Select **"Start in production mode"**
4. Choose location (us-central1 recommended for US)
5. Click **"Enable"**

#### 4. Enable Firebase Storage

1. Go to **Build** → **Storage**
2. Click **"Get started"**
3. Keep default security rules
4. Choose same location as Firestore
5. Click **"Done"**

#### 5. Get Firebase Configuration (Client)

1. Go to **Project Settings** (gear icon) → **General** tab
2. Scroll to **"Your apps"** section
3. Click the **Web icon** `</>`
4. Register app: nickname = `irisync-web`
5. Copy these values:

```javascript
// You'll need these exact values:
apiKey: "AIza..."
authDomain: "your-project.firebaseapp.com"
projectId: "your-project-id"
storageBucket: "your-project.appspot.com"
messagingSenderId: "123456789"
appId: "1:123456789:web:abc123"
```

#### 6. Get Firebase Admin SDK Credentials

1. Still in **Project Settings**, go to **Service accounts** tab
2. Click **"Generate new private key"**
3. Click **"Generate key"** - downloads a JSON file
4. **IMPORTANT**: Keep this file secure, never commit to Git
5. Open the JSON file and extract these values:
   - `project_id`
   - `client_email`
   - `private_key` (entire string with `\n` characters)

---

## Part 2: Stripe Setup

### What Stripe is Used For

- Subscription billing (Creator, Influencer, Enterprise plans)
- Payment processing
- Webhook notifications for subscription events

### Step-by-Step Stripe Configuration

#### 1. Create Stripe Account

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Sign up or log in
3. Complete account verification (required for live mode)

#### 2. Get Stripe API Keys

1. In Stripe Dashboard, go to **Developers** → **API keys**
2. You'll see two sets of keys:
   - **Test mode** (for development)
   - **Live mode** (for production)

For production, use **Live mode** keys:
- **Publishable key**: `pk_live_...` (safe to expose in browser)
- **Secret key**: `sk_live_...` (NEVER expose, server-only)

#### 3. Create Subscription Products

1. Go to **Products** → **Add product**
2. Create three products:

**Creator Plan:**
- Name: "Creator"
- Price: $19/month
- Copy the **Price ID**: `price_...`

**Influencer Plan:**
- Name: "Influencer"
- Price: $49/month
- Copy the **Price ID**: `price_...`

**Enterprise Plan:**
- Name: "Enterprise"
- Price: $99/month
- Copy the **Price ID**: `price_...`

#### 4. Set Up Webhook (After Deployment)

1. Go to **Developers** → **Webhooks**
2. Click **"Add endpoint"**
3. Endpoint URL: `https://your-vercel-app.vercel.app/api/webhooks/stripe`
4. Select these events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the **Signing secret**: `whsec_...`

---

## Part 3: OpenAI Setup

### What OpenAI is Used For

- AI-powered content generation
- Content suggestions and optimization
- Performance predictions

### Step-by-Step OpenAI Configuration

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Go to **API keys** (left sidebar)
4. Click **"Create new secret key"**
5. Copy the key: `sk-...`
6. **IMPORTANT**: Save it immediately, you can't see it again

---

## Part 4: Configure GitHub Secrets for Vercel

### Why GitHub Secrets?

Vercel automatically reads environment variables from GitHub repository secrets when deploying. This is more secure than manually entering them in Vercel dashboard.

### How to Add Secrets to GitHub

1. Go to your GitHub repository: `github.com/AdaptLabsAI/IriSync`
2. Click **Settings** tab
3. In left sidebar, click **Secrets and variables** → **Actions**
4. Click **"New repository secret"**
5. Add each secret below

### Required GitHub Secrets (Copy-Paste Ready)

Add these secrets one by one in GitHub:

#### Application Secrets

| Secret Name | Value | Where to Get It |
|------------|-------|-----------------|
| `NEXTAUTH_URL` | `https://your-app.vercel.app` | Your Vercel deployment URL |
| `NEXTAUTH_SECRET` | Generate with: `openssl rand -base64 32` | Run command in terminal |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` | Same as NEXTAUTH_URL |
| `APP_URL` | `https://your-app.vercel.app` | Same as NEXTAUTH_URL |

#### Firebase Client Secrets (Public - from Step 1.5)

| Secret Name | Value | Example |
|------------|-------|---------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Your Firebase API key | `AIzaSyD...` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Your auth domain | `project.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Your project ID | `irisync-prod` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Your storage bucket | `project.appspot.com` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Your sender ID | `123456789` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Your app ID | `1:123:web:abc` |

#### Firebase Admin Secrets (Private - from Step 1.6)

| Secret Name | Value | Where to Get It |
|------------|-------|-----------------|
| `FIREBASE_ADMIN_PROJECT_ID` | Your project ID | From downloaded JSON: `project_id` |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Service account email | From downloaded JSON: `client_email` |
| `FIREBASE_ADMIN_PRIVATE_KEY` | Private key with \n | From downloaded JSON: `private_key` |

**Important for FIREBASE_ADMIN_PRIVATE_KEY:**
- Copy the entire `private_key` value including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`
- Keep the `\n` characters as-is (they represent newlines)
- It should look like: `"-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"`

#### Stripe Secrets (from Step 2.2 and 2.4)

| Secret Name | Value | Where to Get It |
|------------|-------|-----------------|
| `STRIPE_SECRET_KEY` | `sk_live_...` | Stripe Dashboard → API keys |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` | Stripe Dashboard → API keys |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | After creating webhook endpoint |
| `STRIPE_PRICE_CREATOR_ID` | `price_...` | Creator product price ID |
| `STRIPE_PRICE_INFLUENCER_ID` | `price_...` | Influencer product price ID |
| `STRIPE_PRICE_ENTERPRISE_ID` | `price_...` | Enterprise product price ID |

#### AI Service Secrets (from Step 3)

| Secret Name | Value | Where to Get It |
|------------|-------|-----------------|
| `OPENAI_API_KEY` | `sk-...` | OpenAI Platform → API keys |
| `AI_PROVIDER_TYPE` | `openai` | Fixed value |
| `AI_MODEL_ID` | `gpt-4` or `gpt-3.5-turbo` | Choose model |

#### Optional Secrets

| Secret Name | Value | Purpose |
|------------|-------|---------|
| `GOOGLE_OAUTH_CLIENT_ID` | From Google Cloud Console | Google Sign-In |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console | Google Sign-In |
| `SENDGRID_API_KEY` | From SendGrid | Email notifications |
| `EMAIL_FROM` | `noreply@yourdomain.com` | Email sender address |

---

## Part 5: Vercel Configuration

### Connecting GitHub to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Select **"Import Git Repository"**
4. Choose **AdaptLabsAI/IriSync**
5. Select branch: `copilot/fix-production-ready-deployment`
6. Click **"Deploy"**

**Vercel will automatically:**
- Read secrets from your GitHub repository
- Install dependencies
- Build the Next.js application
- Deploy to a production URL

### Vercel Environment Variables

Vercel automatically syncs environment variables from GitHub repository secrets. You don't need to manually add them in Vercel dashboard.

However, if you need to override or add additional variables:

1. In Vercel project, go to **Settings** → **Environment Variables**
2. Add variables for **Production**, **Preview**, and **Development** environments
3. Click **"Save"**

---

## Part 6: Post-Deployment Steps

### 1. Update URLs After Deployment

Once Vercel gives you a deployment URL (e.g., `https://irisync-abc123.vercel.app`):

1. Update these GitHub secrets with the actual URL:
   - `NEXTAUTH_URL`
   - `NEXT_PUBLIC_APP_URL`
   - `APP_URL`

2. Redeploy from Vercel dashboard

### 2. Configure Stripe Webhook

Now that you have a live URL:

1. Go to Stripe Dashboard → **Developers** → **Webhooks**
2. Add endpoint: `https://your-actual-vercel-url.vercel.app/api/webhooks/stripe`
3. Copy the signing secret
4. Update `STRIPE_WEBHOOK_SECRET` in GitHub secrets
5. Redeploy

### 3. Configure OAuth Redirect URLs

#### Google OAuth:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Edit your OAuth 2.0 Client ID
4. Add to **Authorized redirect URIs**:
   - `https://your-vercel-url.vercel.app/api/auth/callback/google`

#### Firebase Authentication:
1. Go to Firebase Console → **Authentication** → **Settings** → **Authorized domains**
2. Add your Vercel domain: `your-vercel-url.vercel.app`

### 4. Test the Deployment

1. Visit your Vercel URL
2. Try to sign up / log in
3. Test creating content
4. Verify database writes in Firebase Console
5. Check file uploads in Firebase Storage

---

## Part 7: Troubleshooting

### Build Fails on Vercel

**Error: Firebase auth/invalid-api-key**
- Solution: Verify all Firebase client secrets are added to GitHub
- Check `NEXT_PUBLIC_FIREBASE_API_KEY` is correct

**Error: Module not found**
- Solution: All import paths have been fixed in this PR
- Ensure you're deploying the correct branch

**Error: Missing environment variable**
- Solution: Check GitHub Secrets → Actions
- Ensure secret names match exactly (case-sensitive)

### Stripe Webhooks Not Working

1. Verify webhook endpoint URL is correct
2. Check `STRIPE_WEBHOOK_SECRET` matches the webhook in Stripe Dashboard
3. Test webhook with Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

### OAuth Sign-In Not Working

1. Verify redirect URLs in Google Cloud Console
2. Check `GOOGLE_OAUTH_CLIENT_ID` and secret are correct
3. Ensure domain is added to Firebase authorized domains

---

## Summary Checklist

Before deploying:
- [ ] Firebase project created with Authentication, Firestore, and Storage enabled
- [ ] Stripe account set up with products and price IDs
- [ ] OpenAI API key obtained
- [ ] All GitHub Secrets added (minimum 20 secrets)
- [ ] Vercel project connected to GitHub repository
- [ ] Environment variables synced to Vercel

After first deployment:
- [ ] Update URL secrets with actual Vercel URL
- [ ] Configure Stripe webhook endpoint
- [ ] Add OAuth redirect URLs
- [ ] Test all functionality
- [ ] Monitor Firebase usage and Vercel logs

---

## Quick Reference: Minimum Required Secrets

**Must have these 20 secrets for basic functionality:**

1. NEXTAUTH_URL
2. NEXTAUTH_SECRET
3. NEXT_PUBLIC_APP_URL
4. NEXT_PUBLIC_FIREBASE_API_KEY
5. NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
6. NEXT_PUBLIC_FIREBASE_PROJECT_ID
7. NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
8. NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
9. NEXT_PUBLIC_FIREBASE_APP_ID
10. FIREBASE_ADMIN_PROJECT_ID
11. FIREBASE_ADMIN_CLIENT_EMAIL
12. FIREBASE_ADMIN_PRIVATE_KEY
13. STRIPE_SECRET_KEY
14. NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
15. STRIPE_WEBHOOK_SECRET
16. STRIPE_PRICE_CREATOR_ID
17. STRIPE_PRICE_INFLUENCER_ID
18. STRIPE_PRICE_ENTERPRISE_ID
19. OPENAI_API_KEY
20. AI_PROVIDER_TYPE

---

For questions or issues, see [DEPLOYMENT.md](./DEPLOYMENT.md) or contact support@irisync.com.
