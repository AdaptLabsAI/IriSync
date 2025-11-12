/**
 * Enhanced LinkedIn API Types for Complete REST API Coverage
 * Supports all modern LinkedIn endpoints including events, lead forms, and advanced media management
 */

// ===================================================================
// CORE API RESPONSE TYPES
// ===================================================================

// LinkedIn API Response Types
export interface LinkedInTokenResponse {
  access_token: string;
  expires_in: number;
  scope?: string;
  token_type?: string;
  refresh_token?: string;
}

// LinkedIn Profile Response (Enhanced)
export interface LinkedInProfileResponse {
  id: string;
  firstName: {
    localized: {
      [key: string]: string;
    };
  };
  lastName: {
    localized: {
      [key: string]: string;
    };
  };
  profilePicture?: {
    'displayImage~'?: {
      elements?: Array<{
        identifiers: Array<{
          identifier: string;
        }>;
        data?: {
          'com.linkedin.digitalmedia.mediaartifact.StillImage'?: {
            storageSize?: {
              width: number;
              height: number;
            };
          };
        };
      }>;
    };
  };
  vanityName?: string;
  headline?: {
    localized: {
      [key: string]: string;
    };
  };
  summary?: {
    localized: {
      [key: string]: string;
    };
  };
  industry?: {
    localized: {
      [key: string]: string;
    };
  };
  location?: {
    country?: {
      code: string;
    };
    region?: {
      code: string;
    };
  };
}

// ===================================================================
// MODERN REST API TYPES (/rest/posts)
// ===================================================================

export interface LinkedInRestPost {
  id: string;
  author: string; // URN format: urn:li:person:{id} or urn:li:organization:{id}
  commentary?: string;
  content?: {
    media?: LinkedInMediaContent;
    article?: LinkedInArticleContent;
    poll?: LinkedInPollContent;
  };
  distribution?: LinkedInDistribution;
  lifecycleState: 'DRAFT' | 'PUBLISHED' | 'PUBLISHED_EDITED';
  visibility: 'PUBLIC' | 'LOGGED_IN' | 'CONNECTIONS';
  publishedAt?: string;
  lastModifiedAt?: string;
  isReshareDisabledByAuthor?: boolean;
}

export interface LinkedInMediaContent {
  altText?: string;
  id: string; // Media URN
  title?: string;
}

export interface LinkedInArticleContent {
  description?: string;
  source?: string;
  thumbnail?: string;
  title?: string;
}

export interface LinkedInPollContent {
  question: string;
  options: Array<{
    text: string;
  }>;
  settings?: {
    duration: string; // ISO 8601 duration
  };
}

export interface LinkedInDistribution {
  feedDistribution: 'MAIN_FEED' | 'NONE';
  targetEntities?: string[]; // URNs of target entities
  thirdPartyDistributionChannels?: string[];
}

// ===================================================================
// MEDIA MANAGEMENT TYPES (/rest/images, /rest/videos, /rest/documents)
// ===================================================================

export interface LinkedInImage {
  id: string;
  altText?: string;
  artifact: string; // URN
  created: string;
  digitalmediaAsset: string; // URN
  displaySize?: {
    height: number;
    uom: string;
    width: number;
  };
  downloadUrl?: string;
  owner: string; // URN
  recipes: string[]; // Recipe URNs
  status: 'PROCESSING' | 'AVAILABLE' | 'FAILED';
}

export interface LinkedInVideo {
  id: string;
  altText?: string;
  artifact: string; // URN
  created: string;
  digitalmediaAsset: string; // URN
  downloadUrl?: string;
  duration?: number; // in milliseconds
  owner: string; // URN
  recipes: string[]; // Recipe URNs
  status: 'PROCESSING' | 'AVAILABLE' | 'FAILED';
  thumbnails?: Array<{
    height: number;
    width: number;
    url: string;
  }>;
  uploadCertificate?: string;
}

export interface LinkedInDocument {
  id: string;
  artifact: string; // URN
  created: string;
  digitalmediaAsset: string; // URN
  downloadUrl?: string;
  extractedText?: string;
  filename?: string;
  fileSize?: number;
  mimeType?: string;
  owner: string; // URN
  status: 'PROCESSING' | 'AVAILABLE' | 'FAILED';
  title?: string;
}

