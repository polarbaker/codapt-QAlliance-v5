import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";
import { requireAdminAuth } from "./auth";
import * as z from "zod";

export const adminGetProblemSubmissions = baseProcedure
  .input(z.object({
    adminToken: z.string(),
    limit: z.number().int().positive().max(100).default(20),
    cursor: z.number().int().positive().optional(),
    status: z.enum(['pending', 'approved', 'rejected']).optional(),
    category: z.string().optional(),
    search: z.string().optional(),
  }))
  .query(async ({ input }) => {
    await requireAdminAuth(input.adminToken);
    
    const { limit, cursor, status, category, search } = input;
    
    let whereClause: any = {};
    
    if (status) {
      whereClause.status = status;
    }
    
    if (category) {
      whereClause.category = category;
    }
    
    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { organization: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (cursor) {
      whereClause.id = {
        lt: cursor,
      };
    }

    const submissions = await db.problemSubmission.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc',
      },
      take: limit + 1,
      include: {
        comments: {
          select: {
            id: true,
            content: true,
            author: true,
            createdAt: true,
          },
          take: 3,
          orderBy: {
            createdAt: 'desc',
          },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
    });

    let nextCursor: number | undefined = undefined;
    if (submissions.length > limit) {
      const nextItem = submissions.pop();
      nextCursor = nextItem?.id;
    }

    return {
      submissions,
      nextCursor,
    };
  });

export const adminUpdateProblemStatus = baseProcedure
  .input(z.object({
    adminToken: z.string(),
    id: z.number().int().positive(),
    status: z.enum(['pending', 'approved', 'rejected']),
  }))
  .mutation(async ({ input }) => {
    await requireAdminAuth(input.adminToken);
    
    const { id, status } = input;
    
    const updatedSubmission = await db.problemSubmission.update({
      where: { id },
      data: { status },
    });
    
    return {
      success: true,
      submission: updatedSubmission,
      message: `Problem submission ${status} successfully`,
    };
  });

export const adminDeleteProblemSubmission = baseProcedure
  .input(z.object({
    adminToken: z.string(),
    id: z.number().int().positive(),
  }))
  .mutation(async ({ input }) => {
    await requireAdminAuth(input.adminToken);
    
    const { id } = input;
    
    // Delete associated comments first
    await db.comment.deleteMany({
      where: { problemId: id },
    });
    
    // Delete the problem submission
    await db.problemSubmission.delete({
      where: { id },
    });
    
    return {
      success: true,
      message: 'Problem submission deleted successfully',
    };
  });

export const adminGetProblemStats = baseProcedure
  .input(z.object({
    adminToken: z.string(),
  }))
  .query(async ({ input }) => {
    await requireAdminAuth(input.adminToken);
    
    const [total, pending, approved, rejected, byCategory] = await Promise.all([
      db.problemSubmission.count(),
      db.problemSubmission.count({ where: { status: 'pending' } }),
      db.problemSubmission.count({ where: { status: 'approved' } }),
      db.problemSubmission.count({ where: { status: 'rejected' } }),
      db.problemSubmission.groupBy({
        by: ['category'],
        _count: {
          category: true,
        },
      }),
    ]);
    
    return {
      total,
      pending,
      approved,
      rejected,
      byCategory: byCategory.map(item => ({
        category: item.category,
        count: item._count.category,
      })),
    };
  });

export const adminGetProblemSubmissionById = baseProcedure
  .input(z.object({
    adminToken: z.string(),
    id: z.number().int().positive(),
  }))
  .query(async ({ input }) => {
    await requireAdminAuth(input.adminToken);
    
    const { id } = input;
    
    const submission = await db.problemSubmission.findUnique({
      where: { id },
      include: {
        comments: {
          select: {
            id: true,
            content: true,
            author: true,
            createdAt: true,
            likes: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
    });
    
    if (!submission) {
      throw new Error('Problem submission not found');
    }
    
    return submission;
  });

export const adminUpdateProblemSubmission = baseProcedure
  .input(z.object({
    adminToken: z.string(),
    id: z.number().int().positive(),
    data: z.object({
      title: z.string().min(1, "Title is required").optional(),
      description: z.string().min(1, "Description is required").optional(),
      category: z.string().min(1, "Category is required").optional(),
      technicalRequirements: z.string().optional(),
      constraints: z.string().optional(),
      successCriteria: z.string().optional(),
      timeline: z.string().optional(),
      budget: z.string().optional(),
      name: z.string().min(1, "Name is required").optional(),
      organization: z.string().min(1, "Organization is required").optional(),
      email: z.string().email("Invalid email").optional(),
      phone: z.string().optional(),
      consentToContact: z.boolean().optional(),
      status: z.enum(['pending', 'approved', 'rejected']).optional(),
    }),
  }))
  .mutation(async ({ input }) => {
    await requireAdminAuth(input.adminToken);
    
    const { id, data } = input;
    
    const updatedSubmission = await db.problemSubmission.update({
      where: { id },
      data,
      include: {
        comments: {
          select: {
            id: true,
            content: true,
            author: true,
            createdAt: true,
            likes: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
    });
    
    return {
      success: true,
      submission: updatedSubmission,
      message: 'Problem submission updated successfully',
    };
  });
