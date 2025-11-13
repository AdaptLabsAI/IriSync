import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  Timestamp, 
  orderBy, 
  limit as firestoreLimit,
  startAt,
  endAt,
  getDoc
} from 'firebase/firestore';
import { firestore as db } from '../../../lib/core/firebase';
import logger from '../../../lib/logging/logger';
import { PlatformAdapter } from '../../platforms/adapters';
import { PlatformType, PlatformAuthData } from '../../platforms/models';

// Define interfaces for platform capabilities and action results since the imports aren't found
interface PlatformCapabilities {
  scheduling: boolean;
  publishing: boolean;
  mediaUpload: boolean;
  analytics: boolean;
}

interface PlatformActionResult {
  success: boolean;
  errorMessage?: string;
  platformContentId?: string;
}

/**
 * Calendar event types
 */
export enum CalendarEventType {
  POST = 'post',
  STORY = 'story',
  REEL = 'reel',
  VIDEO = 'video',
  ARTICLE = 'article',
  TASK = 'task',
  REMINDER = 'reminder'
}

/**
 * Calendar event status
 */
export enum CalendarEventStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  PUBLISHED = 'published',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

/**
 * Calendar event interface
 */
export interface CalendarEvent {
  id?: string;
  organizationId: string;     // Organization that owns this event (required)
  createdByUserId: string;    // User who created the event
  updatedByUserId?: string;   // User who last updated the event
  title: string;
  description?: string;
  type: CalendarEventType;
  status: CalendarEventStatus;
  scheduledTime: Timestamp;
  duration?: number; // in minutes
  platforms: {
    platformId: string;
    platformSpecificId?: string;
    status: 'pending' | 'scheduled' | 'published' | 'failed';
    errorMessage?: string;
    publishedUrl?: string;
  }[];
  contentId?: string; // Reference to content document if applicable
  mediaIds?: string[]; // References to media if applicable
  recurrenceRule?: string; // iCalendar RFC 5545 format
  tags?: string[];
  color?: string;
  metadata?: Record<string, any>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastPublishedAt?: Timestamp;
  team?: string;            // Optional team ID within the organization
  assignedToUserId?: string; // User assigned to this event (e.g., for tasks)
}

/**
 * Calendar query result interface
 */
export interface CalendarQueryResult {
  events: CalendarEvent[];
  totalCount: number;
  hasMore: boolean;
}

/** * Production platform adapter integration */
// Helper function to convert string to PlatformType
function mapStringToPlatformType(platformId: string): PlatformType | undefined {
  const upperCasePlatformId = platformId.toUpperCase();
  if (upperCasePlatformId in PlatformType) {
    return PlatformType[upperCasePlatformId as keyof typeof PlatformType];
  }
  // Handle cases like 'twitter_v2' or other specific IDs if necessary
  // For now, assume direct mapping or it's an error
  logger.warn('Unknown platformId for PlatformType mapping', { platformId });
  return undefined;
}

