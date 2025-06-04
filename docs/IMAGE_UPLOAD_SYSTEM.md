# Image Upload System Documentation

A comprehensive, bulletproof image upload system designed to handle any image format, size, or quality with guaranteed success through multiple processing strategies, automatic retry mechanisms, and intelligent error recovery.

## 🛡️ System Overview & Guarantees

### Core Principles
The image upload system is built on three fundamental guarantees:

1. **Universal Format Support** - Any image format can be processed and converted
2. **Unlimited Size Handling** - Progressive upload handles files up to 200MB
3. **Guaranteed Success** - Multiple fallback strategies ensure upload completion

### Key Features
- **Multiple Processing Strategies** with automatic fallback
- **Progressive Upload** for large files (>25MB) with chunking
- **Intelligent Retry Logic** with exponential backoff
- **Memory-Aware Processing** with real-time monitoring
- **Client-Side Optimization** with automatic compression
- **Comprehensive Error Recovery** with user guidance
- **Form Integration** with retry mechanisms
- **Security & Validation** with malware detection

## 📁 Supported Formats & Limits

### File Formats
| Format | Support Level | Notes |
|--------|--------------|-------|
| **JPEG** (.jpg, .jpeg) | ✅ Native | Recommended for photos |
| **PNG** (.png) | ✅ Native | Recommended for graphics with transparency |
| **WebP** (.webp) | ✅ Native | Modern format with excellent compression |
| **GIF** (.gif) | ✅ Native | Animated GIFs become static |
| **AVIF** (.avif) | ✅ Native | Next-gen format support |
| **BMP** (.bmp) | 🔄 Converted | Converted to web-friendly format |
| **TIFF** (.tiff, .tif) | 🔄 Converted | Converted to JPEG/PNG |
| **HEIC/HEIF** (.heic, .heif) | 🔄 Converted | iPhone format, requires conversion |
| **SVG** (.svg) | 🔄 Rasterized | Vector graphics rasterized to bitmap |
| **RAW Formats** | ❌ Not Supported | Process in photo editor first |

### Size Limits
| Upload Type | File Size | Batch Limit | Recommended |
|-------------|-----------|-------------|-------------|
| **Standard Upload** | 50MB max | 3 files | < 15MB per file |
| **Progressive Upload** | 200MB max | 1 file | Automatic for > 25MB |
| **Batch Upload** | 100MB total | 5 files | 2-3 files optimal |

### Dimension Limits
- **Maximum Input**: 16,384 x 16,384 pixels
- **Web Optimization**: Auto-resize to 2048px max dimension
- **Memory Limit**: 2GB processing memory per image

## 🧩 Upload Components

### 1. BulletproofImageUpload (Recommended)
The most advanced component with all features enabled.

```tsx
import { BulletproofImageUpload } from '~/components/ui/BulletproofImageUpload';

// Basic usage
<BulletproofImageUpload
  value={imagePath}
  onChange={setImagePath}
  placeholder="Upload any image - bulletproof processing"
/>

// Advanced configuration
<BulletproofImageUpload
  value={imagePaths}
  onChange={setImagePaths}
  multiple={true}
  maxImages={5}
  maxFileSize={200}
  enableProgressiveUpload={true}
  enableAutoRetry={true}
  enableClientOptimization={true}
  showMetadata={true}
  onUploadProgress={(progress) => console.log(progress)}
  onUploadComplete={(result) => console.log('Success:', result)}
  onUploadError={(error) => console.log('Error:', error)}
/>
```

### 2. ChunkedImageUpload
Specialized for large files with chunked upload.

```tsx
import { ChunkedImageUpload } from '~/components/ui/ChunkedImageUpload';

<ChunkedImageUpload
  onSuccess={(filePath) => setValue('image', filePath)}
  maxFileSize={200}
  chunkSize={2} // 2MB chunks
  autoRetry={true}
  showAdvancedOptions={true}
/>
```

### 3. SimpleImageUpload
Basic upload with automatic optimization.

```tsx
import { SimpleImageUpload } from '~/components/ui/SimpleImageUpload';

<SimpleImageUpload
  onSuccess={(filePath) => setValue('image', filePath)}
  placeholder="Upload image - auto-optimized for web"
  maxFileSize={25}
/>
```

### 4. ImageUpload (Legacy)
Traditional upload component with drag & drop.

```tsx
import { ImageUpload } from '~/components/ui/ImageUpload';

<ImageUpload
  value={imageUrl}
  onChange={(filePath) => setValue('image', filePath)}
  multiple={true}
  showMetadataEditor={true}
/>
```

## ⚙️ Processing Strategies

