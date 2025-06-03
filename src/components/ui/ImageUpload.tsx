import React, { useState, useRef } from 'react';
import { useTRPC } from '~/trpc/react';
import { useMutation } from '@tanstack/react-query';
import { useUserStore } from '~/stores/userStore';
import { validateImageFile, fileToBase64, formatFileSize, detectImageType } from '~/constants/validation';
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

// Helper function to provide better error messages and suggestions
const getUploadErrorMessage = (error: string) => {
  const errorLower = error.toLowerCase();
  
  if (errorLower.includes('file too large') || errorLower.includes('size')) {
    return {
      message: 'File size is too large',
      suggestions: [
        'Compress the image before uploading',
        'Use a smaller resolution image',
        'Convert to JPEG format for smaller file size'
      ],
      canRetry: true
    };
  }
  
  if (errorLower.includes('format') || errorLower.includes('type')) {
    return {
      message: 'Unsupported file format',
      suggestions: [
        'Use JPEG, PNG, WebP, or GIF formats',
        'Convert the image to a supported format',
        'Check if the file is corrupted'
      ],
      canRetry: true
    };
  }
  
  if (errorLower.includes('network') || errorLower.includes('connection')) {
    return {
      message: 'Network connection error',
      suggestions: [
        'Check your internet connection',
        'Try uploading again',
        'Upload smaller files if connection is slow'
      ],
      canRetry: true
    };
  }
  
  if (errorLower.includes('permission') || errorLower.includes('unauthorized')) {
    return {
      message: 'Permission denied',
      suggestions: [
        'Check if you have upload permissions',
        'Try logging in again',
        'Contact administrator if issue persists'
      ],
      canRetry: false
    };
  }
  
  if (errorLower.includes('quota') || errorLower.includes('storage')) {
    return {
      message: 'Storage quota exceeded',
      suggestions: [
        'Delete some existing images',
        'Contact administrator to increase quota',
        'Compress images to use less storage'
      ],
      canRetry: false
    };
  }
  
  return {
    message: error || 'Upload failed',
    suggestions: [
      'Try uploading again',
      'Check file format and size',
      'Refresh the page and retry'
    ],
    canRetry: true
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
  maxImages = 10,
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
  
  const uploadMutation = useMutation(
    trpc.adminUploadImage.mutationOptions({
      onSuccess: (data) => {
        onChange(data.filePath);
        setSelectedFiles([]);
        setPreviewUrls([]);
        setUploadProgress('');
        setFileValidations([]);
        
        // Store processing information
        if (data.metadata) {
          setProcessingInfo([{
            fileName: selectedFiles[0]?.name || 'image',
            originalSize: data.metadata.originalSize,
            processedSize: data.metadata.processedSize,
            dimensions: data.metadata.dimensions,
            variants: data.metadata.variants,
          }]);
          
          // Show enhanced success message with optimization info
          const originalSizeMB = (data.metadata.originalSize / (1024 * 1024)).toFixed(2);
          const processedSizeMB = (data.metadata.processedSize / (1024 * 1024)).toFixed(2);
          const savings = ((data.metadata.originalSize - data.metadata.processedSize) / data.metadata.originalSize * 100).toFixed(1);
          
          let successMessage = `Image uploaded successfully!`;
          if (data.metadata.originalSize !== data.metadata.processedSize) {
            successMessage += ` Optimized from ${originalSizeMB}MB to ${processedSizeMB}MB (${savings}% reduction)`;
          }
          
          toast.success(successMessage, { duration: 4000 });
          
          // Show processing info if available
          if (data.metadata.processingInfo?.wasConverted) {
            toast(`Image converted from ${data.metadata.processingInfo.originalFormat?.toUpperCase()} to ${data.metadata.processingInfo.outputFormat?.toUpperCase()} for web compatibility`, {
              icon: '🔄',
              duration: 3000,
            });
          }
          
          // Show warnings if any
          if (data.metadata.warnings) {
            data.metadata.warnings.forEach(warning => {
              toast(warning, {
                icon: '⚠️',
                duration: 4000,
                style: {
                  background: '#fef3c7',
                  color: '#92400e',
                },
              });
            });
          }
        } else {
          toast.success('Image uploaded successfully');
        }
      },
      onError: (error) => {
        setUploadProgress('');
        
        // Enhanced error handling with specific messages
        const errorInfo = getUploadErrorMessage(error.message || 'Upload failed');
        toast.error(errorInfo.message, { duration: 6000 });
        
        // Show suggestions after a brief delay
        setTimeout(() => {
          if (errorInfo.suggestions.length > 0 && errorInfo.canRetry) {
            toast(`Try: ${errorInfo.suggestions[0]}`, {
              icon: '💡',
              duration: 5000,
              style: {
                background: '#dbeafe',
                color: '#1e40af',
              },
            });
          }
        }, 1000);
      },
    })
  );

  const bulkUploadMutation = useMutation(
    trpc.adminBulkUploadImages.mutationOptions({
      onSuccess: (data) => {
        if (multiple) {
          const successPaths = data.results.map(r => r.filePath).filter(Boolean);
          onChange(successPaths);
        } else if (data.results.length > 0) {
          onChange(data.results[0].filePath);
        }
        
        setSelectedFiles([]);
        setPreviewUrls([]);
        setUploadProgress('');
        setFileValidations([]);
        setMetadataForFiles([]);
        
        // Store processing information
        const processedInfo = data.results.map(result => ({
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
            `${data.successCount} images uploaded successfully, ${data.errorCount} failed. Check individual file errors below.`,
            { duration: 6000 }
          );
          
          // Show errors for failed uploads
          data.errors?.forEach(error => {
            const errorInfo = getUploadErrorMessage(error.error);
            toast.error(`${error.fileName}: ${errorInfo.message}`, { duration: 5000 });
          });
        } else {
          toast.success(`All ${data.successCount} images uploaded successfully!`);
        }
        
        // Show processing details
        if (data.results.length > 0) {
          const totalVariants = data.results.reduce((sum, r) => sum + (r.metadata?.variants?.length || 0), 0);
          if (totalVariants > 0) {
            toast.success(`Generated ${totalVariants} image variants for optimization`, { duration: 3000 });
          }
          
          // Show conversion info
          const convertedCount = data.results.filter(r => r.metadata?.processingInfo?.wasConverted).length;
          if (convertedCount > 0) {
            toast(`${convertedCount} images converted for web compatibility`, {
              icon: '🔄',
              duration: 3000,
            });
          }
        }
      },
      onError: (error) => {
        setUploadProgress('');
        
        // Enhanced bulk upload error handling
        const errorInfo = getUploadErrorMessage(error.message || 'Bulk upload failed');
        toast.error(errorInfo.message, { duration: 6000 });
        
        // Show suggestions for bulk upload failures
        setTimeout(() => {
          if (errorInfo.canRetry) {
            toast('Try uploading files in smaller batches or check individual file formats', {
              icon: '💡',
              duration: 5000,
              style: {
                background: '#dbeafe',
                color: '#1e40af',
              },
            });
          }
        }, 1000);
      },
    })
  );
  
  const handleFileSelect = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    
    // Check maximum files limit
    if (multiple && fileArray.length > maxImages) {
      toast.error(`Maximum ${maxImages} images allowed`);
      return;
    }
    
    if (!multiple && fileArray.length > 1) {
      toast.error('Multiple files not allowed in single upload mode');
      return;
    }
    
    // Reset states
    setFileValidations([]);
    setProcessingInfo([]);
    setUploadProgress('');
    setPreviewUrls([]);
    
    // Enhanced validation with better feedback
    const validations = fileArray.map(file => {
      const validation = validateImageFile(file);
      
      // Show warnings for individual files
      if (validation.warnings) {
        validation.warnings.forEach(warning => {
          toast(`${file.name}: ${warning}`, {
            icon: '⚠️',
            duration: 4000,
            style: {
              background: '#fef3c7',
              color: '#92400e',
            },
          });
        });
      }
      
      return validation;
    });
    
    setFileValidations(validations);
    
    const invalidFiles = validations.filter(v => !v.valid);
    if (invalidFiles.length > 0) {
      // Show specific error messages for invalid files
      invalidFiles.forEach((validation, index) => {
        const file = fileArray[index];
        const errorInfo = getUploadErrorMessage(validation.error || 'Invalid file');
        
        toast.error(`${file.name}: ${errorInfo.message}`, {
          duration: 6000,
        });
        
        // Show suggestions after a brief delay
        setTimeout(() => {
          if (errorInfo.suggestions.length > 0) {
            toast(`Suggestions: ${errorInfo.suggestions.slice(0, 2).join(', ')}`, {
              icon: '💡',
              duration: 5000,
              style: {
                background: '#dbeafe',
                color: '#1e40af',
              },
            });
          }
        }, 1000);
      });
      
      // Only proceed with valid files if any exist
      const validFileArray = fileArray.filter((_, index) => validations[index].valid);
      if (validFileArray.length === 0) {
        return;
      }
      
      // Update fileArray to only include valid files
      fileArray.splice(0, fileArray.length, ...validFileArray);
      
      toast.success(`${validFileArray.length} valid files selected, ${invalidFiles.length} files skipped`);
    }
    
    setSelectedFiles(fileArray);
    setUploadProgress('Creating previews...');
    
    // Initialize metadata for each valid file
    const initialMetadata = fileArray.map(file => ({
      title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
      description: '',
      altText: '',
      tags: [...tags],
      category,
    }));
    setMetadataForFiles(initialMetadata);
    
    try {
      // Create preview URLs for all files
      const previews = await Promise.all(
        fileArray.map(file => new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        }))
      );
      
      setPreviewUrls(previews);
      setUploadProgress('');
      
      // Auto-upload if metadata editor is not shown
      if (!showMetadataEditor) {
        handleUpload();
      }
    } catch (error) {
      console.error('Preview creation error:', error);
      toast.error('Failed to create image previews. Please try selecting the files again.');
      setSelectedFiles([]);
      setPreviewUrls([]);
      setUploadProgress('');
    }
  };
  
  const handleUpload = async () => {
    if (selectedFiles.length === 0 || !adminToken) return;
    
    try {
      setUploadProgress('Processing images...');
      
      // Prepare images with metadata
      const imagesData = await Promise.all(
        selectedFiles.map(async (file, index) => {
          const base64Content = await fileToBase64(file);
          const metadata = metadataForFiles[index] || {};
          
          return {
            fileName: file.name,
            fileContent: base64Content,
            fileType: file.type,
            title: metadata.title,
            description: metadata.description,
            altText: metadata.altText,
            tags: metadata.tags || [],
            category: metadata.category,
          };
        })
      );
      
      setUploadProgress('Uploading and optimizing...');
      
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
      toast.error('Failed to process images');
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
              {multiple && ` • Up to ${maxImages} images`}
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
      
      {/* Upload Progress */}
      {((uploadMutation.isPending || bulkUploadMutation.isPending) || uploadProgress) && (
        <div className="flex items-center space-x-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <Loader2 className="h-5 w-5 animate-spin text-yellow-600" />
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            {uploadProgress || 'Uploading...'}
          </p>
        </div>
      )}
      
      {/* Current Single Image Preview */}
      {currentImageUrl && selectedFiles.length === 0 && !multiple && (
        <div className="relative">
          <div className={`bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden ${previewClassName}`}>
            <img
              src={currentImageUrl}
              alt="Current image"
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  parent.innerHTML = `
                    <div class="flex flex-col items-center justify-center h-full text-red-500 p-4">
                      <svg class="h-8 w-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z"></path>
                      </svg>
                      <p class="text-sm text-center">Failed to load image</p>
                      <p class="text-xs text-center mt-1 opacity-75">The image may be corrupted or in an unsupported format</p>
                    </div>
                  `;
                }
              }}
              onLoad={() => {
                // Clear any processing info when showing existing image
                setProcessingInfo([]);
              }}
            />
          </div>
          <button
            onClick={handleRemove}
            className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
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
      
      {/* Processing Info with Variants */}
      {processingInfo.length > 0 && (
        <div className="space-y-3">
          {processingInfo.map((info, index) => (
            <div key={index} className="bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Check className="h-5 w-5 text-green-600" />
                <p className="font-medium text-green-800 dark:text-green-200">{info.fileName}</p>
              </div>
              <div className="text-sm text-green-800 dark:text-green-200 space-y-1">
                <p>
                  Size: {formatFileSize(info.originalSize)} → {formatFileSize(info.processedSize)}
                  {info.dimensions && (
                    <span> • {info.dimensions.width}×{info.dimensions.height}px</span>
                  )}
                </p>
                {info.variants && info.variants.length > 0 && (
                  <p>Generated {info.variants.length} variants: {info.variants.map(v => v.type).join(', ')}</p>
                )}
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
