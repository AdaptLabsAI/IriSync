import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { firestore as db } from '@/lib/core/firebase';
import { logger } from '@/lib/core/logging/logger';

export interface ForumStats {
  memberCount: number;
  topicCount: number;
  postCount: number;
}

/**
 * Fetches forum statistics from the database
 */
export async function getForumStats(): Promise<ForumStats> {
  try {
    // Get user historical data - all non-deleted users
  const firestore = getFirebaseFirestore();
  if (!firestore) throw new Error('Database not configured');

    const usersQuery = query(
      collection(firestore, 'users'),
      where('isDeleted', '==', false)
    );
    
    // Get forum discussions
    const topicsQuery = query(collection(firestore, 'forumDiscussions'));
    
    // Get forum posts/replies
    const postsQuery = query(collection(firestore, 'forumPosts'));
    
    // Execute queries to get document counts
    const [usersSnapshot, topicsSnapshot, postsSnapshot] = await Promise.all([
      getDocs(usersQuery),
      getDocs(topicsQuery),
      getDocs(postsQuery)
    ]);
    
    return {
      memberCount: usersSnapshot.size,
      topicCount: topicsSnapshot.size,
      postCount: postsSnapshot.size
    };
  } catch (error) {
    logger.error('Error fetching forum statistics:', error);
    // Return default values if there's an error
    return {
      memberCount: 0,
      topicCount: 0,
      postCount: 0
    };
  }
} 