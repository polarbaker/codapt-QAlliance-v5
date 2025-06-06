import React, { useState, useRef, useCallback } from 'react';
import { useTRPC } from '~/trpc/react';
import { useMutation } from '@tanstack/react-query';
import { useUserStore } from '~/stores/userStore';
import { 
  validateImageFile, 
  fileToBase64, 
  formatFileSize,
  getUploadErrorMessage 
} from '~/constants/validation';
import { toast } from 'react-hot-toast';
import {
  Upload,
  X,
  Loader2,
  AlertCircle,
  Check,
  Image as ImageIcon,
  Zap,
  Shield,
  RefreshCw,
} from 'lucide-react';

interface SimpleImageUploadProps {
  onSuccess: (filePath: string) => void;
  onError?: (error: any) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  maxFileSize?: number; // in MB
  accept?: string;
}

interface UploadState {
  isUploading: boolean;
  progress: number;
  message: string;
  error?: string;
  compressionAttempted?: boolean;
}

// Enhanced debugging and error recovery configuration
const DEBUG_UPLOAD = true; // Enable comprehensive debugging
const EMERGENCY_FALLBACK_ENABLED = true; // Enable emergency fallback options
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_BASE = 2000; // Base delay for exponential backoff

// Enhanced logging utility with component identification
const logDebug = (message: string, data?: any, level: 'info' | 'warn' | 'error' = 'info') => {
  if (DEBUG_UPLOAD) {
    const timestamp = new Date().toISOString();
    const prefix = `🔍 DEBUG: SimpleImageUpload [${timestamp}]`;
    
    switch (level) {
      case 'error':
        console.error(`❌ ${prefix} - ${message}`, data || '');
        break;
      case 'warn':
        console.warn(`⚠️ ${prefix} - ${message}`, data || '');
        break;
      default:
        console.log(`${prefix} - ${message}`, data || '');
    }
  }
};

