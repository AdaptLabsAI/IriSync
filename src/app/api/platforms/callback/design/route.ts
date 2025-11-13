import { NextRequest, NextResponse } from 'next/server';
import { logger } from '../../../../../lib/core/logging/logger';
import { AdobeExpressAdapter } from '../../../../../lib/integrations/AdobeExpressAdapter';
import { CanvaAdapter } from '../../../../../lib/integrations/CanvaAdapter';
import { NotionAdapter } from '../../../../../lib/integrations/NotionAdapter';
import { GoogleDriveAdapter } from '../../../../../lib/integrations/GoogleDriveAdapter';
import { OneDriveAdapter } from '../../../../../lib/integrations/OneDriveAdapter';
import { DropboxAdapter } from '../../../../../lib/integrations/DropboxAdapter';
import { AirtableAdapter } from '../../../../../lib/integrations/AirtableAdapter';
import { getFirestore } from '../../../../../lib/core/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { PlatformAdapterFactory } from '../../../../../lib/platforms/adapters/PlatformAdapterFactory';

const firestore = getFirestore();

/**
 * OAuth callback handler for design platform integrations
 * Handles Adobe Express, Canva, Notion, Google Drive, OneDrive, Dropbox, and Airtable
 */
export async function GET(req: NextRequest) {
  const startTime = process.hrtime();
  try {
    // Extract query parameters
    const { searchParams } = new URL(req.url);
    const provider = searchParams.get('provider');
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Check for errors from OAuth provider
    if (error) {
      logger.error({ 
        type: 'design_oauth_callback', 
        error, 
        errorDescription,
        provider 
      }, 'Design platform OAuth callback error');
      
      return NextResponse.redirect(new URL(`/dashboard/settings/connections?error=${error}&errorDescription=${errorDescription || 'Authentication failed'}`, req.url));
    }

    // Validate required parameters
    if (!provider || !code) {
      logger.error({ 
        type: 'design_oauth_callback',
        error: 'Missing required parameters',
        provider,
        hasCode: !!code
      }, 'Invalid design platform OAuth callback');
      
      return NextResponse.redirect(new URL('/dashboard/settings/connections?error=invalid_request&errorDescription=Missing required parameters', req.url));
    }

    // Decode and validate state parameter (contains userId and additional security info)
    let userData;
    try {
      userData = JSON.parse(Buffer.from(state || '', 'base64').toString('utf-8'));
      if (!userData.userId) {
        throw new Error('Invalid state parameter');
      }
    } catch (e) {
      logger.error({ type: 'design_oauth_callback', error: 'Invalid state parameter' }, 'OAuth state validation failed');
      return NextResponse.redirect(new URL('/dashboard/settings/connections?error=invalid_state&errorDescription=Invalid authentication state', req.url));
    }

    const userId = userData.userId;
    
    // Exchange authorization code for access token based on provider
    let result;
    switch (provider) {
      case 'adobe-express':
        result = await AdobeExpressAdapter.handleOAuthCallback(code);
        break;
      case 'canva':
        result = await CanvaAdapter.handleOAuthCallback(code);
        break;
      case 'notion':
        result = await NotionAdapter.handleOAuthCallback(code);
        break;
      case 'google-drive':
        result = await GoogleDriveAdapter.handleOAuthCallback(code);
        break;
      case 'onedrive':
        result = await OneDriveAdapter.handleOAuthCallback(code);
        break;
      case 'dropbox':
        result = await DropboxAdapter.handleOAuthCallback(code);
        break;
      case 'airtable':
        result = await AirtableAdapter.handleOAuthCallback(code);
        break;
      default:
        logger.error({ type: 'design_oauth_callback', provider }, 'Unsupported design provider');
        return NextResponse.redirect(new URL('/dashboard/settings/connections?error=unsupported_provider', req.url));
    }
    
    // Store tokens in Firestore
    await firestore.collection('users').doc(userId).collection('integrations').doc(provider).set({
      accessToken: result.access_token,
      refreshToken: result.refresh_token,
      tokenType: result.token_type,
      expiresAt: result.expires_in ? new Date(Date.now() + (result.expires_in * 1000)) : null,
      scope: result.scope,
      provider,
      updatedAt: new Date()
    });
    
    // Update user's connectedDesignPlatforms array
    await firestore.collection('users').doc(userId).update({
      connectedDesignPlatforms: FieldValue.arrayUnion(provider)
    });
    
    // Log successful connection
    logger.info({ 
      type: 'design_oauth_callback',
      provider,
      userId,
      status: 'success' 
    }, `${provider} connected successfully`);
    
    // Redirect back to connections page with success message
    return NextResponse.redirect(new URL(`/dashboard/settings/connections?success=true&provider=${provider}`, req.url));
    
  } catch (error: any) {
    // Log the error
    logger.error({ 
      type: 'design_oauth_callback',
      error: error.message || 'Unknown error'
    }, 'Design platform OAuth callback processing error');
    
    // Redirect with error information
    const errorMsg = encodeURIComponent(error.message || 'Failed to complete authentication');
    return NextResponse.redirect(new URL(`/dashboard/settings/connections?error=server_error&errorDescription=${errorMsg}`, req.url));
  }
}

