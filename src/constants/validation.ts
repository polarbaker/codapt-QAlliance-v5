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
  image: z.string().optional(), // Made optional to allow creating case studies without images initially
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
  image: z.string().optional(), // Make image optional for new challenges
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
  imageUrl: z.string().optional(), // Optional for flexibility
  author: z.string().max(100, "Author name must be less than 100 characters").optional(),
  tags: jsonArraySchema("Tags"),
  featured: z.boolean().default(false),
  publishedAt: z.string().min(1, "Published date is required"),
  order: z.number().int().min(0).optional(), // Add missing order field
});

// Innovator validation schema
export const innovatorSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  title: z.string().min(1, "Title is required").max(150, "Title must be less than 150 characters"),
  bio: z.string().min(1, "Bio is required"),
  image: z.string().min(1, "Image is required"), // Now expects file path, not URL
  achievements: z.array(z.string().min(1, "Achievement cannot be empty")).min(1, "At least one achievement is required"),
  linkedinUrl: urlSchema.optional(),
  twitterUrl: urlSchema.optional(),
  websiteUrl: urlSchema.optional(),
  featured: z.boolean().default(false),
  hasVideo: z.boolean().default(false),
  videoUrl: urlSchema.optional(),
  order: z.number().int().min(0).optional(),
});

// Enhanced innovator form schema for admin forms - flexible for both create and edit
export const innovatorFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  title: z.string().min(1, "Title is required").max(150, "Title must be less than 150 characters"),
  bio: z.string().min(1, "Bio is required"),
  image: z.string().optional(), // Made optional for edit scenarios - validation handled in form logic
  achievements: z.array(z.object({
    value: z.string().min(1, "Achievement cannot be empty")
  })).min(1, "At least one achievement is required"),
  linkedinUrl: z.string().url("Please enter a valid LinkedIn URL").optional().or(z.literal("")),
  twitterUrl: z.string().url("Please enter a valid Twitter URL").optional().or(z.literal("")),
  websiteUrl: z.string().url("Please enter a valid website URL").optional().or(z.literal("")),
  featured: z.boolean().default(false),
  hasVideo: z.boolean().default(false),
  videoUrl: z.string().url("Please enter a valid video URL").optional().or(z.literal("")),
});

// Separate schema for creating new innovators where image is optional
export const innovatorCreateFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  title: z.string().min(1, "Title is required").max(150, "Title must be less than 150 characters"),
  bio: z.string().min(1, "Bio is required"),
  image: z.string().optional(), // Made optional since SimpleInnovatorImageUpload needs an innovator ID
  achievements: z.array(z.object({
    value: z.string().min(1, "Achievement cannot be empty")
  })).min(1, "At least one achievement is required"),
  linkedinUrl: z.string().url("Please enter a valid LinkedIn URL").optional().or(z.literal("")),
  twitterUrl: z.string().url("Please enter a valid Twitter URL").optional().or(z.literal("")),
  websiteUrl: z.string().url("Please enter a valid website URL").optional().or(z.literal("")),
  featured: z.boolean().default(false),
  hasVideo: z.boolean().default(false),
  videoUrl: z.string().url("Please enter a valid video URL").optional().or(z.literal("")),
});

// Partner validation schema
export const partnerSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  logoUrl: z.string().optional(), // Made optional to allow creating partners without logos initially
  websiteUrl: z.string().url("Please enter a valid website URL").optional().or(z.literal("")),
  altText: z.string().min(1, "Alt text is required").max(200, "Alt text must be less than 200 characters"),
  visible: z.boolean().default(true),
  order: z.number().int().min(0).default(0),
});

// Admin login validation schema
export const adminLoginSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

// File upload validation schema - now accepts any file size
export const fileUploadSchema = z.object({
  fileName: z.string().min(1, "File name is required"),
  fileType: z.string().min(1, "File type is required"),
  fileSize: z.number().positive("File size must be positive"),
  fileContent: z.string().min(1, "File content is required"),
});

// Image upload validation schema (for data URL format)
export const imageUploadSchema = z.object({
  image: z.string().min(1, "Image is required"),
  filename: z.string().min(1, "Filename is required"),
});

// Schema for form data that includes image upload
export const imageFormDataSchema = z.object({
  imageFile: z.instanceof(File).optional(),
  existingImagePath: z.string().optional(),
});

// Enhanced image metadata validation schema
export const imageMetadataSchema = z.object({
  title: z.string().max(200, "Title must be less than 200 characters").optional(),
  description: z.string().max(1000, "Description must be less than 1000 characters").optional(),
  altText: z.string().max(300, "Alt text must be less than 300 characters").optional(),
  tags: z.array(z.string().min(1, "Tag cannot be empty").max(50, "Tag must be less than 50 characters")).max(20, "Maximum 20 tags allowed").default([]),
  category: z.string().max(100, "Category must be less than 100 characters").optional(),
});

// Image collection validation schema
export const imageCollectionSchema = z.object({
  name: z.string().min(1, "Collection name is required").max(100, "Name must be less than 100 characters"),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
  isPublic: z.boolean().default(false),
  imageIds: z.array(z.number()).optional(),
});

// Simplified bulk image upload schema for general use
export const bulkImageUploadSchema = z.object({
  images: z.array(z.object({
    fileName: z.string().min(1, "File name is required"),
    fileType: z.string().refine(
      (type) => type.startsWith('image/'),
      "File must be an image"
    ),
    fileContent: z.string().min(1, "File content is required"),
    ...imageMetadataSchema.shape,
  })).min(1, "At least one image is required").max(5, "Maximum 5 images per bulk upload"),
  collectionName: z.string().max(100, "Collection name must be less than 100 characters").optional(),
});

// Image variant request schema
export const imageVariantSchema = z.object({
  filePath: z.string().min(1, "File path is required"),
  variantType: z.enum(['thumbnail', 'small', 'medium', 'large', 'original']).optional(),
});

// Image search and filter schema
export const imageSearchSchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  sortBy: z.enum(['createdAt', 'fileName', 'fileSize', 'usageCount']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(100).default(20),
  includeVariants: z.boolean().default(false),
  includeArchived: z.boolean().default(false),
});