export interface LinkedInMediaUploadRequest {
  initializeUploadRequest: {
    owner: string; // URN
    fileSizeBytes: number;
    uploadCausalityToken?: string;
  };
}

export interface LinkedInMediaUploadResponse {
  value: {
    digitalmediaAsset: string; // URN
    uploadInstructions: Array<{
      uploadUrl: string;
      firstByte: number;
      lastByte: number;
    }>;
    asset?: string; // URN
  };
}

// ===================================================================
// EVENTS MANAGEMENT TYPES (/rest/events)
// ===================================================================

export interface LinkedInEvent {
  id: string;
  name: string;
  description?: string;
  entityUrn: string;
  eventType: 'OFFLINE' | 'ONLINE' | 'EXTERNAL';
  organizer: string; // URN
  startAt: string; // ISO 8601
  endAt?: string; // ISO 8601
  timeZone: string;
  status: 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';
  venue?: LinkedInEventVenue;
  onlineDetails?: LinkedInEventOnlineDetails;
  registration?: LinkedInEventRegistration;
  visibility: 'PUBLIC' | 'INVITATION_ONLY';
  coverImage?: string; // Media URN
  maxAttendees?: number;
  ticketType?: 'FREE' | 'PAID' | 'EXTERNAL';
  created: string;
  lastModified: string;
}

export interface LinkedInEventVenue {
  name?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    geographicArea?: string;
    postalCode?: string;
    country: string;
  };
  mapUrl?: string;
}

export interface LinkedInEventOnlineDetails {
  url?: string;
  instructions?: string;
  platform?: string;
}

export interface LinkedInEventRegistration {
  registrationType: 'OPEN' | 'APPROVAL_REQUIRED' | 'INVITATION_ONLY';
  questionsForm?: string; // Lead form URN
  externalUrl?: string;
}

export interface LinkedInEventAttendee {
  attendee: string; // URN
  registrationState: 'GOING' | 'INTERESTED' | 'NOT_GOING';
  registeredAt: string;
  responses?: Record<string, string>; // Question ID to response mapping
}

// ===================================================================
// LEAD FORMS TYPES (/rest/leadForms)
// ===================================================================

export interface LinkedInLeadForm {
  id: string;
  account: string; // URN
  name: string;
  description?: string;
  locale: {
    country: string;
    language: string;
  };
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
  privacyPolicy: {
    isConsentRequired: boolean;
    consentText?: string;
    privacyPolicyUrl?: string;
  };
  questions: LinkedInLeadFormQuestion[];
  created: string;
  lastModified: string;
}

export interface LinkedInLeadFormQuestion {
  id: string;
  type: 'TEXT' | 'EMAIL' | 'PHONE' | 'DROPDOWN' | 'CHECKBOX' | 'RADIO' | 'TEXTAREA';
  label: string;
  required: boolean;
  predefinedResponses?: string[];
  customValidation?: {
    regex?: string;
    errorMessage?: string;
  };
}

export interface LinkedInLeadFormResponse {
  id: string;
  leadForm: string; // URN
  submittedAt: string;
  responses: Array<{
    questionId: string;
    answer: string | string[];
  }>;
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    referrer?: string;
  };
}

// ===================================================================
// REACTIONS TYPES (/rest/reactions)
// ===================================================================

export interface LinkedInReaction {
  id: string;
  actor: string; // URN
  entity: string; // URN of the post/comment being reacted to
  reactionType: 'LIKE' | 'PRAISE' | 'APPRECIATION' | 'EMPATHY' | 'INTEREST' | 'ENTERTAINMENT';
  created: string;
}

export interface LinkedInReactionsSummary {
  entity: string; // URN
  totalReactions: number;
  reactionsByType: Array<{
    type: 'LIKE' | 'PRAISE' | 'APPRECIATION' | 'EMPATHY' | 'INTEREST' | 'ENTERTAINMENT';
    count: number;
  }>;
  viewerReaction?: 'LIKE' | 'PRAISE' | 'APPRECIATION' | 'EMPATHY' | 'INTEREST' | 'ENTERTAINMENT';
}

// ===================================================================
// API RESPONSE WRAPPERS
// ===================================================================

export interface LinkedInApiResponse<T> {
  data?: T;
  elements?: T[];
  paging?: {
    count: number;
    start: number;
    total?: number;
    links?: Array<{
      rel: string;
      href: string;
    }>;
  };
  metadata?: {
    totalCount?: number;
    nextPageToken?: string;
  };
}

