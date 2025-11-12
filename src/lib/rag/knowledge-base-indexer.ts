import fs from 'fs';
import path from 'path';
import { logger } from '../logging/logger';
import DocumentProcessor, { Document } from './document-processor';
import { RAGService } from './rag-service';

/**
 * Knowledge base category
 */
export enum KnowledgeCategory {
  GENERAL = 'general',
  FEATURES = 'features',
  TROUBLESHOOTING = 'troubleshooting',
  FAQ = 'faq',
  TUTORIALS = 'tutorials',
  API = 'api'
}

/**
 * Knowledge base article metadata
 */
export interface KnowledgeArticle {
  id: string;
  title: string;
  category: KnowledgeCategory;
  tags: string[];
  content: string;
  url?: string;
  lastUpdated: Date;
}

/**
 * Knowledge base indexer configuration
 */
export interface IndexerConfig {
  docsPath: string;
  collection: string;
  chunkSize?: number;
  chunkOverlap?: number;
}

/**
 * Knowledge base indexer utility
 */
export class KnowledgeBaseIndexer {
  private config: IndexerConfig;
  private ragService: typeof RAGService;
  
  /**
   * Create a new knowledge base indexer
   * @param config Indexer configuration
   */
  constructor(config: IndexerConfig) {
    this.config = {
      chunkSize: 1000,
      chunkOverlap: 200,
      ...config
    };
    this.ragService = RAGService;
  }
  
  /**
   * Index a single knowledge base article
   * @param article Knowledge article
   * @returns IDs of indexed chunks
   */
  async indexArticle(article: KnowledgeArticle): Promise<string[]> {
    try {
      logger.info(`Indexing article: ${article.title}`);
      
      // Prepare document
      const document: Document = {
        id: article.id,
        content: article.content,
        metadata: {
          title: article.title,
          category: article.category,
          tags: article.tags.join(','),
          url: article.url,
          lastUpdated: article.lastUpdated.toISOString()
        }
      };
      
      // Process document
      const chunkIds = await this.ragService.indexDocument(document, {
        collection: this.config.collection,
        chunkSize: this.config.chunkSize,
        chunkOverlap: this.config.chunkOverlap
      });
      
      logger.info(`Successfully indexed article into ${chunkIds.length} chunks`);
      
      return chunkIds;
    } catch (error) {
      logger.error(`Error indexing article: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  
  /**
   * Index multiple knowledge base articles
   * @param articles Knowledge articles
   * @returns IDs of indexed chunks by article ID
   */
  async indexArticles(articles: KnowledgeArticle[]): Promise<Record<string, string[]>> {
    const results: Record<string, string[]> = {};
    
    for (const article of articles) {
      results[article.id] = await this.indexArticle(article);
    }
    
    return results;
  }
  
  /**
   * Read and parse a markdown file into a knowledge article
   * @param filePath Path to markdown file
   * @param category Knowledge category
   * @returns Knowledge article
   */
  parseMarkdownFile(filePath: string, category: KnowledgeCategory): KnowledgeArticle {
    const content = fs.readFileSync(filePath, 'utf-8');
    const filename = path.basename(filePath, '.md');
    const id = filename.toLowerCase().replace(/\s+/g, '-');
    
    // Extract title from first heading
    const titleMatch = content.match(/^#\s+(.*)/m);
    const title = titleMatch ? titleMatch[1] : filename;
    
    // Extract tags from frontmatter if present
    const tagsMatch = content.match(/^tags:\s*(.*)/m);
    const tags = tagsMatch 
      ? tagsMatch[1].split(',').map(tag => tag.trim()) 
      : [];
    
    // Get file stats for last updated date
    const stats = fs.statSync(filePath);
    
    return {
      id,
      title,
      category,
      tags,
      content,
      url: `/support/articles/${id}`,
      lastUpdated: stats.mtime
    };
  }
  
  /**
   * Index all markdown files in a directory
   * @param directory Directory path
   * @param category Knowledge category
   * @param recursive Whether to scan subdirectories
   * @returns IDs of indexed chunks by article ID
   */
  async indexDirectory(
    directory: string,
    category: KnowledgeCategory,
    recursive: boolean = true
  ): Promise<Record<string, string[]>> {
    try {
      logger.info(`Indexing directory: ${directory}`);
      
      const articles: KnowledgeArticle[] = [];
      const fullPath = path.join(this.config.docsPath, directory);
      
      // Read all files in the directory
      const entries = fs.readdirSync(fullPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const entryPath = path.join(fullPath, entry.name);
        
        if (entry.isDirectory() && recursive) {
          // Recursively index subdirectory
          await this.indexDirectory(
            path.join(directory, entry.name),
            category,
            recursive
          );
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          // Parse and add markdown file
          const article = this.parseMarkdownFile(entryPath, category);
          articles.push(article);
        }
      }
      
      logger.info(`Found ${articles.length} articles in directory`);
      
      // Index all articles
      return await this.indexArticles(articles);
    } catch (error) {
      logger.error(`Error indexing directory: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  
  /**
   * Index the entire knowledge base
   * @returns Results of indexing
   */
  async indexKnowledgeBase(): Promise<{
    articlesIndexed: number;
    chunkCount: number;
    categories: Record<string, number>;
  }> {
    try {
      // Initialize RAG service
      await this.ragService.initialize();
      
      // Prepare result tracking
      const categories: Record<string, number> = {};
      let totalArticles = 0;
      let totalChunks = 0;
      
      // Index each category
      for (const category of Object.values(KnowledgeCategory)) {
        const categoryPath = path.join(this.config.docsPath, category);
        
        // Skip if directory doesn't exist
        if (!fs.existsSync(categoryPath)) {
          continue;
        }
        
        // Index the category
        const results = await this.indexDirectory(category, category as KnowledgeCategory);
        
        // Count articles and chunks
        const articleCount = Object.keys(results).length;
        const chunkCount = Object.values(results).reduce(
          (sum, chunks) => sum + chunks.length, 
          0
        );
        
        // Update totals
        categories[category] = articleCount;
        totalArticles += articleCount;
        totalChunks += chunkCount;
        
        logger.info(`Indexed ${articleCount} articles in category ${category} (${chunkCount} chunks)`);
      }
      
      logger.info(`Completed indexing ${totalArticles} articles (${totalChunks} chunks)`);
      
      return {
        articlesIndexed: totalArticles,
        chunkCount: totalChunks,
        categories
      };
    } catch (error) {
      logger.error(`Error indexing knowledge base: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}

export default KnowledgeBaseIndexer; 