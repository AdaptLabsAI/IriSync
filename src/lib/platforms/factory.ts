import { AuthState, PlatformProvider, PlatformProviderConfig, PlatformType } from './PlatformProvider';
import { FacebookProvider } from './providers/FacebookProvider';
import { InstagramProvider } from './providers/InstagramProvider';
import { LinkedInProvider } from './providers/LinkedInProvider';
import { ThreadsProvider } from './providers/ThreadsProvider';
import { TwitterProvider } from './providers/TwitterProvider';
import { TikTokProvider } from './providers/TikTokProvider';
import { YouTubeProvider } from './providers/YouTubeProvider';
import { RedditProvider } from './providers/RedditProvider';
import { MastodonProvider } from './providers/MastodonProvider';
import { TwitterTier } from './utils/twitter-rate-limiter';

export interface PlatformProviderOptions {
  twitterTier?: TwitterTier;
}

/**
 * Factory for creating platform provider instances
 */
export class PlatformProviderFactory {
  /**
   * Create a platform provider instance based on the platform type
   */
  static createProvider(
    platformType: PlatformType,
    config: PlatformProviderConfig,
    authState?: AuthState,
    options?: PlatformProviderOptions
  ): PlatformProvider {
    switch (platformType) {
      case PlatformType.FACEBOOK:
        return new FacebookProvider(config, authState);
        
      case PlatformType.INSTAGRAM:
        return new InstagramProvider(config, authState);
        
      case PlatformType.TWITTER:
        return new TwitterProvider(config, authState, options?.twitterTier || 'basic');
        
      case PlatformType.LINKEDIN:
        return new LinkedInProvider(config, authState);
        
      case PlatformType.YOUTUBE:
        return new YouTubeProvider(config, authState);
        
      case PlatformType.TIKTOK:
        return new TikTokProvider(config, authState);
        
      case PlatformType.REDDIT:
        return new RedditProvider(config, authState);
        
      case PlatformType.MASTODON:
        return new MastodonProvider(config, authState);
        
      case PlatformType.THREADS:
        return new ThreadsProvider(config, authState);
        
      default:
        throw new Error(`Unsupported platform type: ${platformType}`);
    }
  }
  
