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
      emergencyMemoryCleanup(`before processing ${fileName}`);
      
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

// Enhanced single image upload with comprehensive error handling and logging
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
    
    // Enhanced logging for debugging
    console.log(`🚀 Starting enhanced upload: ${input.fileName} (ID: ${uploadId})`);
    
    let imageRecord: any = null;
    let uploadedFileName: string | null = null;
    let processingDetails: Record<string, any> = {
      uploadId,
      fileName: input.fileName,
      fileType: input.fileType,
      startTime,
    };
    
    try {
      // Authenticate
      await requireAdminAuth(input.adminToken);
      processingDetails.authenticated = true;
      
      // Ensure bucket exists
      await ensureBucket();
      processingDetails.bucketReady = true;
      
      // Parse and validate buffer with enhanced error handling
      let buffer: Buffer;
      try {
        const base64Data = input.fileContent.includes('base64,') 
          ? input.fileContent.split('base64,')[1]
          : input.fileContent;
        
        buffer = Buffer.from(base64Data, 'base64');
        processingDetails.bufferSize = buffer.length;
        
        if (buffer.length === 0) {
          throw new Error('Empty image data');
        }

        console.log(`📊 Parsed image data: ${(buffer.length / (1024 * 1024)).toFixed(1)}MB (ID: ${uploadId})`);
        
      } catch (parseError) {
        console.error(`❌ Base64 parsing error for ${input.fileName} (ID: ${uploadId}):`, parseError);
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
            details: { uploadId, parseError: parseError instanceof Error ? parseError.message : 'Unknown' }
          }
        );
      }
      
      // Enhanced validation with detailed diagnostics
      const validation = validateUploadLimits(buffer, input.fileName);
      processingDetails.validation = validation.details;
      
      if (!validation.valid) {
        console.error(`❌ Validation failed for ${input.fileName} (ID: ${uploadId}):`, validation.error?.message);
        throw validation.error;
      }
      
      // Log warnings if any
      if (validation.warnings) {
        validation.warnings.forEach(warning => {
          console.warn(`⚠️ ${input.fileName} (ID: ${uploadId}): ${warning}`);
        });
      }
      
      // Process image with enhanced error handling
      console.log(`🔧 Processing image: ${input.fileName} (ID: ${uploadId})`);
      const processed = await processImage(buffer, input.fileName);
      processingDetails.processing = processed.processingDetails;
      
      // Generate unique filename
      const uniqueFileName = `${randomUUID()}.${processed.extension}`;
      uploadedFileName = uniqueFileName;
      processingDetails.uniqueFileName = uniqueFileName;
      
      // Upload to storage with retry logic
      console.log(`📤 Uploading to storage: ${uniqueFileName} (ID: ${uploadId})`);
      await uploadToStorage(uniqueFileName, processed.processedBuffer, processed.contentType);
      processingDetails.uploadedToStorage = true;
      
      // Save to database with comprehensive metadata
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
            }),
          },
        });
        
        processingDetails.databaseRecordId = imageRecord.id;
        console.log(`💾 Database record created: ${imageRecord.id} (ID: ${uploadId})`);
        
      } catch (dbError) {
        console.error(`❌ Database error for ${input.fileName} (ID: ${uploadId}):`, dbError);
        
        // Clean up uploaded file on database error
        try {
          await minioClient.removeObject(BUCKET_NAME, uniqueFileName);
          console.log(`🧹 Cleaned up uploaded file after database error: ${uniqueFileName} (ID: ${uploadId})`);
        } catch (cleanupError) {
          console.error(`❌ Failed to cleanup after database error (ID: ${uploadId}):`, cleanupError);
        }
        
        throw createImageError(
          'Failed to save image metadata to database. Please try again.',
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
      
      console.log(`✅ Enhanced upload completed: ${input.fileName} (ID: ${uploadId}) in ${totalTime}ms`);
      
      // Log success metrics
      const originalMB = (buffer.length / (1024 * 1024)).toFixed(1);
      const processedMB = (processed.processedBuffer.length / (1024 * 1024)).toFixed(1);
      const compressionRatio = (buffer.length / processed.processedBuffer.length).toFixed(2);
      
      console.log(`📊 Upload metrics (ID: ${uploadId}):`, {
        originalSize: `${originalMB}MB`,
        processedSize: `${processedMB}MB`,
        compressionRatio: `${compressionRatio}x`,
        processingTime: `${totalTime}ms`,
        strategy: processed.processingDetails.strategy
      });
      
      return {
        success: true,
        filePath: uniqueFileName,
        imageId: imageRecord.id,
        message: 'Image uploaded successfully with enhanced processing',
        metadata: {
          originalSize: buffer.length,
          processedSize: processed.processedBuffer.length,
          contentType: processed.contentType,
          dimensions: processed.metadata,
          processingTime: totalTime,
          compressionRatio: buffer.length / processed.processedBuffer.length,
          strategy: processed.processingDetails.strategy,
          uploadId,
        },
        warnings: validation.warnings,
      };
      
    } catch (error) {
      const totalTime = Date.now() - startTime;
      processingDetails.totalTime = totalTime;
      processingDetails.failed = true;
      processingDetails.error = error instanceof Error ? error.message : 'Unknown error';
      
      console.error(`❌ Enhanced upload failed for ${input.fileName} (ID: ${uploadId}) after ${totalTime}ms:`, {
        error: processingDetails.error,
        category: (error as ImageUploadError)?.category,
        canRetry: (error as ImageUploadError)?.canRetry,
        processingDetails
      });
      
      // Enhanced cleanup on failure
      if (uploadedFileName) {
        try {
          await minioClient.removeObject(BUCKET_NAME, uploadedFileName);
          console.log(`🧹 Cleaned up failed upload: ${uploadedFileName} (ID: ${uploadId})`);
        } catch (cleanupError) {
          console.error(`❌ Failed to cleanup failed upload (ID: ${uploadId}):`, cleanupError);
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
          processingDetails,
        };
        
        throw uploadError;
      }
      
      // Wrap unexpected errors
      throw createImageError(
        error instanceof Error ? error.message : 'Upload failed unexpectedly',
        'processing',
        {
          suggestions: [
            'Try uploading the image again',
            'Try converting to JPEG or PNG format',
            'Reduce the image file size',
            'Contact support if the problem persists'
          ],
          details: { uploadId, processingDetails }
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

// Image retrieval (simplified)
export const getImage = baseProcedure
  .input(z.object({
    filePath: z.string().min(1, "File path is required"),
  }))
  .query(async ({ input }) => {
    const { filePath } = input;
    
    try {
      // Security check
      if (filePath.includes('..') || filePath.includes('/') || filePath.includes('\\')) {
        throw createImageError('Invalid file path', 'validation', { canRetry: false });
      }
      
      // Get from storage
      const stream = await minioClient.getObject(BUCKET_NAME, filePath);
      
      // Convert stream to buffer
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      
      const buffer = Buffer.concat(chunks);
      
      if (buffer.length === 0) {
        throw createImageError('Empty image file', 'storage', { canRetry: false });
      }
      
      // Get file metadata
      let contentType = 'image/jpeg';
      try {
        const stat = await minioClient.statObject(BUCKET_NAME, filePath);
        contentType = stat.metaData?.['content-type'] || 'image/jpeg';
      } catch (statError) {
        console.warn(`Failed to get metadata for ${filePath}:`, statError);
      }
      
      // Convert to base64 for transmission
      const base64 = buffer.toString('base64');
      
      return {
        success: true,
        data: `data:${contentType};base64,${base64}`,
        contentType,
        size: buffer.length,
        filePath,
      };
      
    } catch (error) {
      console.error(`Image retrieval error for ${filePath}:`, error);
      
      if (error instanceof Error && error.message.includes('NoSuchKey')) {
        throw createImageError('Image not found', 'storage', { canRetry: false });
      }
      
      throw createImageError(
        error instanceof Error ? error.message : 'Failed to retrieve image',
        'storage'
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

// Image listing (simplified)
export const adminListImages = baseProcedure
  .input(z.object({
    adminToken: z.string(),
    page: z.number().min(1).default(1),
    pageSize: z.number().min(1).max(50).default(20),
    search: z.string().optional(),
  }))
  .query(async ({ input }) => {
    try {
      await requireAdminAuth(input.adminToken);
      
      const { page, pageSize, search } = input;
      
      const { db } = await import("~/server/db");
      
      // Build where clause
      const where: any = {};
      if (search) {
        where.OR = [
          { fileName: { contains: search, mode: 'insensitive' } },
          { title: { contains: search, mode: 'insensitive' } },
        ];
      }
      
      // Get total count
      const totalCount = await db.image.count({ where });
      
      // Get images
      const images = await db.image.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      });
      
      return {
        success: true,
        images,
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages: Math.ceil(totalCount / pageSize),
        },
      };
      
    } catch (error) {
      console.error('Image listing error:', error);
      throw createImageError('Failed to list images', 'storage');
    }
  });
