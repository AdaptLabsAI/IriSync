// Storage Analytics Utilities
// Production-ready analytics utilities for storage operations

import { StoragePlatform, StorageFileType, MediaFile, StorageUsage } from '../types';
import { Logger } from '../../logging';

export interface StorageMetrics {
  totalFiles: number;
  totalSize: number;
  averageFileSize: number;
  filesByType: Record<StorageFileType, number>;
  filesByPlatform: Record<StoragePlatform, number>;
  sizeByType: Record<StorageFileType, number>;
  sizeByPlatform: Record<StoragePlatform, number>;
  uploadTrends: Array<{
    date: string;
    count: number;
    size: number;
  }>;
  topFiles: Array<{
    id: string;
    filename: string;
    size: number;
    downloads?: number;
    views?: number;
  }>;
  storageEfficiency: {
    compressionRatio: number;
    duplicateFiles: number;
    unusedFiles: number;
  };
}

export interface StorageInsights {
  recommendations: Array<{
    type: 'optimization' | 'cost' | 'performance' | 'security';
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    impact: string;
    action: string;
  }>;
  alerts: Array<{
    type: 'quota' | 'performance' | 'security' | 'cost';
    severity: 'critical' | 'warning' | 'info';
    message: string;
    timestamp: Date;
  }>;
  trends: {
    growthRate: number; // percentage per month
    projectedQuotaExhaustion?: Date;
    costTrend: 'increasing' | 'decreasing' | 'stable';
    performanceTrend: 'improving' | 'degrading' | 'stable';
  };
}

export class AnalyticsUtils {
  private static logger = new Logger('AnalyticsUtils');

