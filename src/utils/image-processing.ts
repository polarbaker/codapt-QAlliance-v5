/**
 * Comprehensive image processing utilities with robust error handling
 * and TypeScript type safety.
 */
import '../polyfill'; // Ensure File and Blob are available in all environments
import { FileOperationError, validateFileSize, validateFileType, readFileAsDataURL, withFileErrorHandling } from './file-error-handling';
import { isDefined, assertDefined } from './type-safety';

/**
 * Image processing options
 */
export interface ImageProcessingOptions {
  maxSizeInBytes?: number;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
  allowedTypes?: string[];
  preserveTransparency?: boolean;
}

/**
 * Result of image processing
 */
export interface ProcessedImage {
  dataUrl: string;
  file: File;
  width: number;
  height: number;
  originalSize: number;
  processedSize: number;
  compressionRatio: number;
  mimeType: string;
  fileName: string;
}

/**
 * Default image processing options
 */
const DEFAULT_OPTIONS: ImageProcessingOptions = {
  maxSizeInBytes: 5 * 1024 * 1024, // 5MB
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 0.85,
  format: 'jpeg',
  allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  preserveTransparency: false
};

/**
 * Process an image with validation, resizing, and optimization
 */
export async function processImage(
  imageFile: File | Blob,
  fileName = 'image.jpg',
  options: ImageProcessingOptions = {}
): Promise<ProcessedImage> {
  const settings = { ...DEFAULT_OPTIONS, ...options };
  const originalSize = imageFile.size;
  
  return withFileErrorHandling(async () => {
    // Validate file
    if (settings.maxSizeInBytes) {
      validateFileSize(imageFile, settings.maxSizeInBytes);
    }
    
    if (settings.allowedTypes && settings.allowedTypes.length > 0) {
      validateFileType(imageFile, settings.allowedTypes);
    }
    
    // Create an image from the file
    const imageUrl = await readFileAsDataURL(imageFile);
    const image = await createImageFromUrl(imageUrl);
    
    // Get dimensions and calculate scaling
    let { width, height } = image;
    const aspectRatio = width / height;
    
    if (settings.maxWidth && width > settings.maxWidth) {
      width = settings.maxWidth;
      height = Math.round(width / aspectRatio);
    }
    
    if (settings.maxHeight && height > settings.maxHeight) {
      height = settings.maxHeight;
      width = Math.round(height * aspectRatio);
    }
    
    // Create a canvas and draw the resized image
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas 2D context');
    }
    
    // Draw with smoothing for better quality
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, 0, 0, width, height);
    
    // Determine output format
    const outputFormat = determineOutputFormat(imageFile, settings);
    
    // Convert to data URL
    const dataUrl = canvas.toDataURL(
      outputFormat.mimeType,
      settings.quality
    );
    
    // Create a new file from the data URL
    const processedFile = dataURLtoFile(dataUrl, fileName);
    
    return {
      dataUrl,
      file: processedFile,
      width,
      height,
      originalSize,
      processedSize: processedFile.size,
      compressionRatio: originalSize / processedFile.size,
      mimeType: outputFormat.mimeType,
      fileName
    };
  }, { fileName, originalSize });
}

/**
 * Create an image element from a URL or data URL
 */
function createImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => resolve(img);
    img.onerror = () => reject(new FileOperationError(
      'Failed to load image',
      {
        code: 'IMAGE_LOAD_ERROR',
        recoverable: true,
        suggestions: ['Try with a different image file', 'Ensure the image is not corrupted']
      }
    ));
    
    img.src = url;
  });
}

/**
 * Determine the best output format based on input file and settings
 */
function determineOutputFormat(file: File | Blob, options: ImageProcessingOptions): { mimeType: string, extension: string } {
  const mimeType = 'type' in file ? file.type : '';
  
  // If preserving transparency is required, prefer PNG for transparent images
  if (options.preserveTransparency && (mimeType === 'image/png' || mimeType === 'image/webp')) {
    return { mimeType: 'image/png', extension: 'png' };
  }
  
  // Otherwise use the specified format
  switch (options.format) {
    case 'png':
      return { mimeType: 'image/png', extension: 'png' };
    case 'webp':
      return { mimeType: 'image/webp', extension: 'webp' };
    case 'jpeg':
    default:
      return { mimeType: 'image/jpeg', extension: 'jpg' };
  }
}

/**
 * Convert a data URL to a File object
 */
