# Firebase Authentication Troubleshooting Guide

This guide helps diagnose and fix common Firebase Authentication issues in the IriSync application.

## Common Issues

### 1. "An error occurred during authentication"

This generic error often appears when there's a configuration issue with Firebase. Check:

- **API Key**: Make sure you're using the correct Firebase API Key in your `.env.local` file
- **Firebase Configuration**: Verify all Firebase config values are correct (API key, auth domain, project ID)
- **Domain Authorization**: Your domain must be authorized in the Firebase Console

### 2. Google Sign-In Popup Closes Immediately

This usually happens when:

- The domain isn't authorized in Firebase Console
- There's a CORS issue
- Firebase configuration is incorrect

### 3. "Unauthorized domain" Error

This means your current domain isn't listed in the authorized domains in Firebase Console.

### 4. Email Verification Not Working

Check:

- Email verification API endpoint is working
- Firebase Admin SDK is properly initialized
- Custom email templates are configured correctly

## Setting Up Firebase Authentication

### Step 1: Create a `.env.local` file

Create a `.env.local` file in the root of your project with the following Firebase credentials (copied from `environment.md`):

```
NEXT_PUBLIC_FIREBASE_API_KEY=your-public-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=000000000000
NEXT_PUBLIC_FIREBASE_APP_ID=1:000000000000:web:0000000000000000000000
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

### Step 2: Authorize Your Domain

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to Authentication → Settings → Authorized Domains
4. Add your domain (e.g., `localhost`, `your-production-domain.com`)

### Step 3: Enable Authentication Providers

1. Go to Authentication → Sign-in method
2. Enable Email/Password
3. Enable Google Sign-In
4. Configure any other providers you need

## Diagnostics

### Using the Firebase Test Page

Visit `/firebase-test` in your application to:

- Check Firebase configuration status
- Test authentication methods
- View detailed error messages

### Debug Firebase Authentication

If you're experiencing authentication issues:

1. Open browser developer tools (F12)
2. Go to the Console tab
3. Look for Firebase-related error messages
4. Check Network tab for API calls to Firebase Authentication

## Common Error Codes

- `auth/invalid-api-key`: Your API key is invalid or expired
- `auth/unauthorized-domain`: Your domain isn't authorized
- `auth/operation-not-allowed`: The sign-in provider is disabled
- `auth/user-disabled`: The user account has been disabled
- `auth/user-not-found`: No user record found with this identifier
- `auth/wrong-password`: The password is invalid

## Fixing Email Template Issues

If custom email templates aren't working:

1. Check that the API routes in `/api/auth/` are functioning correctly
2. Verify that the email service (SendGrid, etc.) is properly configured
3. Test the email templates directly

## Firebase Admin SDK Issues

For server-side authentication issues:

1. Ensure the Firebase Admin SDK is initialized correctly
2. Check that the service account key has the right permissions
3. Verify environment variables for the Admin SDK are set properly

## Testing Firebase Configuration

You can use the Firebase debug function to test your configuration:

```javascript
import { debugGoogleAuth } from '@/lib/auth/troubleshoot';

// Later in your code:
const result = await debugGoogleAuth();
console.log(result);
```

## Additional Resources

- [Firebase Authentication Documentation](https://firebase.google.com/docs/auth)
- [Firebase JavaScript SDK Reference](https://firebase.google.com/docs/reference/js)
- [Next.js with Firebase Authentication](https://firebase.google.com/docs/auth/web/nextjs) 