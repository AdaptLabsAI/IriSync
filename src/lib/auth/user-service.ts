import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  getDocs, 
  query, 
  where, 
  Timestamp,
  writeBatch,
  addDoc
} from 'firebase/firestore';
import { firestore as db } from '../firebase';
import { auth } from '../firebase/admin';
import logger from '../logging/logger';
import { User, UserRole, SubscriptionTier, SubscriptionTierValues } from '../models/User';
import { SubscriptionTier as BaseSubscriptionTier } from '../subscription/models/subscription';
import { 
  Organization,
  UsageQuota,
  createPersonalOrganization,
  prepareOrganizationForDeletion,
  hasOrganizationRole,
  OrganizationRoleType,
  OrganizationStatus,
  createBusinessOrganization
} from '../models/Organization';
import Stripe from 'stripe';
import { getAuth } from 'firebase/auth';

// Extend the User interface to include the new effectiveDeletionDate field
interface ExtendedUser extends User {
  effectiveDeletionDate?: Timestamp;
}

// Production Stripe client implementation
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-04-30.basil', // Latest stable API version
  typescript: true,
});

/**
 * Service for user management including account creation, deletion and organization handling
 */
export class UserService {
  /**
   * Get a user by ID
   * @param userId User ID
   * @returns User object or null if not found
   */
  async getUserById(userId: string): Promise<User | null> {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        return null;
      }
      
