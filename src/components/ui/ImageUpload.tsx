'use client';

import React, { useState, useRef, ReactElement, ChangeEvent, DragEvent } from 'react';
import { useTRPC } from '../../trpc/react';
import { useUserStore } from '../../stores/userStore';
import { 
  validateImageFile, 
  validateImageFiles, 
  fileToBase64, 
  formatFileSize,
  getUploadErrorMessage 
} from '~/constants/validation';
import { getImageUrl } from '../../utils/common';
import { toast } from 'react-hot-toast';
import {
  Upload,
  X,
  Loader2,
  AlertCircle,
  Check,
  Image as ImageIcon,
} from 'lucide-react';

interface ImageMetadata {
  title?: string;
  description?: string;
  altText?: string;
}

interface ImageUploadProps {
  value?: string | string[];
  onChange: (imagePath: string | string[] | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  previewClassName?: string;
  multiple?: boolean;
  maxImages?: number;
  showMetadata?: boolean;
  showMetadataEditor?: boolean;
  generateVariants?: boolean;
  showCollectionCreator?: boolean;
}

export function ImageUpload({
  value,
  onChange,
  placeholder = "Click to upload an image",
  className = "",
  disabled = false,
  previewClassName = "h-32",
  multiple = false,
  maxImages = 3, // Conservative limit
  showMetadata = false,
  showMetadataEditor = false,
  generateVariants = false,
  showCollectionCreator = false,
}: ImageUploadProps): ReactElement {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [metadata, setMetadata] = useState<ImageMetadata[]>([]);
  const [showMetadataModal, setShowMetadataModal] = useState(false);
  const [previewErrors, setPreviewErrors] = useState<Record<string, boolean>>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { adminToken } = useUserStore();
  
  interface ImageUploadResponse {
    filePath: string;
    metadata?: {
      originalSize: number;
      processedSize: number;
      processingTime: number;
    };
  }
  
  const uploadMutation = useTRPC().adminUploadImage.useMutation({
    onSuccess: (data: ImageUploadResponse) => {
      onChange(data.filePath);
      setSelectedFiles([]);
      setPreviewUrls([]);
      setUploadProgress('');
      setMetadata([]);
      
      toast.success(`✅ Image uploaded successfully!`, { duration: 4000 });
      
      if (data.metadata) {
        const originalMB = (data.metadata.originalSize / (1024 * 1024)).toFixed(1);
        const processedMB = (data.metadata.processedSize / (1024 * 1024)).toFixed(1);
        const timeSeconds = (data.metadata.processingTime / 1000).toFixed(1);
        
        setTimeout(() => {
          toast(`📊 Processed in ${timeSeconds}s: ${originalMB}MB → ${processedMB}MB`, {
            duration: 3000,
            style: { background: '#f0f9ff', color: '#0369a1' }
          });
        }, 1000);
      }
    },
    onError: (error: { message?: string }) => {
      setUploadProgress('');
      console.error('Upload error:', error);
      
      const errorInfo = getUploadErrorMessage(error.message || 'Upload failed');
      
      toast.error(`❌ ${errorInfo.message}`, { duration: 8000 });
      
      if (errorInfo.suggestions.length > 0 && errorInfo.canRetry) {
        setTimeout(() => {
          toast(`💡 ${errorInfo.suggestions[0]}`, {
            duration: 6000,
            style: { background: '#dbeafe', color: '#1e40af' }
          });
        }, 2000);
      }
    },
  });

  interface BulkUploadResponse {
    results: Array<{ filePath?: string; fileName?: string; error?: string }>;
    processingTime: number;
    successCount: number;
    errorCount: number;
    errors?: Array<{ fileName: string; error: string }>;
  }
  
  const bulkUploadMutation = useTRPC().adminBulkUploadImages.useMutation({
    onSuccess: (data: BulkUploadResponse) => {
      if (multiple) {
        const successPaths = data.results
          .map(r => r.filePath)
          .filter((path): path is string => path !== undefined && path !== null);
        onChange(successPaths);
      } else {
        const firstResult = data.results.length > 0 ? data.results[0] : undefined;
        if (firstResult && firstResult.filePath) {
          onChange(firstResult.filePath);
        } else {
          onChange(null);
        }
      }
      
      setSelectedFiles([]);
      setPreviewUrls([]);
      setUploadProgress('');
      setMetadata([]);
      
      toast.success(`✅ ${data.successCount} images uploaded successfully.`);
      
      if (data.errorCount > 0) {
        toast.error(`❌ ${data.errorCount} images failed to upload.`);
        console.error('Bulk upload errors:', data.errors);
      }
    },
    onError: (error: { message?: string }) => {
      setUploadProgress('');
      console.error('Bulk upload error:', error);
      const errorInfo = getUploadErrorMessage(error.message || 'Bulk upload failed');
      toast.error(`❌ ${errorInfo.message}`, { duration: 6000 });
    },
  });

  const handleFileSelect = async (files: FileList | File[]): Promise<void> => {
    const fileArray: File[] = Array.isArray(files) ? files : Array.from(files);

    if (fileArray.length === 0) {
      return;
    }
    
    if (multiple && fileArray.length > maxImages) {
      toast.error(`You can only select up to ${maxImages} images.`);
      return;
    }

    let validFiles: File[] = [];
    
    if (multiple) {
      // Multiple file validation
      const multiResult = validateImageFiles(fileArray);
      if (!multiResult.valid) {
        // Handle invalid files appropriately
        let errorMessage = 'Image validation failed';
        if (multiResult.invalidFiles && Array.isArray(multiResult.invalidFiles) && multiResult.invalidFiles.length > 0) {
          errorMessage = multiResult.invalidFiles[0]?.error || 'Image validation failed';
        }
        toast.error(errorMessage);
        return;
      }
      // Ensure we have valid files even if validFiles property is missing or undefined
      validFiles = Array.isArray(multiResult.validFiles) ? multiResult.validFiles : fileArray.filter(file => !!file);
    } else {
      // Single file validation
      const file = fileArray[0];
      if (!file) {
        toast.error('No file selected');
        return;
      }
      const singleResult = validateImageFile(file);
      if (!singleResult.valid) {
        toast.error(singleResult.error || 'Image validation failed');
        return;
      }
      validFiles = [file];
    }

    setSelectedFiles(validFiles);

    const previews = await Promise.all(
      validFiles.map((file: File) => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e: ProgressEvent<FileReader>) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      }))
    );
    setPreviewUrls(previews);

    setMetadata(validFiles.map(() => ({})));

    if (showMetadataEditor) {
      setShowMetadataModal(true);
    }
  };
  
  const handleUpload = async (): Promise<void> => {
    if (selectedFiles.length === 0 || !adminToken) {
      if (!adminToken) {
        toast.error('Authentication required. Please log in and try again.');
      }
      return;
    }

    try {
      setUploadProgress('Preparing images for upload...');
      
      interface ImageData {
        fileBase64: string;
        fileName: string;
        metadata: ImageMetadata;
      }
      const imagesData: ImageData[] = await Promise.all(
        selectedFiles.map(async (file: File, index: number) => {
          const fileBase64 = await fileToBase64(file);
          return {
            fileBase64,
            fileName: file.name,
            metadata: metadata[index] || {},
          };
        })
      );

      if (multiple) {
        setUploadProgress(`Uploading ${imagesData.length} images...`);
        bulkUploadMutation.mutate({ images: imagesData, adminToken });
      } else {
        setUploadProgress('Uploading image...');
        uploadMutation.mutate({ ...imagesData[0], adminToken });
      }
    } catch (error) {
      console.error('Error during upload preparation:', error);
      toast.error('Could not prepare images for upload.');
      setUploadProgress('');
    }
  };
  
  const handleRemove = (): void => {
    onChange(multiple ? [] : null);
    setSelectedFiles([]);
    setPreviewUrls([]);
    setUploadProgress('');
    setMetadata([]);
    setPreviewErrors({});
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const handleDragOver = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setDragOver(true);
  };
  
  const handleDragLeave = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setDragOver(false);
  };
  
  const handleDrop = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setDragOver(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(Array.from(e.dataTransfer.files));
    }
  };
  
  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>): void => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(Array.from(e.target.files));
    }
  };

  const handlePreviewError = (url: string): void => {
    setPreviewErrors(prev => ({ ...prev, [url]: true }));
  };

  const MetadataModal = (): ReactElement | null => {
    const [currentMetadata, setCurrentMetadata] = useState<ImageMetadata[]>(metadata);

    const handleMetadataChange = (index: number, field: keyof ImageMetadata, value: string): void => {
      const updatedMetadata = [...currentMetadata];
      const item = updatedMetadata[index];
      if (item) {
        item[field] = value;
        setCurrentMetadata(updatedMetadata);
      }
    };

    const handleSaveMetadata = (): void => {
      setMetadata(currentMetadata);
      setShowMetadataModal(false);
    };

    if (!showMetadataModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Edit Image Details
            </h3>
          </div>
          
          <div className="p-6 space-y-6">
            {currentMetadata.map((meta, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">{selectedFiles[index]?.name}</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Title</label>
                    <input
                      type="text"
                      value={meta.title || ''}
                      onChange={(e) => handleMetadataChange(index, 'title', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <textarea
                      value={meta.description || ''}
                      onChange={(e) => handleMetadataChange(index, 'description', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Alt Text</label>
                    <input
                      type="text"
                      value={meta.altText || ''}
                      onChange={(e) => handleMetadataChange(index, 'altText', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
            <button 
              onClick={() => setShowMetadataModal(false)} 
              className="px-4 py-2 rounded bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-500"
            >
              Cancel
            </button>
            <button 
              onClick={handleSaveMetadata} 
              className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              Save Metadata
            </button>
          </div>
        </div>
      </div>
    );
  };

  const isUploading = uploadMutation.isPending || bulkUploadMutation.isPending;
  const currentImageUrl = previewUrls[0] || (value && !Array.isArray(value) ? getImageUrl(value) : null);
  const currentImageUrls = Array.isArray(value) ? value.map(v => getImageUrl(v)) : [];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Dropzone */}
      {!value && selectedFiles.length === 0 && (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative flex flex-col items-center justify-center w-full p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors
            ${dragOver ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'}
            ${disabled ? 'cursor-not-allowed bg-gray-100 dark:bg-gray-800' : ''}`
          }
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInputChange}
            className="hidden"
            accept="image/png, image/jpeg, image/gif, image/webp"
            multiple={multiple}
            disabled={disabled}
          />
          <div className="text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              <span className="font-semibold text-blue-600 dark:text-blue-400">{placeholder}</span> or drag and drop
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              PNG, JPG, GIF, WEBP up to 10MB
            </p>
          </div>
        </div>
      )}

      {/* Selected Files Preview */}
      {selectedFiles.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
            Selected Files ({selectedFiles.length})
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {previewUrls.map((url, index) => (
              <div key={index} className="relative group">
                <div className="aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                  <img src={url} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                </div>
                {showMetadata && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2 text-xs">
                    <p className="truncate">{metadata[index]?.title || 'No title'}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-end space-x-3 pt-2">
            {showMetadataEditor && (
              <button
                onClick={() => setShowMetadataModal(true)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded text-sm hover:bg-gray-300"
              >
                Edit Details
              </button>
            )}
            <button
              onClick={() => setSelectedFiles([])}
              className="px-4 py-2 bg-red-100 text-red-800 rounded text-sm hover:bg-red-200"
            >
              Clear Selection
            </button>
            <button
              onClick={handleUpload}
              disabled={isUploading}
              className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-blue-300 flex items-center"
            >
              {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Upload {selectedFiles.length} {multiple ? 'Images' : 'Image'}
            </button>
          </div>
        </div>
      )}

      {/* Current Single Image Preview */}
      {currentImageUrl && !multiple && (
        <div className={`relative w-full ${previewClassName}`}>
          <div className="bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden w-full h-full">
            {previewErrors[currentImageUrl] ? (
              <div className="flex flex-col items-center justify-center h-full text-red-500 p-4">
                <AlertCircle className="h-8 w-8 mb-2" />
                <p className="text-sm font-medium">Could not load image</p>
                <p className="text-xs">The link might be broken or the file was removed.</p>
                <button 
                  onClick={handleRemove}
                  className="mt-3 px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                >
                  Remove & Re-upload
                </button>
              </div>
            ) : (
              <img
                src={currentImageUrl}
                alt="Current image"
                className="w-full h-full object-cover"
                onError={() => handlePreviewError(currentImageUrl)}
              />
            )}
          </div>
          <button
            onClick={handleRemove}
            className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700 shadow-lg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Current Multiple Images Preview */}
      {currentImageUrls.length > 0 && multiple && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              Current Images ({currentImageUrls.length})
            </h4>
            <button
              onClick={handleRemove}
              className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
            >
              Remove All
            </button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {currentImageUrls.map((url, index) => (
              <div key={index} className="relative">
                <div className="aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                  {previewErrors[url] ? (
                    <div className="flex items-center justify-center h-full text-red-500">
                      <AlertCircle className="h-6 w-6" />
                    </div>
                  ) : (
                    <img
                      src={url}
                      alt={`Image ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={() => handlePreviewError(url)}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Upload Progress */}
      {isUploading && (
        <div className="flex items-center space-x-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          <div>
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
              {uploadProgress || 'Processing images...'}
            </p>
            {selectedFiles.length > 1 && (
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Uploading {selectedFiles.length} images • This may take a few minutes
              </p>
            )}
          </div>
        </div>
      )}
      
      {/* Success State */}
      {(uploadMutation.isSuccess || bulkUploadMutation.isSuccess) && (
        <div className="flex items-center space-x-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <Check className="h-5 w-5 text-green-600" />
          <p className="text-sm text-green-800 dark:text-green-200">
            Images uploaded successfully
          </p>
        </div>
      )}
      
    </div>
  );
}
