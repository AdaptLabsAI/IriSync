#!/usr/bin/env ts-node
import path from 'path';
import dotenv from 'dotenv';
import { KnowledgeBaseIndexer } from '../src/lib/rag/knowledge-base-indexer';
import { logger } from '../src/lib/logging/logger';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

/**
 * Script to index knowledge base content
 */
async function indexKnowledgeBase() {
  try {
    // Get parameters from command line arguments
    const args = process.argv.slice(2);
    const docsPath = args[0] || './docs/support';
    const collection = args[1] || 'support_docs';
    const chunkSize = args[2] ? parseInt(args[2], 10) : 1000;
    const chunkOverlap = args[3] ? parseInt(args[3], 10) : 200;
    
    logger.info(`Starting knowledge base indexing from ${docsPath}`);
    logger.info(`Using collection: ${collection}`);
    logger.info(`Chunk size: ${chunkSize}, chunk overlap: ${chunkOverlap}`);
    
    // Create indexer
    const indexer = new KnowledgeBaseIndexer({
      docsPath,
      collection,
      chunkSize,
      chunkOverlap
    });
    
    // Run indexing
    const startTime = Date.now();
    const results = await indexer.indexKnowledgeBase();
    const duration = (Date.now() - startTime) / 1000;
    
    // Log results
    logger.info(`Indexing completed in ${duration.toFixed(2)}s`);
    logger.info(`Indexed ${results.articlesIndexed} articles into ${results.chunkCount} chunks`);
    
    // Log category breakdown
    logger.info('Category breakdown:');
    Object.entries(results.categories).forEach(([category, count]) => {
      logger.info(`  ${category}: ${count} articles`);
    });
    
    return results;
  } catch (error) {
    logger.error(`Error indexing knowledge base: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  indexKnowledgeBase()
    .then(() => {
      logger.info('Knowledge base indexing completed successfully');
      process.exit(0);
    })
    .catch(error => {
      logger.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    });
}

export default indexKnowledgeBase; 