// Site content text types that can be managed
export const SITE_CONTENT_TEXT_TYPES = [
  // Hero Section
  'hero_title_part1',
  'hero_title_part2', 
  'hero_description',
  'hero_button1_text',
  'hero_button2_text',
  'hero_stat_number',
  'hero_stat_label',
  'hero_scroll_text',
  
  // Bold Statement Section
  'bold_statement_text',
  'bold_statement_button',
  'bold_statement_stat',
  
  // About Section
  'about_title',
  'about_tagline',
  'about_mission_title',
  'about_mission_paragraph1',
  'about_mission_paragraph2',
  'about_approach_title',
  'about_approach_step1',
  'about_approach_step2',
  'about_approach_step3',
  'about_approach_step4',
  'about_approach_step5',
  'about_partners_title',
  'about_no_partners_message1',
  'about_no_partners_message2',
  'about_button_text',
  
  // Innovation Pipeline Section
  'pipeline_title',
  'pipeline_description',
  'pipeline_stage1_title',
  'pipeline_stage1_description',
  'pipeline_stage2_title',
  'pipeline_stage2_description',
  'pipeline_stage3_title',
  'pipeline_stage3_description',
  'pipeline_stage4_title',
  'pipeline_stage4_description',
  'pipeline_stage5_title',
  'pipeline_stage5_description',
  'pipeline_button_text',
  
  // Hall of Innovators Section
  'innovators_title',
  'innovators_description',
  'innovators_button_text',
  
  // Impact Metrics Section
  'impact_title',
  'impact_description',
  'impact_metric1_label',
  'impact_metric2_label',
  'impact_metric3_label',
  'impact_metric4_label',
  'impact_featured_title',
  'impact_featured_heading',
  'impact_featured_paragraph',
  'impact_button_text',
  
  // Data Insights Section
  'insights_title',
  'insights_description',
  'insights_funds_title',
  'insights_funds_heading',
  'insights_funds_paragraph',
  'insights_distribution_title',
  'insights_distribution_heading',
  'insights_distribution_paragraph',
  'insights_button_text',
  'insights_download_toast',
  
  // Challenge CTA Section
  'challenge_cta_heading',
  'challenge_cta_subheading',
  'challenge_cta_card1_title',
  'challenge_cta_card1_description',
  'challenge_cta_card1_button',
  'challenge_cta_card2_title',
  'challenge_cta_card2_description',
  'challenge_cta_card2_button',
  
  // Community Engagement Section
  'community_title',
  'community_description',
  'community_featured_title',
  'community_featured_heading',
  'community_featured_paragraph',
  'community_featured_author',
  'community_featured_role',
  'community_featured_button',
  'community_featured_fallback',
  'community_featured_retry',
  'community_forum_title',
  'community_refresh_button',
  'community_profile_title',
  'community_edit_button',
  'community_cancel_button',
  'community_display_name_label',
  'community_display_name_placeholder',
  'community_avatar_color_label',
  'community_save_profile_button',
  'community_member_status',
  'community_name_requirement',
  'community_no_comments_message',
  'community_reply_button',
  'community_share_button',
  'community_reply_toast',
  'community_share_toast',
  'community_form_title',
  'community_textarea_placeholder',
  'community_post_button',
  'community_posting_button',
  'community_comment_requirement',
  
  // Investor Engagement Section
  'investor_title',
  'investor_description',
  'investor_perspective_title',
  'investor_quote',
  'investor_author',
  'investor_role',
  'investor_calculator_title',
  'investor_calculator_heading',
  'investor_amount_label',
  'investor_return_label',
  'investor_people_label',
  'investor_countries_label',
  'investor_button_text',
  'investor_modal_title',
  'investor_submit_button',
  'investor_submitting_button',
  'investor_success_toast',
  
  // Join Us Section
  'join_title',
  'join_description',
  'join_newsletter_title',
  'join_newsletter_description',
  'join_email_label',
  'join_email_placeholder',
  'join_privacy_text',
  'join_contact_title',
  'join_contact_description',
  'join_community_title',
  'join_members_label',
  'join_subscribers_label',
  'join_continents_label',
  
  // Social Media Section
  'social_title',
  'social_description',
  'social_testimonials_title',
  'social_feed_title',
  'social_cta_heading',
  'social_cta_paragraph',
  'social_cta_button',
  
  // Footer Section
  'footer_brand_name',
  'footer_description',
  'footer_quick_links_title',
  'footer_about_link',
  'footer_case_studies_link',
  'footer_impact_link',
  'footer_news_link',
  'footer_newsletter_title',
  'footer_newsletter_description',
  'footer_email_placeholder',
  'footer_subscribe_toast',
  'footer_invalid_email_toast',
  'footer_copyright_text',
  'footer_privacy_link',
  'footer_terms_link',
  'footer_cookie_link',
] as const;

export type SiteContentTextType = typeof SITE_CONTENT_TEXT_TYPES[number];

