/**
 * Media Upload API
 * POST /api/media/upload - Upload media asset
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { firestore } from '@/lib/core/firebase';
import { getDoc, doc } from 'firebase/firestore';
import { mediaAssetService } from '@/lib/features/media/MediaAssetService';

/**
 * POST /api/media/upload
 * Upload a media file
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Get user's organization
    const userDoc = await getDoc(doc(firestore, 'users', userId));
    if (!userDoc.exists()) {
      return NextResponse.json(
        { error: 'User Not Found', message: 'User document not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    const organizationId = userData.currentOrganizationId || userData.personalOrganizationId;

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Organization not found' },
        { status: 400 }
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = formData.get('folder') as string | null;
    const tags = formData.get('tags') as string | null;
    const category = formData.get('category') as string | null;
    const title = formData.get('title') as string | null;
    const description = formData.get('description') as string | null;
    const altText = formData.get('altText') as string | null;
    const isBrandAsset = formData.get('isBrandAsset') === 'true';
    const brandAssetType = formData.get('brandAssetType') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'Invalid Request', message: 'File is required' },
        { status: 400 }
      );
    }

    // Validate file size (max 100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          error: 'File Too Large',
          message: `File size exceeds maximum allowed size of ${maxSize / 1024 / 1024}MB`,
        },
        { status: 413 }
      );
    }

    // Upload asset
    const asset = await mediaAssetService.uploadAsset(userId, organizationId, file, {
      folder: folder || undefined,
      tags: tags ? tags.split(',').map(t => t.trim()) : undefined,
      category: category as any,
      title: title || undefined,
      description: description || undefined,
      altText: altText || undefined,
      isBrandAsset,
      brandAssetType: brandAssetType as any,
    });

    return NextResponse.json({
      success: true,
      asset,
      message: 'Asset uploaded successfully',
    });
  } catch (error) {
    console.error('Error uploading asset:', error);
    return NextResponse.json(
      {
        error: 'Server Error',
        message: 'Failed to upload asset',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
