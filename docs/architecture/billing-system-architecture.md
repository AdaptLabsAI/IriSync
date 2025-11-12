# IriSync Universal Billing System Architecture

## Overview

This document outlines the new **Universal Billing System** that replaces the enterprise-only billing approach with a comprehensive solution for all subscription tiers (Creator, Influencer, Enterprise).

## Key Questions Addressed

### 1. Enterprise vs All Customers?

**Answer: ALL CUSTOMERS** - The new system applies to all subscription tiers with tier-appropriate behavior.

#### Previous System (Enterprise Only)
- `EnterpriseBillingService` - Enterprise customers only
- Manual billing management for Creator/Influencer tiers
- Inconsistent billing policies

#### New System (Universal)
- `UniversalBillingService` - All subscription tiers
- Consistent business-friendly billing policy
- Automated suspension and closure workflows

### 2. Business-Friendly Billing Schedule

The new system implements your requested **respectful customer communication** approach:

#### Week 1 (Days 1-7): Grace Period
- ✅ **Service continues normally**
- 📧 **3 reminder emails only**:
  - Day 1: First reminder (immediate)
  - Day 3: Second reminder
  - Day 7: Final warning
- 🔄 **No service disruption during grace period**

#### Week 2+ (Days 8-30): Service Suspension
- ⛔ **Service suspended but account preserved**
- 🚫 **All features disabled** (AI toolkit, content scheduling, analytics, team collaboration)
- 📧 **One suspension notice email**
- 💾 **Data preserved for restoration**

#### After 30 Days: Account Closure
- 🔒 **Account closed (not deleted)**
- 💳 **Stripe billing automatically cancelled**
- 📧 **One closure notice email**
- 💾 **Data preserved for potential reactivation**
- 📞 **Contact billing team to restore**

### 3. Customer Payment Management

#### Stripe Customer Portal Implementation
- **New endpoint**: `/api/billing/customer-portal`
- **Features**:
  - Update payment methods
  - View/download invoices
  - Change billing details
  - Subscription management
  - One-click access from dashboard

#### Frontend Integration
```typescript
// Button in billing settings
const handleManagePayment = async () => {
  const response = await fetch('/api/billing/customer-portal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      returnUrl: window.location.href
    })
  });
  
  const { url } = await response.json();
  window.location.href = url; // Redirect to Stripe portal
};
```

### 4. Which Billing System to Use?

#### ✅ USE THESE (Production-Ready)
1. **`UniversalBillingService`** - **NEW** - Primary billing logic for all tiers
2. **`src/app/api/webhooks/stripe/route.ts`** - **UPDATED** - Most comprehensive webhook handler
3. **`src/lib/billing/stripe.ts`** - **EXISTING** - Core Stripe utilities (production-ready)
4. **`src/app/api/billing/customer-portal/route.ts`** - **NEW** - Customer portal access

