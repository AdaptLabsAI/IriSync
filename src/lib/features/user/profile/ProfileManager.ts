import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  Timestamp,
  runTransaction
} from 'firebase/firestore';
import { 
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';
import { firestore, storage } from '../../core/firebase';
import {
  UserActivityType,
  ActivityContext,
  UserErrorType,
  UserOperationResult,
  UserApiResponse,
  UserPaginationParams,
  UserPreferenceType,
  UserNotificationType,
  NotificationChannel
} from '../types';
import { User, UserUtils, FirestoreUser } from '../../core/models/User';
import { ActivityUtils } from '../models/Activity';

/**
 * Profile update data interface
 */
export interface ProfileUpdateData {
  displayName?: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
  location?: string;
  website?: string;
  timezone?: string;
  language?: string;
  avatar?: string;
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    github?: string;
    instagram?: string;
    facebook?: string;
  };
  customFields?: Record<string, any>;
}

/**
 * Avatar upload data
 */
export interface AvatarUploadData {
  file: File;
  userId: string;
  quality?: number;
  maxSize?: number; // in bytes
}

/**
 * Profile validation result
 */
export interface ProfileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Profile search options
 */
export interface ProfileSearchOptions {
  displayName?: string;
  location?: string;
  timezone?: string;
  language?: string;
  hasAvatar?: boolean;
  isVerified?: boolean;
  sortBy?: 'displayName' | 'createdAt' | 'lastActiveAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Profile analytics data
 */
export interface ProfileAnalytics {
  profileViews: number;
  profileUpdates: number;
  avatarChanges: number;
  socialLinkClicks: number;
  lastProfileUpdate: Date;
  completionScore: number; // 0-100
  missingFields: string[];
  engagementMetrics: {
    viewsThisWeek: number;
    viewsThisMonth: number;
    updateFrequency: number;
  };
}

/**
 * Profile manager configuration
 */
export interface ProfileManagerConfig {
  enableCaching: boolean;
  cacheTTL: number;
  maxAvatarSize: number; // in bytes
  allowedAvatarTypes: string[];
  enableAnalytics: boolean;
  enableAuditLogging: boolean;
  defaultTimezone: string;
  defaultLanguage: string;
}

/**
 * Profile Manager for user profile management
 * Handles profile updates, avatar management, and profile analytics
 */
export class ProfileManager {
  private static instance: ProfileManager;
  private config: ProfileManagerConfig;
  private profileCache: Map<string, User> = new Map();
  private analyticsCache: Map<string, ProfileAnalytics> = new Map();

  private constructor(config: Partial<ProfileManagerConfig> = {}) {
    this.config = {
      enableCaching: true,
      cacheTTL: 15 * 60 * 1000, // 15 minutes
      maxAvatarSize: 5 * 1024 * 1024, // 5MB
      allowedAvatarTypes: ['image/jpeg', 'image/png', 'image/webp'],
      enableAnalytics: true,
      enableAuditLogging: true,
      defaultTimezone: 'UTC',
      defaultLanguage: 'en',
      ...config
    };
  }

  public static getInstance(config?: Partial<ProfileManagerConfig>): ProfileManager {
    if (!ProfileManager.instance) {
      ProfileManager.instance = new ProfileManager(config);
    }
    return ProfileManager.instance;
  }

