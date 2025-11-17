# OAuth Platform Integration Setup Guide

This guide walks you through setting up OAuth integrations for all supported social media platforms in IriSync.

## Table of Contents
- [Overview](#overview)
- [Facebook & Instagram](#facebook--instagram)
- [Twitter/X](#twitterx)
- [LinkedIn](#linkedin)
- [TikTok](#tiktok)
- [YouTube](#youtube)
- [Pinterest](#pinterest)
- [Token Refresh Setup](#token-refresh-setup)

---

## Overview

IriSync supports OAuth 2.0 integration with the following platforms:
- **Facebook** (also used for Instagram)
- **Twitter/X**
- **LinkedIn**
- **TikTok**
- **YouTube** (via Google OAuth)
- **Pinterest**

Each platform requires:
1. Creating an app in the platform's developer portal
2. Obtaining OAuth credentials (Client ID & Secret)
3. Configuring redirect URIs
4. Adding credentials to your `.env` file

---

## Facebook & Instagram

Facebook and Instagram share the same OAuth system since Instagram is owned by Meta.

### 1. Create a Facebook App

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Click **"My Apps"** → **"Create App"**
3. Select **"Business"** as app type
4. Fill in app details:
   - **App Name**: IriSync (or your app name)
   - **App Contact Email**: your email
5. Click **"Create App"**

### 2. Configure Facebook Login

1. In your app dashboard, add **"Facebook Login"** product
2. Go to **Settings** → **Basic**
   - Copy your **App ID** (this is your `FACEBOOK_CLIENT_ID`)
   - Copy your **App Secret** (this is your `FACEBOOK_CLIENT_SECRET`)
3. Go to **Facebook Login** → **Settings**
4. Add Valid OAuth Redirect URIs:
   ```
   https://yourdomain.com/api/platforms/callback/social
   http://localhost:3000/api/platforms/callback/social (for development)
   ```

### 3. Configure Permissions

1. Go to **App Review** → **Permissions and Features**
2. Request the following permissions:
   - `pages_show_list`
   - `pages_read_engagement`
   - `pages_manage_posts`
   - `pages_manage_metadata`
   - `public_profile`
   - `email`

For Instagram:
   - `instagram_basic`
   - `instagram_content_publish`

### 4. Add to Environment Variables

```bash
FACEBOOK_CLIENT_ID=your_app_id
FACEBOOK_CLIENT_SECRET=your_app_secret
```

---

## Twitter/X

Twitter uses OAuth 2.0 with PKCE (Proof Key for Code Exchange).

### 1. Create a Twitter App

1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Create a new project (if you don't have one)
3. Create a new app under the project
4. Note your **Client ID** and **Client Secret**

### 2. Configure App Settings

1. Go to your app's **Settings**
2. Enable **OAuth 2.0**
3. Set the **Type of App** to "Web App, Automated App or Bot"
4. Add Callback URLs:
   ```
   https://yourdomain.com/api/platforms/callback/social
   http://localhost:3000/api/platforms/callback/social
   ```
5. Add Website URL: `https://yourdomain.com`

### 3. Configure Permissions

Under **User authentication settings**, request:
- `tweet.read`
- `tweet.write`
- `users.read`
- `offline.access` (for refresh tokens)
- `follows.read`
- `follows.write`

### 4. Get Bearer Token (Optional)

For read-only operations, you can use a Bearer Token:
1. Go to **Keys and Tokens**
2. Generate a **Bearer Token**

### 5. Add to Environment Variables

```bash
TWITTER_CLIENT_ID=your_client_id
TWITTER_CLIENT_SECRET=your_client_secret
TWITTER_BEARER_TOKEN=your_bearer_token (optional)
```

---

## LinkedIn

### 1. Create a LinkedIn App

1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/)
2. Click **"Create app"**
3. Fill in app information:
   - **App name**: IriSync
   - **LinkedIn Page**: Select your company page
   - **Privacy policy URL**: Your privacy policy
   - **App logo**: Upload a logo
4. Click **"Create app"**

### 2. Configure OAuth Settings

1. Go to **Auth** tab
2. Note your **Client ID** and **Client Secret**
3. Add Redirect URLs:
   ```
   https://yourdomain.com/api/platforms/callback/social
   http://localhost:3000/api/platforms/callback/social
   ```

### 3. Request API Access

1. Go to **Products** tab
2. Request access to:
   - **Sign In with LinkedIn**
   - **Share on LinkedIn**
   - **Marketing Developer Platform** (for company pages)

### 4. Add to Environment Variables

```bash
LINKEDIN_CLIENT_ID=your_client_id
LINKEDIN_CLIENT_SECRET=your_client_secret
```

---

## TikTok

### 1. Create a TikTok App

1. Go to [TikTok for Developers](https://developers.tiktok.com/)
2. Click **"Manage apps"** → **"Connect an app"**
3. Fill in app details:
   - **App name**: IriSync
   - **Category**: Social
4. Submit for review

### 2. Configure App Settings

1. After approval, go to your app settings
2. Note your **Client Key** (Client ID) and **Client Secret**
3. Add Redirect URI:
   ```
   https://yourdomain.com/api/platforms/callback/social
   ```

### 3. Request Permissions

Request the following scopes:
- `user.info.basic`
- `video.list`
- `video.upload`
- `video.publish`

### 4. Add to Environment Variables

```bash
TIKTOK_CLIENT_ID=your_client_key
TIKTOK_CLIENT_SECRET=your_client_secret
```

---

## YouTube

YouTube uses Google's OAuth system.

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable **YouTube Data API v3**:
   - Go to **APIs & Services** → **Library**
   - Search for "YouTube Data API v3"
   - Click **Enable**

### 2. Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** (or Internal for workspace)
3. Fill in application details:
   - **App name**: IriSync
   - **User support email**: your email
   - **Developer contact**: your email
4. Add scopes:
   - `https://www.googleapis.com/auth/youtube`
   - `https://www.googleapis.com/auth/youtube.upload`
   - `https://www.googleapis.com/auth/youtube.readonly`

### 3. Create OAuth Credentials

1. Go to **Credentials** → **Create Credentials** → **OAuth client ID**
2. Application type: **Web application**
3. Add Authorized redirect URIs:
   ```
   https://yourdomain.com/api/platforms/callback/social
   http://localhost:3000/api/platforms/callback/social
   ```
4. Click **Create**
5. Copy your **Client ID** and **Client Secret**

### 4. Add to Environment Variables

```bash
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
```

---

## Pinterest

### 1. Create a Pinterest App

1. Go to [Pinterest Developers](https://developers.pinterest.com/)
2. Click **"Create app"**
3. Fill in app details:
   - **App name**: IriSync
   - **Description**: Social media management platform
4. Click **"Create"**

### 2. Configure OAuth Settings

1. Go to your app dashboard
2. Note your **App ID** (Client ID) and **App secret**
3. Add Redirect URI:
   ```
   https://yourdomain.com/api/platforms/callback/social
   ```

### 3. Request Scopes

Request the following scopes:
- `boards:read`
- `boards:write`
- `pins:read`
- `pins:write`
- `user_accounts:read`

### 4. Add to Environment Variables

```bash
PINTEREST_CLIENT_ID=your_app_id
PINTEREST_CLIENT_SECRET=your_app_secret
```

---

## Token Refresh Setup

IriSync includes automatic token refresh to keep platform connections active.

### 1. Scheduled Token Refresh (Recommended)

Set up a cron job to refresh tokens automatically:

#### For Vercel

Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/refresh-tokens",
      "schedule": "0 * * * *"
    }
  ]
}
```

This runs every hour and refreshes all expiring tokens.

#### For Other Platforms

Set up a cron job to call:
```bash
GET https://yourdomain.com/api/cron/refresh-tokens
Authorization: Bearer YOUR_CRON_SECRET
```

### 2. Configure Cron Secret

Add a secure secret to your environment:

```bash
# Generate a secure random string
openssl rand -hex 32

# Add to .env
CRON_SECRET=generated_secret_here
```

### 3. Manual Token Refresh

You can also manually refresh tokens via API:

```bash
POST https://yourdomain.com/api/cron/refresh-tokens
Content-Type: application/json

{
  "userId": "user_id",
  "connectionId": "connection_id" // optional, refreshes all if omitted
}
```

---

## Testing OAuth Flows

### 1. Development Setup

1. Copy `.env.example` to `.env`
2. Fill in your OAuth credentials
3. Set `NEXT_PUBLIC_APP_URL=http://localhost:3000`
4. Run the development server: `npm run dev`

### 2. Test Connection Flow

1. Navigate to `/dashboard/settings/connections`
2. Click "Connect" for a platform
3. You'll be redirected to the platform's OAuth page
4. Authorize the app
5. You'll be redirected back with a success message

### 3. Verify Connection

Check Firestore:
- Collection: `users/{userId}/platformConnections`
- Should contain your connection with:
  - `accessToken`
  - `refreshToken`
  - `expiresAt`
  - `status: 'active'`

---

## Troubleshooting

### Common Issues

1. **Redirect URI Mismatch**
   - Ensure redirect URI in platform settings exactly matches:
     `https://yourdomain.com/api/platforms/callback/social`
   - Include `?platform={platform}` in some cases

2. **Invalid Credentials**
   - Double-check Client ID and Secret
   - Ensure no extra whitespace in `.env` file
   - Regenerate credentials if needed

3. **Token Expired**
   - Run manual token refresh
   - Check token refresh cron is running
   - Verify refresh token is stored

4. **Permission Denied**
   - Ensure all required scopes are approved
   - Some platforms require app review for production use

5. **CORS Errors**
   - Add your domain to allowed origins in platform settings
   - Check redirect URIs include the correct protocol (http/https)

---

## Production Checklist

Before going live:

- [ ] All OAuth apps submitted for review (if required)
- [ ] Production redirect URIs configured
- [ ] All credentials added to production environment
- [ ] Cron job for token refresh configured
- [ ] CRON_SECRET set securely
- [ ] Test each platform connection in production
- [ ] Monitor token refresh logs
- [ ] Set up error notifications for failed refreshes

---

## Security Best Practices

1. **Never commit credentials** to version control
2. **Use environment variables** for all secrets
3. **Rotate credentials** periodically
4. **Monitor OAuth logs** for suspicious activity
5. **Implement rate limiting** for OAuth endpoints
6. **Use HTTPS only** in production
7. **Validate redirect URIs** server-side
8. **Implement CSRF protection** (state parameter)

---

## Support

For issues or questions:
- Check platform-specific documentation
- Review error logs in Firebase
- Test with OAuth debugging tools
- Contact platform support for app review issues

---

## Additional Resources

- [Facebook Platform Documentation](https://developers.facebook.com/docs)
- [Twitter API Documentation](https://developer.twitter.com/en/docs)
- [LinkedIn API Documentation](https://docs.microsoft.com/en-us/linkedin/)
- [TikTok for Developers](https://developers.tiktok.com/doc)
- [YouTube Data API](https://developers.google.com/youtube/v3)
- [Pinterest API Documentation](https://developers.pinterest.com/docs)
