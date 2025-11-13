import { firestore } from '../core/firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { getStripeClient } from '../billing/stripe';
import { logger } from '../logging/logger';
import unifiedEmailService from '../notifications/unified-email-service';

/**
 * Universal billing status for all subscription tiers
 */
export enum BillingStatus {
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  UNPAID = 'unpaid', 
  SUSPENDED = 'suspended',
  CLOSED = 'closed',
  CANCELED = 'canceled',
  PENDING_SETUP = 'pending_setup',
  PENDING_PAYMENT = 'pending_payment',
  TRIAL = 'trial'
}

/**
 * Account status for service suspension
 */
export enum AccountStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  CLOSED = 'closed'
}

/**
 * Billing reminder stage
 */
export enum ReminderStage {
  FIRST = 'first',    // Day 1: Payment overdue
  SECOND = 'second',  // Day 3: Second reminder  
  FINAL = 'final'     // Day 7: Final warning
}

/**
 * Universal billing service for all subscription tiers
 * 
 * BUSINESS-FRIENDLY BILLING STRATEGY:
 * - Week 1 (Days 1-7): Service continues, send 3 reminders
 * - Week 2+: Service suspended, send suspension notice
 * - Next billing cycle: Account closed, all billing stopped
 */
export class UniversalBillingService {
  
