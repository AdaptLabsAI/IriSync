// Storage Library Types
// Comprehensive type definitions for storage functionality

import { Timestamp } from 'firebase/firestore';

/**
 * Supported storage platforms
 */
export enum StoragePlatform {
  CLOUDINARY = 'cloudinary',
  AWS_S3 = 'aws_s3',
  GOOGLE_CLOUD = 'google_cloud',
  AZURE_BLOB = 'azure_blob'
}

/**
 * Storage connection status
 */
export enum StorageConnectionStatus {
  ACTIVE = 'active',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
  EXPIRED = 'expired',
  PENDING = 'pending'
}

/**
 * Storage file types
 */
export enum StorageFileType {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
  ARCHIVE = 'archive',
  OTHER = 'other'
}

/**
 * Storage error types
 */
export enum StorageErrorType {
  AUTHENTICATION_FAILED = 'authentication_failed',
  INVALID_CREDENTIALS = 'invalid_credentials',
  CONNECTION_FAILED = 'connection_failed',
  CONNECTION_NOT_FOUND = 'connection_not_found',
  PROVIDER_NOT_FOUND = 'provider_not_found',
  UPLOAD_FAILED = 'upload_failed',
  DOWNLOAD_FAILED = 'download_failed',
  DELETE_FAILED = 'delete_failed',
  UPDATE_FAILED = 'update_failed',
  FETCH_FAILED = 'fetch_failed',
  FILE_NOT_FOUND = 'file_not_found',
  INVALID_FILE_URL = 'invalid_file_url',
  PROCESSING_FAILED = 'processing_failed',
  VALIDATION_FAILED = 'validation_failed',
  QUOTA_EXCEEDED = 'quota_exceeded',
  NETWORK_ERROR = 'network_error',
  API_ERROR = 'api_error',
  RATE_LIMIT_ERROR = 'rate_limit_error',
  CONFIGURATION_ERROR = 'configuration_error'
}

/**
 * Storage operation types
 */
export enum StorageOperationType {
  UPLOAD = 'upload',
  DOWNLOAD = 'download',
  DELETE = 'delete',
  COPY = 'copy',
  MOVE = 'move',
  PROCESS = 'process',
  VALIDATE = 'validate',
  SYNC = 'sync'
}

/**
 * Media processing types
 */
export enum ProcessingType {
  RESIZE = 'resize',
  CROP = 'crop',
  COMPRESS = 'compress',
  FORMAT_CONVERT = 'format_convert',
  WATERMARK = 'watermark',
  THUMBNAIL = 'thumbnail',
  OPTIMIZE = 'optimize',
  METADATA_EXTRACT = 'metadata_extract'
}

/**
 * Storage tokens interface
 */
export interface StorageTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  tokenType?: string;
  scope?: string[];
}

/**
 * File metadata interface
 */
export interface FileMetadata {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  cdnUrl?: string;
  size: number;
  mimeType: string;
  fileType: string;
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
  createdAt: Date;
  modifiedAt: Date;
  metadata?: Record<string, any>;
}

/**
 * Storage quota interface
 */
export interface StorageQuota {
  total: number;
  used: number;
  remaining: number;
  unit: 'bytes' | 'kb' | 'mb' | 'gb' | 'tb' | 'credits' | 'count';
  lastUpdated: Date;
  details?: Record<string, {
    total: number;
    used: number;
    remaining: number;
    unit: string;
  }>;
}

/**
 * Storage usage interface
 */
export interface StorageUsage {
  totalFiles: number;
  totalSize: number;
  byFileType: Record<StorageFileType, {
    count: number;
    size: number;
  }>;
  byPlatform: Record<StoragePlatform, {
    count: number;
    size: number;
  }>;
  monthlyUsage: {
    uploads: number;
    downloads: number;
    bandwidth: number;
  };
  lastCalculated: Date;
}

/**
 * Upload parameters interface
 */
export interface UploadParams {
  filename?: string;
  folder?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  processing?: ProcessingOptions;
  overwrite?: boolean;
  makePublic?: boolean;
  generateThumbnail?: boolean;
  extractMetadata?: boolean;
  mimeType?: string;
}

/**
 * Download parameters interface
 */
