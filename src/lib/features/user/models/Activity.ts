import { Timestamp } from 'firebase/firestore';
import {
  UserActivityType,
  ActivityContext,
  UserActivityData,
  UserError,
  UserErrorType,
  UserOperationResult
} from '../types';
import { UserRole } from '../../models/User';

/**
 * User activity interface for comprehensive tracking
 */
export interface UserActivity {
  id: string;
  userId: string;
  organizationId?: string;
  teamId?: string;
  type: UserActivityType;
  action: string;
  resource?: string;
  resourceId?: string;
  context: ActivityContext;
  metadata: {
    userAgent?: string;
    ipAddress?: string;
    location?: {
      country?: string;
      region?: string;
      city?: string;
    };
    device?: {
      type: 'desktop' | 'mobile' | 'tablet';
      os?: string;
      browser?: string;
    };
    duration?: number;
    success: boolean;
    errorMessage?: string;
    previousValues?: Record<string, any>;
    newValues?: Record<string, any>;
  };
  timestamp: Date;
  sessionId?: string;
  correlationId?: string;
}

/**
 * Activity summary for analytics
 */
export interface ActivitySummary {
  userId: string;
  period: {
    start: Date;
    end: Date;
  };
  totalActivities: number;
  activityBreakdown: Record<UserActivityType, number>;
  topActions: Array<{
    action: string;
    count: number;
    percentage: number;
  }>;
  deviceBreakdown: Record<string, number>;
  locationBreakdown: Record<string, number>;
  engagementScore: number;
  averageSessionDuration: number;
  peakActivityHours: number[];
}

/**
 * Activity filter for querying
 */
export interface ActivityFilter {
  userId?: string;
  organizationId?: string;
  teamId?: string;
  types?: UserActivityType[];
  actions?: string[];
  resources?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  success?: boolean;
  sessionId?: string;
  limit?: number;
  offset?: number;
}

/**
 * Activity analytics data
 */
export interface ActivityAnalytics {
  totalActivities: number;
  uniqueUsers: number;
  averageActivitiesPerUser: number;
  mostActiveUsers: Array<{
    userId: string;
    activityCount: number;
    lastActivity: Date;
  }>;
  activityTrends: Array<{
    date: Date;
    count: number;
    uniqueUsers: number;
  }>;
  topActions: Array<{
    action: string;
    count: number;
    uniqueUsers: number;
  }>;
  errorRate: number;
  averageSessionDuration: number;
}

/**
 * Firestore representation of UserActivity
 */
export interface FirestoreUserActivity {
  id: string;
  userId: string;
  organizationId?: string;
  teamId?: string;
  type: UserActivityType;
  action: string;
  resource?: string;
  resourceId?: string;
  context: ActivityContext;
  metadata: {
    userAgent?: string;
    ipAddress?: string;
    location?: {
      country?: string;
      region?: string;
      city?: string;
    };
    device?: {
      type: 'desktop' | 'mobile' | 'tablet';
      os?: string;
      browser?: string;
    };
    duration?: number;
    success: boolean;
    errorMessage?: string;
    previousValues?: Record<string, any>;
    newValues?: Record<string, any>;
  };
  timestamp: Timestamp;
  sessionId?: string;
  correlationId?: string;
}

/**
 * Activity utility class
 */
export class ActivityUtils {
  /**
   * Convert Firestore activity to UserActivity interface
   */
  static fromFirestore(data: FirestoreUserActivity): UserActivity {
    return {
      id: data.id,
      userId: data.userId,
      organizationId: data.organizationId,
      teamId: data.teamId,
      type: data.type,
      action: data.action,
      resource: data.resource,
      resourceId: data.resourceId,
      context: data.context,
      metadata: data.metadata,
      timestamp: data.timestamp.toDate(),
      sessionId: data.sessionId,
      correlationId: data.correlationId
    };
  }

  /**
   * Convert UserActivity to Firestore format
   */
  static toFirestore(activity: UserActivity): FirestoreUserActivity {
    return {
      id: activity.id,
      userId: activity.userId,
      organizationId: activity.organizationId,
      teamId: activity.teamId,
      type: activity.type,
      action: activity.action,
      resource: activity.resource,
      resourceId: activity.resourceId,
      context: activity.context,
      metadata: activity.metadata,
      timestamp: Timestamp.fromDate(activity.timestamp),
      sessionId: activity.sessionId,
      correlationId: activity.correlationId
    };
  }

