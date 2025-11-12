import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { SubscriptionService } from '../subscription/SubscriptionService';

// Get Firestore instance
const firestore = getFirestore();

/**
 * Represents a custom branded URL
 */
export interface CustomUrl {
  id: string;
  userId: string;
  organizationId?: string;
  originalUrl: string;
  customDomain: string;
  path: string;
  fullUrl: string;
  title?: string;
  description?: string;
  isActive: boolean;
  clickCount: number;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  metadata?: Record<string, any>;
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
}

/**
 * Represents click analytics for a custom URL
 */
export interface UrlClickAnalytics {
  urlId: string;
  clickCount: number;
  uniqueVisitors: number;
  browserStats: Record<string, number>;
  deviceStats: Record<string, number>;
  countryStats: Record<string, number>;
  referrerStats: Record<string, number>;
  timeSeriesData: {
    date: string;
    clicks: number;
    uniqueVisitors: number;
  }[];
}

/**
 * Represents a custom domain for branded URLs
 */
export interface CustomDomain {
  id: string;
  userId: string;
  organizationId?: string;
  domain: string;
  isVerified: boolean;
  verificationMethod: 'dns' | 'file';
  verificationToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Represents a click event on a custom URL
 */
export interface UrlClick {
  id: string;
  urlId: string;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  browser: string;
  device: string;
  operatingSystem: string;
  country: string;
  region?: string;
  city?: string;
  referrer?: string;
  utm?: Record<string, string>;
}

/**
 * Service for managing custom branded URLs for Enterprise tier users
 */
export class CustomUrlService {
  private readonly URL_COLLECTION = 'custom_urls';
  private readonly DOMAIN_COLLECTION = 'custom_domains';
  private readonly CLICK_COLLECTION = 'url_clicks';
  
  /**
   * Create a new custom branded URL
   * This feature is only available for Enterprise tier users
   */
  async createCustomUrl(
    userId: string,
    originalUrl: string,
    customDomain: string,
    path?: string,
    options: {
      title?: string;
      description?: string;
      organizationId?: string;
      expiresAt?: Date;
      metadata?: Record<string, any>;
      utm?: {
        source?: string;
        medium?: string;
        campaign?: string;
        term?: string;
        content?: string;
      };
    } = {}
  ): Promise<CustomUrl> {
    // Check if user has Enterprise tier
    const tier = await SubscriptionService.getSubscriptionTier(userId);
    if (tier !== SubscriptionService.SubscriptionTier.ENTERPRISE) {
      throw new Error('Custom branded URLs are only available for Enterprise tier users');
    }
    
    // Check if the domain is owned by the user
    const domainSnapshot = await firestore
      .collection(this.DOMAIN_COLLECTION)
      .where('userId', '==', userId)
      .where('domain', '==', customDomain)
      .where('isVerified', '==', true)
      .limit(1)
      .get();
    
    if (domainSnapshot.empty) {
      throw new Error('No verified domain found with this name for the user');
    }
    
    // Generate a path if not provided
    if (!path) {
      path = this.generateShortPath();
    }
    
    // Check if path is already used for this domain
    const existingUrlSnapshot = await firestore
      .collection(this.URL_COLLECTION)
      .where('customDomain', '==', customDomain)
      .where('path', '==', path)
      .where('isActive', '==', true)
      .limit(1)
      .get();
    
    if (!existingUrlSnapshot.empty) {
      throw new Error('This URL path is already in use for this domain');
    }
    
    // Create the custom URL
    const now = new Date();
    const urlId = uuidv4();
    
    const customUrl: CustomUrl = {
      id: urlId,
      userId,
      organizationId: options.organizationId,
      originalUrl,
      customDomain,
      path,
      fullUrl: `https://${customDomain}/${path}`,
      title: options.title,
      description: options.description,
      isActive: true,
      clickCount: 0,
      createdAt: now,
      updatedAt: now,
      expiresAt: options.expiresAt,
      metadata: options.metadata,
      utm: options.utm
    };
    
    // Store in Firestore
    await firestore
      .collection(this.URL_COLLECTION)
      .doc(urlId)
      .set(customUrl);
    
    return customUrl;
  }
  
  /**
   * Get a custom URL by ID
   */
  async getCustomUrl(urlId: string): Promise<CustomUrl | null> {
    const urlDoc = await firestore
      .collection(this.URL_COLLECTION)
      .doc(urlId)
      .get();
    
    if (!urlDoc.exists) {
      return null;
    }
    
    return urlDoc.data() as CustomUrl;
  }
  
