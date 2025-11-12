import { firestore } from '../../firebase/admin';
import { v4 as uuidv4 } from 'uuid';

/**
 * Feedback type enum
 */
export enum FeedbackType {
  QUALITY = 'quality',       // General quality feedback
  RELEVANCE = 'relevance',   // Relevance to the topic
  TONE = 'tone',             // Tone appropriateness 
  ACCURACY = 'accuracy',     // Factual accuracy
  CREATIVITY = 'creativity', // Level of creativity
  USEFULNESS = 'usefulness', // How useful the content was
  OTHER = 'other'            // Any other feedback
}

/**
 * Content type that received feedback
 */
export enum ContentType {
  POST = 'post',
  CAPTION = 'caption',
  HASHTAGS = 'hashtags',
  REPLY = 'reply',
  ANALYSIS = 'analysis',
  SCHEDULE = 'schedule',
  SUMMARY = 'summary',
  OTHER = 'other'
}

/**
 * Feedback rating scale (1-5)
 */
export enum FeedbackRating {
  VERY_POOR = 1,
  POOR = 2,
  AVERAGE = 3,
  GOOD = 4,
  EXCELLENT = 5
}

/**
 * Feedback data structure
 */
export interface Feedback {
  id: string;
  userId: string;
  organizationId?: string;
  contentType: ContentType;
  feedbackType: FeedbackType;
  rating: FeedbackRating;
  comments?: string;
  originalContent?: string;
  generatedContent: string;
  prompt?: string;
  modelUsed?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

/**
 * Create feedback params
 */
export interface CreateFeedbackParams {
  userId: string;
  organizationId?: string;
  contentType: ContentType;
  feedbackType: FeedbackType;
  rating: FeedbackRating;
  comments?: string;
  originalContent?: string;
  generatedContent: string;
  prompt?: string;
  modelUsed?: string;
  metadata?: Record<string, any>;
}

/**
 * AI feedback metrics
 */
export interface FeedbackMetrics {
  totalFeedback: number;
  averageRating: number;
  ratingCounts: Record<FeedbackRating, number>;
  typeCounts: Record<ContentType, number>;
  feedbackTypeCounts: Record<FeedbackType, number>;
}

/**
 * AI feedback service
 */
export class FeedbackService {
  private feedbackCollection = firestore.collection('aiFeedback');

  /**
   * Submit new feedback
   * @param params Feedback parameters
   * @returns Created feedback
   */
  async submitFeedback(params: CreateFeedbackParams): Promise<Feedback> {
    const feedback: Feedback = {
      id: uuidv4(),
      userId: params.userId,
      organizationId: params.organizationId,
      contentType: params.contentType,
      feedbackType: params.feedbackType,
      rating: params.rating,
      comments: params.comments,
      originalContent: params.originalContent,
      generatedContent: params.generatedContent,
      prompt: params.prompt,
      modelUsed: params.modelUsed,
      metadata: params.metadata,
      createdAt: new Date()
    };

    await this.feedbackCollection.doc(feedback.id).set(feedback);
    return feedback;
  }

  /**
   * Get feedback by ID
   * @param feedbackId Feedback ID
   * @returns Feedback or null if not found
   */
  async getFeedback(feedbackId: string): Promise<Feedback | null> {
    const feedbackDoc = await this.feedbackCollection.doc(feedbackId).get();
    return feedbackDoc.exists ? (feedbackDoc.data() as Feedback) : null;
  }

  /**
   * Get all feedback for a specific user
   * @param userId User ID
   * @param limit Result limit (default 50)
   * @param offset Pagination offset
   * @returns List of feedback
   */
  async getUserFeedback(
    userId: string,
    limit = 50,
    offset = 0
  ): Promise<{ feedback: Feedback[]; total: number }> {
    // Get count first
    const countQuery = await this.feedbackCollection
      .where('userId', '==', userId)
      .count()
      .get();
    
    const total = countQuery.data().count;
    
    // Then get the actual results
    const querySnapshot = await this.feedbackCollection
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .offset(offset)
      .get();
    
    const feedback: Feedback[] = [];
    querySnapshot.forEach(doc => {
      feedback.push(doc.data() as Feedback);
    });
    
    return { feedback, total };
  }

