import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/nextauth';
import { SocialInboxController } from '@/lib/content/SocialInboxController';
import { logger } from '@/lib/logging/logger';

/**
 * GET /api/content/inbox/stats
 * Get comprehensive inbox statistics and analytics
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const controller = new SocialInboxController();
    const stats = await controller.getInboxStats(session.user.id);

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Error fetching inbox statistics', { error });
    
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 