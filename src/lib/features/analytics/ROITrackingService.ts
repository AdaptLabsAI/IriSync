import { getFirebaseFirestore } from '../core/firebase';
import { v4 as uuidv4 } from 'uuid';
import { Timestamp } from 'firebase/firestore';
import { firestore } from '@/lib/core/firebase';

/**
 * Interface for ROI campaign data
 */
export interface ROICampaign {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  userId: string;
  startDate: Date;
  endDate: Date;
  budget: {
    total: number;
    currency: string;
    breakdown: {
      adSpend?: number;
      contentCreation?: number;
      toolsCosts?: number;
      laborCosts?: number;
      other?: number;
    };
  };
  goals: {
    type: 'revenue' | 'leads' | 'engagement' | 'awareness' | 'traffic';
    target: number;
    value?: number; // Monetary value per goal unit
  }[];
  platforms: string[];
  contentIds: string[];
  status: 'planning' | 'active' | 'completed' | 'paused';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface for ROI metrics
 */
export interface ROIMetrics {
  campaignId: string;
  period: {
    start: Date;
    end: Date;
  };
  costs: {
    total: number;
    adSpend: number;
    contentCreation: number;
    toolsCosts: number;
    laborCosts: number;
    other: number;
  };
  revenue: {
    total: number;
    direct: number;
    attributed: number;
    estimated: number;
  };
  conversions: {
    total: number;
    direct: number;
    attributed: number;
    byType: Record<string, number>;
  };
  engagement: {
    likes: number;
    comments: number;
    shares: number;
    clicks: number;
    impressions: number;
    reach: number;
  };
  traffic: {
    sessions: number;
    pageviews: number;
    bounceRate: number;
    avgSessionDuration: number;
  };
  leads: {
    total: number;
    qualified: number;
    converted: number;
    value: number;
  };
  roi: {
    percentage: number;
    ratio: number;
    netProfit: number;
    costPerConversion: number;
    revenuePerDollarSpent: number;
  };
  attribution: {
    firstTouch: number;
    lastTouch: number;
    linear: number;
    timeDecay: number;
    positionBased: number;
  };
  calculatedAt: Date;
}

/**
 * Interface for conversion tracking
 */
export interface ConversionEvent {
  id: string;
  campaignId: string;
  userId?: string;
  sessionId: string;
  type: 'purchase' | 'signup' | 'download' | 'contact' | 'custom';
  value: number;
  currency: string;
  source: string;
  medium: string;
  platform: string;
  contentId?: string;
  touchpoints: {
    platform: string;
    contentId?: string;
    timestamp: Date;
    type: 'impression' | 'click' | 'engagement';
  }[];
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Interface for attribution model configuration
 */
export interface AttributionModel {
  name: string;
  type: 'first-touch' | 'last-touch' | 'linear' | 'time-decay' | 'position-based' | 'custom';
  lookbackWindow: number; // days
  weights?: {
    first?: number;
    last?: number;
    middle?: number;
    decayRate?: number;
  };
  customLogic?: (touchpoints: any[]) => Record<string, number>;
}

/**
 * ROI Tracking Service for comprehensive campaign performance analysis
 */
export class ROITrackingService {
  private readonly CAMPAIGNS_COLLECTION = 'roi_campaigns';
  private readonly METRICS_COLLECTION = 'roi_metrics';
  private readonly CONVERSIONS_COLLECTION = 'roi_conversions';
  
  /**
   * Create a new ROI campaign
   */
  async createCampaign(campaign: Omit<ROICampaign, 'id' | 'createdAt' | 'updatedAt'>): Promise<ROICampaign> {
    const campaignId = uuidv4();
    const now = new Date();
    
    const newCampaign: ROICampaign = {
      ...campaign,
      id: campaignId,
      createdAt: now,
      updatedAt: now
    };
    
    await firestore
      .collection(this.CAMPAIGNS_COLLECTION)
      .doc(campaignId)
      .set({
        ...newCampaign,
        startDate: Timestamp.fromDate(newCampaign.startDate),
        endDate: Timestamp.fromDate(newCampaign.endDate),
        createdAt: Timestamp.fromDate(newCampaign.createdAt),
        updatedAt: Timestamp.fromDate(newCampaign.updatedAt)
      });
    
    return newCampaign;
  }
  
  /**
   * Update an existing campaign
   */
  async updateCampaign(campaignId: string, updates: Partial<ROICampaign>): Promise<void> {
    const updateData = {
      ...updates,
      updatedAt: Timestamp.fromDate(new Date())
    };
    
    if (updates.startDate) {
      updateData.startDate = Timestamp.fromDate(updates.startDate);
    }
    
    if (updates.endDate) {
      updateData.endDate = Timestamp.fromDate(updates.endDate);
    }
    
    await firestore
      .collection(this.CAMPAIGNS_COLLECTION)
      .doc(campaignId)
      .update(updateData);
  }
  
