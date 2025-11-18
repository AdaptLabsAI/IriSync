/**
 * Cron Job: Fetch Post Metrics
 *
 * This API route is called by Vercel Cron or external cron service
 * to fetch performance metrics for published posts.
 *
 * Vercel Cron Configuration (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/fetch-metrics",
 *     "schedule": "0 * * * *"
 *   }]
 * }
 *
 * Security: Protected by CRON_SECRET environment variable
 */

import { NextRequest, NextResponse } from 'next/server';
import { metricsFetcher } from '@/lib/features/analytics/MetricsFetcher';
import { logger } from '@/lib/core/logging/logger';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes max execution

/**
 * POST /api/cron/fetch-metrics
 * Fetch metrics for all eligible published posts
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret) {
      if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
        logger.warn('Unauthorized cron access attempt - fetch-metrics', {
          ip: request.headers.get('x-forwarded-for') || 'unknown'
        });

        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    } else {
      logger.warn('CRON_SECRET not configured - fetch-metrics endpoint unprotected!');
    }

    logger.info('Cron job started: fetch-metrics');

    // Fetch metrics
    const stats = await metricsFetcher.fetchMetrics();

    const duration = Date.now() - startTime;

    logger.info('Cron job completed: fetch-metrics', {
      processed: stats.processed,
      successful: stats.successful,
      failed: stats.failed,
      skipped: stats.skipped,
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
      message: `Processed ${stats.processed} posts: ${stats.successful} successful, ${stats.failed} failed, ${stats.skipped} skipped`
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('Cron job error: fetch-metrics', {
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
 * GET /api/cron/fetch-metrics
 * Health check endpoint
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    endpoint: 'fetch-metrics',
    status: metricsFetcher.isProcessing() ? 'processing' : 'ready',
    description: 'Fetches performance metrics for published social media posts',
    schedule: 'Every hour (0 * * * *)',
    security: process.env.CRON_SECRET ? 'Protected with CRON_SECRET' : 'UNPROTECTED - Set CRON_SECRET!',
    maxDuration: '300 seconds'
  });
}