// Text content type labels for admin interface
export const SITE_CONTENT_TEXT_LABELS: Record<SiteContentTextType, string> = {
  // Hero Section
  'hero_title_part1': 'Hero Title (Part 1)',
  'hero_title_part2': 'Hero Title (Part 2)',
  'hero_description': 'Hero Description',
  'hero_button1_text': 'Hero Button 1 Text',
  'hero_button2_text': 'Hero Button 2 Text',
  'hero_stat_number': 'Hero Stat Number',
  'hero_stat_label': 'Hero Stat Label',
  'hero_scroll_text': 'Hero Scroll Text',
  
  // Bold Statement Section
  'bold_statement_text': 'Bold Statement Text',
  'bold_statement_button': 'Bold Statement Button',
  'bold_statement_stat': 'Bold Statement Statistic',
  
  // About Section
  'about_title': 'About Section Title',
  'about_tagline': 'About Section Tagline',
  'about_mission_title': 'Mission Title',
  'about_mission_paragraph1': 'Mission Paragraph 1',
  'about_mission_paragraph2': 'Mission Paragraph 2',
  'about_approach_title': 'Approach Title',
  'about_approach_step1': 'Approach Step 1',
  'about_approach_step2': 'Approach Step 2',
  'about_approach_step3': 'Approach Step 3',
  'about_approach_step4': 'Approach Step 4',
  'about_approach_step5': 'Approach Step 5',
  'about_partners_title': 'Partners Title',
  'about_no_partners_message1': 'No Partners Message 1',
  'about_no_partners_message2': 'No Partners Message 2',
  'about_button_text': 'About Button Text',
  
  // Innovation Pipeline Section
  'pipeline_title': 'Pipeline Section Title',
  'pipeline_description': 'Pipeline Description',
  'pipeline_stage1_title': 'Pipeline Stage 1 Title',
  'pipeline_stage1_description': 'Pipeline Stage 1 Description',
  'pipeline_stage2_title': 'Pipeline Stage 2 Title',
  'pipeline_stage2_description': 'Pipeline Stage 2 Description',
  'pipeline_stage3_title': 'Pipeline Stage 3 Title',
  'pipeline_stage3_description': 'Pipeline Stage 3 Description',
  'pipeline_stage4_title': 'Pipeline Stage 4 Title',
  'pipeline_stage4_description': 'Pipeline Stage 4 Description',
  'pipeline_stage5_title': 'Pipeline Stage 5 Title',
  'pipeline_stage5_description': 'Pipeline Stage 5 Description',
  'pipeline_button_text': 'Pipeline Button Text',
  
  // Hall of Innovators Section
  'innovators_title': 'Innovators Section Title',
  'innovators_description': 'Innovators Description',
  'innovators_button_text': 'Innovators Button Text',
  
  // Impact Metrics Section
  'impact_title': 'Impact Section Title',
  'impact_description': 'Impact Description',
  'impact_metric1_label': 'Impact Metric 1 Label',
  'impact_metric2_label': 'Impact Metric 2 Label',
  'impact_metric3_label': 'Impact Metric 3 Label',
  'impact_metric4_label': 'Impact Metric 4 Label',
  'impact_featured_title': 'Featured Impact Title',
  'impact_featured_heading': 'Featured Impact Heading',
  'impact_featured_paragraph': 'Featured Impact Paragraph',
  'impact_button_text': 'Impact Button Text',
  
  // Data Insights Section
  'insights_title': 'Insights Section Title',
  'insights_description': 'Insights Description',
  'insights_funds_title': 'Funds Raised Title',
  'insights_funds_heading': 'Funds Raised Heading',
  'insights_funds_paragraph': 'Funds Raised Paragraph',
  'insights_distribution_title': 'Distribution Title',
  'insights_distribution_heading': 'Distribution Heading',
  'insights_distribution_paragraph': 'Distribution Paragraph',
  'insights_button_text': 'Insights Button Text',
  'insights_download_toast': 'Download Toast Message',
  
  // Challenge CTA Section
  'challenge_cta_heading': 'Challenge CTA Heading',
  'challenge_cta_subheading': 'Challenge CTA Subheading',
  'challenge_cta_card1_title': 'CTA Card 1 Title',
  'challenge_cta_card1_description': 'CTA Card 1 Description',
  'challenge_cta_card1_button': 'CTA Card 1 Button',
  'challenge_cta_card2_title': 'CTA Card 2 Title',
  'challenge_cta_card2_description': 'CTA Card 2 Description',
  'challenge_cta_card2_button': 'CTA Card 2 Button',
  
  // Community Engagement Section
  'community_title': 'Community Section Title',
  'community_description': 'Community Description',
  'community_featured_title': 'Featured Story Title',
  'community_featured_heading': 'Featured Story Heading',
  'community_featured_paragraph': 'Featured Story Paragraph',
  'community_featured_author': 'Featured Story Author',
  'community_featured_role': 'Featured Story Role',
  'community_featured_button': 'Featured Story Button',
  'community_featured_fallback': 'Featured Story Fallback',
  'community_featured_retry': 'Featured Story Retry',
  'community_forum_title': 'Discussion Forum Title',
  'community_refresh_button': 'Refresh Button',
  'community_profile_title': 'User Profile Title',
  'community_edit_button': 'Edit Button',
  'community_cancel_button': 'Cancel Button',
  'community_display_name_label': 'Display Name Label',
  'community_display_name_placeholder': 'Display Name Placeholder',
  'community_avatar_color_label': 'Avatar Color Label',
  'community_save_profile_button': 'Save Profile Button',
  'community_member_status': 'Member Status',
  'community_name_requirement': 'Name Requirement Message',
  'community_no_comments_message': 'No Comments Message',
  'community_reply_button': 'Reply Button',
  'community_share_button': 'Share Button',
  'community_reply_toast': 'Reply Toast Message',
  'community_share_toast': 'Share Toast Message',
  'community_form_title': 'Comment Form Title',
  'community_textarea_placeholder': 'Comment Textarea Placeholder',
  'community_post_button': 'Post Comment Button',
  'community_posting_button': 'Posting Button',
  'community_comment_requirement': 'Comment Requirement Message',
  
  // Investor Engagement Section
  'investor_title': 'Investor Section Title',
  'investor_description': 'Investor Description',
  'investor_perspective_title': 'Investor Perspective Title',
  'investor_quote': 'Investor Quote',
  'investor_author': 'Investor Author',
  'investor_role': 'Investor Role',
  'investor_calculator_title': 'Calculator Title',
  'investor_calculator_heading': 'Calculator Heading',
  'investor_amount_label': 'Investment Amount Label',
  'investor_return_label': 'Estimated Return Label',
  'investor_people_label': 'People Impacted Label',
  'investor_countries_label': 'Countries Reached Label',
  'investor_button_text': 'Investor Button Text',
  'investor_modal_title': 'Investor Modal Title',
  'investor_submit_button': 'Submit Button',
  'investor_submitting_button': 'Submitting Button',
  'investor_success_toast': 'Success Toast Message',
  
  // Join Us Section
  'join_title': 'Join Us Section Title',
  'join_description': 'Join Us Description',
  'join_newsletter_title': 'Newsletter Title',
  'join_newsletter_description': 'Newsletter Description',
  'join_email_label': 'Email Label',
  'join_email_placeholder': 'Email Placeholder',
  'join_privacy_text': 'Privacy Text',
  'join_contact_title': 'Contact Form Title',
  'join_contact_description': 'Contact Form Description',
  'join_community_title': 'Community Stats Title',
  'join_members_label': 'Community Members Label',
  'join_subscribers_label': 'Newsletter Subscribers Label',
  'join_continents_label': 'Continents Reached Label',
  
  // Social Media Section
  'social_title': 'Social Section Title',
  'social_description': 'Social Description',
  'social_testimonials_title': 'Testimonials Title',
  'social_feed_title': 'Social Feed Title',
  'social_cta_heading': 'Social CTA Heading',
  'social_cta_paragraph': 'Social CTA Paragraph',
  'social_cta_button': 'Social CTA Button',
  
  // Footer Section
  'footer_brand_name': 'Footer Brand Name',
  'footer_description': 'Footer Description',
  'footer_quick_links_title': 'Quick Links Title',
  'footer_about_link': 'About Us Link',
  'footer_case_studies_link': 'Case Studies Link',
  'footer_impact_link': 'Impact Link',
  'footer_news_link': 'News & Events Link',
  'footer_newsletter_title': 'Footer Newsletter Title',
  'footer_newsletter_description': 'Footer Newsletter Description',
  'footer_email_placeholder': 'Footer Email Placeholder',
  'footer_subscribe_toast': 'Subscribe Toast Message',
  'footer_invalid_email_toast': 'Invalid Email Toast',
  'footer_copyright_text': 'Copyright Text',
  'footer_privacy_link': 'Privacy Policy Link',
  'footer_terms_link': 'Terms of Service Link',
  'footer_cookie_link': 'Cookie Policy Link',
};

// Site content text validation schema
export const siteContentTextSchema = z.object({
  adminToken: z.string(),
  contentType: z.enum(SITE_CONTENT_TEXT_TYPES),
  textData: z.string().min(1, "Text content is required").max(5000, "Text content must be less than 5000 characters"),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
});

