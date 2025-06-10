// Import polyfill first to ensure it runs before any code that might use File API
import '../../../polyfill';

import { baseProcedure } from "~/server/trpc/main";
import { requireAdminAuth } from "./auth";
import * as z from "zod";
import { randomUUID } from "crypto";
import { Client } from "minio";
import sharp from "sharp";
import { getMemoryStats, emergencyMemoryCleanup, isMemoryUnderPressure } from "~/server/scripts/optimize-memory";
import fs from "fs/promises";
import path from "path";
import { promisify } from "util";
import { exec } from "child_process";
import { env } from "~/server/env";
const execAsync = promisify(exec);

// Enhanced chunk configuration based on environment
const getOptimalChunkSize = (availableMemory: number): number => {
  if (availableMemory < 512) return 0.5 * 1024 * 1024; // 0.5MB for low memory
  if (availableMemory < 1024) return 1 * 1024 * 1024; // 1MB for medium memory
  return env.UPLOAD_CHUNK_SIZE; // Default from environment (2MB)
};

const MAX_CHUNK_SIZE = 5 * 1024 * 1024; // 5MB absolute maximum
const MIN_CHUNK_SIZE = 0.5 * 1024 * 1024; // 0.5MB minimum
const MAX_CHUNKS_PER_FILE = env.UPLOAD_MAX_CHUNKS; // From environment (100)
const CHUNK_TIMEOUT = env.UPLOAD_TIMEOUT; // From environment (5 minutes)

interface BulletproofImageError extends Error {
  code?: string;
  category?: 'auth' | 'validation' | 'processing' | 'storage' | 'memory' | 'network' | 'format' | 'timeout' | 'size_limit';
  canRetry?: boolean;
  retryAfter?: number;
  suggestions?: string[];
  severity?: 'low' | 'medium' | 'high' | 'critical';
  httpStatus?: number;
  adaptedChunkSize?: number;
}

interface ProcessingStrategy {
  name: string;
  priority: number;
  memoryRequired: number;
  maxFileSize: number;
  supportedFormats: string[];
  processor: (buffer: Buffer, fileName: string, options?: any) => Promise<ProcessingResult>;
}

interface ProcessingResult {
  processedBuffer: Buffer;
  contentType: string;
  extension: string;
  metadata: {
    width?: number;
    height?: number;
    originalSize: number;
    processedSize: number;
    compressionRatio: number;
    processingTime: number;
    strategy: string;
  };
  warnings?: string[];
}

interface UploadChunk {
  chunkId: string;
  chunkIndex: number;
  totalChunks: number;
  data: string; // base64
  fileName: string;
  fileType: string;
}

interface ProgressiveUploadSession {
  sessionId: string;
  fileName: string;
  fileType: string;
  totalSize: number;
  totalChunks: number;
  receivedChunks: Set<number>;
  chunks: Map<number, Buffer>;
  createdAt: Date;
  lastActivity: Date;
  // Enhanced error tracking
  failedChunks: Map<number, { attempts: number; lastError: string; lastAttempt: Date }>;
  adaptiveChunkSize: number;
  originalChunkSize: number;
  memoryPressureAdaptations: number;
  // Recovery state
  isRecovering: boolean;
  recoveryAttempts: number;
  maxRecoveryAttempts: number;
}

const minioClient = new Client({
  endPoint: 'minio',
  port: 9000,
  useSSL: false,
  accessKey: 'minioadmin',
  secretKey: 'minioadmin',
  region: 'us-east-1',
});

const BUCKET_NAME = 'images';
const TEMP_BUCKET_NAME = 'temp-uploads';

// Global state for progressive uploads
const progressiveUploadSessions = new Map<string, ProgressiveUploadSession>();

// Enhanced session cleanup with better recovery tracking
setInterval(() => {
  const now = new Date();
  const sessionTimeout = env.PROGRESSIVE_UPLOAD_SESSION_TIMEOUT;
  
  for (const [sessionId, session] of progressiveUploadSessions.entries()) {
    const timeSinceLastActivity = now.getTime() - session.lastActivity.getTime();
    
    if (timeSinceLastActivity > sessionTimeout) {
      console.log(`🧹 Cleaning up expired upload session: ${sessionId}`, {
        fileName: session.fileName,
        totalChunks: session.totalChunks,
        receivedChunks: session.receivedChunks.size,
        failedChunks: session.failedChunks.size,
        adaptations: session.memoryPressureAdaptations,
        timeSinceActivity: `${Math.round(timeSinceLastActivity / 1000)}s`
      });
      
      progressiveUploadSessions.delete(sessionId);
    } else if (session.isRecovering && timeSinceLastActivity > 10 * 60 * 1000) { // 10 minutes for recovery
      console.log(`🔄 Marking stuck recovery session for cleanup: ${sessionId}`);
      progressiveUploadSessions.delete(sessionId);
    }
  }
}, 5 * 60 * 1000); // Check every 5 minutes

const createBulletproofError = (
  message: string, 
  category: BulletproofImageError['category'] = 'processing',
  options: {
    canRetry?: boolean;
    retryAfter?: number;
    suggestions?: string[];
    severity?: 'low' | 'medium' | 'high' | 'critical';
    code?: string;
    httpStatus?: number;
    adaptedChunkSize?: number;
  } = {}
): BulletproofImageError => {
  const error = new Error(message) as BulletproofImageError;
  error.category = category;
  error.canRetry = options.canRetry ?? true;
  error.retryAfter = options.retryAfter;
  error.suggestions = options.suggestions || [];
  error.severity = options.severity || 'medium';
  error.code = options.code;
  error.httpStatus = options.httpStatus;
  error.adaptedChunkSize = options.adaptedChunkSize;
  return error;
};