export interface LinkedInBatchResponse<T> {
  results: Record<string, LinkedInBatchResult<T>>;
  errors?: Record<string, LinkedInError>;
}

export interface LinkedInBatchResult<T> {
  status: number;
  entity?: T;
  error?: LinkedInError;
}

// ===================================================================
// LEGACY TYPES (for backward compatibility)
// ===================================================================

// LinkedIn Email Response
export interface LinkedInEmailResponse {
  elements: Array<{
    'handle~': {
      emailAddress: string;
    };
  }>;
}

// LinkedIn Organization Response
export interface LinkedInOrganizationResponse {
  elements: Array<{
    'organization~'?: {
      id: string;
      name: string;
      vanityName?: string;
      logoV2?: {
        'original~'?: {
          elements?: Array<{
            identifiers: Array<{
              identifier: string;
            }>;
          }>;
        };
      };
    };
  }>;
}

// LinkedIn Post Response (Legacy UGC)
export interface LinkedInPostResponse {
  id: string;
  activity?: string;
  created?: {
    time: number;
  };
  specificContent?: {
    'com.linkedin.ugc.ShareContent'?: {
      shareCommentary?: {
        text?: string;
      };
      media?: Array<{
        status?: string;
        title?: {
          text?: string;
        };
        description?: {
          text?: string;
        };
        originalUrl?: string;
        thumbnails?: Array<{
          url?: string;
          resolvedUrl?: string;
        }>;
      }>;
    };
  };
  visibility?: string;
  lifecycleState?: string;
  distribution?: any;
  text?: {
    text?: string;
  };
  content?: {
    contentEntities?: Array<{
      entityLocation?: string;
      title?: string;
      description?: string;
      thumbnails?: Array<{
        resolvedUrl?: string;
      }>;
    }>;
  };
}

// LinkedIn Media Upload Response (Legacy)
export interface LinkedInLegacyMediaUploadResponse {
  value: {
    asset: string;
    uploadMechanism: {
      'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest': {
        uploadUrl: string;
      };
    };
  };
}

// LinkedIn Post Metrics Response
export interface LinkedInPostMetricsResponse {
  elements: Array<{
    shareUrn?: string;
    totalShareStatistics?: {
      impressionCount?: number;
      clickCount?: number;
      likeCount?: number;
      commentCount?: number;
      shareCount?: number;
    };
  }>;
}

// LinkedIn Follower Statistics Response
export interface LinkedInFollowerStatisticsResponse {
  elements: Array<{
    followerCounts?: {
      totalCount?: number;
    };
  }>;
}

// LinkedIn Network Statistics Response
export interface LinkedInNetworkStatisticsResponse {
  firstDegreeSize: number;
}

// ===================================================================
// ERROR TYPES
// ===================================================================

export interface LinkedInError {
  status?: number;
  message?: string;
  serviceErrorCode?: string;
  code?: string;
  details?: string;
  errorDetails?: Array<{
    field?: string;
    code?: string;
    message?: string;
  }>;
}

// ===================================================================
// SEARCH AND FILTER TYPES
// ===================================================================

export interface LinkedInSearchOptions {
  keywords?: string;
  author?: string;
  sortBy?: 'CREATED_TIME' | 'RELEVANCE';
  dateRange?: {
    start: string;
    end: string;
  };
  count?: number;
  start?: number;
}

export interface LinkedInEventSearchOptions extends LinkedInSearchOptions {
  eventType?: 'OFFLINE' | 'ONLINE' | 'EXTERNAL';
  status?: 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';
  timeRange?: {
    start: string;
    end: string;
  };
}

// ===================================================================
// UTILITY TYPES
// ===================================================================

export type LinkedInUrn = string; // e.g., "urn:li:person:12345"
export type LinkedInEntityType = 'person' | 'organization' | 'post' | 'event' | 'leadForm' | 'image' | 'video' | 'document';

export interface LinkedInPaginationToken {
  count: number;
  start: number;
  nextPageToken?: string;
}

export interface LinkedInRateLimitInfo {
  tier: 'standard' | 'partner';
  requestsRemaining: number;
  resetTime: number;
}

// ===================================================================
// SOCIAL ACTIONS & COMMENTS TYPES (/rest/socialActions)
// ===================================================================