// Default text content values
export const SITE_CONTENT_TEXT_DEFAULTS: Record<SiteContentTextType, string> = {
  // Hero Section
  'hero_title_part1': 'Bridging',
  'hero_title_part2': 'Innovation Gaps',
  'hero_description': 'We mobilize what matters: Startups solving the world\'s most urgent challenges — from climate resilience to digital infrastructure — across 6 continents.',
  'hero_button1_text': 'Join the Alliance',
  'hero_button2_text': 'Explore Challenges',
  'hero_stat_number': '6',
  'hero_stat_label': 'Continents',
  'hero_scroll_text': 'Scroll',
  
  // Bold Statement Section
  'bold_statement_text': 'We turn urgent infrastructure needs into scalable solutions.',
  'bold_statement_button': 'Discover Our Vision',
  'bold_statement_stat': '1M+ Prize Pool Activated',
  
  // About Section
  'about_title': 'Who We Are',
  'about_tagline': 'Quantum Alliance bridges innovation gaps by connecting frontier technology with real-world problems.',
  'about_mission_title': 'Our Mission',
  'about_mission_paragraph1': 'We create structured challenges to address global needs in climate, digital infrastructure, and more. Our approach connects innovators directly with the organizations and governments that need their solutions most.',
  'about_mission_paragraph2': 'By focusing on real-world implementation and scale, we ensure that breakthrough technologies don\'t just remain interesting ideas, but become transformative solutions deployed where they\'re needed most.',
  'about_approach_title': 'Our Approach',
  'about_approach_step1': 'Identify critical infrastructure challenges with global partners',
  'about_approach_step2': 'Source innovative solutions from our global network',
  'about_approach_step3': 'Structure challenges with clear objectives and incentives',
  'about_approach_step4': 'Support pilot implementations in real-world environments',
  'about_approach_step5': 'Scale successful solutions through our global network',
  'about_partners_title': 'Our Partners',
  'about_no_partners_message1': 'No partners available at the moment.',
  'about_no_partners_message2': 'Check back soon for updates.',
  'about_button_text': 'Explore Our Process',
  
  // Innovation Pipeline Section
  'pipeline_title': 'Our Process',
  'pipeline_description': 'From identifying critical challenges to scaling proven solutions globally, our structured approach transforms innovative ideas into real-world impact.',
  'pipeline_stage1_title': 'Problem Identification',
  'pipeline_stage1_description': 'We work with governments and organizations to identify critical infrastructure challenges that need innovative solutions.',
  'pipeline_stage2_title': 'Solution Sourcing',
  'pipeline_stage2_description': 'Our global network of innovators and startups provides cutting-edge solutions to address these challenges.',
  'pipeline_stage3_title': 'Challenge Design',
  'pipeline_stage3_description': 'We structure challenges with clear objectives, success criteria, and meaningful incentives for participants.',
  'pipeline_stage4_title': 'Pilot Implementation',
  'pipeline_stage4_description': 'Selected solutions are tested in real-world environments with our partner organizations.',
  'pipeline_stage5_title': 'Global Scaling',
  'pipeline_stage5_description': 'Proven solutions are scaled across our global network to maximize impact and reach.',
  'pipeline_button_text': 'Current Challenges',
  
  // Hall of Innovators Section
  'innovators_title': 'Meet Our Innovators',
  'innovators_description': 'Brilliant minds from around the world transforming how we approach humanity\'s most pressing challenges.',
  'innovators_button_text': 'View All Innovators',
  
  // Impact Metrics Section
  'impact_title': 'Our Global Impact',
  'impact_description': 'Driving innovation and collaboration across the globe to solve humanity\'s most pressing challenges.',
  'impact_metric1_label': 'Prize Pool Activated',
  'impact_metric2_label': 'Continents Engaged',
  'impact_metric3_label': 'Government Partners',
  'impact_metric4_label': 'Innovators in Network',
  'impact_featured_title': 'Featured Impact',
  'impact_featured_heading': 'From Local Solution to Global Impact',
  'impact_featured_paragraph': 'Learn how one startup\'s water purification technology went from a local pilot to serving over 100,000 people across three continents. Their innovative approach reduced costs by 60% while increasing access to clean water in drought-affected regions.',
  'impact_button_text': 'See Case Studies',
  
  // Data Insights Section
  'insights_title': 'Impact Data',
  'insights_description': 'Measuring our global impact through transparent data and real-world outcomes.',
  'insights_funds_title': 'Funds Raised',
  'insights_funds_heading': '$350M+ in Funding for Innovators',
  'insights_funds_paragraph': 'Our innovators have raised significant capital to scale their solutions globally, with a steady increase year over year.',
  'insights_distribution_title': 'Global Distribution',
  'insights_distribution_heading': 'Partnerships Across 6 Continents',
  'insights_distribution_paragraph': 'Our global reach ensures diverse perspectives and solutions that address challenges in various contexts.',
  'insights_button_text': 'Download Impact Report',
  'insights_download_toast': 'Impact Report download started! Check your downloads folder for the complete data analysis.',
  
  // Challenge CTA Section
  'challenge_cta_heading': 'Want to Solve the Next Global Challenge?',
  'challenge_cta_subheading': 'Innovate, build, and deploy solutions that address humanity\'s most pressing needs. Your breakthrough can change the world.',
  'challenge_cta_card1_title': 'Submit Your Solution',
  'challenge_cta_card1_description': 'Are you an innovator with a game-changing solution? We provide the platform and resources to bring your ideas to life.',
  'challenge_cta_card1_button': 'Apply Now',
  'challenge_cta_card2_title': 'Become a Challenge Partner',
  'challenge_cta_card2_description': 'Governments, NGOs, and corporations can define challenges, access top talent, and implement innovative solutions.',
  'challenge_cta_card2_button': 'Partner With Us',
  
  // Community Engagement Section
  'community_title': 'Community',
  'community_description': 'Connect with fellow innovators, share insights, and collaborate on solutions to global challenges.',
  'community_featured_title': 'Featured Story',
  'community_featured_heading': 'From Prototype to Global Impact: The Water Access Initiative',
  'community_featured_paragraph': 'When Maria Gonzalez entered the Water Access Challenge last year, she had no idea her prototype would soon provide clean water to over 50,000 people across three continents...',
  'community_featured_author': 'Maria Gonzalez',
  'community_featured_role': 'Water Access Initiative',
  'community_featured_button': 'Read Full Story',
  'community_featured_fallback': 'Image temporarily unavailable',
  'community_featured_retry': 'Try again',
  'community_forum_title': 'Discussion Forum',
  'community_refresh_button': 'Refresh',
  'community_profile_title': 'Your Profile',
  'community_edit_button': 'Edit',
  'community_cancel_button': 'Cancel',
  'community_display_name_label': 'Display Name',
  'community_display_name_placeholder': 'Enter your name',
  'community_avatar_color_label': 'Avatar Color',
  'community_save_profile_button': 'Save Profile',
  'community_member_status': 'Community Member',
  'community_name_requirement': 'Set your name to join the conversation',
  'community_no_comments_message': 'No comments yet. Be the first to start the conversation!',
  'community_reply_button': 'Reply',
  'community_share_button': 'Share',
  'community_reply_toast': 'Reply feature coming soon!',
  'community_share_toast': 'Share feature coming soon!',
  'community_form_title': 'Join the Conversation',
  'community_textarea_placeholder': 'Share your thoughts or ask a question...',
  'community_post_button': 'Post Comment',
  'community_posting_button': 'Posting...',
  'community_comment_requirement': 'Comment must be at least 5 characters',
  
  // Investor Engagement Section
  'investor_title': 'Investor Impact',
  'investor_description': 'Join our network of impact investors funding solutions to global challenges with both financial and social returns.',
  'investor_perspective_title': 'Investor Perspective',
  'investor_quote': 'Investing in Quantum Alliance means backing real solutions that scale globally while generating strong returns.',
  'investor_author': 'Jane Smith',
  'investor_role': 'Managing Partner, Global Impact Fund',
  'investor_calculator_title': 'Impact Calculator',
  'investor_calculator_heading': 'Calculate Your Impact',
  'investor_amount_label': 'Investment Amount',
  'investor_return_label': 'Estimated Return',
  'investor_people_label': 'People Impacted',
  'investor_countries_label': 'Countries Reached',
  'investor_button_text': 'Join the Investor Network',
  'investor_modal_title': 'Join Our Investors',
  'investor_submit_button': 'Join Our Investor Network',
  'investor_submitting_button': 'Submitting...',
  'investor_success_toast': 'Your registration has been submitted successfully!',
  
  // Join Us Section
  'join_title': 'Join Us',
  'join_description': 'Be part of our mission to solve humanity\'s most pressing challenges through innovation and collaboration.',
  'join_newsletter_title': 'Subscribe to Our Newsletter',
  'join_newsletter_description': 'Stay updated with the latest challenges and innovations',
  'join_email_label': 'Email Address',
  'join_email_placeholder': 'your.email@example.com',
  'join_privacy_text': 'We respect your privacy. You can unsubscribe at any time.',
  'join_contact_title': 'Send Us a Message',
  'join_contact_description': 'Questions, partnerships, or feedback? We\'d love to hear from you.',
  'join_community_title': 'Join Our Growing Community',
  'join_members_label': 'Community Members',
  'join_subscribers_label': 'Newsletter Subscribers',
  'join_continents_label': 'Continents Reached',
  
  // Social Media Section
  'social_title': 'Join the Conversation',
  'social_description': 'Connect with our global community of innovators, partners, and supporters.',
  'social_testimonials_title': 'Testimonials',
  'social_feed_title': 'Social Feed',
  'social_cta_heading': 'Ready to make an impact?',
  'social_cta_paragraph': 'Join our community of innovators, supporters, and partners to help solve humanity\'s most pressing challenges.',
  'social_cta_button': 'Join the Conversation',
  
  // Footer Section
  'footer_brand_name': 'Quantum Alliance',
  'footer_description': 'Bridging innovation gaps by connecting frontier technology with real-world problems across the globe.',
  'footer_quick_links_title': 'Quick Links',
  'footer_about_link': 'About Us',
  'footer_case_studies_link': 'Case Studies',
  'footer_impact_link': 'Impact',
  'footer_news_link': 'News & Events',
  'footer_newsletter_title': 'Stay Updated',
  'footer_newsletter_description': 'Subscribe to our newsletter for the latest challenges, success stories, and events.',
  'footer_email_placeholder': 'Your email address',
  'footer_subscribe_toast': 'Thanks for subscribing! You\'ll receive our latest updates and opportunities.',
  'footer_invalid_email_toast': 'Please enter a valid email address',
  'footer_copyright_text': 'All rights reserved.',
  'footer_privacy_link': 'Privacy Policy',
  'footer_terms_link': 'Terms of Service',
  'footer_cookie_link': 'Cookie Policy',
};

