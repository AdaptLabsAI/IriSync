import { NextRequest, NextResponse } from 'next/server';
import { auth, firestore } from '@/lib/core/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const itemId = params.id;

    // Check if user has already voted
    const existingVote = await firestore
      .collection('roadmapVotes')
      .where('userId', '==', userId)
      .where('itemId', '==', itemId)
      .get();

    if (!existingVote.empty) {
      return NextResponse.json({ error: 'User has already voted for this item' }, { status: 400 });
    }

    // Add vote
    await firestore.collection('roadmapVotes').add({
      userId,
      itemId,
      createdAt: FieldValue.serverTimestamp()
    });

    // Increment vote count on roadmap item
    await firestore.collection('roadmapItems').doc(itemId).update({
      voteCount: FieldValue.increment(1)
    });

    return NextResponse.json({ success: true, message: 'Vote recorded successfully' });

  } catch (error) {
    console.error('Error recording vote:', error);
    return NextResponse.json({ error: 'Failed to record vote' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const itemId = params.id;

    // Find and remove the vote
    const existingVote = await firestore
      .collection('roadmapVotes')
      .where('userId', '==', userId)
      .where('itemId', '==', itemId)
      .get();

    if (existingVote.empty) {
      return NextResponse.json({ error: 'No vote found to remove' }, { status: 400 });
    }

    // Delete the vote
    await existingVote.docs[0].ref.delete();

    // Decrement vote count on roadmap item
    await firestore.collection('roadmapItems').doc(itemId).update({
      voteCount: FieldValue.increment(-1)
    });

    return NextResponse.json({ success: true, message: 'Vote removed successfully' });

  } catch (error) {
    console.error('Error removing vote:', error);
    return NextResponse.json({ error: 'Failed to remove vote' }, { status: 500 });
  }
} 