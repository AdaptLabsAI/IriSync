# Secure environment variable migration

## Summary
- Replace hard-coded Google-related secrets with environment variable lookups
- Introduce shared server/client env helpers and Firebase config modules
- Add automated secret scanning, refreshed env templates, and updated deployment docs

## Follow-up actions for operators
1. **Rotate previously exposed credentials immediately.** Regenerate Firebase, Google Cloud (Generative Language + OAuth), and any other API keys that may have been committed in history.
2. **Populate Vercel environment variables** (`GEN_LANG_API_KEY`, `GOOGLE_OAUTH_CLIENT_ID`, `NEXT_PUBLIC_FIREBASE_API_KEY`, `STRIPE_SECRET_KEY`, `NEXTAUTH_SECRET`, etc.) across Production, Preview, and Development environments.
3. **Update local development machines:**
   - Run `cp .env.example .env.local`
   - Fill in all required values, including any provider-specific client secrets referenced in `docs/deployment/vercel-environment-checklist.md`.
4. **Verify CI and deployments** use the new variables. Ensure `npm run check-secrets` passes before merging future changes.
5. **Audit repository history** with your security team and revoke any credentials that may have been exposed prior to this change.
