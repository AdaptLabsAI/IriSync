# Vercel Environment Checklist

_Last generated: 2025-11-12T01:29:50.704Z_

This report lists every environment variable referenced in the runtime code. Values already provided in `.env.local`, `env.example`, or `env.fixed.txt` are considered documented. Everything else must be provisioned in Vercel before a production deployment.

## Summary

- Total variables referenced in code: **346**
- Documented in env templates: **29**
- Missing values that must be created in Vercel: **317**

Run this script again whenever new integrations are added to keep the checklist up to date.

## Missing variables by integration

### ADDITIONAL

> Add these values to your Vercel project under **Settings → Environment Variables**. Follow the provider documentation for credentials and redirect URIs.

| Variable | Referenced in |
| --- | --- |
| `ADDITIONAL_SEAT_PRICE_ID` | `src/environment.ts` |
| `ADDITIONAL_TOKENS_PRICE_ID` | `src/environment.ts` |

### ADMIN

> Add these values to your Vercel project under **Settings → Environment Variables**. Follow the provider documentation for credentials and redirect URIs.

| Variable | Referenced in |
| --- | --- |
| `ADMIN_EMAIL` | `scripts/deploy-seed.js` |
| `ADMIN_PASSWORD` | `scripts/deploy-seed.js` |

### ADOBE

> Add these values to your Vercel project under **Settings → Environment Variables**. Follow the provider documentation for credentials and redirect URIs.

| Variable | Referenced in |
| --- | --- |
| `ADOBE_CLIENT_ID` | `src/app/api/settings/connections/route.ts`<br />`src/app/api/storage/download/route.ts` |
| `ADOBE_CLIENT_SECRET` | `src/app/api/storage/download/route.ts` |
| `ADOBE_EXPRESS_CALLBACK_URL` | `src/app/api/settings/connections/route.ts` |
| `ADOBE_EXPRESS_CLIENT_ID` | `src/lib/integrations/AdobeExpressAdapter.ts` |
| `ADOBE_EXPRESS_CLIENT_SECRET` | `src/lib/integrations/AdobeExpressAdapter.ts` |
| `ADOBE_EXPRESS_REDIRECT_URI` | `src/lib/integrations/AdobeExpressAdapter.ts` |
| `ADOBE_REDIRECT_URI` | `src/app/api/storage/download/route.ts` |

### AI

> Add these values to your Vercel project under **Settings → Environment Variables**. Follow the provider documentation for credentials and redirect URIs.

| Variable | Referenced in |
| --- | --- |
| `AI_API_KEY` | `src/lib/config.ts` |
| `AI_CHAT_ENDPOINT` | `src/lib/config.ts` |
| `AI_DEFAULT_MODEL` | `src/lib/config.ts` |
| `AI_EMBEDDING_ENDPOINT` | `src/lib/config.ts` |
| `AI_EMBEDDING_MODEL` | `src/lib/config.ts` |

### AIRTABLE

> Generate Airtable API credentials and redirect URI for OAuth.

| Variable | Referenced in |
| --- | --- |
| `AIRTABLE_CALLBACK_URL` | `src/app/api/settings/connections/route.ts` |
| `AIRTABLE_CLIENT_ID` | `src/app/api/settings/connections/route.ts`<br />`src/app/api/storage/download/route.ts`<br />`src/lib/integrations/AirtableAdapter.ts` |
| `AIRTABLE_CLIENT_SECRET` | `src/app/api/storage/download/route.ts`<br />`src/lib/integrations/AirtableAdapter.ts` |
| `AIRTABLE_REDIRECT_URI` | `src/app/api/storage/download/route.ts`<br />`src/lib/integrations/AirtableAdapter.ts` |

### ANONYMOUS

> Add these values to your Vercel project under **Settings → Environment Variables**. Follow the provider documentation for credentials and redirect URIs.

| Variable | Referenced in |
| --- | --- |
| `ANONYMOUS_MODEL_ID` | `src/lib/rag/retrieval-engine.ts` |

### ANTHROPIC

> Add the Anthropic API key and default model configuration.

| Variable | Referenced in |
| --- | --- |
| `ANTHROPIC_API_KEY` | `src/app/api/ai/generate-content/route.ts`<br />`src/app/api/toolkit/route.ts`<br />`src/environment.ts`<br />`src/lib/ai/factory.ts`<br />`src/lib/ai/models/tiered-model-router.ts`<br />`src/lib/ai/providers/AIProviderFactory.ts`<br />`src/lib/ai/providers/AnthropicProvider.ts`<br />`src/lib/ai/providers/ClaudeProvider.ts`<br />`src/lib/ai/toolkit/ai-toolkit-factory.ts`<br />`src/lib/rag/retrieval-engine.ts` |
| `ANTHROPIC_MODEL` | `src/lib/ai/toolkit/ai-toolkit-factory.ts` |

### API

> Add these values to your Vercel project under **Settings → Environment Variables**. Follow the provider documentation for credentials and redirect URIs.

| Variable | Referenced in |
| --- | --- |
| `API_URL` | `src/environment.ts` |

### APPLE

> Add these values to your Vercel project under **Settings → Environment Variables**. Follow the provider documentation for credentials and redirect URIs.

| Variable | Referenced in |
| --- | --- |
| `APPLE_CLIENT_ID` | `src/lib/auth/social-auth.ts` |
| `APPLE_CLIENT_SECRET` | `src/lib/auth/social-auth.ts` |

### ASANA

> Configure an Asana developer app and supply the OAuth client ID, secret, and redirect URI.

| Variable | Referenced in |
| --- | --- |
| `ASANA_CALLBACK_URL` | `src/app/api/settings/connections/route.ts` |
| `ASANA_CLIENT_ID` | `src/app/api/settings/connections/route.ts` |

### AZURE_OPENAI

> Provision an Azure OpenAI resource and supply the endpoint, deployment name/model, and API key.

| Variable | Referenced in |
| --- | --- |
| `AZURE_OPENAI_API_KEY` | `src/lib/ai/toolkit/ai-toolkit-factory.ts` |
| `AZURE_OPENAI_ENDPOINT` | `src/lib/ai/toolkit/ai-toolkit-factory.ts` |
| `AZURE_OPENAI_MODEL` | `src/lib/ai/toolkit/ai-toolkit-factory.ts` |

### BILLING

> Add these values to your Vercel project under **Settings → Environment Variables**. Follow the provider documentation for credentials and redirect URIs.

| Variable | Referenced in |
| --- | --- |
| `BILLING_EMAIL` | `src/lib/notifications/unified-email-service.ts` |

### CANVA

> Add these values to your Vercel project under **Settings → Environment Variables**. Follow the provider documentation for credentials and redirect URIs.

| Variable | Referenced in |
| --- | --- |
| `CANVA_CALLBACK_URL` | `src/app/api/settings/connections/route.ts` |
| `CANVA_CLIENT_ID` | `src/app/api/settings/connections/route.ts`<br />`src/app/api/storage/download/route.ts`<br />`src/lib/integrations/CanvaAdapter.ts` |
| `CANVA_CLIENT_SECRET` | `src/app/api/storage/download/route.ts`<br />`src/lib/integrations/CanvaAdapter.ts` |
| `CANVA_REDIRECT_URI` | `src/app/api/storage/download/route.ts`<br />`src/lib/integrations/CanvaAdapter.ts` |

### CDN

> Add these values to your Vercel project under **Settings → Environment Variables**. Follow the provider documentation for credentials and redirect URIs.

| Variable | Referenced in |
| --- | --- |
| `CDN_URL` | `src/lib/media/MediaService.ts` |

### CHAT

> Add these values to your Vercel project under **Settings → Environment Variables**. Follow the provider documentation for credentials and redirect URIs.

| Variable | Referenced in |
| --- | --- |
| `CHAT_MODEL` | `src/environment.ts` |
| `CHAT_PROVIDER` | `src/environment.ts` |

### CLICKUP

> Create a ClickUp app and provide OAuth client ID, client secret, and redirect URI.

| Variable | Referenced in |
| --- | --- |
| `CLICKUP_CALLBACK_URL` | `src/app/api/settings/connections/route.ts` |
| `CLICKUP_CLIENT_ID` | `src/app/api/settings/connections/route.ts` |

### CLOUDINARY

> Add these values to your Vercel project under **Settings → Environment Variables**. Follow the provider documentation for credentials and redirect URIs.

| Variable | Referenced in |
| --- | --- |
| `CLOUDINARY_API_KEY` | `src/app/api/upload/avatar/route.ts` |
| `CLOUDINARY_API_SECRET` | `src/app/api/upload/avatar/route.ts` |
| `CLOUDINARY_CLOUD_NAME` | `src/app/api/upload/avatar/route.ts` |
| `CLOUDINARY_UPLOAD_PRESET` | `src/app/api/upload/avatar/route.ts` |

### COMPANY

> Add these values to your Vercel project under **Settings → Environment Variables**. Follow the provider documentation for credentials and redirect URIs.

