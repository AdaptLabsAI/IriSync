/**
 * Image Optimization Service
 *
 * Optimizes images for different social media platforms.
 * Handles resizing, compression, format conversion, and quality adjustments.
 *
 * Platform Requirements:
 * - Instagram: 1080x1080 (square), 1080x1350 (portrait), 1080x566 (landscape)
 * - Twitter: 1200x675 (16:9), 1200x1200 (square)
 * - Facebook: 1200x630 (recommended), supports various sizes
 * - LinkedIn: 1200x627 (recommended)
 * - TikTok: 1080x1920 (9:16 vertical)
 * - YouTube: 1280x720 (thumbnail)
 */

import { PlatformType } from '@/lib/features/platforms/PlatformProvider';

/**
 * Platform image specifications
 */
export interface PlatformImageSpec {
  platform: PlatformType;
  type: 'post' | 'story' | 'cover' | 'profile' | 'thumbnail';
  width: number;
  height: number;
  aspectRatio: string;
  maxFileSize: number; // in bytes
  recommendedFormat: 'jpg' | 'png' | 'webp';
  quality: number; // 0-100
}

/**
 * Platform specifications
 */
export const PLATFORM_IMAGE_SPECS: Record<string, PlatformImageSpec> = {
  // Instagram
  'instagram_square': {
    platform: PlatformType.INSTAGRAM,
    type: 'post',
    width: 1080,
    height: 1080,
    aspectRatio: '1:1',
    maxFileSize: 8 * 1024 * 1024, // 8MB
    recommendedFormat: 'jpg',
    quality: 85,
  },
  'instagram_portrait': {
    platform: PlatformType.INSTAGRAM,
    type: 'post',
    width: 1080,
    height: 1350,
    aspectRatio: '4:5',
    maxFileSize: 8 * 1024 * 1024,
    recommendedFormat: 'jpg',
    quality: 85,
  },
  'instagram_landscape': {
    platform: PlatformType.INSTAGRAM,
    type: 'post',
    width: 1080,
    height: 566,
    aspectRatio: '1.91:1',
    maxFileSize: 8 * 1024 * 1024,
    recommendedFormat: 'jpg',
    quality: 85,
  },
  'instagram_story': {
    platform: PlatformType.INSTAGRAM,
    type: 'story',
    width: 1080,
    height: 1920,
    aspectRatio: '9:16',
    maxFileSize: 8 * 1024 * 1024,
    recommendedFormat: 'jpg',
    quality: 85,
  },

  // Twitter
  'twitter_post': {
    platform: PlatformType.TWITTER,
    type: 'post',
    width: 1200,
    height: 675,
    aspectRatio: '16:9',
    maxFileSize: 5 * 1024 * 1024, // 5MB
    recommendedFormat: 'jpg',
    quality: 80,
  },
  'twitter_square': {
    platform: PlatformType.TWITTER,
    type: 'post',
    width: 1200,
    height: 1200,
    aspectRatio: '1:1',
    maxFileSize: 5 * 1024 * 1024,
    recommendedFormat: 'jpg',
    quality: 80,
  },

  // Facebook
  'facebook_post': {
    platform: PlatformType.FACEBOOK,
    type: 'post',
    width: 1200,
    height: 630,
    aspectRatio: '1.91:1',
    maxFileSize: 10 * 1024 * 1024, // 10MB
    recommendedFormat: 'jpg',
    quality: 85,
  },
  'facebook_cover': {
    platform: PlatformType.FACEBOOK,
    type: 'cover',
    width: 820,
    height: 312,
    aspectRatio: '2.63:1',
    maxFileSize: 10 * 1024 * 1024,
    recommendedFormat: 'jpg',
    quality: 85,
  },

  // LinkedIn
  'linkedin_post': {
    platform: PlatformType.LINKEDIN,
    type: 'post',
    width: 1200,
    height: 627,
    aspectRatio: '1.91:1',
    maxFileSize: 10 * 1024 * 1024,
    recommendedFormat: 'jpg',
    quality: 85,
  },

  // TikTok
  'tiktok_post': {
    platform: PlatformType.TIKTOK,
    type: 'post',
    width: 1080,
    height: 1920,
    aspectRatio: '9:16',
    maxFileSize: 10 * 1024 * 1024,
    recommendedFormat: 'jpg',
    quality: 85,
  },

  // YouTube
  'youtube_thumbnail': {
    platform: PlatformType.YOUTUBE,
    type: 'thumbnail',
    width: 1280,
    height: 720,
    aspectRatio: '16:9',
    maxFileSize: 2 * 1024 * 1024, // 2MB
    recommendedFormat: 'jpg',
    quality: 90,
  },
};

