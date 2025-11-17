# Changelog

## 2025-11-17 20:51 EST
- **DESIGN REVIEW**: Completed comprehensive review of Figma designs against repository implementation
- **AUTH PAGE FIXES**: Updated authentication pages to match Figma designs exactly
  - **Register Page**: Removed trial-specific elements (checkboxes, trial button text) to match clean Figma design
  - Changed button from "Start 7-Day Free Trial" to "Register"
  - Removed Terms & Conditions and Trial Agreement checkboxes
  - Simplified registration flow to free tier instead of Stripe trial checkout
  - Updated subscription tier from 'trial' to 'free'
  - Registration now redirects directly to dashboard after successful signup
- **Forgot Password Page**: Complete redesign to match Figma specifications
  - Added left dark green panel with security/shield icon visual
  - Added back arrow button for navigation
  - Added centered chat/message icon with gradient background
  - Updated title to "Forgot Password" and subtitle to "We'll send a one-time password to your registered email address."
  - Changed button text from "Send Reset Link" to "Send OTP"
  - Implemented split-panel layout matching login/register pages
  - Added success state with "Check Your Email" confirmation
- **NAVIGATION FIXES**: Updated navbar links to point to correct routes
  - Fixed Features link from /features-pricing to /features
  - Added separate Pricing link pointing to /pricing
  - Added Integrations link to navbar
  - Added Careers link to navbar
  - Removed Documentation and Support links (not yet implemented)
- **CODE REVIEW**: Performed comprehensive security and quality audit
  - Identified 5 critical security issues requiring attention
  - Identified 8 high-severity issues requiring fixes
  - Identified 11 medium-severity issues for improvement
  - Identified 7 low-severity issues for polish
  - Key findings: authentication bypass in login API, XSS vulnerabilities in image error handlers, weak password validation, missing CSRF protection, unsafe type coercion
  - Note: Critical issues documented but not yet fixed (require broader architectural changes)
- **INTEGRATIONS PAGE**: Verified integrations page matches Figma design with all 5 sections
- **LOGIN PAGE**: Confirmed login page matches Figma design (no changes needed)

## 2025-11-17 14:00 EST
- **MAJOR FEATURE**: Implemented complete OAuth integration for all social media platforms
- Created unified OAuth connect endpoint: `/api/platforms/connect`
- Supports Facebook, Instagram, Twitter/X, LinkedIn, TikTok, YouTube, and Pinterest
- Implemented PKCE (Proof Key for Code Exchange) for Twitter and TikTok for enhanced security
- Added comprehensive TokenRefreshService for automatic token refresh across all platforms
- Created scheduled token refresh cron endpoint: `/api/cron/refresh-tokens`
- Token refresh runs hourly and prevents connection failures
- Added platform-specific refresh configurations for Facebook (60 days), Twitter (2 hours), LinkedIn (60 days), YouTube (1 hour), TikTok (24 hours), Pinterest (1 hour)
- Updated env.example with all OAuth credentials (Facebook, Twitter, LinkedIn, TikTok, Pinterest, YouTube)
- Added CRON_SECRET for secure cron job authentication
- Created comprehensive OAuth setup documentation: `docs/OAUTH_SETUP.md`
- Documentation includes step-by-step setup guides for all 6 platforms
- Includes developer app creation, credential configuration, redirect URI setup, and troubleshooting
- Integrates with existing PlatformAdapterFactory and callback handler
- Implements secure OAuth request tracking with 10-minute expiration
- All tokens stored securely in Firestore with automatic refresh