// Type exports for form data
export type CaseStudyFormData = z.infer<typeof caseStudySchema>;
export type ChallengeFormData = z.infer<typeof challengeSchema>;
export type NewsFormData = z.infer<typeof newsSchema>;
export type InnovatorFormData = z.infer<typeof innovatorSchema>;
export type InnovatorFormSchemaData = z.infer<typeof innovatorFormSchema>;
export type InnovatorCreateFormSchemaData = z.infer<typeof innovatorCreateFormSchema>;
export type PartnerFormData = z.infer<typeof partnerSchema>;
export type AdminLoginFormData = z.infer<typeof adminLoginSchema>;
export type FileUploadFormData = z.infer<typeof fileUploadSchema>;
export type ImageUploadFormData = z.infer<typeof imageUploadSchema>;
export type ImageFormData = z.infer<typeof imageFormDataSchema>;
export type ImageMetadataFormData = z.infer<typeof imageMetadataSchema>;
export type ImageCollectionFormData = z.infer<typeof imageCollectionSchema>;
export type BulkImageUploadFormData = z.infer<typeof bulkImageUploadSchema>;
export type ImageVariantFormData = z.infer<typeof imageVariantSchema>;
export type ImageSearchFormData = z.infer<typeof imageSearchSchema>;
export type SiteContentTextFormData = z.infer<typeof siteContentTextSchema>;

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

// Enhanced validation for image file input - simplified
export const validateImageFile = (file: File): { 
  valid: boolean; 
  error?: string; 
  warnings?: string[];
  category?: 'format' | 'size' | 'validation' | 'server_limit';
} => {
  const warnings: string[] = [];
  
  if (!file) {
    return { 
      valid: false, 
      error: 'No file provided',
      category: 'validation'
    };
  }
  
  const isImageType = file.type.startsWith('image/') || 
                     /\.(jpg|jpeg|png|gif|webp|bmp|tiff?|svg|heic|heif|avif|ico|jfif)$/i.test(file.name);
  
  if (!isImageType) {
    return { 
      valid: false, 
      error: `"${file.name}" is not recognized as an image. Supported formats: JPEG, PNG, WebP, GIF, etc.`,
      category: 'format'
    };
  }
  
  // Simplified max size for SimpleInnovatorImageUpload (e.g. 10MB)
  const maxSimpleUploadSize = 10 * 1024 * 1024; 
  
  if (file.size > maxSimpleUploadSize) {
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return { 
      valid: false, 
      error: `Image "${file.name}" is too large (${fileSizeMB}MB). Maximum size for simple upload is 10MB.`,
      category: 'size',
    };
  }
  
  if (file.size < 100) { // 100 bytes minimum
    return { 
      valid: false, 
      error: `Image "${file.name}" is too small (${file.size} bytes) or empty. Please select a valid image file.`,
      category: 'validation'
    };
  }
  
  const fileName = file.name.toLowerCase();
  
  if (fileName.endsWith('.heic') || fileName.endsWith('.heif')) {
    warnings.push('HEIC/HEIF format will be converted to JPEG during upload.');
  }
  
  if (fileName.endsWith('.tiff') || fileName.endsWith('.tif')) {
    warnings.push('TIFF format will be converted to JPEG.');
  }
  
  if (fileName.endsWith('.bmp')) {
    warnings.push('BMP format will be converted to JPEG.');
  }
  
  if (fileName.endsWith('.svg')) {
    warnings.push('SVG format will be rasterized to pixels during processing.');
  }
  
  if (file.size > 5 * 1024 * 1024) { // 5MB warning
    warnings.push('Large image detected. Automatic optimization will be applied.');
  }
  
  return { 
    valid: true, 
    warnings: warnings.length > 0 ? warnings : undefined,
  };
};