  /**
   * Get user profile
   */
  async getProfile(userId: string): Promise<UserOperationResult<User>> {
    try {
      // Check cache first
      if (this.config.enableCaching && this.profileCache.has(userId)) {
        return {
          success: true,
          data: this.profileCache.get(userId)!
        };
      }

      const userDoc = await getDoc(doc(firestore, 'users', userId));
      if (!userDoc.exists()) {
        return {
          success: false,
          error: {
            type: UserErrorType.NOT_FOUND,
            message: 'User profile not found',
            timestamp: new Date()
          }
        };
      }

      const user = UserUtils.fromFirestore(userId, userDoc.data() as FirestoreUser);

      // Update cache
      if (this.config.enableCaching) {
        this.profileCache.set(userId, user);
      }

      // Track profile view
      if (this.config.enableAnalytics) {
        await this.trackProfileView(userId);
      }

      return {
        success: true,
        data: user
      };

    } catch (error) {
      return {
        success: false,
        error: {
          type: UserErrorType.INTERNAL_ERROR,
          message: error instanceof Error ? error.message : 'Failed to get profile',
          timestamp: new Date(),
          details: error instanceof Error ? { message: error.message, stack: error.stack } : { error: String(error) }
        }
      };
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    updates: ProfileUpdateData
  ): Promise<UserOperationResult<User>> {
    try {
      // Get current profile
      const currentProfile = await this.getProfile(userId);
      if (!currentProfile.success) {
        return currentProfile;
      }

      return await runTransaction(firestore, async (transaction) => {
        const userRef = doc(firestore, 'users', userId);
        const userDoc = await transaction.get(userRef);

        if (!userDoc.exists()) {
          return {
            success: false,
            error: {
              type: UserErrorType.NOT_FOUND,
              message: 'User not found',
              timestamp: new Date()
            }
          };
        }

        const currentUser = UserUtils.fromFirestore(userId, userDoc.data() as FirestoreUser);

        // Validate updates
        const validation = this.validateProfileData(updates);
        if (!validation.isValid) {
          return {
            success: false,
            error: {
              type: UserErrorType.VALIDATION_ERROR,
              message: validation.errors.join(', '),
              timestamp: new Date()
            }
          };
        }

        // Prepare update data
        const updateData = {
          ...updates,
          updatedAt: serverTimestamp()
        };

        transaction.update(userRef, updateData);

        // Create updated user object
        const updatedUser: User = {
          ...currentUser,
          ...updates,
          updatedAt: new Date()
        };

        // Log activity
        if (this.config.enableAuditLogging) {
          await this.logProfileActivity(
            userId,
            UserActivityType.PROFILE_UPDATE,
            'profile_updated',
            {
              updatedFields: Object.keys(updates),
              previousValues: Object.keys(updates).reduce((acc, key) => {
                acc[key] = (currentUser as any)[key];
                return acc;
              }, {} as Record<string, any>),
              newValues: updates
            }
          );
        }

        return {
          success: true,
          data: updatedUser
        };
      });

    } catch (error) {
      return {
        success: false,
        error: {
          type: UserErrorType.INTERNAL_ERROR,
          message: error instanceof Error ? error.message : 'Failed to update profile',
          timestamp: new Date(),
          details: error instanceof Error ? { message: error.message, stack: error.stack } : { error: String(error) }
        }
      };
    }
  }

  /**
   * Upload and set user avatar
   */
  async uploadAvatar(
    uploadData: AvatarUploadData
  ): Promise<UserOperationResult<string>> {
    try {
      const { file, userId, quality = 80, maxSize = this.config.maxAvatarSize } = uploadData;

      // Validate file
      const fileValidation = this.validateAvatarFile(file, maxSize);
      if (!fileValidation.isValid) {
        return {
          success: false,
          error: {
            type: UserErrorType.VALIDATION_ERROR,
            message: fileValidation.errors.join(', '),
            timestamp: new Date()
          }
        };
      }

      // Process image if needed
      const processedFile = await this.processAvatarImage(file, quality);

      // Generate unique filename
      const timestamp = Date.now();
      const extension = file.name.split('.').pop();
      const filename = `avatars/${userId}/${timestamp}.${extension}`;

      // Upload to Firebase Storage
      const storageRef = ref(storage, filename);
      const uploadResult = await uploadBytes(storageRef, processedFile);
      const downloadURL = await getDownloadURL(uploadResult.ref);

      // Get current profile to check for existing avatar
      const currentProfile = await this.getProfile(uploadData.userId);
      if (!currentProfile.success) {
        return {
          success: false,
          error: currentProfile.error!
        };
      }

      // Delete old avatar if exists
      if (currentProfile.data && (currentProfile.data as any).avatar) {
        await this.deleteOldAvatar((currentProfile.data as any).avatar);
      }

      // Update profile with new avatar URL
      const updateResult = await this.updateProfile(uploadData.userId, { 
        avatar: downloadURL 
      });

      if (!updateResult.success) {
        return {
          success: false,
          error: updateResult.error!
        };
      }

      // Log activity
      if (this.config.enableAuditLogging) {
        await this.logProfileActivity(
          uploadData.userId,
          UserActivityType.PROFILE_UPDATE,
          'avatar_uploaded',
          {
            avatarUrl: downloadURL,
            fileSize: uploadData.file.size,
            fileType: uploadData.file.type
          }
        );
      }

      return {
        success: true,
        data: downloadURL
      };

    } catch (error) {
      return {
        success: false,
        error: {
          type: UserErrorType.INTERNAL_ERROR,
          message: 'Failed to upload avatar',
          timestamp: new Date(),
          details: error instanceof Error ? { message: error.message, stack: error.stack } : { error: String(error) }
        }
      };
    }
  }

  /**
   * Remove user avatar
   */
  async removeAvatar(userId: string): Promise<UserOperationResult<void>> {
    try {
      // Get current profile
      const currentProfile = await this.getProfile(userId);
      if (!currentProfile.success) {
        return {
          success: false,
          error: currentProfile.error!
        };
      }

      const currentAvatarUrl = (currentProfile.data as any).avatar;
      if (!currentAvatarUrl) {
        return { success: true }; // No avatar to remove
      }

      // Update profile to remove avatar
      const updateResult = await this.updateProfile(userId, { avatar: '' });
      if (!updateResult.success) {
        return {
          success: false,
          error: updateResult.error!
        };
      }

      // Delete avatar file
      await this.deleteOldAvatar(currentAvatarUrl);

      // Log activity
      if (this.config.enableAuditLogging) {
        await this.logProfileActivity(
          userId,
          UserActivityType.PROFILE_UPDATE,
          'avatar_removed',
          {
            previousAvatarUrl: currentAvatarUrl
          }
        );
      }

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: {
          type: UserErrorType.INTERNAL_ERROR,
          message: 'Failed to remove avatar',
          timestamp: new Date(),
          details: error instanceof Error ? { message: error.message, stack: error.stack } : { error: String(error) }
        }
      };
    }
  }

