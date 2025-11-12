# IriSync System Integration & Data Flow

## Document Purpose
This document maps the complete system architecture, component interactions, and data flow patterns within IriSync. Understanding these relationships is **CRITICAL** to prevent duplication of work and ensure proper integration of new features.

---

## 1. High-Level System Architecture

### Core System Components
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend UI   │    │   API Gateway   │    │   AI Toolkit    │
│   (External)    │◄──►│   (Next.js)     │◄──►│   (Multi-LLM)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Auth System   │    │  Business Logic │    │   Data Layer    │
│   (Firebase)    │◄──►│   (Services)    │◄──►│  (Firestore)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Integrations  │    │   Notifications │    │   File Storage  │
│   (Platforms)   │◄──►│   (Email/Push)  │◄──►│   (Cloud)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## 2. Service Layer Dependencies

### Primary Service Hierarchy
```typescript
// Core Services (Singleton Pattern)
CRMService.getInstance()
├── CRMRepository
├── HubSpotAdapter
├── SalesforceAdapter
├── SyncEngine
└── RateLimiter

DashboardService.getInstance()
├── MetricsCalculator
├── PerformanceAnalyzer
├── DataAggregator
├── CacheManager
└── CRMService.getInstance() // Dependency injection

AIToolkitFactory
├── TokenService
├── TokenTracker
├── OpenAIProvider
├── AnthropicProvider
├── GoogleAIProvider
└── NotificationService.getInstance()

PlatformService
├── PlatformAdapterFactory
├── PlatformProviderFactory
├── TwitterAdapter/Provider
├── FacebookAdapter/Provider
└── [Other Platform Adapters/Providers]
```

### Service Interaction Patterns
```typescript
// Example: Content Creation Flow
User Request → API Endpoint → ContentService
                                    ↓
ContentService → AIToolkitFactory → TokenService (validate)
                                    ↓
TokenService → TokenRepository → Firestore (check balance)
                                    ↓
AIToolkitFactory → OpenAIProvider → External API
                                    ↓
ContentService → PlatformService → TwitterProvider → Twitter API
                                    ↓
ContentService → AnalyticsService → Firestore (track usage)
```

---

## 3. Data Flow Architecture

### Authentication Flow
```
1. User Login Request
   ├── Frontend → /api/auth/login
   ├── AuthService → Firebase Auth
   ├── Firebase → JWT Token Generation
   ├── UserService → Firestore (user profile)
   └── Response → JWT + User Data

2. Authenticated Request
   ├── Frontend → API Endpoint (with JWT)
   ├── Middleware → JWT Validation
   ├── Middleware → User Context Injection
   └── Service Layer → Business Logic
```

### Content Creation Flow
```
1. Content Generation Request
   ├── Frontend → /api/ai/generate
   ├── AIController → TokenService.validateTokens()
   ├── TokenService → Firestore (check balance)
   ├── AIToolkitFactory → Provider Selection
   ├── Provider → External AI API
   ├── TokenService → Firestore (deduct tokens)
   ├── ContentService → Firestore (save content)
   └── Response → Generated Content

2. Content Publishing Flow
   ├── Frontend → /api/content/publish
   ├── ContentService → PlatformService
   ├── PlatformService → Platform Provider
   ├── Provider → Platform API (Twitter/Facebook/etc)
   ├── AnalyticsService → Firestore (track metrics)
   └── Response → Publication Status
```

### CRM Integration Flow
```
1. CRM Connection Setup
   ├── Frontend → /api/crm/connect
   ├── CRMService → Platform Adapter
   ├── Adapter → OAuth Flow
   ├── CRMService → Firestore (store tokens)
   └── Response → Connection Status

2. Data Synchronization
   ├── Scheduler → CRMService.syncData()
   ├── CRMService → SyncEngine
   ├── SyncEngine → Platform Adapter
   ├── Adapter → External CRM API
   ├── SyncEngine → Firestore (store data)
   └── NotificationService → User Notification
```

