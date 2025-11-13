// Server-side functions for platform accounts

import { SocialAccount, PlatformType } from './client';
import { firestore } from '../core/firebase/admin';
import { logger } from '../../core/logging/logger';
import { 
  getDoc, 
  doc, 
  collection, 
  getDocs, 
  query, 
  where, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  Timestamp 
} from 'firebase/firestore';
import { firestore as db } from '../core/firebase';
import { encrypt, decrypt } from '../security/encryption';
import { PlatformConnection } from '../core/models/Organization';

// Production-ready server-side functions for platform account management
// This module provides secure access to organization platform connections

/**
 * Get connected platform accounts for the organization
 * Production-ready implementation that fetches from Firestore
 */
export async function getPlatformAccounts(userId: string, organizationId: string): Promise<SocialAccount[]> {
  try {
    logger.debug('Fetching platform accounts', { userId, organizationId });
    
    if (!organizationId) {
      logger.error('Organization ID is required', { userId });
      return [];
    }
    
    // Get the organization's platform connections
    const orgRef = doc(db, 'organizations', organizationId);
    const orgDoc = await getDoc(orgRef);
    
    if (!orgDoc.exists()) {
      logger.error('Organization not found', { organizationId, userId });
      return [];
    }
    
    const organization = orgDoc.data();
    const platformConnections = organization.platformConnections || {};
    
    // Convert from map to array of SocialAccount objects
    const accounts: SocialAccount[] = (Object.values(platformConnections) as PlatformConnection[])
      .filter((connection) => connection.status === 'active')
      .map((connection) => {
        return {
          id: connection.platformId,
          platformId: connection.platformId,
          platformType: connection.platformId as PlatformType,
          name: connection.accountName,
          username: connection.accountName,
          profileImage: connection.avatarUrl || `/images/platforms/${connection.platformId}.png`,
          isConnected: true,
          followerCount: connection.metadata?.followerCount || 0,
          metrics: {
            engagement: connection.metadata?.engagement || 0,
            growth: connection.metadata?.growth || 0,
            reachPerPost: connection.metadata?.reachPerPost || 0
          }
        };
      });
    
    logger.debug('Successfully retrieved platform accounts', { 
      userId, 
      organizationId, 
      accountCount: accounts.length 
    });
    
    return accounts;
  } catch (error) {
    logger.error('Error getting platform accounts', {
      error: error instanceof Error ? error.message : String(error),
      userId,
      organizationId
    });
    
    // In production, we don't want to fail completely if this errors
    return [];
  }
}

/**
 * Get platform account details by ID
 */
export async function getPlatformAccountById(accountId: string, userId: string, organizationId: string): Promise<SocialAccount | null> {
  try {
    logger.debug('Fetching platform account by ID', { accountId, userId, organizationId });
    
    if (!organizationId) {
      logger.error('Organization ID is required', { accountId, userId });
      return null;
    }
    
    // Get the organization's platform connection
    const orgRef = doc(db, 'organizations', organizationId);
    const orgDoc = await getDoc(orgRef);
    
    if (!orgDoc.exists()) {
      logger.error('Organization not found', { organizationId, userId });
      return null;
    }
    
    const organization = orgDoc.data();
    const platformConnections = organization.platformConnections || {};
    const connection = platformConnections[accountId];
    
    if (!connection || connection.status !== 'active') {
      logger.info('Platform account not found or not active', { accountId, organizationId });
      return null;
    }
    
    return {
      id: connection.platformId,
      platformId: connection.platformId,
      platformType: connection.platformId as PlatformType,
      name: connection.accountName,
      username: connection.accountName,
      profileImage: connection.avatarUrl || `/images/platforms/${connection.platformId}.png`,
      isConnected: true,
      followerCount: connection.metadata?.followerCount || 0,
      metrics: {
        engagement: connection.metadata?.engagement || 0,
        growth: connection.metadata?.growth || 0,
        reachPerPost: connection.metadata?.reachPerPost || 0
      }
    };
  } catch (error) {
    logger.error('Error getting platform account by ID', {
      error: error instanceof Error ? error.message : String(error),
      accountId,
      userId,
      organizationId
    });
    
    return null;
  }
}

/**
 * Get a platform connection by platform ID and organization ID
 * 
 * @param platformId The platform identifier (e.g., 'twitter', 'facebook')
 * @param organizationId The organization ID
 * @returns Platform connection or null if not found
 */
