import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  addDoc,
  updateDoc,
  doc,
  getDoc,
  Timestamp,
  FirestoreDataConverter,
  QueryDocumentSnapshot
} from 'firebase/firestore';
import { firestore as db } from '../../../core/firebase';
import logger from '../../../core/logging/logger';
import { User } from '../../../core/models/User';
import { 
  BenchmarkingResult,
  CompetitorData,
  IndustryAverage,
  MetricBenchmark,
  PerformanceCategory
} from '../models/benchmarking';
import { MetricDefinition } from '../models/metrics';

// Collection references
const BENCHMARKS_COLLECTION = 'benchmarks';
const COMPETITORS_COLLECTION = 'competitors';
const INDUSTRY_AVERAGES_COLLECTION = 'industryAverages';

/**
 * Get industry average metrics for a specific industry
 * @param industry The industry to get averages for
 * @param platformId Optional platform ID to filter by (e.g., "instagram", "twitter")
 * @returns Industry average metrics
 */
export async function getIndustryAverages(
  industry: string,
  platformId?: string
): Promise<IndustryAverage[]> {
  try {
    const constraints = [
      where('industry', '==', industry),
      orderBy('lastUpdated', 'desc'),
      limit(1) // Get the most recent data
    ];
    
    if (platformId) {
      constraints.push(where('platformId', '==', platformId));
    }
    
    const q = query(
      collection(db, INDUSTRY_AVERAGES_COLLECTION),
      ...constraints
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      logger.info('No industry averages found', { industry, platformId });
      return [];
    }
    
    const doc = snapshot.docs[0];
    const data = doc.data() as IndustryAverage;
    
    return [{ id: doc.id, ...data }];
  } catch (error) {
    logger.error('Error getting industry averages', { error, industry, platformId });
    return [];
  }
}

/**
 * Get competitor data for a specific organization
 * @param organizationId The organization ID
 * @param maxCount Maximum number of competitors to return (default: 10)
 * @returns Competitor data
 */
export async function getOrganizationCompetitors(
  organizationId: string,
  maxCount: number = 10
): Promise<CompetitorData[]> {
  try {
    const q = query(
      collection(db, COMPETITORS_COLLECTION),
      where('organizationId', '==', organizationId),
      orderBy('lastUpdated', 'desc'),
      limit(maxCount)
    );
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as CompetitorData));
  } catch (error) {
    logger.error('Error getting organization competitors', { error, organizationId });
    return [];
  }
}

/**
 * Add or update a competitor for an organization
 * @param organizationId The organization ID
 * @param userId The user ID adding/updating the competitor
 * @param competitorData The competitor data
 * @returns The competitor ID
 */
export async function addOrUpdateCompetitor(
  organizationId: string,
  userId: string,
  competitorData: Omit<CompetitorData, 'id' | 'lastUpdated' | 'userId' | 'organizationId'>
): Promise<string> {
  try {
    // Check if competitor already exists
    const existingQuery = query(
      collection(db, COMPETITORS_COLLECTION),
      where('organizationId', '==', organizationId),
      where('platformId', '==', competitorData.platformId),
      where('platformAccountId', '==', competitorData.platformAccountId)
    );
    
    const existingSnapshot = await getDocs(existingQuery);
    
    if (!existingSnapshot.empty) {
      // Update existing competitor
      const docRef = doc(db, COMPETITORS_COLLECTION, existingSnapshot.docs[0].id);
      await updateDoc(docRef, {
        ...competitorData,
        lastUpdated: Timestamp.now()
      });
      
      logger.info('Updated competitor', { 
        organizationId, 
        userId, // Track who made the update
        competitorId: existingSnapshot.docs[0].id,
        platformId: competitorData.platformId
      });
      
      return existingSnapshot.docs[0].id;
    } else {
      // Add new competitor
      const docRef = await addDoc(collection(db, COMPETITORS_COLLECTION), {
        organizationId,
        userId, // Track who created the competitor
        ...competitorData,
        lastUpdated: Timestamp.now()
      });
      
      logger.info('Added new competitor', { 
        organizationId, 
        userId, 
        competitorId: docRef.id,
        platformId: competitorData.platformId
      });
      
      return docRef.id;
    }
  } catch (error) {
    logger.error('Error adding/updating competitor', { error, organizationId, userId });
    throw error;
  }
}

/**
 * Compare organization metrics against benchmarks
 * @param userId The user ID requesting the benchmark
 * @param organizationId The organization ID
 * @param metrics Organization metrics to compare
 * @param industry The organization's industry
 * @returns Benchmarking results
 */