const validateChunk = (
  chunkData: string,
  chunkIndex: number,
  totalChunks: number,
  session?: ProgressiveUploadSession
): { valid: boolean; error?: BulletproofImageError; adaptedChunkSize?: number } => {
  try {
    // Parse chunk data
    const base64Data = chunkData.includes('base64,') ? chunkData.split('base64,')[1] : chunkData;
    const chunkBuffer = Buffer.from(base64Data, 'base64');
    
    // Check chunk size limits
    if (chunkBuffer.length > MAX_CHUNK_SIZE) {
      const chunkSizeMB = (chunkBuffer.length / (1024 * 1024)).toFixed(1);
      return {
        valid: false,
        error: createBulletproofError(
          `Chunk too large (${chunkSizeMB}MB). Maximum chunk size is ${MAX_CHUNK_SIZE / (1024 * 1024)}MB.`,
          'size_limit',
          {
            httpStatus: 413,
            suggestions: [
              'Reduce chunk size and retry',
              'Use smaller chunks for better reliability',
              'Check client-side chunking configuration'
            ],
            adaptedChunkSize: Math.max(MIN_CHUNK_SIZE, chunkBuffer.length / 2)
          }
        )
      };
    }
    
    if (chunkBuffer.length < 100 && chunkIndex < totalChunks - 1) { // Allow small last chunks
      return {
        valid: false,
        error: createBulletproofError(
          'Chunk too small or empty',
          'validation',
          { canRetry: false }
        )
      };
    }
    
    // Check chunk index validity
    if (chunkIndex < 0 || chunkIndex >= totalChunks) {
      return {
        valid: false,
        error: createBulletproofError(
          `Invalid chunk index ${chunkIndex} for ${totalChunks} total chunks`,
          'validation',
          { canRetry: false }
        )
      };
    }
    
    // Memory-based chunk size adaptation
    const memoryStats = getMemoryStats();
    if (memoryStats.system.pressure === 'high' && session) {
      const optimalSize = getOptimalChunkSize(memoryStats.system.available);
      if (chunkBuffer.length > optimalSize) {
        return {
          valid: false,
          error: createBulletproofError(
            `Chunk size too large for current memory conditions (${memoryStats.system.pressure} pressure)`,
            'memory',
            {
              retryAfter: 60,
              suggestions: [
                'Reduce chunk size due to server memory pressure',
                'Wait for server resources to free up',
                'Try uploading during off-peak hours'
              ]
            }
          ),
          adaptedChunkSize: optimalSize
        };
      }
    }
    
    return { valid: true };
    
  } catch (error) {
    return {
      valid: false,
      error: createBulletproofError(
        `Chunk validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'validation'
      )
    };
  }
};

const processingStrategies: ProcessingStrategy[] = [
  // Strategy 1: High-quality processing for optimal images
  {
    name: 'high-quality',
    priority: 1,
    memoryRequired: 512, // MB
    maxFileSize: 25 * 1024 * 1024, // 25MB
    supportedFormats: ['image/jpeg', 'image/png', 'image/webp'],
    processor: async (buffer: Buffer, fileName: string): Promise<ProcessingResult> => {
      const startTime = Date.now();
      const originalSize = buffer.length;
      
      const sharpInstance = sharp(buffer, {
        limitInputPixels: 67108864, // 8192x8192
        sequentialRead: true,
      });
      
      const metadata = await sharpInstance.metadata();
      
      let processedImage = sharpInstance;
      
      // Smart resizing based on dimensions
      if (metadata.width && metadata.height) {
        if (metadata.width > 2048 || metadata.height > 2048) {
          processedImage = processedImage.resize(2048, 2048, {
            fit: 'inside',
            withoutEnlargement: true,
          });
        }
      }
      
      // Format-specific optimization
      let outputBuffer: Buffer;
      let contentType: string;
      let extension: string;
      
      if (metadata.hasAlpha) {
        outputBuffer = await processedImage.png({ 
          compressionLevel: 6,
          adaptiveFiltering: true 
        }).toBuffer();
        contentType = 'image/png';
        extension = 'png';
      } else {
        outputBuffer = await processedImage.jpeg({ 
          quality: 85, 
          progressive: true,
          mozjpeg: true 
        }).toBuffer();
        contentType = 'image/jpeg';
        extension = 'jpg';
      }
      
      const finalMetadata = await sharp(outputBuffer).metadata();
      
      sharpInstance.destroy();
      
      return {
        processedBuffer: outputBuffer,
        contentType,
        extension,
        metadata: {
          width: finalMetadata.width,
          height: finalMetadata.height,
          originalSize,
          processedSize: outputBuffer.length,
          compressionRatio: originalSize / outputBuffer.length,
          processingTime: Date.now() - startTime,
          strategy: 'high-quality',
        },
      };
    },
  },
  
  // Strategy 2: Memory-efficient processing for large images
  {
    name: 'memory-efficient',
    priority: 2,
    memoryRequired: 256, // MB
    maxFileSize: 50 * 1024 * 1024, // 50MB
    supportedFormats: ['image/jpeg', 'image/png', 'image/webp', 'image/tiff', 'image/bmp'],
    processor: async (buffer: Buffer, fileName: string): Promise<ProcessingResult> => {
      const startTime = Date.now();
      const originalSize = buffer.length;
      
      const sharpInstance = sharp(buffer, {
        limitInputPixels: 33554432, // 4096x8192
        sequentialRead: true,
        density: 72, // Reduce DPI for memory efficiency
      });
      
      const metadata = await sharpInstance.metadata();
      
      // Aggressive resizing for memory efficiency
      let processedImage = sharpInstance;
      if (metadata.width && metadata.height) {
        const maxDimension = Math.max(metadata.width, metadata.height);
        if (maxDimension > 1024) {
          const scaleFactor = 1024 / maxDimension;
          processedImage = processedImage.resize(
            Math.round(metadata.width * scaleFactor),
            Math.round(metadata.height * scaleFactor),
            { fit: 'inside' }
          );
        }
      }
      
      // Always convert to JPEG for memory efficiency
      const outputBuffer = await processedImage.jpeg({ 
        quality: 75,
        progressive: false, // Faster processing
      }).toBuffer();
      
      const finalMetadata = await sharp(outputBuffer).metadata();
      
      sharpInstance.destroy();
      
      return {
        processedBuffer: outputBuffer,
        contentType: 'image/jpeg',
        extension: 'jpg',
        metadata: {
          width: finalMetadata.width,
          height: finalMetadata.height,
          originalSize,
          processedSize: outputBuffer.length,
          compressionRatio: originalSize / outputBuffer.length,
          processingTime: Date.now() - startTime,
          strategy: 'memory-efficient',
        },
        warnings: ['Image was processed with memory-efficient settings for large file size'],
      };
    },
  },
  
  // Strategy 3: Format conversion for unsupported formats
  {
    name: 'format-converter',
    priority: 3,
    memoryRequired: 384, // MB
    maxFileSize: 100 * 1024 * 1024, // 100MB
    supportedFormats: ['image/heic', 'image/heif', 'image/tiff', 'image/bmp', 'image/svg+xml', 'image/avif'],
    processor: async (buffer: Buffer, fileName: string): Promise<ProcessingResult> => {
      const startTime = Date.now();
      const originalSize = buffer.length;
      
      // Try to process with Sharp first
      try {
        const sharpInstance = sharp(buffer, {
          limitInputPixels: 16777216, // 4096x4096
          sequentialRead: true,
        });
        
        const metadata = await sharpInstance.metadata();
        
        // Convert everything to JPEG for compatibility
        const outputBuffer = await sharpInstance
          .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 80 })
          .toBuffer();
        
        const finalMetadata = await sharp(outputBuffer).metadata();
        
        sharpInstance.destroy();
        
        return {
          processedBuffer: outputBuffer,
          contentType: 'image/jpeg',
          extension: 'jpg',
          metadata: {
            width: finalMetadata.width,
            height: finalMetadata.height,
            originalSize,
            processedSize: outputBuffer.length,
            compressionRatio: originalSize / outputBuffer.length,
            processingTime: Date.now() - startTime,
            strategy: 'format-converter',
          },
          warnings: ['Image was converted from unsupported format to JPEG'],
        };
      } catch (sharpError) {
        // Fallback to external conversion tools if available
        throw createBulletproofError(
          `Format conversion failed: ${sharpError instanceof Error ? sharpError.message : 'Unknown error'}`,
          'format',
          {
            suggestions: ['Try converting the image to JPEG or PNG format first', 'Use an image editor to re-save the file'],
            severity: 'high',
          }
        );
      }
    },
  },
  
  // Strategy 4: Emergency fallback for any remaining cases
  {
    name: 'emergency-fallback',
    priority: 4,
    memoryRequired: 128, // MB
    maxFileSize: 200 * 1024 * 1024, // 200MB
    supportedFormats: ['*'], // Accept anything
    processor: async (buffer: Buffer, fileName: string): Promise<ProcessingResult> => {
      const startTime = Date.now();
      const originalSize = buffer.length;
      
      // Extremely conservative processing
      try {
        const sharpInstance = sharp(buffer, {
          limitInputPixels: 4194304, // 2048x2048
          sequentialRead: true,
          density: 72,
        });
        
        // Force to small JPEG with maximum compression
        const outputBuffer = await sharpInstance
          .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 60 })
          .toBuffer();
        
        const finalMetadata = await sharp(outputBuffer).metadata();
        
        sharpInstance.destroy();
        
        return {
          processedBuffer: outputBuffer,
          contentType: 'image/jpeg',
          extension: 'jpg',
          metadata: {
            width: finalMetadata.width || 800,
            height: finalMetadata.height || 600,
            originalSize,
            processedSize: outputBuffer.length,
            compressionRatio: originalSize / outputBuffer.length,
            processingTime: Date.now() - startTime,
            strategy: 'emergency-fallback',
          },
          warnings: [
            'Image was processed with emergency fallback settings',
            'Quality may be reduced for compatibility',
            'Original image may have been in an unusual format',
          ],
        };
      } catch (error) {
        throw createBulletproofError(
          'All processing strategies failed - image may be corrupted or in an unsupported format',
          'processing',
          {
            canRetry: false,
            suggestions: [
              'Try opening and re-saving the image in an image editor',
              'Convert to a standard format (JPEG/PNG) before uploading',
              'Check if the file is actually an image',
              'Contact support if this is a valid image file',
            ],
            severity: 'critical',
          }
        );
      }
    },
  },
];

const selectProcessingStrategy = async (
  buffer: Buffer, 
  fileName: string, 
  fileType: string
): Promise<ProcessingStrategy> => {
  const memoryStats = getMemoryStats();
  const availableMemory = memoryStats.system.available;
  const fileSize = buffer.length;
  
  // Filter strategies based on current system state
  const viableStrategies = processingStrategies.filter(strategy => {
    // Check memory requirements
    if (strategy.memoryRequired > availableMemory) {
      return false;
    }
    
    // Check file size limits
    if (fileSize > strategy.maxFileSize) {
      return false;
    }
    
    // Check format support
    if (!strategy.supportedFormats.includes('*') && 
        !strategy.supportedFormats.includes(fileType)) {
      return false;
    }
    
    return true;
  });
  
  if (viableStrategies.length === 0) {
    // If no strategies are viable, force emergency fallback
    console.warn(`No viable strategies for ${fileName}, forcing emergency fallback`);
    return processingStrategies[processingStrategies.length - 1]; // Emergency fallback
  }
  
  // Sort by priority and select the best one
  viableStrategies.sort((a, b) => a.priority - b.priority);
  
  const selectedStrategy = viableStrategies[0];
  console.log(`Selected processing strategy: ${selectedStrategy.name} for ${fileName}`);
  
  return selectedStrategy;
};

const processImageWithFallbacks = async (
  buffer: Buffer, 
  fileName: string, 
  fileType: string
): Promise<ProcessingResult> => {
  // Pre-processing memory check
  if (isMemoryUnderPressure()) {
    console.warn('System under memory pressure, performing cleanup before processing');
    await emergencyMemoryCleanup('pre-processing cleanup');
    
    // Wait a bit for cleanup to take effect
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  let lastError: Error | null = null;
  
  // Try strategies in order of viability
  for (const strategy of processingStrategies) {
    try {
      console.log(`Attempting processing with strategy: ${strategy.name}`);
      
      // Check if strategy is viable for current conditions
      const memoryStats = getMemoryStats();
      if (strategy.memoryRequired > memoryStats.system.available) {
        console.log(`Skipping ${strategy.name} - insufficient memory`);
        continue;
      }
      
      if (buffer.length > strategy.maxFileSize) {
        console.log(`Skipping ${strategy.name} - file too large`);
        continue;
      }
      
      if (!strategy.supportedFormats.includes('*') && 
          !strategy.supportedFormats.includes(fileType)) {
        console.log(`Skipping ${strategy.name} - format not supported`);
        continue;
      }
      
      // Attempt processing
      const result = await strategy.processor(buffer, fileName);
      console.log(`Successfully processed ${fileName} with strategy: ${strategy.name}`);
      return result;
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown processing error');
      console.warn(`Strategy ${strategy.name} failed for ${fileName}:`, lastError.message);
      
      // Clean up memory after failed attempt
      if (global.gc) {
        global.gc();
      }
      
      // If this was a memory error, try emergency cleanup
      if (lastError.message.toLowerCase().includes('memory')) {
        await emergencyMemoryCleanup(`after ${strategy.name} failure`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      continue; // Try next strategy
    }
  }
  
  // If all strategies failed, throw the last error with enhanced information
  throw createBulletproofError(
    `All processing strategies failed. Last error: ${lastError?.message || 'Unknown error'}`,
    'processing',
    {
      canRetry: false,
      suggestions: [
        'The image may be corrupted or in an unsupported format',
        'Try opening and re-saving the image in an image editor',
        'Convert to JPEG or PNG format before uploading',
        'Reduce the image file size and try again',
        'Contact support if this is a valid image file',
      ],
      severity: 'critical',
    }
  );
};

const uploadToStorageWithRetry = async (
  fileName: string, 
  buffer: Buffer, 
  contentType: string,
  maxRetries: number = 3
): Promise<void> => {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Check storage space before upload
      await ensureBucketExists();
      
      await minioClient.putObject(BUCKET_NAME, fileName, buffer, buffer.length, {
        'Content-Type': contentType,
        'X-Upload-Timestamp': new Date().toISOString(),
        'X-Upload-Attempt': attempt.toString(),
      });
      
      console.log(`Successfully uploaded ${fileName} on attempt ${attempt}`);
      return;
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown storage error');
      console.warn(`Storage upload attempt ${attempt} failed for ${fileName}:`, lastError.message);
      
      if (attempt < maxRetries) {
        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Retrying upload in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw createBulletproofError(
    `Storage upload failed after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`,
    'storage',
    {
      retryAfter: 60, // Suggest retry after 1 minute
      suggestions: [
        'Check your internet connection',
        'Try uploading a smaller image',
        'Wait a few minutes and try again',
        'Contact support if the problem persists',
      ],
    }
  );
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

const ensureBucketExists = async (): Promise<void> => {
  try {
    // Check main bucket
    const mainBucketExists = await minioClient.bucketExists(BUCKET_NAME);
    if (!mainBucketExists) {
      await minioClient.makeBucket(BUCKET_NAME);
      console.log(`Created main bucket: ${BUCKET_NAME}`);
    }
    
    // Check temp bucket for progressive uploads
    const tempBucketExists = await minioClient.bucketExists(TEMP_BUCKET_NAME);
    if (!tempBucketExists) {
      await minioClient.makeBucket(TEMP_BUCKET_NAME);
      console.log(`Created temp bucket: ${TEMP_BUCKET_NAME}`);
    }
    
    // Monitor storage usage (basic check)
    try {
      const objects = await minioClient.listObjects(BUCKET_NAME, '', false);
      let totalSize = 0;
      let objectCount = 0;
      
      for await (const obj of objects) {
        totalSize += obj.size || 0;
        objectCount++;
      }
      
      const totalSizeMB = totalSize / (1024 * 1024);
      
      if (totalSizeMB > 10000) { // 10GB warning
        console.warn(`Storage usage warning: ${totalSizeMB.toFixed(1)}MB across ${objectCount} objects`);
      }
      
    } catch (listError) {
      console.warn('Could not check storage usage:', listError);
    }
    
  } catch (error) {
    console.error('Bucket management error:', error);
    throw createBulletproofError(
      'Storage system unavailable',
      'storage',
      {
        retryAfter: 30,
        suggestions: ['Wait a moment and try again', 'Contact administrator'],
      }
    );
  }
};

// Storage system health check endpoint
export const storageHealthCheck = baseProcedure
  .input(z.object({
    adminToken: z.string(),
    testUpload: z.boolean().default(false),
  }))
  .query(async ({ input }) => {
    try {
      await requireAdminAuth(input.adminToken);
      
      console.log('🏥 STORAGE HEALTH CHECK: Starting comprehensive storage system validation');
      
      const healthResults = {
        timestamp: new Date().toISOString(),
        bucketExists: false,
        bucketAccessible: false,
        testFileUpload: false,
        testFileDownload: false,
        testFileDelete: false,
        memoryStatus: 'unknown' as 'low' | 'medium' | 'high' | 'critical' | 'unknown',
        errors: [] as string[],
        warnings: [] as string[],
        details: {} as Record<string, any>,
      };
      
      // Check memory status first
      try {
        const memoryStats = getMemoryStats();
        healthResults.memoryStatus = memoryStats.system.pressure;
        healthResults.details.memory = {
          heapUsed: `${memoryStats.heap.used.toFixed(1)}MB`,
          heapTotal: `${memoryStats.heap.total.toFixed(1)}MB`,
          heapPercentage: `${memoryStats.heap.percentage.toFixed(1)}%`,
          rss: `${memoryStats.rss.toFixed(1)}MB`,
          available: `${memoryStats.system.available.toFixed(1)}MB`,
          pressure: memoryStats.system.pressure,
        };
        
        if (memoryStats.system.pressure === 'critical') {
          healthResults.errors.push('Critical memory pressure detected');
        } else if (memoryStats.system.pressure === 'high') {
          healthResults.warnings.push('High memory pressure detected');
        }
      } catch (memoryError) {
        healthResults.errors.push(`Memory check failed: ${memoryError instanceof Error ? memoryError.message : 'Unknown error'}`);
      }
      
      // Check if main bucket exists
      try {
        const bucketExists = await minioClient.bucketExists(BUCKET_NAME);
        healthResults.bucketExists = bucketExists;
        
        if (!bucketExists) {
          healthResults.errors.push(`Main bucket '${BUCKET_NAME}' does not exist`);
          return { success: false, health: healthResults };
        }
        
        console.log(`✅ STORAGE HEALTH CHECK: Main bucket '${BUCKET_NAME}' exists`);
      } catch (bucketError) {
        const errorMsg = `Failed to check bucket existence: ${bucketError instanceof Error ? bucketError.message : 'Unknown error'}`;
        healthResults.errors.push(errorMsg);
        console.error(`❌ STORAGE HEALTH CHECK: ${errorMsg}`);
        return { success: false, health: healthResults };
      }
      
      // Check bucket accessibility by listing objects (limited)
      try {
        const objects = minioClient.listObjects(BUCKET_NAME, '', false);
        let objectCount = 0;
        let totalSize = 0;
        
        // Check first few objects
        for await (const obj of objects) {
          objectCount++;
          totalSize += obj.size || 0;
          
          if (objectCount >= 10) break; // Limit check to first 10 objects
        }
        
        healthResults.bucketAccessible = true;
        healthResults.details.bucketInfo = {
          sampleObjectCount: objectCount,
          sampleTotalSize: `${(totalSize / (1024 * 1024)).toFixed(1)}MB`,
        };
        
        console.log(`✅ STORAGE HEALTH CHECK: Bucket accessible, found ${objectCount} sample objects`);
      } catch (listError) {
        const errorMsg = `Failed to access bucket contents: ${listError instanceof Error ? listError.message : 'Unknown error'}`;
        healthResults.errors.push(errorMsg);
        console.error(`❌ STORAGE HEALTH CHECK: ${errorMsg}`);
      }
      
      // Perform test upload/download/delete if requested
      if (input.testUpload && healthResults.bucketExists) {
        const testFileName = `health-check-${Date.now()}.txt`;
        const testContent = `Health check test file created at ${new Date().toISOString()}`;
        const testBuffer = Buffer.from(testContent, 'utf-8');
        
        try {
          // Test upload
          console.log(`🧪 STORAGE HEALTH CHECK: Testing upload with file ${testFileName}`);
          await minioClient.putObject(BUCKET_NAME, testFileName, testBuffer, testBuffer.length, {
            'Content-Type': 'text/plain',
            'X-Health-Check': 'true',
          });
          
          healthResults.testFileUpload = true;
          console.log(`✅ STORAGE HEALTH CHECK: Test upload successful`);
          
          // Verify file exists
          const verification = await verifyFileExistsInStorage(testFileName, testBuffer.length);
          if (!verification.exists) {
            healthResults.warnings.push(`Test file uploaded but verification failed: ${verification.error}`);
          } else {
            console.log(`✅ STORAGE HEALTH CHECK: Test file verification successful`);
          }
          
          // Test download
          try {
            const stream = await minioClient.getObject(BUCKET_NAME, testFileName);
            const chunks: Buffer[] = [];
            
            for await (const chunk of stream) {
              chunks.push(chunk);
            }
            
            const downloadedContent = Buffer.concat(chunks).toString('utf-8');
            
            if (downloadedContent === testContent) {
              healthResults.testFileDownload = true;
              console.log(`✅ STORAGE HEALTH CHECK: Test download successful`);
            } else {
              healthResults.errors.push('Test download content mismatch');
              console.error(`❌ STORAGE HEALTH CHECK: Downloaded content doesn't match uploaded content`);
            }
          } catch (downloadError) {
            const errorMsg = `Test download failed: ${downloadError instanceof Error ? downloadError.message : 'Unknown error'}`;
            healthResults.errors.push(errorMsg);
            console.error(`❌ STORAGE HEALTH CHECK: ${errorMsg}`);
          }
          
          // Test delete
          try {
            await minioClient.removeObject(BUCKET_NAME, testFileName);
            healthResults.testFileDelete = true;
            console.log(`✅ STORAGE HEALTH CHECK: Test delete successful`);
          } catch (deleteError) {
            const errorMsg = `Test delete failed: ${deleteError instanceof Error ? deleteError.message : 'Unknown error'}`;
            healthResults.warnings.push(errorMsg); // Warning, not error, since upload/download worked
            console.warn(`⚠️ STORAGE HEALTH CHECK: ${errorMsg}`);
          }
          
        } catch (uploadError) {
          const errorMsg = `Test upload failed: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`;
          healthResults.errors.push(errorMsg);
          console.error(`❌ STORAGE HEALTH CHECK: ${errorMsg}`);
        }
      }
      
      // Check environment configuration
      try {
        const { env } = await import("~/server/env");
        healthResults.details.environment = {
          uploadMaxFileSize: `${(env.UPLOAD_MAX_FILE_SIZE / (1024 * 1024)).toFixed(0)}MB`,
          chunkSize: `${(env.UPLOAD_CHUNK_SIZE / (1024 * 1024)).toFixed(0)}MB`,
          progressiveThreshold: `${(env.PROGRESSIVE_UPLOAD_THRESHOLD / (1024 * 1024)).toFixed(0)}MB`,
          memoryLimit: `${env.IMAGE_PROCESSING_MEMORY_LIMIT}MB`,
          corsOrigins: env.IMAGE_CORS_ORIGINS.join(', '),
          monitoringEnabled: env.ENABLE_UPLOAD_MONITORING,
        };
      } catch (envError) {
        healthResults.warnings.push(`Environment check failed: ${envError instanceof Error ? envError.message : 'Unknown error'}`);
      }
      
      // Determine overall health status
      const isHealthy = healthResults.bucketExists && 
                       healthResults.bucketAccessible && 
                       (!input.testUpload || (healthResults.testFileUpload && healthResults.testFileDownload)) &&
                       healthResults.errors.length === 0 &&
                       healthResults.memoryStatus !== 'critical';
      
      const healthSummary = {
        status: isHealthy ? 'healthy' : 'degraded',
        score: Math.max(0, 100 - (healthResults.errors.length * 25) - (healthResults.warnings.length * 10)),
        recommendations: [] as string[],
      };
      
      if (!isHealthy) {
        if (healthResults.errors.length > 0) {
          healthSummary.recommendations.push('Address critical errors before using image upload');
        }
        if (healthResults.memoryStatus === 'critical') {
          healthSummary.recommendations.push('Increase server memory or reduce concurrent operations');
        }
        if (!healthResults.bucketAccessible) {
          healthSummary.recommendations.push('Check Minio service connectivity and permissions');
        }
      }
      
      console.log(`🏥 STORAGE HEALTH CHECK: Completed with status '${healthSummary.status}' (score: ${healthSummary.score}/100)`);
      
      return {
        success: isHealthy,
        health: healthResults,
        summary: healthSummary,
        timestamp: new Date().toISOString(),
      };
      
    } catch (error) {
      console.error('❌ STORAGE HEALTH CHECK: Failed:', error);
      
      return {
        success: false,
        health: {
          timestamp: new Date().toISOString(),
          bucketExists: false,
          bucketAccessible: false,
          testFileUpload: false,
          testFileDownload: false,
          testFileDelete: false,
          memoryStatus: 'unknown' as const,
          errors: [`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
          warnings: [],
          details: {},
        },
        summary: {
          status: 'unhealthy',
          score: 0,
          recommendations: ['Check server logs and storage system connectivity'],
        },
        timestamp: new Date().toISOString(),
      };
    }
  });

const progressiveUploadInputSchema = z.object({
  adminToken: z.string(),
  chunkId: z.string().min(1).max(100),
  chunkIndex: z.number().min(0).max(env.UPLOAD_MAX_CHUNKS - 1),
  totalChunks: z.number().min(1).max(env.UPLOAD_MAX_CHUNKS),
  data: z.string().min(1), // base64 chunk
  fileName: z.string().min(1).max(255),
  fileType: z.string().regex(/^image\//, "File must be an image"),
  sessionId: z.string().optional(),
  // Enhanced parameters for adaptive chunking
  originalChunkSize: z.number().optional(),
  isRetry: z.boolean().default(false),
  retryAttempt: z.number().min(0).max(5).default(0),
});

export const bulletproofProgressiveUpload = baseProcedure
  .input(progressiveUploadInputSchema)
  .mutation(async ({ input }) => {
    const startTime = Date.now();
    const { chunkId, chunkIndex, totalChunks, data, fileName, fileType, isRetry, retryAttempt } = input;
    
    try {
      await requireAdminAuth(input.adminToken);
      
      console.log(`📦 Processing chunk ${chunkIndex + 1}/${totalChunks} for ${fileName}${isRetry ? ` (retry ${retryAttempt})` : ''}`);
      
      // Generate or use existing session ID
      const sessionId = input.sessionId || `progressive_${Date.now()}_${randomUUID()}`;
      
      // Memory check before processing
      const memoryStats = getMemoryStats();
      if (memoryStats.system.pressure === 'critical') {
        console.warn(`❌ Critical memory pressure during chunk upload for ${fileName}`);
        throw createBulletproofError(
          `Server memory critically low (${memoryStats.rss.toFixed(1)}MB). Cannot process chunk safely.`,
          'memory',
          {
            retryAfter: 180, // 3 minutes
            suggestions: [
              'Wait for server resources to free up',
              'Try uploading with smaller chunks',
              'Upload during off-peak hours'
            ]
          }
        );
      }
      
      // Get or create session with enhanced initialization
      let session = progressiveUploadSessions.get(sessionId);
      if (!session) {
        // Validate total file size before creating session
        const estimatedFileSize = totalChunks * (input.originalChunkSize || env.UPLOAD_CHUNK_SIZE);
        if (estimatedFileSize > env.UPLOAD_MAX_FILE_SIZE) {
          throw createBulletproofError(
            `Estimated file size (${(estimatedFileSize / (1024 * 1024)).toFixed(1)}MB) exceeds maximum allowed (${(env.UPLOAD_MAX_FILE_SIZE / (1024 * 1024)).toFixed(0)}MB)`,
            'size_limit',
            {
              httpStatus: 413,
              suggestions: [
                'Reduce image size before uploading',
                'Compress the image to reduce file size',
                'Use progressive upload for smaller chunks'
              ]
            }
          );
        }
        
        session = {
          sessionId,
          fileName,
          fileType,
          totalSize: 0,
          totalChunks,
          receivedChunks: new Set(),
          chunks: new Map(),
          createdAt: new Date(),
          lastActivity: new Date(),
          failedChunks: new Map(),
          adaptiveChunkSize: input.originalChunkSize || env.UPLOAD_CHUNK_SIZE,
          originalChunkSize: input.originalChunkSize || env.UPLOAD_CHUNK_SIZE,
          memoryPressureAdaptations: 0,
          isRecovering: false,
          recoveryAttempts: 0,
          maxRecoveryAttempts: 3,
        };
        
        progressiveUploadSessions.set(sessionId, session);
        console.log(`🆕 Created progressive upload session: ${sessionId} for ${fileName}`);
      }
      
      // Update session activity
      session.lastActivity = new Date();
      
      // Validate chunk with adaptive sizing
      const validation = validateChunk(data, chunkIndex, totalChunks, session);
      if (!validation.valid) {
        // Handle 413-like errors with adaptive chunk sizing
        if (validation.error?.category === 'size_limit' || validation.error?.category === 'memory') {
          session.failedChunks.set(chunkIndex, {
            attempts: (session.failedChunks.get(chunkIndex)?.attempts || 0) + 1,
            lastError: validation.error.message,
            lastAttempt: new Date()
          });
          
          // Suggest adaptive chunk size if available
          if (validation.adaptedChunkSize) {
            session.adaptiveChunkSize = validation.adaptedChunkSize;
            session.memoryPressureAdaptations++;
            
            console.log(`🔧 Suggesting adaptive chunk size: ${(validation.adaptedChunkSize / (1024 * 1024)).toFixed(1)}MB for ${fileName}`);
            
            return {
              success: false,
              complete: false,
              sessionId,
              error: validation.error.message,
              adaptiveChunkSize: validation.adaptedChunkSize,
              suggestedAction: 'reduce_chunk_size',
              receivedChunks: session.receivedChunks.size,
              totalChunks,
              memoryPressure: memoryStats.system.pressure,
            };
          }
        }
        
        throw validation.error;
      }
      
      // Parse and store chunk
      const base64Data = data.includes('base64,') ? data.split('base64,')[1] : data;
      const chunkBuffer = Buffer.from(base64Data, 'base64');
      
      // Check for duplicate chunks
      if (session.receivedChunks.has(chunkIndex)) {
        console.log(`⚠️ Duplicate chunk ${chunkIndex} received for ${fileName}, skipping`);
        return {
          success: true,
          complete: false,
          sessionId,
          receivedChunks: session.receivedChunks.size,
          totalChunks,
          message: `Chunk ${chunkIndex + 1} already received (duplicate)`,
        };
      }
      
      // Store chunk and update session
      session.chunks.set(chunkIndex, chunkBuffer);
      session.receivedChunks.add(chunkIndex);
      session.totalSize += chunkBuffer.length;
      
      // Remove from failed chunks if it was previously failed
      if (session.failedChunks.has(chunkIndex)) {
        session.failedChunks.delete(chunkIndex);
      }
      
      console.log(`✅ Chunk ${chunkIndex + 1}/${totalChunks} received for ${fileName} (${(chunkBuffer.length / 1024).toFixed(1)}KB)`);
      
      // Check if upload is complete
      if (session.receivedChunks.size === totalChunks) {
        console.log(`🔄 All chunks received for ${fileName}, assembling file...`);
        
        try {
          // Pre-assembly memory check
          if (isMemoryUnderPressure()) {
            console.warn(`Memory pressure detected before assembly of ${fileName}, performing cleanup`);
            await emergencyMemoryCleanup(`before assembly of ${fileName}`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
          
          // Assemble chunks in order with memory management
          const assembledChunks: Buffer[] = [];
          let totalAssembledSize = 0;
          
          for (let i = 0; i < totalChunks; i++) {
            const chunk = session.chunks.get(i);
            if (!chunk) {
              throw createBulletproofError(
                `Missing chunk ${i} during assembly of ${fileName}`,
                'validation',
                {
                  canRetry: true,
                  suggestions: [
                    'Re-upload the missing chunk',
                    'Restart the upload with smaller chunks',
                    'Check network connection stability'
                  ]
                }
              );
            }
            
            assembledChunks.push(chunk);
            totalAssembledSize += chunk.length;
            
            // Memory pressure check during assembly
            if (i % 10 === 0 && isMemoryUnderPressure()) {
              console.warn(`Memory pressure during assembly at chunk ${i}, forcing garbage collection`);
              if (global.gc) global.gc();
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }
          
          console.log(`🔧 Assembling ${totalChunks} chunks into ${(totalAssembledSize / (1024 * 1024)).toFixed(1)}MB file: ${fileName}`);
          
          const completeBuffer = Buffer.concat(assembledChunks);
          
          // Validate assembled file size
          if (completeBuffer.length !== totalAssembledSize) {
            throw createBulletproofError(
              `File assembly size mismatch: expected ${totalAssembledSize}, got ${completeBuffer.length}`,
              'processing'
            );
          }
          
          // Clean up session early to free memory
          progressiveUploadSessions.delete(sessionId);
          
          // Process the complete file using the bulletproof system
          console.log(`🚀 Processing assembled file: ${fileName}`);
          const result = await bulletproofSingleUpload.resolver({
            input: {
              adminToken: input.adminToken,
              fileName,
              fileContent: completeBuffer.toString('base64'),
              fileType,
            },
            ctx: {} as any,
          });
          
          const totalTime = Date.now() - startTime;
          console.log(`✅ Progressive upload completed: ${fileName} in ${totalTime}ms`);
          
          return {
            success: true,
            complete: true,
            sessionId,
            ...result,
            progressiveUploadStats: {
              totalChunks,
              totalSize: completeBuffer.length,
              processingTime: totalTime,
              memoryAdaptations: session.memoryPressureAdaptations,
              recoveryAttempts: session.recoveryAttempts,
            },
          };
          
        } catch (assemblyError) {
          console.error(`❌ Assembly failed for ${fileName}:`, assemblyError);
          
          // Mark session for recovery
          session.isRecovering = true;
          session.recoveryAttempts++;
          
          if (session.recoveryAttempts > session.maxRecoveryAttempts) {
            progressiveUploadSessions.delete(sessionId);
            throw createBulletproofError(
              `Assembly failed after ${session.maxRecoveryAttempts} attempts: ${assemblyError instanceof Error ? assemblyError.message : 'Unknown error'}`,
              'processing',
              {
                suggestions: [
                  'Restart the upload with smaller chunks',
                  'Check file integrity and try again',
                  'Contact support if the problem persists'
                ]
              }
            );
          }
          
          throw assemblyError;
        }
      }
      
      // Upload not yet complete - return progress
      const progressPercentage = (session.receivedChunks.size / totalChunks) * 100;
      
      return {
        success: true,
        complete: false,
        sessionId,
        receivedChunks: session.receivedChunks.size,
        totalChunks,
        progress: progressPercentage,
        message: `Received chunk ${chunkIndex + 1}/${totalChunks} (${progressPercentage.toFixed(1)}%)`,
        adaptiveChunkSize: session.adaptiveChunkSize !== session.originalChunkSize ? session.adaptiveChunkSize : undefined,
        memoryPressure: memoryStats.system.pressure,
        sessionStats: {
          failedChunks: session.failedChunks.size,
          memoryAdaptations: session.memoryPressureAdaptations,
          recoveryAttempts: session.recoveryAttempts,
        },
      };
      
    } catch (error) {
      console.error(`❌ Progressive upload error for chunk ${chunkIndex} of ${fileName}:`, error);
      
      // Enhanced error handling with specific 413 recovery
      if (error instanceof Error && (error.message.includes('413') || error.message.includes('too large'))) {
        const sessionId = input.sessionId || `progressive_${Date.now()}_${randomUUID()}`;
        const session = progressiveUploadSessions.get(sessionId);
        
        if (session) {
          // Suggest smaller chunk size
          const newChunkSize = Math.max(MIN_CHUNK_SIZE, session.adaptiveChunkSize / 2);
          session.adaptiveChunkSize = newChunkSize;
          session.memoryPressureAdaptations++;
          
          console.log(`🔧 413 error detected, suggesting chunk size reduction: ${(newChunkSize / (1024 * 1024)).toFixed(1)}MB`);
          
          return {
            success: false,
            complete: false,
            sessionId,
            error: 'Chunk size too large for server limits',
            adaptiveChunkSize: newChunkSize,
            suggestedAction: 'reduce_chunk_size',
            receivedChunks: session.receivedChunks.size,
            totalChunks,
            httpStatus: 413,
          };
        }
      }
      
      throw error;
    }
  });

// Session recovery procedure for handling stuck uploads
export const bulletproofRecoverSession = baseProcedure
  .input(z.object({
    adminToken: z.string(),
    sessionId: z.string(),
  }))
  .mutation(async ({ input }) => {
    try {
      await requireAdminAuth(input.adminToken);
      
      const session = progressiveUploadSessions.get(input.sessionId);
      if (!session) {
        throw createBulletproofError(
          'Upload session not found or expired',
          'validation',
          { canRetry: false }
        );
      }
      
      // Reset recovery state
      session.isRecovering = false;
      session.lastActivity = new Date();
      
      // Identify missing chunks
      const missingChunks: number[] = [];
      for (let i = 0; i < session.totalChunks; i++) {
        if (!session.receivedChunks.has(i)) {
          missingChunks.push(i);
        }
      }
      
      console.log(`🔄 Session recovery for ${session.fileName}: ${missingChunks.length} missing chunks`);
      
      return {
        success: true,
        sessionId: input.sessionId,
        fileName: session.fileName,
        totalChunks: session.totalChunks,
        receivedChunks: session.receivedChunks.size,
        missingChunks,
        adaptiveChunkSize: session.adaptiveChunkSize,
        sessionStats: {
          failedChunks: session.failedChunks.size,
          memoryAdaptations: session.memoryPressureAdaptations,
          recoveryAttempts: session.recoveryAttempts,
        },
      };
      
    } catch (error) {
      console.error('Session recovery error:', error);
      throw error;
    }
  });

// Session health check procedure
export const bulletproofSessionHealth = baseProcedure
  .input(z.object({
    adminToken: z.string(),
    sessionId: z.string(),
  }))
  .query(async ({ input }) => {
    try {
      await requireAdminAuth(input.adminToken);
      
      const session = progressiveUploadSessions.get(input.sessionId);
      if (!session) {
        return {
          exists: false,
          message: 'Session not found or expired',
        };
      }
      
      const now = new Date();
      const timeSinceActivity = now.getTime() - session.lastActivity.getTime();
      const memoryStats = getMemoryStats();
      
      return {
        exists: true,
        sessionId: input.sessionId,
        fileName: session.fileName,
        totalChunks: session.totalChunks,
        receivedChunks: session.receivedChunks.size,
        progress: (session.receivedChunks.size / session.totalChunks) * 100,
        timeSinceActivity: Math.round(timeSinceActivity / 1000), // seconds
        isStuck: timeSinceActivity > 5 * 60 * 1000, // 5 minutes
        adaptiveChunkSize: session.adaptiveChunkSize,
        memoryPressure: memoryStats.system.pressure,
        sessionStats: {
          failedChunks: session.failedChunks.size,
          memoryAdaptations: session.memoryPressureAdaptations,
          recoveryAttempts: session.recoveryAttempts,
          isRecovering: session.isRecovering,
        },
      };
      
    } catch (error) {
      console.error('Session health check error:', error);
      throw error;
    }
  });

const detectImageTypeEnhanced = async (buffer: Buffer, fileName: string): Promise<{
  valid: boolean;
  detectedType?: string;
  confidence: 'high' | 'medium' | 'low';
  error?: string;
  suggestions?: string[];
}> => {
  try {
    if (buffer.length < 10) {
      return {
        valid: false,
        confidence: 'low',
        error: 'File too small to be a valid image',
        suggestions: ['Check if the file is corrupted', 'Try uploading a different image'],
      };
    }
    
    const arr = new Uint8Array(buffer);
    let detectedType: string | null = null;
    let confidence: 'high' | 'medium' | 'low' = 'low';
    
    // Enhanced signature detection
    if (arr[0] === 0xFF && arr[1] === 0xD8 && arr[2] === 0xFF) {
      detectedType = 'image/jpeg';
      confidence = 'high';
    } else if (arr[0] === 0x89 && arr[1] === 0x50 && arr[2] === 0x4E && arr[3] === 0x47) {
      detectedType = 'image/png';
      confidence = 'high';
    } else if (arr[0] === 0x47 && arr[1] === 0x49 && arr[2] === 0x46) {
      detectedType = 'image/gif';
      confidence = 'high';
    } else if (arr[0] === 0x52 && arr[1] === 0x49 && arr[2] === 0x46 && arr[3] === 0x46 && 
               buffer.length >= 12 && arr[8] === 0x57 && arr[9] === 0x45 && arr[10] === 0x42 && arr[11] === 0x50) {
      detectedType = 'image/webp';
      confidence = 'high';
    } else if (arr[0] === 0x42 && arr[1] === 0x4D) {
      detectedType = 'image/bmp';
      confidence = 'high';
    } else if ((arr[0] === 0x49 && arr[1] === 0x49 && arr[2] === 0x2A && arr[3] === 0x00) ||
               (arr[0] === 0x4D && arr[1] === 0x4D && arr[2] === 0x00 && arr[3] === 0x2A)) {
      detectedType = 'image/tiff';
      confidence = 'high';
    } else {
      // Try Sharp validation as fallback
      try {
        const metadata = await sharp(buffer).metadata();
        if (metadata.format) {
          detectedType = `image/${metadata.format}`;
          confidence = 'medium';
        }
      } catch (sharpError) {
        // Final fallback to file extension
        const extension = fileName.toLowerCase().split('.').pop();
        const extensionMap: Record<string, string> = {
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'gif': 'image/gif',
          'webp': 'image/webp',
          'bmp': 'image/bmp',
          'tiff': 'image/tiff',
          'tif': 'image/tiff',
          'heic': 'image/heic',
          'heif': 'image/heif',
          'avif': 'image/avif',
        };
        
        if (extension && extensionMap[extension]) {
          detectedType = extensionMap[extension];
          confidence = 'low';
        }
      }
    }
    
    if (!detectedType) {
      return {
        valid: false,
        confidence: 'low',
        error: 'Unable to detect image format',
        suggestions: [
          'Ensure the file is actually an image',
          'Try converting to JPEG or PNG format',
          'Try opening and re-saving the image in an image editor',
        ],
      };
    }
    
    return {
      valid: true,
      detectedType,
      confidence,
    };
    
  } catch (error) {
    return {
      valid: false,
      confidence: 'low',
      error: `Format detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      suggestions: [
        'The file may be corrupted',
        'Try uploading a different image',
        'Convert to a standard format (JPEG/PNG)',
      ],
    };
  }
};

// Helper function to resize images for variants
const resizeImageForVariant = async (buffer: Buffer, variantType: string): Promise<Buffer> => {
  const variantSizes: Record<string, { width: number; height: number; quality: number }> = {
    thumbnail: { width: 150, height: 150, quality: 80 },
    small: { width: 400, height: 400, quality: 85 },
    medium: { width: 800, height: 600, quality: 85 },
    large: { width: 1200, height: 900, quality: 90 },
  };
  
  const config = variantSizes[variantType];
  if (!config) {
    return buffer; // Return original if variant not recognized
  }
  
  try {
    const resized = await sharp(buffer)
      .resize(config.width, config.height, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: config.quality, progressive: true })
      .toBuffer();
    
    return resized;
  } catch (error) {
    console.warn(`Failed to resize image for variant ${variantType}:`, error);
    return buffer; // Return original on error
  }
};

