import { Timestamp } from 'firebase/firestore';

/**
 * Competitor source type
 */
export enum CompetitorSourceType {
  MANUAL = 'manual',
  SOCIAL = 'social',
  WEBSITE = 'website',
  THIRD_PARTY = 'third_party'
}

/**
 * Competitor profile
 */
export interface Competitor {
  id: string;
  name: string;
  description?: string;
  websiteUrl?: string;
  socialProfiles: {
    platformId: string;
    handle: string;
    url: string;
    profileId?: string;
    isTracked: boolean;
  }[];
  industry: string[];
  size?: 'small' | 'medium' | 'large' | 'enterprise';
  targetAudience?: string[];
  strengths?: string[];
  weaknesses?: string[];
  tags: string[];
  notes?: string;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastSyncAt?: Timestamp;
}

/**
 * Competitor metric snapshot
 */
export interface CompetitorMetric {
  id: string;
  competitorId: string;
  platformId: string;
  metricName: string;
  value: number;
  date: string;
  source: CompetitorSourceType;
  confidence?: number; // For metrics that are estimated
  metadata?: Record<string, any>;
}

/**
 * Competitor content snapshot
 */
export interface CompetitorContent {
  id: string;
  competitorId: string;
  platformId: string;
  contentId: string; // Platform-specific ID
  contentUrl: string;
  contentType: 'post' | 'video' | 'story' | 'reel' | 'article';
  publishedAt: Timestamp;
  caption?: string;
  hashtags?: string[];
  mediaUrls?: string[];
  metrics: {
    likes?: number;
    comments?: number;
    shares?: number;
    views?: number;
    saves?: number;
    engagementRate?: number;
  };
  sentiment?: 'positive' | 'neutral' | 'negative';
  topics?: string[];
  collectedAt: Timestamp;
}

/**
 * Competitor benchmark
 */
export interface CompetitorBenchmark {
  id: string;
  metricName: string;
  industry: string;
  segment?: string;
  period: string; // YYYY-MM or YYYY-MM-DD
  value: number;
  source: string;
  updatedAt: Timestamp;
}

/**
 * Competitor comparison
 */
export interface CompetitorComparison {
  competitorId: string;
  competitorName: string;
  metrics: {
    metricName: string;
    competitorValue: number;
    yourValue: number;
    difference: number;
    percentageDifference: number;
    trend: 'up' | 'down' | 'stable';
    isPositive: boolean;
  }[];
  socialProfiles: {
    platformId: string;
    platform: string;
    competitorHandle: string;
    yourHandle: string;
    competitorMetrics: Record<string, number>;
    yourMetrics: Record<string, number>;
    comparison: Record<string, {
      difference: number;
      percentageDifference: number;
      trend: 'up' | 'down' | 'stable';
      isPositive: boolean;
    }>;
  }[];
  contentPerformance: {
    platform: string;
    competitorAvgEngagement: number;
    yourAvgEngagement: number;
    competitorTopContent: CompetitorContent[];
    yourTopContent: {
      id: string;
      contentUrl: string;
      contentType: string;
      publishedAt: Timestamp;
      metrics: Record<string, number>;
    }[];
  }[];
  generatedAt: Timestamp;
}

/**
 * Competitor limit by subscription tier
 */
export interface CompetitorLimits {
  maxCompetitors: number;
  maxPlatformsPerCompetitor: number;
  historicalDataMonths: number;
  refreshFrequency: 'daily' | 'weekly';
  detailedMetrics: boolean;
  contentAnalysis: boolean;
  benchmarking: boolean;
}

/**
 * Competitor report configuration
 */
export interface CompetitorReportConfig {
  id: string;
  name: string;
  description?: string;
  competitorIds: string[];
  metrics: string[];
  timeframe: 'week' | 'month' | 'quarter' | 'year';
  platforms: string[];
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  schedule?: {
    frequency: 'weekly' | 'monthly';
    dayOfWeek?: number; // 0-6 where 0 is Sunday
    dayOfMonth?: number; // 1-31
    recipients: string[];
  };
}
