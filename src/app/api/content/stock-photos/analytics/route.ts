import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/features/auth';
import stockPhotoService from '@/lib/features/content/StockPhotoService';
import { logger } from '@/lib/core/logging/logger';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const type = searchParams.get('type') || 'analytics'; // 'analytics' or 'downloads'

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      );
    }

    const organizationId = session.user.organizationId || session.user.id;
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Validate date range
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    if (start > end) {
      return NextResponse.json(
        { error: 'Start date must be before end date' },
        { status: 400 }
      );
    }

    // Limit to 1 year max
    const oneYear = 365 * 24 * 60 * 60 * 1000;
    if (end.getTime() - start.getTime() > oneYear) {
      return NextResponse.json(
        { error: 'Date range cannot exceed 1 year' },
        { status: 400 }
      );
    }

    let data;

    if (type === 'downloads') {
      // Get download history
      const limit = parseInt(searchParams.get('limit') || '50');
      data = await stockPhotoService.getDownloadHistory(organizationId, Math.min(100, limit));
    } else {
      // Get analytics
      data = await stockPhotoService.getAnalytics(organizationId, start, end);
    }

    logger.info('Stock photo analytics retrieved', {
      userId: session.user.id,
      organizationId,
      type,
      startDate: start.toISOString(),
      endDate: end.toISOString()
    });

    return NextResponse.json({
      success: true,
      data
    });

  } catch (error) {
    logger.error('Error getting stock photo analytics:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get analytics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { downloadId, contentId, contentType } = body;

    if (!downloadId || !contentId || !contentType) {
      return NextResponse.json(
        { error: 'Download ID, content ID, and content type are required' },
        { status: 400 }
      );
    }

    const validContentTypes = ['post', 'story', 'design', 'campaign'];
    if (!validContentTypes.includes(contentType)) {
      return NextResponse.json(
        { error: `Invalid content type. Must be one of: ${validContentTypes.join(', ')}` },
        { status: 400 }
      );
    }

    await stockPhotoService.trackPhotoUsage(downloadId, contentId, contentType);

    logger.info('Stock photo usage tracked', {
      userId: session.user.id,
      downloadId,
      contentId,
      contentType
    });

    return NextResponse.json({
      success: true,
      message: 'Photo usage tracked successfully'
    });

  } catch (error) {
    logger.error('Error tracking stock photo usage:', error);
    return NextResponse.json(
      { 
        error: 'Failed to track photo usage',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 