function dataURLtoFile(dataUrl: string, fileName: string): File {
  // Get the data part from the data URL (remove the prefix)
  // Split the dataURL into type and data portions
  // Handle edge cases where the dataUrl might not be properly formatted
  const arr = dataUrl.split(',');
  if (arr.length < 2) {
    console.warn('Malformed data URL detected, creating empty file');
    // Handle malformed data URL by returning an empty file
    return new File([""], fileName, { type: "image/jpeg" });
  }
  
  // Safely extract MIME type
  const mimeInfo = arr[0] ? arr[0].match(/:(.*?);/) : null;
  const mime = mimeInfo && mimeInfo[1] ? mimeInfo[1] : 'image/jpeg';
  
  // Decode base64 data with safety check for undefined
  // We need the guard here even though we checked earlier to satisfy TypeScript
  if (!arr || arr.length < 2 || !arr[1]) {
    throw new Error('Invalid data URL format');
  }
  const base64Data = arr[1].toString();
  // Safely decode base64 data
  try {
    const bstr = atob(base64Data);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    
    // Create File object
    return new File([u8arr], fileName, { type: mime });
  } catch (error) {
    console.error('Error decoding base64 data:', error);
    // Return an empty file as fallback with the correct MIME type
    return new File([""], fileName, { type: mime });
  }
}

/**
 * Load and validate an image file safely
 */
export function validateAndLoadImage(
  fileInput: HTMLInputElement | File | Blob | null | undefined,
  options: ImageProcessingOptions = {}
): Promise<File> {
  return withFileErrorHandling(async () => {
    const settings = { ...DEFAULT_OPTIONS, ...options };
    // Initialize file as null to fix TypeScript error for unassigned variable
    let file: File | null = null;
    
    // Handle different input types
    if (!fileInput) {
      throw new FileOperationError(
        'No file input provided',
        {
          code: 'NO_FILE_INPUT',
          recoverable: true,
          suggestions: ['Please provide a file input']
        }
      );
    }
    
    if (fileInput instanceof HTMLInputElement) {
      if (!fileInput.files || fileInput.files.length === 0) {
        throw new FileOperationError(
          'No file selected',
          {
            code: 'NO_FILE_SELECTED',
            recoverable: true,
            suggestions: ['Please select a file']
          }
        );
      }
      
      // Check if files array has items before accessing index
      if (fileInput.files && fileInput.files.length > 0) {
        // Handle possible undefined with a conditional assignment
        const selectedFile = fileInput.files[0];
        if (!selectedFile) {
          throw new FileOperationError('File is undefined', { code: 'FILE_UNDEFINED' });
        }
        // Now we can safely assign it
        file = selectedFile;
      } else {
        throw new FileOperationError(
          'No file selected',
          {
            code: 'NO_FILE_SELECTED',
            recoverable: true,
            suggestions: ['Please select a file']
          }
        );
      }
    } else if (fileInput instanceof File) {
      file = fileInput;
    } else if (fileInput instanceof Blob) {
      file = new File([fileInput], 'image.jpg', { type: fileInput.type });
    } else {
      throw new FileOperationError(
        'Invalid input: expected file input element or File object',
        {
          code: 'INVALID_INPUT',
          recoverable: false
        }
      );
    }
    
    // Validate file (at this point file is guaranteed to be defined)
    if (settings.maxSizeInBytes) {
      validateFileSize(file, settings.maxSizeInBytes);
    }
    
    if (settings.allowedTypes && settings.allowedTypes.length > 0) {
      validateFileType(file, settings.allowedTypes);
    }
    
    return file;
  }, {});
}

/**
 * Create a thumbnail version of an image
 */
export async function createThumbnail(
  imageFile: File | Blob,
  maxWidth = 200,
  maxHeight = 200,
  quality = 0.7
): Promise<ProcessedImage> {
  return processImage(imageFile, 'thumbnail.jpg', {
    maxWidth,
    maxHeight,
    quality,
    format: 'jpeg' // Thumbnails are typically JPEG
  });
}

/**
 * Extract image metadata (dimensions, format, etc.)
 */
export async function extractImageMetadata(
  imageFile: File | Blob
): Promise<{ width: number; height: number; format: string; hasTransparency: boolean }> {
  return withFileErrorHandling(async () => {
    const dataUrl = await readFileAsDataURL(imageFile);
    const image = await createImageFromUrl(dataUrl);
    
    // Create a small canvas to detect transparency
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas 2D context');
    }
    
    ctx.drawImage(image, 0, 0, 1, 1);
    const imageData = ctx.getImageData(0, 0, 1, 1);
    const pixel = imageData.data;
    // Safely check the alpha channel (index 3)
    const hasTransparency = pixel && pixel.length >= 4 && typeof pixel[3] !== 'undefined' ? pixel[3] < 255 : false;
    
    // Determine format from MIME type
    // Get MIME type safely
    const mimeType = imageFile && 'type' in imageFile && imageFile.type ? imageFile.type : '';
    let format = 'unknown';
    
    if (mimeType.includes('jpeg') || mimeType.includes('jpg')) {
      format = 'jpeg';
    } else if (mimeType.includes('png')) {
      format = 'png';
    } else if (mimeType.includes('webp')) {
      format = 'webp';
    } else if (mimeType.includes('gif')) {
      format = 'gif';
    }
    
    return {
      width: image.width,
      height: image.height,
      format,
      hasTransparency
    };
  }, {});
}
