import { baseProcedure } from "~/server/trpc/main";
import { requireAdminAuth } from "./auth";
import * as z from "zod";
import { randomUUID } from "crypto";
import { Client } from "minio";
import sharp from "sharp";

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

// Enhanced image validation with more permissive rules and better error reporting
const validateImageContent = async (buffer: Buffer, fileName: string): Promise<{ 
  valid: boolean; 
  metadata?: sharp.Metadata; 
  error?: string;
  warnings?: string[];
}> => {
  const warnings: string[] = [];
  
  try {
    // First, try to get basic metadata without strict validation
    let metadata: sharp.Metadata;
    
    try {
      metadata = await sharp(buffer).metadata();
    } catch (initialError) {
      // If sharp fails initially, try with different options
      console.log(`Initial sharp parsing failed for ${fileName}, trying alternatives:`, initialError);
      
      // Try with failOnError disabled for more permissive parsing
      try {
        metadata = await sharp(buffer, { failOnError: false }).metadata();
        warnings.push('Image required alternative processing - may have minor format issues');
      } catch (alternativeError) {
        // Try to detect if this might be a HEIC/HEIF file that needs special handling
        const fileExtension = fileName.toLowerCase().split('.').pop();
        if (fileExtension === 'heic' || fileExtension === 'heif') {
          return { 
            valid: false, 
            error: 'HEIC/HEIF format detected. Please convert to JPEG or PNG before uploading, or use a different image format.' 
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
    
    return { 
      valid: false, 
      error: `Unable to process image: ${error instanceof Error ? error.message : 'Unknown error'}. Please try a different image file or format.` 
    };
  }
};

// Enhanced image processing with multiple fallback strategies
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
  try {
    const image = sharp(buffer, { failOnError: false }); // More permissive parsing
    const metadata = await image.metadata();
    
    console.log(`Processing image: ${originalName}, format: ${metadata.format}, dimensions: ${metadata.width}x${metadata.height}`);
    
    // Determine the best output format based on input and characteristics
    let outputFormat: 'webp' | 'jpeg' | 'png' = 'webp';
    let contentType = 'image/webp';
    let extension = 'webp';
    let wasConverted = false;
    
    // Special handling for different input formats
    const inputFormat = metadata.format?.toLowerCase();
    
    // Keep PNG for images with transparency, unless we can use WebP
    if (metadata.hasAlpha && inputFormat === 'png') {
      // Try WebP first, fallback to PNG if WebP fails
      try {
        await image.clone().webp({ quality: 85, effort: 4 }).toBuffer();
        outputFormat = 'webp';
        contentType = 'image/webp';
        extension = 'webp';
      } catch (webpError) {
        console.log('WebP conversion failed for PNG with alpha, keeping as PNG');
        outputFormat = 'png';
        contentType = 'image/png';
        extension = 'png';
      }
    }
    
    // Handle SVG files
    if (inputFormat === 'svg') {
      // SVG needs special handling - rasterize to PNG
      outputFormat = 'png';
      contentType = 'image/png';
      extension = 'png';
      wasConverted = true;
    }
    
    // Handle GIF files
    if (inputFormat === 'gif') {
      // For animated GIFs, we'll take the first frame and convert to WebP/JPEG
      if (metadata.pages && metadata.pages > 1) {
        console.log('Animated GIF detected, extracting first frame');
      }
      wasConverted = true;
    }
    
    // Handle TIFF files
    if (inputFormat === 'tiff' || inputFormat === 'tif') {
      // TIFF should be converted to JPEG for web compatibility
      outputFormat = 'jpeg';
      contentType = 'image/jpeg';
      extension = 'jpg';
      wasConverted = true;
    }
    
    // Start with the base image
    let processedImage = image;
    let optimizationApplied = false;
    
    // Resize if too large (max 2048px on longest side for web optimization)
    if (metadata.width && metadata.height) {
      const maxDimension = Math.max(metadata.width, metadata.height);
      if (maxDimension > 2048) {
        console.log(`Resizing image from ${metadata.width}x${metadata.height} to fit within 2048px`);
        processedImage = processedImage.resize(2048, 2048, {
          fit: 'inside',
          withoutEnlargement: true
        });
        optimizationApplied = true;
      }
    }
    
    // Apply format-specific processing with fallbacks
    let processedBuffer: Buffer;
    
    try {
      if (outputFormat === 'webp') {
        processedBuffer = await processedImage
          .webp({ quality: 85, effort: 4 })
          .toBuffer();
      } else if (outputFormat === 'png') {
        processedBuffer = await processedImage
          .png({ compressionLevel: 8, adaptiveFiltering: true })
          .toBuffer();
      } else {
        processedBuffer = await processedImage
          .jpeg({ quality: 85, progressive: true })
          .toBuffer();
      }
    } catch (formatError) {
      console.error(`Failed to convert to ${outputFormat}, trying JPEG fallback:`, formatError);
      
      // Fallback to JPEG conversion
      try {
        processedBuffer = await processedImage
          .jpeg({ quality: 85, progressive: true })
          .toBuffer();
        outputFormat = 'jpeg';
        contentType = 'image/jpeg';
        extension = 'jpg';
        wasConverted = true;
      } catch (jpegError) {
        console.error('JPEG fallback also failed, trying PNG:', jpegError);
        
        // Final fallback to PNG
        try {
          processedBuffer = await processedImage
            .png({ compressionLevel: 6 }) // Lower compression for compatibility
            .toBuffer();
          outputFormat = 'png';
          contentType = 'image/png';
          extension = 'png';
          wasConverted = true;
        } catch (pngError) {
          console.error('All format conversions failed:', pngError);
          throw new Error(`Unable to process image. The file format may be corrupted or unsupported. Please try converting the image to JPEG or PNG format and uploading again.`);
        }
      }
    }
    
    // Validate the processed result
    try {
      const processedMetadata = await sharp(processedBuffer).metadata();
      if (!processedMetadata.width || !processedMetadata.height) {
        throw new Error('Processed image has invalid dimensions');
      }
    } catch (validationError) {
      console.error('Processed image validation failed:', validationError);
      throw new Error('Image processing resulted in an invalid file. Please try a different image.');
    }
    
    return { 
      buffer: processedBuffer, 
      contentType, 
      extension,
      processingInfo: {
        originalFormat: inputFormat,
        outputFormat,
        wasConverted,
        optimizationApplied,
      }
    };
    
  } catch (error) {
    console.error('Image processing error:', error);
    
    // Enhanced error messages for common issues
    const errorMessage = error instanceof Error ? error.message.toLowerCase() : 'unknown error';
    
    if (errorMessage.includes('input buffer contains unsupported image format')) {
      throw new Error('The image format is not supported. Please convert your image to JPEG, PNG, or WebP format and try again.');
    }
    
    if (errorMessage.includes('image too large')) {
      throw new Error('The image is too large to process. Please reduce the image size or dimensions and try again.');
    }
    
    if (errorMessage.includes('memory')) {
      throw new Error('The image requires too much memory to process. Please reduce the image size and try again.');
    }
    
    if (error instanceof Error && error.message.includes('Unable to process image')) {
      throw error; // Re-throw our custom errors
    }
    
    throw new Error(`Image processing failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please try a different image file.`);
  }
};

// Enhanced image variant generation with multiple sizes and formats
const generateImageVariants = async (
  originalBuffer: Buffer, 
  originalMetadata: sharp.Metadata,
  imageId: number,
  baseName: string
): Promise<Array<{ variantType: string; filePath: string; width: number; height: number; fileSize: number; format: string; quality?: number }>> => {
  const variants = [];
  
  // Define variant configurations
  const variantConfigs = [
    { type: 'thumbnail', maxWidth: 150, maxHeight: 150, quality: 80, format: 'webp' },
    { type: 'small', maxWidth: 400, maxHeight: 400, quality: 85, format: 'webp' },
    { type: 'medium', maxWidth: 800, maxHeight: 800, quality: 85, format: 'webp' },
    { type: 'large', maxWidth: 1600, maxHeight: 1600, quality: 90, format: 'webp' },
    // Also create JPEG fallbacks for compatibility
    { type: 'medium_jpeg', maxWidth: 800, maxHeight: 800, quality: 85, format: 'jpeg' },
    { type: 'large_jpeg', maxWidth: 1600, maxHeight: 1600, quality: 90, format: 'jpeg' },
  ];
  
  for (const config of variantConfigs) {
    try {
      let image = sharp(originalBuffer);
      
      // Only resize if the original is larger than the target
      if (originalMetadata.width && originalMetadata.height) {
        const needsResize = originalMetadata.width > config.maxWidth || originalMetadata.height > config.maxHeight;
        
        if (needsResize) {
          image = image.resize(config.maxWidth, config.maxHeight, {
            fit: 'inside',
            withoutEnlargement: true
          });
        }
      }
      
      // Apply format and quality
      let processedBuffer: Buffer;
      if (config.format === 'webp') {
        processedBuffer = await image.webp({ quality: config.quality, effort: 4 }).toBuffer();
      } else if (config.format === 'jpeg') {
        processedBuffer = await image.jpeg({ quality: config.quality, progressive: true }).toBuffer();
      } else {
        processedBuffer = await image.png({ compressionLevel: 8 }).toBuffer();
      }
      
      // Get processed image metadata
      const processedMetadata = await sharp(processedBuffer).metadata();
      
      // Generate unique filename for variant
      const variantFileName = `${baseName}_${config.type}.${config.format}`;
      
      // Upload variant to Minio
      await minioClient.putObject(BUCKET_NAME, variantFileName, processedBuffer, processedBuffer.length, {
        'Content-Type': `image/${config.format}`,
        'X-Variant-Type': config.type,
        'X-Parent-Image-Id': imageId.toString(),
        'X-Generated-At': new Date().toISOString(),
      });
      
      variants.push({
        variantType: config.type,
        filePath: variantFileName,
        width: processedMetadata.width || 0,
        height: processedMetadata.height || 0,
        fileSize: processedBuffer.length,
        format: config.format,
        quality: config.quality,
      });
      
    } catch (error) {
      console.error(`Failed to generate ${config.type} variant:`, error);
      // Continue with other variants even if one fails
    }
  }
  
  return variants;
};

// Enhanced metadata extraction using sharp and additional analysis
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
    const metadata = await sharp(buffer).metadata();
    
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
    console.error('Failed to extract image metadata:', error);
    return {};
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
    await requireAdminAuth(input.adminToken);
    
    const { fileName, fileContent, fileType, title, description, altText, tags, category, generateVariants } = input;
    
    try {
      // Ensure bucket exists
      const bucketExists = await minioClient.bucketExists(BUCKET_NAME);
      if (!bucketExists) {
        await minioClient.makeBucket(BUCKET_NAME);
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
      
      // Upload main image to Minio with enhanced metadata
      await minioClient.putObject(BUCKET_NAME, uniqueFileName, processed.buffer, processed.buffer.length, {
        'Content-Type': processed.contentType,
        'X-Original-Name': fileName,
        'X-Original-Type': fileType,
        'X-Processed-At': new Date().toISOString(),
        'X-Image-Type': 'main',
        'X-Processing-Info': JSON.stringify(processed.processingInfo || {}),
        'X-Validation-Warnings': validation.warnings ? JSON.stringify(validation.warnings) : undefined,
      });
      
      // Store image metadata in database
      const { db } = await import("~/server/db");
      
      const imageRecord = await db.image.create({
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
      
      // Generate variants if requested
      let variants = [];
      if (generateVariants) {
        try {
          const variantData = await generateImageVariants(originalBuffer, validation.metadata!, imageRecord.id, baseName);
          
          // Store variants in database
          for (const variant of variantData) {
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
          }
          variants = variantData;
        } catch (variantError) {
          console.error('Variant generation failed:', variantError);
          // Don't fail the main upload if variant generation fails
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
      console.error('Image upload error:', error);
      
      // Enhanced error logging for debugging
      console.error('Upload context:', {
        fileName,
        fileType,
        contentLength: fileContent?.length || 0,
        hasValidToken: !!input.adminToken,
      });
      
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error('Failed to upload image. Please try again with a different image file.');
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
    await requireAdminAuth(input.adminToken);
    
    const { images, generateVariants, collectionName } = input;
    const results = [];
    const errors = [];
    
    // Create collection if specified
    let collection = null;
    if (collectionName) {
      const { db } = await import("~/server/db");
      
      try {
        collection = await db.imageCollection.create({
          data: {
            name: collectionName,
            slug: collectionName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            isPublic: false,
          },
        });
      } catch (error) {
        console.error('Failed to create collection:', error);
      }
    }
    
    // Process each image
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      
      try {
        // Use the existing upload logic
        const result = await adminUploadImage.resolver({
          input: {
            adminToken: input.adminToken,
            ...image,
            generateVariants,
          },
          ctx: {} as any,
        });
        
        // Add to collection if created
        if (collection && result.imageId) {
          const { db } = await import("~/server/db");
          await db.imageCollectionItem.create({
            data: {
              collectionId: collection.id,
              imageId: result.imageId,
              order: i,
            },
          });
        }
        
        results.push({
          fileName: image.fileName,
          success: true,
          ...result,
        });
        
      } catch (error) {
        console.error(`Failed to upload image ${image.fileName}:`, error);
        errors.push({
          fileName: image.fileName,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
    
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
      
      // Get image from Minio
      const stream = await minioClient.getObject(BUCKET_NAME, filePath);
      
      // Convert stream to buffer with size limit (10MB max)
      const chunks: Buffer[] = [];
      let totalSize = 0;
      const maxSize = 10 * 1024 * 1024; // 10MB
      
      for await (const chunk of stream) {
        totalSize += chunk.length;
        if (totalSize > maxSize) {
          throw new Error('Image too large');
        }
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);
      
      // Get file metadata
      const stat = await minioClient.statObject(BUCKET_NAME, filePath);
      let contentType = stat.metaData?.['content-type'] || 'image/jpeg';
      
      // Validate that it's still a valid image
      try {
        await sharp(buffer).metadata();
      } catch (error) {
        console.error('Stored image validation failed:', error);
        throw new Error('Corrupted image file');
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
      console.error('Image serving error:', error);
      if (error instanceof Error) {
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
      }
      
      // Get image from Minio
      const stream = await minioClient.getObject(BUCKET_NAME, targetFilePath);
      
      // Convert stream to buffer with size limit (10MB max)
      const chunks: Buffer[] = [];
      let totalSize = 0;
      const maxSize = 10 * 1024 * 1024; // 10MB
      
      for await (const chunk of stream) {
        totalSize += chunk.length;
        if (totalSize > maxSize) {
          throw new Error('Image too large');
        }
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);
      
      // Get file metadata
      const stat = await minioClient.statObject(BUCKET_NAME, targetFilePath);
      let contentType = stat.metaData?.['content-type'] || 'image/jpeg';
      
      // Validate that it's still a valid image
      try {
        await sharp(buffer).metadata();
      } catch (error) {
        console.error('Stored image validation failed:', error);
        throw new Error('Corrupted image file');
      }
      
      // Update usage tracking if this is a main image
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
        } catch (error) {
          // Don't fail the request if usage tracking fails
          console.warn('Failed to update usage tracking:', error);
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
      console.error('Image serving error:', error);
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error('Image not found or corrupted');
    }
  });

export const adminDeleteImage = baseProcedure
  .input(z.object({
    adminToken: z.string(),
    filePath: z.string().min(1, "File path is required"),
  }))
  .mutation(async ({ input }) => {
    await requireAdminAuth(input.adminToken);
    
    const { filePath } = input;
    
    try {
      await minioClient.removeObject(BUCKET_NAME, filePath);
      
      return {
        success: true,
        message: 'Image deleted successfully',
      };
    } catch (error) {
      console.error('Image deletion error:', error);
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
    await requireAdminAuth(input.adminToken);
    
    const { page, pageSize, search, category, tags, sortBy, sortOrder, includeVariants, includeArchived } = input;
    const { db } = await import("~/server/db");
    
    try {
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
      
      // Get total count
      const totalCount = await db.image.count({ where });
      
      // Get images with pagination
      const images = await db.image.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: includeVariants ? {
          variants: {
            orderBy: { createdAt: 'asc' },
          },
        } : false,
      });
      
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
