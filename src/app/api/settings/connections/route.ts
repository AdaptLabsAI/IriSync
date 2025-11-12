import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/features/auth';
import { firestore } from '@/lib/core/firebase';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, deleteDoc } from 'firebase/firestore';
import { generateOAuthUrl } from '@/lib/features/platforms/auth/oauth';

// Type definitions
interface SessionUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  id?: string;
  role?: string;
}

interface Connection {
  provider: string;
  name: string;
  accountId: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiry?: string;
  profileData?: Record<string, any>;
  status: 'active' | 'expired' | 'revoked';
  addedAt: string;
}

interface ProviderConfig {
  authUrl: string;
  clientId: string;
  redirectUri: string;
  scope: string[];
}

type ProviderConfigs = {
  [key: string]: ProviderConfig;
};

const PROVIDER_CONFIGS: ProviderConfigs = {
  twitter: {
    authUrl: process.env.TWITTER_AUTH_URL || 'https://twitter.com/i/oauth2/authorize',
    clientId: process.env.TWITTER_API_KEY!,
    redirectUri: process.env.TWITTER_CALLBACK_URL!,
    scope: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
  },
  facebook: {
    authUrl: process.env.FACEBOOK_API_URL || 'https://www.facebook.com/v18.0/dialog/oauth',
    clientId: process.env.FACEBOOK_APP_ID!,
    redirectUri: process.env.FACEBOOK_CALLBACK_URL!,
    scope: ['public_profile', 'email', 'pages_show_list', 'pages_read_engagement', 'pages_manage_posts'],
  },
  instagram: {
    authUrl: process.env.FACEBOOK_API_URL || 'https://www.facebook.com/v18.0/dialog/oauth',
    clientId: process.env.FACEBOOK_APP_ID!,
    redirectUri: process.env.INSTAGRAM_CALLBACK_URL!,
    scope: ['instagram_basic', 'instagram_content_publish', 'pages_show_list', 'instagram_manage_insights'],
  },
  linkedin: {
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    clientId: process.env.LINKEDIN_CLIENT_ID!,
    redirectUri: process.env.LINKEDIN_CALLBACK_URL!,
    scope: ['r_liteprofile', 'r_emailaddress', 'w_member_social', 'r_organization_social'],
  },
  pinterest: {
    authUrl: 'https://www.pinterest.com/oauth',
    clientId: process.env.PINTEREST_CLIENT_ID!,
    redirectUri: process.env.PINTEREST_CALLBACK_URL!,
    scope: ['boards:read', 'boards:write', 'pins:read', 'pins:write', 'user_accounts:read'],
  },
  youtube: {
    authUrl: 'https://accounts.google.com/o/oauth2/auth',
    clientId: process.env.GOOGLE_CLIENT_ID!,
    redirectUri: process.env.YOUTUBE_CALLBACK_URL!,
    scope: ['https://www.googleapis.com/auth/youtube', 'https://www.googleapis.com/auth/youtube.upload'],
  },
  reddit: {
    authUrl: 'https://www.reddit.com/api/v1/authorize',
    clientId: process.env.REDDIT_CLIENT_ID!,
    redirectUri: process.env.REDDIT_CALLBACK_URL!,
    scope: ['identity', 'edit', 'submit', 'read'],
  },
  threads: {
    authUrl: process.env.FACEBOOK_API_URL || 'https://www.facebook.com/v18.0/dialog/oauth',
    clientId: process.env.FACEBOOK_APP_ID!,
    redirectUri: process.env.THREADS_CALLBACK_URL!,
    scope: ['instagram_basic', 'instagram_content_publish'],
  },
  mastodon: {
    authUrl: process.env.MASTODON_AUTH_URL || 'https://mastodon.social/oauth/authorize',
    clientId: process.env.MASTODON_CLIENT_ID!,
    redirectUri: process.env.MASTODON_CALLBACK_URL!,
    scope: ['read', 'write', 'follow'],
  },
  tiktok: {
    authUrl: 'https://www.tiktok.com/auth/authorize/',
    clientId: process.env.TIKTOK_CLIENT_ID!,
    redirectUri: process.env.TIKTOK_CALLBACK_URL!,
    scope: ['user.info.basic', 'video.list', 'video.upload'],
  },
  // Content & Media platforms
  canva: {
    authUrl: 'https://www.canva.com/oauth',
    clientId: process.env.CANVA_CLIENT_ID!,
    redirectUri: process.env.CANVA_CALLBACK_URL!,
    scope: ['designs:read', 'designs:write', 'user:read'],
  },
  adobe_express: {
    authUrl: 'https://ims-na1.adobelogin.com/ims/authorize/v2',
    clientId: process.env.ADOBE_CLIENT_ID!,
    redirectUri: process.env.ADOBE_EXPRESS_CALLBACK_URL!,
    scope: ['openid', 'creative_sdk'],
  },
  google_drive: {
    authUrl: 'https://accounts.google.com/o/oauth2/auth',
    clientId: process.env.GOOGLE_CLIENT_ID!,
    redirectUri: process.env.GOOGLE_DRIVE_CALLBACK_URL!,
    scope: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive.metadata.readonly'],
  },
  dropbox: {
    authUrl: 'https://www.dropbox.com/oauth2/authorize',
    clientId: process.env.DROPBOX_CLIENT_ID!,
    redirectUri: process.env.DROPBOX_CALLBACK_URL!,
    scope: ['files.content.read', 'files.content.write', 'files.metadata.read'],
  },
  notion: {
    authUrl: 'https://api.notion.com/v1/oauth/authorize',
    clientId: process.env.NOTION_CLIENT_ID!,
    redirectUri: process.env.NOTION_CALLBACK_URL!,
    scope: ['read_user', 'read_content', 'update_content'],
  },
  airtable: {
    authUrl: 'https://airtable.com/oauth2/v1/authorize',
    clientId: process.env.AIRTABLE_CLIENT_ID!,
    redirectUri: process.env.AIRTABLE_CALLBACK_URL!,
    scope: ['data.records:read', 'data.records:write', 'schema.bases:read'],
  },
  onedrive: {
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    clientId: process.env.MICROSOFT_CLIENT_ID!,
    redirectUri: process.env.ONEDRIVE_CALLBACK_URL!,
    scope: ['Files.ReadWrite', 'User.Read', 'offline_access'],
  },
  // CRM Systems
  hubspot: {
    authUrl: 'https://app.hubspot.com/oauth/authorize',
    clientId: process.env.HUBSPOT_CLIENT_ID!,
    redirectUri: process.env.HUBSPOT_CALLBACK_URL!,
    scope: ['contacts', 'content', 'forms', 'automation'],
  },
  salesforce: {
    authUrl: 'https://login.salesforce.com/services/oauth2/authorize',
    clientId: process.env.SALESFORCE_CLIENT_ID!,
    redirectUri: process.env.SALESFORCE_CALLBACK_URL!,
    scope: ['api', 'refresh_token'],
  },
  zoho: {
    authUrl: 'https://accounts.zoho.com/oauth/v2/auth',
    clientId: process.env.ZOHO_CLIENT_ID!,
    redirectUri: process.env.ZOHO_CALLBACK_URL!,
    scope: ['ZohoCRM.modules.ALL', 'ZohoCRM.settings.ALL'],
  },
  pipedrive: {
    authUrl: 'https://oauth.pipedrive.com/oauth/authorize',
    clientId: process.env.PIPEDRIVE_CLIENT_ID!,
    redirectUri: process.env.PIPEDRIVE_CALLBACK_URL!,
    scope: ['contacts:read', 'deals:read', 'contacts:write'],
  },
  microsoft_dynamics: {
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    clientId: process.env.MICROSOFT_DYNAMICS_CLIENT_ID!,
    redirectUri: process.env.MICROSOFT_DYNAMICS_CALLBACK_URL!,
    scope: ['https://dynamics.microsoft.com/user_impersonation'],
  },
  sugarcrm: {
    authUrl: process.env.SUGARCRM_AUTH_URL || 'https://your-sugarcrm-instance/rest/v11_3/oauth2/authorize',
    clientId: process.env.SUGARCRM_CLIENT_ID!,
    redirectUri: process.env.SUGARCRM_CALLBACK_URL!,
    scope: ['*'],
  },
  // Analytics & Tracking
  google_analytics: {
    authUrl: 'https://accounts.google.com/o/oauth2/auth',
    clientId: process.env.GOOGLE_CLIENT_ID!,
    redirectUri: process.env.GOOGLE_ANALYTICS_CALLBACK_URL!,
    scope: ['https://www.googleapis.com/auth/analytics.readonly', 'https://www.googleapis.com/auth/analytics.edit'],
  },
  // Workflow Tools
  slack: {
    authUrl: 'https://slack.com/oauth/v2/authorize',
    clientId: process.env.SLACK_CLIENT_ID!,
    redirectUri: process.env.SLACK_CALLBACK_URL!,
    scope: ['channels:read', 'chat:write', 'files:read', 'files:write'],
  },
  microsoft_teams: {
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    clientId: process.env.MICROSOFT_TEAMS_CLIENT_ID!,
    redirectUri: process.env.MICROSOFT_TEAMS_CALLBACK_URL!,
    scope: ['ChannelMessage.Read.All', 'ChannelMessage.Send', 'User.Read'],
  },
  trello: {
    authUrl: 'https://trello.com/1/authorize',
    clientId: process.env.TRELLO_CLIENT_ID!,
    redirectUri: process.env.TRELLO_CALLBACK_URL!,
    scope: ['read', 'write'],
  },
  asana: {
    authUrl: 'https://app.asana.com/-/oauth_authorize',
    clientId: process.env.ASANA_CLIENT_ID!,
    redirectUri: process.env.ASANA_CALLBACK_URL!,
    scope: ['default'],
  },
  clickup: {
    authUrl: 'https://app.clickup.com/api',
    clientId: process.env.CLICKUP_CLIENT_ID!,
    redirectUri: process.env.CLICKUP_CALLBACK_URL!,
    scope: [''],
  },
  zapier: {
    authUrl: 'https://zapier.com/api/v4/oauth/authorize',
    clientId: process.env.ZAPIER_CLIENT_ID!,
    redirectUri: process.env.ZAPIER_CALLBACK_URL!,
    scope: [''],
  },
  make: {
    authUrl: 'https://eu1.make.com/oauth/authorize',
    clientId: process.env.MAKE_CLIENT_ID!,
    redirectUri: process.env.MAKE_CALLBACK_URL!,
    scope: [''],
  },
  monday: {
    authUrl: 'https://auth.monday.com/oauth2/authorize',
    clientId: process.env.MONDAY_CLIENT_ID!,
    redirectUri: process.env.MONDAY_CALLBACK_URL!,
    scope: ['boards:read', 'boards:write'],
  },
};

