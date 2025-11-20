import { getFirebaseFirestore  } from '@/lib/core/firebase';
import { doc, setDoc, getDoc, query, where, orderBy, limit, getDocs, collection, deleteDoc } from 'firebase/firestore';
import { 
  UserConfig, 
  UserActivityType, 
  ActivityContext, 
  UserApiResponse, 
  UserPaginationParams,
  UserErrorType 
} from '../types';
import { UserActivity, ActivityUtils } from '../models';

/**
 * Activity event interface
 */
export interface ActivityEvent {
  userId: string;
  type: UserActivityType;
  description: string;
  metadata?: Record<string, any>;
  context: ActivityContext;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Activity metrics interface
 */
export interface ActivityMetrics {
  totalActivities: number;
  uniqueUsers: number;
  topActivities: Array<{ type: UserActivityType; count: number }>;
  activityTrend: 'increasing' | 'decreasing' | 'stable';
  averageActivitiesPerUser: number;
  lastActivity?: Date;
}

/**
 * User activity tracker utility
 * Handles tracking, logging, and analytics of user activities
 */
export class ActivityTracker {
  private config: UserConfig;

  constructor(config: UserConfig) {
    this.config = config;
  }

  /**
   * Track user activity
   */
  public async trackActivity(event: ActivityEvent): Promise<boolean> {
    try {
      if (!this.config.enableActivityTracking) {
        return true; // Silently skip if tracking is disabled
      }

      const activity = ActivityUtils.createActivity(
        event.userId,
        event.type,
        event.description,
        event.context,
        event.metadata || {},
        {
          ipAddress: event.ipAddress,
          userAgent: event.userAgent
        }
      );

      const firestore = getFirebaseFirestore();
      if (!firestore) {
        return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
      }
      const activityRef = doc(firestore, 'user_activities', activity.id);
      await setDoc(activityRef, ActivityUtils.toFirestore(activity));

      return true;
    } catch (error) {
      console.error('Failed to track activity:', error);
      return false;
    }
  }

  /**
   * Track user access/login
   */
  public async trackUserAccess(userId: string, ipAddress?: string, userAgent?: string): Promise<boolean> {
    return this.trackActivity({
      userId,
      type: UserActivityType.LOGIN,
      description: 'User accessed the system',
      context: ActivityContext.WEB,
      ipAddress,
      userAgent
    });
  }

  /**
   * Track user logout
   */
  public async trackUserLogout(userId: string, ipAddress?: string, userAgent?: string): Promise<boolean> {
    return this.trackActivity({
      userId,
      type: UserActivityType.LOGOUT,
      description: 'User logged out',
      context: ActivityContext.WEB,
      ipAddress,
      userAgent
    });
  }

  /**
   * Track profile update
   */
  public async trackProfileUpdate(
    userId: string, 
    changes: string[], 
    context: ActivityContext = ActivityContext.WEB
  ): Promise<boolean> {
    return this.trackActivity({
      userId,
      type: UserActivityType.PROFILE_UPDATE,
      description: `Profile updated: ${changes.join(', ')}`,
      context,
      metadata: { changes }
    });
  }

  /**
   * Track team activity
   */
  public async trackTeamActivity(
    userId: string,
    teamId: string,
    type: UserActivityType,
    description: string,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    return this.trackActivity({
      userId,
      type,
      description,
      context: ActivityContext.TEAM,
      metadata: {
        teamId,
        ...metadata
      }
    });
  }

