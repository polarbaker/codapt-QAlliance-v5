import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";
import * as z from "zod";

export const getPartners = baseProcedure
  .query(async () => {
    try {
      const partners = await db.partner.findMany({
        where: {
          visible: true,
        },
        orderBy: {
          order: 'asc',
        },
      });

      return {
        partners,
        count: partners.length,
      };
    } catch (error) {
      console.error('Error fetching partners:', error);
      throw new Error('Failed to fetch partners');
    }
  });

export const getPartnerById = baseProcedure
  .input(z.object({
    id: z.number().int().positive(),
  }))
  .query(async ({ input }) => {
    try {
      const partner = await db.partner.findUnique({
        where: {
          id: input.id,
        },
      });

      if (!partner) {
        throw new Error('Partner not found');
      }

      return partner;
    } catch (error) {
      console.error('Error fetching partner:', error);
      throw new Error('Failed to fetch partner');
    }
  });
