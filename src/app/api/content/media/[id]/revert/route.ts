import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthentication } from '@/lib/auth/utils';
import { getFirestore, serverTimestamp } from '@/lib/firebase/admin';
import { logger } from '@/lib/logging/logger';

// Define interfaces for version data
interface MediaVersion {
  id: string;
  version: number;
  timestamp: any;
  userId: string;
  mediaId: string;
  data: any;
  action?: string;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
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

    // Parse request body
    const body = await req.json();
    const { version } = body;
    
    if (typeof version !== 'number') {
      return NextResponse.json({ error: 'Missing or invalid version number' }, { status: 400 });
    }

    // Initialize Firestore
    const firestore = getFirestore();
    
    // Get media item
    const mediaRef = firestore.collection('users').doc(userId).collection('media').doc(id);
    const mediaDoc = await mediaRef.get();
    
    if (!mediaDoc.exists) {
      logger.warn({ userId, mediaId: id }, 'Media not found when trying to revert');
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }
    
    // Get version history
    const versionsRef = firestore.collection('users').doc(userId).collection('mediaVersions')
      .where('mediaId', '==', id)
      .orderBy('version', 'desc');
    
    const versionsSnapshot = await versionsRef.get();
    
    if (versionsSnapshot.empty) {
      logger.warn({ userId, mediaId: id }, 'No version history found');
      return NextResponse.json({ error: 'No version history found' }, { status: 404 });
    }
    
    // Find the requested version
    const versions: MediaVersion[] = versionsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        version: data.version,
        timestamp: data.timestamp,
        userId: data.userId,
        mediaId: data.mediaId,
        data: data.data,
        action: data.action
      };
    });
    
    const targetVersion = versions.find(v => v.version === version);
    
    if (!targetVersion) {
      logger.warn({ userId, mediaId: id, version }, 'Requested version not found');
      return NextResponse.json({ error: 'Requested version not found' }, { status: 404 });
    }
    
    // Save current version to version history before reverting
    const currentMedia = mediaDoc.data() || {};
    
    // Get highest version number
    const highestVersion = versions.length > 0 ? 
      Math.max(...versions.map(v => v.version)) : 0;
    
    // Add current version to history
    await firestore.collection('users').doc(userId).collection('mediaVersions').add({
      mediaId: id,
      version: highestVersion + 1,
      timestamp: serverTimestamp(),
      userId: userId,
      data: currentMedia,
      action: 'pre_revert'
    });
    
    // Update media with reverted version data
    await mediaRef.update({
      ...targetVersion.data,
      updatedAt: serverTimestamp(),
      lastModifiedBy: userId
    });
    
    // Log the revert action
    await firestore.collection('users').doc(userId).collection('activity').add({
      action: 'revert_media_version',
      resourceId: id,
      resourceType: 'media',
      timestamp: serverTimestamp(),
      details: {
        fromVersion: highestVersion + 1,
        toVersion: version
      }
    });
    
    logger.info({ userId, mediaId: id, fromVersion: highestVersion + 1, toVersion: version }, 'Media version reverted');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Media reverted to specified version',
      version: {
        previous: highestVersion + 1,
        current: version
      }
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'An unknown error occurred';
    logger.error({ error: errorMsg }, 'Error reverting media version');
    
    return NextResponse.json({ 
      error: 'Failed to revert media version', 
      message: errorMsg 
    }, { status: 500 });
  }
} 