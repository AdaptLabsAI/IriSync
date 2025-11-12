# IriSync GCP Migration Strategy

## Document Purpose
This document provides a comprehensive strategy for migrating all external services to Google Cloud Platform (GCP) alternatives, maintaining functionality while reducing vendor dependencies and potentially improving performance and cost efficiency.

---

## 1. Current External Services Inventory

### Services to Migrate
```typescript
// Current External Dependencies
const EXTERNAL_SERVICES = {
  vectorDatabase: 'Pinecone',
  email: 'SendGrid (Independent)',
  storage: ['AWS S3', 'Cloudinary', 'Azure Blob'],
  cache: 'Redis (External)',
  aiProviders: ['OpenAI', 'Anthropic', 'Cohere'],
  monitoring: ['Sentry', 'Datadog', 'Mixpanel'],
  analytics: ['Google Analytics', 'Amplitude', 'Hotjar']
};

// Services to Keep
const KEEP_EXTERNAL = {
  payments: 'Stripe', // No GCP equivalent
  socialPlatforms: 'All OAuth providers', // Required for integrations
  crmPlatforms: 'All CRM APIs' // Required for integrations
};
```

---

## 2. Vector Database Migration: Pinecone → Vertex AI Vector Search

### 2.1 Current Pinecone Implementation
**Location**: `src/lib/rag/vector-database.ts`

```typescript
// Current Pinecone Setup
export class VectorDatabase {
  private client: Pinecone;
  private indexName: string;
  private namespace: string;
  
  constructor() {
    this.client = new Pinecone({
      apiKey: config.pinecone.apiKey,
    });
  }
}
```

### 2.2 GCP Vertex AI Vector Search Migration

#### Required Environment Variables
```bash
# Replace Pinecone variables with GCP
# PINECONE_API_KEY= # Remove
# PINECONE_INDEX_NAME= # Remove
# PINECONE_NAMESPACE= # Remove

# Add GCP Vector Search variables
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_REGION=us-central1
VERTEX_AI_INDEX_ENDPOINT=your-index-endpoint-id
VERTEX_AI_INDEX_ID=your-index-id
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

#### New Implementation
```typescript
// Create src/lib/rag/vertex-vector-database.ts
import { VertexAI } from '@google-cloud/vertexai';
import { IndexServiceClient } from '@google-cloud/aiplatform';

export class VertexVectorDatabase {
  private vertexAI: VertexAI;
  private indexClient: IndexServiceClient;
  private projectId: string;
  private location: string;
  private indexEndpoint: string;
  
  constructor() {
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID!;
    this.location = process.env.GOOGLE_CLOUD_REGION || 'us-central1';
    this.indexEndpoint = process.env.VERTEX_AI_INDEX_ENDPOINT!;
    
    this.vertexAI = new VertexAI({
      project: this.projectId,
      location: this.location
    });
    
    this.indexClient = new IndexServiceClient();
  }
  
  async search(params: VectorSearchParams): Promise<VectorSearchResult[]> {
    // Use Vertex AI embeddings for query
    const embedding = await this.generateEmbedding(params.query);
    
    // Search using Vertex AI Vector Search
    const request = {
      indexEndpoint: `projects/${this.projectId}/locations/${this.location}/indexEndpoints/${this.indexEndpoint}`,
      queries: [{
        datapoint: {
          featureVector: embedding
        },
        neighborCount: params.limit || 10
      }]
    };
    
    const [response] = await this.indexClient.findNeighbors(request);
    
    return this.formatResults(response.nearestNeighbors);
  }
  
  private async generateEmbedding(text: string): Promise<number[]> {
    const model = this.vertexAI.getGenerativeModel({
      model: 'textembedding-gecko@003'
    });
    
    const result = await model.embedContent(text);
    return result.embedding.values;
  }
}
```

#### Migration Steps
1. **Create Vertex AI Index**: Set up vector search index in GCP Console
2. **Update Dependencies**: Replace `@pinecone-database/pinecone` with `@google-cloud/vertexai`
3. **Environment Migration**: Update environment variables
4. **Code Migration**: Replace VectorDatabase class with VertexVectorDatabase
5. **Data Migration**: Export from Pinecone and import to Vertex AI

---

## 3. Email Service Migration: SendGrid → GCP SendGrid

### 3.1 Current SendGrid Implementation
**Location**: `src/lib/notifications/unified-email-service.ts`

### 3.2 GCP SendGrid Migration
```bash
# Current
SENDGRID_API_KEY=independent-sendgrid-key

