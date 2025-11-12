// Export platform types
export { PlatformType } from './PlatformProvider';

// Export platform adapter interfaces
export { PlatformAdapter } from './adapters/PlatformAdapter';
export { PlatformAdapterFactory } from './adapters/PlatformAdapterFactory';

// Export platform provider interfaces and factory
export type { 
  PlatformProvider,
  PlatformProviderConfig,
  PlatformCapabilities,
  AuthState
} from './PlatformProvider';
export { PlatformProviderFactory } from './factory';

// Export platform-specific model types
export type { SocialAccount } from './models/account';
export type { 
  PlatformPost,
  PostAttachment,
  PostResponse,
  PostSchedule
} from './models/content';
export type { PlatformMetrics } from './models/metrics';

// Export model types used by adapters
export type { 
  PlatformAccountInfo,
  PlatformAuthData
} from './models';

// Export platform providers
export { ThreadsProvider } from './providers/ThreadsProvider';
export { FacebookProvider } from './providers/FacebookProvider';
export { InstagramProvider } from './providers/InstagramProvider';
export { LinkedInProvider } from './providers/LinkedInProvider';

// Export platform adapters
export { ThreadsAdapter } from './adapters/ThreadsAdapter';
export { FacebookAdapter } from './adapters/FacebookAdapter';
export { InstagramAdapter } from './adapters/InstagramAdapter';
export { TwitterAdapter } from './adapters/TwitterAdapter';
export { LinkedInAdapter } from './adapters/LinkedInAdapter';
export { TikTokAdapter } from './adapters/TikTokAdapter';
export { YouTubeAdapter } from './adapters/YouTubeAdapter';
export { RedditAdapter } from './adapters/RedditAdapter';

// Export OAuth utilities
export {
  generateOAuthState,
  generateCodeVerifier,
  generateCodeChallenge,
  generateOAuthUrl,
  encryptAuthState,
  decryptAuthState,
  isTokenExpired,
  generateEncryptionKey
} from './auth/oauth';

// Export token management utilities
export {
  storeTokens,
  getTokens,
  deleteTokens,
  ensureValidTokens,
  countConnectedAccounts,
  hasReachedAccountLimit
} from './auth/token-manager';

// Export rate limiting utilities
export {
  checkRateLimit,
  withRateLimit,
  resetRateLimit
} from './utils/rate-limiter';

// Export content formatting utilities
export {
  formatHashtags,
  formatMentions,
  enforceCharacterLimit,
  formatLinks,
  formatPostForPlatform
} from './utils/content-formatter';

// Export metrics collection utilities
export {
  storeMetrics,
  getMetrics,
  aggregateMetricsAcrossPlatforms,
  generateComparisonMetrics,
  calculateGrowthMetrics
} from './utils/metrics-collector';
