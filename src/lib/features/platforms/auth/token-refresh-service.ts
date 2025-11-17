import { getFirestore, serverTimestamp } from '@/lib/core/firebase/admin';
import { logger } from '@/lib/core/logging/logger';
import axios from 'axios';

/**
 * Token refresh configuration for each platform
 */
const REFRESH_CONFIGS: Record<string, {
  refreshUrl: string;
  getRefreshParams: (refreshToken: string, clientId: string, clientSecret: string) => any;
  parseResponse: (data: any) => {
    accessToken: string;
    refreshToken?: string;
    expiresIn: number;
  };
}> = {
  facebook: {
    refreshUrl: 'https://graph.facebook.com/v17.0/oauth/access_token',
    getRefreshParams: (refreshToken, clientId, clientSecret) => ({
      grant_type: 'fb_exchange_token',
      client_id: clientId,
      client_secret: clientSecret,
      fb_exchange_token: refreshToken
    }),
    parseResponse: (data) => ({
      accessToken: data.access_token,
      refreshToken: data.access_token, // Facebook uses same token
      expiresIn: data.expires_in || 5184000 // 60 days
    })
  },
  twitter: {
    refreshUrl: 'https://api.twitter.com/2/oauth2/token',
    getRefreshParams: (refreshToken, clientId, clientSecret) => ({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret
    }),
    parseResponse: (data) => ({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in
    })
  },
  linkedin: {
    refreshUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    getRefreshParams: (refreshToken, clientId, clientSecret) => ({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret
    }),
    parseResponse: (data) => ({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in
    })
  },
  youtube: {
    refreshUrl: 'https://oauth2.googleapis.com/token',
    getRefreshParams: (refreshToken, clientId, clientSecret) => ({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret
    }),
    parseResponse: (data) => ({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in
    })
  },
  tiktok: {
    refreshUrl: 'https://open-api.tiktok.com/oauth/refresh_token',
    getRefreshParams: (refreshToken, clientId, clientSecret) => ({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_key: clientId,
      client_secret: clientSecret
    }),
    parseResponse: (data) => ({
      accessToken: data.data.access_token,
      refreshToken: data.data.refresh_token,
      expiresIn: data.data.expires_in
    })
  },
  pinterest: {
    refreshUrl: 'https://api.pinterest.com/v5/oauth/token',
    getRefreshParams: (refreshToken, clientId, clientSecret) => ({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret
    }),
    parseResponse: (data) => ({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in
    })
  }
};

/**
 * Platform credentials
 */
const PLATFORM_CREDENTIALS: Record<string, { clientId: string; clientSecret: string }> = {
  facebook: {
    clientId: process.env.FACEBOOK_CLIENT_ID || '',
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET || ''
  },
  twitter: {
    clientId: process.env.TWITTER_CLIENT_ID || '',
    clientSecret: process.env.TWITTER_CLIENT_SECRET || ''
  },
  linkedin: {
    clientId: process.env.LINKEDIN_CLIENT_ID || '',
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET || ''
  },
  youtube: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || ''
  },
  tiktok: {
    clientId: process.env.TIKTOK_CLIENT_ID || '',
    clientSecret: process.env.TIKTOK_CLIENT_SECRET || ''
  },
  pinterest: {
    clientId: process.env.PINTEREST_CLIENT_ID || '',
    clientSecret: process.env.PINTEREST_CLIENT_SECRET || ''
  }
};

/**
 * Token Refresh Service
 * Handles automatic token refresh for all social media platforms
 */
export class TokenRefreshService {
  private firestore: FirebaseFirestore.Firestore;

  constructor() {
    this.firestore = getFirestore();
  }

