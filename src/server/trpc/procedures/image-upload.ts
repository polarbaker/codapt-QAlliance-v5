import { baseProcedure } from "~/server/trpc/main";
import { requireAdminAuth } from "./auth";
import * as z from "zod";
import { randomUUID } from "crypto";
import { Client } from "minio";
import sharp from "sharp";
import { env } from "~/server/env";
import { 
  getMemoryStats, 
  emergencyMemoryCleanup, 
  isMemoryUnderPressure 
} from "~/server/scripts/optimize-memory";

// Enhanced error types for better debugging and user guidance
interface ImageUploadError extends Error {
  code?: string;
  category?: 'auth' | 'validation' | 'processing' | 'storage' | 'memory' | 'size_limit' | 'server_limit';
  canRetry?: boolean;
  retryAfter?: number;
  suggestions?: string[];
  httpStatus?: number;
  details?: Record<string, any>;
}

// Simple Minio client configuration
const minioClient = new Client({
  endPoint: 'minio',
  port: 9000,
  useSSL: false,
  accessKey: 'minioadmin',
  secretKey: 'minioadmin',
  region: 'us-east-1',
});

const BUCKET_NAME = 'images';

// Simplified validation schemas
const imageUploadInputSchema = z.object({
  adminToken: z.string(),
  fileName: z.string().min(1, "File name is required").max(255),
  fileContent: z.string().min(1, "File content is required"), // base64 encoded
  fileType: z.string().regex(/^image\//, "File must be an image"),
  title: z.string().max(200).optional(),
  description: z.string().max(1000).optional(),
  altText: z.string().max(300).optional(),
});

const bulkImageUploadInputSchema = z.object({
  adminToken: z.string(),
  images: z.array(z.object({
    fileName: z.string().min(1, "File name is required").max(255),
    fileContent: z.string().min(1, "File content is required"),
    fileType: z.string().regex(/^image\//, "File must be an image"),
    title: z.string().max(200).optional(),
    description: z.string().max(1000).optional(),
    altText: z.string().max(300).optional(),
  })).min(1).max(3), // Reduced to 3 for reliability
});

// Enhanced error creation with specific handling for different error types
const createImageError = (
  message: string, 
  category: ImageUploadError['category'] = 'processing', 
  options: {
    canRetry?: boolean;
    retryAfter?: number;
    suggestions?: string[];
    httpStatus?: number;
    details?: Record<string, any>;
    code?: string;
  } = {}
): ImageUploadError => {
  const error = new Error(message) as ImageUploadError;
  error.category = category;
  error.canRetry = options.canRetry ?? true;
  error.retryAfter = options.retryAfter;
  error.suggestions = options.suggestions || [];
  error.httpStatus = options.httpStatus;
  error.details = options.details || {};
  error.code = options.code;
  
  // Add specific suggestions based on category
  if (category === 'size_limit' || category === 'server_limit') {
    error.suggestions = [
      'Use progressive upload for files over 25MB',
      'Compress your image before uploading',
      'Resize image dimensions to reduce file size',
      'Convert to JPEG format for better compression',
      ...error.suggestions
    ];
    error.httpStatus = 413;
  } else if (category === 'memory') {
    error.suggestions = [
      'Wait 2-3 minutes for server resources to free up',
      'Try uploading a smaller image',
      'Upload images one at a time instead of batches',
      'Use progressive upload to reduce memory usage',
      ...error.suggestions
    ];
    error.retryAfter = options.retryAfter || 120; // 2 minutes default
  }
  
  return error;
};

// Enhanced memory and size validation with detailed diagnostics
const validateUploadLimits = (buffer: Buffer, fileName: string): { 
  valid: boolean; 
  error?: ImageUploadError;
  warnings?: string[];
  details: Record<string, any>;
} => {
  const details: Record<string, any> = {
    fileSize: buffer.length,
    fileSizeMB: (buffer.length / (1024 * 1024)).toFixed(2),
    fileName,
    timestamp: new Date().toISOString(),
  };
  
  const warnings: string[] = [];
  
  // Check memory status
  const memoryStats = getMemoryStats();
  details.memoryStats = memoryStats;
  
  if (memoryStats.system.pressure === 'critical') {
    return {
      valid: false,
      error: createImageError(
        `Server memory critically low (${memoryStats.rss.toFixed(1)}MB used). Cannot process upload safely.`,
        'memory',
        {
          canRetry: true,
          retryAfter: 180, // 3 minutes
          suggestions: [
            'Wait 3-5 minutes for server resources to free up',
            'Try uploading a smaller image (under 10MB)',
            'Upload one image at a time',
            'Contact support if the issue persists'
          ],
          details: { memoryPressure: memoryStats.system.pressure }
        }
      ),
      details
    };
  }
  
  if (memoryStats.system.pressure === 'high') {
    warnings.push(`Server memory usage is high (${memoryStats.rss.toFixed(1)}MB). Processing may be slower.`);
  }
  
  // Enhanced size validation with environment-based limits
  const maxSingleUpload = env.UPLOAD_MAX_FILE_SIZE; // From environment
  const progressiveThreshold = env.PROGRESSIVE_UPLOAD_THRESHOLD;
  
  if (buffer.length > maxSingleUpload) {
    const sizeMB = (buffer.length / (1024 * 1024)).toFixed(1);
    const limitMB = (maxSingleUpload / (1024 * 1024)).toFixed(0);
    
    return {
      valid: false,
      error: createImageError(
        `Image too large (${sizeMB}MB). Maximum size for standard upload is ${limitMB}MB.`,
        'size_limit',
        {
          canRetry: true,
          suggestions: [
            'Use progressive upload for large files',
            'Compress the image using online tools',
            'Resize image dimensions before uploading',
            'Convert to JPEG format for better compression'
          ],
          details: { 
            fileSize: buffer.length,
            maxSize: maxSingleUpload,
            recommendProgressive: buffer.length > progressiveThreshold
          },
          httpStatus: 413
        }
      ),
      details
    };
  }
  
  // Check if progressive upload is recommended
  if (buffer.length > progressiveThreshold) {
    const sizeMB = (buffer.length / (1024 * 1024)).toFixed(1);
    warnings.push(`Large file detected (${sizeMB}MB). Consider using progressive upload for better reliability.`);
  }
  
  // Minimum size check
  if (buffer.length < 100) {
    return {
      valid: false,
      error: createImageError(
        'File is too small or empty. Please select a valid image file.',
        'validation',
        {
          canRetry: false,
          suggestions: ['Check if the file is corrupted', 'Try uploading a different image']
        }
      ),
      details
    };
  }
  
  return {
    valid: true,
    warnings: warnings.length > 0 ? warnings : undefined,
    details
  };
};

// Ensure bucket exists (simplified)
const ensureBucket = async (): Promise<void> => {
  try {
    const exists = await minioClient.bucketExists(BUCKET_NAME);
    if (!exists) {
      await minioClient.makeBucket(BUCKET_NAME);
      console.log(`Created bucket: ${BUCKET_NAME}`);
    }
  } catch (error) {
    console.error('Bucket creation error:', error);
    throw createImageError('Storage system unavailable', 'storage');
  }
};

// Enhanced image processing with better memory management and error handling
const processImage = async (buffer: Buffer, fileName: string): Promise<{
  processedBuffer: Buffer;
  contentType: string;
  extension: string;
  metadata: { width?: number; height?: number; };
  processingDetails: Record<string, any>;
}> => {
  let sharpInstance: sharp.Sharp | null = null;
  const startTime = Date.now();
  const processingDetails: Record<string, any> = {
    startTime,
    fileName,
    originalSize: buffer.length,
    strategy: 'standard',
  };
  
  try {
    // Pre-processing memory check with emergency cleanup if needed
    if (isMemoryUnderPressure()) {
      console.warn(`Memory pressure detected before processing ${fileName}, performing cleanup`);
      await emergencyMemoryCleanup(`before processing ${fileName}`);
      
      // Wait for cleanup to take effect
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check again after cleanup
      const postCleanupStats = getMemoryStats();
      if (postCleanupStats.system.pressure === 'critical') {
        throw createImageError(
          'Server memory critically low even after cleanup. Cannot process image safely.',
          'memory',
          {
            retryAfter: 300, // 5 minutes
            details: { memoryAfterCleanup: postCleanupStats }
          }
        );
      }
    }

    // Create Sharp instance with memory-conscious settings
    const memoryStats = getMemoryStats();
    const availableMemory = memoryStats.system.available;
    
    // Adjust processing limits based on available memory
    let maxPixels = 67108864; // Default: 8192x8192
    if (availableMemory < 1024) { // Less than 1GB available
      maxPixels = 16777216; // 4096x4096
      processingDetails.strategy = 'memory-conservative';
    } else if (availableMemory < 512) { // Less than 512MB available
      maxPixels = 4194304; // 2048x2048
      processingDetails.strategy = 'memory-critical';
    }
    
    sharpInstance = sharp(buffer, { 
      limitInputPixels: maxPixels,
      sequentialRead: true,
      density: availableMemory < 1024 ? 72 : 150, // Lower DPI for memory conservation
    });
    
    // Get metadata first with timeout
    const metadataPromise = sharpInstance.metadata();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Metadata extraction timeout')), 30000); // 30 second timeout
    });
    
    const metadata = await Promise.race([metadataPromise, timeoutPromise]) as sharp.Metadata;
    
    if (!metadata.width || !metadata.height) {
      throw createImageError(
        'Invalid image - cannot determine dimensions. File may be corrupted.',
        'validation',
        { 
          canRetry: false,
          suggestions: [
            'Check if the file is actually an image',
            'Try opening the file in an image editor to verify it\'s not corrupted',
            'Convert to a standard format (JPEG/PNG) and try again'
          ]
        }
      );
    }

    processingDetails.originalDimensions = { width: metadata.width, height: metadata.height };
    processingDetails.originalFormat = metadata.format;

    // Enhanced size validation with specific limits
    const maxDimension = availableMemory < 1024 ? 4096 : 8192;
    if (metadata.width > maxDimension || metadata.height > maxDimension) {
      throw createImageError(
        `Image dimensions too large (${metadata.width}x${metadata.height}). Maximum ${maxDimension}x${maxDimension} pixels.`,
        'size_limit',
        {
          suggestions: [
            `Resize image to maximum ${maxDimension}x${maxDimension} pixels`,
            'Use an image editor to reduce dimensions',
            'Consider using progressive upload for very large images'
          ],
          details: { 
            actualDimensions: { width: metadata.width, height: metadata.height },
            maxDimensions: { width: maxDimension, height: maxDimension }
          }
        }
      );
    }

    // Memory-aware processing strategy
    let processedImage = sharpInstance;
    let targetWidth = metadata.width;
    let targetHeight = metadata.height;
    
    // Resize if too large, with different strategies based on available memory
    const resizeThreshold = availableMemory < 1024 ? 1536 : 2048;
    if (metadata.width > resizeThreshold || metadata.height > resizeThreshold) {
      const ratio = Math.min(resizeThreshold / metadata.width, resizeThreshold / metadata.height);
      targetWidth = Math.round(metadata.width * ratio);
      targetHeight = Math.round(metadata.height * ratio);
      
      processedImage = processedImage.resize(targetWidth, targetHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      });
      
      processingDetails.resized = true;
      processingDetails.targetDimensions = { width: targetWidth, height: targetHeight };
    }

    // Format-specific optimization with memory considerations
    let outputBuffer: Buffer;
    let contentType: string;
    let extension: string;

    if (metadata.hasAlpha) {
      // Keep transparency but optimize for memory
      const quality = availableMemory < 1024 ? 6 : 8;
      outputBuffer = await processedImage.png({ 
        compressionLevel: quality,
        adaptiveFiltering: true,
        progressive: false // Disable progressive for memory efficiency
      }).toBuffer();
      contentType = 'image/png';
      extension = 'png';
      processingDetails.outputFormat = 'png';
    } else {
      // Convert to JPEG for better compression and memory efficiency
      const quality = availableMemory < 1024 ? 75 : 85;
      outputBuffer = await processedImage.jpeg({ 
        quality,
        progressive: availableMemory >= 1024, // Only use progressive if enough memory
        mozjpeg: true
      }).toBuffer();
      contentType = 'image/jpeg';
      extension = 'jpg';
      processingDetails.outputFormat = 'jpeg';
      processingDetails.jpegQuality = quality;
    }

    // Get final metadata
    const finalMetadata = await sharp(outputBuffer).metadata();
    
    processingDetails.finalDimensions = {
      width: finalMetadata.width,
      height: finalMetadata.height
    };
    processingDetails.finalSize = outputBuffer.length;
    processingDetails.compressionRatio = buffer.length / outputBuffer.length;
    processingDetails.processingTime = Date.now() - startTime;
    
    // Log successful processing
    console.log(`✅ Image processed successfully: ${fileName}`, {
      originalSize: `${(buffer.length / (1024 * 1024)).toFixed(1)}MB`,
      finalSize: `${(outputBuffer.length / (1024 * 1024)).toFixed(1)}MB`,
      compressionRatio: processingDetails.compressionRatio.toFixed(2),
      processingTime: `${processingDetails.processingTime}ms`,
      strategy: processingDetails.strategy
    });

    return {
      processedBuffer: outputBuffer,
      contentType,
      extension,
      metadata: {
        width: finalMetadata.width,
        height: finalMetadata.height,
      },
      processingDetails,
    };

  } catch (error) {
    processingDetails.processingTime = Date.now() - startTime;
    processingDetails.error = error instanceof Error ? error.message : 'Unknown error';
    
    console.error(`❌ Image processing failed for ${fileName}:`, {
      error: processingDetails.error,
      processingTime: processingDetails.processingTime,
      strategy: processingDetails.strategy
    });
    
    // Enhanced error categorization
    if (error instanceof Error) {
      if (error.message.includes('Input buffer contains unsupported image format')) {
        throw createImageError(
          'Unsupported image format. Please convert to JPEG, PNG, or WebP.',
          'validation',
          {
            canRetry: false,
            suggestions: [
              'Convert to JPEG or PNG format using an image editor',
              'Ensure the file is actually an image',
              'Try re-saving the image in a standard format'
            ]
          }
        );
      }
      
      if (error.message.includes('memory') || error.message.includes('allocation')) {
        throw createImageError(
          'Image too large for available server memory. Try a smaller image.',
          'memory',
          {
            retryAfter: 120,
            suggestions: [
              'Resize the image to smaller dimensions',
              'Compress the image before uploading',
              'Wait a few minutes and try again',
              'Upload images one at a time'
            ]
          }
        );
      }
      
      if (error.message.includes('timeout')) {
        throw createImageError(
          'Image processing timed out. The image may be too complex or large.',
          'processing',
          {
            suggestions: [
              'Try a smaller or simpler image',
              'Convert to JPEG format for faster processing',
              'Reduce image dimensions before uploading'
            ]
          }
        );
      }
    }

    // Re-throw ImageUploadError as-is
    if (error instanceof Error && 'category' in error) {
      throw error;
    }
    
    // Wrap other errors
    throw createImageError(
      `Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'processing',
      {
        details: processingDetails
      }
    );
    
  } finally {
    if (sharpInstance) {
      try {
        sharpInstance.destroy();
      } catch (destroyError) {
        console.warn('Failed to destroy Sharp instance:', destroyError);
      }
    }
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  }
};

// Simplified upload to storage
const uploadToStorage = async (fileName: string, buffer: Buffer, contentType: string): Promise<void> => {
  try {
    await minioClient.putObject(BUCKET_NAME, fileName, buffer, buffer.length, {
      'Content-Type': contentType,
      'X-Upload-Timestamp': new Date().toISOString(),
    });
    console.log(`Uploaded to storage: ${fileName}`);
  } catch (error) {
    console.error(`Storage upload failed for ${fileName}:`, error);
    throw createImageError('Failed to save image to storage', 'storage');
  }
};

// Helper function to validate image buffer content
const validateImageBuffer = async (buffer: Buffer, expectedContentType: string): Promise<boolean> => {
  try {
    if (buffer.length < 10) {
      return false;
    }
    
    // Check magic bytes for common image formats
    const arr = new Uint8Array(buffer);
    
    // JPEG
    if (arr[0] === 0xFF && arr[1] === 0xD8 && arr[2] === 0xFF) {
      return expectedContentType === 'image/jpeg' || expectedContentType.includes('jpeg');
    }
    
    // PNG
    if (arr[0] === 0x89 && arr[1] === 0x50 && arr[2] === 0x4E && arr[3] === 0x47) {
      return expectedContentType === 'image/png';
    }
    
    // GIF
    if (arr[0] === 0x47 && arr[1] === 0x49 && arr[2] === 0x46) {
      return expectedContentType === 'image/gif';
    }
    
    // WebP
    if (arr[0] === 0x52 && arr[1] === 0x49 && arr[2] === 0x46 && arr[3] === 0x46 && 
        buffer.length >= 12 && arr[8] === 0x57 && arr[9] === 0x45 && arr[10] === 0x42 && arr[11] === 0x50) {
      return expectedContentType === 'image/webp';
    }
    
    // BMP
    if (arr[0] === 0x42 && arr[1] === 0x4D) {
      return expectedContentType === 'image/bmp';
    }
    
    // For other formats or if magic bytes don't match, try Sharp validation
    try {
      const metadata = await sharp(buffer).metadata();
      return metadata.format !== undefined;
    } catch (sharpError) {
      console.warn('Sharp validation failed for image buffer:', sharpError);
      return false;
    }
    
  } catch (error) {
    console.warn('Image buffer validation error:', error);
    return false;
  }
};

// Enhanced server-side file verification after storage upload
const verifyFileExistsInStorage = async (
  fileName: string,
  expectedSize?: number,
  maxRetries: number = 3
): Promise<{ exists: boolean; actualSize?: number; error?: string; metadata?: any }> => {
  console.log(`🔍 SERVER VERIFICATION: Starting file existence check for ${fileName}`);
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔍 SERVER VERIFICATION: Attempt ${attempt}/${maxRetries} for ${fileName}`);
      
      // Check if file exists in storage
      const stat = await minioClient.statObject(BUCKET_NAME, fileName);
      
      if (!stat) {
        console.error(`❌ SERVER VERIFICATION: No stat object returned for ${fileName} on attempt ${attempt}`);
        continue;
      }
      
      const actualSize = stat.size;
      const lastModified = stat.lastModified;
      const etag = stat.etag;
      const contentType = stat.metaData?.['content-type'];
      
      console.log(`✅ SERVER VERIFICATION: File exists in storage:`, {
        fileName,
        actualSize,
        expectedSize,
        lastModified,
        etag,
        contentType,
        attempt,
        bucket: BUCKET_NAME,
      });
      
      // Verify file size if expected size is provided
      if (expectedSize && actualSize !== expectedSize) {
        console.warn(`⚠️ SERVER VERIFICATION: Size mismatch for ${fileName}:`, {
          expectedSize,
          actualSize,
          difference: Math.abs(actualSize - expectedSize),
        });
        
        // Allow small differences (up to 1KB) due to metadata
        if (Math.abs(actualSize - expectedSize) > 1024) {
          return {
            exists: false,
            actualSize,
            error: `File size mismatch: expected ${expectedSize}, got ${actualSize}`,
          };
        }
      }
      
      // Try to actually read a small portion of the file to ensure it's not corrupted
      try {
        const stream = await minioClient.getObject(BUCKET_NAME, fileName);
        let readBytes = 0;
        const maxReadBytes = 1024; // Read first 1KB to verify accessibility
        
        for await (const chunk of stream) {
          readBytes += chunk.length;
          if (readBytes >= maxReadBytes) {
            break; // We've read enough to verify the file is accessible
          }
        }
        
        console.log(`✅ SERVER VERIFICATION: File is readable, verified ${readBytes} bytes for ${fileName}`);
        
        return {
          exists: true,
          actualSize,
          metadata: {
            lastModified,
            etag,
            contentType,
            verifiedBytes: readBytes,
            verificationAttempt: attempt,
          },
        };
        
      } catch (readError) {
        console.error(`❌ SERVER VERIFICATION: File exists but cannot be read on attempt ${attempt}:`, {
          fileName,
          error: readError instanceof Error ? readError.message : 'Unknown read error',
        });
        
        if (attempt === maxRetries) {
          return {
            exists: false,
            actualSize,
            error: `File exists but cannot be read: ${readError instanceof Error ? readError.message : 'Unknown error'}`,
          };
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
      
    } catch (statError: any) {
      console.error(`❌ SERVER VERIFICATION: Stat error for ${fileName} on attempt ${attempt}:`, {
        error: statError instanceof Error ? statError.message : 'Unknown stat error',
        code: statError?.code,
        statusCode: statError?.statusCode,
      });
      
      if (statError?.code === 'NoSuchKey' || statError?.statusCode === 404) {
        if (attempt === maxRetries) {
          return {
            exists: false,
            error: `File not found in storage after ${maxRetries} attempts`,
          };
        }
        
        // Wait before retry for file to propagate
        console.log(`⏳ SERVER VERIFICATION: File not found, waiting before retry ${attempt + 1}...`);
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
      } else {
        if (attempt === maxRetries) {
          return {
            exists: false,
            error: `Storage error: ${statError instanceof Error ? statError.message : 'Unknown error'}`,
          };
        }
        
        // Wait before retry for transient errors
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }
  
  return {
    exists: false,
    error: `File verification failed after ${maxRetries} attempts`,
  };
};

// Enhanced single image upload with comprehensive error handling, logging, and server-side verification
export const adminUploadImage = baseProcedure
  .input(z.object({
    adminToken: z.string(),
    fileName: z.string().min(1).max(255),
    fileContent: z.string().min(1),
    fileType: z.string().regex(/^image\//, "File must be an image"),
    title: z.string().max(200).optional(),
    description: z.string().max(1000).optional(),
    altText: z.string().max(300).optional(),
  }))
  .mutation(async ({ input }) => {
    const startTime = Date.now();
    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Enhanced logging for debugging
    console.log(`🚀 ENHANCED UPLOAD: Starting upload for ${input.fileName} (ID: ${uploadId}, Request: ${requestId})`);
    console.log(`📊 REQUEST DETAILS:`, {
      uploadId,
      requestId,
      fileName: input.fileName,
      fileType: input.fileType,
      adminTokenPresent: !!input.adminToken,
      adminTokenLength: input.adminToken?.length || 0,
      adminTokenPrefix: input.adminToken ? input.adminToken.substring(0, 10) + '...' : 'none',
      fileContentLength: input.fileContent?.length || 0,
      fileContentPrefix: input.fileContent ? input.fileContent.substring(0, 50) + '...' : 'none',
      hasTitle: !!input.title,
      hasDescription: !!input.description,
      hasAltText: !!input.altText,
      timestamp: new Date().toISOString(),
      userAgent: 'server-side',
      memoryUsage: process.memoryUsage(),
    });
    
    let imageRecord: any = null;
    let uploadedFileName: string | null = null;
    let processingDetails: Record<string, any> = {
      uploadId,
      requestId,
      fileName: input.fileName,
      fileType: input.fileType,
      startTime,
    };
    
    try {
      // Enhanced authentication with detailed logging
      console.log(`🔐 AUTHENTICATION CHECK: Verifying admin token for ${input.fileName} (${requestId})`);
      
      if (!input.adminToken || input.adminToken.trim() === '') {
        console.error(`❌ AUTHENTICATION FAILED: Missing or empty admin token for ${input.fileName} (${requestId})`);
        throw createImageError(
          'Authentication token is required',
          'auth',
          {
            canRetry: false,
            suggestions: ['Please log in again', 'Refresh the page and try again'],
            details: { uploadId, requestId, reason: 'missing_token' }
          }
        );
      }
      
      if (input.adminToken.length < 10) {
        console.error(`❌ AUTHENTICATION FAILED: Token too short for ${input.fileName} (${requestId}):`, {
          tokenLength: input.adminToken.length,
          tokenPrefix: input.adminToken.substring(0, 5)
        });
        throw createImageError(
          'Invalid authentication token format',
          'auth',
          {
            canRetry: false,
            suggestions: ['Please log in again', 'Clear browser cache and try again'],
            details: { uploadId, requestId, reason: 'invalid_token_format' }
          }
        );
      }
      
      try {
        await requireAdminAuth(input.adminToken);
        console.log(`✅ AUTHENTICATION SUCCESS: Token verified for ${input.fileName} (${requestId})`);
        processingDetails.authenticated = true;
      } catch (authError) {
        console.error(`❌ AUTHENTICATION FAILED: Token verification failed for ${input.fileName} (${requestId}):`, {
          error: authError instanceof Error ? authError.message : 'Unknown auth error',
          tokenLength: input.adminToken.length,
          tokenPrefix: input.adminToken.substring(0, 10)
        });
        
        throw createImageError(
          'Authentication failed - please log in again',
          'auth',
          {
            canRetry: false,
            suggestions: [
              'Log out and log in again',
              'Clear browser cache and cookies',
              'Check if your session has expired'
            ],
            details: { 
              uploadId, 
              requestId, 
              reason: 'auth_verification_failed',
              authError: authError instanceof Error ? authError.message : 'Unknown'
            }
          }
        );
      }
      
      // Ensure bucket exists
      await ensureBucket();
      processingDetails.bucketReady = true;
      
      // Parse and validate buffer with enhanced error handling
      let buffer: Buffer;
      try {
        console.log(`📊 PARSING FILE DATA: Processing base64 content for ${input.fileName} (${requestId})`);
        
        const base64Data = input.fileContent.includes('base64,') 
          ? input.fileContent.split('base64,')[1]
          : input.fileContent;
        
        if (!base64Data || base64Data.trim() === '') {
          throw new Error('Empty base64 data after parsing');
        }
        
        console.log(`📊 BASE64 PARSING: Decoded data details for ${input.fileName} (${requestId}):`, {
          originalLength: input.fileContent.length,
          base64Length: base64Data.length,
          hasDataPrefix: input.fileContent.includes('base64,'),
          estimatedFileSize: Math.round(base64Data.length * 0.75), // Approximate decoded size
        });
        
        buffer = Buffer.from(base64Data, 'base64');
        processingDetails.bufferSize = buffer.length;
        
        if (buffer.length === 0) {
          throw new Error('Empty buffer after base64 decoding');
        }
        
        if (buffer.length < 100) {
          throw new Error('Buffer too small - likely corrupted data');
        }

        console.log(`✅ FILE PARSING SUCCESS: Buffer created for ${input.fileName} (${requestId}):`, {
          bufferSize: buffer.length,
          bufferSizeMB: (buffer.length / (1024 * 1024)).toFixed(2),
          base64ToBufferRatio: (buffer.length / base64Data.length).toFixed(3),
        });
        
      } catch (parseError) {
        console.error(`❌ FILE PARSING FAILED: Base64 parsing error for ${input.fileName} (${requestId}):`, {
          error: parseError instanceof Error ? parseError.message : 'Unknown error',
          fileContentLength: input.fileContent?.length || 0,
          fileContentPrefix: input.fileContent ? input.fileContent.substring(0, 100) : 'none',
          hasBase64Prefix: input.fileContent?.includes('base64,') || false,
        });
        
        throw createImageError(
          'Invalid image data - upload may be corrupted or incomplete',
          'validation',
          {
            suggestions: [
              'Try uploading the file again',
              'Check your internet connection',
              'Try a different browser',
              'Ensure the file is not corrupted'
            ],
            details: { 
              uploadId, 
              requestId, 
              parseError: parseError instanceof Error ? parseError.message : 'Unknown',
              fileContentLength: input.fileContent?.length || 0
            }
          }
        );
      }
      
      // Enhanced validation with detailed diagnostics
      const validation = validateUploadLimits(buffer, input.fileName);
      processingDetails.validation = validation.details;
      
      if (!validation.valid) {
        console.error(`❌ ENHANCED UPLOAD: Validation failed for ${input.fileName} (ID: ${uploadId}):`, validation.error?.message);
        throw validation.error;
      }
      
      // Log warnings if any
      if (validation.warnings) {
        validation.warnings.forEach(warning => {
          console.warn(`⚠️ ENHANCED UPLOAD: ${input.fileName} (ID: ${uploadId}): ${warning}`);
        });
      }
      
      // Process image with enhanced error handling
      console.log(`🔧 ENHANCED UPLOAD: Processing image ${input.fileName} (ID: ${uploadId})`);
      const processed = await processImage(buffer, input.fileName);
      processingDetails.processing = processed.processingDetails;
      
      // Generate unique filename
      const uniqueFileName = `${randomUUID()}.${processed.extension}`;
      uploadedFileName = uniqueFileName;
      processingDetails.uniqueFileName = uniqueFileName;
      
      console.log(`📤 ENHANCED UPLOAD: Generated unique filename: ${uniqueFileName} for original: ${input.fileName} (ID: ${uploadId})`);
      console.log(`📤 ENHANCED UPLOAD: File details:`, {
        uploadId,
        originalName: input.fileName,
        uniqueName: uniqueFileName,
        originalSize: buffer.length,
        processedSize: processed.processedBuffer.length,
        contentType: processed.contentType,
        bucket: BUCKET_NAME,
        strategy: processed.processingDetails.strategy,
      });
      
      // Upload to storage with retry logic
      console.log(`📤 ENHANCED UPLOAD: Uploading to storage: ${uniqueFileName} (ID: ${uploadId})`);
      await uploadToStorage(uniqueFileName, processed.processedBuffer, processed.contentType);
      processingDetails.uploadedToStorage = true;
      
      // CRITICAL: Server-side verification before completing transaction
      console.log(`🔍 ENHANCED UPLOAD: Starting server-side verification for ${uniqueFileName} (ID: ${uploadId})`);
      const verification = await verifyFileExistsInStorage(uniqueFileName, processed.processedBuffer.length);
      
      if (!verification.exists) {
        console.error(`❌ ENHANCED UPLOAD: Server-side verification failed for ${uniqueFileName} (ID: ${uploadId}):`, verification.error);
        
        // Clean up uploaded file on verification failure
        try {
          await minioClient.removeObject(BUCKET_NAME, uniqueFileName);
          console.log(`🧹 ENHANCED UPLOAD: Cleaned up failed upload: ${uniqueFileName} (ID: ${uploadId})`);
        } catch (cleanupError) {
          console.error(`❌ ENHANCED UPLOAD: Failed to cleanup after verification failure (ID: ${uploadId}):`, cleanupError);
        }
        
        throw createImageError(
          `Upload completed but server verification failed: ${verification.error || 'File not accessible'}`,
          'storage',
          {
            retryAfter: 30,
            suggestions: [
              'Try uploading again - this may be a temporary storage issue',
              'Check server storage system status',
              'Contact support if the problem persists',
            ],
            details: { uploadId, verificationError: verification.error }
          }
        );
      }
      
      console.log(`✅ ENHANCED UPLOAD: Server-side verification successful for ${uniqueFileName} (ID: ${uploadId}):`, {
        actualSize: verification.actualSize,
        expectedSize: processed.processedBuffer.length,
        metadata: verification.metadata,
      });
      
      // Save to database with comprehensive metadata (only after verification)
      try {
        const { db } = await import("~/server/db");
        
        imageRecord = await db.image.create({
          data: {
            fileName: input.fileName,
            filePath: uniqueFileName,
            fileSize: processed.processedBuffer.length,
            mimeType: processed.contentType,
            width: processed.metadata.width,
            height: processed.metadata.height,
            originalSize: buffer.length,
            title: input.title,
            description: input.description,
            altText: input.altText,
            uploadedBy: 'admin',
            processingInfo: JSON.stringify({
              uploadId,
              originalSize: buffer.length,
              processedSize: processed.processedBuffer.length,
              processingTime: Date.now() - startTime,
              processingDetails: processed.processingDetails,
              validation: validation.details,
              serverMemoryAtUpload: getMemoryStats(),
              serverVerification: {
                verified: true,
                actualSize: verification.actualSize,
                verificationMetadata: verification.metadata,
              },
            }),
          },
        });
        
        processingDetails.databaseRecordId = imageRecord.id;
        console.log(`💾 ENHANCED UPLOAD: Database record created with ID: ${imageRecord.id} for ${uniqueFileName} (ID: ${uploadId})`);
        
      } catch (dbError) {
        console.error(`❌ ENHANCED UPLOAD: Database error for ${input.fileName} (ID: ${uploadId}):`, dbError);
        
        // Clean up uploaded file on database error (even though verification passed)
        try {
          await minioClient.removeObject(BUCKET_NAME, uniqueFileName);
          console.log(`🧹 ENHANCED UPLOAD: Cleaned up uploaded file after database error: ${uniqueFileName} (ID: ${uploadId})`);
        } catch (cleanupError) {
          console.error(`❌ ENHANCED UPLOAD: Failed to cleanup after database error (ID: ${uploadId}):`, cleanupError);
        }
        
        throw createImageError(
          'File uploaded and verified successfully but failed to save metadata to database',
          'storage',
          {
            retryAfter: 30,
            suggestions: [
              'Try uploading again in a few moments',
              'Contact support if the problem persists'
            ],
            details: { uploadId, dbError: dbError instanceof Error ? dbError.message : 'Unknown' }
          }
        );
      }
      
      const totalTime = Date.now() - startTime;
      processingDetails.totalTime = totalTime;
      
      console.log(`✅ ENHANCED UPLOAD: Upload completed successfully for ${input.fileName} -> ${uniqueFileName} (${uploadId}, ${requestId}) in ${totalTime}ms`);
      
      // Log success metrics
      const originalMB = (buffer.length / (1024 * 1024)).toFixed(1);
      const processedMB = (processed.processedBuffer.length / (1024 * 1024)).toFixed(1);
      const compressionRatio = (buffer.length / processed.processedBuffer.length).toFixed(2);
      
      console.log(`📊 ENHANCED UPLOAD: Success metrics (${uploadId}, ${requestId}):`, {
        originalSize: `${originalMB}MB`,
        processedSize: `${processedMB}MB`,
        compressionRatio: `${compressionRatio}x`,
        processingTime: `${totalTime}ms`,
        strategy: processed.processingDetails.strategy,
        serverVerification: 'passed',
        databaseRecordId: imageRecord.id,
        finalFilePath: uniqueFileName,
      });
      
      // Enhanced response object with comprehensive metadata
      const responseData = {
        success: true,
        filePath: uniqueFileName,
        imageId: imageRecord.id,
        message: 'Image uploaded successfully with enhanced processing and server verification',
        metadata: {
          originalSize: buffer.length,
          processedSize: processed.processedBuffer.length,
          contentType: processed.contentType,
          dimensions: processed.metadata,
          processingTime: totalTime,
          compressionRatio: buffer.length / processed.processedBuffer.length,
          strategy: processed.processingDetails.strategy,
          uploadId,
          requestId,
          serverVerification: {
            verified: true,
            actualSize: verification.actualSize,
            verificationTime: verification.metadata?.verificationTime || 0,
          },
          timestamp: new Date().toISOString(),
        },
        warnings: validation.warnings,
      };
      
      console.log(`📤 RESPONSE SENT: Sending success response for ${input.fileName} (${uploadId}, ${requestId}):`, {
        responseSize: JSON.stringify(responseData).length,
        filePath: responseData.filePath,
        filePathLength: responseData.filePath.length,
        success: responseData.success,
        hasMetadata: !!responseData.metadata,
        hasWarnings: !!(responseData.warnings && responseData.warnings.length > 0),
      });
      
      return responseData;
      
    } catch (error) {
      const totalTime = Date.now() - startTime;
      processingDetails.totalTime = totalTime;
      processingDetails.failed = true;
      processingDetails.error = error instanceof Error ? error.message : 'Unknown error';
      
      console.error(`❌ ENHANCED UPLOAD: Upload failed for ${input.fileName} (${uploadId}, ${requestId}) after ${totalTime}ms:`, {
        error: processingDetails.error,
        category: (error as ImageUploadError)?.category,
        canRetry: (error as ImageUploadError)?.canRetry,
        httpStatus: (error as ImageUploadError)?.httpStatus,
        processingDetails,
        errorStack: error instanceof Error ? error.stack : 'No stack trace',
        memoryUsage: process.memoryUsage(),
      });
      
      // Enhanced cleanup on failure
      if (uploadedFileName) {
        try {
          await minioClient.removeObject(BUCKET_NAME, uploadedFileName);
          console.log(`🧹 ENHANCED UPLOAD: Cleaned up failed upload: ${uploadedFileName} (${uploadId}, ${requestId})`);
        } catch (cleanupError) {
          console.error(`❌ ENHANCED UPLOAD: Failed to cleanup failed upload (${uploadId}, ${requestId}):`, {
            error: cleanupError instanceof Error ? cleanupError.message : 'Unknown cleanup error',
            fileName: uploadedFileName,
          });
        }
      }
      
      // Memory cleanup on failure
      if (global.gc) {
        global.gc();
      }
      
      // Re-throw ImageUploadError as-is for proper client handling
      if (error instanceof Error && 'category' in error) {
        const uploadError = error as ImageUploadError;
        
        // Add upload context to error details
        uploadError.details = {
          ...uploadError.details,
          uploadId,
          requestId,
          processingDetails,
          timestamp: new Date().toISOString(),
        };
        
        console.error(`📤 ERROR RESPONSE: Sending error response for ${input.fileName} (${uploadId}, ${requestId}):`, {
          errorMessage: uploadError.message,
          errorCategory: uploadError.category,
          canRetry: uploadError.canRetry,
          httpStatus: uploadError.httpStatus,
          suggestions: uploadError.suggestions,
        });
        
        throw uploadError;
      }
      
      // Wrap unexpected errors
      const wrappedError = createImageError(
        error instanceof Error ? error.message : 'Upload failed unexpectedly',
        'processing',
        {
          suggestions: [
            'Try uploading the image again',
            'Try converting to JPEG or PNG format',
            'Reduce the image file size',
            'Contact support if the problem persists'
          ],
          details: { uploadId, requestId, processingDetails }
        }
      );
      
      console.error(`📤 ERROR RESPONSE: Sending wrapped error response for ${input.fileName} (${uploadId}, ${requestId}):`, {
        errorMessage: wrappedError.message,
        errorCategory: wrappedError.category,
        originalError: error instanceof Error ? error.message : 'Unknown',
      });
      
      throw wrappedError;
    }
  });

// Emergency basic upload endpoint with minimal processing
export const emergencyUploadImage = baseProcedure
  .input(z.object({
    adminToken: z.string(),
    fileName: z.string().min(1).max(255),
    fileContent: z.string().min(1),
    fileType: z.string().regex(/^image\//, "File must be an image"),
  }))
  .mutation(async ({ input }) => {
    const startTime = Date.now();
    const emergencyId = `emergency_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`🚨 EMERGENCY UPLOAD: Starting emergency upload for ${input.fileName} (ID: ${emergencyId})`);
    
    try {
      // Basic authentication check
      await requireAdminAuth(input.adminToken);
      
      // Minimal file processing - just parse and store
      const base64Data = input.fileContent.includes('base64,') 
        ? input.fileContent.split('base64,')[1]
        : input.fileContent;
      
      const buffer = Buffer.from(base64Data, 'base64');
      
      console.log(`🚨 EMERGENCY UPLOAD: Basic processing for ${input.fileName} (${emergencyId}):`, {
        bufferSize: buffer.length,
        bufferSizeMB: (buffer.length / (1024 * 1024)).toFixed(2),
      });
      
      // Skip complex processing - just basic validation
      if (buffer.length === 0) {
        throw new Error('Empty file data');
      }
      
      if (buffer.length > 50 * 1024 * 1024) { // 50MB emergency limit
        throw new Error('File too large for emergency upload (max 50MB)');
      }
      
      // Generate simple filename
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substr(2, 6);
      const extension = input.fileName.split('.').pop() || 'jpg';
      const emergencyFileName = `emergency_${timestamp}_${randomSuffix}.${extension}`;
      
      // Direct upload to storage without processing
      await ensureBucket();
      
      console.log(`🚨 EMERGENCY UPLOAD: Uploading to storage: ${emergencyFileName} (${emergencyId})`);
      
      await minioClient.putObject(BUCKET_NAME, emergencyFileName, buffer, buffer.length, {
        'Content-Type': input.fileType,
        'X-Emergency-Upload': 'true',
        'X-Upload-Timestamp': new Date().toISOString(),
        'X-Emergency-ID': emergencyId,
      });
      
      // Basic database record
      const { db } = await import("~/server/db");
      
      const imageRecord = await db.image.create({
        data: {
          fileName: input.fileName,
          filePath: emergencyFileName,
          fileSize: buffer.length,
          mimeType: input.fileType,
          width: null, // Skip dimension detection for emergency
          height: null,
          originalSize: buffer.length,
          uploadedBy: 'admin',
          processingInfo: JSON.stringify({
            emergencyUpload: true,
            emergencyId,
            originalFileName: input.fileName,
            uploadTime: Date.now() - startTime,
            processingStrategy: 'emergency-minimal',
          }),
        },
      });
      
      const totalTime = Date.now() - startTime;
      
      console.log(`✅ EMERGENCY UPLOAD: Completed successfully for ${input.fileName} -> ${emergencyFileName} (${emergencyId}) in ${totalTime}ms`);
      
      return {
        success: true,
        filePath: emergencyFileName,
        imageId: imageRecord.id,
        message: 'Emergency upload completed with minimal processing',
        metadata: {
          emergencyUpload: true,
          emergencyId,
          originalSize: buffer.length,
          processedSize: buffer.length,
          processingTime: totalTime,
          strategy: 'emergency-minimal',
        },
        warnings: ['This was an emergency upload with minimal processing and validation'],
      };
      
    } catch (error) {
      const totalTime = Date.now() - startTime;
      
      console.error(`❌ EMERGENCY UPLOAD: Failed for ${input.fileName} (${emergencyId}) after ${totalTime}ms:`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
      });
      
      throw createImageError(
        `Emergency upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'processing',
        {
          suggestions: [
            'Try the normal upload process',
            'Reduce file size and try again',
            'Contact support if the problem persists'
          ],
          details: { emergencyId, processingTime: totalTime }
        }
      );
    }
  });

// Bulk upload (simplified)
export const adminBulkUploadImages = baseProcedure
  .input(bulkImageUploadInputSchema)
  .mutation(async ({ input }) => {
    const startTime = Date.now();
    
    try {
      await requireAdminAuth(input.adminToken);
      console.log(`Starting bulk upload: ${input.images.length} images`);
      
      // Memory check for bulk operations
      const memoryStats = getMemoryStats();
      if (memoryStats.system.pressure === 'critical') {
        throw createImageError(`System memory usage too high (${memoryStats.rss.toFixed(1)}MB) for bulk upload`, 'memory');
      }
      
      await ensureBucket();
      
      const results = [];
      const errors = [];
      
      // Process images one by one to manage memory
      for (let i = 0; i < input.images.length; i++) {
        const image = input.images[i];
        
        try {
          console.log(`Processing bulk image ${i + 1}/${input.images.length}: ${image.fileName}`);
          
          // Use single upload logic
          const result = await adminUploadImage.resolver({
            input: {
              adminToken: input.adminToken,
              ...image,
            },
            ctx: {} as any,
          });
          
          results.push({
            fileName: image.fileName,
            success: true,
            ...result,
          });
          
        } catch (error) {
          console.error(`Bulk upload failed for ${image.fileName}:`, error);
          
          errors.push({
            fileName: image.fileName,
            error: error instanceof Error ? error.message : 'Upload failed',
          });
        }
        
        // Brief pause between uploads to prevent memory pressure
        if (i < input.images.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          if (global.gc) global.gc();
        }
      }
      
      const totalTime = Date.now() - startTime;
      console.log(`Bulk upload completed: ${results.length} successful, ${errors.length} failed in ${totalTime}ms`);
      
      return {
        success: true,
        results,
        errors,
        totalProcessed: input.images.length,
        successCount: results.length,
        errorCount: errors.length,
        processingTime: totalTime,
      };
      
    } catch (error) {
      console.error('Bulk upload error:', error);
      throw error;
    }
  });

// Enhanced image retrieval with proper binary response, CORS headers, and improved caching
export const getImage = baseProcedure
  .input(z.object({
    filePath: z.string().min(1, "File path is required"),
  }))
  .query(async ({ input }) => {
    const { filePath } = input;
    
    try {
      // Enhanced security check
      if (filePath.includes('..') || filePath.includes('/') || filePath.includes('\\') || filePath.includes('\0')) {
        throw createImageError('Invalid file path - security violation detected', 'validation', { canRetry: false });
      }
      
      // Validate file path format (should be UUID.extension)
      const filePathRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.(jpg|jpeg|png|gif|webp|bmp|tiff|svg|avif)$/i;
      if (!filePathRegex.test(filePath)) {
        console.warn(`Invalid file path format: ${filePath}`);
        throw createImageError('Invalid file path format', 'validation', { canRetry: false });
      }
      
      console.log(`📷 Serving image: ${filePath}`);
      
      // Get from storage with enhanced error handling
      let stream;
      try {
        stream = await minioClient.getObject(BUCKET_NAME, filePath);
      } catch (storageError: any) {
        console.error(`Storage retrieval error for ${filePath}:`, storageError);
        
        if (storageError.code === 'NoSuchKey' || storageError.message?.includes('NoSuchKey')) {
          throw createImageError('Image not found in storage', 'storage', { canRetry: false });
        }
        
        throw createImageError('Storage system temporarily unavailable', 'storage', { canRetry: true, retryAfter: 30 });
      }
      
      // Convert stream to buffer with size limits
      const chunks: Buffer[] = [];
      let totalSize = 0;
      const maxImageSize = 100 * 1024 * 1024; // 100MB limit for serving
      
      for await (const chunk of stream) {
        totalSize += chunk.length;
        
        if (totalSize > maxImageSize) {
          throw createImageError('Image too large to serve', 'size_limit', { canRetry: false });
        }
        
        chunks.push(chunk);
      }
      
      const buffer = Buffer.concat(chunks);
      
      if (buffer.length === 0) {
        throw createImageError('Empty image file in storage', 'storage', { canRetry: false });
      }
      
      // Get enhanced file metadata including proper MIME type
      let contentType = 'image/jpeg'; // Default fallback
      let cacheControl = 'public, max-age=31536000, immutable'; // 1 year cache
      
      try {
        const stat = await minioClient.statObject(BUCKET_NAME, filePath);
        if (stat.metaData?.['content-type']) {
          contentType = stat.metaData['content-type'];
        } else {
          // Detect content type from file extension if not stored
          const extension = filePath.toLowerCase().split('.').pop();
          const extensionToMimeType: Record<string, string> = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'bmp': 'image/bmp',
            'tiff': 'image/tiff',
            'tif': 'image/tiff',
            'svg': 'image/svg+xml',
            'avif': 'image/avif',
          };
          
          if (extension && extensionToMimeType[extension]) {
            contentType = extensionToMimeType[extension];
          }
        }
      } catch (statError) {
        console.warn(`Failed to get metadata for ${filePath}, using extension-based detection:`, statError);
        
        // Fallback: detect from extension
        const extension = filePath.toLowerCase().split('.').pop();
        const extensionToMimeType: Record<string, string> = {
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'gif': 'image/gif',
          'webp': 'image/webp',
          'bmp': 'image/bmp',
          'tiff': 'image/tiff',
          'tif': 'image/tiff',
          'svg': 'image/svg+xml',
          'avif': 'image/avif',
        };
        
        if (extension && extensionToMimeType[extension]) {
          contentType = extensionToMimeType[extension];
        }
      }
      
      // Enhanced content type validation
      if (!contentType.startsWith('image/')) {
        console.warn(`Invalid content type detected: ${contentType}, forcing to image/jpeg`);
        contentType = 'image/jpeg';
      }
      
      // Validate that the buffer actually contains image data
      const isValidImage = await validateImageBuffer(buffer, contentType);
      if (!isValidImage) {
        console.error(`Invalid image data detected for ${filePath}`);
        throw createImageError('Corrupted image data in storage', 'storage', { canRetry: false });
      }
      
      console.log(`✅ Successfully serving image: ${filePath} (${(buffer.length / 1024).toFixed(1)}KB, ${contentType})`);
      
      // Enhanced headers for better cross-origin support and caching
      const headers = new Headers({
        'Content-Type': contentType,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': cacheControl,
        'ETag': `"${filePath}-${buffer.length}"`,
        'Last-Modified': new Date().toUTCString(),
        'X-Content-Type-Options': 'nosniff',
        'X-Image-Path': filePath,
        'X-Image-Size': buffer.length.toString(),
        
        // Enhanced CORS headers for cross-origin image access
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Expose-Headers': 'Content-Type, Content-Length, ETag, Last-Modified, X-Image-Path, X-Image-Size',
        'Access-Control-Max-Age': '86400', // 24 hours
        
        // Additional headers for better browser compatibility
        'Vary': 'Accept-Encoding, Origin',
        'X-Robots-Tag': 'noindex', // Prevent search engine indexing of direct image URLs
        
        // Security headers
        'X-Frame-Options': 'SAMEORIGIN',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
      });
      
      // Return binary data with enhanced headers
      return new Response(buffer, {
        status: 200,
        headers,
      });
      
    } catch (error) {
      console.error(`❌ Image serving error for ${filePath}:`, error);
      
      // Enhanced error categorization for better client handling
      if (error instanceof Error && 'category' in error) {
        throw error; // Re-throw ImageUploadError as-is
      }
      
      if (error instanceof Error) {
        if (error.message.includes('NoSuchKey') || error.message.includes('not found')) {
          throw createImageError('Image not found', 'storage', { canRetry: false });
        }
        
        if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
          throw createImageError('Storage timeout - please try again', 'storage', { canRetry: true, retryAfter: 10 });
        }
        
        if (error.message.includes('connection') || error.message.includes('ECONNRESET')) {
          throw createImageError('Storage connection issue - please try again', 'storage', { canRetry: true, retryAfter: 5 });
        }
      }
      
      throw createImageError(
        error instanceof Error ? error.message : 'Failed to retrieve image',
        'storage',
        { canRetry: true, retryAfter: 30 }
      );
    }
  });

