import { firebaseAdmin } from '@/lib/firebase/admin';
import { 
  Referral, 
  ReferralStatus, 
  RewardStatus, 
  UserReferralStats, 
  ReferralCodeValidation,
  REFERRAL_CONFIG,
  DEFAULT_REFERRAL_REWARD_TOKENS
} from '@/lib/models/Referral';
import { TokenService } from '@/lib/tokens/token-service';
import { TokenRepository } from '@/lib/tokens/token-repository';
import { NotificationService, NotificationPriority, NotificationCategory } from '@/lib/notifications/NotificationService';
import { logger } from '@/lib/logging/logger';
import crypto from 'crypto';

export class ReferralService {
  private firestore = firebaseAdmin.firestore();
  private tokenService: TokenService;
  private notificationService: NotificationService;

  constructor() {
    const tokenRepository = new TokenRepository(this.firestore);
    this.notificationService = new NotificationService();
    this.tokenService = new TokenService(tokenRepository, this.notificationService);
  }

  /**
   * Generate a unique referral code for a user
   */
  async generateReferralCode(userId: string): Promise<string> {
    const { codePrefix, codeLength, maxAttempts } = REFERRAL_CONFIG;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Generate random code: IRIS + 4 random characters
      const randomPart = crypto.randomBytes(Math.ceil((codeLength - codePrefix.length) / 2))
        .toString('hex')
        .substring(0, codeLength - codePrefix.length)
        .toUpperCase();
      
      const code = `${codePrefix}${randomPart}`;
      
      // Check if code already exists
      const existingUser = await this.firestore.collection('users')
        .where('referralCode', '==', code)
        .limit(1)
        .get();
      
      if (existingUser.empty) {
        // Update user with the new referral code
        await this.firestore.collection('users').doc(userId).update({
          referralCode: code,
          referralCodeGeneratedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp()
        });
        
        logger.info('Generated referral code for user', { userId, code });
        return code;
      }
    }
    
