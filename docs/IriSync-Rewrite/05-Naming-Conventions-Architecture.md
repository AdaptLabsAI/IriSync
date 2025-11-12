# IriSync Naming Conventions & System Architecture

## Document Purpose
This document establishes the exact naming conventions, patterns, and architectural standards used throughout the IriSync codebase. **ZERO DEVIATION** from these patterns is permitted to ensure consistency and prevent duplication of work.

---

## 1. AI Token System Naming Conventions

### AI Task Types (Enum: `AITaskType`)
**Location**: `src/lib/ai/models/AITask.ts`

```typescript
export enum AITaskType {
  // Content Generation Tasks
  GENERATE_POST = 'generate_post',
  GENERATE_CAPTION = 'generate_caption', 
  GENERATE_HASHTAGS = 'generate_hashtags',
  IMPROVE_CONTENT = 'improve_content',
  
  // Content Analysis Tasks
  ANALYZE_SENTIMENT = 'analyze_sentiment',
  CATEGORIZE_CONTENT = 'categorize_content',
  PREDICT_ENGAGEMENT = 'predict_engagement',
  
  // Media Analysis Tasks
  GENERATE_ALT_TEXT = 'generate_alt_text',
  ANALYZE_IMAGE = 'analyze_image',
  MODERATE_CONTENT = 'moderate_content',
  
  // Schedule Optimization Tasks
  SUGGEST_POSTING_TIME = 'suggest_posting_time',
  OPTIMIZE_CONTENT_MIX = 'optimize_content_mix',
  
  // Response Assistance Tasks
  SUGGEST_REPLY = 'suggest_reply',
  SUMMARIZE_CONVERSATION = 'summarize_conversation',
  CATEGORIZE_MESSAGE = 'categorize_message',
  
  // Support and Chatbot Tasks
  CUSTOMER_SUPPORT = 'customer_support',
  CHATBOT = 'chatbot'
}
```

### Token Transaction Types (Enum: `TokenTransactionType`)
**Location**: `src/lib/tokens/models/token-transaction.ts`

```typescript
export enum TokenTransactionType {
  // Additions
  SUBSCRIPTION_ALLOCATION = 'subscription_allocation',
  MANUAL_ADDITION = 'manual_addition',
  PURCHASE = 'purchase',
  REFUND = 'refund',
  CREDIT = 'credit',
  PROMOTIONAL = 'promotional',
  
  // Deductions
  AI_USAGE = 'ai_usage',
  MANUAL_DEDUCTION = 'manual_deduction',
  EXPIRED = 'expired',
  REFUNDED = 'refunded'
}
```

### Token Balance Schema (Interface: `TokenBalance`)
**Location**: `src/lib/tokens/token-service.ts` and `src/lib/tokens/TokenPurchaseService.ts`

```typescript
// Primary Token Balance Interface (TokenService)
export interface TokenBalance {
  userId: string;
  organizationId?: string;
  // Base tokens from subscription tier (resets on billing cycle)
  baseTokens: number;
  // Additional purchased tokens (carries over indefinitely)
  purchasedTokens: number;
  // Total available tokens (baseTokens + purchasedTokens - used)
  available: number;
  // Tokens used in current period (against combined pool)
  used: number;
  // Total tokens allocated (baseTokens + purchasedTokens)
  total: number;
  // Monthly limit based on subscription tier (baseTokens only)
  limit: number;
  // Next reset date for base tokens (individual billing cycle)
  nextResetDate: Date;
  lastUpdated: Date;
  tier: SubscriptionTier;
}

// Individual Billing Cycle Interface (TokenPurchaseService)
export interface TokenBalance {
  userId: string;
  organizationId?: string;
  // Monthly tokens that reset based on subscription tier
  includedTokens: number;
  // Additional purchased tokens (carries over)
  purchasedTokens: number;
  // Total tokens used this billing period
  totalUsedTokens: number;
  // When tokens were last refreshed
  lastRefreshDate: Date;
  // When next refresh should occur (user's billing cycle)
  nextRefreshDate: Date;
  // When user's billing cycle started
  billingCycleStartDate: Date;
  // When user first subscribed (for calculating cycles)
  subscriptionStartDate: Date;
}
```

### Token Consumption Order (CRITICAL BUSINESS LOGIC)
**Implementation**: Base tokens are consumed FIRST, then purchased tokens

