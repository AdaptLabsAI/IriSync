import { Timestamp } from 'firebase/firestore';
import { SocialPlatform } from './SocialAccount';

/**
 * Enum for analytics time periods
 */
export enum AnalyticsPeriod {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
  CUSTOM = 'custom'
}

/**
 * Enum for metric types
 */
export enum MetricType {
  VIEWS = 'views',
  LIKES = 'likes',
  COMMENTS = 'comments',
  SHARES = 'shares',
  CLICKS = 'clicks',
  IMPRESSIONS = 'impressions',
  REACH = 'reach',
  ENGAGEMENT = 'engagement',
  FOLLOWERS = 'followers',
  VIDEO_VIEWS = 'video_views',
  VIDEO_COMPLETION = 'video_completion',
  PROFILE_VISITS = 'profile_visits',
  WEBSITE_CLICKS = 'website_clicks',
  SAVES = 'saves',
  CONVERSIONS = 'conversions',
  MENTIONS = 'mentions'
}

/**
 * Interface for engagement metrics
 */
export interface EngagementMetrics {
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  clicks?: number;
  impressions?: number;
  reach?: number;
  engagement?: number;
  engagementRate?: number;
  saves?: number;
  videoViews?: number;
  videoCompletionRate?: number;
  averageWatchTime?: number;
  profileVisits?: number;
  websiteClicks?: number;
  followersGained?: number;
  followersLost?: number;
  totalFollowers?: number;
  mentions?: number;
  conversions?: number;
  customMetrics?: Record<string, number>;
}

/**
 * Interface for post analytics
 */
