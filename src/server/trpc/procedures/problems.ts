import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";
import * as z from "zod";

export const submitProblem = baseProcedure
  .input(z.object({
    // Step 1: Challenge Details
    title: z.string().min(5, "Title must be at least 5 characters").max(200, "Title must be less than 200 characters"),
    description: z.string().min(20, "Description must be at least 20 characters").max(2000, "Description must be less than 2000 characters"),
    category: z.string().min(1, "Category is required"),
    
    // Step 2: Requirements
    technicalRequirements: z.string().min(10, "Technical requirements must be at least 10 characters").max(1500, "Technical requirements must be less than 1500 characters"),
    constraints: z.string().min(5, "Constraints must be at least 5 characters").max(1000, "Constraints must be less than 1000 characters"),
    
    // Step 3: Success Criteria
    successCriteria: z.string().min(10, "Success criteria must be at least 10 characters").max(1500, "Success criteria must be less than 1500 characters"),
    timeline: z.string().min(3, "Timeline must be at least 3 characters").max(200, "Timeline must be less than 200 characters"),
    budget: z.string().min(1, "Budget is required").max(200, "Budget must be less than 200 characters"),
    
    // Step 4: Contact Information
    name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name must be less than 100 characters"),
    organization: z.string().min(2, "Organization must be at least 2 characters").max(200, "Organization must be less than 200 characters"),
    email: z.string().email("Please enter a valid email address"),
    phone: z.string().min(5, "Phone number must be at least 5 characters").max(20, "Phone number must be less than 20 characters"),
    consentToContact: z.boolean().refine(val => val === true, "You must consent to be contacted"),
  }))
  .mutation(async ({ input }) => {
    try {
      const problemSubmission = await db.problemSubmission.create({
        data: {
          ...input,
          status: 'pending',
        },
      });

      return {
        message: 'Problem submission received successfully! We\'ll review it and get back to you soon.',
        problemSubmission,
      };
    } catch (error) {
      console.error('Error submitting problem:', error);
      throw new Error('Failed to submit problem');
    }
  });

export const getProblemSubmissions = baseProcedure
  .input(z.object({
    limit: z.number().int().positive().max(50).default(10),
    cursor: z.number().int().positive().optional(),
    status: z.enum(['pending', 'approved', 'rejected']).optional(),
    category: z.string().optional(),
  }))
  .query(async ({ input }) => {
    try {
      const { limit, cursor, status, category } = input;
      
      let whereClause: any = {};
      
      if (status) {
        whereClause.status = status;
      }
      
      if (category) {
        whereClause.category = category;
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
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          status: true,
          organization: true,
          createdAt: true,
          // Exclude sensitive contact information from list view
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
    } catch (error) {
      console.error('Error fetching problem submissions:', error);
      throw new Error('Failed to fetch problem submissions');
    }
  });

export const getProblemSubmissionById = baseProcedure
  .input(z.object({
    id: z.number().int().positive(),
  }))
  .query(async ({ input }) => {
    try {
      const submission = await db.problemSubmission.findUnique({
        where: {
          id: input.id,
        },
        include: {
          comments: {
            orderBy: {
              createdAt: 'desc',
            },
            take: 10,
          },
        },
      });

      if (!submission) {
        throw new Error('Problem submission not found');
      }

      return submission;
    } catch (error) {
      console.error('Error fetching problem submission:', error);
      throw new Error('Failed to fetch problem submission');
    }
  });