// Enhanced image variant retrieval with proper binary response, CORS headers, and improved caching
export const getImageVariant = baseProcedure
  .input(z.object({
    filePath: z.string().min(1, "File path is required"),
    variantType: z.enum(['thumbnail', 'small', 'medium', 'large', 'original']).optional(),
  }))
  .query(async ({ input }) => {
    const { filePath, variantType } = input;
    
    try {
      // Enhanced security check
      if (filePath.includes('..') || filePath.includes('/') || filePath.includes('\\') || filePath.includes('\0')) {
        throw createImageError('Invalid file path - security violation detected', 'validation', { canRetry: false });
      }
      
      // Validate file path format (should be UUID.extension)
      const filePathRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.(jpg|jpeg|png|gif|webp|bmp|tiff|svg|avif)$/i;
      if (!filePathRegex.test(filePath)) {
        console.warn(`Invalid file path format: ${filePath}`);
        throw createImageError('Invalid file path format', 'validation', { canRetry: false });
      }
      
      console.log(`📷 Serving image variant: ${filePath} (variant: ${variantType || 'original'})`);
      
      // If no variant type specified or 'original', serve the original image
      if (!variantType || variantType === 'original') {
        return getImage.resolver({ input: { filePath }, ctx: {} as any });
      }
      
      // Try to find the variant in the database
      const { db } = await import("~/server/db");
      
      const image = await db.image.findUnique({
        where: { filePath },
        include: {
          variants: {
            where: { variantType },
            take: 1,
          },
        },
      });
      
      if (!image) {
        console.warn(`Image not found in database: ${filePath}`);
        // Fallback to original image
        return getImage.resolver({ input: { filePath }, ctx: {} as any });
      }
      
      // If variant exists, serve it
      if (image.variants.length > 0) {
        const variant = image.variants[0];
        console.log(`📷 Serving existing variant: ${variant.filePath} (${variantType})`);
        return getImage.resolver({ input: { filePath: variant.filePath }, ctx: {} as any });
      }
      
      // If variant doesn't exist, serve original image as fallback
      console.log(`📷 Variant ${variantType} not found for ${filePath}, serving original`);
      return getImage.resolver({ input: { filePath }, ctx: {} as any });
      
    } catch (error) {
      console.error(`❌ Image variant serving error for ${filePath} (${variantType}):`, error);
      
      // Enhanced error categorization for better client handling
      if (error instanceof Error && 'category' in error) {
        throw error; // Re-throw ImageUploadError as-is
      }
      
      if (error instanceof Error) {
        if (error.message.includes('NoSuchKey') || error.message.includes('not found')) {
          throw createImageError('Image variant not found', 'storage', { canRetry: false });
        }
        
        if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
          throw createImageError('Storage timeout - please try again', 'storage', { canRetry: true, retryAfter: 10 });
        }
        
        if (error.message.includes('connection') || error.message.includes('ECONNRESET')) {
          throw createImageError('Storage connection issue - please try again', 'storage', { canRetry: true, retryAfter: 5 });
        }
      }
      
      throw createImageError(
        error instanceof Error ? error.message : 'Failed to retrieve image variant',
        'storage',
        { canRetry: true, retryAfter: 30 }
      );
    }
  });

