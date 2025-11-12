import { Timestamp } from 'firebase/firestore';

/**
 * Platform engagement benchmark levels
 */
export interface EngagementBenchmarkLevels {
  low: number;
  average: number;
  high: number;
}

/**
 * Platform engagement benchmarks model
 */
export interface PlatformEngagementBenchmarks {
  id: string;
  platform: 'instagram' | 'facebook' | 'twitter' | 'linkedin' | 'tiktok';
  benchmarks: EngagementBenchmarkLevels;
  description?: string;
  updatedAt: Timestamp;
  updatedBy: string;
  isDefault: boolean;
}

/**
 * Default engagement benchmarks based on industry research from 2023
 */
export const DEFAULT_ENGAGEMENT_BENCHMARKS: Record<string, EngagementBenchmarkLevels> = {
  instagram: { low: 1.0, average: 3.5, high: 6.0 },   // Instagram avg: ~3.5% engagement rate
  facebook: { low: 0.5, average: 1.2, high: 3.0 },    // Facebook avg: ~1.2% engagement rate
  twitter: { low: 0.3, average: 0.9, high: 2.0 },     // Twitter avg: ~0.9% engagement rate 
  linkedin: { low: 1.5, average: 3.0, high: 5.0 },    // LinkedIn avg: ~3.0% engagement rate
  tiktok: { low: 3.0, average: 7.0, high: 15.0 }      // TikTok avg: ~7.0% engagement rate
}; 