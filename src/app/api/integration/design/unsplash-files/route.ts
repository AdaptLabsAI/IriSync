import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/features/auth';
import { UnsplashAdapter } from '@/lib/features/integrations/UnsplashAdapter';
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

    const { 
      query = '', 
      page = 1, 
      perPage = 20,
      orientation,
      color,
      orderBy = 'relevant',
      type = 'search'
    } = await request.json();

    let files;

    switch (type) {
      case 'featured':
        const featuredPhotos = await UnsplashAdapter.getFeaturedPhotos(page, perPage);
        files = featuredPhotos.map(photo => UnsplashAdapter.formatAsFile(photo));
        break;
        
      case 'collections':
        const collections = await UnsplashAdapter.getCollections(page, perPage);
        files = collections.map((collection: any) => ({
          id: collection.id,
          name: collection.title,
          type: 'folder',
          mimeType: 'application/x-collection',
          size: collection.total_photos,
          lastModified: collection.updated_at,
          thumbnailUrl: collection.cover_photo?.urls?.thumb,
          platform: 'unsplash',
          metadata: {
            description: collection.description,
            totalPhotos: collection.total_photos,
            isPrivate: collection.private,
            user: collection.user
          }
        }));
        break;
        
      case 'search':
      default:
        if (query && query.trim()) {
          const searchResult = await UnsplashAdapter.searchPhotos(
            query, 
            page, 
            perPage, 
            orientation, 
            color, 
            orderBy
          );
          files = searchResult.results.map(photo => UnsplashAdapter.formatAsFile(photo));
        } else {
          const featuredPhotos = await UnsplashAdapter.getFeaturedPhotos(page, perPage);
          files = featuredPhotos.map(photo => UnsplashAdapter.formatAsFile(photo));
        }
        break;
    }

    logger.info('Unsplash files retrieved successfully', {
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
    logger.error('Error retrieving Unsplash files:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve files' },
      { status: 500 }
    );
  }
} 