The system employs four distinct processing strategies with automatic selection:

### Strategy 1: High-Quality Processing
- **Trigger**: Optimal images < 25MB with > 512MB available memory
- **Features**:
  - Preserves maximum image quality
  - Smart resizing (max 2048px)
  - Format-specific optimization
  - Progressive JPEG encoding
  - Transparency preservation

### Strategy 2: Memory-Efficient Processing
- **Trigger**: Large images or limited memory (> 256MB required)
- **Features**:
  - Aggressive size reduction
  - Conservative memory usage
  - Fast processing
  - JPEG conversion for efficiency
  - Reduced DPI for memory savings

### Strategy 3: Format Converter
- **Trigger**: Unsupported or problematic formats (> 384MB required)
- **Features**:
  - HEIC/HEIF conversion
  - TIFF to JPEG conversion
  - SVG rasterization
  - BMP optimization
  - Format normalization

### Strategy 4: Emergency Fallback
- **Trigger**: All other strategies fail (> 128MB minimum)
- **Features**:
  - Ultra-conservative processing
  - Maximum compression
  - Small output size (800px max)
  - Guaranteed compatibility
  - Last resort processing

### Automatic Strategy Selection
```typescript
// System automatically selects strategy based on:
const strategy = selectProcessingStrategy({
  fileSize: file.size,
  format: file.type,
  availableMemory: getAvailableMemory(),
  systemLoad: getCurrentLoad(),
  previousAttempts: retryCount
});
```

## 📊 Progressive Upload System

For files larger than 25MB, the system automatically switches to progressive (chunked) upload:

### How It Works
1. **File Analysis**: Determine optimal chunk size (default 2-5MB)
2. **Chunking**: Split file into sequential chunks
3. **Sequential Upload**: Upload chunks one by one with progress tracking
4. **Server Assembly**: Reassemble chunks when complete
5. **Processing**: Apply bulletproof processing strategies
6. **Cleanup**: Remove temporary chunks

### Adaptive Chunking
```typescript
// Chunk size adapts based on server response
let chunkSize = 2 * 1024 * 1024; // Start with 2MB

// Reduce on 413 errors
if (error.includes('413') || error.includes('too large')) {
  chunkSize = Math.max(512 * 1024, chunkSize / 2); // Min 512KB
}

// Increase for stable connections
if (successiveSuccesses > 3) {
  chunkSize = Math.min(10 * 1024 * 1024, chunkSize * 1.5); // Max 10MB
}
```

### Benefits
- **No Practical Size Limits**: Handle files up to 200MB
- **Resume Capability**: Failed chunks retry individually
- **Memory Efficiency**: Only one chunk in memory at a time
- **Real-time Progress**: Detailed progress feedback
- **Network Resilience**: Adapts to connection quality

## 🚨 Error Handling & Recovery

### Error Categories

#### 1. Server Memory Errors
```typescript
{
  message: 'Server memory usage too high to process image',
  suggestions: [
    'Wait 2-3 minutes for server resources to free up',
    'Use progressive upload for large files',
    'Try uploading smaller images (under 25MB)',
    'Upload images one at a time instead of batches'
  ],
  canRetry: true,
  severity: 'warning',
  category: 'memory',
  retryDelay: 120000 // 2 minutes
}
```

#### 2. File Size Errors (413 Payload Too Large)
```typescript
{
  message: 'File too large for server limits',
  suggestions: [
    'Use progressive upload feature for large files',
    'Compress image using tools like TinyPNG or Squoosh',
    'Resize image dimensions to reduce file size',
    'Convert to JPEG format for better compression'
  ],
  canRetry: true,
  severity: 'error',
  category: 'server_limit',
  useChunking: true,
  retryDelay: 5000
}
```

#### 3. Format/Validation Errors
```typescript
{
  message: 'Unsupported image format detected',
  suggestions: [
    'Convert HEIC images to JPEG (iPhone: Settings > Camera > Formats)',
    'Export SVG files as PNG from design software',
    'Use JPEG, PNG, or WebP formats for best compatibility',
    'Check that file is not corrupted'
  ],
  canRetry: false,
  severity: 'error',
  category: 'format'
}
```

#### 4. Network/Connection Errors
```typescript
{
  message: 'Network connection issue during upload',
  suggestions: [
    'Check internet connection stability',
    'Try uploading again - automatic retry will begin',
    'Use progressive upload for better reliability',
    'Try different browser if issues persist'
  ],
  canRetry: true,
  severity: 'error',
  category: 'network',
  useChunking: true,
  retryDelay: 3000
}
```

### Automatic Recovery Mechanisms

