import { baseProcedure } from "~/server/trpc/main";
import { requireAdminAuth } from "./auth";
import * as z from "zod";
import { randomUUID } from "crypto";
import { Client } from "minio";

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

export const adminUploadImage = baseProcedure
  .input(imageUploadInputSchema)
  .mutation(async ({ input }) => {
    await requireAdminAuth(input.adminToken);
    
    const { fileName, fileContent, fileType } = input;
    
    try {
      // Ensure bucket exists
      const bucketExists = await minioClient.bucketExists(BUCKET_NAME);
      if (!bucketExists) {
        await minioClient.makeBucket(BUCKET_NAME);
      }
      
      // Generate unique file name
      const fileExtension = fileName.split('.').pop() || 'jpg';
      const uniqueFileName = `${randomUUID()}.${fileExtension}`;
      
      // Convert base64 to buffer
      const base64Data = fileContent.replace(/^data:image\/[a-z]+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      
      // Upload to Minio
      await minioClient.putObject(BUCKET_NAME, uniqueFileName, buffer, buffer.length, {
        'Content-Type': fileType,
      });
      
      return {
        success: true,
        filePath: uniqueFileName,
        message: 'Image uploaded successfully',
      };
    } catch (error) {
      console.error('Image upload error:', error);
      throw new Error('Failed to upload image');
    }
  });

export const getImage = baseProcedure
  .input(z.object({
    filePath: z.string().min(1, "File path is required"),
  }))
  .query(async ({ input }) => {
    const { filePath } = input;
    
    try {
      // Get image from Minio
      const stream = await minioClient.getObject(BUCKET_NAME, filePath);
      
      // Convert stream to buffer
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);
      
      // Convert to base64 for transmission
      const base64 = buffer.toString('base64');
      
      // Get file info to determine content type
      const stat = await minioClient.statObject(BUCKET_NAME, filePath);
      const contentType = stat.metaData?.['content-type'] || 'image/jpeg';
      
      return {
        success: true,
        data: `data:${contentType};base64,${base64}`,
        contentType,
      };
    } catch (error) {
      console.error('Image serving error:', error);
      throw new Error('Image not found');
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
    prefix: z.string().optional(),
  }))
  .query(async ({ input }) => {
    await requireAdminAuth(input.adminToken);
    
    const { prefix } = input;
    
    try {
      const bucketExists = await minioClient.bucketExists(BUCKET_NAME);
      if (!bucketExists) {
        return {
          success: true,
          images: [],
        };
      }
      
      const stream = minioClient.listObjects(BUCKET_NAME, prefix, true);
      const images: Array<{
        name: string;
        size: number;
        lastModified: Date;
      }> = [];
      
      for await (const obj of stream) {
        if (obj.name) {
          images.push({
            name: obj.name,
            size: obj.size || 0,
            lastModified: obj.lastModified || new Date(),
          });
        }
      }
      
      return {
        success: true,
        images,
      };
    } catch (error) {
      console.error('Image listing error:', error);
      throw new Error('Failed to list images');
    }
  });
