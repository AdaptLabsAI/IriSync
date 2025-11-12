import { getFirestore } from 'firebase-admin/firestore';
import { getUserSubscriptionTier } from '../../subscription';
import { SubscriptionTier } from '../../models/User';

/**
 * Activity metric types for tracking
 */
export enum ActivityMetricType {
  CONTENT_CREATED = 'content_created',
  CONTENT_EDITED = 'content_edited',
  CONTENT_PUBLISHED = 'content_published',
  CONTENT_SCHEDULED = 'content_scheduled',
  CONTENT_APPROVED = 'content_approved',
  CONTENT_REJECTED = 'content_rejected',
  PLATFORM_CONNECTED = 'platform_connected',
  PLATFORM_DISCONNECTED = 'platform_disconnected',
  USER_INVITED = 'user_invited',
  USER_JOINED = 'user_joined',
  USER_REMOVED = 'user_removed',
  ROLE_CHANGED = 'role_changed',
  LOGIN = 'login',
  SETTINGS_CHANGED = 'settings_changed',
  REPORT_GENERATED = 'report_generated'
}

/**
 * Activity metrics service for tracking team activity
 */
export class TeamActivityMetrics {
  private readonly ACTIVITY_COLLECTION = 'team_activity';
  private readonly USER_METRICS_COLLECTION = 'user_metrics';
  private firestore = getFirestore();
  
  /**
   * Track a team activity event
   * @param userId User ID of the actor
   * @param teamId Team ID (optional)
   * @param organizationId Organization ID (optional)
   * @param metricType Type of activity
   * @param metadata Additional metadata about the activity
   * @returns The ID of the created activity record
   */
  async trackActivity(
    userId: string,
    teamId: string | null,
    organizationId: string | null,
    metricType: ActivityMetricType,
    metadata: Record<string, any> = {}
  ): Promise<string> {
    try {
      // Create the activity record
      const activityData = {
        userId,
        teamId,
        organizationId,
        metricType,
        metadata,
        timestamp: new Date()
      };
      
      // Add to the activity collection
      const docRef = await this.firestore.collection(this.ACTIVITY_COLLECTION).add(activityData);
      
      // Update user metrics
      await this.updateUserMetrics(userId, metricType);
      
      // If team ID is provided, update team metrics
      if (teamId) {
        await this.updateTeamMetrics(teamId, metricType);
      }
      
      // If organization ID is provided, update organization metrics
      if (organizationId) {
        await this.updateOrganizationMetrics(organizationId, metricType);
      }
      
      return docRef.id;
    } catch (error) {
      console.error('Error tracking activity:', error);
      throw new Error('Failed to track activity');
    }
  }
  
  /**
   * Update user activity metrics
   * @param userId User ID
   * @param metricType Type of activity
   */
  private async updateUserMetrics(userId: string, metricType: ActivityMetricType): Promise<void> {
    try {
      const userMetricsRef = this.firestore.collection(this.USER_METRICS_COLLECTION).doc(userId);
      const userMetricsDoc = await userMetricsRef.get();
      
      if (!userMetricsDoc.exists) {
        // Create new metrics document
        await userMetricsRef.set({
          userId,
          activityCounts: {
            [metricType]: 1,
            total: 1
          },
          firstActivity: new Date(),
          lastActivity: new Date()
        });
      } else {
        // Update existing metrics
        const data = userMetricsDoc.data() || {};
        const activityCounts = data.activityCounts || {};
        
        await userMetricsRef.update({
          [`activityCounts.${metricType}`]: (activityCounts[metricType] || 0) + 1,
          'activityCounts.total': (activityCounts.total || 0) + 1,
          lastActivity: new Date()
        });
      }
    } catch (error) {
      console.error('Error updating user metrics:', error);
      // Continue even if metrics update fails
    }
  }
  
