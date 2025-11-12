import documentProcessor, { DocumentType, AccessLevel, ChunkingStrategy } from './document-processor';
import { logger } from '../logging/logger';

/**
 * Test the document processor with different chunking strategies
 */
async function testDocumentProcessor() {
  logger.info('Testing document processor with different chunking strategies');
  
  // Sample document
  const sampleDocument = {
    id: 'test-doc-1',
    title: 'Test Document',
    content: `# Introduction to IrisSync

Welcome to IrisSync, the comprehensive social media management platform. This document provides an overview of key features.

## Key Features

IrisSync offers a wide range of features designed to optimize your social media workflow:

### Content Generation
Our AI-powered content generation tools help you create engaging posts tailored to each platform. You can generate ideas, outlines, or complete posts with just a few clicks.

### Scheduled Posting
Plan your content calendar in advance with our powerful scheduling tools. Set specific times or let our AI suggest optimal posting times for maximum engagement.

### Analytics Dashboard
Track performance across all platforms in one unified dashboard. See engagement metrics, audience growth, and content effectiveness in real-time.

## Getting Started

To get started with IrisSync, follow these simple steps:

1. Connect your social accounts
2. Set up your brand voice preferences
3. Create your first post using the AI assistant
4. Schedule it for the optimal time
5. Track performance in the analytics dashboard

## Subscription Tiers

IrisSync offers three subscription tiers:

### Creator Tier ($39/month)
* 5 social accounts
* 100 AI content generations per month
* Basic analytics

### Influencer Tier ($99/month)
* Unlimited social accounts
* 500 AI content generations per month
* Advanced analytics and custom reports

### Enterprise Tier (Custom pricing)
* Unlimited social accounts
* 5,000+ AI content generations
* Advanced analytics, custom reports, and dedicated support

## Support

If you need help, please contact our support team:

- Email: support@irisync.com
- Live chat: Available on the dashboard
- Knowledge base: https://help.irisync.com

Thank you for choosing IrisSync!`,
    type: DocumentType.DOCUMENTATION,
    accessLevel: AccessLevel.PUBLIC,
    url: 'https://irisync.com/docs/getting-started',
    metadata: {
      author: 'IrisSync Team',
      category: 'Getting Started',
      tags: ['documentation', 'onboarding', 'features']
    }
  };
  
  // Test different chunking strategies
  await testStrategy(sampleDocument, ChunkingStrategy.PARAGRAPH, 500, 100);
  await testStrategy(sampleDocument, ChunkingStrategy.SENTENCE, 500, 100);
  await testStrategy(sampleDocument, ChunkingStrategy.FIXED_SIZE, 500, 100);
  await testStrategy(sampleDocument, ChunkingStrategy.SLIDING_WINDOW, 500, 100);
  await testStrategy(sampleDocument, ChunkingStrategy.SEMANTIC, 500, 100);
  
  logger.info('Document processor testing complete');
}

/**
 * Test a specific chunking strategy
 */
async function testStrategy(document: any, strategy: ChunkingStrategy, chunkSize: number, chunkOverlap: number) {
  logger.info(`Testing ${strategy} strategy with size ${chunkSize} and overlap ${chunkOverlap}`);
  
  try {
    // Modify document ID to include strategy
    const testDoc = {
      ...document,
      id: `test-doc-${strategy}`
    };
    
    // Process with specific strategy
    const chunkIds = await documentProcessor.processDocument(testDoc, {
      chunkSize,
      chunkOverlap,
      strategy,
      collection: 'test-collection'
    });
    
    logger.info(`${strategy} strategy result: ${chunkIds.length} chunks created`);
    
    // Log chunk IDs for reference
    logger.debug(`Chunk IDs for ${strategy} strategy:`, { chunkIds });
    
    // Note: In a real testing framework, we would add assertions here
    return chunkIds;
  } catch (error) {
    logger.error(`Error testing ${strategy} strategy:`, { 
      error: error instanceof Error ? error.message : String(error)
    });
    return [];
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testDocumentProcessor()
    .then(() => {
      logger.info('Document processor tests completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Error running document processor tests:', { 
        error: error instanceof Error ? error.message : String(error)
      });
      process.exit(1);
    });
} 