// Enhanced image file validation with more detailed checks
export const validateImageFileEnhanced = (file: File): { 
  valid: boolean; 
  error?: string; 
  warnings?: string[];
  metadata?: {
    estimatedDimensions?: { width: number; height: number };
    colorDepth?: number;
    hasTransparency?: boolean;
  };
} => {
  const warnings: string[] = [];
  
  // Basic validation
  const basicValidation = validateImageFile(file);
  if (!basicValidation.valid) {
    return basicValidation;
  }
  
  // Enhanced checks
  const fileName = file.name.toLowerCase();
  
  // Check for optimal formats
  if (fileName.endsWith('.bmp') || fileName.endsWith('.tiff')) {
    warnings.push('Consider converting to JPEG or PNG for better web compatibility');
  }
  
  // Check file size recommendations
  if (file.size > 10 * 1024 * 1024) { // 10MB
    warnings.push('Large file size detected - consider resizing for web use');
  }
  
  // Check for common naming issues
  if (fileName.includes(' ')) {
    warnings.push('File name contains spaces - consider using hyphens or underscores');
  }
  
  if (!/^[a-zA-Z0-9._-]+$/.test(fileName)) {
    warnings.push('File name contains special characters that may cause issues');
  }
  
  return { 
    valid: true, 
    warnings: warnings.length > 0 ? warnings : undefined 
  };
};

// Simplified validation for multiple image files
export const validateImageFiles = (files: File[]): {
  valid: boolean;
  validFiles: File[];
  invalidFiles: Array<{ file: File; error: string; category: string }>;
  warnings: Array<{ file: File; warnings: string[] }>;
  totalSize: number;
  summary: {
    totalFiles: number;
    validCount: number;
    invalidCount: number;
    warningCount: number;
    totalSizeMB: number;
  };
  recommendations: string[];
} => {
  const validFiles: File[] = [];
  const invalidFiles: Array<{ file: File; error: string; category: string }> = [];
  const warnings: Array<{ file: File; warnings: string[] }> = [];
  let totalSize = 0;
  
  // Conservative limits
  const maxFiles = 3; // Reduced for reliability
  const maxTotalSize = 75 * 1024 * 1024; // 75MB total
  
  // Check file count limit
  if (files.length > maxFiles) {
    return {
      valid: false,
      validFiles: [],
      invalidFiles: files.map(file => ({ 
        file, 
        error: `Too many files selected. Maximum ${maxFiles} files allowed per batch. Please select fewer files.`,
        category: 'validation'
      })),
      warnings: [],
      totalSize: 0,
      summary: {
        totalFiles: files.length,
        validCount: 0,
        invalidCount: files.length,
        warningCount: 0,
        totalSizeMB: 0,
      },
      recommendations: [
        `Select maximum ${maxFiles} files at a time`,
        'Upload files in smaller batches for better reliability'
      ]
    };
  }
  
  // Validate each file
  for (const file of files) {
    const validation = validateImageFile(file);
    totalSize += file.size;
    
    if (validation.valid) {
      validFiles.push(file);
      
      if (validation.warnings) {
        warnings.push({ file, warnings: validation.warnings });
      }
    } else {
      invalidFiles.push({ 
        file, 
        error: validation.error || 'Invalid file',
        category: validation.category || 'unknown'
      });
    }
  }
  
  // Generate recommendations
  const recommendations: string[] = [];
  const totalSizeMB = totalSize / (1024 * 1024);
  
  if (totalSize > maxTotalSize) {
    recommendations.push(
      `Total batch size (${totalSizeMB.toFixed(1)}MB) exceeds the ${Math.round(maxTotalSize / (1024 * 1024))}MB limit. Please upload in smaller batches.`
    );
  }
  
  if (invalidFiles.length > 0) {
    const formatErrors = invalidFiles.filter(f => f.category === 'format').length;
    const sizeErrors = invalidFiles.filter(f => f.category === 'size').length;
    
    if (formatErrors > 0) {
      recommendations.push(`${formatErrors} files have unsupported formats. Convert to JPEG, PNG, or WebP.`);
    }
    
    if (sizeErrors > 0) {
      recommendations.push(`${sizeErrors} files are too large. Compress or resize to under 25MB before uploading.`);
    }
  }
  
  if (validFiles.length === 0 && invalidFiles.length > 0) {
    recommendations.push('No valid image files found. Please ensure you are selecting image files in supported formats under 25MB each.');
  }
  
  return {
    valid: validFiles.length > 0,
    validFiles,
    invalidFiles,
    warnings,
    totalSize,
    summary: {
      totalFiles: files.length,
      validCount: validFiles.length,
      invalidCount: invalidFiles.length,
      warningCount: warnings.length,
      totalSizeMB: Number(totalSizeMB.toFixed(1)),
    },
    recommendations,
  };
};

// Validate image metadata
export const validateImageMetadata = (metadata: any): { valid: boolean; error?: string } => {
  try {
    imageMetadataSchema.parse(metadata);
    return { valid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, error: error.errors[0]?.message || 'Invalid metadata' };
    }
    return { valid: false, error: 'Invalid metadata format' };
  }
};

// Validate collection name
export const validateCollectionName = (name: string): { valid: boolean; error?: string } => {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Collection name is required' };
  }
  
  if (name.length > 100) {
    return { valid: false, error: 'Collection name must be less than 100 characters' };
  }
  
  // Check for valid characters (letters, numbers, spaces, hyphens, underscores)
  if (!/^[a-zA-Z0-9\s\-_]+$/.test(name)) {
    return { valid: false, error: 'Collection name contains invalid characters' };
  }
  
  return { valid: true };
};

// Generate suggested alt text based on filename and metadata
export const generateSuggestedAltText = (fileName: string, title?: string, category?: string): string => {
  // Remove extension and clean up filename
  const baseName = fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
  
  if (title) {
    return title;
  }
  
  // Capitalize first letter of each word
  const cleanName = baseName.replace(/\b\w/g, l => l.toUpperCase());
  
  if (category) {
    return `${cleanName} - ${category}`;
  }
  
  return cleanName;
};

// Validate image dimensions for specific use cases
export const validateImageDimensions = (
  width: number, 
  height: number, 
  useCase: 'profile' | 'hero' | 'thumbnail' | 'gallery' | 'logo'
): { valid: boolean; recommendations?: string[] } => {
  const recommendations: string[] = [];
  
  const aspectRatio = width / height;
  
  switch (useCase) {
    case 'profile':
      if (aspectRatio < 0.8 || aspectRatio > 1.2) {
        recommendations.push('Profile images work best with square or near-square aspect ratios');
      }
      if (width < 200 || height < 200) {
        recommendations.push('Profile images should be at least 200x200 pixels');
      }
      break;
      
    case 'hero':
      if (aspectRatio < 1.5 || aspectRatio > 3) {
        recommendations.push('Hero images work best with wide aspect ratios (16:9, 21:9)');
      }
      if (width < 1200) {
        recommendations.push('Hero images should be at least 1200 pixels wide');
      }
      break;
      
    case 'thumbnail':
      if (width > 400 || height > 400) {
        recommendations.push('Thumbnails are typically 400x400 pixels or smaller');
      }
      break;
      
    case 'logo':
      if (aspectRatio < 0.5 || aspectRatio > 4) {
        recommendations.push('Logos should have reasonable aspect ratios for display');
      }
      if (width < 100) {
        recommendations.push('Logos should be at least 100 pixels wide for clarity');
      }
      break;
      
    case 'gallery':
      if (width < 600) {
        recommendations.push('Gallery images should be at least 600 pixels wide');
      }
      break;
  }
  
  return {
    valid: true, // We don't fail validation, just provide recommendations
    recommendations: recommendations.length > 0 ? recommendations : undefined,
  };
};