export async function GET(req: NextRequest) {
  try {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Authentication required to access account connections',
        endpoint: '/api/settings/connections'
      }, { status: 401 });
    }
    
    const user = session.user as SessionUser;
    if (!user.id) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'User ID not found in session',
        endpoint: '/api/settings/connections'
      }, { status: 401 });
    }
    
    const connRef = doc(firestore, 'connections', user.id);
  const connSnap = await getDoc(connRef);
    
  if (!connSnap.exists()) {
    await setDoc(connRef, { connections: [] });
      return NextResponse.json({ 
        connections: [],
        availableProviders: Object.keys(PROVIDER_CONFIGS)
      });
    }
    
    return NextResponse.json({ 
      connections: connSnap.data().connections,
      availableProviders: Object.keys(PROVIDER_CONFIGS)
    });
  } catch (error) {
    console.error('Error fetching connections:', error);
    return NextResponse.json({ 
      error: 'Error loading data',
      message: 'Failed to retrieve account connections',
      endpoint: '/api/settings/connections'
    }, { status: 500 });
  }
}

// Initiate OAuth flow
export async function POST(req: NextRequest) {
  try {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Authentication required to connect accounts',
        endpoint: '/api/settings/connections'
      }, { status: 401 });
    }
    
    const user = session.user as SessionUser;
    if (!user.id) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'User ID not found in session',
        endpoint: '/api/settings/connections'
      }, { status: 401 });
    }
    
    const body = await req.json();
    const provider = body.provider as string;
    
  if (!provider || !PROVIDER_CONFIGS[provider]) {
      return NextResponse.json({ 
        error: 'Invalid provider',
        message: 'The specified provider is not supported',
        endpoint: '/api/settings/connections'
      }, { status: 400 });
    }
    
    // Generate a secure state parameter to prevent CSRF
    const state = Buffer.from(JSON.stringify({
      userId: user.id,
      timestamp: Date.now()
    })).toString('base64');
    
    // Store the state in the database for verification during callback
    const stateRef = doc(firestore, 'oauth_states', state);
    await setDoc(stateRef, {
      userId: user.id,
      provider,
      timestamp: new Date().toISOString(),
      expires: new Date(Date.now() + 3600000).toISOString() // 1 hour expiration
    });
    
  const config = PROVIDER_CONFIGS[provider];
  const url = generateOAuthUrl(
    config.authUrl,
    config.clientId,
    config.redirectUri,
    state,
    config.scope
  );
    
    return NextResponse.json({ 
      url,
      provider,
      state
    });
  } catch (error) {
    console.error('Error initiating OAuth flow:', error);
    return NextResponse.json({ 
      error: 'Error loading data',
      message: 'Failed to initiate account connection',
      endpoint: '/api/settings/connections'
    }, { status: 500 });
  }
}

