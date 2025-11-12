import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { firestore as db } from '@/lib/firebase';
import { logger } from '@/lib/logging/logger';

export interface ForumDiscussion {
  id: string;
  title: string;
  author: {
    id: string;
    name: string;
    avatar: string;
  };
  categoryId: string;
  categoryName: string;
  content: string;
  replies: number;
  views: number;
  lastActivity: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Formats a date to a relative time string (e.g., "2 hours ago")
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  
  const diffInSecs = Math.floor(diffInMs / 1000);
  const diffInMins = Math.floor(diffInSecs / 60);
  const diffInHours = Math.floor(diffInMins / 60);
  const diffInDays = Math.floor(diffInHours / 24);
  
  if (diffInSecs < 60) {
    return 'just now';
  } else if (diffInMins < 60) {
    return `${diffInMins} ${diffInMins === 1 ? 'minute' : 'minutes'} ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
  } else if (diffInDays < 30) {
    return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
  } else {
    return date.toLocaleDateString();
  }
}

/**
 * Fetches recent forum discussions from the database
 */
export async function getRecentDiscussions(limitCount = 5): Promise<ForumDiscussion[]> {
  try {
    // Create a query against the discussions collection, ordered by lastActivity
    const q = query(
      collection(db, 'forumDiscussions'), 
      orderBy('lastActivityTimestamp', 'desc'),
      limit(limitCount)
    );
    
    // Execute the query
    const querySnapshot = await getDocs(q);
    
    // Map the documents to ForumDiscussion objects
    const discussions = querySnapshot.docs.map(doc => {
      const data = doc.data();
      const lastActivityDate = data.lastActivityTimestamp?.toDate() || new Date();
      
      return {
        id: doc.id,
        title: data.title || '',
        author: {
          id: data.authorId || '',
          name: data.authorName || 'Unknown User',
          avatar: data.authorAvatar || '/images/avatars/default.jpg'
        },
        categoryId: data.categoryId || '',
        categoryName: data.categoryName || 'Uncategorized',
        content: data.content || '',
        replies: data.replyCount || 0,
        views: data.viewCount || 0,
        lastActivity: formatRelativeTime(lastActivityDate),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      };
    });
    
    return discussions;
  } catch (error) {
    logger.error('Error fetching recent discussions:', error);
    // Return an empty array if there's an error
    return [];
  }
} 