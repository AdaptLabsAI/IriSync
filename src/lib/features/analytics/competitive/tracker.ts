import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc,
  updateDoc,
  doc,
  Timestamp,
  orderBy,
  limit
} from 'firebase/firestore';
import { firestore as db } from '../../../lib/core/firebase';
import logger from '../../../lib/logging/logger';
import { CompetitorData } from '../models/benchmarking';
import { User } from '../../../lib/core/models/User';
import { getUserCompetitorLimit } from './benchmarking';

// Collection references
const COMPETITOR_TRACKING_COLLECTION = 'competitorTracking';
const COMPETITOR_SNAPSHOTS_COLLECTION = 'competitorSnapshots';
const COMPETITOR_ALERTS_COLLECTION = 'competitorAlerts';

/**
 * Competitor tracking configuration
 */
export interface CompetitorTrackingConfig {
  competitors: string[]; // Competitor IDs to track
  platforms: string[]; // Platform IDs to track
  metrics: string[]; // Metrics to track
  frequency: 'daily' | 'weekly'; // Tracking frequency
  alertThresholds?: {
    percentChangeThreshold: number;
    absoluteChangeThreshold?: number;
    metricSpecificThresholds?: Record<string, {
      percentChange: number;
      absoluteChange?: number;
    }>;
  };
  isActive: boolean;
  lastRun?: Timestamp;
}

/**
 * Competitor snapshot
 */
export interface CompetitorSnapshot {
  competitorId: string;
  competitorName: string;
  platformId: string;
  metrics: Record<string, number>;
  contentCount: number;
  followerCount?: number;
  engagementRate?: number;
  topContent?: {
    contentId: string;
    contentUrl: string;
    publishedAt: Timestamp;
    engagement: number;
    metrics: Record<string, number>;
  }[];
  timestamp: Timestamp;
}

/**
 * Competitor alert
 */
export interface CompetitorAlert {
  competitorId: string;
  competitorName: string;
  platformId: string;
  metricId: string;
  metricName: string;
  previousValue: number;
  currentValue: number;
  percentChange: number;
  absoluteChange: number;
  timestamp: Timestamp;
  priority: 'high' | 'medium' | 'low';
  isRead: boolean;
  context?: string;
  relatedContentUrl?: string;
}

/**
 * Create or update competitor tracking configuration
 * @param userId User ID
 * @param config Tracking configuration
 * @returns The tracking configuration ID
 */
export async function createOrUpdateTrackingConfig(
  userId: string,
  config: Omit<CompetitorTrackingConfig, 'lastRun'>
): Promise<string> {
  try {
    // Get user's competitor limit
    const competitorLimit = await getUserCompetitorLimit(userId);
    
    // Validate competitor count against limit
    if (config.competitors.length > competitorLimit) {
      throw new Error(`Competitor limit exceeded. Maximum allowed: ${competitorLimit}`);
    }
    
    // Check if a configuration already exists
    const existingQuery = query(
      collection(db, COMPETITOR_TRACKING_COLLECTION),
      where('userId', '==', userId)
    );
    
    const snapshot = await getDocs(existingQuery);
    
    if (!snapshot.empty) {
      // Update existing configuration
      const docRef = doc(db, COMPETITOR_TRACKING_COLLECTION, snapshot.docs[0].id);
      await updateDoc(docRef, {
        ...config,
        updatedAt: Timestamp.now()
      });
      
      logger.info('Updated competitor tracking configuration', { userId });
      return snapshot.docs[0].id;
    } else {
      // Create new configuration
      const docRef = await addDoc(collection(db, COMPETITOR_TRACKING_COLLECTION), {
        userId,
        ...config,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      
      logger.info('Created competitor tracking configuration', { userId });
      return docRef.id;
    }
  } catch (error) {
    logger.error('Error creating/updating tracking configuration', { error, userId });
    throw error;
  }
}

/**
 * Get competitor tracking configuration for a user
 * @param userId User ID
 * @returns Tracking configuration or null if not found
 */
export async function getTrackingConfig(
  userId: string
): Promise<(CompetitorTrackingConfig & { id: string }) | null> {
  try {
    const q = query(
      collection(db, COMPETITOR_TRACKING_COLLECTION),
      where('userId', '==', userId)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return null;
    }
    
    const data = snapshot.docs[0].data() as CompetitorTrackingConfig;
    return {
      id: snapshot.docs[0].id,
      ...data
    };
  } catch (error) {
    logger.error('Error getting tracking configuration', { error, userId });
    return null;
  }
}

/**
 * Create a new competitor snapshot
 * @param competitorId Competitor ID
 * @param snapshot Snapshot data
 * @returns The snapshot ID
 */
export async function createCompetitorSnapshot(
  competitorId: string,
  snapshot: Omit<CompetitorSnapshot, 'competitorId' | 'timestamp'>
): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, COMPETITOR_SNAPSHOTS_COLLECTION), {
      competitorId,
      ...snapshot,
      timestamp: Timestamp.now()
    });
    
    logger.info('Created competitor snapshot', { 
      competitorId, 
      competitor: snapshot.competitorName,
      platform: snapshot.platformId
    });
    
    return docRef.id;
  } catch (error) {
    logger.error('Error creating competitor snapshot', { 
      error, 
      competitorId, 
      competitor: snapshot.competitorName
    });
    throw error;
  }
}

