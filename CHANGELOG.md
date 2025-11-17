# Changelog

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
