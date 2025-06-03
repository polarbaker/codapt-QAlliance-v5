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

// Enhanced image upload validation schema for admin forms - now accepts any image type and size
export const adminImageUploadSchema = z.object({
  fileName: z.string().min(1, "File name is required"),
  fileType: z.string().refine(
    (type) => type.startsWith('image/'),
    "File must be an image"
  ),
  fileSize: z.number().positive("File size must be positive").max(
    50 * 1024 * 1024, // 50MB max
    "File size must be less than 50MB"
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

// Bulk image upload validation schema
export const bulkImageUploadSchema = z.object({
  images: z.array(z.object({
    fileName: z.string().min(1, "File name is required"),
    fileType: z.string().refine(
      (type) => type.startsWith('image/'),
      "File must be an image"
    ),
    fileContent: z.string().min(1, "File content is required"),
    ...imageMetadataSchema.shape,
  })).min(1, "At least one image is required").max(20, "Maximum 20 images per bulk upload"),
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

// Enhanced validation for image file input - more permissive with better error messages
export const validateImageFile = (file: File): { valid: boolean; error?: string; warnings?: string[] } => {
  const warnings: string[] = [];
  
  // Check if it's actually a file
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }
  
  // Check if it's an image file (more permissive check)
  const isImageType = file.type.startsWith('image/') || 
                     /\.(jpg|jpeg|png|gif|webp|bmp|tiff?|svg|avif|heic|heif)$/i.test(file.name);
  
  if (!isImageType) {
    return { 
      valid: false, 
      error: 'File must be an image. Supported formats: JPEG, PNG, WebP, GIF, BMP, TIFF, SVG, AVIF, HEIC, HEIF' 
    };
  }
  
  // More generous file size limit (100MB instead of 50MB)
  const maxSize = 100 * 1024 * 1024; // 100MB
  if (file.size > maxSize) {
    return { 
      valid: false, 
      error: `Image file is too large (${formatFileSize(file.size)}). Maximum size is ${formatFileSize(maxSize)}. Please resize or compress your image.` 
    };
  }
  
  // Check for minimum file size (avoid empty files)
  if (file.size < 100) {
    return { 
      valid: false, 
      error: 'Image file is too small or empty. Please select a valid image file.' 
    };
  }
  
  // Check file name for potential issues
  const fileName = file.name.toLowerCase();
  
  // Warn about potentially problematic formats but don't reject them
  if (fileName.endsWith('.heic') || fileName.endsWith('.heif')) {
    warnings.push('HEIC/HEIF format may require conversion. If upload fails, please convert to JPEG or PNG first.');
  }
  
  if (fileName.endsWith('.tiff') || fileName.endsWith('.tif')) {
    warnings.push('TIFF format will be converted to JPEG/PNG for web compatibility.');
  }
  
  if (fileName.endsWith('.bmp')) {
    warnings.push('BMP format will be converted to a more web-friendly format.');
  }
  
  if (fileName.endsWith('.svg')) {
    warnings.push('SVG format will be rasterized during processing.');
  }
  
  // Check for large file size warnings
  if (file.size > 10 * 1024 * 1024) { // 10MB
    warnings.push(`Large file size (${formatFileSize(file.size)}) detected. Processing may take longer and the image will be optimized.`);
  }
  
  // Check for problematic file names
  if (fileName.includes(' ')) {
    warnings.push('File name contains spaces. Consider using hyphens or underscores for better compatibility.');
  }
  
  if (!/^[a-zA-Z0-9._-]+$/.test(fileName)) {
    warnings.push('File name contains special characters that may cause issues.');
  }
  
  // Check for very long file names
  if (file.name.length > 100) {
    warnings.push('File name is very long. Consider using a shorter name.');
  }
  
  return { 
    valid: true, 
    warnings: warnings.length > 0 ? warnings : undefined 
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

// Enhanced validation for multiple image files with better error categorization
export const validateImageFiles = (files: File[]): {
  valid: boolean;
  validFiles: File[];
  invalidFiles: Array<{ file: File; error: string }>;
  warnings: string[];
  totalSize: number;
  summary: {
    totalFiles: number;
    validCount: number;
    invalidCount: number;
    warningCount: number;
  };
} => {
  const validFiles: File[] = [];
  const invalidFiles: Array<{ file: File; error: string }> = [];
  const warnings: string[] = [];
  let totalSize = 0;
  let warningCount = 0;
  
  // Check overall limits (increased from 20 to 50)
  if (files.length > 50) {
    return {
      valid: false,
      validFiles: [],
      invalidFiles: files.map(file => ({ 
        file, 
        error: `Too many files selected. Maximum 50 files allowed, but ${files.length} were selected.` 
      })),
      warnings: [],
      totalSize: 0,
      summary: {
        totalFiles: files.length,
        validCount: 0,
        invalidCount: files.length,
        warningCount: 0,
      },
    };
  }
  
  // Validate each file
  for (const file of files) {
    const validation = validateImageFile(file);
    
    if (validation.valid) {
      validFiles.push(file);
      totalSize += file.size;
      
      if (validation.warnings) {
        validation.warnings.forEach(warning => {
          warnings.push(`${file.name}: ${warning}`);
        });
        warningCount++;
      }
    } else {
      invalidFiles.push({ file, error: validation.error || 'Invalid file' });
    }
  }
  
  // Check total size (increased limit)
  const maxTotalSize = 500 * 1024 * 1024; // 500MB total (increased from 100MB)
  if (totalSize > maxTotalSize) {
    warnings.push(
      `Total file size (${formatFileSize(totalSize)}) exceeds recommended limit (${formatFileSize(maxTotalSize)}). ` +
      'Consider uploading files in smaller batches or reducing individual file sizes.'
    );
  }
  
  // Provide helpful summary
  if (validFiles.length === 0 && invalidFiles.length > 0) {
    warnings.push(
      'No valid image files found. Please ensure you are selecting image files in supported formats.'
    );
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
      warningCount,
    },
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

// Get user-friendly error messages for common upload issues
export const getUploadErrorMessage = (error: string): { 
  message: string; 
  suggestions: string[];
  canRetry: boolean; 
} => {
  const errorLower = error.toLowerCase();
  
  if (errorLower.includes('too large') || errorLower.includes('file size')) {
    return {
      message: 'Your image file is too large to upload.',
      suggestions: [
        'Resize your image to smaller dimensions',
        'Compress the image using an image editor',
        'Convert to JPEG format for better compression',
        'Try uploading a different image'
      ],
      canRetry: true,
    };
  }
  
  if (errorLower.includes('unsupported') || errorLower.includes('format')) {
    return {
      message: 'The image format is not supported or the file is corrupted.',
      suggestions: [
        'Convert your image to JPEG, PNG, or WebP format',
        'Try saving the image from an image editor',
        'Ensure the file is not corrupted',
        'Try a different image file'
      ],
      canRetry: true,
    };
  }
  
  if (errorLower.includes('heic') || errorLower.includes('heif')) {
    return {
      message: 'HEIC/HEIF format needs to be converted before uploading.',
      suggestions: [
        'Convert the image to JPEG or PNG format',
        'Use an online converter or image editing software',
        'Take a screenshot of the image as an alternative',
        'Use a different image in a supported format'
      ],
      canRetry: true,
    };
  }
  
  if (errorLower.includes('corrupted') || errorLower.includes('invalid')) {
    return {
      message: 'The image file appears to be corrupted or invalid.',
      suggestions: [
        'Try re-saving the image from an image editor',
        'Download the original image again if possible',
        'Try a different image file',
        'Check if the file opens correctly in an image viewer'
      ],
      canRetry: true,
    };
  }
  
  if (errorLower.includes('network') || errorLower.includes('connection')) {
    return {
      message: 'Upload failed due to a network issue.',
      suggestions: [
        'Check your internet connection',
        'Try uploading again',
        'Try uploading a smaller image first',
        'Refresh the page and try again'
      ],
      canRetry: true,
    };
  }
  
  // Default error handling
  return {
    message: 'An unexpected error occurred during upload.',
    suggestions: [
      'Try uploading the image again',
      'Try a different image file',
      'Refresh the page and try again',
      'Contact support if the problem persists'
    ],
    canRetry: true,
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

// Helper function to detect image type from file signature (magic bytes)
export const detectImageType = async (file: File): Promise<string | null> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const arr = new Uint8Array(e.target?.result as ArrayBuffer);
      
      // Check file signatures
      if (arr.length >= 4) {
        // JPEG
        if (arr[0] === 0xFF && arr[1] === 0xD8 && arr[2] === 0xFF) {
          resolve('image/jpeg');
          return;
        }
        // PNG
        if (arr[0] === 0x89 && arr[1] === 0x50 && arr[2] === 0x4E && arr[3] === 0x47) {
          resolve('image/png');
          return;
        }
        // GIF
        if (arr[0] === 0x47 && arr[1] === 0x49 && arr[2] === 0x46) {
          resolve('image/gif');
          return;
        }
        // WebP
        if (arr[0] === 0x52 && arr[1] === 0x49 && arr[2] === 0x46 && arr[3] === 0x46) {
          resolve('image/webp');
          return;
        }
        // BMP
        if (arr[0] === 0x42 && arr[1] === 0x4D) {
          resolve('image/bmp');
          return;
        }
      }
      
      resolve(null);
    };
    reader.onerror = () => resolve(null);
    reader.readAsArrayBuffer(file.slice(0, 8));
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