// Enhanced image variant retrieval for responsive images
export const getImageVariant = baseProcedure
  .input(z.object({
    filePath: z.string().min(1, "File path is required"),
    variantType: z.enum(['thumbnail', 'small', 'medium', 'large', 'original']).optional(),
  }))
  .query(async ({ input }) => {
    const { filePath, variantType = 'original' } = input;
    
    try {
      // Enhanced security check
      if (filePath.includes('..') || filePath.includes('/') || filePath.includes('\\') || filePath.includes('\0')) {
        throw createBulletproofError('Invalid file path - security violation detected', 'validation', { canRetry: false });
      }
      
      // Validate file path format (should be UUID.extension)
      const filePathRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.(jpg|jpeg|png|gif|webp|bmp|tiff|svg|avif)$/i;
      if (!filePathRegex.test(filePath)) {
        console.warn(`Invalid file path format for variant: ${filePath}`);
        throw createBulletproofError('Invalid file path format', 'validation', { canRetry: false });
      }
      
      console.log(`📷 Serving image variant: ${filePath} (${variantType})`);
      
      // For now, serve the original image (variants can be implemented later)
      // In a full implementation, you would generate/serve different sized versions
      let targetFilePath = filePath;
      
      // If requesting original or no variants exist, serve the original
      if (variantType === 'original') {
        targetFilePath = filePath;
      } else {
        // For other variants, try to find the variant file or fall back to original
        // This is where you'd implement actual variant logic
        // For now, we'll serve the original and resize on-the-fly if needed
        targetFilePath = filePath;
      }
      
      // Get from storage with enhanced error handling
      let stream;
      try {
        stream = await minioClient.getObject(BUCKET_NAME, targetFilePath);
      } catch (storageError: any) {
        console.error(`Storage retrieval error for variant ${targetFilePath}:`, storageError);
        
        if (storageError.code === 'NoSuchKey' || storageError.message?.includes('NoSuchKey')) {
          throw createBulletproofError('Image variant not found in storage', 'storage', { canRetry: false });
        }
        
        throw createBulletproofError('Storage system temporarily unavailable', 'storage', { canRetry: true, retryAfter: 30 });
      }
      
      // Convert stream to buffer with size limits
      const chunks: Buffer[] = [];
      let totalSize = 0;
      const maxImageSize = 100 * 1024 * 1024; // 100MB limit for serving
      
      for await (const chunk of stream) {
        totalSize += chunk.length;
        
        if (totalSize > maxImageSize) {
          throw createBulletproofError('Image variant too large to serve', 'size_limit', { canRetry: false });
        }
        
        chunks.push(chunk);
      }
      
      let buffer = Buffer.concat(chunks);
      
      if (buffer.length === 0) {
        throw createBulletproofError('Empty image variant file in storage', 'storage', { canRetry: false });
      }
      
      // On-the-fly resizing for variants (if not original)
      if (variantType !== 'original') {
        try {
          buffer = await resizeImageForVariant(buffer, variantType);
        } catch (resizeError) {
          console.warn(`Failed to resize image for variant ${variantType}, serving original:`, resizeError);
          // Continue with original buffer if resize fails
        }
      }
      
      // Get enhanced file metadata including proper MIME type
      let contentType = 'image/jpeg'; // Default fallback
      let cacheControl = 'public, max-age=31536000, immutable'; // 1 year cache for variants
      
      try {
        const stat = await minioClient.statObject(BUCKET_NAME, targetFilePath);
        if (stat.metaData?.['content-type']) {
          contentType = stat.metaData['content-type'];
        } else {
          // Detect content type from file extension if not stored
          const extension = targetFilePath.toLowerCase().split('.').pop();
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
        console.warn(`Failed to get metadata for variant ${targetFilePath}:`, statError);
      }
      
      // Enhanced content type validation
      if (!contentType.startsWith('image/')) {
        console.warn(`Invalid content type detected for variant: ${contentType}, forcing to image/jpeg`);
        contentType = 'image/jpeg';
      }
      
      console.log(`✅ Successfully serving image variant: ${filePath} (${variantType}, ${(buffer.length / 1024).toFixed(1)}KB, ${contentType})`);
      
      // Return binary data with proper headers
      return new Response(buffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Length': buffer.length.toString(),
          'Cache-Control': cacheControl,
          'ETag': `"${filePath}-${variantType}-${buffer.length}"`,
          'Last-Modified': new Date().toUTCString(),
          'X-Content-Type-Options': 'nosniff',
          'X-Image-Path': filePath,
          'X-Image-Variant': variantType,
          'X-Image-Size': buffer.length.toString(),
        },
      });
      
    } catch (error) {
      console.error(`❌ Image variant serving error for ${filePath} (${variantType}):`, error);
      
      // Enhanced error categorization for better client handling
      if (error instanceof Error && 'category' in error) {
        throw error; // Re-throw BulletproofImageError as-is
      }
      
      if (error instanceof Error) {
        if (error.message.includes('NoSuchKey') || error.message.includes('not found')) {
          throw createBulletproofError('Image variant not found', 'storage', { canRetry: false });
        }
        
        if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
          throw createBulletproofError('Storage timeout - please try again', 'storage', { canRetry: true, retryAfter: 10 });
        }
      }
      
      throw createBulletproofError(
        error instanceof Error ? error.message : 'Failed to retrieve image variant',
        'storage',
        { canRetry: true, retryAfter: 30 }
      );
    }
  });