/**
 * Get competitor snapshots for a specific competitor
 * @param competitorId Competitor ID
 * @param maxResults Maximum number of snapshots to return
 * @param platformId Optional platform ID filter
 * @returns Array of competitor snapshots
 */
export async function getCompetitorSnapshots(
  competitorId: string,
  maxResults: number = 10,
  platformId?: string
): Promise<(CompetitorSnapshot & { id: string })[]> {
  try {
    let q;
    
    if (platformId) {
      q = query(
        collection(db, COMPETITOR_SNAPSHOTS_COLLECTION),
        where('competitorId', '==', competitorId),
        where('platformId', '==', platformId),
        orderBy('timestamp', 'desc'),
        limit(maxResults)
      );
    } else {
      q = query(
        collection(db, COMPETITOR_SNAPSHOTS_COLLECTION),
        where('competitorId', '==', competitorId),
        orderBy('timestamp', 'desc'),
        limit(maxResults)
      );
    }
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as CompetitorSnapshot & { id: string }));
  } catch (error) {
    logger.error('Error getting competitor snapshots', { error, competitorId });
    return [];
  }
}

/**
 * Create a new competitor alert
 * @param alert Alert data
 * @returns The alert ID
 */
export async function createCompetitorAlert(
  alert: Omit<CompetitorAlert, 'timestamp' | 'isRead'>
): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, COMPETITOR_ALERTS_COLLECTION), {
      ...alert,
      timestamp: Timestamp.now(),
      isRead: false
    });
    
    logger.info('Created competitor alert', { 
      competitorId: alert.competitorId,
      competitor: alert.competitorName,
      metricId: alert.metricId,
      percentChange: alert.percentChange
    });
    
    return docRef.id;
  } catch (error) {
    logger.error('Error creating competitor alert', { 
      error, 
      competitorId: alert.competitorId,
      metricId: alert.metricId
    });
    throw error;
  }
}

/**
 * Get competitor alerts for a user
 * @param userId User ID
 * @param onlyUnread Only return unread alerts
 * @param maxResults Maximum number of alerts to return
 * @returns Array of competitor alerts
 */
export async function getCompetitorAlerts(
  userId: string,
  onlyUnread: boolean = false,
  maxResults: number = 20
): Promise<(CompetitorAlert & { id: string })[]> {
  try {
    // Build constraints separately for different types
    const whereConstraints = [];
    if (onlyUnread) {
      whereConstraints.push(where('isRead', '==', false));
    }
    
    // First get the competitor IDs for this user
    const competitorQuery = query(
      collection(db, 'competitors'),
      where('userId', '==', userId)
    );
    
    const competitorSnapshot = await getDocs(competitorQuery);
    const competitorIds = competitorSnapshot.docs.map(doc => doc.id);
    
    if (competitorIds.length === 0) {
      return [];
    }
    
    // Then query alerts for these competitors
    const q = query(
      collection(db, COMPETITOR_ALERTS_COLLECTION),
      where('competitorId', 'in', competitorIds),
      ...whereConstraints,
      orderBy('timestamp', 'desc'),
      limit(maxResults)
    );
    
    const alertSnapshot = await getDocs(q);
    
    return alertSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as CompetitorAlert & { id: string }));
  } catch (error) {
    logger.error('Error getting competitor alerts', { error, userId });
    return [];
  }
}

