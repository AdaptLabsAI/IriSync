import { getFirestore } from 'firebase-admin/firestore';
import { 
  OptimalPostingTime, 
  PLATFORM_BEST_TIMES, 
  getNextOptimalTime, 
  hasMinimumGap,
  calculatePostDistribution,
  getDayName
} from './utils';

/**
 * Interface representing a scheduled post
 */
export interface ScheduledPost {
  id?: string;
  userId: string;
  contentId: string;
  platform: string;
  scheduledTime: Date;
  status: 'draft' | 'scheduled' | 'posted' | 'failed' | 'cancelled';
  contentType?: string;
  mediaUrls?: string[];
  caption?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

/**
 * Interface for scheduling configuration
 */
export interface ScheduleConfig {
  timezone?: string;
  startDate?: Date;
  endDate?: Date;
  platforms: string[];
  frequency?: {
    [platform: string]: number; // posts per week
  };
  bestTimes?: {
    [platform: string]: OptimalPostingTime[];
  };
  avoidTimes?: {
    [platform: string]: Array<{
      start: { hour: number; minute: number };
      end: { hour: number; minute: number };
    }>;
  };
  minGapHours?: number;
  contentThemes?: string[];
  strategy?: 'balanced' | 'concentrated' | 'platform-priority';
  priorityPlatforms?: string[];
}

/**
 * Platform performance data for ML-based predictions
 */
export interface PlatformPerformanceData {
  userId: string;
  platform: string;
  engagementByHour: number[];  // 24 hours
  engagementByDay: number[];   // 7 days
  bestContentTypes: string[];
  audienceActivity: {
    peakHours: number[];
    peakDays: number[];
  };
}

/**
 * Scheduling Service
 * Provides centralized scheduling functionality for content across platforms
 */
export class SchedulerService {
  private db: FirebaseFirestore.Firestore;
  
  /**
   * Constructor
   */
  constructor(db?: FirebaseFirestore.Firestore) {
    this.db = db || getFirestore();
  }
  
  /**
   * Schedule a post
   * @param post Post to schedule
   * @returns ID of the scheduled post
   */
  async schedulePost(post: Omit<ScheduledPost, 'id'>): Promise<string> {
    try {
      // Validate the post
      if (!post.userId || !post.contentId || !post.platform || !post.scheduledTime) {
        throw new Error('Missing required fields for scheduling');
      }
      
      // Create the document
      const docRef = this.db.collection('scheduledPosts').doc();
      
      // Prepare data with status defaulting to 'draft'
      const data: Omit<ScheduledPost, 'id'> = {
        ...post,
        status: post.status || 'draft'
      };
      
      // Save to Firestore
      await docRef.set(data);
      
      // Return the generated ID
      return docRef.id;
    } catch (error) {
      console.error('Error scheduling post:', error);
      throw error;
    }
  }
  
  /**
   * Schedule multiple posts at once
   * @param posts Array of posts to schedule
   * @returns Array of scheduled post IDs
   */
  async bulkSchedule(posts: Array<Omit<ScheduledPost, 'id'>>): Promise<string[]> {
    try {
      if (!posts.length) {
        return [];
      }
      
      // Create a batch write
      const batch = this.db.batch();
      const docRefs: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>[] = [];
      
      // Add each post to the batch
      for (const post of posts) {
        const docRef = this.db.collection('scheduledPosts').doc();
        docRefs.push(docRef);
        
        batch.set(docRef, {
          ...post,
          status: post.status || 'draft'
        });
      }
      
      // Commit the batch
      await batch.commit();
      
      // Return the array of generated IDs
      return docRefs.map(ref => ref.id);
    } catch (error) {
      console.error('Error bulk scheduling posts:', error);
      throw error;
    }
  }
  
