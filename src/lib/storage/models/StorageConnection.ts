// StorageConnection Model - Storage connection data structure and utilities
// Production-ready model following existing codebase patterns

import { Timestamp } from 'firebase/firestore';
import { 
  StoragePlatform, 
  StorageConnectionStatus, 
  StorageTokens, 
  StorageConfig, 
  StorageQuota,
  StorageConnectionData 
} from '../types';

/**
 * Storage connection interface for application use
 */
export interface StorageConnection {
  id: string;
  userId: string;
  organizationId?: string;
  platform: StoragePlatform;
  accountName: string;
  accountEmail?: string;
  accountId: string;
  tokens: StorageTokens;
  config: StorageConfig;
  status: StorageConnectionStatus;
  quota?: StorageQuota;
  isActive: boolean;
  lastUsed?: Date;
  lastSyncAt?: Date;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Firestore storage connection document structure
 */
export interface FirestoreStorageConnection {
  userId: string;
  organizationId?: string;
  platform: StoragePlatform;
  accountName: string;
  accountEmail?: string;
  accountId: string;
  tokens: {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Timestamp;
    tokenType?: string;
    scope?: string[];
  };
  config: {
    platform: StoragePlatform;
    credentials: Record<string, string>;
    bucket?: string;
    region?: string;
    endpoint?: string;
    cdn?: {
      enabled: boolean;
      domain?: string;
      cacheControl?: string;
      compression?: boolean;
      optimization?: boolean;
      secureUrls?: boolean;
      customTransformations?: Record<string, any>;
    };
    cache?: {
      enabled: boolean;
      ttl: number;
      maxSize: number;
      strategy: 'lru' | 'fifo' | 'lfu';
      compression?: boolean;
    };
    validation?: {
      maxFileSize: number;
      allowedMimeTypes: string[];
      allowedExtensions: string[];
      scanForMalware?: boolean;
      checkDimensions?: {
        minWidth?: number;
        minHeight?: number;
        maxWidth?: number;
        maxHeight?: number;
      };
    };
    defaultFolder?: string;
    autoBackup?: boolean;
    encryption?: boolean;
  };
  status: StorageConnectionStatus;
  quota?: {
    total: number;
    used: number;
    remaining: number;
    unit: 'bytes' | 'kb' | 'mb' | 'gb' | 'tb' | 'credits' | 'count';
    lastUpdated: Timestamp;
  };
  isActive: boolean;
  lastUsed?: Timestamp;
  lastSyncAt?: Timestamp;
  errorMessage?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Storage connection utilities class
 */
export class StorageConnectionUtils {
  /**
   * Convert Firestore document to StorageConnection
   */
  static fromFirestore(data: FirestoreStorageConnection, id: string): StorageConnection {
    return {
      id,
      userId: data.userId,
      organizationId: data.organizationId,
      platform: data.platform,
      accountName: data.accountName,
      accountEmail: data.accountEmail,
      accountId: data.accountId,
      tokens: {
        accessToken: data.tokens.accessToken,
        refreshToken: data.tokens.refreshToken,
        expiresAt: data.tokens.expiresAt?.toDate(),
        tokenType: data.tokens.tokenType,
        scope: data.tokens.scope
      },
      config: {
        platform: data.config.platform,
        credentials: data.config.credentials,
        bucket: data.config.bucket,
        region: data.config.region,
        endpoint: data.config.endpoint,
        cdn: data.config.cdn ? {
          enabled: data.config.cdn.enabled,
          domain: data.config.cdn.domain,
          cacheControl: data.config.cdn.cacheControl,
          compression: data.config.cdn.compression,
          optimization: data.config.cdn.optimization,
          secureUrls: data.config.cdn.secureUrls,
          customTransformations: data.config.cdn.customTransformations
        } : undefined,
        cache: data.config.cache ? {
          enabled: data.config.cache.enabled,
          ttl: data.config.cache.ttl,
          maxSize: data.config.cache.maxSize,
          strategy: data.config.cache.strategy,
          compression: data.config.cache.compression
        } : undefined,
        validation: data.config.validation ? {
          maxFileSize: data.config.validation.maxFileSize,
          allowedMimeTypes: data.config.validation.allowedMimeTypes,
          allowedExtensions: data.config.validation.allowedExtensions,
          scanForMalware: data.config.validation.scanForMalware,
          checkDimensions: data.config.validation.checkDimensions
        } : undefined,
        defaultFolder: data.config.defaultFolder,
        autoBackup: data.config.autoBackup,
        encryption: data.config.encryption
      },
      status: data.status,
      quota: data.quota ? {
        total: data.quota.total,
        used: data.quota.used,
        remaining: data.quota.remaining,
        unit: data.quota.unit,
        lastUpdated: data.quota.lastUpdated.toDate()
      } : undefined,
      isActive: data.isActive,
      lastUsed: data.lastUsed?.toDate(),
      lastSyncAt: data.lastSyncAt?.toDate(),
      errorMessage: data.errorMessage,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate()
    };
  }

