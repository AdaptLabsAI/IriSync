import { ChunkingStrategy } from './document-processor';
import { logger } from '../logging/logger';

/**
 * Chunk options for text processing
 */
export interface ChunkOptions {
  chunkSize: number;
  chunkOverlap: number;
  strategy: ChunkingStrategy;
  preserveWhitespace?: boolean;
  respectParagraphs?: boolean;
  minChunkLength?: number;
}

/**
 * Text chunker utility for splitting documents into proper chunks
 */
export class TextChunker {
  /**
   * Split text into chunks based on specified strategy
   * @param text Text to split into chunks
   * @param options Chunking options
   * @returns Array of text chunks
   */
  static splitText(
    text: string,
    options: ChunkOptions
  ): string[] {
    if (!text || text.trim().length === 0) {
      return [];
    }
    
    // Normalize options
    const normalizedOptions = this.normalizeOptions(options);
    
    // Apply the selected chunking strategy
    switch (normalizedOptions.strategy) {
      case ChunkingStrategy.PARAGRAPH:
        return this.splitByParagraph(text, normalizedOptions);
      case ChunkingStrategy.SENTENCE:
        return this.splitBySentence(text, normalizedOptions);
      case ChunkingStrategy.SLIDING_WINDOW:
        return this.splitBySlidingWindow(text, normalizedOptions);
      case ChunkingStrategy.SEMANTIC:
        return this.splitBySemantic(text, normalizedOptions);
      case ChunkingStrategy.FIXED_SIZE:
      default:
        return this.splitByFixedSize(text, normalizedOptions);
    }
  }
  
  /**
   * Normalize chunking options with defaults
   */
  private static normalizeOptions(options: ChunkOptions): ChunkOptions {
    return {
      chunkSize: Math.max(100, options.chunkSize || 1000),
      chunkOverlap: Math.min(options.chunkOverlap || 200, options.chunkSize * 0.5),
      strategy: options.strategy || ChunkingStrategy.PARAGRAPH,
      preserveWhitespace: options.preserveWhitespace ?? false,
      respectParagraphs: options.respectParagraphs ?? true,
      minChunkLength: options.minChunkLength || 50
    };
  }
  
  /**
   * Split text by paragraphs
   */
  static splitByParagraph(
    text: string,
    options: ChunkOptions
  ): string[] {
    // Split by paragraph boundaries
    const paragraphSeparator = options.preserveWhitespace ? /(\n\s*\n)/ : /\n\s*\n/;
    const paragraphs = text.split(paragraphSeparator).filter(p => p.trim().length > 0);
    
    const chunks: string[] = [];
    let currentChunk: string[] = [];
    let currentLength = 0;
    
    for (const paragraph of paragraphs) {
      const trimmedParagraph = options.preserveWhitespace ? paragraph : paragraph.trim();
      
      // Skip empty paragraphs
      if (trimmedParagraph.length === 0) {
        continue;
      }
      
      // Handle the case where a single paragraph is already too long
      if (trimmedParagraph.length > options.chunkSize) {
        // If current chunk is not empty, add it to chunks
        if (currentChunk.length > 0) {
          chunks.push(currentChunk.join(options.preserveWhitespace ? '' : '\n\n'));
          currentChunk = [];
          currentLength = 0;
        }
        
        // Split the long paragraph into fixed-size chunks
        const subChunks = this.splitByFixedSize(trimmedParagraph, {
          ...options,
          respectParagraphs: false
        });
        
        chunks.push(...subChunks);
        continue;
      }
      
      // If adding this paragraph would exceed the chunk size, store the current chunk
      if (currentLength + trimmedParagraph.length > options.chunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.join(options.preserveWhitespace ? '' : '\n\n'));
        
        // Calculate how many paragraphs to keep for overlap
        const overlapTokenCount = Math.min(currentLength, options.chunkOverlap);
        let overlapSize = 0;
        const overlapParagraphs: string[] = [];
        
        // Work backwards through paragraphs to create overlap
        for (let i = currentChunk.length - 1; i >= 0; i--) {
          if (overlapSize < overlapTokenCount) {
            overlapParagraphs.unshift(currentChunk[i]);
            overlapSize += currentChunk[i].length;
          } else {
            break;
          }
        }
        
        // Reset with overlap
        currentChunk = [...overlapParagraphs];
        currentLength = overlapSize;
      }
      
      currentChunk.push(trimmedParagraph);
      currentLength += trimmedParagraph.length;
    }
    
