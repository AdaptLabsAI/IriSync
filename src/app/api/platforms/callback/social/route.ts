import { NextRequest, NextResponse } from 'next/server';
import { logger } from '../../../../../lib/core/logging/logger';
import { getFirestore } from '../../../../../lib/core/firebase/admin';
import { PlatformType } from '../../../../../lib/platforms/models';
import { PlatformAdapterFactory } from '../../../../../lib/features/platforms/adapters/PlatformAdapterFactory';
import { FieldValue } from 'firebase-admin/firestore';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


const firestore = getFirestore();

/**
 * OAuth callback handler for social media platform integrations
 * Handles Facebook, Instagram, Twitter, LinkedIn, YouTube, TikTok, Pinterest, Reddit, Mastodon, and Threads
 */
export async function GET(req: NextRequest) {
  const startTime = process.hrtime();
  try {
    // Extract query parameters
    const { searchParams } = new URL(req.url);
    const platform = searchParams.get('platform');
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    const oauthVerifier = searchParams.get('oauth_verifier'); // For Twitter OAuth 1.0a

    // Check for errors from OAuth provider
    if (error) {
      logger.error('Error', { type: 'social_oauth_callback', 
        error, 
        errorDescription,
        platform 
      }, 'Social platform OAuth callback error');
      
      return NextResponse.redirect(new URL(`/dashboard/settings/connections?error=${error}&errorDescription=${errorDescription || 'Authentication failed'}`, req.url));
    }

    // Validate required parameters
    if (!platform || (!code && !oauthVerifier) || !state) {
      logger.error('Error', { type: 'social_oauth_callback',
        error: 'Missing required parameters',
        platform,
        hasCode: !!code,
        hasOAuthVerifier: !!oauthVerifier,
        hasState: !!state
      }, 'Invalid social platform OAuth callback');
      
      return NextResponse.redirect(new URL('/dashboard/settings/connections?error=invalid_request&errorDescription=Missing required parameters', req.url));
    }

    // Decode and validate state parameter
    let userData;
    try {
      userData = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
      if (!userData.userId || !userData.requestId) {
        throw new Error('Invalid state parameter');
      }
    } catch (e) {
      logger.error('Error', { type: 'social_oauth_callback', error: 'Invalid state parameter' }, 'OAuth state validation failed');
      return NextResponse.redirect(new URL('/dashboard/settings/connections?error=invalid_state&errorDescription=Invalid authentication state', req.url));
    }

    const userId = userData.userId;
    const requestId = userData.requestId;
    
    // Verify that this was a recent request to prevent replay attacks
    const reqDoc = await firestore.collection('oauthRequests').doc(requestId).get();
    if (!reqDoc.exists || Date.now() - reqDoc.data()?.timestamp.toMillis() > 1000 * 60 * 10) { // 10 minute expiry
      logger.error('Error', { type: 'social_oauth_callback', error: 'Expired or invalid request' }, 'OAuth request validation failed');
      return NextResponse.redirect(new URL('/dashboard/settings/connections?error=invalid_state&errorDescription=Authentication request expired or invalid', req.url));
    }
    
    // Clean up the request document
    await firestore.collection('oauthRequests').doc(requestId).delete();

    // Verify subscription tier and platform limits
    const userDoc = await firestore.collection('users').doc(userId).get();
    const userData2 = userDoc.data();
    const tier = userData2?.subscriptionTier || 'creator';
    
    // Count existing platform connections
    const connectionsSnapshot = await firestore.collection('users').doc(userId).collection('platformConnections').get();
    const existingConnectionCount = connectionsSnapshot.size;
    
    // Check limits based on tier
    const maxConnections = tier === 'creator' ? 5 : Infinity; // Creator tier is limited to 5 connections
    
    if (existingConnectionCount >= maxConnections) {
      logger.warn('Warn', { type: 'social_oauth_callback',
        userId,
        tier,
        connectionCount: existingConnectionCount,
        maxConnections
      }, 'Platform connection limit reached');
      
      return NextResponse.redirect(new URL('/dashboard/settings/connections?error=limit_reached&errorDescription=You have reached the maximum number of platform connections for your subscription tier', req.url));
    }
    
    // Get the appropriate platform adapter
    const adapter = PlatformAdapterFactory.getAdapter(platform as PlatformType);
    
    // Exchange authorization code for tokens
    const authData = code 
      ? await adapter.handleAuthorizationCode(code, oauthVerifier || undefined)
      : await adapter.handleAuthorizationToken(oauthVerifier!, userData.oauthToken); // For OAuth 1.0a flow

    // Extract platform-specific account data
    const accountInfo = await adapter.getAccountInfo(authData.accessToken);
    
    // Store connection in Firestore
    const connectionId = firestore.collection('users').doc(userId).collection('platformConnections').doc().id;
    
    // Prepare additional data to store with connection
    const additionalData = accountInfo.additionalData || {};
    
    await firestore.collection('users').doc(userId).collection('platformConnections').doc(connectionId).set({
      platform,
      platformAccountId: accountInfo.id,
      platformAccountName: accountInfo.name,
      platformAccountUsername: accountInfo.username,
      platformAccountAvatar: accountInfo.profileImage,
      accessToken: authData.accessToken,
      refreshToken: authData.refreshToken,
      tokenSecret: authData.tokenSecret, // For OAuth 1.0a (Twitter)
      expiresAt: authData.expiresIn ? new Date(Date.now() + (authData.expiresIn * 1000)) : null,
      scope: authData.scope,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'active',
      additionalData: additionalData // Store any platform-specific data (like Facebook pages)
    });
    
    // Also update user's connectedPlatforms array for easy access
    await firestore.collection('users').doc(userId).update({
      connectedPlatforms: FieldValue.arrayUnion(platform)
    });
    
    // Log successful connection
    logger.info('Info', { type: 'social_oauth_callback',
      platform,
      userId,
      connectionId,
      status: 'success' 
    }, `${platform} connected successfully`);
    
    // Redirect back to connections page with success message
    return NextResponse.redirect(new URL(`/dashboard/settings/connections?success=true&platform=${platform}`, req.url));
    
  } catch (error: any) {
    // Log the error
    logger.error('Error', { type: 'social_oauth_callback',
      error: error.message || 'Unknown error'
    }, 'Social platform OAuth callback processing error');
    
    // Redirect with error information
    const errorMsg = encodeURIComponent(error.message || 'Failed to complete authentication');
    return NextResponse.redirect(new URL(`/dashboard/settings/connections?error=server_error&errorDescription=${errorMsg}`, req.url));
  }
}

