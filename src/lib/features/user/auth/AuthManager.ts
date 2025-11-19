import { getFirebaseFirestore } from '../../core/firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  runTransaction 
} from 'firebase/firestore';
import { 
  UserConfig, 
  UserProfileData, 
  UserOperationResult, 
  UserApiResponse, 
  UserSearchParams, 
  UserPaginationParams,
  UserErrorType,
  UserStatus,
  OrganizationRole
} from '../types';
import { User, UserUtils } from '../models';
import { firestore } from '@/lib/core/firebase';

/**
 * Authentication configuration
 */
export interface AuthConfig {
  enableEmailVerification: boolean;
  enablePasswordReset: boolean;
  sessionTimeout: number;
  maxLoginAttempts: number;
  lockoutDuration: number;
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSymbols: boolean;
  };
}

/**
 * Login credentials interface
 */
export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

/**
 * Registration data interface
 */
export interface RegistrationData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  phoneNumber?: string;
  timezone?: string;
  language?: string;
  acceptTerms: boolean;
}

/**
 * Password reset data interface
 */
export interface PasswordResetData {
  email: string;
  token?: string;
  newPassword?: string;
}

/**
 * Session information interface
 */
export interface SessionInfo {
  userId: string;
  sessionId: string;
  createdAt: Date;
  expiresAt: Date;
  ipAddress: string;
  userAgent: string;
  isActive: boolean;
}

/**
 * Authentication Manager
 * Handles user authentication, registration, and account management
 */
export class AuthManager {
  private config: UserConfig;

  constructor(config: UserConfig) {
    this.config = config;
  }

  /**
   * Initialize the auth manager
   */
  public async initialize(): Promise<void> {
    // Initialization logic if needed
  }

