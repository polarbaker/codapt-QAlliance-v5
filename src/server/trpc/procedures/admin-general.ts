import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";
import { requireAdminAuth } from "./auth";
import { caseStudySchema, newsSchema, partnerSchema } from "~/constants/validation";
import * as z from "zod";
import { Prisma } from '@prisma/client';

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

export const adminGetCaseStudyById = baseProcedure
  .input(z.object({
    adminToken: z.string(),
    id: z.number().int().positive(),
  }))
  .query(async ({ input }) => {
    await requireAdminAuth(input.adminToken);
    
    const { id } = input;
    
    const caseStudy = await db.caseStudy.findUnique({
      where: { id },
    });
    
    if (!caseStudy) {
      throw new Error('Case study not found');
    }
    
    return caseStudy;
  });

export const adminCreateCaseStudy = baseProcedure
  .input(z.object({
    adminToken: z.string(),
    data: caseStudySchema,
  }))
  .mutation(async ({ input }) => {
    await requireAdminAuth(input.adminToken);
    
    const { data } = input;
    // data.image will be a base64 string from SimpleCaseStudyImageUpload
    
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
    // data.image (if present) will be a base64 string
    
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
        { order: 'asc' },
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

export const adminGetNewsById = baseProcedure
  .input(z.object({
    adminToken: z.string(),
    id: z.number().int().positive(),
  }))
  .query(async ({ input }) => {
    await requireAdminAuth(input.adminToken);
    
    const { id } = input;
    
    const news = await db.news.findUnique({
      where: { id },
    });
    
    if (!news) {
      throw new Error('News article not found');
    }
    
    return news;
  });

export const adminCreateNews = baseProcedure
  .input(z.object({
    adminToken: z.string(),
    data: newsSchema,
  }))
  .mutation(async ({ input }) => {
    await requireAdminAuth(input.adminToken);
    
    const { data } = input;
    // data.imageUrl will be a base64 string from SimpleNewsImageUpload
    
    const news = await db.news.create({
      data: {
        ...data,
        publishedAt: new Date(data.publishedAt),
        order: data.order ?? 0, // Ensure order has a default value
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
    // data.imageUrl (if present) will be a base64 string
    
    const updateData: any = { ...data };
    if (data.publishedAt) {
      updateData.publishedAt = new Date(data.publishedAt);
    }
    // Ensure order is properly handled
    if (data.order !== undefined) {
      updateData.order = data.order;
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
        { updatedAt: 'desc' },  // Most recently updated/added first - ensures updated or added partners take priority
        { order: 'asc' },       // Then by custom order
        { createdAt: 'desc' },  // Finally by creation date
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

// Default partner logo value - required by Prisma schema
const DEFAULT_PARTNER_LOGO = 'default-partner-placeholder.png';
const DEFAULT_ALT_TEXT = 'Partner logo';

export const adminCreatePartner = baseProcedure
  .input(z.object({
    adminToken: z.string(),
    data: partnerSchema,
  }))
  .mutation(async ({ input }) => {
    try {
      await requireAdminAuth(input.adminToken);
      
      const { data } = input;
      
      // Log the incoming request data for debugging
      console.log('adminCreatePartner: Incoming data:', JSON.stringify(data, null, 2));
      
      // Match exactly what the Prisma Schema requires for Partner
      const partnerData: Prisma.PartnerCreateInput = {
        // Required fields with defaults if missing (based on Prisma schema)
        name: data.name,
        logoUrl: data.logoUrl && data.logoUrl.trim() !== '' ? data.logoUrl : DEFAULT_PARTNER_LOGO,
        altText: data.altText && data.altText.trim() !== '' ? data.altText : DEFAULT_ALT_TEXT,
        
        // Fields with defaults
        visible: data.visible !== undefined ? data.visible : true,
        order: data.order !== undefined ? data.order : 0,
        
        // Optional fields
        websiteUrl: data.websiteUrl && data.websiteUrl.trim() !== '' ? data.websiteUrl : undefined,
      };
      
      console.log('adminCreatePartner: Creating partner with processed data:', JSON.stringify(partnerData, null, 2));
      
      const partner = await db.partner.create({
        data: partnerData,
      });
      
      console.log(`adminCreatePartner: Partner created successfully with ID: ${partner.id}`);
      
      return {
        success: true,
        partner,
        message: 'Partner created successfully',
      };
    } catch (error) {
      console.error('adminCreatePartner ERROR:', error);
      throw error;
    }
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