export interface PostAnalytics {
  id: string;
  userId: string;
  organizationId?: string;
  contentId: string;
  platform: SocialPlatform;
  platformPostId: string;
  metrics: EngagementMetrics;
  periodStart: Date;
  periodEnd: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface for account analytics
 */
export interface AccountAnalytics {
  id: string;
  userId: string;
  organizationId?: string;
  accountId: string;
  platform: SocialPlatform;
  metrics: EngagementMetrics;
  periodStart: Date;
  periodEnd: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface for competitor analytics
 */
export interface CompetitorAnalytics {
  id: string;
  userId: string;
  organizationId?: string;
  competitorId: string;
  competitorName: string;
  platform: SocialPlatform;
  metrics: EngagementMetrics;
  periodStart: Date;
  periodEnd: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface for audience demographics
 */
export interface AudienceDemographics {
  id: string;
  userId: string;
  organizationId?: string;
  accountId: string;
  platform: SocialPlatform;
  ageRanges: Record<string, number>; // e.g., '18-24': 15.5
  genders: Record<string, number>; // e.g., 'male': 45.2
  locations: Record<string, number>; // e.g., 'US': 65.8
  languages: Record<string, number>; // e.g., 'en': 80.3
  interests: Record<string, number>; // e.g., 'technology': 35.6
  activeHours: Record<string, number>; // e.g., '18': 12.5 (6PM)
  activeDays: Record<string, number>; // e.g., '1': 15.2 (Monday)
  periodStart: Date;
  periodEnd: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface for analytics summary
 */
export interface AnalyticsSummary {
  id: string;
  userId: string;
  organizationId?: string;
  platforms: SocialPlatform[];
  metrics: EngagementMetrics;
  growth: {
    followers: number;
    engagement: number;
    views: number;
    likes: number;
  };
  bestPerforming: {
    postId?: string;
    accountId?: string;
    platform?: SocialPlatform;
    metric: MetricType;
    value: number;
  }[];
  periodStart: Date;
  periodEnd: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Firestore interfaces for analytics data
 */
export interface FirestorePostAnalytics {
  userId: string;
  organizationId?: string;
  contentId: string;
  platform: SocialPlatform;
  platformPostId: string;
  metrics: EngagementMetrics;
  periodStart: Timestamp;
  periodEnd: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface FirestoreAccountAnalytics {
  userId: string;
  organizationId?: string;
  accountId: string;
  platform: SocialPlatform;
  metrics: EngagementMetrics;
  periodStart: Timestamp;
  periodEnd: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface FirestoreCompetitorAnalytics {
  userId: string;
  organizationId?: string;
  competitorId: string;
  competitorName: string;
  platform: SocialPlatform;
  metrics: EngagementMetrics;
  periodStart: Timestamp;
  periodEnd: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface FirestoreAudienceDemographics {
  userId: string;
  organizationId?: string;
  accountId: string;
  platform: SocialPlatform;
  ageRanges: Record<string, number>;
  genders: Record<string, number>;
  locations: Record<string, number>;
  languages: Record<string, number>;
  interests: Record<string, number>;
  activeHours: Record<string, number>;
  activeDays: Record<string, number>;
  periodStart: Timestamp;
  periodEnd: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface FirestoreAnalyticsSummary {
  userId: string;
  organizationId?: string;
  platforms: SocialPlatform[];
  metrics: EngagementMetrics;
  growth: {
    followers: number;
    engagement: number;
    views: number;
    likes: number;
  };
  bestPerforming: {
    postId?: string;
    accountId?: string;
    platform?: SocialPlatform;
    metric: MetricType;
    value: number;
  }[];
  periodStart: Timestamp;
  periodEnd: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Conversion functions for analytics data
 */
export function firestoreToPostAnalytics(id: string, data: FirestorePostAnalytics): PostAnalytics {
  return {
    id,
    userId: data.userId,
    organizationId: data.organizationId,
    contentId: data.contentId,
    platform: data.platform,
    platformPostId: data.platformPostId,
    metrics: data.metrics,
    periodStart: data.periodStart.toDate(),
    periodEnd: data.periodEnd.toDate(),
    createdAt: data.createdAt.toDate(),
    updatedAt: data.updatedAt.toDate()
  };
}

export function postAnalyticsToFirestore(analytics: PostAnalytics): FirestorePostAnalytics {
  return {
    userId: analytics.userId,
    organizationId: analytics.organizationId,
    contentId: analytics.contentId,
    platform: analytics.platform,
    platformPostId: analytics.platformPostId,
    metrics: analytics.metrics,
    periodStart: Timestamp.fromDate(analytics.periodStart),
    periodEnd: Timestamp.fromDate(analytics.periodEnd),
    createdAt: Timestamp.fromDate(analytics.createdAt),
    updatedAt: Timestamp.fromDate(analytics.updatedAt)
  };
}

export function firestoreToAccountAnalytics(id: string, data: FirestoreAccountAnalytics): AccountAnalytics {
  return {
    id,
    userId: data.userId,
    organizationId: data.organizationId,
    accountId: data.accountId,
    platform: data.platform,
    metrics: data.metrics,
    periodStart: data.periodStart.toDate(),
    periodEnd: data.periodEnd.toDate(),
    createdAt: data.createdAt.toDate(),
    updatedAt: data.updatedAt.toDate()
  };
}

export function accountAnalyticsToFirestore(analytics: AccountAnalytics): FirestoreAccountAnalytics {
  return {
    userId: analytics.userId,
    organizationId: analytics.organizationId,
    accountId: analytics.accountId,
    platform: analytics.platform,
    metrics: analytics.metrics,
    periodStart: Timestamp.fromDate(analytics.periodStart),
    periodEnd: Timestamp.fromDate(analytics.periodEnd),
    createdAt: Timestamp.fromDate(analytics.createdAt),
    updatedAt: Timestamp.fromDate(analytics.updatedAt)
  };
}

/**
 * Firestore index suggestions for the analytics collections
 * 
 * Collection: postAnalytics
 * Indexes:
 * - userId, platform, periodStart (desc)
 * - userId, contentId, periodStart (desc)
 * - organizationId, platform, periodStart (desc)
 * - contentId, platform, periodStart (desc)
 * 
 * Collection: accountAnalytics
 * Indexes:
 * - userId, platform, periodStart (desc)
 * - userId, accountId, periodStart (desc)
 * - organizationId, platform, periodStart (desc)
 * - accountId, platform, periodStart (desc)
 * 
 * Collection: competitorAnalytics
 * Indexes:
 * - userId, platform, periodStart (desc)
 * - userId, competitorId, periodStart (desc)
 * - organizationId, platform, periodStart (desc)
 * 
 * Collection: audienceDemographics
 * Indexes:
 * - userId, platform, periodStart (desc)
 * - userId, accountId, periodStart (desc)
 * - organizationId, platform, periodStart (desc)
 * 
 * Collection: analyticsSummary
 * Indexes:
 * - userId, periodStart (desc)
 * - organizationId, periodStart (desc)
 */ 