#### Retry Logic with Exponential Backoff
```typescript
const retryUpload = async (attempt: number = 1, maxAttempts: number = 3) => {
  try {
    return await uploadFile();
  } catch (error) {
    if (attempt < maxAttempts && isRetryableError(error)) {
      const delay = Math.min(1000 * Math.pow(2, attempt), 30000); // Max 30s
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryUpload(attempt + 1, maxAttempts);
    }
    throw error;
  }
};
```

#### Client-Side Optimization Fallback
```typescript
// Automatic compression on 413 errors
if (error.includes('413') && !compressionAttempted) {
  const compressedFile = await compressImageOnClient(file, 0.7);
  return uploadFile(compressedFile);
}
```

#### Progressive Upload Fallback
```typescript
// Switch to chunked upload for large files or failures
if (fileSize > 25 * 1024 * 1024 || error.includes('413')) {
  return useProgressiveUpload(file);
}
```

## 🔌 API Reference

### Backend Procedures

#### Bulletproof Single Upload
```typescript
trpc.bulletproofSingleUpload.mutate({
  adminToken: string,
  fileName: string,
  fileContent: string, // base64 encoded
  fileType: string,
  title?: string,
  description?: string,
  altText?: string,
  forceStrategy?: 'high-quality' | 'memory-efficient' | 'format-converter' | 'emergency'
})

// Response
{
  success: boolean,
  filePath?: string,
  processingInfo: {
    strategy: string,
    processingTime: number,
    originalSize: number,
    finalSize: number,
    compressionRatio: number
  },
  error?: string
}
```

#### Progressive Upload
```typescript
trpc.bulletproofProgressiveUpload.mutate({
  adminToken: string,
  chunkId: string,
  chunkIndex: number,
  totalChunks: number,
  data: string, // base64 chunk
  fileName: string,
  fileType: string,
  sessionId?: string
})

// Response
{
  success: boolean,
  complete: boolean,
  progress: number, // 0-100
  adaptiveChunkSize?: number,
  suggestedAction?: 'reduce_chunk_size' | 'retry' | 'wait',
  filePath?: string // Only when complete: true
}
```

#### Bulk Upload
```typescript
trpc.bulletproofBulkUpload.mutate({
  adminToken: string,
  images: Array<{
    fileName: string,
    fileContent: string,
    fileType: string,
    title?: string,
    description?: string,
    altText?: string
  }> // Max 5 images
})

// Response
{
  success: boolean,
  results: Array<{
    fileName: string,
    success: boolean,
    filePath?: string,
    error?: string
  }>,
  overallStats: {
    totalProcessed: number,
    successful: number,
    failed: number,
    totalProcessingTime: number
  }
}
```

#### Standard Upload (Legacy)
```typescript
trpc.adminUploadImage.mutate({
  adminToken: string,
  fileName: string,
  fileContent: string,
  fileType: string,
  title?: string,
  description?: string,
  altText?: string,
  tags?: string[],
  category?: string,
  generateVariants?: boolean
})
```

### Image Retrieval
```typescript
// Get image
trpc.getImage.query({ filePath: string })

// List images (admin)
trpc.adminListImages.query({
  adminToken: string,
  page?: number,
  limit?: number,
  search?: string,
  category?: string
})

// Delete image (admin)
trpc.adminDeleteImage.mutate({
  adminToken: string,
  filePath: string
})
```

## ⚙️ Configuration & Environment

### Environment Variables
```bash
# Upload Limits
UPLOAD_MAX_FILE_SIZE=50              # MB, standard uploads
UPLOAD_CHUNK_SIZE=2                  # MB, default chunk size
UPLOAD_MAX_CHUNKS=100                # Max chunks per file
PROGRESSIVE_UPLOAD_THRESHOLD=25      # MB, threshold for chunking

# Processing Configuration
IMAGE_PROCESSING_MEMORY_LIMIT=2048   # MB, max memory per image
IMAGE_PROCESSING_MAX_CONCURRENT=2    # Concurrent processing jobs
IMAGE_PROCESSING_TIMEOUT=300000      # 5 minutes
SHARP_CONCURRENCY=2                  # Sharp processing threads
SHARP_CACHE_SIZE=50                  # MB, Sharp cache

# Memory Management
ENABLE_MEMORY_MONITORING=true        # Real-time memory tracking
MEMORY_CHECK_INTERVAL=30000          # 30 seconds
NODE_OPTIONS="--max-old-space-size=4096 --expose-gc"

# Retry Configuration
UPLOAD_RETRY_ATTEMPTS=3              # Max automatic retries
UPLOAD_RETRY_DELAY=2000              # Base delay in ms
UPLOAD_TIMEOUT=300000                # 5 minutes total timeout

# Storage (Minio)
MINIO_ENDPOINT="localhost"
MINIO_PORT=9000
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"
MINIO_USE_SSL=false
MINIO_BUCKET_NAME="images"
```

