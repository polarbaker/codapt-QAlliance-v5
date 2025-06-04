import React, { useState, useRef, useCallback } from 'react';
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
  RefreshCw,
  Zap,
  Shield,
  Clock,
  FileText,
} from 'lucide-react';

interface BulletproofImageUploadProps {
  value?: string | string[];
  onChange: (imagePath: string | string[] | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  previewClassName?: string;
  multiple?: boolean;
  maxImages?: number;
  showMetadata?: boolean;
  enableProgressiveUpload?: boolean;
  enableAutoRetry?: boolean;
  enableClientOptimization?: boolean;
  maxFileSize?: number; // in MB
  onUploadProgress?: (progress: number) => void;
  onUploadComplete?: (result: any) => void;
  onUploadError?: (error: any) => void;
  // Enhanced form integration props
  onFormValueSet?: (filePath: string | string[] | null) => void;
  validateImmediately?: boolean;
  retryFormUpdate?: boolean;
}

interface UploadProgress {
  phase: 'preparing' | 'uploading' | 'processing' | 'complete' | 'error';
  percentage: number;
  message: string;
  strategy?: string;
  warnings?: string[];
}

interface ProgressiveUploadState {
  sessionId?: string;
  totalChunks: number;
  uploadedChunks: number;
  chunkSize: number;
}

interface RetryState {
  attempts: number;
  maxAttempts: number;
  canRetry: boolean;
  retryAfter?: number;
  lastError?: string;
}

export function BulletproofImageUpload({
  value,
  onChange,
  placeholder = "Upload any image - bulletproof processing enabled",
  className = "",
  disabled = false,
  previewClassName = "h-32",
  multiple = false,
  maxImages = 5,
  showMetadata = false,
  enableProgressiveUpload = true,
  enableAutoRetry = true,
  enableClientOptimization = true,
  maxFileSize = 200, // 200MB default for bulletproof system
  onUploadProgress,
  onUploadComplete,
  onUploadError,
  // Enhanced form integration props
  onFormValueSet,
  validateImmediately = true,
  retryFormUpdate = true,
}: BulletproofImageUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    phase: 'preparing',
    percentage: 0,
    message: '',
  });
  const [progressiveState, setProgressiveState] = useState<ProgressiveUploadState | null>(null);
  const [retryState, setRetryState] = useState<RetryState>({
    attempts: 0,
    maxAttempts: 3,
    canRetry: false,
  });
  const [metadata, setMetadata] = useState<Array<{
    title?: string;
    description?: string;
    altText?: string;
  }>>([]);
  const [showMetadataModal, setShowMetadataModal] = useState(false);
  const [previewErrors, setPreviewErrors] = useState<Record<string, boolean>>({});
  const [isOptimizing, setIsOptimizing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { adminToken } = useUserStore();
  const trpc = useTRPC();

  // Enhanced form value patching with retry logic and validation triggering
  const patchFormValueWithRetry = useCallback(async (
    filePath: string | string[] | null,
    retryCount: number = 0,
    maxRetries: number = 3
  ): Promise<boolean> => {
    try {
      console.log('🔍 DEBUG: BulletproofImageUpload - patchFormValueWithRetry called:', {
        filePath: filePath,
        filePathType: typeof filePath,
        filePathLength: Array.isArray(filePath) ? filePath.length : filePath?.length,
        retryCount: retryCount,
        maxRetries: maxRetries,
        timestamp: new Date().toISOString()
      });

      // Call the parent onChange handler
      onChange(filePath);
      
      // Additional callback for direct form integration
      if (onFormValueSet) {
        onFormValueSet(filePath);
      }
      
      // Wait a brief moment for React state updates to propagate
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Verify the update was successful by checking if value prop has changed
      let updateSuccessful = false;
      
      if (Array.isArray(filePath)) {
        updateSuccessful = Array.isArray(value) && 
                          value.length === filePath.length && 
                          value.every((v, i) => v === filePath[i]);
      } else if (filePath === null) {
        updateSuccessful = !value || value === '' || (Array.isArray(value) && value.length === 0);
      } else {
        updateSuccessful = value === filePath;
      }
      
      console.log('🔍 DEBUG: BulletproofImageUpload - Form value update verification:', {
        expectedValue: filePath,
        actualValue: value,
        updateSuccessful: updateSuccessful,
        retryCount: retryCount,
        timestamp: new Date().toISOString()
      });
      
      if (updateSuccessful || retryCount >= maxRetries) {
        if (updateSuccessful) {
          console.log('✅ DEBUG: BulletproofImageUpload - Form value successfully updated');
          return true;
        } else {
          console.warn('⚠️ DEBUG: BulletproofImageUpload - Form value update failed after max retries');
          return false;
        }
      }
      
      // Retry if update wasn't successful
      console.log('🔄 DEBUG: BulletproofImageUpload - Retrying form value update...');
      await new Promise(resolve => setTimeout(resolve, 100 * (retryCount + 1))); // Exponential backoff
      return patchFormValueWithRetry(filePath, retryCount + 1, maxRetries);
      
    } catch (error) {
      console.error('❌ DEBUG: BulletproofImageUpload - Error in patchFormValueWithRetry:', error);
      
      if (retryCount < maxRetries) {
        console.log('🔄 DEBUG: BulletproofImageUpload - Retrying after error...');
        await new Promise(resolve => setTimeout(resolve, 200 * (retryCount + 1)));
        return patchFormValueWithRetry(filePath, retryCount + 1, maxRetries);
      }
      
      return false;
    }
  }, [onChange, onFormValueSet, value]);

  const optimizeImageOnClient = useCallback(async (file: File): Promise<File> => {
    if (!enableClientOptimization) {
      return file;
    }
    
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        try {
          // Calculate optimal dimensions
          let { width, height } = img;
          const maxDimension = 2048;
          
          if (width > maxDimension || height > maxDimension) {
            const ratio = Math.min(maxDimension / width, maxDimension / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }
          
          canvas.width = width;
          canvas.height = height;
          
          // Draw and compress
          ctx?.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const optimizedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(optimizedFile);
              } else {
                resolve(file); // Fallback to original
              }
            },
            'image/jpeg',
            0.85
          );
        } catch (error) {
          resolve(file); // Fallback to original on error
        }
      };
      
      img.onerror = () => resolve(file); // Fallback to original
      img.src = URL.createObjectURL(file);
    });
  }, [enableClientOptimization]);

  const shouldUseProgressiveUpload = useCallback((file: File): boolean => {
    if (!enableProgressiveUpload) return false;
    
    const sizeMB = file.size / (1024 * 1024);
    return sizeMB > 25; // Use progressive upload for files > 25MB
  }, [enableProgressiveUpload]);

  const createFileChunks = useCallback((file: File, chunkSize: number = 5 * 1024 * 1024): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      const chunks: string[] = [];
      let offset = 0;
      
      const readNextChunk = () => {
        const reader = new FileReader();
        const slice = file.slice(offset, offset + chunkSize);
        
        reader.onload = (e) => {
          const result = e.target?.result as string;
          chunks.push(result);
          offset += chunkSize;
          
          if (offset < file.size) {
            readNextChunk();
          } else {
            resolve(chunks);
          }
        };
        
        reader.onerror = () => reject(new Error('Failed to read file chunk'));
        reader.readAsDataURL(slice);
      };
      
      readNextChunk();
    });
  }, []);

  // Single upload mutation with bulletproof processing
  const bulletproofUploadMutation = useMutation(
    trpc.bulletproofSingleUpload.mutationOptions({
      onSuccess: async (data) => {
        console.log('🔍 DEBUG 4a: BulletproofImageUpload bulletproofUploadMutation onSuccess - EXACT data.filePath value:', {
          dataFilePath: data.filePath,
          dataFilePathType: typeof data.filePath,
          dataFilePathLength: data.filePath?.length,
          dataFilePathTrimmed: data.filePath?.trim(),
          isEmptyString: data.filePath === '',
          isNull: data.filePath === null,
          isUndefined: data.filePath === undefined,
          fullDataObject: data,
          timestamp: new Date().toISOString()
        });
        
        setUploadProgress({
          phase: 'complete',
          percentage: 100,
          message: 'Upload completed successfully!',
          strategy: data.metadata?.strategy,
          warnings: data.warnings,
        });
        
        // Enhanced null/undefined checks for filePath with detailed logging
        if (data && data.filePath && typeof data.filePath === 'string' && data.filePath.trim() !== '') {
          console.log('🔍 DEBUG 4b: BulletproofImageUpload - Just before calling enhanced form patching with filePath:', {
            filePathToPass: data.filePath,
            filePathType: typeof data.filePath,
            filePathLength: data.filePath.length,
            filePathTrimmed: data.filePath.trim(),
            retryFormUpdate: retryFormUpdate,
            timestamp: new Date().toISOString()
          });
          
          // Use enhanced form value patching with retry logic
          const patchSuccess = await patchFormValueWithRetry(data.filePath);
          
          if (patchSuccess) {
            console.log('✅ DEBUG 4b-SUCCESS: BulletproofImageUpload - Enhanced form patching successful for:', {
              filePath: data.filePath,
              timestamp: new Date().toISOString()
            });
          } else {
            console.warn('⚠️ DEBUG 4b-FAILED: BulletproofImageUpload - Enhanced form patching failed for:', {
              filePath: data.filePath,
              timestamp: new Date().toISOString()
            });
            
            // Fallback: try direct onChange one more time
            console.log('🔄 DEBUG: BulletproofImageUpload - Attempting fallback direct onChange call');
            onChange(data.filePath);
          }
          
        } else {
          console.error('❌ DEBUG: BulletproofImageUpload - Invalid filePath in upload response:', {
            data: data,
            filePath: data?.filePath,
            filePathType: typeof data?.filePath,
            filePathLength: data?.filePath?.length,
            filePathTrimmed: data?.filePath?.trim?.(),
            isEmptyAfterTrim: data?.filePath?.trim?.() === '',
            timestamp: new Date().toISOString()
          });
          toast.error('Upload completed but file path is missing or invalid. Please try again.');
          
          // Don't update form with invalid data
          return;
        }
        
        setSelectedFiles([]);
        setPreviewUrls([]);
        setMetadata([]);
        setRetryState({ attempts: 0, maxAttempts: 3, canRetry: false });
        
        toast.success(`✅ Image uploaded successfully with ${data.metadata?.strategy || 'bulletproof'} processing!`, { 
          duration: 5000 
        });
        
        // Show processing details
        if (data.metadata) {
          const originalMB = (data.metadata.originalSize / (1024 * 1024)).toFixed(1);
          const processedMB = (data.metadata.processedSize / (1024 * 1024)).toFixed(1);
          const timeSeconds = (data.metadata.totalProcessingTime / 1000).toFixed(1);
          
          setTimeout(() => {
            toast(`🚀 Processed in ${timeSeconds}s: ${originalMB}MB → ${processedMB}MB (${data.metadata.strategy})`, {
              duration: 4000,
              style: { background: '#f0f9ff', color: '#0369a1' }
            });
          }, 1000);
        }
        
        if (data.warnings && data.warnings.length > 0) {
          setTimeout(() => {
            toast(`⚠️ ${data.warnings[0]}`, {
              duration: 6000,
              style: { background: '#fef3c7', color: '#92400e' }
            });
          }, 2000);
        }
        
        onUploadComplete?.(data);
      },
      onError: (error) => {
        console.error('Bulletproof upload error:', error);
        
        setUploadProgress({
          phase: 'error',
          percentage: 0,
          message: 'Upload failed',
        });
        
        const errorInfo = getUploadErrorMessage(error.message || 'Upload failed');
        
        // Update retry state
        setRetryState(prev => ({
          ...prev,
          attempts: prev.attempts + 1,
          canRetry: errorInfo.canRetry && prev.attempts < prev.maxAttempts,
          lastError: error.message,
        }));
        
        toast.error(`❌ ${errorInfo.message}`, { duration: 8000 });
        
        if (errorInfo.suggestions.length > 0) {
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

  // Progressive upload mutation
  const progressiveUploadMutation = useMutation(
    trpc.bulletproofProgressiveUpload.mutationOptions({
      onSuccess: async (data) => {
        console.log('🔍 DEBUG 4a: BulletproofImageUpload progressiveUploadMutation onSuccess - EXACT data response:', {
          data: data,
          dataComplete: data.complete,
          dataFilePath: data.filePath,
          dataFilePathType: typeof data.filePath,
          timestamp: new Date().toISOString()
        });
        
        if (data.complete) {
          // Progressive upload completed
          setUploadProgress({
            phase: 'complete',
            percentage: 100,
            message: 'Progressive upload completed!',
          });
          
          // Enhanced null/undefined checks for filePath with detailed logging
          if (data && data.filePath && typeof data.filePath === 'string' && data.filePath.trim() !== '') {
            console.log('🔍 DEBUG 4b: BulletproofImageUpload - Progressive upload - Just before calling enhanced form patching:', {
              filePathToPass: data.filePath,
              filePathType: typeof data.filePath,
              filePathLength: data.filePath.length,
              sessionId: data.sessionId,
              totalChunks: data.totalChunks,
              timestamp: new Date().toISOString()
            });
            
            // Use enhanced form value patching with retry logic
            const patchSuccess = await patchFormValueWithRetry(data.filePath);
            
            if (patchSuccess) {
              console.log('✅ DEBUG 4b-SUCCESS: BulletproofImageUpload - Progressive upload enhanced form patching successful');
            } else {
              console.warn('⚠️ DEBUG 4b-FAILED: BulletproofImageUpload - Progressive upload enhanced form patching failed');
              // Fallback: try direct onChange one more time
              onChange(data.filePath);
            }
            
          } else {
            console.error('❌ DEBUG: BulletproofImageUpload - Invalid filePath in progressive upload response:', {
              data: data,
              filePath: data?.filePath,
              filePathType: typeof data?.filePath,
              complete: data?.complete,
              timestamp: new Date().toISOString()
            });
            toast.error('Progressive upload completed but file path is missing or invalid. Please try again.');
            return;
          }
          
          setSelectedFiles([]);
          setPreviewUrls([]);
          setProgressiveState(null);
          
          toast.success('🎉 Large file uploaded successfully with progressive upload!', { duration: 5000 });
          onUploadComplete?.(data);
        } else {
          // Update progress
          const percentage = (data.receivedChunks / data.totalChunks) * 100;
          console.log('🔍 DEBUG: BulletproofImageUpload - Progressive upload progress:', {
            receivedChunks: data.receivedChunks,
            totalChunks: data.totalChunks,
            percentage: percentage.toFixed(1),
            timestamp: new Date().toISOString()
          });
          
          setUploadProgress({
            phase: 'uploading',
            percentage,
            message: `Uploading chunk ${data.receivedChunks}/${data.totalChunks}...`,
          });
          
          setProgressiveState(prev => prev ? {
            ...prev,
            uploadedChunks: data.receivedChunks,
          } : null);
        }
      },
      onError: (error) => {
        console.error('Progressive upload error:', error);
        
        setUploadProgress({
          phase: 'error',
          percentage: 0,
          message: 'Progressive upload failed',
        });
        
        setProgressiveState(null);
        
        const errorInfo = getUploadErrorMessage(error.message || 'Progressive upload failed');
        toast.error(`❌ ${errorInfo.message}`, { duration: 8000 });
        
        onUploadError?.(error);
      },
    })
  );

  // Bulk upload mutation
  const bulletproofBulkUploadMutation = useMutation(
    trpc.bulletproofBulkUpload.mutationOptions({
      onSuccess: async (data) => {
        console.log('🔍 DEBUG 4a: BulletproofImageUpload bulletproofBulkUploadMutation onSuccess - EXACT data response:', {
          data: data,
          resultsLength: data.results?.length,
          results: data.results,
          timestamp: new Date().toISOString()
        });
        
        setUploadProgress({
          phase: 'complete',
          percentage: 100,
          message: `Bulk upload completed: ${data.summary.successCount}/${data.summary.totalProcessed} successful`,
        });
        
        if (multiple) {
          const successPaths = data.results.filter((r: any) => r.success).map((r: any) => r.filePath);
          const validPaths = successPaths.filter((path: any) => path && typeof path === 'string' && path.trim() !== '');
          
          console.log('🔍 DEBUG 4b: BulletproofImageUpload - Bulk upload processing results for multiple:', {
            totalResults: data.results.length,
            successCount: successPaths.length,
            validPathCount: validPaths.length,
            validPaths: validPaths,
            successPaths: successPaths,
            timestamp: new Date().toISOString()
          });
          
          if (validPaths.length > 0) {
            console.log('🔍 DEBUG 4b: BulletproofImageUpload - Just before calling enhanced form patching with bulk upload paths:', {
              pathsToPass: validPaths,
              pathsType: typeof validPaths,
              pathsLength: validPaths.length,
              timestamp: new Date().toISOString()
            });
            
            // Use enhanced form value patching with retry logic
            const patchSuccess = await patchFormValueWithRetry(validPaths);
            
            if (patchSuccess) {
              console.log('✅ DEBUG 4b-SUCCESS: BulletproofImageUpload - Bulk upload enhanced form patching successful');
            } else {
              console.warn('⚠️ DEBUG 4b-FAILED: BulletproofImageUpload - Bulk upload enhanced form patching failed');
              // Fallback: try direct onChange one more time
              onChange(validPaths);
            }
            
          } else {
            console.error('❌ DEBUG: BulletproofImageUpload - No valid filePaths in bulk upload results:', {
              results: data.results,
              successPaths: successPaths,
              timestamp: new Date().toISOString()
            });
            toast.error('Bulk upload completed but no valid file paths returned. Please try again.');
            return;
          }
        } else if (data.results.length > 0 && data.results[0].success) {
          const filePath = data.results[0].filePath;
          
          console.log('🔍 DEBUG 4a: BulletproofImageUpload - Single upload from bulk processing result:', {
            result: data.results[0],
            filePath: filePath,
            filePathType: typeof filePath,
            timestamp: new Date().toISOString()
          });
          
          if (filePath && typeof filePath === 'string' && filePath.trim() !== '') {
            console.log('🔍 DEBUG 4b: BulletproofImageUpload - Just before calling enhanced form patching with bulk single upload:', {
              filePathToPass: filePath,
              filePathType: typeof filePath,
              filePathLength: filePath.length,
              timestamp: new Date().toISOString()
            });
            
            // Use enhanced form value patching with retry logic
            const patchSuccess = await patchFormValueWithRetry(filePath);
            
            if (patchSuccess) {
              console.log('✅ DEBUG 4b-SUCCESS: BulletproofImageUpload - Bulk single upload enhanced form patching successful');
            } else {
              console.warn('⚠️ DEBUG 4b-FAILED: BulletproofImageUpload - Bulk single upload enhanced form patching failed');
              // Fallback: try direct onChange one more time
              onChange(filePath);
            }
            
          } else {
            console.error('❌ DEBUG: BulletproofImageUpload - Invalid filePath in bulk single upload result:', {
              result: data.results[0],
              filePath: filePath,
              filePathType: typeof filePath,
              timestamp: new Date().toISOString()
            });
            toast.error('Upload completed but file path is missing or invalid. Please try again.');
            return;
          }
        }
        
        setSelectedFiles([]);
        setPreviewUrls([]);
        setMetadata([]);
        
        const timeSeconds = (data.summary.processingTime / 1000).toFixed(1);
        
        if (data.summary.errorCount > 0) {
          toast.error(`${data.summary.successCount} uploaded, ${data.summary.errorCount} failed in ${timeSeconds}s`, { 
            duration: 8000 
          });
          
          data.errors?.forEach((error: any, index: number) => {
            setTimeout(() => {
              toast.error(`❌ ${error.fileName}: ${error.error}`, { duration: 6000 });
            }, (index + 1) * 1000);
          });
        } else {
          toast.success(`🎉 All ${data.summary.successCount} images uploaded in ${timeSeconds}s!`, { 
            duration: 5000 
          });
        }
        
        onUploadComplete?.(data);
      },
      onError: (error) => {
        console.error('Bulletproof bulk upload error:', error);
        
        setUploadProgress({
          phase: 'error',
          percentage: 0,
          message: 'Bulk upload failed',
        });
        
        const errorInfo = getUploadErrorMessage(error.message || 'Bulk upload failed');
        toast.error(`❌ ${errorInfo.message}`, { duration: 8000 });
        
        onUploadError?.(error);
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
    
    setUploadProgress({
      phase: 'preparing',
      percentage: 10,
      message: 'Validating files...',
    });
    
    // Enhanced validation
    let validFiles: File[] = [];
    let hasErrors = false;
    
    if (fileArray.length === 1) {
      const validation = validateImageFile(fileArray[0]);
      
      // More lenient validation for bulletproof system
      if (validation.valid || validation.category === 'size') {
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
    }
    
    if (validFiles.length === 0) {
      setUploadProgress({
        phase: 'error',
        percentage: 0,
        message: 'No valid files selected',
      });
      return;
    }
    
    setUploadProgress({
      phase: 'preparing',
      percentage: 30,
      message: 'Optimizing images...',
    });
    
    // Client-side optimization
    if (enableClientOptimization) {
      setIsOptimizing(true);
      try {
        const optimizedFiles = await Promise.all(
          validFiles.map(async (file) => {
            const sizeMB = file.size / (1024 * 1024);
            if (sizeMB > 10) {
              return await optimizeImageOnClient(file);
            }
            return file;
          })
        );
        validFiles = optimizedFiles;
        
        toast.success('✨ Images optimized for faster upload', { duration: 3000 });
      } catch (error) {
        console.warn('Client optimization failed:', error);
        toast(`⚠️ Client optimization failed, proceeding with original files`, {
          duration: 4000,
          style: { background: '#fef3c7', color: '#92400e' }
        });
      }
      setIsOptimizing(false);
    }
    
    setSelectedFiles(validFiles);
    setUploadProgress({
      phase: 'preparing',
      percentage: 50,
      message: 'Creating previews...',
    });
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
      setUploadProgress({
        phase: 'preparing',
        percentage: 70,
        message: 'Ready to upload',
      });
      
      // Initialize metadata
      setMetadata(validFiles.map(file => ({
        title: file.name.replace(/\.[^/.]+$/, ''),
        description: '',
        altText: '',
      })));
      
      // Auto-upload if metadata not required
      if (!showMetadata) {
        setTimeout(() => handleUpload(), 500);
      } else {
        setUploadProgress({
          phase: 'preparing',
          percentage: 100,
          message: 'Ready - please review metadata',
        });
      }
      
    } catch (error) {
      console.error('Preview creation error:', error);
      toast.error('Failed to create image previews. Please try again.', { duration: 6000 });
      setSelectedFiles([]);
      setPreviewUrls([]);
      setUploadProgress({
        phase: 'error',
        percentage: 0,
        message: 'Preview creation failed',
      });
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
      setUploadProgress({
        phase: 'uploading',
        percentage: 5,
        message: 'Starting upload...',
      });
      
      // Check if any files need progressive upload
      const largeFiles = selectedFiles.filter(shouldUseProgressiveUpload);
      
      if (largeFiles.length > 0 && selectedFiles.length === 1) {
        // Handle single large file with progressive upload
        await handleProgressiveUpload(selectedFiles[0]);
      } else if (selectedFiles.length > 1) {
        // Handle bulk upload
        await handleBulkUpload();
      } else {
        // Handle single file with standard upload
        await handleSingleUpload(selectedFiles[0]);
      }
      
    } catch (error) {
      console.error('Upload error:', error);
      setUploadProgress({
        phase: 'error',
        percentage: 0,
        message: 'Upload failed',
      });
    }
  };

  const handleSingleUpload = async (file: File) => {
    setUploadProgress({
      phase: 'uploading',
      percentage: 20,
      message: 'Converting image...',
    });
    
    const base64Content = await fileToBase64(file);
    const meta = metadata[0] || {};
    
    setUploadProgress({
      phase: 'processing',
      percentage: 40,
      message: 'Processing with bulletproof system...',
    });
    
    bulletproofUploadMutation.mutate({
      adminToken,
      fileName: file.name,
      fileContent: base64Content,
      fileType: file.type || 'image/jpeg',
      title: meta.title,
      description: meta.description,
      altText: meta.altText,
    });
  };

  const handleProgressiveUpload = async (file: File) => {
    const chunkSize = 5 * 1024 * 1024; // 5MB chunks
    const totalChunks = Math.ceil(file.size / chunkSize);
    
    setProgressiveState({
      sessionId: undefined,
      totalChunks,
      uploadedChunks: 0,
      chunkSize,
    });
    
    setUploadProgress({
      phase: 'uploading',
      percentage: 10,
      message: `Preparing ${totalChunks} chunks for progressive upload...`,
    });
    
    try {
      const chunks = await createFileChunks(file, chunkSize);
      let sessionId: string | undefined;
      
      for (let i = 0; i < chunks.length; i++) {
        setUploadProgress({
          phase: 'uploading',
          percentage: 10 + (i / chunks.length) * 80,
          message: `Uploading chunk ${i + 1}/${chunks.length}...`,
        });
        
        const chunkData = {
          adminToken,
          chunkId: `${Date.now()}_${i}`,
          chunkIndex: i,
          totalChunks: chunks.length,
          data: chunks[i],
          fileName: file.name,
          fileType: file.type || 'image/jpeg',
          sessionId,
        };
        
        const result = await new Promise<any>((resolve, reject) => {
          progressiveUploadMutation.mutate(chunkData, {
            onSuccess: resolve,
            onError: reject,
          });
        });
        
        if (!sessionId) {
          sessionId = result.sessionId;
          setProgressiveState(prev => prev ? { ...prev, sessionId } : null);
        }
      }
      
    } catch (error) {
      console.error('Progressive upload error:', error);
      setProgressiveState(null);
      throw error;
    }
  };

  const handleBulkUpload = async () => {
    setUploadProgress({
      phase: 'uploading',
      percentage: 20,
      message: 'Preparing bulk upload...',
    });
    
    const imagesData = await Promise.all(
      selectedFiles.map(async (file, index) => {
        setUploadProgress({
          phase: 'uploading',
          percentage: 20 + (index / selectedFiles.length) * 30,
          message: `Converting image ${index + 1}/${selectedFiles.length}...`,
        });
        
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
      })
    );
    
    setUploadProgress({
      phase: 'processing',
      percentage: 60,
      message: 'Processing with bulletproof bulk system...',
    });
    
    bulletproofBulkUploadMutation.mutate({
      adminToken,
      images: imagesData,
    });
  };

  const handleRetry = useCallback(async () => {
    if (!retryState.canRetry || selectedFiles.length === 0) {
      return;
    }
    
    setRetryState(prev => ({
      ...prev,
      attempts: prev.attempts + 1,
    }));
    
    toast(`🔄 Retrying upload (attempt ${retryState.attempts + 1}/${retryState.maxAttempts})...`, {
      duration: 3000,
    });
    
    // Wait if retryAfter is specified
    if (retryState.retryAfter) {
      await new Promise(resolve => setTimeout(resolve, retryState.retryAfter! * 1000));
    }
    
    handleUpload();
  }, [retryState, selectedFiles, handleUpload]);

  // Auto-retry effect
  React.useEffect(() => {
    if (enableAutoRetry && retryState.canRetry && uploadProgress.phase === 'error') {
      const retryDelay = Math.pow(2, retryState.attempts) * 2000; // Exponential backoff
      
      toast(`⏰ Auto-retry in ${retryDelay / 1000} seconds...`, {
        duration: retryDelay - 500,
        style: { background: '#dbeafe', color: '#1e40af' }
      });
      
      const timer = setTimeout(handleRetry, retryDelay);
      return () => clearTimeout(timer);
    }
  }, [enableAutoRetry, retryState.canRetry, uploadProgress.phase, handleRetry]);

  const handleRemove = async () => {
    console.log('🔍 DEBUG: BulletproofImageUpload handleRemove called - clearing all state and form value');
    
    // Log current state before clearing
    console.log('🔍 DEBUG: BulletproofImageUpload - Current state before removal:', {
      selectedFiles: selectedFiles.length,
      previewUrls: previewUrls.length,
      currentValue: value,
      uploadPhase: uploadProgress.phase,
      timestamp: new Date().toISOString()
    });
    
    console.log('🔍 DEBUG: BulletproofImageUpload - Just before calling enhanced form patching to clear form value');
    
    // Use enhanced form value patching to clear the value
    const patchSuccess = await patchFormValueWithRetry(null);
    
    if (patchSuccess) {
      console.log('✅ DEBUG: BulletproofImageUpload - Enhanced form patching successful for clearing value');
    } else {
      console.warn('⚠️ DEBUG: BulletproofImageUpload - Enhanced form patching failed for clearing, using fallback');
      // Fallback: try direct onChange
      onChange(null);
    }
    
    setSelectedFiles([]);
    setPreviewUrls([]);
    setUploadProgress({ phase: 'preparing', percentage: 0, message: '' });
    setMetadata([]);
    setPreviewErrors({});
    setProgressiveState(null);
    setRetryState({ attempts: 0, maxAttempts: 3, canRetry: false });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    console.log('🔍 DEBUG: BulletproofImageUpload - All state cleared successfully');
  };

  const isUploading = bulletproofUploadMutation.isPending || 
                     progressiveUploadMutation.isPending || 
                     bulletproofBulkUploadMutation.isPending ||
                     isOptimizing;

  const currentImageUrl = previewUrls[0] || (value && !Array.isArray(value) ? getImageUrl(value) : null);
  const currentImageUrls = Array.isArray(value) ? value.map(v => getImageUrl(v)) : [];

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Enhanced Upload Area with Bulletproof Indicators */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 ${
          dragOver
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10 scale-[1.02]'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const files = Array.from(e.dataTransfer.files);
          if (files.length > 0) handleFileSelect(files);
        }}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple={multiple}
          className="hidden"
          disabled={disabled}
          onChange={(e) => {
            const files = e.target.files;
            if (files) handleFileSelect(files);
          }}
        />
        
        {isUploading ? (
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              {uploadProgress.strategy && (
                <Shield className="h-4 w-4 absolute -top-1 -right-1 text-green-600" />
              )}
            </div>
            
            <div className="w-full max-w-xs">
              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                <span>{uploadProgress.phase}</span>
                <span>{uploadProgress.percentage.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress.percentage}%` }}
                />
              </div>
            </div>
            
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {uploadProgress.message}
            </p>
            
            {uploadProgress.strategy && (
              <div className="flex items-center space-x-1 text-xs text-green-600">
                <Zap className="h-3 w-3" />
                <span>Using {uploadProgress.strategy} strategy</span>
              </div>
            )}
            
            {progressiveState && (
              <div className="text-xs text-blue-600">
                Progressive Upload: {progressiveState.uploadedChunks}/{progressiveState.totalChunks} chunks
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-3">
            <div className="relative">
              <Upload className="h-8 w-8 text-gray-400" />
              <Shield className="h-4 w-4 absolute -top-1 -right-1 text-green-600" />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {placeholder}
              </p>
              <div className="flex items-center justify-center space-x-2 text-xs text-green-600">
                <Shield className="h-3 w-3" />
                <span>Bulletproof Processing</span>
                {enableProgressiveUpload && (
                  <>
                    <span>•</span>
                    <Clock className="h-3 w-3" />
                    <span>Progressive Upload</span>
                  </>
                )}
                {enableAutoRetry && (
                  <>
                    <span>•</span>
                    <RefreshCw className="h-3 w-3" />
                    <span>Auto Retry</span>
                  </>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                Any format, any size up to {maxFileSize}MB • Automatic optimization
                {multiple && ` • Up to ${maxImages} images`}
              </p>
            </div>
          </div>
        )}
      </div>
      
      {/* Error State with Retry Options */}
      {uploadProgress.phase === 'error' && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800 dark:text-red-200">
                Upload Failed
              </p>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                {retryState.lastError || 'An error occurred during upload'}
              </p>
              
              {retryState.canRetry && (
                <div className="mt-3 flex items-center space-x-3">
                  <button
                    onClick={handleRetry}
                    className="inline-flex items-center space-x-1 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>Retry ({retryState.attempts}/{retryState.maxAttempts})</span>
                  </button>
                  
                  {enableAutoRetry && (
                    <span className="text-xs text-red-600">
                      Auto-retry enabled
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Success State with Processing Details */}
      {uploadProgress.phase === 'complete' && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-center space-x-3">
            <Check className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                {uploadProgress.message}
              </p>
              {uploadProgress.strategy && (
                <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                  Processed with {uploadProgress.strategy} strategy
                </p>
              )}
            </div>
          </div>
          
          {uploadProgress.warnings && uploadProgress.warnings.length > 0 && (
            <div className="mt-2 space-y-1">
              {uploadProgress.warnings.map((warning, index) => (
                <p key={index} className="text-xs text-amber-700 dark:text-amber-300">
                  ⚠️ {warning}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* File Previews */}
      {previewUrls.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Selected Files ({previewUrls.length})
            </h4>
            <button
              onClick={handleRemove}
              className="text-xs text-red-600 hover:text-red-700"
            >
              Clear All
            </button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {previewUrls.map((url, index) => (
              <div key={index} className="relative group">
                <div className={`${previewClassName} w-full bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden`}>
                  <img
                    src={url}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={() => setPreviewErrors(prev => ({ ...prev, [index]: true }))}
                  />
                  {previewErrors[index] && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                      <AlertCircle className="h-6 w-6 text-gray-400" />
                    </div>
                  )}
                </div>
                
                <div className="mt-1 text-xs text-gray-600 dark:text-gray-400 truncate">
                  {selectedFiles[index]?.name}
                </div>
                
                <div className="text-xs text-gray-500 dark:text-gray-500">
                  {formatFileSize(selectedFiles[index]?.size || 0)}
                </div>
              </div>
            ))}
          </div>
          
          {showMetadata && (
            <button
              onClick={() => setShowMetadataModal(true)}
              className="w-full mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FileText className="h-4 w-4 inline mr-2" />
              Review Metadata & Upload
            </button>
          )}
        </div>
      )}
      
      {/* Current Images Display */}
      {(currentImageUrl || currentImageUrls.length > 0) && previewUrls.length === 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Current Images
            </h4>
            <button
              onClick={handleRemove}
              className="text-xs text-red-600 hover:text-red-700"
            >
              Remove All
            </button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {multiple ? (
              currentImageUrls.map((url, index) => (
                <div key={index} className="relative group">
                  <div className={`${previewClassName} w-full bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden`}>
                    <img
                      src={url}
                      alt={`Current image ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              ))
            ) : currentImageUrl ? (
              <div className="relative group">
                <div className={`${previewClassName} w-full bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden`}>
                  <img
                    src={currentImageUrl}
                    alt="Current image"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