### Token Usage Flow
```
1. AI Operation Request
   ├── Frontend → /api/ai/generate
   ├── AIController → TokenService.hasSufficientTokens()
   ├── TokenService → Calculate available tokens:
   │   ├── availableBaseTokens = max(0, baseTokens - used)
   │   ├── availablePurchasedTokens = purchasedTokens
   │   └── totalAvailable = availableBaseTokens + availablePurchasedTokens
   ├── TokenService → Validate sufficient tokens
   ├── AIToolkitFactory → Provider Selection & Execution
   ├── TokenService → Deduct from totalUsedTokens (base tokens consumed first)
   ├── TokenRepository → Log usage transaction
   └── Response → AI Generated Content

2. Token Purchase Flow
   ├── Frontend → /api/tokens/purchase
   ├── TokenPurchaseService → Validate package & payment
   ├── Stripe → Process payment
   ├── TokenPurchaseService → Add to purchasedTokens (carries over)
   ├── TokenRepository → Log purchase transaction
   └── Response → Updated token balance

3. Billing Cycle Refresh Flow
   ├── Scheduler → Daily check for due refreshes
   ├── TokenPurchaseService → Query nextRefreshDate <= now
   ├── For each user due for refresh:
   │   ├── Reset includedTokens to tier allocation
   │   ├── Keep purchasedTokens unchanged
   │   ├── Reset totalUsedTokens to 0
   │   └── Calculate next individual billing date
   └── NotificationService → Refresh confirmation
```

---

## 4. Database Schema Relationships

### Core Entity Relationships
```
Users (1:N) Organizations
Organizations (1:N) Teams
Teams (N:M) Users (with roles)
Users (1:N) PlatformConnections
Users (1:N) TokenTransactions
Organizations (1:N) CRMConnections
Teams (1:N) ContentPosts
ContentPosts (1:N) ScheduledPosts
Users (1:N) AnalyticsData
Organizations (1:N) DashboardWidgets
```

### Firestore Collection Structure
```typescript
// Primary Collections
/users/{userId}
  ├── profile: UserProfile
  ├── settings: UserSettings
  └── activities: UserActivity[]

/organizations/{orgId}
  ├── profile: OrganizationProfile
  ├── members: TeamMember[]
  ├── teams: Team[]
  ├── billing: BillingInfo
  └── usageQuota: {
      aiTokens: {
        limit: number,           // Base tokens from subscription tier
        used: number,            // Total tokens used this period
        purchased: number        // Additional purchased tokens
      }
    }

/token_balances/{userId}
  ├── userId: string
  ├── organizationId?: string
  ├── includedTokens: number      // Base tokens (resets on billing cycle)
  ├── purchasedTokens: number     // Additional tokens (carries over)
  ├── totalUsedTokens: number     // Combined usage counter
  ├── lastRefreshDate: Date
  ├── nextRefreshDate: Date       // Individual billing cycle date
  ├── billingCycleStartDate: Date
  └── subscriptionStartDate: Date

/token_purchases/{purchaseId}
  ├── userId: string
  ├── organizationId?: string
  ├── tokenAmount: number
  ├── price: number
  ├── currency: string
  ├── purchaseDate: Date
  ├── isProcessed: boolean
  └── paymentMethod: string

/token_transactions/{transactionId}
  ├── userId: string
  ├── type: TokenTransactionType
  ├── amount: number
  ├── taskType?: AITaskType
  ├── timestamp: Timestamp
  ├── metadata: TransactionMetadata
  └── organizationId?: string

/platform_connections/{connectionId}
  ├── userId: string
  ├── platform: PlatformType
  ├── tokens: EncryptedTokens
  └── metadata: ConnectionMetadata

/crm_connections/{connectionId}
  ├── organizationId: string
  ├── platform: CRMPlatform
  ├── credentials: EncryptedCredentials
  └── syncConfig: SyncConfiguration
```