export interface DownloadParams {
  fileId: string;
  transformation?: ProcessingOptions;
  format?: string;
  quality?: number;
  useCache?: boolean;
  generateSignedUrl?: boolean;
  expiresIn?: number; // seconds
}

/**
 * Processing options interface
 */
export interface ProcessingOptions {
  resize?: {
    width?: number;
    height?: number;
    fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
    position?: string;
  };
  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  compress?: {
    quality?: number;
    format?: string;
  };
  format?: string;
  watermark?: {
    text?: string;
    image?: string;
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
    opacity?: number;
  };
  filters?: {
    blur?: number;
    brightness?: number;
    contrast?: number;
    saturation?: number;
    sepia?: boolean;
    grayscale?: boolean;
  };
}

/**
 * CDN configuration interface
 */
export interface CDNConfig {
  enabled: boolean;
  domain?: string;
  cacheControl?: string;
  compression?: boolean;
  optimization?: boolean;
  secureUrls?: boolean;
  customTransformations?: Record<string, ProcessingOptions>;
}

/**
 * Cache configuration interface
 */
export interface CacheConfig {
  enabled: boolean;
  ttl: number; // seconds
  maxSize: number; // bytes
  strategy: 'lru' | 'fifo' | 'lfu';
  compression?: boolean;
}

/**
 * Validation configuration interface
 */
export interface ValidationConfig {
  maxFileSize: number; // bytes
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  scanForMalware?: boolean;
  checkDimensions?: {
    minWidth?: number;
    minHeight?: number;
    maxWidth?: number;
    maxHeight?: number;
  };
  customValidators?: Array<(file: File | Buffer, metadata: FileMetadata) => Promise<boolean>>;
}

/**
 * Storage configuration interface
 */
export interface StorageConfig {
  platform: StoragePlatform;
  credentials: Record<string, string>;
  bucket?: string;
  region?: string;
  endpoint?: string;
  cdn?: CDNConfig;
  cache?: CacheConfig;
  validation?: ValidationConfig;
  defaultFolder?: string;
  autoBackup?: boolean;
  encryption?: boolean;
}

/**
 * Storage connection data interface
 */
export interface StorageConnectionData {
  platform: StoragePlatform;
  accountName: string;
  accountEmail?: string;
  accountId: string;
  tokens: StorageTokens;
  config: StorageConfig;
  quota?: StorageQuota;
  isActive: boolean;
}

/**
 * Storage file data interface
 */
export interface StorageFileData {
  platform: StoragePlatform;
  platformFileId: string;
  url: string;
  publicUrl?: string;
  cdnUrl?: string;
  thumbnailUrl?: string;
  metadata: FileMetadata;
  folder?: string;
  isPublic: boolean;
  isProcessed: boolean;
  processingStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  processingError?: string;
}

/**
 * Storage operation result interface
 */
export interface StorageOperationResult {
  success: boolean;
  operation: StorageOperationType;
  fileId?: string;
  url?: string;
  metadata?: FileMetadata;
  error?: StorageError;
  duration: number; // milliseconds
  bytesTransferred?: number;
  processingResults?: MediaProcessingResult[];
}

/**
 * Storage sync result interface
 */
export interface StorageSyncResult {
  platform: StoragePlatform;
  filesProcessed: number;
  filesUploaded: number;
  filesUpdated: number;
  filesDeleted: number;
  filesSkipped: number;
  filesErrored: number;
  errors: Array<{
    fileId: string;
    error: string;
  }>;
  startedAt: Date;
  completedAt: Date;
  duration: number; // milliseconds
  totalBytes: number;
}

/**
 * Storage analytics interface
 */
export interface StorageAnalytics {
  totalFiles: number;
  totalSize: number;
  uploadCount: number;
  downloadCount: number;
  bandwidth: number;
  popularFiles: Array<{
    fileId: string;
    filename: string;
    downloads: number;
    views: number;
  }>;
  fileTypeDistribution: Record<StorageFileType, number>;
  platformDistribution: Record<StoragePlatform, number>;
  timeRange: {
    start: Date;
    end: Date;
  };
  generatedAt: Date;
}

/**
 * Media processing result interface
 */