# Migrate to GCP SendGrid (same API, GCP-managed)
SENDGRID_API_KEY=gcp-sendgrid-key
# No code changes required - same API endpoints
```

#### Benefits of GCP SendGrid
- **Integrated Billing**: Single GCP invoice
- **Enhanced Security**: GCP IAM integration
- **Better Monitoring**: Cloud Monitoring integration
- **Compliance**: Inherits GCP compliance certifications

---

## 4. Storage Migration: Multi-Provider → Google Cloud Storage

### 4.1 Current Storage Implementation
**Location**: `src/lib/storage/StorageService.ts`

```typescript
// Current Multi-Provider Setup
const STORAGE_PROVIDERS = {
  CLOUDINARY: 'cloudinary',
  AWS_S3: 'aws_s3',
  GOOGLE_CLOUD: 'google_cloud',
  AZURE_BLOB: 'azure_blob'
};
```

### 4.2 GCP Storage Migration

#### Environment Variables
```bash
# Remove AWS/Azure/Cloudinary variables
# AWS_ACCESS_KEY_ID= # Remove
# AWS_SECRET_ACCESS_KEY= # Remove
# CLOUDINARY_CLOUD_NAME= # Remove
# AZURE_STORAGE_ACCOUNT= # Remove

# Consolidate to GCP
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_STORAGE_BUCKET=irisync-media-storage
GOOGLE_CLOUD_CDN_ENABLED=true
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

#### Enhanced GCP Storage Implementation
```typescript
// Update src/lib/storage/providers/GoogleCloudProvider.ts
import { Storage } from '@google-cloud/storage';

export class EnhancedGoogleCloudProvider {
  private storage: Storage;
  private bucket: string;
  private cdnEnabled: boolean;
  
  constructor() {
    this.storage = new Storage({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
    });
    
    this.bucket = process.env.GOOGLE_CLOUD_STORAGE_BUCKET!;
    this.cdnEnabled = process.env.GOOGLE_CLOUD_CDN_ENABLED === 'true';
  }
  
  async uploadFile(params: UploadParams): Promise<MediaFile> {
    const file = this.storage.bucket(this.bucket).file(params.fileName);
    
    // Upload with optimized settings
    const stream = file.createWriteStream({
      metadata: {
        contentType: params.mimeType,
        cacheControl: 'public, max-age=31536000', // 1 year cache
        metadata: {
          uploadedBy: params.userId,
          originalName: params.originalName
        }
      },
      resumable: params.fileSize > 5 * 1024 * 1024, // Use resumable for files > 5MB
      validation: 'crc32c'
    });
    
    return new Promise((resolve, reject) => {
      stream.on('error', reject);
      stream.on('finish', () => {
        const publicUrl = this.cdnEnabled 
          ? `https://cdn.irisync.com/${params.fileName}`
          : `https://storage.googleapis.com/${this.bucket}/${params.fileName}`;
          
        resolve({
          id: params.fileName,
          url: publicUrl,
          size: params.fileSize,
          mimeType: params.mimeType,
          uploadedAt: new Date()
        });
      });
      
      stream.end(params.buffer);
    });
  }
  
  // Add image optimization using Cloud Functions
  async optimizeImage(fileName: string): Promise<string> {
    // Trigger Cloud Function for image optimization
    const optimizedUrl = `https://us-central1-${process.env.GOOGLE_CLOUD_PROJECT_ID}.cloudfunctions.net/optimizeImage?file=${fileName}`;
    return optimizedUrl;
  }
}
```

---

## 5. Cache Migration: External Redis → Memorystore for Redis

### 5.1 Current Redis Implementation
**Location**: `src/lib/cache/redis-service.ts`

### 5.2 Memorystore Migration

#### Environment Variables
```bash
# Remove external Redis
# REDIS_URL= # Remove