export interface LinkedInSocialAction {
  target: string; // URN of the entity (post, comment, etc.)
  created: string;
  lastModified: string;
  commentsSummary?: {
    totalFirstLevelComments: number;
    aggregatedTotalComments: number;
  };
  likesSummary?: {
    totalLikes: number;
    likedByCurrentUser: boolean;
  };
}

export interface LinkedInComment {
  id: string;
  actor: string; // URN of the person who commented
  created: string;
  lastModified: string;
  message: {
    text: string;
    attributes?: Array<{
      type: string;
      value?: any;
    }>;
  };
  object: string; // URN of the parent object
  parentComment?: string; // URN of parent comment for nested comments
}

export interface LinkedInLike {
  created: string;
  liker: string; // URN of the person who liked
}

export interface LinkedInSocialMetadata {
  entity: string; // URN
  totalShares: number;
  totalViews: number;
  totalUniqueViews: number;
  totalComments: number;
  totalLikes: number;
  totalReactions: number;
  clickThroughRate?: number;
  engagement?: {
    likes: number;
    comments: number;
    shares: number;
    total: number;
  };
}

// ===================================================================
// ANALYTICS TYPES (Enhanced)
// ===================================================================

export interface LinkedInOrganizationalEntityFollowerStatistics {
  organizationalEntity: string; // URN
  timeIntervals: Array<{
    timeRange: {
      start: number;
      end: number;
    };
    followerCounts: {
      organicFollowerCount: number;
      paidFollowerCount: number;
    };
  }>;
}

export interface LinkedInOrganizationalEntityShareStatistics {
  organizationalEntity: string; // URN
  timeIntervals: Array<{
    timeRange: {
      start: number;
      end: number;
    };
    totalShareStatistics: {
      uniqueImpressionsCount: number;
      clickCount: number;
      likeCount: number;
      commentCount: number;
      shareCount: number;
      engagement: number;
    };
  }>;
}

export interface LinkedInOrganizationPageStatistics {
  organization: string; // URN
  timeIntervals: Array<{
    timeRange: {
      start: number;
      end: number;
    };
    pageStatistics: {
      views: {
        allPageViews: number;
        uniquePageViews: number;
      };
      clicks: {
        careersPageClicks: number;
        customButtonClicks: number;
      };
    };
  }>;
}

export interface LinkedInVideoAnalytics {
  entity: string; // URN
  timeIntervals: Array<{
    timeRange: {
      start: number;
      end: number;
    };
    videoStatistics: {
      aggregatedViews: number;
      completionRate: number;
      retentionRate: number;
      averageViewDuration: number;
    };
  }>;
}

export interface LinkedInMemberCreatorPostAnalytics {
  entity?: string; // URN
  timeIntervals: Array<{
    timeRange: {
      start: number;
      end: number;
    };
    postAnalytics: {
      impressions: number;
      likes: number;
      comments: number;
      shares: number;
      clicks: number;
      engagement: number;
      reach: number;
    };
  }>;
}

export interface LinkedInMemberFollowersCount {
  timeIntervals: Array<{
    timeRange: {
      start: number;
      end: number;
    };
    followerCounts: {
      totalFollowerCount: number;
      organicFollowerCount: number;
      paidFollowerCount: number;
    };
  }>;
}

// ===================================================================
// ORGANIZATION TYPES (/rest/organizations)
// ===================================================================

export interface LinkedInOrganization {
  id: string;
  name: {
    localized: Record<string, string>;
    preferredLocale: {
      country: string;
      language: string;
    };
  };
  vanityName?: string;
  description?: {
    localized: Record<string, string>;
    preferredLocale: {
      country: string;
      language: string;
    };
  };
  logoV2?: {
    cropped?: string; // Media URN
    original?: string; // Media URN
  };
  coverPhotoV2?: {
    cropped?: string; // Media URN
    original?: string; // Media URN
  };
  website?: {
    localized: Record<string, string>;
    preferredLocale: {
      country: string;
      language: string;
    };
  };
  industries?: string[];
  specialties?: string[];
  locations?: Array<{
    country?: string;
    geographicArea?: string;
    city?: string;
    postalCode?: string;
    line1?: string;
    line2?: string;
  }>;
  foundedOn?: {
    year?: number;
    month?: number;
    day?: number;
  };
  employeeCountRange?: {
    start?: number;
    end?: number;
  };
  organizationType?: string;
  organizationStatus?: string;
  defaultLocale?: {
    country: string;
    language: string;
  };
}