| Variable | Referenced in |
| --- | --- |
| `COMPANY_NAME` | `src/lib/notifications/careers.ts` |

### CREATOR

> Add these values to your Vercel project under **Settings → Environment Variables**. Follow the provider documentation for credentials and redirect URIs.

| Variable | Referenced in |
| --- | --- |
| `CREATOR_MODEL_ID` | `src/lib/rag/retrieval-engine.ts` |

### CRM

> Add these values to your Vercel project under **Settings → Environment Variables**. Follow the provider documentation for credentials and redirect URIs.

| Variable | Referenced in |
| --- | --- |
| `CRM_API_KEY` | `src/lib/notifications/integrations.ts` |
| `CRM_API_URL` | `src/lib/notifications/integrations.ts` |
| `CRM_PROVIDER` | `src/lib/notifications/integrations.ts` |

### CRON

> Add these values to your Vercel project under **Settings → Environment Variables**. Follow the provider documentation for credentials and redirect URIs.

| Variable | Referenced in |
| --- | --- |
| `CRON_API_KEY` | `src/app/api/cron/billing-universal/route.ts` |
| `CRON_SECRET` | `src/app/api/cron/token-refresh/route.ts` |

### DATADOG

> Add these values to your Vercel project under **Settings → Environment Variables**. Follow the provider documentation for credentials and redirect URIs.

| Variable | Referenced in |
| --- | --- |
| `DATADOG_API_KEY` | `src/lib/logging/logger.ts` |
| `DATADOG_APP_KEY` | `src/lib/logging/logger.ts` |

### DEFAULT

> Add these values to your Vercel project under **Settings → Environment Variables**. Follow the provider documentation for credentials and redirect URIs.

| Variable | Referenced in |
| --- | --- |
| `DEFAULT_AI_MODEL` | `src/lib/ai/providers/AIProviderFactory.ts`<br />`src/lib/ai/toolkit/ai-toolkit-factory.ts` |
| `DEFAULT_AI_PROVIDER` | `src/environment.ts`<br />`src/lib/ai/providers/AIProviderFactory.ts`<br />`src/lib/ai/toolkit/ai-toolkit-factory.ts` |
| `DEFAULT_CLAUDE_MODEL` | `src/environment.ts` |
| `DEFAULT_GEMINI_MODEL` | `src/environment.ts` |
| `DEFAULT_MODEL_ID` | `src/environment.ts` |
| `DEFAULT_OPENAI_MODEL` | `src/environment.ts` |

### DROPBOX

> Register a Dropbox application and set the client ID/secret and redirect URI.

| Variable | Referenced in |
| --- | --- |
| `DROPBOX_APP_KEY` | `src/app/api/storage/download/route.ts` |
| `DROPBOX_APP_SECRET` | `src/app/api/storage/download/route.ts` |
| `DROPBOX_CALLBACK_URL` | `src/app/api/settings/connections/route.ts` |
| `DROPBOX_CLIENT_ID` | `src/app/api/settings/connections/route.ts`<br />`src/lib/integrations/DropboxAdapter.ts` |
| `DROPBOX_CLIENT_SECRET` | `src/lib/integrations/DropboxAdapter.ts` |
| `DROPBOX_REDIRECT_URI` | `src/app/api/storage/download/route.ts`<br />`src/lib/integrations/DropboxAdapter.ts` |

### DYNAMICS

> Add these values to your Vercel project under **Settings → Environment Variables**. Follow the provider documentation for credentials and redirect URIs.

| Variable | Referenced in |
| --- | --- |
| `DYNAMICS_CLIENT_ID` | `src/app/api/platforms/callback/crm/route.ts`<br />`src/lib/crm/adapters/DynamicsAdapter.ts`<br />`src/lib/integrations/DynamicsCRMAdapter.ts` |
| `DYNAMICS_CLIENT_SECRET` | `src/app/api/platforms/callback/crm/route.ts`<br />`src/lib/crm/adapters/DynamicsAdapter.ts`<br />`src/lib/integrations/DynamicsCRMAdapter.ts` |
| `DYNAMICS_REDIRECT_URI` | `src/lib/crm/adapters/DynamicsAdapter.ts`<br />`src/lib/integrations/DynamicsCRMAdapter.ts` |
| `DYNAMICS_RESOURCE` | `src/lib/crm/adapters/DynamicsAdapter.ts` |
| `DYNAMICS_TENANT_ID` | `src/lib/crm/adapters/DynamicsAdapter.ts`<br />`src/lib/integrations/DynamicsCRMAdapter.ts` |

### EMAIL

> Review email rate limits and contact addresses. Adjust values to match your support/sales workflow.

| Variable | Referenced in |
| --- | --- |
| `EMAIL_ADMIN_ALERTS` | `src/lib/subscription/EnterpriseQuoteService.ts` |
| `EMAIL_DEV_MODE` | `src/lib/notifications/test-email.ts` |
| `EMAIL_DEV_RECIPIENT` | `src/lib/notifications/test-email.ts` |
| `EMAIL_ENTERPRISE_CUSTOMER_SUPPORT` | `src/lib/subscription/EnterpriseQuoteService.ts` |
| `EMAIL_INTERNAL_TEAM_NOTIFICATIONS` | `src/lib/subscription/EnterpriseQuoteService.ts` |
| `EMAIL_RATE_LIMIT_PER_MINUTE` | `src/lib/notifications/test-email.ts` |
| `EMAIL_SALES_MANAGEMENT` | `src/lib/subscription/EnterpriseQuoteService.ts` |
| `EMAIL_SALES_REP_DOMAIN` | `src/lib/subscription/EnterpriseQuoteService.ts` |

### EMBEDDING

> Add these values to your Vercel project under **Settings → Environment Variables**. Follow the provider documentation for credentials and redirect URIs.

| Variable | Referenced in |
| --- | --- |
| `EMBEDDING_MODEL` | `src/environment.ts` |
| `EMBEDDING_PROVIDER` | `src/environment.ts` |

### ENTERPRISE

> Add these values to your Vercel project under **Settings → Environment Variables**. Follow the provider documentation for credentials and redirect URIs.

| Variable | Referenced in |
| --- | --- |
| `ENTERPRISE_MODEL_ID` | `src/lib/rag/retrieval-engine.ts` |
| `ENTERPRISE_SALES_EMAIL` | `src/lib/notifications/email.ts`<br />`src/lib/subscription/EnterpriseQuoteService.ts` |
| `ENTERPRISE_SEAT_PRICE_ID` | `src/environment.ts` |
| `ENTERPRISE_SUPPORT_EMAIL` | `src/lib/subscription/EnterpriseQuoteService.ts` |

### FACEBOOK

> Create a Meta developer app and configure the app ID, secret, redirect URI, and webhook verification token.

| Variable | Referenced in |
| --- | --- |
| `FACEBOOK_API_URL` | `src/app/api/settings/connections/route.ts` |
| `FACEBOOK_APP_ID` | `src/app/api/settings/connections/route.ts`<br />`src/lib/platforms/factory.ts` |
| `FACEBOOK_APP_SECRET` | `src/app/api/settings/connections/route.ts`<br />`src/app/api/webhooks/facebook/route.ts`<br />`src/lib/platforms/factory.ts` |
| `FACEBOOK_CALLBACK_URL` | `src/app/api/settings/connections/route.ts`<br />`src/lib/platforms/factory.ts` |
| `FACEBOOK_CLIENT_ID` | `src/lib/platforms/adapters/FacebookAdapter.ts`<br />`src/lib/platforms/adapters/InstagramAdapter.ts` |
| `FACEBOOK_CLIENT_SECRET` | `src/lib/platforms/adapters/FacebookAdapter.ts`<br />`src/lib/platforms/adapters/InstagramAdapter.ts` |
| `FACEBOOK_PAGE_ACCESS_TOKEN` | `src/app/api/webhooks/manage/route.ts` |
| `FACEBOOK_WEBHOOK_VERIFY_TOKEN` | `src/app/api/webhooks/facebook/route.ts`<br />`src/app/api/webhooks/manage/route.ts` |

### FIREBASE

> Provide the remaining Firebase configuration fields (database URL, storage bucket, etc.) from the Firebase project settings.

| Variable | Referenced in |
| --- | --- |
| `FIREBASE_CLIENT_EMAIL` | `scripts/compiled/migrate-organization-roles.js`<br />`src/lib/firebase/admin.ts` |
| `FIREBASE_PRIVATE_KEY` | `scripts/compiled/migrate-organization-roles.js`<br />`src/lib/firebase/admin.ts` |
| `FIREBASE_SERVICE_ACCOUNT` | `src/lib/database/firestore.ts` |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | `src/app/api/upload/document/route.ts` |

### FIREBASE_ADMIN

> Generate a Firebase service account (JSON) for server-side access and load the credentials into the matching environment variables. Remember to escape new lines in the private key.

| Variable | Referenced in |
| --- | --- |
| `FIREBASE_ADMIN_STORAGE_BUCKET` | `src/lib/firebase/admin.ts` |