async function getPlatformAdapter(platformId: string, organizationId: string): 
Promise<{  
  getCapabilities: () => PlatformCapabilities;  
  scheduleContent: (contentId: string, scheduledTime: Date) => Promise<PlatformActionResult>;  
  unscheduleContent: (platformContentId: string) => Promise<PlatformActionResult>;
} | null> {  
  try {    
    logger.info('Getting platform adapter for organization', 
      { platformId, organizationId });        
    // Get the platform connection from organization's platform connections    
    const { getPlatformConnection } = await import('../../platforms/server');    
    const connection = await getPlatformConnection(platformId, organizationId);
    if (!connection) {      
      logger.warn('Platform connection not found', 
        { platformId, organizationId });      
      return null;    
    }        
    
    // Convert platformId string to PlatformType enum
    const platformType = mapStringToPlatformType(platformId);
    if (!platformType) {
      logger.error('Invalid platformId, cannot map to PlatformType', { platformId, organizationId });
      return null;
    }

    // Import and create the appropriate platform adapter    
    const { PlatformAdapterFactory } = await import('../../platforms/adapters/PlatformAdapterFactory');
    const adapter = PlatformAdapterFactory.getAdapter(platformType);

    if (!adapter) {      
      logger.error('Failed to create platform adapter', 
        { platformId, organizationId });      
      return null;    
    }

    // Initialize the adapter with the connection details
    // Assuming 'connection' is compatible with PlatformAuthData or can be mapped
    await adapter.initialize(connection as PlatformAuthData); 

    return {      
      getCapabilities: () => ({        
        scheduling: true,        
        publishing: true,        
        mediaUpload: true,        
        analytics: true      
      }),      
      scheduleContent: async (contentId, scheduledTime) => {        
        try {          
          // Get content details          
          const { getDoc, doc } = await import('firebase/firestore');          
          const { firestore } = await import('../../firebase');                    
          const contentRef = doc(firestore, 'content', contentId);          
          const contentDoc = await getDoc(contentRef);                    
          if (!contentDoc.exists()) {            
            return {              
              success: false,              
              errorMessage: 'Content not found'            
            };          
          }                    
          const content = contentDoc.data();                    
          // Use the adapter to schedule the content          
          const result = await (adapter as any).schedulePost({            
            text: content.text || '',            
            mediaUrls: content.mediaUrls || [],            
            scheduledTime: scheduledTime          
          });                    
          return {            
            success: result.success,            
            platformContentId: result.postId,            
            errorMessage: result.error          
          };        
        } catch (error) {          
          logger.error('Error scheduling content on platform', 
            { error, contentId, platformId });          
            return {            
              success: false,            
              errorMessage: error instanceof Error ? error.message : 'Unknown error'          
            };        
          }      
        },      
        unscheduleContent: async (platformContentId) => {        
          try {          
            const result = await (adapter as any).deletePost(platformContentId);          
            return {            
              success: result.success,            
              errorMessage: result.error          
            };        
          } catch (error) {          
            logger.error('Error unscheduling content on platform', 
              { error, platformContentId, platformId });          
              return {            
                success: false,            
                errorMessage: error instanceof Error ? error.message : 'Unknown error'          
              };        
            }      
          }    
        };  
      } catch (error) {    
        logger.error('Error getting platform adapter for organization', 
          { error, platformId, organizationId });    
          return null;  
        }}

/**
 * Calendar manager class to handle calendar events at the organization level
 */
export class CalendarManager {
  private readonly EVENTS_COLLECTION = 'calendarEvents';

  /**
   * Create a new calendar event for an organization
   * @param organizationId Organization that owns the event
   * @param userId User creating the event
   * @param event Event data
   * @returns Created event with ID
   */
  async createEvent(
    organizationId: string,
    userId: string,
    event: Omit<CalendarEvent, 'id' | 'organizationId' | 'createdByUserId' | 'createdAt' | 'updatedAt'>
  ): Promise<CalendarEvent> {
    try {
      // Prepare event data with organization and user info
      const now = Timestamp.now();
      const eventData: Omit<CalendarEvent, 'id'> = {
        ...event,
        organizationId,
        createdByUserId: userId,
        createdAt: now,
        updatedAt: now
      };
      
      // Validate event data
      this.validateEvent(eventData);
      
      // Add event to Firestore
      const docRef = await addDoc(collection(db, this.EVENTS_COLLECTION), eventData);
      
      // Schedule event if status is SCHEDULED
      const createdEvent = { id: docRef.id, ...eventData };
      
      if (event.status === CalendarEventStatus.SCHEDULED) {
        try {
          await this.scheduleEventOnPlatforms(createdEvent);
        } catch (scheduleError) {
          logger.error('Failed to schedule event on platforms during creation', {
            eventId: docRef.id,
            organizationId,
            userId,
            error: scheduleError
          });
          // We don't throw here to still return the created event
        }
      }
      
      logger.info('Created calendar event', { 
        eventId: docRef.id,
        organizationId,
        userId,
        type: event.type
      });
      
      return createdEvent;
    } catch (error) {
      logger.error('Error creating calendar event', { 
        error, 
        organizationId,
        userId
      });
      throw error;
    }
  }

