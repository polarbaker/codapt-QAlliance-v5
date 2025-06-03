import { baseProcedure } from "~/server/trpc/main";
import { db } from "~/server/db";
import * as z from "zod";

export const getImpactMetrics = baseProcedure
  .input(z.object({
    metricType: z.enum(['fundsRaised', 'regionPercentage', 'startupsScaled']),
    yearRange: z.object({
      start: z.number().int().min(2020).optional(),
      end: z.number().int().max(2030).optional(),
    }).optional(),
  }))
  .query(async ({ input }) => {
    try {
      const { metricType, yearRange } = input;
      
      let whereClause: any = {};
      
      if (yearRange) {
        whereClause.year = {};
        if (yearRange.start) {
          whereClause.year.gte = yearRange.start;
        }
        if (yearRange.end) {
          whereClause.year.lte = yearRange.end;
        }
      }

      const metrics = await db.impactMetric.findMany({
        where: whereClause,
        orderBy: {
          year: 'asc',
        },
      });

      // Transform data based on metric type
      let transformedData: Array<{ label: string; value: number }> = [];

      switch (metricType) {
        case 'fundsRaised':
          // Group by year and sum funds raised
          const fundsByYear = metrics.reduce((acc, metric) => {
            const year = metric.year.toString();
            if (!acc[year]) {
              acc[year] = 0;
            }
            acc[year] += metric.fundsRaised;
            return acc;
          }, {} as Record<string, number>);
          
          transformedData = Object.entries(fundsByYear).map(([year, amount]) => ({
            label: year,
            value: Math.round(amount * 100) / 100, // Round to 2 decimal places
          }));
          break;

        case 'regionPercentage':
          // Group by region and sum percentages
          const regionData = metrics.reduce((acc, metric) => {
            const region = metric.regionName;
            if (!acc[region]) {
              acc[region] = 0;
            }
            acc[region] += metric.regionPercentage;
            return acc;
          }, {} as Record<string, number>);
          
          transformedData = Object.entries(regionData).map(([region, percentage]) => ({
            label: region,
            value: Math.round(percentage * 100) / 100, // Round to 2 decimal places
          }));
          break;

        case 'startupsScaled':
          // Group by year and sum startups scaled
          const startupsByYear = metrics.reduce((acc, metric) => {
            const year = metric.year.toString();
            if (!acc[year]) {
              acc[year] = 0;
            }
            acc[year] += metric.startupsScaled;
            return acc;
          }, {} as Record<string, number>);
          
          transformedData = Object.entries(startupsByYear).map(([year, count]) => ({
            label: year,
            value: count,
          }));
          break;
      }

      return {
        data: transformedData,
        metricType,
        totalRecords: metrics.length,
      };
    } catch (error) {
      console.error('Error fetching impact metrics:', error);
      throw new Error('Failed to fetch impact metrics');
    }
  });

export const getSummaryStats = baseProcedure
  .query(async () => {
    try {
      // Get latest year's data or aggregate all data
      const latestMetrics = await db.impactMetric.findMany({
        orderBy: {
          year: 'desc',
        },
        take: 10, // Get recent data
      });

      // Calculate summary statistics
      const totalFundsRaised = latestMetrics.reduce((sum, metric) => sum + metric.fundsRaised, 0);
      const totalStartupsScaled = latestMetrics.reduce((sum, metric) => sum + metric.startupsScaled, 0);
      const uniqueRegions = new Set(latestMetrics.map(metric => metric.regionName)).size;
      const latestYear = latestMetrics.length > 0 ? Math.max(...latestMetrics.map(m => m.year)) : new Date().getFullYear();

      return {
        totalFundsRaised: Math.round(totalFundsRaised * 100) / 100,
        totalStartupsScaled,
        regionsActive: uniqueRegions,
        latestYear,
        lastUpdated: new Date(),
      };
    } catch (error) {
      console.error('Error fetching summary stats:', error);
      throw new Error('Failed to fetch summary statistics');
    }
  });
