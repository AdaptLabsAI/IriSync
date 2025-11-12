import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import stockPhotoService from '@/lib/content/StockPhotoService';
import { logger } from '@/lib/logging/logger';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      photoId,
      provider,
      size = 'medium',
      purpose = 'content_creation'
    } = body;

    // Validate required fields
    if (!photoId || !provider) {
      return NextResponse.json(
        { error: 'Photo ID and provider are required' },
        { status: 400 }
      );
    }

    // Validate size
    const validSizes = ['thumbnail', 'small', 'medium', 'large', 'original'];
    if (!validSizes.includes(size)) {
      return NextResponse.json(
        { error: `Invalid size. Must be one of: ${validSizes.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate purpose
    const validPurposes = ['content_creation', 'design', 'marketing', 'social_media', 'other'];
    if (!validPurposes.includes(purpose)) {
      return NextResponse.json(
        { error: `Invalid purpose. Must be one of: ${validPurposes.join(', ')}` },
        { status: 400 }
      );
    }

    const organizationId = session.user.organizationId || session.user.id;
    
    const downloadResult = await stockPhotoService.downloadPhoto(
      photoId,
      provider,
      size,
      organizationId,
      session.user.id,
      purpose
    );

    logger.info('Stock photo downloaded', {
      userId: session.user.id,
      organizationId,
      photoId,
      provider,
      size,
      purpose,
      downloadId: downloadResult.downloadId
    });

    return NextResponse.json({
      success: true,
      data: {
        downloadUrl: downloadResult.downloadUrl,
        attribution: downloadResult.attribution,
        downloadId: downloadResult.downloadId,
        message: 'Photo downloaded successfully. Please ensure proper attribution when using this photo.'
      }
    });

  } catch (error) {
    logger.error('Error downloading stock photo:', error);
    return NextResponse.json(
      { 
        error: 'Failed to download stock photo',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 