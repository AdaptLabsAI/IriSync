import { firestore } from '../core/firebase';
import { collection, doc, setDoc, getDoc, getDocs, updateDoc, query, where, limit, orderBy } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { SubscriptionTier } from './models/subscription';
import { sendTrialWelcomeEmail, sendTrialExpirationReminderEmail } from '../notifications/email';
import { getStripeClient, createSubscription } from '../billing/stripe';

/**
 * Interface for trial subscription record
 */
export interface TrialSubscription {
  id: string;
  userId: string;
  email: string;
  tier: SubscriptionTier;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  isExpired: boolean;
  hasConverted: boolean;
  convertedDate?: Date;
  remindersSent: string[]; // Array of reminder IDs that have been sent
  createdAt: Date;
  updatedAt: Date;
  stripeCustomerId: string;
  paymentMethodId: string;
  socialAccountsVerified: boolean;
}

/**
 * Service for managing free trials
 */
export class TrialService {
  private readonly COLLECTION = 'trial_subscriptions';
  private readonly DEFAULT_TRIAL_DAYS = 7; // Fixed 7-day trial
  private readonly TRIAL_COOLDOWN_MONTHS = 6; // Months required before eligible for another trial
  
  /**
   * Start a new trial for a user
   */
  async startTrial(
    userId: string,
    email: string,
    tier: SubscriptionTier = SubscriptionTier.CREATOR,
    stripeCustomerId: string,
    paymentMethodId: string,
    socialAccountsVerified: boolean = false
  ): Promise<TrialSubscription> {
    // Check if user already has an active trial
    const existingTrial = await this.getActiveTrial(userId);
    
    if (existingTrial) {
      throw new Error('User already has an active trial');
    }

    // Check if user is eligible for another trial
    const isEligible = await this.isEligibleForTrial(userId, tier);
    if (!isEligible) {
      throw new Error('You are not eligible for a trial at this time');
    }

    // Verify that payment method is valid
    if (!paymentMethodId) {
      throw new Error('A valid payment method is required to start a trial');
    }
    
    // Verify that social accounts are connected to prevent trial abuse
    if (!socialAccountsVerified) {
      throw new Error('You must connect at least one social media account to start a trial');
    }
    
    // Create new trial with fixed 7-day duration
    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + this.DEFAULT_TRIAL_DAYS);
    
    const trialId = uuidv4();
    
    const trial: TrialSubscription = {
      id: trialId,
      userId,
      email,
      tier,
      startDate: now,
      endDate,
      isActive: true,
      isExpired: false,
      hasConverted: false,
      remindersSent: [],
      createdAt: now,
      updatedAt: now,
      stripeCustomerId,
      paymentMethodId,
      socialAccountsVerified
    };
    
    // Store in Firestore
    const trialRef = doc(collection(firestore, this.COLLECTION), trialId);
    await setDoc(trialRef, trial);
    
