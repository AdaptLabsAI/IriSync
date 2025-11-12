# Irisync API Documentation (App Router)

## Authentication APIs

### POST /api/auth/login
- Authenticates a user
- Request: `{ email, password }`
- Response: `{ token, user }`

### POST /api/auth/register
- Registers a new user
- Request: `{ email, password, name }`
- Response: `{ token, user }`

### POST /api/auth/logout
- Logs out the current user
- Auth required

---

## Content APIs

### GET /api/content/posts
- List all posts for the authenticated user
- Auth required

### POST /api/content/posts
- Create a new post
- Auth required
- Request: `{ content, attachments, hashtags, ... }`

### PUT /api/content/posts/:id
- Update a post
- Auth required

### DELETE /api/content/posts/:id
- Delete a post
- Auth required

---

## Media APIs

### GET /api/content/media
- List all media items
- Auth required

### POST /api/content/media
- Upload a new media item
- Auth required
- Request: `multipart/form-data`

### POST /api/content/media/edit
- Edit a media item (e.g., crop, adjust)
- Auth required
- Request: `{ imageUrl, edits }`

---

## Admin APIs

### GET /api/admin/users
- List all users (admin only)
- Auth required, admin role

### POST /api/admin/users
- Create a new user (admin only)
- Auth required, admin role

---

## Settings APIs

### GET /api/settings/profile
- Get current user's profile
- Auth required

### PUT /api/settings/profile
- Update profile
- Auth required

### GET /api/settings/team
- List team members
- Auth required

---

## Notes
- All endpoints require authentication unless otherwise noted.
- Use Bearer token in Authorization header for API requests.
- For more details, see the code in `src/app/api/`. 

---

## Integration APIs

### GET /api/integrations
- List all available integrations
- Auth required
- Response: `{ integrations: [{ id, name, type, description, status }] }`

### GET /api/integrations/:id
- Get details of a specific integration
- Auth required
- Response: `{ id, name, type, description, status, authMethod, endpoints, webhooks, scopes }`

### GET /api/integrations/connected
- List all integrations connected to the user's account
- Auth required
- Response: `{ connections: [{ integrationId, status, connectedAt, lastSyncAt }] }`

### POST /api/integrations/connect/:id
- Connect a specific integration to the user's account
- Auth required
- Request: Varies by integration type
- Response: `{ status, authUrl }` (for OAuth flows) or `{ status, connectionId }` (for API key)

### DELETE /api/integrations/disconnect/:id
- Disconnect a specific integration from the user's account
- Auth required
- Response: `{ status }`

### GET /api/integrations/status/:id
- Check connection status for a specific integration
- Auth required
- Response: `{ status, lastSyncAt, error }`

### POST /api/integrations/sync/:id
- Manually trigger a sync for a specific integration
- Auth required
- Response: `{ status, jobId }`

---

## Integration Development

IriSync provides a structured way for developers to build integrations with our platform. Currently, this is limited to enterprise clients with custom integration needs.

### Integration Types

1. **Content Source Integrations**: Pull content from external platforms
2. **Content Destination Integrations**: Publish content to external platforms
3. **Analytics Integrations**: Sync analytics data
4. **Storage Integrations**: Connect to cloud storage providers
5. **Workflow Integrations**: Connect with project management and collaboration tools

### Authentication Flows

Integrations can use one of the following authentication methods:

1. **OAuth 2.0**: Standard flow for user authentication
2. **API Key**: For services that use API keys
3. **JWT**: For services that require JWT authentication
4. **Basic Auth**: For simple username/password services

### Creating a Custom Integration

Custom integrations must implement the following:

1. **Adapter Class**: A class that handles all platform-specific operations
2. **Authentication Handler**: Manages the authentication process
3. **Data Transformer**: Converts between IriSync and external platform formats
4. **Webhook Handlers**: For receiving real-time updates (if applicable)

Example adapter skeleton:

```typescript
import { PlatformAdapter, AuthConfig, ContentItem } from '@irisync/platform-sdk';

export class CustomPlatformAdapter implements PlatformAdapter {
  constructor(private config: AuthConfig) {}
  
  async authenticate(): Promise<boolean> {
    // Implementation
  }
  
  async getContent(options: any): Promise<ContentItem[]> {
    // Implementation
  }
  
  async publishContent(content: ContentItem): Promise<boolean> {
    // Implementation
  }
  
  async disconnectUser(): Promise<boolean> {
    // Implementation
  }
}
```

For detailed specifications and access to the SDK, please contact our enterprise sales team. 