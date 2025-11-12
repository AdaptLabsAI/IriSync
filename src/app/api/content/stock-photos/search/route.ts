import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/features/auth';
import stockPhotoService, { StockPhotoFilters } from '@/lib/features/content/StockPhotoService';
import { logger } from '@/lib/core/logging/logger';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      query = '',
      provider = 'all',
      orientation = 'all',
      color,
      category,
      license = 'all',
      minWidth,
      minHeight,
      aspectRatio,
      sortBy = 'relevance',
      page = 1,
      perPage = 20
    } = body;

    // Validate inputs
    if (perPage > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 photos per page allowed' },
        { status: 400 }
      );
    }

    const filters: StockPhotoFilters = {
      query: query.trim(),
      provider: provider === 'all' ? 'all' : provider,
      orientation: orientation === 'all' ? undefined : orientation,
      color,
      category,
      license: license === 'all' ? undefined : license,
      minWidth,
      minHeight,
      aspectRatio,
      sortBy,
      page: Math.max(1, page),
      perPage: Math.min(50, Math.max(1, perPage))
    };

    const organizationId = session.user.organizationId || session.user.id;
    const result = await stockPhotoService.searchPhotos(filters, organizationId, session.user.id);

    logger.info('Stock photos search completed', {
      userId: session.user.id,
      organizationId,
      query: filters.query,
      provider: filters.provider,
      resultCount: result.photos.length,
      searchTime: result.searchTime
    });

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Error searching stock photos:', error);
    return NextResponse.json(
      { 
        error: 'Failed to search stock photos',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
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
    const provider = searchParams.get('provider') || 'all';
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = Math.min(50, parseInt(searchParams.get('perPage') || '20'));

    const photos = await stockPhotoService.getFeaturedPhotos(
      provider as any,
      page,
      perPage
    );

    logger.info('Featured stock photos retrieved', {
      userId: session.user.id,
      provider,
      count: photos.length,
      page
    });

    return NextResponse.json({
      success: true,
      data: {
        photos,
        pagination: {
          page,
          perPage,
          hasMore: photos.length === perPage
        }
      }
    });

  } catch (error) {
    logger.error('Error getting featured stock photos:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get featured photos',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 