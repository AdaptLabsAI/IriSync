import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from '@/lib/core/firebase/admin';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { platformType, userId, followerCount } = body;

    if (!platformType || !userId || followerCount === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const db = getFirestore();
    
    // Get today's date in ISO format
    const today = new Date().toISOString().split('T')[0];
    
    // Create a document ID
    const docId = `${platformType}_${userId}_${today}`;
    
    // Store the data
    await db.collection('platformStats').doc(docId).set({
      platformType,
      userId,
      date: today,
      followerCount,
      timestamp: new Date()
    }, { merge: true }); // Use merge in case we update multiple times in a day

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error storing follower data:', error);
    return NextResponse.json(
      { error: 'Failed to store follower data' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const platformType = searchParams.get('platformType');
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!platformType || !userId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const db = getFirestore();
    
    // Format dates to ISO strings for consistent comparison
    const startStr = new Date(startDate).toISOString().split('T')[0];
    const endStr = new Date(endDate).toISOString().split('T')[0];
    
    // Query the follower history collection
    const snapshot = await db.collection('platformStats')
      .where('platformType', '==', platformType)
      .where('userId', '==', userId)
      .where('date', '>=', startStr)
      .where('date', '<=', endStr)
      .orderBy('date', 'asc')
      .get();
    
    if (snapshot.empty) {
      return NextResponse.json({ data: [] });
    }
    
    // Transform to the expected format
    const data = snapshot.docs.map((doc: any) => {
      const docData = doc.data();
      return {
        date: docData.date,
        count: docData.followerCount || 0
      };
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching historical follower data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch follower data' },
      { status: 500 }
    );
  }
} 