// Storage Validation Utilities
// Production-ready validation utilities for storage operations

import { StorageFileType, FileMetadata, ValidationConfig } from '../types';

export class ValidationUtils {
  /**
   * Validate file against configuration rules
   */
  static async validateFile(
    file: File | Buffer,
    metadata: FileMetadata,
    config: ValidationConfig
  ): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Check file size
    if (metadata.size > config.maxFileSize) {
      errors.push(`File size ${this.formatFileSize(metadata.size)} exceeds maximum allowed size ${this.formatFileSize(config.maxFileSize)}`);
    }

    // Check MIME type
    if (!config.allowedMimeTypes.includes(metadata.mimeType)) {
      errors.push(`File type ${metadata.mimeType} is not allowed`);
    }

    // Check file extension
    const extension = this.getFileExtension(metadata.filename);
    if (!config.allowedExtensions.includes(extension.toLowerCase())) {
      errors.push(`File extension ${extension} is not allowed`);
    }

    // Check dimensions if specified
    if (config.checkDimensions && metadata.dimensions) {
      const { width, height } = metadata.dimensions;
      const { minWidth, minHeight, maxWidth, maxHeight } = config.checkDimensions;

      if (minWidth && width < minWidth) {
        errors.push(`Image width ${width}px is below minimum ${minWidth}px`);
      }

      if (minHeight && height < minHeight) {
        errors.push(`Image height ${height}px is below minimum ${minHeight}px`);
      }

      if (maxWidth && width > maxWidth) {
        errors.push(`Image width ${width}px exceeds maximum ${maxWidth}px`);
      }

      if (maxHeight && height > maxHeight) {
        errors.push(`Image height ${height}px exceeds maximum ${maxHeight}px`);
      }
    }

    // Run custom validators if provided
    if (config.customValidators) {
      for (const validator of config.customValidators) {
        try {
          const isValid = await validator(file, metadata);
          if (!isValid) {
            errors.push('Custom validation failed');
          }
        } catch (error) {
          errors.push(`Custom validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate filename for safety
   */
  static validateFilename(filename: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for empty filename
    if (!filename || filename.trim().length === 0) {
      errors.push('Filename cannot be empty');
    }

    // Check for dangerous characters
    const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/;
    if (dangerousChars.test(filename)) {
      errors.push('Filename contains invalid characters');
    }

    // Check for reserved names (Windows)
    const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
    const nameWithoutExt = filename.split('.')[0].toUpperCase();
    if (reservedNames.includes(nameWithoutExt)) {
      errors.push('Filename uses a reserved name');
    }

    // Check length
    if (filename.length > 255) {
      errors.push('Filename is too long (maximum 255 characters)');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Sanitize filename for safe storage
   */
  static sanitizeFilename(filename: string): string {
    // Remove dangerous characters
    let sanitized = filename.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
    
    // Remove leading/trailing dots and spaces
    sanitized = sanitized.replace(/^[.\s]+|[.\s]+$/g, '');
    
    // Ensure it's not empty
    if (sanitized.length === 0) {
      sanitized = 'file';
    }
    
    // Truncate if too long
    if (sanitized.length > 255) {
      const extension = this.getFileExtension(sanitized);
      const nameWithoutExt = sanitized.substring(0, sanitized.lastIndexOf('.'));
      const maxNameLength = 255 - extension.length;
      sanitized = nameWithoutExt.substring(0, maxNameLength) + extension;
    }
    
    return sanitized;
  }

  /**
   * Check if file is an image
   */
  static isImageFile(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  /**
   * Check if file is a video
   */
  static isVideoFile(mimeType: string): boolean {
    return mimeType.startsWith('video/');
  }

  /**
   * Check if file is audio
   */
  static isAudioFile(mimeType: string): boolean {
    return mimeType.startsWith('audio/');
  }

  /**
   * Get file type from MIME type
   */
  static getFileTypeFromMimeType(mimeType: string): StorageFileType {
    if (this.isImageFile(mimeType)) {
      return StorageFileType.IMAGE;
    }
    
    if (this.isVideoFile(mimeType)) {
      return StorageFileType.VIDEO;
    }
    
    if (this.isAudioFile(mimeType)) {
      return StorageFileType.AUDIO;
    }
    
    if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) {
      return StorageFileType.DOCUMENT;
    }
    
    if (mimeType.includes('zip') || mimeType.includes('archive') || mimeType.includes('compressed')) {
      return StorageFileType.ARCHIVE;
    }
    
    return StorageFileType.OTHER;
  }

  /**
   * Get file extension from filename
   */
  static getFileExtension(filename: string): string {
    const lastDotIndex = filename.lastIndexOf('.');
    return lastDotIndex !== -1 ? filename.substring(lastDotIndex) : '';
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
   * Generate secure filename with timestamp
   */
  static generateSecureFilename(originalName: string, timestamp?: Date): string {
    const sanitized = this.sanitizeFilename(originalName);
    const extension = this.getFileExtension(sanitized);
    const nameWithoutExt = sanitized.substring(0, sanitized.lastIndexOf('.')) || sanitized;
    const time = timestamp || new Date();
    const timeString = time.toISOString().replace(/[:.]/g, '-');
    
    return `${nameWithoutExt}_${timeString}${extension}`;
  }

  /**
   * Validate URL format
   */
  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if file appears to be malicious based on content
   */
  static async scanForMaliciousContent(buffer: Buffer, filename: string): Promise<{
    isSafe: boolean;
    threats: string[];
  }> {
    const threats: string[] = [];
    
    // Basic checks for suspicious patterns
    const content = buffer.toString('utf8', 0, Math.min(buffer.length, 1024));
    
    // Check for script tags in files that shouldn't have them
    if (!this.isImageFile(this.getMimeTypeFromExtension(filename))) {
      if (content.includes('<script') || content.includes('javascript:')) {
        threats.push('Suspicious script content detected');
      }
    }
    
    // Check for executable signatures
    const executableSignatures = [
      Buffer.from([0x4D, 0x5A]), // PE executable
      Buffer.from([0x7F, 0x45, 0x4C, 0x46]), // ELF executable
      Buffer.from([0xFE, 0xED, 0xFA, 0xCE]), // Mach-O executable
    ];
    
    for (const signature of executableSignatures) {
      if (buffer.subarray(0, signature.length).equals(signature)) {
        threats.push('Executable file detected');
        break;
      }
    }
    
    return {
      isSafe: threats.length === 0,
      threats
    };
  }

  /**
   * Get MIME type from file extension
   */
  private static getMimeTypeFromExtension(filename: string): string {
    const extension = this.getFileExtension(filename).toLowerCase();
    
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.txt': 'text/plain',
      '.zip': 'application/zip',
      '.rar': 'application/x-rar-compressed',
      '.7z': 'application/x-7z-compressed'
    };
    
    return mimeTypes[extension] || 'application/octet-stream';
  }
} 