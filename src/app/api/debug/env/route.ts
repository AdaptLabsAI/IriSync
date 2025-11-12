import { NextResponse } from 'next/server';

/**
 * Debug endpoint to check environment variables on the server
 * Only available in development mode for security
 */
export async function GET() {
  // Only allow in development mode
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development mode' },
      { status: 403 }
    );
  }

  // Check server-side environment variables
  const envCheck = {
    // Firebase Admin Variables (Server-side only)
    firebase: {
      admin: {
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID ? 'set' : 'not set',
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL ? 'set' : 'not set',
        privateKeyLength: process.env.FIREBASE_ADMIN_PRIVATE_KEY 
          ? process.env.FIREBASE_ADMIN_PRIVATE_KEY.length 
          : 'not set',
      },
      // Public Firebase variables (both client and server)
      public: {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'set' : 'not set',
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? 'set' : 'not set',
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? 'set' : 'not set',
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ? 'set' : 'not set',
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ? 'set' : 'not set',
      }
    },
    // NextAuth Variables
    nextauth: {
      url: process.env.NEXTAUTH_URL ? 'set' : 'not set',
      secret: process.env.NEXTAUTH_SECRET ? 'set' : 'not set',
    },
    // General App Settings
    app: {
      nodeEnv: process.env.NODE_ENV,
      appUrl: process.env.NEXT_PUBLIC_APP_URL ? 'set' : 'not set',
    }
  };

  // Return the environment check result
  return NextResponse.json(envCheck);
} 