/**
 * Production-ready encryption utility for sensitive data
 * Uses AES-256-GCM for authenticated encryption with associated data (AEAD)
 */

import crypto from 'crypto';
import logger from '../logging/logger';

// Environment variables for keys (must be set in production)
const PRIMARY_ENCRYPTION_KEY = process.env.PRIMARY_ENCRYPTION_KEY;
const SECONDARY_ENCRYPTION_KEY = process.env.SECONDARY_ENCRYPTION_KEY; // For key rotation

// Constants for encryption
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // For AES, this is always 16 bytes
const AUTH_TAG_LENGTH = 16; // GCM auth tag length
const KEY_LENGTH = 32; // 256 bits
const SALT_LENGTH = 64; // Salt for key derivation
const KEY_ITERATIONS = 100000; // PBKDF2 iterations for key derivation

/**
 * Validate encryption configuration
 * @throws Error if encryption is not properly configured
 */
function validateEncryptionConfig() {
  const missingKeys = [];
  
  if (!PRIMARY_ENCRYPTION_KEY) {
    missingKeys.push('PRIMARY_ENCRYPTION_KEY');
  }
  
  // SECONDARY_ENCRYPTION_KEY is optional
  
  if (missingKeys.length > 0) {
    const error = `Missing required encryption environment variables: ${missingKeys.join(', ')}`;
    logger.error(error);
    throw new Error(error);
  }
}

/**
 * Derive encryption key from master key and salt using PBKDF2
 * @param masterKey Master encryption key
 * @param salt Random salt
 * @returns Derived key
 */
function deriveKey(masterKey: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(
    masterKey,
    salt,
    KEY_ITERATIONS,
    KEY_LENGTH,
    'sha512'
  );
}

/**
 * Encrypt a string with authenticated encryption (AES-256-GCM)
 * @param text Text to encrypt
 * @param additionalData Optional associated data for authentication
 * @returns Encrypted text (base64 string with format: salt:iv:authTag:encryptedData)
 */
export function encrypt(text: string, additionalData?: string): string {
  try {
    if (!text) return '';
    
    validateEncryptionConfig();
    
    // Generate random salt and IV
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Derive encryption key from primary key and salt
    const key = deriveKey(PRIMARY_ENCRYPTION_KEY!, salt);
    
    // Create cipher with key and iv
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    // Add additional authenticated data if provided (won't be encrypted, but will be authenticated)
    if (additionalData) {
      cipher.setAAD(Buffer.from(additionalData));
    }
    
    // Encrypt the string
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    // Get authentication tag
    const authTag = cipher.getAuthTag();
    
    // Return all pieces needed for decryption and authentication
    // Format: base64(salt):base64(iv):base64(authTag):base64(encryptedData)
    return [
      salt.toString('base64'),
      iv.toString('base64'),
      authTag.toString('base64'),
      encrypted
    ].join(':');
  } catch (error) {
    logger.error('Encryption error', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt an encrypted string with authenticated decryption (AES-256-GCM)
 * @param encryptedText Encrypted text (base64 string with format: salt:iv:authTag:encryptedData)
 * @param additionalData Optional associated data for authentication
 * @returns Decrypted text
 */
export function decrypt(encryptedText: string, additionalData?: string): string {
  try {
    if (!encryptedText) return '';
    
    validateEncryptionConfig();
    
    // Split encrypted text into components
    const parts = encryptedText.split(':');
    
    // We need 4 parts: salt, iv, authTag, and encryptedData
    if (parts.length !== 4) {
      throw new Error('Invalid encrypted data format');
    }
    
    const salt = Buffer.from(parts[0], 'base64');
    const iv = Buffer.from(parts[1], 'base64');
    const authTag = Buffer.from(parts[2], 'base64');
    const encrypted = parts[3];
    
    // Try with primary key first
    try {
      // Derive key from primary key and salt
      const key = deriveKey(PRIMARY_ENCRYPTION_KEY!, salt);
      
      // Create decipher
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      
      // Set auth tag for verification
      decipher.setAuthTag(authTag);
      
      // Add additional authenticated data if provided
      if (additionalData) {
        decipher.setAAD(Buffer.from(additionalData));
      }
      
      // Decrypt
      let decrypted = decipher.update(encrypted, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (primaryKeyError) {
      // If primary key fails and we have a secondary key (key rotation scenario),
      // try with the secondary key
      if (SECONDARY_ENCRYPTION_KEY) {
        // Derive key from secondary key and salt
        const secondaryKey = deriveKey(SECONDARY_ENCRYPTION_KEY, salt);
        
        // Create decipher
        const decipher = crypto.createDecipheriv(ALGORITHM, secondaryKey, iv);
        
        // Set auth tag for verification
        decipher.setAuthTag(authTag);
        
        // Add additional authenticated data if provided
        if (additionalData) {
          decipher.setAAD(Buffer.from(additionalData));
        }
        
        // Decrypt
        let decrypted = decipher.update(encrypted, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
        
        // Log that we used secondary key for decryption
        logger.info('Used secondary encryption key for decryption');
        
        return decrypted;
      }
      
      // If no secondary key or that also failed, throw the original error
      throw primaryKeyError;
    }
  } catch (error) {
    logger.error('Decryption error', { 
      error: error instanceof Error ? error.message : String(error)
    });
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Re-encrypt data with the primary key (for key rotation)
 * @param encryptedText Data encrypted with an old key
 * @param additionalData Optional associated data for authentication
 * @returns Data re-encrypted with the current primary key
 */
export function reEncryptWithPrimaryKey(encryptedText: string, additionalData?: string): string {
  // Decrypt with current keys (primary or secondary)
  const decrypted = decrypt(encryptedText, additionalData);
  
  // Re-encrypt with primary key
  return encrypt(decrypted, additionalData);
}

/**
 * Generate a random secure token (for API tokens, reset tokens, etc.)
 * @param length Length of the token in bytes (output will be in base64 and longer)
 * @returns Secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('base64url');
}

/**
 * Create a secure hash of a string (for password verification, etc.)
 * @param data String to hash
 * @param salt Optional salt (generates random salt if not provided)
 * @returns Hashed string with salt (format: iterations:salt:hash)
 */
export function hashString(data: string, salt?: Buffer): string {
  const saltToUse = salt || crypto.randomBytes(SALT_LENGTH);
  
  const hash = crypto.pbkdf2Sync(
    data,
    saltToUse,
    KEY_ITERATIONS,
    64, // 512 bits
    'sha512'
  );
  
  return `${KEY_ITERATIONS}:${saltToUse.toString('base64')}:${hash.toString('base64')}`;
}

/**
 * Verify a string against a hash created with hashString
 * @param data String to verify
 * @param hashedString Hash to verify against (format: iterations:salt:hash)
 * @returns True if the string matches the hash
 */
export function verifyHash(data: string, hashedString: string): boolean {
  const parts = hashedString.split(':');
  
  if (parts.length !== 3) {
    return false;
  }
  
  const iterations = parseInt(parts[0], 10);
  const salt = Buffer.from(parts[1], 'base64');
  const storedHash = parts[2];
  
  const hash = crypto.pbkdf2Sync(
    data,
    salt,
    iterations,
    64, // Must match the size used in hashString
    'sha512'
  );
  
  return hash.toString('base64') === storedHash;
} 