---

## 5. API Integration Patterns

### External API Integration Strategy
```typescript
// Pattern: Adapter + Provider Architecture
interface ExternalServiceAdapter {
  authenticate(): Promise<AuthResult>;
  refreshTokens(): Promise<TokenResult>;
  validateConnection(): Promise<boolean>;
}

abstract class ExternalServiceProvider {
  protected adapter: ExternalServiceAdapter;
  protected rateLimiter: RateLimiter;
  protected cache: CacheManager;
  
  abstract performOperation(params: any): Promise<any>;
}

// Implementation Example
class TwitterProvider extends ExternalServiceProvider {
  async createPost(content: PostContent): Promise<PostResult> {
    // 1. Rate limiting check
    await this.rateLimiter.checkLimit('twitter_post');
    
    // 2. Authentication validation
    await this.adapter.validateConnection();
    
    // 3. API call with retry logic
    const result = await this.performOperation(content);
    
    // 4. Cache result if applicable
    await this.cache.set(`post_${result.id}`, result);
    
    return result;
  }
}
```

### AI Provider Integration
```typescript
// Multi-Provider Strategy
class AIProviderOrchestrator {
  private providers: Map<ProviderType, AIProvider> = new Map();
  
  async executeTask(task: AITask): Promise<AIResult> {
    // 1. Select optimal provider based on task type and tier
    const provider = this.selectProvider(task);
    
    // 2. Check token balance
    await this.tokenService.validateTokens(task.userId, 1);
    
    // 3. Execute with fallback strategy
    try {
      const result = await provider.execute(task);
      await this.tokenService.deductTokens(task.userId, 1);
      return result;
    } catch (error) {
      // Fallback to secondary provider
      const fallbackProvider = this.getFallbackProvider(task);
      return await fallbackProvider.execute(task);
    }
  }
}
```

---

## 6. Real-Time Data Synchronization

### Firestore Real-Time Listeners
```typescript
// Dashboard Real-Time Updates
class DashboardRealTimeService {
  private listeners: Map<string, () => void> = new Map();
  
  subscribeToMetrics(userId: string, callback: (data: MetricsData) => void) {
    const unsubscribe = onSnapshot(
      collection(firestore, 'analytics_data'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(100),
      (snapshot) => {
        const metrics = snapshot.docs.map(doc => doc.data());
        callback(this.aggregateMetrics(metrics));
      }
    );
    
    this.listeners.set(`metrics_${userId}`, unsubscribe);
  }
}

// Platform Connection Status
class PlatformStatusService {
  monitorConnections(organizationId: string) {
    return onSnapshot(
      collection(firestore, 'platform_connections'),
      where('organizationId', '==', organizationId),
      (snapshot) => {
        snapshot.docChanges().forEach(change => {
          if (change.type === 'modified') {
            this.handleConnectionStatusChange(change.doc.data());
          }
        });
      }
    );
  }
}
```

---

## 7. Caching Strategy

### Multi-Layer Caching Architecture
```typescript
// Cache Hierarchy
interface CacheLayer {
  get(key: string): Promise<any>;
  set(key: string, value: any, ttl?: number): Promise<void>;
  invalidate(pattern: string): Promise<void>;
}

class CacheManager {
  private layers: CacheLayer[] = [
    new MemoryCache(),     // L1: In-memory (fastest)
    new RedisCache(),      // L2: Redis (shared)
    new FirestoreCache()   // L3: Firestore (persistent)
  ];
  
  async get(key: string): Promise<any> {
    for (const layer of this.layers) {
      const value = await layer.get(key);
      if (value) {
        // Populate higher layers
        await this.populateUpperLayers(key, value);
        return value;
      }
    }
    return null;
  }
}

// Cache Invalidation Patterns
class CacheInvalidationService {
  async invalidateUserData(userId: string) {
    await Promise.all([
      this.cache.invalidate(`user_${userId}_*`),
      this.cache.invalidate(`tokens_${userId}_*`),
      this.cache.invalidate(`analytics_${userId}_*`)
    ]);
  }
  
  async invalidateOrganizationData(orgId: string) {
    await Promise.all([
      this.cache.invalidate(`org_${orgId}_*`),
      this.cache.invalidate(`teams_${orgId}_*`),
      this.cache.invalidate(`crm_${orgId}_*`)
    ]);
  }
}
```

