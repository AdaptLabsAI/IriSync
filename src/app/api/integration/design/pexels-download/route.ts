import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PexelsAdapter } from '@/lib/integrations/PexelsAdapter';
import { logger } from '@/lib/logging/logger';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { mediaId, type = 'photo', size = 'original' } = await request.json();

    if (!mediaId) {
      return NextResponse.json({ error: 'Media ID required' }, { status: 400 });
    }

    let downloadUrl;
    let media;
    let attribution;

    if (type === 'video') {
      // Get video details
      const video = await PexelsAdapter.getVideoById(parseInt(mediaId));
      media = PexelsAdapter.formatVideoAsFile(video);
      
      // Select best quality video file
      const bestQuality = video.video_files.find(file => file.quality === 'hd') || 
                         video.video_files.find(file => file.quality === 'sd') ||
                         video.video_files[0];
      
      downloadUrl = bestQuality?.link || '';
      attribution = {
        photographer: video.user.name,
        photographerUrl: video.user.url,
        pexelsUrl: video.url
      };
    } else {
      // Get photo details
      const photo = await PexelsAdapter.getPhotoById(parseInt(mediaId));
      media = PexelsAdapter.formatPhotoAsFile(photo);
      
      // Select the appropriate size URL
      switch (size) {
        case 'tiny':
          downloadUrl = photo.src.tiny;
          break;
        case 'small':
          downloadUrl = photo.src.small;
          break;
        case 'medium':
          downloadUrl = photo.src.medium;
          break;
        case 'large':
          downloadUrl = photo.src.large;
          break;
        case 'large2x':
          downloadUrl = photo.src.large2x;
          break;
        case 'original':
        default:
          downloadUrl = photo.src.original;
          break;
      }
      
      attribution = {
        photographer: photo.photographer,
        photographerUrl: photo.photographer_url,
        pexelsUrl: photo.url
      };
    }

    logger.info('Pexels media download initiated', {
      userId: session.user.id,
      mediaId,
      type,
      size,
      photographer: attribution.photographer
    });

    return NextResponse.json({
      downloadUrl,
      media,
      attribution
    });

  } catch (error) {
    logger.error('Error downloading Pexels media:', error);
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
    const type = searchParams.get('type') || 'photo';
    const size = searchParams.get('size') || 'original';

    if (!mediaId) {
      return NextResponse.json({ error: 'Media ID required' }, { status: 400 });
    }

    let downloadUrl;
    let media;
    let attribution;

    if (type === 'video') {
      const video = await PexelsAdapter.getVideoById(parseInt(mediaId));
      media = PexelsAdapter.formatVideoAsFile(video);
      
      const bestQuality = video.video_files.find(file => file.quality === 'hd') || 
                         video.video_files.find(file => file.quality === 'sd') ||
                         video.video_files[0];
      
      downloadUrl = bestQuality?.link || '';
      attribution = {
        photographer: video.user.name,
        photographerUrl: video.user.url,
        pexelsUrl: video.url
      };
    } else {
      const photo = await PexelsAdapter.getPhotoById(parseInt(mediaId));
      media = PexelsAdapter.formatPhotoAsFile(photo);
      
      switch (size) {
        case 'tiny':
          downloadUrl = photo.src.tiny;
          break;
        case 'small':
          downloadUrl = photo.src.small;
          break;
        case 'medium':
          downloadUrl = photo.src.medium;
          break;
        case 'large':
          downloadUrl = photo.src.large;
          break;
        case 'large2x':
          downloadUrl = photo.src.large2x;
          break;
        case 'original':
        default:
          downloadUrl = photo.src.original;
          break;
      }
      
      attribution = {
        photographer: photo.photographer,
        photographerUrl: photo.photographer_url,
        pexelsUrl: photo.url
      };
    }

    return NextResponse.json({
      downloadUrl,
      media,
      attribution
    });

  } catch (error) {
    logger.error('Error downloading Pexels media:', error);
    return NextResponse.json(
      { error: 'Failed to download media' },
      { status: 500 }
    );
  }
} 