import { getFirestore } from 'firebase-admin/firestore';
import { OrganizationRole, TeamRole } from '@/lib/user/types';

/**
 * Workflow approval status
 */
export enum ApprovalStatus {
  DRAFT = 'draft',
  PENDING_REVIEW = 'pending_review',
  CHANGES_REQUESTED = 'changes_requested',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PUBLISHED = 'published',
  CANCELED = 'canceled'
}

/**
 * Workflow approval item interface
 */
export interface ApprovalItem {
  id: string;
  organizationId: string;
  teamId: string;
  contentId: string;
  contentType: string;
  title: string;
  description?: string;
  status: ApprovalStatus;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  requestedBy: string;
  assignedTo?: string[];
  approvedBy?: string;
  approvedAt?: Date;
  publishedAt?: Date;
  scheduledPublishDate?: Date;
  requiredApprovals: number;
  currentApprovals: number;
  rejectionReason?: string;
  metadata: Record<string, any>;
}

/**
 * Content workflow approval service
 */
export class ApprovalFlow {
  private readonly APPROVALS_COLLECTION = 'workflow_approvals';
  private firestore = getFirestore();
  
  /**
   * Create a new approval request
   * @param userId User ID creating the request
   * @param organizationId Organization ID
   * @param teamId Team ID
   * @param contentId Content ID
   * @param contentType Content type (e.g., 'post', 'story', 'image')
   * @param title Title of the content
   * @param description Optional description
   * @param assignedTo Optional array of user IDs to assign for approval
   * @param scheduledPublishDate Optional scheduled publish date
   * @param metadata Additional metadata
   * @returns The ID of the created approval request
   */
  async createApprovalRequest(
    userId: string,
    organizationId: string,
    teamId: string,
    contentId: string,
    contentType: string,
    title: string,
    description?: string,
    assignedTo?: string[],
    scheduledPublishDate?: Date,
    metadata: Record<string, any> = {}
  ): Promise<string> {
    try {
      // Determine required approvals based on organization settings
      const orgDoc = await this.firestore.collection('organizations').doc(organizationId).get();
      
      if (!orgDoc.exists) {
        throw new Error('Organization not found');
      }
      
      const orgData = orgDoc.data();
      const requiredApprovals = orgData?.settings?.requiredApprovals || 1;
      
      // Create the approval request
      const now = new Date();
      const approvalData: Omit<ApprovalItem, 'id'> = {
        organizationId,
        teamId,
        contentId,
        contentType,
        title,
        description,
        status: ApprovalStatus.PENDING_REVIEW,
        createdAt: now,
        createdBy: userId,
        updatedAt: now,
        requestedBy: userId,
        assignedTo,
        scheduledPublishDate,
        requiredApprovals,
        currentApprovals: 0,
        metadata
      };
      
      // Save to Firestore
      const docRef = await this.firestore.collection(this.APPROVALS_COLLECTION).add(approvalData);
      
      // Update content status
      await this.updateContentStatus(contentId, contentType, 'pending_approval');
      
      // Notify assigned approvers
      if (assignedTo && assignedTo.length > 0) {
        await this.notifyApprovers(docRef.id, assignedTo, title, userId);
      }
      
      return docRef.id;
    } catch (error) {
      console.error('Error creating approval request:', error);
      throw new Error('Failed to create approval request');
    }
  }
  
