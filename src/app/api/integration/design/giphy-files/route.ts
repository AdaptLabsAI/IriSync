import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { GiphyAdapter } from '@/lib/integrations/GiphyAdapter';
import { logger } from '@/lib/logging/logger';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      query = '', 
      page = 1, 
      limit = 25,
      type = 'gifs', // 'gifs', 'stickers', 'trending'
      rating = 'g',
      lang = 'en'
    } = await request.json();

    const files = await GiphyAdapter.listFiles(null, query, page, type as any);

    logger.info('GIPHY files retrieved successfully', {
      userId: session.user.id,
      query,
      type,
      count: files.length,
      page
    });

    return NextResponse.json({ 
      files,
      pagination: {
        page,
        limit,
        hasMore: files.length === limit
      }
    });

  } catch (error) {
    logger.error('Error retrieving GIPHY files:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve GIFs' },
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
    const query = searchParams.get('query') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');
    const type = searchParams.get('type') || 'gifs';
    const rating = searchParams.get('rating') || 'g';
    const lang = searchParams.get('lang') || 'en';

    const files = await GiphyAdapter.listFiles(null, query, page, type as any);

    return NextResponse.json({ 
      files,
      pagination: {
        page,
        limit,
        hasMore: files.length === limit
      }
    });

  } catch (error) {
    logger.error('Error retrieving GIPHY files:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve GIFs' },
      { status: 500 }
    );
  }
} 