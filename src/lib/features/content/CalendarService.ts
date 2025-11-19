import { getFirebaseFirestore } from '../core/firebase';
import { PlatformType } from '../platforms/models';
import { rrulestr } from 'rrule';
import { v4 as uuidv4 } from 'uuid';
import { firestore } from '@/lib/core/firebase';

export enum PostStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  PUBLISHED = 'published',
  FAILED = 'failed',
  DELETED = 'deleted'
}

export enum RecurrenceFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  CUSTOM = 'custom'
}

export interface ContentAttachment {
  id: string;
  mediaId: string;
  type: string;
  url: string;
  thumbnailUrl?: string;
  altText?: string;
  title?: string;
  description?: string;
}

export interface ContentSchedule {
  publishAt: Date;
  timezone: string;
  recurrence?: {
    frequency: RecurrenceFrequency;
    interval: number;
    count?: number;
    until?: Date;
    byWeekDay?: number[];
    byMonthDay?: number[];
    rrule?: string; // For custom recurrence rules
  };
}

export interface ContentTag {
  id: string;
  name: string;
  color?: string;
}

export interface ContentItem {
  id: string;
  userId: string;
  organizationId?: string;
  title: string;
  content: string;
  platformTargets: {
    platformType: PlatformType;
    accountId: string;
    status: PostStatus;
    platformPostId?: string;
    publishedAt?: Date;
    failureReason?: string;
  }[];
  attachments: ContentAttachment[];
  schedule?: ContentSchedule;
  status: PostStatus;
  tags: string[];
  mentions?: string[];
  hashtags?: string[];
  isRecurring: boolean;
  recurringMasterId?: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end?: Date;
  allDay: boolean;
  contentId?: string;
  platformTypes: PlatformType[];
  status: PostStatus;
  recurring?: boolean;
}

export interface CalendarQueryOptions {
  userId: string;
  organizationId?: string;
  startDate: Date;
  endDate: Date;
  platformTypes?: PlatformType[];
  tags?: string[];
  status?: PostStatus[];
  search?: string;
}

