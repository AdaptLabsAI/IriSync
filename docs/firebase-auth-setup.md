# Firebase Authentication Setup

This document explains how to properly set up Firebase Authentication for the IriSync application.

## Configuration

The application needs Firebase credentials to work properly. These credentials should be stored in a `.env.local` file in the project root directory.

### Setting up Firebase Authentication

1. Create a `.env.local` file in the project root if it doesn't exist.
2. Add the following environment variables with the values from your Firebase project:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDlBDjRu1H4jJrMs4SrX8_jf4Ct7c4NyXs
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=irisai-c83a1.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=irisai-c83a1
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=irisai-c83a1.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=232183317678
NEXT_PUBLIC_FIREBASE_APP_ID=1:232183317678:web:d74ca5697898ee1b7c193f
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-0VTK29PTKM
```

3. Restart your Next.js development server

### Enabling Authentication Providers

To use Google authentication, you need to enable it in the Firebase Console:

1. Go to the Firebase Console (https://console.firebase.google.com/)
2. Select your project
3. Go to Authentication → Sign-in method
4. Enable Google as a provider
5. Add your domain(s) to the "Authorized domains" list (including `localhost` for development)

## Testing Authentication

You can test your Firebase authentication setup by visiting the `/auth/firebase-test` route in the application. This page allows you to:

1. View your current Firebase configuration (without sensitive keys)
2. Test if Google authentication is properly configured
3. Get detailed error messages if there are issues

## Troubleshooting

If you're experiencing authentication issues:

### API Key Errors

If you see errors about an invalid API key or "API key not valid", make sure:
- Your `.env.local` file has the correct values
- The API key starts with `AIza`
- Your Firebase project is active and not suspended

### Unauthorized Domain Errors

If you see "auth/unauthorized-domain" errors:
- Make sure your domain is added to the list of authorized domains in the Firebase Console
- For local development, ensure `localhost` is in the list

### Failed to Fetch Errors

If you see network-related errors with Google authentication:
- Check that your Firebase project's billing status is active
- Verify that your API key is not restricted to certain domains

### Configuration Issues

If the Firebase configuration is not being loaded properly:
- Make sure you've restarted your Next.js server after changing `.env.local`
- Check that the environment variables are being loaded correctly

## File Structure

- `src/lib/firebase/config.ts` - Central configuration file
- `src/lib/firebase/client.ts` - Client-side Firebase initialization 
- `src/lib/auth/customAuth.ts` - Custom authentication functions
- `src/lib/auth/troubleshoot.ts` - Authentication diagnostics

## Additional Resources

- [Firebase Authentication Documentation](https://firebase.google.com/docs/auth)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables) 