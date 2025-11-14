import { NextRequest, NextResponse } from 'next/server';
import { auth, firestore } from '@/lib/core/firebase/admin';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ votes: [] });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Fetch user's votes from Firestore
    const votesRef = firestore.collection('roadmapVotes');
    const userVotesQuery = votesRef.where('userId', '==', userId);
    const snapshot = await userVotesQuery.get();

    const votes = snapshot.docs.map(doc => doc.data().itemId);

    return NextResponse.json({ votes });
  } catch (error) {
    console.error('Error fetching user votes:', error);
    return NextResponse.json({ votes: [] });
  }
} 