// MediaFile Model - Media file data structure and utilities
// Production-ready model following existing codebase patterns

import { Timestamp } from 'firebase/firestore';
import { 
  StoragePlatform, 
  StorageFileType, 
  FileMetadata, 
  StorageFileData,
  ProcessingOptions 
} from '../types';

/**
 * Media file interface for application use
 */
export interface MediaFile {
  id: string;
  userId: string;
  organizationId?: string;
  platform: StoragePlatform;
  platformFileId: string;
  connectionId: string;
  filename: string;
  originalName: string;
  url: string;
  publicUrl?: string;
  cdnUrl?: string;
  thumbnailUrl?: string;
  metadata: FileMetadata;
  folder?: string;
  tags: string[];
  isPublic: boolean;
  isProcessed: boolean;
  processingStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  processingError?: string;
  processingHistory: Array<{
    type: string;
    settings: ProcessingOptions;
    outputUrl?: string;
    completedAt: Date;
    success: boolean;
    error?: string;
  }>;
  downloadCount: number;
  viewCount: number;
  lastAccessed?: Date;
  expiresAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Firestore media file document structure
 */
export interface FirestoreMediaFile {
  userId: string;
  organizationId?: string;
  platform: StoragePlatform;
  platformFileId: string;
  connectionId: string;
  filename: string;
  originalName: string;
  url: string;
  publicUrl?: string;
  cdnUrl?: string;
  thumbnailUrl?: string;
  metadata: {
    filename: string;
    originalName: string;
    size: number;
    mimeType: string;
    fileType: StorageFileType;
    extension: string;
    checksum?: string;
    dimensions?: {
      width: number;
      height: number;
    };
    duration?: number;
    bitrate?: number;
    colorSpace?: string;
    exifData?: Record<string, any>;
    tags?: string[];
    description?: string;
    alt?: string;
    createdAt: Timestamp;
    modifiedAt: Timestamp;
  };
  folder?: string;
  tags: string[];
  isPublic: boolean;
  isProcessed: boolean;
  processingStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  processingError?: string;
  processingHistory: Array<{
    type: string;
    settings: Record<string, any>;
    outputUrl?: string;
    completedAt: Timestamp;
    success: boolean;
    error?: string;
  }>;
  downloadCount: number;
  viewCount: number;
  lastAccessed?: Timestamp;
  expiresAt?: Timestamp;
  isDeleted: boolean;
  deletedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Media file utilities class
 */
export class MediaFileUtils {
  /**
   * Convert Firestore document to MediaFile
   */
  static fromFirestore(data: FirestoreMediaFile, id: string): MediaFile {
    return {
      id,
      userId: data.userId,
      organizationId: data.organizationId,
      platform: data.platform,
      platformFileId: data.platformFileId,
      connectionId: data.connectionId,
      filename: data.filename,
      originalName: data.originalName,
      url: data.url,
      publicUrl: data.publicUrl,
      cdnUrl: data.cdnUrl,
      thumbnailUrl: data.thumbnailUrl,
      metadata: {
        id: data.platformFileId,
        filename: data.metadata.filename,
        originalName: data.metadata.originalName,
        url: data.url,
        size: data.metadata.size,
        mimeType: data.metadata.mimeType,
        fileType: data.metadata.fileType,
        extension: data.metadata.extension,
        checksum: data.metadata.checksum,
        dimensions: data.metadata.dimensions,
        duration: data.metadata.duration,
        bitrate: data.metadata.bitrate,
        colorSpace: data.metadata.colorSpace,
        exifData: data.metadata.exifData,
        tags: data.metadata.tags,
        description: data.metadata.description,
        alt: data.metadata.alt,
        createdAt: data.metadata.createdAt.toDate(),
        modifiedAt: data.metadata.modifiedAt.toDate()
      },
      folder: data.folder,
      tags: data.tags,
      isPublic: data.isPublic,
      isProcessed: data.isProcessed,
      processingStatus: data.processingStatus,
      processingError: data.processingError,
      processingHistory: data.processingHistory.map(item => ({
        type: item.type,
        settings: item.settings as ProcessingOptions,
        outputUrl: item.outputUrl,
        completedAt: item.completedAt.toDate(),
        success: item.success,
        error: item.error
      })),
      downloadCount: data.downloadCount,
      viewCount: data.viewCount,
      lastAccessed: data.lastAccessed?.toDate(),
      expiresAt: data.expiresAt?.toDate(),
      isDeleted: data.isDeleted,
      deletedAt: data.deletedAt?.toDate(),
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate()
    };
  }