// Enhanced format recommendations based on use case
export const getFormatRecommendation = (useCase: 'profile' | 'logo' | 'hero' | 'gallery' | 'general' = 'general'): {
  recommended: string[];
  acceptable: string[];
  avoid: string[];
  notes: string[];
} => {
  const recommendations = {
    profile: {
      recommended: ['JPEG', 'PNG', 'WebP'],
      acceptable: ['GIF', 'BMP'],
      avoid: ['TIFF', 'SVG', 'HEIC'],
      notes: [
        'JPEG works best for photos',
        'PNG is ideal for images with transparency',
        'Square aspect ratios work best for profiles'
      ]
    },
    logo: {
      recommended: ['PNG', 'SVG', 'WebP'],
      acceptable: ['JPEG', 'GIF'],
      avoid: ['BMP', 'TIFF', 'HEIC'],
      notes: [
        'PNG preserves transparency for logos with backgrounds',
        'SVG provides crisp scaling but will be rasterized',
        'High contrast images work best'
      ]
    },
    hero: {
      recommended: ['JPEG', 'WebP'],
      acceptable: ['PNG', 'GIF'],
      avoid: ['BMP', 'TIFF', 'SVG'],
      notes: [
        'JPEG provides good compression for large images',
        'WebP offers superior compression and quality',
        'Wide aspect ratios (16:9, 21:9) work best'
      ]
    },
    gallery: {
      recommended: ['JPEG', 'WebP', 'PNG'],
      acceptable: ['GIF', 'BMP'],
      avoid: ['TIFF', 'SVG'],
      notes: [
        'Mixed formats are acceptable',
        'Images will be optimized automatically',
        'Multiple variants will be generated'
      ]
    },
    general: {
      recommended: ['JPEG', 'PNG', 'WebP'],
      acceptable: ['GIF', 'BMP', 'TIFF', 'SVG'],
      avoid: ['HEIC', 'HEIF'],
      notes: [
        'Most formats are supported',
        'Images will be converted for web compatibility',
        'Automatic optimization is applied'
      ]
    }
  };
  
  return recommendations[useCase] || recommendations.general;
};

// Enhanced error message handling - simplified
export const getUploadErrorMessage = (error: string): { 
  message: string; 
  suggestions: string[];
  canRetry: boolean; 
  severity: 'error' | 'warning' | 'info';
  category: string;
  httpStatus?: number;
  adaptiveAction?: 'compress_image' | 'wait_retry' | 'contact_support';
} => {
  const errorLower = error.toLowerCase();
  
  if (errorLower.includes('413') || errorLower.includes('payload too large') || errorLower.includes('request entity too large') || errorLower.includes('file too large')) {
    return {
      message: 'File exceeds server upload limits',
      suggestions: [
        'Compress your image using tools like TinyPNG, Squoosh, or ImageOptim',
        'Resize image dimensions to reduce overall file size',
        'Convert to JPEG format for superior compression',
      ],
      canRetry: true,
      severity: 'error',
      category: 'server_limit',
      httpStatus: 413,
      adaptiveAction: 'compress_image'
    };
  }
  
  if (errorLower.includes('memory usage too high') || errorLower.includes('memory') || errorLower.includes('out of memory') || errorLower.includes('memory pressure')) {
    return {
      message: 'Server memory resources are currently limited',
      suggestions: [
        'Wait 2-3 minutes for server memory to free up',
        'Try uploading a smaller or compressed version of the image',
        'Consider uploading during off-peak hours',
      ],
      canRetry: true,
      severity: 'warning',
      category: 'memory',
      adaptiveAction: 'wait_retry'
    };
  }
  
  if (errorLower.includes('network') || errorLower.includes('connection') || errorLower.includes('fetch') || errorLower.includes('timeout') || errorLower.includes('timed out')) {
    return {
      message: 'Network connection issue detected during upload',
      suggestions: [
        'Check your internet connection stability and speed',
        'Try uploading again - automatic retry will begin shortly',
        'Switch to a more stable network connection if available',
      ],
      canRetry: true,
      severity: 'error',
      category: 'network',
      adaptiveAction: 'wait_retry'
    };
  }
  
  if (errorLower.includes('timeout') || errorLower.includes('timed out') || errorLower.includes('request timeout')) {
    return {
      message: 'Upload process exceeded time limits',
      suggestions: [
        'Check your internet connection speed - slow connections may timeout',
        'Try uploading smaller images or compress before uploading',
        'Ensure stable internet connection throughout upload',
      ],
      canRetry: true,
      severity: 'error',
      category: 'timeout',
      adaptiveAction: 'wait_retry'
    };
  }
  
  if (errorLower.includes('unsupported') || errorLower.includes('format') || errorLower.includes('invalid image') || errorLower.includes('format not supported')) {
    return {
      message: 'Image format is not supported or file may be corrupted',
      suggestions: [
        'Convert to JPEG or PNG format using an image editor',
        'Try re-saving the image in a standard format',
        'Ensure the file is not corrupted by opening it in an image viewer',
      ],
      canRetry: true,
      severity: 'error',
      category: 'format',
      adaptiveAction: 'compress_image'
    };
  }
  
  if (errorLower.includes('too large') || errorLower.includes('file size') || errorLower.includes('exceeds') || errorLower.includes('size limit')) {
    return {
      message: 'Image file size exceeds current upload limits',
      suggestions: [
        'Compress the image using online tools (TinyPNG, Squoosh, ImageOptim)',
        'Resize image dimensions to reduce file size significantly',
        'Convert to JPEG format for better compression ratios',
      ],
      canRetry: true,
      severity: 'error',
      category: 'size',
      adaptiveAction: 'compress_image'
    };
  }
  
  if (errorLower.includes('authentication') || errorLower.includes('token') || errorLower.includes('unauthorized') || errorLower.includes('permission')) {
    return {
      message: 'Authentication failed - session may have expired',
      suggestions: [
        'Log out and log back in to refresh your authentication session',
        'Clear browser cache and cookies, then try again',
        'Contact administrator if you should have access',
      ],
      canRetry: false,
      severity: 'error',
      category: 'auth',
      adaptiveAction: 'contact_support'
    };
  }
  
  if (errorLower.includes('server error') || errorLower.includes('internal error') || errorLower.includes('500') || errorLower.includes('502') || errorLower.includes('503')) {
    return {
      message: 'Server encountered an error processing your upload',
      suggestions: [
        'Try uploading again in a few moments - servers may be temporarily busy',
        'Try uploading a smaller or compressed version of the image',
        'Contact support if the problem persists across multiple attempts',
      ],
      canRetry: true,
      severity: 'error',
      category: 'server',
      adaptiveAction: 'wait_retry'
    };
  }
  
  // Default fallback
  return {
    message: error || 'Upload failed due to an unexpected error',
    suggestions: [
      'Try uploading the image again - temporary issues often resolve themselves',
      'Try converting the image to JPEG or PNG format',
      'Compress or resize the image to reduce potential issues',
      'Contact support if the problem persists with specific error details'
    ],
    canRetry: true,
    severity: 'error',
    category: 'unknown',
    adaptiveAction: 'wait_retry'
  };
};