  /**
   * Convert StorageConnection to Firestore document
   */
  static toFirestore(connection: StorageConnectionData): Omit<FirestoreStorageConnection, 'createdAt' | 'updatedAt'> {
    return {
      userId: '', // Will be set by the service
      organizationId: undefined, // Will be set by the service
      platform: connection.platform,
      accountName: connection.accountName,
      accountEmail: connection.accountEmail,
      accountId: connection.accountId,
      tokens: {
        accessToken: connection.tokens.accessToken,
        refreshToken: connection.tokens.refreshToken,
        expiresAt: connection.tokens.expiresAt ? Timestamp.fromDate(connection.tokens.expiresAt) : undefined,
        tokenType: connection.tokens.tokenType,
        scope: connection.tokens.scope
      },
      config: {
        platform: connection.config.platform,
        credentials: connection.config.credentials,
        bucket: connection.config.bucket,
        region: connection.config.region,
        endpoint: connection.config.endpoint,
        cdn: connection.config.cdn ? {
          enabled: connection.config.cdn.enabled,
          domain: connection.config.cdn.domain,
          cacheControl: connection.config.cdn.cacheControl,
          compression: connection.config.cdn.compression,
          optimization: connection.config.cdn.optimization,
          secureUrls: connection.config.cdn.secureUrls,
          customTransformations: connection.config.cdn.customTransformations
        } : undefined,
        cache: connection.config.cache ? {
          enabled: connection.config.cache.enabled,
          ttl: connection.config.cache.ttl,
          maxSize: connection.config.cache.maxSize,
          strategy: connection.config.cache.strategy,
          compression: connection.config.cache.compression
        } : undefined,
        validation: connection.config.validation ? {
          maxFileSize: connection.config.validation.maxFileSize,
          allowedMimeTypes: connection.config.validation.allowedMimeTypes,
          allowedExtensions: connection.config.validation.allowedExtensions,
          scanForMalware: connection.config.validation.scanForMalware,
          checkDimensions: connection.config.validation.checkDimensions
        } : undefined,
        defaultFolder: connection.config.defaultFolder,
        autoBackup: connection.config.autoBackup,
        encryption: connection.config.encryption
      },
      status: StorageConnectionStatus.CONNECTED,
      quota: connection.quota ? {
        total: connection.quota.total,
        used: connection.quota.used,
        remaining: connection.quota.remaining,
        unit: connection.quota.unit,
        lastUpdated: Timestamp.fromDate(connection.quota.lastUpdated)
      } : undefined,
      isActive: connection.isActive,
      lastUsed: undefined,
      lastSyncAt: undefined,
      errorMessage: undefined
    };
  }