  /**
   * Convert MediaFile to Firestore document
   */
  static toFirestore(file: StorageFileData, userId: string, connectionId: string): Omit<FirestoreMediaFile, 'createdAt' | 'updatedAt'> {
    return {
      userId,
      organizationId: undefined, // Will be set by the service
      platform: file.platform,
      platformFileId: file.platformFileId,
      connectionId,
      filename: file.metadata.filename,
      originalName: file.metadata.originalName,
      url: file.url,
      publicUrl: file.publicUrl,
      cdnUrl: file.cdnUrl,
      thumbnailUrl: file.thumbnailUrl,
      metadata: {
        filename: file.metadata.filename,
        originalName: file.metadata.originalName,
        size: file.metadata.size,
        mimeType: file.metadata.mimeType,
        fileType: file.metadata.fileType as StorageFileType,
        extension: file.metadata.extension,
        checksum: file.metadata.checksum,
        dimensions: file.metadata.dimensions,
        duration: file.metadata.duration,
        bitrate: file.metadata.bitrate,
        colorSpace: file.metadata.colorSpace,
        exifData: file.metadata.exifData,
        tags: file.metadata.tags || [],
        description: file.metadata.description,
        alt: file.metadata.alt,
        createdAt: Timestamp.fromDate(file.metadata.createdAt),
        modifiedAt: Timestamp.fromDate(file.metadata.modifiedAt)
      },
      folder: file.folder,
      tags: [],
      isPublic: file.isPublic || false,
      isProcessed: false,
      processingHistory: [],
      downloadCount: 0,
      viewCount: 0,
      isDeleted: false
    };
  }

