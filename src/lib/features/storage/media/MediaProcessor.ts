import { ProcessingOptions, StorageError, StorageErrorType } from '../types';
import { Logger } from '../../logging';

export class MediaProcessor {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('MediaProcessor');
  }

  async processFile(
    file: File | Buffer,
    options: ProcessingOptions
  ): Promise<File | Buffer> {
    try {
      this.logger.info('Starting media processing', { options });

      let processedFile = file;

      // Convert to buffer if needed
      let buffer: Buffer;
      let originalMimeType: string;

      if (file instanceof File) {
        buffer = Buffer.from(await file.arrayBuffer());
        originalMimeType = file.type;
      } else {
        buffer = file;
        originalMimeType = 'application/octet-stream';
      }

      // Process based on file type
      if (originalMimeType.startsWith('image/')) {
        processedFile = await this.processImage(buffer, options, originalMimeType);
      } else if (originalMimeType.startsWith('video/')) {
        processedFile = await this.processVideo(buffer, options, originalMimeType);
      } else if (originalMimeType.startsWith('audio/')) {
        processedFile = await this.processAudio(buffer, options, originalMimeType);
      } else {
        // For non-media files, just apply basic processing
        processedFile = await this.processDocument(buffer, options, originalMimeType);
      }

      this.logger.info('Media processing completed successfully');
      return processedFile;
    } catch (error) {
      this.logger.error('Media processing failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw new StorageError(
        StorageErrorType.PROCESSING_FAILED,
        'Failed to process media file'
      );
    }
  }

  private async processImage(
    buffer: Buffer,
    options: ProcessingOptions,
    mimeType: string
  ): Promise<Buffer> {
    try {
      // For now, we'll implement basic processing using Canvas API
      // In a production environment, you might want to use a more robust solution
      
      if (!options.resize && !options.compress && !options.format) {
        return buffer;
      }

      // Create image from buffer
      const blob = new Blob([buffer], { type: mimeType });
      const imageUrl = URL.createObjectURL(blob);
      
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
              throw new Error('Could not get canvas context');
            }

            let { width, height } = this.calculateDimensions(
              img.width,
              img.height,
              options.resize
            );

            canvas.width = width;
            canvas.height = height;

            // Apply filters if specified
            if (options.filters) {
              ctx.filter = this.buildCanvasFilter(options.filters);
            }

            // Draw the image
            ctx.drawImage(img, 0, 0, width, height);

            // Convert to blob
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  reject(new Error('Failed to convert canvas to blob'));
                  return;
                }

                blob.arrayBuffer().then(arrayBuffer => {
                  URL.revokeObjectURL(imageUrl);
                  resolve(Buffer.from(arrayBuffer));
                }).catch(reject);
              },
              this.getOutputFormat(options.format, mimeType),
              this.getQuality(options.compress?.quality)
            );
          } catch (error) {
            URL.revokeObjectURL(imageUrl);
            reject(error);
          }
        };
        
        img.onerror = () => {
          URL.revokeObjectURL(imageUrl);
          reject(new Error('Failed to load image'));
        };
        
        img.src = imageUrl;
      });
    } catch (error) {
      this.logger.error('Image processing failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  private async processVideo(
    buffer: Buffer,
    options: ProcessingOptions,
    mimeType: string
  ): Promise<Buffer> {
    // Video processing is complex and typically requires server-side tools
    // For now, we'll return the original buffer
    // In production, you might use FFmpeg or similar tools
    
    this.logger.warn('Video processing not implemented, returning original file');
    return buffer;
  }

  private async processAudio(
    buffer: Buffer,
    options: ProcessingOptions,
    mimeType: string
  ): Promise<Buffer> {
    // Audio processing is complex and typically requires server-side tools
    // For now, we'll return the original buffer
    
    this.logger.warn('Audio processing not implemented, returning original file');
    return buffer;
  }

  private async processDocument(
    buffer: Buffer,
    options: ProcessingOptions,
    mimeType: string
  ): Promise<Buffer> {
    // Document processing might include PDF optimization, compression, etc.
    // For now, we'll return the original buffer
    
    this.logger.warn('Document processing not implemented, returning original file');
    return buffer;
  }

  private calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    resize?: {
      width?: number;
      height?: number;
      fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
    }
  ): { width: number; height: number } {
    if (!resize) {
      return { width: originalWidth, height: originalHeight };
    }

    const { width: targetWidth, height: targetHeight, fit = 'contain' } = resize;

    if (!targetWidth && !targetHeight) {
      return { width: originalWidth, height: originalHeight };
    }

    if (targetWidth && targetHeight) {
      switch (fit) {
        case 'fill':
          return { width: targetWidth, height: targetHeight };
        
        case 'contain': {
          const ratio = Math.min(targetWidth / originalWidth, targetHeight / originalHeight);
          return {
            width: Math.round(originalWidth * ratio),
            height: Math.round(originalHeight * ratio)
          };
        }
        
        case 'cover': {
          const ratio = Math.max(targetWidth / originalWidth, targetHeight / originalHeight);
          return {
            width: Math.round(originalWidth * ratio),
            height: Math.round(originalHeight * ratio)
          };
        }
        
        default:
          return { width: targetWidth, height: targetHeight };
      }
    }

    if (targetWidth) {
      const ratio = targetWidth / originalWidth;
      return {
        width: targetWidth,
        height: Math.round(originalHeight * ratio)
      };
    }

    if (targetHeight) {
      const ratio = targetHeight / originalHeight;
      return {
        width: Math.round(originalWidth * ratio),
        height: targetHeight
      };
    }

    return { width: originalWidth, height: originalHeight };
  }

  private buildCanvasFilter(filters: any): string {
    const filterParts: string[] = [];

    if (filters.blur) {
      filterParts.push(`blur(${filters.blur}px)`);
    }

    if (filters.brightness) {
      filterParts.push(`brightness(${filters.brightness}%)`);
    }

    if (filters.contrast) {
      filterParts.push(`contrast(${filters.contrast}%)`);
    }

    if (filters.saturation) {
      filterParts.push(`saturate(${filters.saturation}%)`);
    }

    if (filters.sepia) {
      filterParts.push('sepia(100%)');
    }

    if (filters.grayscale) {
      filterParts.push('grayscale(100%)');
    }

    return filterParts.join(' ') || 'none';
  }

  private getOutputFormat(format?: string, originalMimeType?: string): string {
    if (format) {
      switch (format.toLowerCase()) {
        case 'jpeg':
        case 'jpg':
          return 'image/jpeg';
        case 'png':
          return 'image/png';
        case 'webp':
          return 'image/webp';
        case 'gif':
          return 'image/gif';
        default:
          return originalMimeType || 'image/jpeg';
      }
    }

    return originalMimeType || 'image/jpeg';
  }

  private getQuality(quality?: number): number {
    if (quality !== undefined) {
      return Math.max(0.1, Math.min(1.0, quality / 100));
    }
    return 0.9; // Default quality
  }

  // Utility methods for metadata extraction
  async extractImageMetadata(buffer: Buffer, mimeType: string): Promise<{
    width: number;
    height: number;
    format: string;
    size: number;
    colorSpace?: string;
    hasAlpha?: boolean;
  }> {
    try {
      const blob = new Blob([buffer], { type: mimeType });
      const imageUrl = URL.createObjectURL(blob);

      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          URL.revokeObjectURL(imageUrl);
          resolve({
            width: img.width,
            height: img.height,
            format: mimeType.split('/')[1] || 'unknown',
            size: buffer.length,
            colorSpace: 'sRGB', // Default assumption
            hasAlpha: mimeType === 'image/png' || mimeType === 'image/gif'
          });
        };
        
        img.onerror = () => {
          URL.revokeObjectURL(imageUrl);
          reject(new Error('Failed to load image for metadata extraction'));
        };
        
        img.src = imageUrl;
      });
    } catch (error) {
      this.logger.error('Failed to extract image metadata', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw new StorageError(
        StorageErrorType.PROCESSING_FAILED,
        'Failed to extract image metadata'
      );
    }
  }

  async generateThumbnail(
    buffer: Buffer,
    mimeType: string,
    size: { width: number; height: number } = { width: 200, height: 200 }
  ): Promise<Buffer> {
    try {
      return await this.processImage(buffer, {
        resize: {
          width: size.width,
          height: size.height,
          fit: 'cover'
        },
        compress: {
          quality: 80
        },
        format: 'jpeg'
      }, mimeType);
    } catch (error) {
      this.logger.error('Failed to generate thumbnail', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw new StorageError(
        StorageErrorType.PROCESSING_FAILED,
        'Failed to generate thumbnail'
      );
    }
  }

  async optimizeForWeb(buffer: Buffer, mimeType: string): Promise<Buffer> {
    try {
      // Optimize image for web delivery
      return await this.processImage(buffer, {
        compress: {
          quality: 85
        },
        format: 'webp' // Use WebP for better compression
      }, mimeType);
    } catch (error) {
      this.logger.error('Failed to optimize for web', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw new StorageError(
        StorageErrorType.PROCESSING_FAILED,
        'Failed to optimize for web'
      );
    }
  }
}

export default MediaProcessor; 