// OAuth callback handler
export async function PUT(req: NextRequest) {
  try {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Authentication required to complete account connection',
        endpoint: '/api/settings/connections'
      }, { status: 401 });
    }
    
    const user = session.user as SessionUser;
    if (!user.id) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'User ID not found in session',
        endpoint: '/api/settings/connections'
      }, { status: 401 });
    }
    
    const body = await req.json();
    const provider = body.provider as string;
    const code = body.code as string;
    const state = body.state as string;
    
    if (!provider || !code || !state || !PROVIDER_CONFIGS[provider]) {
      return NextResponse.json({ 
        error: 'Invalid request',
        message: 'Missing required parameters: provider, code, or state',
        endpoint: '/api/settings/connections'
      }, { status: 400 });
    }
    
    // Verify state parameter
    const stateRef = doc(firestore, 'oauth_states', state);
    const stateDoc = await getDoc(stateRef);
    
    if (!stateDoc.exists() || stateDoc.data().userId !== user.id) {
      return NextResponse.json({ 
        error: 'Invalid state',
        message: 'The OAuth state is invalid or expired',
        endpoint: '/api/settings/connections'
      }, { status: 400 });
    }
    
    // Exchange authorization code for tokens
    let tokenResponse;
    let profileData = {};
    let accountId = '';
    let accountName = '';
    
    try {
      // Implement token exchange based on the provider
      switch(provider) {
        case 'twitter':
          tokenResponse = await exchangeTwitterToken(code, PROVIDER_CONFIGS[provider].redirectUri);
          profileData = await getTwitterProfile(tokenResponse.access_token);
          accountId = (profileData as any).id;
          accountName = (profileData as any).username;
          break;
          
        case 'facebook':
          tokenResponse = await exchangeFacebookToken(code, PROVIDER_CONFIGS[provider].redirectUri);
          profileData = await getFacebookProfile(tokenResponse.access_token);
          accountId = (profileData as any).id;
          accountName = (profileData as any).name;
          break;
          
        case 'instagram':
          tokenResponse = await exchangeFacebookToken(code, PROVIDER_CONFIGS[provider].redirectUri);
          profileData = await getInstagramProfile(tokenResponse.access_token);
          accountId = (profileData as any).id;
          accountName = (profileData as any).username;
          break;
          
        case 'linkedin':
          tokenResponse = await exchangeLinkedInToken(code, PROVIDER_CONFIGS[provider].redirectUri);
          profileData = await getLinkedInProfile(tokenResponse.access_token);
          accountId = (profileData as any).id;
          accountName = (profileData as any).localizedFirstName + ' ' + (profileData as any).localizedLastName;
          break;
          
        case 'pinterest':
          tokenResponse = await exchangePinterestToken(code, PROVIDER_CONFIGS[provider].redirectUri);
          profileData = await getPinterestProfile(tokenResponse.access_token);
          accountId = (profileData as any).id;
          accountName = (profileData as any).username;
          break;
          
        case 'youtube':
        case 'google_drive':
        case 'google_analytics':
          tokenResponse = await exchangeGoogleToken(code, PROVIDER_CONFIGS[provider].redirectUri);
          profileData = await getGoogleProfile(tokenResponse.access_token);
          accountId = (profileData as any).id;
          accountName = (profileData as any).email;
          break;
          
        case 'slack':
          tokenResponse = await exchangeSlackToken(code, PROVIDER_CONFIGS[provider].redirectUri);
          profileData = await getSlackProfile(tokenResponse.access_token);
          accountId = (profileData as any).user_id;
          accountName = (profileData as any).user;
          break;
          
        // Add more cases for other providers
        default:
          // Generic OAuth2 token exchange for providers without specific implementations
          tokenResponse = await exchangeGenericToken(code, provider);
          accountId = `${provider}_${Date.now()}`;
          accountName = `${provider} Account`;
      }
      
      // Store the connection in Firestore
      const connRef = doc(firestore, 'connections', user.id);
      const connSnap = await getDoc(connRef);
      
      const newConnection: Connection = {
        provider,
        name: accountName,
        accountId,
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        tokenExpiry: tokenResponse.expires_in ? 
          new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString() : 
          undefined,
        profileData,
        status: 'active',
        addedAt: new Date().toISOString()
      };
      
      if (!connSnap.exists()) {
        await setDoc(connRef, { connections: [newConnection] });
      } else {
        await updateDoc(connRef, {
          connections: arrayUnion(newConnection)
        });
      }
      
      // Log the connection in user activity
      try {
        const userRef = doc(firestore, 'users', user.id);
        await updateDoc(userRef, {
          'activity.connections': arrayUnion({
            action: 'added',
            provider,
            name: accountName,
            timestamp: new Date().toISOString()
          })
        });
      } catch (logError) {
        console.error('Error logging connection addition:', logError);
        // Non-critical, continue
      }
      
      // Delete the state document to prevent reuse
      await deleteDoc(stateRef);
      
      return NextResponse.json({ 
        success: true, 
        message: 'Account connected successfully',
        connection: {
          provider,
          name: accountName,
          status: 'active'
        }
      });
      
    } catch (tokenError) {
      console.error('Error exchanging token:', tokenError);
      return NextResponse.json({ 
        error: 'Token exchange failed',
        message: `Failed to connect to ${provider}: ${tokenError instanceof Error ? tokenError.message : 'Unknown error'}`,
        endpoint: '/api/settings/connections'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error processing OAuth callback:', error);
    return NextResponse.json({ 
      error: 'Error loading data',
      message: 'Failed to complete account connection',
      endpoint: '/api/settings/connections'
    }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Authentication required to disconnect accounts',
        endpoint: '/api/settings/connections'
      }, { status: 401 });
    }
    
    const user = session.user as SessionUser;
    if (!user.id) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'User ID not found in session',
        endpoint: '/api/settings/connections'
      }, { status: 401 });
    }
    
  const body = await req.json();
    const provider = body.provider as string;
    const name = body.name as string;
    const accountId = body.accountId as string;
    
    if (!provider || !name) {
      return NextResponse.json({ 
        error: 'Missing fields',
        message: 'Provider and account name are required to disconnect an account',
        endpoint: '/api/settings/connections'
      }, { status: 400 });
    }
    
    const connRef = doc(firestore, 'connections', user.id);
    const connSnap = await getDoc(connRef);
    
    if (!connSnap.exists()) {
      return NextResponse.json({ 
        error: 'Not found',
        message: 'No connections found for this user',
        endpoint: '/api/settings/connections'
      }, { status: 404 });
    }
    
    // Filter the connection to remove based on provider and name
    const connections = connSnap.data().connections;
    const connectionToRemove = connections.find(
      (conn: Connection) => conn.provider === provider && conn.name === name
    );
    
    if (!connectionToRemove) {
      return NextResponse.json({ 
        error: 'Not found',
        message: 'The specified connection was not found',
        endpoint: '/api/settings/connections'
      }, { status: 404 });
    }
    
    // Remove the connection
  await updateDoc(connRef, {
      connections: arrayRemove(connectionToRemove)
    });
    
    // Log the disconnection
    try {
      const userRef = doc(firestore, 'users', user.id);
      await updateDoc(userRef, {
        'activity.connections': arrayUnion({
          action: 'removed',
          provider,
          name,
          timestamp: new Date().toISOString()
        })
      });
    } catch (logError) {
      console.error('Error logging connection removal:', logError);
      // Non-critical, continue
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Connection removed successfully'
    });
  } catch (error) {
    console.error('Error removing connection:', error);
    return NextResponse.json({ 
      error: 'Error loading data',
      message: 'Failed to remove account connection',
      endpoint: '/api/settings/connections'
    }, { status: 500 });
  }
}

