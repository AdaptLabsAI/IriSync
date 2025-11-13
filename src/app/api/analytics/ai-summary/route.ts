import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth/auth-options';
import { aiAnalyticsSummaryService } from '../../../../lib/features/analytics/ai-analytics-summary';
import { getUserAnalyticsSummary } from '../../../../lib/features/analytics/models/analyticsService';
import { compareWithCompetitor } from '../../../../lib/features/analytics/competitive/comparator';
import { benchmarkOrganizationMetrics } from '../../../../lib/features/analytics/competitive/benchmarking';
import { logger } from '../../../../lib/core/logging/logger';
import { UserRole, User } from '../../../../lib/core/models/User';
import { Timestamp } from 'firebase/firestore';

/**
 * GET /api/analytics/ai-summary
 * Generate AI-powered analytics summary and insights
 * ORGANIZATION-CENTRIC: All analytics data is tied to organizationId
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '30d';
    const includeCompetitive = searchParams.get('includeCompetitive') === 'true';
    const includeBenchmarks = searchParams.get('includeBenchmarks') === 'true';
    const competitorId = searchParams.get('competitorId');
    const industry = searchParams.get('industry');

    // Get user's organization ID
    const organizationId = await getUserOrganizationId(session.user.id);
    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID required for analytics' },
        { status: 400 }
      );
    }

    // Get analytics data for the ORGANIZATION
    const analyticsData = await getUserAnalyticsSummary(organizationId, {
      timeRange
    });

    if (!analyticsData) {
      return NextResponse.json(
        { error: 'No analytics data available for this organization' },
        { status: 404 }
      );
    }

    // Get competitive data if requested
    let competitiveData;
    if (includeCompetitive && competitorId) {
      competitiveData = await getCompetitiveComparison(organizationId, competitorId);
    }

    // Get benchmark data if requested
    let benchmarkData;
    if (includeBenchmarks && industry) {
      benchmarkData = await getBenchmarkingResult(organizationId, industry);
    }

    // Create User object for AI service
    const user = await createUserForAI(session.user.id, organizationId);

    // Generate AI-powered analytics summary (charges 2 tokens)
    const aiInsights = await aiAnalyticsSummaryService.generateAnalyticsSummary(
      analyticsData,
      user,
      competitiveData,
      benchmarkData
    );

    return NextResponse.json({
      success: true,
      data: {
        insights: aiInsights,
        metadata: {
          organizationId,
          timeRange,
          includeCompetitive,
          includeBenchmarks,
          generatedAt: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    logger.error('Error generating AI analytics summary', { error });
    
    if (error instanceof Error && error.message.includes('Insufficient tokens')) {
      return NextResponse.json(
        { error: error.message },
        { status: 402 } // Payment Required
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to generate analytics summary' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/analytics/ai-summary
 * Generate quick AI insights for dashboard
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case 'quick_insights':
        return await handleQuickInsights(session.user.id, session.user, params);
      
      case 'trend_analysis':
        return await handleTrendAnalysis(session.user.id, session.user, params);
      
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    logger.error('Error handling AI analytics request', { error });
    return NextResponse.json(
      { error: 'Failed to process AI analytics request' },
      { status: 500 }
    );
  }
}

// Action handlers

async function handleQuickInsights(userId: string, user: any, params: any) {
  try {
    const { timeRange = '30d', organizationId } = params;
    const orgId = organizationId || user.organizationId;

    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization ID required for analytics' },
        { status: 400 }
      );
    }

    // Get analytics data for the ORGANIZATION
    const analyticsData = await getUserAnalyticsSummary(orgId, {
      timeRange
    });

    if (!analyticsData) {
      return NextResponse.json(
        { error: 'No analytics data available for this organization' },
        { status: 404 }
      );
    }

    // Convert to AnalyticsSummary format
    const analyticsSummary = {
      id: `summary_${orgId}_${Date.now()}`,
      userId: orgId, // Use organizationId for data consistency
      organizationId: orgId,
      platforms: [],
      metrics: {
        engagement: analyticsData.engagementRate || 0,
        impressions: analyticsData.impressions || 0,
        clicks: analyticsData.clicks || 0,
        totalFollowers: analyticsData.followers || 0
      },
      growth: {
        followers: 0,
        engagement: 0,
        views: 0,
        likes: 0
      },
      bestPerforming: [],
      periodStart: new Date(Date.now() - (30 * 24 * 60 * 60 * 1000)),
      periodEnd: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Create proper User object
    const userForAI = {
      id: userId,
      organizationId: orgId,
      name: user.name || '',
      email: user.email || '',
      role: UserRole.USER,
      status: 'active' as const,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    // Generate quick insights (charges 1 customer token)
    const insights = await aiAnalyticsSummaryService.generateQuickInsights(
      analyticsSummary,
      userForAI
    );

    return NextResponse.json({
      success: true,
      data: {
        ...insights,
        metadata: {
          organizationId: orgId,
          customerTokenCost: 1 // Quick insights costs 1 customer token
        }
      }
    });

  } catch (error) {
    logger.error('Error generating quick insights', { error, organizationId: params.organizationId });
    return NextResponse.json(
      { error: 'Failed to generate quick insights' },
      { status: 500 }
    );
  }
}

async function handleTrendAnalysis(userId: string, user: any, params: any) {
  try {
    const { timeRange = '90d', organizationId } = params;
    const orgId = organizationId || user.organizationId;

    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization ID required for analytics' },
        { status: 400 }
      );
    }

    // Get historical analytics data - fetch multiple data points over time
    const historicalData = await getHistoricalAnalyticsData(orgId, timeRange);

    if (!historicalData || historicalData.length === 0) {
      return NextResponse.json(
        { error: 'Insufficient historical data for trend analysis' },
        { status: 404 }
      );
    }

    // Create proper User object
    const userForAI = {
      id: userId,
      organizationId: orgId,
      name: user.name || '',
      email: user.email || '',
      role: UserRole.USER,
      status: 'active' as const,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    // Generate trend analysis using AI (charges 1 customer token)
    const trendAnalysis = await aiAnalyticsSummaryService.generateTrendAnalysis(
      historicalData,
      userForAI
    );

    return NextResponse.json({
      success: true,
      data: {
        ...trendAnalysis,
        metadata: {
          organizationId: orgId,
          customerTokenCost: 1 // Trend analysis costs 1 customer token
        }
      }
    });

  } catch (error) {
    logger.error('Error generating trend analysis', { error, organizationId: params.organizationId });
    return NextResponse.json(
      { error: 'Failed to generate trend analysis' },
      { status: 500 }
    );
  }
}

/**
 * Get historical analytics data for trend analysis
 * ORGANIZATION-CENTRIC: Fetches data for organizationId
 * @param organizationId Organization ID
 * @param timeRange Time range for historical data
 * @returns Array of historical analytics summaries
 */
