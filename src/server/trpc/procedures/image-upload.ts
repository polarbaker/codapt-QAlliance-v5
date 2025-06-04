import { baseProcedure } from "~/server/trpc/main";
import { requireAdminAuth } from "./auth";
import * as z from "zod";
import { randomUUID } from "crypto";
import { Client } from "minio";
import sharp from "sharp";

// Simplified error types for better debugging
interface ImageUploadError extends Error {
  code?: string;
  category?: 'auth' | 'validation' | 'processing' | 'storage' | 'memory';
  canRetry?: boolean;
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

// Simplified error creation
const createImageError = (message: string, category: ImageUploadError['category'] = 'processing', canRetry = true): ImageUploadError => {
  const error = new Error(message) as ImageUploadError;
  error.category = category;
  error.canRetry = canRetry;
  return error;
};

// Simple memory check
const checkMemoryUsage = (): { safe: boolean; usage: number } => {
  const usage = process.memoryUsage();
  const usagePercent = (usage.rss / (1024 * 1024 * 1024)) * 100; // Convert to GB percentage
  return {
    safe: usagePercent < 80, // Conservative threshold
    usage: usagePercent
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

// Simplified image processing
const processImage = async (buffer: Buffer, fileName: string): Promise<{
  processedBuffer: Buffer;
  contentType: string;
  extension: string;
  metadata: { width?: number; height?: number; };
}> => {
  let sharpInstance: sharp.Sharp | null = null;
  
  try {
    // Check memory before processing
    const memCheck = checkMemoryUsage();
    if (!memCheck.safe) {
      throw createImageError(`Memory usage too high (${memCheck.usage.toFixed(1)}%) - try a smaller image`, 'memory');
    }

    // Create Sharp instance with conservative settings
    sharpInstance = sharp(buffer, { 
      limitInputPixels: 16777216, // 4096x4096 max
      sequentialRead: true,
    });
    
    // Get metadata first
    const metadata = await sharpInstance.metadata();
    
    if (!metadata.width || !metadata.height) {
      throw createImageError('Invalid image - cannot determine dimensions', 'validation', false);
    }

    // Simple size validation
    if (metadata.width > 8192 || metadata.height > 8192) {
      throw createImageError('Image too large - maximum 8192x8192 pixels', 'validation', false);
    }

    // Simple processing: resize if too large, convert to web format
    let processedImage = sharpInstance;
    
    // Resize if larger than 2048px on any side
    if (metadata.width > 2048 || metadata.height > 2048) {
      processedImage = processedImage.resize(2048, 2048, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    // Convert to JPEG for reliability (with transparency support via PNG)
    let outputBuffer: Buffer;
    let contentType: string;
    let extension: string;

    if (metadata.hasAlpha) {
      // Keep transparency
      outputBuffer = await processedImage.png({ compressionLevel: 6 }).toBuffer();
      contentType = 'image/png';
      extension = 'png';
    } else {
      // Convert to JPEG for better compression
      outputBuffer = await processedImage.jpeg({ quality: 85, progressive: true }).toBuffer();
      contentType = 'image/jpeg';
      extension = 'jpg';
    }

    // Get final metadata
    const finalMetadata = await sharp(outputBuffer).metadata();

    return {
      processedBuffer: outputBuffer,
      contentType,
      extension,
      metadata: {
        width: finalMetadata.width,
        height: finalMetadata.height,
      },
    };

  } catch (error) {
    console.error(`Image processing failed for ${fileName}:`, error);
    
    if (error instanceof Error && error.message.includes('memory')) {
      throw createImageError('Image too large for system memory - try a smaller file', 'memory');
    }
    
    if (error instanceof Error && error.message.includes('Input buffer contains unsupported image format')) {
      throw createImageError('Unsupported image format - try JPEG or PNG', 'validation', false);
    }

    throw createImageError(`Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'processing');
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

// Single image upload (simplified)
export const adminUploadImage = baseProcedure
  .input(imageUploadInputSchema)
  .mutation(async ({ input }) => {
    const startTime = Date.now();
    
    try {
      // Authenticate
      await requireAdminAuth(input.adminToken);
      console.log(`Starting upload: ${input.fileName}`);
      
      // Ensure bucket exists
      await ensureBucket();
      
      // Parse base64 content
      let buffer: Buffer;
      try {
        const base64Data = input.fileContent.includes('base64,') 
          ? input.fileContent.split('base64,')[1]
          : input.fileContent;
        
        buffer = Buffer.from(base64Data, 'base64');
        
        if (buffer.length === 0) {
          throw new Error('Empty image data');
        }

        // Size check (25MB limit for single files)
        const sizeMB = buffer.length / (1024 * 1024);
        if (sizeMB > 25) {
          throw createImageError(`Image too large (${sizeMB.toFixed(1)}MB) - maximum 25MB`, 'validation', false);
        }

        console.log(`Parsed image data: ${sizeMB.toFixed(1)}MB`);
        
      } catch (parseError) {
        console.error('Base64 parsing error:', parseError);
        throw createImageError('Invalid image data - upload may be corrupted', 'validation');
      }
      
      // Process image
      const processed = await processImage(buffer, input.fileName);
      
      // Generate unique filename
      const uniqueFileName = `${randomUUID()}.${processed.extension}`;
      
      // Upload to storage
      await uploadToStorage(uniqueFileName, processed.processedBuffer, processed.contentType);
      
      // Save to database
      let imageRecord;
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
              originalSize: buffer.length,
              processedSize: processed.processedBuffer.length,
              processingTime: Date.now() - startTime,
            }),
          },
        });
        
        console.log(`Database record created: ${imageRecord.id}`);
        
      } catch (dbError) {
        console.error('Database error:', dbError);
        
        // Clean up uploaded file
        try {
          await minioClient.removeObject(BUCKET_NAME, uniqueFileName);
        } catch (cleanupError) {
          console.error('Failed to cleanup after database error:', cleanupError);
        }
        
        throw createImageError('Failed to save image metadata', 'storage');
      }
      
      const processingTime = Date.now() - startTime;
      console.log(`Upload completed: ${input.fileName} in ${processingTime}ms`);
      
      return {
        success: true,
        filePath: uniqueFileName,
        imageId: imageRecord.id,
        message: 'Image uploaded successfully',
        metadata: {
          originalSize: buffer.length,
          processedSize: processed.processedBuffer.length,
          contentType: processed.contentType,
          dimensions: processed.metadata,
          processingTime,
        },
      };
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`Upload failed for ${input.fileName} after ${processingTime}ms:`, error);
      
      // Re-throw image errors as-is
      if (error instanceof Error && 'category' in error) {
        throw error;
      }
      
      // Wrap other errors
      throw createImageError(
        error instanceof Error ? error.message : 'Upload failed',
        'processing'
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
      const memCheck = checkMemoryUsage();
      if (!memCheck.safe) {
        throw createImageError(`System memory usage too high (${memCheck.usage.toFixed(1)}%) for bulk upload`, 'memory');
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
        throw createImageError('Invalid file path', 'validation', false);
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
        throw createImageError('Empty image file', 'storage', false);
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
        throw createImageError('Image not found', 'storage', false);
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
