/**
 * Document chunking utility for RAG implementation
 * Splits documents into optimal sized chunks for embedding and retrieval
 */

export interface ChunkingOptions {
  minChunkSize?: number;  // Minimum characters per chunk
  maxChunkSize?: number;  // Maximum characters per chunk
  chunkOverlap?: number;  // Number of overlapping characters between chunks
  separator?: string;     // Separator to try splitting on (default paragraph)
  preserveNewlines?: boolean; // Whether to preserve newlines in chunks
}

export interface ChunkedDocument {
  id: string;
  chunks: DocumentChunk[];
}

export interface DocumentChunk {
  id: string;
  parentDocumentId: string;
  content: string;
  metadata: {
    startIndex: number;
    endIndex: number;
    sequence: number;
    title?: string;
    chunkType?: string;
    [key: string]: any;
  };
}

/**
 * Document chunking service
 * Splits documents into optimal sized chunks for RAG
 */
export class DocumentChunker {
  private defaultOptions: ChunkingOptions = {
    minChunkSize: 200,
    maxChunkSize: 1000,
    chunkOverlap: 100,
    separator: '\n\n',
    preserveNewlines: true
  };

  /**
   * Split document into chunks with optimal size for embeddings
   * @param documentId ID of the document
   * @param text Full document text
   * @param metadata Additional metadata to include with each chunk
   * @param options Chunking options
   */
  chunkDocument(
    documentId: string,
    text: string,
    metadata: Record<string, any> = {},
    options: ChunkingOptions = {}
  ): ChunkedDocument {
    // Merge with default options
    const opts = { ...this.defaultOptions, ...options };
    
    // Handle empty text case
    if (!text || text.trim().length === 0) {
      return { 
        id: documentId, 
        chunks: [] 
      };
    }

    // Extract title if present (first line or until first period)
    let title = '';
    const firstLineMatch = text.match(/^(.*?)(?:\n|$)/);
    if (firstLineMatch && firstLineMatch[1]) {
      title = firstLineMatch[1].trim();
    }

    // Try to split on separator (usually paragraphs)
    const paragraphs = text.split(opts.separator || '\n\n')
      .filter(p => p.trim().length > 0);
    
    const chunks: DocumentChunk[] = [];
    let currentChunk = '';
    let currentStartIndex = 0;
    let chunkSequence = 0;
    
    // Process each paragraph
    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = opts.preserveNewlines 
        ? paragraphs[i] 
        : paragraphs[i].replace(/\n/g, ' ');
      
      // If paragraph is already too large, split it further
      if (paragraph.length > opts.maxChunkSize!) {
        if (currentChunk) {
          // Add existing chunk first
          chunks.push(this.createChunk(
            documentId, 
            currentChunk, 
            currentStartIndex, 
            currentStartIndex + currentChunk.length, 
            chunkSequence++,
            title,
            metadata
          ));
          currentChunk = '';
        }
        
        // Split large paragraph into sentence-level chunks
        const sentenceChunks = this.splitLargeParagraph(
          paragraph, 
          opts.maxChunkSize!, 
          opts.minChunkSize!
        );
        
        for (const sentenceChunk of sentenceChunks) {
          const chunkStartIndex = text.indexOf(sentenceChunk, currentStartIndex);
          const chunkEndIndex = chunkStartIndex + sentenceChunk.length;
          
          chunks.push(this.createChunk(
            documentId,
            sentenceChunk,
            chunkStartIndex,
            chunkEndIndex,
            chunkSequence++,
            title,
            metadata
          ));
          
          currentStartIndex = chunkEndIndex;
        }
      } 
      // Check if adding this paragraph would exceed max chunk size
      else if (currentChunk.length + paragraph.length > opts.maxChunkSize!) {
        // If current chunk is too small, try to split at a better point
        if (currentChunk.length < opts.minChunkSize!) {
          // Add part of this paragraph to reach minimum size
          const remainingNeeded = opts.minChunkSize! - currentChunk.length;
          const partToAdd = paragraph.substring(0, remainingNeeded);
          currentChunk += (currentChunk ? '\n\n' : '') + partToAdd;
          
          chunks.push(this.createChunk(
            documentId,
            currentChunk,
            currentStartIndex,
            currentStartIndex + currentChunk.length,
            chunkSequence++,
            title,
            metadata
          ));
          
          // Reset current chunk with overlap
          const overlapIndex = Math.max(0, currentChunk.length - opts.chunkOverlap!);
          currentStartIndex += overlapIndex;
          currentChunk = paragraph.substring(remainingNeeded);
        } else {
          // Store current chunk if it's large enough
          chunks.push(this.createChunk(
            documentId,
            currentChunk,
            currentStartIndex,
            currentStartIndex + currentChunk.length,
            chunkSequence++,
            title,
            metadata
          ));
          
          // Reset with overlap (if possible)
          const overlapStart = Math.max(0, currentChunk.length - opts.chunkOverlap!);
          const overlapText = currentChunk.substring(overlapStart);
          currentStartIndex = text.indexOf(paragraph, currentStartIndex);
          currentChunk = paragraph;
        }
      } else {
        // Add paragraph to current chunk
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      }
    }
    
