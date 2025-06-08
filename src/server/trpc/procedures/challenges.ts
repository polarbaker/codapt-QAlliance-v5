import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";
import * as z from "zod";

export const getChallenges = baseProcedure
  .input(z.object({
    limit: z.number().int().positive().max(50).default(20),
    cursor: z.number().int().positive().optional(),
    category: z.string().optional(),
    region: z.string().optional(),
    status: z.string().optional(),
    search: z.string().optional(),
    featured: z.boolean().optional(),
  }))
  .query(async ({ input }) => {
    const { limit, cursor, category, region, status, search, featured } = input;
    
    let whereClause: any = {};
    
    if (category) {
      whereClause.category = category;
    }
    
    if (region) {
      whereClause.region = region;
    }
    
    if (status) {
      whereClause.status = status;
    }
    
    if (featured !== undefined) {
      whereClause.featured = featured;
    }
    
    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { tagline: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (cursor) {
      whereClause.id = {
        lt: cursor,
      };
    }

    const challenges = await db.challenge.findMany({
      where: whereClause,
      orderBy: [
        { featured: 'desc' },
        { order: 'asc' },
        { createdAt: 'desc' },
      ],
      take: limit + 1,
    });

    let nextCursor: number | undefined = undefined;
    if (challenges.length > limit) {
      const nextItem = challenges.pop();
      nextCursor = nextItem?.id;
    }

    // Transform challenges to include parsed partners
    const transformedChallenges = challenges.map(challenge => ({
      ...challenge,
      parsedPartners: challenge.partners ? (() => {
        try {
          return JSON.parse(challenge.partners);
        } catch {
          return [];
        }
      })() : [],
    }));

    return {
      challenges: transformedChallenges,
      nextCursor,
    };
  });

export const getChallengeById = baseProcedure
  .input(z.object({
    id: z.number().int().positive(),
  }))
  .query(async ({ input }) => {
    const { id } = input;
    
    const challenge = await db.challenge.findUnique({
      where: { id },
    });
    
    if (!challenge) {
      throw new Error('Challenge not found');
    }
    
    // Transform challenge to include parsed partners
    const transformedChallenge = {
      ...challenge,
      parsedPartners: challenge.partners ? (() => {
        try {
          return JSON.parse(challenge.partners);
        } catch {
          return [];
        }
      })() : [],
    };
    
    return transformedChallenge;
  });

export const getFeaturedChallenges = baseProcedure
  .input(z.object({
    limit: z.number().int().positive().max(10).default(3),
  }))
  .query(async ({ input }) => {
    const { limit } = input;
    
    const challenges = await db.challenge.findMany({
      where: {
        featured: true,
      },
      orderBy: [
        { order: 'asc' },
        { createdAt: 'desc' },
      ],
      take: limit,
    });

    // Transform challenges to include parsed partners
    const transformedChallenges = challenges.map(challenge => ({
      ...challenge,
      parsedPartners: challenge.partners ? (() => {
        try {
          return JSON.parse(challenge.partners);
        } catch {
          return [];
        }
      })() : [],
    }));

    return transformedChallenges;
  });
