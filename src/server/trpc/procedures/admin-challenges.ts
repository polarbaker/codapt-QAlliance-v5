import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";
import { requireAdminAuth } from "./auth";
import { challengeSchema } from "~/constants/validation";
import * as z from "zod";

export const adminGetChallenges = baseProcedure
  .input(z.object({
    adminToken: z.string(),
    limit: z.number().int().positive().max(100).default(20),
    cursor: z.number().int().positive().optional(),
    category: z.string().optional(),
    status: z.string().optional(),
    search: z.string().optional(),
  }))
  .query(async ({ input }) => {
    await requireAdminAuth(input.adminToken);
    
    const { limit, cursor, category, status, search } = input;
    
    let whereClause: any = {};
    
    if (category) {
      whereClause.category = category;
    }
    
    if (status) {
      whereClause.status = status;
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

    return {
      challenges,
      nextCursor,
    };
  });

export const adminGetChallengeById = baseProcedure
  .input(z.object({
    adminToken: z.string(),
    id: z.number().int().positive(),
  }))
  .query(async ({ input }) => {
    await requireAdminAuth(input.adminToken);
    
    const { id } = input;
    
    const challenge = await db.challenge.findUnique({
      where: { id },
    });
    
    if (!challenge) {
      throw new Error('Challenge not found');
    }
    
    return challenge;
  });

export const adminCreateChallenge = baseProcedure
  .input(z.object({
    adminToken: z.string(),
    data: challengeSchema,
  }))
  .mutation(async ({ input }) => {
    await requireAdminAuth(input.adminToken);
    
    const { data } = input;
    // data.image will be a base64 string from SimpleChallengeImageUpload
    
    // Convert date strings to Date objects if they exist
    const challengeData = {
      ...data,
      // Handle optional image field - use empty string if not provided
      image: data.image || "",
      openDate: data.openDate ? new Date(data.openDate) : null,
      closeDate: data.closeDate ? new Date(data.closeDate) : null,
      pilotStartDate: data.pilotStartDate ? new Date(data.pilotStartDate) : null,
    };
    
    const challenge = await db.challenge.create({
      data: challengeData,
    });
    
    return {
      success: true,
      challenge,
      message: 'Challenge created successfully',
    };
  });

export const adminUpdateChallenge = baseProcedure
  .input(z.object({
    adminToken: z.string(),
    id: z.number().int().positive(),
    data: challengeSchema.partial(),
  }))
  .mutation(async ({ input }) => {
    await requireAdminAuth(input.adminToken);
    
    const { id, data } = input;
    // data.image (if present) will be a base64 string
    
    // Convert date strings to Date objects if they exist
    const updateData: any = { ...data };
    if (data.openDate) updateData.openDate = new Date(data.openDate);
    if (data.closeDate) updateData.closeDate = new Date(data.closeDate);
    if (data.pilotStartDate) updateData.pilotStartDate = new Date(data.pilotStartDate);
    
    const challenge = await db.challenge.update({
      where: { id },
      data: updateData,
    });
    
    return {
      success: true,
      challenge,
      message: 'Challenge updated successfully',
    };
  });

export const adminDeleteChallenge = baseProcedure
  .input(z.object({
    adminToken: z.string(),
    id: z.number().int().positive(),
  }))
  .mutation(async ({ input }) => {
    await requireAdminAuth(input.adminToken);
    
    const { id } = input;
    
    await db.challenge.delete({
      where: { id },
    });
    
    return {
      success: true,
      message: 'Challenge deleted successfully',
    };
  });

export const adminReorderChallenges = baseProcedure
  .input(z.object({
    adminToken: z.string(),
    challengeIds: z.array(z.number().int().positive()),
  }))
  .mutation(async ({ input }) => {
    await requireAdminAuth(input.adminToken);
    
    const { challengeIds } = input;
    
    // Update order for each challenge
    const updatePromises = challengeIds.map((id, index) =>
      db.challenge.update({
        where: { id },
        data: { order: index },
      })
    );
    
    await Promise.all(updatePromises);
    
    return {
      success: true,
      message: 'Challenge order updated successfully',
    };
  });