```typescript
// Token Usage Logic Pattern
const availableIncludedTokens = Math.max(0, balance.includedTokens - balance.totalUsedTokens);
const availablePurchasedTokens = balance.purchasedTokens;
const totalAvailableTokens = availableIncludedTokens + availablePurchasedTokens;

// Usage deducted from totalUsedTokens (affects base tokens first)
// When totalUsedTokens > includedTokens, purchased tokens are consumed
```

### Token Refresh Cycle (CRITICAL BUSINESS LOGIC)
**Implementation**: Individual billing cycles, NOT universal monthly refresh

```typescript
// Refresh Logic Pattern
await updateDoc(balanceDoc.ref, {
  includedTokens: newIncludedTokens,    // Reset to tier allocation
  // purchasedTokens: UNCHANGED         // Carries over indefinitely
  totalUsedTokens: 0,                  // Reset usage counter
  lastRefreshDate: new Date(),
  nextRefreshDate: calculateNextBillingDate(subscriptionStartDate),
  billingCycleStartDate: new Date()
});
```

### Subscription Tiers (Enum: `SubscriptionTier`)
**Location**: `src/lib/ai/models/tokens.ts`

```typescript
export enum SubscriptionTier {
  CREATOR = 'creator',
  INFLUENCER = 'influencer', 
  ENTERPRISE = 'enterprise'
}
```

### Automatic AI Services (Enum: `AutomaticAIService`)
**Location**: `src/lib/ai/toolkit/ai-toolkit-factory.ts`

```typescript
export enum AutomaticAIService {
  TOKEN_VALIDATION = 'token_validation',
  USAGE_TRACKING = 'usage_tracking',
  ERROR_RECOVERY = 'error_recovery',
  CACHE_MANAGEMENT = 'cache_management',
  SYSTEM_ANALYSIS = 'system_analysis'
}
```

---

## 2. Organization & Team Role Naming Conventions

### Organization Roles (Enum: `OrganizationRole`)
**Location**: `src/lib/user/types.ts`

```typescript
export enum OrganizationRole {
  OWNER = 'owner',              // Owns the organization, full access
  ORG_ADMIN = 'org_admin',      // Organization admin, cross-team access
  MEMBER = 'member',            // Team member within organization (gets team roles)
  VIEWER = 'viewer'             // Non-team member for executives (analytics only)
}
```

### Team Roles (Enum: `TeamRole`)
**Location**: `src/lib/user/types.ts`

```typescript
export enum TeamRole {
  TEAM_ADMIN = 'team_admin',    // Team leadership within specific team
  EDITOR = 'editor',            // Senior team member capabilities
  CONTRIBUTOR = 'contributor',   // Standard team member
  OBSERVER = 'observer'         // Read-only access to team
}
```

### Permission Categories (Enum: `PermissionCategory`)
**Location**: `src/lib/team/users/team-structure.ts`

```typescript
export enum PermissionCategory {
  TEAM = 'team',
  CONTENT = 'content',
  PLATFORMS = 'platforms',
  ANALYTICS = 'analytics',
  SETTINGS = 'settings',
  CRM = 'crm',
  MESSAGING = 'messaging',
  ADVANCED = 'advanced'
}
```

### Permission Scopes (Enum: `PermissionScope`)
**Location**: `src/lib/user/types.ts`

```typescript
export enum PermissionScope {
  GLOBAL = 'global',
  ORGANIZATION = 'organization',
  TEAM = 'team',
  PROJECT = 'project',
  CONTENT = 'content',
  PLATFORM = 'platform'
}
```

### Organization Structure (Interface: `Organization`)
**Location**: `src/lib/models/Organization.ts`

```typescript
export interface Organization {
  id: string;
  name: string;
  displayName: string;
  isPersonalOrg: boolean;
  ownerUserId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  status: OrganizationStatus;
  
  // Team membership structure
  members: Record<string, OrganizationMember>;
  
  // Billing and subscription information
  billing: BillingInfo;
  seats: number;                    // Total purchased seats
  usedSeats?: number;              // Currently used seats
  
  // Platform connections
  platformConnections: Record<string, PlatformConnection>;
  
  // Usage quotas and limits
  usageQuota: UsageQuota;
  
  // Organization settings
  settings: OrganizationSettings;
  
  // Optional fields
  description?: string;
  logoUrl?: string;
  website?: string;
  industry?: string;
  size?: OrganizationSize;
}

export interface BillingInfo {
  customerId?: string;              // Stripe customer ID
  subscriptionId?: string;          // Stripe subscription ID
  subscriptionTier: SubscriptionTier;
  subscriptionStatus: 'active' | 'past_due' | 'canceled' | 'trialing' | 'incomplete';
  currentPeriodStart?: Timestamp;
  currentPeriodEnd?: Timestamp;
  cancellationRequested?: boolean;
  cancellationDate?: Timestamp;
  paymentMethod?: PaymentMethodInfo;
  billingEmail?: string;
  billingAddress?: BillingAddress;
  taxId?: string;
}

export interface UsageQuota {
  aiTokens: {
    limit: number;                  // Base tokens from subscription tier
    used: number;                   // Tokens used this period
    purchased?: number;             // Additional purchased tokens
    resetDate: Timestamp;
  };
  storage: {
    limitMB: number;
    usedMB: number;
  };
  socialAccounts: {
    limit: number;
    used: number;
  };
  teamMembers: {
    limit: number;                  // Based on subscription tier
    used: number;                   // Currently active members
  };
}
```

