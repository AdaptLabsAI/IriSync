# IriSync Production Deployment Guide

This guide provides step-by-step instructions for deploying IriSync to production on Vercel with Firebase backend. No coding experience required.

> **📌 IMPORTANT: Environment Variables Configuration**
>
> Environment variables should be configured as **GitHub Secrets**, not in the Vercel dashboard. Vercel automatically reads secrets from your GitHub repository when deploying.
>
> **See [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md) for the complete guide on:**
> - Which Firebase services are used (Authentication, Firestore, Storage)
> - How to get all API keys and credentials
> - Step-by-step GitHub Secrets configuration
> - Minimum 20 required secrets for production

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Firebase Setup](#firebase-setup)
3. [GitHub Secrets Configuration](#github-secrets-configuration)
4. [Vercel Setup](#vercel-setup)
5. [Deployment Steps](#deployment-steps)
6. [Post-Deployment](#post-deployment)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, you'll need accounts for:
- [ ] [GitHub](https://github.com/) - For code repository and secrets management
- [ ] [Firebase](https://firebase.google.com/) - For database, authentication, and file storage
- [ ] [Vercel](https://vercel.com/) - For hosting (automatically deploys from GitHub)
- [ ] [Stripe](https://stripe.com/) - For payment processing
- [ ] [OpenAI](https://openai.com/) - For AI features (required for core functionality)

---

## Firebase Setup

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"**
3. Enter project name: `irisync-production`
4. Disable Google Analytics (or enable if needed)
5. Click **"Create project"**

### Step 2: Enable Authentication

1. In Firebase Console, go to **Authentication** → **Get started**
2. Enable the following sign-in methods:
   - **Email/Password** - Toggle ON
   - **Google** - Toggle ON, configure OAuth consent screen
   - **Facebook** - Toggle ON (optional, requires Facebook app)
   - **Twitter** - Toggle ON (optional, requires Twitter app)

### Step 3: Create Firestore Database

1. Go to **Firestore Database** → **Create database**
2. Select **"Start in production mode"**
3. Choose a location (select closest to your users)
4. Click **"Enable"**

### Step 4: Set Up Storage

1. Go to **Storage** → **Get started**
2. Click **"Next"** to use default security rules
3. Choose same location as Firestore
4. Click **"Done"**

### Step 5: Get Firebase Configuration

1. Go to **Project Settings** (gear icon) → **General**
2. Scroll to **"Your apps"** → Click **Web icon (</>)**
3. Register app with nickname: `irisync-web`
4. **Copy these values** (you'll need them later):
   ```
   API Key: AIza...
   Auth Domain: irisync-production.firebaseapp.com
   Project ID: irisync-production
   Storage Bucket: irisync-production.appspot.com
   Messaging Sender ID: 123456789
   App ID: 1:123456789:web:abc123
   ```

### Step 6: Get Firebase Admin SDK

1. Still in **Project Settings**, go to **Service accounts** tab
2. Click **"Generate new private key"**
3. Click **"Generate key"** - A JSON file will download
4. **IMPORTANT**: Keep this file secure! Never commit to Git
5. Open the file and note these values:
   - `project_id`
   - `client_email`
   - `private_key` (entire string including `-----BEGIN PRIVATE KEY-----`)

### Step 7: Deploy Firestore Rules and Indexes

1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Initialize Firebase in your project:
   ```bash
   firebase init
   ```
   - Select: **Firestore**, **Storage**
   - Use existing project: Select your `irisync-production`
   - Keep default files: `firestore.rules`, `firestore.indexes.json`

4. Deploy rules and indexes:
   ```bash
   npm run firebase:deploy-all
   ```

---

## GitHub Secrets Configuration

> **⚠️ IMPORTANT: Configure secrets in GitHub, NOT Vercel**
>
> Vercel automatically reads environment variables from GitHub repository secrets during deployment. This is the recommended and most secure approach.

### Step 1: Access GitHub Secrets

1. Go to your GitHub repository: `https://github.com/AdaptLabsAI/IriSync`
2. Click **Settings** tab (top menu)
3. In left sidebar: **Secrets and variables** → **Actions**
4. Click **"New repository secret"** button

### Step 2: Add Required Secrets

You need to add approximately 20 secrets minimum. For each secret:

1. Click **"New repository secret"**
2. Enter **Name** (must match exactly, case-sensitive)
3. Enter **Value** (the actual API key or credential)
4. Click **"Add secret"**

### Step 3: Required Secrets List

**See [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md) for:**
- Complete list of all required secrets with examples
- Where to get each API key and credential
- Detailed Firebase, Stripe, and OpenAI setup instructions
- Troubleshooting for common issues

**Minimum required secrets (20):**
- Application URLs (3): `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `NEXT_PUBLIC_APP_URL`
- Firebase Client (6): All `NEXT_PUBLIC_FIREBASE_*` variables
- Firebase Admin (3): `FIREBASE_ADMIN_*` variables
- Stripe (6): Keys and price IDs
- AI Service (2): `OPENAI_API_KEY`, `AI_PROVIDER_TYPE`

### Step 4: Verify Secrets

After adding all secrets:
1. Go to **Settings** → **Secrets and variables** → **Actions**
2. You should see 20+ repository secrets listed
3. Secrets are encrypted and hidden (shows `****`)

---

## Vercel Setup

### Step 1: Import Repository

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository:
   - Click **"Import Git Repository"**
   - Select **"AdaptLabsAI/IriSync"**
   - Select branch: `copilot/fix-production-ready-deployment`
   - Click **"Import"**

### Step 2: Configure Build Settings

1. **Framework Preset**: Next.js (auto-detected)
2. **Root Directory**: `./` (default)
3. **Build Command**: `npm run build`
4. **Output Directory**: `.next` (default)
5. **Install Command**: `npm install`

### Step 3: Environment Variables in Vercel

**✅ Automatic:** Vercel reads secrets from GitHub automatically
**❌ Manual:** You do NOT need to add them in Vercel dashboard

However, Vercel will show environment variables in **Settings** → **Environment Variables** after they're synced from GitHub.

**You can now click "Deploy"!** Vercel will:
- Clone repository
- Read secrets from GitHub
- Install dependencies
- Build Next.js app
- Deploy to production URL

---

## Environment Variables Reference

**All environment variables are now configured as GitHub Secrets** (see section above).

For your reference, here's what each category of secrets contains:

### Application Settings (3 secrets)
- `NEXTAUTH_URL` - Your production URL
- `NEXTAUTH_SECRET` - 32-character random string
- `NEXT_PUBLIC_APP_URL` - Your production URL

### Firebase Configuration (9 secrets)
**Client (Public - safe in browser):**
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

**Admin (Private - server only):**
- `FIREBASE_ADMIN_PROJECT_ID`
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY`

### Stripe Configuration (6 secrets)
- `STRIPE_SECRET_KEY` - Server-side key
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Client-side key
- `STRIPE_WEBHOOK_SECRET` - Webhook signing secret
- `STRIPE_PRICE_CREATOR_ID` - Creator plan price
- `STRIPE_PRICE_INFLUENCER_ID` - Influencer plan price
- `STRIPE_PRICE_ENTERPRISE_ID` - Enterprise plan price

### AI Services (2-3 secrets)
- `OPENAI_API_KEY` - OpenAI API key
- `AI_PROVIDER_TYPE` - Usually "openai"
- `AI_MODEL_ID` - Model name (optional)

**For detailed instructions on getting these values, see [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md)**
- Other variables are server-only and kept secure
- The `FIREBASE_ADMIN_PRIVATE_KEY` should include the literal `\n` characters

---

## Deployment Steps

### Step 1: Initial Deployment

1. After adding all environment variables, click **"Deploy"**
2. Wait 2-5 minutes for the build to complete
3. You'll see a success message with your deployment URL

### Step 2: Verify Deployment

1. Click on your deployment URL
2. You should see the IriSync homepage
3. Try to:
   - Navigate to different pages
   - Click "Sign Up" or "Login"
   - Check that images load

### Step 3: Configure Custom Domain (Optional)

1. In Vercel project settings, go to **Settings** → **Domains**
2. Click **"Add"**
3. Enter your domain: `yourdomain.com`
4. Follow instructions to update DNS records
5. Wait for SSL certificate to provision (automatic)

### Step 4: Update Environment Variables for Custom Domain

If you added a custom domain:
1. Go back to **Environment Variables**
2. Update these variables:
   - `NEXTAUTH_URL` → `https://yourdomain.com`
   - `APP_URL` → `https://yourdomain.com`
   - `NEXT_PUBLIC_APP_URL` → `https://yourdomain.com`
3. Click **"Save"**
4. Redeploy from **Deployments** tab

---

## Post-Deployment

### Step 1: Configure Stripe Webhooks

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Click **"Add endpoint"**
3. Enter endpoint URL: `https://your-app.vercel.app/api/webhooks/stripe`
4. Select events to listen for:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the **Signing secret** (starts with `whsec_`)
6. Add to Vercel environment variables as `STRIPE_WEBHOOK_SECRET`
7. Redeploy

### Step 2: Configure OAuth Redirect URLs

#### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services** → **Credentials**
4. Click on your OAuth 2.0 Client ID
5. Add to **Authorized redirect URIs**:
   - `https://your-app.vercel.app/api/auth/callback/google`
6. Save

#### Facebook (if enabled)
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Select your app
3. Go to **Facebook Login** → **Settings**
4. Add to **Valid OAuth Redirect URIs**:
   - `https://your-app.vercel.app/api/auth/callback/facebook`
5. Save

### Step 3: Seed Initial Data (Optional)

If you want to pre-populate AI models and sample data:

```bash
npm run deploy:seed
```

### Step 4: Create First Admin User

1. Go to your app and register a new account
2. In Firebase Console → **Firestore Database**
3. Find the user document in `users` collection
4. Edit the document and set:
   ```json
   {
     "role": "super_admin"
   }
   ```
5. Save

---

## Monitoring & Maintenance

### Set Up Error Monitoring

1. **Vercel Analytics** (Included)
   - Already enabled in your Vercel project
   - View in **Analytics** tab

2. **Sentry** (Recommended)
   - Sign up at [sentry.io](https://sentry.io)
   - Create new project
   - Add DSN to environment variables:
     ```
     NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
     ```

### Regular Maintenance Tasks

#### Weekly
- [ ] Check Vercel deployment logs for errors
- [ ] Monitor Firebase usage quotas
- [ ] Review Stripe transactions

#### Monthly
- [ ] Update dependencies: `npm update`
- [ ] Check security advisories: `npm audit`
- [ ] Review and rotate API keys if needed
- [ ] Backup Firebase database

#### Quarterly
- [ ] Review and optimize Firebase rules
- [ ] Audit user permissions
- [ ] Update documentation

### Keeping Packages Updated

Run these commands regularly:

```bash
# Check for outdated packages
npm outdated

# Update all packages to latest compatible versions
npm update

# Check for security vulnerabilities
npm audit

# Fix security vulnerabilities automatically
npm audit fix

# For major version updates (test thoroughly first)
npx npm-check-updates -u
npm install
npm test
```

### Automated Dependency Updates

Consider using [Dependabot](https://docs.github.com/en/code-security/dependabot):

1. Create `.github/dependabot.yml`:
```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
```

---

## Troubleshooting

### Build Fails

**Problem**: Build fails on Vercel

**Solutions**:
1. Check Vercel build logs for specific error
2. Ensure all environment variables are set
3. Try building locally: `npm run build`
4. Check that all dependencies are in `package.json`

### Authentication Not Working

**Problem**: Can't log in or sign up

**Solutions**:
1. Verify Firebase Authentication is enabled
2. Check `NEXTAUTH_URL` matches your actual domain
3. Ensure `NEXTAUTH_SECRET` is set
4. Verify OAuth redirect URLs are configured correctly

### Database Connection Errors

**Problem**: Firestore errors in console

**Solutions**:
1. Verify Firebase Admin credentials are correct
2. Check `FIREBASE_ADMIN_PRIVATE_KEY` includes `\n` characters
3. Ensure Firestore rules allow your operations
4. Check Firebase project permissions

### Payment Processing Issues

**Problem**: Stripe checkout not working

**Solutions**:
1. Verify Stripe keys are for the correct environment (test vs live)
2. Check webhook endpoint is configured
3. Ensure `STRIPE_WEBHOOK_SECRET` matches webhook secret
4. Test webhook with Stripe CLI

### Performance Issues

**Problem**: App is slow

**Solutions**:
1. Enable Vercel Edge Network (automatic)
2. Optimize images with Next.js Image component
3. Enable caching in Firestore queries
4. Consider upgrading Vercel plan for more resources

### Getting Help

1. **Check Documentation**: Review `docs/` folder
2. **Check Logs**: Vercel deployment logs and browser console
3. **Firebase Status**: https://status.firebase.google.com/
4. **Vercel Status**: https://www.vercel-status.com/
5. **Community Support**: GitHub Issues
6. **Email Support**: contact@irisync.com

---

## Security Best Practices

### Production Checklist

- [ ] All environment variables are set in Vercel
- [ ] Firebase rules are restrictive and tested
- [ ] OAuth redirect URLs only include your domain
- [ ] Stripe webhook signature verification is enabled
- [ ] CORS is configured for your domain only
- [ ] Rate limiting is enabled for API routes
- [ ] SSL/TLS is enabled (automatic on Vercel)
- [ ] Security headers are configured
- [ ] No secrets are committed to Git
- [ ] Admin users are properly assigned roles
- [ ] Database backups are configured

### Ongoing Security

- Rotate API keys quarterly
- Monitor Firebase security rules
- Keep dependencies updated
- Enable two-factor authentication on all service accounts
- Regular security audits with `npm audit`
- Monitor Vercel logs for suspicious activity

---

## Quick Reference

### Important URLs

- **Application**: `https://your-app.vercel.app`
- **Vercel Dashboard**: `https://vercel.com/dashboard`
- **Firebase Console**: `https://console.firebase.google.com/`
- **Stripe Dashboard**: `https://dashboard.stripe.com/`

### Support Commands

```bash
# Check project health
npm run lint
npm test
npm run build

# Firebase operations
npm run firebase:deploy-rules
npm run firebase:deploy-indexes

# Check environment variables
npm run env:report

# Security check
npm run check-secrets
npm audit
```

---

**Congratulations!** 🎉 Your IriSync application is now deployed to production!

For ongoing support and updates, refer to the [README.md](./README.md) and documentation in the `docs/` folder.
