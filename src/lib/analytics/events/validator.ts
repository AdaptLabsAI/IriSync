import { AnalyticsEvent, EventSchema, EventValidationResult } from '../models/events';

/**
 * Validate an analytics event against its schema
 * @param event The event to validate
 * @param schema The schema to validate against
 * @returns Validation result
 */
export function validateEvent(
  event: Omit<AnalyticsEvent, 'id' | 'validated'>, 
  schema: EventSchema
): EventValidationResult {
  const errors: string[] = [];
  
  // Check for required properties
  schema.requiredProperties.forEach(prop => {
    if (event.properties[prop] === undefined) {
      errors.push(`Missing required property: ${prop}`);
    }
  });
  
  // Check property types
  Object.entries(schema.propertyTypes).forEach(([prop, expectedType]) => {
    const value = event.properties[prop];
    
    if (value !== undefined) {
      // Only validate if the property is present
      if (!validatePropertyType(value, expectedType)) {
        errors.push(`Invalid type for property ${prop}. Expected ${expectedType}, got ${typeof value}`);
      }
    }
  });
  
  // Apply custom validators if provided
  if (schema.propertyValidators) {
    Object.entries(schema.propertyValidators).forEach(([prop, validator]) => {
      const value = event.properties[prop];
      
      if (value !== undefined) {
        try {
          if (!validator(value)) {
            errors.push(`Validation failed for property ${prop}`);
          }
        } catch (error) {
          errors.push(`Error validating property ${prop}: ${error}`);
        }
      }
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Validate a property value against an expected type
 * @param value The value to validate
 * @param expectedType The expected type
 * @returns Whether the value is of the expected type
 */
function validatePropertyType(
  value: any, 
  expectedType: string
): boolean {
  switch (expectedType) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && !isNaN(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'array':
      return Array.isArray(value);
    case 'object':
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    case 'any':
      return true;
    default:
      return false;
  }
}

/**
 * Sanitize event properties by removing potentially sensitive information
 * @param properties Event properties to sanitize
 * @returns Sanitized properties
 */
export function sanitizeEventProperties(
  properties: Record<string, any>
): Record<string, any> {
  const sensitiveKeys = [
    'password',
    'token',
    'apiKey',
    'api_key',
    'secret',
    'credentials',
    'credit_card',
    'creditCard',
    'ssn',
    'socialSecurity'
  ];
  
  const sanitized = { ...properties };
  
  // Check for sensitive keys at root level and remove or mask them
  Object.keys(sanitized).forEach(key => {
    const lowerKey = key.toLowerCase();
    
    if (sensitiveKeys.some(sensitiveKey => lowerKey.includes(sensitiveKey.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      // Recursively sanitize nested objects and arrays
      sanitized[key] = sanitizeNestedObjects(sanitized[key], sensitiveKeys);
    }
  });
  
  return sanitized;
}

/**
 * Recursively sanitize nested objects or arrays
 * @param obj Object or array to sanitize
 * @param sensitiveKeys Keys to look for
 * @returns Sanitized object or array
 */
function sanitizeNestedObjects(
  obj: any,
  sensitiveKeys: string[]
): any {
  if (Array.isArray(obj)) {
    return obj.map(item => {
      if (typeof item === 'object' && item !== null) {
        return sanitizeNestedObjects(item, sensitiveKeys);
      }
      return item;
    });
  }
  
  if (typeof obj === 'object' && obj !== null) {
    const result = { ...obj };
    
    Object.keys(result).forEach(key => {
      const lowerKey = key.toLowerCase();
      
      if (sensitiveKeys.some(sensitiveKey => lowerKey.includes(sensitiveKey.toLowerCase()))) {
        result[key] = '[REDACTED]';
      } else if (typeof result[key] === 'object' && result[key] !== null) {
        result[key] = sanitizeNestedObjects(result[key], sensitiveKeys);
      }
    });
    
    return result;
  }
  
  return obj;
}

/**
 * Validate event against IP/rate limiting rules
 * @param eventName Event name
 * @param userId User ID
 * @param ip IP address
 * @returns Whether the event should be allowed
 */
export async function validateRateLimit(
  eventName: string,
  userId: string,
  ip?: string
): Promise<boolean> {
  try {
    // Get Firestore instance
    const admin = require('firebase-admin');
    const firestore = admin.firestore();
    
    // Define rate limits for specific events (per hour)
    const eventRateLimits: Record<string, number> = {
      'token_purchase': 10,       // Max 10 per hour
      'signup': 5,                // Max 5 per hour per IP
      'login_failed': 5,          // Max 5 per hour
      'content_generate': 100,    // Max 100 per hour
      'api_request': 300          // Max 300 per hour
    };
    
    // Use default limit if event isn't specifically defined
    const limit = eventRateLimits[eventName] || 1000; // Default high limit for other events
    
    // Get current timestamp and one hour ago
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    // Create unique keys for rate limiting
    let rateLimitKey;
    let rateLimitCollection;
    
    if (eventName === 'signup' && ip) {
      // For signups, rate limit by IP to prevent abuse
      rateLimitKey = `${ip}_${eventName}`;
      rateLimitCollection = 'ipRateLimits';
    } else {
      // For most events, rate limit by user ID
      rateLimitKey = `${userId}_${eventName}`;
      rateLimitCollection = 'userRateLimits';
    }
    
    // Get current rate limit document
    const rateLimitRef = firestore.collection(rateLimitCollection).doc(rateLimitKey);
    const rateLimitDoc = await rateLimitRef.get();
    
    if (!rateLimitDoc.exists) {
      // No rate limit record exists yet, create one
      await rateLimitRef.set({
        count: 1,
        firstRequest: admin.firestore.Timestamp.fromMillis(now),
        lastRequest: admin.firestore.Timestamp.fromMillis(now)
      });
      
      // First request is always allowed
      return true;
    }
    
    // Get existing rate limit data
    const rateLimitData = rateLimitDoc.data();
    const firstRequestTime = rateLimitData.firstRequest.toMillis();
    
    // Check if we need to reset the window (it's been more than an hour)
    if (firstRequestTime < oneHourAgo) {
      // Reset the rate limit window
      await rateLimitRef.set({
        count: 1,
        firstRequest: admin.firestore.Timestamp.fromMillis(now),
        lastRequest: admin.firestore.Timestamp.fromMillis(now)
      });
      
      // Allow the request
      return true;
    }
    
    // Check if we're under the limit
    if (rateLimitData.count < limit) {
      // Increment the count
      await rateLimitRef.update({
        count: admin.firestore.FieldValue.increment(1),
        lastRequest: admin.firestore.Timestamp.fromMillis(now)
      });
      
      // Allow the request
      return true;
    }
    
    // If we're here, the rate limit has been exceeded
    // Log to analytics for abuse monitoring
    await firestore.collection('rateLimit').add({
      userId,
      ip: ip || 'unknown',
      eventName,
      timestamp: admin.firestore.Timestamp.fromMillis(now),
      exceeded: true,
      limit
    });
    
    // Request exceeds rate limit
    return false;
  } catch (error) {
    console.error('Error checking rate limit:', error);
    
    // In case of error, allow the request but log the issue
    // This prevents blocking legitimate users due to system errors
    return true;
  }
}
