import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";
import { requireAdminAuth } from "./auth";
import { innovatorSchema } from "~/constants/validation";
import * as z from "zod";

export const adminGetInnovators = baseProcedure
  .input(z.object({
    adminToken: z.string(),
    limit: z.number().int().positive().max(100).default(20),
    cursor: z.number().int().positive().optional(),
    search: z.string().optional(),
    featured: z.boolean().optional(),
  }))
  .query(async ({ input }) => {
    await requireAdminAuth(input.adminToken);
    
    const { limit, cursor, search, featured } = input;
    
    let whereClause: any = {};
    
    if (featured !== undefined) {
      whereClause.featured = featured;
    }
    
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { role: { contains: search, mode: 'insensitive' } },
        { impact: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (cursor) {
      whereClause.id = {
        lt: cursor,
      };
    }

    const innovators = await db.innovator.findMany({
      where: whereClause,
      orderBy: [
        { updatedAt: 'desc' },  // Most recently updated/added first - ensures updated or added innovators take priority
        { featured: 'desc' },   // Then featured status
        { order: 'asc' },       // Then by custom order
        { createdAt: 'desc' },  // Finally by creation date
      ],
      take: limit + 1,
    });

    let nextCursor: number | undefined = undefined;
    if (innovators.length > limit) {
      const nextItem = innovators.pop();
      nextCursor = nextItem?.id;
    }

    return {
      innovators,
      nextCursor,
    };
  });

export const adminGetInnovatorById = baseProcedure
  .input(z.object({
    adminToken: z.string(),
    id: z.number().int().positive(),
  }))
  .query(async ({ input }) => {
    await requireAdminAuth(input.adminToken);
    
    const { id } = input;
    
    const innovator = await db.innovator.findUnique({
      where: { id },
    });
    
    if (!innovator) {
      throw new Error('Innovator not found');
    }
    
    return innovator;
  });

export const adminCreateInnovator = baseProcedure
  .input(z.object({
    adminToken: z.string(),
    data: z.object({
      name: z.string().min(1).max(100),
      title: z.string().min(1).max(150), // Frontend sends 'title', maps to 'role'
      bio: z.string().min(1),
      image: z.string().optional(), // Made optional for creation since SimpleInnovatorImageUpload needs an ID
      achievements: z.array(z.string()).min(1),
      linkedinUrl: z.string().url().optional().or(z.literal("")),
      twitterUrl: z.string().url().optional().or(z.literal("")),
      websiteUrl: z.string().url().optional().or(z.literal("")),
      featured: z.boolean().default(false),
      hasVideo: z.boolean().default(false),
      videoUrl: z.string().url().optional().or(z.literal("")),
    }),
  }))
  .mutation(async ({ input }) => {
    await requireAdminAuth(input.adminToken);
    
    const { data } = input;
    
    console.log(`🔄 ADMIN CREATE: Starting innovator creation:`, {
      name: data.name,
      title: data.title,
      hasImage: !!data.image,
      imageValue: data.image,
    });
    
    // DEFAULT AVATAR VALUE - required by Prisma schema
    const DEFAULT_AVATAR = 'default-innovator-placeholder.png';
    
    // Prepare innovator data - ALWAYS setting avatar since it's required
    const innovatorData: any = {
      name: data.name,
      role: data.title, // Map title to role
      impact: data.bio, // Map bio to impact for now, but we should also store bio
      bio: data.bio, // Store the full bio
      achievements: JSON.stringify(data.achievements),
      hasVideo: data.hasVideo || false,
      videoUrl: data.hasVideo && data.videoUrl ? data.videoUrl : null,
      featured: data.featured,
      order: 0, // Default order
      // IMPORTANT: Avatar is REQUIRED by Prisma schema - always provide a value
      avatar: DEFAULT_AVATAR // Set default, will override below if image provided
    };
    
    // If image is provided, use it instead of default
    if (data.image && data.image.trim() !== '') {
      console.log(`🖼️ ADMIN CREATE: Custom image provided for new innovator - overriding default:`, {
        imageValue: data.image.substring(0, 50) + '...',
        imageLength: data.image.length,
      });
      innovatorData.avatar = data.image;
    } else {
      console.log(`🖼️ ADMIN CREATE: No image provided - using default avatar: ${DEFAULT_AVATAR}`);
    }
    
    console.log(`🔍 FINAL AVATAR VALUE: ${innovatorData.avatar ? innovatorData.avatar.substring(0, 30) + '...' : 'undefined'}`);
    
    const innovator = await db.innovator.create({
      data: innovatorData,
    });
    
    console.log(`✅ ADMIN CREATE: Successfully created innovator:`, {
      innovatorId: innovator.id,
      innovatorName: innovator.name,
      hasAvatar: !!innovator.avatar,
    });
    
    return {
      success: true,
      innovator,
      message: data.image ? 
        'Innovator created successfully with avatar' : 
        'Innovator created successfully. You can add an avatar by editing the innovator.',
    };
  });

export const adminUpdateInnovator = baseProcedure
  .input(z.object({
    adminToken: z.string(),
    id: z.number().int().positive(),
    data: z.object({
      name: z.string().min(1).max(100).optional(),
      title: z.string().min(1).max(150).optional(), // Frontend sends 'title', maps to 'role'
      bio: z.string().min(1).optional(),
      image: z.string().min(1).optional(), // Enhanced to handle both file paths and simple upload markers
      achievements: z.array(z.string()).optional(),
      linkedinUrl: z.string().url().optional().or(z.literal("")),
      twitterUrl: z.string().url().optional().or(z.literal("")),
      websiteUrl: z.string().url().optional().or(z.literal("")),
      featured: z.boolean().optional(),
      hasVideo: z.boolean().optional(),
      videoUrl: z.string().url().optional().or(z.literal("")),
      order: z.number().int().optional(),
    }),
  }))
  .mutation(async ({ input }) => {
    await requireAdminAuth(input.adminToken);
    
    const { id, data } = input;
    
    console.log(`🔄 ADMIN UPDATE: Starting innovator update for ID ${id}:`, {
      hasImage: !!data.image,
      imageValue: data.image,
      imageLength: data.image?.length,
      imageType: typeof data.image,
    });
    
    const updateData: any = {};
    
    if (data.name !== undefined) updateData.name = data.name;
    if (data.title !== undefined) updateData.role = data.title; // Map title to role
    if (data.bio !== undefined) {
      updateData.impact = data.bio; // Map bio to impact
      updateData.bio = data.bio; // Also store as bio
    }
    if (data.achievements !== undefined) updateData.achievements = JSON.stringify(data.achievements);
    if (data.featured !== undefined) updateData.featured = data.featured;
    if (data.hasVideo !== undefined) updateData.hasVideo = data.hasVideo;
    if (data.videoUrl !== undefined) updateData.videoUrl = data.videoUrl || null;
    if (data.order !== undefined) updateData.order = data.order;
    
    // Enhanced image handling for both upload methods
    if (data.image !== undefined) {
      try {
        console.log(`🖼️ ADMIN UPDATE: Processing image update:`, {
          imageValue: data.image,
          imageLength: data.image.length,
          startsWithSimple: data.image.startsWith('simple-upload-'),
          containsDot: data.image.includes('.'),
          isUUID: /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.(jpg|jpeg|png|gif|webp|bmp|tiff|svg|avif)$/i.test(data.image),
        });
        
        // Check if this is a simple upload marker
        if (data.image.startsWith('simple-upload-')) {
          console.log(`📝 ADMIN UPDATE: Simple upload detected - preserving existing avatar data`);
          
          // For simple upload, the actual image data is already stored in the avatar field
          // We don't need to update the avatar field, just preserve it
          // The simple upload component handles the avatar field directly
          
          // Verify that the innovator actually has image data
          const existingInnovator = await db.innovator.findUnique({
            where: { id },
            select: { avatar: true, name: true },
          });
          
          if (!existingInnovator) {
            throw new Error(`Innovator with ID ${id} not found`);
          }
          
          if (!existingInnovator.avatar || existingInnovator.avatar.trim() === '') {
            console.warn(`⚠️ ADMIN UPDATE: Simple upload marker provided but no avatar data found for innovator ${id}`);
            throw new Error('Simple upload marker provided but no image data found. Please upload an image first.');
          }
          
          // Validate that the avatar is base64 data (simple upload format)
          const isBase64Avatar = existingInnovator.avatar.startsWith('data:image/');
          
          if (!isBase64Avatar) {
            console.warn(`⚠️ ADMIN UPDATE: Simple upload marker provided but avatar is not base64 format:`, {
              avatarStart: existingInnovator.avatar.substring(0, 50),
              isBase64: isBase64Avatar,
            });
          }
          
          console.log(`✅ ADMIN UPDATE: Simple upload validation passed for innovator ${id}:`, {
            hasAvatar: !!existingInnovator.avatar,
            isBase64: isBase64Avatar,
            avatarSize: existingInnovator.avatar.length,
          });
          
          // Don't update the avatar field - it's already set by the simple upload component
          // The simple upload marker just confirms that the form should accept the existing data
          
        } else if (data.image.includes('.') && data.image.length > 10) {
          // This looks like a file path from advanced upload (bulletproof system)
          console.log(`🗃️ ADMIN UPDATE: Advanced upload file path detected:`, {
            filePath: data.image,
          });
          
          // Validate file path format (should be UUID.extension)
          const filePathRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.(jpg|jpeg|png|gif|webp|bmp|tiff|svg|avif)$/i;
          
          if (!filePathRegex.test(data.image)) {
            console.warn(`⚠️ ADMIN UPDATE: Invalid file path format:`, {
              filePath: data.image,
              expectedFormat: 'UUID.extension',
            });
            throw new Error(`Invalid file path format: ${data.image}. Expected format: UUID.extension`);
          }
          
          // For advanced upload, store the file path in the avatar field
          updateData.avatar = data.image;
          
          console.log(`✅ ADMIN UPDATE: Advanced upload file path validation passed:`, {
            filePath: data.image,
          });
          
        } else {
          // Invalid image format
          console.error(`❌ ADMIN UPDATE: Invalid image format:`, {
            imageValue: data.image,
            imageLength: data.image.length,
            startsWithSimple: data.image.startsWith('simple-upload-'),
            containsDot: data.image.includes('.'),
          });
          
          throw new Error(`Invalid image format. Expected either a file path from advanced upload or a simple upload marker, got: ${data.image.substring(0, 50)}...`);
        }
        
      } catch (imageError) {
        console.error(`❌ ADMIN UPDATE: Image processing failed for innovator ${id}:`, imageError);
        throw new Error(`Image update failed: ${imageError instanceof Error ? imageError.message : 'Unknown error'}`);
      }
    }
    
    console.log(`💾 ADMIN UPDATE: Executing database update for innovator ${id}:`, {
      updateFields: Object.keys(updateData),
      hasAvatarUpdate: 'avatar' in updateData,
      avatarValue: updateData.avatar ? updateData.avatar.substring(0, 50) + '...' : 'No change',
    });
    
    const innovator = await db.innovator.update({
      where: { id },
      data: updateData,
    });
    
    console.log(`✅ ADMIN UPDATE: Successfully updated innovator ${id}:`, {
      innovatorId: innovator.id,
      innovatorName: innovator.name,
      hasAvatar: !!innovator.avatar,
      avatarType: innovator.avatar ? (innovator.avatar.startsWith('data:image/') ? 'base64' : 'file_path') : 'none',
    });
    
    return {
      success: true,
      innovator,
      message: 'Innovator updated successfully',
    };
  });

export const adminDeleteInnovator = baseProcedure
  .input(z.object({
    adminToken: z.string(),
    id: z.number().int().positive(),
  }))
  .mutation(async ({ input }) => {
    await requireAdminAuth(input.adminToken);
    
    const { id } = input;
    
    await db.innovator.delete({
      where: { id },
    });
    
    return {
      success: true,
      message: 'Innovator deleted successfully',
    };
  });

export const adminReorderInnovators = baseProcedure
  .input(z.object({
    adminToken: z.string(),
    innovatorIds: z.array(z.number().int().positive()),
  }))
  .mutation(async ({ input }) => {
    await requireAdminAuth(input.adminToken);
    
    const { innovatorIds } = input;
    
    const updatePromises = innovatorIds.map((id, index) =>
      db.innovator.update({
        where: { id },
        data: { order: index },
      })
    );
    
    await Promise.all(updatePromises);
    
    return {
      success: true,
      message: 'Innovator order updated successfully',
    };
  });
