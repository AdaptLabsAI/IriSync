// Storage Library Main Export
// Centralized exports for all Storage functionality

// Types
export type {
    StoragePlatform,
    StorageConnectionStatus,
    StorageFileType,
    StorageError,
    StorageErrorType,
    StorageApiResponse,
    PaginationParams,
    SearchParams,
    UploadParams,
    DownloadParams,
    FileMetadata,
    StorageQuota,
    StorageUsage,
    ProcessingOptions,
    CDNConfig,
    CacheConfig,
    ValidationConfig,
    StorageConfig,
    StorageTokens,
    StorageConnectionData,
    StorageFileData,
    StorageOperationResult,
    StorageSyncResult,
    StorageAnalytics,
    MediaProcessingResult,
    FileValidationResult
  } from './types';
  
  // Models
  export type { 
    StorageConnection, 
    StorageConnectionUtils, 
    FirestoreStorageConnection 
  } from './models/StorageConnection';
  
  export type { 
    MediaFile, 
    MediaFileUtils, 
    FirestoreMediaFile 
  } from './models/MediaFile';
  
  // Main Service
  export { StorageService } from './StorageService';
  
  // Providers
  export { CloudinaryProvider } from './providers/CloudinaryProvider';
  export { S3Provider } from './providers/S3Provider';
  export { GoogleCloudProvider } from './providers/GoogleCloudProvider';
  export { AzureBlobProvider } from './providers/AzureBlobProvider';
  
  // Media Processing
  export { MediaProcessor } from './media/MediaProcessor';
  
  // Utilities
  export * from './utils'; 