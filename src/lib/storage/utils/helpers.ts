// Storage Helper Utilities
// Production-ready helper functions for storage operations

import { StoragePlatform, StorageFileType, FileMetadata } from '../types';

export class StorageHelpers {
  /**
   * Generate unique filename with timestamp
   */
  static generateUniqueFilename(originalName: string, prefix?: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const extension = this.getFileExtension(originalName);
    const baseName = this.getBaseName(originalName);
    
    const prefixPart = prefix ? `${prefix}_` : '';
    return `${prefixPart}${baseName}_${timestamp}_${random}${extension}`;
  }

  /**
   * Get file extension from filename
   */
  static getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot > 0 ? filename.substring(lastDot) : '';
  }

  /**
   * Get base filename without extension
   */
  static getBaseName(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot > 0 ? filename.substring(0, lastDot) : filename;
  }

  /**
   * Sanitize filename for storage
   */
  static sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_+|_+$/g, '')
      .toLowerCase();
  }

  /**
   * Get file type from MIME type
   */
  static getFileTypeFromMimeType(mimeType: string): StorageFileType {
    if (mimeType.startsWith('image/')) return StorageFileType.IMAGE;
    if (mimeType.startsWith('video/')) return StorageFileType.VIDEO;
    if (mimeType.startsWith('audio/')) return StorageFileType.AUDIO;
    if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) {
      return StorageFileType.DOCUMENT;
    }
    if (mimeType.includes('zip') || mimeType.includes('archive') || mimeType.includes('compressed')) {
      return StorageFileType.ARCHIVE;
    }
    return StorageFileType.OTHER;
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Calculate file checksum (simple hash)
   */
  static async calculateChecksum(file: File | Buffer): Promise<string> {
    const data = file instanceof File ? await file.arrayBuffer() : file;
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Extract metadata from file
   */
  static async extractBasicMetadata(file: File | Buffer, filename: string): Promise<Partial<FileMetadata>> {
    const size = file instanceof File ? file.size : file.length;
    const mimeType = file instanceof File ? file.type : 'application/octet-stream';
    
    const metadata: Partial<FileMetadata> = {
      filename: this.sanitizeFilename(filename),
      originalName: filename,
      size,
      mimeType,
      fileType: this.getFileTypeFromMimeType(mimeType),
      extension: this.getFileExtension(filename),
      createdAt: new Date(),
      modifiedAt: new Date()
    };

    // Extract dimensions for images
    if (mimeType.startsWith('image/') && file instanceof File) {
      try {
        const dimensions = await this.getImageDimensions(file);
        metadata.dimensions = dimensions;
      } catch (error) {
        // Ignore dimension extraction errors
      }
    }

    return metadata;
  }

  /**
   * Get image dimensions
   */
  static async getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };
      
      img.src = url;
    });
  }

  /**
   * Generate CDN URL with transformations
   */
  static generateCDNUrl(
    baseUrl: string,
    platform: StoragePlatform,
    transformations?: Record<string, any>
  ): string {
    if (!transformations || Object.keys(transformations).length === 0) {
      return baseUrl;
    }

    switch (platform) {
      case StoragePlatform.CLOUDINARY:
        return this.generateCloudinaryUrl(baseUrl, transformations);
      case StoragePlatform.AWS_S3:
        return this.generateS3Url(baseUrl, transformations);
      default:
        return baseUrl;
    }
  }

  /**
   * Generate Cloudinary transformation URL
   */
  private static generateCloudinaryUrl(baseUrl: string, transformations: Record<string, any>): string {
    const transformParts: string[] = [];
    
    if (transformations.width) transformParts.push(`w_${transformations.width}`);
    if (transformations.height) transformParts.push(`h_${transformations.height}`);
    if (transformations.quality) transformParts.push(`q_${transformations.quality}`);
    if (transformations.format) transformParts.push(`f_${transformations.format}`);
    if (transformations.crop) transformParts.push(`c_${transformations.crop}`);
    
    if (transformParts.length === 0) return baseUrl;
    
    const transformString = transformParts.join(',');
    return baseUrl.replace('/upload/', `/upload/${transformString}/`);
  }

  /**
   * Generate S3 transformation URL (placeholder for future implementation)
   */
  private static generateS3Url(baseUrl: string, transformations: Record<string, any>): string {
    // S3 doesn't have built-in transformations, would need a service like Lambda@Edge
    return baseUrl;
  }

  /**
   * Parse storage URL to extract platform and file info
   */
  static parseStorageUrl(url: string): {
    platform: StoragePlatform | null;
    bucket?: string;
    key?: string;
    cloudName?: string;
    publicId?: string;
  } {
    try {
      const urlObj = new URL(url);
      
      // Cloudinary
      if (urlObj.hostname.includes('cloudinary.com')) {
        const pathParts = urlObj.pathname.split('/');
        const cloudName = pathParts[1];
        const publicId = pathParts.slice(4).join('/').replace(/\.[^/.]+$/, '');
        return {
          platform: StoragePlatform.CLOUDINARY,
          cloudName,
          publicId
        };
      }
      
      // AWS S3
      if (urlObj.hostname.includes('amazonaws.com') || urlObj.hostname.includes('s3.')) {
        const pathParts = urlObj.pathname.split('/').filter(p => p);
        const bucket = urlObj.hostname.split('.')[0];
        const key = pathParts.join('/');
        return {
          platform: StoragePlatform.AWS_S3,
          bucket,
          key
        };
      }
      
      // Google Cloud Storage
      if (urlObj.hostname.includes('googleapis.com') || urlObj.hostname.includes('storage.cloud.google.com')) {
        const pathParts = urlObj.pathname.split('/').filter(p => p);
        const bucket = pathParts[1];
        const key = pathParts.slice(2).join('/');
        return {
          platform: StoragePlatform.GOOGLE_CLOUD,
          bucket,
          key
        };
      }
      
      // Azure Blob Storage
      if (urlObj.hostname.includes('blob.core.windows.net')) {
        const pathParts = urlObj.pathname.split('/').filter(p => p);
        const bucket = pathParts[0]; // container name
        const key = pathParts.slice(1).join('/');
        return {
          platform: StoragePlatform.AZURE_BLOB,
          bucket,
          key
        };
      }
      
      return { platform: null };
    } catch (error) {
      return { platform: null };
    }
  }

  /**
   * Generate signed URL expiration timestamp
   */
  static generateExpirationTimestamp(expiresInSeconds: number): Date {
    return new Date(Date.now() + (expiresInSeconds * 1000));
  }

  /**
   * Check if URL is expired
   */
  static isUrlExpired(expirationDate: Date): boolean {
    return new Date() > expirationDate;
  }

  /**
   * Generate folder path from date
   */
  static generateDateBasedFolder(date: Date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  }

  /**
   * Validate file extension against allowed list
   */
  static isAllowedExtension(filename: string, allowedExtensions: string[]): boolean {
    const extension = this.getFileExtension(filename).toLowerCase();
    return allowedExtensions.some(allowed => 
      extension === allowed.toLowerCase() || extension === `.${allowed.toLowerCase()}`
    );
  }

  /**
   * Get MIME type from file extension
   */
  static getMimeTypeFromExtension(extension: string): string {
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.avi': 'video/avi',
      '.mov': 'video/quicktime',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.txt': 'text/plain',
      '.csv': 'text/csv',
      '.json': 'application/json',
      '.zip': 'application/zip',
      '.rar': 'application/x-rar-compressed',
      '.7z': 'application/x-7z-compressed'
    };
    
    return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
  }
} 