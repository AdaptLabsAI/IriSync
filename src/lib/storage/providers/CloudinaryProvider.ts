import { 
  StorageProvider, 
  UploadParams, 
  FileMetadata, 
  StorageQuota,
  StorageError,
  StorageErrorType 
} from '../types';
import { Logger } from '../../logging';

interface CloudinaryCredentials {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

interface CloudinaryUploadResponse {
  public_id: string;
  version: number;
  signature: string;
  width?: number;
  height?: number;
  format: string;
  resource_type: string;
  created_at: string;
  tags: string[];
  bytes: number;
  type: string;
  etag: string;
  placeholder: boolean;
  url: string;
  secure_url: string;
  access_mode: string;
  original_filename: string;
}

export class CloudinaryProvider implements StorageProvider {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('CloudinaryProvider');
  }

  async validateCredentials(credentials: CloudinaryCredentials): Promise<void> {
    try {
      if (!credentials.cloudName || !credentials.apiKey || !credentials.apiSecret) {
        throw new StorageError(
          StorageErrorType.INVALID_CREDENTIALS,
          'Missing required Cloudinary credentials'
        );
      }

      // Test credentials by making a simple API call
      await this.testConnection(credentials);
    } catch (error) {
      this.logger.error('Cloudinary credential validation failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw new StorageError(
        StorageErrorType.INVALID_CREDENTIALS,
        'Invalid Cloudinary credentials'
      );
    }
  }