// Enhanced bulletproofSingleUpload with comprehensive server-side verification
export const bulletproofSingleUpload = baseProcedure
  .input(z.object({
    adminToken: z.string(),
    fileName: z.string().min(1).max(255),
    fileContent: z.string().min(1),
    fileType: z.string().regex(/^image\//, "File must be an image"),
    title: z.string().max(200).optional(),
    description: z.string().max(1000).optional(),
    altText: z.string().max(300).optional(),
    forceStrategy: z.string().optional(), // Allow forcing a specific strategy
  }))
  .mutation(async ({ input }) => {
    const startTime = Date.now();
    let imageRecord: any = null;
    let uploadedFileName: string | null = null;
    
    try {
      await requireAdminAuth(input.adminToken);
      console.log(`🚀 BULLETPROOF UPLOAD: Starting upload for ${input.fileName}`);
      
      // Parse and validate buffer
      let buffer: Buffer;
      try {
        const base64Data = input.fileContent.includes('base64,') 
          ? input.fileContent.split('base64,')[1]
          : input.fileContent;
        
        buffer = Buffer.from(base64Data, 'base64');
        
        if (buffer.length === 0) {
          throw new Error('Empty file data');
        }
        
        // Reasonable size check (but more generous than before)
        const sizeMB = buffer.length / (1024 * 1024);
        if (sizeMB > 200) { // 200MB absolute limit
          throw createBulletproofError(
            `File too large (${sizeMB.toFixed(1)}MB). Maximum size is 200MB.`,
            'validation',
            {
              canRetry: false,
              suggestions: [
                'Compress the image using online tools',
                'Resize the image to smaller dimensions',
                'Convert to JPEG format for better compression',
                'Use the progressive upload feature for very large files',
              ],
            }
          );
        }
        
        console.log(`📊 BULLETPROOF UPLOAD: Parsed file data - ${sizeMB.toFixed(1)}MB for ${input.fileName}`);
        
      } catch (parseError) {
        throw createBulletproofError(
          'Invalid file data - upload may be corrupted',
          'validation',
          {
            suggestions: [
              'Try uploading the file again',
              'Check your internet connection',
              'Try a different browser',
            ],
          }
        );
      }
      
      // Enhanced format detection and validation
      const detectedType = await detectImageTypeEnhanced(buffer, input.fileName);
      if (!detectedType.valid) {
        throw createBulletproofError(
          `Invalid image format: ${detectedType.error}`,
          'format',
          {
            suggestions: detectedType.suggestions || [
              'Convert the image to JPEG or PNG format',
              'Try opening and re-saving the image in an image editor',
            ],
          }
        );
      }
      
      // Process image with bulletproof strategies
      console.log(`🔧 BULLETPROOF UPLOAD: Processing image with bulletproof strategies for ${input.fileName}`);
      const processed = await processImageWithFallbacks(buffer, input.fileName, input.fileType);
      
      // Generate unique filename
      const uniqueFileName = `${randomUUID()}.${processed.extension}`;
      uploadedFileName = uniqueFileName;
      
      console.log(`📤 BULLETPROOF UPLOAD: Generated unique filename: ${uniqueFileName} for original: ${input.fileName}`);
      console.log(`📤 BULLETPROOF UPLOAD: File details:`, {
        originalName: input.fileName,
        uniqueName: uniqueFileName,
        originalSize: buffer.length,
        processedSize: processed.processedBuffer.length,
        contentType: processed.contentType,
        bucket: BUCKET_NAME,
        strategy: processed.metadata.strategy,
      });
      
      // Upload with retry logic
      await uploadToStorageWithRetry(uniqueFileName, processed.processedBuffer, processed.contentType);
      
      // CRITICAL: Server-side verification before completing transaction
      console.log(`🔍 BULLETPROOF UPLOAD: Starting server-side verification for ${uniqueFileName}`);
      const verification = await verifyFileExistsInStorage(uniqueFileName, processed.processedBuffer.length);
      
      if (!verification.exists) {
        console.error(`❌ BULLETPROOF UPLOAD: Server-side verification failed for ${uniqueFileName}:`, verification.error);
        
        // Clean up uploaded file on verification failure
        try {
          await minioClient.removeObject(BUCKET_NAME, uniqueFileName);
          console.log(`🧹 BULLETPROOF UPLOAD: Cleaned up failed upload: ${uniqueFileName}`);
        } catch (cleanupError) {
          console.error('Failed to cleanup after verification failure:', cleanupError);
        }
        
        throw createBulletproofError(
          `Upload completed but server verification failed: ${verification.error || 'File not accessible'}`,
          'storage',
          {
            retryAfter: 30,
            suggestions: [
              'Try uploading again - this may be a temporary storage issue',
              'Check server storage system status',
              'Contact support if the problem persists',
            ],
          }
        );
      }
      
      console.log(`✅ BULLETPROOF UPLOAD: Server-side verification successful for ${uniqueFileName}:`, {
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
            originalSize: processed.metadata.originalSize,
            title: input.title,
            description: input.description,
            altText: input.altText,
            uploadedBy: 'admin',
            processingInfo: JSON.stringify({
              ...processed.metadata,
              detectedFormat: detectedType.detectedType,
              formatConfidence: detectedType.confidence,
              warnings: processed.warnings,
              serverVerification: {
                verified: true,
                actualSize: verification.actualSize,
                verificationMetadata: verification.metadata,
              },
            }),
          },
        });
        
        console.log(`💾 BULLETPROOF UPLOAD: Database record created with ID: ${imageRecord.id} for ${uniqueFileName}`);
        
      } catch (dbError) {
        console.error('Database error after successful verification:', dbError);
        
        // Clean up uploaded file on database error (even though verification passed)
        try {
          await minioClient.removeObject(BUCKET_NAME, uniqueFileName);
          console.log(`🧹 BULLETPROOF UPLOAD: Cleaned up uploaded file after database error: ${uniqueFileName}`);
        } catch (cleanupError) {
          console.error('Failed to cleanup after database error:', cleanupError);
        }
        
        throw createBulletproofError(
          'File uploaded and verified successfully but failed to save metadata to database',
          'storage',
          {
            retryAfter: 30,
            suggestions: [
              'Try uploading again in a few moments',
              'Contact support if the problem persists',
            ],
          }
        );
      }
      
      const totalTime = Date.now() - startTime;
      console.log(`✅ BULLETPROOF UPLOAD: Upload completed successfully for ${input.fileName} -> ${uniqueFileName} in ${totalTime}ms`);
      
      return {
        success: true,
        filePath: uniqueFileName,
        imageId: imageRecord.id,
        message: 'Image uploaded successfully with bulletproof processing and server verification',
        metadata: {
          ...processed.metadata,
          totalProcessingTime: totalTime,
          detectedFormat: detectedType.detectedType,
          formatConfidence: detectedType.confidence,
          serverVerification: {
            verified: true,
            actualSize: verification.actualSize,
            verificationTime: verification.metadata?.verificationTime || 0,
          },
        },
        warnings: processed.warnings,
      };
      
    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error(`❌ BULLETPROOF UPLOAD: Upload failed for ${input.fileName} after ${totalTime}ms:`, error);
      
      // Enhanced cleanup on failure
      if (uploadedFileName) {
        try {
          await minioClient.removeObject(BUCKET_NAME, uploadedFileName);
          console.log(`🧹 BULLETPROOF UPLOAD: Cleaned up failed upload: ${uploadedFileName}`);
        } catch (cleanupError) {
          console.error('Failed to cleanup failed upload:', cleanupError);
        }
      }
      
      // Memory cleanup on failure
      if (global.gc) {
        global.gc();
      }
      
      // Re-throw bulletproof errors as-is
      if (error instanceof Error && 'category' in error) {
        throw error;
      }
      
      // Wrap unexpected errors
      throw createBulletproofError(
        error instanceof Error ? error.message : 'Upload failed unexpectedly',
        'processing',
        {
          suggestions: [
            'Try uploading the image again',
            'Try converting to JPEG or PNG format',
            'Reduce the image file size',
            'Contact support if the problem persists',
          ],
        }
      );
    }
  });

