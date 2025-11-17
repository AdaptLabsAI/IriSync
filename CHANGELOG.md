# Changelog

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
