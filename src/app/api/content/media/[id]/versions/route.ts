import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthentication } from '@/lib/features/auth/utils';
import { getFirestore } from '@/lib/core/firebase/admin';
import { logger } from '@/lib/core/logging/logger';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Get authenticated user ID
    const userId = await verifyAuthentication(req);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Validate media ID
    const { id } = params;
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid media ID' }, { status: 400 });
    }

    // Initialize Firestore
    const firestore = getFirestore();
    
    // Check media exists and belongs to the user
    const mediaRef = firestore.collection('users').doc(userId).collection('media').doc(id);
    const mediaDoc = await mediaRef.get();
    
    if (!mediaDoc.exists) {
      logger.warn({ userId, mediaId: id }, 'Media not found when fetching versions');
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }
    
    // Get version history
    const versionsRef = firestore.collection('users').doc(userId).collection('mediaVersions')
      .where('mediaId', '==', id)
      .orderBy('version', 'desc');
    
    const versionsSnapshot = await versionsRef.get();
    
    // Format versions for response
    const versions = versionsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        version: data.version,
        timestamp: data.timestamp?.toDate?.() || data.timestamp,
        userId: data.userId,
        action: data.action || 'update'
      };
    });
    
    // Include current version in response
    const currentMedia = mediaDoc.data() || {};
    const response = {
      mediaId: id,
      currentVersion: {
        ...currentMedia,
        createdAt: currentMedia.createdAt?.toDate?.() || currentMedia.createdAt,
        updatedAt: currentMedia.updatedAt?.toDate?.() || currentMedia.updatedAt,
      },
      versions
    };
    
    logger.info({ userId, mediaId: id, versionCount: versions.length }, 'Media versions fetched');
    
    return NextResponse.json(response);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'An unknown error occurred';
    logger.error({ error: errorMsg }, 'Error fetching media versions');
    
    return NextResponse.json({ 
      error: 'Failed to fetch version history', 
      message: errorMsg 
    }, { status: 500 });
  }
} 