// Storage Service - Main orchestrator for storage operations
// Production-ready service following established patterns

import { 
  StoragePlatform, 
  StorageConnectionStatus, 
  StorageConnection, 
  MediaFile, 
  UploadParams, 
  StorageQuota, 
  PaginatedResponse,
  StorageError,
  StorageErrorType
} from './types';
import { StorageConnectionUtils } from './models/StorageConnection';
import { MediaFileUtils } from './models/MediaFile';
import { CloudinaryProvider } from './providers/CloudinaryProvider';
import { S3Provider } from './providers/S3Provider';
import { GoogleCloudProvider } from './providers/GoogleCloudProvider';
import { AzureBlobProvider } from './providers/AzureBlobProvider';
import { MediaProcessor } from './media/MediaProcessor';
import { ValidationUtils } from './utils/validation';
import { CacheManager } from './utils/cache';
import { Logger } from '../logging';
import { getFirebaseFirestore } from '../core/firebase';
import { Firestore, 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter,
  Timestamp 
} from 'firebase/firestore';

/**
 * Main Storage Service - Singleton orchestrator for all storage operations
 */
export class StorageService {
  private getFirestore() {
    const firestore = getFirebaseFirestore();
    if (!firestore) throw new Error('Firestore not configured');
    return firestore;
  }

  private static instance: StorageService;
  private providers: Map<StoragePlatform, any> = new Map();
  private mediaProcessor: MediaProcessor;
  private cacheManager: CacheManager;
  private logger: Logger;

  private constructor() {
    this.initializeProviders();
    this.mediaProcessor = new MediaProcessor();
    this.cacheManager = new CacheManager();
    this.logger = new Logger('StorageService');
  }

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  private initializeProviders(): void {
    this.providers.set(StoragePlatform.CLOUDINARY, new CloudinaryProvider());
    this.providers.set(StoragePlatform.AWS_S3, new S3Provider());
    this.providers.set(StoragePlatform.GOOGLE_CLOUD, new GoogleCloudProvider());
    this.providers.set(StoragePlatform.AZURE_BLOB, new AzureBlobProvider());
  }

  /**
   * Create a new storage connection
   */
  async createConnection(
    organizationId: string,
    platform: StoragePlatform,
    credentials: Record<string, any>,
    config?: Record<string, any>
  ): Promise<StorageConnection> {
    try {
      this.logger.info('Creating storage connection', { platform, organizationId });

      // Validate provider exists
      const provider = this.providers.get(platform);
      if (!provider) {
        throw new StorageError(
          StorageErrorType.PROVIDER_NOT_FOUND,
          `Provider not found for platform: ${platform}`
        );
      }

      // Test connection
      await provider.validateCredentials(credentials);
      const isHealthy = await provider.testConnection(credentials);
      if (!isHealthy) {
        throw new StorageError(
          StorageErrorType.CONNECTION_FAILED,
          'Failed to establish connection with storage provider'
        );
      }

      // Create connection document
      const connectionData = {
        organizationId,
        platform,
        credentials: await this.encryptCredentials(credentials),
        config: config || StorageConnectionUtils.getDefaultConfig(platform),
        status: StorageConnectionStatus.ACTIVE,
        displayName: this.getDisplayName(platform, credentials),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        lastSyncAt: null,
        healthStatus: {
          isHealthy: true,
          lastCheckedAt: Timestamp.now(),
          errorMessage: null
        },
        metadata: {}
      };

      const docRef = await addDoc(collection(this.getFirestore(), 'storageConnections'), connectionData);
      
      // Get the created document
      const docSnap = await getDoc(docRef);
      const data = docSnap.data()!;
      
      const connection: StorageConnection = {
        id: docRef.id,
        organizationId: data.organizationId,
        platform: data.platform,
        credentials: await this.decryptCredentials(data.credentials),
        config: data.config,
        status: data.status,
        displayName: data.displayName,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        lastSyncAt: data.lastSyncAt,
        healthStatus: data.healthStatus,
        quota: data.quota,
        metadata: data.metadata
      };

      this.logger.info('Storage connection created successfully', { connectionId: docRef.id });
      return connection;
    } catch (error) {
      this.logger.error('Failed to create storage connection', { error: error instanceof Error ? error.message : 'Unknown error' });
      if (error instanceof StorageError) {
        throw error;
      }
      throw new StorageError(
        StorageErrorType.CONNECTION_FAILED,
        'Failed to create storage connection'
      );
    }
  }

