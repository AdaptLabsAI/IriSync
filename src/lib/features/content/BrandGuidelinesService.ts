import { Firestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  Timestamp,
  orderBy,
  limit
} from 'firebase/firestore';
import { firestore } from '@/lib/core/firebase/config';
import { AIProviderFactory } from '../ai/providers/factory';
import { TieredModelRouter, TaskType } from '@/lib/features/ai/models/tiered-model-router';
import { User } from '@/lib/core/models/User';
import { logger } from '@/lib/core/logging/logger';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { SubscriptionTier } from '@/types/subscription';
import { TokenService } from '@/lib/features/tokens/TokenService';
import { AIService } from '@/lib/features/ai/AIService';
import { NotificationService, NotificationPriority, NotificationCategory, NotificationChannel } from '@/lib/core/notifications/NotificationService';
import { getFirestore } from '@/lib/core/firebase/admin';

/**
 * Brand Guidelines Configuration
 */
export interface BrandGuidelines {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  
  // Brand Voice
  brandVoice: {
    tone: string[];
    formality: 'very formal' | 'formal' | 'neutral' | 'casual' | 'very casual';
    personality: string[];
    voiceDescription: string;
  };
  
  // Brand Language
  language: {
    preferredTerms: Record<string, string>; // preferred term -> avoid term
    keyPhrases: string[];
    avoidedPhrases: string[];
    brandSpecificTerms: string[];
  };
  
  // Visual Guidelines
  visual: {
    primaryColors: string[];
    secondaryColors: string[];
    fonts: string[];
    logoUsage: string;
    imageStyle: string;
  };
  
  // Content Guidelines
  content: {
    messagingPillars: string[];
    contentThemes: string[];
    targetAudience: string;
    contentDos: string[];
    contentDonts: string[];
  };
  
  // Platform-specific guidelines
  platformGuidelines: Record<string, {
    tone?: string;
    hashtagStrategy?: string;
    postingFrequency?: string;
    contentTypes?: string[];
    specificRules?: string[];
  }>;
  
  // Compliance settings
  compliance: {
    enforceStrictly: boolean;
    minimumScore: number; // 0-100
    autoReject: boolean;
    requireApproval: boolean;
  };
  
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

/**
 * Brand Compliance Check Result
 */
export interface BrandComplianceResult {
  overallScore: number; // 0-100
  isCompliant: boolean;
  
  scores: {
    voiceCompliance: number;
    languageCompliance: number;
    contentCompliance: number;
    platformCompliance: number;
  };
  
  violations: {
    type: 'voice' | 'language' | 'content' | 'platform';
    severity: 'low' | 'medium' | 'high';
    description: string;
    suggestion: string;
    location?: string;
  }[];
  
  suggestions: string[];
  approvedTerms: string[];
  flaggedTerms: string[];
  
  metadata: {
    checkedAt: Date;
    platform?: string;
    contentType?: string;
    aiModel?: string;
  };
}

/**
 * Content to check for brand compliance
 */
export interface ContentToCheck {
  text: string;
  platform?: string;
  contentType?: 'post' | 'caption' | 'comment' | 'story' | 'bio';
  hashtags?: string[];
  mentions?: string[];
  links?: string[];
  metadata?: Record<string, any>;
}

/**
 * Brand Guidelines Service
 * Manages brand guidelines and enforces brand compliance across content
 */
export class BrandGuidelinesService {
  private getFirestore() {
    const firestore = getFirebaseFirestore();
    if (!firestore) throw new Error('Firestore not configured');
    return firestore;
  }

  private static instance: BrandGuidelinesService;
  
  private constructor() {}
  
  public static getInstance(): BrandGuidelinesService {
    if (!BrandGuidelinesService.instance) {
      BrandGuidelinesService.instance = new BrandGuidelinesService();
    }
    return BrandGuidelinesService.instance;
  }
  