### FORCE

> Add these values to your Vercel project under **Settings → Environment Variables**. Follow the provider documentation for credentials and redirect URIs.

| Variable | Referenced in |
| --- | --- |
| `FORCE_SEED` | `scripts/deploy-seed.js` |

### GCS

> Add these values to your Vercel project under **Settings → Environment Variables**. Follow the provider documentation for credentials and redirect URIs.

| Variable | Referenced in |
| --- | --- |
| `GCS_BUCKET_NAME` | `src/app/api/content/media/edit/route.ts`<br />`src/app/api/content/media/route.ts` |

### GIPHY

> Add these values to your Vercel project under **Settings → Environment Variables**. Follow the provider documentation for credentials and redirect URIs.

| Variable | Referenced in |
| --- | --- |
| `GIPHY_API_KEY` | `src/lib/integrations/GiphyAdapter.ts` |

### GOOGLE

> Configure Google Cloud OAuth or Generative AI credentials as referenced. Supply client IDs, secrets, API keys, and redirect URIs.

| Variable | Referenced in |
| --- | --- |
| `GOOGLE_AI_API_KEY` | `src/app/api/ai/generate-content/route.ts`<br />`src/app/api/toolkit/route.ts`<br />`src/lib/ai/factory.ts`<br />`src/lib/ai/models/tiered-model-router.ts`<br />`src/lib/ai/providers/AIProviderFactory.ts`<br />`src/lib/ai/providers/GoogleAIProvider.ts`<br />`src/lib/ai/toolkit/ai-toolkit-factory.ts`<br />`src/lib/rag/retrieval-engine.ts` |
| `GOOGLE_AI_MODEL` | `src/lib/ai/toolkit/ai-toolkit-factory.ts` |
| `GOOGLE_ANALYTICS_CALLBACK_URL` | `src/app/api/settings/connections/route.ts` |
| `GOOGLE_APPLICATION_CREDENTIALS` | `src/lib/media/MediaService.ts` |
| `GOOGLE_CLIENT_ID` | `src/app/api/content/todos/sync/route.ts`<br />`src/app/api/settings/connections/route.ts`<br />`src/app/api/storage/download/route.ts`<br />`src/lib/auth.ts`<br />`src/lib/auth/social-auth.ts`<br />`src/lib/integrations/GoogleDriveAdapter.ts` |
| `GOOGLE_CLIENT_SECRET` | `src/app/api/content/todos/sync/route.ts`<br />`src/app/api/settings/connections/route.ts`<br />`src/app/api/storage/download/route.ts`<br />`src/lib/auth.ts`<br />`src/lib/auth/social-auth.ts`<br />`src/lib/integrations/GoogleDriveAdapter.ts` |
| `GOOGLE_CLOUD_PROJECT_ID` | `src/environment.ts` |
| `GOOGLE_DRIVE_CALLBACK_URL` | `src/app/api/settings/connections/route.ts` |
| `GOOGLE_PROJECT_ID` | `src/lib/media/MediaService.ts` |
| `GOOGLE_REDIRECT_URI` | `src/app/api/storage/download/route.ts`<br />`src/lib/integrations/GoogleDriveAdapter.ts` |

### HOSTNAME

> Add these values to your Vercel project under **Settings → Environment Variables**. Follow the provider documentation for credentials and redirect URIs.

| Variable | Referenced in |
| --- | --- |
| `HOSTNAME` | `src/lib/logging/logger.ts` |

### HUBSPOT

> Configure HubSpot OAuth credentials and redirect URI if CRM sync is enabled.

| Variable | Referenced in |
| --- | --- |
| `HUBSPOT_API_URL` | `src/lib/crm/adapters/HubSpotAdapter.ts` |
| `HUBSPOT_CALLBACK_URL` | `src/app/api/settings/connections/route.ts` |
| `HUBSPOT_CLIENT_ID` | `src/app/api/platforms/callback/crm/route.ts`<br />`src/app/api/settings/connections/route.ts`<br />`src/lib/crm/adapters/HubSpotAdapter.ts`<br />`src/lib/integrations/HubspotAdapter.ts`<br />`src/lib/integrations/TokenRefreshService.ts` |
| `HUBSPOT_CLIENT_SECRET` | `src/app/api/platforms/callback/crm/route.ts`<br />`src/lib/crm/adapters/HubSpotAdapter.ts`<br />`src/lib/integrations/HubspotAdapter.ts`<br />`src/lib/integrations/TokenRefreshService.ts` |
| `HUBSPOT_PIPELINE_ID` | `src/lib/notifications/integrations.ts` |
| `HUBSPOT_PIPELINE_STAGE_ID` | `src/lib/notifications/integrations.ts` |
| `HUBSPOT_PORTAL_ID` | `src/lib/notifications/integrations.ts` |
| `HUBSPOT_REDIRECT_URI` | `src/lib/crm/adapters/HubSpotAdapter.ts`<br />`src/lib/integrations/HubspotAdapter.ts`<br />`src/lib/integrations/TokenRefreshService.ts` |
| `HUBSPOT_SCOPES` | `src/lib/crm/adapters/HubSpotAdapter.ts` |

### IMAGE

> Add these values to your Vercel project under **Settings → Environment Variables**. Follow the provider documentation for credentials and redirect URIs.

| Variable | Referenced in |
| --- | --- |
| `IMAGE_MODEL` | `src/environment.ts` |
| `IMAGE_PROVIDER` | `src/environment.ts` |

### INFLUENCER

> Add these values to your Vercel project under **Settings → Environment Variables**. Follow the provider documentation for credentials and redirect URIs.

| Variable | Referenced in |
| --- | --- |
| `INFLUENCER_MODEL_ID` | `src/lib/rag/retrieval-engine.ts` |

### INSTAGRAM

> Add these values to your Vercel project under **Settings → Environment Variables**. Follow the provider documentation for credentials and redirect URIs.

| Variable | Referenced in |
| --- | --- |
| `INSTAGRAM_CALLBACK_URL` | `src/app/api/settings/connections/route.ts`<br />`src/lib/platforms/factory.ts` |
| `INSTAGRAM_CLIENT_ID` | `src/lib/platforms/adapters/ThreadsAdapter.ts`<br />`src/lib/platforms/factory.ts` |
| `INSTAGRAM_CLIENT_SECRET` | `src/lib/platforms/adapters/ThreadsAdapter.ts`<br />`src/lib/platforms/factory.ts` |

### INTERNAL

> Add these values to your Vercel project under **Settings → Environment Variables**. Follow the provider documentation for credentials and redirect URIs.

| Variable | Referenced in |
| --- | --- |
| `INTERNAL_API_KEY` | `src/app/api/support/tickets/auto-response/route.ts` |

### IRISYNC

> Add these values to your Vercel project under **Settings → Environment Variables**. Follow the provider documentation for credentials and redirect URIs.

| Variable | Referenced in |
| --- | --- |
| `IRISYNC_WEBHOOK_SECRET` | `src/app/(support)/documentation/category/api-guides/webhooks/page.tsx` |

### JWT

> Add these values to your Vercel project under **Settings → Environment Variables**. Follow the provider documentation for credentials and redirect URIs.

| Variable | Referenced in |
| --- | --- |
| `JWT_REFRESH_SECRET` | `src/lib/auth/auth-service.ts` |
| `JWT_SECRET` | `src/lib/auth/auth-service.ts`<br />`src/lib/auth/social-auth.ts`<br />`src/lib/auth/token.ts` |

### LINKEDIN

> Register a LinkedIn developer application and configure OAuth client ID, secret, and redirect URI.

| Variable | Referenced in |
| --- | --- |
| `LINKEDIN_CALLBACK_URL` | `src/app/api/settings/connections/route.ts` |
| `LINKEDIN_CLIENT_ID` | `src/app/api/settings/connections/route.ts`<br />`src/lib/platforms/adapters/LinkedInAdapter.ts` |
| `LINKEDIN_CLIENT_SECRET` | `src/app/api/settings/connections/route.ts`<br />`src/lib/platforms/adapters/LinkedInAdapter.ts` |
| `LINKEDIN_COMMUNITY_CALLBACK_URL` | `src/lib/platforms/factory.ts` |
| `LINKEDIN_COMMUNITY_CLIENT_ID` | `src/lib/platforms/factory.ts` |
| `LINKEDIN_COMMUNITY_CLIENT_SECRET` | `src/lib/platforms/factory.ts` |
| `LINKEDIN_CORE_CALLBACK_URL` | `src/app/api/content/linkedin-social-sync/route.ts`<br />`src/lib/content/SocialInboxService.ts`<br />`src/lib/content/UnifiedSocialInboxManager.ts`<br />`src/lib/platforms/factory.ts` |
| `LINKEDIN_CORE_CLIENT_ID` | `src/app/api/content/linkedin-social-sync/route.ts`<br />`src/lib/content/SocialInboxService.ts`<br />`src/lib/content/UnifiedSocialInboxManager.ts`<br />`src/lib/platforms/factory.ts` |
| `LINKEDIN_CORE_CLIENT_SECRET` | `src/app/api/content/linkedin-social-sync/route.ts`<br />`src/lib/content/SocialInboxService.ts`<br />`src/lib/content/UnifiedSocialInboxManager.ts`<br />`src/lib/platforms/factory.ts` |
| `LINKEDIN_LIVE_CALLBACK_URL` | `src/lib/platforms/factory.ts` |
| `LINKEDIN_LIVE_CLIENT_ID` | `src/lib/platforms/factory.ts` |
| `LINKEDIN_LIVE_CLIENT_SECRET` | `src/lib/platforms/factory.ts` |
| `LINKEDIN_REST_API_URL` | `src/app/api/content/linkedin-social-sync/route.ts`<br />`src/lib/content/SocialInboxService.ts`<br />`src/lib/content/UnifiedSocialInboxManager.ts` |
| `LINKEDIN_REST_API_VERSION` | `src/lib/platforms/providers/LinkedInProvider.ts` |
| `LINKEDIN_WEBHOOK_SECRET` | `src/app/api/webhooks/linkedin/route.ts` |