  /**
   * Update an existing calendar event
   * @param eventId Event ID to update
   * @param userId User making the update
   * @param updates Partial event data to update
   * @returns Updated event
   */
  async updateEvent(
    eventId: string,
    userId: string,
    updates: Partial<Omit<CalendarEvent, 'id' | 'organizationId' | 'createdByUserId' | 'createdAt' | 'updatedAt'>>
  ): Promise<CalendarEvent> {
    try {
      // Get current event data
      const event = await this.getEvent(eventId);
      
      if (!event) {
        throw new Error(`Event not found: ${eventId}`);
      }
      
      // Check if time was changed and event is scheduled
      const timeChanged = updates.scheduledTime && 
                         !this.areSameTimestamps(updates.scheduledTime, event.scheduledTime);
      
      const wasScheduled = event.status === CalendarEventStatus.SCHEDULED;
      const nowScheduled = updates.status === CalendarEventStatus.SCHEDULED;
      
      // Prepare update data
      const now = Timestamp.now();
      const updateData: Record<string, any> = {
        ...updates,
        updatedByUserId: userId,
        updatedAt: now
      };
      
      // Update event in Firestore
      const eventRef = doc(db, this.EVENTS_COLLECTION, eventId);
      await updateDoc(eventRef, updateData);
      
      // Get updated event
      const updatedEvent = {
        ...event,
        ...updateData
      };
      
      // Handle scheduling changes
      if (wasScheduled && timeChanged) {
        // If event was already scheduled and time changed, update the schedule
        await this.unscheduleEventFromPlatforms(updatedEvent);
        await this.scheduleEventOnPlatforms(updatedEvent);
      } else if (!wasScheduled && nowScheduled) {
        // If event wasn't scheduled before but is now, schedule it
        await this.scheduleEventOnPlatforms(updatedEvent);
      } else if (wasScheduled && updates.status && updates.status !== CalendarEventStatus.SCHEDULED) {
        // If event was scheduled but now isn't, unschedule it
        await this.unscheduleEventFromPlatforms(updatedEvent);
      }
      
      logger.info('Updated calendar event', { 
        eventId, 
        organizationId: event.organizationId,
        userId
      });
      
      return updatedEvent;
    } catch (error) {
      logger.error('Error updating calendar event', { 
        error, 
        eventId, 
        userId 
      });
      throw error;
    }
  }

  /**
   * Delete a calendar event
   * @param eventId Event ID to delete
   * @param userId User performing the deletion
   * @returns Success status
   */
  async deleteEvent(eventId: string, userId: string): Promise<boolean> {
    try {
      // Get current event data
      const event = await this.getEvent(eventId);
      
      if (!event) {
        logger.warn('Event not found for deletion', { eventId, userId });
        return true; // Treat as already deleted
      }
      
      // If event was scheduled, unschedule it from platforms
      if (event.status === CalendarEventStatus.SCHEDULED) {
        try {
          await this.unscheduleEventFromPlatforms(event);
        } catch (unscheduleError) {
          logger.error('Failed to unschedule event from platforms during deletion', {
            eventId,
            organizationId: event.organizationId,
            userId,
            error: unscheduleError
          });
          // Continue with deletion even if unscheduling fails
        }
      }
      
      // Delete event from Firestore
      const eventRef = doc(db, this.EVENTS_COLLECTION, eventId);
      await deleteDoc(eventRef);
      
      logger.info('Deleted calendar event', { 
        eventId, 
        organizationId: event.organizationId,
        userId 
      });
      
      return true;
    } catch (error) {
      logger.error('Error deleting calendar event', { 
        error, 
        eventId, 
        userId 
      });
      throw error;
    }
  }

  /**
   * Get a calendar event by ID
   * @param eventId Event ID to get
   * @returns Calendar event or null if not found
   */
  async getEvent(eventId: string): Promise<CalendarEvent | null> {
    try {
      const eventRef = doc(db, this.EVENTS_COLLECTION, eventId);
      const eventDoc = await getDoc(eventRef);
      
      if (!eventDoc.exists()) {
        return null;
      }
      
      return {
        id: eventDoc.id,
        ...eventDoc.data()
      } as CalendarEvent;
    } catch (error) {
      logger.error('Error getting calendar event', { error, eventId });
      throw error;
    }
  }

