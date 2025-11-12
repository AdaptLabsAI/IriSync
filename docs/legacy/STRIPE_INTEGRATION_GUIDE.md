# IrisSync Stripe Integration Guide

## 🎯 **STRIPE-NATIVE ARCHITECTURE** (Recommended)

Your Stripe integration now uses **industry-standard, Stripe-native trials** for better reliability and user experience.

## Complete 14-Product Structure

Your Stripe integration now supports **14 separate products** with individual price IDs:

### Base Subscription Products (3)
1. **Creator** - $80/month (1 seat, 100 tokens)
2. **Influencer** - $200/month (1 seat, 500 tokens)  
3. **Enterprise** - $1,250/month (5 seats, 5000 tokens)

### Additional Seat Products (3)
4. **Creator Additional Seat** - $80/month per seat
5. **Influencer Additional Seat** - $200/month per seat
6. **Enterprise Additional Seat** - $150/month per seat

### Token Packages (8)
7. **Small Token Pack** - 50 tokens for $25
8. **Medium Token Pack** - 100 tokens for $45
9. **Large Token Pack** - 250 tokens for $90
10. **XL Token Pack** - 500 tokens for $160
11. **Premium Token Pack** - 1000 tokens for $290
12. **Enterprise Token Pack** - 2000 tokens for $540
13. **Enterprise Pro Token Pack** - 1000 tokens for $200 (discounted)
14. **Enterprise Max Token Pack** - 2000 tokens for $360 (discounted)

## 🔄 **NEW REGISTRATION & TRIAL FLOW**

### **✅ Improved User Experience:**

1. **Registration** → Basic account created (no payment required)
2. **Login** → User prompted to start 7-day trial
3. **Trial Setup** → Stripe checkout with native trial
4. **Trial Active** → Full access for 7 days
5. **Auto-Conversion** → Stripe handles conversion automatically
6. **Token Refresh** → Monthly cron job refreshes tokens

### **🔧 Key Benefits:**
- **No payment required during registration**
- **Stripe handles trial conversion automatically**
- **Industry standard approach**
- **Better reliability and compliance**
- **Simpler codebase**

## API Endpoints

### **1. Registration (Simplified)**
```
POST /api/auth/register
{
  "firstName": "John",
  "lastName": "Doe", 
  "email": "john@company.com",
  "password": "securePassword123",
  "confirmPassword": "securePassword123",
  "subscriptionTier": "creator",
  "businessType": "company",
  "companyName": "Acme Corp",
  "acceptTerms": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Account created successfully! You can start your 7-day free trial after logging in.",
  "userId": "user_123",
  "organizationId": "org_456", 
  "preferredTier": "creator",
  "nextStep": "start_trial",
  "trialEligible": true
}
```

### **2. Trial Setup (NEW - Stripe Native)**
```
POST /api/billing/trial-setup
{
  "userId": "user_123",
  "organizationId": "org_456",
  "tier": "creator",
  "successUrl": "https://yourapp.com/dashboard?trial=started",
  "cancelUrl": "https://yourapp.com/dashboard?trial=canceled"
}
```

**Response (Checkout URL):**
```json
{
  "success": true,
  "message": "Please complete payment setup to start your trial",
  "checkoutUrl": "https://checkout.stripe.com/pay/cs_...",
  "nextStep": "complete_checkout"
}
```

**Response (Direct Trial - if payment method provided):**
```json
{
  "success": true,
  "message": "Your 7-day free trial for creator tier has started!",
  "subscription": {
    "id": "sub_123",
    "status": "trialing",
    "trialEnd": 1735689600
  },
  "nextStep": "trial_active"
}
```

### **3. Check Trial Eligibility**
```
GET /api/billing/trial-setup?userId=user_123&organizationId=org_456
```

**Response:**
```json
{
  "eligible": true,
  "currentStatus": "none",
  "message": "You are eligible to start a 7-day free trial"
}
```

### **4. Base Subscription Purchase**
```
POST /api/billing/create-checkout-session
{
  "userId": "user_123",
  "subscriptionTier": "creator",
  "purchaseType": "subscription"
}
```

### **5. Additional Seat Purchase**
```
POST /api/billing/create-checkout-session
{
  "userId": "user_123", 
  "subscriptionTier": "creator",
  "purchaseType": "additional_seats",
  "quantity": 3
}
```