/**
 * Mark competitor alert as read
 * @param alertId Alert ID
 * @returns Success status
 */
export async function markAlertAsRead(alertId: string): Promise<boolean> {
  try {
    const docRef = doc(db, COMPETITOR_ALERTS_COLLECTION, alertId);
    await updateDoc(docRef, {
      isRead: true
    });
    
    logger.info('Marked competitor alert as read', { alertId });
    return true;
  } catch (error) {
    logger.error('Error marking alert as read', { error, alertId });
    return false;
  }
}

/**
 * Check for significant changes and create alerts
 * @param competitorId Competitor ID
 * @param newSnapshot New snapshot data
 * @param previousSnapshot Previous snapshot data
 * @param thresholds Alert thresholds
 */
export async function detectAndCreateAlerts(
  competitorId: string,
  competitorName: string,
  newSnapshot: CompetitorSnapshot,
  previousSnapshot: CompetitorSnapshot,
  thresholds: NonNullable<CompetitorTrackingConfig['alertThresholds']>
): Promise<void> {
  try {
    const { metrics: newMetrics } = newSnapshot;
    const { metrics: previousMetrics } = previousSnapshot;
    
    // Check each metric for significant changes
    for (const [metricId, currentValue] of Object.entries(newMetrics)) {
      const previousValue = previousMetrics[metricId];
      
      // Skip if previous value doesn't exist
      if (previousValue === undefined) continue;
      
      // Calculate changes
      const absoluteChange = currentValue - previousValue;
      const percentChange = (previousValue !== 0) 
        ? (absoluteChange / previousValue) * 100 
        : 0;
      
      // Get metric-specific thresholds if available, otherwise use default
      const metricThresholds = thresholds.metricSpecificThresholds?.[metricId] || {
        percentChange: thresholds.percentChangeThreshold,
        absoluteChange: thresholds.absoluteChangeThreshold
      };
      
      // Check if changes exceed thresholds
      const percentThresholdExceeded = Math.abs(percentChange) >= metricThresholds.percentChange;
      const absoluteThresholdExceeded = metricThresholds.absoluteChange !== undefined && 
        Math.abs(absoluteChange) >= metricThresholds.absoluteChange;
      
      if (percentThresholdExceeded || absoluteThresholdExceeded) {
        // Determine priority based on magnitude of change
        let priority: 'high' | 'medium' | 'low' = 'medium';
        
        if (Math.abs(percentChange) >= metricThresholds.percentChange * 2) {
          priority = 'high';
        } else if (Math.abs(percentChange) < metricThresholds.percentChange * 1.2) {
          priority = 'low';
        }
        
        // Create context message
        const direction = percentChange > 0 ? 'increased' : 'decreased';
        const context = `${metricId} ${direction} by ${Math.abs(percentChange).toFixed(2)}% from ${previousValue} to ${currentValue}`;
        
        // Create alert
        await createCompetitorAlert({
          competitorId,
          competitorName,
          platformId: newSnapshot.platformId,
          metricId,
          metricName: metricId, // This should be replaced with a proper metric name lookup
          previousValue,
          currentValue,
          percentChange,
          absoluteChange,
          priority,
          context
        });
      }
    }
    
    // Check for follower change if available
    if (newSnapshot.followerCount !== undefined && 
        previousSnapshot.followerCount !== undefined) {
      const followerChange = newSnapshot.followerCount - previousSnapshot.followerCount;
      const followerPercentChange = (previousSnapshot.followerCount !== 0)
        ? (followerChange / previousSnapshot.followerCount) * 100
        : 0;
      
      if (Math.abs(followerPercentChange) >= thresholds.percentChangeThreshold) {
        const direction = followerPercentChange > 0 ? 'gained' : 'lost';
        const context = `Competitor ${direction} ${Math.abs(followerChange)} followers (${Math.abs(followerPercentChange).toFixed(2)}% change)`;
        
        await createCompetitorAlert({
          competitorId,
          competitorName,
          platformId: newSnapshot.platformId,
          metricId: 'followerCount',
          metricName: 'Followers',
          previousValue: previousSnapshot.followerCount,
          currentValue: newSnapshot.followerCount,
          percentChange: followerPercentChange,
          absoluteChange: followerChange,
          priority: Math.abs(followerPercentChange) >= thresholds.percentChangeThreshold * 1.5 ? 'high' : 'medium',
          context
        });
      }
    }
    
    logger.info('Completed alert detection for competitor', { 
      competitorId, 
      platform: newSnapshot.platformId
    });
  } catch (error) {
    logger.error('Error detecting and creating alerts', { 
      error, 
      competitorId,
      platform: newSnapshot.platformId
    });
  }
}

