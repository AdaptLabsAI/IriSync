// Dashboard Library Types
// Comprehensive type definitions for dashboard functionality

/**
 * Supported dashboard metric types
 */
export enum MetricType {
  ENGAGEMENT = 'engagement',
  REACH = 'reach',
  IMPRESSIONS = 'impressions',
  FOLLOWERS = 'followers',
  LIKES = 'likes',
  COMMENTS = 'comments',
  SHARES = 'shares',
  CLICKS = 'clicks',
  CONVERSIONS = 'conversions',
  REVENUE = 'revenue',
  POSTS_PUBLISHED = 'posts_published',
  RESPONSE_TIME = 'response_time',
  SENTIMENT_SCORE = 'sentiment_score',
  GROWTH_RATE = 'growth_rate',
  ENGAGEMENT_RATE = 'engagement_rate'
}

/**
 * Supported widget types
 */
export enum WidgetType {
  STATS = 'stats',
  CHART = 'chart',
  ACTIVITY = 'activity',
  PLATFORM_OVERVIEW = 'platform_overview',
  PERFORMANCE_METRICS = 'performance_metrics',
  AUDIENCE_METRICS = 'audience_metrics',
  CONTENT_PERFORMANCE = 'content_performance',
  UPCOMING_POSTS = 'upcoming_posts',
  NOTIFICATIONS = 'notifications',
  TOKEN_USAGE = 'token_usage'
}

/**
 * Time range options for metrics
 */
export enum TimeRange {
  LAST_24_HOURS = 'last_24_hours',
  LAST_7_DAYS = 'last_7_days',
  LAST_30_DAYS = 'last_30_days',
  LAST_90_DAYS = 'last_90_days',
  LAST_6_MONTHS = 'last_6_months',
  LAST_YEAR = 'last_year',
  CUSTOM = 'custom'
}

/**
 * Dashboard error types
 */
export enum DashboardErrorType {
  VALIDATION_ERROR = 'validation_error',
  API_ERROR = 'api_error',
  CACHE_ERROR = 'cache_error',
  DATA_AGGREGATION_ERROR = 'data_aggregation_error',
  WIDGET_ERROR = 'widget_error',
  METRICS_CALCULATION_ERROR = 'metrics_calculation_error',
  REAL_TIME_ERROR = 'real_time_error',
  PLATFORM_CONNECTION_ERROR = 'platform_connection_error'
}

/**
 * Platform identifiers for metrics
 */
export enum Platform {
  FACEBOOK = 'facebook',
  INSTAGRAM = 'instagram',
  TWITTER = 'twitter',
  LINKEDIN = 'linkedin',
  TIKTOK = 'tiktok',
  YOUTUBE = 'youtube',
  PINTEREST = 'pinterest',
  REDDIT = 'reddit',
  MASTODON = 'mastodon',
  THREADS = 'threads',
  HUBSPOT = 'hubspot',
  SALESFORCE = 'salesforce',
  ZOHO = 'zoho',
  PIPEDRIVE = 'pipedrive',
  DYNAMICS = 'dynamics',
  SUGARCRM = 'sugarcrm'
}

/**
 * Base dashboard metric interface
 */
export interface DashboardMetric {
  id: string;
  type: MetricType;
  value: number;
  previousValue?: number;
  change?: number;
  changePercentage?: number;
  platform?: Platform;
  timeRange: TimeRange;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Widget configuration interface
 */
export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  settings: Record<string, any>;
  isVisible: boolean;
  refreshInterval?: number; // in seconds
  dataSource?: string;
  filters?: Record<string, any>;
}

/**
 * Dashboard widget interface
 */
export interface DashboardWidget {
  config: WidgetConfig;
  data: any;
  loading: boolean;
  error?: DashboardError;
  lastUpdated: Date;
}

/**
 * Dashboard configuration interface
 */
export interface DashboardConfig {
  id: string;
  userId: string;
  organizationId?: string;
  name: string;
  description?: string;
  widgets: WidgetConfig[];
  layout: 'grid' | 'flex' | 'custom';
  theme: 'light' | 'dark' | 'auto';
  refreshInterval: number; // in seconds
  isDefault: boolean;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Platform-specific metrics
 */
export interface PlatformMetrics {
  platform: Platform;
  metrics: DashboardMetric[];
  connectionStatus: 'connected' | 'disconnected' | 'error';
  lastSync: Date;
  accountInfo?: {
    id: string;
    name: string;
    username?: string;
    profileImage?: string;
  };
}

/**
 * Engagement metrics interface
 */
export interface EngagementMetrics {
  totalEngagement: number;
  engagementRate: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  saves?: number;
  reactions?: Record<string, number>;
  timeRange: TimeRange;
  platform?: Platform;
}

/**
 * Audience metrics interface
 */
export interface AudienceMetrics {
  totalFollowers: number;
  followerGrowth: number;
  followerGrowthRate: number;
  reach: number;
  impressions: number;
  demographics?: {
    ageGroups: Record<string, number>;
    genders: Record<string, number>;
    locations: Record<string, number>;
    interests: Record<string, number>;
  };
  timeRange: TimeRange;
  platform?: Platform;
}

/**
 * Content metrics interface
 */
export interface ContentMetrics {
  totalPosts: number;
  publishedPosts: number;
  scheduledPosts: number;
  draftPosts: number;
  averageEngagement: number;
  topPerformingPosts: Array<{
    id: string;
    title: string;
    platform: Platform;
    engagement: number;
    publishedAt: Date;
  }>;
  contentTypes: Record<string, number>;
  timeRange: TimeRange;
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  enabled: boolean;
  ttl: number; // Time to live in seconds
  maxSize: number; // Maximum cache size in MB
  strategy: 'lru' | 'fifo' | 'ttl';
  keyPrefix: string;
}

/**
 * Real-time configuration
 */
export interface RealTimeConfig {
  enabled: boolean;
  updateInterval: number; // in seconds
  maxConnections: number;
  channels: string[];
  fallbackToPolling: boolean;
}

/**
 * Data aggregation configuration
 */
export interface AggregationConfig {
  batchSize: number;
  maxConcurrency: number;
  retryAttempts: number;
  retryDelay: number; // in milliseconds
  timeout: number; // in milliseconds
  platforms: Platform[];
}

/**
 * Dashboard error interface
 */
export interface DashboardError {
  type: DashboardErrorType;
  message: string;
  code?: string;
  platform?: Platform;
  widget?: string;
  timestamp: Date;
  details?: Record<string, any>;
  stack?: string;
}

/**
 * Dashboard error class
 */
export class DashboardErrorClass extends Error implements DashboardError {
  public readonly type: DashboardErrorType;
  public readonly code?: string;
  public readonly platform?: Platform;
  public readonly widget?: string;
  public readonly timestamp: Date;
  public readonly details?: Record<string, any>;

