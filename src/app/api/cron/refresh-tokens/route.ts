import { NextRequest, NextResponse } from 'next/server';
import { tokenRefreshService } from '@/lib/features/platforms/auth/token-refresh-service';
import { logger } from '@/lib/core/logging/logger';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Cron endpoint to refresh expired OAuth tokens
 * This should be called periodically (e.g., every hour) via a cron service
 *
 * Security: Verify cron secret to prevent unauthorized access
 *
 * Example cron schedule (Vercel):
 * - Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/refresh-tokens",
 *     "schedule": "0 * * * *"
 *   }]
 * }
 */
export async function GET(req: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      logger.warn('Unauthorized cron request', {
        hasAuthHeader: !!authHeader,
        hasCronSecret: !!cronSecret
      });
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    logger.info('Starting scheduled token refresh job');

    const startTime = Date.now();

    // Run token refresh for all expired tokens
    const result = await tokenRefreshService.refreshAllExpiredTokens();

    const duration = Date.now() - startTime;

    logger.info('Scheduled token refresh completed', {
      ...result,
      durationMs: duration
    });

    return NextResponse.json({
      success: true,
      ...result,
      durationMs: duration
    });

  } catch (error: any) {
    logger.error('Error in scheduled token refresh', {
      error: error.message || error
    });

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to refresh tokens'
      },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint for manual token refresh
 * Requires authentication and admin privileges
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, connectionId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      );
    }

    logger.info('Manual token refresh requested', { userId, connectionId });

    let result;

    if (connectionId) {
      // Refresh specific connection
      const success = await tokenRefreshService.refreshToken(userId, connectionId);
      result = {
        success,
        refreshedCount: success ? 1 : 0,
        connectionId
      };
    } else {
      // Refresh all expired tokens for user
      const refreshedCount = await tokenRefreshService.refreshExpiredTokens(userId);
      result = {
        success: refreshedCount > 0,
        refreshedCount
      };
    }

    return NextResponse.json(result);

  } catch (error: any) {
    logger.error('Error in manual token refresh', {
      error: error.message || error
    });

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to refresh token'
      },
      { status: 500 }
    );
  }
}