// Token exchange helper functions
async function exchangeTwitterToken(code: string, redirectUri: string) {
  const clientId = process.env.TWITTER_API_KEY!;
  const clientSecret = process.env.TWITTER_API_SECRET!;
  const tokenUrl = process.env.TWITTER_TOKEN_URL || 'https://api.twitter.com/2/oauth2/token';
  
  const params = new URLSearchParams({
    code,
    grant_type: 'authorization_code',
    client_id: clientId,
    redirect_uri: redirectUri,
    code_verifier: 'challenge' // In production, use a proper PKCE code verifier
  });
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
    },
    body: params.toString()
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Twitter token exchange failed: ${error.error_description || error.error || 'Unknown error'}`);
  }
  
  return await response.json();
}

async function getTwitterProfile(accessToken: string) {
  const response = await fetch('https://api.twitter.com/2/users/me?user.fields=username,name,profile_image_url', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch Twitter profile');
  }
  
  const data = await response.json();
  return data.data;
}

async function exchangeFacebookToken(code: string, redirectUri: string) {
  const clientId = process.env.FACEBOOK_APP_ID!;
  const clientSecret = process.env.FACEBOOK_APP_SECRET!;
  const tokenUrl = 'https://graph.facebook.com/v18.0/oauth/access_token';
  
  const params = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri
  });
  
  const response = await fetch(`${tokenUrl}?${params.toString()}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Facebook token exchange failed: ${error.error.message || 'Unknown error'}`);
  }
  
  return await response.json();
}

async function getFacebookProfile(accessToken: string) {
  const response = await fetch(`https://graph.facebook.com/v18.0/me?fields=id,name,email&access_token=${accessToken}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch Facebook profile');
  }
  
  return await response.json();
}

