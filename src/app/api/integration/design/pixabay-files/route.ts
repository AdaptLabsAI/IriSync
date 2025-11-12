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

    const { 
      query = '', 
      page = 1, 
      perPage = 20,
      type = 'images', // 'images', 'videos', 'photos', 'illustrations', 'vectors', 'editors_choice'
      imageType = 'all',
      orientation = 'all',
      category = 'backgrounds',
      minWidth = 0,
      minHeight = 0,
      colors = 'grayscale',
      editorsChoice = false,
      safeSearch = true,
      order = 'popular'
    } = await request.json();

    const files = await PixabayAdapter.listFiles(null, query, page, type as any);

    logger.info('Pixabay files retrieved successfully', {
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
        perPage,
        hasMore: files.length === perPage
      }
    });

  } catch (error) {
    logger.error('Error retrieving Pixabay files:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve Pixabay content' },
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
    const perPage = parseInt(searchParams.get('perPage') || '20');
    const type = searchParams.get('type') || 'images';
    const imageType = searchParams.get('imageType') || 'all';
    const orientation = searchParams.get('orientation') || 'all';
    const category = searchParams.get('category') || 'backgrounds';
    const minWidth = parseInt(searchParams.get('minWidth') || '0');
    const minHeight = parseInt(searchParams.get('minHeight') || '0');
    const colors = searchParams.get('colors') || 'grayscale';
    const editorsChoice = searchParams.get('editorsChoice') === 'true';
    const safeSearch = searchParams.get('safeSearch') !== 'false';
    const order = searchParams.get('order') || 'popular';

    const files = await PixabayAdapter.listFiles(null, query, page, type as any);

    return NextResponse.json({ 
      files,
      pagination: {
        page,
        perPage,
        hasMore: files.length === perPage
      }
    });

  } catch (error) {
    logger.error('Error retrieving Pixabay files:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve Pixabay content' },
      { status: 500 }
    );
  }
} 