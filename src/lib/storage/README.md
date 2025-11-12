# Storage Library

The Storage Library provides comprehensive storage management capabilities for IriSync, enabling integration with multiple cloud storage providers, file processing, and analytics.

## Overview

The Storage Library is a production-ready solution that follows the established patterns from the CRM and Dashboard libraries. It provides:

- **Multi-Platform Support**: Cloudinary, AWS S3, Google Cloud Storage, Azure Blob Storage
- **File Processing**: Image/video processing, compression, format conversion
- **Security**: File validation, malware scanning, secure uploads
- **Analytics**: Storage metrics, usage insights, optimization recommendations
- **Caching**: Advanced caching with multiple strategies (LRU, FIFO, LFU)
- **Validation**: Comprehensive file validation and security checks

## Architecture

```
src/lib/storage/
├── index.ts                    # Main exports
├── types.ts                    # TypeScript type definitions
├── StorageService.ts           # Main orchestrator service
├── models/                     # Data models
│   ├── StorageConnection.ts    # Storage connection model
│   └── MediaFile.ts           # Media file model
├── providers/                  # Storage provider implementations
│   ├── CloudinaryProvider.ts  # Cloudinary integration
│   ├── S3Provider.ts          # AWS S3 integration
│   ├── GoogleCloudProvider.ts # Google Cloud Storage
│   └── AzureBlobProvider.ts   # Azure Blob Storage
├── media/                     # Media processing
│   └── MediaProcessor.ts      # File processing utilities
└── utils/                     # Utility functions
    ├── validation.ts          # File validation
    ├── cache.ts              # Caching utilities
    ├── helpers.ts            # Helper functions
    ├── security.ts           # Security utilities
    └── analytics.ts          # Analytics utilities
```

## Quick Start

### Basic Usage

```typescript
import { StorageService, StoragePlatform } from '@/lib/storage';

// Get the singleton instance
const storageService = StorageService.getInstance();

// Create a storage connection
const connection = await storageService.createConnection(
  'org-123',
  StoragePlatform.CLOUDINARY,
  {
    cloudName: 'your-cloud-name',
    apiKey: 'your-api-key',
    apiSecret: 'your-api-secret'
  }
);

// Upload a file
const mediaFile = await storageService.uploadFile(
  connection.id,
  file, // File or Buffer
  {
    filename: 'my-image.jpg',
    folder: 'uploads',
    processing: {
      resize: { width: 800, height: 600 },
      compress: { quality: 80 }
    }
  }
);

// Get files with pagination
const files = await storageService.getFiles('org-123', {
  limit: 20,
  fileType: 'image'
});
```

### Advanced Usage

```typescript
import { 
  StorageService, 
  ValidationUtils, 
  SecurityUtils,
  AnalyticsUtils 
} from '@/lib/storage';

// Validate file before upload
const validation = await ValidationUtils.validateFile(
  file,
  metadata,
  {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    allowedMimeTypes: ['image/jpeg', 'image/png'],
    allowedExtensions: ['.jpg', '.png'],
    scanForMalware: true
  }
);

if (!validation.isValid) {
  console.error('Validation failed:', validation.errors);
  return;
}

// Security scan
const securityScan = await SecurityUtils.scanForMalware(buffer, filename);
if (!securityScan.isSafe) {
  console.error('Security threats detected:', securityScan.threats);
  return;
}

// Get storage analytics
const analytics = await storageService.getStorageAnalytics(
  'org-123',
  {
    start: new Date('2024-01-01'),
    end: new Date('2024-12-31')
  }
);

// Generate insights
const files = await storageService.getFiles('org-123');
const metrics = AnalyticsUtils.calculateMetrics(files.data);
const insights = AnalyticsUtils.generateInsights(metrics, usage);
```

## Storage Providers

### Cloudinary

```typescript
const connection = await storageService.createConnection(
  organizationId,
  StoragePlatform.CLOUDINARY,
  {
    cloudName: 'your-cloud-name',
    apiKey: 'your-api-key',
    apiSecret: 'your-api-secret'
  }
);
```

**Features:**
- Automatic image optimization
- Real-time transformations
- CDN delivery
- Video processing
- AI-powered features

### AWS S3

```typescript
const connection = await storageService.createConnection(
  organizationId,
  StoragePlatform.AWS_S3,
  {
    accessKeyId: 'your-access-key',
    secretAccessKey: 'your-secret-key',
    region: 'us-east-1',
    bucket: 'your-bucket-name'
  }
);
```

**Features:**
- Scalable object storage
- Multiple storage classes
- Lifecycle management
- Cross-region replication
- Server-side encryption