### Docker Configuration
```yaml
services:
  app:
    deploy:
      resources:
        limits:
          memory: 6gb          # Increased for image processing
        reservations:
          memory: 3gb          # Reserved memory
    environment:
      - NODE_OPTIONS=--max-old-space-size=4096 --expose-gc --max-semi-space-size=256
      - UV_THREADPOOL_SIZE=8
      - SHARP_CONCURRENCY=2
      - IMAGE_PROCESSING_MEMORY_LIMIT=2048
      - ENABLE_MEMORY_MONITORING=true
```

### Nginx Configuration
```nginx
# Enhanced file upload limits
client_max_body_size 2048M;     # 2GB for chunked uploads
client_body_timeout 300s;       # 5 minute timeout
proxy_request_buffering off;    # Stream uploads directly
proxy_read_timeout 300s;        # 5 minute read timeout

# Custom 413 error handling
error_page 413 @413_json;
location @413_json {
  return 413 '{"error": "File too large", "useChunking": true}';
  add_header Content-Type application/json;
}
```

## 🔧 Troubleshooting Guide

### Common Issues & Solutions

#### "Insufficient memory to resize image"
**Symptoms**: Upload fails with memory errors, large images fail
**Solutions**:
1. **Immediate**: Reduce image size to < 10MB before upload
2. **User**: Upload fewer images at once (max 3)
3. **Admin**: Increase Docker memory limits, restart application
4. **System**: Monitor memory with `docker stats`

#### "Unsupported image format"
**Solutions by Format**:
- **HEIC/HEIF (iPhone)**: Settings > Camera > Formats > Most Compatible
- **SVG**: Export as PNG from design software
- **RAW**: Process in photo editor, export as JPEG/PNG
- **TIFF**: Will auto-convert, but JPEG/PNG preferred

#### Upload Timeouts
**Solutions**:
1. Check internet connection stability
2. Use progressive upload for files > 25MB
3. Upload during off-peak hours
4. Try uploading one image at a time

#### 413 Payload Too Large
**Automatic Handling**: System will automatically:
1. Try client-side compression
2. Switch to progressive upload
3. Reduce chunk sizes adaptively

**Manual Solutions**:
1. Compress images before upload
2. Resize dimensions to web-appropriate sizes
3. Convert PNG to JPEG for photos

### Optimization Best Practices

#### Recommended Image Specifications
| Use Case | Dimensions | File Size | Format |
|----------|-----------|-----------|---------|
| Profile Photos | 800x800px | < 2MB | JPEG/PNG |
| Hero Images | 1920x1080px | < 5MB | JPEG/WebP |
| Gallery Images | 1600x1600px | < 3MB | JPEG/WebP |
| Thumbnails | 400x400px | < 500KB | JPEG |
| Logos | 800x400px | < 1MB | PNG |

#### Compression Guidelines
- **JPEG**: 80-85% quality for photos
- **PNG**: PNG-8 for simple graphics, PNG-24 for complex
- **WebP**: 75-80% quality for excellent compression
- **File Size**: Remove EXIF data, strip color profiles

### Memory Management

#### For Users
- Upload 3-5 images maximum per batch
- Wait for completion before next batch
- Compress large images before upload
- Use JPEG instead of PNG for photos

#### For Administrators
```bash
# Monitor memory usage
docker stats

# Check application logs
docker logs <container> | grep -i memory

# Restart to clear memory
docker-compose restart app

# Check memory configuration
docker inspect <container> | grep -i memory
```

#### Memory Optimization
```bash
# Increase Docker memory limits
# In docker-compose.yaml:
deploy:
  resources:
    limits:
      memory: 8gb      # Increase from 6gb if needed
    reservations:
      memory: 4gb      # Increase from 3gb
```

### Debug Information

#### Client-Side Debugging
```typescript
// Enable debug mode in development
const debugInfo = {
  uploadProgress: true,
  chunkStatus: true,
  memoryStats: true,
  retryAttempts: true
};
```

#### Server-Side Logging
```typescript
// Memory monitoring
const memoryStats = getMemoryStats();
console.log('Memory pressure:', memoryStats.system.pressure);
console.log('Available memory:', memoryStats.system.available);

// Processing strategy logging
console.log('Selected strategy:', selectedStrategy);
console.log('Processing time:', processingTime);
console.log('Compression ratio:', originalSize / finalSize);
```

### Getting Help

