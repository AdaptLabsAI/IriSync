import { Timestamp } from 'firebase/firestore';

/**
 * Core event interface for all analytics events
 */
export interface AnalyticsEvent {
  id: string;
  eventName: string;
  userId: string;
  sessionId: string;
  timestamp: Timestamp;
  properties: Record<string, any>;
  source: EventSource;
  validated: boolean;
}

/**
 * Source of the event
 */
export enum EventSource {
  WEB_APP = 'web_app',
  MOBILE_APP = 'mobile_app',
  API = 'api',
  WEBHOOK = 'webhook',
  SYSTEM = 'system',
  INTEGRATION = 'integration'
}

/**
 * The general category of the event
 */
export enum EventCategory {
  PAGE_VIEW = 'page_view',
  USER_ACTION = 'user_action',
  CONTENT = 'content',
  PLATFORM = 'platform',
  SUBSCRIPTION = 'subscription',
  AI = 'ai',
  SYSTEM = 'system',
  ERROR = 'error',
  PERFORMANCE = 'performance',
  INTEGRATION = 'integration'
}

/**
 * Standard user action events
 */
export enum UserActionEvent {
  LOGIN = 'login',
  SIGNUP = 'signup',
  LOGOUT = 'logout',
  PROFILE_UPDATE = 'profile_update',
  SETTINGS_UPDATE = 'settings_update',
  PLATFORM_CONNECT = 'platform_connect',
  PLATFORM_DISCONNECT = 'platform_disconnect',
  SUBSCRIPTION_CHANGE = 'subscription_change',
  TOKEN_PURCHASE = 'token_purchase'
}

/**
 * Standard content events
 */
export enum ContentEvent {
  POST_CREATE = 'post_create',
  POST_EDIT = 'post_edit',
  POST_PUBLISH = 'post_publish',
  POST_DELETE = 'post_delete',
  POST_SCHEDULE = 'post_schedule',
  MEDIA_UPLOAD = 'media_upload',
  MEDIA_EDIT = 'media_edit',
  MEDIA_DELETE = 'media_delete',
  COMMENT_REPLY = 'comment_reply',
  INBOX_OPEN = 'inbox_open',
  CALENDAR_CREATE = 'calendar_create',
  CALENDAR_EDIT = 'calendar_edit'
}

/**
 * Standard AI events
 */
export enum AIEvent {
  CONTENT_GENERATE = 'content_generate',
  CAPTION_GENERATE = 'caption_generate',
  HASHTAG_GENERATE = 'hashtag_generate',
  IMAGE_ANALYZE = 'image_analyze',
  SENTIMENT_ANALYZE = 'sentiment_analyze',
  ENGAGEMENT_PREDICT = 'engagement_predict',
  SMART_REPLY = 'smart_reply',
  TOKEN_USE = 'token_use',
  TOKEN_EXHAUST = 'token_exhaust',
  CONTENT_STRATEGY = 'content_strategy'
}

/**
 * Standard page view events
 */
export enum PageViewEvent {
  PAGE_VIEW = 'page_view',
  SCREEN_VIEW = 'screen_view',
  FEATURE_VIEW = 'feature_view',
  MODAL_OPEN = 'modal_open',
  TOOLTIP_VIEW = 'tooltip_view'
}

/**
 * Standard subscription events
 */
export enum SubscriptionEvent {
  SUBSCRIPTION_START = 'subscription_start',
  SUBSCRIPTION_RENEW = 'subscription_renew',
  SUBSCRIPTION_CANCEL = 'subscription_cancel',
  SUBSCRIPTION_UPGRADE = 'subscription_upgrade',
  SUBSCRIPTION_DOWNGRADE = 'subscription_downgrade',
  PAYMENT_SUCCEED = 'payment_succeed',
  PAYMENT_FAIL = 'payment_fail',
  TRIAL_START = 'trial_start',
  TRIAL_CONVERT = 'trial_convert',
  TRIAL_EXPIRE = 'trial_expire'
}

/**
 * Standard platform events
 */
export enum PlatformEvent {
  POST_PUBLISHED = 'post_published',
  POST_FAILED = 'post_failed',
  ENGAGEMENT_RECEIVED = 'engagement_received',
  COMMENT_RECEIVED = 'comment_received',
  FOLLOWER_GAINED = 'follower_gained',
  FOLLOWER_LOST = 'follower_lost',
  MESSAGE_RECEIVED = 'message_received',
  RATE_LIMIT_HIT = 'rate_limit_hit'
}

/**
 * Event validation result
 */
export interface EventValidationResult {
  isValid: boolean;
  errors?: string[];
}

/**
 * Event schema type defining validation rules
 */
export interface EventSchema {
  eventName: string;
  category: EventCategory;
  requiredProperties: string[];
  optionalProperties: string[];
  propertyTypes: Record<string, 'string' | 'number' | 'boolean' | 'array' | 'object' | 'any'>;
  propertyValidators?: Record<string, (value: any) => boolean>;
}

/**
 * Custom event definition for user-defined events
 */
export interface CustomEventDefinition {
  id: string;
  name: string;
  description: string;
  category: EventCategory;
  properties: {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    required: boolean;
    description?: string;
  }[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  isEnabled: boolean;
}

/**
 * Event aggregation type
 */
export enum AggregationType {
  COUNT = 'count',
  SUM = 'sum',
  AVERAGE = 'average',
  MIN = 'min',
  MAX = 'max',
  DISTINCT_COUNT = 'distinct_count'
}

/**
 * Time period for aggregation
 */
export enum TimePeriod {
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year'
}

/**
 * Daily event aggregation
 */
export interface DailyEventAggregation {
  id: string;
  eventName: string;
  date: string; // YYYY-MM-DD
  count: number;
  properties: Record<string, {
    type: AggregationType;
    value: number;
  }>;
}

/**
 * Monthly event aggregation
 */
export interface MonthlyEventAggregation {
  id: string;
  eventName: string;
  yearMonth: string; // YYYY-MM
  count: number;
  properties: Record<string, {
    type: AggregationType;
    value: number;
  }>;
}
