import { logger } from '@/lib/logging/logger';
import { firestore } from '@/lib/firebase/config';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp 
} from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import calendarService, { ContentItem, ContentSchedule, PostStatus } from './CalendarService';
import { PlatformType } from '../platforms/PlatformProvider';
import Papa from 'papaparse';

export interface BulkScheduleItem {
  title: string;
  content: string;
  platformTypes: PlatformType[];
  scheduleDate: Date;
  mediaUrls?: string[];
  hashtags?: string[];
  tags?: string[];
}

export interface BulkScheduleJob {
  id: string;
  userId: string;
  organizationId?: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalItems: number;
  processedItems: number;
  successfulItems: number;
  failedItems: number;
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BulkScheduleResult {
  job: BulkScheduleJob;
  successItems: ContentItem[];
  failedItems: {
    item: BulkScheduleItem;
    error: string;
  }[];
}

export enum TimeSlotStrategy {
  FIXED = 'fixed',         // Fixed time slots
  OPTIMIZED = 'optimized', // Optimized for audience engagement
  SPREAD = 'spread',       // Evenly spread throughout the day
  RANDOM = 'random'        // Random times within allowed hours
}

export interface TimeSlotConfig {
  strategy: TimeSlotStrategy;
  startHour?: number;      // Hour to start posting (0-23)
  endHour?: number;        // Hour to end posting (0-23)
  fixedSlots?: string[];   // Specific time slots for FIXED strategy (HH:MM format)
  postsPerDay?: number;    // For SPREAD strategy
  minTimeBetween?: number; // Minimum minutes between posts
  timezone: string;        // Timezone for scheduling
}

/**
 * Service for bulk scheduling content across multiple platforms
 */
export class BulkSchedulingService {
  /**
   * Schedule multiple content items in bulk
   */
  async scheduleBulk(
    items: BulkScheduleItem[],
    userId: string,
    jobName: string,
    organizationId?: string
  ): Promise<BulkScheduleJob> {
    if (items.length === 0) {
      throw new Error('No items to schedule');
    }
    
    // Create a new bulk scheduling job
    const jobId = uuidv4();
    const now = new Date();
    
    const job: BulkScheduleJob = {
      id: jobId,
      userId,
      organizationId,
      name: jobName,
      status: 'pending',
      totalItems: items.length,
      processedItems: 0,
      successfulItems: 0,
      failedItems: 0,
      createdAt: now,
      updatedAt: now
    };
    
    // Save the job
    await setDoc(doc(firestore, 'bulk_schedule_jobs', jobId), job);
    
    // Process the items in the background
    // In a production app, this should be handled by a queue/worker system
    this.processScheduleItems(job, items).catch(error => {
      console.error('Error processing bulk schedule:', error);
    });
    
    return job;
  }
  
