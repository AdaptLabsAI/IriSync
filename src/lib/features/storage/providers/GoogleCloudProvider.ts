import { 
  StorageProvider, 
  UploadParams, 
  FileMetadata, 
  StorageQuota,
  StorageError,
  StorageErrorType 
} from '../types';
import { Logger } from '../../logging';

interface GoogleCloudCredentials {
  projectId: string;
  clientEmail: string;
  privateKey: string;
  bucket: string;
}

interface GoogleCloudObject {
  name: string;
  bucket: string;
  generation: string;
  metageneration: string;
  contentType: string;
  timeCreated: string;
  updated: string;
  size: string;
  md5Hash: string;
  mediaLink: string;
  selfLink: string;
  etag: string;
}

export class GoogleCloudProvider implements StorageProvider {
  private logger: Logger;
  private readonly baseUrl = 'https://storage.googleapis.com/storage/v1';
  private readonly uploadUrl = 'https://storage.googleapis.com/upload/storage/v1';

  constructor() {
    this.logger = new Logger('GoogleCloudProvider');
  }

  async validateCredentials(credentials: GoogleCloudCredentials): Promise<void> {
    try {
      if (!credentials.projectId || !credentials.clientEmail || !credentials.privateKey || !credentials.bucket) {
        throw new StorageError(
          StorageErrorType.INVALID_CREDENTIALS,
          'Missing required Google Cloud credentials'
        );
      }

      // Test credentials by listing bucket
      await this.testConnection(credentials);
    } catch (error) {
      this.logger.error('Google Cloud credential validation failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw new StorageError(
        StorageErrorType.INVALID_CREDENTIALS,
        'Invalid Google Cloud credentials'
      );
    }
  }

