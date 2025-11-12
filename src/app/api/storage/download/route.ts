import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { firestore } from '@/lib/core/firebase/client';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { logger } from '@/lib/core/logging/logger';
import { GoogleDriveAdapter } from '@/lib/features/integrations/GoogleDriveAdapter';
import { DropboxAdapter } from '@/lib/features/integrations/DropboxAdapter';
import { OneDriveAdapter } from '@/lib/features/integrations/OneDriveAdapter';
import { CanvaAdapter } from '@/lib/features/integrations/CanvaAdapter';
import { AdobeExpressAdapter } from '@/lib/features/integrations/AdobeExpressAdapter';
import { NotionAdapter } from '@/lib/features/integrations/NotionAdapter';
import { AirtableAdapter } from '@/lib/features/integrations/AirtableAdapter';
import { TokenRefreshService, TokenData, PlatformConfig, RefreshResult } from '@/lib/features/integrations/TokenRefreshService';

// Interface for file data returned from adapters
interface FileData {
  data: Buffer | ArrayBuffer;
  name: string;
  mimeType: string;
  viewLink?: string;
  editLink?: string;
}

// Interface for adapter download methods
interface StorageAdapterDownload {
  downloadFile: (accessToken: string, fileId: string) => Promise<FileData>;
}

// Map of platform configs for token refresh
const PLATFORM_CONFIGS: Record<string, PlatformConfig> = {
  'google-drive': {
    platform: 'google-drive',
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI,
    tokenUrl: 'https://oauth2.googleapis.com/token'
  },
  'dropbox': {
    platform: 'dropbox',
    clientId: process.env.DROPBOX_APP_KEY,
    clientSecret: process.env.DROPBOX_APP_SECRET,
    redirectUri: process.env.DROPBOX_REDIRECT_URI,
    tokenUrl: 'https://api.dropboxapi.com/oauth2/token'
  },
  'onedrive': {
    platform: 'onedrive',
    clientId: process.env.MICROSOFT_CLIENT_ID,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
    redirectUri: process.env.MICROSOFT_REDIRECT_URI,
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token'
  },
  'canva': {
    platform: 'canva',
    clientId: process.env.CANVA_CLIENT_ID,
    clientSecret: process.env.CANVA_CLIENT_SECRET,
    redirectUri: process.env.CANVA_REDIRECT_URI,
    tokenUrl: 'https://api.canva.com/v1/oauth/token'
  },
  'adobe-express': {
    platform: 'adobe-express',
    clientId: process.env.ADOBE_CLIENT_ID,
    clientSecret: process.env.ADOBE_CLIENT_SECRET,
    redirectUri: process.env.ADOBE_REDIRECT_URI,
    tokenUrl: 'https://ims-na1.adobelogin.com/ims/token/v3'
  },
  'notion': {
    platform: 'notion',
    clientId: process.env.NOTION_CLIENT_ID,
    clientSecret: process.env.NOTION_CLIENT_SECRET,
    redirectUri: process.env.NOTION_REDIRECT_URI,
    tokenUrl: 'https://api.notion.com/v1/oauth/token'
  },
  'airtable': {
    platform: 'airtable',
    clientId: process.env.AIRTABLE_CLIENT_ID,
    clientSecret: process.env.AIRTABLE_CLIENT_SECRET,
    redirectUri: process.env.AIRTABLE_REDIRECT_URI,
    tokenUrl: 'https://airtable.com/oauth2/v1/token'
  }
};