export async function benchmarkOrganizationMetrics(
  userId: string,
  organizationId: string,
  metrics: Record<string, number>,
  industry: string
): Promise<BenchmarkingResult> {
  try {
    // Get industry averages
    const industryAverages = await getIndustryAverages(industry);
    
    // Get organization's competitors
    const competitors = await getOrganizationCompetitors(organizationId);
    
    const benchmarks: MetricBenchmark[] = [];
    
    // Process each metric
    for (const [metricId, value] of Object.entries(metrics)) {
      // Get industry average for this metric (if available)
      const industryAvg = industryAverages.length > 0 
        ? industryAverages[0].metrics[metricId] 
        : null;
      
      // Get competitor average for this metric (if available)
      let competitorSum = 0;
      let competitorCount = 0;
      
      for (const competitor of competitors) {
        if (competitor.metrics && competitor.metrics[metricId] !== undefined) {
          competitorSum += competitor.metrics[metricId];
          competitorCount++;
        }
      }
      
      const competitorAvg = competitorCount > 0 ? competitorSum / competitorCount : null;
      
      // Calculate the performance category
      let performanceCategory = PerformanceCategory.NEUTRAL;
      
      if (industryAvg !== null) {
        if (value >= industryAvg * 1.25) {
          performanceCategory = PerformanceCategory.EXCELLENT;
        } else if (value >= industryAvg * 1.1) {
          performanceCategory = PerformanceCategory.GOOD;
        } else if (value < industryAvg * 0.75) {
          performanceCategory = PerformanceCategory.POOR;
        } else if (value < industryAvg * 0.9) {
          performanceCategory = PerformanceCategory.BELOW_AVERAGE;
        }
      } else if (competitorAvg !== null) {
        if (value >= competitorAvg * 1.25) {
          performanceCategory = PerformanceCategory.EXCELLENT;
        } else if (value >= competitorAvg * 1.1) {
          performanceCategory = PerformanceCategory.GOOD;
        } else if (value < competitorAvg * 0.75) {
          performanceCategory = PerformanceCategory.POOR;
        } else if (value < competitorAvg * 0.9) {
          performanceCategory = PerformanceCategory.BELOW_AVERAGE;
        }
      }
      
      benchmarks.push({
        metricId,
        userValue: value,
        industryAverage: industryAvg,
        competitorAverage: competitorAvg,
        performanceCategory
      });
    }
    
    // Store benchmark result
    const benchmarkResult: BenchmarkingResult = {
      userId,
      organizationId,
      industry,
      benchmarks,
      timestamp: new Date(),
      competitorCount: competitors.length
    };
    
    await addDoc(collection(db, BENCHMARKS_COLLECTION), benchmarkResult);
    
    logger.info('Completed organization metric benchmarking', { 
      userId, 
      organizationId,
      industry,
      metricCount: benchmarks.length
    });
    
    return benchmarkResult;
  } catch (error) {
    logger.error('Error benchmarking organization metrics', { error, userId, organizationId, industry });
    throw error;
  }
}

/**
 * Get benchmark results for an organization over time
 * @param organizationId The organization ID
 * @param startDate Start date for benchmark history
 * @param endDate End date for benchmark history
 * @returns Benchmark history
 */
export async function getBenchmarkHistory(
  organizationId: string,
  startDate: Date,
  endDate: Date
): Promise<BenchmarkingResult[]> {
  try {
    const q = query(
      collection(db, BENCHMARKS_COLLECTION),
      where('organizationId', '==', organizationId),
      where('timestamp', '>=', startDate),
      where('timestamp', '<=', endDate),
      orderBy('timestamp', 'asc')
    );
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as BenchmarkingResult & { id: string }));
  } catch (error) {
    logger.error('Error getting benchmark history', { error, organizationId });
    return [];
  }
}

/**
 * Get competitor limit based on organization's subscription tier
 * @param organizationId The organization ID 
 * @returns Maximum number of competitors organization can track
 */
export async function getOrganizationCompetitorLimit(organizationId: string): Promise<number> {
  try {
    const orgDoc = await getDoc(doc(db, 'organizations', organizationId));
    
    if (!orgDoc.exists()) {
      logger.error('Organization not found for competitor limit check', { organizationId });
      return 5; // Default to minimal tier
    }
    
    const orgData = orgDoc.data();
    
    // Return limit based on subscription tier
    switch (orgData.subscriptionTier) {
      case 'enterprise':
        return 20;
      case 'influencer':
        return 10;
      case 'creator':
      default:
        return 5;
    }
  } catch (error) {
    logger.error('Error getting organization competitor limit', { error, organizationId });
    return 5; // Default to minimal tier on error
  }
}

// Legacy function for backward compatibility
export async function getUserCompetitors(  
  userId: string,  
  maxLimit: number = 10
): Promise<CompetitorData[]> {  
  try {    
    // Get user's organization    
    const userDoc = await getDoc(doc(db, 'users', userId));    
    if (!userDoc.exists()) {      
      logger.error('User not found when getting competitors', { userId });      
      return [];    
    }        

    const userData = userDoc.data() as User;    
    const organizationId = userData.currentOrganizationId || userData.personalOrganizationId;
    
    if (!organizationId) {
      logger.error('User has no organization ID', { userId });
      return [];
    }
    
    // Use the organization-based function
    return getOrganizationCompetitors(organizationId, maxLimit);
  } catch (error) {
    logger.error('Error in legacy getUserCompetitors function', { error, userId });
    return [];
  }
}

// Legacy function for backward compatibility
export async function getUserCompetitorLimit(userId: string): Promise<number> {
  try {
    // Get user's organization
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      logger.error('User not found for competitor limit check', { userId });
      return 5; // Default to minimal tier
    }
    
    const userData = userDoc.data() as User;
    const organizationId = userData.organizationId;
    
    if (!organizationId) {
      logger.error('User has no organization ID', { userId });
      return 5; // Default to minimal tier
    }
    
    // Use the organization-based function
    return getOrganizationCompetitorLimit(organizationId);
  } catch (error) {
    logger.error('Error in legacy getUserCompetitorLimit function', { error, userId });
    return 5; // Default to minimal tier on error
  }
}
