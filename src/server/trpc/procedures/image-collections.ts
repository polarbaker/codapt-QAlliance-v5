import { baseProcedure } from "~/server/trpc/main";
import { requireAdminAuth } from "./auth";
import * as z from "zod";
import { TRPCError } from "@trpc/server";

const listImageCollectionsInputSchema = z.object({
  adminToken: z.string(),
  includeImages: z.boolean().default(false),
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(50).default(20),
});

const createImageCollectionInputSchema = z.object({
  adminToken: z.string(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().default(false),
  imageIds: z.array(z.number()).default([]),
});

const updateImageCollectionInputSchema = z.object({
  adminToken: z.string(),
  collectionId: z.number(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().optional(),
  imageIds: z.array(z.number()).optional(),
});

const deleteImageCollectionInputSchema = z.object({
  adminToken: z.string(),
  collectionId: z.number(),
});

const addImagesToCollectionInputSchema = z.object({
  adminToken: z.string(),
  collectionId: z.number(),
  imageIds: z.array(z.number()).min(1),
});

const removeImagesFromCollectionInputSchema = z.object({
  adminToken: z.string(),
  collectionId: z.number(),
  imageIds: z.array(z.number()).min(1),
});

const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .slice(0, 50);
};

const ensureUniqueSlug = async (db: any, baseSlug: string, excludeId?: number): Promise<string> => {
  let slug = baseSlug;
  let counter = 1;
  
  while (true) {
    const existing = await db.imageCollection.findUnique({
      where: { 
        slug,
        ...(excludeId && { id: { not: excludeId } }),
      },
    });
    
    if (!existing) {
      return slug;
    }
    
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
};

export const adminListImageCollections = baseProcedure
  .input(listImageCollectionsInputSchema)
  .query(async ({ input }) => {
    try {
      await requireAdminAuth(input.adminToken);
      
      const { includeImages, page, pageSize } = input;
      
      const { db } = await import("~/server/db");
      
      // Get total count
      const totalCount = await db.imageCollection.count();
      
      // Get collections with optional image data
      const collections = await db.imageCollection.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          items: includeImages ? {
            include: {
              // Note: We would include image data here if the foreign key was set up
              // For now, we'll fetch image IDs and get image data separately
            },
            orderBy: { order: 'asc' },
          } : false,
        },
      });
      
      // If including images, fetch the actual image data
      let collectionsWithImages = collections;
      if (includeImages) {
        collectionsWithImages = await Promise.all(
          collections.map(async (collection) => {
            const imageIds = collection.items?.map(item => item.imageId) || [];
            const images = imageIds.length > 0 ? await db.image.findMany({
              where: { id: { in: imageIds } },
              select: {
                id: true,
                fileName: true,
                filePath: true,
                fileSize: true,
                width: true,
                height: true,
                title: true,
                description: true,
                altText: true,
                tags: true,
                category: true,
                createdAt: true,
              },
            }) : [];
            
            return {
              ...collection,
              images,
            };
          })
        );
      }
      
      console.log(`📋 Listed ${collections.length} image collections (page ${page})`);
      
      return {
        success: true,
        collections: collectionsWithImages,
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages: Math.ceil(totalCount / pageSize),
          hasNextPage: page * pageSize < totalCount,
          hasPreviousPage: page > 1,
        },
      };
      
    } catch (error) {
      console.error('Error listing image collections:', error);
      
      if (error instanceof TRPCError) {
        throw error;
      }
      
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to list image collections',
      });
    }
  });