  /**
   * Get the default configuration for a platform from environment variables
   */
  static getDefaultConfig(platformType: PlatformType): PlatformProviderConfig {
    switch (platformType) {
      case PlatformType.FACEBOOK:
        return {
          clientId: process.env.FACEBOOK_APP_ID || '',
          clientSecret: process.env.FACEBOOK_APP_SECRET || '',
          redirectUri: `${process.env.NEXTAUTH_URL || ''}${process.env.FACEBOOK_CALLBACK_URL || ''}`,
          apiVersion: 'v17.0'
        };
        
      case PlatformType.INSTAGRAM:
        return {
          clientId: process.env.INSTAGRAM_CLIENT_ID || '',
          clientSecret: process.env.INSTAGRAM_CLIENT_SECRET || '',
          redirectUri: `${process.env.NEXTAUTH_URL || ''}${process.env.INSTAGRAM_CALLBACK_URL || ''}`
        };
        
      case PlatformType.TWITTER:
        return {
          clientId: process.env.TWITTER_API_KEY || '',
          clientSecret: process.env.TWITTER_API_SECRET || '',
          redirectUri: process.env.TWITTER_CALLBACK_URL || `${process.env.NEXTAUTH_URL || ''}/api/platforms/callback/social?platform=twitter`,
          baseUrl: process.env.TWITTER_API_URL || 'https://api.twitter.com',
          apiVersion: '2',
          apiKey: process.env.TWITTER_BEARER_TOKEN,
          additionalParams: {
            // OAuth 1.0a legacy support
            oAuth1ApiKey: process.env.TWITTER_API_KEY,
            oAuth1ApiSecret: process.env.TWITTER_API_SECRET,
            oAuth1AccessToken: process.env.TWITTER_ACCESS_TOKEN,
            oAuth1AccessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
            // OAuth 2.0 URLs
            authUrl: process.env.TWITTER_AUTH_URL || 'https://twitter.com/i/oauth2/authorize',
            tokenUrl: process.env.TWITTER_TOKEN_URL || 'https://api.twitter.com/2/oauth2/token',
            scopes: process.env.TWITTER_API_SCOPES?.split(',') || ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
            uploadUrl: process.env.TWITTER_UPLOAD_API_URL || 'https://upload.twitter.com/1.1',
            // Rate limiting tier
            tier: (process.env.TWITTER_API_TIER as TwitterTier) || 'basic'
          }
        };
        
      case PlatformType.LINKEDIN:
        return {
          clientId: process.env.LINKEDIN_CORE_CLIENT_ID || '',
          clientSecret: process.env.LINKEDIN_CORE_CLIENT_SECRET || '',
          redirectUri: `${process.env.NEXTAUTH_URL || ''}${process.env.LINKEDIN_CORE_CALLBACK_URL || ''}`,
          additionalParams: {
            communityClientId: process.env.LINKEDIN_COMMUNITY_CLIENT_ID,
            communityClientSecret: process.env.LINKEDIN_COMMUNITY_CLIENT_SECRET,
            communityRedirectUri: `${process.env.NEXTAUTH_URL || ''}${process.env.LINKEDIN_COMMUNITY_CALLBACK_URL || ''}`,
            liveClientId: process.env.LINKEDIN_LIVE_CLIENT_ID,
            liveClientSecret: process.env.LINKEDIN_LIVE_CLIENT_SECRET,
            liveRedirectUri: `${process.env.NEXTAUTH_URL || ''}${process.env.LINKEDIN_LIVE_CALLBACK_URL || ''}`
          }
        };
        
      case PlatformType.YOUTUBE:
        return {
          clientId: process.env.YOUTUBE_CLIENT_ID || '',
          clientSecret: process.env.YOUTUBE_CLIENT_SECRET || '',
          redirectUri: `${process.env.NEXTAUTH_URL || ''}${process.env.YOUTUBE_CALLBACK_URL || ''}`,
          apiKey: process.env.YOUTUBE_API_KEY
        };
        
      case PlatformType.TIKTOK:
        return {
          clientId: process.env.TIKTOK_CLIENT_KEY || '',
          clientSecret: process.env.TIKTOK_CLIENT_SECRET || '',
          redirectUri: `${process.env.NEXTAUTH_URL || ''}${process.env.TIKTOK_CALLBACK_URL || ''}`
        };
        
      case PlatformType.REDDIT:
        return {
          clientId: process.env.REDDIT_CLIENT_ID || '',
          clientSecret: process.env.REDDIT_CLIENT_SECRET || '',
          redirectUri: `${process.env.NEXTAUTH_URL || ''}${process.env.REDDIT_CALLBACK_URL || ''}`
        };
        
      case PlatformType.MASTODON:
        return {
          clientId: process.env.MASTODON_CLIENT_ID || '',
          clientSecret: process.env.MASTODON_CLIENT_SECRET || '',
          redirectUri: `${process.env.NEXTAUTH_URL || ''}${process.env.MASTODON_CALLBACK_URL || ''}`,
          baseUrl: process.env.MASTODON_SERVER_URL || 'https://mastodon.social'
        };
        
      case PlatformType.THREADS:
        // Threads uses the same API as Instagram
        return {
          clientId: process.env.INSTAGRAM_CLIENT_ID || '',
          clientSecret: process.env.INSTAGRAM_CLIENT_SECRET || '',
          redirectUri: `${process.env.NEXTAUTH_URL || ''}${process.env.INSTAGRAM_CALLBACK_URL || ''}`
        };
        
      default:
        throw new Error(`No default configuration available for platform: ${platformType}`);
    }
  }
}
