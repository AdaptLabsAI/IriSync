import { getFirestore } from 'firebase-admin/firestore';
import { ApprovalStatus, ApprovalItem } from './approval-flow';
import { logger } from '../../logging/logger';

/**
 * Review status types
 */
export enum ReviewStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  RETURNED = 'returned'
}

/**
 * Review comment interface
 */
export interface ReviewComment {
  id: string;
  reviewId: string;
  userId: string;
  timestamp: Date;
  comment: string;
  type: 'feedback' | 'question' | 'suggestion' | 'approval';
  resolved: boolean;
  parentCommentId?: string;
}

/**
 * Review interface
 */
export interface Review {
  id: string;
  approvalId: string;
  reviewerId: string;
  organizationId: string;
  teamId: string;
  status: ReviewStatus;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  rating?: number; // 1-5 star rating
  summary?: string;
  recommendations?: string[];
  comments: ReviewComment[];
  metadata: Record<string, any>;
}

/**
 * Review process service
 */
export class ReviewProcess {
  private readonly REVIEWS_COLLECTION = 'content_reviews';
  private readonly COMMENTS_COLLECTION = 'review_comments';
  private firestore = getFirestore();

  /**
   * Start a review process for an approval item
   */
  async startReview(
    approvalId: string,
    reviewerId: string,
    organizationId: string,
    teamId: string
  ): Promise<string> {
    try {
      const now = new Date();
      
      const reviewData: Omit<Review, 'id'> = {
        approvalId,
        reviewerId,
        organizationId,
        teamId,
        status: ReviewStatus.IN_PROGRESS,
        createdAt: now,
        updatedAt: now,
        comments: [],
        metadata: {}
      };

      const docRef = await this.firestore.collection(this.REVIEWS_COLLECTION).add(reviewData);
      
      logger.info('Review process started', {
        reviewId: docRef.id,
        approvalId,
        reviewerId,
        organizationId
      });

      return docRef.id;
    } catch (error) {
      logger.error('Error starting review process', {
        error: error instanceof Error ? error.message : String(error),
        approvalId,
        reviewerId
      });
      throw new Error('Failed to start review process');
    }
  }

  /**
   * Add a comment to a review
   */
  async addComment(
    reviewId: string,
    userId: string,
    comment: string,
    type: ReviewComment['type'] = 'feedback',
    parentCommentId?: string
  ): Promise<string> {
    try {
      const now = new Date();
      
      const commentData: Omit<ReviewComment, 'id'> = {
        reviewId,
        userId,
        timestamp: now,
        comment,
        type,
        resolved: false,
        parentCommentId
      };

      const docRef = await this.firestore.collection(this.COMMENTS_COLLECTION).add(commentData);
      
      // Update the review's updated timestamp
      await this.firestore.collection(this.REVIEWS_COLLECTION).doc(reviewId).update({
        updatedAt: now
      });

      logger.info('Review comment added', {
        reviewId,
        commentId: docRef.id,
        userId,
        type
      });

      return docRef.id;
    } catch (error) {
      logger.error('Error adding review comment', {
        error: error instanceof Error ? error.message : String(error),
        reviewId,
        userId
      });
      throw new Error('Failed to add review comment');
    }
  }

  /**
   * Complete a review with rating and summary
   */
  async completeReview(
    reviewId: string,
    reviewerId: string,
    rating: number,
    summary: string,
    recommendations: string[] = []
  ): Promise<void> {
    try {
      const now = new Date();
      
      await this.firestore.collection(this.REVIEWS_COLLECTION).doc(reviewId).update({
        status: ReviewStatus.COMPLETED,
        completedAt: now,
        updatedAt: now,
        rating,
        summary,
        recommendations
      });

      logger.info('Review completed', {
        reviewId,
        reviewerId,
        rating,
        recommendationCount: recommendations.length
      });
    } catch (error) {
      logger.error('Error completing review', {
        error: error instanceof Error ? error.message : String(error),
        reviewId,
        reviewerId
      });
      throw new Error('Failed to complete review');
    }
  }

  /**
   * Return review for more changes
   */
  async returnReview(
    reviewId: string,
    reviewerId: string,
    reason: string
  ): Promise<void> {
    try {
      const now = new Date();
      
      await this.firestore.collection(this.REVIEWS_COLLECTION).doc(reviewId).update({
        status: ReviewStatus.RETURNED,
        updatedAt: now,
        'metadata.returnReason': reason
      });

      // Add a system comment about the return
      await this.addComment(reviewId, reviewerId, `Review returned: ${reason}`, 'feedback');

      logger.info('Review returned for changes', {
        reviewId,
        reviewerId,
        reason
      });
    } catch (error) {
      logger.error('Error returning review', {
        error: error instanceof Error ? error.message : String(error),
        reviewId,
        reviewerId
      });
      throw new Error('Failed to return review');
    }
  }

