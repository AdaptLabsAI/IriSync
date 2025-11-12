import { getFirestore } from 'firebase-admin/firestore';

/**
 * Interface for a scheduled post
 */
export interface ScheduledPost {
  id?: string;
  contentId: string;
  userId: string;
  platform: string;
  scheduledTime: Date | string;
  status: 'draft' | 'scheduled' | 'posted' | 'failed' | 'cancelled';
  contentType?: string;
  mediaUrls?: string[];
  caption?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

/**
 * Interface for optimal posting time
 */
export interface OptimalPostingTime {
  dayOfWeek: number; // 0-6 (Sunday to Saturday)
  hour: number; // 0-23
  score: number; // 0-1 (higher is better)
}

/**
 * Optimal posting times by platform (in UTC hours)
 */
export const OPTIMAL_POSTING_TIMES = {
  facebook: [8, 9, 13, 14, 15],
  instagram: [6, 7, 8, 11, 12, 17, 18, 19],
  twitter: [8, 9, 10, 11, 12, 18, 19, 20],
  linkedin: [7, 8, 9, 12, 17, 18],
  tiktok: [6, 7, 8, 9, 18, 19, 20, 21],
  youtube: [14, 15, 16, 17, 18, 19, 20],
  reddit: [7, 8, 9, 10, 20, 21, 22],
  mastodon: [8, 9, 18, 19, 20],
  threads: [8, 9, 11, 12, 17, 18, 19]
} as const;

/**
 * Maximum recommended posts per day by platform
 */
export const MAX_POSTS_PER_DAY = {
  facebook: 2,
  instagram: 3,
  twitter: 10,
  linkedin: 2,
  tiktok: 4,
  youtube: 1,
  reddit: 5,
  mastodon: 8,
  threads: 3
} as const;

/**
 * Platform posting time rules
 */
export const PLATFORM_BEST_TIMES: Record<string, OptimalPostingTime[]> = {
  instagram: [
    { dayOfWeek: 1, hour: 11, score: 0.95 }, // Monday 11 AM
    { dayOfWeek: 2, hour: 11, score: 0.92 }, // Tuesday 11 AM
    { dayOfWeek: 3, hour: 11, score: 0.9 },  // Wednesday 11 AM
    { dayOfWeek: 4, hour: 11, score: 0.91 }, // Thursday 11 AM
    { dayOfWeek: 4, hour: 15, score: 0.89 }, // Thursday 3 PM
    { dayOfWeek: 5, hour: 10, score: 0.9 },  // Friday 10 AM
    { dayOfWeek: 5, hour: 16, score: 0.92 }, // Friday 4 PM
    { dayOfWeek: 6, hour: 11, score: 0.88 }  // Saturday 11 AM
  ],
  facebook: [
    { dayOfWeek: 1, hour: 13, score: 0.93 }, // Monday 1 PM
    { dayOfWeek: 2, hour: 14, score: 0.9 },  // Tuesday 2 PM
    { dayOfWeek: 3, hour: 13, score: 0.92 }, // Wednesday 1 PM
    { dayOfWeek: 4, hour: 14, score: 0.91 }, // Thursday 2 PM
    { dayOfWeek: 5, hour: 13, score: 0.9 },  // Friday 1 PM
    { dayOfWeek: 6, hour: 12, score: 0.85 }  // Saturday 12 PM
  ],
  twitter: [
    { dayOfWeek: 1, hour: 9, score: 0.92 },   // Monday 9 AM
    { dayOfWeek: 1, hour: 15, score: 0.9 },   // Monday 3 PM
    { dayOfWeek: 2, hour: 9, score: 0.91 },   // Tuesday 9 AM
    { dayOfWeek: 2, hour: 15, score: 0.89 },  // Tuesday 3 PM
    { dayOfWeek: 3, hour: 9, score: 0.95 },   // Wednesday 9 AM
    { dayOfWeek: 3, hour: 15, score: 0.94 },  // Wednesday 3 PM
    { dayOfWeek: 4, hour: 9, score: 0.91 },   // Thursday 9 AM
    { dayOfWeek: 4, hour: 15, score: 0.9 },   // Thursday 3 PM
    { dayOfWeek: 5, hour: 9, score: 0.88 },   // Friday 9 AM
    { dayOfWeek: 5, hour: 15, score: 0.85 }   // Friday 3 PM
  ],
  linkedin: [
    { dayOfWeek: 1, hour: 9, score: 0.9 },    // Monday 9 AM
    { dayOfWeek: 2, hour: 10, score: 0.95 },  // Tuesday 10 AM
    { dayOfWeek: 3, hour: 10, score: 0.94 },  // Wednesday 10 AM
    { dayOfWeek: 4, hour: 10, score: 0.92 },  // Thursday 10 AM
    { dayOfWeek: 5, hour: 10, score: 0.88 }   // Friday 10 AM
  ],
  tiktok: [
    { dayOfWeek: 1, hour: 19, score: 0.9 },   // Monday 7 PM
    { dayOfWeek: 2, hour: 14, score: 0.88 },  // Tuesday 2 PM
    { dayOfWeek: 2, hour: 19, score: 0.94 },  // Tuesday 7 PM
    { dayOfWeek: 3, hour: 15, score: 0.87 },  // Wednesday 3 PM
    { dayOfWeek: 3, hour: 20, score: 0.92 },  // Wednesday 8 PM
    { dayOfWeek: 4, hour: 19, score: 0.93 },  // Thursday 7 PM
    { dayOfWeek: 5, hour: 17, score: 0.95 },  // Friday 5 PM
    { dayOfWeek: 6, hour: 15, score: 0.91 },  // Saturday 3 PM
    { dayOfWeek: 0, hour: 15, score: 0.89 }   // Sunday 3 PM
  ]
};

/**
 * Recommended content frequency by platform (posts per week)
 */
export const RECOMMENDED_FREQUENCY: Record<string, number> = {
  instagram: 3,
  facebook: 2,
  twitter: 5,
  linkedin: 2,
  tiktok: 2,
  mastodon: 3
};

/**
 * Get the next optimal posting time for a platform after a given date
 * 
 * @param platform Platform name
 * @param afterDate Date to find the next time after
 * @param customTimes Optional custom optimal times
 * @returns Date object for the next optimal posting time
 */
export function getNextOptimalTime(
  platform: string,
  afterDate: Date,
  customTimes?: OptimalPostingTime[]
): Date {
  const optimalTimes = customTimes || PLATFORM_BEST_TIMES[platform] || PLATFORM_BEST_TIMES.facebook;
  
  // Start with the given date or current date if none provided
  const startDate = new Date(afterDate);
  
  // Sort times by score descending
  const sortedTimes = [...optimalTimes].sort((a, b) => b.score - a.score);
  
  // Find the next occurrence of one of the optimal times
  const result = new Date(startDate);
  
  // Check days up to 2 weeks out
  for (let i = 0; i < 14; i++) {
    const checkDate = new Date(startDate);
    checkDate.setDate(checkDate.getDate() + i);
    
    for (const time of sortedTimes) {
      // If the day of week matches
      if (checkDate.getDay() === time.dayOfWeek) {
        result.setDate(checkDate.getDate());
        result.setHours(time.hour, 0, 0, 0);
        
        // If this time is in the future from our after date, return it
        if (result > afterDate) {
          return result;
        }
      }
    }
  }
  
  // If no optimal time found within 2 weeks, just add 24 hours to the original date
  const fallbackDate = new Date(afterDate);
  fallbackDate.setDate(fallbackDate.getDate() + 1);
  return fallbackDate;
}

/**
 * Get all scheduled posts for a user within a date range
 * 
 * @param userId User ID
 * @param startDate Start date
 * @param endDate End date
 * @param platforms Optional filter by platforms
 * @returns Array of scheduled posts
 */
export async function getScheduledPosts(
  userId: string,
  startDate: Date,
  endDate: Date,
  platforms?: string[]
): Promise<ScheduledPost[]> {
  try {
    const db = getFirestore();
    
    // Base query
    let query = db.collection('scheduledPosts')
      .where('userId', '==', userId)
      .where('scheduledTime', '>=', startDate)
      .where('scheduledTime', '<=', endDate);
    
    // Apply platform filter if provided
    if (platforms && platforms.length === 1) {
      query = query.where('platform', '==', platforms[0]);
    }
    
    const snapshot = await query.get();
    
    if (snapshot.empty) {
      return [];
    }
    
    const posts = snapshot.docs.map(doc => {
      const data = doc.data() as ScheduledPost;
      
      // Ensure scheduledTime is a Date
      if (typeof data.scheduledTime !== 'string' && !(data.scheduledTime instanceof Date)) {
        // Handle Firestore Timestamp
        data.scheduledTime = (data.scheduledTime as any).toDate();
      }
      
      return {
        id: doc.id,
        ...data
      };
    });
    
    // Filter by platform if multiple platforms were provided
    if (platforms && platforms.length > 1) {
      return posts.filter(post => platforms.includes(post.platform));
    }
    
    return posts;
  } catch (error) {
    console.error('Error getting scheduled posts:', error);
    return [];
  }
}

/**
 * Calculate the best posting time distribution for multiple content items
 * 
 * @param totalItems Number of items to schedule
 * @param daySpan Number of days in the scheduling period
 * @param frequency Desired posts per week
 * @returns Distribution of posts across days
 */
export function calculatePostDistribution(
  totalItems: number,
  daySpan: number,
  frequency: number
): number[] {
  // Calculate items per day based on frequency
  const daysPerWeek = 7;
  const itemsPerDay = frequency / daysPerWeek;
  
  // Calculate total posts allowed in the period
  const maxPosts = Math.min(totalItems, Math.ceil(daySpan * itemsPerDay));
  
  // Initialize distribution array
  const distribution = new Array(daySpan).fill(0);
  
  // Assign posts to days
  let remainingPosts = maxPosts;
  let currentDay = 0;
  
  while (remainingPosts > 0) {
    distribution[currentDay]++;
    remainingPosts--;
    currentDay = (currentDay + Math.ceil(daySpan / maxPosts)) % daySpan;
  }
  
  return distribution;
}

/**
 * Check if a proposed posting time has sufficient gap from existing posts
 * 
 * @param proposedTime Proposed posting time
 * @param existingTimes Array of existing scheduled times
 * @param minGapHours Minimum gap hours between posts
 * @returns True if the proposed time has sufficient gap
 */
export function hasMinimumGap(
  proposedTime: Date,
  existingTimes: Date[],
  minGapHours: number
): boolean {
  const proposedTimestamp = proposedTime.getTime();
  const minGapMillis = minGapHours * 60 * 60 * 1000;
  
  for (const existingTime of existingTimes) {
    const existingTimestamp = existingTime.getTime();
    const gap = Math.abs(proposedTimestamp - existingTimestamp);
    
    if (gap < minGapMillis) {
      return false;
    }
  }
  
  return true;
}

/**
 * Convert day name to day number (0-6)
 * 
 * @param dayName Day name
 * @returns Day number (0 = Sunday, 6 = Saturday)
 */
export function getDayNumber(dayName: string): number {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days.indexOf(dayName.toLowerCase());
}

/**
 * Convert day number to day name
 * 
 * @param dayNumber Day number (0-6)
 * @returns Day name
 */
export function getDayName(dayNumber: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayNumber] || 'Unknown';
}

