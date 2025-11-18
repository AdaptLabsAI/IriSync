/**
 * Social Listening Cron Job
 *
 * Automated cron job that fetches mentions and engagement items from social platforms.
 * Runs every 30 minutes to keep social listening data fresh.
 *
 * Protected by CRON_SECRET environment variable.
 */

import { NextRequest, NextResponse } from 'next/server';
import { firestore } from '@/lib/core/firebase';
import { getDocs, collection } from 'firebase/firestore';
import { socialListeningService } from '@/lib/features/monitoring/SocialListeningService';
import { engagementService } from '@/lib/features/monitoring/EngagementService';
import { sentimentAnalysisService } from '@/lib/features/monitoring/SentimentAnalysisService';

export const maxDuration = 300; // 5 minutes max execution time

/**
 * Fetch social listening data for all active monitoring configs
 */
async function fetchSocialListeningData(): Promise<{
  usersProcessed: number;
  mentionsFetched: number;
  engagementFetched: number;
  errors: string[];
}> {
  const stats = {
    usersProcessed: 0,
    mentionsFetched: 0,
    engagementFetched: 0,
    errors: [] as string[],
  };

  try {
    // Get all monitoring configs that are enabled
    const configsSnapshot = await getDocs(collection(firestore, 'monitoringConfigs'));

    for (const configDoc of configsSnapshot.docs) {
      const config = configDoc.data();

      if (!config.enabled) {
        continue;
      }

      try {
        const userId = config.userId;
        const organizationId = config.organizationId;

        // Get user's platform connections
        const connectionsSnapshot = await getDocs(collection(firestore, 'platformConnections'));
        let platformConnections: any[] = [];

        for (const connDoc of connectionsSnapshot.docs) {
          if (connDoc.id === userId) {
            platformConnections = connDoc.data().connections || [];
            break;
          }
        }

        if (platformConnections.length === 0) {
          continue;
        }

        // Fetch mentions
        const mentionsResult = await socialListeningService.fetchAllMentions(
          userId,
          organizationId,
          platformConnections
        );

        if (mentionsResult.mentions.length > 0) {
          // Analyze sentiment
          const batchResult = await sentimentAnalysisService.analyzeBatch(mentionsResult.mentions);

          // Update mentions with sentiment
          mentionsResult.mentions.forEach((mention, index) => {
            const sentiment = batchResult.results.get(mention.id || `temp-${index}`);
            if (sentiment) {
              mention.sentiment = sentiment.sentiment;
              mention.sentimentScore = sentiment.score;
              mention.priority = sentiment.priority;
            }
          });

          // Save mentions
          const saveResult = await socialListeningService.saveMentions(mentionsResult.mentions);
          stats.mentionsFetched += saveResult.saved;
          stats.errors.push(...saveResult.errors);
        }

        stats.errors.push(...mentionsResult.errors);

        // Fetch engagement items
        const engagementResult = await engagementService.fetchAllEngagement(
          userId,
          organizationId,
          platformConnections
        );

        if (engagementResult.items.length > 0) {
          // Analyze sentiment for engagement
          await engagementService.analyzeEngagementSentiment(engagementResult.items);

          // Save engagement items
          const saveResult = await engagementService.saveEngagementItems(engagementResult.items);
          stats.engagementFetched += saveResult.saved;
          stats.errors.push(...saveResult.errors);
        }

        stats.errors.push(...engagementResult.errors);
        stats.usersProcessed++;

      } catch (error) {
        const errorMessage = `Error processing config ${configDoc.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        stats.errors.push(errorMessage);
        console.error(errorMessage);
      }
    }

  } catch (error) {
    const errorMessage = `Error in fetchSocialListeningData: ${error instanceof Error ? error.message : 'Unknown error'}`;
    stats.errors.push(errorMessage);
    console.error(errorMessage);
  }

  return stats;
}

/**
 * POST /api/cron/fetch-social-listening
 * Cron endpoint - fetches social listening data for all users
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error('CRON_SECRET not configured');
      return NextResponse.json(
        { error: 'Server Misconfigured', message: 'CRON_SECRET not set' },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error('Invalid cron secret provided');
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid cron secret' },
        { status: 401 }
      );
    }

    console.log('[Cron] Starting social listening data fetch...');
    const startTime = Date.now();

    // Fetch social listening data
    const stats = await fetchSocialListeningData();

    const duration = Date.now() - startTime;
    console.log(`[Cron] Social listening fetch completed in ${duration}ms`);
    console.log(`[Cron] Stats:`, stats);

    return NextResponse.json({
      success: true,
      stats,
      duration,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Cron] Error in social listening cron:', error);
    return NextResponse.json(
      {
        error: 'Server Error',
        message: 'Failed to fetch social listening data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/fetch-social-listening
 * Health check endpoint
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'healthy',
    job: 'fetch-social-listening',
    schedule: 'Every 30 minutes',
    description: 'Fetches mentions and engagement items from social platforms',
  });
}
