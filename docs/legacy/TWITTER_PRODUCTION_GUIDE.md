# Twitter API Production Implementation Guide

## Overview
IriSync now implements a production-ready Twitter/X API integration with dual OAuth support, comprehensive fallback mechanisms, and proper token management.

## Environment Configuration

### 📁 Required Environment Variables (environment.md)

```bash
# Twitter/X API Configuration
TWITTER_API_URL=https://api.twitter.com/2
TWITTER_UPLOAD_API_URL=https://upload.twitter.com/1.1

# OAuth 2.0 Configuration (Primary - for API v2)
TWITTER_AUTH_URL=https://twitter.com/i/oauth2/authorize
TWITTER_TOKEN_URL=https://api.twitter.com/2/oauth2/token
TWITTER_API_SCOPES=tweet.read,tweet.write,users.read,offline.access

# OAuth 1.0a Configuration (Legacy - for v1.1 endpoints)
TWITTER_API_KEY=NDRuZ2FaTk5KX2kwelR1S0JVQTk6MTpjaQ
TWITTER_API_SECRET=xkzTLm5n83h-NXi4GMcKeHLkJyFeFzHgW48SfdV2g9WrsKhlN2
TWITTER_ACCESS_TOKEN=1926072052760383488-YK3hLkt6ejWIesApit5mzsL3blRaGQ
TWITTER_ACCESS_TOKEN_SECRET=CxbL8EoLfEwaPoSbSyCC0siSbT7E8eEcf7p3tT1AYzMYv

# App-Only Authentication (for read-only operations)
TWITTER_BEARER_TOKEN=AAAAAAAAAAAAAAAAAAAAAHrU1wEAAAAAwioxDCiMpw8oGms64zyoi%2F4mBGM%3DxiAVZfgE8lPoWBab4gCre4jfUevTcwQgdj8Q4LS0kTxHYsmOLF

# Callback URL
TWITTER_CALLBACK_URL=https://irisync.com/api/platforms/callback/social?platform=twitter

# API Tier for Rate Limiting (free, basic, pro, enterprise)
TWITTER_API_TIER=basic
```

## 🔐 Token Usage & Authentication Strategy

### Token Types & Use Cases

#### 1. **OAuth 2.0 Tokens** (Primary)
- **Use**: User authentication, posting, reading user data
- **Flow**: Authorization Code + PKCE
- **Expiry**: 2 hours (with refresh tokens)
- **Scopes**: `tweet.read`, `tweet.write`, `users.read`, `offline.access`

#### 2. **OAuth 1.0a Tokens** (Legacy/Fallback)
- **Use**: Media uploads, legacy endpoints, fallback authentication
- **Flow**: 3-legged OAuth
- **Expiry**: No expiration
- **Required for**: Media upload endpoints

#### 3. **Bearer Token** (App-Only)
- **Use**: Read-only operations, public data access
- **Flow**: Direct API access
- **Limitations**: Cannot post or access private data

#### 4. **Static Access Tokens** (Backup)
- **Use**: System-level operations when user auth fails
- **Security**: Pre-generated tokens for your app
- **Limitations**: Single user context

## 🚀 Production Features Implemented

### Dual OAuth Support
- **Primary**: OAuth 2.0 with PKCE for modern security
- **Fallback**: OAuth 1.0a for legacy compatibility
- **Auto-detection**: Switches based on available credentials

### Comprehensive Authentication Fallback
```typescript
// Authentication hierarchy:
1. User OAuth 2.0 tokens (if authenticated & not expired)
2. User OAuth 1.0a tokens (if authenticated)
3. Static OAuth 1.0a tokens (for system operations)
4. Bearer token (for read-only operations)
```

### Token Management
- **Auto-refresh**: OAuth 2.0 tokens refresh 5 minutes before expiry
- **Expiry checking**: Validates token validity before requests
- **Error handling**: Graceful fallback on authentication failures

### Rate Limiting Integration
- Uses existing `withRateLimit` wrapper
- Platform-specific rate limiting per endpoint
- Request throttling to prevent API quota exhaustion

### Logging & Monitoring
- Comprehensive error logging
- Authentication method tracking
- Request/response monitoring
- Token usage analytics

## 📡 API Capabilities

### Supported Operations
✅ **User Authentication** (OAuth 2.0 + 1.0a)
✅ **Account Details** (Profile info, metrics)
✅ **Create Posts** (Text, images, videos)
✅ **Media Upload** (Images, videos with OAuth 1.0a)
✅ **Delete Posts**
✅ **Get User Posts**
✅ **Analytics/Metrics**
✅ **Connection Testing**
✅ **Token Revocation**

### Platform-Specific Features
- **Character Limit**: 280 characters
- **Media Support**: Up to 4 attachments (images/videos)
- **Thread Support**: Multi-tweet threads
- **Hashtag Support**: Up to 30 hashtags
- **Mention Support**: @username mentions
- **Poll Support**: Twitter polls
- **Location Support**: Geotagging

## 🛡️ Security Implementation

### PKCE (Proof Key for Code Exchange)
- SHA256 code challenge generation
- Secure code verifier storage
- Protection against authorization code interception