// Create adapter wrappers for handling file downloads
const StorageAdapters: Record<string, StorageAdapterDownload> = {
  'google-drive': {
    downloadFile: async (accessToken: string, fileId: string) => {
      return GoogleDriveAdapter.downloadFile(accessToken, fileId);
    }
  },
  'dropbox': {
    downloadFile: async (accessToken: string, fileId: string) => {
      return DropboxAdapter.downloadFile(accessToken, fileId);
    }
  },
  'onedrive': {
    downloadFile: async (accessToken: string, fileId: string) => {
      return OneDriveAdapter.downloadFile(accessToken, fileId);
    }
  },
  'canva': {
    downloadFile: async (accessToken: string, fileId: string) => {
      return CanvaAdapter.downloadFile(accessToken, fileId);
    }
  },
  'adobe-express': {
    downloadFile: async (accessToken: string, fileId: string) => {
      const tokenData: TokenData = {
        access_token: accessToken,
        token_type: 'Bearer'
      };
      return AdobeExpressAdapter.downloadFile(tokenData, fileId);
    }
  },
  'notion': {
    downloadFile: async (accessToken: string, fileId: string) => {
      return (NotionAdapter as any).downloadFile({ accessToken }, fileId) as Promise<FileData>;
    }
  },
  'airtable': {
    downloadFile: async (accessToken: string, fileId: string) => {
      const [recordId, attachmentId] = fileId.split('|');
      return (AirtableAdapter as any).downloadFile({ accessToken }, recordId, attachmentId) as Promise<FileData>;
    }
  }
};

/**
 * Helper function that handles token refresh for a specific platform
 */
async function refreshTokenForPlatform(
  platform: string, 
  refreshToken: string
): Promise<RefreshResult> {
  if (PLATFORM_CONFIGS[platform]) {
    return TokenRefreshService.refreshToken(
      PLATFORM_CONFIGS[platform],
      refreshToken
    );
  }
  
  return {
    success: false,
    error: `Platform configuration not found for ${platform}`
  };
}