export const bulletproofBulkUpload = baseProcedure
  .input(z.object({
    adminToken: z.string(),
    images: z.array(z.object({
      fileName: z.string().min(1).max(255),
      fileContent: z.string().min(1),
      fileType: z.string().regex(/^image\//, "File must be an image"),
      title: z.string().max(200).optional(),
      description: z.string().max(1000).optional(),
      altText: z.string().max(300).optional(),
    })).min(1).max(5), // Conservative limit for bulletproof processing
  }))
  .mutation(async ({ input }) => {
    const startTime = Date.now();
    
    try {
      await requireAdminAuth(input.adminToken);
      console.log(`Starting bulletproof bulk upload: ${input.images.length} images`);
      
      // Pre-flight memory check
      const memoryStats = getMemoryStats();
      if (memoryStats.system.pressure === 'critical') {
        throw createBulletproofError(
          'System memory critically low - cannot process bulk upload',
          'memory',
          {
            retryAfter: 300, // 5 minutes
            suggestions: [
              'Wait a few minutes for system resources to free up',
              'Upload images one at a time instead',
              'Try uploading smaller images',
            ],
          }
        );
      }
      
      const results = [];
      const errors = [];
      let successCount = 0;
      
      // Process images one by one with enhanced error handling
      for (let i = 0; i < input.images.length; i++) {
        const image = input.images[i];
        
        try {
          console.log(`Processing bulk image ${i + 1}/${input.images.length}: ${image.fileName}`);
          
          // Check memory before each image
          const currentMemory = getMemoryStats();
          if (currentMemory.system.pressure === 'high') {
            console.warn('High memory pressure detected, performing cleanup');
            await emergencyMemoryCleanup(`before bulk image ${i + 1}`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
          
          const result = await bulletproofSingleUpload.resolver({
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
          
          successCount++;
          
        } catch (error) {
          console.error(`Bulk upload failed for ${image.fileName}:`, error);
          
          const errorInfo = error instanceof Error && 'category' in error 
            ? error as BulletproofImageError
            : createBulletproofError(
                error instanceof Error ? error.message : 'Upload failed',
                'processing'
              );
          
          errors.push({
            fileName: image.fileName,
            error: errorInfo.message,
            category: errorInfo.category,
            canRetry: errorInfo.canRetry,
            suggestions: errorInfo.suggestions,
          });
        }
        
        // Pause between uploads for memory management
        if (i < input.images.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          if (global.gc) {
            global.gc();
          }
        }
      }
      
      const totalTime = Date.now() - startTime;
      console.log(`Bulletproof bulk upload completed: ${successCount}/${input.images.length} successful in ${totalTime}ms`);
      
      return {
        success: true,
        results,
        errors,
        summary: {
          totalProcessed: input.images.length,
          successCount,
          errorCount: errors.length,
          processingTime: totalTime,
          memoryPressure: getMemoryStats().system.pressure,
        },
        message: errors.length === 0 
          ? `All ${successCount} images uploaded successfully`
          : `${successCount} images uploaded successfully, ${errors.length} failed`,
      };
      
    } catch (error) {
      console.error('Bulletproof bulk upload error:', error);
      throw error;
    }
  });