/**
 * Handles POST requests from the platform callback page for design integrations
 */
export async function POST(req: NextRequest) {
  const startTime = process.hrtime();
  try {
    // Get request body
    const { platform, code, state } = await req.json();
    
    // Log inbound request
    logger.info({ 
      type: 'design_oauth_callback',
      platform,
      has_code: !!code,
      has_state: !!state 
    }, 'Processing design platform callback via POST');
    
    if (!platform || !code) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields', 
        message: 'Platform and authorization code are required' 
      }, { status: 400 });
    }
    
    // Decode and validate state parameter
    let userData;
    try {
      userData = state ? JSON.parse(Buffer.from(state, 'base64').toString('utf-8')) : null;
      
      // If no state is provided, or state is invalid, try to get user ID from session
      if (!userData || !userData.userId) {
        // Fallback to session authentication
        const session = await fetch('/api/auth/session');
        const sessionData = await session.json();
        
        if (!sessionData.user?.id) {
          return NextResponse.json({ 
            success: false, 
            error: 'Unauthorized', 
            message: 'Authentication required' 
          }, { status: 401 });
        }
        
        userData = { userId: sessionData.user.id, requestId: null };
      }
    } catch (e) {
      logger.error({ type: 'design_oauth_callback', error: e }, 'Failed to parse state parameter');
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid state parameter', 
        message: 'Failed to parse authentication state' 
      }, { status: 400 });
    }
    
    // Handle the authorization code
    try {
      // Exchange authorization code for tokens
      // For design platforms we'll need to use the appropriate API
      const userId = userData.userId;
      
      // Call the design platform-specific API endpoint
      const response = await fetch(`/api/integration/design/${platform}-auth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/platforms/callback?type=design&platform=${platform}`
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to exchange authorization code');
      }
      
      const authData = await response.json();
      
      // Store the design platform connection in the user's account
      const connectionRef = firestore.collection('users').doc(userId).collection('designConnections').doc();
      
      await connectionRef.set({
        platform,
        accessToken: authData.accessToken,
        refreshToken: authData.refreshToken,
        expiresAt: authData.expiresIn ? new Date(Date.now() + (authData.expiresIn * 1000)) : null,
        scope: authData.scope || '',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        status: 'active'
      });
      
      // Update user's connected design platforms array
      await firestore.collection('users').doc(userId).update({
        connectedDesignPlatforms: FieldValue.arrayUnion(platform)
      });
      
      // Log successful connection
      logger.info({ 
        type: 'design_oauth_callback',
        platform,
        userId,
        status: 'success' 
      }, `Design platform ${platform} connected successfully via POST`);
      
      return NextResponse.json({
        success: true,
        message: `Successfully connected to ${platform}`,
        platform
      });
      
    } catch (error: any) {
      // Log the error
      logger.error({ 
        type: 'design_oauth_callback',
        error: error.message || 'Unknown error'
      }, 'Design platform OAuth code exchange failed');
      
      return NextResponse.json({ 
        success: false, 
        error: 'Connection failed', 
        message: error.message || 'Failed to complete design platform authentication' 
      }, { status: 500 });
    }
  } catch (error: any) {
    // Log any unexpected errors
    logger.error({ 
      type: 'design_oauth_callback',
      error: error.message || 'Unknown error'
    }, 'Design platform POST handler error');
    
    return NextResponse.json({ 
      success: false, 
      error: 'Server error', 
      message: 'An unexpected error occurred' 
    }, { status: 500 });
  }
} 