# Add Memorystore configuration
REDIS_HOST=10.x.x.x  # Memorystore instance IP
REDIS_PORT=6379
REDIS_PASSWORD=your-auth-string
GOOGLE_CLOUD_PROJECT_ID=your-project-id
REDIS_INSTANCE_ID=irisync-cache
```

#### Enhanced Redis Service
```typescript
// Update src/lib/cache/redis-service.ts
export class MemorystoreRedisService {
  private client: RedisClientType;
  private isConnected: boolean = false;
  
  constructor() {
    // Memorystore connection configuration
    const options: RedisClientOptions = {
      socket: {
        host: process.env.REDIS_HOST!,
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        reconnectStrategy: (retries) => {
          // Exponential backoff optimized for Memorystore
          return Math.min(retries * 50, 5000);
        }
      },
      password: process.env.REDIS_PASSWORD
    };
    
    this.client = createClient(options);
    
    // Enhanced monitoring for GCP
    this.client.on('connect', () => {
      logger.info('Connected to Memorystore for Redis', {
        host: process.env.REDIS_HOST,
        instance: process.env.REDIS_INSTANCE_ID
      });
      this.isConnected = true;
    });
  }
  
  // Add GCP-specific monitoring
  async getInstanceMetrics(): Promise<MemorystoreMetrics> {
    const info = await this.client.info();
    return {
      memoryUsage: this.parseMemoryUsage(info),
      connectedClients: this.parseConnectedClients(info),
      operationsPerSecond: this.parseOpsPerSecond(info),
      hitRate: this.calculateHitRate(info)
    };
  }
}
```

---

## 6. AI Services Migration: Multi-Provider → Enhanced Multi-Provider with Vertex AI

### 6.1 Current AI Implementation
**Location**: `src/lib/ai/factory.ts`

### 6.2 Enhanced Multi-Provider Strategy (May 2025)

#### AI Model Landscape Analysis (May 2025)
```typescript
const AI_MODEL_STRENGTHS = {
  openai: {
    models: ['gpt-4o', 'gpt-4-turbo'],
    strengths: ['Reliable reasoning', 'Consistent quality', 'Complex tasks'],
    bestFor: ['Content analysis', 'Complex reasoning', 'General tasks']
  },
  anthropic: {
    models: ['claude-3.5-sonnet', 'claude-3-haiku'],
    strengths: ['Creative writing', 'Code generation', 'Safety', 'Long context'],
    bestFor: ['Content generation', 'Creative writing', 'Code tasks']
  },
  vertexai: {
    models: ['gemini-1.5-pro', 'gemini-1.5-flash'],
    strengths: ['Multimodal capabilities', 'Cost efficiency', 'Long context', 'Image analysis'],
    bestFor: ['Image analysis', 'Cost-sensitive tasks', 'Multimodal content']
  }
};
```

#### Recommended Provider Strategy
**KEEP**: OpenAI and Anthropic for their proven strengths
**ADD**: Vertex AI as cost-effective third option

#### Environment Variables
```bash
# Keep existing providers
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key

# Add Vertex AI as third option
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_REGION=us-central1
VERTEX_AI_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

#### Enhanced AI Provider Selection Logic
```typescript
// Update src/lib/ai/factory.ts
export class EnhancedAIToolkitFactory {
  private static getOptimalProvider(taskType: AITaskType, options: AIOptions): AIProvider {
    // Smart provider selection based on task type and cost considerations
    const PROVIDER_SELECTION = {
      // Creative content generation - Anthropic excels
      [AITaskType.GENERATE_POST]: 'anthropic',
      [AITaskType.GENERATE_CAPTION]: 'anthropic',
      [AITaskType.IMPROVE_CONTENT]: 'anthropic',
      
      // Analysis tasks - OpenAI for reliability
      [AITaskType.ANALYZE_SENTIMENT]: 'openai',
      [AITaskType.PREDICT_ENGAGEMENT]: 'openai',
      [AITaskType.CATEGORIZE_CONTENT]: 'openai',
      
      // Image analysis - Vertex AI for multimodal
      [AITaskType.ANALYZE_IMAGE]: 'vertexai',
      [AITaskType.GENERATE_ALT_TEXT]: 'vertexai',
      [AITaskType.MODERATE_CONTENT]: 'vertexai',
      
      // Cost-sensitive tasks - Vertex AI for efficiency
      [AITaskType.GENERATE_HASHTAGS]: 'vertexai',
      [AITaskType.SUGGEST_POSTING_TIME]: 'vertexai',
      [AITaskType.SUGGEST_REPLY]: 'vertexai'
    };
    
    // Allow manual override via options
    if (options.preferredProvider) {
      return this.getProvider(options.preferredProvider);
    }
    
    // Use optimal provider for task type
    const optimalProvider = PROVIDER_SELECTION[taskType] || 'openai';
    return this.getProvider(optimalProvider);
  }
  
  private static getProvider(providerName: string): AIProvider {
    switch (providerName) {
      case 'openai':
        return new OpenAIProvider();
      case 'anthropic':
        return new AnthropicProvider();
      case 'vertexai':
        return new VertexAIProvider();
      default:
        return new OpenAIProvider(); // Fallback to reliable OpenAI
    }
  }
}
```