  /**
   * Check and update billing status for an organization
   * @param organizationId Organization ID
   * @returns Updated billing status
   */
  async checkBillingStatus(organizationId: string): Promise<BillingStatus> {
    try {
      // Get organization
      const orgDoc = await getDoc(doc(firestore, 'organizations', organizationId));
      
      if (!orgDoc.exists()) {
        throw new Error(`Organization ${organizationId} not found`);
      }
      
      const orgData = orgDoc.data();
      const billing = orgData.billing;
      
      if (!billing?.subscriptionId) {
        logger.info('Organization has no subscription', { organizationId });
        return BillingStatus.PENDING_SETUP;
      }
      
      // Check subscription status in Stripe
      const stripe = getStripeClient();
      const subscription = await stripe.subscriptions.retrieve(billing.subscriptionId);
      
      let billingStatus: BillingStatus;
      
      switch (subscription.status) {
        case 'active':
          billingStatus = BillingStatus.ACTIVE;
          break;
        case 'past_due':
          billingStatus = BillingStatus.PAST_DUE;
          break;
        case 'unpaid':
          billingStatus = BillingStatus.UNPAID;
          break;
        case 'canceled':
          billingStatus = BillingStatus.CANCELED;
          break;
        case 'trialing':
          billingStatus = BillingStatus.TRIAL;
          break;
        case 'incomplete':
        case 'incomplete_expired':
          billingStatus = BillingStatus.PENDING_PAYMENT;
          break;
        default:
          billingStatus = BillingStatus.PENDING_SETUP;
      }
      
      // Update organization with new billing status
      await updateDoc(doc(firestore, 'organizations', organizationId), {
        'billing.status': billingStatus,
        'billing.lastChecked': Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      
      logger.info('Updated organization billing status', {
        organizationId,
        billingStatus,
        stripeStatus: subscription.status
      });
      
      return billingStatus;
    } catch (error) {
      logger.error('Failed to check billing status', {
        error: error instanceof Error ? error.message : String(error),
        organizationId
      });
      
      return BillingStatus.PENDING_SETUP;
    }
  }
  
  /**
   * Main cron job: Check for past due subscriptions across all tiers
   * Runs daily at 9:00 AM UTC
   */
  async checkForPastDueSubscriptions(): Promise<void> {
    try {
      logger.info('Starting universal past due subscription check');
      
      // Find organizations with past due billing status
      const orgsSnapshot = await getDocs(
        query(
          collection(firestore, 'organizations'),
          where('billing.status', 'in', [BillingStatus.PAST_DUE, BillingStatus.UNPAID])
        )
      );
      
      logger.info(`Found ${orgsSnapshot.size} organizations with past due subscriptions`);
      
      // Process each past due organization
      for (const orgDoc of orgsSnapshot.docs) {
        const orgData = orgDoc.data();
        const organizationId = orgDoc.id;
        
        // Check if we should send a reminder or take action
        await this.processPastDueOrganization(organizationId, orgData);
      }
      
      logger.info('Completed universal past due subscription check');
    } catch (error) {
      logger.error('Failed to check for past due subscriptions', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  /**
   * Process a past due organization according to business-friendly schedule
   * @param organizationId Organization ID
   * @param orgData Organization data
   */
  private async processPastDueOrganization(organizationId: string, orgData: any): Promise<void> {
    try {
      const billing = orgData.billing || {};
      const now = new Date();
      
      // Calculate days past due (from when status first became past_due)
      const pastDueDate = billing.pastDueSince ? new Date(billing.pastDueSince) : null;
      const daysPastDue = pastDueDate 
        ? Math.floor((now.getTime() - pastDueDate.getTime()) / (1000 * 60 * 60 * 24))
        : 0;
        
      // If no pastDueSince date, set it now
      if (!pastDueDate) {
        await updateDoc(doc(firestore, 'organizations', organizationId), {
          'billing.pastDueSince': Timestamp.now()
        });
        // Send first reminder immediately
        await this.sendPaymentReminder(organizationId, orgData, ReminderStage.FIRST);
        return;
      }
      
      // Business-friendly schedule
      if (daysPastDue <= 7) {
        // Week 1: Service continues, send reminders
        await this.handleReminderPeriod(organizationId, orgData, daysPastDue);
      } else if (daysPastDue <= 30) {
        // Weeks 2-4: Service suspended
        await this.handleSuspensionPeriod(organizationId, orgData, daysPastDue);
      } else {
        // After 30 days: Close account
        await this.handleAccountClosure(organizationId, orgData);
      }
      
    } catch (error) {
      logger.error('Error processing past due organization', {
        error: error instanceof Error ? error.message : String(error),
        organizationId
      });
    }
  }
  
  /**
   * Handle reminder period (Days 1-7): Service continues, send reminders
   */
  private async handleReminderPeriod(organizationId: string, orgData: any, daysPastDue: number): Promise<void> {
    const billing = orgData.billing || {};
    const reminderCount = billing.reminderCount || 0;
    const lastReminderSent = billing.lastReminderSent ? new Date(billing.lastReminderSent) : null;
    
    // Reminder schedule: Day 1, Day 3, Day 7
    const shouldSendReminder = this.shouldSendReminder(daysPastDue, reminderCount, lastReminderSent);
    
    if (shouldSendReminder.send) {
      await this.sendPaymentReminder(organizationId, orgData, shouldSendReminder.stage!);
      
      // Update reminder tracking
      await updateDoc(doc(firestore, 'organizations', organizationId), {
        'billing.reminderCount': reminderCount + 1,
        'billing.lastReminderSent': Timestamp.now(),
        'billing.lastReminderStage': shouldSendReminder.stage
      });
    }
  }
  
  /**
   * Handle suspension period (Days 8-30): Service suspended
   */
  private async handleSuspensionPeriod(organizationId: string, orgData: any, daysPastDue: number): Promise<void> {
    // Check if already suspended
    if (orgData.status !== AccountStatus.SUSPENDED) {
      await this.suspendAccount(organizationId, orgData);
    }
  }
  
  /**
   * Handle account closure (Day 30+): Close account, stop billing
   */
  private async handleAccountClosure(organizationId: string, orgData: any): Promise<void> {
    // Check if already closed
    if (orgData.status !== AccountStatus.CLOSED) {
      await this.closeAccount(organizationId, orgData);
    }
  }
  
  /**
   * Determine if we should send a reminder
   */
  private shouldSendReminder(
    daysPastDue: number, 
    reminderCount: number, 
    lastReminderSent: Date | null
  ): { send: boolean; stage?: ReminderStage } {
    
    // Maximum 3 reminders during the grace period
    if (reminderCount >= 3) {
      return { send: false };
    }
    
    const daysSinceLastReminder = lastReminderSent 
      ? Math.floor((Date.now() - lastReminderSent.getTime()) / (1000 * 60 * 60 * 24))
      : 999;
    
    // Day 1: First reminder
    if (reminderCount === 0) {
      return { send: true, stage: ReminderStage.FIRST };
    }
    
    // Day 3: Second reminder (2 days after first)
    if (reminderCount === 1 && daysSinceLastReminder >= 2) {
      return { send: true, stage: ReminderStage.SECOND };
    }
    
    // Day 7: Final reminder (4 days after second)
    if (reminderCount === 2 && daysSinceLastReminder >= 4) {
      return { send: true, stage: ReminderStage.FINAL };
    }
    
    return { send: false };
  }
  
  /**
   * Suspend account for non-payment
   */
  private async suspendAccount(organizationId: string, orgData: any): Promise<void> {
    try {
      logger.warn('Suspending account for non-payment', {
        organizationId,
        companyName: orgData.name,
        subscriptionTier: orgData.billing?.subscriptionTier
      });
      
      // Update organization status
      await updateDoc(doc(firestore, 'organizations', organizationId), {
        status: AccountStatus.SUSPENDED,
        suspendedAt: Timestamp.now(),
        suspensionReason: 'billing_past_due',
        'billing.status': BillingStatus.SUSPENDED,
        // Disable all features
        'features.aiToolkit': false,
        'features.contentScheduling': false,
        'features.analytics': false,
        'features.teamCollaboration': false,
        // Set usage quotas to zero
        'usageQuota.aiTokens.limit': 0,
        'usageQuota.socialAccounts.limit': 0,
        'usageQuota.teamMembers.limit': 0
      });
      
      // Send suspension notice
      await this.sendSuspensionNotice(organizationId, orgData);
      
    } catch (error) {
      logger.error('Error suspending account', {
        error: error instanceof Error ? error.message : String(error),
        organizationId
      });
    }
  }
  
  /**
   * Close account permanently (but don't delete)
   */
  private async closeAccount(organizationId: string, orgData: any): Promise<void> {
    try {
      logger.warn('Closing account for extended non-payment', {
        organizationId,
        companyName: orgData.name
      });
      
      // Cancel Stripe subscription to stop billing
      const billing = orgData.billing;
      if (billing?.subscriptionId) {
        const stripe = getStripeClient();
        await stripe.subscriptions.cancel(billing.subscriptionId);
      }
      
      // Update organization status
      await updateDoc(doc(firestore, 'organizations', organizationId), {
        status: AccountStatus.CLOSED,
        closedAt: Timestamp.now(),
        closureReason: 'billing_non_payment',
        'billing.status': BillingStatus.CLOSED,
        // All features disabled
        'features.aiToolkit': false,
        'features.contentScheduling': false,
        'features.analytics': false,
        'features.teamCollaboration': false,
        // All quotas to zero
        'usageQuota.aiTokens.limit': 0,
        'usageQuota.socialAccounts.limit': 0,
        'usageQuota.teamMembers.limit': 0
      });
      
      // Send closure notice
      await this.sendAccountClosureNotice(organizationId, orgData);
      
    } catch (error) {
      logger.error('Error closing account', {
        error: error instanceof Error ? error.message : String(error),
        organizationId
      });
    }
  }
  
  /**
   * Send payment reminder
   */
  private async sendPaymentReminder(
    organizationId: string, 
    orgData: any, 
    stage: ReminderStage
  ): Promise<void> {
    try {
      const primaryEmail = orgData.billingEmail || orgData.contactEmail;
      
      if (!primaryEmail) {
        return;
      }
      
      const companyName = orgData.name || 'Your Organization';
      const tier = orgData.billing?.subscriptionTier || 'subscription';
      const daysRemaining = stage === ReminderStage.FINAL ? 1 : (stage === ReminderStage.SECOND ? 4 : 6);
      
      await unifiedEmailService.sendBillingReminder({
        to: primaryEmail,
        companyName,
        tier,
        stage,
        daysRemaining
      });
      
      logger.info('Payment reminder email sent', {
        organizationId,
        stage,
        email: primaryEmail
      });
      
    } catch (error) {
      logger.error('Error sending payment reminder', {
        error: error instanceof Error ? error.message : String(error),
        organizationId,
        stage
      });
    }
  }
  
  /**
   * Send account suspension notice
   */
  private async sendSuspensionNotice(organizationId: string, orgData: any): Promise<void> {
    try {
      const primaryEmail = orgData.billingEmail || orgData.contactEmail;
      
      if (!primaryEmail) {
        return;
      }
      
      const companyName = orgData.name || 'Your Organization';
      
      await unifiedEmailService.sendAccountSuspension({
        to: primaryEmail,
        companyName
      });
      
      logger.info('Account suspension notice sent', { organizationId });
      
    } catch (error) {
      logger.error('Error sending suspension notice', {
        error: error instanceof Error ? error.message : String(error),
        organizationId
      });
    }
  }
  
  /**
   * Send account closure notice
   */
  private async sendAccountClosureNotice(organizationId: string, orgData: any): Promise<void> {
    try {
      const primaryEmail = orgData.billingEmail || orgData.contactEmail;
      
      if (!primaryEmail) {
        return;
      }
      
      const companyName = orgData.name || 'Your Organization';
      const subject = 'IriSync Account Closed - Billing Stopped';
      const htmlContent = this.generateClosureEmailTemplate(orgData);
      
      await unifiedEmailService.sendEmail({
        to: primaryEmail,
        subject,
        htmlContent,
        priority: 'high',
        category: 'billing'
      });
      
      logger.info('Account closure notice sent', { organizationId });
      
    } catch (error) {
      logger.error('Error sending closure notice', {
        error: error instanceof Error ? error.message : String(error),
        organizationId
      });
    }
  }
  
  /**
   * Generate reminder email template
   */
  private generateReminderEmailTemplate(orgData: any, stage: ReminderStage): string {
    const billing = orgData.billing || {};
    const companyName = orgData.name || 'Your Organization';
    const tier = billing.subscriptionTier || 'subscription';
    const daysRemaining = stage === ReminderStage.FINAL ? 1 : (stage === ReminderStage.SECOND ? 4 : 6);
    
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #4f46e5;">IriSync</h1>
        </div>
        
        <h2 style="color: #dc2626;">Payment Required</h2>
        
        <p>Dear ${companyName} team,</p>
        
        <p>Your IriSync ${tier} subscription payment is currently overdue. To avoid service interruption, please update your payment method immediately.</p>
        
        <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <h3 style="color: #dc2626; margin-top: 0;">Account Details:</h3>
          <ul style="margin: 0; padding-left: 20px;">
            <li><strong>Organization:</strong> ${companyName}</li>
            <li><strong>Subscription:</strong> ${tier} tier</li>
            ${stage === ReminderStage.FINAL ? `<li><strong>Service Suspension:</strong> In ${daysRemaining} day</li>` : ''}
          </ul>
        </div>
        
        ${stage === ReminderStage.FINAL ? 
          '<p><strong>⚠️ FINAL NOTICE:</strong> Your service will be suspended tomorrow if payment is not received.</p>' : 
          `<p>Your service will continue for ${daysRemaining} more days while we resolve this payment issue.</p>`
        }
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing" 
             style="display: inline-block; background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Update Payment Method
          </a>
        </div>
        
        <p>Need help? Contact our billing team at billing@irisync.io</p>
        
        <p>Best regards,<br>The IriSync Billing Team</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="font-size: 12px; color: #6b7280; text-align: center;">
          © ${new Date().getFullYear()} IriSync. All rights reserved.
        </p>
      </div>
    `;
  }
  
  /**
   * Generate suspension email template
   */
  private generateSuspensionEmailTemplate(orgData: any): string {
    const companyName = orgData.name || 'Your Organization';
    
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #4f46e5;">IriSync</h1>
        </div>
        
        <h2 style="color: #dc2626;">Account Suspended</h2>
        
        <p>Dear ${companyName} team,</p>
        
        <p>Your IriSync account has been temporarily suspended due to non-payment. All services including AI features, content scheduling, and analytics have been disabled.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing" 
             style="display: inline-block; background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Restore Account
          </a>
        </div>
        
        <p><strong>To restore your account:</strong></p>
        <ol>
          <li>Update your payment method</li>
          <li>Your account will be reactivated within 24 hours of payment</li>
        </ol>
        
        <p>Contact billing@irisync.io for assistance.</p>
        
        <p>Best regards,<br>The IriSync Team</p>
      </div>
    `;
  }
  
  /**
   * Generate closure email template
   */
  private generateClosureEmailTemplate(orgData: any): string {
    const companyName = orgData.name || 'Your Organization';
    
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #4f46e5;">IriSync</h1>
        </div>
        
        <h2 style="color: #6b7280;">Account Closed</h2>
        
        <p>Dear ${companyName} team,</p>
        
        <p>Your IriSync account has been closed due to extended non-payment. All billing has been stopped and services have been permanently disabled.</p>
        
        <p><strong>To reactivate your account:</strong></p>
        <ol>
          <li>Contact our billing team at billing@irisync.io</li>
          <li>Settle any outstanding payments</li>
          <li>We'll help you restart your subscription</li>
        </ol>
        
        <p>Your data has been preserved and can be restored upon reactivation.</p>
        
        <p>Thank you for using IriSync.</p>
        
        <p>Best regards,<br>The IriSync Team</p>
      </div>
    `;
  }
  
  /**
   * Restore account after payment
   */
  async restoreAccount(organizationId: string): Promise<void> {
    try {
      // Get organization data to restore appropriate settings
      const orgDoc = await getDoc(doc(firestore, 'organizations', organizationId));
      
      if (!orgDoc.exists()) {
        throw new Error(`Organization ${organizationId} not found`);
      }
      
      const orgData = orgDoc.data();
      const subscriptionTier = orgData.billing?.subscriptionTier || 'creator';
      
      // Restore appropriate quotas based on subscription tier
      const quotas = this.getQuotasForTier(subscriptionTier);
      
      await updateDoc(doc(firestore, 'organizations', organizationId), {
        status: AccountStatus.ACTIVE,
        suspendedAt: null,
        closedAt: null,
        suspensionReason: null,
        closureReason: null,
        'billing.status': BillingStatus.ACTIVE,
        'billing.pastDueSince': null,
        'billing.reminderCount': 0,
        'billing.lastReminderSent': null,
        // Restore features
        'features.aiToolkit': true,
        'features.contentScheduling': true,
        'features.analytics': true,
        'features.teamCollaboration': quotas.teamMembers > 1,
        // Restore quotas
        'usageQuota.aiTokens.limit': quotas.aiTokens,
        'usageQuota.socialAccounts.limit': quotas.socialAccounts,
        'usageQuota.teamMembers.limit': quotas.teamMembers,
        updatedAt: Timestamp.now()
      });
      
      logger.info('Account restored after payment', {
        organizationId,
        subscriptionTier
      });
      
    } catch (error) {
      logger.error('Error restoring account', {
        error: error instanceof Error ? error.message : String(error),
        organizationId
      });
      throw error;
    }
  }
  
  /**
   * Get quotas for subscription tier
   */
  private getQuotasForTier(tier: string) {
    const quotaMap = {
      creator: { aiTokens: 100, socialAccounts: 5, teamMembers: 3 },
      influencer: { aiTokens: 500, socialAccounts: 999, teamMembers: 10 },
      enterprise: { aiTokens: 5000, socialAccounts: 999, teamMembers: 50 }
    };
    
    return quotaMap[tier as keyof typeof quotaMap] || quotaMap.creator;
  }
}

// Export singleton instance
export const universalBillingService = new UniversalBillingService();
export default universalBillingService; 