### MAILCHIMP

> Add these values to your Vercel project under **Settings → Environment Variables**. Follow the provider documentation for credentials and redirect URIs.

| Variable | Referenced in |
| --- | --- |
| `MAILCHIMP_API_KEY` | `src/app/api/settings/team/invite/route.ts`<br />`src/app/api/settings/team/route.ts` |

### MAKE

> Add these values to your Vercel project under **Settings → Environment Variables**. Follow the provider documentation for credentials and redirect URIs.

| Variable | Referenced in |
| --- | --- |
| `MAKE_CALLBACK_URL` | `src/app/api/settings/connections/route.ts` |
| `MAKE_CLIENT_ID` | `src/app/api/settings/connections/route.ts` |

### MASTODON

> Add these values to your Vercel project under **Settings → Environment Variables**. Follow the provider documentation for credentials and redirect URIs.

| Variable | Referenced in |
| --- | --- |
| `MASTODON_AUTH_URL` | `src/app/api/settings/connections/route.ts` |
| `MASTODON_CALLBACK_URL` | `src/app/api/settings/connections/route.ts`<br />`src/lib/platforms/factory.ts` |
| `MASTODON_CLIENT_ID` | `src/app/api/settings/connections/route.ts`<br />`src/lib/content/MastodonSocialInboxAdapter.ts`<br />`src/lib/content/SocialInboxService.ts`<br />`src/lib/content/UnifiedSocialInboxManager.ts`<br />`src/lib/platforms/adapters/MastodonAdapter.ts`<br />`src/lib/platforms/factory.ts`<br />`src/lib/platforms/providers/MastodonProvider.ts` |
| `MASTODON_CLIENT_SECRET` | `src/lib/content/MastodonSocialInboxAdapter.ts`<br />`src/lib/content/SocialInboxService.ts`<br />`src/lib/content/UnifiedSocialInboxManager.ts`<br />`src/lib/platforms/adapters/MastodonAdapter.ts`<br />`src/lib/platforms/factory.ts`<br />`src/lib/platforms/providers/MastodonProvider.ts` |
| `MASTODON_DEFAULT_SERVER` | `src/lib/platforms/adapters/MastodonAdapter.ts` |
| `MASTODON_INSTANCE_URL` | `src/lib/platforms/adapters/MastodonAdapter.ts` |
| `MASTODON_SERVER_URL` | `src/lib/platforms/factory.ts` |

### MICROSOFT

> Register an Azure AD application for Microsoft integrations (Graph/Outlook) and configure the client ID, secret, tenant ID, and redirect URIs.

| Variable | Referenced in |
| --- | --- |
| `MICROSOFT_CLIENT_ID` | `src/app/api/content/todos/sync/route.ts`<br />`src/app/api/settings/connections/route.ts`<br />`src/app/api/storage/download/route.ts` |
| `MICROSOFT_CLIENT_SECRET` | `src/app/api/content/todos/sync/route.ts`<br />`src/app/api/storage/download/route.ts` |
| `MICROSOFT_DYNAMICS_CALLBACK_URL` | `src/app/api/settings/connections/route.ts` |
| `MICROSOFT_DYNAMICS_CLIENT_ID` | `src/app/api/settings/connections/route.ts` |
| `MICROSOFT_REDIRECT_URI` | `src/app/api/storage/download/route.ts` |
| `MICROSOFT_TEAMS_CALLBACK_URL` | `src/app/api/settings/connections/route.ts` |
| `MICROSOFT_TEAMS_CLIENT_ID` | `src/app/api/settings/connections/route.ts` |

### MONDAY

> Add these values to your Vercel project under **Settings → Environment Variables**. Follow the provider documentation for credentials and redirect URIs.

| Variable | Referenced in |
| --- | --- |
| `MONDAY_CALLBACK_URL` | `src/app/api/settings/connections/route.ts` |
| `MONDAY_CLIENT_ID` | `src/app/api/settings/connections/route.ts` |

### NEXT

> Add these values to your Vercel project under **Settings → Environment Variables**. Follow the provider documentation for credentials and redirect URIs.

| Variable | Referenced in |
| --- | --- |
| `NEXT_PUBLIC_ANALYTICS_ENDPOINT` | `src/lib/analytics/index.ts` |
| `NEXT_PUBLIC_API_URL` | `src/lib/api/apiClient.ts`<br />`src/lib/utils/api-client.ts` |
| `NEXT_PUBLIC_BASE_URL` | `src/app/api/support/tickets/route.ts`<br />`src/lib/analytics/reporting/scheduler.ts`<br />`src/lib/billing/stripe.ts`<br />`src/lib/notifications/email.ts`<br />`src/lib/notifications/integrations.ts` |
| `NEXT_PUBLIC_CALENDAR_LINK` | `src/app/(careers)/careers/applications/[id]/page.tsx` |
| `NEXT_PUBLIC_DASHBOARD_CALLBACK_PATH` | `src/app/platforms/callback/page.tsx` |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | `src/lib/analytics/index.ts` |
| `NEXT_PUBLIC_GOOGLE_VERIFICATION` | `src/app/layout.tsx` |
| `NEXT_PUBLIC_META_PIXEL_ID` | `src/lib/analytics/events/tracker.ts`<br />`src/lib/analytics/integration/meta-pixel.ts` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `src/app/(dashboard)/dashboard/settings/billing/page.tsx`<br />`src/environment.ts` |
| `NEXT_PUBLIC_USE_FIREBASE_EMULATOR` | `src/lib/firebase/client.ts` |

### NEXT_PUBLIC_FIREBASE

> From the Firebase console create a web app and copy the client configuration values (API key, project ID, etc.).

| Variable | Referenced in |
| --- | --- |
| `NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST` | `src/lib/firebase/client.ts` |

### NOTION

> Create a Notion integration and provide API key/database IDs for content sync.

| Variable | Referenced in |
| --- | --- |
| `NOTION_CALLBACK_URL` | `src/app/api/settings/connections/route.ts` |
| `NOTION_CLIENT_ID` | `src/app/api/settings/connections/route.ts`<br />`src/app/api/storage/download/route.ts`<br />`src/lib/integrations/NotionAdapter.ts` |
| `NOTION_CLIENT_SECRET` | `src/app/api/storage/download/route.ts`<br />`src/lib/integrations/NotionAdapter.ts` |
| `NOTION_REDIRECT_URI` | `src/app/api/storage/download/route.ts`<br />`src/lib/integrations/NotionAdapter.ts` |

### ONEDRIVE

> Add these values to your Vercel project under **Settings → Environment Variables**. Follow the provider documentation for credentials and redirect URIs.

| Variable | Referenced in |
| --- | --- |
| `ONEDRIVE_CALLBACK_URL` | `src/app/api/settings/connections/route.ts` |
| `ONEDRIVE_CLIENT_ID` | `src/lib/integrations/OneDriveAdapter.ts` |
| `ONEDRIVE_CLIENT_SECRET` | `src/lib/integrations/OneDriveAdapter.ts` |
| `ONEDRIVE_REDIRECT_URI` | `src/lib/integrations/OneDriveAdapter.ts` |

### OPENAI

> Add an OpenAI API key (or Azure OpenAI if preferred) with access to the referenced models.

| Variable | Referenced in |
| --- | --- |
| `OPENAI_API_URL` | `src/app/api/ai/refine-content/route.ts` |
| `OPENAI_MODEL` | `src/lib/ai/toolkit/ai-toolkit-factory.ts` |

### PEXELS

> Add these values to your Vercel project under **Settings → Environment Variables**. Follow the provider documentation for credentials and redirect URIs.

| Variable | Referenced in |
| --- | --- |
| `PEXELS_API_KEY` | `src/lib/integrations/PexelsAdapter.ts` |

### PINECONE

> Provide Pinecone API credentials and environment to enable vector indexing.