  /**
   * Get all scheduled posts for a user
   * @param userId User ID
   * @param options Query options
   * @returns Array of scheduled posts
   */
  async getScheduledPosts(
    userId: string, 
    options?: {
      platform?: string;
      status?: ScheduledPost['status'];
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<ScheduledPost[]> {
    try {
      // Build the query
      let query = this.db.collection('scheduledPosts')
        .where('userId', '==', userId);
      
      // Apply filters if provided
      if (options?.platform) {
        query = query.where('platform', '==', options.platform);
      }
      
      if (options?.status) {
        query = query.where('status', '==', options.status);
      }
      
      if (options?.startDate) {
        query = query.where('scheduledTime', '>=', options.startDate);
      }
      
      if (options?.endDate) {
        query = query.where('scheduledTime', '<=', options.endDate);
      }
      
      // Order by scheduled time
      query = query.orderBy('scheduledTime', 'asc');
      
      // Execute the query
      const snapshot = await query.get();
      
      if (snapshot.empty) {
        return [];
      }
      
      // Convert to ScheduledPost array
      return snapshot.docs.map(doc => {
        const data = doc.data() as Omit<ScheduledPost, 'id'>;
        
        // Convert Firestore timestamp to Date if needed
        if (data.scheduledTime && typeof (data.scheduledTime as any).toDate === 'function') {
          data.scheduledTime = (data.scheduledTime as any).toDate();
        }
        
        return {
          id: doc.id,
          ...data
        } as ScheduledPost;
      });
    } catch (error) {
      console.error('Error getting scheduled posts:', error);
      throw error;
    }
  }
  
  /**
   * Update a scheduled post
   * @param id Post ID
   * @param updates Fields to update
   * @returns Success status
   */
  async updateScheduledPost(
    id: string,
    updates: Partial<Omit<ScheduledPost, 'id' | 'userId' | 'contentId'>>
  ): Promise<boolean> {
    try {
      const docRef = this.db.collection('scheduledPosts').doc(id);
      
      // Get the existing document
      const doc = await docRef.get();
      
      if (!doc.exists) {
        throw new Error('Scheduled post not found');
      }
      
      // Update the document
      await docRef.update(updates);
      
      return true;
    } catch (error) {
      console.error('Error updating scheduled post:', error);
      throw error;
    }
  }
  
  /**
   * Find the next optimal posting time for a platform
   * @param platform Platform name
   * @param afterTime Time to schedule after
   * @param config Scheduling configuration
   * @param existingTimes Optional array of existing scheduled times to avoid
   * @returns Date object for the next optimal posting time
   */
  findOptimalTime(
    platform: string,
    afterTime: Date,
    config?: Pick<ScheduleConfig, 'bestTimes' | 'avoidTimes' | 'timezone' | 'minGapHours'>,
    existingTimes: Date[] = []
  ): Date {
    // Get platform-specific optimal times if provided in config, otherwise use defaults
    const platformTimes = config?.bestTimes?.[platform] || PLATFORM_BEST_TIMES[platform] || PLATFORM_BEST_TIMES.facebook;
    
    // Get the next optimal time
    let optimalTime = getNextOptimalTime(platform, afterTime, platformTimes);
    
    // Apply timezone adjustment if needed (default implementation assumes UTC)
    if (config?.timezone && config.timezone !== 'UTC') {
      // Here we would implement timezone adjustments if needed
    }
    
    // Check if the time should be avoided
    if (config?.avoidTimes?.[platform]) {
      const avoidRanges = config.avoidTimes[platform];
      
      // Check if the optimal time falls within any avoid range
      const timeHour = optimalTime.getHours();
      const timeMinute = optimalTime.getMinutes();
      
      const timeToAvoid = avoidRanges.some(range => {
        const { start, end } = range;
        
        // Convert to minutes for easier comparison
        const startMinutes = start.hour * 60 + start.minute;
        const endMinutes = end.hour * 60 + end.minute;
        const timeMinutes = timeHour * 60 + timeMinute;
        
        // Check if time falls within avoid range
        return timeMinutes >= startMinutes && timeMinutes <= endMinutes;
      });
      
      // If the time should be avoided, try the next optimal time
      if (timeToAvoid) {
        // Add 3 hours to get out of the avoid range
        const nextTime = new Date(optimalTime.getTime() + 3 * 60 * 60 * 1000);
        return this.findOptimalTime(platform, nextTime, config, existingTimes);
      }
    }
    
    // Check for minimum gap between posts
    if (config?.minGapHours && existingTimes.length > 0) {
      const hasGap = hasMinimumGap(optimalTime, existingTimes, config.minGapHours);
      
      // If the minimum gap requirement is not met, try the next optimal time
      if (!hasGap) {
        // Add the minimum gap to get a valid time
        const nextTime = new Date(optimalTime.getTime() + config.minGapHours * 60 * 60 * 1000);
        return this.findOptimalTime(platform, nextTime, config, existingTimes);
      }
    }
    
    return optimalTime;
  }
  
  /**
   * Generate an optimized schedule for content across multiple platforms
   * @param userId User ID
   * @param config Schedule configuration
   * @param contentItems Content items to schedule
   * @returns Generated schedule
   */
  async generateMultiPlatformSchedule(
    userId: string,
    config: ScheduleConfig,
    contentItems: Array<{
      id: string;
      platforms: string[];
      contentType?: string;
      priority?: number;
      theme?: string;
    }>
  ): Promise<Array<{
    contentId: string;
    platform: string;
    scheduledTime: Date;
    formattedTime: string;
    reason: string;
  }>> {
    try {
      // Validate inputs
      if (!userId || !config || !contentItems.length) {
        throw new Error('Missing required parameters for multi-platform scheduling');
      }
      
      // Ensure we have start and end dates
      const startDate = config.startDate || new Date();
      const endDate = config.endDate || new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000); // Default to 1 week
      
      // Calculate days in the schedule
      const daysDiff = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Get existing scheduled posts for this date range
      const existingPosts = await this.getScheduledPosts(userId, {
        startDate,
        endDate,
        status: 'scheduled'
      });
      
      // Group existing posts by platform
      const existingByPlatform: Record<string, Date[]> = {};
      for (const post of existingPosts) {
        if (!existingByPlatform[post.platform]) {
          existingByPlatform[post.platform] = [];
        }
        existingByPlatform[post.platform].push(post.scheduledTime);
      }
      
      // Get all existing times regardless of platform for global gap checking
      const allExistingTimes = existingPosts.map(post => post.scheduledTime);
      
      // Process content items
      const processedItems: Array<{
        contentId: string;
        platforms: string[];
        contentType: string;
        priority: number;
        theme?: string;
      }> = contentItems.map(item => ({
        contentId: item.id,
        platforms: item.platforms,
        contentType: item.contentType || 'post',
        priority: item.priority || 5, // Default priority (1-10)
        theme: item.theme
      }));
      
      // Sort items by priority (higher priority first)
      processedItems.sort((a, b) => b.priority - a.priority);
      
      // Calculate post distribution if using balanced strategy
      const platformDistribution: Record<string, number[]> = {};
      
      for (const platform of config.platforms) {
        const platformFrequency = config.frequency?.[platform] || 3; // Default 3 posts per week
        const distribution = calculatePostDistribution(
          processedItems.filter(item => item.platforms.includes(platform)).length,
          daysDiff,
          platformFrequency
        );
        platformDistribution[platform] = distribution;
      }
      
      // Generate schedule
      const schedule: Array<{
        contentId: string;
        platform: string;
        scheduledTime: Date;
        formattedTime: string;
        reason: string;
      }> = [];
      
      // Process by strategy
      switch (config.strategy) {
        case 'concentrated':
          // Group content by theme and schedule together
          if (config.contentThemes && config.contentThemes.length > 0) {
            // Group items by theme
            const itemsByTheme: Record<string, typeof processedItems> = {};
            
            for (const item of processedItems) {
              const theme = item.theme || 'default';
              if (!itemsByTheme[theme]) {
                itemsByTheme[theme] = [];
              }
              itemsByTheme[theme].push(item);
            }
            
            // Schedule each theme group
            for (const [theme, items] of Object.entries(itemsByTheme)) {
              // For each theme, start a new day to concentrate content
              let currentThemeTime = new Date(startDate);
              
              for (const item of items) {
                for (const platform of item.platforms) {
                  // Find optimal time after current theme time
                  const optimalTime = this.findOptimalTime(
                    platform,
                    currentThemeTime,
                    config,
                    allExistingTimes
                  );
                  
                  // Add to schedule
                  schedule.push({
                    contentId: item.contentId,
                    platform,
                    scheduledTime: optimalTime,
                    formattedTime: optimalTime.toLocaleString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      timeZone: config.timezone || 'UTC'
                    }),
                    reason: `Optimal time for ${platform} content in ${theme} theme group`
                  });
                  
                  // Add to existing times
                  allExistingTimes.push(optimalTime);
                  
                  // Update current theme time to be after this post plus a small gap
                  const gapHours = config.minGapHours || 2;
                  currentThemeTime = new Date(optimalTime.getTime() + gapHours * 60 * 60 * 1000);
                }
              }
              
              // Add a larger gap between themes
              const themeSeparationHours = 12; // Half a day between themes
              currentThemeTime = new Date(currentThemeTime.getTime() + themeSeparationHours * 60 * 60 * 1000);
            }
          } else {
            // No themes specified, fall back to balanced strategy
            // This code is intentionally left empty to fall through to the balanced case
          }
          break;
          
        case 'platform-priority':
          // Prioritize certain platforms first
          const priorityPlatforms = config.priorityPlatforms || config.platforms;
          const nonPriorityPlatforms = config.platforms.filter(p => !priorityPlatforms.includes(p));
          
          // Process priority platforms first
          for (const platform of priorityPlatforms) {
            const platformItems = processedItems.filter(item => item.platforms.includes(platform));
            
            for (const item of platformItems) {
              // Find optimal time that hasn't been scheduled already
              const optimalTime = this.findOptimalTime(
                platform,
                startDate,
                config,
                allExistingTimes
              );
              
              // Add to schedule
              schedule.push({
                contentId: item.contentId,
                platform,
                scheduledTime: optimalTime,
                formattedTime: optimalTime.toLocaleString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  timeZone: config.timezone || 'UTC'
                }),
                reason: `Priority scheduling for ${platform} at optimal engagement time`
              });
              
              // Add to existing times
              allExistingTimes.push(optimalTime);
            }
          }
          
