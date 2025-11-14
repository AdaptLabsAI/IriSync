import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/features/auth';
import { logger } from '@/lib/core/logging/logger';

// Force dynamic rendering - required for Firebase/database access
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Pexels uses API key authentication only, no OAuth required
    logger.info('Pexels integration accessed', {
      userId: session.user.id
    });

    return NextResponse.json({ 
      requiresAuth: false,
      message: 'Pexels integration uses API key access. No authentication required.',
      status: 'ready'
    });

  } catch (error) {
    logger.error('Error accessing Pexels integration:', error);
    return NextResponse.json(
      { error: 'Failed to access Pexels integration' },
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

    // Pexels doesn't require OAuth, just return success
    logger.info('Pexels integration confirmed', {
      userId: session.user.id
    });

    return NextResponse.json({ 
      message: 'Pexels integration ready',
      status: 'connected'
    });

  } catch (error) {
    logger.error('Error confirming Pexels integration:', error);
    return NextResponse.json(
      { error: 'Failed to confirm Pexels integration' },
      { status: 500 }
    );
  }
} 