async function getHistoricalAnalyticsData(organizationId: string, timeRange: string): Promise<any[]> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    
    // Set date range based on timeRange
    switch (timeRange) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case 'ytd':
        startDate.setMonth(0, 1);
        break;
      default:
        startDate.setDate(endDate.getDate() - 90);
    }

    // Query Firestore for historical analytics data BY ORGANIZATION
    const { firestore } = await import('../../../../lib/core/firebase/client');
    const { collection, query, where, orderBy, getDocs } = await import('firebase/firestore');
    
    const analyticsQuery = query(
      collection(firestore, 'analytics'),
      where('organizationId', '==', organizationId), // Use organizationId instead of userId
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      orderBy('date', 'desc')
    );
    
    const analyticsSnapshot = await getDocs(analyticsQuery);
    
    if (analyticsSnapshot.empty) {
      logger.warn('No historical analytics data found', { organizationId, timeRange });
      return [];
    }

    // Convert Firestore data to AnalyticsSummary format
    const historicalData = analyticsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: organizationId, // Use organizationId for consistency
        organizationId: organizationId,
        platforms: data.platforms || [],
        metrics: {
          engagement: data.engagementRate || 0,
          impressions: data.impressions || 0,
          clicks: data.clicks || 0,
          totalFollowers: data.followers || 0,
          likes: data.likes || 0,
          comments: data.comments || 0,
          shares: data.shares || 0,
          reach: data.reach || 0
        },
        growth: {
          followers: data.followersGrowth || 0,
          engagement: data.engagementGrowth || 0,
          views: data.viewsGrowth || 0,
          likes: data.likesGrowth || 0
        },
        bestPerforming: data.bestPerforming || [],
        periodStart: data.date || startDate,
        periodEnd: data.date || endDate,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      };
    });

    logger.info('Retrieved historical analytics data', {
      organizationId,
      timeRange,
      dataPoints: historicalData.length
    });

    return historicalData;

  } catch (error) {
    logger.error('Error fetching historical analytics data', { error, organizationId, timeRange });
    return [];
  }
}

// Helper functions

async function getUserOrganizationId(userId: string): Promise<string | null> {
  try {
    const { firestore } = await import('../../../../lib/core/firebase/client');
    const { doc, getDoc } = await import('firebase/firestore');
    
    const userDoc = await getDoc(doc(firestore, 'users', userId));
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      return userData.organizationId || userData.currentOrganizationId || userData.personalOrganizationId || null;
    }
    
    return null;
  } catch (error) {
    logger.error('Error fetching user organization ID', { error, userId });
    return null;
  }
}

async function getCompetitiveComparison(organizationId: string, competitorId: string): Promise<any> {
  try {
    // This would integrate with the competitive analysis system
    // For now, return null as this is a placeholder
    logger.info('Competitive comparison requested', { organizationId, competitorId });
    return null;
  } catch (error) {
    logger.error('Error getting competitive comparison', { error, organizationId, competitorId });
    return null;
  }
}

async function getBenchmarkingResult(organizationId: string, industry: string): Promise<any> {
  try {
    // This would integrate with the benchmarking system
    // For now, return null as this is a placeholder
    logger.info('Benchmarking result requested', { organizationId, industry });
    return null;
  } catch (error) {
    logger.error('Error getting benchmarking result', { error, organizationId, industry });
    return null;
  }
}

async function createUserForAI(userId: string, organizationId: string): Promise<User> {
  try {
    const { firestore } = await import('../../../../lib/core/firebase/client');
    const { doc, getDoc } = await import('firebase/firestore');
    const { Timestamp } = await import('firebase/firestore');
    
    const userDoc = await getDoc(doc(firestore, 'users', userId));
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      return {
        id: userId,
        organizationId,
        name: userData.name || '',
        email: userData.email || '',
        role: userData.role || 'user',
        status: userData.status || 'active',
        subscriptionTier: userData.subscriptionTier || 'creator',
        createdAt: userData.createdAt || Timestamp.now(),
        updatedAt: userData.updatedAt || Timestamp.now()
      } as User;
    }
    
    // Return default user if not found
    return {
      id: userId,
      organizationId,
      name: '',
      email: '',
      role: 'user',
      status: 'active',
      subscriptionTier: 'creator',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    } as User;
  } catch (error) {
    logger.error('Error creating user for AI', { error, userId, organizationId });
    throw error;
  }
} 