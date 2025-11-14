import { NextRequest, NextResponse } from 'next/server';
import { auth, firestore } from '@/lib/core/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const body = await request.json();
    const { title, description, category } = body;

    // Validate required fields
    if (!title || !description || !category) {
      return NextResponse.json({ 
        error: 'Title, description, and category are required' 
      }, { status: 400 });
    }

    // Create roadmap item document
    const roadmapRef = firestore.collection('roadmapItems');
    const newItem = {
      title: title.trim(),
      description: description.trim(),
      category: category.trim(),
      status: 'considering',
      timeframe: 'Future',
      voteCount: 0,
      submittedBy: userId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      public: true
    };

    const docRef = await roadmapRef.add(newItem);

    return NextResponse.json({
      success: true,
      itemId: docRef.id,
      message: 'Feature request submitted successfully'
    });

  } catch (error) {
    console.error('Error submitting feature request:', error);
    return NextResponse.json({ 
      error: 'Failed to submit feature request' 
    }, { status: 500 });
  }
} 