export async function POST(request: NextRequest) {
  try {
    // Get the user session
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userId = session.user.email;
    
    // Get request body for platform and file information
    const body = await request.json();
    const { platform, fileId } = body;
    
    if (!platform || !fileId) {
      return NextResponse.json(
        { error: 'Missing required parameters: platform and fileId' },
        { status: 400 }
      );
    }
    
    // Check if platform is supported
    if (!PLATFORM_CONFIGS[platform]) {
      return NextResponse.json(
        { error: `Unsupported storage platform: ${platform}` },
        { status: 400 }
      );
    }
    
    // Get the user's storage connection for the requested platform
    const connectionRef = doc(firestore, 'storageConnections', `${userId}_${platform}`);
    const connectionSnap = await getDoc(connectionRef);
    
    if (!connectionSnap.exists()) {
      return NextResponse.json(
        { error: `No connection found for ${platform}` },
        { status: 404 }
      );
    }
    
    const connection = connectionSnap.data();
    let accessToken = connection.tokens.accessToken;
    
    // Convert connection tokens to TokenData format
    const tokenData: TokenData = {
      access_token: connection.tokens.accessToken,
      refresh_token: connection.tokens.refreshToken,
      expires_at: connection.tokens.expiresAt,
      token_type: connection.tokens.tokenType
    };
    
    // Check if token is expired or about to expire and refresh if needed
    let tokenRefreshed = false;
    if (
      connection.tokens.refreshToken && 
      connection.tokens.expiresAt && 
      TokenRefreshService.shouldRefreshToken(tokenData)
    ) {
      // Refresh the token
      const refreshResult = await refreshTokenForPlatform(
        platform,
        connection.tokens.refreshToken
      );
      
      if (refreshResult.success && refreshResult.tokens) {
        // Update the tokens in the database
        await updateDoc(connectionRef, {
          tokens: {
            accessToken: refreshResult.tokens.access_token,
            refreshToken: refreshResult.tokens.refresh_token || connection.tokens.refreshToken,
            expiresAt: refreshResult.tokens.expires_at,
            tokenType: refreshResult.tokens.token_type || connection.tokens.tokenType,
            ...refreshResult.tokens
          },
          lastRefresh: new Date().toISOString()
        });
        
        // Use the new access token
        accessToken = refreshResult.tokens.access_token;
        tokenRefreshed = true;
        
        logger.info('Refreshed access token', {
          userId,
          platform,
          tokenRefreshed: true
        });
      } else {
        logger.warn('Failed to refresh token', {
          userId,
          platform,
          error: refreshResult.error
        });
        
        // If token refresh failed, check if current token is completely expired
        if (
          connection.tokens.expiresAt && 
          new Date(connection.tokens.expiresAt) < new Date()
        ) {
          return NextResponse.json(
            { error: `Your ${platform} access token has expired and could not be refreshed. Please reconnect your account.` },
            { status: 401 }
          );
        }
        // Otherwise, continue with the current token
      }
    }
    
    // Download file based on platform
    let fileData: FileData;
    
    try {
      const adapter = StorageAdapters[platform];
      
      if (!adapter) {
        throw new Error(`Implementation missing for platform: ${platform}`);
      }
      
      fileData = await adapter.downloadFile(accessToken, fileId);
      
      // Update lastUsed timestamp
      await updateDoc(connectionRef, {
        lastUsed: new Date().toISOString()
      });
      
      // Create response with file data
      const response = new NextResponse(fileData.data);
      response.headers.set('Content-Type', fileData.mimeType);
      response.headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(fileData.name)}"`);
      
      // Add token refresh status header for debugging/monitoring
      response.headers.set('X-Token-Refreshed', tokenRefreshed.toString());
      
      // Handle special cases for platforms that don't support direct downloads
      if (fileData.viewLink || fileData.editLink) {
        const redirectUrl = fileData.viewLink || fileData.editLink || '';
        response.headers.set('X-Redirect-URL', redirectUrl);
      }
      
      // Log successful download
      logger.info('Downloaded file from storage', {
        userId,
        platform,
        fileSize: fileData.data.byteLength,
        tokenRefreshed
      });
      
      return response;
    } catch (error) {
      // Check if error is related to token expiration or invalid token
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (
        errorMessage.includes('token') || 
        errorMessage.includes('auth') || 
        errorMessage.includes('unauthorized') ||
        errorMessage.includes('expired')
      ) {
        // If we already tried to refresh the token, return error
        if (tokenRefreshed) {
          logger.error('Authentication failed after token refresh', {
            userId,
            platform,
            error: errorMessage
          });
          
          return NextResponse.json(
            { error: `Authentication failed with ${platform}. Please reconnect your account.` },
            { status: 401 }
          );
        }
        
        // Try force refreshing the token
        if (connection.tokens.refreshToken) {
          const refreshResult = await refreshTokenForPlatform(
            platform,
            connection.tokens.refreshToken
          );
          
          if (refreshResult.success && refreshResult.tokens) {
            // Update the tokens in the database
            await updateDoc(connectionRef, {
              tokens: {
                accessToken: refreshResult.tokens.access_token,
                refreshToken: refreshResult.tokens.refresh_token || connection.tokens.refreshToken,
                expiresAt: refreshResult.tokens.expires_at,
                tokenType: refreshResult.tokens.token_type || connection.tokens.tokenType,
                ...refreshResult.tokens
              },
              lastRefresh: new Date().toISOString()
            });
            
            // Try the download again with the new token
            try {
              const adapter = StorageAdapters[platform];
              if (!adapter) {
                throw new Error(`Implementation missing for platform: ${platform}`);
              }
              
              fileData = await adapter.downloadFile(refreshResult.tokens.access_token, fileId);
              
              // Create response with file data
              const response = new NextResponse(fileData.data);
              response.headers.set('Content-Type', fileData.mimeType);
              response.headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(fileData.name)}"`);
              response.headers.set('X-Token-Refreshed', 'true');
              
              if (fileData.viewLink || fileData.editLink) {
                const redirectUrl = fileData.viewLink || fileData.editLink || '';
                response.headers.set('X-Redirect-URL', redirectUrl);
              }
              
              logger.info('Downloaded file after token refresh', {
                userId,
                platform,
                fileSize: fileData.data.byteLength,
                tokenRefreshed: true
              });
              
              return response;
            } catch (secondError) {
              logger.error('Failed to download file after token refresh', {
                userId,
                platform,
                error: secondError
              });
            }
          }
        }
        
        return NextResponse.json(
          { error: `Authentication failed with ${platform}. Please reconnect your account.` },
          { status: 401 }
        );
      }
      
      logger.error('Error downloading file from storage', { platform, fileId, error });
      
      return NextResponse.json(
        { error: `Failed to download file from ${platform}: ${errorMessage}` },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error('Error downloading storage file', { error });
    
    return NextResponse.json(
      { error: 'Failed to download storage file' },
      { status: 500 }
    );
  }
} 