#### Error Reporting
When reporting issues, include:
1. **Error Message**: Complete error text
2. **File Details**: Size, format, dimensions
3. **Browser/OS**: Browser version and operating system
4. **Network**: Connection speed and stability
5. **Timestamp**: When the error occurred

#### System Requirements
**Minimum**:
- 4GB RAM for Docker containers
- 2GB free disk space
- Stable internet connection

**Recommended**:
- 8GB RAM for Docker containers
- 10GB free disk space
- High-speed internet connection

#### Browser Support
- Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- JavaScript enabled
- File API and drag-and-drop support

## 🔒 Security & Validation

### File Validation
```typescript
// Multi-layer validation
const validateImageFile = (file: File) => {
  // 1. File extension check
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tiff', '.heic', '.heif', '.svg', '.avif'];
  
  // 2. MIME type validation
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', /* ... */];
  
  // 3. File signature validation
  const isValidSignature = validateFileSignature(fileBuffer);
  
  // 4. Content scanning
  const isSafe = basicMalwareScan(fileBuffer);
  
  return {
    valid: isValidSignature && isSafe,
    format: detectedFormat,
    suggestions: getFormatSuggestions(file)
  };
};
```

### Authentication & Authorization
```typescript
// Admin token validation
const validateAdminToken = async (token: string) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    return { valid: true, admin: decoded };
  } catch (error) {
    throw new Error('Invalid or expired admin token');
  }
};

// Rate limiting
const uploadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 uploads per window
  message: 'Too many upload attempts, please try again later'
});
```

### Content Security
- **File Signature Validation**: Check actual file headers
- **Malware Scanning**: Basic content analysis
- **Path Validation**: Prevent directory traversal
- **Size Limits**: Enforce strict file size constraints
- **Rate Limiting**: Prevent abuse and DoS attacks
- **Input Sanitization**: Clean all user inputs
- **Secure Storage**: Isolated file storage with proper permissions

### Data Privacy
- **Metadata Stripping**: Remove EXIF data containing location/device info
- **Secure URLs**: Time-limited access URLs for sensitive content
- **Audit Logging**: Track all upload and access activities
- **Data Retention**: Configurable retention policies
- **GDPR Compliance**: Right to deletion and data portability

## 📊 Monitoring & Analytics

### System Monitoring
```typescript
// Real-time metrics
const uploadMetrics = {
  successRate: calculateSuccessRate(),
  averageProcessingTime: getAverageProcessingTime(),
  memoryUsage: getCurrentMemoryUsage(),
  activeUploads: getActiveUploadCount(),
  errorDistribution: getErrorsByCategory(),
  strategyEffectiveness: getStrategySuccessRates()
};
```

### Performance Metrics
- **Upload Success Rate**: Target > 98%
- **Processing Time**: Target < 10 seconds average
- **Memory Usage**: Target < 80% peak usage
- **Error Recovery**: Target > 90% successful retries
- **User Satisfaction**: Target > 4.5/5 rating

### Alerting Thresholds
```yaml
alerts:
  error_rate:
    threshold: 5%
    window: 15m
  memory_usage:
    threshold: 85%
    window: 5m
  processing_time:
    threshold: 30s
    window: 10m
  storage_usage:
    threshold: 90%
    window: 1h
```

### Analytics Dashboard
- **Upload Patterns**: File sizes, formats, success rates
- **Strategy Performance**: Which strategies work best
- **Error Analysis**: Common failure patterns
- **User Behavior**: Upload frequency, retry patterns
- **System Health**: Memory, storage, processing metrics

---

## 🎯 Quick Start Guide

### For Developers
1. **Import Component**: `import { BulletproofImageUpload } from '~/components/ui/BulletproofImageUpload'`
2. **Basic Usage**: `<BulletproofImageUpload value={path} onChange={setPath} />`
3. **Enable Features**: Add `enableProgressiveUpload={true}` for large files
4. **Handle Errors**: Use `onUploadError` callback for custom error handling

### For Users
1. **Drag & Drop**: Drag images directly onto upload area
2. **Large Files**: System automatically uses progressive upload for files > 25MB
3. **Any Format**: Upload any image format - system handles conversion
4. **Error Recovery**: Follow on-screen suggestions if upload fails

### For Administrators
1. **Memory Monitoring**: Check `docker stats` regularly
2. **Error Tracking**: Monitor application logs for upload failures
3. **Performance Tuning**: Adjust memory limits and processing settings
4. **Storage Management**: Monitor Minio bucket usage and cleanup

---

*This document consolidates all image upload system documentation. For specific implementation details, refer to the component source code and API documentation.*

*Last updated: [Current Date]*
*Version: 2.0.0*
