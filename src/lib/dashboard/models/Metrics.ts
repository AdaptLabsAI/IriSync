// Metrics Model - Dashboard metrics data structure and utilities
// Production-ready model following existing codebase patterns

import { Timestamp } from 'firebase/firestore';
import { MetricType, Platform, TimeRange, DashboardMetric } from '../types';

/**
 * Metrics data interface for API operations
 */
export interface MetricsData {
  type: MetricType;
  value: number;
  previousValue?: number;
  platform?: Platform;
  timeRange: TimeRange;
  metadata?: Record<string, any>;
}

/**
 * Metrics interface for application use
 */
export interface Metrics {
  id: string;
  userId: string;
  organizationId?: string;
  type: MetricType;
  value: number;
  previousValue?: number;
  change?: number;
  changePercentage?: number;
  platform?: Platform;
  timeRange: TimeRange;
  startDate: Date;
  endDate: Date;
  metadata?: Record<string, any>;
  calculatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Firestore metrics document structure
 */
export interface FirestoreMetrics {
  userId: string;
  organizationId?: string;
  type: MetricType;
  value: number;
  previousValue?: number;
  change?: number;
  changePercentage?: number;
  platform?: Platform;
  timeRange: TimeRange;
  startDate: Timestamp;
  endDate: Timestamp;
  metadata?: Record<string, any>;
  calculatedAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Metrics utility functions
 */
export class MetricsUtils {
  /**
   * Convert Metrics to Firestore format
   */
  static toFirestore(metrics: Omit<Metrics, 'id'>): FirestoreMetrics {
    return {
      userId: metrics.userId,
      organizationId: metrics.organizationId,
      type: metrics.type,
      value: metrics.value,
      previousValue: metrics.previousValue,
      change: metrics.change,
      changePercentage: metrics.changePercentage,
      platform: metrics.platform,
      timeRange: metrics.timeRange,
      startDate: Timestamp.fromDate(metrics.startDate),
      endDate: Timestamp.fromDate(metrics.endDate),
      metadata: metrics.metadata,
      calculatedAt: Timestamp.fromDate(metrics.calculatedAt),
      createdAt: Timestamp.fromDate(metrics.createdAt),
      updatedAt: Timestamp.fromDate(metrics.updatedAt)
    };
  }

  /**
   * Convert Firestore document to Metrics
   */
  static fromFirestore(doc: FirestoreMetrics, id: string): Metrics {
    return {
      id,
      userId: doc.userId,
      organizationId: doc.organizationId,
      type: doc.type,
      value: doc.value,
      previousValue: doc.previousValue,
      change: doc.change,
      changePercentage: doc.changePercentage,
      platform: doc.platform,
      timeRange: doc.timeRange,
      startDate: doc.startDate.toDate(),
      endDate: doc.endDate.toDate(),
      metadata: doc.metadata,
      calculatedAt: doc.calculatedAt.toDate(),
      createdAt: doc.createdAt.toDate(),
      updatedAt: doc.updatedAt.toDate()
    };
  }

