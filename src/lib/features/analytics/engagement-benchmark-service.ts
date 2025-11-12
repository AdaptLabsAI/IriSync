import { getFirestore, collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { DEFAULT_ENGAGEMENT_BENCHMARKS, EngagementBenchmarkLevels, PlatformEngagementBenchmarks } from './models/engagement-benchmarks';

const BENCHMARKS_COLLECTION = 'engagement_benchmarks';

/**
 * Service for managing engagement benchmarks
 */
export class EngagementBenchmarkService {
  private db = getFirestore();
  
  /**
   * Get all platform benchmarks
   * @returns Array of platform benchmarks
   */
  async getAllBenchmarks(): Promise<PlatformEngagementBenchmarks[]> {
    try {
      const benchmarksRef = collection(this.db, BENCHMARKS_COLLECTION);
      const snapshot = await getDocs(benchmarksRef);
      
      if (snapshot.empty) {
        // Initialize default benchmarks if none exist
        await this.initializeDefaultBenchmarks();
        return this.getAllBenchmarks();
      }
      
      return snapshot.docs.map(doc => doc.data() as PlatformEngagementBenchmarks);
    } catch (error) {
      console.error('Error fetching benchmarks:', error);
      throw error;
    }
  }
  
  /**
   * Get benchmark for a specific platform
   * @param platform Social platform name
   * @returns Platform benchmark data
   */
  async getBenchmarkForPlatform(platform: string): Promise<EngagementBenchmarkLevels> {
    try {
      // First try to get the custom benchmark
      const customQuery = query(
        collection(this.db, BENCHMARKS_COLLECTION),
        where('platform', '==', platform),
        where('isDefault', '==', false)
      );
      
      const customSnapshot = await getDocs(customQuery);
      
      if (!customSnapshot.empty) {
        // Return custom benchmark if it exists
        return (customSnapshot.docs[0].data() as PlatformEngagementBenchmarks).benchmarks;
      }
      
      // Try to get the default benchmark from database
      const defaultQuery = query(
        collection(this.db, BENCHMARKS_COLLECTION),
        where('platform', '==', platform),
        where('isDefault', '==', true)
      );
      
      const defaultSnapshot = await getDocs(defaultQuery);
      
      if (!defaultSnapshot.empty) {
        // Return default benchmark from database
        return (defaultSnapshot.docs[0].data() as PlatformEngagementBenchmarks).benchmarks;
      }
      
      // If no benchmark exists in the database, return hard-coded default
      return DEFAULT_ENGAGEMENT_BENCHMARKS[platform] || 
        { low: 1.0, average: 2.5, high: 5.0 }; // Fallback for unknown platforms
    } catch (error) {
      console.error(`Error fetching benchmarks for ${platform}:`, error);
      // Return hard-coded default on error
      return DEFAULT_ENGAGEMENT_BENCHMARKS[platform] || 
        { low: 1.0, average: 2.5, high: 5.0 };
    }
  }
  
  /**
   * Create or update a platform benchmark
   * @param platform Social platform
   * @param benchmarks Benchmark levels
   * @param adminId Admin user ID making the change
   * @param description Optional description of the benchmark
   * @returns Updated benchmark data
   */
  async updateBenchmark(
    platform: string,
    benchmarks: EngagementBenchmarkLevels,
    adminId: string,
    description?: string
  ): Promise<PlatformEngagementBenchmarks> {
    try {
      // Check if a custom benchmark already exists
      const customQuery = query(
        collection(this.db, BENCHMARKS_COLLECTION),
        where('platform', '==', platform),
        where('isDefault', '==', false)
      );
      
      const customSnapshot = await getDocs(customQuery);
      
      const timestamp = new Date();
      
      if (!customSnapshot.empty) {
        // Update existing custom benchmark
        const docId = customSnapshot.docs[0].id;
        const docRef = doc(this.db, BENCHMARKS_COLLECTION, docId);
        
        const updateData = {
          benchmarks,
          description: description || '',
          updatedAt: timestamp,
          updatedBy: adminId
        };
        
        await updateDoc(docRef, updateData);
        
        return {
          id: docId,
          platform: platform as any,
          benchmarks,
          description,
          updatedAt: timestamp as any,
          updatedBy: adminId,
          isDefault: false
        };
      } else {
        // Create new custom benchmark
        const newBenchmark: PlatformEngagementBenchmarks = {
          id: `${platform}_custom`,
          platform: platform as any,
          benchmarks,
          description: description || '',
          updatedAt: timestamp as any,
          updatedBy: adminId,
          isDefault: false
        };
        
        await setDoc(doc(this.db, BENCHMARKS_COLLECTION, newBenchmark.id), newBenchmark);
        
        return newBenchmark;
      }
    } catch (error) {
      console.error(`Error updating benchmark for ${platform}:`, error);
      throw error;
    }
  }
  
  /**
   * Reset a platform benchmark to default
   * @param platform Social platform
   * @param adminId Admin user ID making the change
   * @returns Success status
   */
  async resetToDefault(platform: string, adminId: string): Promise<boolean> {
    try {
      // Check if a custom benchmark exists
      const customQuery = query(
        collection(this.db, BENCHMARKS_COLLECTION),
        where('platform', '==', platform),
        where('isDefault', '==', false)
      );
      
      const customSnapshot = await getDocs(customQuery);
      
      if (!customSnapshot.empty) {
        // Delete custom benchmark
        const docId = customSnapshot.docs[0].id;
        await deleteDoc(doc(this.db, BENCHMARKS_COLLECTION, docId));
        return true;
      }
      
      return false; // No custom benchmark to reset
    } catch (error) {
      console.error(`Error resetting benchmark for ${platform}:`, error);
      throw error;
    }
  }
  
  /**
   * Initialize default benchmarks in database
   * @private
   */
  private async initializeDefaultBenchmarks(): Promise<void> {
    try {
      const timestamp = new Date();
      const platforms = Object.keys(DEFAULT_ENGAGEMENT_BENCHMARKS);
      
      for (const platform of platforms) {
        const defaultBenchmark: PlatformEngagementBenchmarks = {
          id: `${platform}_default`,
          platform: platform as any,
          benchmarks: DEFAULT_ENGAGEMENT_BENCHMARKS[platform],
          description: `Default engagement benchmark for ${platform} based on industry research`,
          updatedAt: timestamp as any,
          updatedBy: 'system',
          isDefault: true
        };
        
        await setDoc(doc(this.db, BENCHMARKS_COLLECTION, defaultBenchmark.id), defaultBenchmark);
      }
    } catch (error) {
      console.error('Error initializing default benchmarks:', error);
      throw error;
    }
  }
} 