// Helper function to convert File to base64
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

// Helper function to format file sizes for user display
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Enhanced helper function to detect image type from file signature with better error handling
export const detectImageType = async (file: File): Promise<{
  detectedType: string | null;
  confidence: 'high' | 'medium' | 'low';
  issues: string[];
}> => {
  return new Promise((resolve) => {
    const issues: string[] = [];
    
    if (!file || file.size === 0) {
      resolve({
        detectedType: null,
        confidence: 'low',
        issues: ['File is empty or invalid']
      });
      return;
    }
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        if (!arrayBuffer) {
          resolve({
            detectedType: null,
            confidence: 'low',
            issues: ['Could not read file data']
          });
          return;
        }
        
        const arr = new Uint8Array(arrayBuffer);
        
        if (arr.length < 4) {
          resolve({
            detectedType: file.type || null,
            confidence: 'low',
            issues: ['File too small to detect format reliably']
          });
          return;
        }
        
        // Enhanced file signature detection
        let detectedType: string | null = null;
        let confidence: 'high' | 'medium' | 'low' = 'low';
        
        // JPEG signatures
        if (arr[0] === 0xFF && arr[1] === 0xD8 && arr[2] === 0xFF) {
          detectedType = 'image/jpeg';
          confidence = 'high';
        }
        // PNG signature
        else if (arr[0] === 0x89 && arr[1] === 0x50 && arr[2] === 0x4E && arr[3] === 0x47) {
          detectedType = 'image/png';
          confidence = 'high';
        }
        // GIF signatures
        else if (arr[0] === 0x47 && arr[1] === 0x49 && arr[2] === 0x46) {
          detectedType = 'image/gif';
          confidence = 'high';
        }
        // WebP signature
        else if (arr[0] === 0x52 && arr[1] === 0x49 && arr[2] === 0x46 && arr[3] === 0x46 && 
                 arr.length >= 12 && arr[8] === 0x57 && arr[9] === 0x45 && arr[10] === 0x42 && arr[11] === 0x50) {
          detectedType = 'image/webp';
          confidence = 'high';
        }
        // BMP signature
        else if (arr[0] === 0x42 && arr[1] === 0x4D) {
          detectedType = 'image/bmp';
          confidence = 'high';
        }
        // TIFF signatures (little-endian and big-endian)
        else if ((arr[0] === 0x49 && arr[1] === 0x49 && arr[2] === 0x2A && arr[3] === 0x00) ||
                 (arr[0] === 0x4D && arr[1] === 0x4D && arr[2] === 0x00 && arr[3] === 0x2A)) {
          detectedType = 'image/tiff';
          confidence = 'high';
        }
        // HEIC signature (more complex, check for ftyp box)
        else if (arr.length >= 12 && arr[4] === 0x66 && arr[5] === 0x74 && arr[6] === 0x79 && arr[7] === 0x70) {
          // Check for HEIC/HEIF brand
          const brand = String.fromCharCode(arr[8], arr[9], arr[10], arr[11]);
          if (brand === 'heic' || brand === 'mif1' || brand === 'msf1') {
            detectedType = 'image/heic';
            confidence = 'high';
          }
        }
        // SVG detection (text-based)
        else if (arr.length >= 5) {
          const text = String.fromCharCode(...arr.slice(0, Math.min(100, arr.length)));
          if (text.includes('<svg') || text.includes('<?xml')) {
            detectedType = 'image/svg+xml';
            confidence = 'medium';
          }
        }
        
        // Fallback to file extension if no signature match
        if (!detectedType) {
          const extension = file.name.toLowerCase().split('.').pop();
          const extensionMap: Record<string, string> = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'bmp': 'image/bmp',
            'tiff': 'image/tiff',
            'tif': 'image/tiff',
            'svg': 'image/svg+xml',
            'heic': 'image/heic',
            'heif': 'image/heif',
            'avif': 'image/avif'
          };
          
          if (extension && extensionMap[extension]) {
            detectedType = extensionMap[extension];
            confidence = 'medium';
            issues.push('Format detected from file extension only - file signature not recognized');
          }
        }
        
        // Check for mismatches between declared type and detected type
        if (detectedType && file.type && file.type !== detectedType) {
          issues.push(`File type mismatch: declared as ${file.type}, detected as ${detectedType}`);
          confidence = 'medium';
        }
        
        // Additional validation
        if (!detectedType && file.type) {
          detectedType = file.type;
          confidence = 'low';
          issues.push('Could not verify file format - relying on browser detection');
        }
        
        resolve({
          detectedType,
          confidence,
          issues
        });
        
      } catch (error) {
        resolve({
          detectedType: file.type || null,
          confidence: 'low',
          issues: ['Error analyzing file signature']
        });
      }
    };
    
    reader.onerror = () => {
      resolve({
        detectedType: file.type || null,
        confidence: 'low',
        issues: ['Could not read file for analysis']
      });
    };
    
    // Read first 100 bytes for signature detection
    reader.readAsArrayBuffer(file.slice(0, 100));
  });
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

// Enhanced image categories
export const IMAGE_CATEGORIES = [
  "hero",
  "gallery", 
  "profile",
  "logo",
  "content",
  "thumbnail",
  "background",
  "icon",
  "product",
  "team",
  "event",
  "news",
  "case-study",
  "partner",
  "innovation",
  "challenge",
] as const;

// Common image tags for suggestions
export const COMMON_IMAGE_TAGS = [
  "innovation",
  "technology",
  "team",
  "product",
  "event",
  "conference",
  "award",
  "partnership",
  "research",
  "development",
  "startup",
  "entrepreneur",
  "solution",
  "challenge",
  "success",
  "growth",
  "future",
  "digital",
  "sustainable",
  "global",
  "community",
  "collaboration",
  "breakthrough",
  "impact",
  "transformation",
] as const;

// Image variant types
export const IMAGE_VARIANT_TYPES = [
  "thumbnail",
  "small", 
  "medium",
  "large",
  "original",
] as const;

// Supported image formats (simplified for general use)
export const SUPPORTED_IMAGE_FORMATS = [
  "jpeg",
  "jpg", 
  "png",
  "gif",
  "webp",
  "bmp",
] as const;

export type ImageCategory = typeof IMAGE_CATEGORIES[number];
export type ImageTag = typeof COMMON_IMAGE_TAGS[number];
export type ImageVariantType = typeof IMAGE_VARIANT_TYPES[number];
export type ImageFormat = typeof SUPPORTED_IMAGE_FORMATS[number];