export async function getPlatformConnection(
  platformId: string, 
  organizationId: string
): Promise<PlatformConnection | null> {
  try {
    const orgRef = doc(db, 'organizations', organizationId);
    const orgDoc = await getDoc(orgRef);
    
    if (!orgDoc.exists()) {
      logger.error('Organization not found when getting platform connection', { 
        organizationId 
      });
      return null;
    }
    
    const organization = orgDoc.data();
    const platformConnections = organization.platformConnections || {};
    const connection = platformConnections[platformId];
    
    if (!connection) {
      return null;
    }
    
    // Decrypt sensitive data if present
    if (connection.accessToken) {
      connection.accessToken = decrypt(connection.accessToken);
    }
    
    if (connection.refreshToken) {
      connection.refreshToken = decrypt(connection.refreshToken);
    }
    
    return connection as PlatformConnection;
  } catch (error) {
    logger.error('Error getting platform connection', { 
      error, 
      platformId, 
      organizationId 
    });
    throw error;
  }
}

/**
 * Get all platform connections for an organization
 * 
 * @param organizationId Organization ID
 * @returns Array of platform connections
 */
export async function getOrganizationPlatformConnections(
  organizationId: string
): Promise<PlatformConnection[]> {
  try {
    const orgRef = doc(db, 'organizations', organizationId);
    const orgDoc = await getDoc(orgRef);
    
    if (!orgDoc.exists()) {
      logger.error('Organization not found when getting platform connections', { 
        organizationId 
      });
      return [];
    }
    
    const organization = orgDoc.data();
    const platformConnections = organization.platformConnections || {};
    
    // Convert from object to array
    const connections = Object.values(platformConnections) as PlatformConnection[];
    
    // Decrypt sensitive data
    return connections.map(connection => {
      const decryptedConnection = { ...connection };
      
      if (decryptedConnection.accessToken) {
        decryptedConnection.accessToken = decrypt(decryptedConnection.accessToken);
      }
      
      if (decryptedConnection.refreshToken) {
        decryptedConnection.refreshToken = decrypt(decryptedConnection.refreshToken);
      }
      
      return decryptedConnection;
    });
  } catch (error) {
    logger.error('Error getting organization platform connections', { 
      error, 
      organizationId 
    });
    throw error;
  }
}

/**
 * Save a new platform connection for an organization
 * 
 * @param connection Platform connection data
 * @param organizationId Organization ID
 * @param userId User ID connecting the account
 * @returns Saved platform connection
 */
export async function savePlatformConnection(
  connection: Omit<PlatformConnection, 'connectedAt' | 'connectedBy' | 'status'>,
  organizationId: string,
  userId: string
): Promise<PlatformConnection> {
  try {
    const orgRef = doc(db, 'organizations', organizationId);
    const orgDoc = await getDoc(orgRef);
    
    if (!orgDoc.exists()) {
      throw new Error(`Organization not found: ${organizationId}`);
    }
    
    const organization = orgDoc.data();
    
    // Verify user is authorized to add platform connections to this organization
    // This should check user's role in the organization
    
    // Check if organization has reached its limit of social accounts
    const platformConnections = organization.platformConnections || {};
    const activePlatforms = Object.values(platformConnections)
      .filter((p: any) => p.status === 'active')
      .length;
    
    const limit = organization.usageQuota?.socialAccounts?.limit || 5;
    
    if (activePlatforms >= limit) {
      throw new Error(`Organization has reached the limit of ${limit} social accounts`);
    }
    
    // Encrypt sensitive data
    const connectionToSave: PlatformConnection = {
      ...connection,
      accessToken: connection.accessToken ? encrypt(connection.accessToken) : undefined,
      refreshToken: connection.refreshToken ? encrypt(connection.refreshToken) : undefined,
      connectedAt: Timestamp.now(),
      connectedBy: userId,
      status: 'active'
    };
    
    // Update organization with new platform connection
    await updateDoc(orgRef, {
      [`platformConnections.${connection.platformId}`]: connectionToSave,
      'usageQuota.socialAccounts.used': activePlatforms + 1,
      updatedAt: Timestamp.now()
    });
    
    logger.info('Saved platform connection', { 
      platformId: connection.platformId, 
      organizationId, 
      userId 
    });
    
    // Return the connection with decrypted tokens for immediate use
    return {
      ...connectionToSave,
      accessToken: connection.accessToken,
      refreshToken: connection.refreshToken
    };
  } catch (error) {
    logger.error('Error saving platform connection', { 
      error, 
      platformId: connection.platformId, 
      organizationId 
    });
    throw error;
  }
}

/**
 * Update the access token for a platform connection
 * 
 * @param platformId Platform ID
 * @param organizationId Organization ID
 * @param accessToken New access token
 * @param refreshToken New refresh token (optional)
 * @param tokenExpiry New token expiry (optional)
 * @returns Updated platform connection
 */