  /**
   * Get a custom URL by domain and path
   */
  async getCustomUrlByPath(domain: string, path: string): Promise<CustomUrl | null> {
    const urlSnapshot = await firestore
      .collection(this.URL_COLLECTION)
      .where('customDomain', '==', domain)
      .where('path', '==', path)
      .where('isActive', '==', true)
      .limit(1)
      .get();
    
    if (urlSnapshot.empty) {
      return null;
    }
    
    return urlSnapshot.docs[0].data() as CustomUrl;
  }
  
  /**
   * Get all custom URLs for a user
   */
  async getUserCustomUrls(userId: string, limit: number = 50, offset: number = 0): Promise<CustomUrl[]> {
    const urlSnapshot = await firestore
      .collection(this.URL_COLLECTION)
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .offset(offset)
      .get();
    
    const urls: CustomUrl[] = [];
    
    urlSnapshot.forEach(doc => {
      urls.push(doc.data() as CustomUrl);
    });
    
    return urls;
  }
  
  /**
   * Update a custom URL
   */
  async updateCustomUrl(
    urlId: string,
    userId: string,
    updates: {
      originalUrl?: string;
      title?: string;
      description?: string;
      isActive?: boolean;
      expiresAt?: Date | null;
      metadata?: Record<string, any>;
      utm?: {
        source?: string;
        medium?: string;
        campaign?: string;
        term?: string;
        content?: string;
      };
    }
  ): Promise<CustomUrl> {
    const urlDoc = await firestore
      .collection(this.URL_COLLECTION)
      .doc(urlId)
      .get();
    
    if (!urlDoc.exists) {
      throw new Error('URL not found');
    }
    
    const customUrl = urlDoc.data() as CustomUrl;
    
    if (customUrl.userId !== userId) {
      throw new Error('You do not have permission to update this URL');
    }
    
    // Update fields
    const updatedUrl: { [key: string]: any } = {
      ...updates,
      updatedAt: new Date()
    };
    
    if (updates.expiresAt === null) {
      // Remove expiration date
      updatedUrl.expiresAt = FieldValue.delete();
    }
    
    // Update in Firestore
    await firestore
      .collection(this.URL_COLLECTION)
      .doc(urlId)
      .update(updatedUrl);
    
    // Get the updated document
    const updatedDoc = await firestore
      .collection(this.URL_COLLECTION)
      .doc(urlId)
      .get();
    
    return updatedDoc.data() as CustomUrl;
  }
  
  /**
   * Delete a custom URL
   */
  async deleteCustomUrl(urlId: string, userId: string): Promise<boolean> {
    const urlDoc = await firestore
      .collection(this.URL_COLLECTION)
      .doc(urlId)
      .get();
    
    if (!urlDoc.exists) {
      throw new Error('URL not found');
    }
    
    const customUrl = urlDoc.data() as CustomUrl;
    
    if (customUrl.userId !== userId) {
      throw new Error('You do not have permission to delete this URL');
    }
    
    // We'll soft delete by marking it as inactive
    await firestore
      .collection(this.URL_COLLECTION)
      .doc(urlId)
      .update({
        isActive: false,
        updatedAt: new Date()
      });
    
    return true;
  }
  
  /**
   * Record a click on a custom URL
   */
  async recordUrlClick(
    urlId: string,
    clickData: {
      ipAddress: string;
      userAgent: string;
      referrer?: string;
      utm?: Record<string, string>;
    }
  ): Promise<void> {
    // Get URL details
    const urlDoc = await firestore
      .collection(this.URL_COLLECTION)
      .doc(urlId)
      .get();
    
    if (!urlDoc.exists || !(urlDoc.data() as CustomUrl).isActive) {
      throw new Error('URL not found or inactive');
    }
    
    // Check if URL is expired
    const customUrl = urlDoc.data() as CustomUrl;
    if (customUrl.expiresAt && new Date(customUrl.expiresAt) < new Date()) {
      throw new Error('URL has expired');
    }
    
    // Get browser, device, OS info from user agent
    const { browser, device, operatingSystem } = this.parseUserAgent(clickData.userAgent);
    
    // Get location info from IP address
    const geoData = await this.getLocationFromIp(clickData.ipAddress);
    
    // Create click record
    const clickId = uuidv4();
    const clickRecord: UrlClick = {
      id: clickId,
      urlId,
      timestamp: new Date(),
      ipAddress: clickData.ipAddress,
      userAgent: clickData.userAgent,
      browser,
      device,
      operatingSystem,
      country: geoData.country || 'Unknown',
      region: geoData.region,
      city: geoData.city,
      referrer: clickData.referrer,
      utm: clickData.utm
    };
    
    // Store click in Firestore
    await firestore
      .collection(this.CLICK_COLLECTION)
      .doc(clickId)
      .set(clickRecord);
    
    // Update URL click count
    await firestore
      .collection(this.URL_COLLECTION)
      .doc(urlId)
      .update({
        clickCount: FieldValue.increment(1),
        updatedAt: new Date()
      });
  }
  
