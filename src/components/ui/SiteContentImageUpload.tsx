import React, { useState, useRef, useCallback, memo } from 'react';
import { useTRPC } from '~/trpc/react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useUserStore } from '~/stores/userStore';
import { toast } from 'react-hot-toast';
import {
  Upload,
  X,
  Loader2,
  AlertCircle,
  Check,
  Image as ImageIcon,
  Trash2,
  FileImage,
  ZapOff,
} from 'lucide-react';
import {
  SITE_CONTENT_IMAGE_TYPES,
  SITE_CONTENT_IMAGE_LABELS,
  SITE_CONTENT_IMAGE_DESCRIPTIONS,
  SITE_CONTENT_IMAGE_CONTEXT,
  type SiteContentImageType,
} from '~/constants/validation';

interface SiteContentImageUploadProps {
  imageType: SiteContentImageType;
  className?: string;
  disabled?: boolean;
  onImageUpdated?: (hasImage: boolean) => void;
}

// Simplified validation function
const validateFile = (file: File): { valid: boolean; error?: string } => {
  if (!file.type.startsWith('image/')) {
    return { 
      valid: false, 
      error: 'Please select an image file (JPEG, PNG, WebP, or GIF)'
    };
  }
  
  const maxSize = 15 * 1024 * 1024; // 15MB
  if (file.size > maxSize) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return { 
      valid: false, 
      error: `Image is too large (${sizeMB}MB). Maximum size is 15MB.`
    };
  }
  
  if (file.size < 1000) {
    return { 
      valid: false, 
      error: 'Image file appears to be corrupted or empty.'
    };
  }
  
  return { valid: true };
};