  async testConnection(credentials: GoogleCloudCredentials): Promise<boolean> {
    try {
      const accessToken = await this.getAccessToken(credentials);
      const response = await fetch(
        `${this.baseUrl}/b/${credentials.bucket}/o?maxResults=1`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.ok;
    } catch (error) {
      this.logger.error('Google Cloud connection test failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return false;
    }
  }

  async uploadFile(
    credentials: GoogleCloudCredentials,
    file: File | Buffer,
    params: UploadParams
  ): Promise<FileMetadata> {
    try {
      const accessToken = await this.getAccessToken(credentials);
      const objectName = params.folder ? `${params.folder}/${params.filename}` : params.filename || 'upload';

      // Get file buffer and metadata
      let buffer: Buffer;
      let contentType: string;
      let size: number;

      if (file instanceof File) {
        buffer = Buffer.from(await file.arrayBuffer());
        contentType = file.type || 'application/octet-stream';
        size = file.size;
      } else {
        buffer = file;
        contentType = params.mimeType || 'application/octet-stream';
        size = buffer.length;
      }

      // Prepare metadata
      const metadata: any = {
        name: objectName,
        contentType
      };

      if (params.metadata) {
        metadata.metadata = params.metadata;
      }

      // Upload using resumable upload
      const uploadUrl = await this.initiateResumableUpload(credentials, accessToken, metadata);
      const result = await this.uploadFileData(uploadUrl, buffer, contentType);

      const publicUrl = `https://storage.googleapis.com/${credentials.bucket}/${objectName}`;

      return {
        id: result.name,
        filename: params.filename || objectName.split('/').pop() || 'unknown',
        originalName: params.filename || objectName.split('/').pop() || 'unknown',
        url: publicUrl,
        cdnUrl: publicUrl,
        size: parseInt(result.size, 10),
        mimeType: result.contentType,
        fileType: this.getFileTypeFromMimeType(result.contentType),
        extension: this.getExtensionFromName(result.name),
        createdAt: new Date(result.timeCreated),
        modifiedAt: new Date(result.updated),
        metadata: {
          gcsBucket: result.bucket,
          gcsGeneration: result.generation,
          gcsMetageneration: result.metageneration,
          md5Hash: result.md5Hash,
          etag: result.etag,
          timeCreated: result.timeCreated,
          updated: result.updated,
          ...params.metadata
        }
      };
    } catch (error) {
      this.logger.error('Google Cloud upload failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      if (error instanceof StorageError) {
        throw error;
      }
      throw new StorageError(
        StorageErrorType.UPLOAD_FAILED,
        'Failed to upload file to Google Cloud Storage'
      );
    }
  }

  async deleteFile(credentials: GoogleCloudCredentials, fileUrl: string): Promise<void> {
    try {
      const objectName = this.extractObjectNameFromUrl(fileUrl, credentials.bucket);
      
      if (!objectName) {
        throw new StorageError(
          StorageErrorType.INVALID_FILE_URL,
          'Could not extract object name from Google Cloud Storage URL'
        );
      }

      const accessToken = await this.getAccessToken(credentials);
      const response = await fetch(
        `${this.baseUrl}/b/${credentials.bucket}/o/${encodeURIComponent(objectName)}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (!response.ok && response.status !== 404) {
        const errorData = await response.json();
        throw new StorageError(
          StorageErrorType.DELETE_FAILED,
          `Google Cloud delete failed: ${errorData.error?.message || 'Unknown error'}`
        );
      }

      this.logger.info('File deleted from Google Cloud Storage', { objectName, bucket: credentials.bucket });
    } catch (error) {
      this.logger.error('Google Cloud delete failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      if (error instanceof StorageError) {
        throw error;
      }
      throw new StorageError(
        StorageErrorType.DELETE_FAILED,
        'Failed to delete file from Google Cloud Storage'
      );
    }
  }

  async getQuota(credentials: GoogleCloudCredentials): Promise<StorageQuota> {
    try {
      const accessToken = await this.getAccessToken(credentials);
      
      // Get bucket usage
      const bucketUsage = await this.getBucketUsage(credentials, accessToken);

      return {
        total: bucketUsage.totalSize + 1000000000, // Add 1GB as placeholder quota
        used: bucketUsage.totalSize,
        remaining: Math.max(0, 1000000000 - bucketUsage.totalSize),
        unit: 'bytes',
        lastUpdated: new Date(),
        details: {
          objectCount: {
            total: bucketUsage.objectCount + 10000, // Placeholder limit
            used: bucketUsage.objectCount,
            remaining: Math.max(0, 10000 - bucketUsage.objectCount),
            unit: 'count'
          },
          storage: {
            total: 1000000000, // 1GB placeholder
            used: bucketUsage.totalSize,
            remaining: Math.max(0, 1000000000 - bucketUsage.totalSize),
            unit: 'bytes'
          }
        }
      };
    } catch (error) {
      this.logger.error('Failed to get Google Cloud quota', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw new StorageError(
        StorageErrorType.FETCH_FAILED,
        'Failed to get Google Cloud quota'
      );
    }
  }

  async listFiles(
    credentials: GoogleCloudCredentials,
    options: {
      folder?: string;
      limit?: number;
      pageToken?: string;
    } = {}
  ): Promise<{
    files: FileMetadata[];
    nextPageToken?: string;
  }> {
    try {
      const accessToken = await this.getAccessToken(credentials);
      const params = new URLSearchParams({
        maxResults: (options.limit || 1000).toString()
      });

      if (options.folder) {
        params.append('prefix', options.folder.endsWith('/') ? options.folder : `${options.folder}/`);
      }

      if (options.pageToken) {
        params.append('pageToken', options.pageToken);
      }

      const response = await fetch(
        `${this.baseUrl}/b/${credentials.bucket}/o?${params}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (!response.ok) {
        throw new StorageError(
          StorageErrorType.FETCH_FAILED,
          `Failed to list Google Cloud files: ${response.status}`
        );
      }

      const result = await response.json();

      const files: FileMetadata[] = (result.items || []).map((item: GoogleCloudObject) => ({
        id: item.name,
        filename: item.name.split('/').pop() || item.name,
        url: `https://storage.googleapis.com/${credentials.bucket}/${item.name}`,
        cdnUrl: `https://storage.googleapis.com/${credentials.bucket}/${item.name}`,
        size: parseInt(item.size, 10),
        mimeType: item.contentType,
        fileType: this.getFileTypeFromMimeType(item.contentType),
        metadata: {
          gcsBucket: item.bucket,
          gcsGeneration: item.generation,
          gcsMetageneration: item.metageneration,
          md5Hash: item.md5Hash,
          etag: item.etag,
          timeCreated: item.timeCreated,
          updated: item.updated
        }
      }));

      return {
        files,
        nextPageToken: result.nextPageToken
      };
    } catch (error) {
      this.logger.error('Failed to list Google Cloud files', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      if (error instanceof StorageError) {
        throw error;
      }
      throw new StorageError(
        StorageErrorType.FETCH_FAILED,
        'Failed to list Google Cloud files'
      );
    }
  }

  // Private helper methods
  private async getAccessToken(credentials: GoogleCloudCredentials): Promise<string> {
    try {
      const now = Math.floor(Date.now() / 1000);
      const payload = {
        iss: credentials.clientEmail,
        scope: 'https://www.googleapis.com/auth/cloud-platform',
        aud: 'https://oauth2.googleapis.com/token',
        exp: now + 3600,
        iat: now
      };

      const jwt = await this.createJWT(payload, credentials.privateKey);

      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: jwt
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to get access token: ${response.status}`);
      }

      const tokenData = await response.json();
      return tokenData.access_token;
    } catch (error) {
      this.logger.error('Failed to get Google Cloud access token', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw new StorageError(
        StorageErrorType.AUTHENTICATION_FAILED,
        'Failed to get Google Cloud access token'
      );
    }
  }

  private async createJWT(payload: any, privateKey: string): Promise<string> {
    const header = {
      alg: 'RS256',
      typ: 'JWT'
    };

    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(payload));
    const signingInput = `${encodedHeader}.${encodedPayload}`;

    // Import the private key
    const keyData = this.pemToArrayBuffer(privateKey);
    const cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      keyData,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256'
      },
      false,
      ['sign']
    );

    // Sign the data
    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      new TextEncoder().encode(signingInput)
    );

    const encodedSignature = this.base64UrlEncode(new Uint8Array(signature));
    return `${signingInput}.${encodedSignature}`;
  }

  private base64UrlEncode(data: string | Uint8Array): string {
    let base64: string;
    if (typeof data === 'string') {
      base64 = btoa(data);
    } else {
      base64 = btoa(String.fromCharCode.apply(null, Array.from(data)));
    }
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  private pemToArrayBuffer(pem: string): ArrayBuffer {
    const pemContents = pem
      .replace(/-+BEGIN PRIVATE KEY-+/, '')
      .replace(/-+END PRIVATE KEY-+/, '')
      .replace(/\s/g, '');
    
    const binaryString = atob(pemContents);
    const bytes = new Uint8Array(binaryString.length);
    
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    return bytes.buffer;
  }

  private async initiateResumableUpload(
    credentials: GoogleCloudCredentials,
    accessToken: string,
    metadata: any
  ): Promise<string> {
    const response = await fetch(
      `${this.uploadUrl}/b/${credentials.bucket}/o?uploadType=resumable`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(metadata)
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new StorageError(
        StorageErrorType.UPLOAD_FAILED,
        `Failed to initiate resumable upload: ${errorData.error?.message || 'Unknown error'}`
      );
    }

    const location = response.headers.get('Location');
    if (!location) {
      throw new StorageError(
        StorageErrorType.UPLOAD_FAILED,
        'No upload URL returned from Google Cloud Storage'
      );
    }

    return location;
  }

  private async uploadFileData(
    uploadUrl: string,
    buffer: Buffer,
    contentType: string
  ): Promise<GoogleCloudObject> {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        'Content-Length': buffer.length.toString()
      },
      body: buffer
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new StorageError(
        StorageErrorType.UPLOAD_FAILED,
        `Failed to upload file data: ${response.status} ${errorText}`
      );
    }

    return await response.json();
  }

  private async getBucketUsage(
    credentials: GoogleCloudCredentials,
    accessToken: string
  ): Promise<{
    totalSize: number;
    objectCount: number;
  }> {
    let totalSize = 0;
    let objectCount = 0;
    let pageToken: string | undefined;

    do {
      const result = await this.listFiles(credentials, {
        limit: 1000,
        pageToken
      });

      result.files.forEach(file => {
        totalSize += file.size;
        objectCount++;
      });

      pageToken = result.nextPageToken;
    } while (pageToken);

    return { totalSize, objectCount };
  }

  private extractObjectNameFromUrl(url: string, bucket: string): string | null {
    try {
      const urlObj = new URL(url);
      
      // Handle different Google Cloud Storage URL formats
      if (urlObj.hostname === 'storage.googleapis.com') {
        // Format: https://storage.googleapis.com/bucket/object
        const pathParts = urlObj.pathname.split('/').filter(part => part);
        if (pathParts[0] === bucket) {
          return pathParts.slice(1).join('/');
        }
      } else if (urlObj.hostname === `${bucket}.storage.googleapis.com`) {
        // Format: https://bucket.storage.googleapis.com/object
        return urlObj.pathname.substring(1);
      }
      
      return null;
    } catch (error) {
      this.logger.error('Failed to extract object name from URL', { url, error });
      return null;
    }
  }

  private getFileTypeFromMimeType(mimeType: string): string {
    if (mimeType.startsWith('image/')) {
      return 'image';
    } else if (mimeType.startsWith('video/')) {
      return 'video';
    } else if (mimeType.startsWith('audio/')) {
      return 'audio';
    } else if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) {
      return 'document';
    } else {
      return 'other';
    }
  }

  private getExtensionFromName(name: string): string {
    const lastDot = name.lastIndexOf('.');
    return lastDot > 0 ? name.substring(lastDot) : '';
  }
}

export default GoogleCloudProvider; 