/**
 * Run a tracking job for all competitors in a configuration
 * @param trackingConfigId Tracking configuration ID
 * @returns Success status
 */
export async function runCompetitorTrackingJob(trackingConfigId: string): Promise<boolean> {
  try {
    // Get tracking configuration
    const configRef = doc(db, COMPETITOR_TRACKING_COLLECTION, trackingConfigId);
    const configDoc = await getDocs(query(collection(db, COMPETITOR_TRACKING_COLLECTION), where('__name__', '==', configRef.id)));
    
    if (configDoc.empty) {
      logger.error('Tracking configuration not found', { trackingConfigId });
      return false;
    }
    
    const config = configDoc.docs[0].data() as CompetitorTrackingConfig & { userId: string };
    
    // Only proceed if config is active
    if (!config.isActive) {
      logger.info('Tracking configuration is inactive', { trackingConfigId });
      return false;
    }
    
    let successCount = 0;
    let failCount = 0;
    
    // Process each competitor
    for (const competitorId of config.competitors) {
      try {
        // Get competitor data
        const competitorRef = doc(db, 'competitors', competitorId);
        const competitorDoc = await getDocs(query(collection(db, 'competitors'), where('__name__', '==', competitorRef.id)));
        
        if (competitorDoc.empty) {
          logger.warn('Competitor not found', { trackingConfigId, competitorId });
          failCount++;
          continue;
        }
        
        const competitor = competitorDoc.docs[0].data() as CompetitorData;
        
        // Skip if this platform isn't in the tracking config
        if (!config.platforms.includes(competitor.platformId)) {
          continue;
        }
        
        // Get latest snapshot for comparison
        const previousSnapshots = await getCompetitorSnapshots(competitorId, 1, competitor.platformId);
        const previousSnapshot = previousSnapshots.length > 0 ? previousSnapshots[0] : null;
        
        // Create new snapshot
        // In a real implementation, you would fetch actual data for each platform
        // This is a simplified version that just copies existing metrics
        const newSnapshot: Omit<CompetitorSnapshot, 'competitorId' | 'timestamp'> = {
          competitorName: competitor.name,
          platformId: competitor.platformId,
          metrics: competitor.metrics,
          contentCount: 0, // This would be fetched from the platform
          followerCount: 0, // This would be fetched from the platform
          engagementRate: 0 // This would be calculated from platform data
        };
        
        // Create the snapshot
        const snapshotId = await createCompetitorSnapshot(
          competitorId,
          newSnapshot
        );
        
        // Detect changes and create alerts if needed
        if (previousSnapshot && config.alertThresholds) {
          await detectAndCreateAlerts(
            competitorId,
            competitor.name,
            {
              ...newSnapshot,
              competitorId,
              timestamp: Timestamp.now()
            },
            previousSnapshot,
            config.alertThresholds
          );
        }
        
        successCount++;
      } catch (error) {
        logger.error('Error processing competitor in tracking job', {
          error,
          trackingConfigId,
          competitorId
        });
        failCount++;
      }
    }
    
    // Update the last run timestamp
    await updateDoc(configRef, {
      lastRun: Timestamp.now()
    });
    
    logger.info('Completed competitor tracking job', {
      trackingConfigId,
      successCount,
      failCount
    });
    
    return successCount > 0;
  } catch (error) {
    logger.error('Error running competitor tracking job', { error, trackingConfigId });
    return false;
  }
}
