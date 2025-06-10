// Import polyfill first to ensure it runs before any code that might use File API
import '../../polyfill';

import {
  createCallerFactory,
  createTRPCRouter,
} from "~/server/trpc/main";

// Import all procedures
import * as authProcs from "~/server/trpc/procedures/auth";
import * as partnersProcs from "~/server/trpc/procedures/partners";
import * as challengesProcs from "~/server/trpc/procedures/challenges";
import * as commentsProcs from "~/server/trpc/procedures/comments";
import * as impactMetricsProcs from "~/server/trpc/procedures/impact-metrics";
import * as innovatorsProcs from "~/server/trpc/procedures/innovators";
import * as newsletterProcs from "~/server/trpc/procedures/newsletter";
import * as problemsProcs from "~/server/trpc/procedures/problems";
import * as adminProblemsProcs from "~/server/trpc/procedures/admin-problems";
import * as adminChallengesProcs from "~/server/trpc/procedures/admin-challenges";
import * as adminInnovatorsProcs from "~/server/trpc/procedures/admin-innovators";
import * as adminGeneralProcs from "~/server/trpc/procedures/admin-general";
import * as imageUploadProcs from "~/server/trpc/procedures/image-upload";
import * as simpleImageStorageProcs from "~/server/trpc/procedures/simple-image-storage";
import * as simpleImageStorageExtendedProcs from "~/server/trpc/procedures/simple-image-storage-extended";
import * as bulletproofImageUploadProcs from "~/server/trpc/procedures/bulletproof-image-upload";
import * as imageCollectionProcs from "~/server/trpc/procedures/image-collections";
import * as siteContentProcs from "~/server/trpc/procedures/site-content";