  /**
   * Validate activity data
   */
  static validateActivity(activity: Partial<UserActivity>): UserOperationResult<UserActivity> {
    const errors: UserError[] = [];

    if (!activity.userId?.trim()) {
      errors.push({
        type: UserErrorType.VALIDATION_ERROR,
        message: 'User ID is required',
        timestamp: new Date()
      });
    }

    if (!activity.type) {
      errors.push({
        type: UserErrorType.VALIDATION_ERROR,
        message: 'Activity type is required',
        timestamp: new Date()
      });
    }

    if (!activity.action?.trim()) {
      errors.push({
        type: UserErrorType.VALIDATION_ERROR,
        message: 'Activity action is required',
        timestamp: new Date()
      });
    }

    if (!activity.context) {
      errors.push({
        type: UserErrorType.VALIDATION_ERROR,
        message: 'Activity context is required',
        timestamp: new Date()
      });
    }

    if (!activity.timestamp) {
      errors.push({
        type: UserErrorType.VALIDATION_ERROR,
        message: 'Activity timestamp is required',
        timestamp: new Date()
      });
    }

    if (errors.length > 0) {
      return { 
        success: false, 
        error: errors[0],
        warnings: errors.slice(1).map(e => e.message)
      };
    }

    return { success: true, data: activity as UserActivity };
  }

  /**
   * Create a new activity record
   */
  static createActivity(
    userId: string,
    type: UserActivityType,
    action: string,
    options: {
      organizationId?: string;
      teamId?: string;
      resource?: string;
      resourceId?: string;
      context?: Partial<ActivityContext>;
      metadata?: Partial<UserActivity['metadata']>;
      sessionId?: string;
      correlationId?: string;
    } = {}
  ): UserActivity {
    const now = new Date();
    
    return {
      id: this.generateActivityId(),
      userId,
      organizationId: options.organizationId,
      teamId: options.teamId,
      type,
      action,
      resource: options.resource,
      resourceId: options.resourceId,
      context: options.context as ActivityContext || ActivityContext.WEB,
      metadata: {
        success: true,
        ...options.metadata
      },
      timestamp: now,
      sessionId: options.sessionId,
      correlationId: options.correlationId || this.generateCorrelationId()
    };
  }

