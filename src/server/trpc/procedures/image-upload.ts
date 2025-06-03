import { baseProcedure } from "~/server/trpc/main";
import { requireAdminAuth } from "./auth";
import * as z from "zod";
import { randomUUID } from "crypto";
import { Client } from "minio";
import sharp from "sharp";
import { PrismaClientKnownRequestError, PrismaClientUnknownRequestError } from "@prisma/client/runtime/library";

// Enhanced error types for better error handling
interface ProcessingError extends Error {
  code?: string;
  originalError?: Error;
  context?: Record<string, any>;
}

interface DatabaseError extends Error {
  code?: string;
  constraint?: string;
  table?: string;
}

interface StorageError extends Error {
  bucketName?: string;
  objectName?: string;
  statusCode?: number;
}

const minioClient = new Client({
  endPoint: 'minio',
  port: 9000,
  useSSL: false,
  accessKey: 'minioadmin',
  secretKey: 'minioadmin',
});

const BUCKET_NAME = 'images';

const imageUploadInputSchema = z.object({
  adminToken: z.string(),
  fileName: z.string().min(1, "File name is required"),
  fileContent: z.string().min(1, "File content is required"), // base64 encoded
  fileType: z.string().regex(/^image\//, "File must be an image"),
});

// Enhanced error handling utilities
const createProcessingError = (message: string, originalError?: Error, context?: Record<string, any>): ProcessingError => {
  const error = new Error(message) as ProcessingError;
  error.name = 'ProcessingError';
  error.originalError = originalError;
  error.context = context;
  if (originalError) {
    error.stack = originalError.stack;
  }
  return error;
};

const createDatabaseError = (message: string, originalError?: Error, context?: Record<string, any>): DatabaseError => {
  const error = new Error(message) as DatabaseError;
  error.name = 'DatabaseError';
  
  // Extract Prisma-specific error information
  if (originalError && 'code' in originalError) {
    error.code = (originalError as any).code;
  }
  if (originalError && 'meta' in originalError) {
    const meta = (originalError as any).meta;
    error.constraint = meta?.constraint;
    error.table = meta?.table;
  }
  
  return error;
};

const createStorageError = (message: string, originalError?: Error, bucketName?: string, objectName?: string): StorageError => {
  const error = new Error(message) as StorageError;
  error.name = 'StorageError';
  error.bucketName = bucketName;
  error.objectName = objectName;
  
  if (originalError && 'statusCode' in originalError) {
    error.statusCode = (originalError as any).statusCode;
  }
  
  return error;
};

// Enhanced memory management utilities with more reasonable thresholds for production
const checkMemoryUsage = (): { used: number; total: number; percentage: number; rss: number; external: number } => {
  const usage = process.memoryUsage();
  const totalMB = usage.heapTotal / 1024 / 1024;
  const usedMB = usage.heapUsed / 1024 / 1024;
  const rssMB = usage.rss / 1024 / 1024;
  const externalMB = usage.external / 1024 / 1024;
  return {
    used: usedMB,
    total: totalMB,
    percentage: (usedMB / totalMB) * 100,
    rss: rssMB,
    external: externalMB
  };
};

const isMemoryStressed = (): boolean => {
  const memory = checkMemoryUsage();
  // More reasonable memory thresholds for production stability
  // Consider memory stressed if heap usage > 75% OR RSS > 2.5GB OR external > 512MB
  return memory.percentage > 75 || memory.rss > 2560 || memory.external > 512;
};

const forceGarbageCollection = (): void => {
  if (global.gc) {
    try {
      global.gc();
      console.log('Forced garbage collection completed');
    } catch (error) {
      console.warn('Failed to force garbage collection:', error);
    }
  } else {
    // Try to trigger GC by creating memory pressure
    try {
      const memoryPressure = new Array(1000).fill(null);
      memoryPressure.length = 0;
    } catch (error) {
      // Ignore errors from memory pressure attempt
    }
  }
};

// Enhanced cleanup function with more aggressive memory management
const cleanupResources = (): void => {
  // Force multiple GC cycles for better cleanup
  forceGarbageCollection();
  
  // Additional cleanup after a brief delay
  setTimeout(() => {
    forceGarbageCollection();
  }, 100);
  
  // Log memory status after cleanup
  const memory = checkMemoryUsage();
  if (memory.percentage > 70) {
    console.warn('Memory still elevated after cleanup:', memory);
  } else {
    console.log('Memory cleanup successful:', memory);
  }
};

// Timeout wrapper for operations
const withTimeout = async <T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  errorMessage: string
): Promise<T> => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${errorMessage} (timeout after ${timeoutMs}ms)`));
    }, timeoutMs);

    operation()
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timer));
  });
};

// Enhanced image validation with more permissive rules and better error reporting
const validateImageContent = async (buffer: Buffer, fileName: string): Promise<{ 
  valid: boolean; 
  metadata?: sharp.Metadata; 
  error?: string;
  warnings?: string[];
}> => {
  const warnings: string[] = [];
  
  try {
    // Check memory before processing
    if (isMemoryStressed()) {
      console.warn(`Memory usage high before processing ${fileName}:`, checkMemoryUsage());
      warnings.push('System memory usage is high - processing may be slower');
    }

    // First, try to get basic metadata without strict validation
    let metadata: sharp.Metadata;
    
    try {
      // Use timeout for sharp operations to prevent hanging
      metadata = await withTimeout(
        () => sharp(buffer).metadata(),
        30000, // 30 second timeout
        'Image metadata extraction timed out'
      );
    } catch (initialError) {
      // If sharp fails initially, try with different options
      console.log(`Initial sharp parsing failed for ${fileName}, trying alternatives:`, initialError);
      
      try {
        // Try with failOnError disabled for more permissive parsing
        metadata = await withTimeout(
          () => sharp(buffer, { failOnError: false }).metadata(),
          30000,
          'Alternative image metadata extraction timed out'
        );
        warnings.push('Image required alternative processing - may have minor format issues');
      } catch (alternativeError) {
        console.error(`Alternative sharp parsing also failed for ${fileName}:`, alternativeError);
        
        // Try to detect if this might be a HEIC/HEIF file that needs special handling
        const fileExtension = fileName.toLowerCase().split('.').pop();
        if (fileExtension === 'heic' || fileExtension === 'heif') {
          return { 
            valid: false, 
            error: 'HEIC/HEIF format detected. Please convert to JPEG or PNG before uploading, or use a different image format.' 
          };
        }
        
        // Try to provide more specific error messages based on the error
        const errorMessage = alternativeError instanceof Error ? alternativeError.message.toLowerCase() : 'unknown error';
        
        if (errorMessage.includes('input buffer contains unsupported image format')) {
          return { 
            valid: false, 
            error: 'Unsupported image format. Please use JPEG, PNG, WebP, GIF, BMP, or TIFF format.' 
          };
        }
        
        if (errorMessage.includes('input file is missing') || errorMessage.includes('premature end')) {
          return { 
            valid: false, 
            error: 'Image file appears to be incomplete or corrupted. Please try uploading a different image.' 
          };
        }
        
        if (errorMessage.includes('timeout')) {
          return { 
            valid: false, 
            error: 'Image processing timed out. The file may be too large or complex. Please try a smaller image.' 
          };
        }
        
        return { 
          valid: false, 
          error: `Unable to process image file. The file may be corrupted or in an unsupported format. Supported formats include JPEG, PNG, WebP, GIF, BMP, and TIFF. Error: ${alternativeError instanceof Error ? alternativeError.message : 'Unknown error'}` 
        };
      }
    }
    
    // Check if we have basic image properties
    if (!metadata.width || !metadata.height) {
      return { 
        valid: false, 
        error: 'Invalid image: Unable to determine image dimensions. The file may be corrupted or not a valid image.' 
      };
    }
    
    // More permissive dimension checks
    if (metadata.width < 1 || metadata.height < 1) {
      return { 
        valid: false, 
        error: `Invalid image dimensions: ${metadata.width}x${metadata.height}. Images must have positive dimensions.` 
      };
    }
    
    // Increased maximum dimension limit and provide specific guidance
    const maxDimension = 20000; // Increased from 10000
    if (metadata.width > maxDimension || metadata.height > maxDimension) {
      return { 
        valid: false, 
        error: `Image dimensions too large: ${metadata.width}x${metadata.height}. Maximum supported dimensions are ${maxDimension}x${maxDimension} pixels. Please resize your image and try again.` 
      };
    }
    
    // Check for very large images that might cause processing issues
    if (metadata.width > 10000 || metadata.height > 10000) {
      warnings.push(`Large image detected (${metadata.width}x${metadata.height}). Processing may take longer and the image will be resized for web optimization.`);
    }
    
    // Check for unusual aspect ratios
    const aspectRatio = metadata.width / metadata.height;
    if (aspectRatio > 10 || aspectRatio < 0.1) {
      warnings.push(`Unusual aspect ratio detected (${aspectRatio.toFixed(2)}). This may not display well in all contexts.`);
    }
    
    // Check format-specific issues
    if (metadata.format) {
      const format = metadata.format.toLowerCase();
      
      // Warn about formats that might have compatibility issues
      if (['tiff', 'tif'].includes(format)) {
        warnings.push('TIFF format detected. Will be converted to JPEG/PNG for better web compatibility.');
      }
      
      if (format === 'gif' && metadata.pages && metadata.pages > 1) {
        warnings.push('Animated GIF detected. Only the first frame will be processed.');
      }
      
      if (format === 'svg') {
        warnings.push('SVG format detected. Will be rasterized during processing.');
      }
    }
    
    // Check color space and channels
    if (metadata.channels && metadata.channels > 4) {
      warnings.push('Image has unusual color channels. May be converted during processing.');
    }
    
    return { 
      valid: true, 
      metadata, 
      warnings: warnings.length > 0 ? warnings : undefined 
    };
    
  } catch (error) {
    console.error('Image validation error:', error);
    
    // Provide more helpful error messages based on common issues
    const errorMessage = error instanceof Error ? error.message.toLowerCase() : 'unknown error';
    
    if (errorMessage.includes('input buffer contains unsupported image format')) {
      return { 
        valid: false, 
        error: 'Unsupported image format. Please use JPEG, PNG, WebP, GIF, BMP, or TIFF format.' 
      };
    }
    
    if (errorMessage.includes('input file is missing')) {
      return { 
        valid: false, 
        error: 'Image file appears to be empty or corrupted. Please try uploading a different image.' 
      };
    }
    
    if (errorMessage.includes('premature end of input')) {
      return { 
        valid: false, 
        error: 'Image file appears to be incomplete or corrupted. Please try uploading the image again.' 
      };
    }
    
    if (errorMessage.includes('timeout')) {
      return { 
        valid: false, 
        error: 'Image processing timed out. Please try a smaller image or check your connection.' 
      };
    }
    
    return { 
      valid: false, 
      error: `Unable to process image: ${error instanceof Error ? error.message : 'Unknown error'}. Please try a different image file or format.` 
    };
  }
};

// Enhanced image processing with streaming and memory-optimized settings
const processImage = async (buffer: Buffer, originalName: string): Promise<{ 
  buffer: Buffer; 
  contentType: string; 
  extension: string;
  processingInfo?: {
    originalFormat?: string;
    outputFormat: string;
    wasConverted: boolean;
    optimizationApplied: boolean;
  };
}> => {
  let image: sharp.Sharp | null = null;
  
  try {
    // More reasonable memory check before processing
    const memoryBefore = checkMemoryUsage();
    if (memoryBefore.percentage > 70 || memoryBefore.rss > 2048) { // 2GB RSS limit (increased from 1.5GB)
      console.warn(`High memory usage before processing ${originalName}:`, memoryBefore);
      // Force cleanup before processing
      cleanupResources();
      
      // Wait briefly for cleanup to take effect
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Check again after cleanup - more lenient threshold
      const memoryAfterCleanup = checkMemoryUsage();
      if (memoryAfterCleanup.percentage > 85) { // Increased from 70% to 85%
        throw createProcessingError(
          `System memory usage is too high (${memoryAfterCleanup.percentage.toFixed(1)}%) to safely process this image. Please try uploading a smaller image or wait a moment for system resources to free up. Current memory usage: ${memoryAfterCleanup.rss.toFixed(0)}MB RSS.`,
          undefined,
          { 
            fileName: originalName, 
            memoryUsage: memoryAfterCleanup,
            suggestion: 'Try reducing image size to under 10MB or dimensions to under 2048x2048 pixels'
          }
        );
      }
    }

    // More conservative memory limits for production
    const maxInputSize = 25 * 1024 * 1024; // Reduced to 25MB max input
    if (buffer.length > maxInputSize) {
      throw createProcessingError(
        `Image file too large (${(buffer.length / 1024 / 1024).toFixed(1)}MB). Maximum size is ${maxInputSize / 1024 / 1024}MB. Please compress your image before uploading.`,
        undefined,
        { fileName: originalName, fileSize: buffer.length }
      );
    }

    // Configure Sharp with memory-optimized settings
    sharp.cache(false); // Disable cache to save memory
    sharp.concurrency(1); // Force single-threaded processing
    sharp.simd(false); // Disable SIMD for more predictable memory usage
    
    // Create sharp instance with stricter limits for production
    try {
      image = sharp(buffer, { 
        failOnError: false,
        limitInputPixels: 67108864, // ~8192x8192 max (reduced from 16384x16384)
        sequentialRead: true, // Better for memory usage
        density: 72, // Lower default DPI for web use
        pages: 1, // Only process first page/frame
      });
      
      const metadata = await withTimeout(
        () => image!.metadata(),
        20000, // Reduced timeout
        'Metadata extraction timed out during processing'
      );

      // Validate dimensions early with more conservative limits
      if (!metadata.width || !metadata.height) {
        throw createProcessingError(
          'Invalid image: Unable to determine image dimensions',
          undefined,
          { fileName: originalName }
        );
      }

      // More conservative dimension limits for memory management
      const maxDimension = 8192; // Reduced from 16384
      if (metadata.width > maxDimension || metadata.height > maxDimension) {
        throw createProcessingError(
          `Image dimensions too large: ${metadata.width}x${metadata.height}. Maximum supported dimensions are ${maxDimension}x${maxDimension} pixels. Please resize your image.`,
          undefined,
          { fileName: originalName, dimensions: { width: metadata.width, height: metadata.height } }
        );
      }

      console.log(`Processing image: ${originalName}, format: ${metadata.format}, dimensions: ${metadata.width}x${metadata.height}, size: ${(buffer.length / 1024 / 1024).toFixed(1)}MB`);
      
    } catch (sharpError) {
      console.error(`Sharp initialization failed for ${originalName}:`, sharpError);
      throw createProcessingError(
        'Failed to initialize image processing. The image file may be corrupted or in an unsupported format.',
        sharpError as Error,
        { fileName: originalName }
      );
    }

    const metadata = await image.metadata();
    const inputFormat = metadata.format?.toLowerCase();
    
    // Determine optimal output format with aggressive memory considerations
    let outputFormat: 'webp' | 'jpeg' | 'png' = 'jpeg'; // Default to JPEG for better memory usage
    let contentType = 'image/jpeg';
    let extension = 'jpg';
    let wasConverted = false;
    
    // For memory efficiency, prefer JPEG unless transparency is needed
    const isLargeImage = (metadata.width || 0) * (metadata.height || 0) > 2000000; // 2MP threshold (reduced)
    const hasTransparency = metadata.hasAlpha;
    
    if (hasTransparency && !isLargeImage) {
      // Only use PNG for small images with transparency
      outputFormat = 'png';
      contentType = 'image/png';
      extension = 'png';
    } else if (!hasTransparency && !isLargeImage) {
      // Try WebP for small images without transparency
      try {
        // Quick test for WebP support
        await withTimeout(
          () => image!.clone().resize(100, 100).webp({ quality: 80 }).toBuffer(),
          5000,
          'WebP test conversion timed out'
        );
        outputFormat = 'webp';
        contentType = 'image/webp';
        extension = 'webp';
      } catch (webpError) {
        console.log('WebP test failed, using JPEG');
        // Keep JPEG as fallback
      }
    }
    
    // Force JPEG for problematic formats to ensure compatibility
    if (['svg', 'tiff', 'tif', 'bmp', 'heic', 'heif'].includes(inputFormat || '')) {
      wasConverted = true;
      outputFormat = 'jpeg';
      contentType = 'image/jpeg';
      extension = 'jpg';
    }

    // Progressive processing with aggressive memory monitoring
    let processedImage = image;
    let optimizationApplied = false;
    
    // More aggressive resizing for memory management
    const maxWebDimension = 1600; // Reduced from 1920
    if (metadata.width && metadata.height) {
      const maxDimension = Math.max(metadata.width, metadata.height);
      if (maxDimension > maxWebDimension) {
        console.log(`Resizing large image from ${metadata.width}x${metadata.height} to fit within ${maxWebDimension}px`);
        
        // Check memory before resize
        if (isMemoryStressed()) {
          throw createProcessingError(
            'Insufficient memory to resize image. Please reduce image size before uploading.',
            undefined,
            { fileName: originalName, memoryUsage: checkMemoryUsage() }
          );
        }
        
        try {
          processedImage = processedImage.resize(maxWebDimension, maxWebDimension, {
            fit: 'inside',
            withoutEnlargement: true,
            kernel: sharp.kernel.cubic, // Good balance of quality and performance
            fastShrinkOnLoad: true, // Enable fast shrinking
          });
          optimizationApplied = true;
        } catch (resizeError) {
          console.error('Resize operation failed:', resizeError);
          throw createProcessingError(
            'Failed to resize image. Please try a smaller image.',
            resizeError as Error,
            { fileName: originalName }
          );
        }
      }
    }

    // Process with format-specific optimizations and aggressive memory monitoring
    let processedBuffer: Buffer;
    let finalFormat = outputFormat;
    let finalContentType = contentType;
    let finalExtension = extension;
    
    try {
      // Check memory before final processing
      const memoryBeforeConversion = checkMemoryUsage();
      if (memoryBeforeConversion.percentage > 70) {
        console.warn(`High memory before conversion for ${originalName}:`, memoryBeforeConversion);
        cleanupResources();
        
        // Wait for cleanup
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      console.log(`Converting ${originalName} to ${outputFormat}`);
      
      if (outputFormat === 'webp') {
        processedBuffer = await withTimeout(
          () => processedImage.webp({ 
            quality: isLargeImage ? 75 : 80, // Lower quality for memory efficiency
            effort: 2, // Reduced effort for better performance
            smartSubsample: true,
            preset: 'photo'
          }).toBuffer(),
          60000, // 1 minute timeout (reduced)
          'WebP conversion timed out'
        );
      } else if (outputFormat === 'png') {
        processedBuffer = await withTimeout(
          () => processedImage.png({ 
            compressionLevel: isLargeImage ? 4 : 6, // Lower compression for memory efficiency
            adaptiveFiltering: false, // Disable for memory savings
            palette: metadata.channels && metadata.channels <= 3 // Use palette for simple images
          }).toBuffer(),
          60000,
          'PNG conversion timed out'
        );
      } else {
        // JPEG - most memory efficient
        processedBuffer = await withTimeout(
          () => processedImage.jpeg({ 
            quality: isLargeImage ? 75 : 80, // Slightly lower quality for memory efficiency
            progressive: true,
            mozjpeg: false, // Disable mozjpeg for memory savings
            optimiseScans: false, // Disable for memory savings
            trellisQuantisation: false // Disable for memory savings
          }).toBuffer(),
          60000,
          'JPEG conversion timed out'
        );
      }
      
    } catch (formatError) {
      console.error(`Failed to convert to ${outputFormat}:`, formatError);
      
      // Aggressive fallback to basic JPEG for maximum compatibility and memory efficiency
      if (outputFormat !== 'jpeg') {
        console.log(`Falling back to basic JPEG for ${originalName}`);
        try {
          processedBuffer = await withTimeout(
            () => processedImage.jpeg({ 
              quality: 75, 
              progressive: false, // Simplest JPEG mode
              mozjpeg: false,
              optimiseScans: false,
              trellisQuantisation: false
            }).toBuffer(),
            60000,
            'JPEG fallback conversion timed out'
          );
          finalFormat = 'jpeg';
          finalContentType = 'image/jpeg';
          finalExtension = 'jpg';
          wasConverted = true;
        } catch (fallbackError) {
          throw createProcessingError(
            'Unable to process image in any supported format. Please try converting the image to JPEG format and uploading again.',
            fallbackError as Error,
            { fileName: originalName, attemptedFormats: [outputFormat, 'jpeg'] }
          );
        }
      } else {
        throw createProcessingError(
          'Image processing failed. Please try a different image file or format.',
          formatError as Error,
          { fileName: originalName }
        );
      }
    }

    // Validate the processed result
    try {
      const processedMetadata = await withTimeout(
        () => sharp(processedBuffer).metadata(),
        20000, // Reduced timeout
        'Processed image validation timed out'
      );
      
      if (!processedMetadata.width || !processedMetadata.height) {
        throw new Error('Processed image has invalid dimensions');
      }
      
      if (processedBuffer.length === 0) {
        throw new Error('Processed image is empty');
      }
      
      // Check if the processed image is reasonable in size
      const compressionRatio = buffer.length / processedBuffer.length;
      if (compressionRatio > 100) {
        console.warn(`Unusual compression ratio ${compressionRatio.toFixed(2)} for ${originalName}`);
      }
      
      console.log(`Successfully processed ${originalName}: ${(buffer.length / 1024 / 1024).toFixed(1)}MB -> ${(processedBuffer.length / 1024 / 1024).toFixed(1)}MB`);
      
    } catch (validationError) {
      console.error('Processed image validation failed:', validationError);
      throw createProcessingError(
        'Image processing resulted in an invalid file. Please try a different image.',
        validationError as Error,
        { fileName: originalName }
      );
    }

    // Log memory usage after processing
    const memoryAfter = checkMemoryUsage();
    if (memoryAfter.percentage > 80) {
      console.warn(`High memory usage after processing ${originalName}:`, memoryAfter);
      cleanupResources();
    }
    
    return { 
      buffer: processedBuffer, 
      contentType: finalContentType, 
      extension: finalExtension,
      processingInfo: {
        originalFormat: inputFormat,
        outputFormat: finalFormat,
        wasConverted,
        optimizationApplied,
      }
    };
    
  } catch (error) {
    console.error('Image processing error for', originalName, ':', error);
    
    // Enhanced error messages for common issues with specific user guidance
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      
      if (errorMessage.includes('input buffer contains unsupported image format')) {
        throw createProcessingError(
          `The image format for "${originalName}" is not supported or the file may be corrupted. Please convert your image to JPEG, PNG, or WebP format and try again.`,
          error,
          { 
            fileName: originalName,
            suggestion: 'Convert to JPEG or PNG using an image editor',
            supportedFormats: ['JPEG', 'PNG', 'WebP', 'GIF', 'BMP', 'TIFF']
          }
        );
      }
      
      if (errorMessage.includes('image too large') || errorMessage.includes('memory') || errorMessage.includes('insufficient memory')) {
        const fileSizeMB = (buffer.length / (1024 * 1024)).toFixed(1);
        throw createProcessingError(
          `The image "${originalName}" (${fileSizeMB}MB) is too large for the system to process safely. Please reduce the image size and try again.`,
          error,
          { 
            fileName: originalName,
            fileSize: buffer.length,
            suggestion: 'Reduce image dimensions to 1920x1920 pixels or compress to under 15MB',
            currentSize: fileSizeMB + 'MB'
          }
        );
      }
      
      if (errorMessage.includes('timeout')) {
        throw createProcessingError(
          `Processing "${originalName}" took too long and was cancelled. This usually happens with very large or complex images.`,
          error,
          { 
            fileName: originalName,
            suggestion: 'Try reducing image size, converting to JPEG format, or uploading during off-peak hours'
          }
        );
      }
      
      // Re-throw processing errors with enhanced context
      if (error.name === 'ProcessingError') {
        // Add additional context to existing processing errors
        const processingError = error as ProcessingError;
        if (processingError.context) {
          processingError.context.timestamp = new Date().toISOString();
          processingError.context.memoryAtError = checkMemoryUsage();
        }
        throw error;
      }
    }
    
    // Default error with system status
    const currentMemory = checkMemoryUsage();
    throw createProcessingError(
      `Failed to process "${originalName}". ${error instanceof Error ? error.message : 'Unknown error occurred'}. Please try again with a smaller image or different format.`,
      error instanceof Error ? error : undefined,
      { 
        fileName: originalName,
        systemStatus: {
          memoryUsage: currentMemory,
          timestamp: new Date().toISOString()
        },
        suggestion: 'Try converting to JPEG format and reducing file size under 10MB'
      }
    );
  } finally {
    // Always cleanup Sharp instance and force garbage collection
    if (image) {
      try {
        image.destroy();
      } catch (destroyError) {
        console.warn('Failed to destroy Sharp instance:', destroyError);
      }
    }
    
    // Force cleanup after processing
    cleanupResources();
  }
};

// Enhanced image variant generation with memory-conscious processing and reduced variants
const generateImageVariants = async (
  originalBuffer: Buffer, 
  originalMetadata: sharp.Metadata,
  imageId: number,
  baseName: string
): Promise<Array<{ variantType: string; filePath: string; width: number; height: number; fileSize: number; format: string; quality?: number }>> => {
  const variants = [];
  const errors = [];
  
  // More conservative variant configurations for production - fewer variants to save memory
  const variantConfigs = [
    { type: 'thumbnail', maxWidth: 150, maxHeight: 150, quality: 75, format: 'jpeg', priority: 'high' }, // Changed to JPEG
    { type: 'small', maxWidth: 400, maxHeight: 400, quality: 80, format: 'jpeg', priority: 'high' }, // Changed to JPEG
    { type: 'medium', maxWidth: 800, maxHeight: 800, quality: 80, format: 'jpeg', priority: 'medium' }, // Changed to JPEG
    // Removed large variant and JPEG fallbacks to reduce memory usage
  ];
  
  // Check if we should generate variants based on memory and image size
  const memoryBefore = checkMemoryUsage();
  const isLargeOriginal = (originalMetadata.width || 0) * (originalMetadata.height || 0) > 1000000; // 1MP threshold (reduced)
  
  if (memoryBefore.percentage > 60) {
    console.warn(`High memory before variant generation:`, memoryBefore);
    cleanupResources();
    
    // Wait for cleanup
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  // Skip medium priority variants if memory is stressed or image is large
  const skipMediumPriority = isMemoryStressed() || isLargeOriginal;
  
  // Configure Sharp for variant generation
  sharp.cache(false);
  sharp.concurrency(1);
  sharp.simd(false);
  
  for (const config of variantConfigs) {
    // Skip medium priority variants if memory constrained
    if (skipMediumPriority && config.priority === 'medium') {
      console.log(`Skipping ${config.type} variant due to memory/size constraints`);
      continue;
    }
    
    let variantImage: sharp.Sharp | null = null;
    
    try {
      console.log(`Generating ${config.type} variant for image ${imageId}`);
      
      // Check memory before each variant
      const currentMemory = checkMemoryUsage();
      if (currentMemory.percentage > 75) {
        console.warn(`Memory stressed before generating ${config.type} variant:`, currentMemory);
        // Skip non-essential variants if memory is very high
        if (config.priority !== 'high') {
          console.log(`Skipping ${config.type} variant due to memory constraints`);
          continue;
        }
        cleanupResources();
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      variantImage = sharp(originalBuffer, { 
        sequentialRead: true,
        limitInputPixels: false, // We already validated the original
        pages: 1
      });
      
      // Only resize if the original is larger than the target
      let needsResize = false;
      if (originalMetadata.width && originalMetadata.height) {
        needsResize = originalMetadata.width > config.maxWidth || originalMetadata.height > config.maxHeight;
        
        if (needsResize) {
          try {
            variantImage = variantImage.resize(config.maxWidth, config.maxHeight, {
              fit: 'inside',
              withoutEnlargement: true,
              kernel: sharp.kernel.cubic,
              fastShrinkOnLoad: true
            });
          } catch (resizeError) {
            console.error(`Resize failed for ${config.type} variant:`, resizeError);
            throw createProcessingError(
              `Failed to resize image for ${config.type} variant`,
              resizeError as Error,
              { variantType: config.type, imageId }
            );
          }
        }
      }
      
      // Apply format and quality with timeout and memory monitoring
      let processedBuffer: Buffer;
      try {
        // Always use JPEG for variants to save memory
        processedBuffer = await withTimeout(
          () => variantImage.jpeg({ 
            quality: config.quality, 
            progressive: false, // Simpler processing
            mozjpeg: false,
            optimiseScans: false,
            trellisQuantisation: false
          }).toBuffer(),
          30000, // 30 second timeout per variant (reduced)
          `JPEG conversion timed out for ${config.type} variant`
        );
      } catch (conversionError) {
        console.error(`Format conversion failed for ${config.type} variant:`, conversionError);
        throw createProcessingError(
          `Failed to convert image to ${config.format} for ${config.type} variant`,
          conversionError as Error,
          { variantType: config.type, format: config.format, imageId }
        );
      }
      
      // Get processed image metadata
      let processedMetadata: sharp.Metadata;
      try {
        processedMetadata = await withTimeout(
          () => sharp(processedBuffer).metadata(),
          15000, // Reduced timeout
          `Metadata extraction timed out for ${config.type} variant`
        );
      } catch (metadataError) {
        console.error(`Metadata extraction failed for ${config.type} variant:`, metadataError);
        throw createProcessingError(
          `Failed to extract metadata for ${config.type} variant`,
          metadataError as Error,
          { variantType: config.type, imageId }
        );
      }
      
      // Generate unique filename for variant
      const variantFileName = `${baseName}_${config.type}.jpg`; // Always use .jpg extension
      
      // Upload variant to Minio with enhanced error handling
      try {
        await withTimeout(
          () => minioClient.putObject(BUCKET_NAME, variantFileName, processedBuffer, processedBuffer.length, {
            'Content-Type': 'image/jpeg', // Always JPEG
            'X-Variant-Type': config.type,
            'X-Parent-Image-Id': imageId.toString(),
            'X-Generated-At': new Date().toISOString(),
            'X-Quality': config.quality?.toString(),
          }),
          60000, // 1 minute timeout for upload
          `Minio upload timed out for ${config.type} variant`
        );
      } catch (uploadError) {
        console.error(`Minio upload failed for ${config.type} variant:`, uploadError);
        throw createStorageError(
          `Failed to upload ${config.type} variant to storage`,
          uploadError as Error,
          BUCKET_NAME,
          variantFileName
        );
      }
      
      variants.push({
        variantType: config.type,
        filePath: variantFileName,
        width: processedMetadata.width || 0,
        height: processedMetadata.height || 0,
        fileSize: processedBuffer.length,
        format: 'jpeg', // Always JPEG
        quality: config.quality,
      });
      
      console.log(`Successfully generated ${config.type} variant: ${variantFileName} (${(processedBuffer.length / 1024).toFixed(1)}KB)`);
      
    } catch (error) {
      console.error(`Failed to generate ${config.type} variant:`, error);
      errors.push({
        variantType: config.type,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // For high priority variants, this is more serious
      if (config.priority === 'high') {
        console.error(`Critical variant ${config.type} failed - this may impact functionality`);
      }
    } finally {
      // Always cleanup variant image instance
      if (variantImage) {
        try {
          variantImage.destroy();
        } catch (destroyError) {
          console.warn(`Failed to destroy variant image instance for ${config.type}:`, destroyError);
        }
      }
      
      // Cleanup after each variant to prevent memory buildup
      cleanupResources();
      await new Promise(resolve => setTimeout(resolve, 100)); // Brief pause between variants
    }
  }
  
  // Log variant generation summary
  console.log(`Variant generation completed for image ${imageId}: ${variants.length} successful, ${errors.length} failed`);
  if (errors.length > 0) {
    console.log('Variant generation errors:', errors);
  }
  
  // Final cleanup
  cleanupResources();
  
  return variants;
};

// Enhanced metadata extraction using sharp and additional analysis with error handling
const extractImageMetadata = async (buffer: Buffer, originalName: string): Promise<{
  width?: number;
  height?: number;
  aspectRatio?: number;
  colorSpace?: string;
  hasAlpha?: boolean;
  format?: string;
  density?: number;
  channels?: number;
  depth?: string;
}> => {
  try {
    const metadata = await withTimeout(
      () => sharp(buffer).metadata(),
      30000,
      'Metadata extraction timed out'
    );
    
    return {
      width: metadata.width,
      height: metadata.height,
      aspectRatio: metadata.width && metadata.height ? metadata.width / metadata.height : undefined,
      colorSpace: metadata.space,
      hasAlpha: metadata.hasAlpha || false,
      format: metadata.format,
      density: metadata.density,
      channels: metadata.channels,
      depth: metadata.depth,
    };
  } catch (error) {
    console.error(`Failed to extract image metadata for ${originalName}:`, error);
    
    // Return partial metadata rather than failing completely
    return {
      format: originalName.split('.').pop()?.toLowerCase(),
      hasAlpha: false,
    };
  }
};

export const adminUploadImage = baseProcedure
  .input(z.object({
    adminToken: z.string(),
    fileName: z.string().min(1, "File name is required"),
    fileContent: z.string().min(1, "File content is required"), // base64 encoded
    fileType: z.string().regex(/^image\//, "File must be an image"),
    // Enhanced metadata
    title: z.string().optional(),
    description: z.string().optional(),
    altText: z.string().optional(),
    tags: z.array(z.string()).default([]),
    category: z.string().optional(),
    generateVariants: z.boolean().default(true),
  }))
  .mutation(async ({ input }) => {
    try {
      await requireAdminAuth(input.adminToken);
    } catch (authError) {
      console.error('Authentication failed for image upload:', authError);
      throw new Error('Authentication failed. Please check your admin token and try again.');
    }
    
    const { fileName, fileContent, fileType, title, description, altText, tags, category, generateVariants } = input;
    
    try {
      // Ensure bucket exists with enhanced error handling
      try {
        const bucketExists = await withTimeout(
          () => minioClient.bucketExists(BUCKET_NAME),
          30000,
          'Bucket existence check timed out'
        );
        
        if (!bucketExists) {
          await withTimeout(
            () => minioClient.makeBucket(BUCKET_NAME),
            30000,
            'Bucket creation timed out'
          );
        }
      } catch (bucketError) {
        console.error('Minio bucket operations failed:', bucketError);
        throw createStorageError(
          'Failed to access or create storage bucket. Please try again later.',
          bucketError as Error,
          BUCKET_NAME
        );
      }
      
      // Enhanced base64 parsing with better error handling
      let base64Data: string;
      let originalBuffer: Buffer;
      
      try {
        // Handle different base64 formats
        if (fileContent.startsWith('data:')) {
          // Remove data URL prefix
          const base64Match = fileContent.match(/^data:image\/[a-z]+;base64,(.+)$/);
          if (!base64Match) {
            throw new Error('Invalid data URL format');
          }
          base64Data = base64Match[1];
        } else {
          base64Data = fileContent;
        }
        
        if (!base64Data || base64Data.length === 0) {
          throw new Error('Empty base64 data');
        }
        
        originalBuffer = Buffer.from(base64Data, 'base64');
        
        if (originalBuffer.length === 0) {
          throw new Error('Empty image buffer');
        }
        
        // Check buffer size for potential memory issues
        const bufferSizeMB = originalBuffer.length / (1024 * 1024);
        if (bufferSizeMB > 100) { // 100MB limit
          throw new Error(`Image file too large (${bufferSizeMB.toFixed(1)}MB). Maximum size is 100MB.`);
        }
        
      } catch (error) {
        console.error('Base64 parsing error:', error);
        throw new Error('Invalid image data. Please try uploading the image again.');
      }
      
      // Enhanced image validation
      const validation = await validateImageContent(originalBuffer, fileName);
      if (!validation.valid) {
        throw new Error(validation.error || 'Invalid image file');
      }
      
      // Log any warnings but don't fail the upload
      if (validation.warnings) {
        console.log(`Image upload warnings for ${fileName}:`, validation.warnings);
      }
      
      // Extract comprehensive metadata
      const imageMetadata = await extractImageMetadata(originalBuffer, fileName);
      
      // Enhanced image processing
      const processed = await processImage(originalBuffer, fileName);
      
      // Generate unique file name with correct extension
      const uniqueFileName = `${randomUUID()}.${processed.extension}`;
      const baseName = uniqueFileName.replace(/\.[^/.]+$/, ''); // Remove extension for variants
      
      // Upload main image to Minio with enhanced metadata and error handling
      try {
        await withTimeout(
          () => minioClient.putObject(BUCKET_NAME, uniqueFileName, processed.buffer, processed.buffer.length, {
            'Content-Type': processed.contentType,
            'X-Original-Name': fileName,
            'X-Original-Type': fileType,
            'X-Processed-At': new Date().toISOString(),
            'X-Image-Type': 'main',
            'X-Processing-Info': JSON.stringify(processed.processingInfo || {}),
            'X-Validation-Warnings': validation.warnings ? JSON.stringify(validation.warnings) : undefined,
          }),
          120000, // 2 minute timeout for main image upload
          'Main image upload timed out'
        );
      } catch (uploadError) {
        console.error('Main image upload to Minio failed:', uploadError);
        throw createStorageError(
          'Failed to upload image to storage. Please try again.',
          uploadError as Error,
          BUCKET_NAME,
          uniqueFileName
        );
      }
      
      // Store image metadata in database with comprehensive error handling
      let imageRecord;
      try {
        const { db } = await import("~/server/db");
        
        imageRecord = await db.image.create({
          data: {
            fileName,
            filePath: uniqueFileName,
            fileSize: processed.buffer.length,
            mimeType: processed.contentType,
            width: imageMetadata.width,
            height: imageMetadata.height,
            aspectRatio: imageMetadata.aspectRatio,
            colorSpace: imageMetadata.colorSpace,
            hasAlpha: imageMetadata.hasAlpha || false,
            originalSize: originalBuffer.length,
            compressionRatio: originalBuffer.length > 0 ? (originalBuffer.length - processed.buffer.length) / originalBuffer.length : 0,
            format: processed.extension,
            quality: processed.extension === 'webp' ? 85 : processed.extension === 'jpeg' ? 85 : undefined,
            title,
            description,
            altText,
            tags: JSON.stringify(tags),
            category,
            uploadedBy: 'admin', // Could be enhanced to track specific admin user
          },
        });
      } catch (dbError) {
        console.error('Database error while creating image record:', dbError);
        
        // Try to clean up the uploaded file if database fails
        try {
          await minioClient.removeObject(BUCKET_NAME, uniqueFileName);
          console.log('Cleaned up uploaded file after database error');
        } catch (cleanupError) {
          console.error('Failed to cleanup uploaded file after database error:', cleanupError);
        }
        
        // Handle specific Prisma errors
        if (dbError instanceof PrismaClientKnownRequestError) {
          if (dbError.code === 'P2002') {
            throw createDatabaseError(
              'A file with this path already exists. Please try uploading again.',
              dbError,
              { constraint: 'unique', table: 'Image' }
            );
          } else if (dbError.code === 'P2003') {
            throw createDatabaseError(
              'Database constraint violation. Please check your data and try again.',
              dbError,
              { constraint: 'foreign_key', table: 'Image' }
            );
          }
        }
        
        throw createDatabaseError(
          'Failed to save image metadata to database. Please try again.',
          dbError as Error,
          { operation: 'create_image' }
        );
      }
      
      // Generate variants if requested
      let variants = [];
      if (generateVariants) {
        try {
          const variantData = await generateImageVariants(originalBuffer, validation.metadata!, imageRecord.id, baseName);
          
          // Store variants in database with error handling for each variant
          for (const variant of variantData) {
            try {
              const { db } = await import("~/server/db");
              await db.imageVariant.create({
                data: {
                  imageId: imageRecord.id,
                  variantType: variant.variantType,
                  filePath: variant.filePath,
                  width: variant.width,
                  height: variant.height,
                  fileSize: variant.fileSize,
                  format: variant.format,
                  quality: variant.quality,
                },
              });
            } catch (variantDbError) {
              console.error(`Failed to save variant ${variant.variantType} to database:`, variantDbError);
              // Continue with other variants even if one fails to save
            }
          }
          variants = variantData;
        } catch (variantError) {
          console.error('Variant generation failed:', variantError);
          // Don't fail the main upload if variant generation fails
          console.log('Main image upload succeeded despite variant generation failure');
        }
      }
      
      // Prepare success response with detailed information
      const response = {
        success: true,
        filePath: uniqueFileName,
        imageId: imageRecord.id,
        message: 'Image uploaded and processed successfully',
        metadata: {
          originalSize: originalBuffer.length,
          processedSize: processed.buffer.length,
          contentType: processed.contentType,
          processingInfo: processed.processingInfo,
          dimensions: imageMetadata.width && imageMetadata.height ? {
            width: imageMetadata.width,
            height: imageMetadata.height,
            aspectRatio: imageMetadata.aspectRatio,
          } : undefined,
          variants: variants.map(v => ({
            type: v.variantType,
            dimensions: { width: v.width, height: v.height },
            size: v.fileSize,
            format: v.format,
          })),
          warnings: validation.warnings,
        },
      };
      
      console.log(`Successfully processed image ${fileName} -> ${uniqueFileName}`);
      return response;
      
    } catch (error) {
      console.error('Image upload error for', fileName, ':', error);
      
      // Enhanced error logging for debugging
      const errorContext = {
        fileName,
        fileType,
        contentLength: fileContent?.length || 0,
        hasValidToken: !!input.adminToken,
        memoryUsage: checkMemoryUsage(),
        timestamp: new Date().toISOString(),
        errorType: error instanceof Error ? error.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : String(error)
      };
      
      console.error('Upload context:', errorContext);
      
      // Handle different error types appropriately with enhanced user guidance
      if (error instanceof Error) {
        if (error.name === 'ProcessingError' || error.name === 'DatabaseError' || error.name === 'StorageError') {
          // Add system context to custom errors
          const customError = error as ProcessingError;
          if (customError.context) {
            customError.context.systemContext = errorContext;
          }
          throw error; // Re-throw our custom errors with enhanced context
        }
        
        // Handle specific common errors with better messages
        if (error.message.toLowerCase().includes('base64')) {
          throw new Error(`Failed to process image data for "${fileName}". The file may be corrupted or there was a transmission error. Please try uploading the image again.`);
        }
        
        if (error.message.toLowerCase().includes('timeout')) {
          throw new Error(`Upload of "${fileName}" timed out. This may be due to a large file size or slow connection. Please try a smaller image or check your internet connection.`);
        }
        
        if (error.message.toLowerCase().includes('network') || error.message.toLowerCase().includes('connection')) {
          throw new Error(`Network error while uploading "${fileName}". Please check your internet connection and try again.`);
        }
        
        throw new Error(`Failed to upload "${fileName}": ${error.message}`);
      }
      
      throw new Error(`Failed to upload "${fileName}". Please try again with a different image file or contact support if the problem persists.`);
    }
  });

export const adminBulkUploadImages = baseProcedure
  .input(z.object({
    adminToken: z.string(),
    images: z.array(z.object({
      fileName: z.string().min(1, "File name is required"),
      fileContent: z.string().min(1, "File content is required"),
      fileType: z.string().regex(/^image\//, "File must be an image"),
      title: z.string().optional(),
      description: z.string().optional(),
      altText: z.string().optional(),
      tags: z.array(z.string()).default([]),
      category: z.string().optional(),
    })).max(10, "Maximum 10 images per bulk upload"),
    generateVariants: z.boolean().default(true),
    collectionName: z.string().optional(),
  }))
  .mutation(async ({ input }) => {
    try {
      await requireAdminAuth(input.adminToken);
    } catch (authError) {
      console.error('Authentication failed for bulk image upload:', authError);
      throw new Error('Authentication failed. Please check your admin token and try again.');
    }
    
    const { images, generateVariants, collectionName } = input;
    const results = [];
    const errors = [];
    
    // Create collection if specified with error handling
    let collection = null;
    if (collectionName) {
      try {
        const { db } = await import("~/server/db");
        
        collection = await db.imageCollection.create({
          data: {
            name: collectionName,
            slug: collectionName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            isPublic: false,
          },
        });
      } catch (collectionError) {
        console.error('Failed to create collection:', collectionError);
        // Continue without collection rather than failing the entire upload
      }
    }
    
    // Process each image with enhanced error handling
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      
      try {
        console.log(`Processing bulk upload image ${i + 1}/${images.length}: ${image.fileName}`);
        
        // Check memory before processing each image
        if (isMemoryStressed()) {
          console.warn(`Memory stressed before processing image ${i + 1}:`, checkMemoryUsage());
          // Consider skipping remaining images if memory is critically low
          const memory = checkMemoryUsage();
          if (memory.percentage > 95) {
            throw new Error('System memory critically low. Please try uploading fewer images at once.');
          }
        }
        
        // Use the existing upload logic with timeout
        const result = await withTimeout(
          () => adminUploadImage.resolver({
            input: {
              adminToken: input.adminToken,
              ...image,
              generateVariants,
            },
            ctx: {} as any,
          }),
          300000, // 5 minute timeout per image
          `Upload timed out for ${image.fileName}`
        );
        
        // Add to collection if created
        if (collection && result.imageId) {
          try {
            const { db } = await import("~/server/db");
            await db.imageCollectionItem.create({
              data: {
                collectionId: collection.id,
                imageId: result.imageId,
                order: i,
              },
            });
          } catch (collectionItemError) {
            console.error(`Failed to add image ${image.fileName} to collection:`, collectionItemError);
            // Continue without adding to collection
          }
        }
        
        results.push({
          fileName: image.fileName,
          success: true,
          ...result,
        });
        
        console.log(`Successfully processed bulk upload image ${i + 1}/${images.length}: ${image.fileName}`);
        
      } catch (error) {
        console.error(`Failed to upload image ${image.fileName}:`, error);
        
        let errorMessage = 'Unknown error';
        if (error instanceof Error) {
          errorMessage = error.message;
        }
        
        errors.push({
          fileName: image.fileName,
          error: errorMessage,
        });
      }
    }
    
    // Log bulk upload summary
    console.log(`Bulk upload completed: ${results.length} successful, ${errors.length} failed`);
    
    return {
      success: true,
      results,
      errors,
      totalProcessed: images.length,
      successCount: results.length,
      errorCount: errors.length,
      collectionId: collection?.id,
    };
  });

export const getImage = baseProcedure
  .input(z.object({
    filePath: z.string().min(1, "File path is required"),
  }))
  .query(async ({ input }) => {
    const { filePath } = input;
    
    try {
      // Validate file path to prevent directory traversal
      if (filePath.includes('..') || filePath.includes('/') || filePath.includes('\\')) {
        throw new Error('Invalid file path');
      }
      
      // Get image from Minio with timeout and error handling
      let stream;
      try {
        stream = await withTimeout(
          () => minioClient.getObject(BUCKET_NAME, filePath),
          60000, // 1 minute timeout
          'Image retrieval timed out'
        );
      } catch (minioError) {
        console.error(`Failed to retrieve image ${filePath} from Minio:`, minioError);
        
        // Provide more specific error messages based on the Minio error
        const errorMessage = minioError instanceof Error ? minioError.message.toLowerCase() : '';
        
        if (errorMessage.includes('nosuchkey') || errorMessage.includes('not found')) {
          throw createStorageError(
            `Image "${filePath}" was not found in storage. It may have been deleted or moved.`,
            minioError as Error,
            BUCKET_NAME,
            filePath
          );
        }
        
        if (errorMessage.includes('access denied') || errorMessage.includes('forbidden')) {
          throw createStorageError(
            `Access denied when retrieving image "${filePath}". Please check permissions.`,
            minioError as Error,
            BUCKET_NAME,
            filePath
          );
        }
        
        if (errorMessage.includes('timeout') || errorMessage.includes('connection')) {
          throw createStorageError(
            `Storage system is temporarily unavailable. Please try again in a moment.`,
            minioError as Error,
            BUCKET_NAME,
            filePath
          );
        }
        
        throw createStorageError(
          `Failed to retrieve image "${filePath}". The storage system may be temporarily unavailable.`,
          minioError as Error,
          BUCKET_NAME,
          filePath
        );
      }
      
      // Convert stream to buffer with size limit (10MB max) and timeout
      const chunks: Buffer[] = [];
      let totalSize = 0;
      const maxSize = 10 * 1024 * 1024; // 10MB
      
      try {
        for await (const chunk of stream) {
          totalSize += chunk.length;
          if (totalSize > maxSize) {
            throw new Error(`Image too large (${totalSize} bytes). Maximum size is ${maxSize} bytes.`);
          }
          chunks.push(chunk);
        }
        
        if (chunks.length === 0) {
          throw new Error('Empty image data received');
        }
        
      } catch (streamError) {
        console.error(`Failed to read image stream for ${filePath}:`, streamError);
        throw new Error('Failed to read image data. The file may be corrupted.');
      }
      
      const buffer = Buffer.concat(chunks);
      
      // Get file metadata with error handling
      let stat;
      try {
        stat = await withTimeout(
          () => minioClient.statObject(BUCKET_NAME, filePath),
          30000,
          'File metadata retrieval timed out'
        );
      } catch (statError) {
        console.warn(`Failed to get file metadata for ${filePath}:`, statError);
        // Continue without metadata rather than failing
      }
      
      let contentType = stat?.metaData?.['content-type'] || 'image/jpeg';
      
      // Validate that it's still a valid image
      try {
        await withTimeout(
          () => sharp(buffer).metadata(),
          30000,
          'Image validation timed out'
        );
      } catch (validationError) {
        console.error(`Stored image validation failed for ${filePath}:`, validationError);
        throw new Error('Corrupted image file. Please try re-uploading the image.');
      }
      
      // Convert to base64 for transmission
      const base64 = buffer.toString('base64');
      
      return {
        success: true,
        data: `data:${contentType};base64,${base64}`,
        contentType,
        size: buffer.length,
      };
    } catch (error) {
      console.error(`Image serving error for ${filePath}:`, error);
      
      if (error instanceof Error) {
        if (error.name === 'StorageError') {
          throw error;
        }
        throw new Error(error.message);
      }
      throw new Error('Image not found or corrupted');
    }
  });

export const getImageVariant = baseProcedure
  .input(z.object({
    filePath: z.string().min(1, "File path is required"),
    variantType: z.string().optional(), // thumbnail, small, medium, large
  }))
  .query(async ({ input }) => {
    const { filePath, variantType } = input;
    
    try {
      // Validate file path to prevent directory traversal
      if (filePath.includes('..') || filePath.includes('/') || filePath.includes('\\')) {
        throw new Error('Invalid file path');
      }
      
      let targetFilePath = filePath;
      
      // If variant type is specified, try to find the variant
      if (variantType) {
        try {
          const { db } = await import("~/server/db");
          
          // Find the main image first
          const mainImage = await db.image.findUnique({
            where: { filePath },
            include: {
              variants: {
                where: { variantType },
              },
            },
          });
          
          if (mainImage?.variants?.[0]) {
            targetFilePath = mainImage.variants[0].filePath;
          }
          // If variant not found, fall back to main image
        } catch (dbError) {
          console.warn(`Failed to lookup variant ${variantType} for ${filePath}:`, dbError);
          // Continue with main image as fallback
        }
      }
      
      // Get image from Minio with enhanced error handling
      let stream;
      try {
        stream = await withTimeout(
          () => minioClient.getObject(BUCKET_NAME, targetFilePath),
          60000,
          'Image variant retrieval timed out'
        );
      } catch (minioError) {
        console.error(`Failed to retrieve image variant ${targetFilePath}:`, minioError);
        throw createStorageError(
          'Image variant not found or storage temporarily unavailable',
          minioError as Error,
          BUCKET_NAME,
          targetFilePath
        );
      }
      
      // Convert stream to buffer with size limit (10MB max)
      const chunks: Buffer[] = [];
      let totalSize = 0;
      const maxSize = 10 * 1024 * 1024; // 10MB
      
      try {
        for await (const chunk of stream) {
          totalSize += chunk.length;
          if (totalSize > maxSize) {
            throw new Error(`Image variant too large (${totalSize} bytes)`);
          }
          chunks.push(chunk);
        }
      } catch (streamError) {
        console.error(`Failed to read variant stream for ${targetFilePath}:`, streamError);
        throw new Error('Failed to read image variant data');
      }
      
      const buffer = Buffer.concat(chunks);
      
      // Get file metadata
      let stat;
      try {
        stat = await withTimeout(
          () => minioClient.statObject(BUCKET_NAME, targetFilePath),
          30000,
          'Variant metadata retrieval timed out'
        );
      } catch (statError) {
        console.warn(`Failed to get variant metadata for ${targetFilePath}:`, statError);
      }
      
      let contentType = stat?.metaData?.['content-type'] || 'image/jpeg';
      
      // Validate that it's still a valid image
      try {
        await withTimeout(
          () => sharp(buffer).metadata(),
          30000,
          'Image variant validation timed out'
        );
      } catch (validationError) {
        console.error(`Stored image variant validation failed for ${targetFilePath}:`, validationError);
        throw new Error('Corrupted image variant file');
      }
      
      // Update usage tracking if this is a main image (with error handling)
      if (!variantType) {
        try {
          const { db } = await import("~/server/db");
          await db.image.update({
            where: { filePath },
            data: {
              usageCount: { increment: 1 },
              lastUsed: new Date(),
            },
          });
        } catch (trackingError) {
          // Don't fail the request if usage tracking fails
          console.warn('Failed to update usage tracking:', trackingError);
        }
      }
      
      // Convert to base64 for transmission
      const base64 = buffer.toString('base64');
      
      return {
        success: true,
        data: `data:${contentType};base64,${base64}`,
        contentType,
        size: buffer.length,
        variant: variantType || 'original',
      };
    } catch (error) {
      console.error(`Image variant serving error for ${filePath}:`, error);
      
      if (error instanceof Error) {
        if (error.name === 'StorageError') {
          throw error;
        }
        throw new Error(error.message);
      }
      throw new Error('Image variant not found or corrupted');
    }
  });

export const adminDeleteImage = baseProcedure
  .input(z.object({
    adminToken: z.string(),
    filePath: z.string().min(1, "File path is required"),
  }))
  .mutation(async ({ input }) => {
    try {
      await requireAdminAuth(input.adminToken);
    } catch (authError) {
      console.error('Authentication failed for image deletion:', authError);
      throw new Error('Authentication failed. Please check your admin token and try again.');
    }
    
    const { filePath } = input;
    
    try {
      // First, get image info and variants from database
      let imageRecord;
      let variants = [];
      
      try {
        const { db } = await import("~/server/db");
        imageRecord = await db.image.findUnique({
          where: { filePath },
          include: {
            variants: true,
          },
        });
        
        if (imageRecord) {
          variants = imageRecord.variants;
        }
      } catch (dbError) {
        console.warn(`Failed to lookup image record for deletion ${filePath}:`, dbError);
        // Continue with file deletion even if database lookup fails
      }
      
      // Delete main image from Minio
      try {
        await withTimeout(
          () => minioClient.removeObject(BUCKET_NAME, filePath),
          60000,
          'Main image deletion timed out'
        );
      } catch (minioError) {
        console.error(`Failed to delete main image ${filePath} from Minio:`, minioError);
        throw createStorageError(
          'Failed to delete image from storage',
          minioError as Error,
          BUCKET_NAME,
          filePath
        );
      }
      
      // Delete variants from Minio
      for (const variant of variants) {
        try {
          await withTimeout(
            () => minioClient.removeObject(BUCKET_NAME, variant.filePath),
            60000,
            `Variant ${variant.variantType} deletion timed out`
          );
          console.log(`Deleted variant ${variant.variantType}: ${variant.filePath}`);
        } catch (variantError) {
          console.error(`Failed to delete variant ${variant.filePath}:`, variantError);
          // Continue with other variants even if one fails
        }
      }
      
      // Delete from database (this will cascade to variants)
      if (imageRecord) {
        try {
          const { db } = await import("~/server/db");
          await db.image.delete({
            where: { id: imageRecord.id },
          });
          console.log(`Deleted image record ${imageRecord.id} from database`);
        } catch (dbDeleteError) {
          console.error(`Failed to delete image record from database:`, dbDeleteError);
          throw createDatabaseError(
            'Failed to delete image record from database',
            dbDeleteError as Error,
            { operation: 'delete_image', imageId: imageRecord.id }
          );
        }
      }
      
      return {
        success: true,
        message: 'Image and all variants deleted successfully',
        deletedVariants: variants.length,
      };
    } catch (error) {
      console.error(`Image deletion error for ${filePath}:`, error);
      
      if (error instanceof Error) {
        if (error.name === 'StorageError' || error.name === 'DatabaseError') {
          throw error;
        }
        throw new Error(error.message);
      }
      throw new Error('Failed to delete image');
    }
  });

export const adminListImages = baseProcedure
  .input(z.object({
    adminToken: z.string(),
    page: z.number().min(1).default(1),
    pageSize: z.number().min(1).max(100).default(20),
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
    } catch (authError) {
      console.error('Authentication failed for image listing:', authError);
      throw new Error('Authentication failed. Please check your admin token and try again.');
    }
    
    const { page, pageSize, search, category, tags, sortBy, sortOrder, includeVariants, includeArchived } = input;
    
    try {
      const { db } = await import("~/server/db");
      
      // Build where clause
      const where: any = {};
      
      if (!includeArchived) {
        where.archived = false;
      }
      
      if (search) {
        where.OR = [
          { fileName: { contains: search, mode: 'insensitive' } },
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }
      
      if (category) {
        where.category = category;
      }
      
      if (tags && tags.length > 0) {
        // Search for any of the specified tags in the JSON array
        where.tags = {
          contains: tags[0], // Simple contains for now, could be enhanced
        };
      }
      
      // Get total count with error handling
      let totalCount = 0;
      try {
        totalCount = await withTimeout(
          () => db.image.count({ where }),
          30000,
          'Image count query timed out'
        );
      } catch (countError) {
        console.error('Failed to count images:', countError);
        throw createDatabaseError(
          'Failed to count images',
          countError as Error,
          { operation: 'count_images' }
        );
      }
      
      // Get images with pagination
      let images;
      try {
        images = await withTimeout(
          () => db.image.findMany({
            where,
            orderBy: { [sortBy]: sortOrder },
            skip: (page - 1) * pageSize,
            take: pageSize,
            include: includeVariants ? {
              variants: {
                orderBy: { createdAt: 'asc' },
              },
            } : false,
          }),
          60000, // 1 minute timeout for complex queries
          'Image listing query timed out'
        );
      } catch (queryError) {
        console.error('Failed to query images:', queryError);
        throw createDatabaseError(
          'Failed to retrieve images',
          queryError as Error,
          { operation: 'list_images' }
        );
      }
      
      // Calculate pagination info
      const totalPages = Math.ceil(totalCount / pageSize);
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;
      
      return {
        success: true,
        images: images.map(img => ({
          ...img,
          tags: JSON.parse(img.tags || '[]'),
        })),
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages,
          hasNextPage,
          hasPreviousPage,
        },
      };
    } catch (error) {
      console.error('Image listing error:', error);
      
      if (error instanceof Error) {
        if (error.name === 'DatabaseError') {
          throw error;
        }
        throw new Error(error.message);
      }
      throw new Error('Failed to list images');
    }
  });

export const adminCreateImageCollection = baseProcedure
  .input(z.object({
    adminToken: z.string(),
    name: z.string().min(1, "Collection name is required"),
    description: z.string().optional(),
    isPublic: z.boolean().default(false),
    imageIds: z.array(z.number()).optional(),
  }))
  .mutation(async ({ input }) => {
    await requireAdminAuth(input.adminToken);
    
    const { name, description, isPublic, imageIds } = input;
    const { db } = await import("~/server/db");
    
    try {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      
      const collection = await db.imageCollection.create({
        data: {
          name,
          description,
          slug,
          isPublic,
        },
      });
      
      // Add images to collection if specified
      if (imageIds && imageIds.length > 0) {
        await Promise.all(
          imageIds.map((imageId, index) =>
            db.imageCollectionItem.create({
              data: {
                collectionId: collection.id,
                imageId,
                order: index,
              },
            })
          )
        );
        
        // Update collection stats
        await db.imageCollection.update({
          where: { id: collection.id },
          data: { imageCount: imageIds.length },
        });
      }
      
      return {
        success: true,
        collection,
        message: 'Collection created successfully',
      };
    } catch (error) {
      console.error('Collection creation error:', error);
      throw new Error('Failed to create collection');
    }
  });

export const adminListImageCollections = baseProcedure
  .input(z.object({
    adminToken: z.string(),
    includeImages: z.boolean().default(false),
  }))
  .query(async ({ input }) => {
    await requireAdminAuth(input.adminToken);
    
    const { includeImages } = input;
    const { db } = await import("~/server/db");
    
    try {
      const collections = await db.imageCollection.findMany({
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
        include: includeImages ? {
          items: {
            include: {
              // We'll need to add the image relation once the schema is updated
            },
            orderBy: { order: 'asc' },
          },
        } : {
          items: {
            select: { id: true },
          },
        },
      });
      
      return {
        success: true,
        collections: collections.map(collection => ({
          ...collection,
          imageCount: collection.items.length,
        })),
      };
    } catch (error) {
      console.error('Collection listing error:', error);
      throw new Error('Failed to list collections');
    }
  });
