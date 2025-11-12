import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from '@/lib/firebase/admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      scheduledId,
      platformType,
      content,
      platformAccountId,
      scheduledTime,
      timezone,
      mediaData,
      isCarousel,
      hashtags,
      mentions,
      location,
      platformSpecificParams
    } = body;

    if (!scheduledId || !platformType || !content || !scheduledTime) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const db = getFirestore();
    
    // Create scheduled post document
    await db.collection('scheduledPosts').doc(scheduledId).set({
      id: scheduledId,
      platformType,
      content,
      platformAccountId,
      scheduledTime: new Date(scheduledTime),
      timezone,
      status: 'scheduled',
      mediaData,
      isCarousel: isCarousel || false,
      caption: content,
      hashtags: hashtags || [],
      mentions: mentions || [],
      location,
      platformSpecificParams,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return NextResponse.json({ success: true, scheduledId });
  } catch (error) {
    console.error('Error scheduling post:', error);
    return NextResponse.json(
      { error: 'Failed to schedule post' },
      { status: 500 }
    );
  }
} 