  /**
   * Update the approval status of a content item
   * @param approvalId Approval request ID
   * @param userId User ID making the update
   * @param status New approval status
   * @param comment Optional comment or feedback
   * @returns Updated approval item
   */
  async updateApprovalStatus(
    approvalId: string,
    userId: string,
    status: ApprovalStatus,
    comment?: string
  ): Promise<ApprovalItem> {
    try {
      // Get the current approval request
      const approvalRef = this.firestore.collection(this.APPROVALS_COLLECTION).doc(approvalId);
      const approvalDoc = await approvalRef.get();
      
      if (!approvalDoc.exists) {
        throw new Error('Approval request not found');
      }
      
      const approvalData = approvalDoc.data() as ApprovalItem;
      
      // Check if user has permission to update the status
      const canUpdateStatus = await this.canUserUpdateStatus(userId, approvalData.teamId, approvalData);
      
      if (!canUpdateStatus) {
        throw new Error('User does not have permission to update this approval');
      }
      
      // Prepare update data
      const now = new Date();
      const updateData: Record<string, any> = {
        status,
        updatedAt: now
      };
      
      // Status-specific updates
      if (status === ApprovalStatus.APPROVED) {
        updateData.approvedBy = userId;
        updateData.approvedAt = now;
        updateData.currentApprovals = approvalData.currentApprovals + 1;
        
        // Check if enough approvals have been received
        if (updateData.currentApprovals >= approvalData.requiredApprovals) {
          updateData.status = ApprovalStatus.APPROVED;
          
          // If scheduled publish date is in the past or not set, publish immediately
          if (!approvalData.scheduledPublishDate || approvalData.scheduledPublishDate <= now) {
            updateData.status = ApprovalStatus.PUBLISHED;
            updateData.publishedAt = now;
          }
        }
      } else if (status === ApprovalStatus.REJECTED) {
        updateData.rejectionReason = comment;
      }
      
      // Add comment to metadata if provided
      if (comment) {
        const comments = approvalData.metadata?.comments || [];
        comments.push({
          userId,
          timestamp: now,
          comment,
          status
        });
        
        updateData['metadata.comments'] = comments;
      }
      
      // Update in Firestore
      await approvalRef.update(updateData);
      
      // Update content status based on approval status
      let contentStatus = 'pending_approval';
      if (status === ApprovalStatus.APPROVED) {
        contentStatus = 'approved';
      } else if (status === ApprovalStatus.PUBLISHED) {
        contentStatus = 'published';
      } else if (status === ApprovalStatus.REJECTED) {
        contentStatus = 'rejected';
      } else if (status === ApprovalStatus.CHANGES_REQUESTED) {
        contentStatus = 'changes_requested';
      }
      
      await this.updateContentStatus(approvalData.contentId, approvalData.contentType, contentStatus);
      
      // Get updated approval data
      const updatedDoc = await approvalRef.get();
      return updatedDoc.data() as ApprovalItem;
    } catch (error) {
      console.error('Error updating approval status:', error);
      throw new Error('Failed to update approval status');
    }
  }
  
  /**
   * Get approval requests with filters
   * @param filters Approval request filters
   * @param limit Maximum number of items to return
   * @param offset Offset for pagination
   * @returns Filtered approval requests
   */
  async getApprovalRequests(
    filters: {
      teamId?: string;
      organizationId?: string;
      status?: ApprovalStatus | ApprovalStatus[];
      requestedBy?: string;
      assignedTo?: string;
      contentType?: string;
      startDate?: Date;
      endDate?: Date;
    },
    limit: number = 20,
    offset: number = 0
  ): Promise<ApprovalItem[]> {
    try {
      // Build query
      let query: any = this.firestore.collection(this.APPROVALS_COLLECTION);
      
      // Apply filters
      if (filters.teamId) {
        query = query.where('teamId', '==', filters.teamId);
      }
      
      if (filters.organizationId) {
        query = query.where('organizationId', '==', filters.organizationId);
      }
      
      if (filters.requestedBy) {
        query = query.where('requestedBy', '==', filters.requestedBy);
      }
      
      if (filters.contentType) {
        query = query.where('contentType', '==', filters.contentType);
      }
      
      // Assigned to user (array contains query)
      if (filters.assignedTo) {
        query = query.where('assignedTo', 'array-contains', filters.assignedTo);
      }
      
      // Status filters
      if (filters.status) {
        if (Array.isArray(filters.status)) {
          // Multiple status values - use 'in' query
          if (filters.status.length > 0) {
            query = query.where('status', 'in', filters.status);
          }
        } else {
          // Single status value
          query = query.where('status', '==', filters.status);
        }
      }
      
      // Date range filters
      if (filters.startDate) {
        query = query.where('createdAt', '>=', filters.startDate);
      }
      
      if (filters.endDate) {
        query = query.where('createdAt', '<=', filters.endDate);
      }
      
      // Apply ordering, pagination
      query = query.orderBy('createdAt', 'desc')
        .limit(limit)
        .offset(offset);
      
      // Execute query
      const snapshot = await query.get();
      
      // Process results
      const approvals: ApprovalItem[] = [];
      
      snapshot.forEach((doc: any) => {
        const data = doc.data();
        approvals.push({
          id: doc.id,
          organizationId: data.organizationId,
          teamId: data.teamId,
          contentId: data.contentId,
          contentType: data.contentType,
          title: data.title,
          description: data.description,
          status: data.status,
          createdAt: data.createdAt.toDate(),
          createdBy: data.createdBy,
          updatedAt: data.updatedAt.toDate(),
          requestedBy: data.requestedBy,
          assignedTo: data.assignedTo,
          approvedBy: data.approvedBy,
          approvedAt: data.approvedAt?.toDate(),
          publishedAt: data.publishedAt?.toDate(),
          scheduledPublishDate: data.scheduledPublishDate?.toDate(),
          requiredApprovals: data.requiredApprovals,
          currentApprovals: data.currentApprovals,
          rejectionReason: data.rejectionReason,
          metadata: data.metadata || {}
        });
      });
      
      return approvals;
    } catch (error) {
      console.error('Error getting approval requests:', error);
      throw new Error('Failed to get approval requests');
    }
  }
  
