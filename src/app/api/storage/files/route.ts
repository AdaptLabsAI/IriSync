import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/features/auth';
import { firestore } from '@/lib/core/firebase/client';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { logger } from '@/lib/core/logging/logger';
import { GoogleDriveAdapter } from '@/lib/features/integrations/GoogleDriveAdapter';
import { DropboxAdapter } from '@/lib/features/integrations/DropboxAdapter';
import { OneDriveAdapter } from '@/lib/features/integrations/OneDriveAdapter';
import { CanvaAdapter } from '@/lib/features/integrations/CanvaAdapter';
import { AdobeExpressAdapter } from '@/lib/features/integrations/AdobeExpressAdapter';
import { NotionAdapter } from '@/lib/features/integrations/NotionAdapter';
import { AirtableAdapter } from '@/lib/features/integrations/AirtableAdapter';

// Define supported platforms
const SUPPORTED_PLATFORMS = [
  'google-drive', 
  'dropbox', 
  'onedrive', 
  'canva', 
  'adobe-express',
  'notion',
  'airtable'
];

// Interface for the storage adapter
interface StorageAdapter {
  listFiles: (accessToken: string, folderId?: string, recursive?: boolean) => Promise<any[]>;
}

// Create adapter wrappers to handle different interfaces
const GoogleDriveAdapterWrapper: StorageAdapter = {
  listFiles: async (accessToken: string, folderId?: string, recursive?: boolean) => {
    return GoogleDriveAdapter.listFiles(accessToken, folderId);
  }
};

const DropboxAdapterWrapper: StorageAdapter = {
  listFiles: async (accessToken: string, folderId?: string, recursive?: boolean) => {
    return DropboxAdapter.listFiles(accessToken, folderId);
  }
};

const OneDriveAdapterWrapper: StorageAdapter = {
  listFiles: async (accessToken: string, folderId?: string, recursive?: boolean) => {
    return OneDriveAdapter.listFiles(accessToken, folderId);
  }
};

const CanvaAdapterWrapper: StorageAdapter = {
  listFiles: async (accessToken: string, folderId?: string, recursive?: boolean) => {
    return CanvaAdapter.listFiles(accessToken, folderId);
  }
};

const AdobeExpressAdapterWrapper: StorageAdapter = {
  listFiles: async (accessToken: string, folderId?: string, recursive?: boolean) => {
    return AdobeExpressAdapter.listFiles({ accessToken } as any, folderId || null, recursive ? 100 : 20);
  }
};

const NotionAdapterWrapper: StorageAdapter = {
  listFiles: async (accessToken: string, folderId?: string, recursive?: boolean) => {
    return NotionAdapter.listFiles({ accessToken } as any, recursive ? 100 : 20);
  }
};

const AirtableAdapterWrapper: StorageAdapter = {
  listFiles: async (accessToken: string, folderId?: string, recursive?: boolean) => {
    // If folderId contains baseId|tableId format, split it
    const [baseId, tableId] = (folderId || '').split('|');
    return AirtableAdapter.listFiles({ accessToken } as any, baseId, tableId, recursive ? 100 : 20);
  }
};

// Map of platform adapters
const PLATFORM_ADAPTERS: Record<string, StorageAdapter> = {
  'google-drive': GoogleDriveAdapterWrapper,
  'dropbox': DropboxAdapterWrapper,
  'onedrive': OneDriveAdapterWrapper,
  'canva': CanvaAdapterWrapper,
  'adobe-express': AdobeExpressAdapterWrapper,
  'notion': NotionAdapterWrapper,
  'airtable': AirtableAdapterWrapper
};

export async function POST(request: NextRequest) {
  try {
    // Get the user session with proper auth options
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { 
          error: 'Unauthorized',
          message: 'Authentication required to access storage files',
          endpoint: '/api/storage/files'
        },
        { status: 401 }
      );
    }
    
    // Get user ID from session
    const userId = (session.user as any).id || session.user.email;
    
    // Get request body for platform and folder information
    const body = await request.json();
    const { platform, folderId, recursive = false } = body;
    
    // Validate platform
    if (!platform) {
      return NextResponse.json(
        { 
          error: 'Bad Request',
          message: 'Missing required platform parameter',
          endpoint: '/api/storage/files'
        },
        { status: 400 }
      );
    }
    
    // Check if platform is supported
    if (!SUPPORTED_PLATFORMS.includes(platform)) {
      return NextResponse.json(
        { 
          error: 'Unsupported Platform',
          message: `The platform ${platform} is not supported. Supported platforms: ${SUPPORTED_PLATFORMS.join(', ')}`,
          endpoint: '/api/storage/files'
        },
        { status: 400 }
      );
    }
    
    // Get the user's storage connection for the requested platform
    const connectionRef = doc(firestore, 'storageConnections', `${userId}_${platform}`);
    const connectionSnap = await getDoc(connectionRef);
    
    if (!connectionSnap.exists()) {
      return NextResponse.json(
        { 
          error: 'Not Found',
          message: `No connection found for ${platform}. Please connect your account first.`,
          endpoint: '/api/storage/files'
        },
        { status: 404 }
      );
    }
    
    const connection = connectionSnap.data();
    const accessToken = connection.tokens.accessToken;
    
    // Check if token is expired
    if (connection.tokens.expiresAt && new Date(connection.tokens.expiresAt) < new Date()) {
      return NextResponse.json(
        { 
          error: 'Unauthorized',
          message: `Your ${platform} access token has expired. Please reconnect your account.`,
          endpoint: '/api/storage/files'
        },
        { status: 401 }
      );
    }
    
    // List files based on platform
    let files = [];
    
    try {
      const adapter = PLATFORM_ADAPTERS[platform];
      
      if (!adapter) {
        throw new Error(`Implementation missing for platform: ${platform}`);
      }
      
      files = await adapter.listFiles(accessToken, folderId, recursive);
      
      // Update lastUsed timestamp for the connection
      await updateDoc(connectionRef, {
        lastUsed: serverTimestamp()
      });
      
      // Log the successful request
      logger.info('Retrieved storage files', { 
        userId, 
        platform,
        folderCount: files.filter((f: any) => f.type === 'folder').length,
        fileCount: files.filter((f: any) => f.type !== 'folder').length
      });
      
      return NextResponse.json({ 
        files,
        metadata: {
          platform,
          timestamp: new Date().toISOString(),
          folderId: folderId || 'root'
        }
      });
    } catch (error) {
      logger.error('Error listing files from storage', { platform, error });
      
      // Determine if error is related to permission or authentication
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const status = errorMessage.includes('permission') || errorMessage.includes('access') || 
                     errorMessage.includes('auth') || errorMessage.includes('token') ? 403 : 500;
      
      return NextResponse.json(
        { 
          error: status === 403 ? 'Permission Denied' : 'Internal Server Error',
          message: `Failed to list files from ${platform}: ${errorMessage}`,
          endpoint: '/api/storage/files'
        },
        { status }
      );
    }
  } catch (error) {
    logger.error('Error retrieving storage files', { error });
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        message: `Failed to retrieve storage files: ${errorMessage}`,
        endpoint: '/api/storage/files'
      },
      { status: 500 }
    );
  }
} 