## 2025-11-17 12:00 EST
- **MAJOR FEATURE**: Implemented trial registration flow with Stripe billing integration
- Registration page now collects payment info via Stripe Checkout before account activation
- Added 7-day free trial with influencer-level features, auto-converts to Creator ($80/month)
- Created trial checkout API endpoint: `/api/subscription/create-trial-checkout`
- Updated registration form with Terms & Conditions and Trial Agreement checkboxes
- Changed submit button to "Start 7-Day Free Trial" with clear pricing disclosure
- Implemented three-step registration: 1) Create Firebase account, 2) Create Stripe checkout, 3) Redirect to payment
- **FEATURE GATING SYSTEM**: Enhanced FeatureGate component with comprehensive tier hierarchy
- Added 'trial' and 'admin' tiers to subscription system
- Trial tier receives influencer-level features (tier level 2)
- Created feature-to-tier mapping for all features (basic, influencer, enterprise, admin)
- Implemented upgrade prompt UI with lock icon and "View Plans" CTA
- **CLIENT-SIDE HOOKS**: Updated useFeatureAccess hook to use Firebase Auth instead of NextAuth
- Hook checks organization-level subscription tier first, falls back to user-level tier
- Returns comprehensive access info: hasAccess, currentTier, requiredTier, upgradeMessage
- Added useHasTier hook for simple tier-level checks
- **STRIPE WEBHOOKS**: Enhanced Stripe webhook handler to process trial events
- checkout.session.completed: Sets organization to 'trial' tier with influencer features
- customer.subscription.updated: Handles trial-to-paid conversion automatically
- Proper tier assignment based on trial status (trial → creator after 7 days)
- Tracks trial end date and automatic conversion tier
- Feature access matrix includes: Basic (scheduling, analytics), Influencer (video scheduling, bulk ops, social listening), Enterprise (smart replies, team mgmt, SSO), Admin (system config, user mgmt)

## 2025-11-17 07:00 EST
- **CRITICAL FIX**: Replaced NextAuth with Firebase Auth for team management page
- Team management page now uses Firebase Auth tokens for authentication
- Updated handleInvite, handleRemove, handleRoleChange, handleResendInvite, handleTransferOwnership to use Firebase Auth
- All API requests now include Firebase ID token in Authorization header
- Fixes "Authorization required" error on team management page
- Team management now works with existing Firebase authentication system

## 2025-11-17 06:45 EST
- **ROUTE FIX**: Renamed /features-pricing to /features for proper URL structure
- **DESIGN FIX**: Updated pricing page colors to match Figma design (#00C853 green, #003305 dark green)
- Updated pricing banner gradient from blue-purple to green
- Updated pricing card buttons and highlights to use green colors
- **DESIGN FIX**: Updated integrations page colors to match Figma design
- Changed custom integration section from blue-purple to green gradient
- All pages now use consistent green color scheme matching Figma specifications

## 2025-11-17 06:30 EST
- **CRITICAL FIX**: Replaced NextAuth with Firebase Auth for connections page
- Connections page now uses Firebase Auth tokens for authentication
- API route /api/settings/connections now verifies Firebase ID tokens instead of NextAuth sessions
- Added verifyFirebaseToken() helper function for Firebase Admin auth verification
- Updated GET, POST, PUT, DELETE handlers to use Firebase Auth
- Made DELETE handler accept both 'provider' and 'type' parameters for backward compatibility
- Connections now work properly with existing Firebase authentication system

## 2025-11-16 21:45 EST
- **MAJOR UPDATE**: Replaced hardcoded profile page with Firebase-integrated version
- Profile data now loads from and saves to Firestore users collection
- Added edit mode with inline editing for displayName, company, role, phone, location, bio
- Profile data persists across sessions and recalls on login
- Old hardcoded version backed up to page-old-hardcoded.tsx

## 2025-11-16 21:30 EST
- **NEW FEATURE**: Created User Management page at /dashboard/content/userM with full CRUD operations
- **NEW FEATURE**: Created System Health monitoring page at /dashboard/content/system
- **NEW FEATURE**: Created Support Ticket creation page at /support/new-ticket
- **CRITICAL FIX**: Auto-setup admin@irisync.com as super_admin on login
- Admin role is now automatically assigned to admin@irisync.com in Firestore
- Created script for manual admin setup (scripts/setup-admin.js)

## 2025-11-16 21:00 EST
- **CRITICAL FIX**: Made Firestore updates non-blocking in login flow to prevent "Missing or insufficient permissions" errors
- Login now succeeds even if Firestore security rules aren't configured
- Automatically creates user document in Firestore on first login
- Fixed webpack environment variable inlining with explicit switch statements in firebaseConfig.ts and health.ts

## 2025-11-16 20:15 EST
- **CRITICAL FIX**: Added explicit env{} configuration to next.config.js to force inlining of NEXT_PUBLIC_* Firebase environment variables in standalone mode
- Fixed TypeScript type imports (Auth, Firestore) in customAuth.ts
- Fixed build conflict by removing duplicate firebase-test page
- Created logo.svg and logo-white.svg
- Updated footer copyright text
- Fixed Firebase initialization in admin-access page
- Fixed Firebase query error in careers page
- Created contact-sales page and API endpoint
- Created /admin redirect to /admin-access
- Removed 30+ unnecessary documentation files, kept only README.md and CHANGELOG.md
