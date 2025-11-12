import { 
  StorageProvider, 
  UploadParams, 
  FileMetadata, 
  StorageQuota,
  StorageError,
  StorageErrorType 
} from '../types';
import { Logger } from '../../logging';

interface AzureBlobCredentials {
  accountName: string;
  accountKey: string;
  containerName: string;
  endpoint?: string; // Optional custom endpoint
}

interface AzureBlobProperties {
  'Last-Modified': string;
  'Content-Length': string;
  'Content-Type': string;
  'Content-MD5'?: string;
  'ETag': string;
  'x-ms-blob-type': string;
  'x-ms-creation-time': string;
  'x-ms-lease-status': string;
  'x-ms-lease-state': string;
}

export class AzureBlobProvider implements StorageProvider {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('AzureBlobProvider');
  }

  async validateCredentials(credentials: AzureBlobCredentials): Promise<void> {
    try {
      if (!credentials.accountName || !credentials.accountKey || !credentials.containerName) {
        throw new StorageError(
          StorageErrorType.INVALID_CREDENTIALS,
          'Missing required Azure Blob Storage credentials'
        );
      }

      // Test credentials by listing container
      await this.testConnection(credentials);
    } catch (error) {
      this.logger.error('Azure Blob credential validation failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw new StorageError(
        StorageErrorType.INVALID_CREDENTIALS,
        'Invalid Azure Blob Storage credentials'
      );
    }
  }

  async testConnection(credentials: AzureBlobCredentials): Promise<boolean> {
    try {
      const endpoint = credentials.endpoint || `https://${credentials.accountName}.blob.core.windows.net`;
      const url = `${endpoint}/${credentials.containerName}?restype=container&comp=list&maxresults=1`;

      const headers = await this.getAuthHeaders(
        credentials,
        'GET',
        `/${credentials.containerName}?restype=container&comp=list&maxresults=1`
      );

      const response = await fetch(url, {
        method: 'GET',
        headers
      });

      return response.ok;
    } catch (error) {
      this.logger.error('Azure Blob connection test failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return false;
    }
  }

  async uploadFile(
    credentials: AzureBlobCredentials,
    file: File | Buffer,
    params: UploadParams
  ): Promise<FileMetadata> {
    try {
      const blobName = params.folder ? `${params.folder}/${params.filename}` : params.filename || 'upload';
      const endpoint = credentials.endpoint || `https://${credentials.accountName}.blob.core.windows.net`;
      const url = `${endpoint}/${credentials.containerName}/${blobName}`;

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

      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': contentType,
        'Content-Length': size.toString(),
        'x-ms-blob-type': 'BlockBlob'
      };

      // Add metadata as Azure metadata headers
      if (params.metadata) {
        Object.entries(params.metadata).forEach(([key, value]) => {
          headers[`x-ms-meta-${key.toLowerCase()}`] = String(value);
        });
      }

      // Add tags if provided (Azure Blob Index Tags)
      if (params.tags && params.tags.length > 0) {
        headers['x-ms-tags'] = params.tags.map(tag => `${tag}=${tag}`).join('&');
      }

      // Add auth headers
      const authHeaders = await this.getAuthHeaders(credentials, 'PUT', `/${credentials.containerName}/${blobName}`, headers);
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
          `Azure Blob upload failed: ${response.status} ${errorText}`
        );
      }

      const etag = response.headers.get('ETag')?.replace(/"/g, '') || '';
      const lastModified = response.headers.get('Last-Modified') || new Date().toISOString();
      const publicUrl = `${endpoint}/${credentials.containerName}/${blobName}`;

      return {
        id: blobName,
        filename: params.filename || blobName.split('/').pop() || 'unknown',
        originalName: params.filename || blobName.split('/').pop() || 'unknown',
        url: publicUrl,
        cdnUrl: publicUrl,
        size,
        mimeType: contentType,
        fileType: this.getFileTypeFromMimeType(contentType),
        extension: this.getExtensionFromName(blobName),
        createdAt: new Date(lastModified),
        modifiedAt: new Date(lastModified),
        metadata: {
          azureContainer: credentials.containerName,
          azureAccount: credentials.accountName,
          azureBlobName: blobName,
          etag,
          lastModified,
          blobType: 'BlockBlob',
          ...params.metadata
        }
      };
    } catch (error) {
      this.logger.error('Azure Blob upload failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      if (error instanceof StorageError) {
        throw error;
      }
      throw new StorageError(
        StorageErrorType.UPLOAD_FAILED,
        'Failed to upload file to Azure Blob Storage'
      );
    }
  }

  async deleteFile(credentials: AzureBlobCredentials, fileUrl: string): Promise<void> {
    try {
      const blobName = this.extractBlobNameFromUrl(fileUrl, credentials.containerName);
      
      if (!blobName) {
        throw new StorageError(
          StorageErrorType.INVALID_FILE_URL,
          'Could not extract blob name from Azure Blob Storage URL'
        );
      }

      const endpoint = credentials.endpoint || `https://${credentials.accountName}.blob.core.windows.net`;
      const url = `${endpoint}/${credentials.containerName}/${blobName}`;

      const headers = await this.getAuthHeaders(credentials, 'DELETE', `/${credentials.containerName}/${blobName}`);

      const response = await fetch(url, {
        method: 'DELETE',
        headers
      });

      if (!response.ok && response.status !== 404) {
        const errorText = await response.text();
        throw new StorageError(
          StorageErrorType.DELETE_FAILED,
          `Azure Blob delete failed: ${response.status} ${errorText}`
        );
      }

      this.logger.info('File deleted from Azure Blob Storage', { blobName, container: credentials.containerName });
    } catch (error) {
      this.logger.error('Azure Blob delete failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      if (error instanceof StorageError) {
        throw error;
      }
      throw new StorageError(
        StorageErrorType.DELETE_FAILED,
        'Failed to delete file from Azure Blob Storage'
      );
    }
  }

  async getQuota(credentials: AzureBlobCredentials): Promise<StorageQuota> {
    try {
      // Azure Blob Storage doesn't have built-in quota limits, so we calculate usage
      const usage = await this.getContainerUsage(credentials);

      return {
        total: usage.totalSize + 1000000000, // Add 1GB as placeholder quota
        used: usage.totalSize,
        remaining: Math.max(0, 1000000000 - usage.totalSize),
        unit: 'bytes',
        lastUpdated: new Date(),
        details: {
          blobCount: {
            total: usage.blobCount + 10000, // Placeholder limit
            used: usage.blobCount,
            remaining: Math.max(0, 10000 - usage.blobCount),
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
      this.logger.error('Failed to get Azure Blob quota', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw new StorageError(
        StorageErrorType.FETCH_FAILED,
        'Failed to get Azure Blob quota'
      );
    }
  }

  async listFiles(
    credentials: AzureBlobCredentials,
    options: {
      folder?: string;
      limit?: number;
      marker?: string;
    } = {}
  ): Promise<{
    files: FileMetadata[];
    nextMarker?: string;
  }> {
    try {
      const endpoint = credentials.endpoint || `https://${credentials.accountName}.blob.core.windows.net`;
      const params = new URLSearchParams({
        restype: 'container',
        comp: 'list',
        maxresults: (options.limit || 5000).toString()
      });

      if (options.folder) {
        params.append('prefix', options.folder.endsWith('/') ? options.folder : `${options.folder}/`);
      }

      if (options.marker) {
        params.append('marker', options.marker);
      }

      const url = `${endpoint}/${credentials.containerName}?${params}`;
      const headers = await this.getAuthHeaders(
        credentials,
        'GET',
        `/${credentials.containerName}?${params}`
      );

      const response = await fetch(url, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        throw new StorageError(
          StorageErrorType.FETCH_FAILED,
          `Failed to list Azure Blob files: ${response.status}`
        );
      }

      const xmlText = await response.text();
      const result = this.parseListBlobsResponse(xmlText);

      const files: FileMetadata[] = result.blobs.map(blob => ({
        id: blob.name,
        filename: blob.name.split('/').pop() || 'unknown',
        originalName: blob.name.split('/').pop() || 'unknown',
        url: `${endpoint}/${credentials.containerName}/${blob.name}`,
        cdnUrl: `${endpoint}/${credentials.containerName}/${blob.name}`,
        size: parseInt(blob.properties['Content-Length'], 10),
        mimeType: blob.properties['Content-Type'],
        fileType: this.getFileTypeFromMimeType(blob.properties['Content-Type']),
        extension: this.getExtensionFromName(blob.name),
        createdAt: new Date(blob.properties['x-ms-creation-time']),
        modifiedAt: new Date(blob.properties['Last-Modified']),
        metadata: {
          azureContainer: credentials.containerName,
          azureAccount: credentials.accountName,
          azureBlobName: blob.name,
          etag: blob.properties.ETag,
          contentMd5: blob.properties['Content-MD5'],
          blobType: blob.properties['x-ms-blob-type'],
          leaseStatus: blob.properties['x-ms-lease-status'],
          leaseState: blob.properties['x-ms-lease-state']
        }
      }));

      return {
        files,
        nextMarker: result.nextMarker
      };
    } catch (error) {
      this.logger.error('Failed to list Azure Blob files', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw new StorageError(
        StorageErrorType.FETCH_FAILED,
        'Failed to list Azure Blob files'
      );
    }
  }

  // Private helper methods
  private async getContainerUsage(credentials: AzureBlobCredentials): Promise<{
    totalSize: number;
    blobCount: number;
  }> {
    let totalSize = 0;
    let blobCount = 0;
    let marker: string | undefined;

    do {
      const result = await this.listFiles(credentials, {
        limit: 5000,
        marker
      });

      result.files.forEach(file => {
        totalSize += file.size;
        blobCount++;
      });

      marker = result.nextMarker;
    } while (marker);

    return { totalSize, blobCount };
  }

  private async getAuthHeaders(
    credentials: AzureBlobCredentials,
    method: string,
    path: string,
    headers: Record<string, string> = {}
  ): Promise<Record<string, string>> {
    const now = new Date();
    const dateString = now.toUTCString();

    const authHeaders = {
      'x-ms-date': dateString,
      'x-ms-version': '2020-10-02',
      ...headers
    };

    // Create string to sign
    const stringToSign = this.createStringToSign(method, path, authHeaders, credentials.accountName);

    // Calculate signature
    const signature = await this.calculateSignature(stringToSign, credentials.accountKey);

    return {
      ...authHeaders,
      'Authorization': `SharedKey ${credentials.accountName}:${signature}`
    };
  }

  private createStringToSign(
    method: string,
    path: string,
    headers: Record<string, string>,
    accountName: string
  ): string {
    // Azure Blob Storage canonical string format
    const canonicalHeaders = Object.keys(headers)
      .filter(key => key.toLowerCase().startsWith('x-ms-'))
      .sort()
      .map(key => `${key.toLowerCase()}:${headers[key]}`)
      .join('\n');

    const canonicalResource = `/${accountName}${path}`;

    return [
      method,
      headers['Content-Encoding'] || '',
      headers['Content-Language'] || '',
      headers['Content-Length'] || '',
      headers['Content-MD5'] || '',
      headers['Content-Type'] || '',
      headers['Date'] || '',
      headers['If-Modified-Since'] || '',
      headers['If-Match'] || '',
      headers['If-None-Match'] || '',
      headers['If-Unmodified-Since'] || '',
      headers['Range'] || '',
      canonicalHeaders,
      canonicalResource
    ].join('\n');
  }

  private async calculateSignature(stringToSign: string, accountKey: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = Uint8Array.from(atob(accountKey), c => c.charCodeAt(0));
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(stringToSign));
    return btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(signature))));
  }

  private extractBlobNameFromUrl(url: string, containerName: string): string | null {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(part => part);
      
      // Remove container name if it's in the path
      if (pathParts[0] === containerName) {
        pathParts.shift();
      }
      
      return pathParts.join('/');
    } catch (error) {
      this.logger.error('Failed to extract blob name from URL', { url, error });
      return null;
    }
  }

  private parseListBlobsResponse(xmlText: string): {
    blobs: Array<{
      name: string;
      properties: AzureBlobProperties;
    }>;
    nextMarker?: string;
  } {
    const blobs: Array<{
      name: string;
      properties: AzureBlobProperties;
    }> = [];
    
    // Use a simpler approach for parsing XML
    const blobRegex = /<Blob>([\s\S]*?)<\/Blob>/g;
    let match;
    
    while ((match = blobRegex.exec(xmlText)) !== null) {
      const blobContent = match[1];
      
      const nameMatch = blobContent.match(/<Name>(.*?)<\/Name>/);
      const propertiesMatch = blobContent.match(/<Properties>([\s\S]*?)<\/Properties>/);
      
      if (nameMatch && propertiesMatch) {
        const name = nameMatch[1];
        const propertiesContent = propertiesMatch[1];
        
        // Extract properties
        const lastModifiedMatch = propertiesContent.match(/<Last-Modified>(.*?)<\/Last-Modified>/);
        const contentLengthMatch = propertiesContent.match(/<Content-Length>(.*?)<\/Content-Length>/);
        const contentTypeMatch = propertiesContent.match(/<Content-Type>(.*?)<\/Content-Type>/);
        const etagMatch = propertiesContent.match(/<Etag>(.*?)<\/Etag>/);
        const blobTypeMatch = propertiesContent.match(/<BlobType>(.*?)<\/BlobType>/);
        const creationTimeMatch = propertiesContent.match(/<Creation-Time>(.*?)<\/Creation-Time>/);
        const leaseStatusMatch = propertiesContent.match(/<LeaseStatus>(.*?)<\/LeaseStatus>/);
        const leaseStateMatch = propertiesContent.match(/<LeaseState>(.*?)<\/LeaseState>/);
        
        if (lastModifiedMatch && contentLengthMatch && contentTypeMatch && etagMatch) {
          blobs.push({
            name,
            properties: {
              'Last-Modified': lastModifiedMatch[1],
              'Content-Length': contentLengthMatch[1],
              'Content-Type': contentTypeMatch[1],
              'ETag': etagMatch[1],
              'x-ms-blob-type': blobTypeMatch?.[1] || 'BlockBlob',
              'x-ms-creation-time': creationTimeMatch?.[1] || lastModifiedMatch[1],
              'x-ms-lease-status': leaseStatusMatch?.[1] || 'unlocked',
              'x-ms-lease-state': leaseStateMatch?.[1] || 'available'
            }
          });
        }
      }
    }

    // Extract next marker
    const markerMatch = xmlText.match(/<NextMarker>(.*?)<\/NextMarker>/);
    const nextMarker = markerMatch?.[1];

    return { blobs, nextMarker };
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

export default AzureBlobProvider; 