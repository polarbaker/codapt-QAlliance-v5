import React, { useState, useRef } from 'react';
import { useTRPC } from '~/trpc/react';
import { useMutation } from '@tanstack/react-query';
import { useUserStore } from '~/stores/userStore';
import { validateImageFile, validateImageFiles, fileToBase64, formatFileSize, detectImageType } from '~/constants/validation';
import { getImageUrl } from '~/utils';
import { toast } from 'react-hot-toast';
import {
  Upload,
  X,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
  Check,
} from 'lucide-react';

interface ImageUploadProps {
  value?: string | string[]; // Support both single and multiple images
  onChange: (imagePath: string | string[] | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  previewClassName?: string;
  multiple?: boolean; // Enable multiple image uploads
  maxImages?: number; // Maximum number of images
  showMetadataEditor?: boolean; // Show metadata editing interface
  category?: string; // Default category for uploaded images
  tags?: string[]; // Default tags for uploaded images
  generateVariants?: boolean; // Generate image variants
  showCollectionCreator?: boolean; // Show collection creation interface
}

// Enhanced helper function to provide better error messages and suggestions
const getUploadErrorMessage = (error: string) => {
  const errorLower = error.toLowerCase();
  
  // Handle enhanced server-side ProcessingError with context
  if (errorLower.includes('system memory usage is too high')) {
    const memoryMatch = errorLower.match(/(\d+\.?\d*)%/);
    const memoryUsage = memoryMatch ? memoryMatch[1] : 'high';
    
    return {
      message: `Server memory usage is too high (${memoryUsage}%) to process this image`,
      suggestions: [
        'Wait a few minutes for server resources to free up',
        'Try uploading a smaller image (under 10MB)',
        'Reduce image dimensions to 1920x1920 pixels or smaller',
        'Convert to JPEG format for better compression',
        'Try uploading during off-peak hours'
      ],
      canRetry: true,
      category: 'server_memory',
      severity: 'warning'
    };
  }
  
  // Handle new server-side error types with enhanced context
  if (errorLower.includes('processingerror') || errorLower.includes('processing error')) {
    if (errorLower.includes('sharp') || errorLower.includes('image processing engine')) {
      return {
        message: 'Image processing failed due to file format or corruption issues',
        suggestions: [
          'Try converting the image to JPEG or PNG format using an image editor',
          'Re-save the image with standard settings (no special color profiles)',
          'Ensure the image file is not corrupted',
          'Try opening the image in an image viewer to verify it works',
          'If the image is from a camera, try exporting it in a different format'
        ],
        canRetry: true,
        category: 'processing',
        severity: 'error'
      };
    }
    
    if (errorLower.includes('timeout')) {
      return {
        message: 'Image processing took too long and was cancelled',
        suggestions: [
          'Reduce image file size (try compressing to under 10MB)',
          'Resize image dimensions (maximum recommended: 2048x2048 pixels)',
          'Convert complex formats (TIFF, BMP, HEIC) to JPEG or PNG first',
          'Try uploading during off-peak hours',
          'Split large batches into smaller uploads'
        ],
        canRetry: true,
        category: 'timeout',
        severity: 'error'
      };
    }
    
    if (errorLower.includes('memory') || errorLower.includes('too large') || errorLower.includes('insufficient memory')) {
      return {
        message: 'Image is too large for the system to process efficiently',
        suggestions: [
          'Reduce image dimensions to 1920x1920 pixels or smaller',
          'Compress the image file size to under 15MB',
          'Convert to JPEG format for better compression',
          'Upload one image at a time instead of batches',
          'Use online image compression tools like TinyPNG or Squoosh'
        ],
        canRetry: true,
        category: 'memory',
        severity: 'error'
      };
    }
    
    if (errorLower.includes('conversion') || errorLower.includes('format')) {
      return {
        message: 'Unable to convert image to web-compatible format',
        suggestions: [
          'Convert the image to JPEG or PNG format manually before uploading',
          'Try re-saving the image in a different image editor',
          'Remove any special color profiles or metadata',
          'If using HEIC/HEIF, convert to JPEG using your device\'s photo app',
          'Try uploading the original source image if this is a processed version'
        ],
        canRetry: true,
        category: 'conversion',
        severity: 'error'
      };
    }
  }
  
  // Handle StorageError with more specific guidance
  if (errorLower.includes('not found in storage') || errorLower.includes('nosuchkey')) {
    return {
      message: 'Image was not found in storage after upload',
      suggestions: [
        'Try uploading the image again',
        'Check if you have sufficient storage permissions',
        'Refresh the page and retry',
        'Contact support if the problem persists'
      ],
      canRetry: true,
      category: 'storage',
      severity: 'error'
    };
  }
  
  if (errorLower.includes('access denied') || errorLower.includes('forbidden')) {
    return {
      message: 'Storage access denied',
      suggestions: [
        'Check your upload permissions',
        'Try logging out and back in',
        'Contact administrator if you should have access',
        'Refresh the page and retry'
      ],
      canRetry: false,
      category: 'permissions',
      severity: 'error'
    };
  }
  
  if (errorLower.includes('databaseerror') || errorLower.includes('database error')) {
    return {
      message: 'Database error occurred',
      suggestions: [
        'Try uploading again in a few moments',
        'Check if you have sufficient permissions',
        'Contact support if the problem persists',
        'Try refreshing the page and logging in again'
      ],
      canRetry: true,
      category: 'database',
      severity: 'error'
    };
  }
  
  if (errorLower.includes('storageerror') || errorLower.includes('storage error')) {
    return {
      message: 'Storage system temporarily unavailable',
      suggestions: [
        'Try uploading again in a few moments',
        'Check your internet connection',
        'Try uploading a smaller file first',
        'Contact support if the problem persists'
      ],
      canRetry: true,
      category: 'storage',
      severity: 'error'
    };
  }
  
  // Enhanced format detection with more specific guidance
  if (errorLower.includes('heic') || errorLower.includes('heif')) {
    return {
      message: 'HEIC/HEIF format needs conversion',
      suggestions: [
        'On iPhone/iPad: Go to Settings > Camera > Formats > Most Compatible',
        'Use the Photos app to export as JPEG (Share > Save to Files > JPEG)',
        'On Mac: Open in Preview and export as JPEG',
        'Use online converters like CloudConvert or iMazing HEIC Converter'
      ],
      canRetry: true,
      category: 'format',
      severity: 'warning'
    };
  }
  
  // Format and corruption errors
  if (errorLower.includes('unsupported') || errorLower.includes('format')) {
    return {
      message: 'Unsupported or corrupted image format',
      suggestions: [
        'Use JPEG, PNG, WebP, or GIF formats',
        'Re-save the image in an image editor',
        'Try converting to a different format',
        'Check if the file is corrupted'
      ],
      canRetry: true,
      category: 'format',
      severity: 'error'
    };
  }
  
  if (errorLower.includes('corrupted') || errorLower.includes('invalid') || errorLower.includes('premature end')) {
    return {
      message: 'Image file appears to be corrupted',
      suggestions: [
        'Try re-downloading the original image',
        'Re-save the image in an image editor',
        'Try a different image file',
        'Check the file integrity'
      ],
      canRetry: true,
      category: 'corruption',
      severity: 'error'
    };
  }
  
  // Size and dimension errors
  if (errorLower.includes('too large') || errorLower.includes('file size') || errorLower.includes('100mb')) {
    return {
      message: 'Image file is too large',
      suggestions: [
        'Compress the image to reduce file size',
        'Reduce image dimensions',
        'Convert to JPEG format for better compression',
        'Use online compression tools'
      ],
      canRetry: true,
      category: 'size',
      severity: 'error'
    };
  }
  
  if (errorLower.includes('dimensions') && errorLower.includes('large')) {
    return {
      message: 'Image dimensions are too large',
      suggestions: [
        'Resize image to maximum 20,000x20,000 pixels',
        'Use image editing software to reduce dimensions',
        'Consider creating multiple smaller images',
        'Try a web-optimized version'
      ],
      canRetry: true,
      category: 'dimensions',
      severity: 'error'
    };
  }
  
  // Authentication and permission errors
  if (errorLower.includes('authentication') || errorLower.includes('unauthorized') || errorLower.includes('token')) {
    return {
      message: 'Authentication failed',
      suggestions: [
        'Try logging in again',
        'Check your admin permissions',
        'Refresh the page and retry',
        'Contact administrator if issue persists'
      ],
      canRetry: false,
      category: 'auth',
      severity: 'error'
    };
  }
  
  // Network and connection errors
  if (errorLower.includes('network') || errorLower.includes('connection') || errorLower.includes('fetch')) {
    return {
      message: 'Network connection error',
      suggestions: [
        'Check your internet connection',
        'Try uploading again',
        'Try uploading smaller files',
        'Refresh the page and retry'
      ],
      canRetry: true,
      category: 'network',
      severity: 'error'
    };
  }
  
  // Memory and system errors
  if (errorLower.includes('memory') && errorLower.includes('critically low')) {
    return {
      message: 'System resources temporarily unavailable',
      suggestions: [
        'Try uploading fewer images at once',
        'Wait a moment and try again',
        'Upload smaller images',
        'Try during off-peak hours'
      ],
      canRetry: true,
      category: 'system_memory',
      severity: 'warning'
    };
  }
  
  // Base64 and data errors
  if (errorLower.includes('base64') || errorLower.includes('invalid image data')) {
    return {
      message: 'Image data transmission error',
      suggestions: [
        'Try uploading the image again',
        'Refresh the page and retry',
        'Try a different browser',
        'Check your internet connection'
      ],
      canRetry: true,
      category: 'transmission',
      severity: 'error'
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
    category: 'unknown',
    severity: 'error'
  };
};

export function ImageUpload({
  value,
  onChange,
  placeholder = "Click to upload an image",
  className = "",
  disabled = false,
  previewClassName = "h-32",
  multiple = false,
  maxImages = 7, // Reduced from 10 for better memory management
  showMetadataEditor = false,
  category,
  tags = [],
  generateVariants = true,
  showCollectionCreator = false,
}: ImageUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [fileValidations, setFileValidations] = useState<Array<{ valid: boolean; error?: string; warnings?: string[] }>>([]);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [processingInfo, setProcessingInfo] = useState<Array<{
    fileName: string;
    originalSize: number;
    processedSize: number;
    dimensions?: { width: number; height: number };
    variants?: Array<{ type: string; dimensions: { width: number; height: number }; size: number; format: string }>;
  }>>([]);
  const [showMetadataModal, setShowMetadataModal] = useState(false);
  const [metadataForFiles, setMetadataForFiles] = useState<Array<{
    title?: string;
    description?: string;
    altText?: string;
    tags: string[];
    category?: string;
  }>>([]);
  const [collectionName, setCollectionName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { adminToken } = useUserStore();
  const trpc = useTRPC();
  
  // Enhanced success message handling
  const handleUploadSuccess = (data: any, fileName: string) => {
    // Store processing information
    if (data.metadata) {
      setProcessingInfo([{
        fileName: fileName,
        originalSize: data.metadata.originalSize,
        processedSize: data.metadata.processedSize,
        dimensions: data.metadata.dimensions,
        variants: data.metadata.variants,
      }]);
      
      // Show enhanced success message with optimization info
      const originalSizeMB = (data.metadata.originalSize / (1024 * 1024)).toFixed(2);
      const processedSizeMB = (data.metadata.processedSize / (1024 * 1024)).toFixed(2);
      const savings = data.metadata.originalSize > data.metadata.processedSize 
        ? ((data.metadata.originalSize - data.metadata.processedSize) / data.metadata.originalSize * 100).toFixed(1)
        : '0';
      
      let successMessage = `Image uploaded successfully!`;
      if (data.metadata.originalSize !== data.metadata.processedSize && Number(savings) > 0) {
        successMessage += ` Optimized from ${originalSizeMB}MB to ${processedSizeMB}MB (${savings}% reduction)`;
      }
      
      toast.success(successMessage, { duration: 5000 });
      
      // Show processing info if available
      if (data.metadata.processingInfo?.wasConverted) {
        const originalFormat = data.metadata.processingInfo.originalFormat?.toUpperCase() || 'Unknown';
        const outputFormat = data.metadata.processingInfo.outputFormat?.toUpperCase() || 'Unknown';
        toast(`Image converted from ${originalFormat} to ${outputFormat} for web compatibility`, {
          icon: '🔄',
          duration: 4000,
        });
      }
      
      if (data.metadata.processingInfo?.optimizationApplied) {
        toast('Image was resized for web optimization', {
          icon: '📐',
          duration: 3000,
        });
      }
      
      // Show variant generation info
      if (data.metadata.variants && data.metadata.variants.length > 0) {
        toast(`Generated ${data.metadata.variants.length} optimized variants`, {
          icon: '🎯',
          duration: 3000,
        });
      }
      
      // Show warnings if any
      if (data.metadata.warnings && data.metadata.warnings.length > 0) {
        data.metadata.warnings.forEach((warning: string) => {
          toast(warning, {
            icon: '⚠️',
            duration: 5000,
            style: {
              background: '#fef3c7',
              color: '#92400e',
              border: '1px solid #f59e0b',
            },
          });
        });
      }
    } else {
      toast.success('Image uploaded successfully');
    }
  };

  // Enhanced bulk upload success handling
  const handleBulkUploadSuccess = (data: any) => {
    if (multiple) {
      const successPaths = data.results.map((r: any) => r.filePath).filter(Boolean);
      onChange(successPaths);
    } else if (data.results.length > 0) {
      onChange(data.results[0].filePath);
    }
    
    setSelectedFiles([]);
    setPreviewUrls([]);
    setUploadProgress('');
    setFileValidations([]);
    setMetadataForFiles([]);
    
    // Store processing information for all results
    const processedInfo = data.results.map((result: any) => ({
      fileName: result.fileName,
      originalSize: result.metadata?.originalSize || 0,
      processedSize: result.metadata?.processedSize || 0,
      dimensions: result.metadata?.dimensions,
      variants: result.metadata?.variants,
    }));
    setProcessingInfo(processedInfo);
    
    // Enhanced success/error reporting
    if (data.errorCount > 0) {
      toast.error(
        `${data.successCount} images uploaded successfully, ${data.errorCount} failed. See details below.`,
        { duration: 8000 }
      );
      
      // Show errors for failed uploads with enhanced error handling
      data.errors?.forEach((error: any) => {
        const errorInfo = getUploadErrorMessage(error.error);
        toast.error(`${error.fileName}: ${errorInfo.message}`, { 
          duration: 6000,
          style: {
            maxWidth: '500px',
          }
        });
        
        // Show primary suggestion for each failed file
        if (errorInfo.suggestions.length > 0) {
          setTimeout(() => {
            toast(`💡 ${error.fileName}: ${errorInfo.suggestions[0]}`, {
              duration: 5000,
              style: {
                background: '#dbeafe',
                color: '#1e40af',
                border: '1px solid #3b82f6',
              },
            });
          }, 1000);
        }
      });
    } else {
      toast.success(`All ${data.successCount} images uploaded successfully!`, {
        duration: 4000,
      });
    }
    
    // Show processing details for successful uploads
    if (data.results.length > 0) {
      const totalVariants = data.results.reduce((sum: number, r: any) => sum + (r.metadata?.variants?.length || 0), 0);
      if (totalVariants > 0) {
        toast.success(`Generated ${totalVariants} optimized variants across all images`, { 
          duration: 4000,
          icon: '🎯',
        });
      }
      
      // Show conversion info
      const convertedCount = data.results.filter((r: any) => r.metadata?.processingInfo?.wasConverted).length;
      if (convertedCount > 0) {
        toast(`${convertedCount} images converted for web compatibility`, {
          icon: '🔄',
          duration: 4000,
        });
      }
      
      // Show optimization info
      const optimizedCount = data.results.filter((r: any) => r.metadata?.processingInfo?.optimizationApplied).length;
      if (optimizedCount > 0) {
        toast(`${optimizedCount} images resized for web optimization`, {
          icon: '📐',
          duration: 4000,
        });
      }
    }
  };
  
  const uploadMutation = useMutation(
    trpc.adminUploadImage.mutationOptions({
      onSuccess: (data) => {
        onChange(data.filePath);
        setSelectedFiles([]);
        setPreviewUrls([]);
        setUploadProgress('');
        setFileValidations([]);
        
        handleUploadSuccess(data, selectedFiles[0]?.name || 'image');
      },
      onError: (error) => {
        setUploadProgress('');
        
        // Enhanced error handling with specific messages and debugging info
        console.error('Upload mutation error:', {
          error: error.message,
          fileName: selectedFiles[0]?.name,
          fileSize: selectedFiles[0]?.size,
          timestamp: new Date().toISOString()
        });
        
        const errorInfo = getUploadErrorMessage(error.message || 'Upload failed');
        
        // Show main error message with category-specific styling
        const errorStyle = errorInfo.category === 'server_memory' ? {
          background: '#fef3c7',
          color: '#92400e',
          border: '1px solid #f59e0b',
        } : {
          maxWidth: '400px',
        };
        
        toast.error(errorInfo.message, { 
          duration: errorInfo.category === 'server_memory' ? 10000 : 8000,
          style: errorStyle
        });
        
        // Show primary suggestion after a brief delay
        setTimeout(() => {
          if (errorInfo.suggestions.length > 0 && errorInfo.canRetry) {
            const suggestionIcon = errorInfo.category === 'server_memory' ? '⏱️' : '💡';
            toast(`${suggestionIcon} Try: ${errorInfo.suggestions[0]}`, {
              duration: 6000,
              style: {
                background: '#dbeafe',
                color: '#1e40af',
                border: '1px solid #3b82f6',
                maxWidth: '450px',
              },
            });
          } else if (!errorInfo.canRetry) {
            toast('🔒 Please resolve the authentication issue before retrying', {
              duration: 6000,
              style: {
                background: '#fef2f2',
                color: '#dc2626',
                border: '1px solid #ef4444',
              },
            });
          }
        }, 1500);
        
        // Show additional suggestions if there are multiple
        if (errorInfo.suggestions.length > 1) {
          setTimeout(() => {
            toast(`Other options: ${errorInfo.suggestions.slice(1, 3).join(' • ')}`, {
              duration: 5000,
              style: {
                background: '#f0f9ff',
                color: '#0369a1',
                border: '1px solid #0ea5e9',
                fontSize: '0.9em',
                maxWidth: '500px',
              },
            });
          }, 3000);
        }
        
        // For server memory issues, show system status
        if (errorInfo.category === 'server_memory') {
          setTimeout(() => {
            toast('ℹ️ Server is under high load. Try again in a few minutes or use smaller images.', {
              duration: 8000,
              style: {
                background: '#f0f9ff',
                color: '#0369a1',
                border: '1px solid #0ea5e9',
              },
            });
          }, 4000);
        }
      },
    })
  );

  const bulkUploadMutation = useMutation(
    trpc.adminBulkUploadImages.mutationOptions({
      onSuccess: handleBulkUploadSuccess,
      onError: (error) => {
        setUploadProgress('');
        
        // Enhanced bulk upload error handling
        const errorInfo = getUploadErrorMessage(error.message || 'Bulk upload failed');
        
        toast.error(errorInfo.message, { 
          duration: 8000,
          style: {
            maxWidth: '400px',
          }
        });
        
        // Show suggestions for bulk upload failures
        setTimeout(() => {
          if (errorInfo.canRetry) {
            if (selectedFiles.length > 5) {
              toast('💡 Try uploading fewer images at once (5 or less)', {
                duration: 6000,
                style: {
                  background: '#dbeafe',
                  color: '#1e40af',
                  border: '1px solid #3b82f6',
                },
              });
            } else {
              toast(`💡 ${errorInfo.suggestions[0]}`, {
                duration: 6000,
                style: {
                  background: '#dbeafe',
                  color: '#1e40af',
                  border: '1px solid #3b82f6',
                },
              });
            }
          }
        }, 1500);
      },
    })
  );
  
  const handleFileSelect = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    
    // Check maximum files limit with memory considerations
    if (multiple && fileArray.length > maxImages) {
      toast.error(`Maximum ${maxImages} images allowed for optimal processing. Please select fewer files.`, {
        duration: 6000,
        style: {
          maxWidth: '400px',
        }
      });
      return;
    }
    
    if (!multiple && fileArray.length > 1) {
      toast.error('Only one image can be uploaded at a time in this field.', {
        duration: 4000
      });
      return;
    }
    
    // Check total file size early to prevent memory issues
    const totalSize = fileArray.reduce((sum, file) => sum + file.size, 0);
    const totalSizeMB = totalSize / (1024 * 1024);
    
    if (totalSizeMB > 75) { // Conservative limit to prevent memory issues
      toast.error(`Total file size (${totalSizeMB.toFixed(1)}MB) is too large. Please select smaller files or upload in multiple batches.`, {
        duration: 8000,
        style: {
          maxWidth: '450px',
        }
      });
      return;
    }
    
    // Reset states
    setFileValidations([]);
    setProcessingInfo([]);
    setUploadProgress('');
    setPreviewUrls([]);
    
    // Enhanced validation with better user feedback
    let validationResult;
    
    if (fileArray.length === 1) {
      const validation = validateImageFile(fileArray[0]);
      validationResult = {
        valid: validation.valid,
        validFiles: validation.valid ? fileArray : [],
        invalidFiles: validation.valid ? [] : [{ 
          file: fileArray[0], 
          error: validation.error || 'Invalid file',
          category: validation.category || 'unknown'
        }],
        warnings: validation.warnings ? [{ file: fileArray[0], warnings: validation.warnings }] : [],
        summary: {
          totalFiles: 1,
          validCount: validation.valid ? 1 : 0,
          invalidCount: validation.valid ? 0 : 1,
          warningCount: validation.warnings ? 1 : 0,
          totalSizeMB: Number((fileArray[0].size / (1024 * 1024)).toFixed(1)),
          largeFileCount: fileArray[0].size > 10 * 1024 * 1024 ? 1 : 0, // Updated threshold
          formatIssueCount: validation.category === 'compatibility' ? 1 : 0,
        },
        recommendations: [],
        totalSize: fileArray[0].size,
      };
    } else {
      validationResult = validateImageFiles(fileArray);
    }
    
    // Show validation results with enhanced messaging
    if (validationResult.invalidFiles.length > 0) {
      // Group errors by category for better messaging
      const errorsByCategory = validationResult.invalidFiles.reduce((acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
      }, {} as Record<string, typeof validationResult.invalidFiles>);
      
      // Show category-specific error messages
      Object.entries(errorsByCategory).forEach(([category, items]) => {
        if (category === 'format') {
          toast.error(`${items.length} file(s) have unsupported formats. Please use JPEG, PNG, WebP, or other supported image formats.`, {
            duration: 8000,
          });
        } else if (category === 'size') {
          toast.error(`${items.length} file(s) are too large. Please compress or resize images to under 25MB before uploading.`, {
            duration: 8000,
          });
        } else {
          toast.error(`${items.length} file(s) could not be processed. Please check the files and try again.`, {
            duration: 6000,
          });
        }
      });
      
      // Show specific errors for individual files (limit to first 3)
      validationResult.invalidFiles.slice(0, 3).forEach(({ file, error }) => {
        const errorInfo = getUploadErrorMessage(error);
        toast.error(`${file.name}: ${errorInfo.message}`, { 
          duration: 6000,
          style: {
            maxWidth: '500px',
          }
        });
        
        // Show primary suggestion after a brief delay
        if (errorInfo.suggestions.length > 0) {
          setTimeout(() => {
            toast(`💡 ${file.name}: ${errorInfo.suggestions[0]}`, {
              duration: 5000,
              style: {
                background: '#dbeafe',
                color: '#1e40af',
                border: '1px solid #3b82f6',
                maxWidth: '500px',
              },
            });
          }, 1000);
        }
      });
      
      // Only proceed with valid files if any exist
      if (validationResult.validFiles.length === 0) {
        return;
      }
      
      toast.success(`${validationResult.validFiles.length} valid files selected, ${validationResult.invalidFiles.length} files skipped`, {
        duration: 4000
      });
    }
    
    // Show warnings for valid files
    if (validationResult.warnings.length > 0) {
      // Group warnings and show a summary
      const totalWarnings = validationResult.warnings.reduce((sum, w) => sum + w.warnings.length, 0);
      toast(`⚠️ ${totalWarnings} compatibility note(s) for ${validationResult.warnings.length} file(s). Upload will proceed with automatic optimization.`, {
        duration: 6000,
        style: {
          background: '#fef3c7',
          color: '#92400e',
          border: '1px solid #f59e0b',
        },
      });
    }
    
    // Show summary for batches with memory considerations
    if (validationResult.validFiles.length > 3) {
      toast(`Processing ${validationResult.validFiles.length} images (${validationResult.summary.totalSizeMB}MB total). This may take a few minutes and uses significant system memory.`, {
        duration: 8000,
        icon: '📊',
        style: {
          background: '#f0f9ff',
          color: '#0369a1',
          border: '1px solid #0ea5e9',
        },
      });
    }
    
    // Memory warning for large batches
    if (validationResult.summary.totalSizeMB > 50) {
      toast(`⚠️ Large batch detected (${validationResult.summary.totalSizeMB}MB). Consider uploading in smaller batches to prevent memory issues.`, {
        duration: 10000,
        style: {
          background: '#fef3c7',
          color: '#92400e',
          border: '1px solid #f59e0b',
        },
      });
    }
    
    setSelectedFiles(validationResult.validFiles);
    setUploadProgress('Creating previews...');
    
    // Initialize metadata for each valid file
    const initialMetadata = validationResult.validFiles.map(file => ({
      title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
      description: '',
      altText: '',
      tags: [...tags],
      category,
    }));
    setMetadataForFiles(initialMetadata);
    
    try {
      // Create preview URLs for all valid files with better error handling
      const previews = await Promise.all(
        validationResult.validFiles.map(file => new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const result = e.target?.result as string;
            if (result && result.startsWith('data:image/')) {
              resolve(result);
            } else {
              reject(new Error('Invalid image data'));
            }
          };
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsDataURL(file);
        }))
      );
      
      setPreviewUrls(previews);
      setUploadProgress('');
      
      // Show success message for preview creation
      if (validationResult.validFiles.length > 1) {
        toast.success(`Created previews for ${validationResult.validFiles.length} images`, {
          duration: 3000,
          icon: '🖼️',
        });
      }
      
      // Auto-upload if metadata editor is not shown
      if (!showMetadataEditor) {
        handleUpload();
      }
    } catch (error) {
      console.error('Preview creation error:', error);
      toast.error('Failed to create image previews. Please try selecting the files again.', {
        duration: 6000
      });
      setSelectedFiles([]);
      setPreviewUrls([]);
      setUploadProgress('');
    }
  };
  
  const handleUpload = async () => {
    if (selectedFiles.length === 0 || !adminToken) {
      if (!adminToken) {
        toast.error('Authentication required. Please log in and try again.');
      }
      return;
    }
    
    try {
      setUploadProgress('Preparing images...');
      
      // Check for potential issues before starting upload
      const totalSize = selectedFiles.reduce((sum, file) => sum + file.size, 0);
      const totalSizeMB = totalSize / (1024 * 1024);
      
      if (totalSizeMB > 50) {
        toast(`⚠️ Large batch detected (${totalSizeMB.toFixed(1)}MB). Processing may take several minutes and could fail due to memory constraints.`, {
          duration: 10000,
          style: {
            background: '#fef3c7',
            color: '#92400e',
          },
        });
      }
      
      // Memory usage warning for large batches
      if (selectedFiles.length > 5) {
        toast(`Processing ${selectedFiles.length} images simultaneously. If upload fails, try uploading in smaller batches of 3-5 images.`, {
          duration: 8000,
          style: {
            background: '#f0f9ff',
            color: '#0369a1',
            border: '1px solid #0ea5e9',
          },
        });
      }
      
      // Prepare images with metadata and better error handling
      const imagesData = await Promise.all(
        selectedFiles.map(async (file, index) => {
          try {
            const base64Content = await fileToBase64(file);
            const metadata = metadataForFiles[index] || {};
            
            // Validate base64 content
            if (!base64Content || !base64Content.includes('base64,')) {
              throw new Error(`Failed to convert ${file.name} to base64 format`);
            }
            
            return {
              fileName: file.name,
              fileContent: base64Content,
              fileType: file.type || 'image/jpeg', // Fallback type
              title: metadata.title,
              description: metadata.description,
              altText: metadata.altText,
              tags: metadata.tags || [],
              category: metadata.category,
            };
          } catch (conversionError) {
            console.error(`Failed to prepare ${file.name}:`, conversionError);
            throw new Error(`Failed to prepare ${file.name} for upload. Please try again.`);
          }
        })
      );
      
      setUploadProgress(`Uploading and processing ${selectedFiles.length} image(s)...`);
      
      if (multiple || selectedFiles.length > 1) {
        // Use bulk upload
        bulkUploadMutation.mutate({
          adminToken,
          images: imagesData,
          generateVariants,
          collectionName: collectionName || undefined,
        });
      } else {
        // Use single upload for backward compatibility
        uploadMutation.mutate({
          adminToken,
          ...imagesData[0],
          generateVariants,
        });
      }
    } catch (error) {
      console.error('Upload preparation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to prepare images for upload';
      toast.error(errorMessage, {
        duration: 6000
      });
      setUploadProgress('');
    }
  };
  
  const handleRemove = () => {
    onChange(null);
    setSelectedFiles([]);
    setPreviewUrls([]);
    setFileValidations([]);
    setProcessingInfo([]);
    setUploadProgress('');
    setMetadataForFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files);
    }
  };
  
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      handleFileSelect(files);
    }
  };

  const MetadataEditorModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-text-dark dark:text-text-light">
            Edit Image Metadata
          </h3>
          <p className="text-sm text-text-muted dark:text-text-light/70 mt-1">
            Add titles, descriptions, and tags to your images
          </p>
        </div>
        
        <div className="p-6 space-y-6">
          {showCollectionCreator && (
            <div>
              <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                Collection Name (Optional)
              </label>
              <input
                type="text"
                value={collectionName}
                onChange={(e) => setCollectionName(e.target.value)}
                placeholder="Enter collection name to group these images"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
              />
            </div>
          )}
          
          {selectedFiles.map((file, index) => (
            <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-start space-x-4">
                <img
                  src={previewUrls[index]}
                  alt={file.name}
                  className="w-20 h-20 object-cover rounded"
                />
                <div className="flex-1 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={metadataForFiles[index]?.title || ''}
                      onChange={(e) => {
                        const newMetadata = [...metadataForFiles];
                        newMetadata[index] = { ...newMetadata[index], title: e.target.value };
                        setMetadataForFiles(newMetadata);
                      }}
                      placeholder="Enter image title"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-1">
                      Description
                    </label>
                    <textarea
                      value={metadataForFiles[index]?.description || ''}
                      onChange={(e) => {
                        const newMetadata = [...metadataForFiles];
                        newMetadata[index] = { ...newMetadata[index], description: e.target.value };
                        setMetadataForFiles(newMetadata);
                      }}
                      placeholder="Enter image description"
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-1">
                      Alt Text
                    </label>
                    <input
                      type="text"
                      value={metadataForFiles[index]?.altText || ''}
                      onChange={(e) => {
                        const newMetadata = [...metadataForFiles];
                        newMetadata[index] = { ...newMetadata[index], altText: e.target.value };
                        setMetadataForFiles(newMetadata);
                      }}
                      placeholder="Enter alt text for accessibility"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
          <button
            onClick={() => setShowMetadataModal(false)}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              setShowMetadataModal(false);
              handleUpload();
            }}
            className="px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors"
          >
            Upload Images
          </button>
        </div>
      </div>
    </div>
  );
  
  const currentImageUrl = previewUrls[0] || (value && !Array.isArray(value) ? getImageUrl(value) : null);
  const currentImageUrls = Array.isArray(value) ? value.map(v => getImageUrl(v)) : [];
  
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragOver
            ? 'border-secondary bg-secondary/5'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple={multiple}
          className="hidden"
          disabled={disabled}
          onChange={handleFileInputChange}
        />
        
        {(uploadMutation.isPending || bulkUploadMutation.isPending) ? (
          <div className="flex flex-col items-center space-y-2">
            <Loader2 className="h-8 w-8 animate-spin text-secondary" />
            <p className="text-sm text-gray-600 dark:text-gray-400">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-2">
            <Upload className="h-8 w-8 text-gray-400" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {placeholder}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              Drag and drop or click to select • Supports all image formats • Auto-optimized for web
              {multiple && ` • Up to ${maxImages} images • Max 25MB each`}
            </p>
          </div>
        )}
      </div>
      
      {/* Enhanced File Validation Feedback */}
      {fileValidations.some(v => !v.valid) && (
        <div className="space-y-2">
          <div className="flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-sm text-red-800 dark:text-red-200">
              Some files could not be processed
            </p>
          </div>
          
          {/* Show specific errors for invalid files */}
          {fileValidations.map((validation, index) => {
            if (validation.valid) return null;
            
            const file = selectedFiles[index];
            if (!file) return null;
            
            const errorInfo = getUploadErrorMessage(validation.error || 'Invalid file');
            
            return (
              <div key={index} className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                  {file.name}
                </p>
                <p className="text-xs text-red-700 dark:text-red-300 mb-2">
                  {errorInfo.message}
                </p>
                {errorInfo.suggestions.length > 0 && (
                  <div className="text-xs text-red-600 dark:text-red-400">
                    <p className="font-medium">Suggestions:</p>
                    <ul className="list-disc list-inside space-y-1 mt-1">
                      {errorInfo.suggestions.slice(0, 3).map((suggestion, i) => (
                        <li key={i}>{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      
      {/* File Validation Warnings */}
      {fileValidations.some(v => v.valid && v.warnings) && (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center space-x-2 mb-2">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              File Warnings
            </p>
          </div>
          <div className="space-y-1">
            {fileValidations.map((validation, index) => {
              if (!validation.valid || !validation.warnings) return null;
              
              const file = selectedFiles[index];
              if (!file) return null;
              
              return (
                <div key={index} className="text-xs text-yellow-700 dark:text-yellow-300">
                  <span className="font-medium">{file.name}:</span>
                  <ul className="list-disc list-inside ml-2 space-y-1">
                    {validation.warnings.map((warning, i) => (
                      <li key={i}>{warning}</li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Multiple Images Preview */}
      {selectedFiles.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-text-dark dark:text-text-light">
              Selected Images ({selectedFiles.length})
            </h4>
            {showMetadataEditor && (
              <button
                onClick={() => setShowMetadataModal(true)}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
              >
                Edit Metadata
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {selectedFiles.map((file, index) => (
              <div key={index} className="relative">
                <div className="aspect-square bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden">
                  <img
                    src={previewUrls[index]}
                    alt={file.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  onClick={() => {
                    const newFiles = selectedFiles.filter((_, i) => i !== index);
                    const newPreviews = previewUrls.filter((_, i) => i !== index);
                    const newMetadata = metadataForFiles.filter((_, i) => i !== index);
                    setSelectedFiles(newFiles);
                    setPreviewUrls(newPreviews);
                    setMetadataForFiles(newMetadata);
                  }}
                  className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
                <div className="mt-2">
                  <p className="text-xs text-text-dark dark:text-text-light truncate">{file.name}</p>
                  <p className="text-xs text-text-muted dark:text-text-light/70">
                    {formatFileSize(file.size)}
                  </p>
                </div>
              </div>
            ))}
          </div>
          
          {!showMetadataEditor && selectedFiles.length > 0 && !uploadMutation.isPending && !bulkUploadMutation.isPending && (
            <div className="flex justify-center">
              <button
                onClick={handleUpload}
                className="px-6 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors"
              >
                Upload {selectedFiles.length} Image{selectedFiles.length > 1 ? 's' : ''}
              </button>
            </div>
          )}
        </div>
      )}
      
      {/* Enhanced Upload Progress with more detailed information */}
      {((uploadMutation.isPending || bulkUploadMutation.isPending) || uploadProgress) && (
        <div className="space-y-3">
          <div className="flex items-center space-x-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                {uploadProgress || 'Processing images...'}
              </p>
              {selectedFiles.length > 1 && (
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  Uploading {selectedFiles.length} images • This may take a few moments
                </p>
              )}
            </div>
          </div>
          
          {/* Memory usage warning if applicable */}
          {selectedFiles.length > 3 && (
            <div className="flex items-center space-x-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <p className="text-xs text-yellow-800 dark:text-yellow-200">
                Processing multiple images uses significant system memory. If upload fails, try uploading in smaller batches.
              </p>
            </div>
          )}
        </div>
      )}
      
      {/* Enhanced Current Single Image Preview with Better Error Handling */}
      {currentImageUrl && selectedFiles.length === 0 && !multiple && (
        <div className="relative">
          <div className={`bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden ${previewClassName}`}>
            <img
              src={currentImageUrl}
              alt="Current image"
              className="w-full h-full object-cover transition-opacity duration-300"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                const parent = target.parentElement;
                if (parent) {
                  parent.innerHTML = `
                    <div class="flex flex-col items-center justify-center h-full text-red-500 p-6">
                      <svg class="h-12 w-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z"></path>
                      </svg>
                      <p class="text-sm font-medium text-center mb-2">Failed to load image</p>
                      <p class="text-xs text-center opacity-75 max-w-xs mb-3">The image may be corrupted, still processing, or temporarily unavailable. This can happen if the upload was interrupted or the server is under high load.</p>
                      <div class="flex flex-col space-y-2">
                        <button 
                          onclick="window.location.reload()" 
                          class="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
                        >
                          Refresh Page
                        </button>
                        <button 
                          onclick="this.closest('.relative').querySelector('button[title=\\"Remove image\\"]').click()" 
                          class="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition-colors"
                        >
                          Remove & Re-upload
                        </button>
                      </div>
                      <p class="text-xs text-center opacity-60 mt-2">If this persists, try uploading a different image format (JPEG/PNG)</p>
                    </div>
                  `;
                }
                
                // Also show a toast with more detailed guidance
                toast.error('Image failed to load after upload. This may indicate the upload was incomplete or the image is still processing.', {
                  duration: 8000,
                  style: {
                    maxWidth: '400px',
                  }
                });
                
                // Show a follow-up toast with suggestions
                setTimeout(() => {
                  toast('💡 Try refreshing the page or re-uploading the image in JPEG format', {
                    duration: 6000,
                    style: {
                      background: '#dbeafe',
                      color: '#1e40af',
                      border: '1px solid #3b82f6',
                    },
                  });
                }, 2000);
              }}
              onLoad={() => {
                // Clear any processing info when showing existing image
                setProcessingInfo([]);
              }}
              loading="lazy"
            />
          </div>
          <button
            onClick={handleRemove}
            className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors shadow-lg"
            title="Remove image"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Current Multiple Images Preview */}
      {currentImageUrls.length > 0 && selectedFiles.length === 0 && multiple && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-text-dark dark:text-text-light">
              Current Images ({currentImageUrls.length})
            </h4>
            <button
              onClick={handleRemove}
              className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
            >
              Remove All
            </button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {currentImageUrls.map((url, index) => (
              <div key={index} className="relative">
                <div className="aspect-square bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden">
                  <img
                    src={url}
                    alt={`Image ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Enhanced Processing Info with Variants and Detailed Feedback */}
      {processingInfo.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-text-dark dark:text-text-light">
            Processing Results ({processingInfo.length} image{processingInfo.length > 1 ? 's' : ''})
          </h4>
          {processingInfo.map((info, index) => (
            <div key={index} className="bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 p-4">
              <div className="flex items-start space-x-3">
                <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <p className="font-medium text-green-800 dark:text-green-200">{info.fileName}</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-green-800 dark:text-green-200">
                    <div>
                      <p className="font-medium">File Size</p>
                      <p>
                        {formatFileSize(info.originalSize)} → {formatFileSize(info.processedSize)}
                        {info.originalSize > info.processedSize && (
                          <span className="text-green-600 dark:text-green-400 ml-1">
                            ({(((info.originalSize - info.processedSize) / info.originalSize) * 100).toFixed(1)}% smaller)
                          </span>
                        )}
                      </p>
                    </div>
                    
                    {info.dimensions && (
                      <div>
                        <p className="font-medium">Dimensions</p>
                        <p>{info.dimensions.width}×{info.dimensions.height}px</p>
                      </div>
                    )}
                  </div>
                  
                  {info.variants && info.variants.length > 0 && (
                    <div>
                      <p className="font-medium text-sm text-green-800 dark:text-green-200 mb-2">
                        Generated Variants ({info.variants.length})
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {info.variants.map((variant: any, vIndex: number) => (
                          <div key={vIndex} className="bg-green-100 dark:bg-green-800/30 rounded p-2">
                            <p className="text-xs font-medium text-green-700 dark:text-green-300 capitalize">
                              {variant.type.replace('_', ' ')}
                            </p>
                            <p className="text-xs text-green-600 dark:text-green-400">
                              {variant.dimensions.width}×{variant.dimensions.height}
                            </p>
                            <p className="text-xs text-green-600 dark:text-green-400">
                              {formatFileSize(variant.size)} • {variant.format.toUpperCase()}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Debug info for troubleshooting */}
                  {process.env.NODE_ENV === 'development' && (
                    <details className="mt-2">
                      <summary className="text-xs text-green-700 dark:text-green-300 cursor-pointer">
                        Debug Info (Dev Only)
                      </summary>
                      <div className="mt-1 p-2 bg-green-100 dark:bg-green-800/20 rounded text-xs text-green-700 dark:text-green-300">
                        <p>Upload completed at: {new Date().toISOString()}</p>
                        <p>Original size: {info.originalSize} bytes</p>
                        <p>Processed size: {info.processedSize} bytes</p>
                        {info.dimensions && (
                          <p>Dimensions: {info.dimensions.width}x{info.dimensions.height}</p>
                        )}
                      </div>
                    </details>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Upload Success */}
      {(uploadMutation.isSuccess || bulkUploadMutation.isSuccess) && processingInfo.length === 0 && (
        <div className="flex items-center space-x-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <Check className="h-5 w-5 text-green-600" />
          <p className="text-sm text-green-800 dark:text-green-200">
            Images uploaded successfully
          </p>
        </div>
      )}
      
      {/* Error State */}
      {(uploadMutation.isError || bulkUploadMutation.isError) && (
        <div className="flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <p className="text-sm text-red-800 dark:text-red-200">
            {uploadMutation.error?.message || bulkUploadMutation.error?.message || 'Failed to upload images'}
          </p>
        </div>
      )}
      
      {/* Metadata Editor Modal */}
      {showMetadataModal && <MetadataEditorModal />}
    </div>
  );
}