  /**
   * Get campaign by ID
   */
  async getCampaign(campaignId: string): Promise<ROICampaign | null> {
    const doc = await firestore
      .collection(this.CAMPAIGNS_COLLECTION)
      .doc(campaignId)
      .get();
    
    if (!doc.exists) {
      return null;
    }
    
    const data = doc.data()!;
    return {
      ...data,
      startDate: data.startDate.toDate(),
      endDate: data.endDate.toDate(),
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate()
    } as ROICampaign;
  }
  
  /**
   * Get campaigns for an organization
   */
  async getCampaigns(organizationId: string, status?: string): Promise<ROICampaign[]> {
    let query = firestore
      .collection(this.CAMPAIGNS_COLLECTION)
      .where('organizationId', '==', organizationId);
    
    if (status) {
      query = query.where('status', '==', status);
    }
    
    const snapshot = await query.orderBy('createdAt', 'desc').get();
    
    return snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        ...data,
        startDate: data.startDate.toDate(),
        endDate: data.endDate.toDate(),
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate()
      } as ROICampaign;
    });
  }
  
  /**
   * Track a conversion event
   */
  async trackConversion(conversion: Omit<ConversionEvent, 'id' | 'timestamp'>): Promise<ConversionEvent> {
    const conversionId = uuidv4();
    const now = new Date();
    
    const newConversion: ConversionEvent = {
      ...conversion,
      id: conversionId,
      timestamp: now,
      touchpoints: conversion.touchpoints.map(tp => ({
        ...tp,
        timestamp: tp.timestamp
      }))
    };
    
    await firestore
      .collection(this.CONVERSIONS_COLLECTION)
      .doc(conversionId)
      .set({
        ...newConversion,
        timestamp: Timestamp.fromDate(newConversion.timestamp),
        touchpoints: newConversion.touchpoints.map(tp => ({
          ...tp,
          timestamp: Timestamp.fromDate(tp.timestamp)
        }))
      });
    
    return newConversion;
  }
  
  /**
   * Calculate ROI metrics for a campaign
   */
  async calculateROIMetrics(
    campaignId: string,
    startDate: Date,
    endDate: Date,
    attributionModel: AttributionModel = { name: 'last-touch', type: 'last-touch', lookbackWindow: 30 }
  ): Promise<ROIMetrics> {
    const campaign = await this.getCampaign(campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }
    
    // Get conversions for the period
    const conversions = await this.getConversions(campaignId, startDate, endDate);
    
    // Get engagement metrics from analytics
    const engagement = await this.getEngagementMetrics(campaign.contentIds, startDate, endDate);
    
    // Get traffic metrics
    const traffic = await this.getTrafficMetrics(campaignId, startDate, endDate);
    
    // Calculate costs
    const costs = this.calculateCosts(campaign, startDate, endDate);
    
    // Calculate revenue with attribution
    const { revenue, attributedConversions } = this.calculateAttributedRevenue(
      conversions,
      attributionModel
    );
    
    // Calculate leads
    const leads = this.calculateLeadMetrics(conversions);
    
    // Calculate ROI
    const roi = this.calculateROI(costs.total, revenue.total);
    
    // Calculate attribution breakdown
    const attribution = this.calculateAttributionBreakdown(conversions, campaign.contentIds);
    
    const metrics: ROIMetrics = {
      campaignId,
      period: { start: startDate, end: endDate },
      costs,
      revenue,
      conversions: {
        total: conversions.length,
        direct: conversions.filter(c => c.touchpoints.length === 1).length,
        attributed: attributedConversions,
        byType: this.groupConversionsByType(conversions)
      },
      engagement,
      traffic,
      leads,
      roi,
      attribution,
      calculatedAt: new Date()
    };
    
    // Store metrics
    await this.storeMetrics(metrics);
    
    return metrics;
  }
  
  /**
   * Get historical ROI metrics for a campaign
   */
  async getROIMetrics(campaignId: string, limit?: number): Promise<ROIMetrics[]> {
    let query = firestore
      .collection(this.METRICS_COLLECTION)
      .where('campaignId', '==', campaignId)
      .orderBy('calculatedAt', 'desc');
    
    if (limit) {
      query = query.limit(limit);
    }
    
    const snapshot = await query.get();
    
    return snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        ...data,
        period: {
          start: data.period.start.toDate(),
          end: data.period.end.toDate()
        },
        calculatedAt: data.calculatedAt.toDate()
      } as ROIMetrics;
    });
  }
  
  /**
   * Compare ROI across multiple campaigns
   */
  async compareROI(campaignIds: string[], period: { start: Date; end: Date }): Promise<{
    campaigns: Array<{
      campaignId: string;
      name: string;
      roi: number;
      revenue: number;
      costs: number;
      conversions: number;
    }>;
    summary: {
      totalROI: number;
      totalRevenue: number;
      totalCosts: number;
      totalConversions: number;
      bestPerforming: string;
      worstPerforming: string;
    };
  }> {
    const results = [];
    
    for (const campaignId of campaignIds) {
      const campaign = await this.getCampaign(campaignId);
      if (!campaign) continue;
      
      const metrics = await this.calculateROIMetrics(campaignId, period.start, period.end);
      
      results.push({
        campaignId,
        name: campaign.name,
        roi: metrics.roi.percentage,
        revenue: metrics.revenue.total,
        costs: metrics.costs.total,
        conversions: metrics.conversions.total
      });
    }
    
    const totalRevenue = results.reduce((sum, r) => sum + r.revenue, 0);
    const totalCosts = results.reduce((sum, r) => sum + r.costs, 0);
    const totalConversions = results.reduce((sum, r) => sum + r.conversions, 0);
    const totalROI = totalCosts > 0 ? ((totalRevenue - totalCosts) / totalCosts) * 100 : 0;
    
    const bestPerforming = results.reduce((best, current) => 
      current.roi > best.roi ? current : best, results[0]
    );
    
    const worstPerforming = results.reduce((worst, current) => 
      current.roi < worst.roi ? current : worst, results[0]
    );
    
    return {
      campaigns: results,
      summary: {
        totalROI,
        totalRevenue,
        totalCosts,
        totalConversions,
        bestPerforming: bestPerforming?.campaignId || '',
        worstPerforming: worstPerforming?.campaignId || ''
      }
    };
  }
  
  /**
   * Get ROI trends over time
   */
  async getROITrends(
    campaignId: string,
    period: { start: Date; end: Date },
    interval: 'daily' | 'weekly' | 'monthly' = 'weekly'
  ): Promise<Array<{
    date: Date;
    roi: number;
    revenue: number;
    costs: number;
    conversions: number;
  }>> {
    const intervals = this.generateTimeIntervals(period.start, period.end, interval);
    const trends = [];
    
    for (const intervalPeriod of intervals) {
      const metrics = await this.calculateROIMetrics(
        campaignId,
        intervalPeriod.start,
        intervalPeriod.end
      );
      
      trends.push({
        date: intervalPeriod.start,
        roi: metrics.roi.percentage,
        revenue: metrics.revenue.total,
        costs: metrics.costs.total,
        conversions: metrics.conversions.total
      });
    }
    
    return trends;
  }
  
  /**
   * Get conversions for a campaign within a date range
   */
  private async getConversions(
    campaignId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ConversionEvent[]> {
    const snapshot = await firestore
      .collection(this.CONVERSIONS_COLLECTION)
      .where('campaignId', '==', campaignId)
      .where('timestamp', '>=', Timestamp.fromDate(startDate))
      .where('timestamp', '<=', Timestamp.fromDate(endDate))
      .get();
    
    return snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        ...data,
        timestamp: data.timestamp.toDate(),
        touchpoints: data.touchpoints.map((tp: any) => ({
          ...tp,
          timestamp: tp.timestamp.toDate()
        }))
      } as ConversionEvent;
    });
  }
  
  /**
   * Get engagement metrics from analytics service
   */
  private async getEngagementMetrics(
    contentIds: string[],
    startDate: Date,
    endDate: Date
  ): Promise<ROIMetrics['engagement']> {
    // This would integrate with your analytics service
    // For now, returning mock data structure
    return {
      likes: 0,
      comments: 0,
      shares: 0,
      clicks: 0,
      impressions: 0,
      reach: 0
    };
  }
  
  /**
   * Get traffic metrics
   */
  private async getTrafficMetrics(
    campaignId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ROIMetrics['traffic']> {
    // This would integrate with Google Analytics or similar
    // For now, returning mock data structure
    return {
      sessions: 0,
      pageviews: 0,
      bounceRate: 0,
      avgSessionDuration: 0
    };
  }
  
  /**
   * Calculate costs for a campaign period
   */
  private calculateCosts(
    campaign: ROICampaign,
    startDate: Date,
    endDate: Date
  ): ROIMetrics['costs'] {
    const campaignDuration = campaign.endDate.getTime() - campaign.startDate.getTime();
    const periodDuration = endDate.getTime() - startDate.getTime();
    const ratio = Math.min(periodDuration / campaignDuration, 1);
    
    return {
      total: campaign.budget.total * ratio,
      adSpend: (campaign.budget.breakdown.adSpend || 0) * ratio,
      contentCreation: (campaign.budget.breakdown.contentCreation || 0) * ratio,
      toolsCosts: (campaign.budget.breakdown.toolsCosts || 0) * ratio,
      laborCosts: (campaign.budget.breakdown.laborCosts || 0) * ratio,
      other: (campaign.budget.breakdown.other || 0) * ratio
    };
  }
  
  /**
   * Calculate attributed revenue using attribution model
   */
  private calculateAttributedRevenue(
    conversions: ConversionEvent[],
    attributionModel: AttributionModel
  ): { revenue: ROIMetrics['revenue']; attributedConversions: number } {
    let totalRevenue = 0;
    let directRevenue = 0;
    let attributedRevenue = 0;
    let attributedConversions = 0;
    
    for (const conversion of conversions) {
      totalRevenue += conversion.value;
      
      if (conversion.touchpoints.length === 1) {
        directRevenue += conversion.value;
      } else {
        attributedRevenue += conversion.value;
        attributedConversions++;
      }
    }
    
    return {
      revenue: {
        total: totalRevenue,
        direct: directRevenue,
        attributed: attributedRevenue,
        estimated: totalRevenue // Could add estimation logic here
      },
      attributedConversions
    };
  }
  
  /**
   * Calculate lead metrics
   */
  private calculateLeadMetrics(conversions: ConversionEvent[]): ROIMetrics['leads'] {
    const leadConversions = conversions.filter(c => 
      ['signup', 'contact', 'download'].includes(c.type)
    );
    
    const purchaseConversions = conversions.filter(c => c.type === 'purchase');
    
    return {
      total: leadConversions.length,
      qualified: leadConversions.filter(c => c.value > 0).length,
      converted: purchaseConversions.length,
      value: leadConversions.reduce((sum, c) => sum + c.value, 0)
    };
  }
  
  /**
   * Calculate ROI metrics
   */
  private calculateROI(totalCosts: number, totalRevenue: number): ROIMetrics['roi'] {
    const netProfit = totalRevenue - totalCosts;
    const roiPercentage = totalCosts > 0 ? (netProfit / totalCosts) * 100 : 0;
    const roiRatio = totalCosts > 0 ? totalRevenue / totalCosts : 0;
    const revenuePerDollarSpent = totalCosts > 0 ? totalRevenue / totalCosts : 0;
    
    return {
      percentage: roiPercentage,
      ratio: roiRatio,
      netProfit,
      costPerConversion: 0, // Would be calculated with conversion count
      revenuePerDollarSpent
    };
  }
  
  /**
   * Calculate attribution breakdown
   */
  private calculateAttributionBreakdown(
    conversions: ConversionEvent[],
    contentIds: string[]
  ): ROIMetrics['attribution'] {
    // Simplified attribution calculation
    // In production, this would use sophisticated attribution models
    const totalValue = conversions.reduce((sum, c) => sum + c.value, 0);
    
    return {
      firstTouch: totalValue * 0.4,
      lastTouch: totalValue * 0.4,
      linear: totalValue * 0.2,
      timeDecay: totalValue * 0.3,
      positionBased: totalValue * 0.35
    };
  }
  
  /**
   * Group conversions by type
   */
  private groupConversionsByType(conversions: ConversionEvent[]): Record<string, number> {
    return conversions.reduce((acc, conversion) => {
      acc[conversion.type] = (acc[conversion.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
  
  /**
   * Store calculated metrics
   */
  private async storeMetrics(metrics: ROIMetrics): Promise<void> {
    const metricsId = uuidv4();
    
    await firestore
      .collection(this.METRICS_COLLECTION)
      .doc(metricsId)
      .set({
        ...metrics,
        period: {
          start: Timestamp.fromDate(metrics.period.start),
          end: Timestamp.fromDate(metrics.period.end)
        },
        calculatedAt: Timestamp.fromDate(metrics.calculatedAt)
      });
  }
  
  /**
   * Generate time intervals for trend analysis
   */
  private generateTimeIntervals(
    start: Date,
    end: Date,
    interval: 'daily' | 'weekly' | 'monthly'
  ): Array<{ start: Date; end: Date }> {
    const intervals = [];
    let current = new Date(start);
    
    while (current < end) {
      const intervalEnd = new Date(current);
      
      switch (interval) {
        case 'daily':
          intervalEnd.setDate(intervalEnd.getDate() + 1);
          break;
        case 'weekly':
          intervalEnd.setDate(intervalEnd.getDate() + 7);
          break;
        case 'monthly':
          intervalEnd.setMonth(intervalEnd.getMonth() + 1);
          break;
      }
      
      intervals.push({
        start: new Date(current),
        end: new Date(Math.min(intervalEnd.getTime(), end.getTime()))
      });
      
      current = intervalEnd;
    }
    
    return intervals;
  }
}

// Create and export singleton instance
const roiTrackingService = new ROITrackingService();
export default roiTrackingService; 