# IriSync API Contract for UI Team

## Overview

This document outlines the API contract between the backend services and the UI components for the IriSync platform. It serves as the source of truth for all data exchange between the frontend and backend systems.

## Authentication

All API calls except for authentication endpoints require a valid JWT token to be included in the Authorization header.

```
Authorization: Bearer <token>
```

### Authentication Endpoints

#### Login

```
POST /api/auth/login
```

Request:
```json
{
  "email": "user@example.com",
  "password": "your-secure-password"
}
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600,
  "user": {
    "id": "user123",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "creator",
    "subscriptionTier": "creator",
    "organizationId": "org123",
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
}
```

#### Refresh Token

```
POST /api/auth/refresh
```

Request:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600
}
```

## User Endpoints

### Get Current User

```
GET /api/users
```

Response:
```json
{
  "id": "user123",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "creator",
  "subscriptionTier": "creator",
  "organizationId": "org123",
  "profileImageUrl": "https://example.com/profile.jpg",
  "createdAt": "2023-01-01T00:00:00.000Z",
  "updatedAt": "2023-01-01T00:00:00.000Z"
}
```

## Organization Endpoints

### Get User Organizations

```
GET /api/organizations
```

Response:
```json
[
  {
    "id": "org123",
    "name": "My Organization",
    "description": "My organization description",
    "ownerId": "user123",
    "subscriptionTier": "creator",
    "seats": 1,
    "logoUrl": "https://example.com/logo.png",
    "website": "https://example.com",
    "industry": "Technology",
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
]
```

## Social Accounts Endpoints

### Get Social Accounts

```
GET /api/social-accounts
```

Response:
```json
[
  {
    "id": "account123",
    "userId": "user123",
    "organizationId": "org123",
    "platform": "instagram",
    "accountId": "insta123",
    "accountName": "My Instagram",
    "username": "myinstagram",
    "profileUrl": "https://instagram.com/myinstagram",
    "profileImageUrl": "https://example.com/profile.jpg",
    "isConnected": true,
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
]
```

## Content Endpoints

### Get Content

```
GET /api/content?status=all&limit=20&offset=0
```

Parameters:
- `status`: Filter by status (`draft`, `scheduled`, `published`, `all`)
- `limit`: Number of items to return
- `offset`: Offset for pagination

Response:
```json
[
  {
    "id": "content123",
    "userId": "user123",
    "organizationId": "org123",
    "type": "post",
    "title": "My Post",
    "body": "This is my post content",
    "tags": ["tag1", "tag2"],
    "mediaIds": ["media123"],
    "status": "draft",
    "platforms": [
      {
        "platform": "instagram",
        "status": "draft",
        "scheduledFor": "2023-01-02T12:00:00.000Z"
      }
    ],
    "aiGenerated": false,
    "scheduledFor": "2023-01-02T12:00:00.000Z",
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
]
```

## Media Endpoints

### Get Media

```
GET /api/media?type=all&limit=20&offset=0
```

Parameters:
- `type`: Filter by type (`image`, `video`, `audio`, `all`)
- `limit`: Number of items to return
- `offset`: Offset for pagination

Response:
```json
[
  {
    "id": "media123",
    "userId": "user123",
    "organizationId": "org123",
    "type": "image",
    "title": "My Image",
    "description": "My image description",
    "url": "https://example.com/image.jpg",
    "thumbnailUrl": "https://example.com/thumbnail.jpg",
    "filename": "image.jpg",
    "filesize": 1024000,
    "contentType": "image/jpeg",
    "tags": ["tag1", "tag2"],
    "metadata": {
      "width": 1920,
      "height": 1080,
      "format": "jpeg"
    },
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
]
```

## Token Endpoints

### Get Token Balance

```
GET /api/tokens/balance
```

Response:
```json
{
  "userId": "user123",
  "currentBalance": 85,
  "totalUsed": 15,
  "lastResetDate": "2023-01-01T00:00:00.000Z",
  "nextResetDate": "2023-02-01T00:00:00.000Z"
}
```

### Purchase Tokens

```
POST /api/tokens/purchase
```

Request:
```json
{
  "packageSize": "small",
  "organizationId": "org123"
}
```

Response:
```json
{
  "purchaseId": "purchase123",
  "amount": 50,
  "price": 1000,
  "newBalance": 135
}
```

## AI Toolkit Endpoints

### Analyze Content

```
POST /api/toolkit/analyze
```

Request:
```json
{
  "content": "This is a great product and I highly recommend it!",
  "analysisType": "sentiment"
}
```

Response:
```json
{
  "results": {
    "sentiment": "positive",
    "sentimentScore": 0.92,
    "keywords": ["great", "product", "recommend"],
    "language": "en"
  },
  "tokensUsed": 1
}
```

### Generate Content

```
POST /api/toolkit/content/generate
```

Request:
```json
{
  "prompt": "A post about our new product launch",
  "platform": "instagram",
  "contentType": "post"
}
```

Response:
```json
{
  "content": "🚀 Exciting news! We've just launched our new product...",
  "suggestedHashtags": ["#newproduct", "#launch", "#exciting"],
  "tokensUsed": 1
}
```

### Generate Hashtags

```
POST /api/toolkit/content/hashtags
```

Request:
```json
{
  "content": "Our new skincare product with vitamin C",
  "platform": "instagram",
  "count": 10
}
```

Response:
```json
{
  "hashtags": ["#skincare", "#vitamins", "#beauty", "#selfcare", "#glow", "#natural", "#organic", "#skincareproducts", "#healthyskin", "#skincareroutine"],
  "categories": [
    {
      "category": "Beauty",
      "tags": ["#skincare", "#beauty", "#glow"]
    },
    {
      "category": "Health",
      "tags": ["#vitamins", "#selfcare", "#healthyskin"]
    }
  ],
  "tokensUsed": 1
}
```

## Analytics Endpoints

### Get Analytics

```
GET /api/analytics?contentId=content123&platform=instagram&startDate=2023-01-01&endDate=2023-01-31
```

Parameters:
- `contentId`: Filter by content ID
- `platform`: Filter by platform
- `startDate`: Start date for analytics period
- `endDate`: End date for analytics period

Response:
```json
[
  {
    "id": "analytics123",
    "contentId": "content123",
    "platform": "instagram",
    "metrics": {
      "views": 1250,
      "likes": 145,
      "shares": 32,
      "comments": 25,
      "engagementRate": 0.16
    },
    "periodStart": "2023-01-01T00:00:00.000Z",
    "periodEnd": "2023-01-31T00:00:00.000Z"
  }
]
```

## Error Responses

All API endpoints will return appropriate HTTP status codes and a standardized error response format:

```json
{
  "error": "error_code",
  "message": "Human-readable error message"
}
```

Common error codes:
- `unauthorized`: Authentication required or invalid
- `forbidden`: Insufficient permissions
- `not_found`: Requested resource not found
- `validation_error`: Request validation failed
- `internal_error`: Server error

## Rate Limiting

API requests are subject to rate limiting. The following headers will be included in all responses:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 59
X-RateLimit-Reset: 1609459200
```

When rate limit is exceeded, a 429 Too Many Requests response will be returned.

## Pagination

List endpoints support pagination using `limit` and `offset` parameters:

```
GET /api/content?limit=20&offset=40
```

## Caching

Some responses may be cached. The following header indicates cache status:

```
X-Cache: HIT
```

## Component Communication

The backend will communicate with UI components through the API endpoints outlined above. For real-time updates, WebSocket connections will be established using the Socket.IO protocol.

## Data Flow Diagram

```
┌────────────┐       ┌────────────┐       ┌────────────┐
│            │       │            │       │            │
│  UI Layer  │◄─────►│  API Layer │◄─────►│ Data Layer │
│            │       │            │       │            │
└────────────┘       └────────────┘       └────────────┘
```

## Asset Delivery

Static assets (images, videos, etc.) will be served from a CDN with the following URL pattern:

```
https://assets.irisync.io/<asset_path>
```

Public assets will be accessible without authentication. Private assets will require a signed URL.

## Sync Meetings

Regular sync meetings between UI and API teams will be held:
- Weekly status updates: Every Monday at 10:00 AM EST
- Technical discussions: As needed, scheduled at least 24 hours in advance
- Release planning: Last Friday of each sprint at 2:00 PM EST

## Contact Information

For technical questions regarding the API:
- Email: api-team@irisync.io
- Slack: #api-support channel

## Changelog

- **Version 1.0.0** (2023-02-01): Initial API contract 