# Individual Billing Cycle Token Refresh System

## Overview

The Individual Billing Cycle Token Refresh System ensures that:
- **Monthly included tokens** reset to base tier amounts on each user's billing date
- **Purchased additional tokens** carry over indefinitely 
- **Token usage** resets to 0 on each user's billing cycle
- **Individual billing dates** based on when each user subscribed (not universal monthly)
- **Organization-level tracking** maintains consistency across users

## Key Changes from Previous System

### ❌ Old System (Universal Monthly Refresh)
- All users refreshed on 1st of each month regardless of subscription date
- Users who subscribed mid-month got partial benefits
- Required prorated billing and token calculations
- Cron job: `"0 0 1 * *"` (monthly only)

### ✅ New System (Individual Billing Cycles)
- Each user refreshes on their personal billing anniversary
- Users get full monthly benefits regardless of start date
- No prorated calculations needed
- Cron job: `"0 2 * * *"` (daily check for due refreshes)

## Architecture

### Core Components

1. **TokenPurchaseService** (`src/lib/tokens/TokenPurchaseService.ts`)
   - Manages token balances with separation between included and purchased tokens
   - Handles individual billing cycle refresh logic for all users
   - Tracks token purchases and maintains purchase history
   - **NEW**: Individual billing cycle calculation and tracking

2. **TokenRefreshScheduler** (`src/lib/scheduler/token-refresh-scheduler.ts`)
   - Orchestrates daily refresh operations for users whose billing cycles are due
   - Syncs organization-level token quotas
   - Audits token package usage and provides recommendations
   - Ensures system health and consistency

3. **User Subscription Service** (`src/lib/subscription/user.ts`)
   - Integrates with TokenPurchaseService for proper token calculations
   - Provides organization-centric subscription information
   - Automatically checks for token refresh needs on user requests

### Token Balance Structure (Updated)

```typescript
interface TokenBalance {
  userId: string;
  organizationId?: string;
  includedTokens: number;         // Monthly tokens that reset (tier-based)
  purchasedTokens: number;        // Additional tokens that carry over
  totalUsedTokens: number;        // Tokens used this period (resets on billing date)
  lastRefreshDate: Date;          // When tokens were last refreshed
  nextRefreshDate: Date;          // User's individual billing date (NOT universal 1st)
  billingCycleStartDate: Date;    // When current billing period started
  subscriptionStartDate: Date;    // When user first subscribed (for calculating cycles)
}
```

### UserSubscription Interface

```typescript
interface UserSubscription {
  // ... other fields
  tokensAllocated: number;      // Total: includedTokens + purchasedTokens
  tokensUsed: number;           // totalUsedTokens
  tokensRemaining: number;      // tokensAllocated - tokensUsed
  includedTokens: number;       // Monthly tokens that reset
  purchasedTokens: number;      // Purchased tokens that carry over
  nextResetDate: Date;          // User's individual billing date
}
```

## Individual Billing Cycle Process

### Automatic Refresh (Production)

1. **Vercel Cron Job**: Runs daily at 02:00 UTC to check for users whose billing cycle is due
   - Schedule: `"0 2 * * *"` (daily)
   - Endpoint: `/api/cron/token-refresh`
   - Protected by `CRON_SECRET` environment variable

2. **Daily Refresh Operations**:
   - Query all token balances where `nextRefreshDate <= now`
   - For each balance due for refresh:
     - Reset `includedTokens` to current tier amount (+ enterprise seat bonuses)
     - Keep `purchasedTokens` unchanged (carries over)
     - Reset `totalUsedTokens` to 0
     - Calculate next billing date based on user's `subscriptionStartDate`
     - Update `lastRefreshDate` and `nextRefreshDate`
   - Sync organization usage quotas
   - Generate audit report

### Individual Billing Date Calculation

```typescript
private calculateNextBillingDate(subscriptionStartDate: Date): Date {
  const now = new Date();
  const startDay = subscriptionStartDate.getDate();
  
  // Start with current month, same day as subscription started
  let nextBilling = new Date(now.getFullYear(), now.getMonth(), startDay);
  
  // If the date has already passed this month, move to next month
  if (nextBilling <= now) {
    nextBilling = new Date(now.getFullYear(), now.getMonth() + 1, startDay);
  }
  
  // Handle edge case where day doesn't exist (e.g., Jan 31 -> Feb 31)
  if (nextBilling.getDate() !== startDay) {
    // Use the last day of the month instead
    nextBilling = new Date(nextBilling.getFullYear(), nextBilling.getMonth() + 1, 0);
  }
  
  return nextBilling;
}
```

### Manual Refresh (Admin)

Admins can trigger operations via `/api/admin/tokens/refresh`:

```bash
# Trigger refresh for all users whose billing cycles are due
POST /api/admin/tokens/refresh
{
  "action": "refresh_monthly"
}

# Audit token packages
POST /api/admin/tokens/refresh  
{
  "action": "audit_packages"
}

# Get package statistics
POST /api/admin/tokens/refresh
{
  "action": "get_package_stats"
}

# Initialize default packages
POST /api/admin/tokens/refresh
{
  "action": "initialize_packages"
}
```

### Real-time Refresh Checks

On each user API request, the system:
1. Checks if user's token balance needs refresh (`nextRefreshDate <= now`)
2. Triggers individual refresh if billing date has passed
3. Returns updated token information
4. **This happens automatically in `TokenPurchaseService.getTokenBalance()`**

## Token Package System

### Default Token Packages

The system includes 8 default token packages:

```typescript
const defaultPackages = [
  { name: 'Small Token Pack', tokens: 50, price: 25.00, tier: 'all' },
  { name: 'Medium Token Pack', tokens: 100, price: 45.00, tier: 'all' },
  { name: 'Large Token Pack', tokens: 250, price: 90.00, tier: 'all' },
  { name: 'XL Token Pack', tokens: 500, price: 160.00, tier: 'all' },
  { name: 'Premium Token Pack', tokens: 1000, price: 280.00, tier: 'all' },
  { name: 'Heavy User Pack', tokens: 2000, price: 500.00, tier: 'all' },
  // Enterprise discounted packages (10-20% discount)
  { name: 'Enterprise Premium Pack', tokens: 1000, price: 252.00, tier: 'enterprise' },
  { name: 'Enterprise Heavy User Pack', tokens: 2000, price: 400.00, tier: 'enterprise' }
];
```

### Package Audit System

The system continuously monitors:
- **Package Usage**: Which packages are being purchased
- **Revenue Tracking**: Total revenue from token sales
- **Utilization Rates**: How effectively packages are being used
- **System Health**: Whether the token system is functioning properly

### Recommendations Engine

Based on audit data, the system provides recommendations:
- Marketing suggestions for unused packages
- Pricing optimization recommendations
- User engagement strategies
- System health warnings

## Implementation Examples

### Getting User Subscription with Proper Token Tracking

```typescript
import { getUserSubscription } from '@/lib/subscription/user';

const subscription = await getUserSubscription(userId);
console.log({
  totalTokens: subscription.tokensAllocated,
  monthlyTokens: subscription.includedTokens,
  purchasedTokens: subscription.purchasedTokens,
  used: subscription.tokensUsed,
  remaining: subscription.tokensRemaining,
  nextReset: subscription.nextResetDate  // User's individual billing date
});
```

### Updating Token Usage

```typescript
import { updateTokenUsage } from '@/lib/subscription/user';

// This automatically uses TokenPurchaseService with individual billing cycles
const success = await updateTokenUsage(userId, 10);
```

### Checking System Health

```typescript
import { checkTokenPackageSystemHealth } from '@/lib/subscription/user';

const health = await checkTokenPackageSystemHealth();
if (!health.isHealthy) {
  console.log('Recommendations:', health.recommendations);
}
```

## Monthly Token Calculation

### Base Monthly Tokens by Tier

- **Creator**: 100 tokens
- **Influencer**: 500 tokens  
- **Enterprise**: 5000 tokens (base for 5 seats)

### Enterprise Seat Bonuses

For Enterprise tier with more than 5 seats:
```typescript
const additionalSeats = Math.max(0, seatCount - 5);
const additionalTokens = additionalSeats * 500; // 500 tokens per additional seat
const totalIncludedTokens = 5000 + additionalTokens;
```

Example:
- 5 seats: 5000 tokens
- 8 seats: 5000 + (3 × 500) = 6500 tokens
- 10 seats: 5000 + (5 × 500) = 7500 tokens

## Environment Variables

Required environment variables:

```bash
# Token system configuration
CRON_SECRET=your-secret-key-for-cron-protection

# Firebase configuration (for token storage)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email

# Email notifications (for purchase confirmations)
RESEND_API_KEY=your-resend-api-key
```

## Migration from Universal to Individual Billing

### Automatic Migration

When a user's token balance is first accessed:
1. If no `subscriptionStartDate` exists, it's set to current date
2. If `nextRefreshDate` is set to universal 1st, it's recalculated based on individual cycle
3. Organization documents are synced with new individual dates

### Manual Migration (Admin)

```typescript
// Migrate all existing users to individual billing cycles
POST /api/admin/tokens/refresh
{
  "action": "migrate_to_individual_billing"
}
```

## Troubleshooting

### Common Issues

1. **User not getting refreshed**: Check `nextRefreshDate` in token balance
2. **Organization quota out of sync**: Run organization quota sync
3. **Purchased tokens lost**: Verify `purchasedTokens` field is preserved during refresh
4. **Multiple billing dates on same day**: This is normal and expected

### Health Monitoring

```typescript
// Check system health
GET /api/admin/tokens/refresh
```

Returns:
```json
{
  "status": "healthy",
  "usersNeedingRefresh": 0,
  "lastCronRun": "2024-01-15T02:00:00Z",
  "totalActiveUsers": 1250,
  "uniqueBillingDates": 31,
  "recommendations": []
}
```

## Future Enhancements

1. **Prorated Billing Support**: Option to prorate first month for mid-cycle subscribers
2. **Custom Billing Cycles**: Support for annual, quarterly billing cycles
3. **Token Rollover Limits**: Maximum purchased tokens that can accumulate
4. **Usage Analytics**: Per-user token usage patterns and recommendations
5. **Smart Package Recommendations**: AI-driven package suggestions based on usage

## Summary

The Individual Billing Cycle Token Refresh System provides:

- ✅ **Fair billing**: Users get full monthly benefits regardless of start date
- ✅ **Purchased token preservation**: Additional tokens always carry over
- ✅ **Individual billing dates**: No more universal monthly refresh
- ✅ **Daily monitoring**: Cron job checks for due refreshes every day
- ✅ **Standardized naming**: Uses `includedTokens`, `purchasedTokens`, `totalUsedTokens`
- ✅ **Automatic refresh**: Happens transparently when users access their balance
- ✅ **Organization sync**: Keeps organization quotas in sync with individual balances

This system eliminates the need for prorated billing while ensuring all users receive fair token allocation based on their individual subscription cycles. 