  /**
   * Calculate comprehensive storage metrics
   */
  static calculateMetrics(files: MediaFile[]): StorageMetrics {
    const metrics: StorageMetrics = {
      totalFiles: files.length,
      totalSize: 0,
      averageFileSize: 0,
      filesByType: {} as Record<StorageFileType, number>,
      filesByPlatform: {} as Record<StoragePlatform, number>,
      sizeByType: {} as Record<StorageFileType, number>,
      sizeByPlatform: {} as Record<StoragePlatform, number>,
      uploadTrends: [],
      topFiles: [],
      storageEfficiency: {
        compressionRatio: 0,
        duplicateFiles: 0,
        unusedFiles: 0
      }
    };

    if (files.length === 0) {
      return metrics;
    }

    // Initialize counters
    Object.values(StorageFileType).forEach(type => {
      metrics.filesByType[type] = 0;
      metrics.sizeByType[type] = 0;
    });

    Object.values(StoragePlatform).forEach(platform => {
      metrics.filesByPlatform[platform] = 0;
      metrics.sizeByPlatform[platform] = 0;
    });

    // Calculate basic metrics
    files.forEach(file => {
      metrics.totalSize += file.size;
      
      // Count by type
      metrics.filesByType[file.fileType as StorageFileType]++;
      metrics.sizeByType[file.fileType as StorageFileType] += file.size;
      
      // Count by platform
      metrics.filesByPlatform[file.platform]++;
      metrics.sizeByPlatform[file.platform] += file.size;
    });

    metrics.averageFileSize = metrics.totalSize / metrics.totalFiles;

    // Calculate upload trends (group by day)
    const uploadsByDay = new Map<string, { count: number; size: number }>();
    files.forEach(file => {
      const date = file.uploadedAt.toDate().toISOString().split('T')[0];
      const existing = uploadsByDay.get(date) || { count: 0, size: 0 };
      uploadsByDay.set(date, {
        count: existing.count + 1,
        size: existing.size + file.size
      });
    });

    metrics.uploadTrends = Array.from(uploadsByDay.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Get top files by size
    metrics.topFiles = files
      .sort((a, b) => b.size - a.size)
      .slice(0, 10)
      .map(file => ({
        id: file.id,
        filename: file.filename,
        size: file.size,
        downloads: file.metadata?.downloads || 0,
        views: file.metadata?.views || 0
      }));

    // Calculate storage efficiency
    metrics.storageEfficiency = this.calculateStorageEfficiency(files);

    return metrics;
  }

  /**
   * Generate storage insights and recommendations
   */
  static generateInsights(metrics: StorageMetrics, usage: StorageUsage): StorageInsights {
    const insights: StorageInsights = {
      recommendations: [],
      alerts: [],
      trends: {
        growthRate: 0,
        costTrend: 'stable',
        performanceTrend: 'stable'
      }
    };

    // Generate recommendations
    insights.recommendations = this.generateRecommendations(metrics, usage);
    
    // Generate alerts
    insights.alerts = this.generateAlerts(metrics, usage);
    
    // Calculate trends
    insights.trends = this.calculateTrends(metrics, usage);

    return insights;
  }

  /**
   * Calculate storage efficiency metrics
   */
  private static calculateStorageEfficiency(files: MediaFile[]): {
    compressionRatio: number;
    duplicateFiles: number;
    unusedFiles: number;
  } {
    // Group files by checksum to find duplicates
    const checksumGroups = new Map<string, MediaFile[]>();
    files.forEach(file => {
      const checksum = file.metadata?.checksum;
      if (checksum) {
        if (!checksumGroups.has(checksum)) {
          checksumGroups.set(checksum, []);
        }
        checksumGroups.get(checksum)!.push(file);
      }
    });

    const duplicateFiles = Array.from(checksumGroups.values())
      .filter(group => group.length > 1)
      .reduce((sum, group) => sum + (group.length - 1), 0);

    // Calculate compression ratio (placeholder - would need actual compressed vs uncompressed sizes)
    const compressionRatio = 0.75; // Assume 25% compression on average

    // Calculate unused files (files not accessed in 90 days)
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const unusedFiles = files.filter(file => {
      const lastAccessed = file.metadata?.lastAccessed;
      return !lastAccessed || new Date(lastAccessed) < ninetyDaysAgo;
    }).length;

    return {
      compressionRatio,
      duplicateFiles,
      unusedFiles
    };
  }

  /**
   * Generate optimization recommendations
   */
  private static generateRecommendations(metrics: StorageMetrics, usage: StorageUsage): Array<{
    type: 'optimization' | 'cost' | 'performance' | 'security';
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    impact: string;
    action: string;
  }> {
    const recommendations = [];

    // Duplicate files recommendation
    if (metrics.storageEfficiency.duplicateFiles > 0) {
      recommendations.push({
        type: 'optimization' as const,
        priority: 'medium' as const,
        title: 'Remove Duplicate Files',
        description: `Found ${metrics.storageEfficiency.duplicateFiles} duplicate files`,
        impact: `Could save ${this.formatFileSize(this.estimateDuplicateSize(metrics))} of storage`,
        action: 'Review and remove duplicate files to optimize storage usage'
      });
    }

    // Unused files recommendation
    if (metrics.storageEfficiency.unusedFiles > 10) {
      recommendations.push({
        type: 'cost' as const,
        priority: 'low' as const,
        title: 'Archive Unused Files',
        description: `${metrics.storageEfficiency.unusedFiles} files haven't been accessed in 90+ days`,
        impact: 'Reduce storage costs by archiving old files',
        action: 'Consider archiving or deleting files that are no longer needed'
      });
    }

    // Large file optimization
    const largeFiles = metrics.topFiles.filter(file => file.size > 50 * 1024 * 1024); // 50MB+
    if (largeFiles.length > 0) {
      recommendations.push({
        type: 'performance' as const,
        priority: 'medium' as const,
        title: 'Optimize Large Files',
        description: `${largeFiles.length} files are larger than 50MB`,
        impact: 'Improve upload/download performance and reduce bandwidth costs',
        action: 'Consider compressing or optimizing large files'
      });
    }

    // Platform distribution recommendation
    const platformCount = Object.values(metrics.filesByPlatform).filter(count => count > 0).length;
    if (platformCount > 2) {
      recommendations.push({
        type: 'cost' as const,
        priority: 'low' as const,
        title: 'Consolidate Storage Platforms',
        description: `Files are distributed across ${platformCount} different platforms`,
        impact: 'Reduce management overhead and potentially lower costs',
        action: 'Consider consolidating files to fewer storage platforms'
      });
    }

    return recommendations;
  }

  /**
   * Generate storage alerts
   */
  private static generateAlerts(metrics: StorageMetrics, usage: StorageUsage): Array<{
    type: 'quota' | 'performance' | 'security' | 'cost';
    severity: 'critical' | 'warning' | 'info';
    message: string;
    timestamp: Date;
  }> {
    const alerts = [];
    const now = new Date();

    // Quota alerts
    Object.entries(usage.byPlatform).forEach(([platform, platformUsage]) => {
      const usagePercentage = (platformUsage.size / (platformUsage.size + 1000000)) * 100; // Placeholder quota
      
      if (usagePercentage > 90) {
        alerts.push({
          type: 'quota' as const,
          severity: 'critical' as const,
          message: `${platform} storage is ${usagePercentage.toFixed(1)}% full`,
          timestamp: now
        });
      } else if (usagePercentage > 75) {
        alerts.push({
          type: 'quota' as const,
          severity: 'warning' as const,
          message: `${platform} storage is ${usagePercentage.toFixed(1)}% full`,
          timestamp: now
        });
      }
    });

    // Performance alerts
    if (metrics.averageFileSize > 100 * 1024 * 1024) { // 100MB average
      alerts.push({
        type: 'performance' as const,
        severity: 'warning' as const,
        message: `Average file size is ${this.formatFileSize(metrics.averageFileSize)}, which may impact performance`,
        timestamp: now
      });
    }

    // Security alerts
    if (metrics.storageEfficiency.duplicateFiles > metrics.totalFiles * 0.1) {
      alerts.push({
        type: 'security' as const,
        severity: 'info' as const,
        message: `High number of duplicate files (${metrics.storageEfficiency.duplicateFiles}) may indicate data integrity issues`,
        timestamp: now
      });
    }

    return alerts;
  }

  /**
   * Calculate storage trends
   */
  private static calculateTrends(metrics: StorageMetrics, usage: StorageUsage): {
    growthRate: number;
    projectedQuotaExhaustion?: Date;
    costTrend: 'increasing' | 'decreasing' | 'stable';
    performanceTrend: 'improving' | 'degrading' | 'stable';
  } {
    // Calculate growth rate from upload trends
    let growthRate = 0;
    if (metrics.uploadTrends.length >= 30) { // Need at least 30 days of data
      const recent = metrics.uploadTrends.slice(-30);
      const older = metrics.uploadTrends.slice(-60, -30);
      
      const recentAvg = recent.reduce((sum, day) => sum + day.size, 0) / recent.length;
      const olderAvg = older.reduce((sum, day) => sum + day.size, 0) / older.length;
      
      if (olderAvg > 0) {
        growthRate = ((recentAvg - olderAvg) / olderAvg) * 100;
      }
    }

    // Determine cost trend
    let costTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (growthRate > 10) {
      costTrend = 'increasing';
    } else if (growthRate < -10) {
      costTrend = 'decreasing';
    }

    // Determine performance trend (based on file size trends)
    let performanceTrend: 'improving' | 'degrading' | 'stable' = 'stable';
    if (metrics.uploadTrends.length >= 7) {
      const recentWeek = metrics.uploadTrends.slice(-7);
      const avgRecentFileSize = recentWeek.reduce((sum, day) => 
        sum + (day.count > 0 ? day.size / day.count : 0), 0) / recentWeek.length;
      
      if (avgRecentFileSize > metrics.averageFileSize * 1.2) {
        performanceTrend = 'degrading';
      } else if (avgRecentFileSize < metrics.averageFileSize * 0.8) {
        performanceTrend = 'improving';
      }
    }

    return {
      growthRate,
      costTrend,
      performanceTrend
    };
  }

  /**
   * Estimate size of duplicate files
   */
  private static estimateDuplicateSize(metrics: StorageMetrics): number {
    // Rough estimate: assume duplicates are average-sized files
    return metrics.storageEfficiency.duplicateFiles * metrics.averageFileSize;
  }

  /**
   * Format file size for display
   */
  private static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Generate storage report
   */
  static generateReport(metrics: StorageMetrics, insights: StorageInsights): {
    summary: string;
    details: Record<string, any>;
    recommendations: string[];
    charts: Array<{
      type: 'pie' | 'bar' | 'line';
      title: string;
      data: any;
    }>;
  } {
    const report = {
      summary: this.generateSummary(metrics, insights),
      details: {
        totalFiles: metrics.totalFiles,
        totalSize: this.formatFileSize(metrics.totalSize),
        averageFileSize: this.formatFileSize(metrics.averageFileSize),
        duplicateFiles: metrics.storageEfficiency.duplicateFiles,
        unusedFiles: metrics.storageEfficiency.unusedFiles,
        growthRate: `${insights.trends.growthRate.toFixed(1)}%`,
        platforms: Object.keys(metrics.filesByPlatform).filter(p => metrics.filesByPlatform[p as StoragePlatform] > 0).length
      },
      recommendations: insights.recommendations.map(r => r.title),
      charts: [
        {
          type: 'pie' as const,
          title: 'Files by Type',
          data: metrics.filesByType
        },
        {
          type: 'pie' as const,
          title: 'Storage by Platform',
          data: metrics.sizeByPlatform
        },
        {
          type: 'line' as const,
          title: 'Upload Trends',
          data: metrics.uploadTrends
        }
      ]
    };

    return report;
  }

  /**
   * Generate executive summary
   */
  private static generateSummary(metrics: StorageMetrics, insights: StorageInsights): string {
    const totalSize = this.formatFileSize(metrics.totalSize);
    const fileCount = metrics.totalFiles;
    const criticalAlerts = insights.alerts.filter(a => a.severity === 'critical').length;
    const highPriorityRecs = insights.recommendations.filter(r => r.priority === 'high').length;

    let summary = `Storage overview: ${fileCount} files totaling ${totalSize}. `;
    
    if (criticalAlerts > 0) {
      summary += `${criticalAlerts} critical alert(s) require immediate attention. `;
    }
    
    if (highPriorityRecs > 0) {
      summary += `${highPriorityRecs} high-priority recommendation(s) available. `;
    }
    
    if (insights.trends.growthRate > 0) {
      summary += `Storage is growing at ${insights.trends.growthRate.toFixed(1)}% per month. `;
    }
    
    if (metrics.storageEfficiency.duplicateFiles > 0) {
      summary += `${metrics.storageEfficiency.duplicateFiles} duplicate files found. `;
    }

    return summary.trim();
  }
} 