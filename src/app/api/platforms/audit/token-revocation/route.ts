import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from '@/lib/firebase/admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { platformType, success } = body;

    if (!platformType || success === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const db = getFirestore();
    
    // Store revocation in database for auditing
    await db.collection('tokenRevocations').add({
      platformType,
      revokedAt: new Date(),
      success
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error logging token revocation:', error);
    return NextResponse.json(
      { error: 'Failed to log token revocation' },
      { status: 500 }
    );
  }
} 