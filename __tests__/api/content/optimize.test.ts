/**
 * Integration tests for Content Optimization API
 * Tests /api/content/optimize endpoint
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/content/optimize/route';
import { getServerSession } from 'next-auth/next';
import { contentGenerationService } from '@/lib/features/content/ContentGenerationService';
import { PlatformType } from '@/lib/features/platforms/PlatformProvider';
import { firestore } from '@/lib/core/firebase';

// Mock dependencies
jest.mock('next-auth/next');
jest.mock('@/lib/features/content/ContentGenerationService');
jest.mock('@/lib/core/firebase', () => ({
  firestore: {
    collection: jest.fn(),
    doc: jest.fn()
  }
}));

describe('POST /api/content/optimize', () => {
  const mockUserId = 'user123';
  const mockOrgId = 'org123';

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock session
    (getServerSession as jest.Mock).mockResolvedValue({
      user: {
        id: mockUserId,
        email: 'test@example.com',
        name: 'Test User'
      }
    });

    // Mock Firestore user doc
    const mockUserDoc = {
      exists: () => true,
      data: () => ({
        currentOrganizationId: mockOrgId,
        personalOrganizationId: mockOrgId
      })
    };

    const mockGetDoc = jest.fn().mockResolvedValue(mockUserDoc);
    const mockDoc = jest.fn().mockReturnValue({});

    (firestore.collection as jest.Mock).mockReturnValue({
      doc: mockDoc
    });
  });

  it('should optimize content from Instagram to Twitter', async () => {
    const originalCaption = 'This is a long Instagram caption with lots of details and multiple hashtags #instagram #photo #amazing #lifestyle #daily';

    const mockOptimizedContent = {
      caption: 'Optimized for Twitter! 🚀 #instagram #photo',
      hashtags: ['#instagram', '#photo'],
      characterCount: 42,
      wordCount: 5,
      platformType: PlatformType.TWITTER,
      fromPlatform: PlatformType.INSTAGRAM,
      toPlatform: PlatformType.TWITTER,
      optimizationScore: 88,
      changes: [
        'Shortened caption to fit 280 character limit',
        'Reduced hashtags from 5 to 2',
        'Added emoji for engagement'
      ],
      aiModel: 'claude-3-5-sonnet-20241022',
      tokensUsed: 120,
      generatedAt: new Date()
    };

    (contentGenerationService.optimizeContent as jest.Mock).mockResolvedValue(mockOptimizedContent);

    const request = new NextRequest('http://localhost:3000/api/content/optimize', {
      method: 'POST',
      body: JSON.stringify({
        caption: originalCaption,
        fromPlatform: PlatformType.INSTAGRAM,
        toPlatform: PlatformType.TWITTER
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.content).toEqual(mockOptimizedContent);
    expect(data.content.caption.length).toBeLessThanOrEqual(280);
    expect(contentGenerationService.optimizeContent).toHaveBeenCalledWith(
      originalCaption,
      PlatformType.INSTAGRAM,
      PlatformType.TWITTER,
      mockUserId,
      mockOrgId
    );
  });

  it('should optimize content from Twitter to LinkedIn', async () => {
    const originalCaption = 'Quick update! 🚀 #tech';

    const mockOptimizedContent = {
      caption: 'We are pleased to share an important update regarding our latest technological advancement. Our dedicated team has been working diligently to bring you this innovative solution.',
      hashtags: ['#technology', '#innovation', '#business'],
      characterCount: 180,
      wordCount: 28,
      platformType: PlatformType.LINKEDIN,
      fromPlatform: PlatformType.TWITTER,
      toPlatform: PlatformType.LINKEDIN,
      optimizationScore: 85,
      changes: [
        'Expanded caption for professional context',
        'Added professional hashtags',
        'Removed casual emoji'
      ],
      aiModel: 'gpt-4o',
      tokensUsed: 150,
      generatedAt: new Date()
    };

    (contentGenerationService.optimizeContent as jest.Mock).mockResolvedValue(mockOptimizedContent);

    const request = new NextRequest('http://localhost:3000/api/content/optimize', {
      method: 'POST',
      body: JSON.stringify({
        caption: originalCaption,
        fromPlatform: PlatformType.TWITTER,
        toPlatform: PlatformType.LINKEDIN
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.content.caption.length).toBeGreaterThan(originalCaption.length);
  });

  it('should return 401 when not authenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/content/optimize', {
      method: 'POST',
      body: JSON.stringify({
        caption: 'Test',
        fromPlatform: PlatformType.INSTAGRAM,
        toPlatform: PlatformType.TWITTER
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 400 when caption is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/content/optimize', {
      method: 'POST',
      body: JSON.stringify({
        fromPlatform: PlatformType.INSTAGRAM,
        toPlatform: PlatformType.TWITTER
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid Request');
    expect(data.message).toContain('Caption is required');
  });

  it('should return 400 when fromPlatform is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/content/optimize', {
      method: 'POST',
      body: JSON.stringify({
        caption: 'Test caption',
        toPlatform: PlatformType.TWITTER
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid Request');
    expect(data.message).toContain('Both fromPlatform and toPlatform are required');
  });

  it('should return 400 when toPlatform is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/content/optimize', {
      method: 'POST',
      body: JSON.stringify({
        caption: 'Test caption',
        fromPlatform: PlatformType.INSTAGRAM
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid Request');
    expect(data.message).toContain('Both fromPlatform and toPlatform are required');
  });

  it('should return 400 for invalid platform types', async () => {
    const request = new NextRequest('http://localhost:3000/api/content/optimize', {
      method: 'POST',
      body: JSON.stringify({
        caption: 'Test',
        fromPlatform: 'INVALID',
        toPlatform: PlatformType.TWITTER
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid Request');
    expect(data.message).toContain('Invalid platform type');
  });

  it('should handle all platform combinations', async () => {
    const platforms = [
      PlatformType.INSTAGRAM,
      PlatformType.TWITTER,
      PlatformType.FACEBOOK,
      PlatformType.LINKEDIN
    ];

    for (const fromPlatform of platforms) {
      for (const toPlatform of platforms) {
        if (fromPlatform === toPlatform) continue;

        const mockContent = {
          caption: `Optimized from ${fromPlatform} to ${toPlatform}`,
          hashtags: [],
          characterCount: 40,
          wordCount: 6,
          platformType: toPlatform,
          fromPlatform,
          toPlatform,
          optimizationScore: 80,
          changes: ['Platform-specific optimization'],
          aiModel: 'claude-3-5-sonnet-20241022',
          tokensUsed: 100,
          generatedAt: new Date()
        };

        (contentGenerationService.optimizeContent as jest.Mock).mockResolvedValue(mockContent);

        const request = new NextRequest('http://localhost:3000/api/content/optimize', {
          method: 'POST',
          body: JSON.stringify({
            caption: 'Original content',
            fromPlatform,
            toPlatform
          })
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.content.fromPlatform).toBe(fromPlatform);
        expect(data.content.toPlatform).toBe(toPlatform);
      }
    }
  });

  it('should return 500 on service error', async () => {
    (contentGenerationService.optimizeContent as jest.Mock).mockRejectedValue(
      new Error('Optimization failed')
    );

    const request = new NextRequest('http://localhost:3000/api/content/optimize', {
      method: 'POST',
      body: JSON.stringify({
        caption: 'Test',
        fromPlatform: PlatformType.INSTAGRAM,
        toPlatform: PlatformType.TWITTER
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Server Error');
    expect(data.message).toContain('Failed to optimize content');
  });
});