export const adminCreateImageCollection = baseProcedure
  .input(createImageCollectionInputSchema)
  .mutation(async ({ input }) => {
    try {
      await requireAdminAuth(input.adminToken);
      
      const { name, description, isPublic, imageIds } = input;
      
      const { db } = await import("~/server/db");
      
      // Generate unique slug
      const baseSlug = generateSlug(name);
      const slug = await ensureUniqueSlug(db, baseSlug);
      
      // Validate that all image IDs exist if provided
      if (imageIds.length > 0) {
        const existingImages = await db.image.findMany({
          where: { id: { in: imageIds } },
          select: { id: true },
        });
        
        const existingIds = existingImages.map(img => img.id);
        const missingIds = imageIds.filter(id => !existingIds.includes(id));
        
        if (missingIds.length > 0) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Images not found: ${missingIds.join(', ')}`,
          });
        }
      }
      
      // Create collection in a transaction
      const collection = await db.$transaction(async (tx) => {
        // Create the collection
        const newCollection = await tx.imageCollection.create({
          data: {
            name,
            description,
            slug,
            isPublic,
            imageCount: imageIds.length,
            totalSize: 0, // Will be calculated if needed
          },
        });
        
        // Add images to collection if provided
        if (imageIds.length > 0) {
          const collectionItems = imageIds.map((imageId, index) => ({
            collectionId: newCollection.id,
            imageId,
            order: index,
          }));
          
          await tx.imageCollectionItem.createMany({
            data: collectionItems,
          });
          
          // Calculate total size
          const images = await tx.image.findMany({
            where: { id: { in: imageIds } },
            select: { fileSize: true },
          });
          
          const totalSize = images.reduce((sum, img) => sum + img.fileSize, 0);
          
          // Update collection with calculated size
          await tx.imageCollection.update({
            where: { id: newCollection.id },
            data: { totalSize },
          });
        }
        
        return newCollection;
      });
      
      console.log(`✅ Created image collection: ${name} (ID: ${collection.id}) with ${imageIds.length} images`);
      
      return {
        success: true,
        collection: {
          ...collection,
          imageCount: imageIds.length,
        },
        message: `Collection "${name}" created successfully`,
      };
      
    } catch (error) {
      console.error('Error creating image collection:', error);
      
      if (error instanceof TRPCError) {
        throw error;
      }
      
      // Handle unique constraint violations
      if (error instanceof Error && error.message.includes('Unique constraint')) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'A collection with this name already exists',
        });
      }
      
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create image collection',
      });
    }
  });

export const adminUpdateImageCollection = baseProcedure
  .input(updateImageCollectionInputSchema)
  .mutation(async ({ input }) => {
    try {
      await requireAdminAuth(input.adminToken);
      
      const { collectionId, name, description, isPublic, imageIds } = input;
      
      const { db } = await import("~/server/db");
      
      // Check if collection exists
      const existingCollection = await db.imageCollection.findUnique({
        where: { id: collectionId },
      });
      
      if (!existingCollection) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Image collection not found',
        });
      }
      
      // Prepare update data
      const updateData: any = {};
      
      if (name !== undefined) {
        updateData.name = name;
        // Generate new slug if name changed
        if (name !== existingCollection.name) {
          const baseSlug = generateSlug(name);
          updateData.slug = await ensureUniqueSlug(db, baseSlug, collectionId);
        }
      }
      
      if (description !== undefined) {
        updateData.description = description;
      }
      
      if (isPublic !== undefined) {
        updateData.isPublic = isPublic;
      }
      
      // Update collection in a transaction
      const updatedCollection = await db.$transaction(async (tx) => {
        // Update collection basic data
        const updated = await tx.imageCollection.update({
          where: { id: collectionId },
          data: updateData,
        });
        
        // Update images if provided
        if (imageIds !== undefined) {
          // Validate that all image IDs exist
          if (imageIds.length > 0) {
            const existingImages = await tx.image.findMany({
              where: { id: { in: imageIds } },
              select: { id: true },
            });
            
            const existingIds = existingImages.map(img => img.id);
            const missingIds = imageIds.filter(id => !existingIds.includes(id));
            
            if (missingIds.length > 0) {
              throw new TRPCError({
                code: 'BAD_REQUEST',
                message: `Images not found: ${missingIds.join(', ')}`,
              });
            }
          }
          
          // Remove all existing items
          await tx.imageCollectionItem.deleteMany({
            where: { collectionId },
          });
          
          // Add new items
          if (imageIds.length > 0) {
            const collectionItems = imageIds.map((imageId, index) => ({
              collectionId,
              imageId,
              order: index,
            }));
            
            await tx.imageCollectionItem.createMany({
              data: collectionItems,
            });
            
            // Calculate total size
            const images = await tx.image.findMany({
              where: { id: { in: imageIds } },
              select: { fileSize: true },
            });
            
            const totalSize = images.reduce((sum, img) => sum + img.fileSize, 0);
            
            // Update collection with new counts
            await tx.imageCollection.update({
              where: { id: collectionId },
              data: {
                imageCount: imageIds.length,
                totalSize,
              },
            });
          } else {
            // Update collection with zero counts
            await tx.imageCollection.update({
              where: { id: collectionId },
              data: {
                imageCount: 0,
                totalSize: 0,
              },
            });
          }
        }
        
        return updated;
      });
      
      console.log(`✅ Updated image collection: ${collectionId}`);
      
      return {
        success: true,
        collection: updatedCollection,
        message: 'Collection updated successfully',
      };
      
    } catch (error) {
      console.error('Error updating image collection:', error);
      
      if (error instanceof TRPCError) {
        throw error;
      }
      
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update image collection',
      });
    }
  });

export const adminDeleteImageCollection = baseProcedure
  .input(deleteImageCollectionInputSchema)
  .mutation(async ({ input }) => {
    try {
      await requireAdminAuth(input.adminToken);
      
      const { collectionId } = input;
      
      const { db } = await import("~/server/db");
      
      // Check if collection exists
      const existingCollection = await db.imageCollection.findUnique({
        where: { id: collectionId },
        select: { id: true, name: true },
      });
      
      if (!existingCollection) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Image collection not found',
        });
      }
      
      // Delete collection (cascade will handle collection items)
      await db.imageCollection.delete({
        where: { id: collectionId },
      });
      
      console.log(`✅ Deleted image collection: ${existingCollection.name} (ID: ${collectionId})`);
      
      return {
        success: true,
        message: `Collection "${existingCollection.name}" deleted successfully`,
      };
      
    } catch (error) {
      console.error('Error deleting image collection:', error);
      
      if (error instanceof TRPCError) {
        throw error;
      }
      
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to delete image collection',
      });
    }
  });

export const adminAddImagesToCollection = baseProcedure
  .input(addImagesToCollectionInputSchema)
  .mutation(async ({ input }) => {
    try {
      await requireAdminAuth(input.adminToken);
      
      const { collectionId, imageIds } = input;
      
      const { db } = await import("~/server/db");
      
      // Check if collection exists
      const collection = await db.imageCollection.findUnique({
        where: { id: collectionId },
        include: {
          items: {
            select: { imageId: true, order: true },
            orderBy: { order: 'desc' },
            take: 1,
          },
        },
      });
      
      if (!collection) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Image collection not found',
        });
      }
      
      // Validate that all image IDs exist
      const existingImages = await db.image.findMany({
        where: { id: { in: imageIds } },
        select: { id: true, fileSize: true },
      });
      
      const existingIds = existingImages.map(img => img.id);
      const missingIds = imageIds.filter(id => !existingIds.includes(id));
      
      if (missingIds.length > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Images not found: ${missingIds.join(', ')}`,
        });
      }
      
      // Check for duplicates
      const existingItems = await db.imageCollectionItem.findMany({
        where: {
          collectionId,
          imageId: { in: imageIds },
        },
        select: { imageId: true },
      });
      
      const existingImageIds = existingItems.map(item => item.imageId);
      const newImageIds = imageIds.filter(id => !existingImageIds.includes(id));
      
      if (newImageIds.length === 0) {
        return {
          success: true,
          message: 'All images are already in the collection',
          addedCount: 0,
        };
      }
      
      // Add images to collection
      const result = await db.$transaction(async (tx) => {
        // Get next order value
        const lastOrder = collection.items[0]?.order || -1;
        
        // Create collection items
        const collectionItems = newImageIds.map((imageId, index) => ({
          collectionId,
          imageId,
          order: lastOrder + index + 1,
        }));
        
        await tx.imageCollectionItem.createMany({
          data: collectionItems,
        });
        
        // Update collection counts
        const newImages = existingImages.filter(img => newImageIds.includes(img.id));
        const additionalSize = newImages.reduce((sum, img) => sum + img.fileSize, 0);
        
        await tx.imageCollection.update({
          where: { id: collectionId },
          data: {
            imageCount: { increment: newImageIds.length },
            totalSize: { increment: additionalSize },
          },
        });
        
        return { addedCount: newImageIds.length };
      });
      
      console.log(`✅ Added ${result.addedCount} images to collection ${collectionId}`);
      
      return {
        success: true,
        message: `Added ${result.addedCount} images to collection`,
        addedCount: result.addedCount,
      };
      
    } catch (error) {
      console.error('Error adding images to collection:', error);
      
      if (error instanceof TRPCError) {
        throw error;
      }
      
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to add images to collection',
      });
    }
  });

