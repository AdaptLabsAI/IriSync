/**
 * Monitoring Statistics API
 * GET /api/monitoring/stats - Get social listening and engagement statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/features/auth';
import { firestore } from '@/lib/core/firebase';
import { getDoc, doc } from 'firebase/firestore';
import { socialListeningService } from '@/lib/features/monitoring/SocialListeningService';
import { engagementService } from '@/lib/features/monitoring/EngagementService';
import { sentimentAnalysisService } from '@/lib/features/monitoring/SentimentAnalysisService';

/**
 * GET /api/monitoring/stats
 * Get monitoring statistics including listening stats, engagement stats, and brand health
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Get user's organization
    const userDoc = await getDoc(doc(firestore, 'users', userId));
    if (!userDoc.exists()) {
      return NextResponse.json(
        { error: 'User Not Found', message: 'User document not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    const organizationId = userData.currentOrganizationId || userData.personalOrganizationId;

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Organization not found' },
        { status: 400 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const days = searchParams.get('days') ? parseInt(searchParams.get('days')!) : 7;
    const includeCompetitors = searchParams.get('includeCompetitors') === 'true';

    // Get listening statistics
    const listeningStats = await socialListeningService.getListeningStats(
      userId,
      organizationId,
      days
    );

    // Get engagement statistics
    const engagementStats = await engagementService.getEngagementStats(
      userId,
      organizationId,
      days
    );

    // Calculate brand health
    const mentions = await socialListeningService.getMentions(userId, organizationId, {
      limit: 1000,
    });

    const sentiments = mentions
      .filter(m => m.sentiment && m.sentimentScore !== undefined)
      .map(m => ({
        sentiment: m.sentiment!,
        score: m.sentimentScore!,
        confidence: 0.8,
        emotions: { joy: 0, anger: 0, sadness: 0, fear: 0, surprise: 0 },
        intent: 'other' as const,
        keywords: m.keywords,
        requiresResponse: false,
        priority: m.priority,
      }));

    const brandHealth = sentimentAnalysisService.calculateBrandHealth(sentiments, 'week');

    // Competitor analysis (if requested)
    let competitorStats = null;
    if (includeCompetitors) {
      const config = await socialListeningService.getMonitoringConfig(userId, organizationId);
      if (config && config.competitorKeywords.length > 0) {
        const competitorMentions = mentions.filter(m =>
          m.keywords.some(k => config.competitorKeywords.includes(k))
        );

        const competitorSentiments = competitorMentions
          .filter(m => m.sentiment && m.sentimentScore !== undefined)
          .map(m => ({
            sentiment: m.sentiment!,
            score: m.sentimentScore!,
            confidence: 0.8,
            emotions: { joy: 0, anger: 0, sadness: 0, fear: 0, surprise: 0 },
            intent: 'other' as const,
            keywords: m.keywords,
            requiresResponse: false,
            priority: m.priority,
          }));

        const competitorHealth = sentimentAnalysisService.calculateBrandHealth(
          competitorSentiments,
          'week'
        );

        competitorStats = {
          totalMentions: competitorMentions.length,
          health: competitorHealth,
          topKeywords: config.competitorKeywords.map(keyword => ({
            keyword,
            count: competitorMentions.filter(m => m.keywords.includes(keyword)).length,
            avgSentiment: competitorMentions
              .filter(m => m.keywords.includes(keyword) && m.sentimentScore !== undefined)
              .reduce((sum, m) => sum + (m.sentimentScore || 0), 0) /
              Math.max(1, competitorMentions.filter(m => m.keywords.includes(keyword)).length),
          })),
        };
      }
    }

    // Calculate trends (compare to previous period)
    const previousPeriodStart = new Date();
    previousPeriodStart.setDate(previousPeriodStart.getDate() - days * 2);
    const previousPeriodEnd = new Date();
    previousPeriodEnd.setDate(previousPeriodEnd.getDate() - days);

    const previousMentions = await socialListeningService.getMentions(userId, organizationId, {
      startDate: previousPeriodStart,
      endDate: previousPeriodEnd,
      limit: 1000,
    });

    const trends = {
      mentionsChange: listeningStats.totalMentions - previousMentions.length,
      mentionsChangePercent: previousMentions.length > 0
        ? ((listeningStats.totalMentions - previousMentions.length) / previousMentions.length) * 100
        : 0,
      sentimentChange: brandHealth.trend,
    };

    return NextResponse.json({
      success: true,
      stats: {
        listening: listeningStats,
        engagement: engagementStats,
        brandHealth,
        competitors: competitorStats,
        trends,
      },
      period: {
        days,
        startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error getting monitoring stats:', error);
    return NextResponse.json(
      {
        error: 'Server Error',
        message: 'Failed to get monitoring statistics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
