import { PlatformProvider, PlatformProviderConfig, PlatformType, AuthState } from '../PlatformProvider';
import { FacebookProvider } from './FacebookProvider';
import { InstagramProvider } from './InstagramProvider';
import { LinkedInProvider } from './LinkedInProvider';
import { MastodonProvider } from './MastodonProvider';
import { RedditProvider } from './RedditProvider';
import { ThreadsProvider } from './ThreadsProvider';
import { TikTokProvider } from './TikTokProvider';
import { TwitterProvider } from './TwitterProvider';
import { YouTubeProvider } from './YouTubeProvider';

/**
 * Factory for creating platform-specific providers
 */
export class PlatformProviderFactory {
  private static providers: Map<string, PlatformProvider> = new Map();
  
  /**
   * Get the appropriate provider for the given platform type
   */
  static getProvider(
    platformType: PlatformType, 
    config: PlatformProviderConfig, 
    authState?: AuthState
  ): PlatformProvider {
    // Create a unique key for this provider instance
    const key = `${platformType}_${config.clientId}`;
    
    // Check if we already have an instance with the same auth state
    const existingProvider = this.providers.get(key);
    if (existingProvider && this.isSameAuthState((existingProvider as any).getAuthState?.() || {}, authState)) {
      return existingProvider;
    }
    
    // Create a new provider instance
    let provider: PlatformProvider;
    
    try {
      switch (platformType) {
        case PlatformType.FACEBOOK:
          provider = new FacebookProvider(config, authState);
          break;
        case PlatformType.INSTAGRAM:
          provider = new InstagramProvider(config, authState);
          break;
        case PlatformType.TWITTER:
          provider = new TwitterProvider(config, authState);
          break;
        case PlatformType.LINKEDIN:
          provider = new LinkedInProvider(config, authState);
          break;
        case PlatformType.YOUTUBE:
          provider = new YouTubeProvider(config, authState);
          break;
        case PlatformType.TIKTOK:
          provider = new TikTokProvider(config, authState);
          break;
        case PlatformType.REDDIT:
          provider = new RedditProvider(config, authState);
          break;
        case PlatformType.MASTODON:
          provider = new MastodonProvider(config, authState);
          break;
        case PlatformType.THREADS:
          provider = new ThreadsProvider(config, authState);
          break;
        default:
          console.error(`Unsupported platform type: ${platformType}`);
          throw new Error(`Unsupported platform type: ${platformType}`);
      }
    } catch (error) {
      console.error(`Error creating platform provider for ${platformType}:`, error);
      throw new Error(`Failed to create provider for platform: ${platformType}`);
    }
    
    // Store the provider for future use
    this.providers.set(key, provider);
    
    return provider;
  }
  
  /**
   * Compare two auth states to see if they are effectively the same
   */
  private static isSameAuthState(authState1?: AuthState, authState2?: AuthState): boolean {
    // If both are undefined/null or the exact same object, they're the same
    if (authState1 === authState2) {
      return true;
    }
    
    // If one is undefined and the other isn't, they're different
    if (!authState1 || !authState2) {
      return false;
    }
    
    // Compare the access token as the key indicator
    return authState1.accessToken === authState2.accessToken;
  }
  
  /**
   * Clear cached providers - useful for testing
   */
  static clearProviders(): void {
    this.providers.clear();
  }
} 