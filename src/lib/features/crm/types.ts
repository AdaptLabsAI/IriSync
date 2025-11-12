// CRM Library Types
// TypeScript interfaces and types for CRM functionality

import { Timestamp } from 'firebase/firestore';

/**
 * Supported CRM platforms
 */
export enum CRMPlatform {
  HUBSPOT = 'hubspot',
  SALESFORCE = 'salesforce',
  ZOHO = 'zoho',
  PIPEDRIVE = 'pipedrive',
  DYNAMICS = 'dynamics',
  SUGARCRM = 'sugarcrm'
}

/**
 * CRM connection status
 */
export enum CRMConnectionStatus {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
  EXPIRED = 'expired',
  PENDING = 'pending'
}

/**
 * Sync status for CRM data
 */
export enum SyncStatus {
  IDLE = 'idle',
  SYNCING = 'syncing',
  SUCCESS = 'success',
  ERROR = 'error',
  PARTIAL = 'partial'
}

/**
 * CRM data types that can be synced
 */
export enum CRMDataType {
  CONTACTS = 'contacts',
  DEALS = 'deals',
  LEADS = 'leads',
  COMPANIES = 'companies',
  ACTIVITIES = 'activities'
}

/**
 * OAuth token data structure
 */
export interface CRMTokens {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  expires_at?: number;
  token_type?: string;
  scope?: string;
  instance_url?: string; // For Salesforce
  [key: string]: any;
}

/**
 * CRM connection configuration
 */
export interface CRMConnectionConfig {
  platform: CRMPlatform;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  apiUrl?: string;
  authUrl?: string;
  tokenUrl?: string;
}

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  burstLimit: number;
  retryAfter: number;
}

/**
 * Field mapping configuration
 */
export interface FieldMapping {
  sourceField: string;
  targetField: string;
  transform?: (value: any) => any;
  required?: boolean;
  defaultValue?: any;
}

/**
 * Sync configuration
 */
export interface SyncConfig {
  enabled: boolean;
  interval: number; // in minutes
  dataTypes: CRMDataType[];
  bidirectional: boolean;
  conflictResolution: 'source_wins' | 'target_wins' | 'manual' | 'merge';
  batchSize: number;
  retryAttempts: number;
}

/**
 * CRM API response wrapper
 */
export interface CRMApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
  rateLimitRemaining?: number;
  rateLimitReset?: number;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  limit?: number;
  offset?: number;
  cursor?: string;
  page?: number;
}

/**
 * Search/filter parameters
 */
export interface SearchParams {
  query?: string;
  filters?: Record<string, any>;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  dateRange?: {
    start: Date;
    end: Date;
  };
}

/**
 * Webhook configuration
 */
export interface WebhookConfig {
  url: string;
  events: string[];
  secret?: string;
  active: boolean;
}

/**
 * Error types for CRM operations
 */
export enum CRMErrorType {
  AUTHENTICATION_ERROR = 'authentication_error',
  AUTHORIZATION_ERROR = 'authorization_error',
  RATE_LIMIT_ERROR = 'rate_limit_error',
  VALIDATION_ERROR = 'validation_error',
  NETWORK_ERROR = 'network_error',
  API_ERROR = 'api_error',
  SYNC_ERROR = 'sync_error',
  CONFLICT_ERROR = 'conflict_error'
}

/**
 * CRM error class
 */
export class CRMError extends Error {
  public readonly type: CRMErrorType;
  public readonly platform: CRMPlatform;
  public readonly statusCode?: number;
  public readonly details?: any;

  constructor(
    message: string,
    type: CRMErrorType,
    platform: CRMPlatform,
    statusCode?: number,
    details?: any
  ) {
    super(message);
    this.name = 'CRMError';
    this.type = type;
    this.platform = platform;
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Firestore CRM connection document
 */
export interface FirestoreCRMConnection {
  userId: string;
  organizationId?: string;
  platform: CRMPlatform;
  accountId: string;
  accountName: string;
  accountEmail: string;
  status: CRMConnectionStatus;
  tokens: CRMTokens;
  config: SyncConfig;
  lastSyncAt?: Timestamp;
  connectedAt: Timestamp;
  updatedAt: Timestamp;
  errorMessage?: string;
  webhookId?: string;
}

/**
 * Sync operation result
 */
export interface SyncResult {
  dataType: CRMDataType;
  status: SyncStatus;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsSkipped: number;
  recordsErrored: number;
  errors: Array<{
    recordId: string;
    error: string;
  }>;
  startedAt: Date;
  completedAt: Date;
  duration: number; // in milliseconds
}

/**
 * Batch operation result
 */
export interface BatchResult<T = any> {
  success: boolean;
  results: Array<{
    id: string;
    success: boolean;
    data?: T;
    error?: string;
  }>;
  totalProcessed: number;
  totalSuccess: number;
  totalErrors: number;
} 