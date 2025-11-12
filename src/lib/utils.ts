import { ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';

/**
 * Combines className strings with clsx and tailwind-merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format date to a human-readable string
 */
export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions) {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    ...options,
  };
  
  return new Date(date).toLocaleDateString('en-US', defaultOptions);
}

/**
 * Format number to include commas
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

/**
 * Format currency
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return `${text.slice(0, length)}...`;
}

/**
 * Generate a cryptographically secure UUID v4
 * This replaces the old Math.random based generateId function
 */
export function generateUUID(): string {
  return uuidv4();
}

/**
 * Generate a short, deterministic hash from a string
 * @param input Input string to hash
 * @param length Desired length (max 32)
 * @returns Hexadecimal hash string
 */
function generateShortHash(input: string, length: number = 12): string {
  const hash = createHash('sha256').update(input).digest('hex');
  return hash.substring(0, length);
}

/**
 * Generate a unique organization ID with collision detection
 * Ensures ID length is 16-18 characters for scalability
 * @param email Optional email to use as base for deterministic ID
 * @param firestore Optional Firestore instance for collision checking
 * @returns Unique organization ID (16-18 characters)
 */
export async function generateOrganizationId(
  email?: string, 
  firestore?: any
): Promise<string> {
  const ORG_PREFIX = 'org_'; // 4 characters
  const TARGET_SUFFIX_LENGTH = 12; // 12-14 characters for suffix = 16-18 total
  
  // If email provided, try deterministic approach first
  if (email) {
    // Create deterministic hash from email (12 characters)
    const emailHash = generateShortHash(email.toLowerCase(), TARGET_SUFFIX_LENGTH);
    const baseId = `${ORG_PREFIX}${emailHash}`;
    
    // Check for collision if Firestore instance provided
    if (firestore) {
      try {
        const existingDoc = await firestore.collection('organizations').doc(baseId).get();
        if (!existingDoc.exists) {
          return baseId;
        }
        // If collision detected, add email suffix for uniqueness
        const emailPrefix = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        const combinedHash = generateShortHash(`${email}_${emailPrefix}`, TARGET_SUFFIX_LENGTH);
        const fallbackId = `${ORG_PREFIX}${combinedHash}`;
        
        const fallbackDoc = await firestore.collection('organizations').doc(fallbackId).get();
        if (!fallbackDoc.exists) {
          return fallbackId;
        }
        // If still collision, fall through to UUID generation
      } catch (error) {
        console.error('Error checking organization ID collision:', error);
        // Fall through to UUID generation
      }
    } else {
      return baseId;
    }
  }
  
  // Generate UUID-based organization ID with collision detection
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    // Use first 12-14 characters of UUID for shorter, scalable IDs
    const uuid = uuidv4().replace(/-/g, ''); // Remove dashes
    const shortUuid = uuid.substring(0, TARGET_SUFFIX_LENGTH + (attempts % 3)); // 12-14 chars
    const orgId = `${ORG_PREFIX}${shortUuid}`;
    
    // Check for collision if Firestore instance provided
    if (firestore) {
      try {
        const existingDoc = await firestore.collection('organizations').doc(orgId).get();
        if (!existingDoc.exists) {
          return orgId;
        }
      } catch (error) {
        console.error('Error checking UUID organization ID collision:', error, { attempt: attempts });
      }
    } else {
      return orgId;
    }
    
    attempts++;
  }
  
  throw new Error('Failed to generate unique organization ID after multiple attempts');
}

/**
 * Validate and ensure user has proper organization connections
 * Prevents users from being accidentally disconnected from organizations
 * @param userId User ID
 * @param userData User data
 * @param firestore Firestore instance
 * @returns Validated organization connections
 */