/**
 * Handles POST requests from the platform callback page for social media integrations
 */
export async function POST(req: NextRequest) {
  const startTime = process.hrtime();
  try {
    // Get request body
    const { platform, code, state } = await req.json();
    
    // Log inbound request
    logger.info('Info', { type: 'social_oauth_callback',
      platform,
      has_code: !!code,
      has_state: !!state 
    }, 'Processing social platform callback via POST');
    
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
      logger.error('Error', { type: 'social_oauth_callback', error: e }, 'Failed to parse state parameter');
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid state parameter', 
        message: 'Failed to parse authentication state' 
      }, { status: 400 });
    }
    
    const userId = userData.userId;
    const requestId = userData.requestId;
    
    // If there's a requestId, verify the OAuth request
    if (requestId) {
      const reqDoc = await firestore.collection('oauthRequests').doc(requestId).get();
      if (!reqDoc.exists || Date.now() - reqDoc.data()?.timestamp.toMillis() > 1000 * 60 * 10) { // 10 minute expiry
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid request', 
          message: 'Authentication request expired or invalid' 
        }, { status: 400 });
      }
      
      // Clean up the request document
      await firestore.collection('oauthRequests').doc(requestId).delete();
    }
    
    // Verify subscription tier and platform limits
    const userDoc = await firestore.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json({ 
        success: false, 
        error: 'User not found', 
        message: 'User account not found' 
      }, { status: 404 });
    }
    
    const userData2 = userDoc.data();
    const tier = userData2?.subscriptionTier || 'creator';
    
    // Count existing platform connections
    const connectionsSnapshot = await firestore.collection('users').doc(userId).collection('platformConnections').get();
    const existingConnectionCount = connectionsSnapshot.size;
    
    // Check limits based on tier
    const maxConnections = tier === 'creator' ? 5 : Infinity; // Creator tier is limited to 5 connections
    
    if (existingConnectionCount >= maxConnections) {
      return NextResponse.json({ 
        success: false, 
        error: 'Limit reached', 
        message: 'You have reached the maximum number of platform connections for your subscription tier' 
      }, { status: 403 });
    }
    
    try {
      // Get the appropriate platform adapter
      const adapter = PlatformAdapterFactory.getAdapter(platform as PlatformType);
      
      // Exchange authorization code for tokens
      const authData = await adapter.handleAuthorizationCode(code);
      
      // Extract platform-specific account data
      const accountInfo = await adapter.getAccountInfo(authData.accessToken);
      
      // Store connection in Firestore
      const connectionId = firestore.collection('users').doc(userId).collection('platformConnections').doc().id;
      
      // Prepare additional data to store with connection
      const additionalData = accountInfo.additionalData || {};
      
      await firestore.collection('users').doc(userId).collection('platformConnections').doc(connectionId).set({
        platform,
        platformAccountId: accountInfo.id,
        platformAccountName: accountInfo.name,
        platformAccountUsername: accountInfo.username,
        platformAccountAvatar: accountInfo.profileImage,
        accessToken: authData.accessToken,
        refreshToken: authData.refreshToken,
        tokenSecret: authData.tokenSecret, // For OAuth 1.0a (Twitter)
        expiresAt: authData.expiresIn ? new Date(Date.now() + (authData.expiresIn * 1000)) : null,
        scope: authData.scope,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'active',
        additionalData: additionalData // Store any platform-specific data (like Facebook pages)
      });
      
      // Also update user's connectedPlatforms array for easy access
      await firestore.collection('users').doc(userId).update({
        connectedPlatforms: FieldValue.arrayUnion(platform)
      });
      
      // Log successful connection
      logger.info('Info', { type: 'social_oauth_callback',
        platform,
        userId,
        connectionId,
        status: 'success' 
      }, `${platform} connected successfully via POST`);
      
      return NextResponse.json({
        success: true,
        message: `Successfully connected to ${platform}`,
        platform,
        accountName: accountInfo.name,
        accountUsername: accountInfo.username
      });
      
    } catch (error: any) {
      // Log the error
      logger.error('Error', { type: 'social_oauth_callback',
        error: error.message || 'Unknown error'
      }, 'Social platform OAuth code exchange failed');
      
      return NextResponse.json({ 
        success: false, 
        error: 'Connection failed', 
        message: error.message || 'Failed to complete platform authentication' 
      }, { status: 500 });
    }
  } catch (error: any) {
    // Log any unexpected errors
    logger.error('Error', { type: 'social_oauth_callback',
      error: error.message || 'Unknown error'
    }, 'Social platform POST handler error');
    
    return NextResponse.json({ 
      success: false, 
      error: 'Server error', 
      message: 'An unexpected error occurred' 
    }, { status: 500 });
  }
} 