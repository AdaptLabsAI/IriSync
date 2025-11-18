/**
 * Integration tests for Hashtag Suggestions API
 * Tests /api/content/hashtags endpoint
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/content/hashtags/route';
import { getServerSession } from 'next-auth/next';
import { contentGenerationService } from '@/lib/features/content/ContentGenerationService';
import { PlatformType } from '@/lib/features/platforms/PlatformProvider';

// Mock dependencies
jest.mock('next-auth/next');
jest.mock('@/lib/features/content/ContentGenerationService');

describe('POST /api/content/hashtags', () => {
  const mockUserId = 'user123';

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
  });

  it('should generate hashtag suggestions successfully', async () => {
    const mockHashtags = [
      '#technology',
      '#innovation',
      '#AI',
      '#future',
      '#tech',
      '#digital',
      '#startup',
      '#business'
    ];

    (contentGenerationService.getHashtagSuggestions as jest.Mock).mockResolvedValue(mockHashtags);

    const request = new NextRequest('http://localhost:3000/api/content/hashtags', {
      method: 'POST',
      body: JSON.stringify({
        content: 'AI and technology innovation in the startup ecosystem',
        platformType: PlatformType.INSTAGRAM,
        count: 10
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.suggestions).toEqual(mockHashtags);
    expect(contentGenerationService.getHashtagSuggestions).toHaveBeenCalledWith(
      'AI and technology innovation in the startup ecosystem',
      PlatformType.INSTAGRAM,
      10
    );
  });

  it('should use default count when not specified', async () => {
    const mockHashtags = ['#tech', '#innovation', '#AI'];

    (contentGenerationService.getHashtagSuggestions as jest.Mock).mockResolvedValue(mockHashtags);

    const request = new NextRequest('http://localhost:3000/api/content/hashtags', {
      method: 'POST',
      body: JSON.stringify({
        content: 'Technology innovation',
        platformType: PlatformType.TWITTER
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(contentGenerationService.getHashtagSuggestions).toHaveBeenCalledWith(
      'Technology innovation',
      PlatformType.TWITTER,
      10 // default count
    );
  });

  it('should return 401 when not authenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/content/hashtags', {
      method: 'POST',
      body: JSON.stringify({
        content: 'Test',
        platformType: PlatformType.INSTAGRAM
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 400 when content is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/content/hashtags', {
      method: 'POST',
      body: JSON.stringify({
        platformType: PlatformType.INSTAGRAM
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid Request');
    expect(data.message).toContain('Content is required');
  });

  it('should return 400 when platformType is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/content/hashtags', {
      method: 'POST',
      body: JSON.stringify({
        content: 'Test content'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid Request');
    expect(data.message).toContain('Platform type is required');
  });

  it('should return 400 for invalid platform type', async () => {
    const request = new NextRequest('http://localhost:3000/api/content/hashtags', {
      method: 'POST',
      body: JSON.stringify({
        content: 'Test content',
        platformType: 'INVALID_PLATFORM'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid Request');
    expect(data.message).toContain('Invalid platform type');
  });

  it('should return 400 when count is less than 1', async () => {
    const request = new NextRequest('http://localhost:3000/api/content/hashtags', {
      method: 'POST',
      body: JSON.stringify({
        content: 'Test content',
        platformType: PlatformType.INSTAGRAM,
        count: 0
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid Request');
    expect(data.message).toContain('Count must be between 1 and 30');
  });

  it('should return 400 when count is greater than 30', async () => {
    const request = new NextRequest('http://localhost:3000/api/content/hashtags', {
      method: 'POST',
      body: JSON.stringify({
        content: 'Test content',
        platformType: PlatformType.INSTAGRAM,
        count: 50
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid Request');
    expect(data.message).toContain('Count must be between 1 and 30');
  });

  it('should handle different platforms', async () => {
    const platforms = [
      { type: PlatformType.INSTAGRAM, hashtags: ['#insta', '#photo', '#lifestyle'] },
      { type: PlatformType.TWITTER, hashtags: ['#tech', '#news'] },
      { type: PlatformType.FACEBOOK, hashtags: ['#social', '#community'] },
      { type: PlatformType.LINKEDIN, hashtags: ['#business', '#professional', '#career'] }
    ];

    for (const platform of platforms) {
      (contentGenerationService.getHashtagSuggestions as jest.Mock).mockResolvedValue(
        platform.hashtags
      );

      const request = new NextRequest('http://localhost:3000/api/content/hashtags', {
        method: 'POST',
        body: JSON.stringify({
          content: 'Test content',
          platformType: platform.type,
          count: 5
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.suggestions).toEqual(platform.hashtags);
    }
  });

  it('should handle various count values', async () => {
    const counts = [1, 5, 10, 15, 30];

    for (const count of counts) {
      const mockHashtags = Array.from({ length: count }, (_, i) => `#hashtag${i + 1}`);
      (contentGenerationService.getHashtagSuggestions as jest.Mock).mockResolvedValue(mockHashtags);

      const request = new NextRequest('http://localhost:3000/api/content/hashtags', {
        method: 'POST',
        body: JSON.stringify({
          content: 'Test content',
          platformType: PlatformType.INSTAGRAM,
          count
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.suggestions.length).toBe(count);
    }
  });

  it('should handle long content text', async () => {
    const longContent = 'AI and machine learning are revolutionizing the technology industry. ' +
      'From automated customer service to predictive analytics, artificial intelligence is ' +
      'transforming how businesses operate and serve their customers. The future of technology ' +
      'is intelligent, adaptive, and increasingly autonomous.';

    const mockHashtags = ['#AI', '#machinelearning', '#technology', '#innovation', '#future'];
    (contentGenerationService.getHashtagSuggestions as jest.Mock).mockResolvedValue(mockHashtags);

    const request = new NextRequest('http://localhost:3000/api/content/hashtags', {
      method: 'POST',
      body: JSON.stringify({
        content: longContent,
        platformType: PlatformType.LINKEDIN,
        count: 5
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.suggestions).toEqual(mockHashtags);
  });

  it('should return 500 on service error', async () => {
    (contentGenerationService.getHashtagSuggestions as jest.Mock).mockRejectedValue(
      new Error('AI service error')
    );

    const request = new NextRequest('http://localhost:3000/api/content/hashtags', {
      method: 'POST',
      body: JSON.stringify({
        content: 'Test content',
        platformType: PlatformType.INSTAGRAM,
        count: 10
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Server Error');
    expect(data.message).toContain('Failed to get hashtag suggestions');
  });

  it('should validate all hashtags start with #', async () => {
    const mockHashtags = ['#valid1', '#valid2', '#valid3'];
    (contentGenerationService.getHashtagSuggestions as jest.Mock).mockResolvedValue(mockHashtags);

    const request = new NextRequest('http://localhost:3000/api/content/hashtags', {
      method: 'POST',
      body: JSON.stringify({
        content: 'Test',
        platformType: PlatformType.INSTAGRAM,
        count: 5
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    data.suggestions.forEach((hashtag: string) => {
      expect(hashtag).toMatch(/^#\w+$/);
    });
  });
});