  /**
   * Get calendar events for an organization within a date range
   * @param organizationId Organization ID
   * @param startDate Start date
   * @param endDate End date
   * @param options Query options
   * @returns Calendar events
   */
  async getOrganizationEvents(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    options: {
      limit?: number;
      types?: CalendarEventType[];
      statuses?: CalendarEventStatus[];
      platformId?: string;
      tags?: string[];
      team?: string;
      assignedToUserId?: string;
    } = {}
  ): Promise<CalendarQueryResult> {
    try {
      // Convert dates to Firestore Timestamps
      const startTimestamp = Timestamp.fromDate(startDate);
      const endTimestamp = Timestamp.fromDate(endDate);
      
      // Build query
      let eventsQuery = query(
        collection(db, this.EVENTS_COLLECTION),
        where('organizationId', '==', organizationId),
        where('scheduledTime', '>=', startTimestamp),
        where('scheduledTime', '<=', endTimestamp)
      );
      
      // Apply optional filters
      if (options.types && options.types.length > 0) {
        eventsQuery = query(eventsQuery, where('type', 'in', options.types));
      }
      
      if (options.statuses && options.statuses.length > 0) {
        eventsQuery = query(eventsQuery, where('status', 'in', options.statuses));
      }
      
      if (options.team) {
        eventsQuery = query(eventsQuery, where('team', '==', options.team));
      }
      
      if (options.assignedToUserId) {
        eventsQuery = query(eventsQuery, where('assignedToUserId', '==', options.assignedToUserId));
      }
      
      // Apply order and limit
      eventsQuery = query(
        eventsQuery, 
        orderBy('scheduledTime', 'asc'),
        ...(options.limit ? [firestoreLimit(options.limit + 1)] : [])
      );
      
      // Execute query
      const snapshot = await getDocs(eventsQuery);
      
      // Process results
      let events: CalendarEvent[] = [];
      snapshot.forEach(doc => {
        const event = { 
          id: doc.id, 
          ...doc.data() 
        } as CalendarEvent;
        
        // Apply platform filter if specified
        if (options.platformId) {
          const hasPlatform = event.platforms.some(p => p.platformId === options.platformId);
          if (!hasPlatform) return;
        }
        
        // Apply tags filter if specified
        if (options.tags && options.tags.length > 0) {
          const hasAllTags = options.tags.every(tag => 
            event.tags && event.tags.includes(tag)
          );
          if (!hasAllTags) return;
        }
        
        events.push(event);
      });
      
      // Check if there are more results
      const hasMore = options.limit ? events.length > options.limit : false;
      
      // If we fetched one extra to check for more, remove it from results
      if (options.limit && events.length > options.limit) {
        events = events.slice(0, options.limit);
      }
      
      return {
        events,
        totalCount: events.length,
        hasMore
      };
    } catch (error) {
      logger.error('Error getting organization calendar events', { 
        error, 
        organizationId,
        startDate,
        endDate 
      });
      
      throw error;
    }
  }

  /**
   * Get upcoming events for an organization
   * @param organizationId Organization ID
   * @param limit Maximum number of events to return
   * @returns Upcoming calendar events
   */
  async getUpcomingEvents(organizationId: string, limit: number = 10): Promise<CalendarEvent[]> {
    try {
      const now = new Date();
      const endDate = new Date();
      endDate.setDate(now.getDate() + 30); // Next 30 days
      
      const result = await this.getOrganizationEvents(
        organizationId,
        now,
        endDate,
        {
          limit,
          statuses: [CalendarEventStatus.SCHEDULED]
        }
      );
      
      return result.events;
    } catch (error) {
      logger.error('Error getting upcoming events', { 
        error, 
        organizationId 
      });
      throw error;
    }
  }

