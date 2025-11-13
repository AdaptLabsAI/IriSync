import { firestore } from '../core/firebase';
import { v4 as uuidv4 } from 'uuid';
import { Timestamp } from 'firebase/firestore';

/**
 * Interface for API access configuration
 */
export interface APIAccessConfig {
  id: string;
  organizationId: string;
  platform: string;
  tier: 'free' | 'basic' | 'premium' | 'enterprise';
  credentials: {
    clientId: string;
    clientSecret: string;
    apiKey?: string;
    bearerToken?: string;
    webhookSecret?: string;
    additionalKeys?: Record<string, string>;
  };
  quotas: {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
    requestsPerMonth: number;
    dataTransferMB: number;
    webhookDeliveries: number;
  };
  permissions: {
    read: boolean;
    write: boolean;
    delete: boolean;
    admin: boolean;
    analytics: boolean;
    messaging: boolean;
    advertising: boolean;
  };
  restrictions: {
    allowedIPs?: string[];
    allowedDomains?: string[];
    timeWindows?: Array<{
      start: string; // HH:MM format
      end: string;   // HH:MM format
      timezone: string;
    }>;
    geoRestrictions?: {
      allowedCountries?: string[];
      blockedCountries?: string[];
    };
  };
  monitoring: {
    alertThresholds: {
      quotaUsagePercent: number;
      errorRatePercent: number;
      responseTimeMs: number;
    };
    notifications: {
      email?: string[];
      slack?: string;
      webhook?: string;
    };
  };
  status: 'active' | 'suspended' | 'revoked' | 'pending';
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

/**
 * Interface for API usage tracking
 */
export interface APIUsage {
  id: string;
  configId: string;
  organizationId: string;
  platform: string;
  endpoint: string;
  method: string;
  timestamp: Date;
  responseTime: number;
  statusCode: number;
  dataTransferred: number; // bytes
  userAgent?: string;
  ipAddress?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

/**
 * Interface for API quota status
 */
export interface QuotaStatus {
  configId: string;
  platform: string;
  period: 'minute' | 'hour' | 'day' | 'month';
  limit: number;
  used: number;
  remaining: number;
  resetTime: Date;
  percentageUsed: number;
}

/**
 * Interface for API access token
 */
export interface APIAccessToken {
  id: string;
  configId: string;
  organizationId: string;
  name: string;
  description?: string;
  token: string;
  hashedToken: string;
  permissions: string[];
  scopes: string[];
  ipWhitelist?: string[];
  expiresAt?: Date;
  lastUsed?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface for rate limiting
 */
export interface RateLimitRule {
  id: string;
  configId: string;
  name: string;
  endpoint: string;
  method: string;
  limit: number;
  window: number; // seconds
  burst?: number;
  priority: number;
  isActive: boolean;
}

/**
 * Platform API Access Management Service
 */
export class PlatformAPIAccessManager {
  private readonly CONFIGS_COLLECTION = 'api_access_configs';
  private readonly USAGE_COLLECTION = 'api_usage';
  private readonly TOKENS_COLLECTION = 'api_tokens';
  private readonly RATE_LIMITS_COLLECTION = 'rate_limit_rules';
  
  private quotaCache: Map<string, QuotaStatus[]> = new Map();
  private rateLimitCache: Map<string, { count: number; resetTime: Date }> = new Map();
  
