# Platform Adapters Implementation Guide

This directory contains adapter implementations for various social media platforms integrated with Irisync. Each adapter implements the `PlatformAdapter` interface defined in `PlatformAdapter.ts`.

## Current Implementation Status

- ✅ **TikTokAdapter**: Fully implemented with OAuth 2.0 flow.
- ✅ **FacebookAdapter**: Fully implemented with OAuth 2.0 flow.
- ✅ **InstagramAdapter**: Fully implemented with OAuth 2.0 flow and content scheduling.
- ✅ **TwitterAdapter**: Fully implemented with OAuth 2.0 PKCE flow (Twitter API v2).
- ✅ **LinkedInAdapter**: Fully implemented with OAuth 2.0 flow and company pages.
- ✅ **ThreadsAdapter**: Fully implemented via Instagram's API (uses same authentication).
- ⚠️ **MastodonAdapter**: Partial implementation, needs server customization.
- ⚠️ **PinterestAdapter**: Partial implementation, needs production-level error handling.
- ⚠️ **YouTubeAdapter**: Partial implementation, needs more robust content publishing.
- ⚠️ **RedditAdapter**: Partial implementation, needs production-level error handling.

## Implementation Strategy

1. Each adapter must implement the `PlatformAdapter` interface, which defines the methods needed for platform integration:
   - OAuth authorization flows
   - Account information retrieval
   - Token validation and refreshing

2. Use the `FacebookAdapter.ts` and `TikTokAdapter.ts` as reference implementations.

3. Refer to `template/PlatformAdapterTemplate.ts` for a starting point when implementing new adapters.

## Advanced Features

### Facebook Page Selection

The FacebookAdapter implements a page selection system:

1. When a user connects their Facebook account, the `getAccountInfo()` method returns both personal account info and a list of pages the user manages
2. The UI can use the `additionalData.availablePages` array to let users select which page they want to connect
3. The page selection should be stored with the account information for later use
4. When posting content, the selected page's access token should be used instead of the personal account token

To implement page selection in your frontend:

```typescript
// Check if page selection is needed
if (accountInfo.additionalData?.requiresPageSelection) {
  // Show page selection UI
  const pages = accountInfo.additionalData.availablePages;
  // Let user select a page and save their preference
}
```

## Updating an Adapter to Production-Ready

To update an adapter to be production-ready, follow these steps:

1. Make sure the adapter implements all methods required by the `PlatformAdapter` interface:
   - `getAuthorizationUrl(state: string): Promise<string>`
   - `handleAuthorizationCode(code: string, oauthVerifier?: string): Promise<PlatformAuthData>`
   - `handleAuthorizationToken(oauthVerifier: string, oauthToken: string): Promise<PlatformAuthData>`
   - `handleAuthorizationCallback(code: string, state: string): Promise<PlatformAuthData>`
   - `getAccountInfo(accessToken: string): Promise<PlatformAccountInfo>`
   - `validateToken(token: string): Promise<boolean>`
   - `refreshToken(refreshToken: string): Promise<string>`

2. Update the constructor to load configuration from environment variables:
   ```typescript
   this.clientId = process.env.PLATFORM_NAME_CLIENT_ID || '';
   this.clientSecret = process.env.PLATFORM_NAME_CLIENT_SECRET || '';
   this.redirectUri = process.env.NEXT_PUBLIC_APP_URL + '/api/platforms/callback/social?platform=platform_name' || '';
   ```

3. Replace "in a real implementation" comments with actual implementation code.

4. Add proper error handling using try/catch blocks and logging.

5. Update the `PlatformAdapterFactory.ts` to use your newly implemented adapter.

## Testing Adapters

Test your adapter implementation with:

1. Unit tests that verify the adapter properly implements all interface methods.
2. Integration tests that verify the OAuth flow works correctly with mock responses.
3. E2E tests with actual platform APIs using test credentials.

## Environment Variables

Make sure to update `.env.example` with the required environment variables for each platform adapter:

```
# Facebook
FACEBOOK_CLIENT_ID=
FACEBOOK_CLIENT_SECRET=

# TikTok
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=

# Twitter
TWITTER_API_KEY=
TWITTER_API_SECRET=

# ... and so on for other platforms
```