| Variable | Referenced in |
| --- | --- |
| `PINECONE_API_KEY` | `src/lib/config.ts` |
| `PINECONE_ENVIRONMENT` | `src/lib/config.ts` |
| `PINECONE_INDEX` | `src/lib/config.ts` |
| `PINECONE_NAMESPACE` | `src/lib/config.ts` |

### PINTEREST

> Add these values to your Vercel project under **Settings → Environment Variables**. Follow the provider documentation for credentials and redirect URIs.

| Variable | Referenced in |
| --- | --- |
| `PINTEREST_CALLBACK_URL` | `src/app/api/settings/connections/route.ts` |
| `PINTEREST_CLIENT_ID` | `src/app/api/settings/connections/route.ts` |
| `PINTEREST_CLIENT_SECRET` | `src/app/api/settings/connections/route.ts` |

### PIPEDRIVE

> Add these values to your Vercel project under **Settings → Environment Variables**. Follow the provider documentation for credentials and redirect URIs.

| Variable | Referenced in |
| --- | --- |
| `PIPEDRIVE_API_URL` | `src/lib/crm/adapters/PipedriveAdapter.ts` |
| `PIPEDRIVE_CALLBACK_URL` | `src/app/api/settings/connections/route.ts` |
| `PIPEDRIVE_CLIENT_ID` | `src/app/api/platforms/callback/crm/route.ts`<br />`src/app/api/settings/connections/route.ts`<br />`src/lib/crm/adapters/PipedriveAdapter.ts`<br />`src/lib/integrations/PipedriveAdapter.ts`<br />`src/lib/integrations/TokenRefreshService.ts` |
| `PIPEDRIVE_CLIENT_SECRET` | `src/app/api/platforms/callback/crm/route.ts`<br />`src/lib/crm/adapters/PipedriveAdapter.ts`<br />`src/lib/integrations/PipedriveAdapter.ts`<br />`src/lib/integrations/TokenRefreshService.ts` |
| `PIPEDRIVE_REDIRECT_URI` | `src/lib/crm/adapters/PipedriveAdapter.ts`<br />`src/lib/integrations/PipedriveAdapter.ts`<br />`src/lib/integrations/TokenRefreshService.ts` |

### PIXABAY

> Add these values to your Vercel project under **Settings → Environment Variables**. Follow the provider documentation for credentials and redirect URIs.

| Variable | Referenced in |
| --- | --- |
| `PIXABAY_API_KEY` | `src/lib/integrations/PixabayAdapter.ts` |

### PLATFORM

> Add these values to your Vercel project under **Settings → Environment Variables**. Follow the provider documentation for credentials and redirect URIs.

| Variable | Referenced in |
| --- | --- |
| `PLATFORM_NAME_CLIENT_ID` | `src/lib/platforms/adapters/template/PlatformAdapterTemplate.ts` |
| `PLATFORM_NAME_CLIENT_SECRET` | `src/lib/platforms/adapters/template/PlatformAdapterTemplate.ts` |

### POSTMARK

> Add these values to your Vercel project under **Settings → Environment Variables**. Follow the provider documentation for credentials and redirect URIs.

| Variable | Referenced in |
| --- | --- |
| `POSTMARK_API_KEY` | `src/app/api/settings/team/invite/route.ts`<br />`src/app/api/settings/team/route.ts` |

### PRIMARY

> Add these values to your Vercel project under **Settings → Environment Variables**. Follow the provider documentation for credentials and redirect URIs.

| Variable | Referenced in |
| --- | --- |
| `PRIMARY_ENCRYPTION_KEY` | `src/lib/security/encryption.ts` |

### REDDIT

> Add these values to your Vercel project under **Settings → Environment Variables**. Follow the provider documentation for credentials and redirect URIs.

| Variable | Referenced in |
| --- | --- |
| `REDDIT_CALLBACK_URL` | `src/app/api/settings/connections/route.ts`<br />`src/lib/platforms/factory.ts` |
| `REDDIT_CLIENT_ID` | `src/app/api/settings/connections/route.ts`<br />`src/lib/content/RedditSocialInboxAdapter.ts`<br />`src/lib/content/SocialInboxService.ts`<br />`src/lib/content/UnifiedSocialInboxManager.ts`<br />`src/lib/platforms/adapters/RedditAdapter.ts`<br />`src/lib/platforms/factory.ts` |
| `REDDIT_CLIENT_SECRET` | `src/lib/content/RedditSocialInboxAdapter.ts`<br />`src/lib/content/SocialInboxService.ts`<br />`src/lib/content/UnifiedSocialInboxManager.ts`<br />`src/lib/platforms/adapters/RedditAdapter.ts`<br />`src/lib/platforms/factory.ts` |

### REDIS

> Supply the Redis connection URL or credentials for caching.

| Variable | Referenced in |
| --- | --- |
| `REDIS_HOST` | `src/lib/cache/redis-service.ts` |
| `REDIS_PASSWORD` | `src/environment.ts`<br />`src/lib/cache/redis-service.ts` |
| `REDIS_PORT` | `src/lib/cache/redis-service.ts` |
| `REDIS_URL` | `src/environment.ts`<br />`src/lib/cache/redis-service.ts` |

### SALES

> Add these values to your Vercel project under **Settings → Environment Variables**. Follow the provider documentation for credentials and redirect URIs.

| Variable | Referenced in |
| --- | --- |
| `SALES_NOTIFICATION_EMAIL` | `src/lib/notifications/email.ts` |

### SALESFORCE

> Add these values to your Vercel project under **Settings → Environment Variables**. Follow the provider documentation for credentials and redirect URIs.

| Variable | Referenced in |
| --- | --- |
| `SALESFORCE_API_VERSION` | `src/lib/crm/adapters/SalesforceAdapter.ts` |
| `SALESFORCE_CALLBACK_URL` | `src/app/api/settings/connections/route.ts` |
| `SALESFORCE_CLIENT_ID` | `src/app/api/platforms/callback/crm/route.ts`<br />`src/app/api/settings/connections/route.ts`<br />`src/lib/crm/adapters/SalesforceAdapter.ts`<br />`src/lib/integrations/SalesforceAdapter.ts`<br />`src/lib/integrations/TokenRefreshService.ts` |
| `SALESFORCE_CLIENT_SECRET` | `src/app/api/platforms/callback/crm/route.ts`<br />`src/lib/crm/adapters/SalesforceAdapter.ts`<br />`src/lib/integrations/SalesforceAdapter.ts`<br />`src/lib/integrations/TokenRefreshService.ts` |
| `SALESFORCE_INSTANCE_URL` | `src/lib/crm/adapters/SalesforceAdapter.ts`<br />`src/lib/notifications/integrations.ts` |
| `SALESFORCE_LOGIN_URL` | `src/lib/crm/adapters/SalesforceAdapter.ts` |
| `SALESFORCE_REDIRECT_URI` | `src/lib/crm/adapters/SalesforceAdapter.ts`<br />`src/lib/integrations/SalesforceAdapter.ts`<br />`src/lib/integrations/TokenRefreshService.ts` |

### SECONDARY

> Add these values to your Vercel project under **Settings → Environment Variables**. Follow the provider documentation for credentials and redirect URIs.

| Variable | Referenced in |
| --- | --- |
| `SECONDARY_ENCRYPTION_KEY` | `src/lib/security/encryption.ts` |

### SELFHOSTED

> Add these values to your Vercel project under **Settings → Environment Variables**. Follow the provider documentation for credentials and redirect URIs.

| Variable | Referenced in |
| --- | --- |
| `SELFHOSTED_AI_ENDPOINT` | `src/lib/ai/factory.ts` |
| `SELFHOSTED_AI_KEY` | `src/lib/ai/factory.ts` |

### SENDGRID

> Create a SendGrid API key and set `EMAIL_FROM` to a verified sender address.

| Variable | Referenced in |
| --- | --- |
| `SENDGRID_FROM_EMAIL` | `src/lib/notifications/unified-email-service.ts` |
| `SENDGRID_FROM_NAME` | `src/lib/notifications/unified-email-service.ts` |

### SENTRY

> Add these values to your Vercel project under **Settings → Environment Variables**. Follow the provider documentation for credentials and redirect URIs.

| Variable | Referenced in |
| --- | --- |
| `SENTRY_DSN` | `src/environment.ts` |

### SLACK

> Create a Slack app/bot and populate the OAuth token, signing secret, and app-level token.

| Variable | Referenced in |
| --- | --- |
| `SLACK_CALLBACK_URL` | `src/app/api/settings/connections/route.ts` |
| `SLACK_CHANNEL` | `src/lib/notifications/integrations.ts` |
| `SLACK_CLIENT_ID` | `src/app/api/settings/connections/route.ts`<br />`src/lib/platforms/adapters/SlackAdapter.ts` |
| `SLACK_CLIENT_SECRET` | `src/app/api/settings/connections/route.ts`<br />`src/lib/platforms/adapters/SlackAdapter.ts` |
| `SLACK_ICON_EMOJI` | `src/lib/notifications/integrations.ts` |
| `SLACK_USERNAME` | `src/lib/notifications/integrations.ts` |
| `SLACK_WEBHOOK_URL` | `src/lib/notifications/integrations.ts` |