  /**
   * Find available time slots for scheduling
   * @param organizationId Organization ID
   * @param startDate Start date
   * @param endDate End date
   * @param duration Duration in minutes
   * @param platformIds Platform IDs to consider
   * @returns Available time slots
   */
  async findAvailableTimeSlots(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    duration: number = 60,
    platformIds: string[] = []
  ): Promise<Date[]> {
    try {
      // Get all events in the date range
      const { events } = await this.getOrganizationEvents(organizationId, startDate, endDate);
      
      // Filter events by platform if specified
      const relevantEvents = platformIds.length > 0
        ? events.filter(event => 
            event.platforms.some(platform => 
              platformIds.includes(platform.platformId)
            )
          )
        : events;
      
      // Create list of busy time slots
      const busySlots: { start: Date; end: Date }[] = relevantEvents.map(event => {
        const start = event.scheduledTime.toDate();
        const end = new Date(start.getTime() + (event.duration || 30) * 60 * 1000);
        return { start, end };
      });
      
      // Define time slots to check (every hour by default)
      const slotInterval = 60; // minutes
      const availableSlots: Date[] = [];
      
      // Loop through the date range with the interval
      const currentDate = new Date(startDate);
      while (currentDate < endDate) {
        const slotEnd = new Date(currentDate.getTime() + duration * 60 * 1000);
        
        // Check if this slot overlaps with any busy slot
        const isOverlapping = busySlots.some(busy => 
          (currentDate >= busy.start && currentDate < busy.end) ||
          (slotEnd > busy.start && slotEnd <= busy.end) ||
          (currentDate <= busy.start && slotEnd >= busy.end)
        );
        
        if (!isOverlapping) {
          availableSlots.push(new Date(currentDate));
        }
        
        // Move to next slot
        currentDate.setTime(currentDate.getTime() + slotInterval * 60 * 1000);
      }
      
      return availableSlots;
    } catch (error) {
      logger.error('Error finding available time slots', { 
        error, 
        organizationId, 
        startDate, 
        endDate 
      });
      throw error;
    }
  }

  /**
   * Update event publish status for a specific platform
   * @param eventId Event ID
   * @param platformId Platform ID
   * @param userId User initiating the update
   * @param success Success status
   * @param details Optional details
   * @returns Updated event
   */
  async updateEventPublishStatus(
    eventId: string,
    platformId: string,
    userId: string,
    success: boolean,
    details: {
      publishedUrl?: string;
      errorMessage?: string;
      platformSpecificId?: string;
    } = {}
  ): Promise<CalendarEvent> {
    try {
      // Get current event
      const event = await this.getEvent(eventId);
      if (!event) {
        throw new Error(`Event not found: ${eventId}`);
      }
      
      // Find platform index
      const platformIndex = event.platforms.findIndex(p => p.platformId === platformId);
      if (platformIndex === -1) {
        throw new Error(`Platform not found in event: ${platformId}`);
      }
      
      // Create updated platforms array
      const updatedPlatforms = [...event.platforms];
      
      // Update platform status
      updatedPlatforms[platformIndex] = {
        ...updatedPlatforms[platformIndex],
        status: success ? 'published' : 'failed',
        publishedUrl: details.publishedUrl,
        errorMessage: details.errorMessage,
        platformSpecificId: details.platformSpecificId || updatedPlatforms[platformIndex].platformSpecificId
      };
      
      // Check if all platforms are published or failed
      const allCompleted = updatedPlatforms.every(
        p => p.status === 'published' || p.status === 'failed'
      );
      
      // Update overall event status if all platforms are complete
      let updatedStatus = event.status;
      let lastPublishedAt = event.lastPublishedAt;
      
      if (allCompleted) {
        const allFailed = updatedPlatforms.every(p => p.status === 'failed');
        updatedStatus = allFailed 
          ? CalendarEventStatus.FAILED 
          : CalendarEventStatus.PUBLISHED;
        
        if (!allFailed) {
          lastPublishedAt = Timestamp.now();
        }
      }
      
      // Update event in Firestore
      const docRef = doc(db, this.EVENTS_COLLECTION, eventId);
      const updateData = {
        platforms: updatedPlatforms,
        status: updatedStatus,
        updatedByUserId: userId,
        updatedAt: Timestamp.now()
      };
      
      if (lastPublishedAt) {
        Object.assign(updateData, { lastPublishedAt });
      }
      
      await updateDoc(docRef, updateData);
      
      // Return updated event
      const updatedEvent: CalendarEvent = {
        ...event,
        platforms: updatedPlatforms,
        status: updatedStatus,
        updatedByUserId: userId,
        lastPublishedAt,
        updatedAt: Timestamp.now()
      };
      
      logger.info('Updated event publish status', { 
        eventId, 
        organizationId: event.organizationId,
        platformId, 
        userId,
        success, 
        newStatus: updatedStatus 
      });
      
      return updatedEvent;
    } catch (error) {
      logger.error('Error updating event publish status', { 
        error, 
        eventId, 
        platformId,
        userId
      });
      throw error;
    }
  }