  /**
   * Search user profiles
   */
  async searchProfiles(
    options: ProfileSearchOptions,
    pagination?: UserPaginationParams
  ): Promise<UserApiResponse<User[]>> {
    try {
      let q = query(collection(firestore, 'users'));

      // Apply basic filters
      if (options.location) {
        q = query(q, where('location', '==', options.location));
      }
      if (options.timezone) {
        q = query(q, where('timezone', '==', options.timezone));
      }
      if (options.language) {
        q = query(q, where('language', '==', options.language));
      }
      if (options.isVerified !== undefined) {
        q = query(q, where('isVerified', '==', options.isVerified));
      }

      // Apply sorting
      const sortField = options.sortBy || 'updatedAt';
      const sortDirection = options.sortOrder || 'desc';
      q = query(q, orderBy(sortField, sortDirection));

      // Apply pagination
      if (pagination?.limit) {
        q = query(q, limit(pagination.limit));
      }

      const snapshot = await getDocs(q);
      const profiles: User[] = [];

      snapshot.forEach(doc => {
        const user = UserUtils.fromFirestore(doc.id, doc.data() as FirestoreUser);
        
        // Apply additional filters that can't be done in Firestore
        if (this.matchesSearchCriteria(user, options)) {
          profiles.push(user);
        }
      });

      return {
        success: true,
        data: profiles,
        metadata: {
          timestamp: new Date(),
          requestId: `search_${Date.now()}`,
          version: '1.0',
          pagination: {
            page: pagination?.page || 1,
            limit: pagination?.limit || 50,
            total: profiles.length,
            hasNext: false,
            hasPrevious: false
          }
        }
      };

    } catch (error) {
      return {
        success: false,
        error: {
          type: UserErrorType.INTERNAL_ERROR,
          message: 'Failed to search profiles',
          timestamp: new Date(),
          details: error instanceof Error ? { message: error.message, stack: error.stack } : { error: String(error) }
        }
      };
    }
  }

  /**
   * Get profile analytics
   */
  async getProfileAnalytics(userId: string): Promise<UserOperationResult<ProfileAnalytics>> {
    try {
      // Check cache first
      if (this.config.enableCaching && this.analyticsCache.has(userId)) {
        return {
          success: true,
          data: this.analyticsCache.get(userId)!
        };
      }

      const profile = await this.getProfile(userId);
      if (!profile.success) {
        return {
          success: false,
          error: profile.error!
        };
      }

      // Calculate analytics
      if (!profile.data) {
        return {
          success: false,
          error: {
            type: UserErrorType.INTERNAL_ERROR,
            message: 'Profile data is missing',
            timestamp: new Date()
          }
        };
      }
      
      const analytics = await this.calculateProfileAnalytics(userId, profile.data);

      // Update cache
      if (this.config.enableCaching) {
        this.analyticsCache.set(userId, analytics);
      }

      return {
        success: true,
        data: analytics
      };

    } catch (error) {
      return {
        success: false,
        error: {
          type: UserErrorType.INTERNAL_ERROR,
          message: 'Failed to get profile analytics',
          timestamp: new Date(),
          details: error instanceof Error ? { message: error.message, stack: error.stack } : { error: String(error) }
        }
      };
    }
  }

