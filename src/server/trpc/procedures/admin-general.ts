import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";
import { requireAdminAuth } from "./auth";
import { caseStudySchema, newsSchema, partnerSchema } from "~/constants/validation";
import * as z from "zod";

// Case Studies
export const adminGetCaseStudies = baseProcedure
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
        { title: { contains: search, mode: 'insensitive' } },
        { summary: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (cursor) {
      whereClause.id = {
        lt: cursor,
      };
    }

    const caseStudies = await db.caseStudy.findMany({
      where: whereClause,
      orderBy: [
        { featured: 'desc' },
        { order: 'asc' },
        { createdAt: 'desc' },
      ],
      take: limit + 1,
    });

    let nextCursor: number | undefined = undefined;
    if (caseStudies.length > limit) {
      const nextItem = caseStudies.pop();
      nextCursor = nextItem?.id;
    }

    return {
      caseStudies,
      nextCursor,
    };
  });

export const adminCreateCaseStudy = baseProcedure
  .input(z.object({
    adminToken: z.string(),
    data: caseStudySchema,
  }))
  .mutation(async ({ input }) => {
    await requireAdminAuth(input.adminToken);
    
    const { data } = input;
    
    const caseStudy = await db.caseStudy.create({
      data,
    });
    
    return {
      success: true,
      caseStudy,
      message: 'Case study created successfully',
    };
  });

export const adminUpdateCaseStudy = baseProcedure
  .input(z.object({
    adminToken: z.string(),
    id: z.number().int().positive(),
    data: caseStudySchema.partial(),
  }))
  .mutation(async ({ input }) => {
    await requireAdminAuth(input.adminToken);
    
    const { id, data } = input;
    
    const caseStudy = await db.caseStudy.update({
      where: { id },
      data,
    });
    
    return {
      success: true,
      caseStudy,
      message: 'Case study updated successfully',
    };
  });

export const adminDeleteCaseStudy = baseProcedure
  .input(z.object({
    adminToken: z.string(),
    id: z.number().int().positive(),
  }))
  .mutation(async ({ input }) => {
    await requireAdminAuth(input.adminToken);
    
    const { id } = input;
    
    await db.caseStudy.delete({
      where: { id },
    });
    
    return {
      success: true,
      message: 'Case study deleted successfully',
    };
  });