    // Attach payment method to customer if not already attached
    try {
      const stripe = getStripeClient();
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: stripeCustomerId,
      });

      // Set as default payment method
      await stripe.customers.update(stripeCustomerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
    } catch (error) {
      console.error('Error attaching payment method:', error);
      throw new Error('Failed to attach payment method. Please try again with a different card.');
    }
    
    // Set up scheduled subscription with trial
    try {
      // Determine the price ID based on tier
      let priceId: string;
      switch (tier) {
        case SubscriptionTier.ENTERPRISE:
          priceId = process.env.STRIPE_PRICE_ENTERPRISE_ID || '';
          break;
        case SubscriptionTier.INFLUENCER:
          priceId = process.env.STRIPE_PRICE_INFLUENCER_ID || '';
          break;
        case SubscriptionTier.CREATOR:
        default:
          priceId = process.env.STRIPE_PRICE_CREATOR_ID || '';
          break;
      }

      // Create subscription with trial period
      await createSubscription(
        stripeCustomerId,
        priceId,
        1, // quantity
        this.DEFAULT_TRIAL_DAYS, // trial days
        {
          trialId,
          userId,
          email,
          tier
        }
      );
    } catch (error) {
      console.error('Error creating subscription with trial:', error);
      // Continue even if subscription setup fails
    }
    
    // Send welcome email
    try {
      await sendTrialWelcomeEmail(email, {
        tier,
        expirationDate: endDate.toISOString(),
        trialDays: this.DEFAULT_TRIAL_DAYS
      });
    } catch (error) {
      console.error('Error sending trial welcome email:', error);
      // Continue even if email fails
    }
    
    return trial;
  }
  
  /**
   * Get an active trial for a user if one exists
   */
  async getActiveTrial(userId: string): Promise<TrialSubscription | null> {
    const trialsRef = collection(firestore, this.COLLECTION);
    const q = query(
      trialsRef,
      where('userId', '==', userId),
      where('isActive', '==', true),
      where('isExpired', '==', false),
      limit(1)
    );
    
    const trialSnapshot = await getDocs(q);
    
    if (trialSnapshot.empty) {
      return null;
    }
    
    return trialSnapshot.docs[0].data() as TrialSubscription;
  }
  
  /**
   * Get all trials for a user (active and expired)
   */
  async getUserTrials(userId: string): Promise<TrialSubscription[]> {
    const trialsRef = collection(firestore, this.COLLECTION);
    const q = query(
      trialsRef,
      where('userId', '==', userId),
      orderBy('startDate', 'desc')
    );
    
    const trialSnapshot = await getDocs(q);
    const trials: TrialSubscription[] = [];
    
    trialSnapshot.forEach((document) => {
      trials.push(document.data() as TrialSubscription);
    });
    
    return trials;
  }
  
  /**
   * Cancel an active trial
   */
  async cancelTrial(trialId: string, userId: string): Promise<boolean> {
    const trialRef = doc(collection(firestore, this.COLLECTION), trialId);
    const trialDoc = await getDoc(trialRef);
    
    if (!trialDoc.exists()) {
      throw new Error('Trial not found');
    }
    
    const trial = trialDoc.data() as TrialSubscription;
    
    if (trial.userId !== userId) {
      throw new Error('You do not have permission to cancel this trial');
    }
    
    if (!trial.isActive || trial.isExpired) {
      throw new Error('Trial is not active');
    }
    
    // Update trial as cancelled (expired)
    await updateDoc(trialRef, {
      isActive: false,
      isExpired: true,
      updatedAt: new Date()
    });
    
    return true;
  }
  
  /**
   * Mark a trial as converted to a paid subscription
   */
  async convertTrialToPaid(trialId: string, userId: string): Promise<TrialSubscription> {
    const trialRef = doc(collection(firestore, this.COLLECTION), trialId);
    const trialDoc = await getDoc(trialRef);
    
    if (!trialDoc.exists()) {
      throw new Error('Trial not found');
    }
    
    const trial = trialDoc.data() as TrialSubscription;
    
    if (trial.userId !== userId) {
      throw new Error('You do not have permission to convert this trial');
    }
    
    if (trial.hasConverted) {
      throw new Error('Trial has already been converted');
    }
    
    const now = new Date();
    
    // Update trial as converted
    await updateDoc(trialRef, {
      isActive: false,
      hasConverted: true,
      convertedDate: now,
      updatedAt: now
    });
    
    // Get updated document
    const updatedDoc = await getDoc(trialRef);
    
    return updatedDoc.data() as TrialSubscription;
  }
  
  /**
   * Check if a user is eligible for a trial
   */
  async isEligibleForTrial(userId: string, tier: SubscriptionTier): Promise<boolean> {
    // Get all of the user's trials
    const trials = await this.getUserTrials(userId);
    
    // No previous trials - user is eligible
    if (trials.length === 0) {
      return true;
    }
    
    // Check if the user has already had a trial for this tier
    const hasTierTrial = trials.some(trial => trial.tier === tier);
    
    // If upgrading from a lower tier to a higher tier, allow trial
    if (!hasTierTrial) {
      // Check if the new tier is an upgrade
      const tierValues = {
        [SubscriptionTier.CREATOR]: 1,
        [SubscriptionTier.INFLUENCER]: 2,
        [SubscriptionTier.ENTERPRISE]: 3
      };
      
      // If user had trials, check if this tier is higher than previous trials
      const highestPreviousTrial = Math.max(...trials.map(t => tierValues[t.tier]));
      return tierValues[tier] > highestPreviousTrial;
    }
    
    // Hidden rule: If user has completely canceled service and been inactive for 6+ months,
    // they can start a new trial (returning customer after long period of no service)
    const now = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - this.TRIAL_COOLDOWN_MONTHS);
    
    // Check if user's last activity (trial or paid subscription) ended more than 6 months ago
    // First, check subscription history to verify they were fully canceled
    try {
      const subscriptionsRef = collection(firestore, 'subscriptions');
      const subscriptionsQuery = query(
        subscriptionsRef,
        where('userId', '==', userId),
        orderBy('canceledAt', 'desc'),
        limit(1)
      );
      
      const subscriptionsSnapshot = await getDocs(subscriptionsQuery);
      
      if (!subscriptionsSnapshot.empty) {
        const lastSubscription = subscriptionsSnapshot.docs[0].data();
        
        // If they have an active subscription, they're not eligible
        if (!lastSubscription.canceledAt) {
          return false;
        }
        
        // Check if cancelation was more than 6 months ago
        const canceledAt = lastSubscription.canceledAt.toDate();
        if (canceledAt > sixMonthsAgo) {
          // Less than 6 months since cancelation, not eligible
          return false;
        }
      }
      
      // Get most recent trial for this tier
      const mostRecentTrial = trials
        .filter(trial => trial.tier === tier)
        .sort((a, b) => b.endDate.getTime() - a.endDate.getTime())[0];
      
      // If most recent trial ended more than 6 months ago, they're eligible for a new trial
      if (mostRecentTrial && mostRecentTrial.endDate < sixMonthsAgo && !mostRecentTrial.hasConverted) {
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error checking subscription history:', error);
      return false; // Default to not eligible if we can't verify
    }
  }
  
  /**
   * Extend a trial by a number of days
   */
  async extendTrial(
    trialId: string,
    additionalDays: number,
    adminUserId: string
  ): Promise<TrialSubscription> {
    const trialRef = doc(collection(firestore, this.COLLECTION), trialId);
    const trialDoc = await getDoc(trialRef);
    
    if (!trialDoc.exists()) {
      throw new Error('Trial not found');
    }
    
    const trial = trialDoc.data() as TrialSubscription;
    
    // Only allow active trials to be extended
    if (!trial.isActive || trial.isExpired) {
      throw new Error('Cannot extend an inactive or expired trial');
    }
    
    // Calculate new end date
    const newEndDate = new Date(trial.endDate);
    newEndDate.setDate(newEndDate.getDate() + additionalDays);
    
    // Update trial end date
    await updateDoc(trialRef, {
      endDate: newEndDate,
      updatedAt: new Date()
    });
    
    // Get updated document
    const updatedDoc = await getDoc(trialRef);
    
    return updatedDoc.data() as TrialSubscription;
  }
  
  /**
   * Process trial expirations
   */
  async processTrialExpirations(): Promise<number> {
    const now = new Date();
    
    // Find trials that have ended but are still marked as active
    const trialsRef = collection(firestore, this.COLLECTION);
    const expiredTrialsQuery = query(
      trialsRef,
      where('isActive', '==', true),
      where('isExpired', '==', false),
      where('endDate', '<=', now)
    );
    
    const expiredTrialsSnapshot = await getDocs(expiredTrialsQuery);
    
    if (expiredTrialsSnapshot.empty) {
      return 0; // No expired trials to process
    }
    
    const processedTrials: string[] = [];
    
    // Process each expired trial
    for (const document of expiredTrialsSnapshot.docs) {
      const trial = document.data() as TrialSubscription;
      
      try {
        // Auto-charge the customer's payment method for their chosen tier
        // Note: This should already be handled by Stripe's subscription system
        // Just mark the trial as expired/converted
        const trialRef = doc(collection(firestore, this.COLLECTION), trial.id);
        await updateDoc(trialRef, {
          isActive: false,
          isExpired: true,
          hasConverted: true,
          convertedDate: now,
          updatedAt: now
        });
        
        processedTrials.push(trial.id);
      } catch (error) {
        console.error(`Error processing expired trial ${trial.id}:`, error);
      }
    }
    
    return processedTrials.length;
  }
  
  /**
   * Send expiration reminders for trials ending soon
   */
  async sendExpirationReminders(): Promise<number> {
    const now = new Date();
    const oneDayFromNow = new Date(now);
    oneDayFromNow.setDate(oneDayFromNow.getDate() + 1);
    
    // Find active trials expiring in the next 24 hours that haven't received a day-before reminder
    const trialsRef = collection(firestore, this.COLLECTION);
    const expiringTrialsQuery = query(
      trialsRef,
      where('isActive', '==', true),
      where('isExpired', '==', false),
      where('endDate', '<=', oneDayFromNow),
      where('endDate', '>', now)
    );
    
    const expiringTrialsSnapshot = await getDocs(expiringTrialsQuery);
    
    if (expiringTrialsSnapshot.empty) {
      return 0; // No reminders to send
    }
    
    const remindersSent: string[] = [];
    
    // Send reminders for each trial expiring soon
    for (const document of expiringTrialsSnapshot.docs) {
      const trial = document.data() as TrialSubscription;
      
      // Check if a day-before reminder has already been sent
      if (trial.remindersSent.includes('day-before')) {
        continue; // Skip if reminder already sent
      }
      
      try {
        // Calculate hours remaining
        const hoursRemaining = Math.round(
          (trial.endDate.getTime() - now.getTime()) / (1000 * 60 * 60)
        );
        
        // Send the reminder email
        await sendTrialExpirationReminderEmail(trial.email, {
          tier: trial.tier,
          expirationDate: trial.endDate.toISOString(),
          hoursRemaining,
          upgradeUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing?tier=${trial.tier.toLowerCase()}`
        });
        
        // Update the trial record to mark reminder as sent
        const trialRef = doc(collection(firestore, this.COLLECTION), trial.id);
        await updateDoc(trialRef, {
          remindersSent: [...trial.remindersSent, 'day-before'],
          updatedAt: now
        });
        
        remindersSent.push(trial.id);
      } catch (error) {
        console.error(`Error sending reminder for trial ${trial.id}:`, error);
      }
    }
    
    return remindersSent.length;
  }
  
  /**
   * Get trial analytics (for admin dashboard)
   */
  async getTrialAnalytics(): Promise<{
    activeTrials: number;
    expiredTrials: number;
    conversionRate: number;
    trialsByTier: Record<SubscriptionTier, number>;
  }> {
    // Get all trials
    const trialsRef = collection(firestore, this.COLLECTION);
    const trialSnapshot = await getDocs(trialsRef);
    
    let activeTrials = 0;
    let expiredTrials = 0;
    let convertedTrials = 0;
    const trialsByTier: Record<SubscriptionTier, number> = {
      [SubscriptionTier.CREATOR]: 0,
      [SubscriptionTier.INFLUENCER]: 0,
      [SubscriptionTier.ENTERPRISE]: 0
    };
    
    trialSnapshot.forEach((document) => {
      const trial = document.data() as TrialSubscription;
      
      if (trial.isActive) {
        activeTrials++;
      } else if (trial.isExpired) {
        expiredTrials++;
      }
      
      if (trial.hasConverted) {
        convertedTrials++;
      }
      
      trialsByTier[trial.tier]++;
    });
    
    const totalCompletedTrials = convertedTrials + (expiredTrials - convertedTrials);
    const conversionRate = totalCompletedTrials > 0 
      ? (convertedTrials / totalCompletedTrials) * 100 
      : 0;
    
    return {
      activeTrials,
      expiredTrials,
      conversionRate,
      trialsByTier
    };
  }
}

// Create and export singleton instance
const trialService = new TrialService();
export default trialService; 