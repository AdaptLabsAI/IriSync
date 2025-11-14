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

    // Pixabay uses API key authentication only, no OAuth required
    logger.info('Pixabay integration accessed', {
      userId: session.user.id
    });

    return NextResponse.json({ 
      requiresAuth: false,
      message: 'Pixabay integration uses API key access. No authentication required.',
      status: 'ready'
    });

  } catch (error) {
    logger.error('Error accessing Pixabay integration:', error);
    return NextResponse.json(
      { error: 'Failed to access Pixabay integration' },
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

    // Pixabay doesn't require OAuth, just return success
    logger.info('Pixabay integration confirmed', {
      userId: session.user.id
    });

    return NextResponse.json({ 
      message: 'Pixabay integration ready',
      status: 'connected'
    });

  } catch (error) {
    logger.error('Error confirming Pixabay integration:', error);
    return NextResponse.json(
      { error: 'Failed to confirm Pixabay integration' },
      { status: 500 }
    );
  }
} 