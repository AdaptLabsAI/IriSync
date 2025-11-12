/**
 * Models for schedule optimization functionality
 */

/**
 * Post optimization model with scheduling recommendations
 */
export interface PostOptimizationModel {
  /**
   * Post ID for reference
   */
  id: string;
  
  /**
   * Content type of the post
   */
  contentType: string;
  
  /**
   * Current scheduled date
   */
  currentScheduledDate?: string;
  
  /**
   * Current scheduled time
   */
  currentScheduledTime?: string;
  
  /**
   * Recommended optimal date for posting
   */
  recommendedDate?: string;
  
  /**
   * Recommended optimal time for posting 
   */
  recommendedTime?: string;
  
  /**
   * Expected engagement score for recommended time (0-1)
   */
  expectedEngagement?: number;
  
  /**
   * Alternative time slots with expected engagement
   */
  alternativeTimeSlots?: TimeSlot[];
  
  /**
   * Reasoning for recommendation
   */
  optimizationReason?: string;
  
  /**
   * Priority of this post
   */
  priority?: 'high' | 'medium' | 'low';
  
  /**
   * Additional metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Time slot model with engagement score
 */
export interface TimeSlot {
  /**
   * Time in 24h format (HH:MM)
   */
  time: string;
  
  /**
   * Day of week (e.g., "Monday", "Tuesday")
   */
  dayOfWeek: string;
  
  /**
   * Engagement score for this timeslot (0-1)
   */
  engagementScore: number;
}

/**
 * Audience engagement data for scheduling
 */
export interface AudienceEngagementData {
  /**
   * Primary audience timezone
   */
  timezone?: string;
  
  /**
   * Distribution of audience across timezones
   */
  timezoneDistribution?: Record<string, number>;
  
  /**
   * Demographic information about audience
   */
  demographics?: {
    ageGroups?: Record<string, number>;
    gender?: Record<string, number>;
    locations?: Record<string, number>;
  };
  
  /**
   * Activity patterns of audience
   */
  activity?: {
    activeDays?: Record<string, number>;
    activeHours?: Record<string, number>;
  };
  
  /**
   * Audience interests (topic:weight)
   */
  interests?: Record<string, number>;
  
  /**
   * Past engagement data
   */
  historicalEngagement?: Array<{
    date: string;
    time: string;
    contentType: string;
    engagement: number;
  }>;
  
  /**
   * Additional metadata
   */
  metadata?: Record<string, any>;
} 