  /**
   * Get all storage connections for an organization
   */
  async getConnections(organizationId: string): Promise<StorageConnection[]> {
    try {
      const q = query(
        collection(this.getFirestore(), 'storageConnections'),
        where('organizationId', '==', organizationId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      const connections: StorageConnection[] = [];

      for (const doc of snapshot.docs) {
        const data = doc.data();
        const connection: StorageConnection = {
          id: doc.id,
          organizationId: data.organizationId,
          platform: data.platform,
          credentials: await this.decryptCredentials(data.credentials),
          config: data.config,
          status: data.status,
          displayName: data.displayName,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          lastSyncAt: data.lastSyncAt,
          healthStatus: data.healthStatus,
          quota: data.quota,
          metadata: data.metadata
        };
        connections.push(connection);
      }

      return connections;
    } catch (error) {
      this.logger.error('Failed to get storage connections', { error: error instanceof Error ? error.message : 'Unknown error' });
      throw new StorageError(
        StorageErrorType.FETCH_FAILED,
        'Failed to retrieve storage connections'
      );
    }
  }

  /**
   * Update a storage connection
   */
  async updateConnection(
    connectionId: string,
    updates: Partial<StorageConnection>
  ): Promise<StorageConnection> {
    try {
      const docRef = doc(this.getFirestore(), 'storageConnections', connectionId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new StorageError(
          StorageErrorType.CONNECTION_NOT_FOUND,
          'Storage connection not found'
        );
      }

      const updateData: any = {
        ...updates,
        updatedAt: Timestamp.now()
      };

      if (updates.config && 'credentials' in updates.config) {
        updateData.credentials = await this.encryptCredentials(updates.config.credentials);
      }

      await updateDoc(docRef, updateData);

      const updatedDoc = await getDoc(docRef);
      const data = updatedDoc.data()!;

      return {
        id: connectionId,
        organizationId: data.organizationId,
        platform: data.platform,
        credentials: await this.decryptCredentials(data.credentials),
        config: data.config,
        status: data.status,
        displayName: data.displayName,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        lastSyncAt: data.lastSyncAt,
        healthStatus: data.healthStatus,
        quota: data.quota,
        metadata: data.metadata
      };
    } catch (error) {
      this.logger.error('Failed to update storage connection', { error: error instanceof Error ? error.message : 'Unknown error' });
      if (error instanceof StorageError) {
        throw error;
      }
      throw new StorageError(
        StorageErrorType.UPDATE_FAILED,
        'Failed to update storage connection'
      );
    }
  }

  /**
   * Delete a storage connection
   */
  async deleteConnection(connectionId: string): Promise<void> {
    try {
      await deleteDoc(doc(this.getFirestore(), 'storageConnections', connectionId));
      this.logger.info('Storage connection deleted', { connectionId });
    } catch (error) {
      this.logger.error('Failed to delete storage connection', { error: error instanceof Error ? error.message : 'Unknown error' });
      throw new StorageError(
        StorageErrorType.DELETE_FAILED,
        'Failed to delete storage connection'
      );
    }
  }

  /**
   * Upload a file to storage
   */
  async uploadFile(
    connectionId: string,
    file: File | Buffer,
    params: UploadParams
  ): Promise<MediaFile> {
    try {
      this.logger.info('Starting file upload', { connectionId, filename: params.filename });

      const connection = await this.getConnectionById(connectionId);
      const provider = this.providers.get(connection.platform);

      if (!provider) {
        throw new StorageError(
          StorageErrorType.PROVIDER_NOT_FOUND,
          `Provider not found for platform: ${connection.platform}`
        );
      }

      // Process file if needed
      let processedFile = file;
      if (params.processing) {
        processedFile = await this.mediaProcessor.processFile(file, params.processing);
      }

      // Upload to provider
      const credentials = await this.decryptCredentials(connection.config.credentials);
      const metadata = await provider.uploadFile(credentials, processedFile, params);

      // Create media file record
      const mediaFileData = {
        organizationId: connection.organizationId,
        connectionId,
        platform: connection.platform,
        filename: metadata.filename,
        url: metadata.url,
        size: metadata.size,
        mimeType: metadata.mimeType,
        fileType: ValidationUtils.getFileTypeFromMimeType(metadata.mimeType),
        uploadedAt: Timestamp.now(),
        metadata: metadata.metadata || {}
      };

      const docRef = await addDoc(collection(this.getFirestore(), 'mediaFiles'), mediaFileData);
      const docSnap = await getDoc(docRef);
      const data = docSnap.data()!;

      const mediaFile: MediaFile = {
        id: docRef.id,
        organizationId: data.organizationId,
        connectionId: data.connectionId,
        platform: data.platform,
        filename: data.filename,
        url: data.url,
        cdnUrl: data.cdnUrl,
        size: data.size,
        mimeType: data.mimeType,
        fileType: data.fileType,
        dimensions: data.dimensions,
        uploadedAt: data.uploadedAt,
        metadata: data.metadata
      };

      this.logger.info('File uploaded successfully', { fileId: docRef.id, url: metadata.url });
      return mediaFile;
    } catch (error) {
      this.logger.error('Failed to upload file', { error: error instanceof Error ? error.message : 'Unknown error' });
      if (error instanceof StorageError) {
        throw error;
      }
      throw new StorageError(
        StorageErrorType.UPLOAD_FAILED,
        'Failed to upload file'
      );
    }
  }

  /**
   * Get files with pagination and filtering
   */
  async getFiles(
    organizationId: string,
    options: {
      connectionId?: string;
      platform?: StoragePlatform;
      fileType?: string;
      limit?: number;
      offset?: number;
      search?: string;
    } = {}
  ): Promise<PaginatedResponse<MediaFile>> {
    try {
      const { limit: pageLimit = 20, offset = 0 } = options;
      
      let q = query(
        collection(this.getFirestore(), 'mediaFiles'),
        where('organizationId', '==', organizationId),
        orderBy('uploadedAt', 'desc')
      );

      if (options.connectionId) {
        q = query(q, where('connectionId', '==', options.connectionId));
      }

      if (options.platform) {
        q = query(q, where('platform', '==', options.platform));
      }

      if (options.fileType) {
        q = query(q, where('fileType', '==', options.fileType));
      }

      // Apply pagination
      q = query(q, limit(pageLimit + 1)); // Get one extra to check if there's more

      const snapshot = await getDocs(q);
      const files: MediaFile[] = [];

      snapshot.docs.slice(0, pageLimit).forEach(doc => {
        const data = doc.data();
        files.push({
          id: doc.id,
          organizationId: data.organizationId,
          connectionId: data.connectionId,
          platform: data.platform,
          filename: data.filename,
          url: data.url,
          cdnUrl: data.cdnUrl,
          size: data.size,
          mimeType: data.mimeType,
          fileType: data.fileType,
          dimensions: data.dimensions,
          uploadedAt: data.uploadedAt,
          metadata: data.metadata
        });
      });

      const hasNext = snapshot.docs.length > pageLimit;
      const page = Math.floor(offset / pageLimit) + 1;
      const totalPages = Math.ceil((offset + files.length + (hasNext ? 1 : 0)) / pageLimit);

      return {
        data: files,
        total: offset + files.length + (hasNext ? 1 : 0), // Approximate total
        page,
        totalPages,
        hasNext,
        hasPrev: offset > 0
      };
    } catch (error) {
      this.logger.error('Failed to get files', { error: error instanceof Error ? error.message : 'Unknown error' });
      throw new StorageError(
        StorageErrorType.FETCH_FAILED,
        'Failed to retrieve files'
      );
    }
  }

  /**
   * Delete a file
   */
  async deleteFile(fileId: string): Promise<void> {
    try {
      const docRef = doc(this.getFirestore(), 'mediaFiles', fileId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new StorageError(
          StorageErrorType.FILE_NOT_FOUND,
          'File not found'
        );
      }

      const data = docSnap.data();
      const connection = await this.getConnectionById(data.connectionId);
      const provider = this.providers.get(connection.platform);

      if (provider && provider.deleteFile) {
        const credentials = await this.decryptCredentials(connection.config.credentials);
        await provider.deleteFile(credentials, data.url);
      }

      await deleteDoc(docRef);
      this.logger.info('File deleted successfully', { fileId });
    } catch (error) {
      this.logger.error('Failed to delete file', { error: error instanceof Error ? error.message : 'Unknown error' });
      if (error instanceof StorageError) {
        throw error;
      }
      throw new StorageError(
        StorageErrorType.DELETE_FAILED,
        'Failed to delete file'
      );
    }
  }

  /**
   * Get storage quota for a connection
   */
  async getStorageQuota(connectionId: string): Promise<StorageQuota> {
    try {
      const connection = await this.getConnectionById(connectionId);
      const provider = this.providers.get(connection.platform);

      if (!provider) {
        throw new StorageError(
          StorageErrorType.PROVIDER_NOT_FOUND,
          `Provider not found for platform: ${connection.platform}`
        );
      }

      const credentials = await this.decryptCredentials(connection.config.credentials);
      return await provider.getQuota(credentials);
    } catch (error) {
      this.logger.error('Failed to get storage quota', { error: error instanceof Error ? error.message : 'Unknown error' });
      throw new StorageError(
        StorageErrorType.FETCH_FAILED,
        'Failed to retrieve storage quota'
      );
    }
  }

  /**
   * Get storage analytics
   */
  async getStorageAnalytics(
    organizationId: string,
    timeRange: { start: Date; end: Date }
  ): Promise<{
    totalFiles: number;
    totalSize: number;
    filesByType: Record<string, number>;
    uploadsByDay: Array<{ date: string; count: number; size: number }>;
    platformDistribution: Record<StoragePlatform, number>;
  }> {
    try {
      const cacheKey = `storage_analytics_${organizationId}_${timeRange.start.getTime()}_${timeRange.end.getTime()}`;
      const cached = await this.cacheManager.get(cacheKey);
      if (cached) {
        return cached as {
          totalFiles: number;
          totalSize: number;
          filesByType: Record<string, number>;
          uploadsByDay: Array<{ date: string; count: number; size: number }>;
          platformDistribution: Record<StoragePlatform, number>;
        };
      }

      const q = query(
        collection(this.getFirestore(), 'mediaFiles'),
        where('organizationId', '==', organizationId),
        where('uploadedAt', '>=', Timestamp.fromDate(timeRange.start)),
        where('uploadedAt', '<=', Timestamp.fromDate(timeRange.end))
      );

      const snapshot = await getDocs(q);
      const files: any[] = [];

      snapshot.forEach(doc => {
        files.push(doc.data());
      });

      const analytics = {
        totalFiles: files.length,
        totalSize: files.reduce((sum, file) => sum + (file.size || 0), 0),
        filesByType: {} as Record<string, number>,
        uploadsByDay: [] as Array<{ date: string; count: number; size: number }>,
        platformDistribution: {} as Record<StoragePlatform, number>
      };

      // Calculate file type distribution
      files.forEach(file => {
        const type = file.fileType;
        analytics.filesByType[type] = (analytics.filesByType[type] || 0) + 1;
      });

      // Calculate platform distribution
      files.forEach(file => {
        const platform = file.platform as StoragePlatform;
        analytics.platformDistribution[platform] = (analytics.platformDistribution[platform] || 0) + 1;
      });

      // Calculate daily uploads
      const dailyUploads = new Map<string, { count: number; size: number }>();
      files.forEach(file => {
        const date = file.uploadedAt.toDate().toISOString().split('T')[0];
        const existing = dailyUploads.get(date) || { count: 0, size: 0 };
        dailyUploads.set(date, {
          count: existing.count + 1,
          size: existing.size + (file.size || 0)
        });
      });

      analytics.uploadsByDay = Array.from(dailyUploads.entries()).map(([date, data]) => ({
        date,
        count: data.count,
        size: data.size
      }));

      // Cache for 1 hour
      await this.cacheManager.set(cacheKey, analytics, 3600);

      return analytics;
    } catch (error) {
      this.logger.error('Failed to get storage analytics', { error: error instanceof Error ? error.message : 'Unknown error' });
      throw new StorageError(
        StorageErrorType.FETCH_FAILED,
        'Failed to retrieve storage analytics'
      );
    }
  }

  /**
   * Check connection health
   */
  async checkConnectionHealth(connectionId: string): Promise<boolean> {
    try {
      const connection = await this.getConnectionById(connectionId);
      const provider = this.providers.get(connection.platform);

      if (!provider) {
        return false;
      }

      const credentials = await this.decryptCredentials(connection.config.credentials);
      const isHealthy = await provider.testConnection(credentials);

      // Update health status
      await updateDoc(doc(this.getFirestore(), 'storageConnections', connectionId), {
        'healthStatus.isHealthy': isHealthy,
        'healthStatus.lastCheckedAt': Timestamp.now(),
        'healthStatus.errorMessage': isHealthy ? null : 'Connection test failed'
      });

      return isHealthy;
    } catch (error) {
      this.logger.error('Failed to check connection health', { error: error instanceof Error ? error.message : 'Unknown error' });
      return false;
    }
  }

  /**
   * Get connection by ID
   */
  private async getConnectionById(connectionId: string): Promise<StorageConnection> {
    const docRef = doc(this.getFirestore(), 'storageConnections', connectionId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new StorageError(
        StorageErrorType.CONNECTION_NOT_FOUND,
        'Storage connection not found'
      );
    }

    const data = docSnap.data();
    return {
      id: connectionId,
      organizationId: data.organizationId,
      platform: data.platform,
      credentials: await this.decryptCredentials(data.credentials),
      config: data.config,
      status: data.status,
      displayName: data.displayName,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      lastSyncAt: data.lastSyncAt,
      healthStatus: data.healthStatus,
      quota: data.quota,
      metadata: data.metadata
    };
  }

  /**
   * Encrypt credentials for storage
   */
  private async encryptCredentials(credentials: Record<string, any>): Promise<string> {
    // In production, implement proper encryption
    return JSON.stringify(credentials);
  }

  /**
   * Decrypt credentials from storage
   */
  private async decryptCredentials(encryptedCredentials: string): Promise<Record<string, any>> {
    // In production, implement proper decryption
    return JSON.parse(encryptedCredentials);
  }

  /**
   * Generate display name for connection
   */
  private getDisplayName(platform: StoragePlatform, credentials: Record<string, any>): string {
    const platformNames = {
      [StoragePlatform.CLOUDINARY]: 'Cloudinary',
      [StoragePlatform.AWS_S3]: 'AWS S3',
      [StoragePlatform.GOOGLE_CLOUD]: 'Google Cloud Storage',
      [StoragePlatform.AZURE_BLOB]: 'Azure Blob Storage'
    };

    const platformName = platformNames[platform] || platform;
    const accountName = credentials.cloudName || credentials.bucket || credentials.accountName || 'Account';
    return `${platformName} (${accountName})`;
  }
} 