export interface LinkedInOrganizationBrand {
  id: string;
  name: {
    localized: Record<string, string>;
  };
  vanityName?: string;
  parentOrganization?: string; // URN
  logoV2?: {
    cropped?: string;
    original?: string;
  };
  website?: string;
}

export interface LinkedInOrganizationAcl {
  organization: string; // URN
  roleAssignee: string; // URN
  role: 'ADMINISTRATOR' | 'CONTENT_ADMIN' | 'PAID_MEDIA_ADMIN' | 'ORGANIC_CONTENT_POSTER';
  state: 'APPROVED' | 'PENDING' | 'REJECTED';
}

// ===================================================================
// PEOPLE & CONNECTIONS TYPES (/rest/people, /rest/connections)
// ===================================================================

export interface LinkedInPerson {
  id: string;
  firstName?: {
    localized: Record<string, string>;
  };
  lastName?: {
    localized: Record<string, string>;
  };
  headline?: {
    localized: Record<string, string>;
  };
  vanityName?: string;
  profilePicture?: {
    'displayImage~'?: {
      elements?: Array<{
        identifiers: Array<{
          identifier: string;
        }>;
      }>;
    };
  };
  industry?: {
    localized: Record<string, string>;
  };
  location?: {
    country?: {
      code: string;
    };
    region?: {
      code: string;
    };
  };
}

export interface LinkedInConnection {
  id: string;
  firstName: {
    localized: Record<string, string>;
  };
  lastName: {
    localized: Record<string, string>;
  };
  headline?: {
    localized: Record<string, string>;
  };
  profilePicture?: {
    'displayImage~'?: {
      elements?: Array<{
        identifiers: Array<{
          identifier: string;
        }>;
      }>;
    };
  };
  connectedAt?: string;
}

export interface LinkedInPeopleTypeaheadResult {
  elements: Array<{
    person: string; // URN
    displayName: string;
    headline?: string;
    profilePicture?: string;
  }>;
}

// ===================================================================
// ADVERTISING TYPES (/rest/adAccounts, /rest/adCampaigns)
// ===================================================================

export interface LinkedInAdAccount {
  id: string;
  name: string;
  type: 'BUSINESS' | 'ENTERPRISE';
  status: 'ACTIVE' | 'CANCELED' | 'DRAFT' | 'PENDING_DELETION' | 'REMOVED';
  currency: string;
  notifiedOnCampaignOptimization?: boolean;
  notifiedOnCreativeApproval?: boolean;
  notifiedOnCreativeRejection?: boolean;
  notifiedOnEndOfCampaign?: boolean;
  reference?: string;
  servingStatuses?: string[];
  totalBudget?: {
    amount: string;
    currencyCode: string;
  };
  version?: {
    versionTag: string;
  };
}

export interface LinkedInAdCampaignGroup {
  id: string;
  account: string; // URN
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'COMPLETED' | 'CANCELED' | 'DRAFT' | 'PENDING_DELETION' | 'REMOVED';
  totalBudget?: {
    amount: string;
    currencyCode: string;
  };
  created: string;
  lastModified: string;
  runSchedule?: {
    start: number;
    end?: number;
  };
  backfilled?: boolean;
  test?: boolean;
}

export interface LinkedInAdCampaign {
  id: string;
  account: string; // URN
  campaignGroup?: string; // URN
  name: string;
  type: 'TEXT_AD' | 'SPONSORED_CONTENT' | 'SPONSORED_INMAILS' | 'DISPLAY_AD';
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'COMPLETED' | 'CANCELED' | 'DRAFT' | 'PENDING_DELETION' | 'REMOVED';
  creativeSelection: 'OPTIMIZED' | 'MANUAL';
  dailyBudget?: {
    amount: string;
    currencyCode: string;
  };
  totalBudget?: {
    amount: string;
    currencyCode: string;
  };
  unitCost?: {
    amount: string;
    currencyCode: string;
  };
  costType: 'CPM' | 'CPC' | 'CPV' | 'CPLS';
  bidType: 'AUTOMATED' | 'MAXIMUM';
  runSchedule?: {
    start: number;
    end?: number;
  };
  targeting?: any; // Complex targeting criteria
  created: string;
  lastModified: string;
}