  /**
   * Update team activity metrics
   * @param teamId Team ID
   * @param metricType Type of activity
   */
  private async updateTeamMetrics(teamId: string, metricType: ActivityMetricType): Promise<void> {
    try {
      const teamMetricsRef = this.firestore.collection('team_metrics').doc(teamId);
      const teamMetricsDoc = await teamMetricsRef.get();
      
      if (!teamMetricsDoc.exists) {
        // Create new metrics document
        await teamMetricsRef.set({
          teamId,
          activityCounts: {
            [metricType]: 1,
            total: 1
          },
          lastActivity: new Date()
        });
      } else {
        // Update existing metrics
        const data = teamMetricsDoc.data() || {};
        const activityCounts = data.activityCounts || {};
        
        await teamMetricsRef.update({
          [`activityCounts.${metricType}`]: (activityCounts[metricType] || 0) + 1,
          'activityCounts.total': (activityCounts.total || 0) + 1,
          lastActivity: new Date()
        });
      }
    } catch (error) {
      console.error('Error updating team metrics:', error);
      // Continue even if metrics update fails
    }
  }
  
  /**
   * Update organization activity metrics
   * @param organizationId Organization ID
   * @param metricType Type of activity
   */
  private async updateOrganizationMetrics(organizationId: string, metricType: ActivityMetricType): Promise<void> {
    try {
      const orgMetricsRef = this.firestore.collection('organization_metrics').doc(organizationId);
      const orgMetricsDoc = await orgMetricsRef.get();
      
      if (!orgMetricsDoc.exists) {
        // Create new metrics document
        await orgMetricsRef.set({
          organizationId,
          activityCounts: {
            [metricType]: 1,
            total: 1
          },
          lastActivity: new Date()
        });
      } else {
        // Update existing metrics
        const data = orgMetricsDoc.data() || {};
        const activityCounts = data.activityCounts || {};
        
        await orgMetricsRef.update({
          [`activityCounts.${metricType}`]: (activityCounts[metricType] || 0) + 1,
          'activityCounts.total': (activityCounts.total || 0) + 1,
          lastActivity: new Date()
        });
      }
    } catch (error) {
      console.error('Error updating organization metrics:', error);
      // Continue even if metrics update fails
    }
  }
  
  /**
   * Get team activity metrics with filters
   * @param teamId Team ID
   * @param filters Optional filters for the metrics
   * @returns Team activity metrics data
   */
  async getTeamMetrics(
    teamId: string, 
    filters: {
      startDate?: Date,
      endDate?: Date,
      metricTypes?: ActivityMetricType[],
      userId?: string
    } = {}
  ): Promise<Record<string, any>> {
    try {
      // Build query
      let query = this.firestore.collection(this.ACTIVITY_COLLECTION).where('teamId', '==', teamId);
      
      // Apply date filters
      if (filters.startDate) {
        query = query.where('timestamp', '>=', filters.startDate);
      }
      
      if (filters.endDate) {
        query = query.where('timestamp', '<=', filters.endDate);
      }
      
      // Apply user filter
      if (filters.userId) {
        query = query.where('userId', '==', filters.userId);
      }
      
      // Execute the query
      const snapshot = await query.get();
      
      // Process results
      const activities: any[] = [];
      const activityCounts: Record<string, number> = {};
      let totalActivities = 0;
      
      snapshot.forEach(doc => {
        const activity = doc.data();
        
        // Apply metric type filter if provided
        if (filters.metricTypes && !filters.metricTypes.includes(activity.metricType)) {
          return;
        }
        
        // Count activities by type
        activityCounts[activity.metricType] = (activityCounts[activity.metricType] || 0) + 1;
        totalActivities++;
        
        // Add to activities list
        activities.push({
          id: doc.id,
          userId: activity.userId,
          metricType: activity.metricType,
          timestamp: activity.timestamp.toDate(),
          metadata: activity.metadata
        });
      });
      
      return {
        teamId,
        totalActivities,
        activityCounts,
        activities: activities.sort((a, b) => b.timestamp - a.timestamp)
      };
    } catch (error) {
      console.error('Error getting team metrics:', error);
      throw new Error('Failed to get team metrics');
    }
  }
  
