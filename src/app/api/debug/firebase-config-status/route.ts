import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseConfigDebugInfo } from '@/lib/client/firebaseConfig';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Debug endpoint to check Firebase configuration status
 * Only available in development mode for security
 */
export async function GET(request: NextRequest) {
  // Only allow in development or with admin authentication
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development mode' },
      { status: 403 }
    );
  }

  try {
    const debugInfo = getFirebaseConfigDebugInfo();
    
    // Also check admin SDK env vars (server-side only)
    const adminEnvStatus = {
      FIREBASE_ADMIN_PROJECT_ID: !!process.env.FIREBASE_ADMIN_PROJECT_ID,
      FIREBASE_ADMIN_CLIENT_EMAIL: !!process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      FIREBASE_ADMIN_PRIVATE_KEY: !!process.env.FIREBASE_ADMIN_PRIVATE_KEY,
    };

    return NextResponse.json({
      client: {
        isComplete: debugInfo.isComplete,
        missing: debugInfo.missing,
        present: debugInfo.present,
      },
      admin: {
        isComplete: Object.values(adminEnvStatus).every(v => v),
        status: adminEnvStatus,
      },
      recommendation: debugInfo.isComplete 
        ? 'Firebase client configuration is complete.'
        : `Missing environment variables: ${debugInfo.missing.join(', ')}. Add these to your .env.local file in development, or to your hosting platform's environment variables in production.`,
    });
  } catch (error) {
    console.error('Error checking Firebase config:', error);
    return NextResponse.json(
      { error: 'Failed to check Firebase configuration' },
      { status: 500 }
    );
  }
}