### SMTP

> Add these values to your Vercel project under **Settings → Environment Variables**. Follow the provider documentation for credentials and redirect URIs.

| Variable | Referenced in |
| --- | --- |
| `SMTP_HOST` | `src/lib/notifications/unified-email-service.ts` |
| `SMTP_PASSWORD` | `src/lib/notifications/unified-email-service.ts` |
| `SMTP_PORT` | `src/lib/notifications/unified-email-service.ts` |
| `SMTP_SECURE` | `src/lib/notifications/unified-email-service.ts` |
| `SMTP_USER` | `src/lib/notifications/unified-email-service.ts` |

### STORAGE

> Add these values to your Vercel project under **Settings → Environment Variables**. Follow the provider documentation for credentials and redirect URIs.

| Variable | Referenced in |
| --- | --- |
| `STORAGE_BUCKET` | `src/lib/config.ts` |
| `STORAGE_BUCKET_NAME` | `src/lib/media/MediaService.ts` |

### STRIPE

> Create the required Stripe products/prices and copy the API keys, publishable key, webhook secret, and price IDs for each plan.

| Variable | Referenced in |
| --- | --- |
| `STRIPE_CREATOR_PRODUCT_ID` | `src/environment.ts` |
| `STRIPE_CREATOR_SEAT_PRICE_ID` | `src/app/api/billing/create-checkout-session/route.ts`<br />`src/app/api/settings/organization/seats/route.ts`<br />`src/environment.ts` |
| `STRIPE_CREATOR_SEAT_PRODUCT_ID` | `src/environment.ts` |
| `STRIPE_ENTERPRISE_PRODUCT_ID` | `src/environment.ts`<br />`src/lib/subscription/EnterpriseQuoteService.ts` |
| `STRIPE_ENTERPRISE_SEAT_PRICE_ID` | `src/app/api/billing/create-checkout-session/route.ts`<br />`src/app/api/settings/organization/seats/route.ts`<br />`src/environment.ts` |
| `STRIPE_ENTERPRISE_SEAT_PRODUCT_ID` | `src/environment.ts` |
| `STRIPE_INFLUENCER_PRODUCT_ID` | `src/environment.ts` |
| `STRIPE_INFLUENCER_SEAT_PRICE_ID` | `src/app/api/billing/create-checkout-session/route.ts`<br />`src/app/api/settings/organization/seats/route.ts`<br />`src/environment.ts` |
| `STRIPE_INFLUENCER_SEAT_PRODUCT_ID` | `src/environment.ts` |
| `STRIPE_PORTAL_CONFIGURATION_ID` | `src/app/api/billing/customer-portal/route.ts` |
| `STRIPE_TOKEN_PACKAGE_100_PRICE_ID` | `src/environment.ts` |
| `STRIPE_TOKEN_PACKAGE_100_PRODUCT_ID` | `src/environment.ts` |
| `STRIPE_TOKEN_PACKAGE_1000_PRICE_ID` | `src/environment.ts` |
| `STRIPE_TOKEN_PACKAGE_1000_PRODUCT_ID` | `src/environment.ts` |
| `STRIPE_TOKEN_PACKAGE_2000_PRICE_ID` | `src/environment.ts` |
| `STRIPE_TOKEN_PACKAGE_2000_PRODUCT_ID` | `src/environment.ts` |
| `STRIPE_TOKEN_PACKAGE_250_PRICE_ID` | `src/environment.ts` |
| `STRIPE_TOKEN_PACKAGE_250_PRODUCT_ID` | `src/environment.ts` |
| `STRIPE_TOKEN_PACKAGE_50_PRICE_ID` | `src/environment.ts` |
| `STRIPE_TOKEN_PACKAGE_50_PRODUCT_ID` | `src/environment.ts` |
| `STRIPE_TOKEN_PACKAGE_500_PRICE_ID` | `src/environment.ts` |
| `STRIPE_TOKEN_PACKAGE_500_PRODUCT_ID` | `src/environment.ts` |
| `STRIPE_TOKEN_PACKAGE_ENT_1000_PRICE_ID` | `src/environment.ts` |
| `STRIPE_TOKEN_PACKAGE_ENT_1000_PRODUCT_ID` | `src/environment.ts` |
| `STRIPE_TOKEN_PACKAGE_ENT_2000_PRICE_ID` | `src/environment.ts` |
| `STRIPE_TOKEN_PACKAGE_ENT_2000_PRODUCT_ID` | `src/environment.ts` |

### SUGARCRM

> Add these values to your Vercel project under **Settings → Environment Variables**. Follow the provider documentation for credentials and redirect URIs.

| Variable | Referenced in |
| --- | --- |
| `SUGARCRM_AUTH_URL` | `src/app/api/settings/connections/route.ts` |
| `SUGARCRM_BASE_URL` | `src/lib/crm/adapters/SugarCRMAdapter.ts` |
| `SUGARCRM_CALLBACK_URL` | `src/app/api/settings/connections/route.ts` |
| `SUGARCRM_CLIENT_ID` | `src/app/api/platforms/callback/crm/route.ts`<br />`src/app/api/settings/connections/route.ts`<br />`src/lib/crm/adapters/SugarCRMAdapter.ts`<br />`src/lib/integrations/SugarCRMAdapter.ts` |
| `SUGARCRM_CLIENT_SECRET` | `src/app/api/platforms/callback/crm/route.ts`<br />`src/lib/crm/adapters/SugarCRMAdapter.ts`<br />`src/lib/integrations/SugarCRMAdapter.ts` |
| `SUGARCRM_REDIRECT_URI` | `src/lib/crm/adapters/SugarCRMAdapter.ts`<br />`src/lib/integrations/SugarCRMAdapter.ts` |
| `SUGARCRM_URL` | `src/app/api/platforms/callback/crm/route.ts`<br />`src/lib/integrations/SugarCRMAdapter.ts` |

### TEXT

> Add these values to your Vercel project under **Settings → Environment Variables**. Follow the provider documentation for credentials and redirect URIs.

| Variable | Referenced in |
| --- | --- |
| `TEXT_GENERATION_MODEL` | `src/environment.ts` |
| `TEXT_GENERATION_PROVIDER` | `src/environment.ts` |

### THREADS

> Add these values to your Vercel project under **Settings → Environment Variables**. Follow the provider documentation for credentials and redirect URIs.

| Variable | Referenced in |
| --- | --- |
| `THREADS_CALLBACK_URL` | `src/app/api/settings/connections/route.ts` |

### TIKTOK

> Add these values to your Vercel project under **Settings → Environment Variables**. Follow the provider documentation for credentials and redirect URIs.

| Variable | Referenced in |
| --- | --- |
| `TIKTOK_CALLBACK_URL` | `src/app/api/settings/connections/route.ts`<br />`src/lib/platforms/factory.ts` |
| `TIKTOK_CLIENT_ID` | `src/app/api/settings/connections/route.ts` |
| `TIKTOK_CLIENT_KEY` | `src/lib/content/SocialInboxService.ts`<br />`src/lib/content/TikTokSocialInboxAdapter.ts`<br />`src/lib/content/UnifiedSocialInboxManager.ts`<br />`src/lib/platforms/adapters/TikTokAdapter.ts`<br />`src/lib/platforms/factory.ts` |
| `TIKTOK_CLIENT_SECRET` | `src/lib/content/SocialInboxService.ts`<br />`src/lib/content/TikTokSocialInboxAdapter.ts`<br />`src/lib/content/UnifiedSocialInboxManager.ts`<br />`src/lib/platforms/adapters/TikTokAdapter.ts`<br />`src/lib/platforms/factory.ts` |
| `TIKTOK_WEBHOOK_SECRET` | `src/app/api/webhooks/tiktok/route.ts` |

### TOKEN

> Add these values to your Vercel project under **Settings → Environment Variables**. Follow the provider documentation for credentials and redirect URIs.

| Variable | Referenced in |
| --- | --- |
| `TOKEN_ENCRYPTION_KEY` | `src/lib/platforms/auth/token-manager.ts` |

### TRELLO

> Add these values to your Vercel project under **Settings → Environment Variables**. Follow the provider documentation for credentials and redirect URIs.

| Variable | Referenced in |
| --- | --- |
| `TRELLO_CALLBACK_URL` | `src/app/api/settings/connections/route.ts` |
| `TRELLO_CLIENT_ID` | `src/app/api/settings/connections/route.ts` |

### TWITTER

> Create a Twitter/X developer app and configure API key, secret, and callback URL.

