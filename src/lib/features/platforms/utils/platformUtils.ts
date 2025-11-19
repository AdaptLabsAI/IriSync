import { getFirebaseFirestore } from '../../core/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

/**
 * Get a list of connected platforms for a user
 * @param userId User ID
 * @returns Promise resolving to an array of platform IDs
 */
export async function getConnectedPlatforms(userId: string): Promise<string[]> {
  try {
    // Query the platforms collection for this user
    const platformsQuery = query(
      collection(firestore, 'platformConnections'),
      where('userId', '==', userId),
      where('isConnected', '==', true)
    );
    
    const platformsSnapshot = await getDocs(platformsQuery);
    
    // If there are no results, return an empty array
    if (platformsSnapshot.empty) {
      return [];
    }
    
    // Extract the platform names/IDs from the results
    const platforms = platformsSnapshot.docs.map(doc => {
      const data = doc.data();
      return data.platformId || data.platform;
    });
    
    return platforms;
  } catch (error) {
    console.error('Error fetching connected platforms:', error);
    return [];
  }
} 