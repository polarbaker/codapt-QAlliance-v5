import { baseProcedure } from "~/server/trpc/main";
import { requireAdminAuth } from "./auth";
import * as z from "zod";
import sharp from "sharp";

// Extended Simple base64 image storage for Case Studies, Challenges, and News
// This extends the bulletproof fallback strategy to additional entity types

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

// Validate and optimize image for base64 storage (shared function)
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
    
    // Resize if too large (target max 800x600 for content images)
    const maxWidth = 800;
    const maxHeight = 600;
    if (targetWidth > maxWidth || targetHeight > maxHeight) {
      const ratio = Math.min(maxWidth / targetWidth, maxHeight / targetHeight);
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

// ===== CASE STUDY IMAGE PROCEDURES =====

export const uploadSimpleCaseStudyImage = baseProcedure
  .input(z.object({
    adminToken: z.string(),
    caseStudyId: z.number(),
    fileName: z.string().min(1).max(255),
    fileContent: z.string().min(1), // base64 encoded
    fileType: z.string().regex(/^image\//, "File must be an image"),
  }))
  .mutation(async ({ input }) => {
    const startTime = Date.now();
    
    try {
      await requireAdminAuth(input.adminToken);
      
      console.log(`🖼️ SIMPLE IMAGE: Starting simple image upload for case study ${input.caseStudyId}: ${input.fileName}`);
      
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
      
      // Update case study record with base64 image
      const { db } = await import("~/server/db");
      
      // Check if case study exists
      const existingCaseStudy = await db.caseStudy.findUnique({
        where: { id: input.caseStudyId },
      });
      
      if (!existingCaseStudy) {
        throw createSimpleImageError(
          `Case study with ID ${input.caseStudyId} not found`,
          'validation',
          {
            suggestions: [
              'Check the case study ID',
              'Ensure the case study exists',
            ]
          }
        );
      }
      
      // Update case study with base64 image data
      const updatedCaseStudy = await db.caseStudy.update({
        where: { id: input.caseStudyId },
        data: {
          image: processed.base64Data, // Store base64 data URL directly
          updatedAt: new Date(),
        },
      });
      
      const totalTime = Date.now() - startTime;
      
      console.log(`✅ SIMPLE IMAGE: Successfully uploaded simple image for case study ${input.caseStudyId} in ${totalTime}ms`);
      
      return {
        success: true,
        caseStudyId: input.caseStudyId,
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
      console.error(`❌ SIMPLE IMAGE: Upload failed for case study ${input.caseStudyId} after ${totalTime}ms:`, error);
      
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

export const getSimpleCaseStudyImage = baseProcedure
  .input(z.object({
    caseStudyId: z.number(),
  }))
  .query(async ({ input }) => {
    try {
      const { db } = await import("~/server/db");
      
      const caseStudy = await db.caseStudy.findUnique({
        where: { id: input.caseStudyId },
        select: {
          id: true,
          title: true,
          image: true,
          updatedAt: true,
        },
      });
      
      if (!caseStudy) {
        throw createSimpleImageError(
          `Case study with ID ${input.caseStudyId} not found`,
          'validation'
        );
      }
      
      // Check if image is a base64 data URL
      const isBase64 = caseStudy.image && caseStudy.image.startsWith('data:image/');
      
      return {
        success: true,
        caseStudyId: input.caseStudyId,
        caseStudyTitle: caseStudy.title,
        hasImage: !!caseStudy.image,
        isBase64: isBase64,
        imageData: isBase64 ? caseStudy.image : null,
        imageUrl: !isBase64 ? caseStudy.image : null, // External URL if not base64
        updatedAt: caseStudy.updatedAt,
      };
      
    } catch (error) {
      console.error(`Error retrieving simple image for case study ${input.caseStudyId}:`, error);
      
      if (error instanceof Error && 'category' in error) {
        throw error;
      }
      
      throw createSimpleImageError(
        error instanceof Error ? error.message : 'Failed to retrieve image',
        'processing'
      );
    }
  });

export const removeSimpleCaseStudyImage = baseProcedure
  .input(z.object({
    adminToken: z.string(),
    caseStudyId: z.number(),
  }))
  .mutation(async ({ input }) => {
    try {
      await requireAdminAuth(input.adminToken);
      
      const { db } = await import("~/server/db");
      
      const updatedCaseStudy = await db.caseStudy.update({
        where: { id: input.caseStudyId },
        data: {
          image: '', // Clear the image
          updatedAt: new Date(),
        },
      });
      
      console.log(`🗑️ SIMPLE IMAGE: Removed image for case study ${input.caseStudyId}`);
      
      return {
        success: true,
        caseStudyId: input.caseStudyId,
        message: 'Image removed successfully',
      };
      
    } catch (error) {
      console.error(`Error removing simple image for case study ${input.caseStudyId}:`, error);
      
      if (error instanceof Error && 'category' in error) {
        throw error;
      }
      
      throw createSimpleImageError(
        error instanceof Error ? error.message : 'Failed to remove image',
        'processing'
      );
    }
  });

// ===== CHALLENGE IMAGE PROCEDURES =====

export const uploadSimpleChallengeImage = baseProcedure
  .input(z.object({
    adminToken: z.string(),
    challengeId: z.number(),
    fileName: z.string().min(1).max(255),
    fileContent: z.string().min(1), // base64 encoded
    fileType: z.string().regex(/^image\//, "File must be an image"),
  }))
  .mutation(async ({ input }) => {
    const startTime = Date.now();
    
    try {
      await requireAdminAuth(input.adminToken);
      
      console.log(`🖼️ SIMPLE IMAGE: Starting simple image upload for challenge ${input.challengeId}: ${input.fileName}`);
      
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
      
      // Update challenge record with base64 image
      const { db } = await import("~/server/db");
      
      // Check if challenge exists
      const existingChallenge = await db.challenge.findUnique({
        where: { id: input.challengeId },
      });
      
      if (!existingChallenge) {
        throw createSimpleImageError(
          `Challenge with ID ${input.challengeId} not found`,
          'validation',
          {
            suggestions: [
              'Check the challenge ID',
              'Ensure the challenge exists',
            ]
          }
        );
      }
      
      // Update challenge with base64 image data
      const updatedChallenge = await db.challenge.update({
        where: { id: input.challengeId },
        data: {
          image: processed.base64Data, // Store base64 data URL directly
          updatedAt: new Date(),
        },
      });
      
      const totalTime = Date.now() - startTime;
      
      console.log(`✅ SIMPLE IMAGE: Successfully uploaded simple image for challenge ${input.challengeId} in ${totalTime}ms`);
      
      return {
        success: true,
        challengeId: input.challengeId,
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
      console.error(`❌ SIMPLE IMAGE: Upload failed for challenge ${input.challengeId} after ${totalTime}ms:`, error);
      
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

export const getSimpleChallengeImage = baseProcedure
  .input(z.object({
    challengeId: z.number(),
  }))
  .query(async ({ input }) => {
    try {
      const { db } = await import("~/server/db");
      
      const challenge = await db.challenge.findUnique({
        where: { id: input.challengeId },
        select: {
          id: true,
          title: true,
          image: true,
          updatedAt: true,
        },
      });
      
      if (!challenge) {
        throw createSimpleImageError(
          `Challenge with ID ${input.challengeId} not found`,
          'validation'
        );
      }
      
      // Check if image is a base64 data URL
      const isBase64 = challenge.image && challenge.image.startsWith('data:image/');
      
      return {
        success: true,
        challengeId: input.challengeId,
        challengeTitle: challenge.title,
        hasImage: !!challenge.image,
        isBase64: isBase64,
        imageData: isBase64 ? challenge.image : null,
        imageUrl: !isBase64 ? challenge.image : null, // External URL if not base64
        updatedAt: challenge.updatedAt,
      };
      
    } catch (error) {
      console.error(`Error retrieving simple image for challenge ${input.challengeId}:`, error);
      
      if (error instanceof Error && 'category' in error) {
        throw error;
      }
      
      throw createSimpleImageError(
        error instanceof Error ? error.message : 'Failed to retrieve image',
        'processing'
      );
    }
  });

export const removeSimpleChallengeImage = baseProcedure
  .input(z.object({
    adminToken: z.string(),
    challengeId: z.number(),
  }))
  .mutation(async ({ input }) => {
    try {
      await requireAdminAuth(input.adminToken);
      
      const { db } = await import("~/server/db");
      
      const updatedChallenge = await db.challenge.update({
        where: { id: input.challengeId },
        data: {
          image: '', // Clear the image
          updatedAt: new Date(),
        },
      });
      
      console.log(`🗑️ SIMPLE IMAGE: Removed image for challenge ${input.challengeId}`);
      
      return {
        success: true,
        challengeId: input.challengeId,
        message: 'Image removed successfully',
      };
      
    } catch (error) {
      console.error(`Error removing simple image for challenge ${input.challengeId}:`, error);
      
      if (error instanceof Error && 'category' in error) {
        throw error;
      }
      
      throw createSimpleImageError(
        error instanceof Error ? error.message : 'Failed to remove image',
        'processing'
      );
    }
  });

// ===== NEWS IMAGE PROCEDURES =====

export const uploadSimpleNewsImage = baseProcedure
  .input(z.object({
    adminToken: z.string(),
    newsId: z.number(),
    fileName: z.string().min(1).max(255),
    fileContent: z.string().min(1), // base64 encoded
    fileType: z.string().regex(/^image\//, "File must be an image"),
  }))
  .mutation(async ({ input }) => {
    const startTime = Date.now();
    
    try {
      await requireAdminAuth(input.adminToken);
      
      console.log(`🖼️ SIMPLE IMAGE: Starting simple image upload for news ${input.newsId}: ${input.fileName}`);
      
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
      
      // Update news record with base64 image
      const { db } = await import("~/server/db");
      
      // Check if news exists
      const existingNews = await db.news.findUnique({
        where: { id: input.newsId },
      });
      
      if (!existingNews) {
        throw createSimpleImageError(
          `News with ID ${input.newsId} not found`,
          'validation',
          {
            suggestions: [
              'Check the news ID',
              'Ensure the news article exists',
            ]
          }
        );
      }
      
      // Update news with base64 image data
      const updatedNews = await db.news.update({
        where: { id: input.newsId },
        data: {
          imageUrl: processed.base64Data, // Store base64 data URL directly
          updatedAt: new Date(),
        },
      });
      
      const totalTime = Date.now() - startTime;
      
      console.log(`✅ SIMPLE IMAGE: Successfully uploaded simple image for news ${input.newsId} in ${totalTime}ms`);
      
      return {
        success: true,
        newsId: input.newsId,
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
      console.error(`❌ SIMPLE IMAGE: Upload failed for news ${input.newsId} after ${totalTime}ms:`, error);
      
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

export const getSimpleNewsImage = baseProcedure
  .input(z.object({
    newsId: z.number(),
  }))
  .query(async ({ input }) => {
    try {
      const { db } = await import("~/server/db");
      
      const news = await db.news.findUnique({
        where: { id: input.newsId },
        select: {
          id: true,
          title: true,
          imageUrl: true,
          updatedAt: true,
        },
      });
      
      if (!news) {
        throw createSimpleImageError(
          `News with ID ${input.newsId} not found`,
          'validation'
        );
      }
      
      // Check if imageUrl is a base64 data URL
      const isBase64 = news.imageUrl && news.imageUrl.startsWith('data:image/');
      
      return {
        success: true,
        newsId: input.newsId,
        newsTitle: news.title,
        hasImage: !!news.imageUrl,
        isBase64: isBase64,
        imageData: isBase64 ? news.imageUrl : null,
        imageUrl: !isBase64 ? news.imageUrl : null, // External URL if not base64
        updatedAt: news.updatedAt,
      };
      
    } catch (error) {
      console.error(`Error retrieving simple image for news ${input.newsId}:`, error);
      
      if (error instanceof Error && 'category' in error) {
        throw error;
      }
      
      throw createSimpleImageError(
        error instanceof Error ? error.message : 'Failed to retrieve image',
        'processing'
      );
    }
  });

export const removeSimpleNewsImage = baseProcedure
  .input(z.object({
    adminToken: z.string(),
    newsId: z.number(),
  }))
  .mutation(async ({ input }) => {
    try {
      await requireAdminAuth(input.adminToken);
      
      const { db } = await import("~/server/db");
      
      const updatedNews = await db.news.update({
        where: { id: input.newsId },
        data: {
          imageUrl: '', // Clear the imageUrl
          updatedAt: new Date(),
        },
      });
      
      console.log(`🗑️ SIMPLE IMAGE: Removed image for news ${input.newsId}`);
      
      return {
        success: true,
        newsId: input.newsId,
        message: 'Image removed successfully',
      };
      
    } catch (error) {
      console.error(`Error removing simple image for news ${input.newsId}:`, error);
      
      if (error instanceof Error && 'category' in error) {
        throw error;
      }
      
      throw createSimpleImageError(
        error instanceof Error ? error.message : 'Failed to remove image',
        'processing'
      );
    }
  });
