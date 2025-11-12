// CRM Validator Utility
// Provides validation functions for CRM data across all platforms

import { logger } from '@/lib/core/logging/logger';
import { CRMPlatform } from '../types';
import { ContactData } from '../models/Contact';
import { DealData } from '../models/Deal';
import { LeadData } from '../models/Lead';

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * Validation error interface
 */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
  severity: 'error' | 'warning';
}

/**
 * Validation warning interface
 */
export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

/**
 * CRM data validator
 */
export class CRMValidator {
  /**
   * Validate contact data
   */
  static validateContact(contactData: ContactData, platform?: CRMPlatform): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      // Required field validation
      if (!contactData.firstName && !contactData.lastName && !contactData.email) {
        errors.push({
          field: 'contact',
          message: 'At least one of firstName, lastName, or email is required',
          code: 'MISSING_REQUIRED_FIELDS',
          severity: 'error'
        });
      }

      // Email validation
      if (contactData.email && !this.isValidEmail(contactData.email)) {
        errors.push({
          field: 'email',
          message: 'Invalid email format',
          code: 'INVALID_EMAIL_FORMAT',
          severity: 'error'
        });
      }

      // Phone validation
      if (contactData.phone && !this.isValidPhone(contactData.phone)) {
        warnings.push({
          field: 'phone',
          message: 'Phone number format may not be valid',
          suggestion: 'Use international format: +1234567890'
        });
      }

      // Mobile phone validation
      if (contactData.mobilePhone && !this.isValidPhone(contactData.mobilePhone)) {
        warnings.push({
          field: 'mobilePhone',
          message: 'Mobile phone number format may not be valid',
          suggestion: 'Use international format: +1234567890'
        });
      }

      // Platform-specific validation
      if (platform) {
        this.validateContactForPlatform(contactData, platform, errors, warnings);
      }

      // Data completeness warnings
      this.checkContactCompleteness(contactData, warnings);

