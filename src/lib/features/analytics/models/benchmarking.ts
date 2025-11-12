import { Timestamp } from 'firebase/firestore';

/**
 * Performance category for benchmark comparison
 */
export enum PerformanceCategory {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  NEUTRAL = 'neutral',
  BELOW_AVERAGE = 'below_average',
  POOR = 'poor'
}

/**
 * Industry average data model
 */
export interface IndustryAverage {
  id?: string;
  industry: string;
  platformId?: string;
  metrics: Record<string, number>;
  source: string;
  sampleSize?: number;
  lastUpdated: Timestamp;
  methodology?: string;
  confidence?: number; // Between 0 and 1
}

/**
 * Competitor data model
 */
export interface CompetitorData {
  id?: string;
  userId: string;
  organizationId?: string;
  name: string;
  platformId: string;
  platformAccountId: string;
  platformHandle: string;
  profileUrl?: string;
  metrics: Record<string, number>;
  lastFetchDate: Timestamp;
  lastUpdated: Timestamp;
  status: 'active' | 'inactive';
  isPublic: boolean;
  tags?: string[];
  notes?: string;
}

/**
 * Single metric benchmark comparison
 */
export interface MetricBenchmark {
  metricId: string;
  userValue: number;
  industryAverage: number | null;
  competitorAverage: number | null;
  performanceCategory: PerformanceCategory;
  percentDifference?: number;
  historicalTrend?: 'rising' | 'stable' | 'falling';
}

/**
 * Complete benchmarking result
 */
export interface BenchmarkingResult {
  id?: string;
  userId: string;
  organizationId: string;
  industry: string;
  benchmarks: MetricBenchmark[];
  timestamp: Date;
  competitorCount: number;
  period?: string; // Optional time period (e.g., "2023-07" for monthly)
  insights?: string[]; // Optional AI-generated insights
}

/**
 * Benchmark recommendation
 */
export interface BenchmarkRecommendation {
  metricId: string;
  currentValue: number;
  targetValue: number;
  recommendation: string;
  priority: 'high' | 'medium' | 'low';
  potentialImpact: string;
  implementationComplexity: 'easy' | 'medium' | 'complex';
}

/**
 * Benchmark report configuration
 */
export interface BenchmarkReportConfig {
  id?: string;
  userId: string;
  name: string;
  metrics: string[];
  competitors: string[];
  industries: string[];
  frequency: 'weekly' | 'monthly' | 'quarterly';
  emailRecipients?: string[];
  lastGeneratedAt?: Timestamp;
  isActive: boolean;
  createdAt: Timestamp;
}

/**
 * Industry segment for more granular benchmarking
 */
export interface IndustrySegment {
  id?: string;
  industryId: string;
  name: string;
  description?: string;
  criteria: Record<string, any>;
  metrics: Record<string, number>;
  sampleSize: number;
  lastUpdated: Timestamp;
} 