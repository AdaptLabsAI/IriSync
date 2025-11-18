/**
 * Cron Job: Publish Scheduled Posts
 *
 * This API route is called by Vercel Cron or external cron service
 * to process and publish scheduled social media posts.
 *
 * Vercel Cron Configuration (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/publish-posts",
 *     "schedule": "*\/5 * * * *"
 *   }]
 * }
 *
 * Security: Protected by CRON_SECRET environment variable
 */

import { NextRequest, NextResponse } from 'next/server';
import { publishProcessor } from '@/lib/features/scheduling/PublishProcessor';
import { logger } from '@/lib/core/logging/logger';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes max execution

/**
 * POST /api/cron/publish-posts
 * Process and publish all due posts
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret) {
      if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
        logger.warn('Unauthorized cron access attempt', {
          ip: request.headers.get('x-forwarded-for') || 'unknown'
        });

        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    } else {
      logger.warn('CRON_SECRET not configured - cron endpoint unprotected!');
    }

    logger.info('Cron job started: publish-posts');

    // Process due posts
    const stats = await publishProcessor.processDuePosts();

    const duration = Date.now() - startTime;

    logger.info('Cron job completed: publish-posts', {
      processed: stats.processed,
      successful: stats.successful,
      failed: stats.failed,
      duration
    });

    return NextResponse.json({
      success: true,
      stats: {
        processed: stats.processed,
        successful: stats.successful,
        failed: stats.failed,
        skipped: stats.skipped,
        duration,
        errors: stats.errors
      },
      message: `Processed ${stats.processed} posts: ${stats.successful} successful, ${stats.failed} failed`
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('Cron job error: publish-posts', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        duration
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/publish-posts
 * Health check endpoint
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    endpoint: 'publish-posts',
    status: 'ready',
    description: 'Processes and publishes scheduled social media posts',
    schedule: 'Every 5 minutes (*\/5 * * * *)',
    security: process.env.CRON_SECRET ? 'Protected with CRON_SECRET' : 'UNPROTECTED - Set CRON_SECRET!',
    maxDuration: '300 seconds'
  });
}