export class CalendarService {
  /**
   * Create a new content item
   */
  async createContent(content: Omit<ContentItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<ContentItem> {
    const id = uuidv4();
    const now = new Date();
    
    const newContent: ContentItem = {
      ...content,
      id,
      createdAt: now,
      updatedAt: now
    };
    
    // If content is recurring, generate the recurrence pattern
    if (content.schedule?.recurrence && content.status === PostStatus.SCHEDULED) {
      newContent.isRecurring = true;
      
      // For simple recurrence, we generate the rrule string
      if (!content.schedule.recurrence.rrule && content.schedule.recurrence.frequency !== RecurrenceFrequency.CUSTOM) {
        newContent.schedule = this.generateRRuleFromSchedule(newContent.schedule!);
      }
    }
    
    await (firestore as any).collection('content').doc(id).set(newContent);
    
    // If content is scheduled and recurring, create upcoming instances
    if (content.status === PostStatus.SCHEDULED && content.isRecurring) {
      await this.generateRecurringInstances(newContent);
    }
    
    return newContent;
  }
  
  /**
   * Update an existing content item
   */
  async updateContent(id: string, updates: Partial<ContentItem>): Promise<ContentItem> {
    const contentRef = (firestore as any).collection('content').doc(id);
    const contentDoc = await contentRef.get();
    
    if (!contentDoc.exists) {
      throw new Error('Content not found');
    }
    
    const content = contentDoc.data() as ContentItem;
    
    // Check if we're updating a recurring parent
    const isRecurringParent = content.isRecurring && !content.recurringMasterId;
    
    // Combine current content with updates
    const updatedContent: ContentItem = {
      ...content,
      ...updates,
      id, // Ensure ID doesn't change
      updatedAt: new Date()
    };
    
    // Update recurrence rule if schedule is changing
    if (updates.schedule && updatedContent.isRecurring) {
      updatedContent.schedule = this.generateRRuleFromSchedule(updatedContent.schedule!);
    }
    
    await contentRef.update(updatedContent);
    
    // If this is a recurring parent and the schedule changed, update future instances
    if (isRecurringParent && updates.schedule) {
      await this.updateRecurringInstances(updatedContent);
    }
    
    return updatedContent;
  }
  
  /**
   * Get content item by ID
   */
  async getContent(id: string): Promise<ContentItem | null> {
    const contentDoc = await (firestore as any).collection('content').doc(id).get();
    
    if (!contentDoc.exists) {
      return null;
    }
    
    return contentDoc.data() as ContentItem;
  }
  
  /**
   * Delete content item
   */
  async deleteContent(id: string, deleteRecurring: boolean = false): Promise<boolean> {
    const contentRef = (firestore as any).collection('content').doc(id);
    const contentDoc = await contentRef.get();
    
    if (!contentDoc.exists) {
      return false;
    }
    
    const content = contentDoc.data() as ContentItem;
    
    // Check if this is a recurring parent
    const isRecurringParent = content.isRecurring && !content.recurringMasterId;
    
    // If this is a recurring parent and we want to delete all instances
    if (isRecurringParent && deleteRecurring) {
      // Find and delete all child instances
      const childrenSnapshot = await (firestore as any).collection('content')
        .where('recurringMasterId', '==', id)
        .get();
      
      const batch = (firestore as any).batch();
      
      childrenSnapshot.forEach((doc: any) => {
        batch.delete(doc.ref);
      });
      
      // Delete the parent too
      batch.delete(contentRef);
      
      await batch.commit();
    } 
    // If this is a recurring parent but we only want to delete this one
    else if (isRecurringParent) {
      // Mark as deleted but keep for reference
      await contentRef.update({
        status: PostStatus.DELETED,
        updatedAt: new Date()
      });
    } 
    // Regular delete for non-recurring or child instances
    else {
      await contentRef.delete();
    }
    
    return true;
  }
  
  /**
   * Get calendar events
   */
  async getCalendarEvents(options: CalendarQueryOptions): Promise<CalendarEvent[]> {
    const { userId, organizationId, startDate, endDate, platformTypes, tags, status, search } = options;
    
    let query: any = (firestore as any).collection('content')
      .where('userId', '==', userId);
    
    // Filter by organization if provided
    if (organizationId) {
      query = query.where('organizationId', '==', organizationId);
    }
    
    // Filter for scheduled or published content only
    if (status && status.length > 0) {
      query = query.where('status', 'in', status);
    } else {
      query = query.where('status', 'in', [PostStatus.SCHEDULED, PostStatus.PUBLISHED]);
    }
    
    // Execute the query
    const snapshot = await query.get();
    
    // For this example, we do client-side filtering for some filters, 
    // though in a real implementation, compound indexes could be used
    const events: CalendarEvent[] = [];
    
    snapshot.forEach((doc: any) => {
      const content = doc.data() as ContentItem;
      
      // Filter by date range
      const contentDate = content.schedule?.publishAt || content.platformTargets?.[0]?.publishedAt;
      
      if (!contentDate || new Date(contentDate) < startDate || new Date(contentDate) > endDate) {
        return;
      }
      
      // Filter by platform types
      if (platformTypes && platformTypes.length > 0) {
        const hasTargetPlatform = content.platformTargets.some(target => 
          platformTypes.includes(target.platformType)
        );
        
        if (!hasTargetPlatform) {
          return;
        }
      }
      
      // Filter by tags
      if (tags && tags.length > 0) {
        const hasTag = content.tags.some(tag => tags.includes(tag));
        
        if (!hasTag) {
          return;
        }
      }
      
      // Filter by search term
      if (search) {
        const searchLower = search.toLowerCase();
        const contentLower = content.content.toLowerCase();
        const titleLower = content.title.toLowerCase();
        
        if (!contentLower.includes(searchLower) && !titleLower.includes(searchLower)) {
          return;
        }
      }
      
      // Create calendar event
      const event: CalendarEvent = {
        id: content.id,
        title: content.title || content.content.substring(0, 50) + (content.content.length > 50 ? '...' : ''),
        start: new Date(contentDate),
        allDay: false,
        contentId: content.id,
        platformTypes: content.platformTargets.map(target => target.platformType),
        status: content.status,
        recurring: content.isRecurring
      };
      
      events.push(event);
    });
    
    return events;
  }
  
  /**
   * Get pending scheduled posts for processing
   */
  async getPendingScheduledPosts(limit: number = 10): Promise<ContentItem[]> {
    const now = new Date();
    
    // Get scheduled posts that are due
    const snapshot = await (firestore as any).collection('content')
      .where('status', '==', PostStatus.SCHEDULED)
      .where('schedule.publishAt', '<=', now)
      .limit(limit)
      .get();
    
    const posts: ContentItem[] = [];
    
    snapshot.forEach((doc: any) => {
      posts.push(doc.data() as ContentItem);
    });
    
    return posts;
  }
  
  /**
   * Mark content as published
   */
  async markAsPublished(contentId: string, platformData: Record<string, any>): Promise<void> {
    const contentRef = (firestore as any).collection('content').doc(contentId);
    const contentDoc = await contentRef.get();
    
    if (!contentDoc.exists) {
      throw new Error('Content not found');
    }
    
    const content = contentDoc.data() as ContentItem;
    
    // Set platform-specific data
    for (const target of content.platformTargets) {
      const targetPlatformData = platformData[target.platformType];
      if (targetPlatformData) {
        target.status = PostStatus.PUBLISHED;
        target.platformPostId = targetPlatformData.postId;
        target.publishedAt = new Date();
      }
    }
    
    // Update the content
    await contentRef.update({
      platformTargets: content.platformTargets,
      status: PostStatus.PUBLISHED,
      updatedAt: new Date()
    });
    
    // If this is a recurring post, prepare next instance
    if (content.isRecurring && content.schedule?.recurrence) {
      await this.prepareNextRecurringInstance(content);
    }
  }
  
  /**
   * Mark content post as failed
   */
  async markAsFailed(contentId: string, platformType: PlatformType, reason: string): Promise<void> {
    const contentRef = (firestore as any).collection('content').doc(contentId);
    const contentDoc = await contentRef.get();
    
    if (!contentDoc.exists) {
      throw new Error('Content not found');
    }
    
    const content = contentDoc.data() as ContentItem;
    
    // Update the specific platform target
    const updatedTargets = content.platformTargets.map(target => {
      if (target.platformType === platformType) {
        return {
          ...target,
          status: PostStatus.FAILED,
          failureReason: reason
        };
      }
      return target;
    });
    
    // If all targets failed, mark the content as failed
    const allFailed = updatedTargets.every(target => target.status === PostStatus.FAILED);
    
    await contentRef.update({
      platformTargets: updatedTargets,
      status: allFailed ? PostStatus.FAILED : content.status,
      updatedAt: new Date()
    });
  }
  
  /**
   * Reschedule a content item
   */
  async rescheduleContent(contentId: string, newSchedule: ContentSchedule): Promise<ContentItem> {
    const contentRef = (firestore as any).collection('content').doc(contentId);
    const contentDoc = await contentRef.get();
    
    if (!contentDoc.exists) {
      throw new Error('Content not found');
    }
    
    const content = contentDoc.data() as ContentItem;
    
    // Update the schedule
    const updatedContent = {
      ...content,
      schedule: newSchedule,
      status: PostStatus.SCHEDULED,
      updatedAt: new Date()
    };
    
    await contentRef.update(updatedContent);
    
    return updatedContent as ContentItem;
  }
  
  /**
   * Generate recurring instances of content
   */
  private async generateRecurringInstances(content: ContentItem, count: number = 10): Promise<void> {
    if (!content.schedule?.recurrence || !content.schedule.publishAt) {
      return;
    }
    
    const baseDate = new Date(content.schedule.publishAt);
    let rrule;
    
    // Parse the RRule
    try {
      rrule = rrulestr(content.schedule.recurrence.rrule || '');
    } catch (error) {
      console.error('Error parsing recurrence rule:', error);
      return;
    }
    
    // Generate the next occurrences
    const occurrences = rrule.after(baseDate, false);
    
    // Create instances for each occurrence
    const batch = (firestore as any).batch();
    
    if (occurrences && Array.isArray(occurrences)) {
      for (let i = 0; i < Math.min(occurrences.length, count); i++) {
        const occurrence = occurrences[i];
        const instanceId = uuidv4();
        
        // Create a new content item based on the master
        const instance: ContentItem = {
          ...content,
          id: instanceId,
          recurringMasterId: content.id,
          schedule: {
            ...content.schedule,
            publishAt: occurrence
          },
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        batch.set((firestore as any).collection('content').doc(instanceId), instance);
      }
    }
    
    await batch.commit();
  }
  
  /**
   * Prepare the next instance of a recurring post after publishing
   */
  private async prepareNextRecurringInstance(content: ContentItem): Promise<void> {
    if (!content.schedule?.recurrence || !content.schedule?.recurrence.rrule) {
      return;
    }
    
    const baseDate = new Date(content.schedule.publishAt);
    let rrule;
    
    // Parse the RRule
    try {
      rrule = rrulestr(content.schedule.recurrence.rrule);
    } catch (error) {
      console.error('Error parsing recurrence rule:', error);
      return;
    }
    
    // Get the next occurrence
    const nextOccurrence = rrule.after(baseDate);
    
    if (!nextOccurrence) {
      // No more occurrences
      return;
    }
    
    // Create the next instance
    const instanceId = uuidv4();
    const now = new Date();
    
    // Create a new content item based on the master
    const instance: ContentItem = {
      ...content,
      id: instanceId,
      recurringMasterId: content.recurringMasterId || content.id,
      schedule: {
        ...content.schedule,
        publishAt: nextOccurrence
      },
      status: PostStatus.SCHEDULED,
      createdAt: now,
      updatedAt: now
    };
    
    await (firestore as any).collection('content').doc(instanceId).set(instance);
  }
  
  /**
   * Update recurring instances when the master is updated
   */
  private async updateRecurringInstances(content: ContentItem): Promise<void> {
    // Find existing instances
    const snapshot = await (firestore as any).collection('content')
      .where('recurringMasterId', '==', content.id)
      .where('status', '==', PostStatus.SCHEDULED) // Only update future occurrences
      .get();
    
    // Delete existing future instances
    const batch = (firestore as any).batch();
    
    snapshot.forEach((doc: any) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    
    // Generate new instances
    await this.generateRecurringInstances(content);
  }
  
  /**
   * Generate an RRule string from a schedule
   */
  private generateRRuleFromSchedule(schedule: ContentSchedule): ContentSchedule {
    if (!schedule.recurrence) {
      return schedule;
    }
    
    const { frequency, interval, count, until, byWeekDay, byMonthDay } = schedule.recurrence;
    
    let rule = 'RRULE:FREQ=';
    
    // Add frequency
    switch (frequency) {
      case RecurrenceFrequency.DAILY:
        rule += 'DAILY';
        break;
      case RecurrenceFrequency.WEEKLY:
        rule += 'WEEKLY';
        break;
      case RecurrenceFrequency.MONTHLY:
        rule += 'MONTHLY';
        break;
      default:
        // For custom rules, user must provide the rrule directly
        return schedule;
    }
    
    // Add interval
    rule += `;INTERVAL=${interval || 1}`;
    
    // Add count or until
    if (count) {
      rule += `;COUNT=${count}`;
    } else if (until) {
      const untilStr = until.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
      rule += `;UNTIL=${untilStr}`;
    }
    
    // Add weekdays for weekly recurrence
    if (frequency === RecurrenceFrequency.WEEKLY && byWeekDay && byWeekDay.length > 0) {
      const days = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
      const byDayStr = byWeekDay.map(day => days[day]).join(',');
      rule += `;BYDAY=${byDayStr}`;
    }
    
    // Add monthdays for monthly recurrence
    if (frequency === RecurrenceFrequency.MONTHLY && byMonthDay && byMonthDay.length > 0) {
      rule += `;BYMONTHDAY=${byMonthDay.join(',')}`;
    }
    
    // Return updated schedule with rrule
    return {
      ...schedule,
      recurrence: {
        ...schedule.recurrence,
        rrule: rule
      }
    };
  }
}

// Create and export singleton instance
const calendarService = new CalendarService();
export default calendarService;