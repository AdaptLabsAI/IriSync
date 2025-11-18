/**
 * Integration tests for Best Time to Post API
 * Tests /api/content/best-time endpoint
 */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/content/best-time/route';
import { getServerSession } from 'next-auth/next';
import { contentGenerationService } from '@/lib/features/content/ContentGenerationService';
import { PlatformType } from '@/lib/features/platforms/PlatformProvider';

// Mock dependencies
jest.mock('next-auth/next');
jest.mock('@/lib/features/content/ContentGenerationService');

describe('GET /api/content/best-time', () => {
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

  it('should get best time recommendations successfully', async () => {
    const mockRecommendations = [
      {
        dayOfWeek: 'Monday',
        hour: 9,
        score: 85,
        confidence: 'high',
        reason: 'Highest engagement on Monday mornings'
      },
      {
        dayOfWeek: 'Wednesday',
        hour: 14,
        score: 78,
        confidence: 'medium',
        reason: 'Good engagement on Wednesday afternoons'
      },
      {
        dayOfWeek: 'Friday',
        hour: 17,
        score: 72,
        confidence: 'medium',
        reason: 'Moderate engagement on Friday evenings'
      }
    ];

    (contentGenerationService.getBestTimeToPost as jest.Mock).mockResolvedValue(mockRecommendations);

    const request = new NextRequest(
      'http://localhost:3000/api/content/best-time?platform=instagram&timezone=America/New_York'
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.recommendations).toEqual(mockRecommendations);
    expect(data.platformType).toBe(PlatformType.INSTAGRAM);
    expect(data.timezone).toBe('America/New_York');
    expect(contentGenerationService.getBestTimeToPost).toHaveBeenCalledWith(
      mockUserId,
      PlatformType.INSTAGRAM,
      'America/New_York'
    );
  });

  it('should use default timezone when not specified', async () => {
    const mockRecommendations = [
      {
        dayOfWeek: 'Monday',
        hour: 9,
        score: 80,
        confidence: 'high',
        reason: 'High engagement'
      }
    ];

    (contentGenerationService.getBestTimeToPost as jest.Mock).mockResolvedValue(mockRecommendations);

    const request = new NextRequest('http://localhost:3000/api/content/best-time?platform=twitter');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.timezone).toBe('America/New_York'); // default timezone
    expect(contentGenerationService.getBestTimeToPost).toHaveBeenCalledWith(
      mockUserId,
      PlatformType.TWITTER,
      'America/New_York'
    );
  });

  it('should return 401 when not authenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/content/best-time?platform=instagram');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 400 when platform parameter is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/content/best-time');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid Request');
    expect(data.message).toContain('Platform type is required');
  });

  it('should return 400 for invalid platform type', async () => {
    const request = new NextRequest('http://localhost:3000/api/content/best-time?platform=INVALID');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid Request');
    expect(data.message).toContain('Invalid platform type');
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
      const mockRecommendations = [
        {
          dayOfWeek: 'Monday',
          hour: 10,
          score: 75,
          confidence: 'medium',
          reason: `Best time for ${platform}`
        }
      ];

      (contentGenerationService.getBestTimeToPost as jest.Mock).mockResolvedValue(mockRecommendations);

      const request = new NextRequest(
        `http://localhost:3000/api/content/best-time?platform=${platform.toLowerCase()}`
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.platformType).toBe(platform);
    }
  });

  it('should handle different timezones', async () => {
    const timezones = [
      'America/New_York',
      'America/Los_Angeles',
      'Europe/London',
      'Europe/Paris',
      'Asia/Tokyo',
      'Australia/Sydney'
    ];

    for (const timezone of timezones) {
      const mockRecommendations = [
        {
          dayOfWeek: 'Tuesday',
          hour: 12,
          score: 80,
          confidence: 'high',
          reason: 'Peak engagement time'
        }
      ];

      (contentGenerationService.getBestTimeToPost as jest.Mock).mockResolvedValue(mockRecommendations);

      const request = new NextRequest(
        `http://localhost:3000/api/content/best-time?platform=instagram&timezone=${encodeURIComponent(timezone)}`
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.timezone).toBe(timezone);
    }
  });

  it('should return recommendations with correct structure', async () => {
    const mockRecommendations = [
      {
        dayOfWeek: 'Monday',
        hour: 9,
        score: 90,
        confidence: 'high',
        reason: 'Highest engagement based on historical data'
      },
      {
        dayOfWeek: 'Wednesday',
        hour: 15,
        score: 85,
        confidence: 'high',
        reason: 'Strong afternoon engagement'
      }
    ];

    (contentGenerationService.getBestTimeToPost as jest.Mock).mockResolvedValue(mockRecommendations);

    const request = new NextRequest(
      'http://localhost:3000/api/content/best-time?platform=instagram'
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.recommendations).toBeInstanceOf(Array);

    data.recommendations.forEach((rec: any) => {
      expect(rec).toHaveProperty('dayOfWeek');
      expect(rec).toHaveProperty('hour');
      expect(rec).toHaveProperty('score');
      expect(rec).toHaveProperty('confidence');
      expect(rec).toHaveProperty('reason');

      expect(typeof rec.dayOfWeek).toBe('string');
      expect(typeof rec.hour).toBe('number');
      expect(rec.hour).toBeGreaterThanOrEqual(0);
      expect(rec.hour).toBeLessThan(24);
      expect(rec.score).toBeGreaterThanOrEqual(0);
      expect(rec.score).toBeLessThanOrEqual(100);
      expect(['low', 'medium', 'high']).toContain(rec.confidence);
    });
  });

  it('should handle empty recommendations', async () => {
    (contentGenerationService.getBestTimeToPost as jest.Mock).mockResolvedValue([]);

    const request = new NextRequest(
      'http://localhost:3000/api/content/best-time?platform=instagram'
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.recommendations).toEqual([]);
  });

  it('should handle case-insensitive platform parameter', async () => {
    const mockRecommendations = [
      {
        dayOfWeek: 'Monday',
        hour: 10,
        score: 75,
        confidence: 'medium',
        reason: 'Good engagement'
      }
    ];

    (contentGenerationService.getBestTimeToPost as jest.Mock).mockResolvedValue(mockRecommendations);

    const variations = ['INSTAGRAM', 'Instagram', 'instagram', 'InStAgRaM'];

    for (const platformVariation of variations) {
      const request = new NextRequest(
        `http://localhost:3000/api/content/best-time?platform=${platformVariation}`
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.platformType).toBe(PlatformType.INSTAGRAM);
    }
  });

  it('should return 500 on service error', async () => {
    (contentGenerationService.getBestTimeToPost as jest.Mock).mockRejectedValue(
      new Error('Analytics service unavailable')
    );

    const request = new NextRequest(
      'http://localhost:3000/api/content/best-time?platform=instagram'
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Server Error');
    expect(data.message).toContain('Failed to get best time to post recommendations');
  });

  it('should handle special characters in timezone', async () => {
    const mockRecommendations = [
      {
        dayOfWeek: 'Friday',
        hour: 18,
        score: 82,
        confidence: 'high',
        reason: 'Weekend approach engagement spike'
      }
    ];

    (contentGenerationService.getBestTimeToPost as jest.Mock).mockResolvedValue(mockRecommendations);

    const request = new NextRequest(
      'http://localhost:3000/api/content/best-time?platform=instagram&timezone=America%2FNew_York'
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.timezone).toBe('America/New_York');
  });

  it('should return multiple recommendations sorted by score', async () => {
    const mockRecommendations = [
      { dayOfWeek: 'Monday', hour: 9, score: 95, confidence: 'high', reason: 'Peak time' },
      { dayOfWeek: 'Wednesday', hour: 14, score: 88, confidence: 'high', reason: 'Strong time' },
      { dayOfWeek: 'Friday', hour: 17, score: 82, confidence: 'medium', reason: 'Good time' },
      { dayOfWeek: 'Tuesday', hour: 11, score: 75, confidence: 'medium', reason: 'Moderate time' },
      { dayOfWeek: 'Thursday', hour: 16, score: 70, confidence: 'medium', reason: 'Fair time' }
    ];

    (contentGenerationService.getBestTimeToPost as jest.Mock).mockResolvedValue(mockRecommendations);

    const request = new NextRequest(
      'http://localhost:3000/api/content/best-time?platform=linkedin&timezone=America/New_York'
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.recommendations.length).toBe(5);

    // Verify scores are in descending order
    for (let i = 1; i < data.recommendations.length; i++) {
      expect(data.recommendations[i - 1].score).toBeGreaterThanOrEqual(
        data.recommendations[i].score
      );
    }
  });
});
