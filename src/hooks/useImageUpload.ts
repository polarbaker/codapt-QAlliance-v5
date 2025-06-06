import { useState, useCallback, useRef } from 'react';
import { useTRPC } from '~/trpc/react';
import { useMutation } from '@tanstack/react-query';
import { useUserStore } from '~/stores/userStore';
import { 
  validateImageFile, 
  validateImageFiles, 
  fileToBase64, 
  getUploadErrorMessage 
} from '~/constants/validation';
import { toast } from 'react-hot-toast';

interface UseImageUploadOptions {
  multiple?: boolean;
  maxImages?: number;
  maxFileSize?: number; // in MB
  showMetadata?: boolean;
  enableProgressiveUpload?: boolean;
  enableAutoRetry?: boolean;
  onUploadProgress?: (progress: number) => void;
  onUploadComplete?: (result: any) => void;
  onUploadError?: (error: any) => void;
}

interface ImageMetadata {
  title?: string;
  description?: string;
  altText?: string;
}

interface UploadState {
  selectedFiles: File[];
  previewUrls: string[];
  isUploading: boolean;
  uploadProgress: string;
  metadata: ImageMetadata[];
  errors: Record<string, boolean>;
}

export function useImageUpload(options: UseImageUploadOptions = {}) {
  const {
    multiple = false,
    maxImages = 3,
    maxFileSize = 200,
    showMetadata = false,
    enableProgressiveUpload = true,
    enableAutoRetry = true,
    onUploadProgress,
    onUploadComplete,
    onUploadError,
  } = options;

  const [state, setState] = useState<UploadState>({
    selectedFiles: [],
    previewUrls: [],
    isUploading: false,
    uploadProgress: '',
    metadata: [],
    errors: {},
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { adminToken } = useUserStore();
  const trpc = useTRPC();

  // Single upload mutation
  const singleUploadMutation = useMutation(
    trpc.adminUploadImage.mutationOptions({
      onSuccess: (data) => {
        setState(prev => ({ ...prev, isUploading: false, uploadProgress: '' }));
        
        toast.success('✅ Image uploaded successfully!', { duration: 4000 });
        
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
        
        onUploadComplete?.(data);
        clearState();
      },
      onError: (error) => {
        setState(prev => ({ ...prev, isUploading: false, uploadProgress: '' }));
        
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
        
        onUploadError?.(error);
      },
    })
  );

  // Bulk upload mutation
  const bulkUploadMutation = useMutation(
    trpc.adminBulkUploadImages.mutationOptions({
      onSuccess: (data) => {
        setState(prev => ({ ...prev, isUploading: false, uploadProgress: '' }));
        
        const timeSeconds = (data.processingTime / 1000).toFixed(1);
        
        if (data.errorCount > 0) {
          toast.error(`${data.successCount} uploaded, ${data.errorCount} failed in ${timeSeconds}s`, { 
            duration: 8000 
          });
          
          data.errors?.forEach((error: any, index: number) => {
            setTimeout(() => {
              toast.error(`❌ ${error.fileName}: ${error.error}`, { duration: 6000 });
            }, (index + 1) * 1000);
          });
        } else {
          toast.success(`🎉 All ${data.successCount} images uploaded in ${timeSeconds}s!`, { 
            duration: 5000 
          });
        }
        
        onUploadComplete?.(data);
        clearState();
      },
      onError: (error) => {
        setState(prev => ({ ...prev, isUploading: false, uploadProgress: '' }));
        
        const errorInfo = getUploadErrorMessage(error.message || 'Bulk upload failed');
        toast.error(`❌ ${errorInfo.message}`, { duration: 8000 });
        
        if (errorInfo.canRetry && state.selectedFiles.length > 1) {
          setTimeout(() => {
            toast('💡 Try uploading fewer images at once (1-2 maximum)', {
              duration: 6000,
              style: { background: '#dbeafe', color: '#1e40af' }
            });
          }, 2000);
        }
        
        onUploadError?.(error);
      },
    })
  );

  // Clear state
  const clearState = useCallback(() => {
    setState({
      selectedFiles: [],
      previewUrls: [],
      isUploading: false,
      uploadProgress: '',
      metadata: [],
      errors: {},
    });
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    
    // Check limits
    if (multiple && fileArray.length > maxImages) {
      toast.error(`Maximum ${maxImages} images allowed. Please select fewer files.`, { 
        duration: 6000 
      });
      return;
    }
    
    if (!multiple && fileArray.length > 1) {
      toast.error('Only one image can be uploaded at a time.', { duration: 4000 });
      return;
    }
    
    setState(prev => ({ ...prev, uploadProgress: 'Validating files...' }));
    
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
      setState(prev => ({ ...prev, uploadProgress: '' }));
      return;
    }
    
    setState(prev => ({ ...prev, uploadProgress: 'Creating previews...' }));
    
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
      
      setState(prev => ({
        ...prev,
        selectedFiles: validFiles,
        previewUrls: previews,
        uploadProgress: '',
        metadata: validFiles.map(file => ({
          title: file.name.replace(/\.[^/.]+$/, ''),
          description: '',
          altText: '',
        })),
      }));
      
      // Auto-upload if metadata not required
      if (!showMetadata) {
        setTimeout(() => handleUpload(), 500);
      }
      
    } catch (error) {
      console.error('Preview creation error:', error);
      toast.error('Failed to create image previews. Please try again.', { duration: 6000 });
      setState(prev => ({ ...prev, uploadProgress: '' }));
    }
  }, [multiple, maxImages, showMetadata]);

  // Handle upload
  const handleUpload = useCallback(async () => {
    if (state.selectedFiles.length === 0 || !adminToken) {
      if (!adminToken) {
        toast.error('Authentication required. Please log in and try again.');
      }
      return;
    }
    
    setState(prev => ({ ...prev, isUploading: true, uploadProgress: 'Preparing images...' }));
    
    try {
      // Prepare image data
      const imagesData = await Promise.all(
        state.selectedFiles.map(async (file, index) => {
          setState(prev => ({
            ...prev,
            uploadProgress: `Converting image ${index + 1}/${state.selectedFiles.length}...`
          }));
          
          const base64Content = await fileToBase64(file);
          const meta = state.metadata[index] || {};
          
          return {
            fileName: file.name,
            fileContent: base64Content,
            fileType: file.type || 'image/jpeg',
            title: meta.title,
            description: meta.description,
            altText: meta.altText,
          };
        })
      );
      
      setState(prev => ({ ...prev, uploadProgress: 'Uploading images...' }));
      
      // Determine upload strategy (simplified, no progressive upload)
      if (multiple || state.selectedFiles.length > 1) {
        // Use bulk upload
        bulkUploadMutation.mutate({
          adminToken,
          images: imagesData,
        });
      } else {
        // Use single upload
        singleUploadMutation.mutate({
          adminToken,
          ...imagesData[0],
        });
      }
      
    } catch (error) {
      console.error('Upload preparation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to prepare images', { 
        duration: 6000 
      });
      setState(prev => ({ ...prev, isUploading: false, uploadProgress: '' }));
    }
  }, [state.selectedFiles, state.metadata, adminToken, multiple, singleUploadMutation, bulkUploadMutation]);

  // Update metadata
  const updateMetadata = useCallback((index: number, newMetadata: Partial<ImageMetadata>) => {
    setState(prev => ({
      ...prev,
      metadata: prev.metadata.map((meta, i) => 
        i === index ? { ...meta, ...newMetadata } : meta
      ),
    }));
  }, []);

  // Remove file
  const removeFile = useCallback((index: number) => {
    setState(prev => ({
      ...prev,
      selectedFiles: prev.selectedFiles.filter((_, i) => i !== index),
      previewUrls: prev.previewUrls.filter((_, i) => i !== index),
      metadata: prev.metadata.filter((_, i) => i !== index),
    }));
  }, []);

  // Trigger file input
  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return {
    // State
    ...state,
    
    // Computed state
    isLoading: singleUploadMutation.isPending || bulkUploadMutation.isPending,
    hasFiles: state.selectedFiles.length > 0,
    
    // Actions
    handleFileSelect,
    handleUpload,
    updateMetadata,
    removeFile,
    clearState,
    triggerFileInput,
    
    // Refs
    fileInputRef,
    
    // Mutation states
    uploadError: singleUploadMutation.error || bulkUploadMutation.error,
    isSuccess: singleUploadMutation.isSuccess || bulkUploadMutation.isSuccess,
  };
}
