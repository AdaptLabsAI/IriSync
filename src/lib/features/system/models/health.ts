/**
 * System Health Models
 * Data structures for system health monitoring
 */

import { Timestamp } from 'firebase/firestore';

export type ServiceStatus = 'operational' | 'degraded' | 'down';

export interface ServiceHealth {
  status: ServiceStatus;
  latency?: number; // milliseconds
  lastChecked: Date;
  message?: string;
  uptime?: number; // percentage
}

export interface PlatformHealth {
  [platformName: string]: ServiceHealth;
}

export interface SystemHealthSnapshot {
  id: string;
  timestamp: Date;
  services: {
    firebase: ServiceHealth;
    stripe: ServiceHealth;
    openai: ServiceHealth;
    platforms: PlatformHealth;
  };
  metrics: {
    apiResponseTime: number; // ms average
    errorRate: number; // percentage
    activeUsers: number;
    requestsPerMinute: number;
  };
  createdAt: Date;
}

export interface SystemMetricsDataPoint {
  timestamp: string; // ISO string
  responseTime: number; // ms
  errorCount: number;
  requestCount: number;
  activeUsers: number;
}

export interface SystemHealthResponse {
  overall: ServiceStatus;
  services: {
    firebase: ServiceHealth;
    stripe: ServiceHealth;
    openai: ServiceHealth;
    socialPlatforms: PlatformHealth;
  };
  metrics: {
    uptime: number; // percentage (last 24h)
    avgResponseTime: number; // ms
    errorRate: number; // percentage
    totalRequests: number;
    activeUsers: number;
  };
  lastUpdated: string; // ISO timestamp
}

export interface SystemMetricsResponse {
  range: string; // '24h' | '7d' | '30d'
  dataPoints: SystemMetricsDataPoint[];
  summary: {
    avgResponseTime: number;
    totalErrors: number;
    totalRequests: number;
    uptimePercentage: number;
  };
}

export interface ServiceLog {
  id: string;
  level: 'error' | 'warn' | 'info' | 'debug';
  service: string;
  message: string;
  timestamp: Date;
  metadata?: Record<string, any>;
  userId?: string;
  organizationId?: string;
}
