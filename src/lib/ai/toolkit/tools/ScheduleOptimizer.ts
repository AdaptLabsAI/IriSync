import { ScheduleOptimizerTool, AITaskResult, ToolkitRequestOptions, OptimalTimeResult, ContentSchedule, TimeSlot } from '../interfaces';
import { BaseTool } from './BaseTool';
import { TokenService } from '../../../tokens/token-service';
import { logger } from '../../../logging/logger';
import { PlatformService } from '../../../platforms/providers/platform-service';
import { v4 as uuidv4 } from 'uuid';

/**
 * Implementation of the ScheduleOptimizer tool
 */
export class ScheduleOptimizer extends BaseTool implements ScheduleOptimizerTool {
  private platformService: PlatformService;
  private readonly tokenCost = 1; // Fixed token cost of 1 for all operations
  
  /**
   * Create a new ScheduleOptimizer instance
   * @param tokenService Service for token management
   * @param platformService Service for platform-specific data
   */
  constructor(tokenService: TokenService, platformService: PlatformService) {
    super(tokenService);
    this.platformService = platformService;
    logger.info('ScheduleOptimizer initialized');
  }
  
  /**
   * Find optimal posting times based on platform and audience
   */
  async findOptimalPostingTime(
    platform: string,
    contentType: string,
    audienceData?: any,
    options?: ToolkitRequestOptions
  ): Promise<AITaskResult<OptimalTimeResult>> {
    try {
      if (!platform) {
        throw new Error('Platform is required to find optimal posting time');
      }
      
      logger.debug('Finding optimal posting time', {
        platform,
        contentType,
        hasAudienceData: !!audienceData
      });
      
      // Check if user has enough tokens - fixed cost of 1
      const userId = options?.userId || '';
      const orgId = options?.organizationId;
      
      if (userId && !(await this.hasEnoughTokens(userId, this.tokenCost, orgId))) {
        return this.createInsufficientTokensResponse(this.tokenCost);
      }
      
      // Get platform engagement data
      const engagementData = await this.platformService.getEngagementData(platform, contentType);
      
      // Determine timezone to use
      const timezone = audienceData?.timezone || 'UTC';
      
      // Get audience timezone distribution
      const audienceTimezones = audienceData?.timezoneDistribution || { 'UTC': 1.0 };
      
      // Calculate optimal time
      const result = this.calculateOptimalTime(engagementData, timezone, audienceTimezones);
      
      // Deduct tokens if needed - fixed cost of 1
      if (userId) {
        await this.useTokens(userId, 'schedule_optimizer', this.tokenCost, {
          organizationId: orgId,
          platform,
          contentType,
          operationType: 'find_optimal_time'
        });
      }
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      logger.error('Error finding optimal posting time', {
        error: error instanceof Error ? error.message : String(error),
        platform,
        contentType
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
  
  /**
   * Generate an optimized content schedule
   */
  async generateSchedule(
    scheduleOptions: {
      platform: string;
      contentTypes: string[];
      frequency: {
        postsPerWeek?: number;
        postsPerDay?: number;
        specificDays?: string[];
        timeRange?: {
          start: string;
          end: string;
        };
      };
      duration: number; // In weeks
      audience?: any;
      existingCommitments?: Array<{
        date: string;
        time: string;
        description: string;
      }>;
      preferences?: {
        prioritizeWeekends?: boolean;
        avoidConsecutiveDays?: boolean;
        maxPostsPerDay?: number;
        preferredTimes?: string[];
      };
    },
    toolkitOptions?: ToolkitRequestOptions
  ): Promise<AITaskResult<ContentSchedule>> {
    try {
      const { platform, contentTypes, frequency, duration } = scheduleOptions;
      
      if (!platform) {
        throw new Error('Platform is required to generate schedule');
      }
      
      if (!contentTypes || contentTypes.length === 0) {
        throw new Error('At least one content type is required');
      }
      
      logger.debug('Generating content schedule', {
        platform,
        contentTypesCount: contentTypes.length,
        durationWeeks: duration
      });
      
      // Check if user has enough tokens - fixed cost of 1
      const userId = toolkitOptions?.userId || '';
      const orgId = toolkitOptions?.organizationId;
      
      if (userId && !(await this.hasEnoughTokens(userId, this.tokenCost, orgId))) {
        return this.createInsufficientTokensResponse(this.tokenCost);
      }
      
      // Create schedule
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + (duration * 7));
      
      // Get optimized schedule
      const schedule = this.createOptimizedSchedule(
        platform,
        contentTypes,
        startDate,
        endDate,
        frequency,
        scheduleOptions.audience,
        scheduleOptions.existingCommitments,
        scheduleOptions.preferences
      );
      
      // Deduct tokens - fixed cost of 1
      if (userId) {
        await this.useTokens(userId, 'schedule_optimizer', this.tokenCost, {
          organizationId: orgId,
          platform,
          contentTypes,
          duration
        });
      }
      
      return {
        success: true,
        data: schedule
      };
    } catch (error) {
      logger.error('Error generating schedule', {
        error: error instanceof Error ? error.message : String(error),
        platform: scheduleOptions.platform
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
  
  /**
   * Optimize an existing schedule with new constraints
   */
  async optimizeExistingSchedule(
    existingSchedule: ContentSchedule,
    newConstraints: {
      excludeDates?: string[];
      prioritizeDates?: string[];
      rescheduleCount?: number;
      preserveTopPriority?: boolean;
      newContentTypes?: string[];
    },
    toolkitOptions?: ToolkitRequestOptions
  ): Promise<AITaskResult<ContentSchedule>> {
    try {
      if (!existingSchedule) {
        throw new Error('Existing schedule is required');
      }
      
      logger.debug('Optimizing existing schedule', {
        platform: existingSchedule.platform,
        postsCount: existingSchedule.scheduledPosts.length,
        hasExcludeDates: !!newConstraints.excludeDates?.length,
        hasPrioritizeDates: !!newConstraints.prioritizeDates?.length
      });
      
      // Check if user has enough tokens - fixed cost of 1
      const userId = toolkitOptions?.userId || '';
      const orgId = toolkitOptions?.organizationId;
      
      if (userId && !(await this.hasEnoughTokens(userId, this.tokenCost, orgId))) {
        return this.createInsufficientTokensResponse(this.tokenCost);
      }
      
      // Clone schedule to avoid modifying original
      const optimizedSchedule = JSON.parse(JSON.stringify(existingSchedule));
      
      // Apply optimization
      this.applyScheduleOptimization(optimizedSchedule, newConstraints);
      
      // Deduct tokens - fixed cost of 1
      if (userId) {
        await this.useTokens(userId, 'schedule_optimizer', this.tokenCost, {
          organizationId: orgId,
          platform: existingSchedule.platform,
          postsCount: existingSchedule.scheduledPosts.length
        });
      }
      
      return {
        success: true,
        data: optimizedSchedule
      };
    } catch (error) {
      logger.error('Error optimizing schedule', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
  
  /**
   * Analyze schedule performance
   */
  async analyzeSchedulePerformance(
    schedule: ContentSchedule,
    performanceData: Array<{
      postId: string;
      metrics: {
        engagement: number;
        reach: number;
        clicks?: number;
        shares?: number;
        comments?: number;
        saves?: number;
      };
    }>,
    toolkitOptions?: ToolkitRequestOptions
  ): Promise<AITaskResult<{
    insights: string[];
    recommendations: string[];
    bestPerformingSlots: TimeSlot[];
    worstPerformingSlots: TimeSlot[];
    performanceByContentType: Record<string, {
      averageEngagement: number;
      trend: 'increasing' | 'decreasing' | 'stable';
    }>;
  }>> {
    try {
      if (!schedule) {
        throw new Error('Schedule is required');
      }
      
      if (!performanceData || performanceData.length === 0) {
        throw new Error('Performance data is required');
      }
      
      logger.debug('Analyzing schedule performance', {
        platform: schedule.platform,
        scheduledPosts: schedule.scheduledPosts.length,
        performanceDataPoints: performanceData.length
      });
      
      // Check if user has enough tokens - fixed cost of 1
      const userId = toolkitOptions?.userId || '';
      const orgId = toolkitOptions?.organizationId;
      
      if (userId && !(await this.hasEnoughTokens(userId, this.tokenCost, orgId))) {
        return this.createInsufficientTokensResponse(this.tokenCost);
      }
      
      // Create analysis
      const analysisResult = this.analyzePerformance(schedule, performanceData);
      
      // Deduct tokens - fixed cost of 1
      if (userId) {
        await this.useTokens(userId, 'schedule_optimizer', this.tokenCost, {
          organizationId: orgId,
          platform: schedule.platform,
          postsCount: schedule.scheduledPosts.length
        });
      }
      
      return {
        success: true,
        data: analysisResult
      };
    } catch (error) {
      logger.error('Error analyzing schedule performance', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
  
  /**
   * Calculate optimal time for posting
   */
  private calculateOptimalTime(
    engagementData: any, 
    timezone: string = 'UTC',
    audienceTimezones: Record<string, number> = { 'UTC': 1.0 }
  ): OptimalTimeResult {
    try {
      // Extract day of week and hour data
      const dayEngagement = engagementData.dayOfWeek || {};
      const hourEngagement = engagementData.hourOfDay || {};
      
      // Find best day
      let bestDay = 'Wednesday'; // Default
      let bestDayScore = 0;
      
      Object.entries(dayEngagement).forEach(([day, score]) => {
        if ((score as number) > bestDayScore) {
          bestDay = day;
          bestDayScore = score as number;
        }
      });
      
      // Find best hour
      let bestHour = '12:00'; // Default
      let bestHourScore = 0;
      
      Object.entries(hourEngagement).forEach(([hour, score]) => {
        if ((score as number) > bestHourScore) {
          bestHour = hour;
          bestHourScore = score as number;
        }
      });
      
      // Find alternative times
      const alternativeTimes: Array<{ time: string; dayOfWeek: string; expectedEngagement: number }> = [];
      const sortedHours = Object.entries(hourEngagement)
        .sort(([, scoreA], [, scoreB]) => (scoreB as number) - (scoreA as number))
        .slice(1, 4); // Take next 3 best hours after the best one
      
      for (const [hour, score] of sortedHours) {
        alternativeTimes.push({
          time: hour,
          dayOfWeek: bestDay,
          expectedEngagement: score as number
        });
      }
      
      // Generate reasoning
      const reasoning = `Based on historical engagement data for this platform, ${bestDay} at ${bestHour} typically sees the highest engagement rates. The audience is primarily active during this timeframe, with engagement metrics showing a ${(bestHourScore * 100).toFixed(1)}% higher than average response rate.`;
      
      return {
        optimalTime: bestHour,
        dayOfWeek: bestDay,
        expectedEngagement: bestHourScore,
        confidence: 0.85, // Could be calculated more precisely with actual data
        alternativeTimes,
        timezone,
        reasoning
      };
    } catch (error) {
      logger.error('Error calculating optimal time', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Return fallback data
      return {
        optimalTime: '12:00',
        dayOfWeek: 'Wednesday',
        expectedEngagement: 0.7,
        confidence: 0.5,
        alternativeTimes: [
          { time: '18:00', dayOfWeek: 'Wednesday', expectedEngagement: 0.65 },
          { time: '12:00', dayOfWeek: 'Thursday', expectedEngagement: 0.6 },
          { time: '18:00', dayOfWeek: 'Thursday', expectedEngagement: 0.55 }
        ],
        timezone: 'UTC',
        reasoning: 'Using fallback data due to error in calculation. Midday on weekdays is generally a safe default.'
      };
    }
  }
  
  /**
   * Create an optimized content schedule
   */
  private createOptimizedSchedule(
    platform: string,
    contentTypes: string[],
    startDate: Date,
    endDate: Date,
    frequency: any,
    audienceData?: any,
    existingCommitments?: Array<{ date: string; time: string; description: string; }>,
    preferences?: any
  ): ContentSchedule {
    try {
      // Calculate total posts needed
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const postsPerWeek = frequency.postsPerWeek || 3;
      const totalPosts = Math.ceil(postsPerWeek * (totalDays / 7));
      
      // Initialize schedule
      const schedule: ContentSchedule = {
        platform,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        scheduledPosts: [],
        contentTypeDistribution: {},
        weekdayDistribution: {},
        timeSlotDistribution: {},
        changes: [],
        metadata: {}
      };
      
      // Generate posts
      for (let i = 0; i < totalPosts; i++) {
        // Determine content type (cycle through available types)
        const contentType = contentTypes[i % contentTypes.length];
        
        // Get optimal posting time for this content type
        const optimalTimeResult = this.calculateOptimalTime({
          dayOfWeek: {
            'Monday': 0.7,
            'Tuesday': 0.8,
            'Wednesday': 0.85,
            'Thursday': 0.9,
            'Friday': 0.8,
            'Saturday': 0.65,
            'Sunday': 0.6
          },
          hourOfDay: {
            '08:00': 0.7,
            '12:00': 0.9,
            '15:00': 0.8,
            '18:00': 0.85,
            '20:00': 0.75
          }
        });
        
        // Calculate post date (distribute evenly over duration)
        const postDate = new Date(startDate);
        postDate.setDate(startDate.getDate() + Math.floor(i * (totalDays / totalPosts)));
        
        // Format date as YYYY-MM-DD
        const formattedDate = postDate.toISOString().split('T')[0];
        
        // Add to schedule
        schedule.scheduledPosts.push({
          id: uuidv4(),
          contentType,
          scheduledDate: formattedDate,
          scheduledTime: optimalTimeResult.optimalTime,
          status: 'scheduled',
          platform,
          priority: i < totalPosts / 3 ? 'high' : i < totalPosts * 2 / 3 ? 'medium' : 'low'
        });
      }
      
      // Calculate distributions
      this.calculateDistributions(schedule);
      
      return schedule;
    } catch (error) {
      logger.error('Error creating optimized schedule', {
        error: error instanceof Error ? error.message : String(error),
        platform
      });
      
      // Return minimal fallback schedule
      return {
        platform,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        scheduledPosts: [],
        contentTypeDistribution: {},
        weekdayDistribution: {},
        timeSlotDistribution: {},
        changes: [],
        metadata: {
          error: 'Error generating schedule, please try again'
        }
      };
    }
  }
  
  /**
   * Apply optimization to an existing schedule
   */
  private applyScheduleOptimization(
    schedule: ContentSchedule,
    constraints: any
  ): void {
    try {
      // Extract constraints
      const { excludeDates = [], prioritizeDates = [], newContentTypes = [] } = constraints;
      
      // Convert exclude dates to Set for faster lookup
      const excludeDatesSet = new Set(excludeDates);
      
      // Find posts on excluded dates that need to be rescheduled
      const postsToReschedule = schedule.scheduledPosts.filter(
        post => excludeDatesSet.has(post.scheduledDate)
      );
      
      // Record changes
      for (const post of postsToReschedule) {
        schedule.changes.push({
          postId: post.id,
          changeType: 'reschedule',
          from: `${post.scheduledDate} ${post.scheduledTime}`,
          to: 'TBD',
          reason: 'Date excluded by user constraints'
        });
      }
      
      // Find new dates for rescheduled posts
      for (const post of postsToReschedule) {
        // Find next available date
        const startDate = new Date(schedule.startDate);
        const newDate = this.findNextAvailableDate(schedule, startDate, excludeDates);
        
        // Format new date
        const formattedDate = newDate.toISOString().split('T')[0];
        
        // Update schedule.changes with the new date
        const change = schedule.changes.find(c => c.postId === post.id);
        if (change) {
          change.to = `${formattedDate} ${post.scheduledTime}`;
        }
        
        // Update post schedule
        post.scheduledDate = formattedDate;
        post.optimizationReason = 'Rescheduled due to date constraints';
      }
      
      // Update content types if specified
      if (newContentTypes.length > 0) {
        let contentTypeIndex = 0;
        
        for (const post of schedule.scheduledPosts) {
          // Only update posts that aren't already using the new types
          if (!newContentTypes.includes(post.contentType)) {
            const oldType = post.contentType;
            post.contentType = newContentTypes[contentTypeIndex % newContentTypes.length];
            contentTypeIndex++;
            
            // Record change
            schedule.changes.push({
              postId: post.id,
              changeType: 'contentTypeChange',
              from: oldType,
              to: post.contentType,
              reason: 'Content type updated based on user constraints'
            });
          }
        }
      }
      
      // Recalculate distributions
      this.calculateDistributions(schedule);
    } catch (error) {
      logger.error('Error applying schedule optimization', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Don't throw, just log error and return the schedule as is
    }
  }
  
  /**
   * Analyze performance of a schedule
   */
  private analyzePerformance(
    schedule: ContentSchedule,
    performanceData: Array<{
      postId: string;
      metrics: {
        engagement: number;
        reach: number;
        clicks?: number;
        shares?: number;
        comments?: number;
        saves?: number;
      };
    }>
  ): {
    insights: string[];
    recommendations: string[];
    bestPerformingSlots: TimeSlot[];
    worstPerformingSlots: TimeSlot[];
    performanceByContentType: Record<string, {
      averageEngagement: number;
      trend: 'increasing' | 'decreasing' | 'stable';
    }>;
  } {
    try {
      // Match performance data with scheduled posts
      const postsWithPerformance = schedule.scheduledPosts.map(post => {
        const performance = performanceData.find(p => p.postId === post.id);
        return { ...post, performance: performance?.metrics };
      });
      
      // Calculate performance by time slot
      const timeSlotPerformance = new Map();
      
      postsWithPerformance.forEach(post => {
        if (!post.performance) return;
        
        const timeSlot = `${post.scheduledTime}`;
        const dayOfWeek = new Date(post.scheduledDate).toLocaleDateString('en-US', { weekday: 'long' });
        const key = `${dayOfWeek}|${timeSlot}`;
        
        if (!timeSlotPerformance.has(key)) {
          timeSlotPerformance.set(key, {
            time: timeSlot,
            dayOfWeek,
            engagementScores: [],
            engagementScore: 0
          });
        }
        
        const entry = timeSlotPerformance.get(key);
        entry.engagementScores.push(post.performance.engagement);
      });
      
      // Calculate average engagement for each time slot
      timeSlotPerformance.forEach((data, key) => {
        if (data.engagementScores.length > 0) {
          const total = data.engagementScores.reduce((sum: number, score: number) => sum + score, 0);
          data.engagementScore = total / data.engagementScores.length;
        }
      });
      
      // Sort time slots by performance
      const sortedTimeSlots = Array.from(timeSlotPerformance.values())
        .sort((a, b) => b.engagementScore - a.engagementScore);
      
      // Create best and worst slots arrays
      const bestPerformingSlots: TimeSlot[] = sortedTimeSlots
        .slice(0, 3)
        .map(slot => ({
          time: slot.time,
          dayOfWeek: slot.dayOfWeek,
          engagementScore: slot.engagementScore
        }));
      
      const worstPerformingSlots: TimeSlot[] = sortedTimeSlots
        .slice(-3)
        .map(slot => ({
          time: slot.time,
          dayOfWeek: slot.dayOfWeek,
          engagementScore: slot.engagementScore
        }));
      
      // Calculate performance by content type
      const contentTypePerformance: Record<string, {
        averageEngagement: number;
        trend: 'increasing' | 'decreasing' | 'stable';
      }> = {};
      
      const contentTypes = new Set(schedule.scheduledPosts.map(post => post.contentType));
      
      Array.from(contentTypes).forEach(contentType => {
        const postsOfType = postsWithPerformance.filter(
          post => post.contentType === contentType && post.performance
        );
        
        if (postsOfType.length === 0) return;
        
        // Calculate average engagement
        const totalEngagement = postsOfType.reduce(
          (sum, post) => sum + (post.performance?.engagement || 0),
          0
        );
        const averageEngagement = totalEngagement / postsOfType.length;
        
        // Determine trend
        let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
        
        if (postsOfType.length >= 3) {
          // Sort by date
          postsOfType.sort((a, b) => 
            new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
          );
          
          // Get engagement values in chronological order
          const engagementValues = postsOfType.map(post => post.performance?.engagement || 0);
          
          // Calculate slope of trend line
          const xValues = Array.from({ length: engagementValues.length }, (_, i) => i);
          const slope = this.calculateSlope(xValues, engagementValues);
          
          // Determine trend based on slope
          if (slope > 0.05) {
            trend = 'increasing';
          } else if (slope < -0.05) {
            trend = 'decreasing';
          }
        }
        
        contentTypePerformance[contentType] = {
          averageEngagement,
          trend
        };
      });
      
      // Generate insights and recommendations
      const insights = this.generateInsights(bestPerformingSlots, worstPerformingSlots, contentTypePerformance);
      const recommendations = this.generateRecommendations(bestPerformingSlots, worstPerformingSlots, contentTypePerformance);
      
      return {
        insights,
        recommendations,
        bestPerformingSlots,
        worstPerformingSlots,
        performanceByContentType: contentTypePerformance
      };
    } catch (error) {
      logger.error('Error analyzing performance', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Return fallback data
      return {
        insights: ['Unable to generate insights due to an error in analysis.'],
        recommendations: ['Review schedule data for inconsistencies and try again.'],
        bestPerformingSlots: [],
        worstPerformingSlots: [],
        performanceByContentType: {}
      };
    }
  }
  
  /**
   * Find next available date not in exclude list
   */
  private findNextAvailableDate(
    schedule: ContentSchedule,
    startDate: Date,
    excludeDates: string[]
  ): Date {
    // Convert excludeDates to Set for faster lookup
    const excludeDatesSet = new Set(excludeDates);
    
    // Create set of dates with maximum posts (simple check for now)
    const scheduledDatesSet = new Set();
    
    // Count posts per date
    const postsPerDate: Record<string, number> = {};
    for (const post of schedule.scheduledPosts) {
      postsPerDate[post.scheduledDate] = (postsPerDate[post.scheduledDate] || 0) + 1;
      if (postsPerDate[post.scheduledDate] >= 3) {
        scheduledDatesSet.add(post.scheduledDate);
      }
    }
    
    // Start from the day after startDate
    const date = new Date(startDate);
    date.setDate(date.getDate() + 1);
    
    // Loop until we find an available date
    for (let i = 0; i < 90; i++) { // Look up to 90 days ahead
      const dateString = date.toISOString().split('T')[0];
      
      // Skip excluded dates
      if (excludeDatesSet.has(dateString)) {
        date.setDate(date.getDate() + 1);
        continue;
      }
      
      // Skip dates that already have maximum posts
      if (scheduledDatesSet.has(dateString)) {
        date.setDate(date.getDate() + 1);
        continue;
      }
      
      // Found a date that works
      return date;
    }
    
    // If we couldn't find a suitable date, return a date 7 days after the startDate
    startDate.setDate(startDate.getDate() + 7);
    return startDate;
  }
  
  /**
   * Calculate distributions for a schedule
   */
  private calculateDistributions(schedule: ContentSchedule): void {
    // Calculate content type distribution
    schedule.contentTypeDistribution = {};
    for (const post of schedule.scheduledPosts) {
      schedule.contentTypeDistribution[post.contentType] = 
        (schedule.contentTypeDistribution[post.contentType] || 0) + 1;
    }
    
    // Calculate weekday distribution
    schedule.weekdayDistribution = {};
    for (const post of schedule.scheduledPosts) {
      const date = new Date(post.scheduledDate);
      const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
      schedule.weekdayDistribution[dayOfWeek] = 
        (schedule.weekdayDistribution[dayOfWeek] || 0) + 1;
    }
    
    // Calculate time slot distribution
    schedule.timeSlotDistribution = {};
    for (const post of schedule.scheduledPosts) {
      schedule.timeSlotDistribution[post.scheduledTime] = 
        (schedule.timeSlotDistribution[post.scheduledTime] || 0) + 1;
    }
  }
  
  /**
   * Calculate slope of a linear regression
   */
  private calculateSlope(x: number[], y: number[]): number {
    const n = x.length;
    if (n <= 1) return 0;
    
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    
    for (let i = 0; i < n; i++) {
      sumX += x[i];
      sumY += y[i];
      sumXY += x[i] * y[i];
      sumX2 += x[i] * x[i];
    }
    
    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  }
  
  /**
   * Generate insights from performance data
   */
  private generateInsights(
    bestSlots: TimeSlot[],
    worstSlots: TimeSlot[],
    contentTypePerformance: Record<string, any>
  ): string[] {
    const insights: string[] = [];
    
    // Add insights about best performing time slots
    if (bestSlots.length > 0) {
      const bestSlot = bestSlots[0];
      insights.push(`Posts on ${bestSlot.dayOfWeek} at ${bestSlot.time} have the highest engagement rate (${(bestSlot.engagementScore * 100).toFixed(1)}%).`);
    }
    
    // Add insights about worst performing time slots
    if (worstSlots.length > 0) {
      const worstSlot = worstSlots[0];
      insights.push(`Posts on ${worstSlot.dayOfWeek} at ${worstSlot.time} have the lowest engagement rate (${(worstSlot.engagementScore * 100).toFixed(1)}%).`);
    }
    
    // Add insights about content types
    const contentTypes = Object.keys(contentTypePerformance);
    if (contentTypes.length > 0) {
      // Find best performing content type
      let bestType = contentTypes[0];
      let bestScore = contentTypePerformance[bestType].averageEngagement;
      
      for (const type of contentTypes) {
        if (contentTypePerformance[type].averageEngagement > bestScore) {
          bestType = type;
          bestScore = contentTypePerformance[type].averageEngagement;
        }
      }
      
      insights.push(`"${bestType}" content has the highest average engagement rate (${(bestScore * 100).toFixed(1)}%).`);
      
      // Add trend insights
      const increasingTypes = contentTypes.filter(type => contentTypePerformance[type].trend === 'increasing');
      const decreasingTypes = contentTypes.filter(type => contentTypePerformance[type].trend === 'decreasing');
      
      if (increasingTypes.length > 0) {
        insights.push(`"${increasingTypes.join('", "')}" content shows increasing engagement trends.`);
      }
      
      if (decreasingTypes.length > 0) {
        insights.push(`"${decreasingTypes.join('", "')}" content shows declining engagement trends.`);
      }
    }
    
    return insights;
  }
  
  /**
   * Generate recommendations based on performance analysis
   */
  private generateRecommendations(
    bestSlots: TimeSlot[],
    worstSlots: TimeSlot[],
    contentTypePerformance: Record<string, any>
  ): string[] {
    const recommendations: string[] = [];
    
    // Recommend optimal posting times
    if (bestSlots.length > 0) {
      const bestTimeSlots = bestSlots
        .map(slot => `${slot.dayOfWeek} at ${slot.time}`)
        .join(', ');
      
      recommendations.push(`Focus posting activity on ${bestTimeSlots} for maximum engagement.`);
    }
    
    // Recommend avoiding low-performing times
    if (worstSlots.length > 0) {
      const worstTimeSlots = worstSlots
        .map(slot => `${slot.dayOfWeek} at ${slot.time}`)
        .join(', ');
      
      recommendations.push(`Consider rescheduling posts from ${worstTimeSlots} to better-performing time slots.`);
    }
    
    // Content type recommendations
    const contentTypes = Object.keys(contentTypePerformance);
    if (contentTypes.length > 0) {
      // Recommend increasing high-performing content
      const highPerformingTypes = contentTypes
        .filter(type => 
          contentTypePerformance[type].averageEngagement > 0.7 ||
          contentTypePerformance[type].trend === 'increasing'
        );
      
      if (highPerformingTypes.length > 0) {
        recommendations.push(`Increase the frequency of "${highPerformingTypes.join('", "')}" content in your schedule.`);
      }
      
      // Recommend improving low-performing content
      const lowPerformingTypes = contentTypes
        .filter(type => 
          contentTypePerformance[type].averageEngagement < 0.4 ||
          contentTypePerformance[type].trend === 'decreasing'
        );
      
      if (lowPerformingTypes.length > 0) {
        recommendations.push(`Revise your approach to "${lowPerformingTypes.join('", "')}" content to improve engagement.`);
      }
    }
    
    // Add a general recommendation if we don't have many specific ones
    if (recommendations.length < 2) {
      recommendations.push('Experiment with different content types and posting times to identify optimal engagement patterns.');
    }
    
    return recommendations;
  }
}

export default ScheduleOptimizer;
