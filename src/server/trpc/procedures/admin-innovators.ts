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
        { featured: 'desc' },
        { order: 'asc' },
        { createdAt: 'desc' },
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
      image: z.string().url(), // Frontend sends 'image', maps to 'avatar'
      achievements: z.array(z.string()).min(1),
      linkedinUrl: z.string().url().optional().or(z.literal("")),
      twitterUrl: z.string().url().optional().or(z.literal("")),
      websiteUrl: z.string().url().optional().or(z.literal("")),
      featured: z.boolean().default(false),
    }),
  }))
  .mutation(async ({ input }) => {
    await requireAdminAuth(input.adminToken);
    
    const { data } = input;
    
    const innovator = await db.innovator.create({
      data: {
        name: data.name,
        role: data.title, // Map title to role
        impact: data.bio, // Map bio to impact for now, but we should also store bio
        avatar: data.image, // Map image to avatar
        bio: data.bio, // Store the full bio
        achievements: JSON.stringify(data.achievements),
        hasVideo: false, // Default for now
        videoUrl: null,
        featured: data.featured,
        order: 0, // Default order
      },
    });
    
    return {
      success: true,
      innovator,
      message: 'Innovator created successfully',
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
      image: z.string().url().optional(), // Frontend sends 'image', maps to 'avatar'
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
    
    const updateData: any = {};
    
    if (data.name !== undefined) updateData.name = data.name;
    if (data.title !== undefined) updateData.role = data.title; // Map title to role
    if (data.bio !== undefined) {
      updateData.impact = data.bio; // Map bio to impact
      updateData.bio = data.bio; // Also store as bio
    }
    if (data.image !== undefined) updateData.avatar = data.image; // Map image to avatar
    if (data.achievements !== undefined) updateData.achievements = JSON.stringify(data.achievements);
    if (data.featured !== undefined) updateData.featured = data.featured;
    if (data.hasVideo !== undefined) updateData.hasVideo = data.hasVideo;
    if (data.videoUrl !== undefined) updateData.videoUrl = data.videoUrl || null;
    if (data.order !== undefined) updateData.order = data.order;
    
    const innovator = await db.innovator.update({
      where: { id },
      data: updateData,
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