---

## 8. Event-Driven Architecture

### Event System Design
```typescript
// Event Types
enum SystemEvent {
  USER_REGISTERED = 'user_registered',
  PLATFORM_CONNECTED = 'platform_connected',
  CONTENT_PUBLISHED = 'content_published',
  TOKEN_DEPLETED = 'token_depleted',
  CRM_SYNC_COMPLETED = 'crm_sync_completed',
  ANALYTICS_UPDATED = 'analytics_updated'
}

// Event Bus
class EventBus {
  private handlers: Map<SystemEvent, Function[]> = new Map();
  
  subscribe(event: SystemEvent, handler: Function) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)!.push(handler);
  }
  
  async emit(event: SystemEvent, data: any) {
    const handlers = this.handlers.get(event) || [];
    await Promise.all(handlers.map(handler => handler(data)));
  }
}

// Event Handlers
class NotificationEventHandler {
  async handleTokenDepletion(data: { userId: string, remainingTokens: number }) {
    await this.notificationService.sendTokenWarning(data.userId);
    await this.analyticsService.trackEvent('token_warning', data);
  }
  
  async handleContentPublished(data: { userId: string, postId: string, platform: string }) {
    await this.analyticsService.trackEngagement(data);
    await this.crmService.updateLeadActivity(data.userId, 'content_published');
  }
}
```

---

## 9. Error Handling & Recovery

### Error Propagation Chain
```typescript
// Error Hierarchy
class SystemError extends Error {
  constructor(
    message: string,
    public code: string,
    public severity: 'low' | 'medium' | 'high' | 'critical',
    public context?: any
  ) {
    super(message);
  }
}

// Error Recovery Strategies
class ErrorRecoveryService {
  async handleAPIFailure(error: APIError, context: RequestContext) {
    switch (error.type) {
      case 'RATE_LIMIT':
        return await this.handleRateLimit(error, context);
      case 'AUTH_EXPIRED':
        return await this.handleAuthRefresh(error, context);
      case 'SERVICE_UNAVAILABLE':
        return await this.handleServiceFailover(error, context);
      default:
        throw error;
    }
  }
  
  private async handleRateLimit(error: APIError, context: RequestContext) {
    // Implement exponential backoff
    const delay = Math.min(1000 * Math.pow(2, context.retryCount), 30000);
    await new Promise(resolve => setTimeout(resolve, delay));
    return await this.retryRequest(context);
  }
}
```

---

## 10. Security & Data Protection

### Data Encryption Flow
```typescript
// Encryption Service
class EncryptionService {
  async encryptSensitiveData(data: any, context: string): Promise<string> {
    const key = await this.getEncryptionKey(context);
    return await this.encrypt(JSON.stringify(data), key);
  }
  
  async decryptSensitiveData(encryptedData: string, context: string): Promise<any> {
    const key = await this.getEncryptionKey(context);
    const decrypted = await this.decrypt(encryptedData, key);
    return JSON.parse(decrypted);
  }
}

// Token Storage Security
class SecureTokenStorage {
  async storeTokens(userId: string, platform: string, tokens: any) {
    const encrypted = await this.encryptionService.encryptSensitiveData(
      tokens, 
      `platform_${platform}_${userId}`
    );
    
    await this.firestore.collection('platform_connections').doc().set({
      userId,
      platform,
      encryptedTokens: encrypted,
      createdAt: serverTimestamp(),
      lastUsed: serverTimestamp()
    });
  }
}
```