| Variable | Referenced in |
| --- | --- |
| `TWITTER_ACCESS_TOKEN` | `src/lib/platforms/factory.ts` |
| `TWITTER_ACCESS_TOKEN_SECRET` | `src/lib/platforms/factory.ts` |
| `TWITTER_API_KEY` | `src/app/api/content/twitter-social-sync/route.ts`<br />`src/app/api/settings/connections/route.ts`<br />`src/lib/content/SocialInboxService.ts`<br />`src/lib/content/UnifiedSocialInboxManager.ts`<br />`src/lib/platforms/adapters/TwitterAdapter.ts`<br />`src/lib/platforms/factory.ts` |
| `TWITTER_API_SCOPES` | `src/lib/platforms/factory.ts` |
| `TWITTER_API_SECRET` | `src/app/api/content/twitter-social-sync/route.ts`<br />`src/app/api/settings/connections/route.ts`<br />`src/lib/content/SocialInboxService.ts`<br />`src/lib/content/UnifiedSocialInboxManager.ts`<br />`src/lib/platforms/adapters/TwitterAdapter.ts`<br />`src/lib/platforms/factory.ts` |
| `TWITTER_API_TIER` | `src/app/api/content/twitter-social-sync/route.ts`<br />`src/app/api/debug/twitter-rate-limits/route.ts`<br />`src/lib/content/SocialInboxService.ts`<br />`src/lib/content/UnifiedSocialInboxManager.ts`<br />`src/lib/platforms/factory.ts` |
| `TWITTER_API_URL` | `src/lib/platforms/factory.ts` |
| `TWITTER_AUTH_URL` | `src/app/api/settings/connections/route.ts`<br />`src/lib/platforms/factory.ts` |
| `TWITTER_BEARER_TOKEN` | `src/app/api/content/twitter-social-sync/route.ts`<br />`src/app/api/webhooks/manage/route.ts`<br />`src/lib/analytics/SocialListeningService.ts`<br />`src/lib/content/SocialInboxService.ts`<br />`src/lib/content/UnifiedSocialInboxManager.ts`<br />`src/lib/platforms/factory.ts` |
| `TWITTER_CALLBACK_URL` | `src/app/api/content/twitter-social-sync/route.ts`<br />`src/app/api/settings/connections/route.ts`<br />`src/lib/content/SocialInboxService.ts`<br />`src/lib/content/UnifiedSocialInboxManager.ts`<br />`src/lib/platforms/factory.ts` |
| `TWITTER_TOKEN_URL` | `src/app/api/settings/connections/route.ts`<br />`src/lib/platforms/factory.ts` |
| `TWITTER_UPLOAD_API_URL` | `src/lib/platforms/factory.ts` |
| `TWITTER_WEBHOOK_SECRET` | `src/app/api/webhooks/twitter/route.ts` |

### UNSPLASH

> Add these values to your Vercel project under **Settings → Environment Variables**. Follow the provider documentation for credentials and redirect URIs.

| Variable | Referenced in |
| --- | --- |
| `UNSPLASH_ACCESS_KEY` | `src/lib/integrations/UnsplashAdapter.ts` |
| `UNSPLASH_CALLBACK_URL` | `src/lib/integrations/UnsplashAdapter.ts` |
| `UNSPLASH_SECRET_KEY` | `src/lib/integrations/UnsplashAdapter.ts` |

### VERCEL

> Add these values to your Vercel project under **Settings → Environment Variables**. Follow the provider documentation for credentials and redirect URIs.

| Variable | Referenced in |
| --- | --- |
| `VERCEL_URL` | `scripts/deploy-seed.js` |

### WORKFLOW

> Add these values to your Vercel project under **Settings → Environment Variables**. Follow the provider documentation for credentials and redirect URIs.

| Variable | Referenced in |
| --- | --- |
| `WORKFLOW_NAME_CLIENT_ID` | `src/lib/platforms/adapters/template/WorkflowAdapterTemplate.ts` |
| `WORKFLOW_NAME_CLIENT_SECRET` | `src/lib/platforms/adapters/template/WorkflowAdapterTemplate.ts` |

### YOUTUBE

> Add these values to your Vercel project under **Settings → Environment Variables**. Follow the provider documentation for credentials and redirect URIs.

| Variable | Referenced in |
| --- | --- |
| `YOUTUBE_API_KEY` | `src/lib/analytics/SocialListeningService.ts`<br />`src/lib/content/YouTubeSocialInboxAdapter.ts`<br />`src/lib/platforms/factory.ts` |
| `YOUTUBE_CALLBACK_URL` | `src/app/api/settings/connections/route.ts`<br />`src/lib/platforms/factory.ts` |
| `YOUTUBE_CLIENT_ID` | `src/lib/content/SocialInboxService.ts`<br />`src/lib/content/UnifiedSocialInboxManager.ts`<br />`src/lib/content/YouTubeSocialInboxAdapter.ts`<br />`src/lib/platforms/adapters/YouTubeAdapter.ts`<br />`src/lib/platforms/factory.ts` |
| `YOUTUBE_CLIENT_SECRET` | `src/lib/content/SocialInboxService.ts`<br />`src/lib/content/UnifiedSocialInboxManager.ts`<br />`src/lib/content/YouTubeSocialInboxAdapter.ts`<br />`src/lib/platforms/adapters/YouTubeAdapter.ts`<br />`src/lib/platforms/factory.ts` |
| `YOUTUBE_WEBHOOK_SECRET` | `src/app/api/webhooks/manage/route.ts`<br />`src/app/api/webhooks/youtube/route.ts` |

### ZAPIER

> Add these values to your Vercel project under **Settings → Environment Variables**. Follow the provider documentation for credentials and redirect URIs.

| Variable | Referenced in |
| --- | --- |
| `ZAPIER_CALLBACK_URL` | `src/app/api/settings/connections/route.ts` |
| `ZAPIER_CLIENT_ID` | `src/app/api/settings/connections/route.ts` |

### ZOHO

> Add Zoho credentials (client ID/secret) for CRM synchronization.

| Variable | Referenced in |
| --- | --- |
| `ZOHO_API_URL` | `src/lib/crm/adapters/ZohoAdapter.ts` |
| `ZOHO_AUTH_URL` | `src/lib/crm/adapters/ZohoAdapter.ts` |
| `ZOHO_CALLBACK_URL` | `src/app/api/settings/connections/route.ts` |
| `ZOHO_CLIENT_ID` | `src/app/api/platforms/callback/crm/route.ts`<br />`src/app/api/settings/connections/route.ts`<br />`src/lib/crm/adapters/ZohoAdapter.ts`<br />`src/lib/integrations/TokenRefreshService.ts`<br />`src/lib/integrations/ZohoCRMAdapter.ts` |
| `ZOHO_CLIENT_SECRET` | `src/app/api/platforms/callback/crm/route.ts`<br />`src/lib/crm/adapters/ZohoAdapter.ts`<br />`src/lib/integrations/TokenRefreshService.ts`<br />`src/lib/integrations/ZohoCRMAdapter.ts` |
| `ZOHO_ORG_ID` | `src/lib/notifications/integrations.ts` |
| `ZOHO_REDIRECT_URI` | `src/lib/crm/adapters/ZohoAdapter.ts`<br />`src/lib/integrations/TokenRefreshService.ts`<br />`src/lib/integrations/ZohoCRMAdapter.ts` |
| `ZOHO_REGION` | `src/lib/integrations/ZohoCRMAdapter.ts` |

---

### Variables already documented

The following environment variables are already covered by the existing templates and should still be added to Vercel before production deployment:

