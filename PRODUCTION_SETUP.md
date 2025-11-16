# IriSync - Production Setup & Deployment Guide

## Overview

This guide covers deploying IriSync to production on Vercel with all required services configured.

---

## Prerequisites

- [ ] GitHub account (for code repository)
- [ ] Vercel account (for hosting) - https://vercel.com
- [ ] Firebase project (for authentication & database)
- [ ] Stripe account (for payments) - Optional but recommended
- [ ] OpenAI API key (for AI features) - Optional but recommended
- [ ] SendGrid account (for emails) - Optional

---

## Part 1: Firebase Setup

### 1.1 Create Firebase Project

1. **Go to** https://console.firebase.google.com/
2. **Click** "Add project"
3. **Enter** project name: `irisync-production`
4. **Disable** Google Analytics (optional)
5. **Click** "Create project"

### 1.2 Enable Authentication

1. **Go to** Authentication → Get Started
2. **Enable** these sign-in methods:
   - ✅ Email/Password
   - ✅ Google (optional - requires OAuth setup)
3. **Add authorized domains:**
   - Click Settings tab
   - Add your domain: `irisync.com`
   - Add Vercel preview domain: `*.vercel.app`

### 1.3 Create Firestore Database

1. **Go to** Firestore Database
2. **Click** "Create database"
3. **Select** "Start in production mode"
4. **Choose** location (e.g., `us-central1`)
5. **Set up security rules:**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User documents
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }

    // User settings
    match /userSettings/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Admin-only collections
    match /admin/{document=**} {
      allow read, write: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

### 1.4 Set Up Firebase Storage

1. **Go to** Storage
2. **Click** "Get Started"
3. **Start in production mode**
4. **Set up CORS** (allows uploads from your domain)

Create `cors.json`:
```json
[
  {
    "origin": ["https://irisync.com", "https://*.vercel.app"],
    "method": ["GET", "POST", "PUT", "DELETE"],
    "maxAgeSeconds": 3600
  }
]
```

Upload CORS config:
```bash
gsutil cors set cors.json gs://your-project.appspot.com
```

### 1.5 Get Firebase Credentials

#### Client Credentials (Public - Safe to expose)

1. **Go to** Project Settings (⚙️ icon)
2. **Scroll to** "Your apps" section
3. **Click** Web icon `</>`
4. **Register app:** "IriSync Web"
5. **Copy** the config object:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "irisync-prod.firebaseapp.com",
  projectId: "irisync-prod",
  storageBucket: "irisync-prod.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

**Save these** - you'll need them for Vercel environment variables.

#### Admin Credentials (Secret - Never expose publicly)

1. **Go to** Project Settings → Service Accounts
2. **Click** "Generate new private key"
3. **Download** the JSON file (save securely!)
4. **Extract** these values:
   - `project_id`
   - `client_email`
   - `private_key`

---

## Part 2: Vercel Deployment

### 2.1 Connect GitHub Repository

1. **Go to** https://vercel.com/new
2. **Select** "Import Git Repository"
3. **Choose** your IriSync repository
4. **Click** "Import"

### 2.2 Configure Environment Variables

**CRITICAL:** Add these environment variables in Vercel project settings.

**Go to:** Project Settings → Environment Variables

#### Required Variables (Authentication & Core)

```bash
# NextAuth Configuration
NEXTAUTH_SECRET=<generate-with: openssl rand -base64 32>
NEXTAUTH_URL=https://irisync.com
NEXT_PUBLIC_APP_URL=https://irisync.com

# Firebase Client (from Step 1.5)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=irisync-prod.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=irisync-prod
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=irisync-prod.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="123456789"  # MUST have quotes!
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

# Firebase Admin (from downloaded JSON)
FIREBASE_ADMIN_PROJECT_ID=irisync-prod
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@irisync-prod.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
```

**IMPORTANT NOTES:**
- `MESSAGING_SENDER_ID` must be wrapped in quotes: `"123456789"`
- `PRIVATE_KEY` must include `\n` for line breaks and be wrapped in quotes
- Apply to: **Production, Preview, and Development**

#### Optional but Recommended

```bash
# Stripe (Payments)
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# OpenAI (AI Features)
OPENAI_API_KEY=sk-...
AI_PROVIDER_TYPE=openai
AI_MODEL_ID=gpt-4-turbo-preview

# SendGrid (Emails)
SENDGRID_API_KEY=SG...
EMAIL_FROM=noreply@irisync.com

# Redis (Rate Limiting)
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

### 2.3 Deploy

1. **Vercel will auto-deploy** after you add environment variables
2. **Or manually deploy:**
   ```bash
   npm install -g vercel
   vercel --prod
   ```

3. **Check deployment logs** for errors
4. **Visit your site** at the Vercel URL

---

## Part 3: Custom Domain Setup

### 3.1 Add Domain to Vercel

1. **Go to** Project Settings → Domains
2. **Add** your domain: `irisync.com`
3. **Follow** Vercel's DNS instructions

### 3.2 Update Firebase

1. **Go to** Firebase Console → Authentication → Settings
2. **Add authorized domain:** `irisync.com`

### 3.3 Update Environment Variables

Change these in Vercel:
```bash
NEXTAUTH_URL=https://irisync.com
NEXT_PUBLIC_APP_URL=https://irisync.com
```

**Redeploy** after changing environment variables.

---

## Part 4: Service Integrations

### 4.1 Stripe Setup (Payments)

1. **Go to** https://dashboard.stripe.com/
2. **Get API keys:**
   - Developers → API Keys
   - Copy "Publishable key" and "Secret key"
3. **Create products:**
   - Products → Add Product
   - Create "Creator", "Influencer", "Enterprise" plans
   - Set prices
   - Copy Price IDs
4. **Set up webhook:**
   - Developers → Webhooks
   - Add endpoint: `https://irisync.com/api/webhooks/stripe`
   - Select events: `checkout.session.completed`, `customer.subscription.*`
   - Copy webhook secret

**Add to Vercel:**
```bash
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_CREATOR_ID=price_...
STRIPE_PRICE_INFLUENCER_ID=price_...
STRIPE_PRICE_ENTERPRISE_ID=price_...
```

### 4.2 OpenAI Setup (AI Features)

1. **Go to** https://platform.openai.com/api-keys
2. **Create** new secret key
3. **Set usage limits** (optional but recommended)

**Add to Vercel:**
```bash
OPENAI_API_KEY=sk-...
AI_PROVIDER_TYPE=openai
AI_MODEL_ID=gpt-4-turbo-preview
```

### 4.3 SendGrid Setup (Emails)

1. **Go to** https://app.sendgrid.com/
2. **Create** API key (Settings → API Keys)
3. **Verify** sender domain
4. **Create** email templates (optional)

**Add to Vercel:**
```bash
SENDGRID_API_KEY=SG...
EMAIL_FROM=noreply@irisync.com
EMAIL_PRIMARY_PROVIDER=sendgrid
```

### 4.4 Upstash Redis (Rate Limiting)

1. **Go to** https://upstash.com/
2. **Create** Redis database
3. **Copy** REST URL and Token

**Add to Vercel:**
```bash
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

---

## Part 5: Security Checklist

### 5.1 Environment Security

- [ ] All secrets stored in Vercel environment variables (not in code)
- [ ] `.env.local` added to `.gitignore` (already done)
- [ ] No hardcoded API keys in source code
- [ ] Firebase Admin private key properly escaped with `\n`
- [ ] NEXTAUTH_SECRET is strong (32+ characters)

### 5.2 Firebase Security

- [ ] Firestore security rules configured
- [ ] Storage security rules configured
- [ ] Only authorized domains in Firebase Auth
- [ ] Email verification enabled
- [ ] Password requirements enforced

### 5.3 Application Security

- [ ] HTTPS enforced (Vercel does this automatically)
- [ ] CORS configured properly
- [ ] Rate limiting enabled (via Upstash Redis)
- [ ] Input validation on all forms
- [ ] XSS protection enabled
- [ ] CSRF tokens in forms

---

## Part 6: Build Optimization

### 6.1 Build Settings (Vercel)

**Build Command:**
```bash
npm run build
```

**Output Directory:**
```bash
.next
```

**Install Command:**
```bash
npm install
```

**Node Version:** (in `package.json`)
```json
{
  "engines": {
    "node": ">=20.0.0"
  }
}
```

### 6.2 Performance Optimization

**Already configured in `next.config.js`:**
- ✅ Image optimization
- ✅ Font optimization
- ✅ Script optimization
- ✅ Bundle size optimization
- ✅ Compression enabled

**To verify:**
```bash
npm run build
# Check for bundle size warnings
```

---

## Part 7: Monitoring & Logging

### 7.1 Vercel Analytics

1. **Go to** Project → Analytics
2. **Enable** Web Analytics (free)
3. **Monitor:**
   - Page views
   - Top pages
   - Referrers
   - Performance metrics

### 7.2 Firebase Monitoring

1. **Go to** Firebase Console → Analytics
2. **Enable** Google Analytics (optional)
3. **Monitor:**
   - Active users
   - Authentication events
   - Database reads/writes

### 7.3 Error Tracking (Optional)

**Sentry Setup:**
1. Go to https://sentry.io/
2. Create project
3. Get DSN
4. Add to Vercel:
```bash
NEXT_PUBLIC_SENTRY_DSN=https://...
```

---

## Part 8: Testing Production Build Locally

Before deploying, test production build locally:

```bash
# Build for production
npm run build

# Check for errors
# Fix any TypeScript or build errors

# Run production build locally
npm start

# Test at http://localhost:3000
```

**Test these features:**
- [ ] User registration
- [ ] Email verification
- [ ] Login
- [ ] Password reset
- [ ] Dashboard access
- [ ] AI features
- [ ] Payment flow (Stripe)
- [ ] Responsive design

---

## Part 9: Deployment Checklist

### Pre-Deployment

- [ ] All environment variables added to Vercel
- [ ] Firebase configured and tested
- [ ] Production build successful (`npm run build`)
- [ ] No TypeScript errors
- [ ] No console errors in browser
- [ ] All authentication flows tested
- [ ] Database security rules configured

### Deployment

- [ ] Code pushed to main branch
- [ ] Vercel auto-deployed successfully
- [ ] Custom domain configured
- [ ] SSL certificate active
- [ ] All pages accessible
- [ ] Authentication working
- [ ] Database connections working

### Post-Deployment

- [ ] Monitor error logs in Vercel
- [ ] Check Firebase usage/quota
- [ ] Test user registration end-to-end
- [ ] Verify email delivery
- [ ] Test payment flow
- [ ] Mobile responsiveness verified
- [ ] Performance tested (Lighthouse)

---

## Part 10: Troubleshooting

### Common Issues

#### 1. "Firebase not configured" Error

**Problem:** Missing environment variables

**Solution:**
```bash
# Check Vercel environment variables
# Ensure all NEXT_PUBLIC_FIREBASE_* variables are set
# Redeploy after adding variables
```

#### 2. "Invalid API Key" Error

**Problem:** Wrong Firebase API key

**Solution:**
- Double-check Firebase Console → Project Settings
- Copy-paste API key carefully
- Redeploy after updating

#### 3. Scientific Notation in Messaging Sender ID

**Problem:** Large number converted to scientific notation

**Solution:**
```bash
# In Vercel, set as STRING with quotes:
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="123456789"

# NOT without quotes:
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
```

#### 4. Build Fails on Vercel

**Problem:** TypeScript errors or missing dependencies

**Solution:**
```bash
# Test build locally first
npm run build

# Fix all errors shown
# Push fixed code to GitHub
```

#### 5. Authentication Not Working

**Problem:** Domain not authorized in Firebase

**Solution:**
- Firebase Console → Authentication → Settings
- Add your domain to authorized domains
- Include both `irisync.com` and `*.vercel.app`

---

## Part 11: Maintenance

### Regular Tasks

**Weekly:**
- Check error logs in Vercel dashboard
- Monitor Firebase usage/quota
- Review authentication logs

**Monthly:**
- Rotate Firebase service account keys
- Update dependencies (`npm outdated`, `npm update`)
- Review and optimize Firestore security rules
- Check for Next.js updates

**Quarterly:**
- Audit environment variables
- Review and optimize bundle size
- Performance testing (Lighthouse)
- Security audit

---

## Part 12: Scaling Considerations

### When to Upgrade

**Firebase:**
- Blaze plan when you exceed Spark limits
- Monitor in Firebase Console → Usage

**Vercel:**
- Pro plan for team collaboration
- Enterprise for advanced features

**Upstash Redis:**
- Upgrade when rate limit requests exceed free tier

---

## Support Resources

- **Firebase Documentation:** https://firebase.google.com/docs
- **Vercel Documentation:** https://vercel.com/docs
- **Next.js Documentation:** https://nextjs.org/docs
- **Stripe Documentation:** https://stripe.com/docs
- **IriSync Support:** support@irisync.com

---

## Emergency Contacts

**Firebase Down:**
- Status: https://status.firebase.google.com/
- Support: Firebase Console → Support

**Vercel Down:**
- Status: https://www.vercelstatus.com/
- Support: Vercel Dashboard → Help

---

**Last Updated:** 2025-11-16
**Version:** 1.0.0