export const appRouter = createTRPCRouter({
  // Authentication procedures
  adminLogin: authProcs.adminLogin,
  verifyAdminToken: authProcs.verifyAdminToken,
  
  // Admin procedures - Problems
  adminGetProblemSubmissions: adminProblemsProcs.adminGetProblemSubmissions,
  adminGetProblemSubmissionById: adminProblemsProcs.adminGetProblemSubmissionById,
  adminUpdateProblemSubmission: adminProblemsProcs.adminUpdateProblemSubmission,
  adminUpdateProblemStatus: adminProblemsProcs.adminUpdateProblemStatus,
  adminDeleteProblemSubmission: adminProblemsProcs.adminDeleteProblemSubmission,
  adminGetProblemStats: adminProblemsProcs.adminGetProblemStats,
  
  // Admin procedures - Challenges
  adminGetChallenges: adminChallengesProcs.adminGetChallenges,
  adminGetChallengeById: adminChallengesProcs.adminGetChallengeById,
  adminCreateChallenge: adminChallengesProcs.adminCreateChallenge,
  adminUpdateChallenge: adminChallengesProcs.adminUpdateChallenge,
  adminDeleteChallenge: adminChallengesProcs.adminDeleteChallenge,
  adminReorderChallenges: adminChallengesProcs.adminReorderChallenges,
  
  // Admin procedures - Innovators
  adminGetInnovators: adminInnovatorsProcs.adminGetInnovators,
  adminGetInnovatorById: adminInnovatorsProcs.adminGetInnovatorById,
  adminCreateInnovator: adminInnovatorsProcs.adminCreateInnovator,
  adminUpdateInnovator: adminInnovatorsProcs.adminUpdateInnovator,
  adminDeleteInnovator: adminInnovatorsProcs.adminDeleteInnovator,
  adminReorderInnovators: adminInnovatorsProcs.adminReorderInnovators,
  
  // Admin procedures - Case Studies
  adminGetCaseStudies: adminGeneralProcs.adminGetCaseStudies,
  adminGetCaseStudyById: adminGeneralProcs.adminGetCaseStudyById,
  adminCreateCaseStudy: adminGeneralProcs.adminCreateCaseStudy,
  adminUpdateCaseStudy: adminGeneralProcs.adminUpdateCaseStudy,
  adminDeleteCaseStudy: adminGeneralProcs.adminDeleteCaseStudy,
  
  // Admin procedures - News
  adminGetNews: adminGeneralProcs.adminGetNews,
  adminGetNewsById: adminGeneralProcs.adminGetNewsById,
  adminCreateNews: adminGeneralProcs.adminCreateNews,
  adminUpdateNews: adminGeneralProcs.adminUpdateNews,
  adminDeleteNews: adminGeneralProcs.adminDeleteNews,
  
  // Admin procedures - Partners
  adminGetPartners: adminGeneralProcs.adminGetPartners,
  adminGetPartnerById: adminGeneralProcs.adminGetPartnerById,
  adminCreatePartner: adminGeneralProcs.adminCreatePartner,
  adminUpdatePartner: adminGeneralProcs.adminUpdatePartner,
  adminDeletePartner: adminGeneralProcs.adminDeletePartner,
  adminReorderPartners: adminGeneralProcs.adminReorderPartners,
  adminTogglePartnerVisibility: adminGeneralProcs.adminTogglePartnerVisibility,
  adminBulkDeletePartners: adminGeneralProcs.adminBulkDeletePartners,
  adminBulkUpdatePartners: adminGeneralProcs.adminBulkUpdatePartners,
  
  // Admin procedures - Comments & Community
  adminGetComments: adminGeneralProcs.adminGetComments,
  adminDeleteComment: adminGeneralProcs.adminDeleteComment,
  adminGetNewsletterSubscribers: adminGeneralProcs.adminGetNewsletterSubscribers,
  adminGetContactMessages: adminGeneralProcs.adminGetContactMessages,
  adminUpdateContactMessageStatus: adminGeneralProcs.adminUpdateContactMessageStatus,
  
  // Admin procedures - Image Management
  adminUploadImage: imageUploadProcs.adminUploadImage,
  emergencyUploadImage: imageUploadProcs.emergencyUploadImage,
  adminBulkUploadImages: imageUploadProcs.adminBulkUploadImages,
  adminDeleteImage: imageUploadProcs.adminDeleteImage,
  adminListImages: imageUploadProcs.adminListImages,
  
  // Admin procedures - Image Cleanup and Maintenance
  adminScanOrphanedFiles: imageUploadProcs.adminScanOrphanedFiles,
  adminScanOrphanedRecords: imageUploadProcs.adminScanOrphanedRecords,
  adminCleanupOrphanedFiles: imageUploadProcs.adminCleanupOrphanedFiles,
  adminCleanupOrphanedRecords: imageUploadProcs.adminCleanupOrphanedRecords,
  adminComprehensiveCleanup: imageUploadProcs.adminComprehensiveCleanup,
  
  // Admin procedures - Image Collections
  adminListImageCollections: imageCollectionProcs.adminListImageCollections,
  adminCreateImageCollection: imageCollectionProcs.adminCreateImageCollection,
  adminUpdateImageCollection: imageCollectionProcs.adminUpdateImageCollection,
  adminDeleteImageCollection: imageCollectionProcs.adminDeleteImageCollection,
  adminAddImagesToCollection: imageCollectionProcs.adminAddImagesToCollection,
  adminRemoveImagesFromCollection: imageCollectionProcs.adminRemoveImagesFromCollection,
  
  // Admin procedures - Site Content Images
  uploadSiteContentImage: siteContentProcs.uploadSiteContentImage,
  removeSiteContentImage: siteContentProcs.removeSiteContentImage,
  listSiteContentImages: siteContentProcs.listSiteContentImages,
  
  // Admin procedures - Site Content Text
  uploadSiteContentText: siteContentProcs.uploadSiteContentText,
  removeSiteContentText: siteContentProcs.removeSiteContentText,
  listSiteContentTexts: siteContentProcs.listSiteContentTexts,
  
  // Admin procedures - Simple Image Storage (Innovators)
  uploadSimpleInnovatorImage: simpleImageStorageProcs.uploadSimpleInnovatorImage,
  removeSimpleInnovatorImage: simpleImageStorageProcs.removeSimpleInnovatorImage,
  listInnovatorsWithImageStatus: simpleImageStorageProcs.listInnovatorsWithImageStatus,
  
  // Admin procedures - Simple Image Storage (Partners)
  uploadSimplePartnerImage: simpleImageStorageProcs.uploadSimplePartnerImage,
  removeSimplePartnerImage: simpleImageStorageProcs.removeSimplePartnerImage,
  listPartnersWithImageStatus: simpleImageStorageProcs.listPartnersWithImageStatus,
  
  // Admin procedures - Simple Image Storage (Case Studies)
  uploadSimpleCaseStudyImage: simpleImageStorageExtendedProcs.uploadSimpleCaseStudyImage,
  removeSimpleCaseStudyImage: simpleImageStorageExtendedProcs.removeSimpleCaseStudyImage,
  
  // Admin procedures - Simple Image Storage (Challenges)
  uploadSimpleChallengeImage: simpleImageStorageExtendedProcs.uploadSimpleChallengeImage,
  removeSimpleChallengeImage: simpleImageStorageExtendedProcs.removeSimpleChallengeImage,
  
  // Admin procedures - Simple Image Storage (News)
  uploadSimpleNewsImage: simpleImageStorageExtendedProcs.uploadSimpleNewsImage,
  removeSimpleNewsImage: simpleImageStorageExtendedProcs.removeSimpleNewsImage,
  
  // Image serving procedures (public)
  getImage: imageUploadProcs.getImage,
  getImageVariant: imageUploadProcs.getImageVariant,
  getSiteContentImage: siteContentProcs.getSiteContentImage,
  getSimpleInnovatorImage: simpleImageStorageProcs.getSimpleInnovatorImage,
  getSimplePartnerImage: simpleImageStorageProcs.getSimplePartnerImage,
  getSimpleCaseStudyImage: simpleImageStorageExtendedProcs.getSimpleCaseStudyImage,
  getSimpleChallengeImage: simpleImageStorageExtendedProcs.getSimpleChallengeImage,
  getSimpleNewsImage: simpleImageStorageExtendedProcs.getSimpleNewsImage,
  
  // Text serving procedures (public)
  getSiteContentText: siteContentProcs.getSiteContentText,
  getBulkSiteContentText: siteContentProcs.getBulkSiteContentText,
  
  // Storage utilities
  storageHealthCheck: bulletproofImageUploadProcs.storageHealthCheck,
  
  // Partners procedures
  getPartners: partnersProcs.getPartners,
  getPartnerById: partnersProcs.getPartnerById,
  
  // Challenges procedures (public)
  getChallenges: challengesProcs.getChallenges,
  getChallengeById: challengesProcs.getChallengeById,
  getFeaturedChallenges: challengesProcs.getFeaturedChallenges,
  
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
