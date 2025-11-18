/**
 * Media Context Provider
 *
 * Provides media library context for AI chat interactions.
 * Enables Iris AI to understand and reference the user's media assets,
 * brand library, and recent uploads.
 *
 * Features:
 * - Asset inventory and statistics
 * - Brand asset library information
 * - Recent uploads and frequently used assets
 * - Platform-specific recommendations
 */

import { mediaAssetService, MediaAsset, MediaType, AssetCategory } from './MediaAssetService';

/**
 * Media context item
 */
export interface MediaContextItem {
  type: 'overview' | 'brand_assets' | 'recent_uploads' | 'popular_assets' | 'recommendations';
  title: string;
  data: any;
  priority: number; // Higher priority items are more relevant
}

/**
 * Media context options
 */
export interface MediaContextOptions {
  includeOverview?: boolean;
  includeBrandAssets?: boolean;
  includeRecentUploads?: boolean;
  includePopularAssets?: boolean;
  includeRecommendations?: boolean;
  limit?: number;
}

class MediaContextProvider {
  /**
   * Build comprehensive media context for AI chat
   */
  async buildMediaContext(
    userId: string,
    organizationId: string,
    options: MediaContextOptions = {}
  ): Promise<MediaContextItem[]> {
    const {
      includeOverview = true,
      includeBrandAssets = true,
      includeRecentUploads = true,
      includePopularAssets = true,
      includeRecommendations = true,
      limit = 10,
    } = options;

    const contexts: MediaContextItem[] = [];

    try {
      // Get media library overview
      if (includeOverview) {
        const stats = await mediaAssetService.getAssetStats(userId, organizationId);
        contexts.push({
          type: 'overview',
          title: 'Media Library Overview',
          data: {
            totalAssets: stats.totalAssets,
            totalSize: this.formatFileSize(stats.totalSize),
            breakdown: stats.breakdown,
            categoryBreakdown: stats.categoryBreakdown,
            storageUsed: this.formatFileSize(stats.totalSize),
            brandAssets: stats.brandAssets,
          },
          priority: 90,
        });
      }

      // Get brand assets
      if (includeBrandAssets) {
        const brandAssets = await mediaAssetService.searchAssets(userId, organizationId, {
          isBrandAsset: true,
          sortBy: 'updatedAt',
          sortOrder: 'desc',
          limit,
        });

        if (brandAssets.length > 0) {
          contexts.push({
            type: 'brand_assets',
            title: 'Brand Asset Library',
            data: {
              count: brandAssets.length,
              assets: brandAssets.map(asset => ({
                id: asset.id,
                title: asset.title,
                type: asset.type,
                brandAssetType: asset.brandAssetType,
                url: asset.url,
                tags: asset.tags,
                usageCount: asset.usageCount,
              })),
              types: this.groupBy(brandAssets, 'brandAssetType'),
            },
            priority: 85,
          });
        }
      }

      // Get recent uploads
      if (includeRecentUploads) {
        const recentAssets = await mediaAssetService.searchAssets(userId, organizationId, {
          sortBy: 'createdAt',
          sortOrder: 'desc',
          limit,
        });

        if (recentAssets.length > 0) {
          contexts.push({
            type: 'recent_uploads',
            title: 'Recent Uploads',
            data: {
              count: recentAssets.length,
              assets: recentAssets.map(asset => ({
                id: asset.id,
                title: asset.title,
                type: asset.type,
                category: asset.category,
                uploadedAt: asset.createdAt,
                size: this.formatFileSize(asset.fileSize),
                tags: asset.tags,
              })),
            },
            priority: 75,
          });
        }
      }

      // Get popular/frequently used assets
      if (includePopularAssets) {
        const allAssets = await mediaAssetService.searchAssets(userId, organizationId, {
          sortBy: 'usageCount',
          sortOrder: 'desc',
          limit,
        });

        const popularAssets = allAssets.filter(a => (a.usageCount || 0) > 0);

        if (popularAssets.length > 0) {
          contexts.push({
            type: 'popular_assets',
            title: 'Most Used Assets',
            data: {
              count: popularAssets.length,
              assets: popularAssets.map(asset => ({
                id: asset.id,
                title: asset.title,
                type: asset.type,
                category: asset.category,
                usageCount: asset.usageCount,
                tags: asset.tags,
              })),
            },
            priority: 70,
          });
        }
      }

      // Generate recommendations
      if (includeRecommendations) {
        const recommendations = await this.generateRecommendations(userId, organizationId);
        if (recommendations.length > 0) {
          contexts.push({
            type: 'recommendations',
            title: 'Media Recommendations',
            data: {
              recommendations,
            },
            priority: 60,
          });
        }
      }

      // Sort by priority (highest first)
      return contexts.sort((a, b) => b.priority - a.priority);
    } catch (error) {
      console.error('Error building media context:', error);
      return [];
    }
  }