#### ❌ DEPRECATE/CONSOLIDATE THESE
1. **`src/lib/subscription/EnterpriseBillingService.ts`** - **ENTERPRISE ONLY** - Replace with Universal
2. **`src/app/api/settings/billing/route.ts`** - **PARTIAL** - Merge functionality into main system
3. **`src/lib/subscription/SubscriptionService.ts`** - **INCOMPLETE** - Replace with Universal

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                  Customer Payment Flow                  │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│              Stripe Customer Portal                     │
│  • Update payment methods                              │
│  • View invoices                                       │
│  • Manage subscription                                 │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                 Stripe Webhooks                        │
│  • invoice.paid → Restore account                      │
│  • invoice.payment_failed → Start grace period         │
│  • subscription.updated → Update billing status        │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│            UniversalBillingService                      │
│  • Daily cron job (9 AM UTC)                          │
│  • Check all past due accounts                         │
│  • Send reminders (3 max)                             │
│  • Suspend accounts (Day 8)                           │
│  • Close accounts (Day 30+)                           │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│              Account Status Management                   │
│  • ACTIVE → PAST_DUE → SUSPENDED → CLOSED              │
│  • Feature gating enforcement                          │
│  • Usage quota management                              │
│  • Automatic restoration on payment                    │
└─────────────────────────────────────────────────────────┘
```

## Implementation Files

### Core Files (NEW/UPDATED)
```
src/lib/subscription/UniversalBillingService.ts    [NEW] - Main billing logic
src/app/api/cron/billing-universal/route.ts        [NEW] - Cron endpoint
src/app/api/billing/customer-portal/route.ts       [NEW] - Customer portal
src/app/api/webhooks/stripe/route.ts               [UPDATED] - Webhook handler
src/lib/subscription/suspension-middleware.ts      [EXISTING] - Feature gating
vercel.json                                         [UPDATED] - Cron schedule
```

### Environment Variables Required
```bash
# Existing
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# New for universal billing
CRON_API_KEY=your-secure-random-key-here
STRIPE_PORTAL_CONFIGURATION_ID=bpc_...  # Optional: Custom portal config
```

## Deployment Configuration

### Vercel Cron Jobs
```json
{
  "crons": [
    {
      "path": "/api/cron/billing-universal",
      "schedule": "0 9 * * *"
    }
  ]
}
```

### Alternative Deployment Options
1. **GitHub Actions** - Scheduled workflows
2. **External Cron Services** - Cron-job.org, EasyCron
3. **Self-hosted** - Linux crontab

## Benefits of New System

### 1. Customer-Friendly
- ✅ Respectful communication (max 3 emails during grace period)
- ✅ Service continues during payment resolution
- ✅ Clear timeline and expectations
- ✅ Easy payment management through Stripe portal

### 2. Business Protection
- ✅ Automatic service suspension after grace period
- ✅ Revenue protection through account closure
- ✅ Clear escalation path for non-payment
- ✅ Preserved data for customer retention

### 3. Technical Excellence
- ✅ Unified system for all subscription tiers
- ✅ Automatic account restoration on payment
- ✅ Comprehensive logging and monitoring
- ✅ Production-ready error handling

### 4. Operational Efficiency
- ✅ Automated billing workflows
- ✅ Consistent policies across all tiers
- ✅ Reduced manual intervention
- ✅ Clear audit trail

## Migration Path

### Phase 1: Deploy New System ✅
- ✅ `UniversalBillingService` implemented
- ✅ Customer portal created
- ✅ Webhook handler updated
- ✅ Cron job configured

### Phase 2: Test & Validate
- [ ] Test customer portal functionality
- [ ] Validate reminder email delivery
- [ ] Test account suspension/restoration
- [ ] Monitor cron job execution

### Phase 3: Go Live
- [ ] Update environment variables
- [ ] Deploy to production
- [ ] Monitor billing workflows
- [ ] Deprecate old enterprise-only system

## Support & Troubleshooting

### Common Issues
1. **Customer Portal Access**: Ensure `STRIPE_PORTAL_CONFIGURATION_ID` is set
2. **Cron Job Authentication**: Verify `CRON_API_KEY` environment variable
3. **Email Delivery**: Check `sendEmail` service configuration
4. **Account Restoration**: Monitor webhook processing logs

### Monitoring
- Billing cron job logs: Check daily execution at 9 AM UTC
- Customer portal usage: Monitor portal session creation
- Account suspensions: Track suspension/restoration events
- Payment failures: Monitor webhook processing success

## Conclusion

The new Universal Billing System provides a **business-friendly, customer-respectful** approach to billing management that:

1. **Applies to all subscription tiers** (not just enterprise)
2. **Gives customers a full week** to resolve payment issues without service disruption
3. **Provides easy payment management** through Stripe Customer Portal
4. **Uses the most up-to-date billing architecture** with proper webhook handling
5. **Automatically manages account lifecycle** from active → past due → suspended → closed
6. **Preserves customer data** and enables easy reactivation

This system balances customer satisfaction with business protection, following industry best practices for B2B SaaS billing. 