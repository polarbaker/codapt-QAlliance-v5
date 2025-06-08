import { baseProcedure } from "~/server/trpc/main";
import { requireAdminAuth } from "./auth";
import * as z from "zod";
import sharp from "sharp";
import { SITE_CONTENT_TEXT_TYPES, SITE_CONTENT_TEXT_DEFAULTS, siteContentTextSchema } from "~/constants/validation";

// Define the types of site content images that can be managed
const SITE_CONTENT_IMAGE_TYPES = [
  'hero_background',
  'bold_statement_background', 
  'innovation_pipeline_image',
  'impact_metrics_featured_image',
  'challenge_cta_background',
  'community_engagement_featured_image'
] as const;

type SiteContentImageType = typeof SITE_CONTENT_IMAGE_TYPES[number];
type SiteContentTextType = typeof SITE_CONTENT_TEXT_TYPES[number];

// Process image for site content storage (similar to simple image storage)
const processSiteContentImage = async (
  buffer: Buffer, 
  fileName: string,
  imageType: SiteContentImageType,
  maxSizeKB: number = 800 // Larger limit for site content images
): Promise<{
  base64Data: string;
  contentType: string;
  originalSize: number;
  optimizedSize: number;
  dimensions: { width: number; height: number };
}> => {
  const originalSize = buffer.length;
  
  try {
    const metadata = await sharp(buffer).metadata();
    
    if (!metadata.width || !metadata.height) {
      throw new Error('Invalid image - cannot determine dimensions');
    }
    
    // Different target sizes based on image type
    let maxDimension = 1200; // Default for backgrounds
    let quality = 85;
    
    if (imageType === 'innovation_pipeline_image' || imageType === 'impact_metrics_featured_image' || imageType === 'community_engagement_featured_image') {
      maxDimension = 800; // Smaller for content images
      quality = 90;
    }
    
    let targetWidth = metadata.width;
    let targetHeight = metadata.height;
    
    // Resize if too large
    if (targetWidth > maxDimension || targetHeight > maxDimension) {
      const ratio = Math.min(maxDimension / targetWidth, maxDimension / targetHeight);
      targetWidth = Math.round(targetWidth * ratio);
      targetHeight = Math.round(targetHeight * ratio);
    }
    
    // Process image
    let processedBuffer = await sharp(buffer)
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
    
    // Check if size is still too large and adjust quality
    if (processedBuffer.length > maxSizeKB * 1024) {
      let adjustedQuality = quality - 10;
      while (processedBuffer.length > maxSizeKB * 1024 && adjustedQuality > 40) {
        processedBuffer = await sharp(buffer)
          .resize(targetWidth, targetHeight, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .jpeg({ 
            quality: adjustedQuality, 
            progressive: false,
            mozjpeg: true 
          })
          .toBuffer();
        
        adjustedQuality -= 10;
      }
    }
    
    // Final size check
    if (processedBuffer.length > maxSizeKB * 1024) {
      throw new Error(`Image too large even after optimization (${(processedBuffer.length / 1024).toFixed(1)}KB). Maximum size is ${maxSizeKB}KB.`);
    }
    
    const base64Data = `data:image/jpeg;base64,${processedBuffer.toString('base64')}`;
    
    console.log(`✅ SITE CONTENT: Processed ${imageType} image:`, {
      fileName,
      originalSize: `${(originalSize / 1024).toFixed(1)}KB`,
      optimizedSize: `${(processedBuffer.length / 1024).toFixed(1)}KB`,
      dimensions: `${targetWidth}x${targetHeight}`,
    });
    
    return {
      base64Data,
      contentType: 'image/jpeg',
      originalSize,
      optimizedSize: processedBuffer.length,
      dimensions: { width: targetWidth, height: targetHeight },
    };
    
  } catch (error) {
    console.error('Site content image processing error:', error);
    throw new Error(`Image processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Upload site content image
export const uploadSiteContentImage = baseProcedure
  .input(z.object({
    adminToken: z.string(),
    imageType: z.enum(SITE_CONTENT_IMAGE_TYPES),
    fileName: z.string().min(1).max(255),
    fileContent: z.string().min(1), // base64 encoded
    fileType: z.string().regex(/^image\//, "File must be an image"),
  }))
  .mutation(async ({ input }) => {
    const startTime = Date.now();
    
    try {
      await requireAdminAuth(input.adminToken);
      
      console.log(`🖼️ SITE CONTENT: Starting image upload for ${input.imageType}: ${input.fileName}`);
      
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
        
        const initialSizeMB = buffer.length / (1024 * 1024);
        if (initialSizeMB > 15) { // 15MB limit for site content
          throw new Error(`Input image too large (${initialSizeMB.toFixed(1)}MB). Maximum input size is 15MB.`);
        }
        
      } catch (parseError) {
        throw new Error('Invalid image data - upload may be corrupted');
      }
      
      // Process image
      const processed = await processSiteContentImage(buffer, input.fileName, input.imageType);
      
      // Update or create site content record
      const { db } = await import("~/server/db");
      
      const updatedContent = await db.siteContent.upsert({
        where: { imageType: input.imageType },
        update: {
          imageData: processed.base64Data,
          fileName: input.fileName,
          updatedAt: new Date(),
        },
        create: {
          imageType: input.imageType,
          imageData: processed.base64Data,
          fileName: input.fileName,
        },
      });
      
      const totalTime = Date.now() - startTime;
      
      console.log(`✅ SITE CONTENT: Successfully uploaded image for ${input.imageType} in ${totalTime}ms`);
      
      return {
        success: true,
        imageType: input.imageType,
        message: 'Site content image uploaded successfully',
        metadata: {
          originalSize: processed.originalSize,
          optimizedSize: processed.optimizedSize,
          compressionRatio: processed.originalSize / processed.optimizedSize,
          dimensions: processed.dimensions,
          contentType: processed.contentType,
          processingTime: totalTime,
        },
      };
      
    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error(`❌ SITE CONTENT: Upload failed for ${input.imageType} after ${totalTime}ms:`, error);
      throw error;
    }
  });

// Get site content image
export const getSiteContentImage = baseProcedure
  .input(z.object({
    imageType: z.enum(SITE_CONTENT_IMAGE_TYPES),
  }))
  .query(async ({ input }) => {
    try {
      const { db } = await import("~/server/db");
      
      const content = await db.siteContent.findUnique({
        where: { imageType: input.imageType },
        select: {
          id: true,
          imageType: true,
          imageData: true,
          fileName: true,
          updatedAt: true,
        },
      });
      
      return {
        success: true,
        imageType: input.imageType,
        hasImage: !!content?.imageData,
        imageData: content?.imageData || null,
        fileName: content?.fileName || null,
        updatedAt: content?.updatedAt || null,
      };
      
    } catch (error) {
      console.error(`Error retrieving site content image for ${input.imageType}:`, error);
      throw new Error(`Failed to retrieve image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

// Remove site content image
export const removeSiteContentImage = baseProcedure
  .input(z.object({
    adminToken: z.string(),
    imageType: z.enum(SITE_CONTENT_IMAGE_TYPES),
  }))
  .mutation(async ({ input }) => {
    try {
      await requireAdminAuth(input.adminToken);
      
      const { db } = await import("~/server/db");
      
      await db.siteContent.deleteMany({
        where: { imageType: input.imageType },
      });
      
      console.log(`🗑️ SITE CONTENT: Removed image for ${input.imageType}`);
      
      return {
        success: true,
        imageType: input.imageType,
        message: 'Site content image removed successfully',
      };
      
    } catch (error) {
      console.error(`Error removing site content image for ${input.imageType}:`, error);
      throw new Error(`Failed to remove image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

// List all site content images
export const listSiteContentImages = baseProcedure
  .input(z.object({
    adminToken: z.string(),
  }))
  .query(async ({ input }) => {
    try {
      await requireAdminAuth(input.adminToken);
      
      const { db } = await import("~/server/db");
      
      const contentImages = await db.siteContent.findMany({
        select: {
          id: true,
          imageType: true,
          imageData: true,
          fileName: true,
          updatedAt: true,
        },
        orderBy: { imageType: 'asc' },
      });
      
      const imageStatus = SITE_CONTENT_IMAGE_TYPES.map(type => {
        const content = contentImages.find(c => c.imageType === type);
        return {
          imageType: type,
          hasImage: !!content?.imageData,
          fileName: content?.fileName || null,
          imageSize: content?.imageData ? `${(content.imageData.length / 1024).toFixed(1)}KB` : null,
          updatedAt: content?.updatedAt || null,
        };
      });
      
      return {
        success: true,
        images: imageStatus,
        summary: {
          total: SITE_CONTENT_IMAGE_TYPES.length,
          withImages: imageStatus.filter(i => i.hasImage).length,
          totalSize: contentImages.reduce((sum, c) => sum + (c.imageData?.length || 0), 0),
        },
      };
      
    } catch (error) {
      console.error('Error listing site content images:', error);
      throw new Error(`Failed to list images: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

// Upload site content text
export const uploadSiteContentText = baseProcedure
  .input(siteContentTextSchema)
  .mutation(async ({ input }) => {
    const startTime = Date.now();
    
    try {
      await requireAdminAuth(input.adminToken);
      
      console.log(`📝 SITE CONTENT: Starting text upload for ${input.contentType}`);
      
      // Validate text length
      if (input.textData.length > 5000) {
        throw new Error('Text content too long. Maximum 5000 characters allowed.');
      }
      
      // Update or create site content record
      const { db } = await import("~/server/db");
      
      const updatedContent = await db.siteContent.upsert({
        where: { contentType: input.contentType },
        update: {
          textData: input.textData,
          description: input.description,
          updatedAt: new Date(),
        },
        create: {
          contentType: input.contentType,
          textData: input.textData,
          description: input.description,
        },
      });
      
      const totalTime = Date.now() - startTime;
      
      console.log(`✅ SITE CONTENT: Successfully uploaded text for ${input.contentType} in ${totalTime}ms`);
      
      return {
        success: true,
        contentType: input.contentType,
        message: 'Site content text uploaded successfully',
        metadata: {
          textLength: input.textData.length,
          processingTime: totalTime,
        },
      };
      
    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error(`❌ SITE CONTENT: Text upload failed for ${input.contentType} after ${totalTime}ms:`, error);
      throw error;
    }
  });

// Get site content text
export const getSiteContentText = baseProcedure
  .input(z.object({
    contentType: z.enum(SITE_CONTENT_TEXT_TYPES),
  }))
  .query(async ({ input }) => {
    try {
      const { db } = await import("~/server/db");
      
      const content = await db.siteContent.findUnique({
        where: { contentType: input.contentType },
        select: {
          id: true,
          contentType: true,
          textData: true,
          description: true,
          updatedAt: true,
        },
      });
      
      // Return stored text or default value
      const textData = content?.textData || SITE_CONTENT_TEXT_DEFAULTS[input.contentType] || '';
      
      return {
        success: true,
        contentType: input.contentType,
        hasCustomText: !!content?.textData,
        textData,
        description: content?.description || null,
        updatedAt: content?.updatedAt || null,
      };
      
    } catch (error) {
      console.error(`Error retrieving site content text for ${input.contentType}:`, error);
      
      // Return default text on error
      return {
        success: true,
        contentType: input.contentType,
        hasCustomText: false,
        textData: SITE_CONTENT_TEXT_DEFAULTS[input.contentType] || '',
        description: null,
        updatedAt: null,
      };
    }
  });

// Remove site content text
export const removeSiteContentText = baseProcedure
  .input(z.object({
    adminToken: z.string(),
    contentType: z.enum(SITE_CONTENT_TEXT_TYPES),
  }))
  .mutation(async ({ input }) => {
    try {
      await requireAdminAuth(input.adminToken);
      
      const { db } = await import("~/server/db");
      
      // Only remove text data, keep image data if it exists
      await db.siteContent.updateMany({
        where: { contentType: input.contentType },
        data: { 
          textData: null,
          description: null,
        },
      });
      
      console.log(`🗑️ SITE CONTENT: Removed text for ${input.contentType}`);
      
      return {
        success: true,
        contentType: input.contentType,
        message: 'Site content text removed successfully',
      };
      
    } catch (error) {
      console.error(`Error removing site content text for ${input.contentType}:`, error);
      throw new Error(`Failed to remove text: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

// List all site content texts
export const listSiteContentTexts = baseProcedure
  .input(z.object({
    adminToken: z.string(),
  }))
  .query(async ({ input }) => {
    try {
      await requireAdminAuth(input.adminToken);
      
      const { db } = await import("~/server/db");
      
      const contentTexts = await db.siteContent.findMany({
        where: {
          textData: { not: null },
        },
        select: {
          id: true,
          contentType: true,
          textData: true,
          description: true,
          updatedAt: true,
        },
        orderBy: { contentType: 'asc' },
      });
      
      const textStatus = SITE_CONTENT_TEXT_TYPES.map(type => {
        const content = contentTexts.find(c => c.contentType === type);
        const textData = content?.textData || SITE_CONTENT_TEXT_DEFAULTS[type] || '';
        
        return {
          contentType: type,
          hasCustomText: !!content?.textData,
          textData,
          textLength: textData.length,
          description: content?.description || null,
          updatedAt: content?.updatedAt || null,
        };
      });
      
      return {
        success: true,
        texts: textStatus,
        summary: {
          total: SITE_CONTENT_TEXT_TYPES.length,
          withCustomText: textStatus.filter(t => t.hasCustomText).length,
          totalCharacters: textStatus.reduce((sum, t) => sum + t.textLength, 0),
        },
      };
      
    } catch (error) {
      console.error('Error listing site content texts:', error);
      throw new Error(`Failed to list texts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

// Get multiple site content texts at once
export const getBulkSiteContentText = baseProcedure
  .input(z.object({
    contentTypes: z.array(z.enum(SITE_CONTENT_TEXT_TYPES)),
  }))
  .query(async ({ input }) => {
    try {
      const { db } = await import("~/server/db");
      
      const contents = await db.siteContent.findMany({
        where: { 
          contentType: { in: input.contentTypes },
        },
        select: {
          contentType: true,
          textData: true,
          updatedAt: true,
        },
      });
      
      // Build result map with defaults for missing content
      const result: Record<string, string> = {};
      
      for (const contentType of input.contentTypes) {
        const content = contents.find(c => c.contentType === contentType);
        result[contentType] = content?.textData || SITE_CONTENT_TEXT_DEFAULTS[contentType] || '';
      }
      
      return {
        success: true,
        texts: result,
      };
      
    } catch (error) {
      console.error('Error retrieving bulk site content texts:', error);
      
      // Return defaults on error
      const result: Record<string, string> = {};
      for (const contentType of input.contentTypes) {
        result[contentType] = SITE_CONTENT_TEXT_DEFAULTS[contentType] || '';
      }
      
      return {
        success: true,
        texts: result,
      };
    }
  });
