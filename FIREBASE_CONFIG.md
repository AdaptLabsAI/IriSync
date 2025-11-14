# Firebase Configuration for IriSync

## Overview

IriSync uses Firebase for authentication, database (Firestore), and storage. All Firebase configuration **must** come from environment variables, not from hard-coded values or local files.

## Required Environment Variables

### Client-Side Firebase Configuration (Public)

These variables are prefixed with `NEXT_PUBLIC_` and are exposed to the browser:

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | **Yes** | Firebase Web API Key | `AIzaSyD...` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | **Yes** | Firebase Auth Domain | `project-name.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | **Yes** | Firebase Project ID | `project-name` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | **Yes** | Firebase Storage Bucket | `project-name.appspot.com` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | **Yes** | Firebase Messaging Sender ID | `123456789012` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | **Yes** | Firebase App ID | `1:123456789012:web:abc123` |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | No | Google Analytics Measurement ID | `G-XXXXXXXXXX` |
| `NEXT_PUBLIC_FIREBASE_DATABASE_URL` | No | Realtime Database URL (if used) | `https://project-name.firebaseio.com` |

### Server-Side Firebase Configuration (Private)

These variables are used only on the server and should **never** be exposed to the client:

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `FIREBASE_ADMIN_PROJECT_ID` | **Yes** | Firebase Project ID for Admin SDK | `project-name` |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | **Yes** | Service Account Email | `firebase-adminsdk@project-name.iam.gserviceaccount.com` |
| `FIREBASE_ADMIN_PRIVATE_KEY` | **Yes** | Service Account Private Key | `-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n` |
| `FIREBASE_ADMIN_STORAGE_BUCKET` | No | Storage Bucket (fallback to public var) | `project-name.appspot.com` |

**Alternative Admin Configuration:**
Instead of individual variables, you can use:
- `FIREBASE_ADMIN_SERVICE_ACCOUNT` - Complete JSON service account key
- `FIREBASE_SERVICE_ACCOUNT` - Alternative name for service account JSON
- `FIREBASE_ADMIN_CREDENTIALS` - Alternative name for service account JSON

## Getting Firebase Credentials

### 1. Client Configuration (Web App)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click the gear icon → **Project Settings**
4. Scroll to **Your apps** section
5. Click the Web app icon (`</>`)
6. If you don't have a web app, click **Add app** and register one
7. Copy the configuration values from the `firebaseConfig` object

### 2. Server Configuration (Admin SDK)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click the gear icon → **Project Settings**
4. Go to **Service Accounts** tab
5. Click **Generate New Private Key**
6. Download the JSON file
7. Extract these values from the JSON:
   - `project_id` → `FIREBASE_ADMIN_PROJECT_ID`
   - `client_email` → `FIREBASE_ADMIN_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_ADMIN_PRIVATE_KEY`

**Important:** The `private_key` should include the literal `\n` characters (not actual newlines). Copy it exactly as it appears in the JSON file.

## Configuring for Deployment

### GitHub Secrets (for Vercel Deployment)

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Add each environment variable as a **New repository secret**
4. Use the exact variable names listed above
5. Vercel will automatically read these secrets during deployment

**Required GitHub Secrets:**
```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
FIREBASE_ADMIN_PROJECT_ID
FIREBASE_ADMIN_CLIENT_EMAIL
FIREBASE_ADMIN_PRIVATE_KEY
```

### Local Development

Create a `.env.local` file in the project root (never commit this file):

```bash
# Client Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abc123

# Server Configuration
FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour\nPrivate\nKey\nHere\n-----END PRIVATE KEY-----\n"
```

## Troubleshooting

### Build Errors

#### Error: `Firebase: Error (auth/invalid-api-key)`

**Cause:** The Firebase API key is missing, empty, or invalid.

**Solution:**
1. Verify `NEXT_PUBLIC_FIREBASE_API_KEY` is set in GitHub Secrets
2. Ensure the key starts with `AIza`
3. Check for trailing spaces or quotes in the secret value
4. Verify the key is correct in Firebase Console

#### Error: `Firebase configuration is invalid or incomplete`

**Cause:** One or more required environment variables are missing.

**Solution:**
1. Check that all required `NEXT_PUBLIC_FIREBASE_*` variables are set
2. Verify the variable names are spelled correctly (case-sensitive)
3. Ensure there are no typos in the variable values

#### Error: `Firebase Admin SDK is missing required environment variables`

**Cause:** Server-side Firebase configuration is incomplete.

**Solution:**
1. Verify all three admin variables are set:
   - `FIREBASE_ADMIN_PROJECT_ID`
   - `FIREBASE_ADMIN_CLIENT_EMAIL`
   - `FIREBASE_ADMIN_PRIVATE_KEY`
2. Check that the private key includes `\n` characters (literal backslash-n, not newlines)
3. Ensure the private key is wrapped in quotes if it contains special characters

### Runtime Errors

#### Error: `Firestore is not available`

**Cause:** Firebase client failed to initialize at runtime.

**Solution:**
1. Check browser console for initialization errors
2. Verify Firebase project exists and is active
3. Check Firebase Authentication and Firestore are enabled
4. Verify the API key has proper permissions

## Build-Time vs Runtime

### Build-Time Behavior

During `next build`, Firebase initialization is **skipped** if:
- Environment variables are not available
- The API key is invalid
- We detect we're in the build phase

This prevents build failures when environment variables are not yet configured. Routes that require Firebase will return a `503 Service Unavailable` error if Firebase is not initialized.

### Runtime Behavior

At runtime (when the app is deployed), Firebase **must** be properly configured:
- All required environment variables must be set
- The Firebase project must be accessible
- Authentication, Firestore, and Storage must be enabled

## Verification

To verify your Firebase configuration:

1. **Check environment variables are set:**
   ```bash
   # In Vercel deployment logs, you should see:
   # "Firebase app initialized successfully"
   ```

2. **Test authentication:**
   - Try to sign up or log in
   - Check that user data is saved to Firestore

3. **Test database access:**
   - Create content
   - Verify it appears in Firebase Console → Firestore

4. **Test storage:**
   - Upload an image
   - Verify it appears in Firebase Console → Storage

## Security Notes

- **Never commit** `.env.local` to version control
- **Never expose** admin private keys in client-side code
- **Never log** private keys in production
- Use GitHub Secrets for all sensitive values
- Rotate keys periodically for security

## Support

If you continue to experience issues:
1. Check Firebase Console for service status
2. Verify all environment variables in GitHub Secrets
3. Check Vercel deployment logs for specific errors
4. Review this documentation for required variables

For additional help, see:
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Full deployment guide
- [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md) - Complete environment setup
