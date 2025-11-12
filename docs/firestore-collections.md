# Firestore Collections Documentation

This document outlines the structure and usage of all Firestore collections in the Irisync application.

## Core Collections

### 1. `users`
Stores user account information and authentication details.

**Fields:**
- `email` (string): User's email address
- `firstName` (string): User's first name
- `lastName` (string): User's last name
- `role` (string): User role, can be 'user', 'admin', or 'super_admin'
- `profileImageUrl` (string, optional): URL to user's profile image
- `subscription` (object): 
  - `tier` (string): Subscription tier, e.g., 'free', 'basic', 'enterprise'
  - `status` (string): Status of the subscription, e.g., 'active', 'canceled', 'past_due'
  - `currentPeriodStart` (timestamp): Start date of current billing period
  - `currentPeriodEnd` (timestamp): End date of current billing period
  - `cancelAtPeriodEnd` (boolean): Whether subscription will cancel at period end
  - `seats` (number): Number of seats in subscription
- `timezone` (string): User's preferred timezone
- `createdAt` (timestamp): When the user was created
- `updatedAt` (timestamp): When the user was last updated

**Subcollections:**
- `settings`: User-specific settings and preferences
- `activities`: User activity history
- `notifications`: User notifications
- `calendarEvents`: User's calendar events

### 2. `contentPosts`
Stores social media content posts and their publishing status.

**Fields:**
- `userId` (string): ID of the user who created the post
- `title` (string): Post title
- `body` (string): Post content
- `status` (string): Status of the post, e.g., 'draft', 'scheduled', 'published', 'failed'
- `tags` (array): Array of tags for categorization
- `mediaIds` (array): Array of media item IDs attached to this post
- `platforms` (array): Array of platform-specific publishing details
  - `platform` (string): Name of the platform, e.g., 'twitter', 'instagram'
  - `status` (string): Status on this platform
  - `scheduledFor` (timestamp): When post is scheduled to be published
- `aiGenerated` (boolean): Whether the content was generated using AI
- `scheduledFor` (timestamp): When the post is scheduled to be published
- `createdAt` (timestamp): When the post was created
- `updatedAt` (timestamp): When the post was last updated

### 3. `organizations`
Stores organization information for team-based access control.

**Fields:**
- `name` (string): Organization name
- `description` (string, optional): Organization description
- `ownerId` (string): User ID of the organization owner
- `subscriptionTier` (string): Organization subscription tier
- `seats` (number): Number of seats in the organization
- `logoUrl` (string, optional): URL to organization logo
- `createdAt` (timestamp): When the organization was created
- `updatedAt` (timestamp): When the organization was last updated
- `settings` (object):
  - `timezone` (string): Organization default timezone
  - `defaultPlatforms` (array): Default platforms for organization

**Subcollections:**
- `members`: Users who belong to this organization
- `teams`: Teams within the organization
- `socialAccounts`: Social media accounts connected to the organization

### 4. `dashboardStats`
Stores aggregated statistics for dashboard display.

**Fields:**
- `userId` (string): User ID these stats belong to
- `postCount` (number): Total count of posts
- `scheduledCount` (number): Count of scheduled posts
- `platformStats` (object): Statistics per platform
  - `[platformName]` (object): Platform-specific stats
    - `followers` (number): Number of followers
    - `engagement` (number): Engagement rate
- `updatedAt` (timestamp): When the stats were last updated

### 5. `platforms`
Stores information about social media platforms.

**Fields:**
- `userId` (string): User ID this platform belongs to
- `name` (string): Platform name, e.g., 'Twitter', 'Instagram'
- `followers` (number): Number of followers
- `engagement` (number): Engagement rate
- `color` (string): Color code associated with the platform
- `progress` (number): Progress indicator (0-100)
- `updatedAt` (timestamp): When the platform was last updated

### 6. `activities`
Stores user activity history.

**Fields:**
- `userId` (string): User ID this activity belongs to
- `type` (string): Activity type, e.g., 'login', 'post_created', 'engagement_received'
- `timestamp` (timestamp): When the activity occurred
- `details` (object): Additional details about the activity

### 7. `notifications`
Stores user notifications.