async function getInstagramProfile(accessToken: string) {
  // First get the Instagram user ID from the Facebook token
  const accountsResponse = await fetch(`https://graph.facebook.com/v18.0/me/accounts?access_token=${accessToken}`);
  
  if (!accountsResponse.ok) {
    throw new Error('Failed to fetch Instagram account from Facebook');
  }
  
  const accounts = await accountsResponse.json();
  
  if (!accounts.data || accounts.data.length === 0) {
    throw new Error('No Facebook Pages found for Instagram connection');
  }
  
  // Get Instagram business account for the first page
  const pageId = accounts.data[0].id;
  const instagramResponse = await fetch(
    `https://graph.facebook.com/v18.0/${pageId}?fields=instagram_business_account&access_token=${accessToken}`
  );
  
  if (!instagramResponse.ok) {
    throw new Error('Failed to fetch Instagram business account');
  }
  
  const instagramAccount = await instagramResponse.json();
  
  if (!instagramAccount.instagram_business_account) {
    throw new Error('No Instagram business account found');
  }
  
  const instagramId = instagramAccount.instagram_business_account.id;
  
  // Get Instagram profile info
  const profileResponse = await fetch(
    `https://graph.facebook.com/v18.0/${instagramId}?fields=username,name&access_token=${accessToken}`
  );
  
  if (!profileResponse.ok) {
    throw new Error('Failed to fetch Instagram profile');
  }
  
  return await profileResponse.json();
}

