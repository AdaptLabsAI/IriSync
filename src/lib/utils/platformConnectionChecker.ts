/**
 * Platform Connection Checker
 *
 * Utility to check if user has connected social media platforms.
 * Used for conditional rendering - stats should only display when platforms are connected.
 */

import { firestore } from '@/lib/core/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export interface PlatformConnection {
  platformType: string;
  isConnected: boolean;
  connectedAt?: Date;
  accountId?: string;
  accountName?: string;
}

export interface ConnectionStatus {
  hasAnyConnection: boolean;
  connectedPlatforms: string[];
  platformDetails: PlatformConnection[];
  totalConnections: number;
}

/**
 * Check if user has any connected platforms
 */
export async function hasConnectedPlatforms(
  userId: string,
  organizationId: string
): Promise<boolean> {
  try {
    const connectionsQuery = query(
      collection(firestore, 'platformConnections'),
      where('userId', '==', userId),
      where('organizationId', '==', organizationId),
      where('status', '==', 'active')
    );

    const connectionsDocs = await getDocs(connectionsQuery);
    return !connectionsDocs.empty;
  } catch (error) {
    console.error('Error checking platform connections:', error);
    return false;
  }
}

/**
 * Get connection status for user
 */
export async function getConnectionStatus(
  userId: string,
  organizationId: string
): Promise<ConnectionStatus> {
  try {
    const connectionsQuery = query(
      collection(firestore, 'platformConnections'),
      where('userId', '==', userId),
      where('organizationId', '==', organizationId),
      where('status', '==', 'active')
    );

    const connectionsDocs = await getDocs(connectionsQuery);

    const platformDetails: PlatformConnection[] = [];
    const connectedPlatforms: string[] = [];

    connectionsDocs.forEach((doc) => {
      const data = doc.data();
      const platformType = data.platformType || '';

      platformDetails.push({
        platformType,
        isConnected: true,
        connectedAt: data.connectedAt?.toDate(),
        accountId: data.platformUserId,
        accountName: data.platformUsername,
      });

      connectedPlatforms.push(platformType);
    });

    return {
      hasAnyConnection: platformDetails.length > 0,
      connectedPlatforms,
      platformDetails,
      totalConnections: platformDetails.length,
    };
  } catch (error) {
    console.error('Error getting connection status:', error);
    return {
      hasAnyConnection: false,
      connectedPlatforms: [],
      platformDetails: [],
      totalConnections: 0,
    };
  }
}

/**
 * Check if specific platform is connected
 */
export async function isPlatformConnected(
  userId: string,
  organizationId: string,
  platformType: string
): Promise<boolean> {
  try {
    const connectionsQuery = query(
      collection(firestore, 'platformConnections'),
      where('userId', '==', userId),
      where('organizationId', '==', organizationId),
      where('platformType', '==', platformType),
      where('status', '==', 'active')
    );

    const connectionsDocs = await getDocs(connectionsQuery);
    return !connectionsDocs.empty;
  } catch (error) {
    console.error('Error checking platform connection:', error);
    return false;
  }
}

/**
 * Get list of available platforms to connect
 */
export function getAvailablePlatforms(): string[] {
  return [
    'instagram',
    'facebook',
    'twitter',
    'linkedin',
    'tiktok',
    'youtube',
    'pinterest',
  ];
}

/**
 * Client-side hook for checking connections (for use in React components)
 */
export function useConnectionChecker() {
  return {
    hasConnectedPlatforms,
    getConnectionStatus,
    isPlatformConnected,
    getAvailablePlatforms,
  };
}
