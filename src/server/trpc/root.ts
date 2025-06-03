import {
  createCallerFactory,
  createTRPCRouter,
} from "~/server/trpc/main";

// Import all procedures
import * as authProcs from "~/server/trpc/procedures/auth";
import * as partnersProcs from "~/server/trpc/procedures/partners";
import * as commentsProcs from "~/server/trpc/procedures/comments";
import * as impactMetricsProcs from "~/server/trpc/procedures/impact-metrics";
import * as innovatorsProcs from "~/server/trpc/procedures/innovators";
import * as newsletterProcs from "~/server/trpc/procedures/newsletter";
import * as problemsProcs from "~/server/trpc/procedures/problems";
import * as adminProblemsProcs from "~/server/trpc/procedures/admin-problems";
import * as adminChallengesProcs from "~/server/trpc/procedures/admin-challenges";
import * as adminInnovatorsProcs from "~/server/trpc/procedures/admin-innovators";
import * as adminGeneralProcs from "~/server/trpc/procedures/admin-general";

export const appRouter = createTRPCRouter({
  // Authentication procedures
  adminLogin: authProcs.adminLogin,
  verifyAdminToken: authProcs.verifyAdminToken,
  
  // Admin procedures - Problems
  adminGetProblemSubmissions: adminProblemsProcs.adminGetProblemSubmissions,
  adminUpdateProblemStatus: adminProblemsProcs.adminUpdateProblemStatus,
  adminDeleteProblemSubmission: adminProblemsProcs.adminDeleteProblemSubmission,
  adminGetProblemStats: adminProblemsProcs.adminGetProblemStats,
  
  // Admin procedures - Challenges
  adminGetChallenges: adminChallengesProcs.adminGetChallenges,
  adminCreateChallenge: adminChallengesProcs.adminCreateChallenge,
  adminUpdateChallenge: adminChallengesProcs.adminUpdateChallenge,
  adminDeleteChallenge: adminChallengesProcs.adminDeleteChallenge,
  adminReorderChallenges: adminChallengesProcs.adminReorderChallenges,
  
  // Admin procedures - Innovators
  adminGetInnovators: adminInnovatorsProcs.adminGetInnovators,
  adminCreateInnovator: adminInnovatorsProcs.adminCreateInnovator,
  adminUpdateInnovator: adminInnovatorsProcs.adminUpdateInnovator,
  adminDeleteInnovator: adminInnovatorsProcs.adminDeleteInnovator,
  adminReorderInnovators: adminInnovatorsProcs.adminReorderInnovators,
  
  // Admin procedures - Case Studies
  adminGetCaseStudies: adminGeneralProcs.adminGetCaseStudies,
  adminCreateCaseStudy: adminGeneralProcs.adminCreateCaseStudy,
  adminUpdateCaseStudy: adminGeneralProcs.adminUpdateCaseStudy,
  adminDeleteCaseStudy: adminGeneralProcs.adminDeleteCaseStudy,
  
  // Admin procedures - News
  adminGetNews: adminGeneralProcs.adminGetNews,
  adminCreateNews: adminGeneralProcs.adminCreateNews,
  adminUpdateNews: adminGeneralProcs.adminUpdateNews,
  adminDeleteNews: adminGeneralProcs.adminDeleteNews,
  
  // Admin procedures - Partners
  adminGetPartners: adminGeneralProcs.adminGetPartners,
  adminCreatePartner: adminGeneralProcs.adminCreatePartner,
  adminUpdatePartner: adminGeneralProcs.adminUpdatePartner,
  adminDeletePartner: adminGeneralProcs.adminDeletePartner,
  
  // Admin procedures - Comments & Community
  adminGetComments: adminGeneralProcs.adminGetComments,
  adminDeleteComment: adminGeneralProcs.adminDeleteComment,
  adminGetNewsletterSubscribers: adminGeneralProcs.adminGetNewsletterSubscribers,
  adminGetContactMessages: adminGeneralProcs.adminGetContactMessages,
  adminUpdateContactMessageStatus: adminGeneralProcs.adminUpdateContactMessageStatus,
  
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