export const adminRemoveImagesFromCollection = baseProcedure
  .input(removeImagesFromCollectionInputSchema)
  .mutation(async ({ input }) => {
    try {
      await requireAdminAuth(input.adminToken);
      
      const { collectionId, imageIds } = input;
      
      const { db } = await import("~/server/db");
      
      // Check if collection exists
      const collection = await db.imageCollection.findUnique({
        where: { id: collectionId },
      });
      
      if (!collection) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Image collection not found',
        });
      }
      
      // Find existing items to remove
      const existingItems = await db.imageCollectionItem.findMany({
        where: {
          collectionId,
          imageId: { in: imageIds },
        },
        include: {
          // We would include image data here if foreign key was set up
        },
      });
      
      if (existingItems.length === 0) {
        return {
          success: true,
          message: 'No images found in collection to remove',
          removedCount: 0,
        };
      }
      
      // Get image file sizes for updating collection total
      const images = await db.image.findMany({
        where: { id: { in: existingItems.map(item => item.imageId) } },
        select: { id: true, fileSize: true },
      });
      
      // Remove images from collection
      const result = await db.$transaction(async (tx) => {
        // Delete collection items
        await tx.imageCollectionItem.deleteMany({
          where: {
            collectionId,
            imageId: { in: imageIds },
          },
        });
        
        // Update collection counts
        const removedSize = images.reduce((sum, img) => sum + img.fileSize, 0);
        
        await tx.imageCollection.update({
          where: { id: collectionId },
          data: {
            imageCount: { decrement: existingItems.length },
            totalSize: { decrement: removedSize },
          },
        });
        
        return { removedCount: existingItems.length };
      });
      
      console.log(`✅ Removed ${result.removedCount} images from collection ${collectionId}`);
      
      return {
        success: true,
        message: `Removed ${result.removedCount} images from collection`,
        removedCount: result.removedCount,
      };
      
    } catch (error) {
      console.error('Error removing images from collection:', error);
      
      if (error instanceof TRPCError) {
        throw error;
      }
      
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to remove images from collection',
      });
    }
  });