### Subscription Tier Seat Limits (CRITICAL BUSINESS LOGIC)
**Implementation**: Tier-based seat allocation and pricing

```typescript
// Seat Limits by Tier
export const TIER_SEAT_LIMITS = {
  [SubscriptionTier.CREATOR]: {
    included: 1,                    // Base seats included
    maximum: 3,                     // Maximum allowed seats
    additionalCost: 80              // $80/month per additional seat (same as base price)
  },
  [SubscriptionTier.INFLUENCER]: {
    included: 1,                    // Base seats included
    maximum: 10,                    // Maximum allowed seats
    additionalCost: 200             // $200/month per additional seat (same as base price)
  },
  [SubscriptionTier.ENTERPRISE]: {
    included: 5,                    // Base seats included (minimum)
    maximum: Infinity,              // Unlimited seats
    additionalCost: 150             // $150/month per additional seat beyond 5
  }
};

// Token Allocation by Tier and Seats
export const TOKEN_ALLOCATION_LOGIC = {
  [SubscriptionTier.CREATOR]: (seats: number) => Math.min(seats, 3) * 100,
  [SubscriptionTier.INFLUENCER]: (seats: number) => Math.min(seats, 10) * 500,
  [SubscriptionTier.ENTERPRISE]: (seats: number) => {
    const baseTokens = 5000; // For minimum 5 seats
    const additionalSeats = Math.max(0, seats - 5);
    return baseTokens + (additionalSeats * 500);
  }
};
```

---

## 3. Platform Integration Naming Conventions

### Platform Types (Enum: `PlatformType`)
**Standard naming pattern**: lowercase with underscores

```typescript
export enum PlatformType {
  FACEBOOK = 'facebook',
  INSTAGRAM = 'instagram',
  TWITTER = 'twitter',
  LINKEDIN = 'linkedin',
  TIKTOK = 'tiktok',
  YOUTUBE = 'youtube',
  REDDIT = 'reddit',
  MASTODON = 'mastodon',
  THREADS = 'threads'
}
```

### Platform Adapter Naming Pattern
**Location**: `src/lib/platforms/adapters/`
- **Class Name**: `{Platform}Adapter` (e.g., `TwitterAdapter`, `FacebookAdapter`)
- **File Name**: `{Platform}Adapter.ts`
- **Interface**: Implements `PlatformAdapter`

### Platform Provider Naming Pattern
**Location**: `src/lib/platforms/providers/`
- **Class Name**: `{Platform}Provider` (e.g., `TwitterProvider`, `FacebookProvider`)
- **File Name**: `{Platform}Provider.ts`
- **Base Class**: Extends `PlatformProvider`

### CRM Platform Types (Enum: `CRMPlatform`)
**Location**: `src/lib/crm/types.ts`

```typescript
export enum CRMPlatform {
  HUBSPOT = 'hubspot',
  SALESFORCE = 'salesforce',
  ZOHO = 'zoho',
  PIPEDRIVE = 'pipedrive',
  DYNAMICS = 'dynamics',
  SUGARCRM = 'sugarcrm'
}
```

---

## 4. Interface & Type Naming Conventions

### Interface Naming Patterns
1. **Data Interfaces**: `{Entity}Data` (e.g., `UserData`, `TeamData`)
2. **Configuration Interfaces**: `{Entity}Config` (e.g., `AIToolkitConfig`, `DashboardConfig`)
3. **Response Interfaces**: `{Entity}Response` (e.g., `PostResponse`, `CRMApiResponse`)
4. **Request Interfaces**: `{Entity}Request` (e.g., `TokenRequest`, `ValidationRequest`)
5. **Result Interfaces**: `{Entity}Result` (e.g., `ValidationResult`, `SyncResult`)
6. **Options Interfaces**: `{Entity}Options` (e.g., `ToolkitRequestOptions`, `RoleSearchOptions`)