  /**
   * Get click analytics for a custom URL
   */
  async getUrlAnalytics(urlId: string, userId: string, dateRange?: { start: Date; end: Date }): Promise<UrlClickAnalytics> {
    const urlDoc = await firestore
      .collection(this.URL_COLLECTION)
      .doc(urlId)
      .get();
    
    if (!urlDoc.exists) {
      throw new Error('URL not found');
    }
    
    const customUrl = urlDoc.data() as CustomUrl;
    
    if (customUrl.userId !== userId) {
      throw new Error('You do not have permission to view analytics for this URL');
    }
    
    // Build query for clicks
    let clickQuery = firestore
      .collection(this.CLICK_COLLECTION)
      .where('urlId', '==', urlId);
    
    if (dateRange) {
      clickQuery = clickQuery
        .where('timestamp', '>=', dateRange.start)
        .where('timestamp', '<=', dateRange.end);
    }
    
    const clickSnapshot = await clickQuery.get();
    
    // Process click data
    const clicks: UrlClick[] = [];
    clickSnapshot.forEach((doc: any) => {
      clicks.push(doc.data() as UrlClick);
    });
    
    // Calculate unique visitors (by IP)
    const uniqueIps = new Set(clicks.map(click => click.ipAddress));
    
    // Aggregate browser stats
    const browserStats: Record<string, number> = {};
    clicks.forEach(click => {
      if (!browserStats[click.browser]) {
        browserStats[click.browser] = 0;
      }
      browserStats[click.browser]++;
    });
    
    // Aggregate device stats
    const deviceStats: Record<string, number> = {};
    clicks.forEach(click => {
      if (!deviceStats[click.device]) {
        deviceStats[click.device] = 0;
      }
      deviceStats[click.device]++;
    });
    
    // Aggregate country stats
    const countryStats: Record<string, number> = {};
    clicks.forEach(click => {
      if (!countryStats[click.country]) {
        countryStats[click.country] = 0;
      }
      countryStats[click.country]++;
    });
    
    // Aggregate referrer stats
    const referrerStats: Record<string, number> = {};
    clicks.forEach(click => {
      if (click.referrer) {
        // Extract domain from referrer
        let referrerDomain = click.referrer;
        try {
          referrerDomain = new URL(click.referrer).hostname;
        } catch (e) {
          // If parsing fails, use the original value
        }
        
        if (!referrerStats[referrerDomain]) {
          referrerStats[referrerDomain] = 0;
        }
        referrerStats[referrerDomain]++;
      }
    });
    
    // Generate time series data
    const timeSeriesData: { date: string; clicks: number; uniqueVisitors: number }[] = [];
    
    if (clicks.length > 0) {
      // Group clicks by date
      const clicksByDate: Record<string, UrlClick[]> = {};
      
      clicks.forEach(click => {
        const dateStr = click.timestamp.toISOString().split('T')[0];
        if (!clicksByDate[dateStr]) {
          clicksByDate[dateStr] = [];
        }
        clicksByDate[dateStr].push(click);
      });
      
      // Sort dates and create time series
      Object.keys(clicksByDate)
        .sort()
        .forEach(dateStr => {
          const dateClicks = clicksByDate[dateStr];
          const uniqueIpsForDate = new Set(dateClicks.map(click => click.ipAddress));
          
          timeSeriesData.push({
            date: dateStr,
            clicks: dateClicks.length,
            uniqueVisitors: uniqueIpsForDate.size
          });
        });
    }
    
    return {
      urlId,
      clickCount: clicks.length,
      uniqueVisitors: uniqueIps.size,
      browserStats,
      deviceStats,
      countryStats,
      referrerStats,
      timeSeriesData
    };
  }
  
