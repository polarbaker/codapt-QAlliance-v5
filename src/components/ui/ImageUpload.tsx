import React, { useState, useRef } from 'react';
import { useTRPC } from '~/trpc/react';
import { useMutation } from '@tanstack/react-query';
import { useUserStore } from '~/stores/userStore';
import { 
  validateImageFile, 
  validateImageFiles, 
  fileToBase64, 
  formatFileSize,
  getUploadErrorMessage 
} from '~/constants/validation';
import { getImageUrl } from '~/utils';
import { toast } from 'react-hot-toast';
import {
  Upload,
  X,
  Loader2,
  AlertCircle,
  Check,
  Image as ImageIcon,
} from 'lucide-react';

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
}: ImageUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [metadata, setMetadata] = useState<Array<{
    title?: string;
    description?: string;
    altText?: string;
  }>>([]);
  const [showMetadataModal, setShowMetadataModal] = useState(false);
  const [previewErrors, setPreviewErrors] = useState<Record<string, boolean>>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { adminToken } = useUserStore();
  const trpc = useTRPC();
  
  // Single upload mutation
  const uploadMutation = useMutation(
    trpc.adminUploadImage.mutationOptions({
      onSuccess: (data) => {
        onChange(data.filePath);
        setSelectedFiles([]);
        setPreviewUrls([]);
        setUploadProgress('');
        setMetadata([]);
        
        toast.success(`✅ Image uploaded successfully!`, { duration: 4000 });
        
        // Show processing info
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
      onError: (error) => {
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
    })
  );

  // Bulk upload mutation
  const bulkUploadMutation = useMutation(
    trpc.adminBulkUploadImages.mutationOptions({
      onSuccess: (data) => {
        if (multiple) {
          const successPaths = data.results.map((r: any) => r.filePath).filter(Boolean);
          onChange(successPaths);
        } else if (data.results.length > 0) {
          onChange(data.results[0].filePath);
        }
        
        setSelectedFiles([]);
        setPreviewUrls([]);
        setUploadProgress('');
        setMetadata([]);
        
        const timeSeconds = (data.processingTime / 1000).toFixed(1);
        
        if (data.errorCount > 0) {
          toast.error(`${data.successCount} uploaded, ${data.errorCount} failed in ${timeSeconds}s`, { duration: 8000 });
          
          data.errors?.forEach((error: any, index: number) => {
            setTimeout(() => {
              toast.error(`❌ ${error.fileName}: ${error.error}`, { duration: 6000 });
            }, (index + 1) * 1000);
          });
        } else {
          toast.success(`🎉 All ${data.successCount} images uploaded in ${timeSeconds}s!`, { duration: 5000 });
        }
      },
      onError: (error) => {
        setUploadProgress('');
        console.error('Bulk upload error:', error);
        
        const errorInfo = getUploadErrorMessage(error.message || 'Bulk upload failed');
        toast.error(`❌ ${errorInfo.message}`, { duration: 8000 });
        
        if (errorInfo.canRetry && selectedFiles.length > 1) {
          setTimeout(() => {
            toast('💡 Try uploading fewer images at once (1-2 maximum)', {
              duration: 6000,
              style: { background: '#dbeafe', color: '#1e40af' }
            });
          }, 2000);
        }
      },
    })
  );
  
  const handleFileSelect = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    
    // Check limits
    if (multiple && fileArray.length > maxImages) {
      toast.error(`Maximum ${maxImages} images allowed. Please select fewer files.`, { duration: 6000 });
      return;
    }
    
    if (!multiple && fileArray.length > 1) {
      toast.error('Only one image can be uploaded at a time.', { duration: 4000 });
      return;
    }
    
    // Validate files
    let validFiles: File[] = [];
    let hasErrors = false;
    
    if (fileArray.length === 1) {
      const validation = validateImageFile(fileArray[0]);
      if (validation.valid) {
        validFiles = fileArray;
        if (validation.warnings) {
          toast(`⚠️ ${validation.warnings[0]}`, {
            duration: 5000,
            style: { background: '#fef3c7', color: '#92400e' }
          });
        }
      } else {
        hasErrors = true;
        const errorInfo = getUploadErrorMessage(validation.error || 'Invalid file');
        toast.error(`❌ ${fileArray[0].name}: ${errorInfo.message}`, { duration: 8000 });
        
        if (errorInfo.suggestions.length > 0) {
          setTimeout(() => {
            toast(`💡 ${errorInfo.suggestions[0]}`, {
              duration: 6000,
              style: { background: '#dbeafe', color: '#1e40af' }
            });
          }, 1500);
        }
      }
    } else {
      const validation = validateImageFiles(fileArray);
      validFiles = validation.validFiles;
      
      if (validation.invalidFiles.length > 0) {
        hasErrors = true;
        validation.invalidFiles.forEach(({ file, error }, index) => {
          setTimeout(() => {
            const errorInfo = getUploadErrorMessage(error);
            toast.error(`❌ ${file.name}: ${errorInfo.message}`, { duration: 6000 });
          }, index * 1000);
        });
      }
      
      if (validation.warnings.length > 0) {
        setTimeout(() => {
          toast(`⚠️ ${validation.warnings.length} files have compatibility notes`, {
            duration: 4000,
            style: { background: '#fef3c7', color: '#92400e' }
          });
        }, 1000);
      }
    }
    
    if (validFiles.length === 0) {
      return;
    }
    
    // Show success for valid files
    if (hasErrors && validFiles.length > 0) {
      setTimeout(() => {
        toast.success(`✅ ${validFiles.length} valid files selected`, { duration: 3000 });
      }, 2000);
    }
    
    setSelectedFiles(validFiles);
    setUploadProgress('Creating previews...');
    setPreviewErrors({});
    
    // Create previews
    try {
      const previews = await Promise.all(
        validFiles.map(file => new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        }))
      );
      
      setPreviewUrls(previews);
      setUploadProgress('');
      
      // Initialize metadata
      setMetadata(validFiles.map(file => ({
        title: file.name.replace(/\.[^/.]+$/, ''),
        description: '',
        altText: '',
      })));
      
      // Auto-upload if metadata not required
      if (!showMetadata) {
        setTimeout(() => handleUpload(), 500);
      }
      
    } catch (error) {
      console.error('Preview creation error:', error);
      toast.error('Failed to create image previews. Please try again.', { duration: 6000 });
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
      setUploadProgress('Preparing images for upload...');
      
      // Prepare image data
      const imagesData = await Promise.all(
        selectedFiles.map(async (file, index) => {
          try {
            setUploadProgress(`Converting image ${index + 1}/${selectedFiles.length}...`);
            
            const base64Content = await fileToBase64(file);
            const meta = metadata[index] || {};
            
            return {
              fileName: file.name,
              fileContent: base64Content,
              fileType: file.type || 'image/jpeg',
              title: meta.title,
              description: meta.description,
              altText: meta.altText,
            };
          } catch (error) {
            throw new Error(`Failed to prepare ${file.name} for upload`);
          }
        })
      );
      
      setUploadProgress(`Uploading ${selectedFiles.length} image(s)...`);
      
      if (multiple || selectedFiles.length > 1) {
        bulkUploadMutation.mutate({
          adminToken,
          images: imagesData,
        });
      } else {
        uploadMutation.mutate({
          adminToken,
          ...imagesData[0],
        });
      }
      
    } catch (error) {
      console.error('Upload preparation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to prepare images', { duration: 6000 });
      setUploadProgress('');
    }
  };
  
  const handleRemove = () => {
    onChange(null);
    setSelectedFiles([]);
    setPreviewUrls([]);
    setUploadProgress('');
    setMetadata([]);
    setPreviewErrors({});
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

  const handlePreviewError = (url: string) => {
    setPreviewErrors(prev => ({ ...prev, [url]: true }));
  };

  const isUploading = uploadMutation.isPending || bulkUploadMutation.isPending;
  const currentImageUrl = previewUrls[0] || (value && !Array.isArray(value) ? getImageUrl(value) : null);
  const currentImageUrls = Array.isArray(value) ? value.map(v => getImageUrl(v)) : [];
  
  // Metadata editor modal
  const MetadataModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Edit Image Details
          </h3>
        </div>
        
        <div className="p-6 space-y-6">
          {selectedFiles.map((file, index) => (
            <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-start space-x-4">
                <img
                  src={previewUrls[index]}
                  alt={file.name}
                  className="w-16 h-16 object-cover rounded"
                />
                <div className="flex-1 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={metadata[index]?.title || ''}
                      onChange={(e) => {
                        const newMetadata = [...metadata];
                        newMetadata[index] = { ...newMetadata[index], title: e.target.value };
                        setMetadata(newMetadata);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Description
                    </label>
                    <textarea
                      value={metadata[index]?.description || ''}
                      onChange={(e) => {
                        const newMetadata = [...metadata];
                        newMetadata[index] = { ...newMetadata[index], description: e.target.value };
                        setMetadata(newMetadata);
                      }}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Alt Text
                    </label>
                    <input
                      type="text"
                      value={metadata[index]?.altText || ''}
                      onChange={(e) => {
                        const newMetadata = [...metadata];
                        newMetadata[index] = { ...newMetadata[index], altText: e.target.value };
                        setMetadata(newMetadata);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              setShowMetadataModal(false);
              handleUpload();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Upload Images
          </button>
        </div>
      </div>
    </div>
  );
  
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragOver
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10'
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
        
        {isUploading ? (
          <div className="flex flex-col items-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {uploadProgress || 'Processing images...'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-2">
            <Upload className="h-8 w-8 text-gray-400" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {placeholder}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              Drag and drop or click to select • JPEG, PNG, WebP supported
              {multiple && ` • Up to ${maxImages} images • Max 25MB each`}
            </p>
          </div>
        )}
      </div>
      
      {/* Selected Files Preview */}
      {selectedFiles.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              Selected Images ({selectedFiles.length})
            </h4>
            {showMetadata && (
              <button
                onClick={() => setShowMetadataModal(true)}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                Edit Details
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {selectedFiles.map((file, index) => (
              <div key={index} className="relative">
                <div className="aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
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
                    const newMetadata = metadata.filter((_, i) => i !== index);
                    setSelectedFiles(newFiles);
                    setPreviewUrls(newPreviews);
                    setMetadata(newMetadata);
                  }}
                  className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
                >
                  <X className="h-3 w-3" />
                </button>
                <div className="mt-2">
                  <p className="text-xs text-gray-900 dark:text-white truncate">{file.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatFileSize(file.size)}
                  </p>
                </div>
              </div>
            ))}
          </div>
          
          {!showMetadata && selectedFiles.length > 0 && !isUploading && (
            <div className="flex justify-center">
              <button
                onClick={handleUpload}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Upload {selectedFiles.length} Image{selectedFiles.length > 1 ? 's' : ''}
              </button>
            </div>
          )}
        </div>
      )}
      
      {/* Current Single Image Preview */}
      {currentImageUrl && selectedFiles.length === 0 && !multiple && (
        <div className="relative">
          <div className={`bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden ${previewClassName}`}>
            {previewErrors[currentImageUrl] ? (
              <div className="flex flex-col items-center justify-center h-full text-red-500 p-6">
                <AlertCircle className="h-12 w-12 mb-3" />
                <p className="text-sm font-medium text-center mb-2">Failed to load image</p>
                <button 
                  onClick={handleRemove}
                  className="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
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
      {currentImageUrls.length > 0 && selectedFiles.length === 0 && multiple && (
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
      
      {/* Error State */}
      {(uploadMutation.isError || bulkUploadMutation.isError) && (
        <div className="flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <p className="text-sm text-red-800 dark:text-red-200">
            {uploadMutation.error?.message || bulkUploadMutation.error?.message || 'Upload failed'}
          </p>
        </div>
      )}
      
      {/* Metadata Editor Modal */}
      {showMetadataModal && <MetadataModal />}
    </div>
  );
}
