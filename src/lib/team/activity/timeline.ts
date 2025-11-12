import { getFirestore } from 'firebase-admin/firestore';
import { ActivityMetricType } from './metrics';

/**
 * Timeline event interface
 */
export interface TimelineEvent {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  teamId?: string;
  organizationId?: string;
  eventType: ActivityMetricType;
  timestamp: Date;
  title: string;
  description: string;
  metadata: Record<string, any>;
}

/**
 * Team activity timeline service
 */
export class TeamActivityTimeline {
  private readonly TIMELINE_COLLECTION = 'activity_timeline';
  private firestore = getFirestore();
  
  /**
   * Add an event to the team timeline
   * @param event Event data to add
   * @returns The ID of the created event
   */
  async addEvent(event: Omit<TimelineEvent, 'id'>): Promise<string> {
    try {
      const docRef = await this.firestore.collection(this.TIMELINE_COLLECTION).add({
        ...event,
        timestamp: new Date(event.timestamp)
      });
      
      return docRef.id;
    } catch (error) {
      console.error('Error adding timeline event:', error);
      throw new Error('Failed to add timeline event');
    }
  }
  
  /**
   * Get team timeline events
   * @param teamId Team ID
   * @param limit Maximum number of events to return
   * @param startAfter Cursor for pagination
   * @returns Timeline events
   */
  async getTeamTimeline(
    teamId: string,
    limit: number = 20,
    startAfter?: Date
  ): Promise<TimelineEvent[]> {
    try {
      let query = this.firestore.collection(this.TIMELINE_COLLECTION)
        .where('teamId', '==', teamId)
        .orderBy('timestamp', 'desc')
        .limit(limit);
      
      if (startAfter) {
        query = query.startAfter(startAfter);
      }
      
      const snapshot = await query.get();
      
      const events: TimelineEvent[] = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        events.push({
          id: doc.id,
          userId: data.userId,
          userName: data.userName,
          userAvatar: data.userAvatar,
          teamId: data.teamId,
          organizationId: data.organizationId,
          eventType: data.eventType,
          timestamp: data.timestamp.toDate(),
          title: data.title,
          description: data.description,
          metadata: data.metadata || {}
        });
      });
      
      return events;
    } catch (error) {
      console.error('Error getting team timeline:', error);
      throw new Error('Failed to get team timeline');
    }
  }
  
  /**
   * Get organization timeline events
   * @param organizationId Organization ID
   * @param limit Maximum number of events to return
   * @param startAfter Cursor for pagination
   * @returns Timeline events
   */
  async getOrganizationTimeline(
    organizationId: string,
    limit: number = 20,
    startAfter?: Date
  ): Promise<TimelineEvent[]> {
    try {
      let query = this.firestore.collection(this.TIMELINE_COLLECTION)
        .where('organizationId', '==', organizationId)
        .orderBy('timestamp', 'desc')
        .limit(limit);
      
      if (startAfter) {
        query = query.startAfter(startAfter);
      }
      
      const snapshot = await query.get();
      
      const events: TimelineEvent[] = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        events.push({
          id: doc.id,
          userId: data.userId,
          userName: data.userName,
          userAvatar: data.userAvatar,
          teamId: data.teamId,
          organizationId: data.organizationId,
          eventType: data.eventType,
          timestamp: data.timestamp.toDate(),
          title: data.title,
          description: data.description,
          metadata: data.metadata || {}
        });
      });
      
      return events;
    } catch (error) {
      console.error('Error getting organization timeline:', error);
      throw new Error('Failed to get organization timeline');
    }
  }
  
  /**
   * Get user timeline events
   * @param userId User ID
   * @param limit Maximum number of events to return
   * @param startAfter Cursor for pagination
   * @returns Timeline events
   */
  async getUserTimeline(
    userId: string,
    limit: number = 20,
    startAfter?: Date
  ): Promise<TimelineEvent[]> {
    try {
      let query = this.firestore.collection(this.TIMELINE_COLLECTION)
        .where('userId', '==', userId)
        .orderBy('timestamp', 'desc')
        .limit(limit);
      
      if (startAfter) {
        query = query.startAfter(startAfter);
      }
      
      const snapshot = await query.get();
      
      const events: TimelineEvent[] = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        events.push({
          id: doc.id,
          userId: data.userId,
          userName: data.userName,
          userAvatar: data.userAvatar,
          teamId: data.teamId,
          organizationId: data.organizationId,
          eventType: data.eventType,
          timestamp: data.timestamp.toDate(),
          title: data.title,
          description: data.description,
          metadata: data.metadata || {}
        });
      });
      
      return events;
    } catch (error) {
      console.error('Error getting user timeline:', error);
      throw new Error('Failed to get user timeline');
    }
  }
  
  /**
   * Create a formatted timeline event
   * @param userId User ID
   * @param eventType Event type
   * @param title Event title
   * @param description Event description
   * @param metadata Additional metadata
   * @param teamId Optional team ID
   * @param organizationId Optional organization ID
   * @returns Formatted timeline event
   */
  async createFormattedEvent(
    userId: string,
    eventType: ActivityMetricType,
    title: string,
    description: string,
    metadata: Record<string, any> = {},
    teamId?: string,
    organizationId?: string
  ): Promise<string> {
    try {
      // Get user details
      const userDoc = await this.firestore.collection('users').doc(userId).get();
      
      if (!userDoc.exists) {
        throw new Error('User not found');
      }
      
      const userData = userDoc.data();
      
      // Create the event
      const event: Omit<TimelineEvent, 'id'> = {
        userId,
        userName: userData?.displayName || `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim() || userData?.email,
        userAvatar: userData?.photoURL,
        teamId,
        organizationId,
        eventType,
        timestamp: new Date(),
        title,
        description,
        metadata
      };
      
      return await this.addEvent(event);
    } catch (error) {
      console.error('Error creating formatted timeline event:', error);
      throw new Error('Failed to create timeline event');
    }
  }
}

// Create singleton instance
const teamActivityTimeline = new TeamActivityTimeline();
export default teamActivityTimeline;
