# Platform Integration Architecture

This module provides a clean separation of concerns for platform integrations, allowing us to maintain distinct responsibilities between authentication and content operations.

## Architecture Overview

The platform integration system is divided into two main components:

1. **Platform Adapters**: Handle authentication flows (OAuth) and account connections
2. **Platform Providers**: Handle content operations (posting, scheduling, analytics)

### Key Components

#### Platform Adapters

- Located in `src/lib/platforms/adapters/`
- Implement the `PlatformAdapter` interface
- Focus exclusively on authentication flows and account information
- Created and accessed via the `PlatformAdapterFactory`

#### Platform Providers

- Located in `src/lib/platforms/providers/` 
- Extend the abstract `PlatformProvider` class
- Handle content operations like posting, scheduling, and analytics
- Created and accessed via the `PlatformProviderFactory`

## Integration Flow

A typical platform integration flow works as follows:

1. **Authentication**: 
   - The application uses a `PlatformAdapter` to generate an OAuth authorization URL
   - The user is redirected to the platform's OAuth consent screen
   - The platform redirects back to our callback endpoint with an authentication code
   - The adapter exchanges this code for an access token

2. **Content Operations**:
   - With the authentication tokens, the application creates a `PlatformProvider` instance
   - The provider is used to perform actions like creating posts, scheduling content, and retrieving metrics

## Adding a New Platform Integration

To add support for a new platform:

1. Create a new adapter in `src/lib/platforms/adapters/[Platform]Adapter.ts` that implements `PlatformAdapter`
2. Create a new provider in `src/lib/platforms/providers/[Platform]Provider.ts` that extends `PlatformProvider`
3. Add the platform type to the `PlatformType` enum in `PlatformProvider.ts`
4. Register the adapter in `PlatformAdapterFactory.ts`
5. Register the provider in `factory.ts`

## Example: Threads Integration

The Threads integration demonstrates this separation of concerns:

- `ThreadsAdapter`: Handles OAuth authentication via Instagram's API
- `ThreadsProvider`: Implements content operations using the Threads API

This approach allows us to:
- Maintain a clean separation between authentication and content operations
- Share authentication code where platforms use the same underlying OAuth system
- Handle platform-specific differences in content posting and analytics

## Type Consistency

All OAuth flows are implemented as async methods, returning Promises, to maintain consistency across different platform implementations. 