| Variable | Referenced in |
| --- | --- |
| `AI_MODEL_ID` | `src/app/api/ai/rag/generate-response/route.ts`<br />`src/app/api/ai/tools/chat/route.ts` |
| `EMAIL_FROM` | `src/app/api/settings/team/invite/route.ts`<br />`src/app/api/settings/team/route.ts`<br />`src/app/api/support/contact/route.ts`<br />`src/lib/notifications/unified-email-service.ts`<br />`src/lib/subscription/EnterpriseQuoteService.ts` |
| `EMAIL_PROVIDER` | `src/lib/notifications/test-email.ts` |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | `scripts/compiled/migrate-organization-roles.js`<br />`scripts/migrate-auth-users.js`<br />`src/app/api/debug/env/route.ts`<br />`src/environment.ts`<br />`src/lib/firebase/admin.ts`<br />`src/lib/firebase/config.ts` |
| `FIREBASE_ADMIN_PRIVATE_KEY` | `scripts/compiled/migrate-organization-roles.js`<br />`scripts/migrate-auth-users.js`<br />`src/app/api/debug/env/route.ts`<br />`src/environment.ts`<br />`src/lib/firebase/admin.ts`<br />`src/lib/firebase/config.ts` |
| `FIREBASE_ADMIN_PROJECT_ID` | `scripts/compiled/migrate-organization-roles.js`<br />`scripts/migrate-auth-users.js`<br />`src/app/api/debug/env/route.ts`<br />`src/environment.ts`<br />`src/lib/firebase/admin.ts`<br />`src/lib/firebase/config.ts` |
| `FIREBASE_PROJECT_ID` | `scripts/compiled/migrate-organization-roles.js`<br />`src/app/api/upload/document/route.ts`<br />`src/lib/database/firestore.ts`<br />`src/lib/firebase/admin.ts` |
| `FIREBASE_STORAGE_BUCKET` | `src/lib/firebase/admin.ts` |
| `GOOGLE_API_KEY` | `src/environment.ts`<br />`src/lib/ai/providers/GeminiProvider.ts` |
| `GOOGLE_CLOUD_STORAGE_BUCKET` | `src/environment.ts` |
| `NEXT_PUBLIC_APP_URL` | `scripts/deploy-seed.js`<br />`src/app/(careers)/layout.tsx`<br />`src/app/(marketing)/integrations/page.tsx`<br />`src/app/(marketing)/layout.tsx`<br />`src/app/api/auth/email-verification/route.ts`<br />`src/app/api/auth/resend-verification/route.ts`<br />`src/app/api/billing/create-checkout-session/route.ts`<br />`src/app/api/billing/customer-portal/route.ts`<br />`src/app/api/billing/token-purchase/route.ts`<br />`src/app/api/billing/trial-setup/route.ts`<br />`src/app/api/debug/env/route.ts`<br />`src/app/api/platforms/callback/crm/route.ts`<br />`src/app/api/platforms/callback/design/route.ts`<br />`src/app/api/referrals/route.ts`<br />`src/app/api/settings/profile/email/route.ts`<br />`src/app/api/settings/team/invite/route.ts`<br />`src/app/api/settings/team/route.ts`<br />`src/app/layout.tsx`<br />`src/environment.ts`<br />`src/lib/api/serverApi.ts`<br />`src/lib/content/MastodonSocialInboxAdapter.ts`<br />`src/lib/content/RedditSocialInboxAdapter.ts`<br />`src/lib/content/SocialInboxService.ts`<br />`src/lib/content/TikTokSocialInboxAdapter.ts`<br />`src/lib/content/UnifiedSocialInboxManager.ts`<br />`src/lib/content/YouTubeSocialInboxAdapter.ts`<br />`src/lib/notifications/email.ts`<br />`src/lib/notifications/unified-email-service.ts`<br />`src/lib/platforms/adapters/FacebookAdapter.ts`<br />`src/lib/platforms/adapters/InstagramAdapter.ts`<br />`src/lib/platforms/adapters/LinkedInAdapter.ts`<br />`src/lib/platforms/adapters/MastodonAdapter.ts`<br />`src/lib/platforms/adapters/RedditAdapter.ts`<br />`src/lib/platforms/adapters/SlackAdapter.ts`<br />`src/lib/platforms/adapters/ThreadsAdapter.ts`<br />`src/lib/platforms/adapters/TikTokAdapter.ts`<br />`src/lib/platforms/adapters/TwitterAdapter.ts`<br />`src/lib/platforms/adapters/YouTubeAdapter.ts`<br />`src/lib/platforms/adapters/template/PlatformAdapterTemplate.ts`<br />`src/lib/platforms/adapters/template/WorkflowAdapterTemplate.ts`<br />`src/lib/platforms/providers/MastodonProvider.ts`<br />`src/lib/subscription/TrialService.ts`<br />`src/lib/subscription/UniversalBillingService.ts`<br />`src/lib/tokens/token-purchase.ts` |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `scripts/initialize-firestore.js`<br />`src/app/api/debug/env/route.ts`<br />`src/environment.ts`<br />`src/lib/firebase/client.ts`<br />`src/lib/firebase/config.ts`<br />`src/lib/firebase/index.ts` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | `scripts/initialize-firestore.js`<br />`src/app/api/debug/env/route.ts`<br />`src/environment.ts`<br />`src/lib/firebase/client.ts`<br />`src/lib/firebase/config.ts`<br />`src/lib/firebase/index.ts` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `scripts/initialize-firestore.js`<br />`src/app/api/debug/env/route.ts`<br />`src/environment.ts`<br />`src/lib/firebase/client.ts`<br />`src/lib/firebase/config.ts`<br />`src/lib/firebase/index.ts` |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | `scripts/initialize-firestore.js`<br />`src/environment.ts`<br />`src/lib/firebase/config.ts`<br />`src/lib/firebase/index.ts` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `scripts/initialize-firestore.js`<br />`src/environment.ts`<br />`src/lib/firebase/config.ts`<br />`src/lib/firebase/index.ts` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `scripts/compiled/migrate-organization-roles.js`<br />`scripts/initialize-firestore.js`<br />`src/app/api/debug/env/route.ts`<br />`src/environment.ts`<br />`src/lib/firebase/admin.ts`<br />`src/lib/firebase/client.ts`<br />`src/lib/firebase/config.ts`<br />`src/lib/firebase/index.ts` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `scripts/initialize-firestore.js`<br />`src/app/api/debug/env/route.ts`<br />`src/app/api/upload/document/route.ts`<br />`src/environment.ts`<br />`src/lib/firebase/admin.ts`<br />`src/lib/firebase/config.ts`<br />`src/lib/firebase/index.ts` |
| `NEXTAUTH_SECRET` | `src/app/api/debug/env/route.ts`<br />`src/app/api/debug/user-token/route.ts`<br />`src/environment.ts`<br />`src/middleware.ts` |
| `NEXTAUTH_URL` | `src/app/api/auth/[...nextauth]/route.ts`<br />`src/app/api/auth/logout/route.ts`<br />`src/app/api/debug/env/route.ts`<br />`src/app/api/webhooks/manage/route.ts`<br />`src/environment.ts`<br />`src/lib/notifications/careers.ts`<br />`src/lib/platforms/factory.ts` |
| `NODE_ENV` | `scripts/performance-test.ts`<br />`src/app/api/auth/[...nextauth]/route.ts`<br />`src/app/api/auth/login/route.ts`<br />`src/app/api/content/calendar/route.ts`<br />`src/app/api/content/templates/route.ts`<br />`src/app/api/content/workflow/route.ts`<br />`src/app/api/debug/env/route.ts`<br />`src/app/api/debug/org-id-test/route.ts`<br />`src/app/api/debug/twitter-enhanced-features/route.ts`<br />`src/app/api/debug/twitter-rate-limits/route.ts`<br />`src/app/providers.tsx`<br />`src/lib/analytics/index.ts`<br />`src/lib/api/errorHandler.ts`<br />`src/lib/auth.ts`<br />`src/lib/auth/middleware.ts`<br />`src/lib/auth/token.ts`<br />`src/lib/content/workflow/WorkflowService.ts`<br />`src/lib/database/index.ts`<br />`src/lib/errors/errorMiddleware.ts`<br />`src/lib/firebase/client.ts`<br />`src/lib/firebase/config.ts`<br />`src/lib/logging/logger.ts`<br />`src/lib/notifications/unified-email-service.ts` |
| `OPENAI_API_KEY` | `src/app/api/ai/generate-content/route.ts`<br />`src/app/api/ai/media/auto-tag/route.ts`<br />`src/app/api/ai/refine-content/route.ts`<br />`src/app/api/ai/tools/chat/route.ts`<br />`src/app/api/toolkit/route.ts`<br />`src/environment.ts`<br />`src/lib/ai/factory.ts`<br />`src/lib/ai/models/tiered-model-router.ts`<br />`src/lib/ai/providers/AIProviderFactory.ts`<br />`src/lib/ai/providers/AnthropicProvider.ts`<br />`src/lib/ai/providers/OpenAIProvider.ts`<br />`src/lib/ai/toolkit/ai-toolkit-factory.ts`<br />`src/lib/config.ts`<br />`src/lib/rag/retrieval-engine.ts` |
| `SENDGRID_API_KEY` | `src/app/api/settings/team/invite/route.ts`<br />`src/app/api/settings/team/route.ts`<br />`src/lib/notifications/test-email.ts`<br />`src/lib/notifications/unified-email-service.ts` |
| `STRIPE_PRICE_CREATOR_ID` | `src/app/api/billing/create-checkout-session/route.ts`<br />`src/app/api/billing/trial-setup/route.ts`<br />`src/environment.ts`<br />`src/lib/subscription/TrialService.ts` |
| `STRIPE_PRICE_ENTERPRISE_ID` | `src/app/api/billing/create-checkout-session/route.ts`<br />`src/app/api/billing/trial-setup/route.ts`<br />`src/environment.ts`<br />`src/lib/subscription/TrialService.ts` |
| `STRIPE_PRICE_INFLUENCER_ID` | `src/app/api/billing/create-checkout-session/route.ts`<br />`src/app/api/billing/trial-setup/route.ts`<br />`src/environment.ts`<br />`src/lib/subscription/TrialService.ts` |
| `STRIPE_SECRET_KEY` | `src/environment.ts`<br />`src/lib/auth/user-service.ts`<br />`src/lib/billing/stripe.ts` |
| `STRIPE_WEBHOOK_SECRET` | `src/app/api/webhooks/stripe/route.ts`<br />`src/environment.ts` |
| `SUPPORT_EMAIL` | `src/app/api/support/contact/route.ts` |
