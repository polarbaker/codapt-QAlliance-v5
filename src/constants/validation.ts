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
export type ImageFormData = z.infer<typeof imageFormDataSchema>;
export type ImageMetadataFormData = z.infer<typeof imageMetadataSchema>;
export type ImageCollectionFormData = z.infer<typeof imageCollectionSchema>;
export type BulkImageUploadFormData = z.infer<typeof bulkImageUploadSchema>;
export type ImageVariantFormData = z.infer<typeof imageVariantSchema>;
export type ImageSearchFormData = z.infer<typeof imageSearchSchema>;

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
