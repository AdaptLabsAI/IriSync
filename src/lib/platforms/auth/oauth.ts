import crypto from 'crypto';
import { AuthState } from '../PlatformProvider';

/**
 * Generate a secure random state for OAuth
 */
export function generateOAuthState(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate a code verifier for PKCE (Proof Key for Code Exchange)
 */
export function generateCodeVerifier(): string {
  return crypto.randomBytes(64).toString('base64url');
}

/**
 * Generate a code challenge from a code verifier for PKCE
 */
export function generateCodeChallenge(codeVerifier: string): string {
  return crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
}

/**
 * Generate a basic OAuth 2.0 authorization URL
 */
export function generateOAuthUrl(
  authUrl: string,
  clientId: string,
  redirectUri: string,
  state: string,
  scope: string[],
  codeChallenge?: string,
  additionalParams: Record<string, string> = {}
): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    state: state,
    scope: scope.join(' ')
  });
  
  // Add PKCE parameters if code challenge is provided
  if (codeChallenge) {
    params.append('code_challenge', codeChallenge);
    params.append('code_challenge_method', 'S256');
  }
  
  // Add any additional parameters
  Object.entries(additionalParams).forEach(([key, value]) => {
    params.append(key, value);
  });
  
  return `${authUrl}?${params.toString()}`;
}

/**
 * Encrypt auth state for storage
 */
export function encryptAuthState(authState: AuthState, encryptionKey: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    'aes-256-gcm',
    Buffer.from(encryptionKey, 'hex'),
    iv
  );
  
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(authState), 'utf8'),
    cipher.final()
  ]);
  
  const authTag = cipher.getAuthTag();
  
  // Store IV, auth tag, and encrypted data together
  const result = Buffer.concat([iv, authTag, encrypted]);
  return result.toString('base64');
}

/**
 * Decrypt auth state from storage
 */
export function decryptAuthState(encryptedState: string, encryptionKey: string): AuthState {
  const buffer = Buffer.from(encryptedState, 'base64');
  
  // Extract IV, auth tag, and encrypted data
  const iv = buffer.subarray(0, 16);
  const authTag = buffer.subarray(16, 32);
  const encrypted = buffer.subarray(32);
  
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    Buffer.from(encryptionKey, 'hex'),
    iv
  );
  
  decipher.setAuthTag(authTag);
  
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]);
  
  return JSON.parse(decrypted.toString('utf8'));
}

/**
 * Check if an access token is expired
 */
export function isTokenExpired(expiresAt: number, bufferSeconds: number = 300): boolean {
  // Current time in seconds
  const now = Math.floor(Date.now() / 1000);
  
  // Check if token is expired or about to expire in the next [bufferSeconds]
  return expiresAt - bufferSeconds < now;
}

/**
 * Generate a token encryption key
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}
