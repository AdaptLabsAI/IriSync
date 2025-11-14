import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/features/auth';
import { GiphyAdapter } from '@/lib/features/integrations/GiphyAdapter';
import { logger } from '@/lib/core/logging/logger';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { gifId, format = 'original' } = await request.json();

    if (!gifId) {
      return NextResponse.json({ error: 'GIF ID required' }, { status: 400 });
    }

    // Get GIF details
    const gifData = await GiphyAdapter.getGifById(gifId);
    const gif = gifData.data;
    
    // Track analytics (required by GIPHY API terms)
    await GiphyAdapter.trackAnalytics(gif, 'onclick');

    // Select the appropriate format URL
    let downloadUrl;
    switch (format) {
      case 'original':
        downloadUrl = gif.images.original.url;
        break;
      case 'mp4':
        downloadUrl = gif.images.original.mp4;
        break;
      case 'webp':
        downloadUrl = gif.images.original.webp;
        break;
      case 'fixed_height':
        downloadUrl = gif.images.fixed_height.url;
        break;
      case 'fixed_width':
        downloadUrl = gif.images.fixed_width.url;
        break;
      default:
        downloadUrl = gif.images.original.url;
    }

    logger.info('GIPHY GIF download initiated', {
      userId: session.user.id,
      gifId,
      format,
      title: gif.title
    });

    return NextResponse.json({
      downloadUrl,
      gif: GiphyAdapter.formatAsFile(gif),
      attribution: {
        title: gif.title,
        username: gif.username,
        giphyUrl: gif.url,
        embedUrl: gif.embed_url
      }
    });

  } catch (error) {
    logger.error('Error downloading GIPHY GIF:', error);
    return NextResponse.json(
      { error: 'Failed to download GIF' },
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
    const gifId = searchParams.get('gifId');
    const format = searchParams.get('format') || 'original';

    if (!gifId) {
      return NextResponse.json({ error: 'GIF ID required' }, { status: 400 });
    }

    // Get GIF details
    const gifData = await GiphyAdapter.getGifById(gifId);
    const gif = gifData.data;
    
    // Track analytics (required by GIPHY API terms)
    await GiphyAdapter.trackAnalytics(gif, 'onclick');

    // Select the appropriate format URL
    let downloadUrl;
    switch (format) {
      case 'original':
        downloadUrl = gif.images.original.url;
        break;
      case 'mp4':
        downloadUrl = gif.images.original.mp4;
        break;
      case 'webp':
        downloadUrl = gif.images.original.webp;
        break;
      case 'fixed_height':
        downloadUrl = gif.images.fixed_height.url;
        break;
      case 'fixed_width':
        downloadUrl = gif.images.fixed_width.url;
        break;
      default:
        downloadUrl = gif.images.original.url;
    }

    return NextResponse.json({
      downloadUrl,
      gif: GiphyAdapter.formatAsFile(gif),
      attribution: {
        title: gif.title,
        username: gif.username,
        giphyUrl: gif.url,
        embedUrl: gif.embed_url
      }
    });

  } catch (error) {
    logger.error('Error downloading GIPHY GIF:', error);
    return NextResponse.json(
      { error: 'Failed to download GIF' },
      { status: 500 }
    );
  }
} 