async function exchangeLinkedInToken(code: string, redirectUri: string) {
  const clientId = process.env.LINKEDIN_CLIENT_ID!;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET!;
  const tokenUrl = 'https://www.linkedin.com/oauth/v2/accessToken';
  
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri
  });
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`LinkedIn token exchange failed: ${error}`);
  }
  
  return await response.json();
}

async function getLinkedInProfile(accessToken: string) {
  const response = await fetch('https://api.linkedin.com/v2/me', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch LinkedIn profile');
  }
  
  return await response.json();
}

async function exchangePinterestToken(code: string, redirectUri: string) {
  const clientId = process.env.PINTEREST_CLIENT_ID!;
  const clientSecret = process.env.PINTEREST_CLIENT_SECRET!;
  const tokenUrl = 'https://api.pinterest.com/v5/oauth/token';
  
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri
  });
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Pinterest token exchange failed: ${error.message || 'Unknown error'}`);
  }
  
  return await response.json();
}

async function getPinterestProfile(accessToken: string) {
  const response = await fetch('https://api.pinterest.com/v5/user_account', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch Pinterest profile');
  }
  
  return await response.json();
}

async function exchangeGoogleToken(code: string, redirectUri: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const tokenUrl = 'https://oauth2.googleapis.com/token';
  
  const params = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code'
  });
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Google token exchange failed: ${error.error_description || error.error || 'Unknown error'}`);
  }
  
  return await response.json();
}