  /**
   * Create a new user account
   */
  public async createUser(userData: UserProfileData): Promise<UserOperationResult<User>> {
    try {
      const userId = userData.id || `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const user = UserUtils.createUser({
        id: userId,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        displayName: userData.displayName || `${userData.firstName} ${userData.lastName}`,
        photoURL: userData.photoURL,
        bio: userData.bio,
        jobTitle: userData.jobTitle,
        phoneNumber: userData.phoneNumber,
        timezone: userData.timezone || 'UTC',
        language: userData.language || 'en',
        status: UserStatus.ACTIVE,
        emailVerified: false,
        lastLoginAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const firestore = getFirebaseFirestore();
      if (!firestore) {
        return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
      }
      const userRef = doc(firestore, 'users', userId);
      await setDoc(userRef, UserUtils.toFirestore(user));

      return {
        success: true,
        data: user
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: UserErrorType.OPERATION_FAILED,
          message: error instanceof Error ? error.message : 'Failed to create user',
          code: 'CREATE_USER_FAILED',
          timestamp: new Date()
        }
      };
    }
  }

  /**
   * Get user by ID
   */
  public async getUserById(userId: string): Promise<UserOperationResult<User>> {
    try {
      const userRef = doc(firestore, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        return {
          success: false,
          error: {
            type: UserErrorType.USER_NOT_FOUND,
            message: 'User not found',
            code: 'USER_NOT_FOUND',
            timestamp: new Date()
          }
        };
      }

      const user = UserUtils.fromFirestore(userId, userDoc.data() as any);
      
      return {
        success: true,
        data: user
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: UserErrorType.OPERATION_FAILED,
          message: error instanceof Error ? error.message : 'Failed to get user',
          code: 'GET_USER_FAILED',
          timestamp: new Date()
        }
      };
    }
  }

  /**
   * Get user by email
   */
  public async getUserByEmail(email: string): Promise<UserOperationResult<User>> {
    try {
      const usersRef = collection(firestore, 'users');
      const q = query(usersRef, where('email', '==', email), limit(1));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return {
          success: false,
          error: {
            type: UserErrorType.USER_NOT_FOUND,
            message: 'User not found',
            code: 'USER_NOT_FOUND',
            timestamp: new Date()
          }
        };
      }

      const userDoc = snapshot.docs[0];
      const user = UserUtils.fromFirestore(userDoc.id, userDoc.data() as any);
      
      return {
        success: true,
        data: user
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: UserErrorType.OPERATION_FAILED,
          message: error instanceof Error ? error.message : 'Failed to get user by email',
          code: 'GET_USER_BY_EMAIL_FAILED',
          timestamp: new Date()
        }
      };
    }
  }

  /**
   * Update user profile
   */
  public async updateUser(userId: string, updates: Partial<UserProfileData>): Promise<UserOperationResult<User>> {
    try {
      const userRef = doc(firestore, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        return {
          success: false,
          error: {
            type: UserErrorType.USER_NOT_FOUND,
            message: 'User not found',
            code: 'USER_NOT_FOUND',
            timestamp: new Date()
          }
        };
      }

      const currentUser = UserUtils.fromFirestore(userId, userDoc.data() as any);
      const updatedUser = {
        ...currentUser,
        ...updates,
        updatedAt: new Date()
      };

      await updateDoc(userRef, UserUtils.toFirestore(updatedUser));

      return {
        success: true,
        data: updatedUser
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: UserErrorType.OPERATION_FAILED,
          message: error instanceof Error ? error.message : 'Failed to update user',
          code: 'UPDATE_USER_FAILED',
          timestamp: new Date()
        }
      };
    }
  }

  /**
   * Delete user account
   */
  public async deleteUser(userId: string): Promise<UserOperationResult<void>> {
    try {
      return await runTransaction(firestore, async (transaction) => {
        const userRef = doc(firestore, 'users', userId);
        const userDoc = await transaction.get(userRef);

        if (!userDoc.exists()) {
          return {
            success: false,
            error: {
              type: UserErrorType.USER_NOT_FOUND,
              message: 'User not found',
              code: 'USER_NOT_FOUND',
              timestamp: new Date()
            }
          };
        }

        // Mark user as deleted instead of hard delete for GDPR compliance
        const deletedUser = {
          ...userDoc.data(),
          status: UserStatus.DELETED,
          deletedAt: new Date(),
          updatedAt: new Date()
        };

        transaction.update(userRef, deletedUser);

        return {
          success: true,
          data: undefined
        };
      });
    } catch (error) {
      return {
        success: false,
        error: {
          type: UserErrorType.OPERATION_FAILED,
          message: error instanceof Error ? error.message : 'Failed to delete user',
          code: 'DELETE_USER_FAILED',
          timestamp: new Date()
        }
      };
    }
  }

  /**
   * Search users with filters and pagination
   */
  public async searchUsers(
    params: UserSearchParams,
    pagination?: UserPaginationParams
  ): Promise<UserApiResponse<User[]>> {
    try {
      const usersRef = collection(firestore, 'users');
      let q = query(usersRef);

      // Apply filters
      if (params.status && params.status.length > 0) {
        q = query(q, where('status', 'in', params.status));
      }

      if (params.organizationId) {
        q = query(q, where('organizationIds', 'array-contains', params.organizationId));
      }

      if (params.createdAfter) {
        q = query(q, where('createdAt', '>=', params.createdAfter));
      }

      if (params.createdBefore) {
        q = query(q, where('createdAt', '<=', params.createdBefore));
      }

      // Apply sorting
      if (params.sortBy) {
        const direction = params.sortOrder === 'desc' ? 'desc' : 'asc';
        q = query(q, orderBy(params.sortBy, direction));
      }

      // Apply pagination
      if (pagination?.limit) {
        q = query(q, limit(pagination.limit));
      }

      const snapshot = await getDocs(q);
      const users = snapshot.docs.map(doc => 
        UserUtils.fromFirestore(doc.id, doc.data() as any)
      );

      // Apply text search filter (client-side for now)
      let filteredUsers = users;
      if (params.query) {
        const searchTerm = params.query.toLowerCase();
        filteredUsers = users.filter(user => 
          user.firstName.toLowerCase().includes(searchTerm) ||
          user.lastName.toLowerCase().includes(searchTerm) ||
          user.email.toLowerCase().includes(searchTerm) ||
          (user.displayName && user.displayName.toLowerCase().includes(searchTerm))
        );
      }

      return {
        success: true,
        data: filteredUsers,
        metadata: {
          timestamp: new Date(),
          requestId: `search_${Date.now()}`,
          version: '1.0',
          pagination: {
            page: pagination?.page || 1,
            limit: pagination?.limit || 50,
            total: filteredUsers.length,
            hasNext: filteredUsers.length === (pagination?.limit || 50),
            hasPrevious: (pagination?.page || 1) > 1
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: UserErrorType.OPERATION_FAILED,
          message: error instanceof Error ? error.message : 'Failed to search users',
          code: 'SEARCH_USERS_FAILED',
          timestamp: new Date()
        }
      };
    }
  }

  /**
   * Verify user email
   */
  public async verifyEmail(userId: string): Promise<UserOperationResult<User>> {
    try {
      const userRef = doc(firestore, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        return {
          success: false,
          error: {
            type: UserErrorType.USER_NOT_FOUND,
            message: 'User not found',
            code: 'USER_NOT_FOUND',
            timestamp: new Date()
          }
        };
      }

      const updates = {
        emailVerified: true,
        emailVerifiedAt: new Date(),
        updatedAt: new Date()
      };

      await updateDoc(userRef, updates);

      const updatedUser = UserUtils.fromFirestore(userId, {
        ...userDoc.data(),
        ...updates
      } as any);

      return {
        success: true,
        data: updatedUser
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: UserErrorType.OPERATION_FAILED,
          message: error instanceof Error ? error.message : 'Failed to verify email',
          code: 'VERIFY_EMAIL_FAILED',
          timestamp: new Date()
        }
      };
    }
  }

  /**
   * Update user status
   */
  public async updateUserStatus(userId: string, status: UserStatus): Promise<UserOperationResult<User>> {
    try {
      const userRef = doc(firestore, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        return {
          success: false,
          error: {
            type: UserErrorType.USER_NOT_FOUND,
            message: 'User not found',
            code: 'USER_NOT_FOUND',
            timestamp: new Date()
          }
        };
      }

      const updates = {
        status,
        updatedAt: new Date()
      };

      await updateDoc(userRef, updates);

      const updatedUser = UserUtils.fromFirestore(userId, {
        ...userDoc.data(),
        ...updates
      } as any);

      return {
        success: true,
        data: updatedUser
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: UserErrorType.OPERATION_FAILED,
          message: error instanceof Error ? error.message : 'Failed to update user status',
          code: 'UPDATE_USER_STATUS_FAILED',
          timestamp: new Date()
        }
      };
    }
  }

  /**
   * Update last login timestamp
   */
  public async updateLastLogin(userId: string): Promise<boolean> {
    try {
      const userRef = doc(firestore, 'users', userId);
      await updateDoc(userRef, {
        lastLoginAt: new Date(),
        updatedAt: new Date()
      });
      return true;
    } catch (error) {
      console.error('Failed to update last login:', error);
      return false;
    }
  }

  /**
   * Health check
   */
  public async healthCheck(): Promise<boolean> {
    try {
      // Simple health check - try to read from users collection
      const usersRef = collection(firestore, 'users');
      const q = query(usersRef, limit(1));
      await getDocs(q);
      return true;
    } catch (error) {
      console.error('AuthManager health check failed:', error);
      return false;
    }
  }

  /**
   * Update configuration
   */
  public updateConfig(config: UserConfig): void {
    this.config = config;
  }

  /**
   * Cleanup resources
   */
  public async cleanup(): Promise<void> {
    // Cleanup logic if needed
  }
} 