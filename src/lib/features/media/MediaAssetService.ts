/**
 * Media Asset Service
 *
 * Manages media assets (images, videos, documents) with centralized storage,
 * organization, and retrieval. Integrates with Firebase Storage for file management.
 *
 * Features:
 * - Upload and store media files
 * - Organize assets into folders/collections
 * - Tag and categorize assets
 * - Search and filter assets
 * - Track asset usage across posts
 * - Performance analytics for media
 * - Brand asset library management
 */

import { firestore, storage } from '@/lib/core/firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  Timestamp,
} from 'firebase/firestore';
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  getMetadata,
  ListResult,
} from 'firebase/storage';

/**
 * Media asset types
 */
export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video',
  GIF = 'gif',
  DOCUMENT = 'document',
  AUDIO = 'audio',
}

/**
 * Asset category for organization
 */
export enum AssetCategory {
  PRODUCT = 'product',
  BRAND = 'brand',
  MARKETING = 'marketing',
  SOCIAL = 'social',
  EVENT = 'event',
  TEAM = 'team',
  CUSTOMER = 'customer',
  STOCK = 'stock',
  OTHER = 'other',
}

/**
 * Media asset metadata
 */
export interface MediaAsset {
  id?: string;
  userId: string;
  organizationId: string;

  // File information
  fileName: string;
  originalFileName: string;
  fileSize: number; // in bytes
  mimeType: string;
  type: MediaType;

  // Storage information
  storagePath: string;
  downloadUrl: string;
  thumbnailUrl?: string;

  // Media dimensions (for images/videos)
  width?: number;
  height?: number;
  duration?: number; // for videos/audio in seconds

  // Organization
  folderId?: string;
  folderPath?: string;
  category: AssetCategory;
  tags: string[];

  // Metadata
  title?: string;
  description?: string;
  altText?: string;

  // Brand asset flags
  isBrandAsset: boolean;
  brandAssetType?: 'logo' | 'color' | 'font' | 'template' | 'guideline';

  // Usage tracking
  usageCount: number;
  lastUsedAt?: Date;
  usedInPosts: string[]; // Array of post IDs

  // Performance (if used in posts)
  totalImpressions?: number;
  totalEngagement?: number;
  averageEngagementRate?: number;

  // Status
  isArchived: boolean;
  isFavorite: boolean;

  // Timestamps
  uploadedAt: Date;
  updatedAt: Date;

  metadata?: Record<string, any>;
}

/**
 * Media folder for organization
 */
export interface MediaFolder {
  id?: string;
  userId: string;
  organizationId: string;
  name: string;
  description?: string;
  parentId?: string;
  path: string; // e.g., "/products/shoes"
  assetCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Upload options
 */
export interface UploadOptions {
  folder?: string;
  tags?: string[];
  category?: AssetCategory;
  title?: string;
  description?: string;
  altText?: string;
  isBrandAsset?: boolean;
  brandAssetType?: 'logo' | 'color' | 'font' | 'template' | 'guideline';
}

/**
 * Search/filter options
 */
export interface SearchOptions {
  type?: MediaType;
  category?: AssetCategory;
  tags?: string[];
  folderId?: string;
  isBrandAsset?: boolean;
  isFavorite?: boolean;
  isArchived?: boolean;
  searchQuery?: string; // Search in title, description, tags
  sortBy?: 'uploadedAt' | 'usageCount' | 'fileName' | 'fileSize';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
}

/**
 * Asset statistics
 */
export interface AssetStats {
  totalAssets: number;
  totalSize: number; // in bytes
  typeBreakdown: {
    type: MediaType;
    count: number;
    size: number;
  }[];
  categoryBreakdown: {
    category: AssetCategory;
    count: number;
  }[];
  topTags: {
    tag: string;
    count: number;
  }[];
  brandAssetCount: number;
  mostUsedAssets: MediaAsset[];
  recentUploads: MediaAsset[];
}

class MediaAssetService {
  private readonly ASSETS_COLLECTION = 'mediaAssets';
  private readonly FOLDERS_COLLECTION = 'mediaFolders';
  private readonly STORAGE_BASE_PATH = 'media';

