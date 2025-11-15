import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Firebase Configuration Debug Endpoint
 * 
 * PURPOSE:
 * This endpoint allows you to verify Firebase client configuration in production
 * without exposing actual secret values. It only reports which environment variables
 * are present or missing.
 * 
 * SECURITY:
 * - In production: Requires ?token=<INTERNAL_DEBUG_TOKEN> query parameter
 * - In development: No token required
 * - NEVER returns actual secret values, only presence/absence
 * 
 * REQUIRED ENVIRONMENT VARIABLES (checked by this endpoint):
 * - NEXT_PUBLIC_FIREBASE_API_KEY
 * - NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
 * - NEXT_PUBLIC_FIREBASE_PROJECT_ID
 * - NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
 * - NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID (must be string like "554117967400")
 * - NEXT_PUBLIC_FIREBASE_APP_ID
 * 
 * USAGE:
 * Development: GET /api/debug/firebase-config-status
 * Production:  GET /api/debug/firebase-config-status?token=<your-debug-token>
 * 
 * The INTERNAL_DEBUG_TOKEN must be set in your hosting platform's env vars.
 */

const REQUIRED_VARS = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
] as const;

export async function GET(request: NextRequest) {
  const isProduction = process.env.NODE_ENV === 'production';

  // In production, require authentication via query parameter
  if (isProduction) {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const expectedToken = process.env.INTERNAL_DEBUG_TOKEN;

    // If no expected token is set, or tokens don't match, deny access
    if (!expectedToken || token !== expectedToken) {
      return NextResponse.json(
        { error: 'Unauthorized. This endpoint requires authentication in production.' },
        { status: 401 }
      );
    }
  }

  try {
    // Build status for each required Firebase client env var
    const present: string[] = [];
    const missing: string[] = [];

    REQUIRED_VARS.forEach((key) => {
      const value = process.env[key];
      if (typeof value === 'string' && value.trim().length > 0) {
        present.push(key);
      } else {
        missing.push(key);
      }
    });

    // Check for specific issues
    const warnings: string[] = [];
    
    // Check if messagingSenderId contains scientific notation
    const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
    if (messagingSenderId && /[eE]/.test(messagingSenderId)) {
      warnings.push(
        'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID contains scientific notation (e.g., 5.54118E+11). ' +
        'It should be a string like "554117967400". Wrap the value in quotes in your environment variables.'
      );
    }

    // Also check admin SDK env vars (server-side only)
    const adminEnvStatus = {
      FIREBASE_ADMIN_PROJECT_ID: !!process.env.FIREBASE_ADMIN_PROJECT_ID,
      FIREBASE_ADMIN_CLIENT_EMAIL: !!process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      FIREBASE_ADMIN_PRIVATE_KEY: !!process.env.FIREBASE_ADMIN_PRIVATE_KEY,
    };

    const response = {
      env: process.env.NODE_ENV || 'unknown',
      present,
      missing,
      warnings: warnings.length > 0 ? warnings : undefined,
      client: {
        isComplete: missing.length === 0,
        requiredCount: REQUIRED_VARS.length,
        presentCount: present.length,
        missingCount: missing.length,
      },
      admin: {
        isComplete: Object.values(adminEnvStatus).every((v) => v),
        config: adminEnvStatus,
      },
      recommendation:
        missing.length === 0
          ? 'Firebase client configuration is complete. ✓'
          : `Missing environment variables: ${missing.join(', ')}. ${
              isProduction
                ? 'Check your hosting platform\'s environment variables (e.g., Vercel project settings).'
                : 'Add these to your .env.local file in development.'
            }`,
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error checking Firebase config:', error);
    return NextResponse.json(
      {
        error: 'Failed to check Firebase configuration',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
