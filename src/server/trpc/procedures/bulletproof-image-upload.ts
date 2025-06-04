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
const execAsync = promisify(exec);

interface BulletproofImageError extends Error {
  code?: string;
  category?: 'auth' | 'validation' | 'processing' | 'storage' | 'memory' | 'network' | 'format' | 'timeout';
  canRetry?: boolean;
  retryAfter?: number;
  suggestions?: string[];
  severity?: 'low' | 'medium' | 'high' | 'critical';
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

// Cleanup old sessions every 30 minutes
setInterval(() => {
  const now = new Date();
  for (const [sessionId, session] of progressiveUploadSessions.entries()) {
    if (now.getTime() - session.lastActivity.getTime() > 30 * 60 * 1000) { // 30 minutes
      progressiveUploadSessions.delete(sessionId);
      console.log(`Cleaned up expired upload session: ${sessionId}`);
    }
  }
}, 30 * 60 * 1000);

const createBulletproofError = (
  message: string, 
  category: BulletproofImageError['category'] = 'processing',
  options: {
    canRetry?: boolean;
    retryAfter?: number;
    suggestions?: string[];
    severity?: 'low' | 'medium' | 'high' | 'critical';
    code?: string;
  } = {}
): BulletproofImageError => {
  const error = new Error(message) as BulletproofImageError;
  error.category = category;
  error.canRetry = options.canRetry ?? true;
  error.retryAfter = options.retryAfter;
  error.suggestions = options.suggestions || [];
  error.severity = options.severity || 'medium';
  error.code = options.code;
  return error;
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
    emergencyMemoryCleanup('pre-processing cleanup');
    
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
        emergencyMemoryCleanup(`after ${strategy.name} failure`);
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

const progressiveUploadInputSchema = z.object({
  adminToken: z.string(),
  chunkId: z.string(),
  chunkIndex: z.number().min(0),
  totalChunks: z.number().min(1).max(100), // Limit total chunks
  data: z.string().min(1), // base64 chunk
  fileName: z.string().min(1).max(255),
  fileType: z.string().regex(/^image\//, "File must be an image"),
  sessionId: z.string().optional(),
});

export const bulletproofProgressiveUpload = baseProcedure
  .input(progressiveUploadInputSchema)
  .mutation(async ({ input }) => {
    try {
      await requireAdminAuth(input.adminToken);
      
      const { chunkId, chunkIndex, totalChunks, data, fileName, fileType } = input;
      
      // Generate session ID if not provided
      const sessionId = input.sessionId || `upload_${randomUUID()}`;
      
      // Parse chunk data
      const base64Data = data.includes('base64,') ? data.split('base64,')[1] : data;
      const chunkBuffer = Buffer.from(base64Data, 'base64');
      
      // Get or create session
      let session = progressiveUploadSessions.get(sessionId);
      if (!session) {
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
        };
        progressiveUploadSessions.set(sessionId, session);
        console.log(`Created new progressive upload session: ${sessionId}`);
      }
      
      // Update session
      session.lastActivity = new Date();
      session.chunks.set(chunkIndex, chunkBuffer);
      session.receivedChunks.add(chunkIndex);
      session.totalSize += chunkBuffer.length;
      
      console.log(`Received chunk ${chunkIndex + 1}/${totalChunks} for ${fileName} (session: ${sessionId})`);
      
      // Check if upload is complete
      if (session.receivedChunks.size === totalChunks) {
        console.log(`All chunks received for ${fileName}, assembling file...`);
        
        // Assemble chunks in order
        const assembledChunks: Buffer[] = [];
        for (let i = 0; i < totalChunks; i++) {
          const chunk = session.chunks.get(i);
          if (!chunk) {
            throw createBulletproofError(
              `Missing chunk ${i} during assembly`,
              'validation',
              { canRetry: true, suggestions: ['Re-upload the missing chunk'] }
            );
          }
          assembledChunks.push(chunk);
        }
        
        const completeBuffer = Buffer.concat(assembledChunks);
        
        // Clean up session
        progressiveUploadSessions.delete(sessionId);
        
        // Process the complete file using the bulletproof system
        const result = await bulletproofSingleUpload.resolver({
          input: {
            adminToken: input.adminToken,
            fileName,
            fileContent: completeBuffer.toString('base64'),
            fileType,
          },
          ctx: {} as any,
        });
        
        return {
          success: true,
          complete: true,
          sessionId,
          ...result,
        };
      }
      
      // Upload not yet complete
      return {
        success: true,
        complete: false,
        sessionId,
        receivedChunks: session.receivedChunks.size,
        totalChunks,
        message: `Received chunk ${chunkIndex + 1}/${totalChunks}`,
      };
      
    } catch (error) {
      console.error('Progressive upload error:', error);
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
      console.log(`Starting bulletproof upload: ${input.fileName}`);
      
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
        
        console.log(`Parsed file data: ${sizeMB.toFixed(1)}MB`);
        
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
      const processed = await processImageWithFallbacks(buffer, input.fileName, input.fileType);
      
      // Generate unique filename
      const uniqueFileName = `${randomUUID()}.${processed.extension}`;
      uploadedFileName = uniqueFileName;
      
      // Upload with retry logic
      await uploadToStorageWithRetry(uniqueFileName, processed.processedBuffer, processed.contentType);
      
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
            }),
          },
        });
        
        console.log(`Database record created: ${imageRecord.id}`);
        
      } catch (dbError) {
        console.error('Database error:', dbError);
        
        // Clean up uploaded file on database error
        try {
          await minioClient.removeObject(BUCKET_NAME, uniqueFileName);
          console.log(`Cleaned up uploaded file after database error: ${uniqueFileName}`);
        } catch (cleanupError) {
          console.error('Failed to cleanup after database error:', cleanupError);
        }
        
        throw createBulletproofError(
          'Failed to save image metadata to database',
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
      console.log(`Bulletproof upload completed: ${input.fileName} in ${totalTime}ms`);
      
      return {
        success: true,
        filePath: uniqueFileName,
        imageId: imageRecord.id,
        message: 'Image uploaded successfully with bulletproof processing',
        metadata: {
          ...processed.metadata,
          totalProcessingTime: totalTime,
          detectedFormat: detectedType.detectedType,
          formatConfidence: detectedType.confidence,
        },
        warnings: processed.warnings,
      };
      
    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error(`Bulletproof upload failed for ${input.fileName} after ${totalTime}ms:`, error);
      
      // Enhanced cleanup on failure
      if (uploadedFileName) {
        try {
          await minioClient.removeObject(BUCKET_NAME, uploadedFileName);
          console.log(`Cleaned up failed upload: ${uploadedFileName}`);
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
            emergencyMemoryCleanup(`before bulk image ${i + 1}`);
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