  /**
   * Validate storage connection data
   */
  static validate(data: StorageConnectionData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields validation
    if (!data.platform) {
      errors.push('Platform is required');
    }

    if (!data.accountName?.trim()) {
      errors.push('Account name is required');
    }

    if (!data.accountId?.trim()) {
      errors.push('Account ID is required');
    }

    if (!data.tokens?.accessToken?.trim()) {
      errors.push('Access token is required');
    }

    if (!data.config) {
      errors.push('Configuration is required');
    } else {
      // Validate configuration
      if (!data.config.platform) {
        errors.push('Configuration platform is required');
      }

      if (!data.config.credentials || Object.keys(data.config.credentials).length === 0) {
        errors.push('Configuration credentials are required');
      }

      // Validate validation config if present
      if (data.config.validation) {
        if (data.config.validation.maxFileSize <= 0) {
          errors.push('Max file size must be greater than 0');
        }

        if (!data.config.validation.allowedMimeTypes || data.config.validation.allowedMimeTypes.length === 0) {
          errors.push('At least one allowed MIME type is required');
        }

        if (!data.config.validation.allowedExtensions || data.config.validation.allowedExtensions.length === 0) {
          errors.push('At least one allowed file extension is required');
        }
      }

      // Validate cache config if present
      if (data.config.cache) {
        if (data.config.cache.ttl <= 0) {
          errors.push('Cache TTL must be greater than 0');
        }

        if (data.config.cache.maxSize <= 0) {
          errors.push('Cache max size must be greater than 0');
        }
      }
    }

    // Validate quota if present
    if (data.quota) {
      if (data.quota.total < 0) {
        errors.push('Quota total cannot be negative');
      }

      if (data.quota.used < 0) {
        errors.push('Quota used cannot be negative');
      }

      if (data.quota.remaining < 0) {
        errors.push('Quota remaining cannot be negative');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if connection tokens are expired
   */
  static isTokenExpired(connection: StorageConnection): boolean {
    if (!connection.tokens.expiresAt) {
      return false; // No expiration date means token doesn't expire
    }

    return new Date() >= connection.tokens.expiresAt;
  }

  /**
   * Check if connection needs refresh
   */
  static needsRefresh(connection: StorageConnection): boolean {
    if (!connection.tokens.expiresAt) {
      return false;
    }

    // Refresh if token expires within 5 minutes
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
    return fiveMinutesFromNow >= connection.tokens.expiresAt;
  }

  /**
   * Get default configuration for a platform
   */
  static getDefaultConfig(platform: StoragePlatform): Partial<StorageConfig> {
    const baseConfig = {
      platform,
      credentials: {},
      cdn: {
        enabled: true,
        compression: true,
        optimization: true,
        secureUrls: true
      },
      cache: {
        enabled: true,
        ttl: 3600, // 1 hour
        maxSize: 100 * 1024 * 1024, // 100MB
        strategy: 'lru' as const,
        compression: true
      },
      validation: {
        maxFileSize: 50 * 1024 * 1024, // 50MB
        allowedMimeTypes: [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'video/mp4',
          'video/webm',
          'audio/mp3',
          'audio/wav',
          'application/pdf'
        ],
        allowedExtensions: [
          '.jpg', '.jpeg', '.png', '.gif', '.webp',
          '.mp4', '.webm', '.mov',
          '.mp3', '.wav',
          '.pdf', '.doc', '.docx'
        ],
        scanForMalware: true
      },
      autoBackup: false,
      encryption: true
    };

    switch (platform) {
      case StoragePlatform.CLOUDINARY:
        return {
          ...baseConfig,
          cdn: {
            ...baseConfig.cdn,
            enabled: true,
            optimization: true
          }
        };

      case StoragePlatform.AWS_S3:
        return {
          ...baseConfig,
          region: 'us-east-1'
        };

      case StoragePlatform.GOOGLE_CLOUD:
        return {
          ...baseConfig,
          region: 'us-central1'
        };

      case StoragePlatform.AZURE_BLOB:
        return {
          ...baseConfig,
          region: 'East US'
        };

      default:
        return baseConfig;
    }
  }

  /**
   * Generate connection display name
   */
  static getDisplayName(connection: StorageConnection): string {
    const platformNames = {
      [StoragePlatform.CLOUDINARY]: 'Cloudinary',
      [StoragePlatform.AWS_S3]: 'AWS S3',
      [StoragePlatform.GOOGLE_CLOUD]: 'Google Cloud Storage',
      [StoragePlatform.AZURE_BLOB]: 'Azure Blob Storage'
    };

    const platformName = platformNames[connection.platform] || connection.platform;
    return `${platformName} (${connection.accountName})`;
  }

  /**
   * Get connection health status
   */
  static getHealthStatus(connection: StorageConnection): {
    status: 'healthy' | 'warning' | 'error';
    message: string;
  } {
    if (!connection.isActive) {
      return {
        status: 'error',
        message: 'Connection is inactive'
      };
    }

    if (connection.status === StorageConnectionStatus.ERROR) {
      return {
        status: 'error',
        message: connection.errorMessage || 'Connection error'
      };
    }

    if (this.isTokenExpired(connection)) {
      return {
        status: 'error',
        message: 'Access token has expired'
      };
    }

    if (this.needsRefresh(connection)) {
      return {
        status: 'warning',
        message: 'Access token expires soon'
      };
    }

    if (connection.quota && connection.quota.remaining < (connection.quota.total * 0.1)) {
      return {
        status: 'warning',
        message: 'Storage quota is running low'
      };
    }

    return {
      status: 'healthy',
      message: 'Connection is healthy'
    };
  }
} 