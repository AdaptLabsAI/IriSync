# Billing System Migration - Legacy to Universal

## Overview

IriSync has migrated from multiple billing services (Enterprise-only, incomplete implementations) to a **Universal Billing System** that handles all subscription tiers with a business-friendly approach.

## Deprecated/Removed Files ❌

### Legacy Billing Services
```bash
# REMOVED - Enterprise-only billing (19KB, 536 lines)
src/lib/subscription/EnterpriseBillingService.ts

# REMOVED - Incomplete subscription service (26KB, 870 lines)  
src/lib/subscription/SubscriptionService.ts

# REMOVED - Deprecated user subscription logic (29KB, 875 lines)
src/lib/subscription/user.ts
```

### Legacy API Routes
```bash
# REMOVED - Partial implementation, replaced by /api/billing/subscription
src/app/api/settings/billing/route.ts

# REMOVED - Enterprise-only, replaced by universal system
src/app/api/settings/enterprise-billing/[quoteId]/route.ts

# REMOVED - Old cron job, replaced by billing-universal
src/pages/api/cron/billing-daily.ts
```

### Legacy Scheduler
```bash
# REMOVED - Replaced by UniversalBillingService
src/lib/scheduler/billing-cron.ts
```

## New Universal System ✅

### Core Architecture
```bash
# PRODUCTION-READY Universal Billing System
src/lib/subscription/UniversalBillingService.ts     [NEW] - All tiers, all customers
src/app/api/cron/billing-universal/route.ts        [NEW] - Daily billing cron (9 AM UTC)
src/app/api/billing/subscription/route.ts          [NEW] - Unified billing API
src/app/api/billing/customer-portal/route.ts       [NEW] - Stripe customer portal
src/lib/subscription/suspension-middleware.ts      [EXISTING] - Feature access control
```

### Updated Integration
```bash
# UPDATED - Enhanced webhook support for universal system
src/app/api/webhooks/stripe/route.ts               [UPDATED] - Universal billing events
```

## Key Improvements

### 1. **Universal Coverage**
- **Old**: Enterprise-only billing with separate incomplete services
- **New**: Single service handles Creator ($39), Influencer ($99), Enterprise ($250/seat)

### 2. **Business-Friendly Billing Policy**
- **Old**: Aggressive reminder system (up to 10 emails)
- **New**: Respectful 3-email approach + automatic suspension

#### New Business Process:
1. **Payment Fails** → 3 reminder emails (Day 1, 3, 7)
2. **After 7 Days** → Account suspended, features disabled
3. **After Next Billing Cycle** → Account closed (no billing, no deletion)
4. **Payment Made** → Automatic restoration

### 3. **Customer Payment Management**
- **New**: Stripe Customer Portal integration
- **Route**: `/api/billing/customer-portal` (POST to create session)
- **Features**: Payment methods, invoices, billing info, subscription changes

### 4. **Comprehensive API**
- **New**: `/api/billing/subscription`
  - `GET` - Retrieve billing info (status, invoices, payment methods)
  - `POST` - Actions (check status, restore account, update email)
  - `PUT` - Subscription changes (cancel, modify)

### 5. **Account Suspension System**
- **Automatic**: No manual intervention required
- **Feature Gating**: Complete service shutdown for suspended accounts
- **Restoration**: Automatic when payment is made
- **Status Tracking**: Clear audit trail of suspension/restoration

## Webhook Architecture

### Stripe Webhooks (Updated)
- **Route**: `/api/webhooks/stripe`
- **Events Handled**:
  - `invoice.payment_succeeded` → Account restoration
  - `invoice.payment_failed` → Reminder system trigger
  - `customer.subscription.updated` → Status sync
  - `customer.subscription.deleted` → Account suspension

### Cron Jobs (Consolidated)
- **Universal Billing**: `/api/cron/billing-universal` (Daily 9 AM UTC)
- **Token Refresh**: `/api/cron/token-refresh` (Daily 2 AM UTC)

## Migration Impact

### For Users
- **No Service Interruption**: New system handles existing subscriptions
- **Better Support**: Customer portal for self-service billing
- **Clear Communication**: Transparent billing status and suspension policies

### For Development
- **Simplified**: Single service instead of multiple incomplete ones
- **Maintainable**: Consistent patterns across all subscription tiers
- **Scalable**: Handles growth from Creator to Enterprise seamlessly

## Environment Variables

### Required for Universal System
```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PORTAL_CONFIGURATION_ID=bpc_...  # Optional: Custom portal config

# Billing Cron Authentication
CRON_API_KEY=your-secure-api-key

# Email System (for billing notifications)
SENDGRID_API_KEY=SG...
BILLING_FROM_EMAIL=billing@irisync.com
```

### Stripe Price IDs (Required)
```bash
STRIPE_PRICE_CREATOR_ID=price_creator_monthly
STRIPE_PRICE_INFLUENCER_ID=price_influencer_monthly
STRIPE_PRICE_ENTERPRISE_ID=price_enterprise_monthly
```

## API Usage Examples

### Get Billing Information
```javascript
const response = await fetch('/api/billing/subscription', {
  method: 'GET',
  headers: { 'Authorization': `Bearer ${userToken}` }
});

const billing = await response.json();
// Returns: organization, billing status, invoices, payment methods, suspension info
```

### Create Customer Portal Session
```javascript
const response = await fetch('/api/billing/customer-portal', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    returnUrl: 'https://app.irisync.com/dashboard/settings/billing'
  })
});

const { url } = await response.json();
window.location.href = url; // Redirect to Stripe portal
```

### Restore Suspended Account
```javascript
const response = await fetch('/api/billing/subscription', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'restore_account'
  })
});
```

## Deployment Notes

### Vercel Configuration
- **Updated**: `vercel.json` now uses `/api/cron/billing-universal`
- **Schedule**: Daily at 9:00 AM UTC (`0 9 * * *`)

### Database Schema
- **Organizations**: Enhanced with suspension tracking
- **Billing**: Unified billing status across all tiers
- **Usage Quotas**: Consistent quota enforcement

## Support Documentation

### For Customer Success
- **Billing Issues**: Direct customers to customer portal
- **Account Suspension**: Explain the 7-day grace period
- **Restoration**: Automatic upon payment (no manual intervention needed)

### For Technical Support
- **Billing Status**: Check via `/api/billing/subscription`
- **Force Refresh**: Use `action: 'check_billing_status'`
- **Manual Restore**: Use `action: 'restore_account'` (if needed)

## Testing

### Stripe Test Mode
- Use test webhook endpoints during development
- Test all billing scenarios (payment success/failure, subscription changes)
- Verify suspension/restoration workflows

### Cron Job Testing
```bash
# Test the universal billing cron locally
curl -X POST http://localhost:3000/api/cron/billing-universal \
  -H "Authorization: Bearer ${CRON_API_KEY}"
```

## Monitoring

### Key Metrics to Track
- **Billing Success Rate**: Payment success vs failure
- **Suspension Rate**: Accounts suspended per month
- **Restoration Rate**: Accounts restored after suspension
- **Customer Portal Usage**: Self-service adoption

### Error Tracking
- **Stripe API Errors**: Payment processing issues
- **Email Delivery**: Billing notification failures
- **Cron Job Health**: Daily billing job success/failure

---

This migration consolidates multiple incomplete billing systems into a single, production-ready solution that provides excellent customer experience while protecting business revenue. 