    // Add the last chunk if it's not empty
    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join(options.preserveWhitespace ? '' : '\n\n'));
    }
    
    // Filter out chunks that are too small
    return chunks.filter(chunk => chunk.length >= options.minChunkLength);
  }
  
  /**
   * Split text by sentences
   */
  static splitBySentence(
    text: string,
    options: ChunkOptions
  ): string[] {
    // Enhanced regex for better sentence boundary detection
    const sentenceSplitter = /(?<=[.!?])\s+(?=[A-Z"'([{<])/;
    const sentences = text.split(sentenceSplitter);
    
    const chunks: string[] = [];
    let currentChunk: string[] = [];
    let currentLength = 0;
    
    for (const sentence of sentences) {
      const trimmedSentence = options.preserveWhitespace ? sentence : sentence.trim();
      
      // Skip empty sentences
      if (trimmedSentence.length === 0) {
        continue;
      }
      
      // Handle the case where a single sentence is already too long
      if (trimmedSentence.length > options.chunkSize) {
        // If current chunk is not empty, add it to chunks
        if (currentChunk.length > 0) {
          chunks.push(currentChunk.join(' '));
          currentChunk = [];
          currentLength = 0;
        }
        
        // Split the long sentence into fixed-size chunks
        const subChunks = this.splitByFixedSize(trimmedSentence, {
          ...options,
          respectParagraphs: false
        });
        
        chunks.push(...subChunks);
        continue;
      }
      
      // If adding this sentence would exceed the chunk size, store the current chunk
      if (currentLength + trimmedSentence.length > options.chunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.join(' '));
        
        // Calculate how many sentences to keep for overlap
        const overlapTokenCount = Math.min(currentLength, options.chunkOverlap);
        let overlapSize = 0;
        const overlapSentences: string[] = [];
        
        // Work backwards through sentences to create overlap
        for (let i = currentChunk.length - 1; i >= 0; i--) {
          if (overlapSize < overlapTokenCount) {
            overlapSentences.unshift(currentChunk[i]);
            overlapSize += currentChunk[i].length;
          } else {
            break;
          }
        }
        
        // Reset with overlap
        currentChunk = [...overlapSentences];
        currentLength = overlapSize;
      }
      
      currentChunk.push(trimmedSentence);
      currentLength += trimmedSentence.length;
    }
    
    // Add the last chunk if it's not empty
    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join(' '));
    }
    
    // Filter out chunks that are too small
    return chunks.filter(chunk => chunk.length >= options.minChunkLength);
  }
  
  /**
   * Split text by fixed size
   */
  static splitByFixedSize(
    text: string,
    options: ChunkOptions
  ): string[] {
    // Respect paragraph boundaries if requested
    if (options.respectParagraphs) {
      const paragraphSplitter = /\n\s*\n/;
      const paragraphs = text.split(paragraphSplitter);
      
      // If paragraphs are short enough, use paragraph chunking
      if (paragraphs.some(p => p.length > options.chunkSize)) {
        // Some paragraphs are too long, continue with word chunking
        logger.debug('Some paragraphs exceed chunk size, using word-based chunking');
      } else {
        return this.splitByParagraph(text, options);
      }
    }
    
    const chunks: string[] = [];
    const words = text.split(/\s+/);
    let currentChunk: string[] = [];
    let currentLength = 0;
    
    for (const word of words) {
      // If the current word itself exceeds chunk size, we need to split it
      if (word.length > options.chunkSize) {
        // If we have accumulated words, add them first
        if (currentChunk.length > 0) {
          chunks.push(currentChunk.join(' '));
          currentChunk = [];
          currentLength = 0;
        }
        
        // Split the long word into chunks (character by character)
        for (let i = 0; i < word.length; i += options.chunkSize) {
          const portion = word.substring(i, i + options.chunkSize);
          chunks.push(portion);
        }
        continue;
      }
      
      // If adding this word would exceed the chunk size, store current chunk
      if (currentLength + word.length + 1 > options.chunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.join(' '));
        
        // Calculate overlap in words
        const averageWordLength = currentLength / currentChunk.length;
        const overlapWordCount = Math.floor(options.chunkOverlap / averageWordLength);
        currentChunk = currentChunk.slice(-overlapWordCount);
        currentLength = currentChunk.join(' ').length;
      }
      
      currentChunk.push(word);
      currentLength += word.length + 1; // Add 1 for the space
    }
    
    // Add the last chunk if it's not empty
    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join(' '));
    }
    
    // Filter out chunks that are too small
    return chunks.filter(chunk => chunk.length >= options.minChunkLength);
  }
  
  /**
   * Split text using sliding windows
   */
  static splitBySlidingWindow(
    text: string,
    options: ChunkOptions
  ): string[] {
    const words = text.split(/\s+/);
    const chunks: string[] = [];
    const slideSize = options.chunkSize - options.chunkOverlap;
    
    // Ensure slide size is positive
    const effectiveSlideSize = Math.max(1, slideSize);
    
    for (let i = 0; i < words.length; i += effectiveSlideSize) {
      const windowWords = words.slice(i, i + options.chunkSize);
      if (windowWords.length > 0) {
        const chunk = windowWords.join(' ');
        if (chunk.length >= options.minChunkLength) {
          chunks.push(chunk);
        }
      }
      
      // If we're near the end, break to avoid tiny chunks
      if (i + effectiveSlideSize >= words.length - Math.min(effectiveSlideSize, 10)) {
        break;
      }
    }
    
    // Ensure we include the end of the document
    const lastWindowStart = Math.max(0, words.length - options.chunkSize);
    if (lastWindowStart > 0 && lastWindowStart % effectiveSlideSize !== 0) {
      const lastWindow = words.slice(lastWindowStart);
      const chunk = lastWindow.join(' ');
      if (chunk.length >= options.minChunkLength && !chunks.includes(chunk)) {
        chunks.push(chunk);
      }
    }
    
    return chunks;
  }
  
  /**
   * Split text by semantic boundaries (headers, sections, etc.)
   */
  static splitBySemantic(
    text: string,
    options: ChunkOptions
  ): string[] {
    // Detect headers in various formats (markdown or HTML)
    const headerRegex = /(?:^|\n)(?:#{1,6}\s+[^\n]+|\<h[1-6][^>]*\>[^<]*\<\/h[1-6]\>)/g;
    const headerMatches = Array.from(text.matchAll(headerRegex));
    
    if (headerMatches.length <= 1) {
      // If no or just one header found, fall back to paragraph splitting
      logger.debug('Not enough headers found for semantic chunking, falling back to paragraph chunking');
      return this.splitByParagraph(text, options);
    }
    
    // Split by headers
    const chunks: string[] = [];
    let lastPosition = 0;
    
    for (let i = 0; i < headerMatches.length; i++) {
      const match = headerMatches[i];
      const position = match.index || 0;
      
      // Add content before this header if not the first header
      if (i > 0 && position > lastPosition) {
        const section = text.substring(lastPosition, position).trim();
        if (section.length > 0) {
          // If section is too large, sub-chunk it
          if (section.length > options.chunkSize) {
            const subChunks = this.splitByParagraph(section, options);
            chunks.push(...subChunks);
          } else if (section.length >= options.minChunkLength) {
            chunks.push(section);
          }
        }
      }
      
      // Update position
      lastPosition = position;
    }
    
    // Add the final section
    if (lastPosition < text.length) {
      const finalSection = text.substring(lastPosition).trim();
      if (finalSection.length > 0) {
        // If section is too large, sub-chunk it
        if (finalSection.length > options.chunkSize) {
          const subChunks = this.splitByParagraph(finalSection, options);
          chunks.push(...subChunks);
        } else if (finalSection.length >= options.minChunkLength) {
          chunks.push(finalSection);
        }
      }
    }
    
    return chunks;
  }
  
  /**
   * Count approximate tokens in text
   * This is a simple approximation, not a precise token count
   * @param text Text to count tokens in
   * @returns Approximate token count
   */
  static countTokens(text: string): number {
    if (!text) return 0;
    
    // Simple approximation: assume 4 characters per token on average
    return Math.ceil(text.length / 4);
  }
  
  /**
   * Truncate text to a maximum token length
   * @param text Text to truncate
   * @param maxTokens Maximum number of tokens
   * @returns Truncated text
   */
  static truncateToTokenLimit(text: string, maxTokens: number): string {
    if (!text) return '';
    if (this.countTokens(text) <= maxTokens) return text;
    
    // Approximate characters
    const approxChars = maxTokens * 4;
    
    // Try to truncate at a sentence boundary if possible
    const truncated = text.substring(0, Math.min(text.length, approxChars * 1.2));
    const lastSentence = truncated.match(/.*[.!?]/);
    
    if (lastSentence && this.countTokens(lastSentence[0]) <= maxTokens) {
      return lastSentence[0];
    }
    
    // If no sentence boundary found, just truncate at character limit
    return text.substring(0, approxChars);
  }
}

export default TextChunker; 