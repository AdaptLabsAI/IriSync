import { getFirebaseFirestore, firestore } from '../../../core/firebase';
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';

interface PostQueryParams {
  startDate?: string;
  endDate?: string;
  platform?: string;
  status?: 'draft' | 'scheduled' | 'published' | 'failed';
}

/**
 * Get the count of scheduled posts for a user
 * @param userId User ID
 * @returns Promise resolving to the count of scheduled posts
 */
export async function getScheduledPostCount(userId: string): Promise<number> {
  try {
    // Query scheduled posts for this user
    const firestore = getFirebaseFirestore();
    if (!firestore) {
      return 0;
    }
    const postsQuery = query(
      collection(firestore, 'posts'),
      where('userId', '==', userId),
      where('status', '==', 'scheduled')
    );

    const postsSnapshot = await getDocs(postsQuery);
    
    return postsSnapshot.size;
  } catch (error) {
    console.error('Error fetching scheduled post count:', error);
    return 0;
  }
}

/**
 * Get scheduled posts for a user
 * @param userId User ID
 * @param params Optional parameters for filtering posts
 * @returns Promise resolving to an array of post objects
 */
export async function getScheduledPosts(
  userId: string, 
  params: PostQueryParams = {}
): Promise<any[]> {
  try {
    // Base query constraints
    let constraints: any[] = [
      where('userId', '==', userId),
      where('status', '==', params.status || 'scheduled'),
      orderBy('scheduledDate', 'asc')
    ];
    
    // Add date range constraints if provided
    if (params.startDate) {
      const startTimestamp = Timestamp.fromDate(new Date(params.startDate));
      constraints.push(where('scheduledDate', '>=', startTimestamp));
    }
    
    if (params.endDate) {
      const endTimestamp = Timestamp.fromDate(new Date(params.endDate));
      constraints.push(where('scheduledDate', '<=', endTimestamp));
    }
    
    // Add platform filter if specified
    if (params.platform) {
      constraints.push(where('platform', '==', params.platform));
    }
    
    // Create and execute the query
    const postsQuery = query(
      collection(firestore, 'posts'),
      ...constraints
    );
    
    const postsSnapshot = await getDocs(postsQuery);
    
    // Transform the documents to include the ID and handle the timestamp
    return postsSnapshot.docs.map(doc => {
      const data = doc.data();
      // Convert Firestore timestamp to ISO string for easier handling in the UI
      if (data.scheduledDate && typeof data.scheduledDate.toDate === 'function') {
        data.scheduledDate = data.scheduledDate.toDate().toISOString();
      }
      return {
        id: doc.id,
        ...data
      };
    });
  } catch (error) {
    console.error('Error fetching scheduled posts:', error);
    return [];
  }
} 