export async function validateUserOrganizationConnections(
  userId: string,
  userData: any,
  firestore: any
): Promise<{
  personalOrganizationId: string;
  currentOrganizationId: string;
  isValid: boolean;
  errors: string[];
}> {
  const errors: string[] = [];
  let personalOrganizationId = userData.personalOrganizationId;
  let currentOrganizationId = userData.currentOrganizationId;
  
  // Ensure user has a personal organization
  if (!personalOrganizationId) {
    console.warn('User missing personalOrganizationId, attempting to create', { userId });
    try {
      // Generate personal organization if missing
      personalOrganizationId = await generateOrganizationId(userData.email, firestore);
      
      // Create the personal organization
      await firestore.collection('organizations').doc(personalOrganizationId).set({
        name: `${userData.firstName || 'Personal'}'s Workspace`,
        isPersonal: true,
        ownerId: userId,
        members: [userId],
        createdAt: new Date(),
        updatedAt: new Date(),
        billing: {
          subscriptionTier: 'creator',
          subscriptionStatus: 'active',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        },
        usageQuota: {
          aiTokens: { limit: 100, used: 0, resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
        }
      });
      
      console.info('Created missing personal organization for user', { userId, personalOrganizationId });
    } catch (error) {
      errors.push('Failed to create personal organization');
      console.error('Failed to create personal organization for user', { userId, error });
    }
  } else {
    // Validate personal organization exists
    try {
      const personalOrgDoc = await firestore.collection('organizations').doc(personalOrganizationId).get();
      if (!personalOrgDoc.exists()) {
        errors.push('Personal organization not found');
        console.error('User references non-existent personal organization', { userId, personalOrganizationId });
      }
    } catch (error) {
      errors.push('Error validating personal organization');
      console.error('Error validating personal organization', { userId, personalOrganizationId, error });
    }
  }
  
  // Validate current organization
  if (!currentOrganizationId) {
    // Default to personal organization if no current organization
    currentOrganizationId = personalOrganizationId;
    console.info('User missing currentOrganizationId, defaulting to personal', { userId, currentOrganizationId });
  } else {
    // Validate user has access to current organization
    try {
      const currentOrgDoc = await firestore.collection('organizations').doc(currentOrganizationId).get();
      if (!currentOrgDoc.exists()) {
        errors.push('Current organization not found');
        currentOrganizationId = personalOrganizationId; // Fallback to personal
        console.warn('User references non-existent current organization, falling back to personal', { 
          userId, 
          invalidOrgId: userData.currentOrganizationId, 
          fallbackOrgId: personalOrganizationId 
        });
      } else {
        // Check if user is member of the organization
        const orgData = currentOrgDoc.data();
        const isMember = orgData.members && orgData.members.includes(userId);
        const isOwner = orgData.ownerId === userId;
        
        if (!isMember && !isOwner) {
          errors.push('User not a member of current organization');
          currentOrganizationId = personalOrganizationId; // Fallback to personal
          console.warn('User not a member of current organization, falling back to personal', { 
            userId, 
            invalidOrgId: userData.currentOrganizationId,
            fallbackOrgId: personalOrganizationId 
          });
        }
      }
    } catch (error) {
      errors.push('Error validating current organization');
      currentOrganizationId = personalOrganizationId; // Fallback to personal
      console.error('Error validating current organization, falling back to personal', { 
        userId, 
        currentOrganizationId: userData.currentOrganizationId,
        fallbackOrgId: personalOrganizationId,
        error 
      });
    }
  }
  
  return {
    personalOrganizationId,
    currentOrganizationId,
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Generate a random string ID (deprecated - use generateUUID instead)
 * @deprecated Use generateUUID() for guaranteed uniqueness
 */
export function generateId(length: number = 8): string {
  console.warn('generateId() is deprecated. Use generateUUID() for guaranteed uniqueness.');
  return Math.random().toString(36).substring(2, 2 + length);
}

/**
 * Delay execution with promise
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Convert string to title case
 */
export function toTitleCase(str: string): string {
  return str.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
  );
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Check if object is empty
 */
export function isEmptyObject(obj: Record<string, any>): boolean {
  return Object.keys(obj).length === 0;
}

/**
 * Group array of objects by key
 */
export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((result, item) => {
    const keyValue = String(item[key]);
    return {
      ...result,
      [keyValue]: [...(result[keyValue] || []), item],
    };
  }, {} as Record<string, T[]>);
}

// Utility functions for production use only.

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms)); // Used for rate limiting or retry logic only
} 