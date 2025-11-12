import { EventSchema, EventCategory } from '../models/events';

// Event schemas by event name
const eventSchemas: Record<string, EventSchema> = {
  // Page view events
  'page_view': {
    eventName: 'page_view',
    category: EventCategory.PAGE_VIEW,
    requiredProperties: ['path', 'title'],
    optionalProperties: ['url', 'referrer', 'timeOnPage', 'scrollDepth'],
    propertyTypes: {
      path: 'string',
      title: 'string',
      url: 'string',
      referrer: 'string',
      timeOnPage: 'number',
      scrollDepth: 'number'
    }
  },
  
  // User action events
  'login': {
    eventName: 'login',
    category: EventCategory.USER_ACTION,
    requiredProperties: ['method'],
    optionalProperties: ['success', 'error'],
    propertyTypes: {
      method: 'string',
      success: 'boolean',
      error: 'string'
    }
  },
  
  'signup': {
    eventName: 'signup',
    category: EventCategory.USER_ACTION,
    requiredProperties: ['method', 'subscriptionTier'],
    optionalProperties: ['referralSource', 'utm_source', 'utm_medium', 'utm_campaign'],
    propertyTypes: {
      method: 'string',
      subscriptionTier: 'string',
      referralSource: 'string',
      utm_source: 'string',
      utm_medium: 'string',
      utm_campaign: 'string'
    }
  },
  
  'logout': {
    eventName: 'logout',
    category: EventCategory.USER_ACTION,
    requiredProperties: [],
    optionalProperties: ['sessionDuration'],
    propertyTypes: {
      sessionDuration: 'number'
    }
  },
  
  'profile_update': {
    eventName: 'profile_update',
    category: EventCategory.USER_ACTION,
    requiredProperties: ['fieldsUpdated'],
    optionalProperties: [],
    propertyTypes: {
      fieldsUpdated: 'array'
    }
  },
  
  'platform_connect': {
    eventName: 'platform_connect',
    category: EventCategory.USER_ACTION,
    requiredProperties: ['platformId', 'success'],
    optionalProperties: ['error'],
    propertyTypes: {
      platformId: 'string',
      success: 'boolean',
      error: 'string'
    }
  },
  
  'subscription_change': {
    eventName: 'subscription_change',
    category: EventCategory.SUBSCRIPTION,
    requiredProperties: ['oldTier', 'newTier'],
    optionalProperties: ['reason', 'annualPlan'],
    propertyTypes: {
      oldTier: 'string',
      newTier: 'string',
      reason: 'string',
      annualPlan: 'boolean'
    }
  },
  
  'token_purchase': {
    eventName: 'token_purchase',
    category: EventCategory.USER_ACTION,
    requiredProperties: ['amount', 'price', 'currency'],
    optionalProperties: ['paymentMethod', 'promocodeApplied'],
    propertyTypes: {
      amount: 'number',
      price: 'number',
      currency: 'string',
      paymentMethod: 'string',
      promocodeApplied: 'boolean'
    }
  },
  
  // Content events
  'post_create': {
    eventName: 'post_create',
    category: EventCategory.CONTENT,
    requiredProperties: ['contentType'],
    optionalProperties: ['platformIds', 'containsMedia', 'useAI', 'scheduledTime'],
    propertyTypes: {
      contentType: 'string',
      platformIds: 'array',
      containsMedia: 'boolean',
      useAI: 'boolean',
      scheduledTime: 'string'
    }
  },
  
  'post_publish': {
    eventName: 'post_publish',
    category: EventCategory.CONTENT,
    requiredProperties: ['contentType', 'platformIds'],
    optionalProperties: ['postId', 'containsMedia', 'scheduled', 'queuePosition'],
    propertyTypes: {
      contentType: 'string',
      platformIds: 'array',
      postId: 'string',
      containsMedia: 'boolean',
      scheduled: 'boolean',
      queuePosition: 'number'
    }
  },
  
  // AI events
  'content_generate': {
    eventName: 'content_generate',
    category: EventCategory.AI,
    requiredProperties: ['contentType', 'aiModel'],
    optionalProperties: ['promptLength', 'outputLength', 'options', 'tokensUsed'],
    propertyTypes: {
      contentType: 'string',
      aiModel: 'string',
      promptLength: 'number',
      outputLength: 'number',
      options: 'object',
      tokensUsed: 'number'
    }
  },
  
  'caption_generate': {
    eventName: 'caption_generate',
    category: EventCategory.AI,
    requiredProperties: ['mediaType', 'aiModel'],
    optionalProperties: ['outputLength', 'tokensUsed'],
    propertyTypes: {
      mediaType: 'string',
      aiModel: 'string',
      outputLength: 'number',
      tokensUsed: 'number'
    }
  },
  
  'sentiment_analyze': {
    eventName: 'sentiment_analyze',
    category: EventCategory.AI,
    requiredProperties: ['contentType', 'aiModel'],
    optionalProperties: ['contentLength', 'result', 'tokensUsed'],
    propertyTypes: {
      contentType: 'string',
      aiModel: 'string',
      contentLength: 'number',
      result: 'string',
      tokensUsed: 'number'
    }
  },
  
  'token_use': {
    eventName: 'token_use',
    category: EventCategory.AI,
    requiredProperties: ['feature', 'tokensUsed'],
    optionalProperties: ['remainingTokens', 'tokenTier'],
    propertyTypes: {
      feature: 'string',
      tokensUsed: 'number',
      remainingTokens: 'number',
      tokenTier: 'string'
    }
  },
  
  // Subscription events
  'subscription_start': {
    eventName: 'subscription_start',
    category: EventCategory.SUBSCRIPTION,
    requiredProperties: ['tier', 'price', 'currency'],
    optionalProperties: ['annual', 'paymentMethod', 'trialPeriod', 'promoCode'],
    propertyTypes: {
      tier: 'string',
      price: 'number',
      currency: 'string',
      annual: 'boolean',
      paymentMethod: 'string',
      trialPeriod: 'number',
      promoCode: 'string'
    }
  },
  
  'payment_succeed': {
    eventName: 'payment_succeed',
    category: EventCategory.SUBSCRIPTION,
    requiredProperties: ['amount', 'currency'],
    optionalProperties: ['paymentMethod', 'invoiceId', 'billingPeriod'],
    propertyTypes: {
      amount: 'number',
      currency: 'string',
      paymentMethod: 'string',
      invoiceId: 'string',
      billingPeriod: 'string'
    }
  },
  
  'payment_fail': {
    eventName: 'payment_fail',
    category: EventCategory.SUBSCRIPTION,
    requiredProperties: ['amount', 'currency', 'errorCode'],
    optionalProperties: ['paymentMethod', 'errorMessage', 'attemptNumber'],
    propertyTypes: {
      amount: 'number',
      currency: 'string',
      errorCode: 'string',
      paymentMethod: 'string',
      errorMessage: 'string',
      attemptNumber: 'number'
    }
  },
  
  // Platform events
  'post_published': {
    eventName: 'post_published',
    category: EventCategory.PLATFORM,
    requiredProperties: ['platformId', 'contentType'],
    optionalProperties: ['externalPostId', 'externalUrl', 'containsMedia', 'scheduledTime'],
    propertyTypes: {
      platformId: 'string',
      contentType: 'string',
      externalPostId: 'string',
      externalUrl: 'string',
      containsMedia: 'boolean',
      scheduledTime: 'string'
    }
  },
  
  'post_failed': {
    eventName: 'post_failed',
    category: EventCategory.PLATFORM,
    requiredProperties: ['platformId', 'contentType', 'errorCode'],
    optionalProperties: ['errorMessage', 'attemptNumber'],
    propertyTypes: {
      platformId: 'string',
      contentType: 'string',
      errorCode: 'string',
      errorMessage: 'string',
      attemptNumber: 'number'
    }
  },
  
  // System events
  'error': {
    eventName: 'error',
    category: EventCategory.ERROR,
    requiredProperties: ['errorType', 'message'],
    optionalProperties: ['stackTrace', 'component', 'userId'],
    propertyTypes: {
      errorType: 'string',
      message: 'string',
      stackTrace: 'string',
      component: 'string',
      userId: 'string'
    }
  },
  
  'session_start': {
    eventName: 'session_start',
    category: EventCategory.SYSTEM,
    requiredProperties: ['timestamp'],
    optionalProperties: ['userAgent', 'referrer', 'timezone', 'screenSize'],
    propertyTypes: {
      timestamp: 'string',
      userAgent: 'string',
      referrer: 'string',
      timezone: 'string',
      screenSize: 'string'
    }
  },
  
  'session_end': {
    eventName: 'session_end',
    category: EventCategory.SYSTEM,
    requiredProperties: ['duration'],
    optionalProperties: ['pageViews', 'interactions'],
    propertyTypes: {
      duration: 'number',
      pageViews: 'number',
      interactions: 'number'
    }
  }
};

/**
 * Get the schema for a given event name
 * @param eventName The event name
 * @returns The event schema or undefined if not found
 */
export function getEventSchema(eventName: string): EventSchema | undefined {
  return eventSchemas[eventName];
}

/**
 * Get all available event schemas
 * @returns All event schemas
 */
export function getAllEventSchemas(): Record<string, EventSchema> {
  return { ...eventSchemas };
}

/**
 * Register a custom event schema
 * @param schema The event schema to register
 */
export function registerCustomEventSchema(schema: EventSchema): void {
  if (eventSchemas[schema.eventName]) {
    console.warn(`Overriding existing event schema: ${schema.eventName}`);
  }
  
  eventSchemas[schema.eventName] = schema;
} 