  /**
   * Get all feedback for an organization
   * @param organizationId Organization ID
   * @param limit Result limit
   * @param offset Pagination offset
   * @returns List of feedback
   */
  async getOrganizationFeedback(
    organizationId: string,
    limit = 50,
    offset = 0
  ): Promise<{ feedback: Feedback[]; total: number }> {
    // Get count first
    const countQuery = await this.feedbackCollection
      .where('organizationId', '==', organizationId)
      .count()
      .get();
    
    const total = countQuery.data().count;
    
    // Then get the actual results
    const querySnapshot = await this.feedbackCollection
      .where('organizationId', '==', organizationId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .offset(offset)
      .get();
    
    const feedback: Feedback[] = [];
    querySnapshot.forEach(doc => {
      feedback.push(doc.data() as Feedback);
    });
    
    return { feedback, total };
  }

  /**
   * Get feedback metrics for a user or organization
   * @param options Query options
   * @returns Feedback metrics
   */
  async getFeedbackMetrics({
    userId,
    organizationId,
    startDate,
    endDate,
    contentType
  }: {
    userId?: string;
    organizationId?: string;
    startDate?: Date;
    endDate?: Date;
    contentType?: ContentType;
  }): Promise<FeedbackMetrics> {
    let query = this.feedbackCollection as any;

    // Apply filters
    if (userId) {
      query = query.where('userId', '==', userId);
    }

    if (organizationId) {
      query = query.where('organizationId', '==', organizationId);
    }

    if (contentType) {
      query = query.where('contentType', '==', contentType);
    }

    if (startDate) {
      query = query.where('createdAt', '>=', startDate);
    }

    if (endDate) {
      query = query.where('createdAt', '<=', endDate);
    }

    // Execute query
    const snapshot = await query.get();
    
    // Initialize metrics
    const metrics: FeedbackMetrics = {
      totalFeedback: snapshot.size,
      averageRating: 0,
      ratingCounts: {
        [FeedbackRating.VERY_POOR]: 0,
        [FeedbackRating.POOR]: 0,
        [FeedbackRating.AVERAGE]: 0,
        [FeedbackRating.GOOD]: 0,
        [FeedbackRating.EXCELLENT]: 0
      },
      typeCounts: Object.values(ContentType).reduce((acc, type) => {
        acc[type] = 0;
        return acc;
      }, {} as Record<ContentType, number>),
      feedbackTypeCounts: Object.values(FeedbackType).reduce((acc, type) => {
        acc[type] = 0;
        return acc;
      }, {} as Record<FeedbackType, number>)
    };

    // No feedback found
    if (metrics.totalFeedback === 0) {
      return metrics;
    }

    // Calculate metrics
    let totalRating = 0;

    snapshot.forEach(doc => {
      const feedback = doc.data() as Feedback;
      
      // Increment counts
      metrics.ratingCounts[feedback.rating]++;
      metrics.typeCounts[feedback.contentType]++;
      metrics.feedbackTypeCounts[feedback.feedbackType]++;
      
      // Add to total rating for average calculation
      totalRating += feedback.rating;
    });

    // Calculate average rating
    metrics.averageRating = totalRating / metrics.totalFeedback;

    return metrics;
  }

  /**
   * Add follow-up action for feedback
   * @param feedbackId Feedback ID
   * @param action Action taken
   * @param actionBy User ID who took the action
   * @returns Updated feedback
   */
  async addFeedbackAction(
    feedbackId: string,
    action: string,
    actionBy: string
  ): Promise<Feedback | null> {
    const feedbackRef = this.feedbackCollection.doc(feedbackId);
    const feedbackDoc = await feedbackRef.get();

    if (!feedbackDoc.exists) {
      return null;
    }

    const actionData = {
      action,
      actionBy,
      actionDate: new Date()
    };

    await feedbackRef.update({
      'metadata.actions': firestore.FieldValue.arrayUnion(actionData)
    });

    return this.getFeedback(feedbackId);
  }

  /**
   * Delete feedback
   * @param feedbackId Feedback ID
   * @returns Success indicator
   */
  async deleteFeedback(feedbackId: string): Promise<boolean> {
    try {
      await this.feedbackCollection.doc(feedbackId).delete();
      return true;
    } catch (error) {
      console.error('Error deleting feedback:', error);
      return false;
    }
  }
}

export default new FeedbackService(); 