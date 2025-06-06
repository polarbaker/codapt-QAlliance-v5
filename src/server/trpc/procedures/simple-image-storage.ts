import { baseProcedure } from "~/server/trpc/main";
import { requireAdminAuth } from "./auth";
import * as z from "zod";
import sharp from "sharp";

// Simple base64 image storage for innovators as a bulletproof fallback
// This eliminates file system dependencies and potential CORS issues

interface SimpleImageError extends Error {
  code?: string;
  category?: 'auth' | 'validation' | 'processing' | 'size_limit';
  suggestions?: string[];
}

const createSimpleImageError = (
  message: string, 
  category: SimpleImageError['category'] = 'processing', 
  options: {
    suggestions?: string[];
    code?: string;
  } = {}
): SimpleImageError => {
  const error = new Error(message) as SimpleImageError;
  error.category = category;
  error.suggestions = options.suggestions || [];
  error.code = options.code;
  return error;
};

// Validate and optimize image for base64 storage
const processImageForBase64Storage = async (
  buffer: Buffer, 
  fileName: string,
  maxSizeKB: number = 500 // 500KB default limit for base64 storage
): Promise<{
  base64Data: string;
  contentType: string;
  originalSize: number;
  optimizedSize: number;
  dimensions: { width: number; height: number };
}> => {
  const originalSize = buffer.length;
  
  try {
    // Get image metadata
    const metadata = await sharp(buffer).metadata();
    
    if (!metadata.width || !metadata.height) {
      throw createSimpleImageError(
        'Invalid image - cannot determine dimensions',
        'validation',
        { suggestions: ['Ensure the file is a valid image format'] }
      );
    }
    
    // Calculate optimal size for base64 storage
    let targetWidth = metadata.width;
    let targetHeight = metadata.height;
    
    // Resize if too large (target max 400x400 for avatars)
    const maxDimension = 400;
    if (targetWidth > maxDimension || targetHeight > maxDimension) {
      const ratio = Math.min(maxDimension / targetWidth, maxDimension / targetHeight);
      targetWidth = Math.round(targetWidth * ratio);
      targetHeight = Math.round(targetHeight * ratio);
    }
    
    // Process image with optimal settings for small file size
    let processedBuffer = await sharp(buffer)
      .resize(targetWidth, targetHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ 
        quality: 85, 
        progressive: false,
        mozjpeg: true 
      })
      .toBuffer();
    
    // Check if size is still too large
    if (processedBuffer.length > maxSizeKB * 1024) {
      // Try with lower quality
      let quality = 75;
      while (processedBuffer.length > maxSizeKB * 1024 && quality > 30) {
        processedBuffer = await sharp(buffer)
          .resize(targetWidth, targetHeight, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .jpeg({ 
            quality, 
            progressive: false,
            mozjpeg: true 
          })
          .toBuffer();
        
        quality -= 10;
      }
      
      // If still too large, reduce dimensions further
      if (processedBuffer.length > maxSizeKB * 1024) {
        targetWidth = Math.round(targetWidth * 0.8);
        targetHeight = Math.round(targetHeight * 0.8);
        
        processedBuffer = await sharp(buffer)
          .resize(targetWidth, targetHeight, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .jpeg({ 
            quality: 60, 
            progressive: false,
            mozjpeg: true 
          })
          .toBuffer();
      }
    }
    
    // Final size check
    if (processedBuffer.length > maxSizeKB * 1024) {
      throw createSimpleImageError(
        `Image too large even after optimization (${(processedBuffer.length / 1024).toFixed(1)}KB). Maximum size is ${maxSizeKB}KB for inline storage.`,
        'size_limit',
        {
          suggestions: [
            'Use a smaller image',
            'Crop the image to focus on the subject',
            'Use an image editor to reduce file size',
            'Convert to a simpler image with fewer colors',
          ]
        }
      );
    }
    
    // Convert to base64 data URL
    const base64Data = `data:image/jpeg;base64,${processedBuffer.toString('base64')}`;
    
    console.log(`✅ SIMPLE IMAGE: Processed image for base64 storage:`, {
      fileName,
      originalSize: `${(originalSize / 1024).toFixed(1)}KB`,
      optimizedSize: `${(processedBuffer.length / 1024).toFixed(1)}KB`,
      compressionRatio: (originalSize / processedBuffer.length).toFixed(2),
      dimensions: `${targetWidth}x${targetHeight}`,
      base64Length: base64Data.length,
    });
    
    return {
      base64Data,
      contentType: 'image/jpeg',
      originalSize,
      optimizedSize: processedBuffer.length,
      dimensions: { width: targetWidth, height: targetHeight },
    };
    
  } catch (error) {
    console.error('Simple image processing error:', error);
    
    if (error instanceof Error && 'category' in error) {
      throw error; // Re-throw SimpleImageError as-is
    }
    
    throw createSimpleImageError(
      `Image processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'processing',
      {
        suggestions: [
          'Try a different image format (JPEG or PNG)',
          'Ensure the image is not corrupted',
          'Try a smaller image file',
        ]
      }
    );
  }
};

// Upload simple base64 image for innovator
export const uploadSimpleInnovatorImage = baseProcedure
  .input(z.object({
    adminToken: z.string(),
    innovatorId: z.number(),
    fileName: z.string().min(1).max(255),
    fileContent: z.string().min(1), // base64 encoded
    fileType: z.string().regex(/^image\//, "File must be an image"),
  }))
  .mutation(async ({ input }) => {
    const startTime = Date.now();
    
    try {
      await requireAdminAuth(input.adminToken);
      
      console.log(`🖼️ SIMPLE IMAGE: Starting simple image upload for innovator ${input.innovatorId}: ${input.fileName}`);
      
      // Parse base64 content
      let buffer: Buffer;
      try {
        const base64Data = input.fileContent.includes('base64,') 
          ? input.fileContent.split('base64,')[1]
          : input.fileContent;
        
        buffer = Buffer.from(base64Data, 'base64');
        
        if (buffer.length === 0) {
          throw new Error('Empty file data');
        }
        
        // Check initial size (before optimization)
        const initialSizeMB = buffer.length / (1024 * 1024);
        if (initialSizeMB > 10) { // 10MB limit for input
          throw createSimpleImageError(
            `Input image too large (${initialSizeMB.toFixed(1)}MB). Maximum input size is 10MB.`,
            'size_limit',
            {
              suggestions: [
                'Reduce image size before uploading',
                'Use an image editor to compress the image',
                'Convert to JPEG format for better compression',
              ]
            }
          );
        }
        
        console.log(`📊 SIMPLE IMAGE: Parsed image data - ${initialSizeMB.toFixed(1)}MB`);
        
      } catch (parseError) {
        throw createSimpleImageError(
          'Invalid image data - upload may be corrupted',
          'validation',
          {
            suggestions: [
              'Try uploading the file again',
              'Check your internet connection',
              'Ensure the file is a valid image',
            ]
          }
        );
      }
      
      // Process image for base64 storage
      const processed = await processImageForBase64Storage(buffer, input.fileName);
      
      // Update innovator record with base64 image
      const { db } = await import("~/server/db");
      
      // Check if innovator exists
      const existingInnovator = await db.innovator.findUnique({
        where: { id: input.innovatorId },
      });
      
      if (!existingInnovator) {
        throw createSimpleImageError(
          `Innovator with ID ${input.innovatorId} not found`,
          'validation',
          {
            suggestions: [
              'Check the innovator ID',
              'Ensure the innovator exists',
            ]
          }
        );
      }
      
      // Update innovator with base64 image data
      const updatedInnovator = await db.innovator.update({
        where: { id: input.innovatorId },
        data: {
          avatar: processed.base64Data, // Store base64 data URL directly
          updatedAt: new Date(),
        },
      });
      
      const totalTime = Date.now() - startTime;
      
      console.log(`✅ SIMPLE IMAGE: Successfully uploaded simple image for innovator ${input.innovatorId} in ${totalTime}ms`);
      
      return {
        success: true,
        innovatorId: input.innovatorId,
        message: 'Image uploaded successfully with simple base64 storage',
        metadata: {
          originalSize: processed.originalSize,
          optimizedSize: processed.optimizedSize,
          compressionRatio: processed.originalSize / processed.optimizedSize,
          dimensions: processed.dimensions,
          contentType: processed.contentType,
          processingTime: totalTime,
          storageType: 'base64_inline',
        },
      };
      
    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error(`❌ SIMPLE IMAGE: Upload failed for innovator ${input.innovatorId} after ${totalTime}ms:`, error);
      
      // Re-throw SimpleImageError as-is
      if (error instanceof Error && 'category' in error) {
        throw error;
      }
      
      throw createSimpleImageError(
        error instanceof Error ? error.message : 'Upload failed unexpectedly',
        'processing',
        {
          suggestions: [
            'Try uploading the image again',
            'Try a smaller image file',
            'Contact support if the problem persists',
          ]
        }
      );
    }
  });

// Get simple base64 image for innovator
export const getSimpleInnovatorImage = baseProcedure
  .input(z.object({
    innovatorId: z.number(),
  }))
  .query(async ({ input }) => {
    try {
      const { db } = await import("~/server/db");
      
      const innovator = await db.innovator.findUnique({
        where: { id: input.innovatorId },
        select: {
          id: true,
          name: true,
          avatar: true,
          updatedAt: true,
        },
      });
      
      if (!innovator) {
        throw createSimpleImageError(
          `Innovator with ID ${input.innovatorId} not found`,
          'validation'
        );
      }
      
      // Check if avatar is a base64 data URL
      const isBase64 = innovator.avatar && innovator.avatar.startsWith('data:image/');
      
      return {
        success: true,
        innovatorId: input.innovatorId,
        innovatorName: innovator.name,
        hasImage: !!innovator.avatar,
        isBase64: isBase64,
        imageData: isBase64 ? innovator.avatar : null,
        imageUrl: !isBase64 ? innovator.avatar : null, // External URL if not base64
        updatedAt: innovator.updatedAt,
      };
      
    } catch (error) {
      console.error(`Error retrieving simple image for innovator ${input.innovatorId}:`, error);
      
      if (error instanceof Error && 'category' in error) {
        throw error;
      }
      
      throw createSimpleImageError(
        error instanceof Error ? error.message : 'Failed to retrieve image',
        'processing'
      );
    }
  });

// Remove simple base64 image for innovator
export const removeSimpleInnovatorImage = baseProcedure
  .input(z.object({
    adminToken: z.string(),
    innovatorId: z.number(),
  }))
  .mutation(async ({ input }) => {
    try {
      await requireAdminAuth(input.adminToken);
      
      const { db } = await import("~/server/db");
      
      const updatedInnovator = await db.innovator.update({
        where: { id: input.innovatorId },
        data: {
          avatar: '', // Clear the avatar
          updatedAt: new Date(),
        },
      });
      
      console.log(`🗑️ SIMPLE IMAGE: Removed image for innovator ${input.innovatorId}`);
      
      return {
        success: true,
        innovatorId: input.innovatorId,
        message: 'Image removed successfully',
      };
      
    } catch (error) {
      console.error(`Error removing simple image for innovator ${input.innovatorId}:`, error);
      
      if (error instanceof Error && 'category' in error) {
        throw error;
      }
      
      throw createSimpleImageError(
        error instanceof Error ? error.message : 'Failed to remove image',
        'processing'
      );
    }
  });

// List all innovators with their image status
export const listInnovatorsWithImageStatus = baseProcedure
  .input(z.object({
    adminToken: z.string(),
  }))
  .query(async ({ input }) => {
    try {
      await requireAdminAuth(input.adminToken);
      
      const { db } = await import("~/server/db");
      
      const innovators = await db.innovator.findMany({
        select: {
          id: true,
          name: true,
          role: true,
          avatar: true,
          updatedAt: true,
          featured: true,
          order: true,
        },
        orderBy: [
          { featured: 'desc' },
          { order: 'asc' },
          { name: 'asc' },
        ],
      });
      
      const innovatorsWithStatus = innovators.map(innovator => ({
        ...innovator,
        hasImage: !!innovator.avatar,
        isBase64: innovator.avatar ? innovator.avatar.startsWith('data:image/') : false,
        isExternalUrl: innovator.avatar ? innovator.avatar.startsWith('http') : false,
        imageSize: innovator.avatar && innovator.avatar.startsWith('data:image/') 
          ? `${(innovator.avatar.length / 1024).toFixed(1)}KB`
          : null,
      }));
      
      return {
        success: true,
        innovators: innovatorsWithStatus,
        summary: {
          total: innovators.length,
          withImages: innovators.filter(i => !!i.avatar).length,
          withBase64Images: innovators.filter(i => i.avatar && i.avatar.startsWith('data:image/')).length,
          withExternalImages: innovators.filter(i => i.avatar && i.avatar.startsWith('http')).length,
        },
      };
      
    } catch (error) {
      console.error('Error listing innovators with image status:', error);
      
      if (error instanceof Error && 'category' in error) {
        throw error;
      }
      
      throw createSimpleImageError(
        error instanceof Error ? error.message : 'Failed to list innovators',
        'processing'
      );
    }
  });
