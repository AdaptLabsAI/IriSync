import { 
  StorageProvider, 
  UploadParams, 
  FileMetadata, 
  StorageQuota,
  StorageError,
  StorageErrorType 
} from '../types';
import { Logger } from '../../logging';

interface S3Credentials {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucket: string;
  endpoint?: string; // For S3-compatible services
}

interface S3Object {
  Key: string;
  LastModified: Date;
  ETag: string;
  Size: number;
  StorageClass: string;
  Owner?: {
    DisplayName: string;
    ID: string;
  };
}

export class S3Provider implements StorageProvider {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('S3Provider');
  }

  async validateCredentials(credentials: S3Credentials): Promise<void> {
    try {
      if (!credentials.accessKeyId || !credentials.secretAccessKey || !credentials.region || !credentials.bucket) {
        throw new StorageError(
          StorageErrorType.INVALID_CREDENTIALS,
          'Missing required S3 credentials'
        );
      }

      // Test credentials by listing bucket
      await this.testConnection(credentials);
    } catch (error) {
      this.logger.error('S3 credential validation failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw new StorageError(
        StorageErrorType.INVALID_CREDENTIALS,
        'Invalid S3 credentials'
      );
    }
  }

  async testConnection(credentials: S3Credentials): Promise<boolean> {
    try {
      const endpoint = credentials.endpoint || `https://s3.${credentials.region}.amazonaws.com`;
      const url = `${endpoint}/${credentials.bucket}?list-type=2&max-keys=1`;

      const response = await fetch(url, {
        method: 'GET',
        headers: await this.getAuthHeaders(credentials, 'GET', `/${credentials.bucket}`, {
          'list-type': '2',
          'max-keys': '1'
        })
      });

      return response.ok;
    } catch (error) {
      this.logger.error('S3 connection test failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return false;
    }
  }

  async uploadFile(
    credentials: S3Credentials,
    file: File | Buffer,
    params: UploadParams
  ): Promise<FileMetadata> {
    try {
      const key = params.folder ? `${params.folder}/${params.filename}` : params.filename || 'upload';
      const endpoint = credentials.endpoint || `https://s3.${credentials.region}.amazonaws.com`;
      const url = `${endpoint}/${credentials.bucket}/${key}`;

      // Get file buffer
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

      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': contentType,
        'Content-Length': size.toString()
      };

      // Add metadata as S3 metadata headers
      if (params.metadata) {
        Object.entries(params.metadata).forEach(([key, value]) => {
          headers[`x-amz-meta-${key.toLowerCase()}`] = String(value);
        });
      }

      // Add tags if provided
      if (params.tags && params.tags.length > 0) {
        headers['x-amz-tagging'] = params.tags.map(tag => `${tag}=${tag}`).join('&');
      }

      // Add auth headers
      const authHeaders = await this.getAuthHeaders(credentials, 'PUT', `/${credentials.bucket}/${key}`, {}, headers);
      Object.assign(headers, authHeaders);

      const response = await fetch(url, {
        method: 'PUT',
        headers,
        body: buffer
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new StorageError(
          StorageErrorType.UPLOAD_FAILED,
          `S3 upload failed: ${response.status} ${errorText}`
        );
      }

      const etag = response.headers.get('ETag')?.replace(/"/g, '') || '';
      const publicUrl = `${endpoint}/${credentials.bucket}/${key}`;

      return {
        id: key,
        filename: params.filename || key.split('/').pop() || 'unknown',
        originalName: params.filename || key.split('/').pop() || 'unknown',
        url: publicUrl,
        cdnUrl: publicUrl,
        size,
        mimeType: contentType,
        fileType: this.getFileTypeFromMimeType(contentType),
        extension: this.getExtensionFromKey(key),
        createdAt: new Date(),
        modifiedAt: new Date(),
        metadata: {
          s3Key: key,
          s3Bucket: credentials.bucket,
          s3Region: credentials.region,
          etag,
          storageClass: 'STANDARD',
          ...params.metadata
        }
      };
    } catch (error) {
      this.logger.error('S3 upload failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      if (error instanceof StorageError) {
        throw error;
      }
      throw new StorageError(
        StorageErrorType.UPLOAD_FAILED,
        'Failed to upload file to S3'
      );
    }
  }

  async deleteFile(credentials: S3Credentials, fileUrl: string): Promise<void> {
    try {
      const key = this.extractKeyFromUrl(fileUrl, credentials.bucket);
      
      if (!key) {
        throw new StorageError(
          StorageErrorType.INVALID_FILE_URL,
          'Could not extract key from S3 URL'
        );
      }

      const endpoint = credentials.endpoint || `https://s3.${credentials.region}.amazonaws.com`;
      const url = `${endpoint}/${credentials.bucket}/${key}`;

      const headers = await this.getAuthHeaders(credentials, 'DELETE', `/${credentials.bucket}/${key}`);

      const response = await fetch(url, {
        method: 'DELETE',
        headers
      });

      if (!response.ok && response.status !== 404) {
        const errorText = await response.text();
        throw new StorageError(
          StorageErrorType.DELETE_FAILED,
          `S3 delete failed: ${response.status} ${errorText}`
        );
      }

      this.logger.info('File deleted from S3', { key, bucket: credentials.bucket });
    } catch (error) {
      this.logger.error('S3 delete failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      if (error instanceof StorageError) {
        throw error;
      }
      throw new StorageError(
        StorageErrorType.DELETE_FAILED,
        'Failed to delete file from S3'
      );
    }
  }

  async getQuota(credentials: S3Credentials): Promise<StorageQuota> {
    try {
      // S3 doesn't have built-in quota limits, so we calculate usage
      const usage = await this.getBucketUsage(credentials);

      return {
        total: usage.totalSize + 1000000000, // Add 1GB as placeholder quota
        used: usage.totalSize,
        remaining: Math.max(0, 1000000000 - usage.totalSize),
        unit: 'bytes',
        lastUpdated: new Date(),
        details: {
          objectCount: {
            total: usage.objectCount + 10000, // Placeholder limit
            used: usage.objectCount,
            remaining: Math.max(0, 10000 - usage.objectCount),
            unit: 'count'
          },
          storage: {
            total: 1000000000, // 1GB placeholder
            used: usage.totalSize,
            remaining: Math.max(0, 1000000000 - usage.totalSize),
            unit: 'bytes'
          }
        }
      };
    } catch (error) {
      this.logger.error('Failed to get S3 quota', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw new StorageError(
        StorageErrorType.FETCH_FAILED,
        'Failed to get S3 quota'
      );
    }
  }

  async listFiles(
    credentials: S3Credentials,
    options: {
      folder?: string;
      limit?: number;
      continuationToken?: string;
    } = {}
  ): Promise<{
    files: FileMetadata[];
    nextContinuationToken?: string;
  }> {
    try {
      const endpoint = credentials.endpoint || `https://s3.${credentials.region}.amazonaws.com`;
      const params = new URLSearchParams({
        'list-type': '2',
        'max-keys': (options.limit || 1000).toString()
      });

      if (options.folder) {
        params.append('prefix', options.folder.endsWith('/') ? options.folder : `${options.folder}/`);
      }

      if (options.continuationToken) {
        params.append('continuation-token', options.continuationToken);
      }

      const url = `${endpoint}/${credentials.bucket}?${params}`;
      const headers = await this.getAuthHeaders(credentials, 'GET', `/${credentials.bucket}`, Object.fromEntries(params));

      const response = await fetch(url, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        throw new StorageError(
          StorageErrorType.FETCH_FAILED,
          `Failed to list S3 files: ${response.status}`
        );
      }

      const xmlText = await response.text();
      const result = this.parseListObjectsResponse(xmlText);

      const files: FileMetadata[] = result.objects.map(obj => ({
        id: obj.Key,
        filename: obj.Key.split('/').pop() || 'unknown',
        originalName: obj.Key.split('/').pop() || 'unknown',
        url: `${endpoint}/${credentials.bucket}/${obj.Key}`,
        cdnUrl: `${endpoint}/${credentials.bucket}/${obj.Key}`,
        size: obj.Size,
        mimeType: this.getMimeTypeFromKey(obj.Key),
        fileType: this.getFileTypeFromKey(obj.Key),
        extension: this.getExtensionFromKey(obj.Key),
        createdAt: obj.LastModified,
        modifiedAt: obj.LastModified,
        metadata: {
          s3Key: obj.Key,
          s3Bucket: credentials.bucket,
          s3Region: credentials.region,
          etag: obj.ETag,
          storageClass: obj.StorageClass,
          lastModified: obj.LastModified.toISOString()
        }
      }));

      return {
        files,
        nextContinuationToken: result.nextContinuationToken
      };
    } catch (error) {
      this.logger.error('Failed to list S3 files', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      if (error instanceof StorageError) {
        throw error;
      }
      throw new StorageError(
        StorageErrorType.FETCH_FAILED,
        'Failed to list S3 files'
      );
    }
  }

  // Private helper methods
  private async getBucketUsage(credentials: S3Credentials): Promise<{
    totalSize: number;
    objectCount: number;
  }> {
    let totalSize = 0;
    let objectCount = 0;
    let continuationToken: string | undefined;

    do {
      const result = await this.listFiles(credentials, {
        limit: 1000,
        continuationToken
      });

      result.files.forEach(file => {
        totalSize += file.size;
        objectCount++;
      });

      continuationToken = result.nextContinuationToken;
    } while (continuationToken);

    return { totalSize, objectCount };
  }

  private async getAuthHeaders(
    credentials: S3Credentials,
    method: string,
    path: string,
    queryParams: Record<string, string> = {},
    headers: Record<string, string> = {}
  ): Promise<Record<string, string>> {
    const now = new Date();
    const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '');
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');

    const authHeaders = {
      'x-amz-date': amzDate,
      'x-amz-content-sha256': 'UNSIGNED-PAYLOAD',
      ...headers
    };

    // Create canonical request
    const canonicalHeaders = Object.keys(authHeaders)
      .sort()
      .map(key => `${key.toLowerCase()}:${authHeaders[key as keyof typeof authHeaders]}`)
      .join('\n');

    const signedHeaders = Object.keys(authHeaders)
      .sort()
      .map(key => key.toLowerCase())
      .join(';');

    const canonicalQueryString = Object.keys(queryParams)
      .sort()
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(queryParams[key])}`)
      .join('&');

    const canonicalRequest = [
      method,
      path,
      canonicalQueryString,
      canonicalHeaders,
      '',
      signedHeaders,
      'UNSIGNED-PAYLOAD'
    ].join('\n');

    // Create string to sign
    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${dateStamp}/${credentials.region}/s3/aws4_request`;
    const stringToSign = [
      algorithm,
      amzDate,
      credentialScope,
      await this.sha256(canonicalRequest)
    ].join('\n');

    // Calculate signature
    const signature = await this.calculateSignature(
      credentials.secretAccessKey,
      dateStamp,
      credentials.region,
      's3',
      stringToSign
    );

    // Create authorization header
    const authorization = `${algorithm} Credential=${credentials.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    return {
      ...authHeaders,
      'Authorization': authorization
    };
  }

  private async sha256(message: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private async hmacSha256(key: Uint8Array, message: string): Promise<Uint8Array> {
    const encoder = new TextEncoder();
    const keyObject = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', keyObject, encoder.encode(message));
    return new Uint8Array(signature);
  }

  private async calculateSignature(
    secretKey: string,
    dateStamp: string,
    region: string,
    service: string,
    stringToSign: string
  ): Promise<string> {
    const encoder = new TextEncoder();
    let key = encoder.encode(`AWS4${secretKey}`);
    
    key = await this.hmacSha256(key, dateStamp);
    key = await this.hmacSha256(key, region);
    key = await this.hmacSha256(key, service);
    key = await this.hmacSha256(key, 'aws4_request');
    
    const signature = await this.hmacSha256(key, stringToSign);
    return Array.from(signature).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private extractKeyFromUrl(url: string, bucket: string): string | null {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(part => part);
      
      // Remove bucket name if it's in the path
      if (pathParts[0] === bucket) {
        pathParts.shift();
      }
      
      return pathParts.join('/');
    } catch (error) {
      this.logger.error('Failed to extract key from URL', { url, error });
      return null;
    }
  }

  private parseListObjectsResponse(xmlText: string): {
    objects: S3Object[];
    nextContinuationToken?: string;
  } {
    const objects: S3Object[] = [];
    
    // Use a simpler approach for parsing XML
    const contentRegex = /<Contents>([\s\S]*?)<\/Contents>/g;
    let match;
    
    while ((match = contentRegex.exec(xmlText)) !== null) {
      const content = match[1];
      
      const keyMatch = content.match(/<Key>(.*?)<\/Key>/);
      const lastModifiedMatch = content.match(/<LastModified>(.*?)<\/LastModified>/);
      const etagMatch = content.match(/<ETag>(.*?)<\/ETag>/);
      const sizeMatch = content.match(/<Size>(.*?)<\/Size>/);
      const storageClassMatch = content.match(/<StorageClass>(.*?)<\/StorageClass>/);
      
      if (keyMatch && lastModifiedMatch && etagMatch && sizeMatch) {
        objects.push({
          Key: keyMatch[1],
          LastModified: new Date(lastModifiedMatch[1]),
          ETag: etagMatch[1],
          Size: parseInt(sizeMatch[1], 10),
          StorageClass: storageClassMatch?.[1] || 'STANDARD'
        });
      }
    }

    // Extract next continuation token
    const tokenMatch = xmlText.match(/<NextContinuationToken>(.*?)<\/NextContinuationToken>/);
    const nextContinuationToken = tokenMatch?.[1];

    return { objects, nextContinuationToken };
  }

  private getMimeTypeFromKey(key: string): string {
    const extension = key.split('.').pop()?.toLowerCase() || '';
    const mimeTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml',
      'pdf': 'application/pdf',
      'mp4': 'video/mp4',
      'mov': 'video/quicktime',
      'avi': 'video/x-msvideo',
      'txt': 'text/plain',
      'json': 'application/json',
      'xml': 'application/xml',
      'zip': 'application/zip'
    };

    return mimeTypes[extension] || 'application/octet-stream';
  }

  private getFileTypeFromKey(key: string): string {
    const extension = key.split('.').pop()?.toLowerCase() || '';
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(extension)) {
      return 'image';
    } else if (['mp4', 'mov', 'avi', 'webm', 'mkv'].includes(extension)) {
      return 'video';
    } else if (['mp3', 'wav', 'ogg', 'flac'].includes(extension)) {
      return 'audio';
    } else if (['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(extension)) {
      return 'document';
    } else {
      return 'other';
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

  private getExtensionFromKey(key: string): string {
    const lastDot = key.lastIndexOf('.');
    return lastDot > 0 ? key.substring(lastDot) : '';
  }
}

export default S3Provider; 