### Token Storage Security
- Encrypted token storage in Firebase
- Secure token transmission
- Automatic token cleanup on logout

### Error Handling
- No sensitive data in logs
- Graceful degradation on auth failures
- User-friendly error messages

## 🔧 Integration Points

### Referral System Integration
- Social sharing via Twitter
- Referral link posting
- Analytics tracking for shared content

### AI Content Generation
- Twitter-optimized content generation
- Character limit optimization
- Hashtag and mention integration

### Content Calendar
- Post scheduling (custom implementation)
- Multi-platform coordination
- Timezone support

## 📊 Monitoring & Analytics

### Request Tracking
```typescript
logger.info('TwitterProvider initialized', {
  hasOAuth2Credentials: boolean,
  hasOAuth1Credentials: boolean,
  hasBearerToken: boolean,
  hasStaticTokens: boolean,
  apiVersion: string
});
```

### Performance Metrics
- API response times
- Authentication success rates
- Media upload success rates
- Error rate monitoring

## 🚨 Error Handling & Fallbacks

### Authentication Errors
1. **OAuth 2.0 fails** → Try OAuth 1.0a
2. **User tokens invalid** → Use static tokens
3. **Write operations fail** → Fallback to read-only with bearer token

### Rate Limiting
- Automatic retry with exponential backoff
- Request queuing during high load
- Priority handling for critical operations

### Network Issues
- Connection timeout handling
- Retry mechanisms
- Graceful degradation

## 🧪 Testing Strategy

### Test Cases Covered
- ✅ OAuth 2.0 flow completion
- ✅ OAuth 1.0a fallback
- ✅ Token refresh mechanisms
- ✅ Media upload with multiple auth methods
- ✅ Rate limiting compliance
- ✅ Error handling scenarios

### Production Checklist
- [ ] All environment variables configured
- [ ] OAuth applications registered with Twitter
- [ ] Callback URLs whitelisted
- [ ] Rate limiting configured
- [ ] Error monitoring enabled
- [ ] Log levels appropriate for production

## 📞 Support & Troubleshooting

### Common Issues

#### "No valid authentication method available"
- Check all environment variables are set
- Verify OAuth applications are active
- Ensure callback URLs match exactly

#### Media upload failures
- Ensure OAuth 1.0a credentials are configured
- Check file size limits (5MB for images, 512MB for videos)
- Verify upload URL is accessible

#### Rate limiting errors
- Review rate limiting configuration
- Implement request queuing
- Consider premium API access

### Debug Mode
```typescript
// Enable debug logging
logger.setLevel('debug');
```

## 🔮 Future Enhancements

### Planned Features
- [ ] Twitter Spaces integration
- [ ] Advanced analytics dashboard
- [ ] Bulk operations support
- [ ] Real-time webhook support
- [ ] Premium API features

### Scalability Considerations
- Connection pooling for high-volume usage
- Distributed rate limiting
- Multi-region deployment support
- Advanced caching strategies

## 🚨 **NEW: Endpoint-Specific Rate Limiting**

### **Critical Rate Limits by Tier**

| Operation | Free Tier | Basic Tier | Pro Tier |
|-----------|-----------|------------|----------|
| **Create Post** | 17/day | 100/15min, 1667/day | 100/15min, 10000/day |
| **Delete Post** | 17/day | 50/15min, 17/day | 50/15min, 17/day |
| **Get User Info** | 25/day | 75/15min, 250/day | 75/15min, 250/day |
| **Get User Tweets** | 1/15min | 5/15min | 900/15min |
| **Media Upload** | 5/15min* | 50/15min* | 100/15min* |

*Estimated based on posting limits

### **Rate Limiting Implementation**

#### **Intelligent Request Management**
```typescript
// Automatic rate limiting with intelligent waiting
await twitterProvider.createPost(post); // Automatically handles rate limits
```

#### **Built-in Features**:
- **Pre-request validation**: Checks limits before making API calls
- **Automatic retry**: Waits for rate limit reset (if < 5 minutes)
- **Usage tracking**: Tracks both 15-minute and 24-hour windows
- **Tier awareness**: Adjusts limits based on your Twitter API plan

#### **Real-time Monitoring**
```bash
# Check current rate limit status
GET /api/debug/twitter-rate-limits

# Response includes:
{
  "tier": "basic",
  "summary": {
    "healthStatus": "healthy",
    "atRiskEndpoints": 0
  },
  "atRiskEndpoints": [], // Endpoints >75% usage
  "allEndpoints": [...] // Full usage details
}
```

### **Monitoring & Alerts**

#### **Health Status Levels**:
- 🟢 **Healthy**: All endpoints <75% usage
- 🟡 **Warning**: 1-2 endpoints >75% usage  
- 🔴 **Critical**: 3+ endpoints >75% usage

#### **Usage Tracking**:
- Per-endpoint usage percentages
- Time until rate limit resets
- Remaining requests per window
- Historical usage patterns

---

**Version**: 1.0.0  
**Last Updated**: Production Deployment  
**Status**: ✅ Production Ready 