**Fields:**
- `userId` (string): User ID this notification is for
- `type` (string): Notification type, e.g., 'welcome', 'post_published'
- `read` (boolean): Whether the notification has been read
- `title` (string): Notification title
- `body` (string): Notification body text
- `timestamp` (timestamp): When the notification was created

### 8. `media`
Stores media items (images, videos) used in content.

**Fields:**
- `userId` (string): User ID who uploaded this media
- `type` (string): Media type, e.g., 'image', 'video', 'audio'
- `title` (string): Media title
- `description` (string): Media description
- `url` (string): URL to the full media
- `thumbnailUrl` (string): URL to media thumbnail
- `filename` (string): Original filename
- `filesize` (number): File size in bytes
- `contentType` (string): MIME type
- `tags` (array): Array of tags for categorization
- `metadata` (object): Additional metadata
  - `width` (number): Width in pixels (for image/video)
  - `height` (number): Height in pixels (for image/video)
  - `format` (string): Format, e.g., 'jpeg', 'mp4'
  - `duration` (number, optional): Duration in seconds (for video/audio)
- `aiGenerated` (boolean, optional): Whether the media was AI-generated
- `isPublic` (boolean): Whether the media is publicly accessible
- `createdAt` (timestamp): When the media was created
- `updatedAt` (timestamp): When the media was last updated

### 9. `analytics`
Stores analytics data for content and platforms.

**Fields:**
- `userId` (string): User ID this analytics data belongs to
- `period` (string): Time period of analytics data
- `platforms` (object): Analytics data per platform
  - `[platformName]` (object): Platform-specific analytics
    - `impressions` (number): Number of impressions
    - `engagements` (number): Number of engagements
    - `clicks` (number): Number of clicks
    - `followers` (number): Number of followers
- `updatedAt` (timestamp): When the analytics data was last updated

### 10. `userProfiles`
Stores public user profiles.

**Fields:**
- `userId` (string): User ID this profile belongs to
- `name` (string): Display name
- `bio` (string): User biography
- `avatarUrl` (string): URL to avatar image
- `website` (string, optional): User's website
- `socialLinks` (object): Social media profile links
  - `twitter` (string, optional): Twitter profile URL
  - `linkedin` (string, optional): LinkedIn profile URL
  - and other platforms as needed
- `createdAt` (timestamp): When the profile was created
- `updatedAt` (timestamp): When the profile was last updated

### 11. `userSettings`
Stores user settings and preferences.

**Fields:**
- `userId` (string): User ID these settings belong to
- `theme` (string): UI theme preference
- `language` (string): Preferred language
- `notifications` (object): Notification preferences
  - `email` (boolean): Email notifications enabled
  - `push` (boolean): Push notifications enabled
  - `sms` (boolean): SMS notifications enabled
- `timezone` (string): Preferred timezone
- `updatedAt` (timestamp): When settings were last updated

## Security Rules

The Firestore security rules are configured to enforce the following access patterns:

1. Users can read and write to their own user document
2. Admins can read any user document
3. Super admins can read and write any user document
4. Content posts can be read by any authenticated user
5. Content posts can be written by their owner or an admin
6. Organization data is accessible only to organization members and admins
7. Most other collections enforce owner-based access

## Indexes

The application requires the following indexes to be deployed:

1. `contentPosts` collection:
   - Compound index on `userId` (ascending) and `scheduledFor` (ascending)
   - Compound index on `userId` (ascending) and `status` (ascending)

2. `platforms` collection:
   - Compound index on `userId` (ascending) and `name` (ascending)

3. `activities` collection:
   - Compound index on `userId` (ascending) and `timestamp` (descending)

4. `notifications` collection:
   - Compound index on `userId` (ascending), `read` (ascending), and `timestamp` (descending)

## Collection Relationships

- `users` ← many-to-one → `organizations` (through organization members subcollection)
- `users` → one-to-many → `contentPosts`
- `users` → one-to-many → `activities`
- `users` → one-to-many → `notifications`
- `contentPosts` → many-to-many → `media` (through mediaIds array)
- `organizations` → one-to-many → `socialAccounts` (through subcollection)

## Best Practices

1. Always use security rules to enforce access control
2. Create indexes for frequently queried field combinations
3. Use subcollections for one-to-many relationships
4. Use arrays of IDs for many-to-many relationships
5. Always include timestamps for creation and updates 