  /**
   * Register a custom domain for branded URLs
   */
  async registerCustomDomain(
    userId: string,
    domain: string,
    organizationId?: string
  ): Promise<CustomDomain> {
    // Check if user has Enterprise tier
    const tier = await SubscriptionService.getSubscriptionTier(userId);
    if (tier !== SubscriptionService.SubscriptionTier.ENTERPRISE) {
      throw new Error('Custom domains are only available for Enterprise tier users');
    }
    
    // Check if domain is already registered
    const existingDomainSnapshot = await firestore
      .collection(this.DOMAIN_COLLECTION)
      .where('domain', '==', domain)
      .limit(1)
      .get();
    
    if (!existingDomainSnapshot.empty) {
      throw new Error('This domain is already registered');
    }
    
    // Create verification token
    const verificationToken = `iris-verify-${uuidv4().substring(0, 8)}`;
    
    // Create domain record
    const domainId = uuidv4();
    const now = new Date();
    
    const customDomain: CustomDomain = {
      id: domainId,
      userId,
      organizationId,
      domain,
      isVerified: false,
      verificationMethod: 'dns',
      verificationToken,
      createdAt: now,
      updatedAt: now
    };
    
    // Store in Firestore
    await firestore
      .collection(this.DOMAIN_COLLECTION)
      .doc(domainId)
      .set(customDomain);
    
    return customDomain;
  }
  
  /**
   * Verify domain ownership
   */
  async verifyDomain(domainId: string, userId: string): Promise<CustomDomain> {
    const domainDoc = await firestore
      .collection(this.DOMAIN_COLLECTION)
      .doc(domainId)
      .get();
    
    if (!domainDoc.exists) {
      throw new Error('Domain not found');
    }
    
    const customDomain = domainDoc.data() as CustomDomain;
    
    if (customDomain.userId !== userId) {
      throw new Error('You do not have permission to verify this domain');
    }
    
    if (customDomain.isVerified) {
      return customDomain; // Already verified
    }
    
    // Check verification based on method
    let isVerified = false;
    
    if (customDomain.verificationMethod === 'dns') {
      // Check DNS TXT record
      isVerified = await this.verifyDomainByDns(customDomain.domain, customDomain.verificationToken!);
    } else if (customDomain.verificationMethod === 'file') {
      // Check file verification
      isVerified = await this.verifyDomainByFile(customDomain.domain, customDomain.verificationToken!);
    }
    
    if (!isVerified) {
      throw new Error('Domain verification failed. Please check your DNS or file setup and try again.');
    }
    
    // Update domain as verified
    await firestore
      .collection(this.DOMAIN_COLLECTION)
      .doc(domainId)
      .update({
        isVerified: true,
        updatedAt: new Date()
      });
    
    // Get updated document
    const updatedDoc = await firestore
      .collection(this.DOMAIN_COLLECTION)
      .doc(domainId)
      .get();
    
    return updatedDoc.data() as CustomDomain;
  }
  
  /**
   * Get all custom domains for a user
   */
  async getUserDomains(userId: string): Promise<CustomDomain[]> {
    const domainSnapshot = await firestore
      .collection(this.DOMAIN_COLLECTION)
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    
    const domains: CustomDomain[] = [];
    
    domainSnapshot.forEach(doc => {
      domains.push(doc.data() as CustomDomain);
    });
    
    return domains;
  }
  
  /**
   * Delete a custom domain
   */
  async deleteCustomDomain(domainId: string, userId: string): Promise<boolean> {
    const domainDoc = await firestore
      .collection(this.DOMAIN_COLLECTION)
      .doc(domainId)
      .get();
    
    if (!domainDoc.exists) {
      throw new Error('Domain not found');
    }
    
    const customDomain = domainDoc.data() as CustomDomain;
    
    if (customDomain.userId !== userId) {
      throw new Error('You do not have permission to delete this domain');
    }
    
    // Check if domain has any active URLs
    const activeUrlsSnapshot = await firestore
      .collection(this.URL_COLLECTION)
      .where('customDomain', '==', customDomain.domain)
      .where('isActive', '==', true)
      .limit(1)
      .get();
    
    if (!activeUrlsSnapshot.empty) {
      throw new Error('Cannot delete domain with active URLs. Deactivate all URLs first.');
    }
    
    // Delete domain record
    await firestore
      .collection(this.DOMAIN_COLLECTION)
      .doc(domainId)
      .delete();
    
    return true;
  }
  
  /**
   * Generate a short random path for URL
   */
  private generateShortPath(length: number = 6): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
  }
  
