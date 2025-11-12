import { PlatformType, PlatformAccountInfo, PlatformAuthData } from '../models';
import { PlatformAdapter } from './PlatformAdapter';
import { FacebookAdapter } from './FacebookAdapter';
import { InstagramAdapter } from './InstagramAdapter';
import { TwitterAdapter } from './TwitterAdapter';
import { LinkedInAdapter } from './LinkedInAdapter';
import { YouTubeAdapter } from './YouTubeAdapter';
import { TikTokAdapter } from './TikTokAdapter';
import { RedditAdapter } from './RedditAdapter';
import { MastodonAdapter } from './MastodonAdapter';
import { ThreadsAdapter } from './ThreadsAdapter';
import { logger } from '../../logging/logger';

/**
 * Factory for creating platform-specific adapters
 */
export class PlatformAdapterFactory {
  private static adapters: Map<PlatformType, PlatformAdapter> = new Map();
  
  /**
   * Get the appropriate adapter for the given platform type
   */
  static getAdapter(platformType: PlatformType): PlatformAdapter {
    // Check if we already have an instance
    const existingAdapter = this.adapters.get(platformType);
    if (existingAdapter) {
      return existingAdapter;
    }
    
    // Create a new adapter instance
    let adapter: PlatformAdapter;
    
    try {
      switch (platformType) {
        case PlatformType.FACEBOOK:
          adapter = new FacebookAdapter();
          break;
        case PlatformType.INSTAGRAM:
          adapter = new InstagramAdapter();
          break;
        case PlatformType.TWITTER:
          adapter = new TwitterAdapter();
          break;
        case PlatformType.LINKEDIN:
          adapter = new LinkedInAdapter();
          break;
        case PlatformType.YOUTUBE:
          adapter = new YouTubeAdapter();
          break;
        case PlatformType.TIKTOK:
          adapter = new TikTokAdapter();
          break;
        case PlatformType.REDDIT:
          adapter = new RedditAdapter();
          break;
        case PlatformType.MASTODON:
          adapter = new MastodonAdapter();
          break;
        case PlatformType.THREADS:
          adapter = new ThreadsAdapter();
          break;
        default:
          console.error(`Unsupported platform type: ${platformType}`);
          throw new Error(`Unsupported platform type: ${platformType}`);
      }
    } catch (error) {
      console.error(`Error creating platform adapter for ${platformType}:`, error);
      
      // Fallback to emergency adapter to prevent crashes in production
      adapter = new EmergencyAdapter(platformType);
    }
    
    // Store the adapter for future use
    this.adapters.set(platformType, adapter);
    
    return adapter;
  }
  
  /**
   * Clear cached adapters - useful for testing
   */
  static clearAdapters(): void {
    this.adapters.clear();
  }
}

/**
 * Emergency adapter implementation used as fallback when there's an error creating a real adapter
 * This helps prevent crashes in production but should trigger alerts
 */
class EmergencyAdapter implements PlatformAdapter {
  constructor(private platformType: PlatformType) {
    // Log this emergency situation
    console.error(
      `EMERGENCY ADAPTER BEING USED for ${platformType} - This indicates a problem with the real adapter implementation`
    );
  }
  
  async getAuthorizationUrl(state: string): Promise<string> {
    console.warn(`Emergency adapter used for getAuthorizationUrl (${this.platformType})`);
    return `/platforms/callback?error=adapter_failure&platform=${this.platformType}`;
  }
  
  async handleAuthorizationCode(code: string, oauthVerifier?: string): Promise<PlatformAuthData> {
    console.warn(`Emergency adapter used for handleAuthorizationCode (${this.platformType})`);
    throw new Error(`Platform adapter for ${this.platformType} is unavailable`);
  }
  
  async handleAuthorizationCallback(code: string, state: string): Promise<PlatformAuthData> {
    console.warn(`Emergency adapter used for handleAuthorizationCallback (${this.platformType})`);
    throw new Error(`Platform adapter for ${this.platformType} is unavailable`);
  }
  
  async handleAuthorizationToken(oauthVerifier: string, oauthToken: string): Promise<PlatformAuthData> {
    console.warn(`Emergency adapter used for handleAuthorizationToken (${this.platformType})`);
    throw new Error(`Platform adapter for ${this.platformType} is unavailable`);
  }
  
  async getAccountInfo(accessToken: string): Promise<PlatformAccountInfo> {
    console.warn(`Emergency adapter used for getAccountInfo (${this.platformType})`);
    throw new Error(`Platform adapter for ${this.platformType} is unavailable`);
  }
  
  async validateToken(token: string): Promise<boolean> {
    console.warn(`Emergency adapter used for validateToken (${this.platformType})`);
    return false;
  }
  
  async refreshToken(refreshToken: string): Promise<string> {
    console.warn(`Emergency adapter used for refreshToken (${this.platformType})`);
    throw new Error(`Platform adapter for ${this.platformType} is unavailable`);
  }

  /**
   * Initialize the emergency adapter
   */
  async initialize(connection: PlatformAuthData): Promise<void> {
    logger.warn('Emergency adapter initialized - primary adapter failed', {
      platformType: this.platformType,
      userId: connection.platformUserId
    });
    // Emergency adapter is always considered "initialized"
    return Promise.resolve();
  }
} 