  constructor(
    type: DashboardErrorType,
    message: string,
    platform?: Platform,
    widget?: string,
    timestamp?: Date,
    details?: Record<string, any>,
    stack?: string
  ) {
    super(message);
    this.name = 'DashboardError';
    this.type = type;
    this.platform = platform;
    this.widget = widget;
    this.timestamp = timestamp || new Date();
    this.details = details;
    
    if (stack) {
      this.stack = stack;
    }
  }
}

/**
 * API response wrapper
 */
export interface DashboardApiResponse<T> {
  success: boolean;
  data?: T;
  error?: DashboardError;
  metadata?: {
    total?: number;
    page?: number;
    limit?: number;
    hasMore?: boolean;
    lastUpdated?: Date;
  };
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

/**
 * Search parameters
 */
export interface SearchParams {
  query?: string;
  filters?: Record<string, any>;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Metrics calculation parameters
 */
export interface MetricsCalculationParams {
  timeRange: TimeRange;
  startDate?: Date;
  endDate?: Date;
  platforms?: Platform[];
  metricTypes?: MetricType[];
  includeComparison?: boolean;
  granularity?: 'hour' | 'day' | 'week' | 'month';
}

/**
 * Widget data refresh parameters
 */
export interface WidgetRefreshParams {
  widgetId: string;
  force?: boolean;
  timeRange?: TimeRange;
  filters?: Record<string, any>;
}

/**
 * Dashboard export configuration
 */
export interface DashboardExportConfig {
  format: 'pdf' | 'excel' | 'csv' | 'json';
  includeCharts: boolean;
  includeRawData: boolean;
  timeRange: TimeRange;
  widgets?: string[]; // Widget IDs to include
  customization?: {
    title?: string;
    description?: string;
    logo?: string;
    branding?: boolean;
  };
}

/**
 * Real-time update event
 */
export interface RealTimeUpdateEvent {
  type: 'metric_update' | 'widget_update' | 'dashboard_update';
  widgetId?: string;
  dashboardId?: string;
  data: any;
  timestamp: Date;
  userId: string;
}

/**
 * Performance benchmark data
 */
export interface PerformanceBenchmark {
  metric: MetricType;
  platform: Platform;
  industry?: string;
  percentile25: number;
  percentile50: number;
  percentile75: number;
  percentile90: number;
  average: number;
  sampleSize: number;
  lastUpdated: Date;
}

/**
 * Dashboard Types for IriSync
 */

export interface DashboardData {
  stats: DashboardStat[];
  upcomingPosts: UpcomingPost[];
  platforms: PlatformMetric[];
  topPosts: TopPost[];
  recentActivities: RecentActivity[];
  notifications: DashboardNotification[];
}

export interface DashboardStat {
  label: string;
  value: string;
  change: number;
  increasing: boolean;
}

export interface UpcomingPost {
  id: string;
  title: string;
  platform: string;
  scheduledFor: string;
  status: 'draft' | 'ready';
}

export interface PlatformMetric {
  name: string;
  followers: number;
  engagement: number;
  color: string;
  progress: number;
}

export interface TopPost {
  id: string;
  title: string;
  platform: string;
  likes: number;
  comments: number;
  shares: number;
  imageUrl: string;
}

export interface RecentActivity {
  id: string;
  type: DashboardActivityType;
  user: {
    id: string;
    name: string;
    avatar: string;
  };
  timestamp: string;
  content: string;
  platform?: string;
  additionalInfo?: any;
  isNew: boolean;
}

export interface DashboardNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  priority: DashboardNotificationPriority;
}

export type DashboardActivityType =
  | 'post_created'
  | 'post_published'
  | 'media_uploaded'
  | 'post_scheduled'
  | 'engagement_received'
  | 'comment_received'
  | 'new_follower'
  | 'message_received';

export type DashboardNotificationPriority = 'high' | 'medium' | 'low'; 