/**
 * Campaign Service
 *
 * Manages multi-post marketing campaigns with orchestration, scheduling,
 * performance tracking, and ROI analysis.
 *
 * Features:
 * - Multi-post campaign creation and management
 * - Campaign scheduling across multiple platforms
 * - Performance tracking and analytics
 * - Budget and ROI monitoring
 * - A/B testing support
 * - Campaign templates
 * - Goal setting and tracking
 */

import { getFirebaseFirestore, firestore } from '@/lib/core/firebase';
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  Timestamp,
  addDoc,
  limit as firestoreLimit,
} from 'firebase/firestore';

/**
 * Campaign status
 */
export enum CampaignStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ARCHIVED = 'archived',
}

/**
 * Campaign goal types
 */
export enum CampaignGoal {
  BRAND_AWARENESS = 'brand_awareness',
  ENGAGEMENT = 'engagement',
  TRAFFIC = 'traffic',
  CONVERSIONS = 'conversions',
  LEADS = 'leads',
  SALES = 'sales',
}

/**
 * Campaign type
 */
export enum CampaignType {
  PRODUCT_LAUNCH = 'product_launch',
  PROMOTION = 'promotion',
  EVENT = 'event',
  SEASONAL = 'seasonal',
  BRAND_BUILDING = 'brand_building',
  CONTENT_SERIES = 'content_series',
  USER_GENERATED = 'user_generated',
  CUSTOM = 'custom',
}

/**
 * Campaign post
 */
export interface CampaignPost {
  postId?: string;
  platformType: string;
  content: string;
  mediaAssets?: string[]; // Asset IDs
  scheduledFor?: Date;
  publishedAt?: Date;
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  isABTest?: boolean;
  abTestVariant?: 'A' | 'B';
  performance?: {
    reach?: number;
    impressions?: number;
    engagement?: number;
    clicks?: number;
    conversions?: number;
  };
}

/**
 * Campaign budget
 */
export interface CampaignBudget {
  total: number; // in cents
  spent: number; // in cents
  currency: string;
  breakdown?: {
    content: number;
    ads: number;
    tools: number;
    other: number;
  };
}

/**
 * Campaign goals and KPIs
 */
export interface CampaignGoals {
  primary: CampaignGoal;
  targetReach?: number;
  targetImpressions?: number;
  targetEngagement?: number;
  targetClicks?: number;
  targetConversions?: number;
  targetROI?: number; // percentage
}

/**
 * Campaign
 */