  /**
   * Schedule event on all platforms
   * @param event Calendar event
   */
  private async scheduleEventOnPlatforms(event: CalendarEvent): Promise<void> {
    try {
      // Only attempt to schedule content events
      if (!this.isContentEvent(event.type)) {
        logger.info('Skipping scheduling for non-content event', { 
          eventId: event.id, 
          type: event.type 
        });
        return;
      }
      
      // Ensure we have content to post
      if (!event.contentId) {
        logger.warn('Cannot schedule event without contentId', { eventId: event.id });
        return;
      }
      
      // Process each platform
      const promises = event.platforms.map(async platform => {
        try {
          // Get platform adapter - now using organizationId instead of userId
          const adapter = await getPlatformAdapter(platform.platformId, event.organizationId);
          
          if (!adapter) {
            logger.error('Failed to get platform adapter', { 
              eventId: event.id, 
              organizationId: event.organizationId,
              platformId: platform.platformId 
            });
            return;
          }
          
          // Check if platform supports scheduling
          const supportsScheduling = adapter.getCapabilities().scheduling;
          
          if (!supportsScheduling) {
            logger.warn('Platform does not support scheduling', { 
              eventId: event.id, 
              platformId: platform.platformId 
            });
            return;
          }
          
          // Schedule content
          const scheduleResult = await adapter.scheduleContent(
            event.contentId!,
            event.scheduledTime.toDate()
          );
          
          // Update platform-specific ID
          if (scheduleResult.success && scheduleResult.platformContentId) {
            // Update platform status
            await this.updateEventPublishStatus(
              event.id!,
              platform.platformId,
              event.updatedByUserId || event.createdByUserId, // Use the last user who updated or created
              true,
              {
                platformSpecificId: scheduleResult.platformContentId
              }
            );
          } else {
            // Handle failure
            await this.updateEventPublishStatus(
              event.id!,
              platform.platformId,
              event.updatedByUserId || event.createdByUserId,
              false,
              {
                errorMessage: scheduleResult.errorMessage || 'Failed to schedule content'
              }
            );
          }
        } catch (error) {
          logger.error('Error scheduling on platform', { 
            error, 
            eventId: event.id, 
            organizationId: event.organizationId,
            platformId: platform.platformId 
          });
          
          // Update platform status to failed
          await this.updateEventPublishStatus(
            event.id!,
            platform.platformId,
            event.updatedByUserId || event.createdByUserId,
            false,
            {
              errorMessage: error instanceof Error ? error.message : 'Unknown error'
            }
          );
        }
      });
      
      // Wait for all platforms to be processed
      await Promise.all(promises);
      
      logger.info('Scheduled event on all platforms', { 
        eventId: event.id,
        organizationId: event.organizationId 
      });
    } catch (error) {
      logger.error('Error scheduling event on platforms', { 
        error, 
        eventId: event.id,
        organizationId: event.organizationId
      });
      throw error;
    }
  }

