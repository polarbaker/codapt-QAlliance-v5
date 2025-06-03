import {
  createCallerFactory,
  createTRPCRouter,
} from "~/server/trpc/main";

// Import all procedures
import * as partnersProcs from "~/server/trpc/procedures/partners";
import * as commentsProcs from "~/server/trpc/procedures/comments";
import * as impactMetricsProcs from "~/server/trpc/procedures/impact-metrics";
import * as innovatorsProcs from "~/server/trpc/procedures/innovators";
import * as newsletterProcs from "~/server/trpc/procedures/newsletter";
import * as problemsProcs from "~/server/trpc/procedures/problems";

export const appRouter = createTRPCRouter({
  // Partners procedures
  getPartners: partnersProcs.getPartners,
  getPartnerById: partnersProcs.getPartnerById,
  
  // Comments procedures
  getComments: commentsProcs.getComments,
  postComment: commentsProcs.postComment,
  likeComment: commentsProcs.likeComment,
  
  // Impact metrics procedures
  getImpactMetrics: impactMetricsProcs.getImpactMetrics,
  getSummaryStats: impactMetricsProcs.getSummaryStats,
  
  // Innovators procedures
  getInnovators: innovatorsProcs.getInnovators,
  getInnovatorById: innovatorsProcs.getInnovatorById,
  getFeaturedInnovators: innovatorsProcs.getFeaturedInnovators,
  
  // Newsletter procedures
  subscribeNewsletter: newsletterProcs.subscribeNewsletter,
  submitContactMessage: newsletterProcs.submitContactMessage,
  unsubscribeNewsletter: newsletterProcs.unsubscribeNewsletter,
  
  // Problems procedures
  submitProblem: problemsProcs.submitProblem,
  getProblemSubmissions: problemsProcs.getProblemSubmissions,
  getProblemSubmissionById: problemsProcs.getProblemSubmissionById,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