  /**
   * Calculate profile completion score
   */
  calculateCompletionScore(user: User): number {
    const fields = [
      'displayName',
      'firstName',
      'lastName',
      'bio',
      'location',
      'avatar',
      'timezone',
      'language'
    ];

    const completedFields = fields.filter(field => {
      const value = (user as any)[field];
      return value && value.toString().trim().length > 0;
    });

    return Math.round((completedFields.length / fields.length) * 100);
  }

  /**
   * Get missing profile fields
   */
  getMissingFields(user: User): string[] {
    const requiredFields = [
      { key: 'displayName', label: 'Display Name' },
      { key: 'firstName', label: 'First Name' },
      { key: 'lastName', label: 'Last Name' },
      { key: 'bio', label: 'Bio' },
      { key: 'location', label: 'Location' },
      { key: 'avatar', label: 'Profile Picture' },
      { key: 'timezone', label: 'Timezone' }
    ];

    return requiredFields
      .filter(field => {
        const value = (user as any)[field.key];
        return !value || value.toString().trim().length === 0;
      })
      .map(field => field.label);
  }

  /**
   * Validate profile data
   */
  private validateProfileData(data: ProfileUpdateData): ProfileValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate display name
    if (data.displayName !== undefined) {
      if (!data.displayName.trim()) {
        errors.push('Display name cannot be empty');
      } else if (data.displayName.length < 2) {
        errors.push('Display name must be at least 2 characters');
      } else if (data.displayName.length > 50) {
        errors.push('Display name must be less than 50 characters');
      }
    }

    // Validate names
    if (data.firstName !== undefined && data.firstName.length > 30) {
      errors.push('First name must be less than 30 characters');
    }
    if (data.lastName !== undefined && data.lastName.length > 30) {
      errors.push('Last name must be less than 30 characters');
    }

    // Validate bio
    if (data.bio !== undefined && data.bio.length > 500) {
      errors.push('Bio must be less than 500 characters');
    }

    // Validate website URL
    if (data.website !== undefined && data.website.trim()) {
      try {
        new URL(data.website);
      } catch {
        errors.push('Website must be a valid URL');
      }
    }

    // Validate social links
    if (data.socialLinks) {
      Object.entries(data.socialLinks).forEach(([platform, url]) => {
        if (url && url.trim()) {
          try {
            new URL(url);
          } catch {
            errors.push(`${platform} link must be a valid URL`);
          }
        }
      });
    }

