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

export const adminCreateInnovator = baseProcedure
  .input(z.object({
    adminToken: z.string(),
    data: z.object({
      name: z.string().min(1).max(100),
      role: z.string().min(1).max(150),
      impact: z.string().min(1),
      avatar: z.string().url(),
      bio: z.string().optional(),
      achievements: z.array(z.string()).min(1),
      hasVideo: z.boolean().default(false),
      videoUrl: z.string().url().optional(),
      featured: z.boolean().default(false),
      order: z.number().int().default(0),
    }),
  }))
  .mutation(async ({ input }) => {
    await requireAdminAuth(input.adminToken);
    
    const { data } = input;
    
    const innovator = await db.innovator.create({
      data: {
        ...data,
        achievements: JSON.stringify(data.achievements),
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
      role: z.string().min(1).max(150).optional(),
      impact: z.string().min(1).optional(),
      avatar: z.string().url().optional(),
      bio: z.string().optional(),
      achievements: z.array(z.string()).optional(),
      hasVideo: z.boolean().optional(),
      videoUrl: z.string().url().optional(),
      featured: z.boolean().optional(),
      order: z.number().int().optional(),
    }),
  }))
  .mutation(async ({ input }) => {
    await requireAdminAuth(input.adminToken);
    
    const { id, data } = input;
    
    const updateData: any = { ...data };
    if (data.achievements) {
      updateData.achievements = JSON.stringify(data.achievements);
    }
    
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
