import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/features/auth';
import { PixabayAdapter } from '@/lib/features/integrations/PixabayAdapter';
import { logger } from '@/lib/core/logging/logger';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { mediaId, type = 'image', size = 'webformat' } = await request.json();

    if (!mediaId) {
      return NextResponse.json({ error: 'Media ID required' }, { status: 400 });
    }

    let downloadUrl;
    let media;
    let attribution;

    if (type === 'video') {
      // Get video details
      const video = await PixabayAdapter.getVideoById(parseInt(mediaId));
      if (!video) {
        return NextResponse.json({ error: 'Video not found' }, { status: 404 });
      }
      
      media = PixabayAdapter.formatVideoAsFile(video);
      
      // Select best quality video file
      const bestQuality = video.videos.large || video.videos.medium || video.videos.small || video.videos.tiny;
      downloadUrl = bestQuality.url;
      
      attribution = {
        user: video.user,
        userId: video.user_id,
        pixabayUrl: video.pageURL
      };
    } else {
      // Get image details
      const image = await PixabayAdapter.getImageById(parseInt(mediaId));
      if (!image) {
        return NextResponse.json({ error: 'Image not found' }, { status: 404 });
      }
      
      media = PixabayAdapter.formatImageAsFile(image);
      
      // Select the appropriate size URL
      switch (size) {
        case 'preview':
          downloadUrl = image.previewURL;
          break;
        case 'webformat':
          downloadUrl = image.webformatURL;
          break;
        case 'large':
          downloadUrl = image.largeImageURL;
          break;
        case 'fullHD':
          downloadUrl = image.fullHDURL || image.largeImageURL;
          break;
        case 'vector':
          downloadUrl = image.vectorURL || image.webformatURL;
          break;
        default:
          downloadUrl = image.webformatURL;
          break;
      }
      
      attribution = {
        user: image.user,
        userId: image.user_id,
        pixabayUrl: image.pageURL
      };
    }

    logger.info('Pixabay media download initiated', {
      userId: session.user.id,
      mediaId,
      type,
      size,
      user: attribution.user
    });

    return NextResponse.json({
      downloadUrl,
      media,
      attribution
    });

  } catch (error) {
    logger.error('Error downloading Pixabay media:', error);
    return NextResponse.json(
      { error: 'Failed to download media' },
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
    const mediaId = searchParams.get('mediaId');
    const type = searchParams.get('type') || 'image';
    const size = searchParams.get('size') || 'webformat';

    if (!mediaId) {
      return NextResponse.json({ error: 'Media ID required' }, { status: 400 });
    }

    let downloadUrl;
    let media;
    let attribution;

    if (type === 'video') {
      const video = await PixabayAdapter.getVideoById(parseInt(mediaId));
      if (!video) {
        return NextResponse.json({ error: 'Video not found' }, { status: 404 });
      }
      
      media = PixabayAdapter.formatVideoAsFile(video);
      const bestQuality = video.videos.large || video.videos.medium || video.videos.small || video.videos.tiny;
      downloadUrl = bestQuality.url;
      
      attribution = {
        user: video.user,
        userId: video.user_id,
        pixabayUrl: video.pageURL
      };
    } else {
      const image = await PixabayAdapter.getImageById(parseInt(mediaId));
      if (!image) {
        return NextResponse.json({ error: 'Image not found' }, { status: 404 });
      }
      
      media = PixabayAdapter.formatImageAsFile(image);
      
      switch (size) {
        case 'preview':
          downloadUrl = image.previewURL;
          break;
        case 'webformat':
          downloadUrl = image.webformatURL;
          break;
        case 'large':
          downloadUrl = image.largeImageURL;
          break;
        case 'fullHD':
          downloadUrl = image.fullHDURL || image.largeImageURL;
          break;
        case 'vector':
          downloadUrl = image.vectorURL || image.webformatURL;
          break;
        default:
          downloadUrl = image.webformatURL;
          break;
      }
      
      attribution = {
        user: image.user,
        userId: image.user_id,
        pixabayUrl: image.pageURL
      };
    }

    return NextResponse.json({
      downloadUrl,
      media,
      attribution
    });

  } catch (error) {
    logger.error('Error downloading Pixabay media:', error);
    return NextResponse.json(
      { error: 'Failed to download media' },
      { status: 500 }
    );
  }
} 