// File reader utility
const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result && result.startsWith('data:')) {
        resolve(result);
      } else {
        reject(new Error('Failed to read file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

export const SiteContentImageUpload = memo(function SiteContentImageUpload({
  imageType,
  className = "",
  disabled = false,
  onImageUpdated,
}: SiteContentImageUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    isActive: boolean;
    stage: string;
    percentage: number;
  }>({ isActive: false, stage: '', percentage: 0 });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { adminToken } = useUserStore();
  const trpc = useTRPC();

  // Query to get current image
  const currentImageQuery = useQuery(
    trpc.getSiteContentImage.queryOptions({
      imageType,
    })
  );

  const currentImage = currentImageQuery.data;
  const hasCurrentImage = Boolean(currentImage?.hasImage && currentImage?.imageData);

  // Upload mutation
  const uploadMutation = useMutation(
    trpc.uploadSiteContentImage.mutationOptions({
      onMutate: () => {
        setUploadProgress({
          isActive: true,
          stage: 'Optimizing image...',
          percentage: 70,
        });
      },
      onSuccess: () => {
        setUploadProgress({
          isActive: true,
          stage: 'Upload complete!',
          percentage: 100,
        });
        
        // Clean up
        setTimeout(() => {
          setSelectedFile(null);
          setPreviewUrl('');
          setUploadProgress({ isActive: false, stage: '', percentage: 0 });
          currentImageQuery.refetch();
          onImageUpdated?.(true);
        }, 1000);
      },
      onError: (error) => {
        setUploadProgress({ isActive: false, stage: '', percentage: 0 });
        toast.error(`Upload failed: ${error.message}`);
      },
    })
  );

  // Remove mutation
  const removeMutation = useMutation(
    trpc.removeSiteContentImage.mutationOptions({
      onSuccess: () => {
        currentImageQuery.refetch();
        onImageUpdated?.(false);
      },
      onError: (error) => {
        toast.error(`Remove failed: ${error.message}`);
      },
    })
  );

  // File selection handler
  const handleFileSelect = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;
    
    const file = fileArray[0];
    
    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      toast.error(validation.error || 'Invalid file');
      return;
    }
    
    try {
      setUploadProgress({
        isActive: true,
        stage: 'Reading file...',
        percentage: 30,
      });
      
      const dataUrl = await readFileAsDataURL(file);
      setSelectedFile(file);
      setPreviewUrl(dataUrl);
      setUploadProgress({ isActive: false, stage: '', percentage: 0 });
    } catch (error) {
      setUploadProgress({ isActive: false, stage: '', percentage: 0 });
      toast.error('Failed to read file. Please try again.');
    }
  }, []);

  // Upload handler
  const handleUpload = useCallback(async () => {
    if (!selectedFile || !adminToken) return;
    
    try {
      const base64Content = await readFileAsDataURL(selectedFile);
      
      uploadMutation.mutate({
        adminToken,
        imageType,
        fileName: selectedFile.name,
        fileContent: base64Content,
        fileType: selectedFile.type,
      });
    } catch (error) {
      toast.error('Failed to prepare image for upload');
    }
  }, [selectedFile, adminToken, imageType, uploadMutation]);

  // Remove handler
  const handleRemove = useCallback(() => {
    if (!adminToken) return;
    
    removeMutation.mutate({
      adminToken,
      imageType,
    });
  }, [adminToken, imageType, removeMutation]);

  // Clear selection
  const handleClear = useCallback(() => {
    setSelectedFile(null);
    setPreviewUrl('');
    setUploadProgress({ isActive: false, stage: '', percentage: 0 });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => { 
    e.preventDefault(); 
    setDragOver(true); 
  }, []);
  
  const handleDragLeave = useCallback((e: React.DragEvent) => { 
    e.preventDefault(); 
    setDragOver(false); 
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) handleFileSelect(files);
  }, [handleFileSelect]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) handleFileSelect(files);
  }, [handleFileSelect]);

  const handleUploadAreaClick = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  const isLoading = uploadMutation.isPending || removeMutation.isPending || uploadProgress.isActive;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {SITE_CONTENT_IMAGE_LABELS[imageType]}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {hasCurrentImage ? 'Custom image is active' : 'Using default image'}
          </p>
          {/* Add detailed description */}
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2 max-w-md">
            {SITE_CONTENT_IMAGE_DESCRIPTIONS[imageType]}
          </p>
        </div>
        {hasCurrentImage && (
          <button
            onClick={handleRemove}
            disabled={disabled || isLoading}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Trash2 className="h-4 w-4 mr-1.5" />
            Remove
          </button>
        )}
      </div>

      {/* Context Information Panel */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-800/50 rounded-lg flex items-center justify-center">
              <ImageIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="flex-1 text-sm">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Where this image appears:
            </h4>
            <div className="space-y-1 text-blue-800 dark:text-blue-200">
              <p><strong>Section:</strong> {SITE_CONTENT_IMAGE_CONTEXT[imageType].section}</p>
              <p><strong>Placement:</strong> {SITE_CONTENT_IMAGE_CONTEXT[imageType].placement}</p>
              <p><strong>Recommended size:</strong> {SITE_CONTENT_IMAGE_CONTEXT[imageType].dimensions}</p>
              <p><strong>Style notes:</strong> {SITE_CONTENT_IMAGE_CONTEXT[imageType].style}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Indicator */}
      {uploadProgress.isActive && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />
            <div className="flex-1">
              <div className="flex justify-between text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                <span>{uploadProgress.stage}</span>
                <span>{uploadProgress.percentage}%</span>
              </div>
              <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress.percentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Current Image Display */}
      {hasCurrentImage && !selectedFile && !isLoading && (
        <div className="space-y-3">
          <div className="relative bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
            <img
              src={currentImage?.imageData || ''}
              alt={SITE_CONTENT_IMAGE_LABELS[imageType]}
              className="w-full h-48 object-cover"
            />
            {currentImageQuery.isLoading && (
              <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            )}
          </div>
          
          {currentImage?.fileName && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                {currentImage.fileName}
              </span>
              <span className="text-green-600 dark:text-green-400 font-medium">
                {Math.round((currentImage.imageData?.length || 0) / 1024)}KB
              </span>
            </div>
          )}
        </div>
      )}

      {/* Upload Area */}
      {!hasCurrentImage || selectedFile ? (
        <div
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
            dragOver
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10 scale-[1.02]'
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          } ${disabled || isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleUploadAreaClick}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            disabled={disabled || isLoading}
            onChange={handleFileInputChange}
          />
          
          {isLoading ? (
            <div className="flex flex-col items-center space-y-3">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
              <p className="text-gray-600 dark:text-gray-400">
                Processing...
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-4">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                <Upload className="h-8 w-8 text-gray-400" />
              </div>
              <div className="space-y-2">
                <p className="text-lg font-medium text-gray-900 dark:text-white">
                  {selectedFile ? 'Replace Image' : 'Upload Image'}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Drag and drop or click to select
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  JPEG, PNG, WebP • Max 15MB • Auto-optimized
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={handleUploadAreaClick}
          disabled={disabled || isLoading}
          className="w-full p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-gray-400 dark:hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <div className="flex items-center justify-center space-x-3 text-gray-600 dark:text-gray-400">
            <FileImage className="h-5 w-5" />
            <span className="font-medium">Upload New Image</span>
          </div>
        </button>
      )}
      
      {/* File Preview and Upload */}
      {selectedFile && previewUrl && !isLoading && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-4">
          <div className="flex items-start space-x-4">
            <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden flex-shrink-0">
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 dark:text-white truncate">
                {selectedFile.name}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {(selectedFile.size / (1024 * 1024)).toFixed(1)}MB
              </p>
              
              <div className="flex items-center space-x-2 mt-3">
                <button
                  onClick={handleUpload}
                  disabled={disabled || isLoading}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </button>
                
                <button
                  onClick={handleClear}
                  disabled={disabled || isLoading}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Error State for Current Image Query */}
      {currentImageQuery.isError && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Could not load current image
              </p>
              <button
                onClick={() => currentImageQuery.refetch()}
                className="text-amber-700 dark:text-amber-300 hover:text-amber-800 dark:hover:text-amber-200 underline text-sm mt-1"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

// Add display name for debugging
SiteContentImageUpload.displayName = 'SiteContentImageUpload';