/**
 * Optimization options
 */
export interface OptimizationOptions {
  targetPlatform: PlatformType;
  targetType?: 'post' | 'story' | 'cover' | 'profile' | 'thumbnail';
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-100
  format?: 'jpg' | 'png' | 'webp';
  maintainAspectRatio?: boolean;
}

/**
 * Optimization result
 */
export interface OptimizationResult {
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number; // Percentage
  dimensions: {
    width: number;
    height: number;
  };
  format: string;
  optimizedDataUrl?: string; // Base64 data URL for preview
  recommendations: string[];
}

class ImageOptimizationService {
  /**
   * Get recommended spec for platform and type
   */
  getRecommendedSpec(
    platform: PlatformType,
    type: 'post' | 'story' | 'cover' | 'profile' | 'thumbnail' = 'post'
  ): PlatformImageSpec | null {
    const key = `${platform.toLowerCase()}_${type}`;
    return PLATFORM_IMAGE_SPECS[key] || null;
  }

  /**
   * Get all specs for a platform
   */
  getPlatformSpecs(platform: PlatformType): PlatformImageSpec[] {
    return Object.values(PLATFORM_IMAGE_SPECS).filter(
      spec => spec.platform === platform
    );
  }

  /**
   * Calculate dimensions maintaining aspect ratio
   */
  calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    targetWidth: number,
    targetHeight: number,
    maintainAspectRatio: boolean = true
  ): { width: number; height: number } {
    if (!maintainAspectRatio) {
      return { width: targetWidth, height: targetHeight };
    }

    const aspectRatio = originalWidth / originalHeight;
    const targetAspectRatio = targetWidth / targetHeight;

    let width: number;
    let height: number;

    if (aspectRatio > targetAspectRatio) {
      // Original is wider
      width = targetWidth;
      height = Math.round(targetWidth / aspectRatio);
    } else {
      // Original is taller
      height = targetHeight;
      width = Math.round(targetHeight * aspectRatio);
    }

    return { width, height };
  }

  /**
   * Optimize image for platform (client-side using Canvas API)
   * Note: This is a placeholder - actual implementation would use Canvas API or sharp library
   */
  async optimizeForPlatform(
    file: File,
    options: OptimizationOptions
  ): Promise<OptimizationResult> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const img = new Image();

          img.onload = () => {
            // Get platform spec
            const spec = this.getRecommendedSpec(
              options.targetPlatform,
              options.targetType
            );

            if (!spec) {
              reject(new Error('Platform specification not found'));
              return;
            }

            // Calculate target dimensions
            const targetDimensions = this.calculateDimensions(
              img.width,
              img.height,
              options.maxWidth || spec.width,
              options.maxHeight || spec.height,
              options.maintainAspectRatio !== false
            );

            // Create canvas
            const canvas = document.createElement('canvas');
            canvas.width = targetDimensions.width;
            canvas.height = targetDimensions.height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error('Failed to get canvas context'));
              return;
            }

            // Draw and scale image
            ctx.drawImage(
              img,
              0,
              0,
              targetDimensions.width,
              targetDimensions.height
            );

            // Convert to desired format
            const quality = (options.quality || spec.quality) / 100;
            const format = options.format || spec.recommendedFormat;
            const mimeType = `image/${format === 'jpg' ? 'jpeg' : format}`;

            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  reject(new Error('Failed to create blob'));
                  return;
                }

                const optimizedSize = blob.size;
                const compressionRatio =
                  ((file.size - optimizedSize) / file.size) * 100;

                // Generate recommendations
                const recommendations: string[] = [];

                if (optimizedSize > spec.maxFileSize) {
                  recommendations.push(
                    `File size (${(optimizedSize / 1024 / 1024).toFixed(2)}MB) exceeds platform maximum (${(spec.maxFileSize / 1024 / 1024).toFixed(2)}MB). Consider reducing quality.`
                  );
                }

                if (
                  targetDimensions.width !== spec.width ||
                  targetDimensions.height !== spec.height
                ) {
                  recommendations.push(
                    `Dimensions (${targetDimensions.width}x${targetDimensions.height}) don't match recommended (${spec.width}x${spec.height}). Image may be cropped or letterboxed.`
                  );
                }

                // Convert blob to data URL for preview
                const dataUrlReader = new FileReader();
                dataUrlReader.onload = () => {
                  resolve({
                    originalSize: file.size,
                    optimizedSize,
                    compressionRatio,
                    dimensions: targetDimensions,
                    format: format,
                    optimizedDataUrl: dataUrlReader.result as string,
                    recommendations,
                  });
                };
                dataUrlReader.readAsDataURL(blob);
              },
              mimeType,
              quality
            );
          };

          img.onerror = () => {
            reject(new Error('Failed to load image'));
          };

          img.src = e.target?.result as string;
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsDataURL(file);
    });
  }

  /**
   * Batch optimize images for multiple platforms
   */
  async optimizeForMultiplePlatforms(
    file: File,
    platforms: PlatformType[]
  ): Promise<Record<PlatformType, OptimizationResult>> {
    const results: Record<string, OptimizationResult> = {};

    for (const platform of platforms) {
      try {
        const result = await this.optimizeForPlatform(file, {
          targetPlatform: platform,
        });
        results[platform] = result;
      } catch (error) {
        console.error(`Error optimizing for ${platform}:`, error);
      }
    }

    return results as Record<PlatformType, OptimizationResult>;
  }

  /**
   * Validate image meets platform requirements
   */
  validateForPlatform(
    width: number,
    height: number,
    fileSize: number,
    platform: PlatformType,
    type: 'post' | 'story' | 'cover' | 'profile' | 'thumbnail' = 'post'
  ): { valid: boolean; warnings: string[]; errors: string[] } {
    const spec = this.getRecommendedSpec(platform, type);
    const warnings: string[] = [];
    const errors: string[] = [];

    if (!spec) {
      errors.push('Platform specification not found');
      return { valid: false, warnings, errors };
    }

    // Check file size
    if (fileSize > spec.maxFileSize) {
      errors.push(
        `File size (${(fileSize / 1024 / 1024).toFixed(2)}MB) exceeds platform maximum (${(spec.maxFileSize / 1024 / 1024).toFixed(2)}MB)`
      );
    }

    // Check dimensions (allow some tolerance)
    const widthDiff = Math.abs(width - spec.width);
    const heightDiff = Math.abs(height - spec.height);

    if (widthDiff > 50 || heightDiff > 50) {
      warnings.push(
        `Dimensions (${width}x${height}) don't match recommended (${spec.width}x${spec.height})`
      );
    }

    // Check aspect ratio
    const actualRatio = width / height;
    const specRatioParts = spec.aspectRatio.split(':').map(Number);
    const specRatio = specRatioParts[0] / specRatioParts[1];

    if (Math.abs(actualRatio - specRatio) > 0.1) {
      warnings.push(
        `Aspect ratio (${actualRatio.toFixed(2)}:1) doesn't match recommended (${spec.aspectRatio})`
      );
    }

    return {
      valid: errors.length === 0,
      warnings,
      errors,
    };
  }

  /**
   * Get optimization suggestions
   */
  getOptimizationSuggestions(
    width: number,
    height: number,
    fileSize: number,
    platform: PlatformType
  ): string[] {
    const suggestions: string[] = [];
    const spec = this.getRecommendedSpec(platform);

    if (!spec) {
      return suggestions;
    }

    // Size suggestions
    if (fileSize > spec.maxFileSize) {
      suggestions.push(
        `Reduce file size to under ${(spec.maxFileSize / 1024 / 1024).toFixed(0)}MB`
      );
    }

    // Dimension suggestions
    if (width > spec.width * 1.5 || height > spec.height * 1.5) {
      suggestions.push(
        `Resize to ${spec.width}x${spec.height} for optimal performance`
      );
    }

    // Format suggestions
    if (platform === PlatformType.INSTAGRAM) {
      suggestions.push('Use JPG format with 85% quality for best results');
    } else if (platform === PlatformType.FACEBOOK) {
      suggestions.push('Use JPG or PNG format');
    }

    // Quality suggestions
    if (fileSize > spec.maxFileSize / 2) {
      suggestions.push(
        `Consider reducing quality to ${spec.quality - 10}% to reduce file size`
      );
    }

    return suggestions;
  }

  /**
   * Estimate optimized file size
   */
  estimateOptimizedSize(
    originalSize: number,
    originalWidth: number,
    originalHeight: number,
    targetWidth: number,
    targetHeight: number,
    quality: number = 85
  ): number {
    // Simple estimation based on dimension reduction and quality
    const dimensionRatio =
      (targetWidth * targetHeight) / (originalWidth * originalHeight);
    const qualityFactor = quality / 100;

    return Math.round(originalSize * dimensionRatio * qualityFactor);
  }
}

// Export singleton instance
export const imageOptimizationService = new ImageOptimizationService();
