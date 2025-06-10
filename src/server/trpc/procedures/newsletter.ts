import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";
import * as z from "zod";

export const subscribeNewsletter = baseProcedure
  .input(z.object({
    email: z.string().email("Please enter a valid email address"),
  }))
  .mutation(async ({ input }) => {
    try {
      const { email } = input;
      
      // Check if email already exists
      const existingSubscriber = await db.newsletterSubscriber.findUnique({
        where: { email },
      });

      if (existingSubscriber) {
        return {
          message: 'You are already subscribed to our newsletter!',
          alreadySubscribed: true,
        };
      }

      // Create new subscription
      await db.newsletterSubscriber.create({
        data: { email },
      });

      return {
        message: 'Successfully subscribed to our newsletter!',
        alreadySubscribed: false,
      };
    } catch (error) {
      console.error('Error subscribing to newsletter:', error);
      throw new Error('Failed to subscribe to newsletter');
    }
  });

export const submitContactMessage = baseProcedure
  .input(z.object({
    name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name must be less than 100 characters"),
    email: z.string().email("Please enter a valid email address"),
    subject: z.string().min(5, "Subject must be at least 5 characters").max(200, "Subject must be less than 200 characters"),
    message: z.string().min(10, "Message must be at least 10 characters").max(2000, "Message must be less than 2000 characters"),
  }))
  .mutation(async ({ input }) => {
    try {
      const { name, email, subject, message } = input;
      
      const contactMessage = await db.contactMessage.create({
        data: {
          name,
          email,
          subject,
          message,
          status: 'unread',
        },
      });

      return {
        message: 'Your message has been sent successfully! We\'ll get back to you soon.',
        contactMessage,
      };
    } catch (error) {
      console.error('Error submitting contact message:', error);
      throw new Error('Failed to submit contact message');
    }
  });

export const unsubscribeNewsletter = baseProcedure
  .input(z.object({
    email: z.string().email("Please enter a valid email address"),
  }))
  .mutation(async ({ input }) => {
    try {
      const { email } = input;
      
      const deletedSubscriber = await db.newsletterSubscriber.delete({
        where: { email },
      });

      return {
        message: 'Successfully unsubscribed from our newsletter.',
        unsubscribed: true,
      };
    } catch (error: unknown) {
      // Type guard to check if error is a Prisma error with a code property
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
        // Record not found
        return {
          message: 'Email address not found in our subscription list.',
          unsubscribed: false,
        };
      }
      
      console.error('Error unsubscribing from newsletter:', error);
      throw new Error('Failed to unsubscribe from newsletter');
    }
  });