// Enhanced file input verification utility
const verifyFileInputAccessibility = (fileInputRef: React.RefObject<HTMLInputElement>): {
  accessible: boolean;
  issues: string[];
  element: HTMLInputElement | null;
} => {
  const issues: string[] = [];
  const element = fileInputRef.current;
  
  if (!element) {
    issues.push('File input element not found in DOM');
    return { accessible: false, issues, element: null };
  }
  
  if (!element.parentNode) {
    issues.push('File input element not attached to DOM');
  }
  
  if (element.disabled) {
    issues.push('File input element is disabled');
  }
  
  if (element.style.display === 'none' && !element.classList.contains('hidden')) {
    issues.push('File input element has display:none but not using hidden class');
  }
  
  try {
    element.focus();
    element.blur();
  } catch (error) {
    issues.push(`File input element focus/blur failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  return {
    accessible: issues.length === 0,
    issues,
    element
  };
};

export function SimpleImageUpload({
  onSuccess,
  onError,
  placeholder = "Upload image - any format supported",
  className = "",
  disabled = false,
  maxFileSize = 25, // 25MB default
  accept = "image/*",
}: SimpleImageUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [dragOver, setDragOver] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    message: '',
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { adminToken } = useUserStore();
  const trpc = useTRPC();

  logDebug('Component render state:', {
    selectedFile: selectedFile?.name,
    previewUrl: previewUrl ? 'present' : 'none',
    uploadState: uploadState,
    timestamp: new Date().toISOString()
  });

  const compressImageOnClient = useCallback(async (file: File, quality: number = 0.8): Promise<File> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        try {
          // Calculate optimal dimensions to reduce file size
          let { width, height } = img;
          const maxDimension = 1920; // Reasonable max for web
          
          // Reduce dimensions if too large
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
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                
                logDebug(`Client compression: ${formatFileSize(file.size)} → ${formatFileSize(compressedFile.size)}`);
                resolve(compressedFile);
              } else {
                resolve(file); // Fallback to original
              }
            },
            'image/jpeg',
            quality
          );
        } catch (error) {
          console.warn('Client compression failed:', error);
          resolve(file); // Fallback to original on error
        }
      };
      
      img.onerror = () => {
        console.warn('Failed to load image for compression');
        resolve(file); // Fallback to original
      };
      
      img.src = URL.createObjectURL(file);
    });
  }, []);

  const shouldCompressImage = useCallback((file: File): boolean => {
    const sizeMB = file.size / (1024 * 1024);
    // Compress if over 5MB or if it's a large uncompressed format
    return sizeMB > 5 || file.type === 'image/bmp' || file.type === 'image/tiff';
  }, []);

  const uploadMutation = useMutation(
    trpc.adminUploadImage.mutationOptions({
      onSuccess: async (data) => {
        const uploadEndTime = Date.now();
        
        logDebug('=== UPLOAD SUCCESS RESPONSE ===', {
          response: data,
          filePath: data.filePath,
          filePathType: typeof data.filePath,
          filePathLength: data.filePath?.length,
          filePathTrimmed: data.filePath?.trim(),
          success: data.success,
          metadata: data.metadata,
          warnings: data.warnings,
          uploadEndTime,
          timestamp: new Date().toISOString()
        });
        
        setUploadState({
          isUploading: false,
          progress: 100,
          message: 'Upload completed successfully!',
        });
        
        // Enhanced filePath validation with detailed logging
        if (data.filePath && typeof data.filePath === 'string' && data.filePath.trim() !== '') {
          logDebug('Valid filePath received, calling onSuccess callback:', {
            filePath: data.filePath,
            filePathLength: data.filePath.length,
            filePathTrimmed: data.filePath.trim(),
            timestamp: new Date().toISOString()
          });
          
          onSuccess(data.filePath);
          
          toast.success('✅ Image uploaded successfully!', { duration: 3000 });
          
          // Enhanced metadata display
          if (data.metadata) {
            const originalMB = (data.metadata.originalSize / (1024 * 1024)).toFixed(1);
            const processedMB = (data.metadata.processedSize / (1024 * 1024)).toFixed(1);
            const timeSeconds = (data.metadata.processingTime / 1000).toFixed(1);
            const compressionRatio = (data.metadata.originalSize / data.metadata.processedSize).toFixed(2);
            
            logDebug('Upload metadata details:', {
              originalSize: data.metadata.originalSize,
              processedSize: data.metadata.processedSize,
              processingTime: data.metadata.processingTime,
              compressionRatio: data.metadata.compressionRatio,
              strategy: data.metadata.strategy
            });
            
            setTimeout(() => {
              toast(`🚀 Processed in ${timeSeconds}s: ${originalMB}MB → ${processedMB}MB (${compressionRatio}x compression)`, {
                duration: 4000,
                style: { background: '#f0f9ff', color: '#0369a1' }
              });
            }, 1000);
          }
          
          // Display warnings if any
          if (data.warnings && data.warnings.length > 0) {
            logDebug('Upload warnings received:', { warnings: data.warnings }, 'warn');
            
            setTimeout(() => {
              toast(`⚠️ ${data.warnings[0]}`, {
                duration: 6000,
                style: { background: '#fef3c7', color: '#92400e' }
              });
            }, 2000);
          }
          
          // Clear local state after successful upload
          setSelectedFile(null);
          setPreviewUrl("");
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          
        } else {
          logDebug('=== INVALID FILEPATH IN RESPONSE ===', {
            data: data,
            filePath: data.filePath,
            filePathType: typeof data.filePath,
            filePathLength: data.filePath?.length,
            filePathTrimmed: data.filePath?.trim?.(),
            isEmptyAfterTrim: data.filePath?.trim?.() === '',
            timestamp: new Date().toISOString()
          }, 'error');
          
          const error = new Error('Upload completed but file path is missing');
          onError?.(error);
          toast.error('Upload completed but file path is missing. Please try again.');
        }
      },
      onError: async (error) => {
        const uploadEndTime = Date.now();
        
        logDebug('=== UPLOAD ERROR RESPONSE ===', {
          error: error,
          errorMessage: error.message,
          errorName: error.name,
          errorCause: error.cause,
          errorStack: error.stack,
          uploadEndTime,
          timestamp: new Date().toISOString(),
          selectedFileName: selectedFile?.name,
          adminTokenPresent: !!adminToken
        }, 'error');
        
        const errorInfo = getUploadErrorMessage(error.message || 'Upload failed');
        
        logDebug('Error categorization result:', {
          category: errorInfo.category,
          canRetry: errorInfo.canRetry,
          suggestions: errorInfo.suggestions,
          retryDelay: errorInfo.retryDelay,
          httpStatus: errorInfo.httpStatus
        });
        
        // Handle 413 errors specifically with automatic fallback strategies
        if (error.message?.includes('413') || error.message?.includes('too large') || error.message?.includes('payload')) {
          logDebug('413 error detected - implementing automatic fallback strategies');
          
          if (selectedFile) {
            // Strategy 1: Try client-side compression if not already tried
            if (!uploadState.compressionAttempted) {
              setUploadState(prev => ({
                ...prev,
                isUploading: true,
                progress: 10,
                message: 'File too large - applying compression...',
                compressionAttempted: true,
              }));
              
              toast.error('File too large for server. Compressing image and retrying...', { 
                duration: 4000 
              });
              
              try {
                logDebug('Attempting aggressive compression for 413 error...');
                const compressedFile = await compressImageOnClient(selectedFile, 0.7); // More aggressive compression
                
                logDebug('Aggressive compression completed:', {
                  originalSize: selectedFile.size,
                  compressedSize: compressedFile.size,
                  compressionRatio: (selectedFile.size / compressedFile.size).toFixed(2)
                });
                
                // Retry with compressed file
                setTimeout(() => {
                  handleUpload(compressedFile, true); // Mark as compressed attempt
                }, 1000);
                return;
              } catch (compressionError) {
                logDebug('Compression failed during 413 recovery:', compressionError, 'error');
              }
            }
            
            // Strategy 2: Suggest chunked upload for very large files
            const fileSizeMB = selectedFile.size / (1024 * 1024);
            if (fileSizeMB > 25) {
              logDebug('File too large even after compression, suggesting chunked upload', {
                fileSizeMB: fileSizeMB.toFixed(1)
              });
              
              toast.error('File too large even after compression. Please use the chunked upload feature for files over 25MB.', { 
                duration: 8000 
              });
              
              setTimeout(() => {
                toast('💡 Try the "BulletproofImageUpload" component for large files with automatic chunking.', {
                  duration: 10000,
                  style: { background: '#dbeafe', color: '#1e40af' }
                });
              }, 2000);
            }
          }
        }
        
        // Handle memory errors with specific guidance
        if (error.message?.toLowerCase().includes('memory')) {
          logDebug('Memory error detected - implementing memory recovery strategies');
          
          toast.error('Server memory issue detected. Trying smaller image size...', { 
            duration: 6000 
          });
          
          if (selectedFile && !uploadState.compressionAttempted) {
            setUploadState(prev => ({
              ...prev,
              compressionAttempted: true,
            }));
            
            try {
              logDebug('Attempting memory-efficient compression...');
              const compressedFile = await compressImageOnClient(selectedFile, 0.6); // Aggressive compression for memory issues
              setTimeout(() => handleUpload(compressedFile, true), 2000);
              return;
            } catch (compressionError) {
              logDebug('Memory-saving compression failed:', compressionError, 'error');
            }
          }
        }
        
        setUploadState({
          isUploading: false,
          progress: 0,
          message: '',
          error: errorInfo.message,
        });
        
        toast.error(`❌ ${errorInfo.message}`, { duration: 8000 });
        
        // Show actionable suggestions
        if (errorInfo.suggestions.length > 0) {
          setTimeout(() => {
            toast(`💡 ${errorInfo.suggestions[0]}`, {
              duration: 6000,
              style: { background: '#dbeafe', color: '#1e40af' }
            });
          }, 1000);
          
          // Show chunking suggestion for large files if applicable
          if (errorInfo.useChunking && selectedFile && selectedFile.size > 25 * 1024 * 1024) {
            setTimeout(() => {
              toast('🚀 For files over 25MB, consider using the BulletproofImageUpload component with automatic chunking.', {
                duration: 8000,
                style: { background: '#f0f9ff', color: '#0369a1' }
              });
            }, 3000);
          }
        }
        
        onError?.(error);
      },
    })
  );

  const handleFileSelect = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    
    logDebug('=== FILE SELECTION STARTED ===', {
      fileCount: fileArray.length,
      files: fileArray.map(f => ({
        name: f.name,
        size: f.size,
        type: f.type,
        lastModified: f.lastModified
      })),
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      uploadState: uploadState,
      selectedFile: selectedFile?.name || 'none',
      previewUrl: previewUrl ? 'present' : 'none'
    });
    
    if (fileArray.length === 0) {
      logDebug('No files provided to handleFileSelect', {}, 'warn');
      return;
    }
    
    // Only handle single file
    const file = fileArray[0];
    
    try {
      logDebug('Processing selected file:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        fileSizeFormatted: formatFileSize(file.size),
        timestamp: new Date().toISOString()
      });
      
      // Enhanced validation with detailed logging
      const validation = validateImageFile(file);
      
      logDebug('File validation result:', {
        valid: validation.valid,
        error: validation.error,
        warnings: validation.warnings,
        category: validation.category,
        fileName: file.name
      });
      
      if (!validation.valid) {
        const errorInfo = getUploadErrorMessage(validation.error || 'Invalid file');
        
        logDebug('File validation failed:', {
          error: validation.error,
          errorInfo: errorInfo,
          suggestions: errorInfo.suggestions
        }, 'error');
        
        toast.error(`❌ ${file.name}: ${errorInfo.message}`, { duration: 8000 });
        
        setUploadState({
          isUploading: false,
          progress: 0,
          message: '',
          error: validation.error,
        });
        
        // Show suggestions for invalid files
        if (errorInfo.suggestions.length > 0) {
          setTimeout(() => {
            toast(`💡 ${errorInfo.suggestions[0]}`, {
              duration: 6000,
              style: { background: '#dbeafe', color: '#1e40af' }
            });
          }, 1000);
        }
        
        onError?.(new Error(validation.error || 'Invalid file'));
        return;
      }
      
      // Show warnings if any
      if (validation.warnings) {
        validation.warnings.forEach(warning => {
          logDebug('File validation warning:', { warning, fileName: file.name }, 'warn');
          toast(`⚠️ ${warning}`, {
            duration: 4000,
            style: { background: '#fef3c7', color: '#92400e' }
          });
        });
      }
      
      // Check if we should automatically compress the image
      let fileToUpload = file;
      const compressionNeeded = shouldCompressImage(file);
      
      logDebug('Compression analysis:', {
        compressionNeeded,
        originalSize: file.size,
        originalSizeMB: (file.size / (1024 * 1024)).toFixed(1),
        fileType: file.type
      });
      
      if (compressionNeeded) {
        setUploadState({
          isUploading: true,
          progress: 5,
          message: 'Optimizing large image...',
          compressionAttempted: false,
        });
        
        try {
          logDebug('Starting client-side compression...');
          fileToUpload = await compressImageOnClient(file);
          
          const originalMB = (file.size / (1024 * 1024)).toFixed(1);
          const compressedMB = (fileToUpload.size / (1024 * 1024)).toFixed(1);
          const compressionRatio = (file.size / fileToUpload.size).toFixed(2);
          
          logDebug('Client-side compression completed:', {
            originalSize: file.size,
            compressedSize: fileToUpload.size,
            originalMB,
            compressedMB,
            compressionRatio,
            compressionPercentage: ((1 - fileToUpload.size / file.size) * 100).toFixed(1)
          });
          
          toast.success(`✨ Image optimized: ${originalMB}MB → ${compressedMB}MB`, { 
            duration: 3000 
          });
          
          setUploadState(prev => ({
            ...prev,
            compressionAttempted: true,
          }));
        } catch (error) {
          logDebug('Automatic compression failed:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            fileName: file.name
          }, 'error');
          
          toast('⚠️ Automatic compression failed, uploading original file', {
            duration: 3000,
            style: { background: '#fef3c7', color: '#92400e' }
          });
        }
      }
      
      // Set selected file and create preview with enhanced error handling
      logDebug('Setting selected file and creating preview...', {
        fileName: fileToUpload.name,
        fileSize: fileToUpload.size
      });
      
      setSelectedFile(fileToUpload);
      
      try {
        const previewUrl = URL.createObjectURL(fileToUpload);
        setPreviewUrl(previewUrl);
        
        logDebug('Preview URL created successfully:', {
          fileName: fileToUpload.name,
          previewUrlCreated: true,
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        logDebug('Failed to create preview URL:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          fileName: fileToUpload.name
        }, 'error');
        
        toast.error('Failed to create image preview');
        
        // Continue without preview - don't fail the entire operation
        setPreviewUrl('');
      }
      
      logDebug('=== FILE SELECTION COMPLETED SUCCESSFULLY ===', {
        finalFileName: fileToUpload.name,
        finalFileSize: fileToUpload.size,
        compressionApplied: fileToUpload !== file,
        previewCreated: !!previewUrl,
        readyForUpload: true
      });
      
    } catch (error) {
      logDebug('=== FILE SELECTION FAILED ===', {
        error: error instanceof Error ? error.message : 'Unknown error',
        fileName: file.name,
        stack: error instanceof Error ? error.stack : 'No stack trace'
      }, 'error');
      
      setUploadState({
        isUploading: false,
        progress: 0,
        message: '',
        error: error instanceof Error ? error.message : 'File selection failed',
      });
      
      toast.error('Failed to process selected file. Please try again.');
      onError?.(error);
    }
  }, [onError, shouldCompressImage, compressImageOnClient, uploadState, selectedFile, previewUrl]);

  const handleUpload = useCallback(async (fileOverride?: File, isCompressedAttempt: boolean = false) => {
    const fileToUpload = fileOverride || selectedFile;
    
    logDebug('=== UPLOAD PROCESS STARTED ===', {
      fileName: fileToUpload?.name,
      fileSize: fileToUpload?.size,
      isCompressedAttempt,
      adminTokenPresent: !!adminToken,
      adminTokenLength: adminToken?.length || 0,
      timestamp: new Date().toISOString()
    });
    
    // Enhanced authentication verification
    if (!adminToken || adminToken.trim() === '') {
      logDebug('Upload failed: Missing or empty admin token', {
        adminTokenExists: !!adminToken,
        adminTokenType: typeof adminToken,
        adminTokenLength: adminToken?.length || 0
      }, 'error');
      
      toast.error('Authentication required. Please log in and try again.');
      return;
    }
    
    // Enhanced file verification
    if (!fileToUpload) {
      logDebug('Upload failed: No file to upload', {
        selectedFileExists: !!selectedFile,
        fileOverrideExists: !!fileOverride,
        isCompressedAttempt
      }, 'error');
      
      toast.error('No file selected for upload.');
      return;
    }
    
    try {
      logDebug('Starting upload preparation...', {
        fileName: fileToUpload.name,
        fileSize: fileToUpload.size,
        fileType: fileToUpload.type,
        isCompressedAttempt
      });
      
      setUploadState(prev => ({
        ...prev,
        isUploading: true,
        progress: isCompressedAttempt ? 30 : 10,
        message: isCompressedAttempt ? 'Uploading compressed image...' : 'Converting image...',
        compressionAttempted: isCompressedAttempt || prev.compressionAttempted,
      }));
      
      // Enhanced file to base64 conversion with progress tracking
      logDebug('Converting file to base64...', {
        fileName: fileToUpload.name,
        fileSize: fileToUpload.size
      });
      
      let base64Content: string;
      try {
        base64Content = await fileToBase64(fileToUpload);
        
        logDebug('Base64 conversion completed:', {
          fileName: fileToUpload.name,
          originalSize: fileToUpload.size,
          base64Length: base64Content.length,
          base64SizeEstimate: Math.round(base64Content.length * 0.75), // Approximate decoded size
          conversionRatio: (base64Content.length / fileToUpload.size).toFixed(2)
        });
        
      } catch (conversionError) {
        logDebug('Base64 conversion failed:', {
          error: conversionError instanceof Error ? conversionError.message : 'Unknown error',
          fileName: fileToUpload.name,
          fileSize: fileToUpload.size
        }, 'error');
        
        throw new Error(`Failed to convert image: ${conversionError instanceof Error ? conversionError.message : 'Unknown error'}`);
      }
      
      setUploadState(prev => ({
        ...prev,
        progress: 50,
        message: 'Uploading to server...',
      }));
      
      // Enhanced API call with comprehensive request/response logging
      const uploadPayload = {
        adminToken,
        fileName: fileToUpload.name,
        fileContent: base64Content,
        fileType: fileToUpload.type || 'image/jpeg',
      };
      
      logDebug('=== API CALL INITIATED ===', {
        endpoint: 'adminUploadImage',
        fileName: uploadPayload.fileName,
        fileType: uploadPayload.fileType,
        adminTokenLength: uploadPayload.adminToken.length,
        payloadSize: JSON.stringify(uploadPayload).length,
        base64ContentLength: uploadPayload.fileContent.length,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      });
      
      // Add request timeout and monitoring
      const uploadStartTime = Date.now();
      
      uploadMutation.mutate(uploadPayload);
      
      logDebug('Upload mutation triggered successfully', {
        fileName: fileToUpload.name,
        uploadStartTime,
        mutationPending: uploadMutation.isPending
      });
      
    } catch (error) {
      const uploadDuration = Date.now() - (Date.now());
      
      logDebug('=== UPLOAD PREPARATION FAILED ===', {
        error: error instanceof Error ? error.message : 'Unknown error',
        fileName: fileToUpload.name,
        uploadDuration,
        stack: error instanceof Error ? error.stack : 'No stack trace',
        isCompressedAttempt
      }, 'error');
      
      setUploadState({
        isUploading: false,
        progress: 0,
        message: '',
        error: error instanceof Error ? error.message : 'Upload preparation failed',
        compressionAttempted: isCompressedAttempt,
      });
      
      toast.error('Failed to prepare upload. Please try again.');
      onError?.(error);
    }
  }, [selectedFile, adminToken, uploadMutation, onError]);

  const handleClear = useCallback(() => {
    logDebug('Clearing selection');
    
    setSelectedFile(null);
    
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl("");
    }
    
    setUploadState({
      isUploading: false,
      progress: 0,
      message: '',
    });
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [previewUrl]);

  // Auto-upload when file is selected
  React.useEffect(() => {
    if (selectedFile && !uploadState.isUploading) {
      logDebug('Auto-uploading selected file');
      handleUpload();
    }
  }, [selectedFile, uploadState.isUploading, handleUpload]);

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
    if (files.length > 0) {
      handleFileSelect(files);
    }
  }, [handleFileSelect]);

  const handleUploadAreaClick = useCallback(() => {
    logDebug('=== UPLOAD AREA CLICKED ===', {
      disabled,
      fileInputExists: !!fileInputRef.current,
      timestamp: new Date().toISOString()
    });
    
    if (disabled) {
      logDebug('Upload area click ignored - component disabled', {}, 'warn');
      return;
    }
    
    if (!uploadState.isUploading) {
      // Verify file input accessibility before clicking
      const verification = verifyFileInputAccessibility(fileInputRef);
      
      logDebug('File input accessibility check:', verification);
      
      if (!verification.accessible) {
        logDebug('File input not accessible:', {
          issues: verification.issues
        }, 'error');
        
        toast.error('File input not accessible. Please refresh the page.');
        return;
      }
      
      try {
        logDebug('Triggering file input click...');
        fileInputRef.current?.click();
        
        logDebug('File input click triggered successfully');
      } catch (error) {
        logDebug('File input click failed:', {
          error: error instanceof Error ? error.message : 'Unknown error'
        }, 'error');
        
        toast.error('Failed to open file selector. Please try again.');
      }
    } else {
      logDebug('Upload area click ignored - upload in progress', {}, 'warn');
    }
  }, [disabled, uploadState.isUploading]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    logDebug('=== FILE INPUT CHANGE EVENT ===', {
      hasFiles: !!e.target.files,
      fileCount: e.target.files?.length || 0,
      inputValue: e.target.value,
      timestamp: new Date().toISOString(),
      eventType: e.type,
      eventTarget: e.target.tagName,
      eventCurrentTarget: e.currentTarget.tagName
    });
    
    const files = e.target.files;
    
    if (!files) {
      logDebug('No files in change event', {}, 'warn');
      return;
    }
    
    if (files.length === 0) {
      logDebug('Empty file list in change event', {}, 'warn');
      return;
    }
    
    logDebug('Processing files from input change:', {
      files: Array.from(files).map(f => ({
        name: f.name,
        size: f.size,
        type: f.type,
        lastModified: f.lastModified
      }))
    });
    
    try {
      handleFileSelect(files);
    } catch (error) {
      logDebug('Error in handleFileSelect from input change:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'error');
      
      toast.error('Failed to process selected files. Please try again.');
    }
  }, [handleFileSelect]);

  // Emergency Basic Upload Fallback Component
  const EmergencyUploadFallback = useCallback(() => {
    const [emergencyFile, setEmergencyFile] = useState<File | null>(null);
    const [emergencyUploading, setEmergencyUploading] = useState(false);
    const emergencyInputRef = useRef<HTMLInputElement>(null);
    
    const handleEmergencyUpload = async () => {
      if (!emergencyFile || !adminToken) {
        toast.error('Please select a file and ensure you are logged in.');
        return;
      }
      
      setEmergencyUploading(true);
      
      logDebug('=== EMERGENCY UPLOAD STARTED ===', {
        fileName: emergencyFile.name,
        fileSize: emergencyFile.size,
        fileType: emergencyFile.type,
        timestamp: new Date().toISOString()
      });
      
      try {
        // Minimal processing - just convert to base64
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = (e) => {
            if (e.target?.result) {
              resolve(e.target.result as string);
            } else {
              reject(new Error('Failed to read file'));
            }
          };
          reader.onerror = () => reject(new Error('FileReader error'));
          reader.readAsDataURL(emergencyFile);
        });
        
        const base64Content = await base64Promise;
        
        logDebug('Emergency upload - base64 conversion completed:', {
          fileName: emergencyFile.name,
          base64Length: base64Content.length
        });
        
        // Direct API call with minimal processing
        const emergencyPayload = {
          adminToken,
          fileName: `emergency_${Date.now()}_${emergencyFile.name}`,
          fileContent: base64Content,
          fileType: emergencyFile.type || 'image/jpeg',
        };
        
        logDebug('=== EMERGENCY API CALL ===', {
          payload: {
            fileName: emergencyPayload.fileName,
            fileType: emergencyPayload.fileType,
            adminTokenLength: emergencyPayload.adminToken.length,
            contentLength: emergencyPayload.fileContent.length
          },
          timestamp: new Date().toISOString()
        });
        
        // Make direct fetch call to bypass complex mutation logic
        const response = await fetch('/api/trpc/adminUploadImage', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            json: emergencyPayload,
          }),
        });
        
        logDebug('=== EMERGENCY API RESPONSE ===', {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          timestamp: new Date().toISOString()
        });
        
        const responseText = await response.text();
        
        logDebug('Emergency API raw response:', {
          responseText: responseText.substring(0, 500) + (responseText.length > 500 ? '...' : ''),
          responseLength: responseText.length
        });
        
        if (!response.ok) {
          throw new Error(`Emergency upload failed: ${response.status} ${response.statusText}\n${responseText}`);
        }
        
        const result = JSON.parse(responseText);
        
        logDebug('Emergency upload successful:', {
          result: result,
          filePath: result.result?.data?.filePath
        });
        
        if (result.result?.data?.filePath) {
          onSuccess(result.result.data.filePath);
          toast.success('✅ Emergency upload successful!');
          setEmergencyFile(null);
          if (emergencyInputRef.current) {
            emergencyInputRef.current.value = '';
          }
        } else {
          throw new Error('Emergency upload completed but no file path returned');
        }
        
      } catch (error) {
        logDebug('=== EMERGENCY UPLOAD FAILED ===', {
          error: error instanceof Error ? error.message : 'Unknown error',
          fileName: emergencyFile.name,
          stack: error instanceof Error ? error.stack : 'No stack trace'
        }, 'error');
        
        toast.error(`Emergency upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setEmergencyUploading(false);
      }
    };
    
    return (
      <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
        <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
          🚨 Emergency Upload (Minimal Processing)
        </h4>
        <p className="text-xs text-yellow-700 dark:text-yellow-300 mb-3">
          If normal upload fails, try this simplified option with minimal processing.
        </p>
        
        <input
          ref={emergencyInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              logDebug('Emergency file selected:', {
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type
              });
              setEmergencyFile(file);
            }
          }}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-medium file:bg-yellow-100 file:text-yellow-700 hover:file:bg-yellow-200"
        />
        
        {emergencyFile && (
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-gray-600">
              {emergencyFile.name} ({formatFileSize(emergencyFile.size)})
            </span>
            <button
              onClick={handleEmergencyUpload}
              disabled={emergencyUploading}
              className="px-3 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700 disabled:opacity-50"
            >
              {emergencyUploading ? 'Uploading...' : 'Emergency Upload'}
            </button>
          </div>
        )}
        
        {emergencyUploading && (
          <div className="mt-2 text-xs text-yellow-700">
            Processing with minimal validation and compression...
          </div>
        )}
      </div>
    );
  }, [adminToken, onSuccess]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 ${
          dragOver
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10 scale-[1.02]'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleUploadAreaClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          className="hidden"
          disabled={disabled || uploadState.isUploading}
          onChange={handleFileInputChange}
        />
        
        {uploadState.isUploading ? (
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              {uploadState.compressionAttempted && (
                <Zap className="h-4 w-4 absolute -top-1 -right-1 text-green-600" />
              )}
            </div>
            
            <div className="w-full max-w-xs">
              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                <span>Uploading</span>
                <span>{uploadState.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadState.progress}%` }}
                />
              </div>
            </div>
            
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {uploadState.message}
            </p>
            
            {uploadState.compressionAttempted && (
              <div className="flex items-center space-x-1 text-xs text-green-600">
                <Zap className="h-3 w-3" />
                <span>Using compressed version</span>
              </div>
            )}
          </div>
        ) : uploadState.error ? (
          <div className="flex flex-col items-center space-y-3">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <p className="text-sm text-red-600 dark:text-red-400">
              {uploadState.error}
            </p>
            <div className="flex flex-col items-center space-y-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear();
                }}
                className="text-xs text-blue-600 hover:text-blue-700 underline"
              >
                Try Again
              </button>
              
              {selectedFile && selectedFile.size > 25 * 1024 * 1024 && (
                <p className="text-xs text-gray-500 text-center">
                  For files over 25MB, consider using chunked upload
                </p>
              )}
            </div>
          </div>
        ) : selectedFile ? (
          <div className="flex flex-col items-center space-y-3">
            <div className="relative">
              <Check className="h-8 w-8 text-green-600" />
              {uploadState.compressionAttempted && (
                <Zap className="h-4 w-4 absolute -top-1 -right-1 text-blue-600" />
              )}
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {selectedFile.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatFileSize(selectedFile.size)}
                {uploadState.compressionAttempted && ' (optimized)'}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="text-xs text-red-600 hover:text-red-700"
            >
              Remove
            </button>
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
                <Zap className="h-3 w-3" />
                <span>Auto Compression</span>
                <span>•</span>
                <Shield className="h-3 w-3" />
                <span>413 Recovery</span>
                <span>•</span>
                <RefreshCw className="h-3 w-3" />
                <span>Smart Retry</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                Click to browse or drag and drop • Max {maxFileSize}MB • Auto-optimized
              </p>
            </div>
          </div>
        )}
      </div>
      
      {/* Local Preview */}
      {previewUrl && (
        <div className="mt-4">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Selected Image Preview:
          </p>
          <div className="w-full h-32 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
            <img
              src={previewUrl}
              alt="Selected image preview"
              className="w-full h-full object-cover"
              onError={() => {
                console.error('Preview image failed to load');
                setPreviewUrl("");
              }}
            />
          </div>
        </div>
      )}

      {/* Emergency Upload Fallback - Show when normal upload fails repeatedly */}
      {EMERGENCY_FALLBACK_ENABLED && (uploadState.error || (uploadMutation.error && uploadMutation.failureCount >= 2)) && (
        <EmergencyUploadFallback />
      )}

      {/* Debug Panel - Show comprehensive upload system status */}
      {DEBUG_UPLOAD && (
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            🔧 Upload System Debug Panel
          </h4>
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <strong>File Input Status:</strong>
              <div className="ml-2">
                <div>Ref: {fileInputRef.current ? '✅ Connected' : '❌ Missing'}</div>
                <div>Accessible: {fileInputRef.current && verifyFileInputAccessibility(fileInputRef).accessible ? '✅ Yes' : '❌ No'}</div>
                <div>Value: {fileInputRef.current?.value || 'Empty'}</div>
              </div>
            </div>
            
            <div>
              <strong>Upload State:</strong>
              <div className="ml-2">
                <div>Uploading: {uploadState.isUploading ? '🔄 Yes' : '⏸️ No'}</div>
                <div>Progress: {uploadState.progress}%</div>
                <div>Message: {uploadState.message || 'None'}</div>
                <div>Error: {uploadState.error || 'None'}</div>
              </div>
            </div>
            
            <div>
              <strong>Authentication:</strong>
              <div className="ml-2">
                <div>Token: {adminToken ? `✅ Present (${adminToken.length} chars)` : '❌ Missing'}</div>
                <div>Valid: {adminToken && adminToken.length > 10 ? '✅ Likely' : '❌ Invalid'}</div>
              </div>
            </div>
            
            <div>
              <strong>Mutation Status:</strong>
              <div className="ml-2">
                <div>Pending: {uploadMutation.isPending ? '🔄 Yes' : '⏸️ No'}</div>
                <div>Error: {uploadMutation.error ? '❌ Yes' : '✅ No'}</div>
                <div>Failures: {uploadMutation.failureCount}</div>
                <div>Success: {uploadMutation.isSuccess ? '✅ Yes' : '⏸️ No'}</div>
              </div>
            </div>
            
            <div>
              <strong>Selected File:</strong>
              <div className="ml-2">
                <div>Name: {selectedFile?.name || 'None'}</div>
                <div>Size: {selectedFile ? formatFileSize(selectedFile.size) : 'N/A'}</div>
                <div>Type: {selectedFile?.type || 'N/A'}</div>
              </div>
            </div>
            
            <div>
              <strong>Preview:</strong>
              <div className="ml-2">
                <div>URL: {previewUrl ? '✅ Created' : '❌ Missing'}</div>
                <div>Length: {previewUrl.length}</div>
              </div>
            </div>
          </div>
          
          <div className="mt-2 flex space-x-2">
            <button
              onClick={() => {
                const verification = verifyFileInputAccessibility(fileInputRef);
                logDebug('Manual file input verification:', verification);
                toast(verification.accessible ? '✅ File input accessible' : '❌ File input issues detected', {
                  duration: 3000
                });
              }}
              className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
            >
              Test File Input
            </button>
            
            <button
              onClick={() => {
                logDebug('Manual component state dump:', {
                  selectedFile: selectedFile ? {
                    name: selectedFile.name,
                    size: selectedFile.size,
                    type: selectedFile.type
                  } : null,
                  previewUrl: previewUrl ? 'present' : 'none',
                  uploadState,
                  adminToken: adminToken ? `present (${adminToken.length} chars)` : 'missing',
                  mutationState: {
                    isPending: uploadMutation.isPending,
                    isError: uploadMutation.isError,
                    isSuccess: uploadMutation.isSuccess,
                    failureCount: uploadMutation.failureCount
                  }
                });
                toast('🔍 State dumped to console', { duration: 2000 });
              }}
              className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
            >
              Dump State
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