### **6. Token Package Purchase**
```
POST /api/billing/token-purchase
{
  "userId": "user_123",
  "tokenPackageId": "token-250",
  "successUrl": "https://yourapp.com/dashboard?tokens=purchased",
  "cancelUrl": "https://yourapp.com/dashboard?tokens=canceled"
}
```

## Webhook Events

Your webhook handler at `/api/webhooks/stripe` processes these events:

### **Subscription Events (Auto-handled by Stripe)**
- `customer.subscription.created` - New subscriptions
- `customer.subscription.updated` - Plan changes, trial conversions
- `customer.subscription.deleted` - Cancellations
- `invoice.payment_succeeded` - Successful payments
- `invoice.payment_failed` - Failed payments

### **Trial Conversion (Automatic)**
When a 7-day trial ends, Stripe automatically:
1. Converts trial to paid subscription
2. Sends `customer.subscription.updated` webhook
3. Your webhook handler processes the conversion
4. No manual intervention needed!

### **Token Purchases**
- `checkout.session.completed` - Token package purchases
- Tokens added to organization automatically

## Automation & Cron Jobs

### **Monthly Token Refresh (NEW)**
```
POST /api/cron/token-refresh
Authorization: Bearer YOUR_CRON_SECRET
```

**Purpose:**
- Refreshes monthly token allocations for active subscribers
- Resets usage counters on billing period start
- Backup refresh for missed webhooks

**Schedule:** Monthly on 1st at 00:00 UTC (`"0 0 1 * *"`)

**How it works:**
1. Gets all active Stripe subscriptions
2. Checks for new billing periods (last 24 hours)
3. Refreshes tokens for new billing periods
4. Backup check for organizations with stale refresh dates

## Frontend Integration

### **Trial Status Component**
Use the `TrialStatus` component to show users their trial information:

```jsx
import { TrialStatus } from '@/components/subscription/TrialStatus';

<TrialStatus 
  userId={userId}
  onSetupPayment={() => window.location.href = '/billing/trial-setup'}
  onUpgrade={() => window.location.href = '/billing/upgrade'} 
/>
```

### **Registration Form Updates**
The registration form now shows users they can start their trial after registration, improving conversion rates.

## Environment Variables

All 14 product price IDs are configured in `environment.md`:

```env
# Core Subscriptions
STRIPE_PRICE_CREATOR_ID=price_1RS3b0HktZBevG42OXLDUdTR
STRIPE_PRICE_INFLUENCER_ID=price_1RS3b0HktZBevG42JclbCg7M
STRIPE_PRICE_ENTERPRISE_ID=price_1RS3b1HktZBevG42OMkTkcop

# Additional Seats
STRIPE_CREATOR_SEAT_PRICE_ID=price_1RS3b1HktZBevG42YV25nMbR
STRIPE_INFLUENCER_SEAT_PRICE_ID=price_1RS3b1HktZBevG42uiSVBHVL
STRIPE_ENTERPRISE_SEAT_PRICE_ID=price_1RS3b2HktZBevG42xalBIU0L

# Token Packages (8 total)
STRIPE_TOKEN_PACKAGE_50_PRICE_ID=price_1RS3b2HktZBevG4279lYPypd
STRIPE_TOKEN_PACKAGE_100_PRICE_ID=price_1RS3b2HktZBevG42IY1LWo7g
# ... (see environment.md for complete list)

# Cron Security
CRON_SECRET=your-secure-cron-secret-key-here
```

## 🚀 **PRODUCTION READY FOR LAUNCH**

Your system is now **production-ready** with:

✅ **Stripe-native trials** (industry standard)  
✅ **14 separate products** (subscriptions, seats, tokens)  
✅ **Automatic trial conversion** (handled by Stripe)  
✅ **Monthly token refresh** (automated cron job)  
✅ **Webhook processing** (all events covered)  
✅ **Clean user experience** (no payment during registration)  
✅ **Reliable architecture** (battle-tested Stripe features)

## Migration Benefits

**Before (Complex Custom):**
- Custom trial management
- Payment required during registration  
- Complex conversion logic
- Manual trial tracking
- Higher chance of errors

**After (Stripe-Native):**
- Stripe handles trials automatically
- Clean registration flow
- Industry standard approach
- Better user experience
- More reliable and scalable

This architecture will handle your launch smoothly and scale as you grow! 🎉 