  /**
   * Parse user agent to get browser, device, and OS info
   */
  private parseUserAgent(userAgent: string): { browser: string; device: string; operatingSystem: string } {
    // This is a simplified version - in production we would use a proper user-agent parser library
    
    let browser = 'Unknown';
    let device = 'Unknown';
    let operatingSystem = 'Unknown';
    
    // Detect browser
    if (userAgent.includes('Firefox/')) {
      browser = 'Firefox';
    } else if (userAgent.includes('Chrome/') && !userAgent.includes('Edg/')) {
      browser = 'Chrome';
    } else if (userAgent.includes('Safari/') && !userAgent.includes('Chrome/')) {
      browser = 'Safari';
    } else if (userAgent.includes('Edg/')) {
      browser = 'Edge';
    } else if (userAgent.includes('MSIE') || userAgent.includes('Trident/')) {
      browser = 'Internet Explorer';
    }
    
    // Detect device
    if (userAgent.includes('Mobile')) {
      device = 'Mobile';
    } else if (userAgent.includes('Tablet')) {
      device = 'Tablet';
    } else {
      device = 'Desktop';
    }
    
    // Detect OS
    if (userAgent.includes('Windows')) {
      operatingSystem = 'Windows';
    } else if (userAgent.includes('Mac OS')) {
      operatingSystem = 'Mac OS';
    } else if (userAgent.includes('Android')) {
      operatingSystem = 'Android';
    } else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) {
      operatingSystem = 'iOS';
    } else if (userAgent.includes('Linux')) {
      operatingSystem = 'Linux';
    }
    
    return { browser, device, operatingSystem };
  }
  
  /**
   * Get location data from IP address
   */
  private async getLocationFromIp(ipAddress: string): Promise<{ country: string; region?: string; city?: string }> {
    try {
      // Use a reliable IP geolocation service for production
      const response = await axios.get(`https://ipapi.co/${ipAddress}/json/`, {
        timeout: 5000 // 5 second timeout
      });
      
      return {
        country: response.data.country_name || 'Unknown',
        region: response.data.region || undefined,
        city: response.data.city || undefined
      };
    } catch (error) {
      console.error('Error getting location from IP:', error);
      return { country: 'Unknown' };
    }
  }
  
  /**
   * Verify domain ownership by checking DNS TXT record
   */
  private async verifyDomainByDns(domain: string, token: string): Promise<boolean> {
    try {
      // Use real DNS resolution to check TXT records
      const dns = require('dns');
      const { promisify } = require('util');
      const resolveTxt = promisify(dns.resolveTxt);
      
      // Query for TXT records at the verification subdomain
      const txtRecords = await resolveTxt(`_iris-verify.${domain}`);
      
      // Check if any record contains our verification token
      return txtRecords.some((record: string[]) => 
        record.some((value: string) => value.includes(token))
      );
    } catch (error: any) {
      console.error('Error verifying domain by DNS:', error);
      
      // Check the error type
      if (error.code === 'ENOTFOUND' || error.code === 'ENODATA') {
        // DNS record doesn't exist
        return false;
      } else if (error.code === 'TIMEOUT') {
        // DNS query timed out, could be temporary
        throw new Error('DNS verification timed out. Please try again later.');
      }
      
      // Other errors
      return false;
    }
  }
  
  /**
   * Verify domain ownership by checking for a verification file
   */
  private async verifyDomainByFile(domain: string, token: string): Promise<boolean> {
    try {
      // Check both HTTP and HTTPS
      const axios = require('axios');
      
      // Set a reasonable timeout for the requests
      const requestOptions = {
        timeout: 10000, // 10 seconds
        validateStatus: (status: number) => status === 200 // Only accept 200 OK
      };
      
      try {
        // Try HTTPS first
        const httpsResponse = await axios.get(
          `https://${domain}/.well-known/iris-verify.txt`, 
          requestOptions
        );
        
        // Check if the file content contains our token
        return httpsResponse.data.includes(token);
      } catch (httpsError) {
        // If HTTPS fails, try HTTP as fallback
        try {
          const httpResponse = await axios.get(
            `http://${domain}/.well-known/iris-verify.txt`, 
            requestOptions
          );
          
          // Check if the file content contains our token
          return httpResponse.data.includes(token);
        } catch (httpError) {
          // Both HTTP and HTTPS failed
          console.error('Error accessing verification file via HTTP:', httpError);
          return false;
        }
      }
    } catch (error) {
      console.error('Error verifying domain by file:', error);
      return false;
    }
  }
}

// Create singleton instance
const customUrlService = new CustomUrlService();
export default customUrlService; 