/**
 * Integration tests for Content Generation API
 * Tests /api/content/generate endpoint
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/content/generate/route';
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

describe('POST /api/content/generate', () => {
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

  it('should generate content successfully', async () => {
    const mockGeneratedContent = {
      caption: 'Check out our amazing product launch! #innovation #tech',
      hashtags: ['#innovation', '#tech'],
      characterCount: 50,
      wordCount: 8,
      platformType: PlatformType.INSTAGRAM,
      optimizationScore: 85,
      aiModel: 'claude-3-5-sonnet-20241022',
      tokensUsed: 150,
      generatedAt: new Date()
    };

    (contentGenerationService.generateContent as jest.Mock).mockResolvedValue(mockGeneratedContent);

    const request = new NextRequest('http://localhost:3000/api/content/generate', {
      method: 'POST',
      body: JSON.stringify({
        topic: 'Product Launch',
        platformType: PlatformType.INSTAGRAM,
        tone: 'professional',
        targetAudience: 'young adults',
        keywords: ['innovation', 'technology'],
        includeHashtags: true,
        maxHashtags: 5,
        includeEmojis: true
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.content).toEqual(mockGeneratedContent);
    expect(contentGenerationService.generateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        topic: 'Product Launch',
        platformType: PlatformType.INSTAGRAM,
        tone: 'professional'
      }),
      mockUserId,
      mockOrgId
    );
  });

  it('should return 401 when not authenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/content/generate', {
      method: 'POST',
      body: JSON.stringify({
        topic: 'Test',
        platformType: PlatformType.INSTAGRAM
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 400 when topic is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/content/generate', {
      method: 'POST',
      body: JSON.stringify({
        platformType: PlatformType.INSTAGRAM
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid Request');
    expect(data.message).toContain('Topic is required');
  });

  it('should return 400 when platformType is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/content/generate', {
      method: 'POST',
      body: JSON.stringify({
        topic: 'Test Topic'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid Request');
    expect(data.message).toContain('Platform type is required');
  });

  it('should return 400 for invalid platform type', async () => {
    const request = new NextRequest('http://localhost:3000/api/content/generate', {
      method: 'POST',
      body: JSON.stringify({
        topic: 'Test Topic',
        platformType: 'INVALID_PLATFORM'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid Request');
    expect(data.message).toContain('Invalid platform type');
  });

  it('should return 400 when organization not found', async () => {
    const mockUserDoc = {
      exists: () => true,
      data: () => ({
        // No organization IDs
      })
    };

    const mockGetDoc = jest.fn().mockResolvedValue(mockUserDoc);
    jest.spyOn(require('firebase/firestore'), 'getDoc').mockImplementation(mockGetDoc);

    const request = new NextRequest('http://localhost:3000/api/content/generate', {
      method: 'POST',
      body: JSON.stringify({
        topic: 'Test',
        platformType: PlatformType.INSTAGRAM
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Bad Request');
    expect(data.message).toContain('Organization not found');
  });

  it('should handle all platform types', async () => {
    const platforms = [
      PlatformType.INSTAGRAM,
      PlatformType.TWITTER,
      PlatformType.FACEBOOK,
      PlatformType.LINKEDIN,
      PlatformType.TIKTOK,
      PlatformType.YOUTUBE
    ];

    for (const platform of platforms) {
      const mockContent = {
        caption: `Content for ${platform}`,
        hashtags: [],
        characterCount: 20,
        wordCount: 3,
        platformType: platform,
        optimizationScore: 80,
        aiModel: 'claude-3-5-sonnet-20241022',
        tokensUsed: 100,
        generatedAt: new Date()
      };

      (contentGenerationService.generateContent as jest.Mock).mockResolvedValue(mockContent);

      const request = new NextRequest('http://localhost:3000/api/content/generate', {
        method: 'POST',
        body: JSON.stringify({
          topic: 'Test',
          platformType: platform
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.content.platformType).toBe(platform);
    }
  });

  it('should handle optional parameters', async () => {
    const mockContent = {
      caption: 'Generated content',
      hashtags: ['#test'],
      characterCount: 16,
      wordCount: 2,
      platformType: PlatformType.INSTAGRAM,
      optimizationScore: 75,
      aiModel: 'gpt-4o',
      tokensUsed: 120,
      generatedAt: new Date()
    };

    (contentGenerationService.generateContent as jest.Mock).mockResolvedValue(mockContent);

    const request = new NextRequest('http://localhost:3000/api/content/generate', {
      method: 'POST',
      body: JSON.stringify({
        topic: 'Test',
        platformType: PlatformType.INSTAGRAM,
        tone: 'casual',
        targetAudience: 'teenagers',
        keywords: ['fun', 'exciting'],
        callToAction: 'Click the link',
        includeHashtags: true,
        maxHashtags: 10,
        includeEmojis: true,
        contentType: 'promotional',
        additionalContext: 'This is a special event'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(contentGenerationService.generateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        topic: 'Test',
        tone: 'casual',
        targetAudience: 'teenagers',
        keywords: ['fun', 'exciting'],
        callToAction: 'Click the link',
        includeHashtags: true,
        maxHashtags: 10,
        includeEmojis: true,
        contentType: 'promotional',
        additionalContext: 'This is a special event'
      }),
      mockUserId,
      mockOrgId
    );
  });

  it('should return 500 on service error', async () => {
    (contentGenerationService.generateContent as jest.Mock).mockRejectedValue(
      new Error('AI service unavailable')
    );

    const request = new NextRequest('http://localhost:3000/api/content/generate', {
      method: 'POST',
      body: JSON.stringify({
        topic: 'Test',
        platformType: PlatformType.INSTAGRAM
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Server Error');
    expect(data.message).toContain('Failed to generate content');
  });
});
