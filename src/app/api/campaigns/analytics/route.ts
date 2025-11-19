/**
 * Campaign Analytics API
 * GET /api/campaigns/analytics - Get advanced campaign analytics
 * POST /api/campaigns/analytics/forecast - Generate campaign forecast
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/features/auth';
import { getFirebaseFirestore } from '@/lib/core/firebase';
import { getDoc, doc } from 'firebase/firestore';
import { campaignAnalyticsService } from '@/lib/features/campaigns/CampaignAnalyticsService';

/**
 * GET /api/campaigns/analytics
 * Get advanced analytics for campaign
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const campaignId = searchParams.get('campaignId');

    if (!campaignId) {
      return NextResponse.json(
        { error: 'Invalid Request', message: 'campaignId query parameter is required' },
        { status: 400 }
      );
    }

    const includeVideoMetrics = searchParams.get('includeVideoMetrics') === 'true';
    const includeConversionFunnel = searchParams.get('includeConversionFunnel') === 'true';
    const includeBenchmarks = searchParams.get('includeBenchmarks') === 'true';

    const metrics = await campaignAnalyticsService.calculateAdvancedMetrics(campaignId, {
      includeVideoMetrics,
      includeConversionFunnel,
      includeBenchmarks,
    });

    return NextResponse.json({
      success: true,
      metrics,
    });
  } catch (error) {
    console.error('Error getting campaign analytics:', error);
    return NextResponse.json(
      {
        error: 'Server Error',
        message: 'Failed to get campaign analytics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/campaigns/analytics/forecast
 * Generate AI-powered forecast for campaign
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { campaignId, forecastDays } = body;

    if (!campaignId) {
      return NextResponse.json(
        { error: 'Invalid Request', message: 'campaignId is required' },
        { status: 400 }
      );
    }

    const forecast = await campaignAnalyticsService.generateForecast(
      campaignId,
      forecastDays || 30
    );

    return NextResponse.json({
      success: true,
      forecast,
    });
  } catch (error) {
    console.error('Error generating campaign forecast:', error);
    return NextResponse.json(
      {
        error: 'Server Error',
        message: 'Failed to generate campaign forecast',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
