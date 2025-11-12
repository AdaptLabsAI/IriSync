import { NextRequest, NextResponse } from 'next/server';
import { PlatformProviderFactory } from '@/lib/platforms/factory';
import { PlatformType } from '@/lib/platforms/PlatformProvider';
import { TwitterProvider } from '@/lib/platforms/providers/TwitterProvider';
import { logger } from '@/lib/logging/logger';

/**
 * Debug endpoint to test enhanced Twitter API functionality
 * GET /api/debug/twitter-enhanced-features?feature=dm|mentions|search|follow
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const feature = searchParams.get('feature') || 'all';
    
    // Check if this is a development or admin environment
    if (process.env.NODE_ENV === 'production') {
      const authHeader = request.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // Create a Twitter provider instance
    const config = PlatformProviderFactory.getDefaultConfig(PlatformType.TWITTER);
    const twitterProvider = new TwitterProvider(config);

    // Test different features based on query parameter
    let testResults: any = {
      timestamp: new Date().toISOString(),
      feature: feature,
      status: 'testing',
      results: {}
    };

    try {
      switch (feature) {
        case 'dm':
          testResults.results = await testDirectMessages(twitterProvider);
          break;
          
        case 'mentions':
          testResults.results = await testMentions(twitterProvider);
          break;
          
        case 'search':
          testResults.results = await testSearch(twitterProvider);
          break;
          
        case 'follow':
          testResults.results = await testUserManagement(twitterProvider);
          break;
          
        case 'engagement':
          testResults.results = await testEngagement(twitterProvider);
          break;
          
        case 'trends':
          testResults.results = await testTrends(twitterProvider);
          break;
          
        case 'all':
          testResults.results = {
            availability: await testAllFeatureAvailability(twitterProvider),
            rateLimits: twitterProvider.getRateLimitStatus()
          };
          break;
          
        default:
          return NextResponse.json({ error: 'Invalid feature parameter' }, { status: 400 });
      }
      
      testResults.status = 'completed';
      
    } catch (error: any) {
      testResults.status = 'error';
      testResults.error = error.message;
      testResults.isAuthError = error.message.includes('Not authenticated');
    }

    logger.info('Twitter enhanced features test completed', {
      feature,
      status: testResults.status,
      hasError: !!testResults.error
    });

    return NextResponse.json(testResults);
    
  } catch (error) {
    logger.error('Error testing Twitter enhanced features', { error });
    return NextResponse.json(
      { error: 'Failed to test enhanced features' },
      { status: 500 }
    );
  }
}

async function testDirectMessages(provider: TwitterProvider) {
  return {
    methods: {
      getDirectMessages: typeof provider.getDirectMessages === 'function',
      getConversation: typeof provider.getConversation === 'function', 
      sendDirectMessage: typeof provider.sendDirectMessage === 'function',
      replyToDirectMessage: typeof provider.replyToDirectMessage === 'function'
    },
    note: 'DM methods available - requires authentication to test functionality'
  };
}

async function testMentions(provider: TwitterProvider) {
  return {
    methods: {
      getMentions: typeof provider.getMentions === 'function',
      getLikingUsers: typeof provider.getLikingUsers === 'function',
      getRetweetUsers: typeof provider.getRetweetUsers === 'function',
      getQuoteTweets: typeof provider.getQuoteTweets === 'function'
    },
    note: 'Mention tracking methods available - requires authentication to test functionality'
  };
}

async function testSearch(provider: TwitterProvider) {
  return {
    methods: {
      searchTweets: typeof provider.searchTweets === 'function',
      searchAllTweets: typeof provider.searchAllTweets === 'function',
      getTweetCounts: typeof provider.getTweetCounts === 'function',
      getAllTweetCounts: typeof provider.getAllTweetCounts === 'function'
    },
    note: 'Search methods available - requires authentication to test functionality'
  };
}

async function testUserManagement(provider: TwitterProvider) {
  return {
    methods: {
      followUser: typeof provider.followUser === 'function',
      unfollowUser: typeof provider.unfollowUser === 'function',
      getUserProfile: typeof provider.getUserProfile === 'function',
      getUserByUsername: typeof provider.getUserByUsername === 'function',
      searchUsers: typeof provider.searchUsers === 'function',
      getUserLikedTweets: typeof provider.getUserLikedTweets === 'function',
      getUserProfiles: typeof provider.getUserProfiles === 'function'
    },
    note: 'User management methods available - requires authentication to test functionality'
  };
}

async function testEngagement(provider: TwitterProvider) {
  return {
    methods: {
      likePost: typeof provider.likePost === 'function',
      unlikePost: typeof provider.unlikePost === 'function',
      retweetPost: typeof provider.retweetPost === 'function',
      removeRetweet: typeof provider.removeRetweet === 'function',
      replyToComment: typeof provider.replyToComment === 'function'
    },
    note: 'Engagement methods available - requires authentication to test functionality'
  };
}

async function testTrends(provider: TwitterProvider) {
  return {
    methods: {
      getTrends: typeof provider.getTrends === 'function',
      getPersonalizedTrends: typeof provider.getPersonalizedTrends === 'function'
    },
    note: 'Trend methods available - requires authentication to test functionality'
  };
}

async function testAllFeatureAvailability(provider: TwitterProvider) {
  return {
    socialInbox: {
      directMessages: typeof provider.getDirectMessages === 'function',
      mentions: typeof provider.getMentions === 'function',
      engagementTracking: typeof provider.getLikingUsers === 'function'
    },
    engagement: {
      likeUnlike: typeof provider.likePost === 'function' && typeof provider.unlikePost === 'function',
      retweetManagement: typeof provider.retweetPost === 'function' && typeof provider.removeRetweet === 'function',
      replyToComments: typeof provider.replyToComment === 'function'
    },
    contentDiscovery: {
      search: typeof provider.searchTweets === 'function',
      trends: typeof provider.getTrends === 'function',
      analytics: typeof provider.getTweetCounts === 'function'
    },
    crmIntegration: {
      userManagement: typeof provider.followUser === 'function' && typeof provider.unfollowUser === 'function',
      userAnalysis: typeof provider.getUserProfile === 'function',
      userSearch: typeof provider.searchUsers === 'function'
    },
    authenticationRequired: !provider.isAuthenticated(),
    totalMethodsImplemented: Object.getOwnPropertyNames(Object.getPrototypeOf(provider))
      .filter(name => typeof (provider as any)[name] === 'function')
      .filter(name => !['constructor', 'getConfig', 'getPlatformType', 'getCapabilities'].includes(name))
      .length
  };
} 