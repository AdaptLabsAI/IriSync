import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/features/auth';
import { PexelsAdapter } from '@/lib/features/integrations/PexelsAdapter';
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
      type = 'photos', // 'photos', 'videos', 'curated'
      orientation,
      size,
      color,
      locale
    } = await request.json();

    const files = await PexelsAdapter.listFiles(null, query, page, type as any);

    logger.info('Pexels files retrieved successfully', {
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
    logger.error('Error retrieving Pexels files:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve Pexels content' },
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
    const type = searchParams.get('type') || 'photos';
    const orientation = searchParams.get('orientation') as 'landscape' | 'portrait' | 'square' | undefined;
    const size = searchParams.get('size') as 'large' | 'medium' | 'small' | undefined;
    const color = searchParams.get('color') as any;
    const locale = searchParams.get('locale') || undefined;

    const files = await PexelsAdapter.listFiles(null, query, page, type as any);

    return NextResponse.json({ 
      files,
      pagination: {
        page,
        perPage,
        hasMore: files.length === perPage
      }
    });

  } catch (error) {
    logger.error('Error retrieving Pexels files:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve Pexels content' },
      { status: 500 }
    );
  }
} 