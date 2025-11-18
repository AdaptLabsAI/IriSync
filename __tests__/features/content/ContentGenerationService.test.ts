/**
 * Unit tests for ContentGenerationService
 * Tests AI-powered content generation and optimization
 */

import { ContentGenerationService } from '@/lib/features/content/ContentGenerationService';
import { PlatformType } from '@/lib/features/platforms/PlatformProvider';
import { firestore } from '@/lib/core/firebase';
import { aiService } from '@/lib/features/ai/AIService';
import { postAnalyticsService } from '@/lib/features/analytics/PostAnalyticsService';

// Mock dependencies
jest.mock('@/lib/core/firebase', () => ({
  firestore: {
    collection: jest.fn(),
    doc: jest.fn()
  }
}));

jest.mock('@/lib/features/ai/AIService', () => ({
  aiService: {
    processChatbotRequest: jest.fn()
  }
}));

jest.mock('@/lib/features/analytics/PostAnalyticsService', () => ({
  postAnalyticsService: {
    getAggregatedAnalytics: jest.fn()
  }
}));

describe('ContentGenerationService', () => {
  let service: ContentGenerationService;
  const mockUserId = 'user123';
  const mockOrgId = 'org123';

  beforeEach(() => {
    service = new ContentGenerationService();
    jest.clearAllMocks();
  });

  describe('generateContent', () => {
    it('should generate content for Instagram', async () => {
      const mockAIResponse = {
        output: 'Check out this amazing product! Perfect for your daily routine. #lifestyle #amazing',
        model: 'claude-3-5-sonnet-20241022',
        totalTokens: 150
      };

      (aiService.processChatbotRequest as jest.Mock).mockResolvedValue(mockAIResponse);

      const result = await service.generateContent(
        {
          topic: 'Product Launch',
          platformType: PlatformType.INSTAGRAM,
          tone: 'professional',
          targetAudience: 'young adults',
          includeHashtags: true,
          maxHashtags: 5,
          includeEmojis: true
        },
        mockUserId,
        mockOrgId
      );

      expect(result).toBeDefined();
      expect(result.caption).toBeTruthy();
      expect(result.platformType).toBe(PlatformType.INSTAGRAM);
      expect(result.characterCount).toBeGreaterThan(0);
      expect(result.hashtags).toBeInstanceOf(Array);
      expect(result.optimizationScore).toBeGreaterThanOrEqual(0);
      expect(result.optimizationScore).toBeLessThanOrEqual(100);
      expect(result.aiModel).toBe('claude-3-5-sonnet-20241022');
    });

    it('should generate content for Twitter/X with character limit', async () => {
      const mockAIResponse = {
        output: 'Exciting news! 🚀 Check out our latest feature. #innovation',
        model: 'claude-3-5-sonnet-20241022',
        totalTokens: 100
      };

      (aiService.processChatbotRequest as jest.Mock).mockResolvedValue(mockAIResponse);

      const result = await service.generateContent(
        {
          topic: 'Feature Announcement',
          platformType: PlatformType.TWITTER,
          tone: 'casual',
          includeEmojis: true
        },
        mockUserId,
        mockOrgId
      );

      expect(result.caption.length).toBeLessThanOrEqual(280);
      expect(result.platformType).toBe(PlatformType.TWITTER);
    });

    it('should generate content for LinkedIn with professional tone', async () => {
      const mockAIResponse = {
        output: 'We are thrilled to announce our latest innovation in the tech industry. Our team has worked tirelessly to deliver exceptional value to our clients.',
        model: 'gpt-4o',
        totalTokens: 200
      };

      (aiService.processChatbotRequest as jest.Mock).mockResolvedValue(mockAIResponse);

      const result = await service.generateContent(
        {
          topic: 'Company Announcement',
          platformType: PlatformType.LINKEDIN,
          tone: 'professional',
          targetAudience: 'business professionals',
          contentType: 'announcement'
        },
        mockUserId,
        mockOrgId
      );

      expect(result.platformType).toBe(PlatformType.LINKEDIN);
      expect(result.caption).toBeTruthy();
      expect(result.aiModel).toBe('gpt-4o');
    });

    it('should handle keywords in content generation', async () => {
      const mockAIResponse = {
        output: 'Discover the future of AI technology with our innovative solutions.',
        model: 'claude-3-5-sonnet-20241022',
        totalTokens: 120
      };

      (aiService.processChatbotRequest as jest.Mock).mockResolvedValue(mockAIResponse);

      const keywords = ['AI', 'technology', 'innovation'];
      const result = await service.generateContent(
        {
          topic: 'AI Technology',
          platformType: PlatformType.INSTAGRAM,
          keywords
        },
        mockUserId,
        mockOrgId
      );

      expect(result).toBeDefined();
      expect(aiService.processChatbotRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          organizationId: mockOrgId
        })
      );
    });

    it('should include call-to-action when specified', async () => {
      const mockAIResponse = {
        output: 'Transform your workflow today! Visit our website to learn more.',
        model: 'claude-3-5-sonnet-20241022',
        totalTokens: 130
      };

      (aiService.processChatbotRequest as jest.Mock).mockResolvedValue(mockAIResponse);

      const result = await service.generateContent(
        {
          topic: 'Product Demo',
          platformType: PlatformType.FACEBOOK,
          callToAction: 'Visit our website'
        },
        mockUserId,
        mockOrgId
      );

      expect(result.caption).toBeTruthy();
    });
  });

  describe('optimizeContent', () => {
    it('should optimize content from Instagram to Twitter', async () => {
      const longCaption = 'This is a very long Instagram caption that needs to be shortened for Twitter. It contains multiple sentences and lots of details about our amazing product launch. #instagram #launch #product #amazing #innovation';

      const mockAIResponse = {
        output: 'Amazing product launch! 🚀 Check it out today. #innovation #product',
        model: 'claude-3-5-sonnet-20241022',
        totalTokens: 100
      };

      (aiService.processChatbotRequest as jest.Mock).mockResolvedValue(mockAIResponse);

      const result = await service.optimizeContent(
        longCaption,
        PlatformType.INSTAGRAM,
        PlatformType.TWITTER,
        mockUserId,
        mockOrgId
      );

      expect(result.caption.length).toBeLessThanOrEqual(280);
      expect(result.fromPlatform).toBe(PlatformType.INSTAGRAM);
      expect(result.toPlatform).toBe(PlatformType.TWITTER);
      expect(result.optimizationScore).toBeGreaterThanOrEqual(0);
      expect(result.changes).toBeInstanceOf(Array);
    });

    it('should optimize content from Twitter to LinkedIn', async () => {
      const shortCaption = 'Quick update! 🚀 #tech';

      const mockAIResponse = {
        output: 'We are excited to share an important update regarding our latest technological advancement. Our team has been working diligently to bring you this innovation.',
        model: 'gpt-4o',
        totalTokens: 180
      };

      (aiService.processChatbotRequest as jest.Mock).mockResolvedValue(mockAIResponse);

      const result = await service.optimizeContent(
        shortCaption,
        PlatformType.TWITTER,
        PlatformType.LINKEDIN,
        mockUserId,
        mockOrgId
      );

      expect(result.caption.length).toBeGreaterThan(shortCaption.length);
      expect(result.fromPlatform).toBe(PlatformType.TWITTER);
      expect(result.toPlatform).toBe(PlatformType.LINKEDIN);
    });

    it('should track optimization changes', async () => {
      const mockAIResponse = {
        output: 'Optimized content for the target platform.',
        model: 'claude-3-5-sonnet-20241022',
        totalTokens: 120
      };

      (aiService.processChatbotRequest as jest.Mock).mockResolvedValue(mockAIResponse);

      const result = await service.optimizeContent(
        'Original content',
        PlatformType.FACEBOOK,
        PlatformType.INSTAGRAM,
        mockUserId,
        mockOrgId
      );

      expect(result.changes).toBeDefined();
      expect(result.changes.length).toBeGreaterThan(0);
    });
  });

  describe('getHashtagSuggestions', () => {
    it('should generate hashtag suggestions', async () => {
      const mockAIResponse = {
        output: 'Here are some hashtags: #technology #innovation #AI #future #tech #digital #startup #business #trending #viral',
        model: 'claude-3-5-sonnet-20241022',
        totalTokens: 80
      };

      (aiService.processChatbotRequest as jest.Mock).mockResolvedValue(mockAIResponse);

      const result = await service.getHashtagSuggestions(
        'AI and technology innovation',
        PlatformType.INSTAGRAM,
        10
      );

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
      expect(result.length).toBeLessThanOrEqual(10);
      result.forEach(hashtag => {
        expect(hashtag).toMatch(/^#\w+$/);
      });
    });

    it('should limit hashtag count', async () => {
      const mockAIResponse = {
        output: '#tech #AI #innovation #future #digital',
        model: 'claude-3-5-sonnet-20241022',
        totalTokens: 60
      };

      (aiService.processChatbotRequest as jest.Mock).mockResolvedValue(mockAIResponse);

      const result = await service.getHashtagSuggestions(
        'Technology trends',
        PlatformType.TWITTER,
        5
      );

      expect(result.length).toBeLessThanOrEqual(5);
    });

    it('should handle platform-specific hashtag guidelines', async () => {
      const mockAIResponse = {
        output: '#professional #business #leadership',
        model: 'claude-3-5-sonnet-20241022',
        totalTokens: 50
      };

      (aiService.processChatbotRequest as jest.Mock).mockResolvedValue(mockAIResponse);

      const result = await service.getHashtagSuggestions(
        'Leadership insights',
        PlatformType.LINKEDIN,
        3
      );

      expect(result.length).toBeLessThanOrEqual(3);
    });
  });

  describe('getBestTimeToPost', () => {
    it('should analyze and recommend best posting times', async () => {
      const mockAnalytics = {
        totalPosts: 50,
        totalEngagement: 1000,
        totalImpressions: 5000,
        averageEngagementRate: 20,
        platformBreakdown: [
          {
            platform: PlatformType.INSTAGRAM,
            postCount: 50,
            totalEngagement: 1000,
            averageEngagement: 20
          }
        ],
        contentTypeBreakdown: [],
        timeSeries: [
          {
            date: '2024-01-15',
            engagement: 50,
            impressions: 200,
            posts: 1
          },
          {
            date: '2024-01-16',
            engagement: 80,
            impressions: 300,
            posts: 1
          }
        ]
      };

      (postAnalyticsService.getAggregatedAnalytics as jest.Mock).mockResolvedValue(mockAnalytics);

      const result = await service.getBestTimeToPost(
        mockUserId,
        PlatformType.INSTAGRAM,
        'America/New_York'
      );

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
      result.forEach(recommendation => {
        expect(recommendation).toHaveProperty('dayOfWeek');
        expect(recommendation).toHaveProperty('hour');
        expect(recommendation).toHaveProperty('score');
        expect(recommendation).toHaveProperty('confidence');
        expect(recommendation.score).toBeGreaterThanOrEqual(0);
        expect(recommendation.score).toBeLessThanOrEqual(100);
      });
    });

    it('should return default recommendations when no data available', async () => {
      const mockAnalytics = {
        totalPosts: 0,
        totalEngagement: 0,
        totalImpressions: 0,
        averageEngagementRate: 0,
        platformBreakdown: [],
        contentTypeBreakdown: [],
        timeSeries: []
      };

      (postAnalyticsService.getAggregatedAnalytics as jest.Mock).mockResolvedValue(mockAnalytics);

      const result = await service.getBestTimeToPost(
        mockUserId,
        PlatformType.INSTAGRAM
      );

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle different platforms', async () => {
      const mockAnalytics = {
        totalPosts: 30,
        totalEngagement: 600,
        totalImpressions: 2000,
        averageEngagementRate: 30,
        platformBreakdown: [],
        contentTypeBreakdown: [],
        timeSeries: []
      };

      (postAnalyticsService.getAggregatedAnalytics as jest.Mock).mockResolvedValue(mockAnalytics);

      const platforms = [
        PlatformType.INSTAGRAM,
        PlatformType.TWITTER,
        PlatformType.FACEBOOK,
        PlatformType.LINKEDIN
      ];

      for (const platform of platforms) {
        const result = await service.getBestTimeToPost(mockUserId, platform);
        expect(result).toBeInstanceOf(Array);
      }
    });

    it('should respect timezone parameter', async () => {
      const mockAnalytics = {
        totalPosts: 20,
        totalEngagement: 400,
        totalImpressions: 1500,
        averageEngagementRate: 26.67,
        platformBreakdown: [],
        contentTypeBreakdown: [],
        timeSeries: []
      };

      (postAnalyticsService.getAggregatedAnalytics as jest.Mock).mockResolvedValue(mockAnalytics);

      const timezones = ['America/New_York', 'Europe/London', 'Asia/Tokyo'];

      for (const timezone of timezones) {
        const result = await service.getBestTimeToPost(
          mockUserId,
          PlatformType.INSTAGRAM,
          timezone
        );
        expect(result).toBeInstanceOf(Array);
      }
    });
  });

  describe('generateContentVariations', () => {
    it('should generate multiple variations of content', async () => {
      const mockAIResponses = [
        { output: 'Variation 1 content', model: 'claude-3-5-sonnet-20241022', totalTokens: 100 },
        { output: 'Variation 2 content', model: 'claude-3-5-sonnet-20241022', totalTokens: 105 },
        { output: 'Variation 3 content', model: 'claude-3-5-sonnet-20241022', totalTokens: 110 }
      ];

      let callCount = 0;
      (aiService.processChatbotRequest as jest.Mock).mockImplementation(() => {
        return Promise.resolve(mockAIResponses[callCount++]);
      });

      const result = await service.generateContentVariations(
        {
          topic: 'Product Launch',
          platformType: PlatformType.INSTAGRAM,
          tone: 'professional'
        },
        3,
        mockUserId,
        mockOrgId
      );

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(3);
      result.forEach(variation => {
        expect(variation).toHaveProperty('caption');
        expect(variation).toHaveProperty('hashtags');
        expect(variation).toHaveProperty('optimizationScore');
      });
    });

    it('should limit variations to maximum of 5', async () => {
      const mockAIResponse = {
        output: 'Sample variation',
        model: 'claude-3-5-sonnet-20241022',
        totalTokens: 100
      };

      (aiService.processChatbotRequest as jest.Mock).mockResolvedValue(mockAIResponse);

      const result = await service.generateContentVariations(
        {
          topic: 'Test Topic',
          platformType: PlatformType.TWITTER
        },
        10, // Request 10 but should get max 5
        mockUserId,
        mockOrgId
      );

      expect(result.length).toBeLessThanOrEqual(5);
    });
  });

  describe('calculateOptimizationScore', () => {
    it('should calculate score for Instagram content', async () => {
      const caption = 'Great product launch today! Check out our new features. #product #launch #innovation';
      const hashtags = ['#product', '#launch', '#innovation'];

      // Access private method via any
      const score = (service as any).calculateOptimizationScore(
        caption,
        hashtags,
        PlatformType.INSTAGRAM,
        { maxLength: 2200, recommendedHashtags: '5-10', allowEmojis: true }
      );

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should penalize overly long Twitter content', async () => {
      const longCaption = 'a'.repeat(300); // Over 280 character limit

      const score = (service as any).calculateOptimizationScore(
        longCaption,
        [],
        PlatformType.TWITTER,
        { maxLength: 280, recommendedHashtags: '1-2', allowEmojis: true }
      );

      expect(score).toBeLessThan(100);
    });

    it('should reward optimal hashtag count', async () => {
      const caption = 'Professional content';
      const optimalHashtags = ['#business', '#professional', '#growth'];

      const score = (service as any).calculateOptimizationScore(
        caption,
        optimalHashtags,
        PlatformType.LINKEDIN,
        { maxLength: 3000, recommendedHashtags: '3-5', allowEmojis: false }
      );

      expect(score).toBeGreaterThan(50);
    });
  });
});