  /**
   * Refresh access token for a platform connection
   */
  async refreshToken(userId: string, connectionId: string): Promise<boolean> {
    try {
      // Get connection document
      const connectionRef = this.firestore
        .collection('users')
        .doc(userId)
        .collection('platformConnections')
        .doc(connectionId);

      const connectionDoc = await connectionRef.get();

      if (!connectionDoc.exists) {
        logger.error('Connection not found', { userId, connectionId });
        return false;
      }

      const connection = connectionDoc.data();
      const platform = connection?.platform;
      const refreshToken = connection?.refreshToken;

      if (!platform || !refreshToken) {
        logger.error('Missing platform or refresh token', { userId, connectionId, platform });
        return false;
      }

      // Check if platform supports token refresh
      const config = REFRESH_CONFIGS[platform.toLowerCase()];
      if (!config) {
        logger.warn('Platform does not support token refresh', { platform });
        return false;
      }

      // Get platform credentials
      const credentials = PLATFORM_CREDENTIALS[platform.toLowerCase()];
      if (!credentials.clientId || !credentials.clientSecret) {
        logger.error('Missing platform credentials', { platform });
        return false;
      }

      // Refresh the token
      const params = config.getRefreshParams(
        refreshToken,
        credentials.clientId,
        credentials.clientSecret
      );

      logger.info('Refreshing token', { platform, userId, connectionId });

      const response = await axios.post(
        config.refreshUrl,
        new URLSearchParams(params).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      const { accessToken, refreshToken: newRefreshToken, expiresIn } = config.parseResponse(response.data);

      // Update connection with new tokens
      const updateData: any = {
        accessToken,
        expiresAt: new Date(Date.now() + expiresIn * 1000),
        updatedAt: serverTimestamp()
      };

      if (newRefreshToken) {
        updateData.refreshToken = newRefreshToken;
      }

      await connectionRef.update(updateData);

      logger.info('Token refreshed successfully', {
        platform,
        userId,
        connectionId,
        expiresIn
      });

      return true;
    } catch (error: any) {
      logger.error('Error refreshing token', {
        error: error.message || error,
        response: error.response?.data,
        userId,
        connectionId
      });

      // Mark connection as having invalid credentials
      try {
        await this.firestore
          .collection('users')
          .doc(userId)
          .collection('platformConnections')
          .doc(connectionId)
          .update({
            status: 'error',
            lastError: error.message || 'Token refresh failed',
            lastErrorAt: serverTimestamp()
          });
      } catch (updateError) {
        logger.error('Error updating connection status', { updateError });
      }

      return false;
    }
  }

  /**
   * Check and refresh expired tokens for a user
   */
  async refreshExpiredTokens(userId: string): Promise<number> {
    try {
      const now = new Date();
      const bufferTime = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes buffer

      // Get all connections that are expiring soon
      const connectionsSnapshot = await this.firestore
        .collection('users')
        .doc(userId)
        .collection('platformConnections')
        .where('status', '==', 'active')
        .where('expiresAt', '<=', bufferTime)
        .get();

      if (connectionsSnapshot.empty) {
        return 0;
      }

      let refreshedCount = 0;

      // Refresh each expired connection
      for (const doc of connectionsSnapshot.docs) {
        const success = await this.refreshToken(userId, doc.id);
        if (success) {
          refreshedCount++;
        }
      }

      logger.info('Batch token refresh completed', {
        userId,
        totalConnections: connectionsSnapshot.size,
        refreshedCount
      });

      return refreshedCount;
    } catch (error: any) {
      logger.error('Error in batch token refresh', {
        error: error.message || error,
        userId
      });
      return 0;
    }
  }

  /**
   * Check if a connection's token is expired or expiring soon
   */
  async isTokenExpired(userId: string, connectionId: string, bufferMinutes: number = 5): Promise<boolean> {
    try {
      const connectionDoc = await this.firestore
        .collection('users')
        .doc(userId)
        .collection('platformConnections')
        .doc(connectionId)
        .get();

      if (!connectionDoc.exists) {
        return true;
      }

      const expiresAt = connectionDoc.data()?.expiresAt;
      if (!expiresAt) {
        return false; // No expiration (e.g., Twitter OAuth 1.0a)
      }

      const expiryDate = expiresAt.toDate();
      const bufferTime = new Date(Date.now() + bufferMinutes * 60 * 1000);

      return expiryDate <= bufferTime;
    } catch (error) {
      logger.error('Error checking token expiration', { error, userId, connectionId });
      return true; // Assume expired on error
    }
  }

  /**
   * Schedule automatic token refresh for all users
   * Should be called periodically (e.g., via cron job)
   */
  async refreshAllExpiredTokens(): Promise<{ totalChecked: number; totalRefreshed: number }> {
    try {
      const now = new Date();
      const bufferTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour buffer

      logger.info('Starting scheduled token refresh');

      // Get all users with expiring connections
      const usersSnapshot = await this.firestore.collection('users').get();

      let totalChecked = 0;
      let totalRefreshed = 0;

      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;

        // Get expiring connections for this user
        const connectionsSnapshot = await this.firestore
          .collection('users')
          .doc(userId)
          .collection('platformConnections')
          .where('status', '==', 'active')
          .where('expiresAt', '<=', bufferTime)
          .get();

        totalChecked += connectionsSnapshot.size;

        // Refresh each connection
        for (const connectionDoc of connectionsSnapshot.docs) {
          const success = await this.refreshToken(userId, connectionDoc.id);
          if (success) {
            totalRefreshed++;
          }
        }
      }

      logger.info('Scheduled token refresh completed', {
        totalChecked,
        totalRefreshed
      });

      return { totalChecked, totalRefreshed };
    } catch (error: any) {
      logger.error('Error in scheduled token refresh', {
        error: error.message || error
      });
      return { totalChecked: 0, totalRefreshed: 0 };
    }
  }
}

// Export singleton instance
export const tokenRefreshService = new TokenRefreshService();