export interface LinkedInCreative {
  id: string;
  campaign: string; // URN
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'COMPLETED' | 'CANCELED' | 'DRAFT' | 'PENDING_DELETION' | 'REMOVED';
  type: 'SPONSORED_CONTENT' | 'TEXT_AD' | 'SPONSORED_INMAILS' | 'DISPLAY_AD';
  content?: any; // Content varies by creative type
  created: string;
  lastModified: string;
  servingHolds?: string[];
  review?: {
    reviewStatus: 'APPROVED' | 'REJECTED' | 'PENDING' | 'REQUIRES_REVIEW';
    reviewResults?: Array<{
      reviewType: string;
      reviewStatus: string;
      reasons?: string[];
    }>;
  };
}

export interface LinkedInAdAnalytics {
  pivot: string;
  pivotValue: string;
  clicks: number;
  impressions: number;
  costInLocalCurrency: string;
  costInUsd: string;
  actionClicks?: number;
  adUnitClicks?: number;
  cardClicks?: number;
  cardImpressions?: number;
  commentLikes?: number;
  comments?: number;
  companyPageClicks?: number;
  conversionValueInLocalCurrency?: string;
  conversionValueInUsd?: string;
  dateRange: {
    start: {
      year: number;
      month: number;
      day: number;
    };
    end: {
      year: number;
      month: number;
      day: number;
    };
  };
  externalWebsiteConversions?: number;
  externalWebsitePostClickConversions?: number;
  externalWebsitePostViewConversions?: number;
  follows?: number;
  fullScreenPlays?: number;
  landingPageClicks?: number;
  leadGenerationMailContactInfoShares?: number;
  leadGenerationMailInterestedClicks?: number;
  likes?: number;
  oneClickLeadFormOpens?: number;
  oneClickLeads?: number;
  opens?: number;
  otherEngagements?: number;
  sends?: number;
  shares?: number;
  textUrlClicks?: number;
  totalEngagements?: number;
  videoCompletions?: number;
  videoFirstQuartileCompletions?: number;
  videoMidpointCompletions?: number;
  videoStarts?: number;
  videoThirdQuartileCompletions?: number;
  videoViews?: number;
}

// ===================================================================
// REFERENCE DATA TYPES
// ===================================================================

export interface LinkedInIndustry {
  id: string;
  name: {
    localized: Record<string, string>;
  };
  parentId?: string;
}

export interface LinkedInGeoLocation {
  id: string;
  name: {
    localized: Record<string, string>;
  };
  type: 'COUNTRY' | 'STATE' | 'CITY' | 'REGION';
  parentId?: string;
}

export interface LinkedInFunction {
  id: string;
  name: {
    localized: Record<string, string>;
  };
}

export interface LinkedInSkill {
  id: string;
  name: {
    localized: Record<string, string>;
  };
}

export interface LinkedInSeniority {
  id: string;
  name: {
    localized: Record<string, string>;
  };
}

export interface LinkedInTitle {
  id: string;
  name: {
    localized: Record<string, string>;
  };
}

// ===================================================================
// SEARCH & FILTER OPTIONS (Enhanced)
// ===================================================================

export interface LinkedInAnalyticsOptions {
  startDate: string; // YYYY-MM-DD format
  endDate: string; // YYYY-MM-DD format
  timeGranularity?: 'DAY' | 'MONTH' | 'YEAR';
  pivot?: string;
  pivotValues?: string[];
  count?: number;
  start?: number;
}

export interface LinkedInOrganizationSearchOptions {
  vanityName?: string;
  parentOrganization?: string; // URN
  ids?: string[];
  count?: number;
  start?: number;
}

export interface LinkedInPeopleSearchOptions {
  keywords?: string;
  organization?: string; // URN
  connectionOf?: string; // URN
  count?: number;
  start?: number;
}

export interface LinkedInAdSearchOptions {
  account?: string; // URN
  campaignGroup?: string; // URN
  status?: string[];
  type?: string[];
  search?: string;
  count?: number;
  start?: number;
  sortBy?: 'CREATED_TIME' | 'LAST_MODIFIED_TIME' | 'NAME';
  sortOrder?: 'ASCENDING' | 'DESCENDING';
} 