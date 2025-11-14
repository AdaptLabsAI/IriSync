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

    // GIPHY uses API key authentication only, no OAuth required
    logger.info('GIPHY integration accessed', {
      userId: session.user.id
    });

    return NextResponse.json({ 
      requiresAuth: false,
      message: 'GIPHY integration uses API key access. No authentication required.',
      status: 'ready'
    });

  } catch (error) {
    logger.error('Error accessing GIPHY integration:', error);
    return NextResponse.json(
      { error: 'Failed to access GIPHY integration' },
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

    // GIPHY doesn't require OAuth, just return success
    logger.info('GIPHY integration confirmed', {
      userId: session.user.id
    });

    return NextResponse.json({ 
      message: 'GIPHY integration ready',
      status: 'connected'
    });

  } catch (error) {
    logger.error('Error confirming GIPHY integration:', error);
    return NextResponse.json(
      { error: 'Failed to confirm GIPHY integration' },
      { status: 500 }
    );
  }
} 