import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/core/logging/logger';
import { getFirestore } from '@/lib/core/firebase/admin';
import { PlatformType } from '@/lib/platforms/models';
import { generateOAuthState, generateCodeVerifier, generateCodeChallenge } from '@/lib/features/platforms/auth/oauth';
import { v4 as uuidv4 } from 'uuid';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Platform OAuth credentials configuration
 */
const PLATFORM_CONFIGS: Record<string, {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authUrl?: string;
  scopes?: string[];
}> = {
  facebook: {
    clientId: process.env.FACEBOOK_CLIENT_ID || '',
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET || '',
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/platforms/callback/social?platform=facebook`,
    scopes: ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts', 'pages_manage_metadata', 'public_profile', 'email']
  },
  instagram: {
    clientId: process.env.FACEBOOK_CLIENT_ID || '', // Instagram uses Facebook OAuth
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET || '',
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/platforms/callback/social?platform=instagram`,
    scopes: ['instagram_basic', 'instagram_content_publish', 'pages_show_list', 'pages_read_engagement']
  },
  twitter: {
    clientId: process.env.TWITTER_CLIENT_ID || '',
    clientSecret: process.env.TWITTER_CLIENT_SECRET || '',
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/platforms/callback/social?platform=twitter`,
    authUrl: 'https://twitter.com/i/oauth2/authorize',
    scopes: ['tweet.read', 'tweet.write', 'users.read', 'offline.access', 'follows.read', 'follows.write']
  },
  linkedin: {
    clientId: process.env.LINKEDIN_CLIENT_ID || '',
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/platforms/callback/social?platform=linkedin`,
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    scopes: ['r_liteprofile', 'r_emailaddress', 'w_member_social', 'r_organization_social', 'w_organization_social']
  },
  tiktok: {
    clientId: process.env.TIKTOK_CLIENT_ID || '',
    clientSecret: process.env.TIKTOK_CLIENT_SECRET || '',
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/platforms/callback/social?platform=tiktok`,
    authUrl: 'https://www.tiktok.com/v2/auth/authorize',
    scopes: ['user.info.basic', 'video.list', 'video.upload', 'video.publish']
  },
  youtube: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/platforms/callback/social?platform=youtube`,
    authUrl: 'https://accounts.google.com/o/oauth2/auth',
    scopes: ['https://www.googleapis.com/auth/youtube', 'https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube.readonly']
  },
  pinterest: {
    clientId: process.env.PINTEREST_CLIENT_ID || '',
    clientSecret: process.env.PINTEREST_CLIENT_SECRET || '',
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/platforms/callback/social?platform=pinterest`,
    authUrl: 'https://www.pinterest.com/oauth',
    scopes: ['boards:read', 'boards:write', 'pins:read', 'pins:write', 'user_accounts:read']
  }
};

/**
 * Initiate OAuth flow for a social media platform
 * GET /api/platforms/connect?platform={platform}&userId={userId}
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const platform = searchParams.get('platform') as string;
    const userId = searchParams.get('userId') as string;

    // Validate required parameters
    if (!platform || !userId) {
      return NextResponse.json(
        { error: 'Missing required parameters: platform and userId' },
        { status: 400 }
      );
    }

    // Validate platform
    if (!Object.keys(PLATFORM_CONFIGS).includes(platform.toLowerCase())) {
      return NextResponse.json(
        { error: `Unsupported platform: ${platform}` },
        { status: 400 }
      );
    }

    // Get platform config
    const config = PLATFORM_CONFIGS[platform.toLowerCase()];

    // Validate platform credentials
    if (!config.clientId || !config.clientSecret) {
      logger.error(`Missing OAuth credentials for ${platform}`, {
        hasClientId: !!config.clientId,
        hasClientSecret: !!config.clientSecret
      });
      return NextResponse.json(
        { error: `${platform} is not configured. Please contact support.` },
        { status: 500 }
      );
    }

    // Initialize Firestore
    const firestore = getFirestore();

    // Verify user exists
    const userDoc = await firestore.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Generate OAuth state
    const requestId = uuidv4();
    const state = generateOAuthState();

    // Store OAuth request for later validation
    await firestore.collection('oauthRequests').doc(requestId).set({
      userId,
      platform,
      state,
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    });

    // Encode state with user info
    const encodedState = Buffer.from(JSON.stringify({
      userId,
      requestId,
      state
    })).toString('base64');

    // Generate PKCE for platforms that support it (Twitter, etc.)
    let authUrl: string;
    const needsPKCE = ['twitter', 'tiktok'].includes(platform.toLowerCase());

    if (needsPKCE) {
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = generateCodeChallenge(codeVerifier);

      // Store code verifier for later use
      await firestore.collection('oauthRequests').doc(requestId).update({
        codeVerifier
      });

      // Build authorization URL with PKCE
      const url = new URL(config.authUrl || '');
      url.searchParams.set('client_id', config.clientId);
      url.searchParams.set('redirect_uri', config.redirectUri);
      url.searchParams.set('response_type', 'code');
      url.searchParams.set('state', encodedState);
      url.searchParams.set('scope', (config.scopes || []).join(' '));
      url.searchParams.set('code_challenge', codeChallenge);
      url.searchParams.set('code_challenge_method', 'S256');

      if (platform.toLowerCase() === 'youtube') {
        url.searchParams.set('access_type', 'offline');
        url.searchParams.set('prompt', 'consent');
      }

      authUrl = url.toString();
    } else {
      // Build standard OAuth URL
      const baseAuthUrl = config.authUrl || getDefaultAuthUrl(platform);
      const url = new URL(baseAuthUrl);
      url.searchParams.set('client_id', config.clientId);
      url.searchParams.set('redirect_uri', config.redirectUri);
      url.searchParams.set('response_type', 'code');
      url.searchParams.set('state', encodedState);
      url.searchParams.set('scope', (config.scopes || []).join(platform === 'facebook' ? ',' : ' '));

      // Platform-specific parameters
      if (platform.toLowerCase() === 'linkedin') {
        // LinkedIn doesn't need additional params
      } else if (platform.toLowerCase() === 'pinterest') {
        url.searchParams.set('response_mode', 'query');
      } else if (platform.toLowerCase() === 'youtube') {
        url.searchParams.set('access_type', 'offline');
        url.searchParams.set('prompt', 'consent');
      }

      authUrl = url.toString();
    }

    logger.info('OAuth flow initiated', {
      platform,
      userId,
      requestId,
      hasPKCE: needsPKCE
    });

    // Redirect to platform authorization page
    return NextResponse.redirect(authUrl);

  } catch (error: any) {
    logger.error('Error initiating OAuth flow', {
      error: error.message || error
    });

    return NextResponse.json(
      { error: 'Failed to initiate OAuth flow', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * Get default auth URL for platforms without explicit configuration
 */
function getDefaultAuthUrl(platform: string): string {
  const baseUrls: Record<string, string> = {
    facebook: 'https://www.facebook.com/v17.0/dialog/oauth',
    instagram: 'https://api.instagram.com/oauth/authorize',
    twitter: 'https://twitter.com/i/oauth2/authorize',
    linkedin: 'https://www.linkedin.com/oauth/v2/authorization',
    tiktok: 'https://www.tiktok.com/v2/auth/authorize',
    youtube: 'https://accounts.google.com/o/oauth2/auth',
    pinterest: 'https://www.pinterest.com/oauth'
  };

  return baseUrls[platform.toLowerCase()] || '';
}