      return {
        id: userDoc.id,
        ...userDoc.data()
      } as User;
    } catch (error) {
      logger.error('Error getting user', { error, userId });
      throw error;
    }
  }
  
  /**
   * Create a new user with personal or business organization
   * @param userData User data
   * @param options Additional creation options
   * @returns Created user
   */
  async createUser(
    userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>,
    options?: {
      subscriptionTier?: SubscriptionTier;
      organizationType?: 'personal' | 'business';
      companyName?: string;
      seats?: number;
      customToken?: boolean;
      userSettings?: boolean;
      defaultFolders?: boolean;
    }
  ): Promise<{
    user: User;
    organizationId: string;
    customToken?: string;
  }> {
    try {
      const userId = userData.firebaseAuthId || `user-${Date.now()}`;
      const now = Timestamp.now();
      
      // Set display name based on email if not provided
      const displayName = userData.displayName || 
                          (userData.firstName && userData.lastName) ? 
                          `${userData.firstName} ${userData.lastName}` : 
                          userData.email.split('@')[0];
      
      // Determine subscription tier and organization type
      const subscriptionTier = options?.subscriptionTier || BaseSubscriptionTier.CREATOR;
      const organizationType = options?.organizationType || 'personal';
      const seats = options?.seats || 1;
      
      // Create user object
      const user: Omit<User, 'id'> = {
        ...userData,
        displayName,
        createdAt: now,
        updatedAt: now,
        status: 'active',
        role: userData.role || UserRole.USER,
        organizations: []
      };
      
      // Create organization based on type
      let personalOrg: Omit<Organization, 'id'>;
      let organizationId: string;
      
      if (organizationType === 'business' && options?.companyName) {
        // Create business organization
        organizationId = `biz-${Date.now()}`;
        personalOrg = createBusinessOrganization(
          userId,
          options.companyName,
          userData.email,
          displayName,
          subscriptionTier
        );
        
        // Update seats if provided
        if (seats > 1) {
          personalOrg.usageQuota.teamMembers.limit = seats;
        }
      } else {
        // Create personal organization
        organizationId = `personal-${userId}`;
        personalOrg = createPersonalOrganization(
          userId,
          displayName,
          userData.email
        );
        
        // Update subscription tier and quotas for personal org
        personalOrg.billing.subscriptionTier = subscriptionTier;
        personalOrg.usageQuota = {
          ...personalOrg.usageQuota,
          ...this.getTierQuotaLimits(subscriptionTier)
        };
      }
      
      // Write both documents in a batch
      const batch = writeBatch(db);
      
      // Set user document
      const userRef = doc(db, 'users', userId);
      batch.set(userRef, user);
      
      // Set organization document
      const orgRef = doc(db, 'organizations', organizationId);
      batch.set(orgRef, personalOrg);
      
      // Commit the batch
      await batch.commit();
      
      // Update user with organization reference
      await updateDoc(userRef, {
        personalOrganizationId: organizationId,
        organizations: [organizationId],
        currentOrganizationId: organizationId
      });
      
      // Create user settings if requested
      if (options?.userSettings !== false) {
        await setDoc(doc(db, 'userSettings', userId), {
          userId,
          theme: 'light',
          emailNotifications: true,
          createdAt: now,
          updatedAt: now,
        });
      }
      
      // Create default folders if requested
      if (options?.defaultFolders !== false) {
        const defaultFolders = ['Images', 'Videos', 'Documents'];
        const folderPromises = defaultFolders.map(folder =>
          addDoc(collection(db, 'folders'), {
            userId,
            name: folder,
            path: `/${folder}`,
            createdAt: now,
            updatedAt: now,
          })
        );
        await Promise.all(folderPromises);
      }
      
      // Generate custom token if requested
      let customToken: string | undefined;
      if (options?.customToken) {
        customToken = await auth.createCustomToken(userId);
      }
      
      // Get updated user
      const updatedUserDoc = await getDoc(userRef);
      
      logger.info('Created new user with organization', { 
        userId, 
        organizationId,
        organizationType,
        subscriptionTier
      });
      
      return {
        user: {
          id: updatedUserDoc.id,
          ...updatedUserDoc.data()
        } as User,
        organizationId,
        ...(customToken && { customToken })
      };
    } catch (error) {
      logger.error('Error creating user', { error, userData });
      throw error;
    }
  }
  
  /**
   * Get usage quota limits based on subscription tier
   * @param tier Subscription tier
   * @returns Quota limits
   */
  private getTierQuotaLimits(tier: SubscriptionTier): Partial<UsageQuota> {
    switch (tier) {
      case BaseSubscriptionTier.ENTERPRISE:
        return {
          aiTokens: {
            limit: 5000,
            used: 0,
            resetDate: Timestamp.fromDate(new Date(new Date().setMonth(new Date().getMonth() + 1)))
          },
          storage: {
            limitMB: 100000, // 100GB
            usedMB: 0
          },
          socialAccounts: {
            limit: Number.MAX_SAFE_INTEGER, // Unlimited
            used: 0
          },
          teamMembers: {
            limit: 50,
            used: 1
          }
        };
      case BaseSubscriptionTier.INFLUENCER:
        return {
          aiTokens: {
            limit: 500,
            used: 0,
            resetDate: Timestamp.fromDate(new Date(new Date().setMonth(new Date().getMonth() + 1)))
          },
          storage: {
            limitMB: 10000, // 10GB
            usedMB: 0
          },
          socialAccounts: {
            limit: Number.MAX_SAFE_INTEGER, // Unlimited
            used: 0
          },
          teamMembers: {
            limit: 10,
            used: 1
          }
        };
      case BaseSubscriptionTier.CREATOR:
      default:
        return {
          aiTokens: {
            limit: 100,
            used: 0,
            resetDate: Timestamp.fromDate(new Date(new Date().setMonth(new Date().getMonth() + 1)))
          },
          storage: {
            limitMB: 1000, // 1GB
            usedMB: 0
          },
          socialAccounts: {
            limit: 5,
            used: 0
          },
          teamMembers: {
            limit: 3,
            used: 1
          }
        };
    }
  }
  
  /**
   * Add a user to an organization
   * @param userId User ID
   * @param organizationId Organization ID
   * @param role User's role in the organization
   * @param invitedByUserId User ID of the inviter
   * @returns Success status
   */
  async addUserToOrganization(
    userId: string,
    organizationId: string,
    role: OrganizationRoleType,
    invitedByUserId: string
  ): Promise<boolean> {
    try {
      // Get user and organization
      const [user, organization] = await Promise.all([
        this.getUserById(userId),
        this.getOrganizationById(organizationId)
      ]);
      
      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }
      
      if (!organization) {
        throw new Error(`Organization not found: ${organizationId}`);
      }
      
      // Check if organization is active
      if (organization.status !== OrganizationStatus.ACTIVE) {
        throw new Error(`Organization is not active: ${organizationId}`);
      }
      
      // Check if inviter has permission to add users
      if (!hasOrganizationRole(organization, invitedByUserId, OrganizationRoleType.ADMIN) && 
          invitedByUserId !== organization.ownerUserId) {
        throw new Error('Only admins and owners can add users to the organization');
      }
      
      // Check if user is already a member
      if (organization.members[userId]) {
        logger.warn('User is already a member of this organization', { userId, organizationId });
        return true;
      }
      
      // Check team members quota
      if (Object.keys(organization.members).length >= organization.usageQuota.teamMembers.limit) {
        throw new Error('Organization has reached the maximum number of team members');
      }
      
      // Update organization with new member
      const now = Timestamp.now();
      const orgRef = doc(db, 'organizations', organizationId);
      await updateDoc(orgRef, {
        [`members.${userId}`]: {
          userId,
          email: user.email,
          displayName: user.displayName || user.email.split('@')[0],
          role,
          joinedAt: now,
          invitedBy: invitedByUserId
        },
        'usageQuota.teamMembers.used': organization.usageQuota.teamMembers.used + 1,
        updatedAt: now
      });
      
      // Update user's organizations array
      const userRef = doc(db, 'users', userId);
      const userOrgs = user.organizations || [];
      
      if (!userOrgs.includes(organizationId)) {
        await updateDoc(userRef, {
          organizations: [...userOrgs, organizationId],
          updatedAt: now,
          // Set as current organization if user doesn't have one yet
          ...((!user.currentOrganizationId) ? {currentOrganizationId: organizationId} : {})
        });
      }
      
      logger.info('Added user to organization', { 
        userId, 
        organizationId, 
        role, 
        invitedByUserId 
      });
      
      return true;
    } catch (error) {
      logger.error('Error adding user to organization', { 
        error, 
        userId, 
        organizationId 
      });
      throw error;
    }
  }
  
  /**
   * Remove a user from an organization
   * @param userId User ID to remove
   * @param organizationId Organization ID
   * @param removedByUserId User ID performing the removal
   * @returns Success status
   */
  async removeUserFromOrganization(
    userId: string,
    organizationId: string,
    removedByUserId: string
  ): Promise<boolean> {
    try {
      // Get organization
      const organization = await this.getOrganizationById(organizationId);
      
      if (!organization) {
        throw new Error(`Organization not found: ${organizationId}`);
      }
      
      // Cannot remove the owner
      if (userId === organization.ownerUserId) {
        throw new Error('Cannot remove the organization owner');
      }
      
      // Check if remover has permission
      if (!hasOrganizationRole(organization, removedByUserId, OrganizationRoleType.ADMIN) && 
          removedByUserId !== organization.ownerUserId) {
        throw new Error('Only admins and owners can remove users');
      }
      
      // Check if user is a member
      if (!organization.members[userId]) {
        logger.warn('User is not a member of this organization', { userId, organizationId });
        return true;
      }
      
      // Update organization by removing member
      const now = Timestamp.now();
      const orgRef = doc(db, 'organizations', organizationId);
      
      // Create updated members object without the user
      const updatedMembers = { ...organization.members };
      delete updatedMembers[userId];
      
      // Update teams to remove the user
      const updatedTeams = { ...organization.teams };
      if (updatedTeams) {
        Object.keys(updatedTeams).forEach(teamId => {
          const team = updatedTeams[teamId];
          
          // Remove user from team's memberIds
          updatedTeams[teamId] = {
            ...team,
            memberIds: team.memberIds.filter(id => id !== userId),
            managers: team.managers.filter(id => id !== userId)
          };
        });
      }
      
      // Update organization document
      await updateDoc(orgRef, {
        members: updatedMembers,
        teams: updatedTeams,
        'usageQuota.teamMembers.used': Math.max(0, organization.usageQuota.teamMembers.used - 1),
        updatedAt: now
      });
      
      // Update user's organizations array
      const user = await this.getUserById(userId);
      if (user && user.organizations) {
        const userRef = doc(db, 'users', userId);
        const updatedOrgs = user.organizations.filter(id => id !== organizationId);
        
        let updates: any = {
          organizations: updatedOrgs,
          updatedAt: now
        };
        
        // If this was the user's current organization, change to the personal org or another org
        if (user.currentOrganizationId === organizationId) {
          const newCurrentOrg = user.personalOrganizationId || 
                               (updatedOrgs.length > 0 ? updatedOrgs[0] : null);
          
          if (newCurrentOrg) {
            updates.currentOrganizationId = newCurrentOrg;
          } else {
            // Unset current organization if there's no alternative
            updates.currentOrganizationId = null;
          }
        }
        
        await updateDoc(userRef, updates);
      }
      
      logger.info('Removed user from organization', { 
        userId, 
        organizationId, 
        removedByUserId 
      });
      
      return true;
    } catch (error) {
      logger.error('Error removing user from organization', { 
        error, 
        userId, 
        organizationId 
      });
      throw error;
    }
  }
  
  /**
   * Request account deletion for a user
   * @param userId User ID
   * @returns Success status
   */
  async requestAccountDeletion(userId: string): Promise<boolean> {
    try {
      const user = await this.getUserById(userId);
      
      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }
      
      if (user.status === 'deletion_pending') {
        logger.warn('User account is already pending deletion', { userId });
        return true;
      }
      
      const now = Timestamp.now();
      const userRef = doc(db, 'users', userId);
      
      // Find active subscriptions across user's organizations
      const billingEndDate = await this.findLatestBillingPeriodEnd(user);
      
      // Set user account to pending deletion
      // The actual deletion date will be the later of:
      // 1. 30 days from now
      // 2. End of the latest billing period across all organizations
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      
      // Use the later date between 30 days from now and billing period end
      const effectiveDeletionDate = billingEndDate && billingEndDate > thirtyDaysFromNow 
        ? billingEndDate : thirtyDaysFromNow;
      
      await updateDoc(userRef, {
        status: 'deletion_pending',
        deletionRequestedAt: now,
        // Store the calculated deletion date
        effectiveDeletionDate: Timestamp.fromDate(effectiveDeletionDate),
        updatedAt: now
      });
      
      // Mark personal organization for deletion
      if (user.personalOrganizationId) {
        const orgId = user.personalOrganizationId;
        const orgDoc = await getDoc(doc(db, 'organizations', orgId));
        
        if (orgDoc.exists()) {
          const organization = {
            id: orgDoc.id,
            ...orgDoc.data()
          } as Organization;
          
          // Note: We're not calling prepareOrganizationForDeletion here because
          // we need to set a custom deletion date based on billing period
          await updateDoc(doc(db, 'organizations', orgId), {
            status: OrganizationStatus.PENDING_DELETION,
            deletionDate: Timestamp.fromDate(effectiveDeletionDate),
            updatedAt: now
          });
          
          // Cancel any active subscription for the organization
          // This will allow the subscription to remain active until the end of the current billing period
          await this.cancelOrganizationSubscription(orgId);
        }
      }
      
      // Remove user from all organizations except personal
      if (user.organizations) {
        for (const orgId of user.organizations) {
          // Skip personal organization (already marked for deletion)
          if (orgId === user.personalOrganizationId) continue;
          
          // For all other organizations, remove the user
          await this.removeUserFromOrganization(userId, orgId, userId);
        }
      }
      
      logger.info('Requested account deletion', { 
        userId, 
        effectiveDeletionDate 
      });
      
      return true;
    } catch (error) {
      logger.error('Error requesting account deletion', { error, userId });
      throw error;
    }
  }
  
  /**
   * Find the latest billing period end date across all of a user's organizations
   * @param user User object
   * @returns The latest billing period end date, or null if no active subscriptions
   */
  private async findLatestBillingPeriodEnd(user: User): Promise<Date | null> {
    try {
      if (!user.organizations || user.organizations.length === 0) {
        return null;
      }
      
      let latestDate: Date | null = null;
      
      // Check each organization for active subscriptions
      for (const orgId of user.organizations) {
        const orgDoc = await getDoc(doc(db, 'organizations', orgId));
        
        if (!orgDoc.exists()) continue;
        
        const organization = orgDoc.data();
        const billing = organization.billing;
        
        // If organization has an active subscription with an end date
        if (billing && 
            billing.subscriptionId && 
            billing.subscriptionStatus === 'active' && 
            billing.currentPeriodEnd) {
          
          const periodEndDate = billing.currentPeriodEnd.toDate();
          
          // Keep track of the latest end date
          if (!latestDate || periodEndDate > latestDate) {
            latestDate = periodEndDate;
          }
          
          // To ensure we have the most up-to-date end date, also check with Stripe
          try {
            const subscription = await stripe.subscriptions.retrieve(billing.subscriptionId);
            
            if (subscription.status === 'active' || subscription.status === 'trialing') {
              // Cast to any to access the property that the typings aren't recognizing
              const periodEnd = (subscription as any).current_period_end;
              const stripeEndDate = new Date(periodEnd * 1000);
              
              if (!latestDate || stripeEndDate > latestDate) {
                latestDate = stripeEndDate;
              }
            }
          } catch (stripeError) {
            logger.warn('Error retrieving subscription from Stripe', {
              error: stripeError,
              orgId,
              subscriptionId: billing.subscriptionId
            });
            // Continue with local data if Stripe API fails
          }
        }
      }
      
      return latestDate;
    } catch (error) {
      logger.error('Error finding latest billing period end', { error });
      return null;
    }
  }
  
  /**
   * Cancel an organization's active subscription
   * @param organizationId Organization ID
   * @returns Success status
   */
  private async cancelOrganizationSubscription(organizationId: string): Promise<boolean> {
    try {
      const orgDoc = await getDoc(doc(db, 'organizations', organizationId));
      
      if (!orgDoc.exists()) {
        logger.warn('Organization not found for subscription cancellation', { organizationId });
        return false;
      }
      
      const organization = orgDoc.data();
      const billing = organization.billing;
      
      if (!billing || !billing.subscriptionId) {
        logger.info('No active subscription to cancel', { organizationId });
        return true;
      }
      
      // Cancel the subscription in Stripe, allowing it to remain active until the end of the period
      await stripe.subscriptions.update(billing.subscriptionId, {
        cancel_at_period_end: true,
        cancellation_details: {
          comment: 'Customer requested account deletion',
          feedback: 'other'
        }
      });
      
      // Update organization record with cancellation status
      await updateDoc(doc(db, 'organizations', organizationId), {
        'billing.cancellationRequested': true,
        'billing.subscriptionStatus': 'canceled',
        'billing.cancellationDate': Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      
      logger.info('Cancelled organization subscription', { 
        organizationId, 
        subscriptionId: billing.subscriptionId 
      });
      
      return true;
    } catch (error) {
      logger.error('Error cancelling organization subscription', { error, organizationId });
      // Don't throw the error - this shouldn't block account deletion
      return false;
    }
  }
  
  /**
   * Execute pending account deletions for users who requested deletion
   * @returns Number of accounts deleted
   */
  async executePendingDeletions(): Promise<number> {
    try {
      // Find users with pending deletion status
      const usersRef = collection(db, 'users');
      const q = query(
        usersRef, 
        where('status', '==', 'deletion_pending')
      );
      
      const snapshot = await getDocs(q);
      let deletedCount = 0;
      
      const now = new Date();
      
      for (const userDoc of snapshot.docs) {
        // Use ExtendedUser type to include effectiveDeletionDate
        const user = { id: userDoc.id, ...userDoc.data() } as ExtendedUser;
        
        // Check if we've reached the effective deletion date
        // This could be either:
        // 1. The explicitly calculated deletion date if it exists
        // 2. 30 days after the deletion request was made (legacy behavior)
        let shouldDelete = false;
        
        if (user.effectiveDeletionDate) {
          // Use the explicitly calculated deletion date that accounts for billing periods
          shouldDelete = now >= user.effectiveDeletionDate.toDate();
        } else if (user.deletionRequestedAt) {
          // Fallback to legacy behavior (30 days after request)
          const deletionDate = new Date(user.deletionRequestedAt.toDate().getTime() + 30 * 24 * 60 * 60 * 1000);
          shouldDelete = now >= deletionDate;
        }
        
        if (shouldDelete) {
          // Double check if any subscriptions are still active
          const stillHasActiveSubscription = await this.userHasActiveSubscription(user);
          
          if (!stillHasActiveSubscription) {
            // Only delete if no active subscriptions remain
            await this.permanentlyDeleteUser(user.id);
            deletedCount++;
          } else {
            logger.info('Delaying user deletion due to active subscription', { userId: user.id });
          }
        }
      }
      
      logger.info('Executed pending user deletions', { deletedCount });
      return deletedCount;
    } catch (error) {
      logger.error('Error executing pending deletions', { error });
      throw error;
    }
  }
  
  /**
   * Check if a user has any active subscriptions across their organizations
   * @param user User object
   * @returns True if user has any active subscriptions
   */
  private async userHasActiveSubscription(user: User): Promise<boolean> {
    try {
      if (!user.organizations || user.organizations.length === 0) {
        return false;
      }
      
      // Check each organization for active subscriptions
      for (const orgId of user.organizations) {
        const orgDoc = await getDoc(doc(db, 'organizations', orgId));
        
        if (!orgDoc.exists()) continue;
        
        const organization = orgDoc.data();
        const billing = organization.billing;
        
        // If organization has an active subscription
        if (billing && 
            billing.subscriptionId && 
            (billing.subscriptionStatus === 'active' || billing.subscriptionStatus === 'trialing')) {
          
          // Double-check with Stripe to verify the subscription is truly active
          try {
            const subscription = await stripe.subscriptions.retrieve(billing.subscriptionId);
            
            if (subscription.status === 'active' || subscription.status === 'trialing') {
              // Cast to any to access the property that the typings aren't recognizing
              const periodEnd = (subscription as any).current_period_end;
              const currentPeriodEnd = new Date(periodEnd * 1000);
              if (new Date() < currentPeriodEnd) {
                return true;
              }
            }
          } catch (stripeError) {
            logger.warn('Error retrieving subscription from Stripe', {
              error: stripeError,
              orgId,
              subscriptionId: billing.subscriptionId
            });
            // If we can't connect to Stripe, use the local status (fail safe)
            if (billing.currentPeriodEnd && new Date() < billing.currentPeriodEnd.toDate()) {
              return true;
            }
          }
        }
      }
      
      return false;
    } catch (error) {
      logger.error('Error checking if user has active subscription', { error });
      // In case of error, assume there might be an active subscription to be safe
      return true;
    }
  }
  
  /**
   * Permanently delete a user and all their data
   * @param userId User ID
   * @returns Success status
   */
  private async permanentlyDeleteUser(userId: string): Promise<boolean> {
    try {
      const user = await this.getUserById(userId);
      
      if (!user) {
        logger.warn('User not found for permanent deletion', { userId });
        return false;
      }
      
      // Delete user's personal organization if it exists
      if (user.personalOrganizationId) {
        await deleteDoc(doc(db, 'organizations', user.personalOrganizationId));
        logger.info('Deleted personal organization', { 
          userId, 
          organizationId: user.personalOrganizationId 
        });
      }
      
      // Clean up any Stripe customer data if present
      // This would only be present on legacy user records that haven't migrated to org-based subscriptions
      try {
        // Find Stripe customer by email or metadata
        const customers = await stripe.customers.list({
          email: user.email,
          limit: 1
        });
        
        if (customers.data.length > 0) {
          const customerId = customers.data[0].id;
          // Delete the customer in Stripe
          await stripe.customers.del(customerId);
          logger.info('Deleted Stripe customer', { 
            userId, 
            stripeCustomerId: customerId
          });
        }
      } catch (stripeError) {
        logger.warn('Error cleaning up Stripe customer', { 
          userId, 
          error: stripeError 
        });
        // Continue with deletion even if Stripe cleanup fails
      }
      
      // Delete user document
      await deleteDoc(doc(db, 'users', userId));
      
      logger.info('Permanently deleted user', { userId });
      return true;
    } catch (error) {
      logger.error('Error permanently deleting user', { error, userId });
      throw error;
    }
  }
  
  /**
   * Get an organization by ID
   * @param organizationId Organization ID
   * @returns Organization object or null if not found
   */
  private async getOrganizationById(organizationId: string): Promise<Organization | null> {
    try {
      const orgRef = doc(db, 'organizations', organizationId);
      const orgDoc = await getDoc(orgRef);
      
      if (!orgDoc.exists()) {
        return null;
      }
      
      return {
        id: orgDoc.id,
        ...orgDoc.data()
      } as Organization;
    } catch (error) {
      logger.error('Error getting organization', { error, organizationId });
      throw error;
    }
  }

  /**
   * Get subscription tier for a user based on their current organization
   * @param userId User ID
   * @returns Subscription tier or 'none' if not found
   */
  async getUserSubscriptionTier(userId: string): Promise<SubscriptionTier> {
    try {
      const user = await this.getUserById(userId);
      
      if (!user) {
        return SubscriptionTierValues.NONE;
      }
      
      // Get current organization ID
      const orgId = user.currentOrganizationId || user.personalOrganizationId;
      
      if (!orgId) {
        return SubscriptionTierValues.NONE;
      }
      
      // Get organization details
      const orgRef = doc(db, 'organizations', orgId);
      const orgDoc = await getDoc(orgRef);
      
      if (!orgDoc.exists()) {
        return SubscriptionTierValues.NONE;
      }
      
      const organization = orgDoc.data();
      
      // Return subscription tier from organization billing
      return organization.billing?.subscriptionTier || SubscriptionTierValues.NONE;
    } catch (error) {
      logger.error('Error getting user subscription tier', { error, userId });
      return SubscriptionTierValues.NONE;
    }
  }
  
  /**
   * Get token balance for a user based on their current organization
   * @param userId User ID
   * @returns Token balance or 0 if not found
   */
  async getUserTokenBalance(userId: string): Promise<number> {
    try {
      const user = await this.getUserById(userId);
      
      if (!user) {
        return 0;
      }
      
      // Get current organization ID
      const orgId = user.currentOrganizationId || user.personalOrganizationId;
      
      if (!orgId) {
        return 0;
      }
      
      // Get organization details
      const orgRef = doc(db, 'organizations', orgId);
      const orgDoc = await getDoc(orgRef);
      
      if (!orgDoc.exists()) {
        return 0;
      }
      
      const organization = orgDoc.data();
      
      // Return token balance from organization usage quota
      return organization.usageQuota?.aiTokens?.limit || 0;
    } catch (error) {
      logger.error('Error getting user token balance', { error, userId });
      return 0;
    }
  }
  
  /**
   * Get social accounts limit for a user based on their current organization
   * @param userId User ID
   * @returns Social accounts limit or 0 if not found
   */
  async getUserSocialAccountsLimit(userId: string): Promise<number> {
    try {
      const user = await this.getUserById(userId);
      
      if (!user) {
        return 0;
      }
      
      // Get current organization ID
      const orgId = user.currentOrganizationId || user.personalOrganizationId;
      
      if (!orgId) {
        return 0;
      }
      
      // Get organization details
      const orgRef = doc(db, 'organizations', orgId);
      const orgDoc = await getDoc(orgRef);
      
      if (!orgDoc.exists()) {
        return 0;
      }
      
      const organization = orgDoc.data();
      
      // Return social accounts limit from organization usage quota
      return organization.usageQuota?.socialAccounts?.limit || 0;
    } catch (error) {
      logger.error('Error getting user social accounts limit', { error, userId });
      return 0;
    }
  }
} 