export interface MediaProcessingResult {
  type: ProcessingType;
  success: boolean;
  outputUrl?: string;
  outputMetadata?: FileMetadata;
  error?: string;
  duration: number; // milliseconds
  settings: ProcessingOptions;
}

/**
 * File validation result interface
 */
export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  metadata: FileMetadata;
  securityScan?: {
    isSafe: boolean;
    threats: string[];
    scanEngine: string;
  };
}

/**
 * Storage error interface
 */
export interface StorageError {
  type: StorageErrorType;
  message: string;
  code?: string;
  platform?: StoragePlatform;
  operation?: StorageOperationType;
  fileId?: string;
  statusCode?: number;
  timestamp: Date;
  details?: Record<string, any>;
  stack?: string;
  retryable?: boolean;
}

/**
 * Storage error class
 */
export class StorageErrorClass extends Error implements StorageError {
  public readonly type: StorageErrorType;
  public readonly code?: string;
  public readonly platform?: StoragePlatform;
  public readonly operation?: StorageOperationType;
  public readonly fileId?: string;
  public readonly statusCode?: number;
  public readonly timestamp: Date;
  public readonly details?: Record<string, any>;
  public readonly retryable?: boolean;

  constructor(
    type: StorageErrorType,
    message: string,
    platform?: StoragePlatform,
    operation?: StorageOperationType,
    statusCode?: number,
    fileId?: string,
    details?: Record<string, any>,
    retryable: boolean = false,
    originalError?: Error
  ) {
    super(message);
    this.name = 'StorageError';
    this.type = type;
    this.platform = platform;
    this.operation = operation;
    this.statusCode = statusCode;
    this.fileId = fileId;
    this.timestamp = new Date();
    this.details = details;
    this.retryable = retryable;
    
    if (originalError?.stack) {
      this.stack = originalError.stack;
    }
  }
}

/**
 * API response wrapper
 */
export interface StorageApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: StorageError;
  metadata?: {
    total?: number;
    page?: number;
    limit?: number;
    hasMore?: boolean;
    lastUpdated?: Date;
    quota?: StorageQuota;
    usage?: StorageUsage;
  };
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
  cursor?: string;
}

/**
 * Search parameters
 */
export interface SearchParams {
  query?: string;
  fileType?: StorageFileType;
  platform?: StoragePlatform;
  folder?: string;
  tags?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  sizeRange?: {
    min: number;
    max: number;
  };
  sortBy?: 'name' | 'size' | 'created' | 'modified' | 'downloads';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Storage provider interface
 */
export interface StorageProvider {
  validateCredentials(credentials: any): Promise<void>;
  testConnection(credentials: any): Promise<boolean>;
  uploadFile(credentials: any, file: File | Buffer, params: UploadParams): Promise<FileMetadata>;
  deleteFile(credentials: any, fileUrl: string): Promise<void>;
  getQuota(credentials: any): Promise<StorageQuota>;
  listFiles?(credentials: any, options?: any): Promise<{
    files: FileMetadata[];
    nextCursor?: string;
    nextPageToken?: string;
    nextContinuationToken?: string;
    nextMarker?: string;
  }>;
}

/**
 * Storage connection interface for application use
 */
export interface StorageConnection {
  id: string;
  organizationId: string;
  platform: StoragePlatform;
  credentials: Record<string, any>;
  config: Record<string, any>;
  status: StorageConnectionStatus;
  displayName: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastSyncAt?: Timestamp | null;
  healthStatus: {
    isHealthy: boolean;
    lastCheckedAt: Timestamp;
    errorMessage?: string | null;
  };
  quota?: StorageQuota;
  metadata: Record<string, any>;
}

/**
 * Media file interface for application use
 */
export interface MediaFile {
  id: string;
  organizationId: string;
  connectionId: string;
  platform: StoragePlatform;
  filename: string;
  url: string;
  cdnUrl?: string;
  size: number;
  mimeType: string;
  fileType: string;
  dimensions?: {
    width: number;
    height: number;
  };
  uploadedAt: Timestamp;
  metadata: Record<string, any>;
}

/**
 * Paginated response interface
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Export the class as StorageError for use as constructor
export const StorageError = StorageErrorClass; 