// News
export const adminGetNews = baseProcedure
  .input(z.object({
    adminToken: z.string(),
    limit: z.number().int().positive().max(100).default(20),
    cursor: z.number().int().positive().optional(),
    search: z.string().optional(),
    category: z.string().optional(),
    featured: z.boolean().optional(),
  }))
  .query(async ({ input }) => {
    await requireAdminAuth(input.adminToken);
    
    const { limit, cursor, search, category, featured } = input;
    
    let whereClause: any = {};
    
    if (category) {
      whereClause.category = category;
    }
    
    if (featured !== undefined) {
      whereClause.featured = featured;
    }
    
    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { excerpt: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (cursor) {
      whereClause.id = {
        lt: cursor,
      };
    }

    const news = await db.news.findMany({
      where: whereClause,
      orderBy: [
        { featured: 'desc' },
        { publishedAt: 'desc' },
      ],
      take: limit + 1,
    });

    let nextCursor: number | undefined = undefined;
    if (news.length > limit) {
      const nextItem = news.pop();
      nextCursor = nextItem?.id;
    }

    return {
      news,
      nextCursor,
    };
  });

export const adminCreateNews = baseProcedure
  .input(z.object({
    adminToken: z.string(),
    data: newsSchema,
  }))
  .mutation(async ({ input }) => {
    await requireAdminAuth(input.adminToken);
    
    const { data } = input;
    
    const news = await db.news.create({
      data: {
        ...data,
        publishedAt: new Date(data.publishedAt),
      },
    });
    
    return {
      success: true,
      news,
      message: 'News article created successfully',
    };
  });

export const adminUpdateNews = baseProcedure
  .input(z.object({
    adminToken: z.string(),
    id: z.number().int().positive(),
    data: newsSchema.partial(),
  }))
  .mutation(async ({ input }) => {
    await requireAdminAuth(input.adminToken);
    
    const { id, data } = input;
    
    const updateData: any = { ...data };
    if (data.publishedAt) {
      updateData.publishedAt = new Date(data.publishedAt);
    }
    
    const news = await db.news.update({
      where: { id },
      data: updateData,
    });
    
    return {
      success: true,
      news,
      message: 'News article updated successfully',
    };
  });

export const adminDeleteNews = baseProcedure
  .input(z.object({
    adminToken: z.string(),
    id: z.number().int().positive(),
  }))
  .mutation(async ({ input }) => {
    await requireAdminAuth(input.adminToken);
    
    const { id } = input;
    
    await db.news.delete({
      where: { id },
    });
    
    return {
      success: true,
      message: 'News article deleted successfully',
    };
  });

// Partners
export const adminGetPartners = baseProcedure
  .input(z.object({
    adminToken: z.string(),
    limit: z.number().int().positive().max(100).default(50),
    cursor: z.number().int().positive().optional(),
    search: z.string().optional(),
    visible: z.boolean().optional(),
  }))
  .query(async ({ input }) => {
    await requireAdminAuth(input.adminToken);
    
    const { limit, cursor, search, visible } = input;
    
    let whereClause: any = {};
    
    if (visible !== undefined) {
      whereClause.visible = visible;
    }
    
    if (search) {
      whereClause.name = { contains: search, mode: 'insensitive' };
    }
    
    if (cursor) {
      whereClause.id = {
        lt: cursor,
      };
    }

    const partners = await db.partner.findMany({
      where: whereClause,
      orderBy: [
        { order: 'asc' },
        { createdAt: 'desc' },
      ],
      take: limit + 1,
    });

    let nextCursor: number | undefined = undefined;
    if (partners.length > limit) {
      const nextItem = partners.pop();
      nextCursor = nextItem?.id;
    }

    return {
      partners,
      nextCursor,
    };
  });

export const adminGetPartnerById = baseProcedure
  .input(z.object({
    adminToken: z.string(),
    id: z.number().int().positive(),
  }))
  .query(async ({ input }) => {
    await requireAdminAuth(input.adminToken);
    
    const { id } = input;
    
    const partner = await db.partner.findUnique({
      where: { id },
    });
    
    if (!partner) {
      throw new Error('Partner not found');
    }
    
    return partner;
  });

export const adminCreatePartner = baseProcedure
  .input(z.object({
    adminToken: z.string(),
    data: partnerSchema,
  }))
  .mutation(async ({ input }) => {
    await requireAdminAuth(input.adminToken);
    
    const { data } = input;
    
    const partner = await db.partner.create({
      data,
    });
    
    return {
      success: true,
      partner,
      message: 'Partner created successfully',
    };
  });

export const adminUpdatePartner = baseProcedure
  .input(z.object({
    adminToken: z.string(),
    id: z.number().int().positive(),
    data: partnerSchema.partial(),
  }))
  .mutation(async ({ input }) => {
    await requireAdminAuth(input.adminToken);
    
    const { id, data } = input;
    
    const partner = await db.partner.update({
      where: { id },
      data,
    });
    
    return {
      success: true,
      partner,
      message: 'Partner updated successfully',
    };
  });

export const adminDeletePartner = baseProcedure
  .input(z.object({
    adminToken: z.string(),
    id: z.number().int().positive(),
  }))
  .mutation(async ({ input }) => {
    await requireAdminAuth(input.adminToken);
    
    const { id } = input;
    
    await db.partner.delete({
      where: { id },
    });
    
    return {
      success: true,
      message: 'Partner deleted successfully',
    };
  });

export const adminReorderPartners = baseProcedure
  .input(z.object({
    adminToken: z.string(),
    partnerIds: z.array(z.number().int().positive()),
  }))
  .mutation(async ({ input }) => {
    await requireAdminAuth(input.adminToken);
    
    const { partnerIds } = input;
    
    // Update each partner's order based on its position in the array
    await Promise.all(
      partnerIds.map((partnerId, index) =>
        db.partner.update({
          where: { id: partnerId },
          data: { order: index },
        })
      )
    );
    
    return {
      success: true,
      message: 'Partners reordered successfully',
    };
  });

export const adminTogglePartnerVisibility = baseProcedure
  .input(z.object({
    adminToken: z.string(),
    id: z.number().int().positive(),
    visible: z.boolean(),
  }))
  .mutation(async ({ input }) => {
    await requireAdminAuth(input.adminToken);
    
    const { id, visible } = input;
    
    const partner = await db.partner.update({
      where: { id },
      data: { visible },
    });
    
    return {
      success: true,
      partner,
      message: `Partner ${visible ? 'shown' : 'hidden'} successfully`,
    };
  });

export const adminBulkDeletePartners = baseProcedure
  .input(z.object({
    adminToken: z.string(),
    partnerIds: z.array(z.number().int().positive()),
  }))
  .mutation(async ({ input }) => {
    await requireAdminAuth(input.adminToken);
    
    const { partnerIds } = input;
    
    await db.partner.deleteMany({
      where: {
        id: {
          in: partnerIds,
        },
      },
    });
    
    return {
      success: true,
      message: `${partnerIds.length} partner(s) deleted successfully`,
    };
  });

export const adminBulkUpdatePartners = baseProcedure
  .input(z.object({
    adminToken: z.string(),
    partnerIds: z.array(z.number().int().positive()),
    data: z.object({
      visible: z.boolean().optional(),
    }),
  }))
  .mutation(async ({ input }) => {
    await requireAdminAuth(input.adminToken);
    
    const { partnerIds, data } = input;
    
    await db.partner.updateMany({
      where: {
        id: {
          in: partnerIds,
        },
      },
      data,
    });
    
    return {
      success: true,
      message: `${partnerIds.length} partner(s) updated successfully`,
    };
  });

// Comments
export const adminGetComments = baseProcedure
  .input(z.object({
    adminToken: z.string(),
    limit: z.number().int().positive().max(100).default(20),
    cursor: z.number().int().positive().optional(),
    search: z.string().optional(),
    problemId: z.number().int().positive().optional(),
  }))
  .query(async ({ input }) => {
    await requireAdminAuth(input.adminToken);
    
    const { limit, cursor, search, problemId } = input;
    
    let whereClause: any = {};
    
    if (problemId) {
      whereClause.problemId = problemId;
    }
    
    if (search) {
      whereClause.OR = [
        { content: { contains: search, mode: 'insensitive' } },
        { author: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (cursor) {
      whereClause.id = {
        lt: cursor,
      };
    }

    const comments = await db.comment.findMany({
      where: whereClause,
      include: {
        problem: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit + 1,
    });

    let nextCursor: number | undefined = undefined;
    if (comments.length > limit) {
      const nextItem = comments.pop();
      nextCursor = nextItem?.id;
    }

    return {
      comments,
      nextCursor,
    };
  });

export const adminDeleteComment = baseProcedure
  .input(z.object({
    adminToken: z.string(),
    id: z.number().int().positive(),
  }))
  .mutation(async ({ input }) => {
    await requireAdminAuth(input.adminToken);
    
    const { id } = input;
    
    await db.comment.delete({
      where: { id },
    });
    
    return {
      success: true,
      message: 'Comment deleted successfully',
    };
  });

// Newsletter Subscribers
export const adminGetNewsletterSubscribers = baseProcedure
  .input(z.object({
    adminToken: z.string(),
    limit: z.number().int().positive().max(100).default(50),
    cursor: z.number().int().positive().optional(),
    search: z.string().optional(),
  }))
  .query(async ({ input }) => {
    await requireAdminAuth(input.adminToken);
    
    const { limit, cursor, search } = input;
    
    let whereClause: any = {};
    
    if (search) {
      whereClause.email = { contains: search, mode: 'insensitive' };
    }
    
    if (cursor) {
      whereClause.id = {
        lt: cursor,
      };
    }

    const subscribers = await db.newsletterSubscriber.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc',
      },
      take: limit + 1,
    });

    let nextCursor: number | undefined = undefined;
    if (subscribers.length > limit) {
      const nextItem = subscribers.pop();
      nextCursor = nextItem?.id;
    }

    return {
      subscribers,
      nextCursor,
    };
  });

// Contact Messages
export const adminGetContactMessages = baseProcedure
  .input(z.object({
    adminToken: z.string(),
    limit: z.number().int().positive().max(100).default(20),
    cursor: z.number().int().positive().optional(),
    status: z.enum(['unread', 'read', 'replied']).optional(),
    search: z.string().optional(),
  }))
  .query(async ({ input }) => {
    await requireAdminAuth(input.adminToken);
    
    const { limit, cursor, status, search } = input;
    
    let whereClause: any = {};
    
    if (status) {
      whereClause.status = status;
    }
    
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } },
        { message: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (cursor) {
      whereClause.id = {
        lt: cursor,
      };
    }

    const messages = await db.contactMessage.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc',
      },
      take: limit + 1,
    });

    let nextCursor: number | undefined = undefined;
    if (messages.length > limit) {
      const nextItem = messages.pop();
      nextCursor = nextItem?.id;
    }

    return {
      messages,
      nextCursor,
    };
  });

export const adminUpdateContactMessageStatus = baseProcedure
  .input(z.object({
    adminToken: z.string(),
    id: z.number().int().positive(),
    status: z.enum(['unread', 'read', 'replied']),
  }))
  .mutation(async ({ input }) => {
    await requireAdminAuth(input.adminToken);
    
    const { id, status } = input;
    
    const contactMessage = await db.contactMessage.update({
      where: { id },
      data: { status },
    });
    
    return {
      success: true,
      message: contactMessage,
      statusMessage: 'Message status updated successfully',
    };
  });