  /**
   * Upload a media file
   */
  async uploadAsset(
    userId: string,
    organizationId: string,
    file: File,
    options: UploadOptions = {}
  ): Promise<MediaAsset> {
    try {
      // Determine media type
      const mediaType = this.detectMediaType(file.type);

      // Generate unique file name
      const timestamp = Date.now();
      const sanitizedName = this.sanitizeFileName(file.name);
      const fileName = `${timestamp}_${sanitizedName}`;

      // Determine storage path
      const folderPath = options.folder || 'uploads';
      const storagePath = `${this.STORAGE_BASE_PATH}/${organizationId}/${folderPath}/${fileName}`;

      // Upload to Firebase Storage
      const storageRef = ref(storage, storagePath);
      const snapshot = await uploadBytes(storageRef, file);

      // Get download URL
      const downloadUrl = await getDownloadURL(snapshot.ref);

      // Get file metadata
      const metadata = await getMetadata(snapshot.ref);

      // Extract dimensions for images/videos (would require additional processing)
      const dimensions = await this.extractDimensions(file, mediaType);

      // Create asset document
      const asset: Omit<MediaAsset, 'id'> = {
        userId,
        organizationId,
        fileName,
        originalFileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        type: mediaType,
        storagePath,
        downloadUrl,
        width: dimensions?.width,
        height: dimensions?.height,
        duration: dimensions?.duration,
        folderId: options.folder,
        folderPath,
        category: options.category || AssetCategory.OTHER,
        tags: options.tags || [],
        title: options.title,
        description: options.description,
        altText: options.altText,
        isBrandAsset: options.isBrandAsset || false,
        brandAssetType: options.brandAssetType,
        usageCount: 0,
        usedInPosts: [],
        isArchived: false,
        isFavorite: false,
        uploadedAt: new Date(),
        updatedAt: new Date(),
      };

      // Save to Firestore
      const docRef = await addDoc(collection(firestore, this.ASSETS_COLLECTION), {
        ...asset,
        uploadedAt: Timestamp.fromDate(asset.uploadedAt),
        updatedAt: Timestamp.fromDate(asset.updatedAt),
      });

      return {
        id: docRef.id,
        ...asset,
      };
    } catch (error) {
      console.error('Error uploading asset:', error);
      throw new Error('Failed to upload asset');
    }
  }

  /**
   * Detect media type from MIME type
   */
  private detectMediaType(mimeType: string): MediaType {
    if (mimeType.startsWith('image/gif')) {
      return MediaType.GIF;
    } else if (mimeType.startsWith('image/')) {
      return MediaType.IMAGE;
    } else if (mimeType.startsWith('video/')) {
      return MediaType.VIDEO;
    } else if (mimeType.startsWith('audio/')) {
      return MediaType.AUDIO;
    } else {
      return MediaType.DOCUMENT;
    }
  }

  /**
   * Sanitize file name for storage
   */
  private sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .toLowerCase();
  }