---

## 7. Monitoring Migration: Multi-Provider → Cloud Operations

### 7.1 Current Monitoring Stack
```typescript
// Current External Monitoring
const MONITORING_SERVICES = {
  errorTracking: 'Sentry',
  apm: 'Datadog', 
  analytics: 'Mixpanel',
  uptime: 'Pingdom'
};
```

### 7.2 GCP Cloud Operations Migration

#### Environment Variables
```bash
# Remove external monitoring
# SENTRY_DSN= # Remove
# DATADOG_API_KEY= # Remove
# MIXPANEL_TOKEN= # Remove

# Add GCP monitoring
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
CLOUD_LOGGING_ENABLED=true
CLOUD_MONITORING_ENABLED=true
CLOUD_TRACE_ENABLED=true
CLOUD_PROFILER_ENABLED=true
```

#### Cloud Operations Implementation
```typescript
// Create src/lib/monitoring/gcp-monitoring.ts
import { Logging } from '@google-cloud/logging';
import { Monitoring } from '@google-cloud/monitoring';
import { Trace } from '@google-cloud/trace-agent';

export class GCPMonitoringService {
  private logging: Logging;
  private monitoring: Monitoring;
  private projectId: string;
  
  constructor() {
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID!;
    this.logging = new Logging({ projectId: this.projectId });
    this.monitoring = new Monitoring.MetricServiceClient();
    
    // Initialize Cloud Trace
    if (process.env.CLOUD_TRACE_ENABLED === 'true') {
      require('@google-cloud/trace-agent').start();
    }
  }
  
  async logError(error: Error, context: any): Promise<void> {
    const log = this.logging.log('irisync-errors');
    const metadata = {
      resource: { type: 'global' },
      severity: 'ERROR'
    };
    
    const entry = log.entry(metadata, {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    });
    
    await log.write(entry);
  }
  
  async recordMetric(metricName: string, value: number, labels: Record<string, string>): Promise<void> {
    const request = {
      name: `projects/${this.projectId}`,
      timeSeries: [{
        metric: {
          type: `custom.googleapis.com/irisync/${metricName}`,
          labels
        },
        resource: {
          type: 'global',
          labels: { project_id: this.projectId }
        },
        points: [{
          interval: {
            endTime: { seconds: Date.now() / 1000 }
          },
          value: { doubleValue: value }
        }]
      }]
    };
    
    await this.monitoring.createTimeSeries(request);
  }
}
```

---

## 8. Migration Timeline & Implementation Plan

### Phase 1: Foundation (Week 1-2)
```typescript
const PHASE_1_TASKS = [
  'Set up GCP project and billing',
  'Configure IAM roles and service accounts',
  'Set up Cloud Storage bucket with CDN',
  'Deploy Memorystore for Redis instance',
  'Configure Cloud Operations (Logging, Monitoring, Trace)'
];
```

### Phase 2: Core Services (Week 3-4)
```typescript
const PHASE_2_TASKS = [
  'Migrate storage from multi-provider to GCS',
  'Migrate Redis cache to Memorystore',
  'Set up Vertex AI Vector Search index',
  'Migrate email to GCP SendGrid',
  'Update environment variables'
];
```

### Phase 3: Advanced Services (Week 5-6)
```typescript
const PHASE_3_TASKS = [
  'Migrate vector database from Pinecone to Vertex AI',
  'Implement Vertex AI provider for AI tasks',
  'Set up Cloud Functions for image optimization',
  'Migrate monitoring to Cloud Operations',
  'Performance testing and optimization'
];
```

