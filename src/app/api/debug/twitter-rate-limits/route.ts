import { NextRequest, NextResponse } from 'next/server';
import { PlatformProviderFactory } from '@/lib/features/platforms/factory';
import { PlatformType } from '@/lib/features/platforms/PlatformProvider';
import { TwitterProvider } from '@/lib/features/platforms/providers/TwitterProvider';
import { logger } from '@/lib/core/logging/logger';

/**
 * Debug endpoint to monitor Twitter API rate limiting status
 * GET /api/debug/twitter-rate-limits
 */
export async function GET(request: NextRequest) {
  try {
    // Check if this is a development or admin environment
    if (process.env.NODE_ENV === 'production') {
      const authHeader = request.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      // In production, you might want to validate the bearer token
      // For now, we'll just check if it exists
    }
    
    // Create a Twitter provider instance to check rate limits
    const config = PlatformProviderFactory.getDefaultConfig(PlatformType.TWITTER);
    const twitterProvider = new TwitterProvider(config);
    
    // Get rate limiting status
    const rateLimitStatus = twitterProvider.getRateLimitStatus();
    
    // Get current time for reference
    const currentTime = new Date().toISOString();
    
    // Calculate usage percentages for better visualization
    const endpointsWithUsage = Object.entries(rateLimitStatus.endpoints).map(([key, data]: [string, any]) => {
      const usage = data.usage;
      const calculations: any = {
        endpoint: data.endpoint,
        timeUntilReset: data.timeUntilReset,
        usage: usage
      };
      
      if (usage.per15Min) {
        calculations.per15MinPercent = ((usage.per15Min.used / usage.per15Min.limit) * 100).toFixed(2);
        calculations.per15MinRemaining = usage.per15Min.limit - usage.per15Min.used;
      }
      
      if (usage.per24Hour) {
        calculations.per24HourPercent = ((usage.per24Hour.used / usage.per24Hour.limit) * 100).toFixed(2);
        calculations.per24HourRemaining = usage.per24Hour.limit - usage.per24Hour.used;
      }
      
      return {
        endpointKey: key,
        ...calculations
      };
    });
    
    // Sort by usage percentage (highest first)
    const sortedEndpoints = endpointsWithUsage.sort((a, b) => {
      const aPercent = Math.max(
        parseFloat(a.per15MinPercent || '0'), 
        parseFloat(a.per24HourPercent || '0')
      );
      const bPercent = Math.max(
        parseFloat(b.per15MinPercent || '0'), 
        parseFloat(b.per24HourPercent || '0')
      );
      return bPercent - aPercent;
    });
    
    // Identify endpoints at risk (>75% usage)
    const atRiskEndpoints = sortedEndpoints.filter(endpoint => {
      const maxPercent = Math.max(
        parseFloat(endpoint.per15MinPercent || '0'), 
        parseFloat(endpoint.per24HourPercent || '0')
      );
      return maxPercent > 75;
    });
    
    const response = {
      timestamp: currentTime,
      tier: rateLimitStatus.tier,
      activeCounters: rateLimitStatus.activeCounters,
      summary: {
        totalEndpoints: sortedEndpoints.length,
        atRiskEndpoints: atRiskEndpoints.length,
        healthStatus: atRiskEndpoints.length === 0 ? 'healthy' : 
                    atRiskEndpoints.length < 3 ? 'warning' : 'critical'
      },
      atRiskEndpoints: atRiskEndpoints,
      allEndpoints: sortedEndpoints,
      rawData: rateLimitStatus
    };
    
    logger.info('Twitter rate limit status requested', {
      tier: rateLimitStatus.tier,
      atRiskCount: atRiskEndpoints.length,
      healthStatus: response.summary.healthStatus
    });
    
    return NextResponse.json(response);
    
  } catch (error) {
    logger.error('Error fetching Twitter rate limit status', { error });
    return NextResponse.json(
      { error: 'Failed to fetch rate limit status' },
      { status: 500 }
    );
  }
}

/**
 * Update Twitter API tier
 * POST /api/debug/twitter-rate-limits
 */
export async function POST(request: NextRequest) {
  try {
    // Check authorization
    if (process.env.NODE_ENV === 'production') {
      const authHeader = request.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }
    
    const body = await request.json();
    const { tier } = body;
    
    if (!tier || !['free', 'basic', 'pro', 'enterprise'].includes(tier)) {
      return NextResponse.json(
        { error: 'Invalid tier. Must be one of: free, basic, pro, enterprise' },
        { status: 400 }
      );
    }
    
    // Note: In a real implementation, you'd want to update this in your 
    // application configuration or database. For now, we'll just acknowledge the request.
    
    logger.info('Twitter API tier update requested', { 
      newTier: tier,
      currentTier: process.env.TWITTER_API_TIER 
    });
    
    return NextResponse.json({
      message: `Twitter API tier update requested: ${tier}`,
      note: 'Update your TWITTER_API_TIER environment variable and restart the application',
      currentTier: process.env.TWITTER_API_TIER,
      requestedTier: tier
    });
    
  } catch (error) {
    logger.error('Error updating Twitter API tier', { error });
    return NextResponse.json(
      { error: 'Failed to update tier' },
      { status: 500 }
    );
  }
} 