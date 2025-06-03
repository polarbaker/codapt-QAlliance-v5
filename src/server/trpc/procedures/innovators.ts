import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";
import * as z from "zod";

export const getInnovators = baseProcedure
  .input(z.object({
    limit: z.number().int().positive().max(50).default(10),
    cursor: z.number().int().positive().optional(),
    featuredOnly: z.boolean().default(false),
    hasVideo: z.boolean().optional(),
    searchTerm: z.string().optional(),
  }))
  .query(async ({ input }) => {
    try {
      const { limit, cursor, featuredOnly, hasVideo, searchTerm } = input;
      
      let whereClause: any = {};
      
      if (featuredOnly) {
        whereClause.featured = true;
      }
      
      if (hasVideo !== undefined) {
        whereClause.hasVideo = hasVideo;
      }
      
      if (searchTerm) {
        whereClause.OR = [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { role: { contains: searchTerm, mode: 'insensitive' } },
          { impact: { contains: searchTerm, mode: 'insensitive' } },
          { bio: { contains: searchTerm, mode: 'insensitive' } },
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
    } catch (error) {
      console.error('Error fetching innovators:', error);
      throw new Error('Failed to fetch innovators');
    }
  });

export const getInnovatorById = baseProcedure
  .input(z.object({
    id: z.number().int().positive(),
  }))
  .query(async ({ input }) => {
    try {
      const innovator = await db.innovator.findUnique({
        where: {
          id: input.id,
        },
      });

      if (!innovator) {
        throw new Error('Innovator not found');
      }

      return innovator;
    } catch (error) {
      console.error('Error fetching innovator:', error);
      throw new Error('Failed to fetch innovator');
    }
  });

export const getFeaturedInnovators = baseProcedure
  .input(z.object({
    limit: z.number().int().positive().max(20).default(4),
  }))
  .query(async ({ input }) => {
    try {
      const innovators = await db.innovator.findMany({
        where: {
          featured: true,
        },
        orderBy: {
          order: 'asc',
        },
        take: input.limit,
      });

      return {
        innovators,
        count: innovators.length,
      };
    } catch (error) {
      console.error('Error fetching featured innovators:', error);
      throw new Error('Failed to fetch featured innovators');
    }
  });