---

## 11. Performance Optimization Patterns

### Database Query Optimization
```typescript
// Efficient Query Patterns
class OptimizedQueryService {
  // Use composite indexes for complex queries
  async getUserAnalytics(userId: string, dateRange: DateRange) {
    return await getDocs(query(
      collection(firestore, 'analytics_data'),
      where('userId', '==', userId),
      where('timestamp', '>=', dateRange.start),
      where('timestamp', '<=', dateRange.end),
      orderBy('timestamp', 'desc'),
      limit(1000)
    ));
  }
  
  // Batch operations for efficiency
  async batchUpdateMetrics(updates: MetricUpdate[]) {
    const batch = writeBatch(firestore);
    
    updates.forEach(update => {
      const docRef = doc(firestore, 'analytics_data', update.id);
      batch.update(docRef, update.data);
    });
    
    await batch.commit();
  }
}
```

### Connection Pooling & Rate Limiting
```typescript
// API Connection Management
class ConnectionManager {
  private pools: Map<string, ConnectionPool> = new Map();
  
  async getConnection(service: string): Promise<Connection> {
    if (!this.pools.has(service)) {
      this.pools.set(service, new ConnectionPool({
        maxConnections: 10,
        idleTimeout: 30000,
        retryAttempts: 3
      }));
    }
    
    return await this.pools.get(service)!.acquire();
  }
}
```

---

## 12. Monitoring & Observability

### System Health Monitoring
```typescript
// Health Check Service
class HealthCheckService {
  async performHealthCheck(): Promise<SystemHealth> {
    const checks = await Promise.allSettled([
      this.checkFirestore(),
      this.checkExternalAPIs(),
      this.checkAIProviders(),
      this.checkCRMConnections()
    ]);
    
    return {
      status: this.aggregateStatus(checks),
      services: this.mapCheckResults(checks),
      timestamp: new Date()
    };
  }
}

// Performance Metrics
class PerformanceMonitor {
  async trackAPIPerformance(endpoint: string, duration: number, success: boolean) {
    await this.analyticsService.track('api_performance', {
      endpoint,
      duration,
      success,
      timestamp: new Date()
    });
  }
}
```

---

## 13. Critical Integration Points

### Data Consistency Checkpoints
1. **User Registration**: Firebase Auth → Firestore User Profile → Organization Assignment
2. **Token Usage**: Token Validation → AI Operation → Token Deduction → Usage Logging
3. **Content Publishing**: Content Creation → Platform API → Analytics Tracking → CRM Update
4. **CRM Sync**: External API → Data Transformation → Firestore Storage → Notification

### Failure Recovery Points
1. **AI Provider Failure**: Primary Provider → Fallback Provider → Error Logging
2. **Platform API Failure**: Retry Logic → Alternative Endpoint → Manual Intervention
3. **Database Failure**: Local Cache → Read Replica → Service Degradation Mode
4. **Authentication Failure**: Token Refresh → Re-authentication → Session Recovery

---

## 14. Development Guidelines

### Service Integration Rules
1. **Always use dependency injection** for service dependencies
2. **Implement circuit breaker pattern** for external API calls
3. **Use event-driven communication** between loosely coupled services
4. **Implement proper error boundaries** with graceful degradation
5. **Cache aggressively** but invalidate intelligently
6. **Monitor everything** with proper logging and metrics

### Anti-Patterns to Avoid
1. **Direct database access** from UI components
2. **Synchronous calls** to external APIs without timeout
3. **Shared mutable state** between services
4. **Hardcoded configuration** values
5. **Missing error handling** in async operations
6. **Circular dependencies** between services

---

**CRITICAL**: Understanding these integration patterns is essential for maintaining system integrity and preventing duplicate implementations. All new features must follow these established patterns and data flows. 