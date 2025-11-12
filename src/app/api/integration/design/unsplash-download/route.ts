import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { UnsplashAdapter } from '@/lib/integrations/UnsplashAdapter';
import { logger } from '@/lib/logging/logger';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { photoId, size = 'regular' } = await request.json();

    if (!photoId) {
      return NextResponse.json({ error: 'Photo ID required' }, { status: 400 });
    }

    // Get photo details
    const photo = await UnsplashAdapter.getPhoto(photoId);
    
    // Get download URL and trigger download tracking
    const downloadInfo = await UnsplashAdapter.downloadPhoto(photoId);
    
    // Trigger download tracking (required by Unsplash API)
    await UnsplashAdapter.triggerDownload(downloadInfo.downloadLocation);

    // Select the appropriate size URL
    let downloadUrl;
    switch (size) {
      case 'thumb':
        downloadUrl = photo.urls.thumb;
        break;
      case 'small':
        downloadUrl = photo.urls.small;
        break;
      case 'regular':
        downloadUrl = photo.urls.regular;
        break;
      case 'full':
        downloadUrl = photo.urls.full;
        break;
      case 'raw':
        downloadUrl = photo.urls.raw;
        break;
      default:
        downloadUrl = photo.urls.regular;
    }

    logger.info('Unsplash photo download initiated', {
      userId: session.user.id,
      photoId,
      size,
      photographer: photo.user.name
    });

    return NextResponse.json({
      downloadUrl,
      photo: UnsplashAdapter.formatAsFile(photo),
      attribution: {
        photographer: photo.user.name,
        photographerUrl: photo.user.links.html,
        unsplashUrl: photo.links.html,
        downloadLocation: downloadInfo.downloadLocation
      }
    });

  } catch (error) {
    logger.error('Error downloading Unsplash photo:', error);
    return NextResponse.json(
      { error: 'Failed to download photo' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const photoId = searchParams.get('photoId');
    const size = searchParams.get('size') || 'regular';

    if (!photoId) {
      return NextResponse.json({ error: 'Photo ID required' }, { status: 400 });
    }

    // Get photo details
    const photo = await UnsplashAdapter.getPhoto(photoId);
    
    // Get download URL and trigger download tracking
    const downloadInfo = await UnsplashAdapter.downloadPhoto(photoId);
    
    // Trigger download tracking (required by Unsplash API)
    await UnsplashAdapter.triggerDownload(downloadInfo.downloadLocation);

    // Select the appropriate size URL
    let downloadUrl;
    switch (size) {
      case 'thumb':
        downloadUrl = photo.urls.thumb;
        break;
      case 'small':
        downloadUrl = photo.urls.small;
        break;
      case 'regular':
        downloadUrl = photo.urls.regular;
        break;
      case 'full':
        downloadUrl = photo.urls.full;
        break;
      case 'raw':
        downloadUrl = photo.urls.raw;
        break;
      default:
        downloadUrl = photo.urls.regular;
    }

    return NextResponse.json({
      downloadUrl,
      photo: UnsplashAdapter.formatAsFile(photo),
      attribution: {
        photographer: photo.user.name,
        photographerUrl: photo.user.links.html,
        unsplashUrl: photo.links.html,
        downloadLocation: downloadInfo.downloadLocation
      }
    });

  } catch (error) {
    logger.error('Error downloading Unsplash photo:', error);
    return NextResponse.json(
      { error: 'Failed to download photo' },
      { status: 500 }
    );
  }
} 