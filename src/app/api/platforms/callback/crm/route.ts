import { NextRequest, NextResponse } from 'next/server';
import { HubspotAdapter } from '../../../../../lib/integrations/HubspotAdapter';
import { SalesforceAdapter } from '../../../../../lib/integrations/SalesforceAdapter';
import { ZohoCRMAdapter } from '../../../../../lib/integrations/ZohoCRMAdapter';
import { getServerSession } from 'next-auth';
import { firestore } from '@/lib/core/firebase/client';
import { doc, collection, setDoc, updateDoc, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { logger } from '@/lib/core/logging/logger';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


/**
 * OAuth callback handler for CRM platform integrations
 * Handles HubSpot, Salesforce, Zoho, Pipedrive, Microsoft Dynamics, and SugarCRM
 */
export async function GET(request: NextRequest) {
  try {
    // Extract parameters from the request
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const platform = searchParams.get('platform');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Check for errors from OAuth provider
    if (error) {
      logger.error('CRM OAuth error', { error, errorDescription, platform });
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/connections?error=${error}&error_description=${encodeURIComponent(errorDescription || '')}`
      );
    }

    // Validate required parameters
    if (!code || !platform) {
      logger.error('Missing required parameters for CRM OAuth callback', { platform, hasCode: !!code });
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/connections?error=invalid_request&error_description=${encodeURIComponent('Missing required parameters')}`
      );
    }

    // Get the user session
    const session = await getServerSession();
    if (!session?.user?.email) {
      logger.error('Unauthorized access to CRM OAuth callback', { platform });
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/auth/login?error=unauthorized&error_description=${encodeURIComponent('You must be logged in to connect a CRM')}`
      );
    }

    // Exchange the code for tokens and account info
    const { tokens, accountInfo } = await handleOAuthCallback(platform, code);

    // Store the connection in Firestore
    if (tokens && accountInfo) {
      try {
        await storeCRMConnection(session.user.email, platform, tokens, accountInfo);
        logger.info('CRM connection saved successfully', { platform, userId: session.user.email });
      } catch (storageError) {
        logger.error('Failed to store CRM connection', { platform, error: storageError });
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/connections?error=storage_error&error_description=${encodeURIComponent('Failed to store connection')}`
        );
      }
    }

    // Redirect back to connections page
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/connections?success=true&platform=${platform}`
    );
  } catch (error) {
    logger.error('Error in CRM OAuth callback', { error });
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/connections?error=server_error&error_description=${encodeURIComponent('An unexpected error occurred')}`
    );
  }
}

// Handle OAuth callback for different CRM platforms
async function handleOAuthCallback(platform: string, code: string) {
  try {
    let tokens;
    let accountInfo;

    switch (platform.toLowerCase()) {
      case 'hubspot':
        tokens = await HubspotAdapter.handleOAuthCallback(code);
        accountInfo = await HubspotAdapter.getAccountInfo(tokens.access_token);
        break;

      case 'salesforce':
        tokens = await SalesforceAdapter.handleOAuthCallback(code);
        accountInfo = await SalesforceAdapter.getAccountInfo(
          tokens.access_token,
          tokens.instance_url
        );
        break;

      case 'zoho':
        tokens = await ZohoCRMAdapter.handleOAuthCallback(code);
        accountInfo = await ZohoCRMAdapter.getAccountInfo(tokens.access_token);
        break;

      case 'pipedrive':
        // Use Pipedrive adapter when implemented
        throw new Error('Pipedrive integration not yet implemented');

      case 'dynamics':
        // Use Dynamics adapter when implemented
        throw new Error('Microsoft Dynamics integration not yet implemented');

      case 'sugarcrm':
        // Use SugarCRM adapter when implemented
        throw new Error('SugarCRM integration not yet implemented');

      default:
        throw new Error(`Unsupported CRM platform: ${platform}`);
    }

    return { tokens, accountInfo };
  } catch (error) {
    logger.error('Error handling CRM OAuth callback', { platform, error });
    throw error;
  }
}

// Store CRM connection in Firestore
async function storeCRMConnection(userId: string, platform: string, tokens: any, accountInfo: any) {
  const connectionData = {
    userId,
    platform,
    accountId: accountInfo.id,
    accountName: accountInfo.name,
    accountEmail: accountInfo.email,
    tokens: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      // Convert expires_in (seconds) to expiry timestamp (milliseconds)
      expiresAt: tokens.expires_in ? Date.now() + (tokens.expires_in * 1000) : null,
      tokenType: tokens.token_type || 'Bearer',
      scope: tokens.scope || '',
      // Additional fields specific to certain platforms
      instanceUrl: tokens.instance_url || null, // For Salesforce
    },
    additionalData: accountInfo.accountDetails || {},
    connected: true,
    connectedAt: new Date().toISOString(),
    lastUsed: new Date().toISOString(),
  };

  // Save to Firestore
  const connectionRef = doc(firestore, 'crmConnections', `${userId}_${platform}`);
  await setDoc(connectionRef, connectionData);

  return connectionData;
}