### Service Class Naming Patterns
1. **Main Services**: `{Domain}Service` (e.g., `CRMService`, `DashboardService`)
2. **Managers**: `{Domain}Manager` (e.g., `TeamManager`, `RoleManager`)
3. **Factories**: `{Domain}Factory` (e.g., `AIToolkitFactory`, `PlatformAdapterFactory`)
4. **Adapters**: `{Platform}Adapter` (e.g., `HubSpotAdapter`, `SalesforceAdapter`)
5. **Providers**: `{Platform}Provider` (e.g., `OpenAIProvider`, `TwitterProvider`)
6. **Utils**: `{Domain}Utils` (e.g., `UserUtils`, `TeamUtils`)

### Error Naming Patterns
1. **Error Classes**: `{Domain}Error` (e.g., `CRMError`, `DashboardError`)
2. **Error Types**: `{Domain}ErrorType` (e.g., `CRMErrorType`, `UserErrorType`)

---

## 5. File & Directory Naming Conventions

### Directory Structure Patterns
```
src/lib/{domain}/
├── models/           # Data models and interfaces
├── adapters/         # External service adapters
├── providers/        # Service providers
├── utils/           # Utility functions
├── types.ts         # Domain-specific types
└── {Domain}Service.ts # Main service class
```

### File Naming Patterns
1. **Services**: `{Domain}Service.ts`
2. **Models**: `{Entity}.ts` (e.g., `User.ts`, `Team.ts`)
3. **Types**: `types.ts` or `{domain}-types.ts`
4. **Utils**: `{domain}-utils.ts` or `utils.ts`
5. **Constants**: `constants.ts` or `{domain}-constants.ts`

---

## 6. Database Collection Naming Conventions

### Firestore Collection Names
**Pattern**: lowercase with underscores

```typescript
// User & Organization Collections
'users'
'organizations'
'teams'
'team_invites'
'user_activities'

// Content & Platform Collections
'posts'
'content_drafts'
'media_files'
'platform_connections'
'scheduled_posts'

// AI & Token Collections
'ai_tokens'
'token_transactions'
'ai_usage_logs'

// CRM Collections
'crm_connections'
'crm_contacts'
'crm_deals'
'crm_leads'

// Analytics Collections
'analytics_data'
'dashboard_widgets'
'performance_metrics'

// System Collections
'system_services'
'system_incidents'
'audit_logs'
```

### Document ID Patterns
1. **User-generated**: Use Firestore auto-generated IDs
2. **System-generated**: Use UUID v4 format
3. **Composite keys**: `{entityType}_{id}` (e.g., `user_123`, `team_456`)

---

## 7. API Endpoint Naming Conventions

### REST API Patterns
```
/api/{domain}/{action}
/api/{domain}/{id}
/api/{domain}/{id}/{subdomain}
```

### Examples
```
// Authentication
POST /api/auth/login
POST /api/auth/register
POST /api/auth/refresh

// Users & Teams
GET /api/users/{id}
POST /api/teams
PUT /api/teams/{id}/members

// AI Toolkit
POST /api/ai/generate
POST /api/ai/analyze
GET /api/ai/usage

// Platforms
GET /api/platforms/connections
POST /api/platforms/connect
DELETE /api/platforms/{id}/disconnect

// CRM
GET /api/crm/connections
POST /api/crm/sync
GET /api/crm/contacts
```

---

## 8. Environment Variable Naming Conventions

### Pattern: `{SERVICE}_{RESOURCE}_{TYPE}`

```bash
# Firebase
FIREBASE_PROJECT_ID
FIREBASE_PRIVATE_KEY
FIREBASE_CLIENT_EMAIL

# AI Providers
OPENAI_API_KEY
ANTHROPIC_API_KEY
GOOGLE_AI_API_KEY

# Platform APIs
TWITTER_CLIENT_ID
TWITTER_CLIENT_SECRET
FACEBOOK_APP_ID
FACEBOOK_APP_SECRET

# CRM Platforms
HUBSPOT_CLIENT_ID
SALESFORCE_CLIENT_ID
ZOHO_CLIENT_ID

# Database & Storage
DATABASE_URL
STORAGE_BUCKET
REDIS_URL

# Application
NEXT_PUBLIC_APP_URL
JWT_SECRET
ENCRYPTION_KEY
```

---

