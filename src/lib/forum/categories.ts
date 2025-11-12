import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { firestore as db } from '@/lib/core/firebase';
import { logger } from '@/lib/core/logging/logger';

export interface ForumCategory {
  id: string;
  name: string;
  description: string;
  iconType: string;
  topicCount: number;
  postCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Fetches all forum categories from the database
 */
export async function getCategories(): Promise<ForumCategory[]> {
  try {
    // Create a query against the categories collection, ordered by name
    const q = query(collection(db, 'forumCategories'), orderBy('name'));
    
    // Execute the query
    const querySnapshot = await getDocs(q);
    
    // Map the documents to ForumCategory objects
    const categories = querySnapshot.docs.map(doc => {
      const data = doc.data();
      
      return {
        id: doc.id,
        name: data.name || '',
        description: data.description || '',
        iconType: data.iconType || 'forum',
        topicCount: data.topicCount || 0,
        postCount: data.postCount || 0,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      };
    });
    
    return categories;
  } catch (error) {
    logger.error('Error fetching forum categories:', error);
    // Return an empty array if there's an error
    return [];
  }
} 