export interface Campaign {
  id?: string;
  organizationId: string;
  name: string;
  description?: string;
  type: CampaignType;
  status: CampaignStatus;
  goals: CampaignGoals;
  budget?: CampaignBudget;
  posts: CampaignPost[];
  startDate?: Date;
  endDate?: Date;
  tags?: string[];
  createdBy: string;
  createdByName?: string;
  assignedTo?: string[]; // User IDs
  metrics?: {
    totalReach: number;
    totalImpressions: number;
    totalEngagement: number;
    totalClicks: number;
    totalConversions: number;
    roi: number; // percentage
    completionRate: number; // percentage of posts published
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Campaign template
 */
export interface CampaignTemplate {
  id?: string;
  organizationId: string;
  name: string;
  description?: string;
  type: CampaignType;
  defaultGoals: CampaignGoals;
  postTemplates: Array<{
    platformType: string;
    contentTemplate: string;
    schedulingOffset?: number; // days from campaign start
  }>;
  isPublic: boolean;
  createdBy: string;
  createdAt: Date;
}

class CampaignService {
  private readonly CAMPAIGNS_COLLECTION = 'campaigns';
  private readonly TEMPLATES_COLLECTION = 'campaignTemplates';

  /**
   * Create campaign
   */
  async createCampaign(
    organizationId: string,
    name: string,
    type: CampaignType,
    goals: CampaignGoals,
    createdBy: string,
    options?: {
      description?: string;
      budget?: CampaignBudget;
      startDate?: Date;
      endDate?: Date;
      tags?: string[];
      assignedTo?: string[];
    }
  ): Promise<Campaign> {
    try {
      // Get creator name
      const firestore = getFirebaseFirestore();
      if (!firestore) {
        return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
      }
      const userDoc = await getDoc(doc(firestore, 'users', createdBy));
      const createdByName = userDoc.exists()
        ? userDoc.data().name || userDoc.data().email
        : undefined;

      const campaign: Omit<Campaign, 'id'> = {
        organizationId,
        name,
        description: options?.description,
        type,
        status: CampaignStatus.DRAFT,
        goals,
        budget: options?.budget,
        posts: [],
        startDate: options?.startDate,
        endDate: options?.endDate,
        tags: options?.tags || [],
        createdBy,
        createdByName,
        assignedTo: options?.assignedTo || [createdBy],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const campaignRef = await addDoc(collection(firestore, this.CAMPAIGNS_COLLECTION), {
        ...campaign,
        startDate: campaign.startDate ? Timestamp.fromDate(campaign.startDate) : undefined,
        endDate: campaign.endDate ? Timestamp.fromDate(campaign.endDate) : undefined,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      return { ...campaign, id: campaignRef.id };
    } catch (error) {
      console.error('Error creating campaign:', error);
      throw new Error('Failed to create campaign');
    }
  }

  /**
   * Get campaigns for organization
   */
  async getCampaigns(
    organizationId: string,
    filters?: {
      status?: CampaignStatus;
      type?: CampaignType;
      createdBy?: string;
      assignedTo?: string;
    },
    limitCount: number = 50
  ): Promise<Campaign[]> {
    try {
      let campaignsQuery = query(
        collection(firestore, this.CAMPAIGNS_COLLECTION),
        where('organizationId', '==', organizationId)
      );

      if (filters?.status) {
        campaignsQuery = query(campaignsQuery, where('status', '==', filters.status));
      }

      if (filters?.type) {
        campaignsQuery = query(campaignsQuery, where('type', '==', filters.type));
      }

      if (filters?.createdBy) {
        campaignsQuery = query(campaignsQuery, where('createdBy', '==', filters.createdBy));
      }

      campaignsQuery = query(
        campaignsQuery,
        orderBy('createdAt', 'desc'),
        firestoreLimit(limitCount)
      );

      const campaignsDocs = await getDocs(campaignsQuery);
      const campaigns: Campaign[] = [];

      campaignsDocs.forEach((doc) => {
        const data = doc.data();
        campaigns.push({
          id: doc.id,
          organizationId: data.organizationId,
          name: data.name,
          description: data.description,
          type: data.type,
          status: data.status,
          goals: data.goals,
          budget: data.budget,
          posts: data.posts || [],
          startDate: data.startDate?.toDate(),
          endDate: data.endDate?.toDate(),
          tags: data.tags || [],
          createdBy: data.createdBy,
          createdByName: data.createdByName,
          assignedTo: data.assignedTo || [],
          metrics: data.metrics,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        });
      });

      return campaigns;
    } catch (error) {
      console.error('Error getting campaigns:', error);
      return [];
    }
  }

  /**
   * Get campaign by ID
   */
  async getCampaign(campaignId: string): Promise<Campaign | null> {
    try {
      const campaignDoc = await getDoc(doc(firestore, this.CAMPAIGNS_COLLECTION, campaignId));

      if (!campaignDoc.exists()) {
        return null;
      }

      const data = campaignDoc.data();
      return {
        id: campaignDoc.id,
        organizationId: data.organizationId,
        name: data.name,
        description: data.description,
        type: data.type,
        status: data.status,
        goals: data.goals,
        budget: data.budget,
        posts: data.posts || [],
        startDate: data.startDate?.toDate(),
        endDate: data.endDate?.toDate(),
        tags: data.tags || [],
        createdBy: data.createdBy,
        createdByName: data.createdByName,
        assignedTo: data.assignedTo || [],
        metrics: data.metrics,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      };
    } catch (error) {
      console.error('Error getting campaign:', error);
      return null;
    }
  }

  /**
   * Update campaign
   */
  async updateCampaign(
    campaignId: string,
    updates: Partial<Omit<Campaign, 'id' | 'organizationId' | 'createdBy' | 'createdAt'>>
  ): Promise<void> {
    try {
      const campaignRef = doc(firestore, this.CAMPAIGNS_COLLECTION, campaignId);

      const updateData: any = {
        ...updates,
        updatedAt: Timestamp.now(),
      };

      if (updates.startDate) {
        updateData.startDate = Timestamp.fromDate(updates.startDate);
      }

      if (updates.endDate) {
        updateData.endDate = Timestamp.fromDate(updates.endDate);
      }

      await updateDoc(campaignRef, updateData);
    } catch (error) {
      console.error('Error updating campaign:', error);
      throw new Error('Failed to update campaign');
    }
  }

  /**
   * Add post to campaign
   */
  async addPost(
    campaignId: string,
    post: Omit<CampaignPost, 'status'>
  ): Promise<void> {
    try {
      const campaign = await this.getCampaign(campaignId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      const newPost: CampaignPost = {
        ...post,
        status: 'draft',
      };

      campaign.posts.push(newPost);

      await this.updateCampaign(campaignId, { posts: campaign.posts });
    } catch (error) {
      console.error('Error adding post to campaign:', error);
      throw error;
    }
  }

  /**
   * Update campaign post
   */
  async updatePost(
    campaignId: string,
    postIndex: number,
    updates: Partial<CampaignPost>
  ): Promise<void> {
    try {
      const campaign = await this.getCampaign(campaignId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      if (postIndex < 0 || postIndex >= campaign.posts.length) {
        throw new Error('Invalid post index');
      }

      campaign.posts[postIndex] = {
        ...campaign.posts[postIndex],
        ...updates,
      };

      await this.updateCampaign(campaignId, { posts: campaign.posts });
    } catch (error) {
      console.error('Error updating campaign post:', error);
      throw error;
    }
  }

  /**
   * Remove post from campaign
   */
  async removePost(campaignId: string, postIndex: number): Promise<void> {
    try {
      const campaign = await this.getCampaign(campaignId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      if (postIndex < 0 || postIndex >= campaign.posts.length) {
        throw new Error('Invalid post index');
      }

      campaign.posts.splice(postIndex, 1);

      await this.updateCampaign(campaignId, { posts: campaign.posts });
    } catch (error) {
      console.error('Error removing post from campaign:', error);
      throw error;
    }
  }

  /**
   * Update campaign status
   */
  async updateStatus(campaignId: string, status: CampaignStatus): Promise<void> {
    try {
      await this.updateCampaign(campaignId, { status });

      // If activating, set start date if not set
      if (status === CampaignStatus.ACTIVE) {
        const campaign = await this.getCampaign(campaignId);
        if (campaign && !campaign.startDate) {
          await this.updateCampaign(campaignId, { startDate: new Date() });
        }
      }

      // If completing, set end date if not set
      if (status === CampaignStatus.COMPLETED) {
        const campaign = await this.getCampaign(campaignId);
        if (campaign && !campaign.endDate) {
          await this.updateCampaign(campaignId, { endDate: new Date() });
        }
      }
    } catch (error) {
      console.error('Error updating campaign status:', error);
      throw error;
    }
  }

  /**
   * Calculate campaign metrics
   */
  async calculateMetrics(campaignId: string): Promise<void> {
    try {
      const campaign = await this.getCampaign(campaignId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      let totalReach = 0;
      let totalImpressions = 0;
      let totalEngagement = 0;
      let totalClicks = 0;
      let totalConversions = 0;

      // Aggregate metrics from all posts
      campaign.posts.forEach((post) => {
        if (post.performance) {
          totalReach += post.performance.reach || 0;
          totalImpressions += post.performance.impressions || 0;
          totalEngagement += post.performance.engagement || 0;
          totalClicks += post.performance.clicks || 0;
          totalConversions += post.performance.conversions || 0;
        }
      });

      // Calculate completion rate
      const publishedPosts = campaign.posts.filter((p) => p.status === 'published').length;
      const completionRate = campaign.posts.length > 0
        ? (publishedPosts / campaign.posts.length) * 100
        : 0;

      // Calculate ROI
      let roi = 0;
      if (campaign.budget && campaign.budget.spent > 0) {
        // ROI = ((Revenue - Cost) / Cost) * 100
        // For now, using conversions as revenue proxy
        const estimatedRevenue = totalConversions * 100; // Placeholder: $1 per conversion
        roi = ((estimatedRevenue - campaign.budget.spent / 100) / (campaign.budget.spent / 100)) * 100;
      }

      const metrics = {
        totalReach,
        totalImpressions,
        totalEngagement,
        totalClicks,
        totalConversions,
        roi,
        completionRate,
      };

      await this.updateCampaign(campaignId, { metrics });
    } catch (error) {
      console.error('Error calculating campaign metrics:', error);
      throw error;
    }
  }

  /**
   * Get campaign performance summary
   */
  async getPerformanceSummary(organizationId: string, days: number = 30): Promise<any> {
    try {
      const campaigns = await this.getCampaigns(organizationId);

      // Filter campaigns updated in last N days
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const recentCampaigns = campaigns.filter(
        (c) => c.updatedAt && c.updatedAt >= cutoffDate
      );

      let totalCampaigns = recentCampaigns.length;
      let activeCampaigns = 0;
      let completedCampaigns = 0;
      let totalPosts = 0;
      let publishedPosts = 0;
      let totalReach = 0;
      let totalEngagement = 0;
      let totalBudget = 0;
      let totalSpent = 0;

      recentCampaigns.forEach((campaign) => {
        if (campaign.status === CampaignStatus.ACTIVE) activeCampaigns++;
        if (campaign.status === CampaignStatus.COMPLETED) completedCampaigns++;

        totalPosts += campaign.posts.length;
        publishedPosts += campaign.posts.filter((p) => p.status === 'published').length;

        if (campaign.metrics) {
          totalReach += campaign.metrics.totalReach || 0;
          totalEngagement += campaign.metrics.totalEngagement || 0;
        }

        if (campaign.budget) {
          totalBudget += campaign.budget.total;
          totalSpent += campaign.budget.spent;
        }
      });

      const avgEngagementRate = totalReach > 0 ? (totalEngagement / totalReach) * 100 : 0;
      const budgetUtilization = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

      return {
        totalCampaigns,
        activeCampaigns,
        completedCampaigns,
        totalPosts,
        publishedPosts,
        totalReach,
        totalEngagement,
        avgEngagementRate,
        totalBudget: totalBudget / 100, // Convert to dollars
        totalSpent: totalSpent / 100,
        budgetUtilization,
      };
    } catch (error) {
      console.error('Error getting performance summary:', error);
      return null;
    }
  }

  /**
   * Create campaign template
   */
  async createTemplate(
    organizationId: string,
    name: string,
    type: CampaignType,
    defaultGoals: CampaignGoals,
    postTemplates: CampaignTemplate['postTemplates'],
    createdBy: string,
    options?: {
      description?: string;
      isPublic?: boolean;
    }
  ): Promise<CampaignTemplate> {
    try {
      const template: Omit<CampaignTemplate, 'id'> = {
        organizationId,
        name,
        description: options?.description,
        type,
        defaultGoals,
        postTemplates,
        isPublic: options?.isPublic || false,
        createdBy,
        createdAt: new Date(),
      };

      const templateRef = await addDoc(collection(firestore, this.TEMPLATES_COLLECTION), {
        ...template,
        createdAt: Timestamp.now(),
      });

      return { ...template, id: templateRef.id };
    } catch (error) {
      console.error('Error creating campaign template:', error);
      throw new Error('Failed to create campaign template');
    }
  }

  /**
   * Get campaign templates
   */
  async getTemplates(organizationId: string): Promise<CampaignTemplate[]> {
    try {
      const templatesQuery = query(
        collection(firestore, this.TEMPLATES_COLLECTION),
        where('organizationId', '==', organizationId),
        orderBy('createdAt', 'desc')
      );

      const templatesDocs = await getDocs(templatesQuery);
      const templates: CampaignTemplate[] = [];

      templatesDocs.forEach((doc) => {
        const data = doc.data();
        templates.push({
          id: doc.id,
          organizationId: data.organizationId,
          name: data.name,
          description: data.description,
          type: data.type,
          defaultGoals: data.defaultGoals,
          postTemplates: data.postTemplates,
          isPublic: data.isPublic,
          createdBy: data.createdBy,
          createdAt: data.createdAt?.toDate() || new Date(),
        });
      });

      return templates;
    } catch (error) {
      console.error('Error getting campaign templates:', error);
      return [];
    }
  }

  /**
   * Delete campaign
   */
  async deleteCampaign(campaignId: string): Promise<void> {
    try {
      await deleteDoc(doc(firestore, this.CAMPAIGNS_COLLECTION, campaignId));
    } catch (error) {
      console.error('Error deleting campaign:', error);
      throw new Error('Failed to delete campaign');
    }
  }
}

// Export singleton instance
export const campaignService = new CampaignService();
