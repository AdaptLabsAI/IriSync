import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthentication, handleApiError } from '@/lib/features/auth/utils';
import { logger } from '@/lib/core/logging/logger';
import { PlatformType } from '@/lib/features/platforms/models';
import { PlatformAdapterFactory } from '@/lib/features/platforms/adapters/PlatformAdapterFactory';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


/**
 * OAuth callback handler for all platform integrations
 * This route processes the authorization code returned by the platform after user consent
 */
export async function GET(req: NextRequest) {
  const startTime = process.hrtime();
  try {
    // Get the platform and authorization code from query parameters
    const { searchParams } = new URL(req.url);
    const platform = searchParams.get('platform');
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Check if there's an error from the OAuth provider
    if (error) {
      logger.error({ 
        type: 'oauth_callback', 
        error, 
        errorDescription,
        platform 
      }, 'OAuth callback error');
      
      return NextResponse.redirect(new URL(`/platforms/callback?error=${error}&errorDescription=${errorDescription || 'Authentication failed'}`, req.url));
    }

    // Validate required parameters
    if (!platform || !code || !state) {
      logger.error({ 
        type: 'oauth_callback', 
        error: 'Missing required parameters',
        platform, 
        hasCode: !!code,
        hasState: !!state
      }, 'Invalid OAuth callback');
      
      return NextResponse.redirect(new URL('/platforms/callback?error=invalid_request&errorDescription=Missing required parameters', req.url));
    }

    // Validate the state parameter to prevent CSRF attacks
    // The state should be validated against a stored value from the original request
    // This would typically be in the user's session or a temporary datastore

    // Get the appropriate platform adapter
    const adapter = PlatformAdapterFactory.getAdapter(platform as PlatformType);
    
    // Exchange the authorization code for tokens
    const tokens = await adapter.handleAuthorizationCallback(code, state);
    
    // Create a success redirect URL with a success flag
    const redirectUrl = new URL('/platforms/callback?success=true', req.url);
    
    // Log the successful connection
    logger.info({ 
      type: 'oauth_callback', 
      platform,
      status: 'success' 
    }, 'Platform connected successfully');
    
    // Redirect back to the application
    return NextResponse.redirect(redirectUrl);
  } catch (error: any) {
    // Log the error
    logger.error({ 
      type: 'oauth_callback', 
      error: error.message || 'Unknown error',
    }, 'OAuth callback processing error');
    
    // Redirect with error information
    return NextResponse.redirect(new URL(`/platforms/callback?error=server_error&errorDescription=${encodeURIComponent(error.message || 'Failed to complete authentication')}`, req.url));
  }
}

/**
 * Handle POST requests for manual token validation or refreshing
 */
export async function POST(req: NextRequest) {
  const startTime = process.hrtime();
  try {
    // Verify user authentication
    const userId = await verifyAuthentication(req);
    if (!userId) {
      logger.warn({ type: 'request', method: 'POST', url: req.url, statusCode: 401 }, 'Unauthorized');
      return NextResponse.json({ error: 'Unauthorized', message: 'Authentication required' }, { status: 401 });
    }
    
    // Get request body
    const body = await req.json();
    const { platform, token, action } = body;
    
    if (!platform || !token) {
      return NextResponse.json({ error: 'Bad Request', message: 'Platform and token are required' }, { status: 400 });
    }
    
    // Get platform adapter
    const adapter = PlatformAdapterFactory.getAdapter(platform as PlatformType);
    
    // Process based on action
    if (action === 'validate') {
      const isValid = await adapter.validateToken(token);
      return NextResponse.json({ valid: isValid });
    } else if (action === 'refresh') {
      const newToken = await adapter.refreshToken(token);
      return NextResponse.json({ token: newToken });
    } else {
      return NextResponse.json({ error: 'Bad Request', message: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    const duration = process.hrtime(startTime);
    const durationMs = Math.round((duration[0] * 1e9 + duration[1]) / 1e6);
    logger.info({ method: req.method, url: req.url, durationMs }, `Request duration: ${durationMs}ms`);
    
    return NextResponse.json(
      handleApiError(error, '/api/platforms/callback', 'platform token operation'),
      { status: 500 }
    );
  }
} 