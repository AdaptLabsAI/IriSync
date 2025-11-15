import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseConfigDebugInfo } from '@/lib/client/firebaseConfig';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Debug endpoint to check Firebase configuration status
 * 
 * In development: Always accessible
 * In production: Requires x-internal-debug-token header matching INTERNAL_DEBUG_TOKEN env var
 */
export async function GET(request: NextRequest) {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // In production, require authentication via header
  if (isProduction) {
    const debugToken = request.headers.get('x-internal-debug-token');
    const expectedToken = process.env.INTERNAL_DEBUG_TOKEN;
    
    // If no expected token is set, or tokens don't match, deny access
    if (!expectedToken || debugToken !== expectedToken) {
      return NextResponse.json(
        { error: 'Unauthorized. This endpoint requires authentication in production.' },
        { status: 403 }
      );
    }
  }

  try {
    const debugInfo = getFirebaseConfigDebugInfo();
    
    // Check client SDK env vars (these are public anyway via NEXT_PUBLIC_*)
    const clientEnvStatus = {
      NEXT_PUBLIC_FIREBASE_API_KEY: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: !!process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: !!process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      NEXT_PUBLIC_FIREBASE_APP_ID: !!process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };
    
    // Also check admin SDK env vars (server-side only)
    const adminEnvStatus = {
      FIREBASE_ADMIN_PROJECT_ID: !!process.env.FIREBASE_ADMIN_PROJECT_ID,
      FIREBASE_ADMIN_CLIENT_EMAIL: !!process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      FIREBASE_ADMIN_PRIVATE_KEY: !!process.env.FIREBASE_ADMIN_PRIVATE_KEY,
    };

    return NextResponse.json({
      environment: isProduction ? 'production' : 'development',
      client: {
        isComplete: debugInfo.isComplete,
        config: clientEnvStatus,
        missing: debugInfo.missing,
        present: debugInfo.present,
      },
      admin: {
        isComplete: Object.values(adminEnvStatus).every(v => v),
        config: adminEnvStatus,
      },
      recommendation: debugInfo.isComplete 
        ? 'Firebase client configuration is complete.'
        : `Missing environment variables: ${debugInfo.missing.join(', ')}. ${isProduction ? 'Check your hosting platform\'s environment variables (e.g., Vercel project settings).' : 'Add these to your .env.local file in development.'}`,
    });
  } catch (error) {
    console.error('Error checking Firebase config:', error);
    return NextResponse.json(
      { error: 'Failed to check Firebase configuration' },
      { status: 500 }
    );
  }
}