async function getGoogleProfile(accessToken: string) {
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch Google profile');
  }
  
  return await response.json();
}

async function exchangeSlackToken(code: string, redirectUri: string) {
  const clientId = process.env.SLACK_CLIENT_ID!;
  const clientSecret = process.env.SLACK_CLIENT_SECRET!;
  const tokenUrl = 'https://slack.com/api/oauth.v2.access';
  
  const params = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri
  });
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });
  
  if (!response.ok) {
    throw new Error(`Slack token exchange failed: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  if (!data.ok) {
    throw new Error(`Slack token exchange failed: ${data.error}`);
  }
  
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in
  };
}

async function getSlackProfile(accessToken: string) {
  const response = await fetch('https://slack.com/api/users.identity', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  
  if (!response.ok) {
    throw new Error(`Slack profile fetch failed: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  if (!data.ok) {
    throw new Error(`Slack profile fetch failed: ${data.error}`);
  }
  
  return {
    user_id: data.user.id,
    user: data.user.name,
    team: data.team.name
  };
}

async function exchangeGenericToken(code: string, provider: string) {
  const config = PROVIDER_CONFIGS[provider];
  const clientId = process.env[`${provider.toUpperCase()}_CLIENT_ID`] || '';
  const clientSecret = process.env[`${provider.toUpperCase()}_CLIENT_SECRET`] || '';
  const tokenUrl = process.env[`${provider.toUpperCase()}_TOKEN_URL`] || '';
  
  if (!tokenUrl) {
    throw new Error(`Token URL not configured for provider: ${provider}`);
  }
  
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: config.redirectUri
  });
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });
  
  if (!response.ok) {
    let errorText;
    try {
      const errorJson = await response.json();
      errorText = JSON.stringify(errorJson);
    } catch (e) {
      errorText = await response.text();
    }
    throw new Error(`Token exchange failed for ${provider}: ${errorText}`);
  }
  
  return await response.json();
} 