/**
 * Handles POST requests from the platform callback page for CRM integrations
 */
export async function POST(req: NextRequest) {
  const startTime = process.hrtime();
  try {
    // Get request body
    const { platform, code, state } = await req.json();
    
    // Log inbound request
    logger.info({ 
      type: 'crm_oauth_callback',
      platform,
      has_code: !!code,
      has_state: !!state 
    }, 'Processing CRM platform callback via POST');
    
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
      logger.error({ type: 'crm_oauth_callback', error: e }, 'Failed to parse state parameter');
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid state parameter', 
        message: 'Failed to parse authentication state' 
      }, { status: 400 });
    }
    
    // Handle the authorization code
    try {
      // Exchange authorization code for tokens
      // For CRM platforms we'll call the appropriate API endpoint
      const userId = userData.userId;
      
      // Call the CRM platform-specific API endpoint
      const response = await fetch(`/api/integration/crm/${platform}-auth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/platforms/callback?type=crm&platform=${platform}`
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to exchange authorization code');
      }
      
      const authData = await response.json();
      
      // Store the CRM platform connection in the user's account
      const connectionsCollRef = collection(firestore, 'users', userId, 'crmConnections');
      const connectionRef = doc(connectionsCollRef);
      
      await setDoc(connectionRef, {
        platform,
        accessToken: authData.accessToken,
        refreshToken: authData.refreshToken,
        expiresAt: authData.expiresIn ? new Date(Date.now() + (authData.expiresIn * 1000)) : null,
        scope: authData.scope || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: 'active'
      });
      
      // Update user's connected CRM platforms array
      const userRef = doc(firestore, 'users', userId);
      await updateDoc(userRef, {
        connectedCrmPlatforms: arrayUnion(platform)
      });
      
      // Log successful connection
      logger.info({ 
        type: 'crm_oauth_callback',
        platform,
        userId,
        status: 'success' 
      }, `CRM platform ${platform} connected successfully via POST`);
      
      return NextResponse.json({
        success: true,
        message: `Successfully connected to ${platform}`,
        platform
      });
      
    } catch (error: any) {
      // Log the error
      logger.error({ 
        type: 'crm_oauth_callback',
        error: error.message || 'Unknown error'
      }, 'CRM platform OAuth code exchange failed');
      
      return NextResponse.json({ 
        success: false, 
        error: 'Connection failed', 
        message: error.message || 'Failed to complete CRM platform authentication' 
      }, { status: 500 });
    }
  } catch (error: any) {
    // Log any unexpected errors
    logger.error({ 
      type: 'crm_oauth_callback',
      error: error.message || 'Unknown error'
    }, 'CRM platform POST handler error');
    
    return NextResponse.json({ 
      success: false, 
      error: 'Server error', 
      message: 'An unexpected error occurred' 
    }, { status: 500 });
  }
}

// Helper functions (to be replaced with proper adapter implementations)
function getCrmTokenEndpoint(provider: string): string {
  const endpoints: Record<string, string> = {
    'hubspot': 'https://api.hubapi.com/oauth/v1/token',
    'salesforce': 'https://login.salesforce.com/services/oauth2/token',
    'zoho': 'https://accounts.zoho.com/oauth/v2/token',
    'pipedrive': 'https://oauth.pipedrive.com/oauth/token',
    'dynamics': 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    'sugarcrm': process.env.SUGARCRM_URL + '/oauth2/token' || ''
  };
  
  return endpoints[provider] || '';
}

function getCrmClientId(provider: string): string {
  const clientIds: Record<string, string> = {
    'hubspot': process.env.HUBSPOT_CLIENT_ID || '',
    'salesforce': process.env.SALESFORCE_CLIENT_ID || '',
    'zoho': process.env.ZOHO_CLIENT_ID || '',
    'pipedrive': process.env.PIPEDRIVE_CLIENT_ID || '',
    'dynamics': process.env.DYNAMICS_CLIENT_ID || '',
    'sugarcrm': process.env.SUGARCRM_CLIENT_ID || ''
  };
  
  return clientIds[provider] || '';
}

function getCrmClientSecret(provider: string): string {
  const clientSecrets: Record<string, string> = {
    'hubspot': process.env.HUBSPOT_CLIENT_SECRET || '',
    'salesforce': process.env.SALESFORCE_CLIENT_SECRET || '',
    'zoho': process.env.ZOHO_CLIENT_SECRET || '',
    'pipedrive': process.env.PIPEDRIVE_CLIENT_SECRET || '',
    'dynamics': process.env.DYNAMICS_CLIENT_SECRET || '',
    'sugarcrm': process.env.SUGARCRM_CLIENT_SECRET || ''
  };
  
  return clientSecrets[provider] || '';
}

function getCrmRedirectUri(provider: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${baseUrl}/api/platforms/callback/crm?provider=${provider}`;
} 