### Phase 4: Optimization (Week 7-8)
```typescript
const PHASE_4_TASKS = [
  'Implement Cloud CDN for global performance',
  'Set up auto-scaling for compute resources',
  'Optimize costs with committed use discounts',
  'Complete documentation and team training',
  'Decommission old external services'
];
```

---

## 9. Cost Analysis & Benefits

### 9.1 Estimated Cost Comparison
```typescript
// Monthly cost estimates (USD)
const COST_COMPARISON = {
  current: {
    pinecone: 70,      // Starter plan
    sendgrid: 15,      // Essentials plan
    redis: 30,         // External Redis hosting
    storage: 50,       // Multi-provider storage
    monitoring: 100,   // Sentry + Datadog + others
    total: 265
  },
  gcp: {
    vertexAI: 40,      // Vector search + embeddings
    sendgrid: 15,      // Same cost, GCP-hosted
    memorystore: 25,   // Memorystore for Redis
    storage: 30,       // Cloud Storage + CDN
    operations: 20,    // Cloud Operations suite
    total: 130
  },
  savings: 135 // 51% cost reduction
};
```

### 9.2 Additional Benefits
- **Single Vendor**: Simplified billing and support
- **Better Integration**: Native GCP service integration
- **Enhanced Security**: Unified IAM and VPC controls
- **Improved Performance**: Regional optimization
- **Compliance**: Inherits GCP compliance certifications

---

## 10. Implementation Checklist

### 10.1 Pre-Migration Checklist
```typescript
const PRE_MIGRATION_CHECKLIST = [
  '□ GCP project setup with billing enabled',
  '□ Service accounts created with appropriate permissions',
  '□ VPC network configured for security',
  '□ Cloud Storage bucket created with lifecycle policies',
  '□ Memorystore for Redis instance provisioned',
  '□ Vertex AI APIs enabled',
  '□ Cloud Operations configured',
  '□ Backup strategy for existing data'
];
```

### 10.2 Migration Execution Checklist
```typescript
const MIGRATION_CHECKLIST = [
  '□ Storage migration completed and verified',
  '□ Redis data migrated to Memorystore',
  '□ Vector database migrated to Vertex AI',
  '□ Email service switched to GCP SendGrid',
  '□ AI providers updated to include Vertex AI',
  '□ Monitoring migrated to Cloud Operations',
  '□ Environment variables updated',
  '□ DNS updated for CDN endpoints',
  '□ Performance testing completed',
  '□ Team training completed'
];
```

### 10.3 Post-Migration Checklist
```typescript
const POST_MIGRATION_CHECKLIST = [
  '□ All external services decommissioned',
  '□ Cost optimization implemented',
  '□ Monitoring dashboards configured',
  '□ Backup and disaster recovery tested',
  '□ Documentation updated',
  '□ Security audit completed',
  '□ Performance benchmarks established',
  '□ Team handover completed'
];
```

---

## 11. Risk Mitigation & Rollback Plan

### 11.1 Migration Risks
```typescript
const MIGRATION_RISKS = {
  dataLoss: {
    risk: 'Data loss during migration',
    mitigation: 'Complete backups before migration',
    rollback: 'Restore from backups to original services'
  },
  downtime: {
    risk: 'Service downtime during migration',
    mitigation: 'Blue-green deployment strategy',
    rollback: 'Switch traffic back to original services'
  },
  performance: {
    risk: 'Performance degradation',
    mitigation: 'Thorough performance testing',
    rollback: 'Revert to original service configuration'
  },
  costOverrun: {
    risk: 'Higher than expected costs',
    mitigation: 'Set up billing alerts and budgets',
    rollback: 'Scale down or revert to original services'
  }
};
```

### 11.2 Rollback Procedures
```typescript
const ROLLBACK_PROCEDURES = {
  storage: 'Revert DNS to original CDN, restore file access',
  cache: 'Switch Redis connection back to external provider',
  vectorDB: 'Revert vector search to Pinecone endpoints',
  email: 'Switch SendGrid API key back to independent account',
  monitoring: 'Reactivate external monitoring services'
};
```

---

**CRITICAL**: This migration should be executed in phases with thorough testing at each stage. Maintain parallel systems during transition to ensure zero downtime and data integrity. 