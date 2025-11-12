/**
 * Environment configuration module
 * Centralizes access to environment variables with proper typing and defaults
 */

/**
 * Firebase configuration
 */
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

/**
 * Firebase admin configuration
 */
export const firebaseAdminConfig = {
  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL || 'firebase-adminsdk@irisync-app.iam.gserviceaccount.com',
  privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
  projectId: process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'irisync-app'
};

/**
 * AI provider API keys
 */
export const aiProviderKeys = {
  openai: process.env.OPENAI_API_KEY,
  anthropic: process.env.ANTHROPIC_API_KEY,
  google: process.env.GEN_LANG_API_KEY
};

/**
 * AI provider defaults
 */
export const aiDefaults = {
  provider: process.env.DEFAULT_AI_PROVIDER || 'openai',
  modelId: process.env.DEFAULT_MODEL_ID || 'gpt-4-turbo-preview',
  openaiModel: process.env.DEFAULT_OPENAI_MODEL || 'gpt-4-turbo-preview',
  claudeModel: process.env.DEFAULT_CLAUDE_MODEL || 'claude-3-sonnet-20240229',
  geminiModel: process.env.DEFAULT_GEMINI_MODEL || 'gemini-pro'
};

/**
 * Task-specific AI configuration
 */
export const aiTaskConfig = {
  textGeneration: {
    provider: process.env.TEXT_GENERATION_PROVIDER || 'openai',
    model: process.env.TEXT_GENERATION_MODEL || 'gpt-4-turbo-preview'
  },
  chat: {
    provider: process.env.CHAT_PROVIDER || 'claude',
    model: process.env.CHAT_MODEL || 'claude-3-sonnet-20240229'
  },
  embedding: {
    provider: process.env.EMBEDDING_PROVIDER || 'openai',
    model: process.env.EMBEDDING_MODEL || 'text-embedding-ada-002'
  },
  image: {
    provider: process.env.IMAGE_PROVIDER || 'gemini',
    model: process.env.IMAGE_MODEL || 'gemini-pro-vision'
  }
};

/**
 * Stripe payment configuration
 */
export const stripeConfig = {
  secretKey: process.env.STRIPE_SECRET_KEY,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  
  // Core subscription price IDs
  prices: {
    creator: process.env.STRIPE_PRICE_CREATOR_ID,
    influencer: process.env.STRIPE_PRICE_INFLUENCER_ID,
    enterprise: process.env.STRIPE_PRICE_ENTERPRISE_ID,
  },
  
  // Additional seat price IDs
  seatPrices: {
    creator: process.env.STRIPE_CREATOR_SEAT_PRICE_ID,
    influencer: process.env.STRIPE_INFLUENCER_SEAT_PRICE_ID,
    enterprise: process.env.STRIPE_ENTERPRISE_SEAT_PRICE_ID,
  },
  
  // Token package price IDs - all 8 packages
  tokenPackages: {
    token50: process.env.STRIPE_TOKEN_PACKAGE_50_PRICE_ID,
    token100: process.env.STRIPE_TOKEN_PACKAGE_100_PRICE_ID,
    token250: process.env.STRIPE_TOKEN_PACKAGE_250_PRICE_ID,
    token500: process.env.STRIPE_TOKEN_PACKAGE_500_PRICE_ID,
    token1000: process.env.STRIPE_TOKEN_PACKAGE_1000_PRICE_ID,
    token2000: process.env.STRIPE_TOKEN_PACKAGE_2000_PRICE_ID,
    
    // Enterprise discounted packages
    enterpriseToken1000: process.env.STRIPE_TOKEN_PACKAGE_ENT_1000_PRICE_ID,
    enterpriseToken2000: process.env.STRIPE_TOKEN_PACKAGE_ENT_2000_PRICE_ID,
  },
  
  // Product IDs for all 14 products
  products: {
    // Base subscription products
    creator: process.env.STRIPE_CREATOR_PRODUCT_ID,
    influencer: process.env.STRIPE_INFLUENCER_PRODUCT_ID,
    enterprise: process.env.STRIPE_ENTERPRISE_PRODUCT_ID,
    
    // Additional seat products (separate products)
    creatorSeat: process.env.STRIPE_CREATOR_SEAT_PRODUCT_ID, // You may need to add these to environment.md
    influencerSeat: process.env.STRIPE_INFLUENCER_SEAT_PRODUCT_ID,
    enterpriseSeat: process.env.STRIPE_ENTERPRISE_SEAT_PRODUCT_ID,
    
    // Token package products (each has its own product ID)
    tokenPackage50: process.env.STRIPE_TOKEN_PACKAGE_50_PRODUCT_ID,
    tokenPackage100: process.env.STRIPE_TOKEN_PACKAGE_100_PRODUCT_ID,
    tokenPackage250: process.env.STRIPE_TOKEN_PACKAGE_250_PRODUCT_ID,
    tokenPackage500: process.env.STRIPE_TOKEN_PACKAGE_500_PRODUCT_ID,
    tokenPackage1000: process.env.STRIPE_TOKEN_PACKAGE_1000_PRODUCT_ID,
    tokenPackage2000: process.env.STRIPE_TOKEN_PACKAGE_2000_PRODUCT_ID,
    tokenPackageEnt1000: process.env.STRIPE_TOKEN_PACKAGE_ENT_1000_PRODUCT_ID,
    tokenPackageEnt2000: process.env.STRIPE_TOKEN_PACKAGE_ENT_2000_PRODUCT_ID,
    
    // Legacy support (keeping existing references)
    creatorMonthly: process.env.STRIPE_PRICE_CREATOR_ID,
    influencerMonthly: process.env.STRIPE_PRICE_INFLUENCER_ID,
    enterpriseSeatLegacy: process.env.ENTERPRISE_SEAT_PRICE_ID || process.env.STRIPE_ENTERPRISE_SEAT_PRICE_ID,
    additionalSeat: process.env.ADDITIONAL_SEAT_PRICE_ID,
    additionalTokens: process.env.ADDITIONAL_TOKENS_PRICE_ID,
  }
};

/**
 * Application URLs and endpoints
 */
export const appConfig = {
  url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  apiUrl: process.env.API_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000/api'
};

/**
 * Cache and storage configuration
 */
export const storageConfig = {
  googleCloudProjectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  googleCloudStorageBucket: process.env.GOOGLE_CLOUD_STORAGE_BUCKET,
  redisUrl: process.env.REDIS_URL,
  redisPassword: process.env.REDIS_PASSWORD
};

/**
 * Security configuration
 */
export const securityConfig = {
  nextAuthSecret: process.env.NEXTAUTH_SECRET,
  nextAuthUrl: process.env.NEXTAUTH_URL
};

/**
 * Error reporting configuration
 */
export const errorReportingConfig = {
  sentryDsn: process.env.SENTRY_DSN
}; 