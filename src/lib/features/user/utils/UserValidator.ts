import { UserConfig, UserProfileData, UserErrorType } from '../types';

/**
 * Validation error interface
 */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

/**
 * Validation warning interface
 */
export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * User data validator utility
 * Handles validation of user data, profiles, and business rules
 */
export class UserValidator {
  private config: UserConfig;

  constructor(config: UserConfig) {
    this.config = config;
  }

  /**
   * Validate user ID format
   */
  public validateUserId(userId: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!userId) {
      errors.push({
        field: 'userId',
        message: 'User ID is required',
        code: 'USER_ID_REQUIRED'
      });
    } else if (typeof userId !== 'string') {
      errors.push({
        field: 'userId',
        message: 'User ID must be a string',
        code: 'USER_ID_INVALID_TYPE'
      });
    } else if (userId.length < 3) {
      errors.push({
        field: 'userId',
        message: 'User ID must be at least 3 characters long',
        code: 'USER_ID_TOO_SHORT'
      });
    } else if (userId.length > 128) {
      errors.push({
        field: 'userId',
        message: 'User ID must be less than 128 characters',
        code: 'USER_ID_TOO_LONG'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate email format
   */
  public validateEmail(email: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!email) {
      errors.push({
        field: 'email',
        message: 'Email is required',
        code: 'EMAIL_REQUIRED'
      });
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        errors.push({
          field: 'email',
          message: 'Invalid email format',
          code: 'EMAIL_INVALID_FORMAT'
        });
      } else if (email.length > 254) {
        errors.push({
          field: 'email',
          message: 'Email must be less than 254 characters',
          code: 'EMAIL_TOO_LONG'
        });
      }

      // Check for common typos
      const commonDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
      const domain = email.split('@')[1]?.toLowerCase();
      if (domain && !commonDomains.includes(domain)) {
        const suggestions = this.suggestEmailDomain(domain, commonDomains);
        if (suggestions.length > 0) {
          warnings.push({
            field: 'email',
            message: `Did you mean ${suggestions[0]}?`,
            code: 'EMAIL_DOMAIN_SUGGESTION'
          });
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate password strength
   */
  public validatePassword(password: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const policy = this.config.passwordPolicy;

    if (!password) {
      errors.push({
        field: 'password',
        message: 'Password is required',
        code: 'PASSWORD_REQUIRED'
      });
      return { isValid: false, errors, warnings };
    }

    if (password.length < policy.minLength) {
      errors.push({
        field: 'password',
        message: `Password must be at least ${policy.minLength} characters long`,
        code: 'PASSWORD_TOO_SHORT'
      });
    }

    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push({
        field: 'password',
        message: 'Password must contain at least one uppercase letter',
        code: 'PASSWORD_MISSING_UPPERCASE'
      });
    }

    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push({
        field: 'password',
        message: 'Password must contain at least one lowercase letter',
        code: 'PASSWORD_MISSING_LOWERCASE'
      });
    }

    if (policy.requireNumbers && !/\d/.test(password)) {
      errors.push({
        field: 'password',
        message: 'Password must contain at least one number',
        code: 'PASSWORD_MISSING_NUMBER'
      });
    }

    if (policy.requireSymbols && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push({
        field: 'password',
        message: 'Password must contain at least one special character',
        code: 'PASSWORD_MISSING_SYMBOL'
      });
    }

    // Check for common weak passwords
    const commonPasswords = [
      'password', '123456', 'password123', 'admin', 'qwerty',
      'letmein', 'welcome', 'monkey', '1234567890'
    ];
    if (commonPasswords.includes(password.toLowerCase())) {
      errors.push({
        field: 'password',
        message: 'Password is too common and easily guessable',
        code: 'PASSWORD_TOO_COMMON'
      });
    }

    // Strength warnings
    if (password.length < 12) {
      warnings.push({
        field: 'password',
        message: 'Consider using a longer password for better security',
        code: 'PASSWORD_LENGTH_RECOMMENDATION'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate user profile data
   */
  public validateUserData(userData: UserProfileData): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate email
    const emailValidation = this.validateEmail(userData.email);
    errors.push(...emailValidation.errors);
    warnings.push(...emailValidation.warnings);

    // Validate names
    if (!userData.firstName || userData.firstName.trim().length === 0) {
      errors.push({
        field: 'firstName',
        message: 'First name is required',
        code: 'FIRST_NAME_REQUIRED'
      });
    } else if (userData.firstName.length > 50) {
      errors.push({
        field: 'firstName',
        message: 'First name must be less than 50 characters',
        code: 'FIRST_NAME_TOO_LONG'
      });
    }

    if (!userData.lastName || userData.lastName.trim().length === 0) {
      errors.push({
        field: 'lastName',
        message: 'Last name is required',
        code: 'LAST_NAME_REQUIRED'
      });
    } else if (userData.lastName.length > 50) {
      errors.push({
        field: 'lastName',
        message: 'Last name must be less than 50 characters',
        code: 'LAST_NAME_TOO_LONG'
      });
    }

    // Validate optional fields
    if (userData.phoneNumber) {
      const phoneValidation = this.validatePhoneNumber(userData.phoneNumber);
      errors.push(...phoneValidation.errors);
      warnings.push(...phoneValidation.warnings);
    }

    if (userData.website) {
      const urlValidation = this.validateUrl(userData.website);
      errors.push(...urlValidation.errors);
      warnings.push(...urlValidation.warnings);
    }

    if (userData.bio && userData.bio.length > 500) {
      errors.push({
        field: 'bio',
        message: 'Bio must be less than 500 characters',
        code: 'BIO_TOO_LONG'
      });
    }

    if (userData.jobTitle && userData.jobTitle.length > 100) {
      errors.push({
        field: 'jobTitle',
        message: 'Job title must be less than 100 characters',
        code: 'JOB_TITLE_TOO_LONG'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate phone number format
   */
  public validatePhoneNumber(phoneNumber: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!phoneNumber) {
      return { isValid: true, errors, warnings }; // Optional field
    }

    // Remove all non-digit characters for validation
    const digitsOnly = phoneNumber.replace(/\D/g, '');

    if (digitsOnly.length < 10) {
      errors.push({
        field: 'phoneNumber',
        message: 'Phone number must have at least 10 digits',
        code: 'PHONE_TOO_SHORT'
      });
    } else if (digitsOnly.length > 15) {
      errors.push({
        field: 'phoneNumber',
        message: 'Phone number must have less than 15 digits',
        code: 'PHONE_TOO_LONG'
      });
    }

    // Basic format validation
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!phoneRegex.test(digitsOnly)) {
      errors.push({
        field: 'phoneNumber',
        message: 'Invalid phone number format',
        code: 'PHONE_INVALID_FORMAT'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate URL format
   */
  public validateUrl(url: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!url) {
      return { isValid: true, errors, warnings }; // Optional field
    }

    try {
      const urlObj = new URL(url);
      
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        errors.push({
          field: 'website',
          message: 'URL must use HTTP or HTTPS protocol',
          code: 'URL_INVALID_PROTOCOL'
        });
      }

      if (url.length > 2048) {
        errors.push({
          field: 'website',
          message: 'URL must be less than 2048 characters',
          code: 'URL_TOO_LONG'
        });
      }
    } catch (error) {
      errors.push({
        field: 'website',
        message: 'Invalid URL format',
        code: 'URL_INVALID_FORMAT'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Suggest email domain corrections
   */
  private suggestEmailDomain(domain: string, commonDomains: string[]): string[] {
    const suggestions: string[] = [];
    
    for (const commonDomain of commonDomains) {
      const distance = this.levenshteinDistance(domain, commonDomain);
      if (distance <= 2 && distance > 0) {
        suggestions.push(commonDomain);
      }
    }

    return suggestions.sort((a, b) => 
      this.levenshteinDistance(domain, a) - this.levenshteinDistance(domain, b)
    );
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i;
    }

    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Update validator configuration
   */
  public updateConfig(config: UserConfig): void {
    this.config = config;
  }
} 