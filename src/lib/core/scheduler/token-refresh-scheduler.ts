import { logger } from '../logging/logger';
import tokenPurchaseService from '../../features/tokens/TokenPurchaseService';
import { firestore } from '../firebase';
import { Firestore, collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { SubscriptionTier } from '../../subscription/models/subscription';

/**
 * Individual Billing Cycle Token Refresh Scheduler
 * Handles automatic token refresh based on individual user billing cycles
 * ensuring purchased tokens carry over while monthly tokens reset
 */
export class TokenRefreshScheduler {
  private static instance: TokenRefreshScheduler;
  private isRunning = false;

  private constructor() {}

  static getInstance(): TokenRefreshScheduler {
    if (!TokenRefreshScheduler.instance) {
      TokenRefreshScheduler.instance = new TokenRefreshScheduler();
    }
    return TokenRefreshScheduler.instance;
  }

  /**
   * Run token refresh for all users whose billing cycles are due
   * This should be called by a cron job or scheduled function (runs daily)
   */
  async runMonthlyRefresh(): Promise<{
    success: boolean;
    refreshedCount: number;
    errors: string[];
  }> {
    if (this.isRunning) {
      logger.warn('Token refresh already running, skipping');
      return { success: false, refreshedCount: 0, errors: ['Already running'] };
    }

    this.isRunning = true;
    const errors: string[] = [];
    let refreshedCount = 0;

    try {
      logger.info('Starting individual billing cycle token refresh process');

      // Use TokenPurchaseService to refresh all tokens whose billing cycles are due
      refreshedCount = await tokenPurchaseService.refreshMonthlyTokens();

      // Additional organization-level sync if needed
      await this.syncOrganizationTokenQuotas();

      // Audit token package usage
      const auditResults = await this.auditTokenPackageUsage();
      logger.info('Token package audit completed', auditResults);

      logger.info('Individual billing cycle token refresh completed successfully', { 
        refreshedCount,
        auditResults 
      });

      return { success: true, refreshedCount, errors };
    } catch (error) {
      const errorMessage = `Token refresh failed: ${error instanceof Error ? error.message : String(error)}`;
      logger.error(errorMessage, { error });
      errors.push(errorMessage);
      return { success: false, refreshedCount, errors };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Sync organization token quotas to ensure consistency between
   * TokenPurchaseService and organization documents
   */
  private async syncOrganizationTokenQuotas(): Promise<void> {
    try {
      logger.debug('Syncing organization token quotas');

      // Get all organizations
      const orgsSnapshot = await getDocs(collection(this.getFirestore(), 'organizations'));

      for (const orgDoc of orgsSnapshot.docs) {
        const orgData = orgDoc.data();
        const organizationId = orgDoc.id;

        if (!orgData.billing?.subscriptionTier) {
          continue; // Skip organizations without subscription
        }

        try {
          // Get the organization's primary user (owner)
          const ownerId = orgData.ownerId;
          if (!ownerId) continue;

          // Get token balance from TokenPurchaseService
          const tokenBalance = await tokenPurchaseService.getTokenBalance(ownerId, organizationId);

          if (tokenBalance) {
            // Map TokenPurchaseService naming to organization aiTokens structure
            await updateDoc(doc(this.getFirestore(), 'organizations', organizationId), {
              'usageQuota.aiTokens.limit': tokenBalance.includedTokens,        // Monthly subscription tokens
              'usageQuota.aiTokens.additional': tokenBalance.purchasedTokens,  // Purchased tokens that carry over
              'usageQuota.aiTokens.used': tokenBalance.totalUsedTokens,        // Current period usage
              'usageQuota.aiTokens.resetDate': tokenBalance.nextRefreshDate,   // Individual billing date
              'usageQuota.aiTokens.lastSynced': new Date(),
              'usageQuota.aiTokens.subscriptionStartDate': tokenBalance.subscriptionStartDate, // For billing cycle tracking
              updatedAt: new Date()
            });

            logger.debug('Synced organization token quota', {
              organizationId,
              includedTokens: tokenBalance.includedTokens,
              purchasedTokens: tokenBalance.purchasedTokens,
              totalUsed: tokenBalance.totalUsedTokens
            });
          }
        } catch (error) {
          logger.error('Error syncing organization token quota', { 
            organizationId, 
            error 
          });
        }
      }

      logger.info('Organization token quota sync completed');
    } catch (error) {
      logger.error('Error during organization token quota sync', { error });
      throw error;
    }
  }

  /**
   * Audit token package usage to determine if packages are being used effectively
   */
  async auditTokenPackageUsage(): Promise<{
    totalPackages: number;
    activePackages: number;
    packagesUsed: number;
    totalPurchases: number;
    totalRevenue: number;
    recommendations: string[];
  }> {
    try {
      logger.debug('Starting token package usage audit');

      // Get all token packages
      const packagesSnapshot = await getDocs(collection(this.getFirestore(), 'token_packages'));
      const totalPackages = packagesSnapshot.size;
      const activePackages = packagesSnapshot.docs.filter(doc => doc.data().isActive).length;

      // Get all token purchases
      const purchasesSnapshot = await getDocs(collection(this.getFirestore(), 'token_purchases'));
      const totalPurchases = purchasesSnapshot.size;

      // Calculate revenue and usage stats
      let totalRevenue = 0;
      const packageUsageMap = new Map<string, number>();

      purchasesSnapshot.docs.forEach(doc => {
        const purchase = doc.data();
        if (purchase.isProcessed) {
          totalRevenue += purchase.price;
          
          // Track package usage (if package info is available)
          const packageName = purchase.notes || 'Unknown Package';
          packageUsageMap.set(packageName, (packageUsageMap.get(packageName) || 0) + 1);
        }
      });

      const packagesUsed = packageUsageMap.size;

      // Generate recommendations
      const recommendations: string[] = [];

      if (totalPurchases === 0) {
        recommendations.push('No token purchases detected. Consider marketing token packages to users who are approaching their limits.');
      }

      if (packagesUsed < activePackages) {
        recommendations.push(`Only ${packagesUsed} out of ${activePackages} active packages have been purchased. Consider reviewing package pricing or promoting unused packages.`);
      }

      if (totalRevenue === 0) {
        recommendations.push('No revenue from token packages. Consider implementing in-app purchase prompts when users approach token limits.');
      }

      // Check if token refresh is working properly
      const tokenBalancesSnapshot = await getDocs(collection(this.getFirestore(), 'token_balances'));
      const now = new Date();
      let balancesNeedingRefresh = 0;

      tokenBalancesSnapshot.docs.forEach(doc => {
        const balance = doc.data();
        if (balance.nextRefreshDate && new Date(balance.nextRefreshDate.toDate()) <= now) {
          balancesNeedingRefresh++;
        }
      });

      if (balancesNeedingRefresh > 0) {
        recommendations.push(`${balancesNeedingRefresh} token balances need refresh. Token refresh system may need attention.`);
      }

      const auditResults = {
        totalPackages,
        activePackages,
        packagesUsed,
        totalPurchases,
        totalRevenue,
        recommendations
      };

      logger.info('Token package audit results', auditResults);
      return auditResults;
    } catch (error) {
      logger.error('Error during token package audit', { error });
      return {
        totalPackages: 0,
        activePackages: 0,
        packagesUsed: 0,
        totalPurchases: 0,
        totalRevenue: 0,
        recommendations: ['Audit failed due to error']
      };
    }
  }

  /**
   * Initialize default token packages if they don't exist
   */
  async initializeDefaultTokenPackages(): Promise<void> {
    try {
      logger.info('Initializing default token packages');
      await tokenPurchaseService.createDefaultTokenPackages();
      logger.info('Default token packages initialized successfully');
    } catch (error) {
      logger.error('Error initializing default token packages', { error });
      throw error;
    }
  }

  /**
   * Check if a user needs to refresh their monthly tokens and do it if needed
   * This can be called on user login or API requests
   */
  async checkAndRefreshUserTokens(userId: string, organizationId?: string): Promise<boolean> {
    try {
      const tokenBalance = await tokenPurchaseService.getTokenBalance(userId, organizationId);
      
      if (!tokenBalance) {
        // Initialize if doesn't exist
        await tokenPurchaseService.initializeTokenBalance(userId, organizationId);
        return true;
      }

      // Check if refresh is needed - getTokenBalance automatically handles this now
      // The refresh happens inside getTokenBalance if needed
      return false; // No manual refresh needed since getTokenBalance handles it
    } catch (error) {
      logger.error('Error checking/refreshing user tokens', { userId, organizationId, error });
      return false;
    }
  }

  /**
   * Get token package utilization statistics
   */
  async getTokenPackageStats(): Promise<{
    packageStats: Array<{
      id: string;
      name: string;
      tokenAmount: number;
      price: number;
      tier: string;
      isActive: boolean;
      purchaseCount: number;
      totalRevenue: number;
    }>;
    summary: {
      totalPackages: number;
      activePackages: number;
      totalPurchases: number;
      totalRevenue: number;
    };
  }> {
    try {
      // Get all packages
      const packagesSnapshot = await getDocs(collection(this.getFirestore(), 'token_packages'));
      const packages = packagesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Get all purchases
      const purchasesSnapshot = await getDocs(collection(this.getFirestore(), 'token_purchases'));
      const purchases = purchasesSnapshot.docs.map(doc => doc.data());

      // Calculate stats for each package
      const packageStats = packages.map((pkg: any) => {
        const packagePurchases = purchases.filter((purchase: any) => 
          purchase.notes?.includes(pkg.name) || 
          purchase.tokenAmount === pkg.tokenAmount
        );

        const purchaseCount = packagePurchases.length;
        const totalRevenue = packagePurchases.reduce((sum: number, purchase: any) => sum + (purchase.price || 0), 0);

        return {
          id: pkg.id,
          name: pkg.name,
          tokenAmount: pkg.tokenAmount,
          price: pkg.price,
          tier: pkg.tier,
          isActive: pkg.isActive,
          purchaseCount,
          totalRevenue
        };
      });

      const summary = {
        totalPackages: packages.length,
        activePackages: packages.filter((pkg: any) => pkg.isActive).length,
        totalPurchases: purchases.length,
        totalRevenue: purchases.reduce((sum: number, purchase: any) => sum + (purchase.price || 0), 0)
      };

      return { packageStats, summary };
    } catch (error) {
      logger.error('Error getting token package stats', { error });
      throw error;
    }
  }
}

// Export singleton instance
export const tokenRefreshScheduler = TokenRefreshScheduler.getInstance();
export default tokenRefreshScheduler; 