// Image deletion (simplified)
export const adminDeleteImage = baseProcedure
  .input(z.object({
    adminToken: z.string(),
    filePath: z.string().min(1, "File path is required"),
  }))
  .mutation(async ({ input }) => {
    try {
      await requireAdminAuth(input.adminToken);
      
      const { filePath } = input;
      console.log(`Deleting image: ${filePath}`);
      
      // Delete from storage
      try {
        await minioClient.removeObject(BUCKET_NAME, filePath);
        console.log(`Deleted from storage: ${filePath}`);
      } catch (storageError) {
        console.error(`Storage deletion failed for ${filePath}:`, storageError);
        // Continue with database cleanup even if storage deletion fails
      }
      
      // Delete from database
      try {
        const { db } = await import("~/server/db");
        
        await db.image.delete({
          where: { filePath },
        });
        
        console.log(`Deleted from database: ${filePath}`);
        
      } catch (dbError) {
        console.error(`Database deletion failed for ${filePath}:`, dbError);
        throw createImageError('Failed to delete image record', 'storage');
      }
      
      return {
        success: true,
        message: 'Image deleted successfully',
      };
      
    } catch (error) {
      console.error(`Image deletion error for ${input.filePath}:`, error);
      throw error;
    }
  });

// Enhanced image listing with proper filtering, sorting, and pagination
export const adminListImages = baseProcedure
  .input(z.object({
    adminToken: z.string(),
    page: z.number().min(1).default(1),
    pageSize: z.number().min(1).max(50).default(20),
    search: z.string().optional(),
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
    sortBy: z.enum(['createdAt', 'fileName', 'fileSize', 'usageCount']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
    includeVariants: z.boolean().default(false),
    includeArchived: z.boolean().default(false),
  }))
  .query(async ({ input }) => {
    try {
      await requireAdminAuth(input.adminToken);
      
      const { page, pageSize, search, category, tags, sortBy, sortOrder, includeVariants, includeArchived } = input;
      
      const { db } = await import("~/server/db");
      
      // Build where clause
      const where: any = {};
      
      // Add archived filter
      if (!includeArchived) {
        where.archived = false;
      }
      
      // Add search filter
      if (search) {
        where.OR = [
          { fileName: { contains: search, mode: 'insensitive' } },
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { altText: { contains: search, mode: 'insensitive' } },
        ];
      }
      
      // Add category filter
      if (category) {
        where.category = category;
      }
      
      // Add tags filter (search in JSON string)
      if (tags && tags.length > 0) {
        where.OR = where.OR || [];
        tags.forEach(tag => {
          where.OR.push({
            tags: { contains: tag, mode: 'insensitive' }
          });
        });
      }
      
      // Get total count
      const totalCount = await db.image.count({ where });
      
      // Build order by
      const orderBy: any = {};
      orderBy[sortBy] = sortOrder;
      
      // Get images with optional variants
      const images = await db.image.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          variants: includeVariants ? {
            orderBy: { variantType: 'asc' },
          } : false,
        },
      });
      
      // Process images to ensure proper data format
      const processedImages = images.map(image => {
        // Parse tags safely
        let parsedTags: string[] = [];
        try {
          if (image.tags) {
            parsedTags = JSON.parse(image.tags);
            if (!Array.isArray(parsedTags)) {
              parsedTags = [];
            }
          }
        } catch (error) {
          console.warn(`Failed to parse tags for image ${image.id}:`, error);
          parsedTags = [];
        }
        
        return {
          ...image,
          tags: parsedTags,
          // Ensure variants are properly formatted
          variants: image.variants ? image.variants.map(variant => ({
            variantType: variant.variantType,
            width: variant.width,
            height: variant.height,
            fileSize: variant.fileSize,
            format: variant.format,
          })) : undefined,
        };
      });
      
      console.log(`📋 Listed ${processedImages.length} images (page ${page}/${Math.ceil(totalCount / pageSize)})`);
      
      return {
        success: true,
        images: processedImages,
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages: Math.ceil(totalCount / pageSize),
          hasNextPage: page * pageSize < totalCount,
          hasPreviousPage: page > 1,
        },
      };
      
    } catch (error) {
      console.error('Image listing error:', error);
      
      if (error instanceof Error && 'category' in error) {
        throw error;
      }
      
      throw createImageError('Failed to list images', 'storage');
    }
  });