/**
 * Format a date for display in a schedule
 * 
 * @param date Date to format
 * @param timezone Optional timezone
 * @returns Formatted date string
 */
export function formatScheduleDate(date: Date, timezone: string = 'UTC'): string {
  return date.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezone
  });
}

/**
 * Generate a sequence of dates based on a distribution pattern
 * 
 * @param startDate Start date
 * @param distribution Array of post counts per day
 * @param platformTimes Optimal posting times for each platform
 * @param platform Platform to schedule for
 * @returns Array of scheduled dates
 */
export function generateDateSequence(
  startDate: Date,
  distribution: number[],
  platformTimes: OptimalPostingTime[],
  platform: string
): Date[] {
  const result: Date[] = [];
  const startDay = new Date(startDate);
  startDay.setHours(0, 0, 0, 0);
  
  // Sort platform times by score
  const sortedTimes = [...platformTimes].sort((a, b) => b.score - a.score);
  
  // Generate dates based on distribution
  for (let i = 0; i < distribution.length; i++) {
    const currentDay = new Date(startDay);
    currentDay.setDate(currentDay.getDate() + i);
    const dayOfWeek = currentDay.getDay();
    
    // Get number of posts on this day
    const postsToday = distribution[i];
    
    if (postsToday > 0) {
      // Get best times for this day of week
      const bestTimesForDay = sortedTimes
        .filter(time => time.dayOfWeek === dayOfWeek)
        .slice(0, postsToday);
      
      // If not enough best times for this day, use generic times
      if (bestTimesForDay.length < postsToday) {
        const genericTimes = [10, 12, 15, 17, 19].slice(0, postsToday - bestTimesForDay.length);
        
        // Add generic times for this day
        for (const hour of genericTimes) {
          const postDate = new Date(currentDay);
          postDate.setHours(hour, 0, 0, 0);
          result.push(postDate);
        }
      }
      
      // Add the best times for this day
      for (const time of bestTimesForDay) {
        const postDate = new Date(currentDay);
        postDate.setHours(time.hour, 0, 0, 0);
        result.push(postDate);
      }
    }
  }
  
  // Sort dates chronologically
  return result.sort((a, b) => a.getTime() - b.getTime());
} 