          // Process non-priority platforms
          for (const platform of nonPriorityPlatforms) {
            const platformItems = processedItems.filter(item => item.platforms.includes(platform));
            
            for (const item of platformItems) {
              // Skip if already scheduled on a priority platform
              const existingScheduleForContent = schedule.filter(s => s.contentId === item.contentId);
              if (existingScheduleForContent.length > 0) {
                continue;
              }
              
              // Find optimal time that hasn't been scheduled already
              const optimalTime = this.findOptimalTime(
                platform,
                startDate,
                config,
                allExistingTimes
              );
              
              // Add to schedule
              schedule.push({
                contentId: item.contentId,
                platform,
                scheduledTime: optimalTime,
                formattedTime: optimalTime.toLocaleString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  timeZone: config.timezone || 'UTC'
                }),
                reason: `Secondary scheduling for ${platform} following priority platforms`
              });
              
              // Add to existing times
              allExistingTimes.push(optimalTime);
            }
          }
          break;
          
        case 'balanced':
        default:
          // Balance content evenly across the time period
          // We'll iterate through each day in the schedule
          for (let day = 0; day < daysDiff; day++) {
            const currentDayStart = new Date(startDate);
            currentDayStart.setDate(currentDayStart.getDate() + day);
            currentDayStart.setHours(0, 0, 0, 0);
            
            const currentDayEnd = new Date(currentDayStart);
            currentDayEnd.setHours(23, 59, 59, 999);
            
            // For each platform, check if we should post today based on distribution
            for (const platform of config.platforms) {
              const distribution = platformDistribution[platform];
              const postsForDay = distribution[day] || 0;
              
              if (postsForDay > 0) {
                // Find items for this platform that haven't been scheduled yet
                const availableItems = processedItems.filter(item => 
                  item.platforms.includes(platform) && 
                  !schedule.some(s => s.contentId === item.contentId && s.platform === platform)
                );
                
                // Schedule up to the requested number of posts
                for (let i = 0; i < Math.min(postsForDay, availableItems.length); i++) {
                  const item = availableItems[i];
                  
                  // Find optimal time within this day
                  const optimalTime = this.findOptimalTime(
                    platform,
                    currentDayStart,
                    config,
                    allExistingTimes
                  );
                  
                  // Ensure the time is within the current day
                  let scheduledTime: Date;
                  if (optimalTime < currentDayEnd) {
                    scheduledTime = optimalTime;
                  } else {
                    // If no optimal time found within day, use noon as fallback
                    scheduledTime = new Date(currentDayStart);
                    scheduledTime.setHours(12, 0, 0, 0);
                  }
                  
                  // Add to schedule
                  schedule.push({
                    contentId: item.contentId,
                    platform,
                    scheduledTime,
                    formattedTime: scheduledTime.toLocaleString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      timeZone: config.timezone || 'UTC'
                    }),
                    reason: `Balanced distribution for ${platform} on ${getDayName(scheduledTime.getDay())}`
                  });
                  
                  // Add to existing times
                  allExistingTimes.push(scheduledTime);
                }
              }
            }
          }
          break;
      }
      
      // Sort the schedule by time
      schedule.sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime());
      
      return schedule;
    } catch (error) {
      console.error('Error generating multi-platform schedule:', error);
      throw error;
    }
  }
  
  /**
   * Get summary statistics for scheduled posts
   * @param userId User ID
   * @returns Schedule summary
   */
  async getScheduleSummary(userId: string): Promise<{
    total: number;
    byPlatform: Record<string, number>;
    byStatus: Record<string, number>;
    upcoming: number;
  }> {
    try {
      // Get all scheduled posts for the user
      const posts = await this.getScheduledPosts(userId);
      
      // Initialize counters
      const byPlatform: Record<string, number> = {};
      const byStatus: Record<string, number> = {};
      
      // Count upcoming posts (scheduled for future)
      const now = new Date();
      const upcoming = posts.filter(post => 
        post.status === 'scheduled' && post.scheduledTime > now
      ).length;
      
      // Count by platform and status
      for (const post of posts) {
        // Count by platform
        byPlatform[post.platform] = (byPlatform[post.platform] || 0) + 1;
        
        // Count by status
        byStatus[post.status] = (byStatus[post.status] || 0) + 1;
      }
      
      return {
        total: posts.length,
        byPlatform,
        byStatus,
        upcoming
      };
    } catch (error) {
      console.error('Error getting schedule summary:', error);
      throw error;
    }
  }
  
  /**
   * Cancel a scheduled post
   * @param id Post ID to cancel
   * @returns Success status
   */
  async cancelScheduledPost(id: string): Promise<boolean> {
    try {
      const docRef = this.db.collection('scheduledPosts').doc(id);
      
      // Get the existing document
      const doc = await docRef.get();
      
      if (!doc.exists) {
        throw new Error('Scheduled post not found');
      }
      
      // Update the document status to cancelled
      await docRef.update({ status: 'cancelled' });
      
      return true;
    } catch (error) {
      console.error('Error cancelling scheduled post:', error);
      throw error;
    }
  }
}

const schedulerService = new SchedulerService();
export default schedulerService; 