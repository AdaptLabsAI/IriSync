// Storage Security Utilities
// Production-ready security utilities for storage operations

import { StorageError, StorageErrorType } from '../types';
import { Logger } from '../../logging';
import { encrypt, decrypt } from '../../security/encryption';

export class SecurityUtils {
  private static logger = new Logger('SecurityUtils');

  /**
   * Sanitize file path to prevent directory traversal
   */
  static sanitizePath(path: string): string {
    // Remove any path traversal attempts
    let sanitized = path.replace(/\.\./g, '');
    
    // Remove leading slashes
    sanitized = sanitized.replace(/^\/+/, '');
    
    // Replace multiple slashes with single slash
    sanitized = sanitized.replace(/\/+/g, '/');
    
    // Remove any null bytes
    sanitized = sanitized.replace(/\0/g, '');
    
    return sanitized;
  }

  /**
   * Validate file signature against MIME type
   */
  static async validateFileSignature(buffer: Buffer, expectedMimeType: string): Promise<boolean> {
    if (buffer.length < 4) {
      return false;
    }

    const signatures: Record<string, Buffer[]> = {
      'image/jpeg': [
        Buffer.from([0xFF, 0xD8, 0xFF]),
      ],
      'image/png': [
        Buffer.from([0x89, 0x50, 0x4E, 0x47]),
      ],
      'image/gif': [
        Buffer.from([0x47, 0x49, 0x46, 0x38]),
      ],
      'image/webp': [
        Buffer.from([0x52, 0x49, 0x46, 0x46]),
      ],
      'application/pdf': [
        Buffer.from([0x25, 0x50, 0x44, 0x46]),
      ],
      'video/mp4': [
        Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70]),
        Buffer.from([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70]),
      ],
      'audio/mp3': [
        Buffer.from([0x49, 0x44, 0x33]), // ID3
        Buffer.from([0xFF, 0xFB]), // MP3 frame
      ]
    };

    const expectedSignatures = signatures[expectedMimeType];
    if (!expectedSignatures) {
      // If we don't have signatures for this type, allow it
      return true;
    }

    return expectedSignatures.some(signature => 
      buffer.subarray(0, signature.length).equals(signature)
    );
  }

  /**
   * Check for malicious file content
   */
  static async scanForMalware(buffer: Buffer, filename: string): Promise<{
    isSafe: boolean;
    threats: string[];
    confidence: number;
  }> {
    const threats: string[] = [];
    let confidence = 1.0;

    try {
      // Check for executable signatures
      const executableSignatures = [
        { signature: Buffer.from([0x4D, 0x5A]), name: 'PE Executable' },
        { signature: Buffer.from([0x7F, 0x45, 0x4C, 0x46]), name: 'ELF Executable' },
        { signature: Buffer.from([0xFE, 0xED, 0xFA, 0xCE]), name: 'Mach-O Executable' },
        { signature: Buffer.from([0xCA, 0xFE, 0xBA, 0xBE]), name: 'Java Class File' },
      ];

      for (const { signature, name } of executableSignatures) {
        if (buffer.length >= signature.length && 
            buffer.subarray(0, signature.length).equals(signature)) {
          threats.push(`Executable file detected: ${name}`);
          confidence = 0.1;
        }
      }

      // Check for script content in non-script files
      const content = buffer.toString('utf8', 0, Math.min(buffer.length, 2048));
      const scriptPatterns = [
        /<script[^>]*>/i,
        /javascript:/i,
        /vbscript:/i,
        /onload\s*=/i,
        /onerror\s*=/i,
        /eval\s*\(/i,
        /document\.write/i,
        /window\.location/i
      ];

      for (const pattern of scriptPatterns) {
        if (pattern.test(content)) {
          threats.push('Suspicious script content detected');
          confidence = Math.min(confidence, 0.3);
          break;
        }
      }

      // Check for suspicious file extensions in content
      const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com'];
      for (const ext of suspiciousExtensions) {
        if (content.toLowerCase().includes(ext)) {
          threats.push(`Suspicious file extension reference: ${ext}`);
          confidence = Math.min(confidence, 0.5);
        }
      }

      // Check for embedded files
      const embeddedFileSignatures = [
        { signature: Buffer.from([0x50, 0x4B, 0x03, 0x04]), name: 'ZIP Archive' },
        { signature: Buffer.from([0x52, 0x61, 0x72, 0x21]), name: 'RAR Archive' },
      ];

      for (const { signature, name } of embeddedFileSignatures) {
        let offset = 0;
        while (offset < buffer.length - signature.length) {
          const index = buffer.indexOf(signature, offset);
          if (index === -1) break;
          
          if (index > 0) { // Not at the beginning, might be embedded
            threats.push(`Embedded ${name} detected`);
            confidence = Math.min(confidence, 0.6);
            break;
          }
          offset = index + 1;
        }
      }

      return {
        isSafe: threats.length === 0,
        threats,
        confidence
      };
    } catch (error) {
      this.logger.error('Error during malware scan', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        filename 
      });
      
      return {
        isSafe: false,
        threats: ['Scan failed - file may be corrupted or malicious'],
        confidence: 0.0
      };
    }
  }

  /**
   * Generate secure random filename
   */
  static generateSecureFilename(originalName: string): string {
    const extension = this.getFileExtension(originalName);
    const timestamp = Date.now();
    const random = this.generateSecureRandom(16);
    
    return `${timestamp}_${random}${extension}`;
  }

  /**
   * Generate secure random string
   */
  static generateSecureRandom(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const array = new Uint8Array(length);
      crypto.getRandomValues(array);
      
      for (let i = 0; i < length; i++) {
        result += chars[array[i] % chars.length];
      }
    } else {
      // Fallback for environments without crypto.getRandomValues
      for (let i = 0; i < length; i++) {
        result += chars[Math.floor(Math.random() * chars.length)];
      }
    }
    
    return result;
  }

  /**
   * Validate URL for security
   */
  static validateUrl(url: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      const urlObj = new URL(url);
      
      // Check protocol
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        errors.push('Invalid protocol - only HTTP and HTTPS are allowed');
      }
      
      // Check for localhost/private IPs
      const hostname = urlObj.hostname.toLowerCase();
      if (hostname === 'localhost' || 
          hostname === '127.0.0.1' ||
          hostname.startsWith('192.168.') ||
          hostname.startsWith('10.') ||
          hostname.startsWith('172.')) {
        errors.push('Private/local URLs are not allowed');
      }
      
      // Check for suspicious patterns
      if (urlObj.pathname.includes('..')) {
        errors.push('Path traversal detected in URL');
      }
      
      if (urlObj.href.length > 2048) {
        errors.push('URL is too long');
      }
      
    } catch (error) {
      errors.push('Invalid URL format');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Encrypt sensitive data using production-grade AES-256-GCM encryption
   */
  static async encryptData(data: string, additionalData?: string): Promise<string> {
    try {
      return encrypt(data, additionalData);
    } catch (error) {
      throw new StorageError(
        StorageErrorType.CONFIGURATION_ERROR,
        'Failed to encrypt data'
      );
    }
  }

  /**
   * Decrypt sensitive data using production-grade AES-256-GCM decryption
   */
  static async decryptData(encryptedData: string, additionalData?: string): Promise<string> {
    try {
      return decrypt(encryptedData, additionalData);
    } catch (error) {
      throw new StorageError(
        StorageErrorType.CONFIGURATION_ERROR,
        'Failed to decrypt data'
      );
    }
  }

  /**
   * Hash data for integrity checking
   */
  static async hashData(data: string | Buffer): Promise<string> {
    try {
      const buffer = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      throw new StorageError(
        StorageErrorType.CONFIGURATION_ERROR,
        'Failed to hash data'
      );
    }
  }

  /**
   * Verify data integrity
   */
  static async verifyIntegrity(data: string | Buffer, expectedHash: string): Promise<boolean> {
    try {
      const actualHash = await this.hashData(data);
      return actualHash === expectedHash;
    } catch (error) {
      this.logger.error('Failed to verify data integrity', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return false;
    }
  }

  /**
   * Get file extension safely
   */
  private static getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot > 0 ? filename.substring(lastDot) : '';
  }

  /**
   * Rate limiting for security operations
   */
  static createRateLimiter(maxRequests: number, windowMs: number) {
    const requests = new Map<string, number[]>();

    return {
      isAllowed: (identifier: string): boolean => {
        const now = Date.now();
        const windowStart = now - windowMs;
        
        if (!requests.has(identifier)) {
          requests.set(identifier, []);
        }
        
        const userRequests = requests.get(identifier)!;
        
        // Remove old requests outside the window
        const validRequests = userRequests.filter(time => time > windowStart);
        requests.set(identifier, validRequests);
        
        if (validRequests.length >= maxRequests) {
          return false;
        }
        
        validRequests.push(now);
        return true;
      },
      
      reset: (identifier: string): void => {
        requests.delete(identifier);
      },
      
      cleanup: (): void => {
        const now = Date.now();
        for (const [identifier, times] of Array.from(requests.entries())) {
          const validTimes = times.filter(time => time > now - windowMs);
          if (validTimes.length === 0) {
            requests.delete(identifier);
          } else {
            requests.set(identifier, validTimes);
          }
        }
      }
    };
  }
} 