  /**
   * Validate media file data
   */
  static validate(data: StorageFileData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields validation
    if (!data.platform) {
      errors.push('Platform is required');
    }

    if (!data.platformFileId?.trim()) {
      errors.push('Platform file ID is required');
    }

    if (!data.url?.trim()) {
      errors.push('File URL is required');
    }

    if (!data.metadata) {
      errors.push('File metadata is required');
    } else {
      // Validate metadata
      if (!data.metadata.filename?.trim()) {
        errors.push('Filename is required');
      }

      if (!data.metadata.originalName?.trim()) {
        errors.push('Original filename is required');
      }

      if (data.metadata.size <= 0) {
        errors.push('File size must be greater than 0');
      }

      if (!data.metadata.mimeType?.trim()) {
        errors.push('MIME type is required');
      }

      if (!data.metadata.fileType) {
        errors.push('File type is required');
      }

      if (!data.metadata.extension?.trim()) {
        errors.push('File extension is required');
      }

      // Validate dimensions for images
      if (data.metadata.fileType === StorageFileType.IMAGE && data.metadata.dimensions) {
        if (data.metadata.dimensions.width <= 0) {
          errors.push('Image width must be greater than 0');
        }

        if (data.metadata.dimensions.height <= 0) {
          errors.push('Image height must be greater than 0');
        }
      }

      // Validate duration for video/audio
      if ((data.metadata.fileType === StorageFileType.VIDEO || data.metadata.fileType === StorageFileType.AUDIO) && 
          data.metadata.duration !== undefined && data.metadata.duration <= 0) {
        errors.push('Duration must be greater than 0');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get file type from MIME type
   */
  static getFileTypeFromMimeType(mimeType: string): StorageFileType {
    if (mimeType.startsWith('image/')) {
      return StorageFileType.IMAGE;
    }

    if (mimeType.startsWith('video/')) {
      return StorageFileType.VIDEO;
    }

    if (mimeType.startsWith('audio/')) {
      return StorageFileType.AUDIO;
    }

    if (mimeType === 'application/pdf' || 
        mimeType.includes('document') || 
        mimeType.includes('text') ||
        mimeType.includes('spreadsheet') ||
        mimeType.includes('presentation')) {
      return StorageFileType.DOCUMENT;
    }

    if (mimeType.includes('zip') || 
        mimeType.includes('rar') || 
        mimeType.includes('tar') ||
        mimeType.includes('archive')) {
      return StorageFileType.ARCHIVE;
    }

    return StorageFileType.OTHER;
  }

  /**
   * Get file extension from filename
   */
  static getFileExtension(filename: string): string {
    const lastDotIndex = filename.lastIndexOf('.');
    if (lastDotIndex === -1 || lastDotIndex === filename.length - 1) {
      return '';
    }
    return filename.substring(lastDotIndex).toLowerCase();
  }

  /**
   * Generate safe filename
   */
  static generateSafeFilename(originalName: string, timestamp?: Date): string {
    // Remove unsafe characters and spaces
    const safeName = originalName
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_|_$/g, '');

    // Add timestamp if provided
    if (timestamp) {
      const ext = this.getFileExtension(safeName);
      const nameWithoutExt = safeName.replace(ext, '');
      const timestampStr = timestamp.toISOString().replace(/[:.]/g, '-');
      return `${nameWithoutExt}_${timestampStr}${ext}`;
    }

    return safeName;
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
   * Format duration for display
   */
  static formatDuration(seconds: number): string {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);

    if (minutes < 60) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    return `${hours}:${remainingMinutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  /**
   * Check if file is an image
   */
  static isImage(file: MediaFile): boolean {
    return file.metadata.fileType === StorageFileType.IMAGE;
  }

  /**
   * Check if file is a video
   */
  static isVideo(file: MediaFile): boolean {
    return file.metadata.fileType === StorageFileType.VIDEO;
  }

  /**
   * Check if file is audio
   */
  static isAudio(file: MediaFile): boolean {
    return file.metadata.fileType === StorageFileType.AUDIO;
  }

  /**
   * Check if file supports thumbnails
   */
  static supportsThumbnails(file: MediaFile): boolean {
    return this.isImage(file) || this.isVideo(file);
  }

  /**
   * Check if file is expired
   */
  static isExpired(file: MediaFile): boolean {
    if (!file.expiresAt) {
      return false;
    }

    return new Date() >= file.expiresAt;
  }

  /**
   * Get file display name
   */
  static getDisplayName(file: MediaFile): string {
    return file.metadata.description || file.originalName || file.filename;
  }

  /**
   * Get file icon based on type
   */
  static getFileIcon(file: MediaFile): string {
    switch (file.metadata.fileType) {
      case StorageFileType.IMAGE:
        return '🖼️';
      case StorageFileType.VIDEO:
        return '🎥';
      case StorageFileType.AUDIO:
        return '🎵';
      case StorageFileType.DOCUMENT:
        return '📄';
      case StorageFileType.ARCHIVE:
        return '📦';
      default:
        return '📁';
    }
  }

  /**
   * Calculate file processing progress
   */
  static getProcessingProgress(file: MediaFile): {
    percentage: number;
    status: string;
    message: string;
  } {
    if (!file.isProcessed && !file.processingStatus) {
      return {
        percentage: 0,
        status: 'pending',
        message: 'Processing not started'
      };
    }

    switch (file.processingStatus) {
      case 'pending':
        return {
          percentage: 10,
          status: 'pending',
          message: 'Queued for processing'
        };

      case 'processing':
        return {
          percentage: 50,
          status: 'processing',
          message: 'Processing in progress'
        };

      case 'completed':
        return {
          percentage: 100,
          status: 'completed',
          message: 'Processing completed'
        };

      case 'failed':
        return {
          percentage: 0,
          status: 'failed',
          message: file.processingError || 'Processing failed'
        };

      default:
        return {
          percentage: 0,
          status: 'unknown',
          message: 'Unknown processing status'
        };
    }
  }

  /**
   * Get file analytics summary
   */
  static getAnalyticsSummary(file: MediaFile): {
    totalViews: number;
    totalDownloads: number;
    lastAccessed: Date | null;
    popularity: 'low' | 'medium' | 'high';
  } {
    const totalViews = file.viewCount;
    const totalDownloads = file.downloadCount;
    const lastAccessed = file.lastAccessed || null;

    // Simple popularity calculation
    let popularity: 'low' | 'medium' | 'high' = 'low';
    const totalInteractions = totalViews + (totalDownloads * 5); // Weight downloads more

    if (totalInteractions > 100) {
      popularity = 'high';
    } else if (totalInteractions > 20) {
      popularity = 'medium';
    }

    return {
      totalViews,
      totalDownloads,
      lastAccessed,
      popularity
    };
  }
} 