    // Add the last chunk if anything remains
    if (currentChunk) {
      chunks.push(this.createChunk(
        documentId,
        currentChunk,
        currentStartIndex,
        currentStartIndex + currentChunk.length,
        chunkSequence++,
        title,
        metadata
      ));
    }
    
    return {
      id: documentId,
      chunks
    };
  }

  /**
   * Create a document chunk with metadata
   */
  private createChunk(
    documentId: string,
    content: string,
    startIndex: number,
    endIndex: number,
    sequence: number,
    title: string,
    additionalMetadata: Record<string, any> = {}
  ): DocumentChunk {
    const chunkId = `${documentId}-chunk-${sequence}`;
    
    return {
      id: chunkId,
      parentDocumentId: documentId,
      content,
      metadata: {
        startIndex,
        endIndex,
        sequence,
        title,
        chunkType: 'text',
        ...additionalMetadata
      }
    };
  }

  /**
   * Split very large paragraphs into smaller chunks
   */
  private splitLargeParagraph(
    paragraph: string,
    maxSize: number,
    minSize: number
  ): string[] {
    const chunks: string[] = [];
    
    // Try to split by sentences first
    const sentenceMatches = paragraph.match(/[^.!?]+[.!?]+/g) || [];
    
    if (sentenceMatches.length > 0) {
      let currentChunk = '';
      
      for (const sentence of sentenceMatches) {
        // If sentence itself is too long, split it by words
        if (sentence.length > maxSize) {
          if (currentChunk) {
            chunks.push(currentChunk);
            currentChunk = '';
          }
          
          // Split sentence by words
          const wordChunks = this.splitBySizeLimit(sentence, maxSize, minSize);
          chunks.push(...wordChunks);
        } 
        // If adding this sentence would exceed max size
        else if (currentChunk.length + sentence.length > maxSize) {
          chunks.push(currentChunk);
          currentChunk = sentence;
        }
        else {
          currentChunk += sentence;
        }
      }
      
      if (currentChunk) {
        chunks.push(currentChunk);
      }
    } else {
      // If no sentence boundaries, split by character limit
      return this.splitBySizeLimit(paragraph, maxSize, minSize);
    }
    
    return chunks;
  }

  /**
   * Split text by size limit, trying to preserve word boundaries
   */
  private splitBySizeLimit(
    text: string,
    maxSize: number,
    minSize: number
  ): string[] {
    const chunks: string[] = [];
    
    let startIndex = 0;
    while (startIndex < text.length) {
      // Calculate end index
      let endIndex = Math.min(startIndex + maxSize, text.length);
      
      // Try not to cut words in half if text is long enough
      if (endIndex < text.length && endIndex - startIndex > minSize) {
        // Find last space in the substring
        const lastSpace = text.lastIndexOf(' ', endIndex);
        if (lastSpace > startIndex && lastSpace > startIndex + minSize) {
          endIndex = lastSpace;
        }
      }
      
      chunks.push(text.substring(startIndex, endIndex));
      startIndex = endIndex;
    }
    
    return chunks;
  }
}

export default new DocumentChunker(); 