      logger.debug('Contact validation completed', {
        isValid: errors.length === 0,
        errorCount: errors.length,
        warningCount: warnings.length
      });

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      logger.error('Error during contact validation', { error });
      return {
        isValid: false,
        errors: [{
          field: 'validation',
          message: 'Validation process failed',
          code: 'VALIDATION_ERROR',
          severity: 'error'
        }],
        warnings: []
      };
    }
  }

  /**
   * Validate deal data
   */
  static validateDeal(dealData: DealData, platform?: CRMPlatform): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      // Required field validation
      if (!dealData.name || dealData.name.trim().length === 0) {
        errors.push({
          field: 'name',
          message: 'Deal name is required',
          code: 'MISSING_DEAL_NAME',
          severity: 'error'
        });
      }

      // Amount validation
      if (dealData.amount !== undefined && dealData.amount < 0) {
        errors.push({
          field: 'amount',
          message: 'Deal amount cannot be negative',
          code: 'INVALID_AMOUNT',
          severity: 'error'
        });
      }

      // Probability validation
      if (dealData.probability !== undefined && 
          (dealData.probability < 0 || dealData.probability > 100)) {
        errors.push({
          field: 'probability',
          message: 'Probability must be between 0 and 100',
          code: 'INVALID_PROBABILITY',
          severity: 'error'
        });
      }

      // Close date validation
      if (dealData.closeDate && dealData.closeDate < new Date()) {
        warnings.push({
          field: 'closeDate',
          message: 'Close date is in the past',
          suggestion: 'Consider updating the close date to a future date'
        });
      }

      // Platform-specific validation
      if (platform) {
        this.validateDealForPlatform(dealData, platform, errors, warnings);
      }

      // Data completeness warnings
      this.checkDealCompleteness(dealData, warnings);

      logger.debug('Deal validation completed', {
        isValid: errors.length === 0,
        errorCount: errors.length,
        warningCount: warnings.length
      });

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      logger.error('Error during deal validation', { error });
      return {
        isValid: false,
        errors: [{
          field: 'validation',
          message: 'Validation process failed',
          code: 'VALIDATION_ERROR',
          severity: 'error'
        }],
        warnings: []
      };
    }
  }

  /**
   * Validate lead data
   */
  static validateLead(leadData: LeadData, platform?: CRMPlatform): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      // Required field validation
      if (!leadData.firstName && !leadData.lastName && !leadData.email && !leadData.company) {
        errors.push({
          field: 'lead',
          message: 'At least one of firstName, lastName, email, or company is required',
          code: 'MISSING_REQUIRED_FIELDS',
          severity: 'error'
        });
      }

      // Email validation
      if (leadData.email && !this.isValidEmail(leadData.email)) {
        errors.push({
          field: 'email',
          message: 'Invalid email format',
          code: 'INVALID_EMAIL_FORMAT',
          severity: 'error'
        });
      }

      // Phone validation
      if (leadData.phone && !this.isValidPhone(leadData.phone)) {
        warnings.push({
          field: 'phone',
          message: 'Phone number format may not be valid',
          suggestion: 'Use international format: +1234567890'
        });
      }

      // Website validation
      if (leadData.website && !this.isValidUrl(leadData.website)) {
        warnings.push({
          field: 'website',
          message: 'Website URL format may not be valid',
          suggestion: 'Include protocol: https://example.com'
        });
      }

      // Lead score validation
      if (leadData.leadScore !== undefined && 
          (leadData.leadScore < 0 || leadData.leadScore > 100)) {
        errors.push({
          field: 'leadScore',
          message: 'Lead score must be between 0 and 100',
          code: 'INVALID_LEAD_SCORE',
          severity: 'error'
        });
      }

      // Platform-specific validation
      if (platform) {
        this.validateLeadForPlatform(leadData, platform, errors, warnings);
      }

      // Data completeness warnings
      this.checkLeadCompleteness(leadData, warnings);

      logger.debug('Lead validation completed', {
        isValid: errors.length === 0,
        errorCount: errors.length,
        warningCount: warnings.length
      });

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      logger.error('Error during lead validation', { error });
      return {
        isValid: false,
        errors: [{
          field: 'validation',
          message: 'Validation process failed',
          code: 'VALIDATION_ERROR',
          severity: 'error'
        }],
        warnings: []
      };
    }
  }

  // ==================== PRIVATE VALIDATION METHODS ====================

  /**
   * Validate email format
   */
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone number format
   */
  private static isValidPhone(phone: string): boolean {
    // Remove common formatting characters
    const cleanPhone = phone.replace(/[\s\-\(\)\+]/g, '');
    // Check if it's a valid phone number (basic validation)
    const phoneRegex = /^\d{7,15}$/;
    return phoneRegex.test(cleanPhone);
  }

  /**
   * Validate URL format
   */
  private static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Platform-specific contact validation
   */
  private static validateContactForPlatform(
    contactData: ContactData,
    platform: CRMPlatform,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    switch (platform) {
      case CRMPlatform.SALESFORCE:
        // Salesforce requires LastName for contacts
        if (!contactData.lastName) {
          errors.push({
            field: 'lastName',
            message: 'Last name is required for Salesforce contacts',
            code: 'SALESFORCE_LASTNAME_REQUIRED',
            severity: 'error'
          });
        }
        break;

      case CRMPlatform.HUBSPOT:
        // HubSpot works better with email
        if (!contactData.email) {
          warnings.push({
            field: 'email',
            message: 'Email is highly recommended for HubSpot contacts',
            suggestion: 'Add email for better contact management'
          });
        }
        break;

      // Add other platform-specific validations as needed
    }
  }

  /**
   * Platform-specific deal validation
   */
  private static validateDealForPlatform(
    dealData: DealData,
    platform: CRMPlatform,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    switch (platform) {
      case CRMPlatform.SALESFORCE:
        // Salesforce requires CloseDate for opportunities
        if (!dealData.closeDate) {
          errors.push({
            field: 'closeDate',
            message: 'Close date is required for Salesforce opportunities',
            code: 'SALESFORCE_CLOSEDATE_REQUIRED',
            severity: 'error'
          });
        }
        break;

      case CRMPlatform.PIPEDRIVE:
        // Pipedrive works better with amounts
        if (!dealData.amount) {
          warnings.push({
            field: 'amount',
            message: 'Deal amount is recommended for Pipedrive',
            suggestion: 'Add amount for better pipeline management'
          });
        }
        break;

      // Add other platform-specific validations as needed
    }
  }

  /**
   * Platform-specific lead validation
   */
  private static validateLeadForPlatform(
    leadData: LeadData,
    platform: CRMPlatform,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    switch (platform) {
      case CRMPlatform.SALESFORCE:
        // Salesforce requires LastName and Company for leads
        if (!leadData.lastName) {
          errors.push({
            field: 'lastName',
            message: 'Last name is required for Salesforce leads',
            code: 'SALESFORCE_LASTNAME_REQUIRED',
            severity: 'error'
          });
        }
        if (!leadData.company) {
          errors.push({
            field: 'company',
            message: 'Company is required for Salesforce leads',
            code: 'SALESFORCE_COMPANY_REQUIRED',
            severity: 'error'
          });
        }
        break;

      // Add other platform-specific validations as needed
    }
  }

  /**
   * Check contact data completeness
   */
  private static checkContactCompleteness(
    contactData: ContactData,
    warnings: ValidationWarning[]
  ): void {
    const recommendedFields = [
      { field: 'email', message: 'Email helps with contact identification' },
      { field: 'phone', message: 'Phone number enables direct contact' },
      { field: 'company', message: 'Company information helps with context' },
      { field: 'jobTitle', message: 'Job title helps with lead qualification' }
    ];

    for (const { field, message } of recommendedFields) {
      if (!contactData[field as keyof ContactData]) {
        warnings.push({
          field,
          message: `Missing ${field}: ${message}`,
          suggestion: `Consider adding ${field} for better contact management`
        });
      }
    }
  }

  /**
   * Check deal data completeness
   */
  private static checkDealCompleteness(
    dealData: DealData,
    warnings: ValidationWarning[]
  ): void {
    const recommendedFields = [
      { field: 'amount', message: 'Amount helps with pipeline forecasting' },
      { field: 'closeDate', message: 'Close date helps with timeline planning' },
      { field: 'stage', message: 'Stage helps track deal progress' },
      { field: 'probability', message: 'Probability helps with forecasting' }
    ];

    for (const { field, message } of recommendedFields) {
      if (!dealData[field as keyof DealData]) {
        warnings.push({
          field,
          message: `Missing ${field}: ${message}`,
          suggestion: `Consider adding ${field} for better deal management`
        });
      }
    }
  }

  /**
   * Check lead data completeness
   */
  private static checkLeadCompleteness(
    leadData: LeadData,
    warnings: ValidationWarning[]
  ): void {
    const recommendedFields = [
      { field: 'email', message: 'Email enables lead nurturing' },
      { field: 'phone', message: 'Phone enables direct outreach' },
      { field: 'company', message: 'Company helps with lead qualification' },
      { field: 'jobTitle', message: 'Job title helps with targeting' },
      { field: 'leadSource', message: 'Lead source helps track marketing effectiveness' }
    ];

    for (const { field, message } of recommendedFields) {
      if (!leadData[field as keyof LeadData]) {
        warnings.push({
          field,
          message: `Missing ${field}: ${message}`,
          suggestion: `Consider adding ${field} for better lead management`
        });
      }
    }
  }
} 