  /**
   * Extract dimensions from file (placeholder - would require image processing library)
   */
  private async extractDimensions(
    file: File,
    mediaType: MediaType
  ): Promise<{ width?: number; height?: number; duration?: number } | null> {
    if (mediaType === MediaType.IMAGE || mediaType === MediaType.GIF) {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          resolve({ width: img.width, height: img.height });
        };
        img.onerror = () => resolve(null);
        img.src = URL.createObjectURL(file);
      });
    }

    // For videos, would need video processing library
    return null;
  }

  /**
   * Get asset by ID
   */
  async getAsset(assetId: string): Promise<MediaAsset | null> {
    try {
      const assetDoc = await getDoc(doc(firestore, this.ASSETS_COLLECTION, assetId));

      if (!assetDoc.exists()) {
        return null;
      }

      const data = assetDoc.data();
      return {
        id: assetDoc.id,
        userId: data.userId,
        organizationId: data.organizationId,
        fileName: data.fileName,
        originalFileName: data.originalFileName,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        type: data.type,
        storagePath: data.storagePath,
        downloadUrl: data.downloadUrl,
        thumbnailUrl: data.thumbnailUrl,
        width: data.width,
        height: data.height,
        duration: data.duration,
        folderId: data.folderId,
        folderPath: data.folderPath,
        category: data.category,
        tags: data.tags || [],
        title: data.title,
        description: data.description,
        altText: data.altText,
        isBrandAsset: data.isBrandAsset,
        brandAssetType: data.brandAssetType,
        usageCount: data.usageCount || 0,
        lastUsedAt: data.lastUsedAt?.toDate(),
        usedInPosts: data.usedInPosts || [],
        totalImpressions: data.totalImpressions,
        totalEngagement: data.totalEngagement,
        averageEngagementRate: data.averageEngagementRate,
        isArchived: data.isArchived,
        isFavorite: data.isFavorite,
        uploadedAt: data.uploadedAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        metadata: data.metadata,
      };
    } catch (error) {
      console.error('Error getting asset:', error);
      return null;
    }
  }

  /**
   * Search/filter assets
   */
  async searchAssets(
    userId: string,
    organizationId: string,
    options: SearchOptions = {}
  ): Promise<MediaAsset[]> {
    try {
      let assetsQuery = query(
        collection(firestore, this.ASSETS_COLLECTION),
        where('userId', '==', userId),
        where('organizationId', '==', organizationId)
      );

      // Apply filters
      if (options.type) {
        assetsQuery = query(assetsQuery, where('type', '==', options.type));
      }

      if (options.category) {
        assetsQuery = query(assetsQuery, where('category', '==', options.category));
      }

      if (options.folderId) {
        assetsQuery = query(assetsQuery, where('folderId', '==', options.folderId));
      }

      if (options.isBrandAsset !== undefined) {
        assetsQuery = query(assetsQuery, where('isBrandAsset', '==', options.isBrandAsset));
      }

      if (options.isFavorite !== undefined) {
        assetsQuery = query(assetsQuery, where('isFavorite', '==', options.isFavorite));
      }

      if (options.isArchived !== undefined) {
        assetsQuery = query(assetsQuery, where('isArchived', '==', options.isArchived));
      }

      // Apply sorting
      const sortField = options.sortBy || 'uploadedAt';
      const sortDirection = options.sortOrder || 'desc';
      assetsQuery = query(assetsQuery, orderBy(sortField, sortDirection));

      // Apply limit
      if (options.limit) {
        assetsQuery = query(assetsQuery, firestoreLimit(options.limit));
      }

      const assetsDocs = await getDocs(assetsQuery);
      let assets: MediaAsset[] = [];

      assetsDocs.forEach((doc) => {
        const data = doc.data();
        assets.push({
          id: doc.id,
          userId: data.userId,
          organizationId: data.organizationId,
          fileName: data.fileName,
          originalFileName: data.originalFileName,
          fileSize: data.fileSize,
          mimeType: data.mimeType,
          type: data.type,
          storagePath: data.storagePath,
          downloadUrl: data.downloadUrl,
          thumbnailUrl: data.thumbnailUrl,
          width: data.width,
          height: data.height,
          duration: data.duration,
          folderId: data.folderId,
          folderPath: data.folderPath,
          category: data.category,
          tags: data.tags || [],
          title: data.title,
          description: data.description,
          altText: data.altText,
          isBrandAsset: data.isBrandAsset,
          brandAssetType: data.brandAssetType,
          usageCount: data.usageCount || 0,
          lastUsedAt: data.lastUsedAt?.toDate(),
          usedInPosts: data.usedInPosts || [],
          totalImpressions: data.totalImpressions,
          totalEngagement: data.totalEngagement,
          averageEngagementRate: data.averageEngagementRate,
          isArchived: data.isArchived,
          isFavorite: data.isFavorite,
          uploadedAt: data.uploadedAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          metadata: data.metadata,
        });
      });

      // Apply client-side filtering for complex queries
      if (options.tags && options.tags.length > 0) {
        assets = assets.filter(asset =>
          options.tags!.some(tag => asset.tags.includes(tag))
        );
      }

      if (options.searchQuery) {
        const searchLower = options.searchQuery.toLowerCase();
        assets = assets.filter(asset =>
          (asset.title?.toLowerCase().includes(searchLower)) ||
          (asset.description?.toLowerCase().includes(searchLower)) ||
          (asset.fileName.toLowerCase().includes(searchLower)) ||
          asset.tags.some(tag => tag.toLowerCase().includes(searchLower))
        );
      }

      return assets;
    } catch (error) {
      console.error('Error searching assets:', error);
      throw new Error('Failed to search assets');
    }
  }

  /**
   * Update asset metadata
   */
  async updateAsset(
    assetId: string,
    updates: Partial<Omit<MediaAsset, 'id' | 'userId' | 'organizationId' | 'uploadedAt'>>
  ): Promise<void> {
    try {
      const updateData: any = {
        ...updates,
        updatedAt: Timestamp.now(),
      };

      // Convert Date fields to Timestamps
      if (updates.lastUsedAt) {
        updateData.lastUsedAt = Timestamp.fromDate(updates.lastUsedAt);
      }

      await updateDoc(doc(firestore, this.ASSETS_COLLECTION, assetId), updateData);
    } catch (error) {
      console.error('Error updating asset:', error);
      throw new Error('Failed to update asset');
    }
  }

  /**
   * Delete asset
   */
  async deleteAsset(assetId: string): Promise<void> {
    try {
      // Get asset to get storage path
      const asset = await this.getAsset(assetId);
      if (!asset) {
        throw new Error('Asset not found');
      }

      // Delete from Firebase Storage
      const storageRef = ref(storage, asset.storagePath);
      await deleteObject(storageRef);

      // Delete from Firestore
      await deleteDoc(doc(firestore, this.ASSETS_COLLECTION, assetId));
    } catch (error) {
      console.error('Error deleting asset:', error);
      throw new Error('Failed to delete asset');
    }
  }

  /**
   * Track asset usage in a post
   */
  async trackAssetUsage(assetId: string, postId: string): Promise<void> {
    try {
      const asset = await this.getAsset(assetId);
      if (!asset) {
        return;
      }

      const usedInPosts = asset.usedInPosts || [];
      if (!usedInPosts.includes(postId)) {
        usedInPosts.push(postId);
      }

      await updateDoc(doc(firestore, this.ASSETS_COLLECTION, assetId), {
        usageCount: (asset.usageCount || 0) + 1,
        lastUsedAt: Timestamp.now(),
        usedInPosts,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error tracking asset usage:', error);
    }
  }

  /**
   * Get asset statistics
   */
  async getAssetStats(userId: string, organizationId: string): Promise<AssetStats> {
    try {
      const assets = await this.searchAssets(userId, organizationId, { limit: 1000 });

      // Calculate stats
      const stats: AssetStats = {
        totalAssets: assets.length,
        totalSize: assets.reduce((sum, asset) => sum + asset.fileSize, 0),
        typeBreakdown: [],
        categoryBreakdown: [],
        topTags: [],
        brandAssetCount: assets.filter(a => a.isBrandAsset).length,
        mostUsedAssets: assets
          .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
          .slice(0, 10),
        recentUploads: assets
          .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())
          .slice(0, 10),
      };

      // Type breakdown
      const typeMap = new Map<MediaType, { count: number; size: number }>();
      assets.forEach(asset => {
        const current = typeMap.get(asset.type) || { count: 0, size: 0 };
        current.count++;
        current.size += asset.fileSize;
        typeMap.set(asset.type, current);
      });
      stats.typeBreakdown = Array.from(typeMap.entries()).map(([type, data]) => ({
        type,
        count: data.count,
        size: data.size,
      }));

      // Category breakdown
      const categoryMap = new Map<AssetCategory, number>();
      assets.forEach(asset => {
        categoryMap.set(asset.category, (categoryMap.get(asset.category) || 0) + 1);
      });
      stats.categoryBreakdown = Array.from(categoryMap.entries()).map(([category, count]) => ({
        category,
        count,
      }));

      // Top tags
      const tagMap = new Map<string, number>();
      assets.forEach(asset => {
        asset.tags.forEach(tag => {
          tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
        });
      });
      stats.topTags = Array.from(tagMap.entries())
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);

      return stats;
    } catch (error) {
      console.error('Error getting asset stats:', error);
      throw new Error('Failed to get asset statistics');
    }
  }

  /**
   * Toggle favorite status
   */
  async toggleFavorite(assetId: string, isFavorite: boolean): Promise<void> {
    try {
      await updateDoc(doc(firestore, this.ASSETS_COLLECTION, assetId), {
        isFavorite,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error toggling favorite:', error);
      throw new Error('Failed to toggle favorite');
    }
  }

  /**
   * Archive asset
   */
  async archiveAsset(assetId: string): Promise<void> {
    try {
      await updateDoc(doc(firestore, this.ASSETS_COLLECTION, assetId), {
        isArchived: true,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error archiving asset:', error);
      throw new Error('Failed to archive asset');
    }
  }

  /**
   * Restore archived asset
   */
  async restoreAsset(assetId: string): Promise<void> {
    try {
      await updateDoc(doc(firestore, this.ASSETS_COLLECTION, assetId), {
        isArchived: false,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error restoring asset:', error);
      throw new Error('Failed to restore asset');
    }
  }
}

// Export singleton instance
export const mediaAssetService = new MediaAssetService();