  /**
   * Generate unique activity ID
   */
  static generateActivityId(): string {
    return `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate correlation ID for tracking related activities
   */
  static generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Calculate engagement score based on activity patterns
   */
  static calculateEngagementScore(activities: UserActivity[]): number {
    if (activities.length === 0) return 0;

    // Weight different activity types
    const activityWeights: Partial<Record<UserActivityType, number>> = {
      [UserActivityType.LOGIN]: 1,
      [UserActivityType.CONTENT_CREATE]: 5,
      [UserActivityType.CONTENT_UPDATE]: 3,
      [UserActivityType.CONTENT_DELETE]: 2,
      [UserActivityType.CONTENT_PUBLISH]: 4,
      [UserActivityType.PLATFORM_CONNECT]: 3,
      [UserActivityType.TEAM_JOIN]: 4,
      [UserActivityType.TEAM_CREATE]: 5,
      [UserActivityType.SETTINGS_UPDATE]: 1,
      [UserActivityType.API_ACCESS]: 3
    };

    const totalWeight = activities.reduce((sum, activity) => {
      const weight = activityWeights[activity.type] || 1;
      return sum + weight;
    }, 0);

    // Normalize to 0-100 scale
    const maxPossibleWeight = activities.length * 5; // Max weight per activity
    return Math.min(100, Math.max(0, (totalWeight / maxPossibleWeight) * 100));
  }

  /**
   * Generate activity summary for a user over a period
   */
  static generateActivitySummary(
    activities: UserActivity[],
    period: { start: Date; end: Date }
  ): ActivitySummary {
    const filteredActivities = activities.filter(
      activity => activity.timestamp >= period.start && activity.timestamp <= period.end
    );

    return {
      userId: filteredActivities[0]?.userId || '',
      period,
      totalActivities: filteredActivities.length,
      activityBreakdown: this.getActivityBreakdown(filteredActivities),
      topActions: this.getTopActions(filteredActivities),
      deviceBreakdown: this.getDeviceBreakdown(filteredActivities),
      locationBreakdown: this.getLocationBreakdown(filteredActivities),
      engagementScore: this.calculateEngagementScore(filteredActivities),
      averageSessionDuration: this.calculateAverageSessionDuration(filteredActivities),
      peakActivityHours: this.getPeakActivityHours(filteredActivities)
    };
  }

  /**
   * Get activity breakdown by type
   */
  private static getActivityBreakdown(activities: UserActivity[]): Record<UserActivityType, number> {
    const breakdown = {} as Record<UserActivityType, number>;
    
    // Initialize all activity types to 0
    Object.values(UserActivityType).forEach(type => {
      breakdown[type] = 0;
    });

    // Count activities by type
    activities.forEach(activity => {
      breakdown[activity.type] = (breakdown[activity.type] || 0) + 1;
    });

    return breakdown;
  }

  /**
   * Get top actions performed
   */
  private static getTopActions(activities: UserActivity[]): Array<{
    action: string;
    count: number;
    percentage: number;
  }> {
    const actionCounts: Record<string, number> = {};
    
    activities.forEach(activity => {
      actionCounts[activity.action] = (actionCounts[activity.action] || 0) + 1;
    });

    const total = activities.length;
    return Object.entries(actionCounts)
      .map(([action, count]) => ({
        action,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 actions
  }

  /**
   * Get device breakdown
   */
  private static getDeviceBreakdown(activities: UserActivity[]): Record<string, number> {
    const deviceCounts: Record<string, number> = {};
    
    activities.forEach(activity => {
      const deviceType = activity.metadata.device?.type || 'unknown';
      deviceCounts[deviceType] = (deviceCounts[deviceType] || 0) + 1;
    });

    return deviceCounts;
  }

  /**
   * Get location breakdown
   */
  private static getLocationBreakdown(activities: UserActivity[]): Record<string, number> {
    const locationCounts: Record<string, number> = {};
    
    activities.forEach(activity => {
      const country = activity.metadata.location?.country || 'unknown';
      locationCounts[country] = (locationCounts[country] || 0) + 1;
    });

    return locationCounts;
  }

  /**
   * Calculate average session duration
   */
  private static calculateAverageSessionDuration(activities: UserActivity[]): number {
    const sessionsWithDuration = activities.filter(
      activity => activity.metadata.duration && activity.metadata.duration > 0
    );

    if (sessionsWithDuration.length === 0) return 0;

    const totalDuration = sessionsWithDuration.reduce(
      (sum, activity) => sum + (activity.metadata.duration || 0),
      0
    );

    return totalDuration / sessionsWithDuration.length;
  }

  /**
   * Get peak activity hours (0-23)
   */
  private static getPeakActivityHours(activities: UserActivity[]): number[] {
    const hourCounts: Record<number, number> = {};
    
    // Initialize all hours to 0
    for (let i = 0; i < 24; i++) {
      hourCounts[i] = 0;
    }

    // Count activities by hour
    activities.forEach(activity => {
      const hour = activity.timestamp.getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    // Find hours with activity above average
    const totalActivities = activities.length;
    const averagePerHour = totalActivities / 24;
    
    return Object.entries(hourCounts)
      .filter(([, count]) => count > averagePerHour)
      .map(([hour]) => parseInt(hour))
      .sort((a, b) => hourCounts[b] - hourCounts[a]);
  }

  /**
   * Check if activity contains sensitive information
   */
  static isSensitiveActivity(activity: UserActivity): boolean {
    const sensitiveTypes = [
      UserActivityType.PASSWORD_CHANGE,
      UserActivityType.EMAIL_CHANGE,
      UserActivityType.BILLING_UPDATE,
      UserActivityType.SECURITY_EVENT
    ];

    return sensitiveTypes.includes(activity.type);
  }

  /**
   * Format activity for display
   */
  static formatActivityDisplay(activity: UserActivity): string {
    const typeMap: Record<UserActivityType, string> = {
      [UserActivityType.LOGIN]: 'Logged in',
      [UserActivityType.LOGOUT]: 'Logged out',
      [UserActivityType.PROFILE_UPDATE]: 'Updated profile',
      [UserActivityType.PASSWORD_CHANGE]: 'Changed password',
      [UserActivityType.EMAIL_CHANGE]: 'Changed email',
      [UserActivityType.TEAM_JOIN]: 'Joined team',
      [UserActivityType.TEAM_LEAVE]: 'Left team',
      [UserActivityType.TEAM_CREATE]: 'Created team',
      [UserActivityType.TEAM_UPDATE]: 'Updated team',
      [UserActivityType.TEAM_DELETE]: 'Deleted team',
      [UserActivityType.TEAM_INVITE_SENT]: 'Sent team invite',
      [UserActivityType.TEAM_INVITE_ACCEPTED]: 'Accepted team invite',
      [UserActivityType.TEAM_INVITE_DECLINED]: 'Declined team invite',
      [UserActivityType.TEAM_INVITE_CANCELLED]: 'Cancelled team invite',
      [UserActivityType.ROLE_CHANGE]: 'Role changed',
      [UserActivityType.PERMISSION_GRANT]: 'Permission granted',
      [UserActivityType.PERMISSION_REVOKE]: 'Permission revoked',
      [UserActivityType.CONTENT_CREATE]: 'Created content',
      [UserActivityType.CONTENT_UPDATE]: 'Updated content',
      [UserActivityType.CONTENT_DELETE]: 'Deleted content',
      [UserActivityType.CONTENT_PUBLISH]: 'Published content',
      [UserActivityType.PLATFORM_CONNECT]: 'Connected platform',
      [UserActivityType.PLATFORM_DISCONNECT]: 'Disconnected platform',
      [UserActivityType.SUBSCRIPTION_CHANGE]: 'Changed subscription',
      [UserActivityType.BILLING_UPDATE]: 'Updated billing',
      [UserActivityType.SETTINGS_UPDATE]: 'Updated settings',
      [UserActivityType.EXPORT_REQUEST]: 'Requested data export',
      [UserActivityType.DELETION_REQUEST]: 'Requested account deletion',
      [UserActivityType.API_ACCESS]: 'Used API',
      [UserActivityType.SECURITY_EVENT]: 'Security event'
    };

    return typeMap[activity.type] || activity.action;
  }

  /**
   * Get activity icon
   */
  static getActivityIcon(activity: UserActivity): string {
    const icons: Partial<Record<UserActivityType, string>> = {
      [UserActivityType.LOGIN]: '🔐',
      [UserActivityType.CONTENT_CREATE]: '✏️',
      [UserActivityType.CONTENT_UPDATE]: '📝',
      [UserActivityType.CONTENT_DELETE]: '🗑️',
      [UserActivityType.CONTENT_PUBLISH]: '📤',
      [UserActivityType.PLATFORM_CONNECT]: '🔗',
      [UserActivityType.TEAM_JOIN]: '👥',
      [UserActivityType.SETTINGS_UPDATE]: '⚙️',
      [UserActivityType.BILLING_UPDATE]: '💳',
      [UserActivityType.API_ACCESS]: '🔌',
      [UserActivityType.SECURITY_EVENT]: '⚡'
    };

    return icons[activity.type] || '📋';
  }

  /**
   * Get activity color
   */
  static getActivityColor(activity: UserActivity): string {
    const colors: Partial<Record<UserActivityType, string>> = {
      [UserActivityType.LOGIN]: '#3B82F6',
      [UserActivityType.CONTENT_CREATE]: '#10B981',
      [UserActivityType.CONTENT_UPDATE]: '#F59E0B',
      [UserActivityType.CONTENT_DELETE]: '#EF4444',
      [UserActivityType.CONTENT_PUBLISH]: '#8B5CF6',
      [UserActivityType.PLATFORM_CONNECT]: '#06B6D4',
      [UserActivityType.TEAM_JOIN]: '#84CC16',
      [UserActivityType.SETTINGS_UPDATE]: '#6B7280',
      [UserActivityType.BILLING_UPDATE]: '#EC4899',
      [UserActivityType.API_ACCESS]: '#8B5CF6',
      [UserActivityType.SECURITY_EVENT]: '#6B7280'
    };

    return colors[activity.type] || '#6B7280';
  }

  /**
   * Filter activities based on criteria
   */
  static filterActivities(activities: UserActivity[], filter: ActivityFilter): UserActivity[] {
    return activities.filter(activity => {
      if (filter.userId && activity.userId !== filter.userId) return false;
      if (filter.organizationId && activity.organizationId !== filter.organizationId) return false;
      if (filter.teamId && activity.teamId !== filter.teamId) return false;
      if (filter.types && !filter.types.includes(activity.type)) return false;
      if (filter.actions && !filter.actions.includes(activity.action)) return false;
      if (filter.resources && activity.resource && !filter.resources.includes(activity.resource)) return false;
      if (filter.success !== undefined && activity.metadata.success !== filter.success) return false;
      if (filter.sessionId && activity.sessionId !== filter.sessionId) return false;
      if (filter.dateRange) {
        if (activity.timestamp < filter.dateRange.start || activity.timestamp > filter.dateRange.end) return false;
      }
      return true;
    });
  }

  /**
   * Group activities by session
   */
  static groupActivitiesBySession(activities: UserActivity[]): Record<string, UserActivity[]> {
    const grouped: Record<string, UserActivity[]> = {};
    
    activities.forEach(activity => {
      const sessionId = activity.sessionId || 'no-session';
      if (!grouped[sessionId]) {
        grouped[sessionId] = [];
      }
      grouped[sessionId].push(activity);
    });

    return grouped;
  }
} 