  /**
   * Check if user has permission to update an approval status
   * @param userId User ID
   * @param teamId Team ID
   * @param approvalData Approval data
   * @returns Boolean indicating if user can update status
   */
  private async canUserUpdateStatus(
    userId: string,
    teamId: string,
    approvalData: ApprovalItem
  ): Promise<boolean> {
    try {
      // Get user's role in the team
      const teamMemberDoc = await this.firestore
        .collection('organizations')
        .doc(approvalData.organizationId)
        .collection('teams')
        .doc(teamId)
        .collection('members')
        .doc(userId)
        .get();
      
      if (teamMemberDoc.exists) {
        const memberData = teamMemberDoc.data();
        const userRole = memberData?.role;
        
        // Owners, Admins and Editors can approve/reject
        if (userRole === 'owner' || userRole === 'org_admin' || userRole === 'editor') {
          return true;
        }
        
        // Assigned approvers can approve/reject
        if (approvalData.assignedTo && approvalData.assignedTo.includes(userId)) {
          return true;
        }
        
        // Content creator can only cancel their own requests
        if (userId === approvalData.createdBy) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error checking user permissions:', error);
      return false;
    }
  }
  
  /**
   * Update content status in the content collection
   * @param contentId Content ID
   * @param contentType Content type
   * @param status New status
   */
  private async updateContentStatus(
    contentId: string,
    contentType: string,
    status: string
  ): Promise<void> {
    try {
      let collectionName = 'content';
      
      // Map content type to collection name
      switch (contentType) {
        case 'post':
          collectionName = 'posts';
          break;
        case 'story':
          collectionName = 'stories';
          break;
        case 'image':
          collectionName = 'media';
          break;
        case 'video':
          collectionName = 'media';
          break;
        default:
          collectionName = 'content';
      }
      
      // Update the content status
      await this.firestore.collection(collectionName).doc(contentId).update({
        status,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error updating content status:', error);
      // Continue even if this fails
    }
  }
  
  /**
   * Notify approvers about new approval requests
   * @param approvalId Approval request ID
   * @param approverIds Array of approver user IDs
   * @param contentTitle Content title
   * @param requestedByUserId User ID of the requester
   */
  private async notifyApprovers(
    approvalId: string,
    approverIds: string[],
    contentTitle: string,
    requestedByUserId: string
  ): Promise<void> {
    try {
      // Get requester name
      const requesterDoc = await this.firestore.collection('users').doc(requestedByUserId).get();
      const requesterName = requesterDoc.exists
        ? requesterDoc.data()?.displayName || requesterDoc.data()?.email
        : 'A team member';
      
      // Create notification data
      const notificationData = {
        type: 'approval_request',
        title: 'Content approval requested',
        message: `${requesterName} has requested your approval for "${contentTitle}"`,
        targetUrl: `/dashboard/content/approvals/${approvalId}`,
        createdAt: new Date(),
        read: false,
        metadata: {
          approvalId,
          contentTitle,
          requestedBy: requestedByUserId
        }
      };
      
      // Send notifications to all approvers
      const batch = this.firestore.batch();
      
      approverIds.forEach(approverUserId => {
        const notificationRef = this.firestore
          .collection('users')
          .doc(approverUserId)
          .collection('notifications')
          .doc();
        
        batch.set(notificationRef, notificationData);
      });
      
      await batch.commit();
    } catch (error) {
      console.error('Error notifying approvers:', error);
      // Continue even if notifications fail
    }
  }
}

// Create singleton instance
const approvalFlow = new ApprovalFlow();
export default approvalFlow;