    // Validate timezone
    if (data.timezone !== undefined) {
      try {
        Intl.DateTimeFormat(undefined, { timeZone: data.timezone });
      } catch {
        errors.push('Invalid timezone');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate avatar file
   */
  private validateAvatarFile(file: File, maxSize: number): ProfileValidationResult {
    const errors: string[] = [];

    if (!this.config.allowedAvatarTypes.includes(file.type)) {
      errors.push(`File type ${file.type} is not allowed. Allowed types: ${this.config.allowedAvatarTypes.join(', ')}`);
    }

    if (file.size > maxSize) {
      errors.push(`File size ${Math.round(file.size / 1024 / 1024)}MB exceeds maximum ${Math.round(maxSize / 1024 / 1024)}MB`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Process avatar image (resize, compress)
   */
  private async processAvatarImage(file: File, quality: number): Promise<File> {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      // Server-side environment - return original file
      // In production, you might want to use a server-side image processing library
      console.warn('Image processing not available in server environment, returning original file');
      return file;
    }

    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      // Set timeout to prevent hanging
      const timeout = setTimeout(() => {
        reject(new Error('Image processing timeout'));
      }, 30000); // 30 seconds

      img.onload = () => {
        try {
          clearTimeout(timeout);
          
          // Set target dimensions (square avatar)
          const maxSize = 400; // 400x400 pixels
          const minSize = 50;   // Minimum size for quality
          const { width, height } = img;
          
          // Validate image dimensions
          if (width < minSize || height < minSize) {
            reject(new Error(`Image too small. Minimum size is ${minSize}x${minSize} pixels`));
            return;
          }
          
          // Calculate new dimensions maintaining aspect ratio
          let newWidth = width;
          let newHeight = height;
          
          if (width > height) {
            if (width > maxSize) {
              newHeight = (height * maxSize) / width;
              newWidth = maxSize;
            }
          } else {
            if (height > maxSize) {
              newWidth = (width * maxSize) / height;
              newHeight = maxSize;
            }
          }

          // Set canvas size
          canvas.width = newWidth;
          canvas.height = newHeight;

          // Enable image smoothing for better quality
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            // Fill with white background (for transparent images)
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, newWidth, newHeight);

            // Draw and resize image
            ctx.drawImage(img, 0, 0, newWidth, newHeight);

            // Convert to blob with specified quality
            canvas.toBlob(
              (blob) => {
                if (blob) {
                  // Check if processed file is actually smaller
                  if (blob.size >= file.size && newWidth >= width && newHeight >= height) {
                    // No benefit from processing, return original
                    resolve(file);
                    return;
                  }

                  // Create new file with processed image
                  const processedFile = new File(
                    [blob], 
                    file.name.replace(/\.[^/.]+$/, '') + '_processed.' + file.type.split('/')[1], 
                    { 
                      type: file.type,
                      lastModified: Date.now()
                    }
                  );
                  
                  console.log(`Image processed: ${file.size} bytes → ${blob.size} bytes (${Math.round((1 - blob.size/file.size) * 100)}% reduction)`);
                  resolve(processedFile);
                } else {
                  reject(new Error('Failed to process image'));
                }
              },
              file.type,
              quality / 100 // Convert percentage to decimal
            );
          } else {
            reject(new Error('Failed to get canvas context'));
          }
        } catch (error) {
          clearTimeout(timeout);
          reject(error);
        }
      };

      img.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('Failed to load image for processing'));
      };

      // Load the image
      try {
        img.src = URL.createObjectURL(file);
      } catch (error) {
        clearTimeout(timeout);
        reject(new Error('Failed to create object URL for image'));
      }
    });
  }

  /**
   * Delete old avatar from storage
   */
  private async deleteOldAvatar(avatarUrl: string): Promise<void> {
    try {
      // Extract storage path from URL
      const url = new URL(avatarUrl);
      const pathMatch = url.pathname.match(/\/o\/(.+)\?/);
      if (pathMatch) {
        const storagePath = decodeURIComponent(pathMatch[1]);
        const storageRef = ref(storage, storagePath);
        await deleteObject(storageRef);
      }
    } catch (error) {
      console.error('Failed to delete old avatar:', error);
      // Don't throw error as this is cleanup
    }
  }

  /**
   * Check if profile matches search criteria
   */
  private matchesSearchCriteria(user: User, options: ProfileSearchOptions): boolean {
    if (options.displayName) {
      const displayName = UserUtils.getDisplayName(user).toLowerCase();
      if (!displayName.includes(options.displayName.toLowerCase())) {
        return false;
      }
    }

    if (options.hasAvatar !== undefined) {
      const hasAvatar = !!(user as any).avatar && (user as any).avatar.trim().length > 0;
      if (hasAvatar !== options.hasAvatar) {
        return false;
      }
    }

    return true;
  }

  /**
   * Calculate profile analytics
   */
  private async calculateProfileAnalytics(userId: string, user: User): Promise<ProfileAnalytics> {
    try {
      const completionScore = this.calculateCompletionScore(user);
      const missingFields = this.getMissingFields(user);

      // Query activity logs for profile-related activities
      const activitiesRef = collection(firestore, 'userActivities');
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Get profile views
      const profileViewsQuery = query(
        activitiesRef,
        where('userId', '==', userId),
        where('action', '==', 'profile_viewed'),
        orderBy('timestamp', 'desc')
      );
      const profileViewsSnapshot = await getDocs(profileViewsQuery);
      const profileViews = profileViewsSnapshot.size;

      // Get profile views this week
      const viewsThisWeekQuery = query(
        activitiesRef,
        where('userId', '==', userId),
        where('action', '==', 'profile_viewed'),
        where('timestamp', '>=', Timestamp.fromDate(oneWeekAgo))
      );
      const viewsThisWeekSnapshot = await getDocs(viewsThisWeekQuery);
      const viewsThisWeek = viewsThisWeekSnapshot.size;

      // Get profile views this month
      const viewsThisMonthQuery = query(
        activitiesRef,
        where('userId', '==', userId),
        where('action', '==', 'profile_viewed'),
        where('timestamp', '>=', Timestamp.fromDate(oneMonthAgo))
      );
      const viewsThisMonthSnapshot = await getDocs(viewsThisMonthQuery);
      const viewsThisMonth = viewsThisMonthSnapshot.size;

      // Get profile updates
      const profileUpdatesQuery = query(
        activitiesRef,
        where('userId', '==', userId),
        where('action', '==', 'profile_updated'),
        orderBy('timestamp', 'desc')
      );
      const profileUpdatesSnapshot = await getDocs(profileUpdatesQuery);
      const profileUpdates = profileUpdatesSnapshot.size;

      // Get avatar changes
      const avatarChangesQuery = query(
        activitiesRef,
        where('userId', '==', userId),
        where('action', 'in', ['avatar_uploaded', 'avatar_removed']),
        orderBy('timestamp', 'desc')
      );
      const avatarChangesSnapshot = await getDocs(avatarChangesQuery);
      const avatarChanges = avatarChangesSnapshot.size;

      // Calculate update frequency (updates per month)
      const updateFrequency = profileUpdatesSnapshot.docs.length > 0 ? 
        profileUpdatesSnapshot.docs.filter(doc => {
          const timestamp = doc.data().timestamp?.toDate();
          return timestamp && timestamp >= oneMonthAgo;
        }).length : 0;

      // Query analytics collection for social link clicks if it exists
      let socialLinkClicks = 0;
      try {
        const analyticsRef = collection(firestore, 'profileAnalytics');
        const analyticsQuery = query(
          analyticsRef,
          where('userId', '==', userId),
          where('eventType', '==', 'social_link_click')
        );
        const analyticsSnapshot = await getDocs(analyticsQuery);
        socialLinkClicks = analyticsSnapshot.size;
      } catch (error) {
        // Analytics collection might not exist yet
        console.debug('Analytics collection not found, defaulting social link clicks to 0');
      }

      return {
        profileViews,
        profileUpdates,
        avatarChanges,
        socialLinkClicks,
        lastProfileUpdate: user.updatedAt,
        completionScore,
        missingFields,
        engagementMetrics: {
          viewsThisWeek,
          viewsThisMonth,
          updateFrequency
        }
      };

    } catch (error) {
      console.error('Error calculating profile analytics:', error);
      
      // Fallback to basic data if queries fail
      const completionScore = this.calculateCompletionScore(user);
      const missingFields = this.getMissingFields(user);

      return {
        profileViews: 0,
        profileUpdates: 0,
        avatarChanges: 0,
        socialLinkClicks: 0,
        lastProfileUpdate: user.updatedAt,
        completionScore,
        missingFields,
        engagementMetrics: {
          viewsThisWeek: 0,
          viewsThisMonth: 0,
          updateFrequency: 0
        }
      };
    }
  }

  /**
   * Track profile view
   */
  private async trackProfileView(userId: string): Promise<void> {
    if (!this.config.enableAnalytics) return;

    try {
      await this.logProfileActivity(
        userId,
        UserActivityType.PROFILE_UPDATE,
        'profile_viewed',
        {
          viewedAt: new Date().toISOString()
        }
      );
    } catch (error) {
      console.error('Failed to track profile view:', error);
    }
  }

  /**
   * Log profile-related activity
   */
  private async logProfileActivity(
    userId: string,
    type: UserActivityType,
    action: string,
    metadata: Record<string, any>
  ): Promise<void> {
    try {
      const activity = ActivityUtils.createActivity(
        userId,
        type,
        action,
        {
          context: ActivityContext.WEB,
          metadata: {
            ...metadata,
            success: true
          }
        }
      );

      // Save activity to Firestore
      const activitiesRef = collection(firestore, 'userActivities');
      await setDoc(doc(activitiesRef), {
        userId,
        type,
        action,
        context: ActivityContext.WEB,
        timestamp: serverTimestamp(),
        metadata: {
          ...metadata,
          success: true
        }
      });

    } catch (error) {
      console.error('Error logging profile activity:', error);
    }
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.profileCache.clear();
    this.analyticsCache.clear();
  }

  /**
   * Destroy manager instance
   */
  destroy(): void {
    this.clearCache();
    ProfileManager.instance = null as any;
  }
} 