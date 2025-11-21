import { 
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { getFirebaseFirestore, firestore } from '../../core/firebase';
import { NextResponse } from 'next/server';
import {
  UserSessionData,
  SessionStatus,
  UserError,
  UserErrorType,
  UserOperationResult,
  UserActivityType,
  ActivityContext
} from '../types';
import { ActivityUtils } from '../models/Activity';

/**
 * Session manager configuration
 */
export interface SessionManagerConfig {
  defaultTimeout: number; // in minutes
  maxConcurrentSessions: number;
  enableDeviceTracking: boolean;
  enableLocationTracking: boolean;
  enableSessionAnalytics: boolean;
  autoCleanupInterval: number; // in minutes
  securityChecks: {
    detectSuspiciousActivity: boolean;
    requireReauthForSensitive: boolean;
    blockConcurrentSessions: boolean;
  };
}

/**
 * Session data for storage
 */
export interface SessionData {
  id: string;
  userId: string;
  status: SessionStatus;
  startTime: Date;
  lastActivity: Date;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
  device?: {
    type: 'desktop' | 'mobile' | 'tablet';
    os?: string;
    browser?: string;
    fingerprint?: string;
  };
  location?: {
    country?: string;
    region?: string;
    city?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  metadata?: {
    loginMethod?: string;
    rememberMe?: boolean;
    trustedDevice?: boolean;
    riskScore?: number;
  };
}

/**
 * Session options for creation
 */
export interface SessionOptions {
  rememberMe?: boolean;
  deviceFingerprint?: string;
  ipAddress?: string;
  userAgent?: string;
  location?: SessionData['location'];
  trustedDevice?: boolean;
}

/**
 * Session analytics data
 */
export interface SessionAnalytics {
  totalSessions: number;
  activeSessions: number;
  averageDuration: number;
  deviceBreakdown: Record<string, number>;
  locationBreakdown: Record<string, number>;
  peakHours: number[];
  suspiciousActivity: number;
}

/**
 * Firestore session representation
 */
interface FirestoreSession {
  id: string;
  userId: string;
  status: SessionStatus;
  startTime: Timestamp;
  lastActivity: Timestamp;
  expiresAt: Timestamp;
  ipAddress?: string;
  userAgent?: string;
  device?: SessionData['device'];
  location?: SessionData['location'];
  metadata?: SessionData['metadata'];
}

/**
 * Session manager class
 */
export class SessionManager {
  private config: SessionManagerConfig;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<SessionManagerConfig> = {}) {
    this.config = {
      defaultTimeout: 24 * 60, // 24 hours
      maxConcurrentSessions: 5,
      enableDeviceTracking: true,
      enableLocationTracking: false,
      enableSessionAnalytics: true,
      autoCleanupInterval: 60, // 1 hour
      securityChecks: {
        detectSuspiciousActivity: true,
        requireReauthForSensitive: false,
        blockConcurrentSessions: false
      },
      ...config
    };

    // Start automatic cleanup
    this.startAutoCleanup();
  }

  /**
   * Create new session
   */
  async createSession(
    userId: string,
    options: SessionOptions = {}
  ): Promise<UserOperationResult<SessionData>> {
    try {
      // Check concurrent session limit
      if (this.config.securityChecks.blockConcurrentSessions) {
        const activeSessions = await this.getActiveSessions(userId);
        if (activeSessions.length >= this.config.maxConcurrentSessions) {
          // Terminate oldest session
          const oldestSession = activeSessions.sort((a, b) => 
            a.lastActivity.getTime() - b.lastActivity.getTime()
          )[0];
          await this.terminateSession(oldestSession.id, 'concurrent_limit_exceeded');
        }
      }

      const now = new Date();
      const sessionId = this.generateSessionId();
      
      // Calculate expiration time
      const timeoutMinutes = options.rememberMe ? 
        30 * 24 * 60 : // 30 days for remember me
        this.config.defaultTimeout;
      const expiresAt = new Date(now.getTime() + (timeoutMinutes * 60 * 1000));

      // Create session data
      const sessionData: SessionData = {
        id: sessionId,
        userId,
        status: SessionStatus.ACTIVE,
        startTime: now,
        lastActivity: now,
        expiresAt,
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
        device: this.config.enableDeviceTracking ? 
          this.parseDeviceInfo(options.userAgent, options.deviceFingerprint) : undefined,
        location: this.config.enableLocationTracking ? options.location : undefined,
        metadata: {
          loginMethod: 'email_password',
          rememberMe: options.rememberMe || false,
          trustedDevice: options.trustedDevice || false,
          riskScore: await this.calculateRiskScore(userId, options)
        }
      };

      // Store session in database
      await this.storeSession(sessionData);

      // Log session creation
      await this.logSessionActivity(userId, 'session_created', sessionId, {
        rememberMe: options.rememberMe,
        deviceType: sessionData.device?.type
      });

      return { success: true, data: sessionData };

    } catch (error: any) {
      return {
        success: false,
        error: {
          type: UserErrorType.SESSION_ERROR,
          message: 'Failed to create session',
          timestamp: new Date()
        }
      };
    }
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<SessionData | null> {
    try {
      const firestore = getFirebaseFirestore();
      if (!firestore) {
        return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
      }
      const sessionDoc = await getDoc(doc(firestore, 'sessions', sessionId));
      if (!sessionDoc.exists()) return null;

      const data = sessionDoc.data() as FirestoreSession;
      return this.fromFirestore(data);

    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }

  /**
   * Update session activity
   */
  async updateActivity(sessionId: string): Promise<UserOperationResult<void>> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        return {
          success: false,
          error: {
            type: UserErrorType.SESSION_NOT_FOUND,
            message: 'Session not found',
            timestamp: new Date()
          }
        };
      }

      // Check if session is expired
      if (this.isExpired(session)) {
        await this.terminateSession(sessionId, 'expired');
        return {
          success: false,
          error: {
            type: UserErrorType.SESSION_EXPIRED,
            message: 'Session has expired',
            timestamp: new Date()
          }
        };
      }

      // Update last activity
      await updateDoc(doc(firestore, 'sessions', sessionId), {
        lastActivity: serverTimestamp()
      });

      return { success: true };

    } catch (error: any) {
      return {
        success: false,
        error: {
          type: UserErrorType.SESSION_ERROR,
          message: 'Failed to update session activity',
          timestamp: new Date()
        }
      };
    }
  }

  /**
   * Validate session
   */
  async validateSession(sessionId: string): Promise<UserOperationResult<SessionData>> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        return {
          success: false,
          error: {
            type: UserErrorType.SESSION_NOT_FOUND,
            message: 'Session not found',
            timestamp: new Date()
          }
        };
      }

      // Check if session is active
      if (session.status !== SessionStatus.ACTIVE) {
        return {
          success: false,
          error: {
            type: UserErrorType.SESSION_INVALID,
            message: `Session is ${session.status}`,
            timestamp: new Date()
          }
        };
      }

      // Check if session is expired
      if (this.isExpired(session)) {
        await this.terminateSession(sessionId, 'expired');
        return {
          success: false,
          error: {
            type: UserErrorType.SESSION_EXPIRED,
            message: 'Session has expired',
            timestamp: new Date()
          }
        };
      }

      // Update activity
      await this.updateActivity(sessionId);

      return { success: true, data: session };

    } catch (error: any) {
      return {
        success: false,
        error: {
          type: UserErrorType.SESSION_ERROR,
          message: 'Failed to validate session',
          timestamp: new Date()
        }
      };
    }
  }

  /**
   * Terminate session
   */
  async terminateSession(
    sessionId: string,
    reason: string = 'user_logout'
  ): Promise<UserOperationResult<void>> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        return {
          success: false,
          error: {
            type: UserErrorType.SESSION_NOT_FOUND,
            message: 'Session not found',
            timestamp: new Date()
          }
        };
      }

      // Update session status
      await updateDoc(doc(firestore, 'sessions', sessionId), {
        status: SessionStatus.REVOKED,
        terminatedAt: serverTimestamp(),
        terminationReason: reason
      });

      // Log session termination
      await this.logSessionActivity(session.userId, 'session_terminated', sessionId, {
        reason,
        duration: Date.now() - session.startTime.getTime()
      });

      return { success: true };

    } catch (error: any) {
      return {
        success: false,
        error: {
          type: UserErrorType.SESSION_ERROR,
          message: 'Failed to terminate session',
          timestamp: new Date()
        }
      };
    }
  }

  /**
   * Terminate all user sessions
   */
  async terminateAllUserSessions(
    userId: string,
    excludeSessionId?: string,
    reason: string = 'security_action'
  ): Promise<UserOperationResult<number>> {
    try {
      const activeSessions = await this.getActiveSessions(userId);
      let terminatedCount = 0;

      for (const session of activeSessions) {
        if (excludeSessionId && session.id === excludeSessionId) {
          continue;
        }

        const result = await this.terminateSession(session.id, reason);
        if (result.success) {
          terminatedCount++;
        }
      }

      return { success: true, data: terminatedCount };

    } catch (error: any) {
      return {
        success: false,
        error: {
          type: UserErrorType.SESSION_ERROR,
          message: 'Failed to terminate user sessions',
          timestamp: new Date()
        }
      };
    }
  }

  /**
   * Get active sessions for user
   */
  async getActiveSessions(userId: string): Promise<SessionData[]> {
    try {
      const sessionsQuery = query(
        collection(firestore, 'sessions'),
        where('userId', '==', userId),
        where('status', '==', SessionStatus.ACTIVE),
        orderBy('lastActivity', 'desc')
      );

      const snapshot = await getDocs(sessionsQuery);
      const sessions: SessionData[] = [];

      snapshot.forEach(doc => {
        const data = doc.data() as FirestoreSession;
        const session = this.fromFirestore(data);
        
        // Filter out expired sessions
        if (!this.isExpired(session)) {
          sessions.push(session);
        }
      });

      return sessions;

    } catch (error) {
      console.error('Error getting active sessions:', error);
      return [];
    }
  }

  /**
   * Get session analytics
   */
  async getSessionAnalytics(
    userId?: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<SessionAnalytics> {
    try {
      let sessionsQuery = query(collection(firestore, 'sessions'));

      if (userId) {
        sessionsQuery = query(sessionsQuery, where('userId', '==', userId));
      }

      if (dateRange) {
        sessionsQuery = query(
          sessionsQuery,
          where('startTime', '>=', Timestamp.fromDate(dateRange.start)),
          where('startTime', '<=', Timestamp.fromDate(dateRange.end))
        );
      }

      const snapshot = await getDocs(sessionsQuery);
      const sessions: SessionData[] = [];

      snapshot.forEach(doc => {
        const data = doc.data() as FirestoreSession;
        sessions.push(this.fromFirestore(data));
      });

      return this.calculateAnalytics(sessions);

    } catch (error) {
      console.error('Error getting session analytics:', error);
      return {
        totalSessions: 0,
        activeSessions: 0,
        averageDuration: 0,
        deviceBreakdown: {},
        locationBreakdown: {},
        peakHours: [],
        suspiciousActivity: 0
      };
    }
  }

  /**
   * Cleanup expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const expiredQuery = query(
        collection(firestore, 'sessions'),
        where('expiresAt', '<', Timestamp.now())
      );

      const snapshot = await getDocs(expiredQuery);
      let cleanedCount = 0;

      for (const sessionDoc of snapshot.docs) {
        await deleteDoc(sessionDoc.ref);
        cleanedCount++;
      }

      return cleanedCount;

    } catch (error) {
      console.error('Error cleaning up expired sessions:', error);
      return 0;
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Parse device information from user agent
   */
  private parseDeviceInfo(
    userAgent?: string,
    fingerprint?: string
  ): SessionData['device'] | undefined {
    if (!userAgent) return undefined;

    const isMobile = /Mobile|Android|iPhone|iPad/.test(userAgent);
    const isTablet = /iPad|Tablet/.test(userAgent);
    
    let deviceType: 'desktop' | 'mobile' | 'tablet' = 'desktop';
    if (isTablet) deviceType = 'tablet';
    else if (isMobile) deviceType = 'mobile';

    return {
      type: deviceType,
      os: this.extractOS(userAgent),
      browser: this.extractBrowser(userAgent),
      fingerprint
    };
  }

  /**
   * Extract OS from user agent
   */
  private extractOS(userAgent: string): string {
    if (/Windows/.test(userAgent)) return 'Windows';
    if (/Mac OS/.test(userAgent)) return 'macOS';
    if (/Linux/.test(userAgent)) return 'Linux';
    if (/Android/.test(userAgent)) return 'Android';
    if (/iOS/.test(userAgent)) return 'iOS';
    return 'Unknown';
  }

  /**
   * Extract browser from user agent
   */
  private extractBrowser(userAgent: string): string {
    if (/Chrome/.test(userAgent)) return 'Chrome';
    if (/Firefox/.test(userAgent)) return 'Firefox';
    if (/Safari/.test(userAgent)) return 'Safari';
    if (/Edge/.test(userAgent)) return 'Edge';
    return 'Unknown';
  }

  /**
   * Calculate risk score for session
   */
  private async calculateRiskScore(
    userId: string,
    options: SessionOptions
  ): Promise<number> {
    let riskScore = 0;

    // Check for new device
    if (!options.trustedDevice) {
      riskScore += 20;
    }

    // Check for unusual location (simplified)
    if (options.location) {
      riskScore += 10;
    }

    // Check for suspicious timing (simplified)
    const hour = new Date().getHours();
    if (hour < 6 || hour > 22) {
      riskScore += 15;
    }

    return Math.min(riskScore, 100);
  }

  /**
   * Store session in database
   */
  private async storeSession(sessionData: SessionData): Promise<void> {
    const firestoreSession = this.toFirestore(sessionData);
    await setDoc(doc(firestore, 'sessions', sessionData.id), firestoreSession);
  }

  /**
   * Convert session to Firestore format
   */
  private toFirestore(session: SessionData): FirestoreSession {
    return {
      id: session.id,
      userId: session.userId,
      status: session.status,
      startTime: Timestamp.fromDate(session.startTime),
      lastActivity: Timestamp.fromDate(session.lastActivity),
      expiresAt: Timestamp.fromDate(session.expiresAt),
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      device: session.device,
      location: session.location,
      metadata: session.metadata
    };
  }

  /**
   * Convert Firestore data to session
   */
  private fromFirestore(data: FirestoreSession): SessionData {
    return {
      id: data.id,
      userId: data.userId,
      status: data.status,
      startTime: data.startTime.toDate(),
      lastActivity: data.lastActivity.toDate(),
      expiresAt: data.expiresAt.toDate(),
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      device: data.device,
      location: data.location,
      metadata: data.metadata
    };
  }

  /**
   * Check if session is expired
   */
  private isExpired(session: SessionData): boolean {
    return session.expiresAt.getTime() < Date.now();
  }

  /**
   * Calculate analytics from sessions
   */
  private calculateAnalytics(sessions: SessionData[]): SessionAnalytics {
    const activeSessions = sessions.filter(s => 
      s.status === SessionStatus.ACTIVE && !this.isExpired(s)
    ).length;

    const deviceBreakdown: Record<string, number> = {};
    const locationBreakdown: Record<string, number> = {};
    const hourCounts = new Array(24).fill(0);
    let totalDuration = 0;
    let suspiciousActivity = 0;

    sessions.forEach(session => {
      // Device breakdown
      if (session.device?.type) {
        deviceBreakdown[session.device.type] = (deviceBreakdown[session.device.type] || 0) + 1;
      }

      // Location breakdown
      if (session.location?.country) {
        locationBreakdown[session.location.country] = (locationBreakdown[session.location.country] || 0) + 1;
      }

      // Peak hours
      const hour = session.startTime.getHours();
      hourCounts[hour]++;

      // Duration calculation
      const duration = session.lastActivity.getTime() - session.startTime.getTime();
      totalDuration += duration;

      // Suspicious activity (simplified)
      if (session.metadata?.riskScore && session.metadata.riskScore > 50) {
        suspiciousActivity++;
      }
    });

    const averageDuration = sessions.length > 0 ? totalDuration / sessions.length : 0;
    const peakHours = hourCounts
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(item => item.hour);

    return {
      totalSessions: sessions.length,
      activeSessions,
      averageDuration: Math.round(averageDuration / (1000 * 60)), // Convert to minutes
      deviceBreakdown,
      locationBreakdown,
      peakHours,
      suspiciousActivity
    };
  }

  /**
   * Log session activity
   */
  private async logSessionActivity(
    userId: string,
    action: string,
    sessionId: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      const activity = ActivityUtils.createActivity(
        userId,
        UserActivityType.LOGIN, // Use existing activity type
        action,
        {
          resource: 'session',
          resourceId: sessionId,
          context: ActivityContext.WEB,
          metadata: {
            success: true,
            ...metadata
          }
        }
      );

      // Save activity to Firestore
      const activitiesRef = collection(firestore, 'userActivities');
      await setDoc(doc(activitiesRef), {
        userId,
        type: UserActivityType.LOGIN,
        action,
        resource: 'session',
        resourceId: sessionId,
        context: ActivityContext.WEB,
        timestamp: serverTimestamp(),
        metadata: {
          success: true,
          ...metadata
        }
      });
    } catch (error) {
      console.error('Error logging session activity:', error);
    }
  }

  /**
   * Start automatic cleanup
   */
  private startAutoCleanup(): void {
    if (this.config.autoCleanupInterval > 0) {
      this.cleanupInterval = setInterval(async () => {
        try {
          const cleanedCount = await this.cleanupExpiredSessions();
          if (cleanedCount > 0) {
            console.log(`Cleaned up ${cleanedCount} expired sessions`);
          }
        } catch (error) {
          console.error('Error during automatic session cleanup:', error);
        }
      }, this.config.autoCleanupInterval * 60 * 1000);
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
} 