  /**
   * Get user activity history
   */
  public async getUserActivity(
    userId: string,
    pagination?: UserPaginationParams
  ): Promise<UserApiResponse<UserActivity[]>> {
    try {
      const activitiesRef = collection(firestore, 'user_activities');
      let q = query(
        activitiesRef,
        where('userId', '==', userId),
        orderBy('timestamp', 'desc')
      );

      if (pagination?.limit) {
        q = query(q, limit(pagination.limit));
      }

      const snapshot = await getDocs(q);
      const activities = snapshot.docs.map(doc => 
        ActivityUtils.fromFirestore(doc.data() as any)
      );

      return {
        success: true,
        data: activities,
        metadata: {
          timestamp: new Date(),
          requestId: `activity_${Date.now()}`,
          version: '1.0',
          pagination: {
            page: pagination?.page || 1,
            limit: pagination?.limit || 50,
            total: activities.length,
            hasNext: activities.length === (pagination?.limit || 50),
            hasPrevious: (pagination?.page || 1) > 1
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: UserErrorType.OPERATION_FAILED,
          message: error instanceof Error ? error.message : 'Failed to get user activity',
          code: 'GET_ACTIVITY_FAILED',
          timestamp: new Date()
        }
      };
    }
  }

  /**
   * Get activity metrics for a user
   */
  public async getUserActivityMetrics(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ActivityMetrics> {
    try {
      const activitiesRef = collection(firestore, 'user_activities');
      let q = query(
        activitiesRef,
        where('userId', '==', userId),
        orderBy('timestamp', 'desc')
      );

      const snapshot = await getDocs(q);
      const activities = snapshot.docs.map(doc => 
        ActivityUtils.fromFirestore(doc.data() as any)
      );

      // Filter by date range if provided
      const filteredActivities = activities.filter(activity => {
        if (startDate && activity.timestamp < startDate) return false;
        if (endDate && activity.timestamp > endDate) return false;
        return true;
      });

      // Calculate metrics
      const activityCounts = new Map<UserActivityType, number>();
      filteredActivities.forEach(activity => {
        const count = activityCounts.get(activity.type) || 0;
        activityCounts.set(activity.type, count + 1);
      });

      const topActivities = Array.from(activityCounts.entries())
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        totalActivities: filteredActivities.length,
        uniqueUsers: 1, // Single user metrics
        topActivities,
        activityTrend: this.calculateTrend(filteredActivities),
        averageActivitiesPerUser: filteredActivities.length,
        lastActivity: filteredActivities[0]?.timestamp
      };
    } catch (error) {
      console.error('Failed to get activity metrics:', error);
      return {
        totalActivities: 0,
        uniqueUsers: 0,
        topActivities: [],
        activityTrend: 'stable',
        averageActivitiesPerUser: 0
      };
    }
  }

  /**
   * Get system-wide activity metrics
   */
  public async getSystemActivityMetrics(
    startDate?: Date,
    endDate?: Date
  ): Promise<ActivityMetrics> {
    try {
      const activitiesRef = collection(firestore, 'user_activities');
      let q = query(activitiesRef, orderBy('timestamp', 'desc'));

      const snapshot = await getDocs(q);
      const activities = snapshot.docs.map(doc => 
        ActivityUtils.fromFirestore(doc.data() as any)
      );

      // Filter by date range if provided
      const filteredActivities = activities.filter(activity => {
        if (startDate && activity.timestamp < startDate) return false;
        if (endDate && activity.timestamp > endDate) return false;
        return true;
      });

      // Calculate metrics
      const activityCounts = new Map<UserActivityType, number>();
      const uniqueUsers = new Set<string>();

      filteredActivities.forEach(activity => {
        const count = activityCounts.get(activity.type) || 0;
        activityCounts.set(activity.type, count + 1);
        uniqueUsers.add(activity.userId);
      });

      const topActivities = Array.from(activityCounts.entries())
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        totalActivities: filteredActivities.length,
        uniqueUsers: uniqueUsers.size,
        topActivities,
        activityTrend: this.calculateTrend(filteredActivities),
        averageActivitiesPerUser: uniqueUsers.size > 0 ? filteredActivities.length / uniqueUsers.size : 0,
        lastActivity: filteredActivities[0]?.timestamp
      };
    } catch (error) {
      console.error('Failed to get system activity metrics:', error);
      return {
        totalActivities: 0,
        uniqueUsers: 0,
        topActivities: [],
        activityTrend: 'stable',
        averageActivitiesPerUser: 0
      };
    }
  }

  /**
   * Clean up old activities based on retention policy
   */
  public async cleanupOldActivities(): Promise<number> {
    try {
      if (!this.config.activityRetention) {
        return 0; // No cleanup if retention is not set
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.activityRetention);

      const activitiesRef = collection(firestore, 'user_activities');
      const q = query(
        activitiesRef,
        where('timestamp', '<', cutoffDate)
      );

      const snapshot = await getDocs(q);
      let deletedCount = 0;

      // Delete in batches to avoid timeout
      const batchSize = 100;
      for (let i = 0; i < snapshot.docs.length; i += batchSize) {
        const batch = snapshot.docs.slice(i, i + batchSize);
        await Promise.all(
          batch.map(doc => deleteDoc(doc.ref))
        );
        deletedCount += batch.length;
      }

      return deletedCount;
    } catch (error) {
      console.error('Failed to cleanup old activities:', error);
      return 0;
    }
  }

  /**
   * Calculate activity trend
   */
  private calculateTrend(activities: UserActivity[]): 'increasing' | 'decreasing' | 'stable' {
    if (activities.length < 2) {
      return 'stable';
    }

    // Split activities into two halves and compare
    const midpoint = Math.floor(activities.length / 2);
    const recentHalf = activities.slice(0, midpoint);
    const olderHalf = activities.slice(midpoint);

    if (recentHalf.length > olderHalf.length * 1.1) {
      return 'increasing';
    } else if (recentHalf.length < olderHalf.length * 0.9) {
      return 'decreasing';
    } else {
      return 'stable';
    }
  }

  /**
   * Update tracker configuration
   */
  public updateConfig(config: UserConfig): void {
    this.config = config;
  }
} 