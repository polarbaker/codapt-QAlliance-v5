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
  image: z.string().min(1, "Image is required"), // Now expects file path, not URL
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
  image: z.string().min(1, "Image is required"), // Now expects file path, not URL
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
  imageUrl: z.string().optional(), // Now expects file path, not URL
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

// Enhanced innovator form schema for admin forms
export const innovatorFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  title: z.string().min(1, "Title is required").max(150, "Title must be less than 150 characters"),
  bio: z.string().min(1, "Bio is required"),
  image: z.string().min(1, "Image is required"), // Now expects file path, not URL
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
  logoUrl: z.string().min(1, "Logo is required"), // Now expects file path, not URL
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

// Enhanced image upload validation schema for admin forms - updated with conservative limits
export const adminImageUploadSchema = z.object({
  fileName: z.string().min(1, "File name is required"),
  fileType: z.string().refine(
    (type) => type.startsWith('image/'),
    "File must be an image"
  ),
  fileSize: z.number().positive("File size must be positive").max(
    25 * 1024 * 1024, // 25MB max (reduced from 50MB)
    "File size must be less than 25MB for optimal processing"
  ),
  fileContent: z.string().min(1, "File content is required"), // base64 encoded
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

// Bulk image upload validation schema with conservative limits
export const bulkImageUploadSchema = z.object({
  images: z.array(z.object({
    fileName: z.string().min(1, "File name is required"),
    fileType: z.string().refine(
      (type) => type.startsWith('image/'),
      "File must be an image"
    ),
    fileContent: z.string().min(1, "File content is required"),
    ...imageMetadataSchema.shape,
  })).min(1, "At least one image is required").max(10, "Maximum 10 images per bulk upload for optimal memory usage"), // Reduced from 20
  generateVariants: z.boolean().default(true),
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

// Image processing job schema
export const imageProcessingJobSchema = z.object({
  jobType: z.enum(['resize', 'convert', 'optimize', 'generate_variants', 'bulk_process']),
  priority: z.number().min(0).max(10).default(0),
  inputData: z.record(z.any()), // Flexible input data as JSON
});

// Type exports for form data
export type CaseStudyFormData = z.infer<typeof caseStudySchema>;
export type ChallengeFormData = z.infer<typeof challengeSchema>;
export type NewsFormData = z.infer<typeof newsSchema>;
export type InnovatorFormData = z.infer<typeof innovatorSchema>;
export type InnovatorFormSchemaData = z.infer<typeof innovatorFormSchema>;
export type PartnerFormData = z.infer<typeof partnerSchema>;
export type AdminLoginFormData = z.infer<typeof adminLoginSchema>;
export type FileUploadFormData = z.infer<typeof fileUploadSchema>;
export type ImageUploadFormData = z.infer<typeof imageUploadSchema>;
export type AdminImageUploadFormData = z.infer<typeof adminImageUploadSchema>;
export type ImageFormData = z.infer<typeof imageFormDataSchema>;
export type ImageMetadataFormData = z.infer<typeof imageMetadataSchema>;
export type ImageCollectionFormData = z.infer<typeof imageCollectionSchema>;
export type BulkImageUploadFormData = z.infer<typeof bulkImageUploadSchema>;
export type ImageVariantFormData = z.infer<typeof imageVariantSchema>;
export type ImageSearchFormData = z.infer<typeof imageSearchSchema>;
export type ImageProcessingJobFormData = z.infer<typeof imageProcessingJobSchema>;

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

// Enhanced validation for image file input with more permissive rules and better UX
export const validateImageFile = (file: File): { 
  valid: boolean; 
  error?: string; 
  warnings?: string[];
  category?: 'format' | 'size' | 'validation' | 'compatibility';
  severity?: 'error' | 'warning' | 'info';
} => {
  const warnings: string[] = [];
  
  // Check if it's actually a file
  if (!file) {
    return { 
      valid: false, 
      error: 'No file provided',
      category: 'validation',
      severity: 'error'
    };
  }
  
  // Enhanced file type checking with better error messages and more permissive rules
  const isImageType = file.type.startsWith('image/') || 
                     /\.(jpg|jpeg|png|gif|webp|bmp|tiff?|svg|avif|heic|heif|ico|jfif)$/i.test(file.name);
  
  if (!isImageType) {
    return { 
      valid: false, 
      error: `"${file.name}" is not recognized as an image. Supported formats: JPEG, PNG, WebP, GIF, BMP, TIFF, SVG, AVIF, HEIC, HEIF, ICO`,
      category: 'format',
      severity: 'error'
    };
  }
  
  // More reasonable file size limit for production use (reduced from 100MB to 25MB for memory management)
  const maxSize = 25 * 1024 * 1024; // 25MB
  if (file.size > maxSize) {
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(0);
    
    return { 
      valid: false, 
      error: `Image "${file.name}" is too large (${fileSizeMB}MB). Maximum size is ${maxSizeMB}MB for optimal processing. Please compress or resize your image.`,
      category: 'size',
      severity: 'error'
    };
  }
  
  // Check for minimum file size (avoid empty or corrupted files)
  if (file.size < 100) {
    return { 
      valid: false, 
      error: `Image "${file.name}" is too small (${file.size} bytes) or empty. Please select a valid image file.`,
      category: 'validation',
      severity: 'error'
    };
  }
  
  // More permissive file name validation
  const fileName = file.name.toLowerCase();
  
  // Check for problematic file extensions with helpful guidance
  if (fileName.endsWith('.heic') || fileName.endsWith('.heif')) {
    warnings.push('HEIC/HEIF format will be converted during upload. For best results, consider converting to JPEG or PNG first.');
  }
  
  if (fileName.endsWith('.tiff') || fileName.endsWith('.tif')) {
    warnings.push('TIFF format will be converted to JPEG for web compatibility.');
  }
  
  if (fileName.endsWith('.bmp')) {
    warnings.push('BMP format will be converted to a more web-friendly format.');
  }
  
  if (fileName.endsWith('.svg')) {
    warnings.push('SVG format will be rasterized (converted to pixels) during processing.');
  }
  
  if (fileName.endsWith('.avif')) {
    warnings.push('AVIF format support is experimental. Consider using WebP or JPEG for maximum compatibility.');
  }
  
  // File size warnings with helpful recommendations (updated thresholds)
  if (file.size > 15 * 1024 * 1024) { // 15MB
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    warnings.push(`Large file size (${sizeMB}MB) detected. Processing may take longer and the image will be optimized for web use.`);
  } else if (file.size > 10 * 1024 * 1024) { // 10MB
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    warnings.push(`File size (${sizeMB}MB) is large. The image will be optimized during upload.`);
  }
  
  // More permissive file name validation (removed overly strict checks)
  // Only warn about potential issues, don't fail validation
  
  // Very long file names (warning only)
  if (file.name.length > 200) {
    warnings.push('File name is very long. Consider using a shorter, more descriptive name.');
  }
  
  // File extension validation (warning only)
  if (!fileName.includes('.')) {
    warnings.push('File has no extension. Format will be detected from file content.');
  }
  
  // Multiple extension check (warning only)
  const extensionMatches = fileName.match(/\.[^.]+/g);
  if (extensionMatches && extensionMatches.length > 1) {
    warnings.push('File has multiple extensions. Only the last extension will be used for format detection.');
  }
  
  // Check for potentially problematic file names (warning only, more permissive)
  const problematicNames = ['con', 'prn', 'aux', 'nul'];
  const baseName = fileName.split('.')[0];
  if (problematicNames.includes(baseName)) {
    warnings.push('File name may cause issues on some systems. Consider renaming the file.');
  }
  
  // Check for non-ASCII characters (warning only, not an error)
  if (!/^[a-zA-Z0-9._\-\s()[\]{}]+$/.test(fileName)) {
    warnings.push('File name contains special characters. These will be preserved but may cause issues in some contexts.');
  }
  
  return { 
    valid: true, 
    warnings: warnings.length > 0 ? warnings : undefined,
    category: warnings.length > 0 ? 'compatibility' : undefined,
    severity: warnings.length > 0 ? 'warning' : 'info'
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

// Enhanced validation for multiple image files with more conservative limits for memory management
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
    largeFileCount: number;
    formatIssueCount: number;
  };
  recommendations: string[];
} => {
  const validFiles: File[] = [];
  const invalidFiles: Array<{ file: File; error: string; category: string }> = [];
  const warnings: Array<{ file: File; warnings: string[] }> = [];
  let totalSize = 0;
  let largeFileCount = 0;
  let formatIssueCount = 0;
  
  // More conservative limits for production and memory management
  const maxFiles = 10; // Reduced from 20 for better memory management
  const maxTotalSize = 100 * 1024 * 1024; // Reduced to 100MB total for batch
  const largeFileThreshold = 10 * 1024 * 1024; // 10MB per file (reduced from 20MB)
  
  // Check overall file count limit
  if (files.length > maxFiles) {
    return {
      valid: false,
      validFiles: [],
      invalidFiles: files.map(file => ({ 
        file, 
        error: `Too many files selected. Maximum ${maxFiles} files allowed per batch for optimal processing, but ${files.length} were selected. Please select fewer files or upload in multiple smaller batches.`,
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
        largeFileCount: 0,
        formatIssueCount: 0,
      },
      recommendations: [
        `Select maximum ${maxFiles} files at a time for optimal memory usage`,
        'Consider uploading files in smaller batches',
        'Large batches may fail due to memory constraints'
      ]
    };
  }
  
  // Validate each file with enhanced categorization
  for (const file of files) {
    const validation = validateImageFile(file);
    totalSize += file.size;
    
    if (validation.valid) {
      validFiles.push(file);
      
      if (validation.warnings) {
        warnings.push({ file, warnings: validation.warnings });
        
        // Count specific issue types
        if (validation.category === 'compatibility') {
          formatIssueCount++;
        }
      }
      
      // Count large files
      if (file.size > largeFileThreshold) {
        largeFileCount++;
      }
      
    } else {
      invalidFiles.push({ 
        file, 
        error: validation.error || 'Invalid file',
        category: validation.category || 'unknown'
      });
    }
  }
  
  // Generate recommendations based on analysis
  const recommendations: string[] = [];
  const totalSizeMB = totalSize / (1024 * 1024);
  
  if (totalSize > maxTotalSize) {
    recommendations.push(
      `Total batch size (${totalSizeMB.toFixed(1)}MB) exceeds the ${maxTotalSize / (1024 * 1024)}MB limit. Please upload in smaller batches to prevent memory issues.`
    );
  }
  
  if (largeFileCount > 0) {
    recommendations.push(
      `${largeFileCount} large files detected. These will be optimized during upload but may take longer to process and could fail if system memory is low.`
    );
  }
  
  if (formatIssueCount > 0) {
    recommendations.push(
      `${formatIssueCount} files have format compatibility notes. Check warnings for details.`
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
  
  if (validFiles.length > 5) {
    recommendations.push('Batch of 5+ images detected. Upload may take several minutes and could fail if system memory is low.');
  }
  
  if (validFiles.length === 0 && invalidFiles.length > 0) {
    recommendations.push('No valid image files found. Please ensure you are selecting image files in supported formats under 25MB each.');
  }
  
  // Performance recommendations for memory management
  if (validFiles.length > 7) {
    recommendations.push('Consider uploading in batches of 7 or fewer for optimal performance and to prevent memory issues.');
  }
  
  if (totalSizeMB > 50) {
    recommendations.push('Large total size detected. Consider compressing images or uploading in smaller batches to prevent memory-related failures.');
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
      largeFileCount,
      formatIssueCount,
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

// Enhanced error message handling with more actionable guidance and better categorization
export const getUploadErrorMessage = (error: string): { 
  message: string; 
  suggestions: string[];
  canRetry: boolean; 
  severity: 'error' | 'warning' | 'info';
  category: 'format' | 'size' | 'network' | 'auth' | 'processing' | 'storage' | 'validation' | 'system' | 'server_memory' | 'timeout' | 'conversion' | 'permissions';
} => {
  const errorLower = error.toLowerCase();
  
  // Handle enhanced server-side memory errors with specific guidance
  if (errorLower.includes('system memory usage is too high') || errorLower.includes('memory usage is too high')) {
    const memoryMatch = errorLower.match(/(\d+\.?\d*)%/);
    const memoryUsage = memoryMatch ? memoryMatch[1] : 'high';
    const rssMatch = errorLower.match(/(\d+\.?\d*)mb rss/);
    const rssUsage = rssMatch ? rssMatch[1] : '';
    
    return {
      message: `Server memory usage is too high (${memoryUsage}%${rssUsage ? `, ${rssUsage}MB RSS` : ''}) to process this image safely`,
      suggestions: [
        'Wait 2-3 minutes for server resources to free up, then try again',
        'Reduce image size to under 10MB before uploading',
        'Resize image dimensions to 1920x1920 pixels or smaller',
        'Convert to JPEG format for better compression',
        'Try uploading during off-peak hours (early morning or late evening)',
        'Upload images one at a time instead of in batches'
      ],
      canRetry: true,
      severity: 'warning',
      category: 'server_memory'
    };
  }
  
  // Handle ProcessingError types with enhanced guidance
  if (errorLower.includes('processingerror') || errorLower.includes('processing error')) {
    if (errorLower.includes('sharp') || errorLower.includes('image processing engine')) {
      return {
        message: 'Image processing engine failed to handle this file',
        suggestions: [
          'Convert the image to JPEG or PNG format using an image editor',
          'Re-save the image with standard settings (no special color profiles)',
          'Try opening the image in an image viewer first to verify it works',
          'Remove any embedded metadata or color profiles',
          'If from a camera, try exporting in a different format'
        ],
        canRetry: true,
        severity: 'error',
        category: 'processing'
      };
    }
    
    if (errorLower.includes('timeout') || errorLower.includes('took too long')) {
      return {
        message: 'Image processing timed out due to complexity or size',
        suggestions: [
          'Reduce image file size to under 10MB',
          'Resize image dimensions to maximum 2048x2048 pixels',
          'Convert complex formats (TIFF, BMP, HEIC) to JPEG first',
          'Try uploading during off-peak hours when server load is lower',
          'Split large batches into individual uploads'
        ],
        canRetry: true,
        severity: 'error',
        category: 'timeout'
      };
    }
    
    if (errorLower.includes('too large for the system to process')) {
      const sizeMatch = errorLower.match(/(\d+\.?\d*)mb/);
      const fileSize = sizeMatch ? sizeMatch[1] : '';
      
      return {
        message: `Image${fileSize ? ` (${fileSize}MB)` : ''} is too large for the system to process safely`,
        suggestions: [
          'Reduce image dimensions to 1920x1920 pixels or smaller',
          'Compress the image file size to under 15MB',
          'Convert to JPEG format for better compression',
          'Use online compression tools like TinyPNG, Squoosh, or ImageOptim',
          'Upload one image at a time instead of batches'
        ],
        canRetry: true,
        severity: 'error',
        category: 'size'
      };
    }
    
    if (errorLower.includes('conversion') || errorLower.includes('convert')) {
      return {
        message: 'Unable to convert image to web-compatible format',
        suggestions: [
          'Manually convert to JPEG or PNG format before uploading',
          'Try re-saving the image in a different image editor',
          'Remove any special color profiles or embedded metadata',
          'If using HEIC/HEIF, convert to JPEG using your device\'s photo app',
          'Try uploading the original source image if this is a processed version'
        ],
        canRetry: true,
        severity: 'error',
        category: 'conversion'
      };
    }
  }
  
  // Handle enhanced StorageError types
  if (errorLower.includes('not found in storage') || errorLower.includes('nosuchkey')) {
    return {
      message: 'Image was not found in storage after upload',
      suggestions: [
        'Try uploading the image again - this may be a temporary storage issue',
        'Check your internet connection stability',
        'Refresh the page and retry the upload',
        'If this persists, contact support with the file name'
      ],
      canRetry: true,
      severity: 'error',
      category: 'storage'
    };
  }
  
  if (errorLower.includes('access denied') || errorLower.includes('forbidden')) {
    return {
      message: 'Storage access denied - insufficient permissions',
      suggestions: [
        'Check if you have proper upload permissions',
        'Try logging out and back in to refresh your session',
        'Contact administrator if you should have access',
        'Clear browser cache and cookies, then try again'
      ],
      canRetry: false,
      severity: 'error',
      category: 'permissions'
    };
  }
  
  if (errorLower.includes('storage system') && errorLower.includes('temporarily unavailable')) {
    return {
      message: 'Storage system is temporarily unavailable',
      suggestions: [
        'Wait a few minutes and try uploading again',
        'Check your internet connection',
        'Try uploading a smaller file first to test connectivity',
        'Contact support if the problem persists for more than 15 minutes'
      ],
      canRetry: true,
      severity: 'warning',
      category: 'storage'
    };
  }
  
  // Handle DatabaseError types with clearer guidance
  if (errorLower.includes('databaseerror') || errorLower.includes('database error')) {
    if (errorLower.includes('constraint') || errorLower.includes('unique')) {
      return {
        message: 'A file with this name already exists',
        suggestions: [
          'The system will automatically generate a unique name - try uploading again',
          'Rename the file before uploading if you prefer a specific name',
          'Check if you already uploaded this image previously',
          'This is usually resolved automatically on retry'
        ],
        canRetry: true,
        severity: 'warning',
        category: 'validation'
      };
    }
    
    return {
      message: 'Database temporarily unavailable',
      suggestions: [
        'Try uploading again in a few moments',
        'Check your internet connection',
        'Refresh the page and try logging in again',
        'Contact support if the problem persists'
      ],
      canRetry: true,
      severity: 'error',
      category: 'system'
    };
  }
  
  // Enhanced HEIC/HEIF handling with device-specific guidance
  if (errorLower.includes('heic') || errorLower.includes('heif')) {
    return {
      message: 'HEIC/HEIF format needs to be converted before upload',
      suggestions: [
        'On iPhone/iPad: Settings > Camera > Formats > Most Compatible',
        'Use Photos app: Select image > Share > Save to Files > Options > JPEG',
        'On Mac: Open in Preview > File > Export As > JPEG',
        'Use online converters like CloudConvert or Convertio',
        'Take new photos in JPEG format for easier uploading'
      ],
      canRetry: true,
      severity: 'warning',
      category: 'format'
    };
  }
  
  // Enhanced format and corruption errors
  if (errorLower.includes('unsupported') || errorLower.includes('format')) {
    if (errorLower.includes('svg')) {
      return {
        message: 'SVG files need to be converted to raster format',
        suggestions: [
          'Open SVG in image editor and export as PNG or JPEG',
          'Use online SVG to PNG converters',
          'In Illustrator/Inkscape: File > Export As > PNG with high resolution',
          'Take a screenshot of the SVG as an alternative'
        ],
        canRetry: true,
        severity: 'warning',
        category: 'format'
      };
    }
    
    return {
      message: 'Image format is not supported or file is corrupted',
      suggestions: [
        'Use supported formats: JPEG, PNG, WebP, GIF, BMP, or TIFF',
        'Re-save the image using an image editor (GIMP, Photoshop, etc.)',
        'Try converting to JPEG or PNG format',
        'Check if the file downloaded completely without errors',
        'Try opening the image in multiple programs to verify it works'
      ],
      canRetry: true,
      severity: 'error',
      category: 'format'
    };
  }
  
  // Enhanced file corruption handling
  if (errorLower.includes('corrupted') || errorLower.includes('invalid') || errorLower.includes('premature end')) {
    return {
      message: 'Image file appears to be corrupted or incomplete',
      suggestions: [
        'Try re-downloading the original image file',
        'Re-save the image using an image editing program',
        'Check if the image opens correctly in multiple image viewers',
        'Try a different image file from the same source',
        'If from email/messaging, ask for the file to be sent again'
      ],
      canRetry: true,
      severity: 'error',
      category: 'validation'
    };
  }
  
  // Enhanced size and dimension errors
  if (errorLower.includes('too large') || errorLower.includes('file size')) {
    const sizeMB = errorLower.match(/(\d+(?:\.\d+)?)\s*mb/i);
    const currentSize = sizeMB ? sizeMB[1] : '';
    
    return {
      message: `Image file is too large${currentSize ? ` (${currentSize}MB)` : ''} for upload`,
      suggestions: [
        'Compress the image using online tools (TinyPNG, Squoosh, ImageOptim)',
        'Reduce image quality/compression in an image editor',
        'Resize image dimensions to reduce file size',
        'Convert to JPEG format for better compression',
        'For photos: Use "Export for Web" option in image editors'
      ],
      canRetry: true,
      severity: 'error',
      category: 'size'
    };
  }
  
  if (errorLower.includes('dimensions') && (errorLower.includes('large') || errorLower.includes('too big'))) {
    return {
      message: 'Image dimensions are too large for processing',
      suggestions: [
        'Resize image to maximum 4096x4096 pixels for large images',
        'For web use, 1920x1920 pixels is usually sufficient',
        'Use image editing software to reduce dimensions',
        'Consider creating multiple smaller images if needed',
        'Many online tools can resize images automatically'
      ],
      canRetry: true,
      severity: 'error',
      category: 'size'
    };
  }
  
  // Enhanced authentication errors
  if (errorLower.includes('authentication') || errorLower.includes('unauthorized') || errorLower.includes('token')) {
    return {
      message: 'Authentication failed - please verify your access',
      suggestions: [
        'Log out and log back in to refresh your session',
        'Check if your admin permissions are still active',
        'Clear browser cache and cookies, then try again',
        'Contact administrator if you should have access',
        'Try refreshing the page before uploading'
      ],
      canRetry: false,
      severity: 'error',
      category: 'auth'
    };
  }
  
  // Enhanced network and connection errors
  if (errorLower.includes('network') || errorLower.includes('connection') || errorLower.includes('fetch')) {
    return {
      message: 'Network connection issue during upload',
      suggestions: [
        'Check your internet connection stability',
        'Try uploading smaller files to test connectivity',
        'Disable VPN or proxy temporarily if using one',
        'Try using a different browser or incognito mode',
        'Wait a moment and try again'
      ],
      canRetry: true,
      severity: 'error',
      category: 'network'
    };
  }
  
  // Enhanced system resource errors
  if (errorLower.includes('memory') && errorLower.includes('critically low')) {
    return {
      message: 'System resources temporarily unavailable',
      suggestions: [
        'Try uploading fewer images at once (maximum 3-5)',
        'Wait a few minutes for system resources to free up',
        'Upload smaller image files (under 10MB each)',
        'Try during off-peak hours',
        'Contact support if this happens frequently'
      ],
      canRetry: true,
      severity: 'warning',
      category: 'system'
    };
  }
  
  // Enhanced base64 and data transmission errors
  if (errorLower.includes('base64') || errorLower.includes('invalid image data') || errorLower.includes('transmission error')) {
    return {
      message: 'Image data transmission error occurred',
      suggestions: [
        'Try uploading the image again',
        'Refresh the page and retry the upload',
        'Try using a different browser',
        'Check your internet connection stability',
        'Clear browser cache and try again'
      ],
      canRetry: true,
      severity: 'error',
      category: 'network'
    };
  }
  
  // Enhanced timeout errors
  if (errorLower.includes('timeout') || errorLower.includes('timed out')) {
    return {
      message: 'Upload process timed out',
      suggestions: [
        'Try uploading smaller image files (under 10MB)',
        'Check your internet connection speed',
        'Try uploading during off-peak hours',
        'Reduce image dimensions before uploading',
        'Upload images one at a time instead of batches'
      ],
      canRetry: true,
      severity: 'error',
      category: 'timeout'
    };
  }
  
  // Default fallback with enhanced guidance
  return {
    message: error || 'Upload failed due to an unexpected error',
    suggestions: [
      'Try uploading the image again',
      'Try converting the image to JPEG or PNG format',
      'Refresh the page and retry',
      'Check if the image file is valid and not corrupted',
      'Contact support if the problem persists'
    ],
    canRetry: true,
    severity: 'error',
    category: 'system'
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

// Enhanced supported image formats list
export const SUPPORTED_IMAGE_FORMATS = [
  "jpeg",
  "jpg", 
  "png",
  "gif",
  "webp",
  "bmp",
  "tiff",
  "tif",
  "svg",
  "avif",
  "heic",
  "heif",
  "ico", // Added icon format
  "jfif", // Added JFIF variant of JPEG
] as const;

export type ImageCategory = typeof IMAGE_CATEGORIES[number];
export type ImageTag = typeof COMMON_IMAGE_TAGS[number];
export type ImageVariantType = typeof IMAGE_VARIANT_TYPES[number];
export type ImageFormat = typeof SUPPORTED_IMAGE_FORMATS[number];