    throw new Error('Failed to generate unique referral code after maximum attempts');
  }

  /**
   * Get or create referral code for a user
   */
  async getUserReferralCode(userId: string): Promise<string> {
    const userDoc = await this.firestore.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      throw new Error('User not found');
    }
    
    const userData = userDoc.data();
    
    // Return existing code if available
    if (userData?.referralCode) {
      return userData.referralCode;
    }
    
    // Generate new code if none exists
    return await this.generateReferralCode(userId);
  }

  /**
   * Validate a referral code
   */
  async validateReferralCode(code: string, referredUserId?: string): Promise<ReferralCodeValidation> {
    if (!code || code.length < 4) {
      return { isValid: false, error: 'Invalid referral code format' };
    }
    
    // Find user with this referral code
    const userQuery = await this.firestore.collection('users')
      .where('referralCode', '==', code.toUpperCase())
      .limit(1)
      .get();
    
    if (userQuery.empty) {
      return { isValid: false, error: 'Referral code not found' };
    }
    
    const referrerUserDoc = userQuery.docs[0];
    const referrerData = referrerUserDoc.data();
    const referrerUserId = referrerUserDoc.id;
    
    // Users cannot refer themselves
    if (referredUserId && referrerUserId === referredUserId) {
      return { isValid: false, error: 'You cannot use your own referral code' };
    }
    
    // Check if referrer has an active subscription
    const orgId = referrerData.currentOrganizationId || referrerData.personalOrganizationId;
    if (orgId) {
      const orgDoc = await this.firestore.collection('organizations').doc(orgId).get();
      const orgData = orgDoc.data();
      const subscriptionStatus = orgData?.billing?.subscriptionStatus;
      
      if (!['active', 'trialing'].includes(subscriptionStatus)) {
        return { isValid: false, error: 'Referrer must have an active subscription' };
      }
    }
    
    return {
      isValid: true,
      code: code.toUpperCase(),
      referrerUserId,
      referrerName: referrerData.displayName || `${referrerData.firstName} ${referrerData.lastName}`
    };
  }

  /**
   * Create a referral relationship
   */
  async createReferral(referralCode: string, referredUserId: string, metadata?: {
    ipAddress?: string;
    userAgent?: string;
    source?: string;
  }): Promise<Referral> {
    // Validate the referral code
    const validation = await this.validateReferralCode(referralCode, referredUserId);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid referral code');
    }
    
    // Get referred user data
    const referredUserDoc = await this.firestore.collection('users').doc(referredUserId).get();
    if (!referredUserDoc.exists) {
      throw new Error('Referred user not found');
    }
    
    const referredUserData = referredUserDoc.data();
    if (!referredUserData) {
      throw new Error('Referred user data not found');
    }
    
    // Check if user was already referred
    const existingReferral = await this.firestore.collection('referrals')
      .where('referredUserId', '==', referredUserId)
      .limit(1)
      .get();
    
    if (!existingReferral.empty) {
      throw new Error('User has already been referred');
    }
    
    // Create referral document
    const referralData: Omit<Referral, 'id'> = {
      referrerUserId: validation.referrerUserId!,
      referredUserId,
      referralCode: validation.code!,
      status: ReferralStatus.PENDING,
      rewardStatus: RewardStatus.PENDING,
      createdAt: firebaseAdmin.firestore.FieldValue.serverTimestamp() as any,
      rewardTokens: DEFAULT_REFERRAL_REWARD_TOKENS,
      referredUserEmail: referredUserData.email,
      referrerUserEmail: '', // Will be populated below
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
      source: metadata?.source || 'registration'
    };
    
    // Get referrer email
    const referrerUserDoc = await this.firestore.collection('users').doc(validation.referrerUserId!).get();
    if (referrerUserDoc.exists) {
      referralData.referrerUserEmail = referrerUserDoc.data()?.email;
    }
    
    // Save referral
    const referralRef = await this.firestore.collection('referrals').add(referralData);
    
    logger.info('Created referral relationship', {
      referralId: referralRef.id,
      referrerUserId: validation.referrerUserId,
      referredUserId,
      code: validation.code
    });
    
    // Send notification to referrer
    await this.notificationService.sendNotification({
      userId: validation.referrerUserId!,
      title: 'New Referral!',
      message: `Someone just signed up using your referral code ${validation.code}. You'll earn 100 tokens when they complete their first month!`,
      priority: NotificationPriority.MEDIUM,
      category: NotificationCategory.FEATURE,
      metadata: {
        referralId: referralRef.id,
        referredUserEmail: referredUserData.email
      }
    });
    
    return { id: referralRef.id, ...referralData } as Referral;
  }

  /**
   * Update referral status when user starts trial
   */
  async updateReferralOnTrialStart(userId: string, subscriptionTier: string): Promise<void> {
    const referralDoc = await this.firestore.collection('referrals')
      .where('referredUserId', '==', userId)
      .where('status', '==', ReferralStatus.PENDING)
      .limit(1)
      .get();
    
    if (!referralDoc.empty) {
      const referralRef = referralDoc.docs[0].ref;
      await referralRef.update({
        status: ReferralStatus.TRIAL_ACTIVE,
        trialStartedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
        referredSubscriptionTier: subscriptionTier
      });
      
      logger.info('Updated referral status to trial active', {
        referralId: referralRef.id,
        userId,
        subscriptionTier
      });
    }
  }

  /**
   * Process referral completion and award tokens
   */
  async processReferralCompletion(userId: string): Promise<void> {
    const referralQuery = await this.firestore.collection('referrals')
      .where('referredUserId', '==', userId)
      .where('status', 'in', [ReferralStatus.PENDING, ReferralStatus.TRIAL_ACTIVE])
      .limit(1)
      .get();
    
    if (referralQuery.empty) {
      logger.info('No pending referral found for user', { userId });
      return;
    }
    
    const referralDoc = referralQuery.docs[0];
    const referralData = referralDoc.data() as Referral;
    
    try {
      // Award tokens to referrer
      const tokenTransactionId = await this.tokenService.addTokens(
        referralData.referrerUserId,
        DEFAULT_REFERRAL_REWARD_TOKENS,
        undefined, // organizationId (optional for referral rewards)
        `referral-${referralDoc.id}` // reference ID
      );
      
      // Update referral status
      await referralDoc.ref.update({
        status: ReferralStatus.COMPLETED,
        rewardStatus: RewardStatus.AWARDED,
        firstPaymentAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
        rewardAwardedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
        rewardTransactionId: tokenTransactionId
      });
      
      // Send success notification to referrer
      await this.notificationService.sendNotification({
        userId: referralData.referrerUserId,
        title: 'Referral Bonus Earned! 🎉',
        message: `Congratulations! You've earned ${DEFAULT_REFERRAL_REWARD_TOKENS} bonus tokens for referring a new member who completed their first month.`,
        priority: NotificationPriority.HIGH,
        category: NotificationCategory.FEATURE,
        metadata: {
          referralId: referralDoc.id,
          tokensAwarded: DEFAULT_REFERRAL_REWARD_TOKENS,
          transactionId: tokenTransactionId
        }
      });
      
      logger.info('Processed referral completion', {
        referralId: referralDoc.id,
        referrerUserId: referralData.referrerUserId,
        referredUserId: userId,
        tokensAwarded: DEFAULT_REFERRAL_REWARD_TOKENS,
        transactionId: tokenTransactionId
      });
      
    } catch (error) {
      // Mark reward as failed
      await referralDoc.ref.update({
        rewardStatus: RewardStatus.FAILED
      });
      
      logger.error('Failed to process referral completion', {
        error: error instanceof Error ? error.message : String(error),
        referralId: referralDoc.id,
        referrerUserId: referralData.referrerUserId,
        referredUserId: userId
      });
      
      throw error;
    }
  }

  /**
   * Get user referral statistics
   */
  async getUserReferralStats(userId: string): Promise<UserReferralStats> {
    // Get user's referral code
    const referralCode = await this.getUserReferralCode(userId);
    
    // Get all referrals made by this user
    const referralsQuery = await this.firestore.collection('referrals')
      .where('referrerUserId', '==', userId)
      .get();
    
    const referrals = referralsQuery.docs.map(doc => ({ id: doc.id, ...doc.data() } as Referral));
    
    const totalReferrals = referrals.length;
    const completedReferrals = referrals.filter(r => r.status === ReferralStatus.COMPLETED).length;
    const pendingReferrals = referrals.filter(r => 
      [ReferralStatus.PENDING, ReferralStatus.TRIAL_ACTIVE].includes(r.status)
    ).length;
    
    const totalTokensEarned = referrals
      .filter(r => r.rewardStatus === RewardStatus.AWARDED)
      .reduce((sum, r) => sum + r.rewardTokens, 0);
    
    // Calculate monthly stats
    const monthlyStatsMap = new Map<string, { referrals: number; completedReferrals: number; tokensEarned: number }>();
    
    referrals.forEach(referral => {
      if (referral.createdAt) {
        const date = referral.createdAt.toDate();
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyStatsMap.has(monthKey)) {
          monthlyStatsMap.set(monthKey, { referrals: 0, completedReferrals: 0, tokensEarned: 0 });
        }
        
        const monthStats = monthlyStatsMap.get(monthKey)!;
        monthStats.referrals++;
        
        if (referral.status === ReferralStatus.COMPLETED) {
          monthStats.completedReferrals++;
        }
        
        if (referral.rewardStatus === RewardStatus.AWARDED) {
          monthStats.tokensEarned += referral.rewardTokens;
        }
      }
    });
    
    const monthlyStats = Array.from(monthlyStatsMap.entries())
      .map(([month, stats]) => ({ month, ...stats }))
      .sort((a, b) => b.month.localeCompare(a.month)); // Most recent first
    
    const lastReferralDate = referrals.length > 0 
      ? referrals.reduce((latest, r) => 
          r.createdAt && (!latest || r.createdAt.toDate() > latest.toDate()) ? r.createdAt : latest
        , null as any)
      : undefined;
    
    return {
      userId,
      referralCode,
      totalReferrals,
      completedReferrals,
      pendingReferrals,
      totalTokensEarned,
      lastReferralDate,
      monthlyStats
    };
  }

  /**
   * Cancel a referral (when referred user cancels before completion)
   */
  async cancelReferral(userId: string): Promise<void> {
    const referralQuery = await this.firestore.collection('referrals')
      .where('referredUserId', '==', userId)
      .where('status', 'in', [ReferralStatus.PENDING, ReferralStatus.TRIAL_ACTIVE])
      .limit(1)
      .get();
    
    if (!referralQuery.empty) {
      const referralDoc = referralQuery.docs[0];
      await referralDoc.ref.update({
        status: ReferralStatus.CANCELLED
      });
      
      logger.info('Cancelled referral', {
        referralId: referralDoc.id,
        referredUserId: userId
      });
    }
  }
} 