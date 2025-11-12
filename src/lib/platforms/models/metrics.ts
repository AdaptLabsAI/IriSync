import { PlatformType } from '../PlatformProvider';

/**
 * Time period for analytics metrics
 */
export type MetricPeriod = 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

/**
 * Engagement metrics for a platform
 */
export interface EngagementMetrics {
  likes: number;
  comments: number;
  shares: number;
  saves?: number;
  clicks?: number;
  reactions?: Record<string, number>; // For platforms with reaction types (like, love, haha)
  videoViews?: number;
  videoCompletions?: number;
  storyViews?: number;
  storyReplies?: number;
  mentions?: number;
  totalEngagements: number;
  engagementRate: number;
}

/**
 * Audience metrics for a platform
 */
export interface AudienceMetrics {
  followers: number;
  followersGained: number;
  followersLost: number;
  followersNetGrowth: number;
  followersGrowthRate: number;
  reach: number; // Number of unique users who saw content
  impressions: number; // Total number of times content was displayed
  profileViews?: number;
  audienceDemographics?: {
    ageGroups?: Record<string, number>;
    genders?: Record<string, number>;
    countries?: Record<string, number>;
    cities?: Record<string, number>;
    languages?: Record<string, number>;
    interests?: Record<string, number>;
  };
}

/**
 * Content performance metrics for a platform
 */
export interface ContentMetrics {
  topPosts: {
    postId: string;
    engagements: number;
    reach?: number;
    impressions?: number;
  }[];
  postCount: number;
  averageEngagementPerPost: number;
  averageReachPerPost?: number;
  averageImpressionsPerPost?: number;
  bestTimeToPost?: Record<string, string[]>; // day of week -> hours
  bestContentTypes?: Record<string, number>; // content type -> engagement count
  hashtagPerformance?: Record<string, number>; // hashtag -> engagement count
}

/**
 * Consolidated metrics for a platform
 */
export interface PlatformMetrics {
  platformType: PlatformType;
  accountId: string;
  period: MetricPeriod;
  startDate: Date;
  endDate: Date;
  engagement: EngagementMetrics;
  audience: AudienceMetrics;
  content: ContentMetrics;
  comparisonPeriod?: {
    startDate: Date;
    endDate: Date;
    engagement: EngagementMetrics;
    audience: AudienceMetrics;
    content: ContentMetrics;
  };
  metadata?: Record<string, any>;
}