  /**
   * Create new brand guidelines
   */
  async createBrandGuidelines(
    organizationId: string,
    guidelines: Omit<BrandGuidelines, 'id' | 'createdAt' | 'updatedAt'>,
    userId: string
  ): Promise<BrandGuidelines> {
    try {
      const guidelinesRef = doc(collection(this.getFirestore(), 'brandGuidelines'));
      
      const newGuidelines: BrandGuidelines = {
        ...guidelines,
        id: guidelinesRef.id,
        organizationId,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: userId
      };
      
      await setDoc(guidelinesRef, {
        ...newGuidelines,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      logger.info('Brand guidelines created', {
        guidelinesId: newGuidelines.id,
        organizationId,
        userId
      });
      
      return newGuidelines;
    } catch (error) {
      logger.error('Error creating brand guidelines', { error, organizationId, userId });
      throw error;
    }
  }
  
  /**
   * Get brand guidelines for organization
   */
  async getBrandGuidelines(organizationId: string): Promise<BrandGuidelines | null> {
    try {
      const q = query(
        collection(this.getFirestore(), 'brandGuidelines'),
        where('organizationId', '==', organizationId)
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return null;
      }
      
      const doc = snapshot.docs[0];
      const data = doc.data();
      
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as BrandGuidelines;
    } catch (error) {
      logger.error('Error getting brand guidelines', { error, organizationId });
      throw error;
    }
  }
  
  /**
   * Update brand guidelines
   */
  async updateBrandGuidelines(
    guidelinesId: string,
    updates: Partial<Omit<BrandGuidelines, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>>,
    userId: string
  ): Promise<void> {
    try {
      const guidelinesRef = doc(this.getFirestore(), 'brandGuidelines', guidelinesId);
      
      await updateDoc(guidelinesRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      
      logger.info('Brand guidelines updated', {
        guidelinesId,
        userId,
        updatedFields: Object.keys(updates)
      });
    } catch (error) {
      logger.error('Error updating brand guidelines', { error, guidelinesId, userId });
      throw error;
    }
  }
  
  /**
   * Check content against brand guidelines using AI
   */
  async checkBrandCompliance(
    content: ContentToCheck,
    guidelines: BrandGuidelines,
    user?: User
  ): Promise<BrandComplianceResult> {
    try {
      logger.info('Checking brand compliance', {
        organizationId: guidelines.organizationId,
        platform: content.platform,
        contentType: content.contentType
      });
      
      // Prepare the analysis prompt
      const prompt = this.buildCompliancePrompt(content, guidelines);
      
      // Use AI to analyze brand compliance
      const result = await TieredModelRouter.routeTask({
        type: TaskType.CONTENT_GENERATION,
        input: prompt,
        options: {
          temperature: 0.3,
          maxTokens: 1000
        }
      }, user);
      
      // Parse AI response
      const aiAnalysis = this.parseAIComplianceResponse(result.output);
      
      // Perform rule-based checks
      const ruleBasedChecks = this.performRuleBasedChecks(content, guidelines);
      
      // Combine AI and rule-based results
      const complianceResult = this.combineComplianceResults(
        aiAnalysis,
        ruleBasedChecks,
        guidelines,
        content
      );
      
      // Log compliance check
      await this.logComplianceCheck(guidelines.organizationId, content, complianceResult);
      
      return complianceResult;
    } catch (error) {
      logger.error('Error checking brand compliance', { error, organizationId: guidelines.organizationId });
      
      // Return fallback result
      return this.createFallbackComplianceResult(content, guidelines);
    }
  }
  
  /**
   * Get brand compliance suggestions for improving content
   */
  async getBrandComplianceSuggestions(
    content: ContentToCheck,
    guidelines: BrandGuidelines,
    complianceResult: BrandComplianceResult,
    user?: User
  ): Promise<{
    improvedContent: string;
    suggestions: string[];
    changes: Array<{
      original: string;
      improved: string;
      reason: string;
    }>;
  }> {
    try {
      const prompt = `
        Improve this content to better align with brand guidelines:
        
        ORIGINAL CONTENT:
        ${content.text}
        
        BRAND GUIDELINES:
        Voice: ${guidelines.brandVoice.tone.join(', ')} (${guidelines.brandVoice.formality})
        Key Phrases: ${guidelines.language.keyPhrases.join(', ')}
        Avoided Phrases: ${guidelines.language.avoidedPhrases.join(', ')}
        Messaging Pillars: ${guidelines.content.messagingPillars.join(', ')}
        
        COMPLIANCE ISSUES:
        ${complianceResult.violations.map(v => `- ${v.description}: ${v.suggestion}`).join('\n')}
        
        Please provide:
        1. Improved content that maintains the original meaning but aligns with brand guidelines
        2. Specific suggestions for improvement
        3. List of changes made with explanations
        
        Format as JSON:
        {
          "improvedContent": "...",
          "suggestions": ["...", "..."],
          "changes": [{"original": "...", "improved": "...", "reason": "..."}]
        }
      `;
      
      const result = await TieredModelRouter.routeTask({
        type: TaskType.CONTENT_GENERATION,
        input: prompt,
        options: {
          temperature: 0.4,
          maxTokens: 800
        }
      }, user);
      
      return JSON.parse(result.output);
    } catch (error) {
      logger.error('Error getting brand compliance suggestions', { error });
      
      // Return fallback suggestions
      return {
        improvedContent: content.text,
        suggestions: [
          'Review brand voice guidelines',
          'Check for preferred terminology usage',
          'Ensure content aligns with messaging pillars'
        ],
        changes: []
      };
    }
  }
  
  /**
   * Build AI prompt for compliance checking
   */
  private buildCompliancePrompt(content: ContentToCheck, guidelines: BrandGuidelines): string {
    return `
      Analyze this content for brand compliance:
      
      CONTENT TO ANALYZE:
      Text: ${content.text}
      Platform: ${content.platform || 'general'}
      Type: ${content.contentType || 'post'}
      Hashtags: ${content.hashtags?.join(', ') || 'none'}
      
      BRAND GUIDELINES:
      
      Brand Voice:
      - Tone: ${guidelines.brandVoice.tone.join(', ')}
      - Formality: ${guidelines.brandVoice.formality}
      - Personality: ${guidelines.brandVoice.personality.join(', ')}
      - Description: ${guidelines.brandVoice.voiceDescription}
      
      Language Guidelines:
      - Key Phrases: ${guidelines.language.keyPhrases.join(', ')}
      - Avoided Phrases: ${guidelines.language.avoidedPhrases.join(', ')}
      - Brand Terms: ${guidelines.language.brandSpecificTerms.join(', ')}
      
      Content Guidelines:
      - Messaging Pillars: ${guidelines.content.messagingPillars.join(', ')}
      - Target Audience: ${guidelines.content.targetAudience}
      - Content Dos: ${guidelines.content.contentDos.join(', ')}
      - Content Don'ts: ${guidelines.content.contentDonts.join(', ')}
      
      Platform Guidelines:
      ${content.platform && guidelines.platformGuidelines[content.platform] 
        ? JSON.stringify(guidelines.platformGuidelines[content.platform], null, 2)
        : 'No specific platform guidelines'
      }
      
      Analyze and provide scores (0-100) for:
      1. Voice compliance (tone, formality, personality match)
      2. Language compliance (terminology, phrases)
      3. Content compliance (messaging, audience alignment)
      4. Platform compliance (platform-specific rules)
      
      Identify violations and provide specific suggestions.
      
      Format as JSON:
      {
        "scores": {
          "voiceCompliance": 85,
          "languageCompliance": 90,
          "contentCompliance": 75,
          "platformCompliance": 80
        },
        "violations": [
          {
            "type": "voice",
            "severity": "medium",
            "description": "...",
            "suggestion": "..."
          }
        ],
        "suggestions": ["...", "..."],
        "flaggedTerms": ["...", "..."],
        "approvedTerms": ["...", "..."]
      }
    `;
  }
  
  /**
   * Parse AI compliance response
   */
  private parseAIComplianceResponse(response: string): any {
    try {
      return JSON.parse(response);
    } catch (error) {
      logger.warn('Failed to parse AI compliance response', { error, response });
      
      // Return fallback structure
      return {
        scores: {
          voiceCompliance: 70,
          languageCompliance: 70,
          contentCompliance: 70,
          platformCompliance: 70
        },
        violations: [],
        suggestions: ['Review content against brand guidelines'],
        flaggedTerms: [],
        approvedTerms: []
      };
    }
  }
  
  /**
   * Perform rule-based compliance checks
   */
  private performRuleBasedChecks(
    content: ContentToCheck,
    guidelines: BrandGuidelines
  ): Partial<BrandComplianceResult> {
    const violations: BrandComplianceResult['violations'] = [];
    const flaggedTerms: string[] = [];
    const approvedTerms: string[] = [];
    
    const contentLower = content.text.toLowerCase();
    
    // Check for avoided phrases
    guidelines.language.avoidedPhrases.forEach(phrase => {
      if (contentLower.includes(phrase.toLowerCase())) {
        violations.push({
          type: 'language',
          severity: 'high',
          description: `Contains avoided phrase: "${phrase}"`,
          suggestion: `Remove or replace "${phrase}" with approved terminology`
        });
        flaggedTerms.push(phrase);
      }
    });
    
    // Check for key phrases
    guidelines.language.keyPhrases.forEach(phrase => {
      if (contentLower.includes(phrase.toLowerCase())) {
        approvedTerms.push(phrase);
      }
    });
    
    // Check preferred terms
    Object.entries(guidelines.language.preferredTerms).forEach(([preferred, avoided]) => {
      if (contentLower.includes(avoided.toLowerCase()) && !contentLower.includes(preferred.toLowerCase())) {
        violations.push({
          type: 'language',
          severity: 'medium',
          description: `Use "${preferred}" instead of "${avoided}"`,
          suggestion: `Replace "${avoided}" with the preferred term "${preferred}"`
        });
        flaggedTerms.push(avoided);
      }
    });
    
    return {
      violations,
      flaggedTerms,
      approvedTerms
    };
  }
  
  /**
   * Combine AI and rule-based compliance results
   */
  private combineComplianceResults(
    aiAnalysis: any,
    ruleBasedChecks: Partial<BrandComplianceResult>,
    guidelines: BrandGuidelines,
    content: ContentToCheck
  ): BrandComplianceResult {
    // Combine violations
    const allViolations = [
      ...(aiAnalysis.violations || []),
      ...(ruleBasedChecks.violations || [])
    ];
    
    // Calculate overall score
    const scores = aiAnalysis.scores || {
      voiceCompliance: 70,
      languageCompliance: 70,
      contentCompliance: 70,
      platformCompliance: 70
    };
    
    // Adjust scores based on rule violations
    if (ruleBasedChecks.violations && ruleBasedChecks.violations.length > 0) {
      const penalty = Math.min(30, ruleBasedChecks.violations.length * 10);
      scores.languageCompliance = Math.max(0, scores.languageCompliance - penalty);
    }
    
    const overallScore = Math.round(
      (scores.voiceCompliance + scores.languageCompliance + scores.contentCompliance + scores.platformCompliance) / 4
    );
    
    const isCompliant = overallScore >= guidelines.compliance.minimumScore;
    
    return {
      overallScore,
      isCompliant,
      scores,
      violations: allViolations,
      suggestions: [
        ...(aiAnalysis.suggestions || []),
        ...this.generateAdditionalSuggestions(allViolations)
      ],
      approvedTerms: [
        ...(aiAnalysis.approvedTerms || []),
        ...(ruleBasedChecks.approvedTerms || [])
      ],
      flaggedTerms: [
        ...(aiAnalysis.flaggedTerms || []),
        ...(ruleBasedChecks.flaggedTerms || [])
      ],
      metadata: {
        checkedAt: new Date(),
        platform: content.platform,
        contentType: content.contentType,
        aiModel: 'tiered-router'
      }
    };
  }
  
  /**
   * Generate additional suggestions based on violations
   */
  private generateAdditionalSuggestions(violations: BrandComplianceResult['violations']): string[] {
    const suggestions: string[] = [];
    
    const voiceViolations = violations.filter(v => v.type === 'voice').length;
    const languageViolations = violations.filter(v => v.type === 'language').length;
    const contentViolations = violations.filter(v => v.type === 'content').length;
    
    if (voiceViolations > 0) {
      suggestions.push('Review brand voice guidelines and adjust tone accordingly');
    }
    
    if (languageViolations > 0) {
      suggestions.push('Use approved terminology and avoid flagged phrases');
    }
    
    if (contentViolations > 0) {
      suggestions.push('Ensure content aligns with brand messaging pillars and target audience');
    }
    
    return suggestions;
  }
  
  /**
   * Create fallback compliance result
   */
  private createFallbackComplianceResult(
    content: ContentToCheck,
    guidelines: BrandGuidelines
  ): BrandComplianceResult {
    return {
      overallScore: 50,
      isCompliant: false,
      scores: {
        voiceCompliance: 50,
        languageCompliance: 50,
        contentCompliance: 50,
        platformCompliance: 50
      },
      violations: [{
        type: 'content',
        severity: 'medium',
        description: 'Unable to perform full compliance check',
        suggestion: 'Manually review content against brand guidelines'
      }],
      suggestions: [
        'Review content against brand guidelines',
        'Check for approved terminology usage',
        'Ensure tone matches brand voice'
      ],
      approvedTerms: [],
      flaggedTerms: [],
      metadata: {
        checkedAt: new Date(),
        platform: content.platform,
        contentType: content.contentType
      }
    };
  }
  
  /**
   * Log compliance check for analytics
   */
  private async logComplianceCheck(
    organizationId: string,
    content: ContentToCheck,
    result: BrandComplianceResult
  ): Promise<void> {
    try {
      const logRef = doc(collection(this.getFirestore(), 'brandComplianceLogs'));
      
      await setDoc(logRef, {
        organizationId,
        contentType: content.contentType,
        platform: content.platform,
        overallScore: result.overallScore,
        isCompliant: result.isCompliant,
        violationCount: result.violations.length,
        checkedAt: serverTimestamp()
      });
    } catch (error) {
      logger.warn('Failed to log compliance check', { error, organizationId });
    }
  }
  
  /**
   * Get brand compliance analytics
   */
  async getBrandComplianceAnalytics(
    organizationId: string,
    timeframe: 'week' | 'month' | 'quarter' = 'month'
  ): Promise<{
    averageScore: number;
    complianceRate: number;
    totalChecks: number;
    commonViolations: Array<{
      type: string;
      count: number;
      description: string;
    }>;
    trendData: Array<{
      date: string;
      score: number;
      checks: number;
    }>;
  }> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      
      switch (timeframe) {
        case 'week':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(endDate.getMonth() - 1);
          break;
        case 'quarter':
          startDate.setMonth(endDate.getMonth() - 3);
          break;
      }
      
      const q = query(
        collection(this.getFirestore(), 'brandComplianceLogs'),
        where('organizationId', '==', organizationId),
        where('checkedAt', '>=', Timestamp.fromDate(startDate)),
        where('checkedAt', '<=', Timestamp.fromDate(endDate))
      );
      
      const snapshot = await getDocs(q);
      const logs = snapshot.docs.map(doc => doc.data());
      
      if (logs.length === 0) {
        return {
          averageScore: 0,
          complianceRate: 0,
          totalChecks: 0,
          commonViolations: [],
          trendData: []
        };
      }
      
      const totalScore = logs.reduce((sum, log) => sum + (log.overallScore || 0), 0);
      const averageScore = Math.round(totalScore / logs.length);
      
      const compliantChecks = logs.filter(log => log.isCompliant).length;
      const complianceRate = Math.round((compliantChecks / logs.length) * 100);
      
      return {
        averageScore,
        complianceRate,
        totalChecks: logs.length,
        commonViolations: [], // Would need to aggregate from detailed logs
        trendData: [] // Would need to group by date
      };
    } catch (error) {
      logger.error('Error getting brand compliance analytics', { error, organizationId });
      throw error;
    }
  }
} 