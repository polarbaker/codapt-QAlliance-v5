import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";
import * as z from "zod";

export const getComments = baseProcedure
  .input(z.object({
    limit: z.number().int().positive().max(50).default(10),
    cursor: z.number().int().positive().optional(),
    problemId: z.number().int().positive().optional(),
    generalDiscussionOnly: z.boolean().default(true),
  }))
  .query(async ({ input }) => {
    try {
      const { limit, cursor, problemId, generalDiscussionOnly } = input;
      
      const whereClause: any = {};
      
      if (problemId) {
        whereClause.problemId = problemId;
      } else if (generalDiscussionOnly) {
        whereClause.isGeneralDiscussion = true;
      }
      
      if (cursor) {
        whereClause.id = {
          lt: cursor,
        };
      }

      const comments = await db.comment.findMany({
        where: whereClause,
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
    } catch (error) {
      console.error('Error fetching comments:', error);
      throw new Error('Failed to fetch comments');
    }
  });

export const postComment = baseProcedure
  .input(z.object({
    content: z.string().min(5, "Comment must be at least 5 characters").max(1000, "Comment must be less than 1000 characters"),
    author: z.string().min(1, "Author name is required").max(100, "Author name must be less than 100 characters"),
    avatar: z.string().min(1, "Avatar is required"),
    problemId: z.number().int().positive().optional(),
  }))
  .mutation(async ({ input }) => {
    try {
      const { content, author, avatar, problemId } = input;
      
      const comment = await db.comment.create({
        data: {
          content,
          author,
          avatar,
          problemId: problemId || null,
          isGeneralDiscussion: !problemId,
          likes: 0,
        },
      });

      return {
        comment,
        message: 'Comment posted successfully',
      };
    } catch (error) {
      console.error('Error posting comment:', error);
      throw new Error('Failed to post comment');
    }
  });

export const likeComment = baseProcedure
  .input(z.object({
    commentId: z.number().int().positive(),
  }))
  .mutation(async ({ input }) => {
    try {
      const { commentId } = input;
      
      // Check if comment exists
      const existingComment = await db.comment.findUnique({
        where: { id: commentId },
      });

      if (!existingComment) {
        throw new Error('Comment not found');
      }

      // Increment the likes count
      const updatedComment = await db.comment.update({
        where: { id: commentId },
        data: {
          likes: {
            increment: 1,
          },
        },
      });

      return {
        comment: updatedComment,
        message: 'Comment liked successfully',
      };
    } catch (error) {
      console.error('Error liking comment:', error);
      throw new Error('Failed to like comment');
    }
  });