export async function updatePlatformToken(
  platformId: string,
  organizationId: string,
  accessToken: string,
  refreshToken?: string,
  tokenExpiry?: Date
): Promise<PlatformConnection | null> {
  try {
    const orgRef = doc(db, 'organizations', organizationId);
    const orgDoc = await getDoc(orgRef);
    
    if (!orgDoc.exists()) {
      throw new Error(`Organization not found: ${organizationId}`);
    }
    
    const organization = orgDoc.data();
    const platformConnections = organization.platformConnections || {};
    
    if (!platformConnections[platformId]) {
      throw new Error(`Platform connection not found: ${platformId}`);
    }
    
    // Update connection with new tokens
    const updatedConnection = {
      ...platformConnections[platformId],
      accessToken: encrypt(accessToken),
      ...(refreshToken && { refreshToken: encrypt(refreshToken) }),
      ...(tokenExpiry && { tokenExpiry: Timestamp.fromDate(tokenExpiry) }),
      status: 'active',
      updatedAt: Timestamp.now()
    };
    
    // Update organization with updated platform connection
    await updateDoc(orgRef, {
      [`platformConnections.${platformId}`]: updatedConnection,
      updatedAt: Timestamp.now()
    });
    
    logger.info('Updated platform token', { platformId, organizationId });
    
    // Return the connection with decrypted tokens for immediate use
    return {
      ...updatedConnection,
      accessToken,
      refreshToken: refreshToken || undefined
    } as PlatformConnection;
  } catch (error) {
    logger.error('Error updating platform token', { 
      error, 
      platformId, 
      organizationId 
    });
    throw error;
  }
}

/**
 * Delete a platform connection
 * 
 * @param platformId Platform ID
 * @param organizationId Organization ID
 * @param userId User ID performing the deletion
 * @returns Success status
 */
export async function deletePlatformConnection(
  platformId: string,
  organizationId: string,
  userId: string
): Promise<boolean> {
  try {
    const orgRef = doc(db, 'organizations', organizationId);
    const orgDoc = await getDoc(orgRef);
    
    if (!orgDoc.exists()) {
      throw new Error(`Organization not found: ${organizationId}`);
    }
    
    const organization = orgDoc.data();
    const platformConnections = organization.platformConnections || {};
    
    if (!platformConnections[platformId]) {
      logger.warn('Platform connection not found when deleting', { 
        platformId, 
        organizationId 
      });
      return true; // Already deleted
    }
    
    // Verify user is authorized to delete platform connections from this organization
    // This should check user's role in the organization
    
    // Create updated connections object without the platform
    const updatedConnections = { ...platformConnections };
    delete updatedConnections[platformId];
    
    // Count active platforms after deletion
    const activeCount = Object.values(updatedConnections)
      .filter((p: any) => p.status === 'active')
      .length;
    
    // Update organization
    await updateDoc(orgRef, {
      platformConnections: updatedConnections,
      'usageQuota.socialAccounts.used': activeCount,
      updatedAt: Timestamp.now()
    });
    
    logger.info('Deleted platform connection', { 
      platformId, 
      organizationId, 
      userId 
    });
    
    return true;
  } catch (error) {
    logger.error('Error deleting platform connection', { 
      error, 
      platformId, 
      organizationId 
    });
    throw error;
  }
}

/**
 * Update platform connection status
 * 
 * @param platformId Platform ID
 * @param organizationId Organization ID
 * @param status New status ('expired' or 'revoked')
 * @returns Updated platform connection
 */
export async function updatePlatformConnectionStatus(
  platformId: string,
  organizationId: string,
  status: 'expired' | 'revoked'
): Promise<PlatformConnection | null> {
  try {
    const orgRef = doc(db, 'organizations', organizationId);
    const orgDoc = await getDoc(orgRef);
    
    if (!orgDoc.exists()) {
      throw new Error(`Organization not found: ${organizationId}`);
    }
    
    const organization = orgDoc.data();
    const platformConnections = organization.platformConnections || {};
    
    if (!platformConnections[platformId]) {
      throw new Error(`Platform connection not found: ${platformId}`);
    }
    
    // Update connection status
    const updatedConnection = {
      ...platformConnections[platformId],
      status,
      updatedAt: Timestamp.now()
    };
    
    // Count active platforms after status update
    const activeCount = Object.values({
      ...platformConnections,
      [platformId]: updatedConnection
    })
      .filter((p: any) => p.status === 'active')
      .length;
    
    // Update organization
    await updateDoc(orgRef, {
      [`platformConnections.${platformId}`]: updatedConnection,
      'usageQuota.socialAccounts.used': activeCount,
      updatedAt: Timestamp.now()
    });
    
    logger.info('Updated platform connection status', { 
      platformId, 
      organizationId, 
      status 
    });
    
    return updatedConnection as PlatformConnection;
  } catch (error) {
    logger.error('Error updating platform connection status', { 
      error, 
      platformId, 
      organizationId 
    });
    throw error;
  }
} 