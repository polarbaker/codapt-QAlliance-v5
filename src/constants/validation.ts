import { z } from "zod";

// Common validation patterns
const jsonArraySchema = (fieldName: string) => 
  z.string().default("[]").refine((val) => {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed);
    } catch {
      return false;
    }
  }, `${fieldName} must be a valid JSON array (e.g., ["item1", "item2"])`);

const urlSchema = z.string().url("Please enter a valid URL").or(z.literal(""));

// Case Study validation schema
export const caseStudySchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  summary: z.string().min(1, "Summary is required").max(500, "Summary must be less than 500 characters"),
  content: z.string().min(1, "Content is required"),
  image: z.string().min(1, "Image URL is required").url("Please enter a valid image URL"),
  video: urlSchema.optional(),
  pdfUrl: urlSchema.optional(),
  tags: jsonArraySchema("Tags"),
  impactMetrics: z.string().optional(),
  featured: z.boolean().default(false),
});

// Challenge validation schema
export const challengeSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  tagline: z.string().min(1, "Tagline is required").max(300, "Tagline must be less than 300 characters"),
  category: z.string().min(1, "Category is required"),
  region: z.string().min(1, "Region is required"),
  status: z.string().min(1, "Status is required"),
  image: z.string().min(1, "Image URL is required").url("Please enter a valid image URL"),
  description: z.string().min(1, "Description is required"),
  prize: z.string().min(1, "Prize is required").max(100, "Prize must be less than 100 characters"),
  openDate: z.string().optional(),
  closeDate: z.string().optional(),
  pilotStartDate: z.string().optional(),
  partners: z.string().optional(),
  eligibility: z.string().optional(),
  featured: z.boolean().default(false),
});

// News validation schema
export const newsSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  excerpt: z.string().min(1, "Excerpt is required").max(500, "Excerpt must be less than 500 characters"),
  content: z.string().min(1, "Content is required"),
  category: z.string().min(1, "Category is required"),
  imageUrl: urlSchema.optional(),
  author: z.string().max(100, "Author name must be less than 100 characters").optional(),
  tags: jsonArraySchema("Tags"),
  featured: z.boolean().default(false),
  publishedAt: z.string().min(1, "Published date is required"),
});

// Innovator validation schema
export const innovatorSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  title: z.string().min(1, "Title is required").max(150, "Title must be less than 150 characters"),
  bio: z.string().min(1, "Bio is required"),
  image: z.string().min(1, "Image URL is required").url("Please enter a valid image URL"),
  achievements: z.array(z.string().min(1, "Achievement cannot be empty")).min(1, "At least one achievement is required"),
  linkedinUrl: urlSchema.optional(),
  twitterUrl: urlSchema.optional(),
  websiteUrl: urlSchema.optional(),
});

// Partner validation schema
export const partnerSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  logo: z.string().min(1, "Logo URL is required").url("Please enter a valid logo URL"),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
  websiteUrl: urlSchema.optional(),
  visible: z.boolean().default(true),
});

// Admin login validation schema
export const adminLoginSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

// File upload validation schema
export const fileUploadSchema = z.object({
  fileName: z.string().min(1, "File name is required"),
  fileType: z.string().min(1, "File type is required"),
  fileSize: z.number().positive("File size must be positive").max(5 * 1024 * 1024, "File size must be less than 5MB"),
  fileContent: z.string().min(1, "File content is required"),
});

// Image upload validation schema (for data URL format)
export const imageUploadSchema = z.object({
  image: z.string().min(1, "Image is required"),
  filename: z.string().min(1, "Filename is required"),
});

// Type exports for form data
export type CaseStudyFormData = z.infer<typeof caseStudySchema>;
export type ChallengeFormData = z.infer<typeof challengeSchema>;
export type NewsFormData = z.infer<typeof newsSchema>;
export type InnovatorFormData = z.infer<typeof innovatorSchema>;
export type PartnerFormData = z.infer<typeof partnerSchema>;
export type AdminLoginFormData = z.infer<typeof adminLoginSchema>;
export type FileUploadFormData = z.infer<typeof fileUploadSchema>;
export type ImageUploadFormData = z.infer<typeof imageUploadSchema>;

// Utility functions for validation
export const validateJsonArray = (value: string): string[] => {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const formatJsonArray = (array: string[]): string => {
  return JSON.stringify(array, null, 0);
};

// Constants for form options
export const CHALLENGE_CATEGORIES = [
  "Climate",
  "Digital",
  "Health",
  "Education",
  "Energy",
  "Agriculture",
] as const;

export const CHALLENGE_REGIONS = [
  "Global",
  "Africa",
  "Asia",
  "Europe",
  "North America",
  "South America",
  "Oceania",
] as const;

export const CHALLENGE_STATUSES = [
  "Active",
  "Submissions Open",
  "Coming Soon",
  "Closed",
] as const;

export const NEWS_CATEGORIES = [
  "Announcement",
  "Innovation",
  "Partnership",
  "Research",
  "Event",
  "Achievement",
  "Industry",
] as const;