  /**
   * Unschedule event from all platforms
   * @param event Calendar event
   */
  private async unscheduleEventFromPlatforms(event: CalendarEvent): Promise<void> {
    try {
      // Only attempt to unschedule content events
      if (!this.isContentEvent(event.type)) {
        logger.info('Skipping unscheduling for non-content event', { 
          eventId: event.id, 
          type: event.type 
        });
        return;
      }
      
      // Process each platform
      const promises = event.platforms.map(async platform => {
        // Skip if no platform-specific ID (not yet scheduled)
        if (!platform.platformSpecificId) {
          return;
        }
        
        try {
          // Get platform adapter for the organization
          const adapter = await getPlatformAdapter(platform.platformId, event.organizationId);
          
          if (!adapter) {
            logger.error('Failed to get platform adapter', { 
              eventId: event.id, 
              organizationId: event.organizationId,
              platformId: platform.platformId 
            });
            return;
          }
          
          // Check if platform supports scheduling
          const supportsScheduling = adapter.getCapabilities().scheduling;
          
          if (!supportsScheduling) {
            logger.warn('Platform does not support unscheduling', { 
              eventId: event.id, 
              platformId: platform.platformId 
            });
            return;
          }
          
          // Unschedule content
          const unscheduleResult = await adapter.unscheduleContent(
            platform.platformSpecificId
          );
          
          if (!unscheduleResult.success) {
            logger.warn('Failed to unschedule content', { 
              eventId: event.id, 
              platformId: platform.platformId,
              error: unscheduleResult.errorMessage
            });
          }
        } catch (error) {
          logger.error('Error unscheduling from platform', { 
            error, 
            eventId: event.id, 
            platformId: platform.platformId 
          });
        }
      });
      
      // Wait for all platforms to be processed
      await Promise.all(promises);
      
      logger.info('Unscheduled event from all platforms', { 
        eventId: event.id,
        organizationId: event.organizationId
      });
    } catch (error) {
      logger.error('Error unscheduling event from platforms', { 
        error, 
        eventId: event.id,
        organizationId: event.organizationId
      });
      throw error;
    }
  }

  /**
   * Validate event data
   * @param event Event data
   */
  private validateEvent(event: Omit<CalendarEvent, 'id'>): void {
    // Check required fields
    if (!event.organizationId) {
      throw new Error('Event must have an organizationId');
    }
    
    if (!event.createdByUserId) {
      throw new Error('Event must have a createdByUserId');
    }
    
    if (!event.title) {
      throw new Error('Event must have a title');
    }
    
    if (!event.scheduledTime) {
      throw new Error('Event must have a scheduledTime');
    }
    
    if (!event.platforms || !Array.isArray(event.platforms) || event.platforms.length === 0) {
      throw new Error('Event must have at least one platform');
    }
    
    // Validate platforms
    for (const platform of event.platforms) {
      if (!platform.platformId) {
        throw new Error('Each platform must have a platformId');
      }
    }
    
    // Content events should have a contentId
    if (this.isContentEvent(event.type) && !event.contentId) {
      throw new Error(`${event.type} events must have a contentId`);
    }
  }

  /**
   * Check if event type is a content event
   * @param type Event type
   * @returns True if content event
   */
  private isContentEvent(type: CalendarEventType): boolean {
    return [
      CalendarEventType.POST,
      CalendarEventType.STORY,
      CalendarEventType.REEL,
      CalendarEventType.VIDEO,
      CalendarEventType.ARTICLE
    ].includes(type);
  }

  /**
   * Check if two timestamps are the same
   * @param a First timestamp
   * @param b Second timestamp
   * @returns True if same
   */
  private areSameTimestamps(a: Timestamp, b: Timestamp): boolean {
    return a.seconds === b.seconds && a.nanoseconds === b.nanoseconds;
  }
  
  /**
   * Get a user's calendar events (personal and organizations they belong to)
   * @param userId User ID
   * @param startDate Start date 
   * @param endDate End date
   * @param options Query options
   * @returns Calendar events for the user
   */
  async getEvents(
    userId: string,
    startDate: Date,
    endDate: Date,
    options: any = {}
  ): Promise<CalendarQueryResult> {
    try {
      // Get user data to find their organizations
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        throw new Error(`User not found: ${userId}`);
      }
      
      const userData = userDoc.data();
      const organizationId = userData.currentOrganizationId || userData.personalOrganizationId;
      
      if (!organizationId) {
        return { events: [], totalCount: 0, hasMore: false };
      }
      
      // Get events for the user's current organization or personal organization
      return this.getOrganizationEvents(organizationId, startDate, endDate, options);
    } catch (error) {
      logger.error('Error getting user calendar events', { 
        error, 
        userId, 
        startDate, 
        endDate 
      });
      throw error;
    }
  }
}