  /**
   * Get user activity metrics
   * @param userId User ID
   * @param startDate Optional start date for filtering
   * @param endDate Optional end date for filtering
   * @returns User activity metrics data
   */
  async getUserMetrics(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<Record<string, any>> {
    try {
      // Get user subscription tier to determine metrics detail level
      const subscriptionTier = await getUserSubscriptionTier(userId);
      const isDetailedMetrics = subscriptionTier === 'influencer' || 
                               subscriptionTier === 'enterprise';
      
      // Build query
      let query = this.firestore.collection(this.ACTIVITY_COLLECTION).where('userId', '==', userId);
      
      // Apply date filters
      if (startDate) {
        query = query.where('timestamp', '>=', startDate);
      }
      
      if (endDate) {
        query = query.where('timestamp', '<=', endDate);
      }
      
      // Execute the query
      const snapshot = await query.get();
      
      // Process results
      const activities: any[] = [];
      const activityCounts: Record<string, number> = {};
      let totalActivities = 0;
      
      snapshot.forEach(doc => {
        const activity = doc.data();
        
        // Count activities by type
        activityCounts[activity.metricType] = (activityCounts[activity.metricType] || 0) + 1;
        totalActivities++;
        
        // Only include detailed activity data for higher tier subscriptions
        if (isDetailedMetrics) {
          activities.push({
            id: doc.id,
            metricType: activity.metricType,
            teamId: activity.teamId,
            organizationId: activity.organizationId,
            timestamp: activity.timestamp.toDate(),
            metadata: activity.metadata
          });
        }
      });
      
      // Basic metrics for all subscription tiers
      const result: Record<string, any> = {
        userId,
        totalActivities,
        activityCounts
      };
      
      // Detailed metrics for higher tiers
      if (isDetailedMetrics) {
        result.activities = activities.sort((a, b) => b.timestamp - a.timestamp);
        
        // Additional aggregated metrics for enterprise tier
        if (subscriptionTier === 'enterprise') {
          // Calculate time-based metrics (e.g., activities per day/week)
          result.timeBasedMetrics = calculateTimeBasedMetrics(activities);
        }
      }
      
      return result;
    } catch (error) {
      console.error('Error getting user metrics:', error);
      throw new Error('Failed to get user metrics');
    }
  }
}

/**
 * Calculate time-based metrics from activities
 * @param activities List of activities
 * @returns Time-based metrics
 */
function calculateTimeBasedMetrics(activities: any[]): Record<string, any> {
  // Group activities by day
  const byDay: Record<string, number> = {};
  
  // Group activities by week
  const byWeek: Record<string, number> = {};
  
  // Group activities by hour of day
  const byHour: Record<number, number> = {};
  
  activities.forEach(activity => {
    const date = activity.timestamp;
    
    // Format YYYY-MM-DD for day grouping
    const day = date.toISOString().split('T')[0];
    byDay[day] = (byDay[day] || 0) + 1;
    
    // Week number for week grouping (ISO week)
    const weekNumber = getISOWeek(date);
    const year = date.getFullYear();
    const weekKey = `${year}-W${weekNumber.toString().padStart(2, '0')}`;
    byWeek[weekKey] = (byWeek[weekKey] || 0) + 1;
    
    // Hour for time of day analysis
    const hour = date.getHours();
    byHour[hour] = (byHour[hour] || 0) + 1;
  });
  
  return {
    byDay,
    byWeek,
    byHour
  };
}

/**
 * Get ISO week number for a date
 * @param date Date object
 * @returns ISO week number (1-53)
 */
function getISOWeek(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// Create singleton instance
const teamActivityMetrics = new TeamActivityMetrics();
export default teamActivityMetrics;
