import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { firestore } from '@/lib/core/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

// Default audiences for fallback
const DEFAULT_AUDIENCES = [
  { id: 'general', name: 'General Audience' },
  { id: 'professionals', name: 'Professionals' },
  { id: 'young-adults', name: 'Young Adults (18-25)' },
  { id: 'parents', name: 'Parents' },
  { id: 'tech-savvy', name: 'Tech-Savvy Users' },
  { id: 'seniors', name: 'Seniors' },
  { id: 'students', name: 'Students' },
  { id: 'entrepreneurs', name: 'Entrepreneurs' },
  { id: 'creatives', name: 'Creative Professionals' },
  { id: 'business', name: 'Business Decision Makers' }
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
    
    // Attempt to fetch audiences from Firestore
    const audiencesRef = collection(firestore, 'audienceSegments');
    const audiencesQuery = query(audiencesRef, where('enabled', '==', true));
    const audiencesSnapshot = await getDocs(audiencesQuery);
    
    if (audiencesSnapshot.empty) {
      // Return default audiences if no custom ones are defined
      return NextResponse.json({ audiences: DEFAULT_AUDIENCES });
    }
    
    // Map the Firestore documents to audiences
    const audiences = audiencesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || doc.id
      };
    });
    
    return NextResponse.json({ audiences });
  } catch (error) {
    console.error('Error fetching audiences:', error);
    
    // Return default audiences on error
    return NextResponse.json(
      { 
        audiences: DEFAULT_AUDIENCES,
        error: 'Failed to load audiences from database'
      },
      { status: 500 }
    );
  }
} 