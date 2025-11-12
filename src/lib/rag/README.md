# Retrieval Augmented Generation (RAG) System

## Overview

The RAG (Retrieval Augmented Generation) system is a core component of Irisync that provides AI-enhanced content generation with contextual information retrieval. It allows the application to generate more accurate and relevant responses by retrieving and utilizing knowledge from stored documents.

## Architecture

The RAG system consists of the following main components:

1. **Document Processor** - Handles document ingestion, chunking, and preparation for vector storage
2. **Text Chunker** - Provides several strategies for text chunking (paragraph, sentence, fixed-size, sliding window, semantic)
3. **Vector Database** - Manages storage and retrieval of document embeddings using Pinecone
4. **RAG System** - Core implementation that ties everything together and manages the retrieval-augmented generation workflow

## Components

### 1. Document Processor (`document-processor.ts`)

Processes documents for storage in the vector database with the following features:
- Multiple chunking strategies (paragraph, sentence, fixed-size, sliding window, semantic)
- Configurable chunk size and overlap
- Metadata enrichment
- Access control via document visibility settings

Usage:
```typescript
import documentProcessor, { DocumentType, ChunkingStrategy } from './document-processor';

// Process a document
const chunkIds = await documentProcessor.processDocument({
  content: "Document content...",
  title: "Document Title",
  type: DocumentType.DOCUMENTATION,
  accessLevel: AccessLevel.PUBLIC
}, {
  strategy: ChunkingStrategy.PARAGRAPH,
  chunkSize: 1000,
  chunkOverlap: 200
});
```

### 2. Text Chunker (`text-chunker.ts`)

Utility for text chunking with different strategies:
- Paragraph-based chunking
- Sentence-based chunking
- Fixed-size chunking
- Sliding window chunking
- Semantic (headings-based) chunking

Usage:
```typescript
import TextChunker, { ChunkingStrategy } from './text-chunker';

// Split text using paragraph chunking
const chunks = TextChunker.splitText(text, {
  chunkSize: 1000,
  chunkOverlap: 200,
  strategy: ChunkingStrategy.PARAGRAPH
});
```

### 3. Vector Database (`vector-database.ts`)

Integrates with Pinecone for vector storage and similarity search:
- Document embedding storage
- Similarity search with filtering
- Collection/namespace management
- Automatic index creation

Usage:
```typescript
import VectorDatabase from './vector-database';

// Search for documents
const results = await VectorDatabase.search({
  query: "How do I connect social accounts?",
  filters: { documentType: "documentation" },
  limit: 5,
  minRelevanceScore: 0.7
});
```

### 4. RAG System (`RAGSystem.ts`)

Core implementation that manages document retrieval and context generation:
- Document management
- Vector search
- Context aggregation
- Access control and visibility
- Token tracking and usage management

Usage:
```typescript
import { RAGSystem } from './RAGSystem';
import { TokenService } from '../tokens/token-service';

// Initialize RAG system
const tokenService = new TokenService(...);
const ragSystem = new RAGSystem(tokenService);

// Add a document
const document = await ragSystem.addDocument({
  title: "Getting Started",
  content: "Document content...",
  documentType: "knowledge_base",
  isPublic: true
}, userId);

// Perform similarity search
const searchResults = await ragSystem.similaritySearch(
  "How do I get started?",
  { limit: 5, threshold: 0.7 },
  userId
);

// Generate context for AI prompt
const context = ragSystem.generateContext(searchResults);
```

## API Endpoints

Three main endpoints provide access to the RAG system:

1. **Process Document** (`/api/ai/rag/process-document`) - Ingests and processes documents
2. **Search** (`/api/ai/rag/search`) - Performs semantic search on stored documents
3. **Generate Response** (`/api/ai/rag/generate-response`) - Generates AI responses with retrieved context

## Subscription-Based Access

RAG capabilities are provided based on subscription tier:
- Creator tier: No access to RAG features
- Influencer tier: Full access to RAG features
- Enterprise tier: Full access to RAG features with higher limits

## Token Usage

The RAG system tracks token usage through the TokenService:
- Document processing counts as token usage
- Each search counts as token usage
- Response generation counts tokens for both input context and generated output

## Security and Access Control

The system implements multi-level access control:
- User-based document ownership
- Organization-level document sharing
- Public/private document visibility
- Subscription-based feature access

## Error Handling and Logging

Comprehensive error handling and logging is implemented:
- Structured logging for all operations
- Detailed error tracking
- Performance metrics monitoring
- Rate limiting and throttling

## Production Considerations

The RAG system is production-ready with the following considerations:
- Caching for frequently accessed documents and embeddings
- Rate limiting for API endpoints
- Fallback mechanisms for vector database outages
- Monitoring and alerting for system health

## Document Types and Access Levels

### Document Types
- FAQ
- KNOWLEDGE_BASE
- BLOG
- DOCUMENTATION
- FORUM
- SUPPORT
- CUSTOM

### Access Levels
- PUBLIC
- REGISTERED
- PAID
- INFLUENCER
- ENTERPRISE
- PRIVATE

## Configuration

The RAG system uses Pinecone as its vector database. Configuration is managed through environment variables:

```
PINECONE_API_KEY=your_api_key
PINECONE_INDEX_NAME=irisync-rag
PINECONE_NAMESPACE=default
AI_MODEL_ID=default-model
```

## Token Management

The RAG system integrates with the IrisSync token management system. Token usage is tracked for:

- Document processing
- Vector searches
- AI response generation

This ensures proper subscription tier enforcement and quota management.

## Best Practices

1. Use appropriate chunking strategies based on content type:
   - PARAGRAPH for articles and documentation
   - SENTENCE for FAQs and structured content
   - SEMANTIC for longer documents with headers

2. Set reasonable chunk sizes (800-1200 tokens) and overlaps (10-20% of chunk size)

3. Use collection namespaces to organize content by type or department

4. Set appropriate access levels to ensure users only access content they should

## Dependencies

- Pinecone SDK: Vector database
- Next.js API routes: API endpoints
- IrisSync auth system: Authentication and authorization
- IrisSync token system: Token management

## Testing

Use the included test utility to verify chunking and processing:

```
node src/lib/rag/test-document-processor.ts
``` 