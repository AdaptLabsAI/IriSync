import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { firestore } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

// Default content types for fallback
const DEFAULT_CONTENT_TYPES = [
  { id: 'post', name: 'Regular Post' },
  { id: 'announcement', name: 'Announcement' },
  { id: 'promotion', name: 'Promotion' },
  { id: 'article', name: 'Article' },
  { id: 'story', name: 'Story' },
  { id: 'carousel', name: 'Carousel' },
  { id: 'reel', name: 'Reel Script' },
  { id: 'poll', name: 'Poll' },
  { id: 'tweet', name: 'Tweet' }
];

export async function GET(request: NextRequest) {
  try {
    // Get the user session
    const session = await getServerSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // The user ID is the email in our system
    const userId = session.user.email;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID not found' },
        { status: 400 }
      );
    }
    
    // Attempt to fetch content types from Firestore
    const contentTypesRef = collection(firestore, 'contentTypes');
    const contentTypesQuery = query(contentTypesRef, where('enabled', '==', true));
    const contentTypesSnapshot = await getDocs(contentTypesQuery);
    
    if (contentTypesSnapshot.empty) {
      // Return default content types if no custom ones are defined
      return NextResponse.json({ contentTypes: DEFAULT_CONTENT_TYPES });
    }
    
    // Map the Firestore documents to content types
    const contentTypes = contentTypesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || doc.id
      };
    });
    
    return NextResponse.json({ contentTypes });
  } catch (error) {
    console.error('Error fetching content types:', error);
    
    // Return default content types on error
    return NextResponse.json(
      { 
        contentTypes: DEFAULT_CONTENT_TYPES,
        error: 'Failed to load content types from database'
      },
      { status: 500 }
    );
  }
} 