## 9. Component Architecture Patterns

### Service Layer Architecture
```typescript
// 1. Interface Definition
export interface {Domain}Service {
  // Core operations
}

// 2. Implementation Class
export class {Domain}ServiceImpl implements {Domain}Service {
  private static instance: {Domain}ServiceImpl;
  
  private constructor() {
    // Initialize dependencies
  }
  
  public static getInstance(): {Domain}ServiceImpl {
    if (!this.instance) {
      this.instance = new {Domain}ServiceImpl();
    }
    return this.instance;
  }
}

// 3. Factory Pattern (when needed)
export class {Domain}Factory {
  static create{Entity}(config: {Entity}Config): {Entity} {
    // Factory logic
  }
}
```

### Repository Pattern
```typescript
export class {Entity}Repository {
  private collection: string = '{entities}';
  
  async create(data: {Entity}Data): Promise<{Entity}> {
    // Implementation
  }
  
  async findById(id: string): Promise<{Entity} | null> {
    // Implementation
  }
  
  async update(id: string, data: Partial<{Entity}Data>): Promise<{Entity}> {
    // Implementation
  }
  
  async delete(id: string): Promise<boolean> {
    // Implementation
  }
}
```

---

## 10. System Integration Patterns

### Service Dependencies
```typescript
// Main Service Class
export class {Domain}Service {
  private repository: {Domain}Repository;
  private validator: {Domain}Validator;
  private notificationService: NotificationService;
  private logger: Logger;
  
  constructor() {
    this.repository = new {Domain}Repository();
    this.validator = new {Domain}Validator();
    this.notificationService = NotificationService.getInstance();
    this.logger = logger;
  }
}
```

### Error Handling Pattern
```typescript
export class {Domain}Error extends Error {
  constructor(
    message: string,
    public type: {Domain}ErrorType,
    public platform?: PlatformType,
    public statusCode?: number,
    public originalError?: any
  ) {
    super(message);
    this.name = '{Domain}Error';
  }
}
```

---

## 11. Testing Naming Conventions

### Test File Patterns
```
src/__tests__/
├── unit/
│   └── {domain}/
│       └── {Service}.test.ts
├── integration/
│   └── {domain}/
│       └── {Service}.integration.test.ts
└── e2e/
    └── {feature}/
        └── {workflow}.e2e.test.ts
```

### Test Naming Patterns
```typescript
describe('{ServiceName}', () => {
  describe('{methodName}', () => {
    it('should {expected behavior} when {condition}', () => {
      // Test implementation
    });
    
    it('should throw {ErrorType} when {error condition}', () => {
      // Error test implementation
    });
  });
});
```

---

## 12. Compliance Requirements

### Mandatory Patterns
1. **ALL** enum values MUST use SCREAMING_SNAKE_CASE
2. **ALL** interface names MUST use PascalCase with descriptive suffixes
3. **ALL** service classes MUST implement singleton pattern where appropriate
4. **ALL** error classes MUST extend base Error class with typed error information
5. **ALL** API endpoints MUST follow RESTful conventions
6. **ALL** database collections MUST use lowercase with underscores
7. **ALL** environment variables MUST follow SERVICE_RESOURCE_TYPE pattern

### Forbidden Patterns
1. **NEVER** use camelCase for enum values
2. **NEVER** create duplicate service instances without singleton pattern
3. **NEVER** use generic Error class - always use typed domain errors
4. **NEVER** deviate from established file naming conventions
5. **NEVER** create new naming patterns without updating this document

---

## 13. Architecture Decision Records (ADRs)

### ADR-001: Dual Role Architecture
- **Organization Roles**: Seat-based, organization-wide access
- **Team Roles**: Feature-based, team-specific permissions
- **Rationale**: Separates billing (org roles) from functionality (team roles)

### ADR-002: Token-Based AI Usage
- **All AI operations cost exactly 1 token**
- **No double charging for composite operations**
- **Automatic services are always free**
- **Rationale**: Simplified billing and predictable costs

### ADR-003: Platform Adapter/Provider Separation
- **Adapters**: Handle authentication flows only
- **Providers**: Handle content operations only
- **Rationale**: Clean separation of concerns and maintainability

### ADR-004: Firestore-First Database Strategy
- **Primary**: Firestore for real-time data
- **Caching**: Redis for performance-critical operations
- **Rationale**: Real-time capabilities with scalable caching

---

**CRITICAL**: This document is the single source of truth for all naming conventions and architectural patterns. Any deviation from these standards requires updating this document first and obtaining team approval. 