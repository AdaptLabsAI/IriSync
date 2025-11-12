# Token Naming Standardization Guide

## Overview

This document addresses the token naming inconsistencies found throughout the codebase and establishes a standard terminology for all token-related functionality.

## Current Token Naming Issues

Multiple names are currently used for the same concept:
- `baseTokens` (legacy)
- `includedTokens` (preferred standard)
- `aiTokens` (generic property name)
- `aiCredits` (deprecated)

## Standardized Terminology

### Official Token Naming Convention

| Concept | Standard Name | Property Path | Description |
|---------|---------------|---------------|-------------|
| Monthly subscription tokens | `includedTokens` | `tokenBalance.includedTokens` | Tokens included with subscription tier that reset monthly |
| Additional purchased tokens | `purchasedTokens` | `tokenBalance.purchasedTokens` | Extra tokens bought by user that carry over |
| Current usage | `totalUsedTokens` | `tokenBalance.totalUsedTokens` | Tokens consumed in current billing period |
| Organization-level quota | `aiTokens` | `organization.usageQuota.aiTokens.*` | Organization document structure |

### Deprecated Names to Avoid

- ❌ `baseTokens` → Use `includedTokens`
- ❌ `aiCredits` → Use `tokens` or `includedTokens` 
- ❌ `monthlyTokens` → Use `includedTokens`
- ❌ `subscriptionTokens` → Use `includedTokens`

## Token Calculation Logic

### Standard Calculation Pattern

```typescript
// ✅ CORRECT: Use standard naming
const totalTokens = includedTokens + purchasedTokens;
const tokensRemaining = totalTokens - totalUsedTokens;

// ❌ INCORRECT: Mixed naming
const totalTokens = baseTokens + purchasedTokens;
const tokensRemaining = totalTokens - aiCreditsUsed;
```

### Individual Billing Cycles (NEW)

Instead of universal monthly refresh, each user has their own billing cycle:

```typescript
interface TokenBalance {
  // Standard token fields
  includedTokens: number;        // Monthly tokens (resets on user's billing date)
  purchasedTokens: number;       // Purchased tokens (carries over)
  totalUsedTokens: number;       // Current usage (resets on billing date)
  
  // Individual billing cycle tracking
  subscriptionStartDate: Date;   // When user first subscribed
  nextRefreshDate: Date;         // User's next billing date (not universal 1st)
  billingCycleStartDate: Date;   // Current billing period start
  lastRefreshDate: Date;         // When last refreshed
}
```

## Implementation Guidelines

### 1. Service Layer Updates

**TokenPurchaseService** (Primary source of truth):
```typescript
// ✅ Uses standardized naming
interface TokenBalance {
  includedTokens: number;     // Monthly subscription tokens
  purchasedTokens: number;    // Additional purchased tokens  
  totalUsedTokens: number;    // Current period usage
}
```

**UserSubscriptionService** (Integration layer):
```typescript
// ✅ Maps to standard names for backward compatibility
interface UserSubscription {
  includedTokens: number;     // From TokenPurchaseService
  purchasedTokens: number;    // From TokenPurchaseService
  tokensAllocated: number;    // includedTokens + purchasedTokens
  tokensUsed: number;         // totalUsedTokens
  tokensRemaining: number;    // tokensAllocated - tokensUsed
}
```

### 2. Organization Document Structure

**Standard aiTokens structure**:
```typescript
organization.usageQuota.aiTokens = {
  limit: includedTokens,        // Monthly subscription tokens
  additional: purchasedTokens,  // Purchased tokens
  used: totalUsedTokens,        // Current usage
  resetDate: nextRefreshDate,   // User's billing date (not universal)
  lastSynced: Date             // When last synced with TokenPurchaseService
}
```

### 3. Migration Plan

#### Phase 1: Core Service Updates ✅ COMPLETED
- [x] TokenPurchaseService uses `includedTokens` standard
- [x] Individual billing cycle implementation 
- [x] TokenRefreshScheduler updated for individual cycles

#### Phase 2: Legacy Service Migration (TO DO)
- [ ] Update `src/lib/tokens/token-service.ts` to use `includedTokens` instead of `baseTokens`
- [ ] Update organization sync to use individual billing dates
- [ ] Deprecate `baseTokens` references

#### Phase 3: Frontend Integration (TO DO)  
- [ ] Update UI components to use standard terminology
- [ ] Update API responses to use consistent naming
- [ ] Add migration warnings for deprecated field usage

## Critical Fixes Applied

### 1. Individual Billing Cycles

**Problem**: All users were refreshed on the 1st of each month regardless of when they subscribed.

**Solution**: Each user now has individual billing cycle tracking:
- `subscriptionStartDate`: When they first subscribed  
- `nextRefreshDate`: Their personal billing date (not universal 1st)
- Cron job runs daily to check for users whose billing date has arrived

### 2. Cron Schedule Update