  /**
   * Create API access configuration
   */
  async createAPIAccess(config: Omit<APIAccessConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<APIAccessConfig> {
    const configId = uuidv4();
    const now = new Date();
    
    const newConfig: APIAccessConfig = {
      ...config,
      id: configId,
      createdAt: now,
      updatedAt: now
    };
    
    // Encrypt sensitive credentials before storing
    const encryptedConfig = {
      ...newConfig,
      credentials: await this.encryptCredentials(newConfig.credentials),
      createdAt: Timestamp.fromDate(newConfig.createdAt),
      updatedAt: Timestamp.fromDate(newConfig.updatedAt),
      expiresAt: newConfig.expiresAt ? Timestamp.fromDate(newConfig.expiresAt) : undefined
    };
    
    await (firestore as any)
      .collection(this.CONFIGS_COLLECTION)
      .doc(configId)
      .set(encryptedConfig);
    
    return newConfig;
  }
  
  /**
   * Update API access configuration
   */
  async updateAPIAccess(configId: string, updates: Partial<APIAccessConfig>): Promise<void> {
    const updateData: any = {
      ...updates,
      updatedAt: Timestamp.fromDate(new Date())
    };
    
    if (updates.credentials) {
      updateData.credentials = await this.encryptCredentials(updates.credentials);
    }
    
    if (updates.expiresAt) {
      updateData.expiresAt = Timestamp.fromDate(updates.expiresAt);
    }
    
    await (firestore as any)
      .collection(this.CONFIGS_COLLECTION)
      .doc(configId)
      .update(updateData);
    
    // Clear cache for this config
    this.quotaCache.delete(configId);
  }
  
  /**
   * Get API access configuration
   */
  async getAPIAccess(configId: string): Promise<APIAccessConfig | null> {
    const doc = await (firestore as any)
      .collection(this.CONFIGS_COLLECTION)
      .doc(configId)
      .get();
    
    if (!doc.exists) {
      return null;
    }
    
    const data = doc.data()!;
    return {
      ...data,
      credentials: await this.decryptCredentials(data.credentials),
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
      expiresAt: data.expiresAt?.toDate()
    } as APIAccessConfig;
  }
  
  /**
   * Get API access configurations for organization
   */
  async getAPIAccessConfigs(organizationId: string, platform?: string): Promise<APIAccessConfig[]> {
    let query = (firestore as any)
      .collection(this.CONFIGS_COLLECTION)
      .where('organizationId', '==', organizationId);
    
    if (platform) {
      query = query.where('platform', '==', platform);
    }
    
    const snapshot = await query.get();
    
    const configs = await Promise.all(
      snapshot.docs.map(async (doc: any) => {
        const data = doc.data();
        return {
          ...data,
          credentials: await this.decryptCredentials(data.credentials),
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
          expiresAt: data.expiresAt?.toDate()
        } as APIAccessConfig;
      })
    );
    
    return configs;
  }
  
  /**
   * Validate API access for a request
   */
  async validateAPIAccess(
    configId: string,
    endpoint: string,
    method: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{
    allowed: boolean;
    reason?: string;
    quotaStatus?: QuotaStatus[];
  }> {
    const config = await this.getAPIAccess(configId);
    
    if (!config) {
      return { allowed: false, reason: 'Configuration not found' };
    }
    
    // Check if config is active
    if (config.status !== 'active') {
      return { allowed: false, reason: `Access is ${config.status}` };
    }
    
    // Check expiration
    if (config.expiresAt && config.expiresAt < new Date()) {
      return { allowed: false, reason: 'Access has expired' };
    }
    
    // Check IP restrictions
    if (config.restrictions.allowedIPs?.length && ipAddress) {
      if (!config.restrictions.allowedIPs.includes(ipAddress)) {
        return { allowed: false, reason: 'IP address not allowed' };
      }
    }
    
    // Check time window restrictions
    if (config.restrictions.timeWindows?.length) {
      const now = new Date();
      const isInAllowedWindow = config.restrictions.timeWindows.some(window => {
        return this.isTimeInWindow(now, window.start, window.end, window.timezone);
      });
      
      if (!isInAllowedWindow) {
        return { allowed: false, reason: 'Outside allowed time window' };
      }
    }
    
    // Check rate limits
    const rateLimitCheck = await this.checkRateLimit(configId, endpoint, method);
    if (!rateLimitCheck.allowed) {
      return { allowed: false, reason: 'Rate limit exceeded' };
    }
    
    // Check quotas
    const quotaStatus = await this.getQuotaStatus(configId);
    const quotaExceeded = quotaStatus.some(quota => quota.remaining <= 0);
    
    if (quotaExceeded) {
      return { allowed: false, reason: 'Quota exceeded', quotaStatus };
    }
    
    return { allowed: true, quotaStatus };
  }
  
  /**
   * Track API usage
   */
  async trackAPIUsage(usage: Omit<APIUsage, 'id'>): Promise<void> {
    const usageId = uuidv4();
    
    const usageRecord: APIUsage = {
      ...usage,
      id: usageId
    };
    
    await (firestore as any)
      .collection(this.USAGE_COLLECTION)
      .doc(usageId)
      .set({
        ...usageRecord,
        timestamp: Timestamp.fromDate(usageRecord.timestamp)
      });
    
    // Update quota cache
    await this.updateQuotaCache(usage.configId);
    
    // Check for alerts
    await this.checkUsageAlerts(usage.configId);
  }
  
  /**
   * Get quota status for a configuration
   */
  async getQuotaStatus(configId: string): Promise<QuotaStatus[]> {
    // Check cache first
    if (this.quotaCache.has(configId)) {
      const cached = this.quotaCache.get(configId)!;
      // Return cached if not expired
      if (cached.every(quota => quota.resetTime > new Date())) {
        return cached;
      }
    }
    
    const config = await this.getAPIAccess(configId);
    if (!config) {
      return [];
    }
    
    const now = new Date();
    const periods = [
      { period: 'minute' as const, duration: 60 * 1000, limit: config.quotas.requestsPerMinute },
      { period: 'hour' as const, duration: 60 * 60 * 1000, limit: config.quotas.requestsPerHour },
      { period: 'day' as const, duration: 24 * 60 * 60 * 1000, limit: config.quotas.requestsPerDay },
      { period: 'month' as const, duration: 30 * 24 * 60 * 60 * 1000, limit: config.quotas.requestsPerMonth }
    ];
    
    const quotaStatuses = await Promise.all(
      periods.map(async ({ period, duration, limit }) => {
        const startTime = new Date(now.getTime() - duration);
        const used = await this.getUsageCount(configId, startTime, now);
        const remaining = Math.max(0, limit - used);
        const resetTime = this.calculateResetTime(period, now);
        
        return {
          configId,
          platform: config.platform,
          period,
          limit,
          used,
          remaining,
          resetTime,
          percentageUsed: limit > 0 ? (used / limit) * 100 : 0
        };
      })
    );
    
    // Cache the results
    this.quotaCache.set(configId, quotaStatuses);
    
    return quotaStatuses;
  }
  
  /**
   * Create API access token
   */
  async createAPIToken(token: Omit<APIAccessToken, 'id' | 'token' | 'hashedToken' | 'createdAt' | 'updatedAt'>): Promise<APIAccessToken> {
    const tokenId = uuidv4();
    const tokenValue = this.generateSecureToken();
    const hashedToken = await this.hashToken(tokenValue);
    const now = new Date();
    
    const newToken: APIAccessToken = {
      ...token,
      id: tokenId,
      token: tokenValue,
      hashedToken,
      createdAt: now,
      updatedAt: now
    };
    
    await (firestore as any)
      .collection(this.TOKENS_COLLECTION)
      .doc(tokenId)
      .set({
        ...newToken,
        token: undefined, // Don't store the actual token
        createdAt: Timestamp.fromDate(newToken.createdAt),
        updatedAt: Timestamp.fromDate(newToken.updatedAt),
        expiresAt: newToken.expiresAt ? Timestamp.fromDate(newToken.expiresAt) : undefined,
        lastUsed: newToken.lastUsed ? Timestamp.fromDate(newToken.lastUsed) : undefined
      });
    
    return newToken;
  }
  
  /**
   * Validate API token
   */
  async validateAPIToken(token: string): Promise<APIAccessToken | null> {
    const hashedToken = await this.hashToken(token);
    
    const snapshot = await (firestore as any)
      .collection(this.TOKENS_COLLECTION)
      .where('hashedToken', '==', hashedToken)
      .where('isActive', '==', true)
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      return null;
    }
    
    const data = snapshot.docs[0].data();
    const tokenData = {
      ...data,
      token, // Return the original token for this session
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
      expiresAt: data.expiresAt?.toDate(),
      lastUsed: data.lastUsed?.toDate()
    } as APIAccessToken;
    
    // Check expiration
    if (tokenData.expiresAt && tokenData.expiresAt < new Date()) {
      return null;
    }
    
    // Update last used timestamp
    await (firestore as any)
      .collection(this.TOKENS_COLLECTION)
      .doc(tokenData.id)
      .update({
        lastUsed: Timestamp.fromDate(new Date())
      });
    
    return tokenData;
  }
  
  /**
   * Revoke API token
   */
  async revokeAPIToken(tokenId: string): Promise<void> {
    await (firestore as any)
      .collection(this.TOKENS_COLLECTION)
      .doc(tokenId)
      .update({
        isActive: false,
        updatedAt: Timestamp.fromDate(new Date())
      });
  }
  
  /**
   * Get API usage analytics
   */
  async getUsageAnalytics(
    configId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalRequests: number;
    successfulRequests: number;
    errorRequests: number;
    averageResponseTime: number;
    dataTransferred: number;
    topEndpoints: Array<{ endpoint: string; count: number }>;
    errorBreakdown: Record<number, number>;
    hourlyUsage: Array<{ hour: number; count: number }>;
  }> {
    const snapshot = await (firestore as any)
      .collection(this.USAGE_COLLECTION)
      .where('configId', '==', configId)
      .where('timestamp', '>=', Timestamp.fromDate(startDate))
      .where('timestamp', '<=', Timestamp.fromDate(endDate))
      .get();
    
    const usageData = snapshot.docs.map((doc: any) => doc.data() as APIUsage);
    
    const analytics = {
      totalRequests: usageData.length,
      successfulRequests: usageData.filter((u: any) => u.statusCode >= 200 && u.statusCode < 300).length,
      errorRequests: usageData.filter((u: any) => u.statusCode >= 400).length,
      averageResponseTime: usageData.reduce((sum: any, u: any) => sum + u.responseTime, 0) / usageData.length || 0,
      dataTransferred: usageData.reduce((sum: any, u: any) => sum + u.dataTransferred, 0),
      topEndpoints: this.getTopEndpoints(usageData),
      errorBreakdown: this.getErrorBreakdown(usageData),
      hourlyUsage: this.getHourlyUsage(usageData)
    };
    
    return analytics;
  }
  
  /**
   * Check rate limit for endpoint
   */
  private async checkRateLimit(configId: string, endpoint: string, method: string): Promise<{ allowed: boolean; resetTime?: Date }> {
    const cacheKey = `${configId}:${endpoint}:${method}`;
    const now = new Date();
    
    // Get rate limit rules for this endpoint
    const rules = await this.getRateLimitRules(configId, endpoint, method);
    
    for (const rule of rules) {
      const rateLimitKey = `${cacheKey}:${rule.id}`;
      const cached = this.rateLimitCache.get(rateLimitKey);
      
      if (cached && cached.resetTime > now) {
        if (cached.count >= rule.limit) {
          return { allowed: false, resetTime: cached.resetTime };
        }
        
        // Increment count
        this.rateLimitCache.set(rateLimitKey, {
          count: cached.count + 1,
          resetTime: cached.resetTime
        });
      } else {
        // Create new rate limit window
        const resetTime = new Date(now.getTime() + rule.window * 1000);
        this.rateLimitCache.set(rateLimitKey, {
          count: 1,
          resetTime
        });
      }
    }
    
    return { allowed: true };
  }
  
  /**
   * Get rate limit rules for endpoint
   */
  private async getRateLimitRules(configId: string, endpoint: string, method: string): Promise<RateLimitRule[]> {
    const snapshot = await (firestore as any)
      .collection(this.RATE_LIMITS_COLLECTION)
      .where('configId', '==', configId)
      .where('isActive', '==', true)
      .get();
    
    const rules = snapshot.docs.map((doc: any) => doc.data() as RateLimitRule);
    
    // Filter rules that match the endpoint and method
    return rules.filter((rule: any) => {
      const endpointMatch = rule.endpoint === '*' || endpoint.includes(rule.endpoint);
      const methodMatch = rule.method === '*' || rule.method === method;
      return endpointMatch && methodMatch;
    }).sort((a: any, b: any) => b.priority - a.priority);
  }
  
  /**
   * Get usage count for a time period
   */
  private async getUsageCount(configId: string, startTime: Date, endTime: Date): Promise<number> {
    const snapshot = await (firestore as any)
      .collection(this.USAGE_COLLECTION)
      .where('configId', '==', configId)
      .where('timestamp', '>=', Timestamp.fromDate(startTime))
      .where('timestamp', '<=', Timestamp.fromDate(endTime))
      .get();
    
    return snapshot.size;
  }
  
  /**
   * Calculate reset time for quota period
   */
  private calculateResetTime(period: 'minute' | 'hour' | 'day' | 'month', now: Date): Date {
    const resetTime = new Date(now);
    
    switch (period) {
      case 'minute':
        resetTime.setSeconds(0, 0);
        resetTime.setMinutes(resetTime.getMinutes() + 1);
        break;
      case 'hour':
        resetTime.setMinutes(0, 0, 0);
        resetTime.setHours(resetTime.getHours() + 1);
        break;
      case 'day':
        resetTime.setHours(0, 0, 0, 0);
        resetTime.setDate(resetTime.getDate() + 1);
        break;
      case 'month':
        resetTime.setDate(1);
        resetTime.setHours(0, 0, 0, 0);
        resetTime.setMonth(resetTime.getMonth() + 1);
        break;
    }
    
    return resetTime;
  }
  
  /**
   * Update quota cache
   */
  private async updateQuotaCache(configId: string): Promise<void> {
    // Invalidate cache to force refresh on next request
    this.quotaCache.delete(configId);
  }
  
  /**
   * Check for usage alerts
   */
  private async checkUsageAlerts(configId: string): Promise<void> {
    const config = await this.getAPIAccess(configId);
    if (!config || !config.monitoring.alertThresholds) {
      return;
    }
    
    const quotaStatus = await this.getQuotaStatus(configId);
    
    // Check quota usage alerts
    for (const quota of quotaStatus) {
      if (quota.percentageUsed >= config.monitoring.alertThresholds.quotaUsagePercent) {
        await this.sendAlert(config, 'quota_threshold', {
          message: `${quota.platform} ${quota.period} quota is ${quota.percentageUsed.toFixed(1)}% used`,
          quota
        });
      }
    }
  }
  
  /**
   * Send alert notification
   */
  private async sendAlert(config: APIAccessConfig, type: string, data: any): Promise<void> {
    // Implementation would send notifications via email, Slack, webhook, etc.
    console.log(`Alert for ${config.organizationId}: ${type}`, data);
  }
  
  /**
   * Helper methods
   */
  private async encryptCredentials(credentials: APIAccessConfig['credentials']): Promise<any> {
    // Implementation would encrypt sensitive data
    return credentials;
  }
  
  private async decryptCredentials(encryptedCredentials: any): Promise<APIAccessConfig['credentials']> {
    // Implementation would decrypt sensitive data
    return encryptedCredentials;
  }
  
  private generateSecureToken(): string {
    return `irisync_${uuidv4().replace(/-/g, '')}_${Date.now()}`;
  }
  
  private async hashToken(token: string): Promise<string> {
    // Implementation would use a proper hashing algorithm like bcrypt
    return Buffer.from(token).toString('base64');
  }
  
  private isTimeInWindow(time: Date, start: string, end: string, timezone: string): boolean {
    // Implementation would check if time is within the allowed window
    return true; // Simplified for now
  }
  
  private getTopEndpoints(usageData: APIUsage[]): Array<{ endpoint: string; count: number }> {
    const endpointCounts = usageData.reduce((acc, usage) => {
      acc[usage.endpoint] = (acc[usage.endpoint] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(endpointCounts)
      .map(([endpoint, count]) => ({ endpoint, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }
  
  private getErrorBreakdown(usageData: APIUsage[]): Record<number, number> {
    return usageData
      .filter(usage => usage.statusCode >= 400)
      .reduce((acc, usage) => {
        acc[usage.statusCode] = (acc[usage.statusCode] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);
  }
  
  private getHourlyUsage(usageData: APIUsage[]): Array<{ hour: number; count: number }> {
    const hourlyData = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 }));
    
    usageData.forEach(usage => {
      const hour = usage.timestamp.getHours();
      hourlyData[hour].count++;
    });
    
    return hourlyData;
  }
}

// Create and export singleton instance
const platformAPIAccessManager = new PlatformAPIAccessManager();
export default platformAPIAccessManager; 