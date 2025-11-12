import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { firestore } from '@/lib/core/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

// Default tones for fallback
const DEFAULT_TONES = [
  { id: 'professional', name: 'Professional' },
  { id: 'casual', name: 'Casual' },
  { id: 'humorous', name: 'Humorous' },
  { id: 'inspirational', name: 'Inspirational' },
  { id: 'educational', name: 'Educational' },
  { id: 'friendly', name: 'Friendly' },
  { id: 'formal', name: 'Formal' },
  { id: 'conversational', name: 'Conversational' },
  { id: 'enthusiastic', name: 'Enthusiastic' },
  { id: 'authoritative', name: 'Authoritative' }
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
    
    // Attempt to fetch tones from Firestore
    const tonesRef = collection(firestore, 'contentTones');
    const tonesQuery = query(tonesRef, where('enabled', '==', true));
    const tonesSnapshot = await getDocs(tonesQuery);
    
    if (tonesSnapshot.empty) {
      // Return default tones if no custom ones are defined
      return NextResponse.json({ tones: DEFAULT_TONES });
    }
    
    // Map the Firestore documents to tones
    const tones = tonesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || doc.id
      };
    });
    
    return NextResponse.json({ tones });
  } catch (error) {
    console.error('Error fetching tones:', error);
    
    // Return default tones on error
    return NextResponse.json(
      { 
        tones: DEFAULT_TONES,
        error: 'Failed to load tones from database'
      },
      { status: 500 }
    );
  }
} 