**Before**: `"0 0 1 * *"` (1st of month only)
**After**: `"0 2 * * *"` (Daily at 2 AM UTC)

This ensures users get refreshed on their actual billing date.

### 3. Token Naming Standardization

**TokenPurchaseService** is now the single source of truth using:
- `includedTokens` (monthly subscription tokens)
- `purchasedTokens` (additional purchased tokens)
- `totalUsedTokens` (current usage)

### 4. Seat-Based Token Scaling (NEW)
**Problem**: Only Enterprise tier had seat-based scaling, but Creator and Influencer also needed it.
**Solution**: All tiers now properly scale based on seat count:
- **Creator**: 100 tokens per seat, max 3 seats (100-300 tokens)
- **Influencer**: 500 tokens per seat, max 10 seats (500-5000 tokens)
- **Enterprise**: 5000 base + 500 per additional seat beyond 5

## Token Naming Strategy### Internal vs External Naming

**Internal Service Layer** (`TokenPurchaseService`):
- Uses descriptive names: `includedTokens`, `purchasedTokens`, `totalUsedTokens`
- Clear separation of concerns and easy to understand

**External Organization Documents**:
- Maps to existing `aiTokens` structure for backward compatibility
- `includedTokens` → `organization.usageQuota.aiTokens.limit`
- `purchasedTokens` → `organization.usageQuota.aiTokens.additional`
- `totalUsedTokens` → `organization.usageQuota.aiTokens.used`

This approach provides internal clarity while maintaining external compatibility.

## Seat-Based Token Calculation (UPDATED)

### All Tiers Now Support Seat-Based Scaling

```typescript
// Creator tier: 100 tokens per seat, max 3 seats
const creatorSeats = Math.min(seatCount, 3);
const creatorTokens = creatorSeats * 100;
// Examples: 1 seat = 100, 2 seats = 200, 3+ seats = 300

// Influencer tier: 500 tokens per seat, max 10 seats  
const influencerSeats = Math.min(seatCount, 10);
const influencerTokens = influencerSeats * 500;
// Examples: 1 seat = 500, 5 seats = 2500, 10+ seats = 5000

//  Enterprise tier: 5000 base + 500 per additional seat beyond 5
const enterpriseTokens = 5000 + Math.max(0, seatCount - 5) * 500;
// Examples: 5 seats = 5000, 8 seats = 6500, 12 seats = 8500
```

### Seat Limits by Tier
| Tier | Tokens per Seat | Max Seats | Token Range |
|------|-----------------|-----------|-------------|
| Creator | 100 | 3 | 100 - 300 |
| Influencer | 500 | 10 | 500 - 5000 |
| Enterprise | 500 (after base 5000) | Unlimited | 5000+ | 

## Verification Steps

### 1. Check Token Balance Consistency

```typescript
// Verify standard naming is used
const balance = await tokenPurchaseService.getTokenBalance(userId);
console.log({
  included: balance.includedTokens,    // ✅ Standard
  purchased: balance.purchasedTokens,  // ✅ Standard  
  used: balance.totalUsedTokens       // ✅ Standard
});
```

### 2. Verify Individual Billing Cycles

```typescript
// Check that billing dates are individual, not universal
const users = await getAllTokenBalances();
const billingDates = users.map(u => u.nextRefreshDate.getDate());
console.log('Unique billing dates:', [...new Set(billingDates)]);
// Should show multiple dates, not just "1" (1st of month)
```

### 3. Check Organization Sync

```typescript
// Verify organization documents sync with TokenPurchaseService
const orgQuota = await getOrganizationQuota(orgId);
const tokenBalance = await tokenPurchaseService.getTokenBalance(userId, orgId);

console.log('Quota sync check:', {
  orgLimit: orgQuota.aiTokens.limit,
  tokenService: tokenBalance.includedTokens,
  matches: orgQuota.aiTokens.limit === tokenBalance.includedTokens
});
```

## Files Requiring Updates

### High Priority (Legacy baseTokens usage):
1. `src/lib/tokens/token-service.ts` - Replace `baseTokens` with `includedTokens`
2. `src/lib/tokens/models/token-limits.ts` - Update naming
3. Any remaining UI components using `baseTokens`

### Medium Priority (Generic aiTokens):
1. Update organization document sync logic
2. API response standardization
3. Frontend component updates

### Low Priority (Deprecated aiCredits):
1. Add deprecation warnings
2. Legacy compatibility layers
3. Documentation updates

## Summary

- ✅ **TokenPurchaseService**: Now uses standard `includedTokens` naming
- ✅ **Individual Billing Cycles**: Users refresh on their subscription date, not universal 1st
- ✅ **Daily Cron Job**: Checks for users whose billing cycle is due each day
- ✅ **Purchased Token Preservation**: Purchased tokens always carry over
- 🔄 **Legacy Migration**: Other services still need `baseTokens` → `includedTokens` migration

The core token refresh system now properly handles individual billing cycles while preserving purchased tokens and using standardized naming conventions.