  async testConnection(credentials: CloudinaryCredentials): Promise<boolean> {
    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${credentials.cloudName}/resources/image`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${Buffer.from(`${credentials.apiKey}:${credentials.apiSecret}`).toString('base64')}`
          }
        }
      );

      return response.ok;
    } catch (error) {
      this.logger.error('Cloudinary connection test failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return false;
    }
  }

  async uploadFile(
    credentials: CloudinaryCredentials,
    file: File | Buffer,
    params: UploadParams
  ): Promise<FileMetadata> {
    try {
      const formData = new FormData();
      
      // Add file
      if (file instanceof File) {
        formData.append('file', file);
      } else {
        const blob = new Blob([file]);
        formData.append('file', blob, params.filename || 'upload');
      }

      // Add upload parameters
      formData.append('upload_preset', 'unsigned'); // You may want to configure this
      
      if (params.folder) {
        formData.append('folder', params.folder);
      }

      if (params.tags && params.tags.length > 0) {
        formData.append('tags', params.tags.join(','));
      }

      if (params.metadata) {
        Object.entries(params.metadata).forEach(([key, value]) => {
          formData.append(`context[${key}]`, String(value));
        });
      }

      // Add transformation parameters if provided
      if (params.processing) {
        const transformations = this.buildTransformations(params.processing);
        if (transformations) {
          formData.append('transformation', transformations);
        }
      }

      // Generate signature for authenticated upload
      const timestamp = Math.round(Date.now() / 1000);
      formData.append('timestamp', timestamp.toString());
      formData.append('api_key', credentials.apiKey);

      // Create signature
      const signature = await this.generateSignature(
        {
          timestamp,
          folder: params.folder,
          tags: params.tags?.join(',')
        },
        credentials.apiSecret
      );
      formData.append('signature', signature);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${credentials.cloudName}/image/upload`,
        {
          method: 'POST',
          body: formData
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new StorageError(
          StorageErrorType.UPLOAD_FAILED,
          `Cloudinary upload failed: ${errorData.error?.message || 'Unknown error'}`
        );
      }

      const result: CloudinaryUploadResponse = await response.json();

      return {
        id: result.public_id,
        filename: result.original_filename || params.filename || 'unknown',
        originalName: result.original_filename || params.filename || 'unknown',
        url: result.secure_url,
        cdnUrl: result.secure_url,
        size: result.bytes,
        mimeType: this.getMimeTypeFromFormat(result.format),
        fileType: result.resource_type,
        extension: `.${result.format}`,
        dimensions: result.width && result.height ? {
          width: result.width,
          height: result.height
        } : undefined,
        createdAt: new Date(result.created_at),
        modifiedAt: new Date(result.created_at),
        metadata: {
          cloudinaryPublicId: result.public_id,
          version: result.version,
          format: result.format,
          resourceType: result.resource_type,
          etag: result.etag,
          tags: result.tags,
          createdAt: result.created_at
        }
      };
    } catch (error) {
      this.logger.error('Cloudinary upload failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      if (error instanceof StorageError) {
        throw error;
      }
      throw new StorageError(
        StorageErrorType.UPLOAD_FAILED,
        'Failed to upload file to Cloudinary'
      );
    }
  }

  async deleteFile(credentials: CloudinaryCredentials, fileUrl: string): Promise<void> {
    try {
      // Extract public_id from URL
      const publicId = this.extractPublicIdFromUrl(fileUrl);
      
      if (!publicId) {
        throw new StorageError(
          StorageErrorType.INVALID_FILE_URL,
          'Could not extract public ID from Cloudinary URL'
        );
      }

      const timestamp = Math.round(Date.now() / 1000);
      const signature = await this.generateSignature(
        {
          public_id: publicId,
          timestamp
        },
        credentials.apiSecret
      );

      const formData = new FormData();
      formData.append('public_id', publicId);
      formData.append('timestamp', timestamp.toString());
      formData.append('api_key', credentials.apiKey);
      formData.append('signature', signature);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${credentials.cloudName}/image/destroy`,
        {
          method: 'POST',
          body: formData
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new StorageError(
          StorageErrorType.DELETE_FAILED,
          `Cloudinary delete failed: ${errorData.error?.message || 'Unknown error'}`
        );
      }

      const result = await response.json();
      
      if (result.result !== 'ok') {
        throw new StorageError(
          StorageErrorType.DELETE_FAILED,
          `Cloudinary delete failed: ${result.result}`
        );
      }

      this.logger.info('File deleted from Cloudinary', { publicId });
    } catch (error) {
      this.logger.error('Cloudinary delete failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      if (error instanceof StorageError) {
        throw error;
      }
      throw new StorageError(
        StorageErrorType.DELETE_FAILED,
        'Failed to delete file from Cloudinary'
      );
    }
  }

  async getQuota(credentials: CloudinaryCredentials): Promise<StorageQuota> {
    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${credentials.cloudName}/usage`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${Buffer.from(`${credentials.apiKey}:${credentials.apiSecret}`).toString('base64')}`
          }
        }
      );

      if (!response.ok) {
        throw new StorageError(
          StorageErrorType.FETCH_FAILED,
          'Failed to get Cloudinary quota'
        );
      }

      const usage = await response.json();

      return {
        total: usage.plan?.credits || 0,
        used: usage.credits?.used || 0,
        remaining: Math.max(0, (usage.plan?.credits || 0) - (usage.credits?.used || 0)),
        unit: 'credits',
        lastUpdated: new Date(),
        details: {
          bandwidth: {
            total: usage.plan?.bandwidth || 0,
            used: usage.bandwidth?.used || 0,
            remaining: Math.max(0, (usage.plan?.bandwidth || 0) - (usage.bandwidth?.used || 0)),
            unit: 'bytes'
          },
          storage: {
            total: usage.plan?.storage || 0,
            used: usage.storage?.used || 0,
            remaining: Math.max(0, (usage.plan?.storage || 0) - (usage.storage?.used || 0)),
            unit: 'bytes'
          },
          transformations: {
            total: usage.plan?.transformations || 0,
            used: usage.transformations?.used || 0,
            remaining: Math.max(0, (usage.plan?.transformations || 0) - (usage.transformations?.used || 0)),
            unit: 'count'
          }
        }
      };
    } catch (error) {
      this.logger.error('Failed to get Cloudinary quota', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      if (error instanceof StorageError) {
        throw error;
      }
      throw new StorageError(
        StorageErrorType.FETCH_FAILED,
        'Failed to get Cloudinary quota'
      );
    }
  }

  async listFiles(
    credentials: CloudinaryCredentials,
    options: {
      folder?: string;
      limit?: number;
      nextCursor?: string;
    } = {}
  ): Promise<{
    files: FileMetadata[];
    nextCursor?: string;
  }> {
    try {
      const params = new URLSearchParams();
      params.append('max_results', (options.limit || 50).toString());
      
      if (options.folder) {
        params.append('prefix', options.folder);
      }
      
      if (options.nextCursor) {
        params.append('next_cursor', options.nextCursor);
      }

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${credentials.cloudName}/resources/image?${params}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${Buffer.from(`${credentials.apiKey}:${credentials.apiSecret}`).toString('base64')}`
          }
        }
      );

      if (!response.ok) {
        throw new StorageError(
          StorageErrorType.FETCH_FAILED,
          'Failed to list Cloudinary files'
        );
      }

      const result = await response.json();

      const files: FileMetadata[] = result.resources.map((resource: any) => ({
        id: resource.public_id,
        filename: resource.public_id.split('/').pop() || resource.public_id,
        url: resource.secure_url,
        cdnUrl: resource.secure_url,
        size: resource.bytes,
        mimeType: this.getMimeTypeFromFormat(resource.format),
        fileType: resource.resource_type,
        dimensions: resource.width && resource.height ? {
          width: resource.width,
          height: resource.height
        } : undefined,
        metadata: {
          cloudinaryPublicId: resource.public_id,
          version: resource.version,
          format: resource.format,
          resourceType: resource.resource_type,
          etag: resource.etag,
          tags: resource.tags || [],
          createdAt: resource.created_at
        }
      }));

      return {
        files,
        nextCursor: result.next_cursor
      };
    } catch (error) {
      this.logger.error('Failed to list Cloudinary files', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw new StorageError(
        StorageErrorType.FETCH_FAILED,
        'Failed to list Cloudinary files'
      );
    }
  }

  // Private helper methods
  private buildTransformations(processing: any): string | null {
    const transformations: string[] = [];

    if (processing.resize) {
      const { width, height, mode = 'fit' } = processing.resize;
      if (width || height) {
        let transform = '';
        if (width) transform += `w_${width}`;
        if (height) transform += (transform ? ',' : '') + `h_${height}`;
        transform += `,c_${mode}`;
        transformations.push(transform);
      }
    }

    if (processing.quality) {
      transformations.push(`q_${processing.quality}`);
    }

    if (processing.format) {
      transformations.push(`f_${processing.format}`);
    }

    if (processing.effects) {
      processing.effects.forEach((effect: any) => {
        if (effect.type === 'blur') {
          transformations.push(`e_blur:${effect.strength || 300}`);
        } else if (effect.type === 'sharpen') {
          transformations.push(`e_sharpen:${effect.strength || 100}`);
        }
      });
    }

    return transformations.length > 0 ? transformations.join('/') : null;
  }

  private async generateSignature(
    params: Record<string, any>,
    apiSecret: string
  ): Promise<string> {
    // Sort parameters
    const sortedParams = Object.keys(params)
      .filter(key => params[key] !== undefined && params[key] !== null)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');

    const stringToSign = sortedParams + apiSecret;

    // Use Web Crypto API for SHA-1 hashing
    const encoder = new TextEncoder();
    const data = encoder.encode(stringToSign);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return hashHex;
  }

  private extractPublicIdFromUrl(url: string): string | null {
    try {
      // Cloudinary URL format: https://res.cloudinary.com/{cloud_name}/{resource_type}/{type}/v{version}/{public_id}.{format}
      const urlParts = url.split('/');
      const filename = urlParts[urlParts.length - 1];
      const publicId = filename.split('.')[0];
      
      // Remove version prefix if present
      if (publicId.startsWith('v') && /^v\d+/.test(publicId)) {
        return publicId.substring(publicId.indexOf('_') + 1);
      }
      
      return publicId;
    } catch (error) {
      this.logger.error('Failed to extract public ID from URL', { url, error });
      return null;
    }
  }

  private getMimeTypeFromFormat(format: string): string {
    const mimeTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml',
      'bmp': 'image/bmp',
      'tiff': 'image/tiff',
      'ico': 'image/x-icon',
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      'mov': 'video/quicktime',
      'avi': 'video/x-msvideo',
      'pdf': 'application/pdf'
    };

    return mimeTypes[format.toLowerCase()] || 'application/octet-stream';
  }
}

export default CloudinaryProvider; 