  /**
   * Create new metrics with calculated values
   */
  static create(data: MetricsData & { 
    userId: string; 
    organizationId?: string;
    startDate: Date;
    endDate: Date;
  }): Omit<Metrics, 'id'> {
    const now = new Date();
    
    // Calculate change and percentage if previous value exists
    let change: number | undefined;
    let changePercentage: number | undefined;
    
    if (data.previousValue !== undefined && data.previousValue !== null) {
      change = data.value - data.previousValue;
      changePercentage = data.previousValue !== 0 
        ? (change / data.previousValue) * 100 
        : data.value > 0 ? 100 : 0;
    }
    
    return {
      userId: data.userId,
      organizationId: data.organizationId,
      type: data.type,
      value: data.value,
      previousValue: data.previousValue,
      change,
      changePercentage,
      platform: data.platform,
      timeRange: data.timeRange,
      startDate: data.startDate,
      endDate: data.endDate,
      metadata: data.metadata,
      calculatedAt: now,
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * Update metrics with new data
   */
  static update(metrics: Metrics, updates: Partial<MetricsData>): Metrics {
    const updatedMetrics = {
      ...metrics,
      ...updates,
      updatedAt: new Date()
    };

    // Recalculate change and percentage if values changed
    if (updates.value !== undefined || updates.previousValue !== undefined) {
      const newValue = updates.value ?? metrics.value;
      const newPreviousValue = updates.previousValue ?? metrics.previousValue;
      
      if (newPreviousValue !== undefined && newPreviousValue !== null) {
        updatedMetrics.change = newValue - newPreviousValue;
        updatedMetrics.changePercentage = newPreviousValue !== 0 
          ? (updatedMetrics.change / newPreviousValue) * 100 
          : newValue > 0 ? 100 : 0;
      }
    }

    return updatedMetrics;
  }

  /**
   * Validate metrics data
   */
  static validate(metrics: Partial<Metrics>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!metrics.type) {
      errors.push('Metric type is required');
    }

    if (typeof metrics.value !== 'number') {
      errors.push('Metric value must be a number');
    }

    if (!metrics.timeRange) {
      errors.push('Time range is required');
    }

    if (!metrics.startDate) {
      errors.push('Start date is required');
    }

    if (!metrics.endDate) {
      errors.push('End date is required');
    }

    if (metrics.startDate && metrics.endDate && metrics.startDate >= metrics.endDate) {
      errors.push('Start date must be before end date');
    }

    if (metrics.previousValue !== undefined && typeof metrics.previousValue !== 'number') {
      errors.push('Previous value must be a number');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get time range dates
   */
  static getTimeRangeDates(timeRange: TimeRange, customStart?: Date, customEnd?: Date): { startDate: Date; endDate: Date } {
    const now = new Date();
    const endDate = new Date(now);
    let startDate = new Date(now);

    switch (timeRange) {
      case TimeRange.LAST_24_HOURS:
        startDate.setDate(startDate.getDate() - 1);
        break;
      case TimeRange.LAST_7_DAYS:
        startDate.setDate(startDate.getDate() - 7);
        break;
      case TimeRange.LAST_30_DAYS:
        startDate.setDate(startDate.getDate() - 30);
        break;
      case TimeRange.LAST_90_DAYS:
        startDate.setDate(startDate.getDate() - 90);
        break;
      case TimeRange.LAST_6_MONTHS:
        startDate.setMonth(startDate.getMonth() - 6);
        break;
      case TimeRange.LAST_YEAR:
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      case TimeRange.CUSTOM:
        if (customStart && customEnd) {
          return { startDate: customStart, endDate: customEnd };
        }
        // Default to last 30 days if custom dates not provided
        startDate.setDate(startDate.getDate() - 30);
        break;
    }

    return { startDate, endDate };
  }

  /**
   * Format metric value for display
   */
  static formatValue(value: number, type: MetricType): string {
    switch (type) {
      case MetricType.REVENUE:
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(value);
      
      case MetricType.ENGAGEMENT_RATE:
      case MetricType.GROWTH_RATE:
        return `${value.toFixed(2)}%`;
      
      case MetricType.SENTIMENT_SCORE:
        return value.toFixed(2);
      
      case MetricType.RESPONSE_TIME:
        // Assume value is in minutes
        if (value < 60) {
          return `${Math.round(value)}m`;
        } else if (value < 1440) {
          return `${Math.round(value / 60)}h`;
        } else {
          return `${Math.round(value / 1440)}d`;
        }
      
      default:
        // For counts (followers, likes, etc.)
        if (value >= 1000000) {
          return `${(value / 1000000).toFixed(1)}M`;
        } else if (value >= 1000) {
          return `${(value / 1000).toFixed(1)}K`;
        } else {
          return value.toString();
        }
    }
  }

  /**
   * Get metric display name
   */
  static getDisplayName(type: MetricType): string {
    const displayNames: Record<MetricType, string> = {
      [MetricType.ENGAGEMENT]: 'Engagement',
      [MetricType.REACH]: 'Reach',
      [MetricType.IMPRESSIONS]: 'Impressions',
      [MetricType.FOLLOWERS]: 'Followers',
      [MetricType.LIKES]: 'Likes',
      [MetricType.COMMENTS]: 'Comments',
      [MetricType.SHARES]: 'Shares',
      [MetricType.CLICKS]: 'Clicks',
      [MetricType.CONVERSIONS]: 'Conversions',
      [MetricType.REVENUE]: 'Revenue',
      [MetricType.POSTS_PUBLISHED]: 'Posts Published',
      [MetricType.RESPONSE_TIME]: 'Response Time',
      [MetricType.SENTIMENT_SCORE]: 'Sentiment Score',
      [MetricType.GROWTH_RATE]: 'Growth Rate',
      [MetricType.ENGAGEMENT_RATE]: 'Engagement Rate'
    };

    return displayNames[type] || type;
  }

  /**
   * Get metric unit
   */
  static getUnit(type: MetricType): string {
    const units: Record<MetricType, string> = {
      [MetricType.ENGAGEMENT]: 'interactions',
      [MetricType.REACH]: 'people',
      [MetricType.IMPRESSIONS]: 'views',
      [MetricType.FOLLOWERS]: 'followers',
      [MetricType.LIKES]: 'likes',
      [MetricType.COMMENTS]: 'comments',
      [MetricType.SHARES]: 'shares',
      [MetricType.CLICKS]: 'clicks',
      [MetricType.CONVERSIONS]: 'conversions',
      [MetricType.REVENUE]: 'USD',
      [MetricType.POSTS_PUBLISHED]: 'posts',
      [MetricType.RESPONSE_TIME]: 'minutes',
      [MetricType.SENTIMENT_SCORE]: 'score',
      [MetricType.GROWTH_RATE]: '%',
      [MetricType.ENGAGEMENT_RATE]: '%'
    };

    return units[type] || '';
  }

  /**
   * Check if metric is positive (higher is better)
   */
  static isPositiveMetric(type: MetricType): boolean {
    const positiveMetrics = [
      MetricType.ENGAGEMENT,
      MetricType.REACH,
      MetricType.IMPRESSIONS,
      MetricType.FOLLOWERS,
      MetricType.LIKES,
      MetricType.COMMENTS,
      MetricType.SHARES,
      MetricType.CLICKS,
      MetricType.CONVERSIONS,
      MetricType.REVENUE,
      MetricType.POSTS_PUBLISHED,
      MetricType.SENTIMENT_SCORE,
      MetricType.GROWTH_RATE,
      MetricType.ENGAGEMENT_RATE
    ];

    return positiveMetrics.includes(type);
  }

  /**
   * Generate cache key for metrics
   */
  static getCacheKey(userId: string, type: MetricType, platform?: Platform, timeRange?: TimeRange): string {
    const parts = ['metrics', userId, type];
    if (platform) parts.push(platform);
    if (timeRange) parts.push(timeRange);
    return parts.join(':');
  }
} 