  /**
   * Get review by ID
   */
  async getReview(reviewId: string): Promise<Review | null> {
    try {
      const reviewDoc = await this.firestore.collection(this.REVIEWS_COLLECTION).doc(reviewId).get();
      
      if (!reviewDoc.exists) {
        return null;
      }

      const reviewData = reviewDoc.data() as Omit<Review, 'id'>;
      
      // Get comments for this review
      const commentsSnapshot = await this.firestore
        .collection(this.COMMENTS_COLLECTION)
        .where('reviewId', '==', reviewId)
        .orderBy('timestamp', 'asc')
        .get();

      const comments: ReviewComment[] = commentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ReviewComment));

      return {
        id: reviewDoc.id,
        ...reviewData,
        comments
      };
    } catch (error) {
      logger.error('Error getting review', {
        error: error instanceof Error ? error.message : String(error),
        reviewId
      });
      throw new Error('Failed to get review');
    }
  }

  /**
   * Get reviews for an approval item
   */
  async getReviewsForApproval(approvalId: string): Promise<Review[]> {
    try {
      const reviewsSnapshot = await this.firestore
        .collection(this.REVIEWS_COLLECTION)
        .where('approvalId', '==', approvalId)
        .orderBy('createdAt', 'desc')
        .get();

      const reviews: Review[] = [];
      
      for (const doc of reviewsSnapshot.docs) {
        const reviewData = doc.data() as Omit<Review, 'id'>;
        
        // Get comments for this review
        const commentsSnapshot = await this.firestore
          .collection(this.COMMENTS_COLLECTION)
          .where('reviewId', '==', doc.id)
          .orderBy('timestamp', 'asc')
          .get();

        const comments: ReviewComment[] = commentsSnapshot.docs.map(commentDoc => ({
          id: commentDoc.id,
          ...commentDoc.data()
        } as ReviewComment));

        reviews.push({
          id: doc.id,
          ...reviewData,
          comments
        });
      }

      return reviews;
    } catch (error) {
      logger.error('Error getting reviews for approval', {
        error: error instanceof Error ? error.message : String(error),
        approvalId
      });
      throw new Error('Failed to get reviews for approval');
    }
  }

  /**
   * Resolve a review comment
   */
  async resolveComment(commentId: string, userId: string): Promise<void> {
    try {
      await this.firestore.collection(this.COMMENTS_COLLECTION).doc(commentId).update({
        resolved: true,
        'metadata.resolvedBy': userId,
        'metadata.resolvedAt': new Date()
      });

      logger.info('Review comment resolved', {
        commentId,
        userId
      });
    } catch (error) {
      logger.error('Error resolving comment', {
        error: error instanceof Error ? error.message : String(error),
        commentId,
        userId
      });
      throw new Error('Failed to resolve comment');
    }
  }

  /**
   * Get reviews assigned to a user
   */
  async getAssignedReviews(
    reviewerId: string,
    organizationId: string,
    status?: ReviewStatus
  ): Promise<Review[]> {
    try {
      let query = this.firestore
        .collection(this.REVIEWS_COLLECTION)
        .where('reviewerId', '==', reviewerId)
        .where('organizationId', '==', organizationId);

      if (status) {
        query = query.where('status', '==', status);
      }

      const reviewsSnapshot = await query.orderBy('createdAt', 'desc').get();

      const reviews: Review[] = [];
      
      for (const doc of reviewsSnapshot.docs) {
        const reviewData = doc.data() as Omit<Review, 'id'>;
        
        // Get comments for this review
        const commentsSnapshot = await this.firestore
          .collection(this.COMMENTS_COLLECTION)
          .where('reviewId', '==', doc.id)
          .orderBy('timestamp', 'asc')
          .get();

        const comments: ReviewComment[] = commentsSnapshot.docs.map(commentDoc => ({
          id: commentDoc.id,
          ...commentDoc.data()
        } as ReviewComment));

        reviews.push({
          id: doc.id,
          ...reviewData,
          comments
        });
      }

      return reviews;
    } catch (error) {
      logger.error('Error getting assigned reviews', {
        error: error instanceof Error ? error.message : String(error),
        reviewerId,
        organizationId
      });
      throw new Error('Failed to get assigned reviews');
    }
  }
}

export const reviewProcess = new ReviewProcess();