### Google Cloud Storage

```typescript
const connection = await storageService.createConnection(
  organizationId,
  StoragePlatform.GOOGLE_CLOUD,
  {
    projectId: 'your-project-id',
    keyFilename: 'path/to/service-account.json',
    bucket: 'your-bucket-name'
  }
);
```

**Features:**
- Global edge caching
- Automatic encryption
- Lifecycle management
- Multi-regional storage
- Integration with Google AI

### Azure Blob Storage

```typescript
const connection = await storageService.createConnection(
  organizationId,
  StoragePlatform.AZURE_BLOB,
  {
    accountName: 'your-account-name',
    accountKey: 'your-account-key',
    containerName: 'your-container'
  }
);
```

**Features:**
- Hot, cool, and archive tiers
- Geo-redundant storage
- Azure CDN integration
- Advanced security features
- Lifecycle management

## File Processing

### Image Processing

```typescript
const processedFile = await mediaProcessor.processFile(file, {
  resize: {
    width: 800,
    height: 600,
    fit: 'cover'
  },
  compress: {
    quality: 80,
    format: 'webp'
  },
  watermark: {
    text: 'Copyright 2024',
    position: 'bottom-right',
    opacity: 0.7
  },
  filters: {
    brightness: 1.1,
    contrast: 1.05,
    saturation: 1.1
  }
});
```

### Video Processing

```typescript
// Video processing (placeholder for future server-side implementation)
const processedVideo = await mediaProcessor.processFile(video, {
  resize: { width: 1920, height: 1080 },
  compress: { quality: 75 },
  format: 'mp4'
});
```

## Security Features

### File Validation

```typescript
import { ValidationUtils } from '@/lib/storage';

// Comprehensive file validation
const validation = await ValidationUtils.validateFile(file, metadata, {
  maxFileSize: 100 * 1024 * 1024, // 100MB
  allowedMimeTypes: [
    'image/jpeg', 'image/png', 'image/gif',
    'video/mp4', 'video/webm',
    'application/pdf'
  ],
  allowedExtensions: [
    '.jpg', '.jpeg', '.png', '.gif',
    '.mp4', '.webm',
    '.pdf'
  ],
  scanForMalware: true,
  checkDimensions: {
    minWidth: 100,
    minHeight: 100,
    maxWidth: 4000,
    maxHeight: 4000
  }
});
```

### Security Scanning

```typescript
import { SecurityUtils } from '@/lib/storage';

// Malware scanning
const scan = await SecurityUtils.scanForMalware(buffer, filename);
console.log('Is safe:', scan.isSafe);
console.log('Threats:', scan.threats);
console.log('Confidence:', scan.confidence);

// File signature validation
const isValid = await SecurityUtils.validateFileSignature(buffer, 'image/jpeg');

// URL validation
const urlValidation = SecurityUtils.validateUrl(fileUrl);
```

## Analytics & Insights

### Storage Metrics

```typescript
import { AnalyticsUtils } from '@/lib/storage';

const files = await storageService.getFiles(organizationId);
const metrics = AnalyticsUtils.calculateMetrics(files.data);

console.log('Total files:', metrics.totalFiles);
console.log('Total size:', metrics.totalSize);
console.log('Files by type:', metrics.filesByType);
console.log('Storage efficiency:', metrics.storageEfficiency);
```

### Insights & Recommendations

```typescript
const insights = AnalyticsUtils.generateInsights(metrics, usage);

// Optimization recommendations
insights.recommendations.forEach(rec => {
  console.log(`${rec.priority}: ${rec.title}`);
  console.log(`Impact: ${rec.impact}`);
  console.log(`Action: ${rec.action}`);
});

// Alerts
insights.alerts.forEach(alert => {
  console.log(`${alert.severity}: ${alert.message}`);
});
```

### Storage Reports

```typescript
const report = AnalyticsUtils.generateReport(metrics, insights);

console.log('Summary:', report.summary);
console.log('Details:', report.details);
console.log('Charts:', report.charts);
```

## Caching

### Cache Configuration

```typescript
import { CacheManager } from '@/lib/storage';

const cache = new CacheManager(
  100 * 1024 * 1024, // 100MB max size
  'lru' // LRU strategy
);

// Store data
await cache.set('key', data, 3600); // 1 hour TTL

// Retrieve data
const cachedData = await cache.get('key');

// Cache statistics
const stats = cache.getStats();
console.log('Hit rate:', stats.hitRate);
console.log('Total size:', stats.totalSize);
```

### Cache Strategies

- **LRU (Least Recently Used)**: Evicts least recently accessed items
- **FIFO (First In, First Out)**: Evicts oldest items first
- **LFU (Least Frequently Used)**: Evicts least frequently accessed items