  /**
   * Format media context for AI chat
   */
  formatMediaContextForAI(contexts: MediaContextItem[]): string {
    if (contexts.length === 0) {
      return '';
    }

    let formatted = '=== MEDIA LIBRARY CONTEXT ===\n\n';

    for (const context of contexts) {
      formatted += `## ${context.title}\n\n`;

      switch (context.type) {
        case 'overview':
          formatted += `Total Assets: ${context.data.totalAssets}\n`;
          formatted += `Storage Used: ${context.data.storageUsed}\n`;
          formatted += `Brand Assets: ${context.data.brandAssets}\n\n`;

          if (context.data.breakdown) {
            formatted += 'Asset Types:\n';
            Object.entries(context.data.breakdown).forEach(([type, count]) => {
              formatted += `  - ${type}: ${count}\n`;
            });
            formatted += '\n';
          }

          if (context.data.categoryBreakdown) {
            formatted += 'Categories:\n';
            Object.entries(context.data.categoryBreakdown).forEach(([category, count]) => {
              formatted += `  - ${category}: ${count}\n`;
            });
            formatted += '\n';
          }
          break;

        case 'brand_assets':
          formatted += `Available Brand Assets: ${context.data.count}\n\n`;
          if (context.data.types) {
            formatted += 'Brand Asset Types:\n';
            Object.entries(context.data.types).forEach(([type, assets]: [string, any]) => {
              formatted += `  - ${type}: ${assets.length} asset(s)\n`;
            });
            formatted += '\n';
          }
          formatted += 'Sample Brand Assets:\n';
          context.data.assets.slice(0, 5).forEach((asset: any) => {
            formatted += `  - ${asset.title} (${asset.type}${asset.brandAssetType ? `, ${asset.brandAssetType}` : ''})\n`;
            formatted += `    Used ${asset.usageCount || 0} times\n`;
            if (asset.tags && asset.tags.length > 0) {
              formatted += `    Tags: ${asset.tags.join(', ')}\n`;
            }
          });
          formatted += '\n';
          break;

        case 'recent_uploads':
          formatted += `Recent Uploads (${context.data.count}):\n`;
          context.data.assets.slice(0, 5).forEach((asset: any) => {
            formatted += `  - ${asset.title} (${asset.type}, ${asset.size})\n`;
            formatted += `    Category: ${asset.category || 'uncategorized'}\n`;
            if (asset.tags && asset.tags.length > 0) {
              formatted += `    Tags: ${asset.tags.join(', ')}\n`;
            }
          });
          formatted += '\n';
          break;

        case 'popular_assets':
          formatted += `Most Used Assets (${context.data.count}):\n`;
          context.data.assets.slice(0, 5).forEach((asset: any) => {
            formatted += `  - ${asset.title} (${asset.type})\n`;
            formatted += `    Used ${asset.usageCount} times\n`;
            if (asset.tags && asset.tags.length > 0) {
              formatted += `    Tags: ${asset.tags.join(', ')}\n`;
            }
          });
          formatted += '\n';
          break;

        case 'recommendations':
          formatted += 'Recommendations:\n';
          context.data.recommendations.forEach((rec: string) => {
            formatted += `  - ${rec}\n`;
          });
          formatted += '\n';
          break;
      }
    }

    formatted += '=== END MEDIA LIBRARY CONTEXT ===\n';
    return formatted;
  }

  /**
   * Generate media recommendations based on library state
   */
  private async generateRecommendations(
    userId: string,
    organizationId: string
  ): Promise<string[]> {
    const recommendations: string[] = [];

    try {
      const stats = await mediaAssetService.getAssetStats(userId, organizationId);

      // Check for missing asset types
      if (!stats.breakdown[MediaType.IMAGE] || stats.breakdown[MediaType.IMAGE] === 0) {
        recommendations.push('Consider uploading images for your social media posts');
      }

      if (!stats.breakdown[MediaType.VIDEO] || stats.breakdown[MediaType.VIDEO] === 0) {
        recommendations.push('Video content performs well on social media - consider adding videos to your library');
      }

      // Check for brand assets
      if (stats.brandAssets === 0) {
        recommendations.push('Upload brand assets (logos, fonts, colors) for consistent branding across posts');
      }

      // Check for uncategorized assets
      const allAssets = await mediaAssetService.searchAssets(userId, organizationId, {
        limit: 100,
      });

      const uncategorized = allAssets.filter(a => !a.category || !a.tags || a.tags.length === 0);
      if (uncategorized.length > 5) {
        recommendations.push(`${uncategorized.length} assets are missing categories or tags - add them for better organization`);
      }

      // Check for unused assets
      const unused = allAssets.filter(a => (a.usageCount || 0) === 0);
      if (unused.length > 10) {
        recommendations.push(`You have ${unused.length} unused assets - consider incorporating them into your content strategy`);
      }

      // Storage recommendations
      const storageUsedMB = stats.totalSize / (1024 * 1024);
      if (storageUsedMB > 100) {
        recommendations.push('Your media library is growing - consider archiving old or unused assets to save storage');
      }

      return recommendations;
    } catch (error) {
      console.error('Error generating recommendations:', error);
      return [];
    }
  }

  /**
   * Get media context summary for quick reference
   */
  async getMediaContextSummary(userId: string, organizationId: string): Promise<string> {
    try {
      const stats = await mediaAssetService.getAssetStats(userId, organizationId);

      return `Your media library contains ${stats.totalAssets} assets (${this.formatFileSize(stats.totalSize)}), including ${stats.brandAssets} brand assets.`;
    } catch (error) {
      console.error('Error getting media context summary:', error);
      return 'Unable to access media library information.';
    }
  }

  /**
   * Format file size to human-readable format
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  /**
   * Group items by property
   */
  private groupBy<T>(items: T[], key: keyof T): Record<string, T[]> {
    return items.reduce((groups, item) => {
      const value = String(item[key] || 'uncategorized');
      if (!groups[value]) {
        groups[value] = [];
      }
      groups[value].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  }
}

// Export singleton instance
export const mediaContextProvider = new MediaContextProvider();
