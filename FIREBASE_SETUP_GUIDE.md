# Firebase Configuration Setup Guide

## Problem: Login and Google Sign-In Not Working

Your application is failing to authenticate because Firebase environment variables are not configured. This is a **deployment configuration issue**, not a code issue.

## Error Messages You're Seeing

```
Firebase is not configured. Please check environment variables.
Firebase client configuration: X Invalid
Missing required environment variables: Array(6)
- NEXT_PUBLIC_FIREBASE_API_KEY
- NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
- NEXT_PUBLIC_FIREBASE_PROJECT_ID
- NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
- NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
- NEXT_PUBLIC_FIREBASE_APP_ID
```

## What's Causing This

The Firebase Client SDK requires specific environment variables to initialize. These variables are currently:
- **Missing** from your deployment platform (Vercel/hosting platform)
- **Not set** in your local `.env.local` file

## How to Fix This

### Step 1: Get Your Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (or create one if you haven't)
3. Click the **Settings gear icon** ⚙️ (top left) → **Project settings**
4. Scroll down to **"Your apps"** section
5. Click on your web app (or create one with "Add app" → Web)
6. You'll see a `firebaseConfig` object that looks like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC...",
  authDomain: "your-app.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};
```

### Step 2: Set Environment Variables Locally (Development)

Create or update `.env.local` in your project root:

```bash
# Firebase Client Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyC...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

**Important:** Use the exact values from your Firebase Console, wrapped in quotes if they contain special characters.

### Step 3: Set Environment Variables on Vercel (Production)

#### Option A: Using Vercel Dashboard

1. Go to https://vercel.com/
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add each variable **one by one**:
   - Variable name: `NEXT_PUBLIC_FIREBASE_API_KEY`
   - Value: `AIzaSyC...` (paste your actual value)
   - Environment: Select **Production**, **Preview**, and **Development** (all three)
   - Click **Save**

5. Repeat for **all** variables:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
   - `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` (optional but recommended)

6. After adding all variables, **redeploy** your application

#### Option B: Using Vercel CLI

```bash
# Install Vercel CLI if you haven't
npm install -g vercel

# Login
vercel login

# Set each environment variable
vercel env add NEXT_PUBLIC_FIREBASE_API_KEY
vercel env add NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
vercel env add NEXT_PUBLIC_FIREBASE_PROJECT_ID
vercel env add NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
vercel env add NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
vercel env add NEXT_PUBLIC_FIREBASE_APP_ID

# Pull the environment variables to your local project
vercel env pull .env.local

# Redeploy
vercel --prod
```

### Step 4: Enable Google Sign-In in Firebase

1. In Firebase Console, go to **Authentication** → **Sign-in method**
2. Click **Google** provider
3. Click **Enable** toggle
4. Enter support email
5. Click **Save**

### Step 5: Add Authorized Domains

1. In Firebase Console, go to **Authentication** → **Settings** → **Authorized domains**
2. Add your deployment domain(s):
   - `localhost` (for development - usually already there)
   - `your-app.vercel.app` (your Vercel domain)
   - `your-custom-domain.com` (if you have a custom domain)
3. Click **Add domain**

### Step 6: Verify the Fix

After setting up environment variables and redeploying:

1. Open your deployed app in a new incognito/private window
2. Try to log in with email/password
3. Try to sign in with Google
4. Both should now work

## Troubleshooting

### Issue: Variables not taking effect

**Solution:** After adding environment variables in Vercel, you MUST redeploy:
```bash
vercel --prod
```
Or use the Vercel dashboard to trigger a new deployment.

### Issue: "This domain is not authorized"

**Solution:** Add your domain to Firebase Console → Authentication → Settings → Authorized domains

### Issue: messagingSenderId in scientific notation

**Solution:** Ensure the value is wrapped in quotes in Vercel:
- ✅ Correct: `"123456789012"` (string)
- ❌ Wrong: `5.54118E+11` (number in scientific notation)

### Issue: Still not working after setup

**Solution:** Check browser console for specific error messages:
1. Open DevTools (F12)
2. Go to Console tab
3. Look for Firebase-related errors
4. The error message will tell you exactly what's wrong

## Why This Happened

Firebase configuration requires **public environment variables** (prefixed with `NEXT_PUBLIC_`) that are:
- Set in your hosting platform (Vercel)
- Inlined at build time by Next.js
- Never hardcoded in source code (security best practice)

The authentication code is correct, but it cannot work without these configuration values.

## Quick Checklist

- [ ] Created/updated `.env.local` with all Firebase variables
- [ ] Added all Firebase variables to Vercel (Settings → Environment Variables)
- [ ] Enabled Google Sign-In in Firebase Console
- [ ] Added authorized domains in Firebase Console
- [ ] Redeployed the application after adding variables
- [ ] Tested in incognito window to ensure fresh state
- [ ] Verified no errors in browser console

## Need More Help?

If you're still having issues:
1. Check the browser console for specific error messages
2. Verify all environment variables are set correctly in Vercel
3. Ensure you redeployed after adding variables
4. Check Firebase Console for any security rules or restrictions

For more details, see:
- [Firebase Setup Documentation](https://firebase.google.com/docs/web/setup)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