  /**
   * Process bulk scheduling job items
   * This is a background process that should not block the API response
   */
  private async processScheduleItems(job: BulkScheduleJob, items: BulkScheduleItem[]): Promise<void> {
    // Update job status to processing
    job.status = 'processing';
    job.startedAt = new Date();
    job.updatedAt = new Date();
    
    await updateDoc(doc(firestore, 'bulk_schedule_jobs', job.id), job);
    
    const successItems: ContentItem[] = [];
    const failedItems: { item: BulkScheduleItem; error: string }[] = [];
    
    // Process each item
    for (const item of items) {
      try {
        // Create a content item for each platform target
        for (const platformType of item.platformTypes) {
          // Prepare schedule
          const schedule: ContentSchedule = {
            publishAt: item.scheduleDate,
            timezone: 'UTC' // Default to UTC, can be customized per job
          };
          
          // Convert BulkScheduleItem to ContentItem format
          const contentItem: Omit<ContentItem, 'id' | 'createdAt' | 'updatedAt'> = {
            userId: job.userId,
            organizationId: job.organizationId,
            title: item.title,
            content: item.content,
            platformTargets: [
              {
                platformType,
                accountId: '', // This will be filled by the publishing service
                status: PostStatus.SCHEDULED
              }
            ],
            attachments: item.mediaUrls ? item.mediaUrls.map((url, index) => ({
              id: uuidv4(),
              mediaId: '', // This will be filled by the media service
              type: this.guessMediaType(url),
              url,
              thumbnailUrl: '',
              altText: `${item.title} - attachment ${index + 1}`
            })) : [],
            schedule,
            status: PostStatus.SCHEDULED,
            tags: item.tags || [],
            hashtags: item.hashtags || [],
            isRecurring: false
          };
          
          // Create the content item
          const createdItem = await calendarService.createContent(contentItem);
          successItems.push(createdItem);
          job.successfulItems++;
        }
      } catch (error) {
        // Record failure
        failedItems.push({
          item,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        job.failedItems++;
      }
      
      job.processedItems++;
      
      // Update job progress every 10 items or at the end
      if (job.processedItems % 10 === 0 || job.processedItems === job.totalItems) {
        job.updatedAt = new Date();
        await updateDoc(doc(firestore, 'bulk_schedule_jobs', job.id), {
          processedItems: job.processedItems,
          successfulItems: job.successfulItems,
          failedItems: job.failedItems,
          updatedAt: job.updatedAt
        });
      }
    }
    
    // Update job status to completed
    job.status = job.failedItems === 0 ? 'completed' : 'completed';
    job.completedAt = new Date();
    job.updatedAt = new Date();
    
    await updateDoc(doc(firestore, 'bulk_schedule_jobs', job.id), job);
    
    // Save detailed results
    await setDoc(doc(firestore, 'bulk_schedule_results', job.id), {
      jobId: job.id,
      successItemIds: successItems.map(item => item.id),
      failedItems
    });
  }
  
  /**
   * Get a bulk schedule job by ID
   */
  async getJob(jobId: string): Promise<BulkScheduleJob | null> {
    const docRef = doc(firestore, 'bulk_schedule_jobs', jobId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }
    
    return docSnap.data() as BulkScheduleJob;
  }
  
  /**
   * Get all bulk schedule jobs for a user
   */
  async getJobs(userId: string): Promise<BulkScheduleJob[]> {
    const jobsRef = collection(firestore, 'bulk_schedule_jobs');
    const q = query(jobsRef, where('userId', '==', userId), orderBy('createdAt', 'desc'), limit(10));
    const snapshot = await getDocs(q);
    
    const jobs: BulkScheduleJob[] = [];
    
    snapshot.forEach(doc => {
      jobs.push(doc.data() as BulkScheduleJob);
    });
    
    return jobs;
  }
  
  /**
   * Get detailed results for a bulk schedule job
   */
  async getJobResults(jobId: string): Promise<BulkScheduleResult | null> {
    const [jobDoc, resultsDoc] = await Promise.all([
      getDoc(doc(firestore, 'bulk_schedule_jobs', jobId)),
      getDoc(doc(firestore, 'bulk_schedule_results', jobId))
    ]);
    
    if (!jobDoc.exists() || !resultsDoc.exists()) {
      return null;
    }
    
    const job = jobDoc.data() as BulkScheduleJob;
    const results = resultsDoc.data();
    
    // Get the successful content items
    const successItems: ContentItem[] = [];
    
    if (results.successItemIds && results.successItemIds.length > 0) {
      // Get in batches of 10 to avoid large queries
      for (let i = 0; i < results.successItemIds.length; i += 10) {
        const batchIds = results.successItemIds.slice(i, i + 10);
        const contentDocs = await Promise.all(
          batchIds.map(id => getDoc(doc(firestore, 'content', id)))
        );
        
        contentDocs.forEach(doc => {
          if (doc.exists()) {
            successItems.push(doc.data() as ContentItem);
          }
        });
      }
    }
    
    return {
      job,
      successItems,
      failedItems: results.failedItems || []
    };
  }
  
  /**
   * Cancel a bulk schedule job
   * This will stop processing any remaining items
   */
  async cancelJob(jobId: string): Promise<boolean> {
    const jobRef = doc(firestore, 'bulk_schedule_jobs', jobId);
    const jobDoc = await getDoc(jobRef);
    
    if (!jobDoc.exists()) {
      return false;
    }
    
    const job = jobDoc.data() as BulkScheduleJob;
    
    // Can only cancel pending or processing jobs
    if (job.status !== 'pending' && job.status !== 'processing') {
      return false;
    }
    
    // Update job status
    await updateDoc(jobRef, {
      status: 'failed',
      errorMessage: 'Job cancelled by user',
      updatedAt: Timestamp.fromDate(new Date())
    });
    
    return true;
  }
  
  /**
   * Parse CSV data into bulk schedule items
   */
  parseCsvToScheduleItems(csvData: string): BulkScheduleItem[] {
    const results = Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true
    });
    
    if (results.errors.length > 0) {
      throw new Error(`CSV parsing error: ${results.errors[0].message}`);
    }
    
    return results.data.map((row: any) => {
      // Validate required fields
      if (!row.title || !row.content || !row.platforms || !row.scheduleDate) {
        throw new Error('Missing required fields in CSV');
      }
      
      // Parse platform types
      const platformTypes = row.platforms
        .split(',')
        .map((p: string) => p.trim().toUpperCase())
        .filter((p: string) => Object.values(PlatformType).includes(p as PlatformType))
        .map((p: string) => p as PlatformType);
      
      if (platformTypes.length === 0) {
        throw new Error(`Invalid platform types for item "${row.title}"`);
      }
      
      // Parse schedule date
      const scheduleDate = new Date(row.scheduleDate);
      
      if (isNaN(scheduleDate.getTime())) {
        throw new Error(`Invalid date format for item "${row.title}"`);
      }
      
      // Create bulk schedule item
      const item: BulkScheduleItem = {
        title: row.title,
        content: row.content,
        platformTypes,
        scheduleDate
      };
      
      // Add optional fields if present
      if (row.mediaUrls) {
        item.mediaUrls = row.mediaUrls.split(',').map((url: string) => url.trim());
      }
      
      if (row.hashtags) {
        item.hashtags = row.hashtags.split(',').map((tag: string) => tag.trim());
      }
      
      if (row.tags) {
        item.tags = row.tags.split(',').map((tag: string) => tag.trim());
      }
      
      return item;
    });
  }
  