## Error Handling

```typescript
import { StorageError, StorageErrorType } from '@/lib/storage';

try {
  const result = await storageService.uploadFile(connectionId, file, params);
} catch (error) {
  if (error instanceof StorageError) {
    switch (error.type) {
      case StorageErrorType.QUOTA_EXCEEDED:
        console.error('Storage quota exceeded');
        break;
      case StorageErrorType.VALIDATION_FAILED:
        console.error('File validation failed:', error.message);
        break;
      case StorageErrorType.UPLOAD_FAILED:
        console.error('Upload failed:', error.message);
        break;
      default:
        console.error('Storage error:', error.message);
    }
  }
}
```

## Environment Configuration

The Storage Library uses environment variables for configuration:

```env
# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# AWS S3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1

# Google Cloud
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_STORAGE_BUCKET=your-bucket

# Azure
AZURE_STORAGE_ACCOUNT_NAME=your-account
AZURE_STORAGE_ACCOUNT_KEY=your-key
```

## API Integration

### REST API Endpoints

The Storage Library integrates with existing API routes:

- `POST /api/storage/connections` - Create storage connection
- `GET /api/storage/connections` - List connections
- `PUT /api/storage/connections/:id` - Update connection
- `DELETE /api/storage/connections/:id` - Delete connection
- `POST /api/storage/files` - Upload file
- `GET /api/storage/files` - List files
- `DELETE /api/storage/files/:id` - Delete file
- `GET /api/storage/analytics` - Get analytics

### Example API Usage

```typescript
// Create connection via API
const response = await fetch('/api/storage/connections', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    platform: 'cloudinary',
    credentials: {
      cloudName: 'your-cloud-name',
      apiKey: 'your-api-key',
      apiSecret: 'your-api-secret'
    }
  })
});

// Upload file via API
const formData = new FormData();
formData.append('file', file);
formData.append('connectionId', connectionId);
formData.append('folder', 'uploads');

const uploadResponse = await fetch('/api/storage/files', {
  method: 'POST',
  body: formData
});
```

## Testing

### Unit Tests

```typescript
import { StorageService, ValidationUtils } from '@/lib/storage';

describe('Storage Library', () => {
  test('should validate files correctly', async () => {
    const validation = await ValidationUtils.validateFile(
      mockFile,
      mockMetadata,
      mockConfig
    );
    
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  test('should upload files successfully', async () => {
    const storageService = StorageService.getInstance();
    const result = await storageService.uploadFile(
      connectionId,
      mockFile,
      mockParams
    );
    
    expect(result.id).toBeDefined();
    expect(result.url).toBeDefined();
  });
});
```

## Performance Considerations

### Optimization Tips

1. **Use appropriate file formats**: WebP for images, MP4 for videos
2. **Implement progressive loading**: Load thumbnails first, full images on demand
3. **Leverage CDN**: Use CDN URLs for faster delivery
4. **Cache frequently accessed files**: Implement client-side caching
5. **Compress files**: Use appropriate compression settings
6. **Monitor quota usage**: Set up alerts for quota limits

### Best Practices

1. **Validate files on client-side**: Reduce server load
2. **Use secure upload URLs**: Implement signed URLs for direct uploads
3. **Implement retry logic**: Handle temporary failures gracefully
4. **Monitor performance**: Track upload/download times
5. **Regular cleanup**: Remove unused files periodically

## Troubleshooting

### Common Issues

1. **Upload failures**: Check file size limits and MIME type restrictions
2. **Quota exceeded**: Monitor storage usage and implement cleanup
3. **Slow uploads**: Check network connectivity and file sizes
4. **Authentication errors**: Verify credentials and permissions
5. **Processing failures**: Check file format compatibility

### Debug Mode

```typescript
// Enable debug logging
const storageService = StorageService.getInstance();
// Debug logs will be output to console in development mode
```

## Migration Guide

### From Basic File Storage

1. Install the Storage Library dependencies
2. Update file upload logic to use StorageService
3. Migrate existing files to new storage structure
4. Update frontend components to use new API endpoints

### From Other Storage Solutions

1. Export existing files and metadata
2. Create new storage connections
3. Batch upload files using the Storage Library
4. Update application code to use new interfaces

## Contributing

When contributing to the Storage Library:

1. Follow the established patterns from CRM and Dashboard libraries
2. Add comprehensive TypeScript types
3. Include unit tests for new functionality
4. Update documentation for new features
5. Follow the existing code style and conventions

## License

This Storage Library is part of the IriSync platform and follows the same licensing terms. 