  /**
   * Export schedule items to CSV format
   */
  exportScheduleItemsToCsv(items: BulkScheduleItem[]): string {
    const csvData = items.map(item => ({
      title: item.title,
      content: item.content,
      platforms: item.platformTypes.join(','),
      scheduleDate: item.scheduleDate.toISOString(),
      mediaUrls: item.mediaUrls ? item.mediaUrls.join(',') : '',
      hashtags: item.hashtags ? item.hashtags.join(',') : '',
      tags: item.tags ? item.tags.join(',') : ''
    }));
    
    return Papa.unparse(csvData);
  }
  
  /**
   * Generate optimized time slots for scheduling
   */
  generateTimeSlots(
    startDate: Date,
    endDate: Date,
    count: number,
    config: TimeSlotConfig
  ): Date[] {
    const slots: Date[] = [];
    const dayCount = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    switch (config.strategy) {
      case TimeSlotStrategy.FIXED:
        // Fixed time slots strategy
        if (!config.fixedSlots || config.fixedSlots.length === 0) {
          throw new Error('Fixed time slots strategy requires specified time slots');
        }
        
        // Parse fixed slots
        const timeSlots = config.fixedSlots.map(slot => {
          const [hours, minutes] = slot.split(':').map(Number);
          return { hours, minutes };
        });
        
        // Generate slots for each day
        let currentDate = new Date(startDate);
        
        while (slots.length < count && currentDate <= endDate) {
          for (const slot of timeSlots) {
            if (slots.length >= count) break;
            
            const slotDate = new Date(currentDate);
            slotDate.setHours(slot.hours, slot.minutes, 0, 0);
            
            // Skip slots in the past
            if (slotDate > new Date()) {
              slots.push(slotDate);
            }
          }
          
          // Move to next day
          currentDate.setDate(currentDate.getDate() + 1);
        }
        break;
        
      case TimeSlotStrategy.SPREAD:
        // Evenly spread throughout allowed hours
        const startHour = config.startHour || 9;  // Default 9 AM
        const endHour = config.endHour || 17;     // Default 5 PM
        const postsPerDay = config.postsPerDay || 3;
        const totalDays = Math.min(dayCount, Math.ceil(count / postsPerDay));
        
        // Calculate time interval between posts
        const hoursPerDay = endHour - startHour;
        const interval = hoursPerDay / (postsPerDay + 1); // +1 to avoid posting exactly at start/end hours
        
        // Generate slots for each day
        for (let day = 0; day < totalDays; day++) {
          const dayDate = new Date(startDate);
          dayDate.setDate(dayDate.getDate() + day);
          
          for (let post = 0; post < postsPerDay; post++) {
            if (slots.length >= count) break;
            
            const postHour = startHour + interval * (post + 1);
            const hourPart = Math.floor(postHour);
            const minutePart = Math.round((postHour - hourPart) * 60);
            
            const slotDate = new Date(dayDate);
            slotDate.setHours(hourPart, minutePart, 0, 0);
            
            // Skip slots in the past
            if (slotDate > new Date()) {
              slots.push(slotDate);
            }
          }
        }
        break;
        
      case TimeSlotStrategy.RANDOM:
        // Random times within allowed hours
        const randomStartHour = config.startHour || 9;
        const randomEndHour = config.endHour || 21;
        const minTimeBetween = config.minTimeBetween || 30; // minutes
        
        let lastSlot: Date | null = null;
        
        while (slots.length < count) {
          // Pick a random day between start and end dates
          const randomDay = Math.floor(Math.random() * dayCount);
          const randomDate = new Date(startDate);
          randomDate.setDate(randomDate.getDate() + randomDay);
          
          // Pick a random hour between allowed hours
          const randomHour = randomStartHour + Math.random() * (randomEndHour - randomStartHour);
          const hourPart = Math.floor(randomHour);
          const minutePart = Math.round((randomHour - hourPart) * 60);
          
          randomDate.setHours(hourPart, minutePart, 0, 0);
          
          // Check if this slot is in the future and respects minimum time between posts
          if (randomDate > new Date() && 
              (!lastSlot || (randomDate.getTime() - lastSlot.getTime()) >= minTimeBetween * 60 * 1000)) {
            slots.push(randomDate);
            lastSlot = randomDate;
            
            // Sort slots chronologically
            slots.sort((a, b) => a.getTime() - b.getTime());
          }
        }
        break;
        
      case TimeSlotStrategy.OPTIMIZED:
        // For a real implementation, this would use engagement data
        // For now, we'll use some reasonable defaults
        // Morning peak (9-11 AM), lunch (12-1 PM), evening peak (7-9 PM)
        const peakHours = [
          { start: 9, end: 11 },  // Morning
          { start: 12, end: 13 }, // Lunch
          { start: 19, end: 21 }  // Evening
        ];
        
        let currentDay = new Date(startDate);
        let slotCount = 0;
        
        while (slots.length < count && currentDay <= endDate) {
          // Distribute posts among peak hours
          for (const peak of peakHours) {
            if (slots.length >= count) break;
            
            const peakSpan = peak.end - peak.start;
            const randomOffset = Math.random() * peakSpan;
            const hour = peak.start + randomOffset;
            const hourPart = Math.floor(hour);
            const minutePart = Math.round((hour - hourPart) * 60);
            
            const slotDate = new Date(currentDay);
            slotDate.setHours(hourPart, minutePart, 0, 0);
            
            // Skip slots in the past
            if (slotDate > new Date()) {
              slots.push(slotDate);
              slotCount++;
            }
          }
          
          // Move to next day
          currentDay.setDate(currentDay.getDate() + 1);
        }
        break;
    }
    
    // Sort slots chronologically
    return slots.sort((a, b) => a.getTime() - b.getTime());
  }
  
  /**
   * Distribute content items across time slots
   */
  distributeContentToTimeSlots(
    items: Omit<BulkScheduleItem, 'scheduleDate'>[],
    timeSlots: Date[]
  ): BulkScheduleItem[] {
    if (items.length > timeSlots.length) {
      throw new Error('Not enough time slots for all content items');
    }
    
    // Create a copy of items and assign time slots
    return items.map((item, index) => ({
      ...item,
      scheduleDate: timeSlots[index]
    }));
  }
  
  /**
   * Guess media type from URL
   */
  private guessMediaType(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase();
    
    if (!extension) {
      return 'image'; // Default assumption
    }
    
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
    const videoExtensions = ['mp4', 'mov', 'avi', 'wmv', 'flv', 'webm', 'mkv'];
    
    if (imageExtensions.includes(extension)) {
      return 'image';
    } else if (videoExtensions.includes(extension)) {
      return 'video';
    } else {
      return 'link';
    }
  }
}

// Create and export singleton instance
const bulkSchedulingService = new BulkSchedulingService();
export default bulkSchedulingService; 