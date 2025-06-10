import React, { useState, useRef, useCallback, memo, useMemo, useEffect } from 'react';
import { useTRPC } from '../../trpc/react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useUserStore } from '../../stores/userStore';
import { validateImageFile } from '../../constants/validation';
import { toast } from 'react-hot-toast';
import {
  Upload,
  X,
  Loader2,
  AlertCircle,
  Check,
  Image as ImageIcon,
  User,
  Trash2,
} from 'lucide-react';

interface SimpleInnovatorImageUploadProps {
  innovatorId: number;
  innovatorName: string;
  // Standardized interface to match BulletproofImageUpload
  value?: string;
  onChange?: (filePath: string | null) => void;
  onUploadProgress?: (progress: number) => void;
  onUploadComplete?: (result: any) => void;
  onUploadError?: (error: any) => void;
  onFormValueSet?: (filePath: string | null) => void;
  // Legacy support for backward compatibility
  onImageUpdated?: (hasImage: boolean) => void;
  className?: string;
  disabled?: boolean;
  // Enhanced form integration props
  validateImmediately?: boolean;
  retryFormUpdate?: boolean;
  // Enhanced error recovery props
  enableAutoRetry?: boolean;
  maxRetries?: number;
  // Component identification for debugging
  componentId?: string;
}

// Utility function for error message categorization
const getUploadErrorMessage = (errorMessage: string) => {
  const message = errorMessage.toLowerCase();
  
  if (message.includes('auth') || message.includes('token') || message.includes('unauthorized')) {
    return {
      category: 'auth',
      message: 'Authentication failed. Please log in again.',
      canRetry: false,
      suggestions: ['Refresh the page and log in again'],
      retryDelay: 0,
    };
  }
  
  if (message.includes('size') || message.includes('large') || message.includes('limit')) {
    return {
      category: 'size',
      message: 'Image file is too large',
      canRetry: true,
      suggestions: ['Try compressing your image', 'Reduce image dimensions'],
      retryDelay: 1000,
    };
  }
  
  if (message.includes('format') || message.includes('type') || message.includes('invalid')) {
    return {
      category: 'format',
      message: 'Invalid image format',
      canRetry: false,
      suggestions: ['Convert to JPEG or PNG format', 'Try a different image'],
      retryDelay: 0,
    };
  }
  
  if (message.includes('network') || message.includes('connection') || message.includes('timeout')) {
    return {
      category: 'network',
      message: 'Network error occurred',
      canRetry: true,
      suggestions: ['Check your internet connection', 'Try again in a moment'],
      retryDelay: 3000,
    };
  }
  
  return {
    category: 'unknown',
    message: errorMessage || 'Upload failed',
    canRetry: true,
    suggestions: ['Try again', 'Check your file and connection'],
    retryDelay: 2000,
  };
};

// Utility function for date formatting
const formatDate = (date: Date) => {
  return date.toLocaleTimeString();
};

export const SimpleInnovatorImageUpload = memo(function SimpleInnovatorImageUpload({
  innovatorId,
  innovatorName,
  // Standardized interface
  value,
  onChange,
  onUploadProgress,
  onUploadComplete,
  onUploadError,
  onFormValueSet,
  // Legacy support
  onImageUpdated,
  className = "",
  disabled = false,
  // Enhanced form integration
  validateImmediately = true,
  retryFormUpdate = true,
  // Enhanced error recovery
  enableAutoRetry = true,
  maxRetries = 3,
  // Component identification
  componentId,
}: SimpleInnovatorImageUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [dragOver, setDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Enhanced progress tracking state
  const [uploadProgress, setUploadProgress] = useState<{
    stage: 'idle' | 'reading' | 'validating' | 'optimizing' | 'uploading' | 'verifying' | 'complete' | 'error';
    percentage: number;
    message: string;
    details?: string;
  }>({
    stage: 'idle',
    percentage: 0,
    message: '',
  });
  
  // Enhanced error recovery state with better categorization
  const [errorRecoveryState, setErrorRecoveryState] = useState<{
    hasError: boolean;
    errorMessage: string;
    errorCategory: 'network' | 'format' | 'size' | 'processing' | 'auth' | 'unknown' | 'validation' | 'reader';
    canRetry: boolean;
    retryCount: number;
    maxRetries: number;
    autoRetryEnabled: boolean;
    lastErrorTime: Date | null;
    retryDelay: number;
    componentSource: 'SimpleInnovatorImageUpload';
    fallbackAvailable: boolean;
    recoveryAttempts: number;
    suggestions: string[];
    retryStrategy: 'immediate' | 'delayed' | 'exponential' | 'none';
  }>({
    hasError: false,
    errorMessage: '',
    errorCategory: 'unknown',
    canRetry: true,
    retryCount: 0,
    maxRetries: maxRetries || 3,
    autoRetryEnabled: enableAutoRetry ?? true,
    lastErrorTime: null,
    retryDelay: 2000,
    componentSource: 'SimpleInnovatorImageUpload',
    fallbackAvailable: true,
    recoveryAttempts: 0,
    suggestions: [],
    retryStrategy: 'exponential',
  });
  
  // Component identification for debugging
  const componentIdRef = componentId || `simple-upload-${innovatorId}`;
  
  // Enhanced upload tracking with userStore integration
  const { addUpload, updateUpload, removeUpload } = useUserStore();
  const [currentUploadId, setCurrentUploadId] = useState<string | null>(null);

  const [debugMode] = useState(true); // Enable debugging for troubleshooting
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { adminToken } = useUserStore();
  const trpc = useTRPC();

  // Enhanced logging with component source identification
  const logWithTimestamp = useCallback((message: string, data?: any) => {
    if (debugMode) {
      console.log(`🔍 DEBUG: SimpleInnovatorImageUpload [${componentIdRef}] [${new Date().toISOString()}] - ${message}`, data || '');
    }
  }, [debugMode, componentIdRef]);

  // Helper function to dispatch custom imageUpdated event (matching BulletproofImageUpload)
  const dispatchImageUpdatedEvent = useCallback((filePath: string) => {
    const eventDetail = {
      filePath: filePath,
      timestamp: Date.now(),
      uploadedAt: new Date().toISOString(),
      component: 'SimpleInnovatorImageUpload',
      componentId: componentIdRef,
      innovatorId: innovatorId,
    };
    
    logWithTimestamp('Dispatching imageUpdated event:', {
      eventDetail: eventDetail,
      timestamp: new Date().toISOString()
    });
    
    const customEvent = new CustomEvent('imageUpdated', { 
      detail: eventDetail,
      bubbles: true
    });
    
    window.dispatchEvent(customEvent);
    document.dispatchEvent(customEvent);
  }, [logWithTimestamp, componentIdRef, innovatorId]);

  // Enhanced form value patching with retry logic (matching BulletproofImageUpload pattern)
  const patchFormValueWithRetry = useCallback(async (
    hasImage: boolean,
    retryCount: number = 0,
    maxRetries: number = 3
  ): Promise<boolean> => {
    try {
      logWithTimestamp('patchFormValueWithRetry called:', {
        hasImage,
        retryCount,
        maxRetries,
        currentValue: value,
        componentSource: 'SimpleInnovatorImageUpload',
      });

      // Generate appropriate form value
      const formValue = hasImage ? `simple-upload-${Date.now()}` : '';
      
      // Call the standardized onChange handler
      if (onChange) {
        onChange(hasImage ? formValue : null);
      }
      
      // Additional callback for direct form integration
      if (onFormValueSet) {
        onFormValueSet(hasImage ? formValue : null);
      }
      
      // Legacy callback support
      if (onImageUpdated) {
        onImageUpdated(hasImage);
      }
      
      // Wait a brief moment for React state updates to propagate
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Verify the update was successful by checking if value prop has changed
      const updateSuccessful = hasImage ? (value === formValue || !!value) : (!value || value === '');
      
      logWithTimestamp('Form value update verification:', {
        expectedHasImage: hasImage,
        expectedValue: formValue,
        actualValue: value,
        updateSuccessful: updateSuccessful,
        retryCount: retryCount,
      });
      
      if (updateSuccessful || retryCount >= maxRetries) {
        if (updateSuccessful) {
          logWithTimestamp('Form value successfully updated - dispatching event');
          
          // Dispatch custom event for crosscutting updates
          if (hasImage && formValue) {
            dispatchImageUpdatedEvent(formValue);
          }
          
          return true;
        } else {
          logWithTimestamp('Form value update failed after max retries', { hasImage, value });
          return false;
        }
      }
      
      // Retry if update wasn't successful
      logWithTimestamp('Retrying form value update...', { retryCount: retryCount + 1 });
      await new Promise(resolve => setTimeout(resolve, 100 * (retryCount + 1))); // Exponential backoff
      return patchFormValueWithRetry(hasImage, retryCount + 1, maxRetries);
      
    } catch (error) {
      logWithTimestamp('Error in patchFormValueWithRetry:', error);
      
      if (retryCount < maxRetries) {
        logWithTimestamp('Retrying after error...', { retryCount: retryCount + 1 });
        await new Promise(resolve => setTimeout(resolve, 200 * (retryCount + 1)));
        return patchFormValueWithRetry(hasImage, retryCount + 1, maxRetries);
      }
      
      return false;
    }
  }, [onChange, onFormValueSet, onImageUpdated, value, dispatchImageUpdatedEvent, logWithTimestamp]);

  // Query to get current image
  const currentImageQuery = useQuery(
    trpc.getSimpleInnovatorImage.queryOptions({
      innovatorId,
    })
  );

  // Initialize currentImage with proper default values to prevent undefined access
  const currentImage = currentImageQuery.data || {
    hasImage: false,
    isBase64: false,
    imageData: null,
    imageUrl: null,
    innovatorId: innovatorId,
    innovatorName: innovatorName,
    success: false,
    updatedAt: null
  };
  
  // Enhanced null-safe property access with optional chaining
  const hasCurrentImage = Boolean(currentImage?.hasImage && (
    (currentImage?.isBase64 && currentImage?.imageData) || 
    (!currentImage?.isBase64 && currentImage?.imageUrl)
  ));
  
  const currentImageSrc = useMemo(() => {
    try {
      if (!currentImage || !currentImage.hasImage) {
        return '';
      }
      
      if (currentImage.isBase64 && currentImage.imageData) {
        return currentImage.imageData;
      }
      
      if (!currentImage.isBase64 && currentImage.imageUrl) {
        return currentImage.imageUrl;
      }
      
      return '';
    } catch (error) {
      console.error('Error determining current image source:', error);
      return '';
    }
  }, [currentImage]);

  // Enhanced file validation with clearer error messages
  const validateFile = useCallback((file: File): { valid: boolean; error?: string; warnings?: string[]; category?: string } => {
    setUploadProgress({
      stage: 'validating',
      percentage: 10,
      message: 'Validating file...',
      details: `Checking ${file.name}`,
    });
    
    // Check file type with detailed error messages
    if (!file.type.startsWith('image/')) {
      const extension = file.name.toLowerCase().split('.').pop();
      const commonImageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
      
      if (extension && commonImageExtensions.includes(extension)) {
        return { 
          valid: false, 
          error: `File "${file.name}" appears to be an image but has an unrecognized MIME type. Try re-saving the image in a standard format.`,
          category: 'format'
        };
      }
      
      return { 
        valid: false, 
        error: `"${file.name}" is not an image file. Please select a JPEG, PNG, WebP, or GIF image.`,
        category: 'format'
      };
    }
    
    // Enhanced file size check with helpful suggestions
    const maxSize = 10 * 1024 * 1024; // 10MB limit for simple upload
    if (file.size > maxSize) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      return { 
        valid: false, 
        error: `Image "${file.name}" is too large (${sizeMB}MB). For simple upload, the maximum size is 10MB.`,
        category: 'size'
      };
    }
    
    // Check minimum size with helpful message
    if (file.size < 1000) { // 1KB minimum
      return { 
        valid: false, 
        error: `Image "${file.name}" is too small (${file.size} bytes) or may be corrupted. Please select a valid image file.`,
        category: 'validation'
      };
    }
    
    // Check for common problematic formats
    const warnings: string[] = [];
    const fileName = file.name.toLowerCase();
    
    if (fileName.endsWith('.heic') || fileName.endsWith('.heif')) {
      warnings.push('HEIC/HEIF format will be converted to JPEG for web compatibility.');
    }
    
    if (fileName.endsWith('.bmp')) {
      warnings.push('BMP format will be optimized and converted to JPEG for better web performance.');
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB
      warnings.push('Large image detected. Automatic optimization will be applied to improve upload speed.');
    }
    
    return { 
      valid: true, 
      warnings: warnings.length > 0 ? warnings : undefined 
    };
  }, []);

  // Enhanced file reader with comprehensive fallbacks and progress tracking
  const robustFileReader = useCallback(async (file: File): Promise<string> => {
    setUploadProgress({
      stage: 'reading',
      percentage: 20,
      message: 'Reading file...',
      details: `Processing ${file.name}`,
    });
    
    return new Promise((resolve, reject) => {
      let resolved = false;
      const timeoutMs = 30000; // 30 second timeout
      
      const resolveOnce = (result: string) => {
        if (resolved) return;
        resolved = true;
        resolve(result);
      };
      
      const rejectOnce = (error: Error) => {
        if (resolved) return;
        resolved = true;
        reject(error);
      };
      
      // Set up timeout
      const timeout = setTimeout(() => {
        rejectOnce(new Error(`File reading timeout after ${timeoutMs / 1000} seconds. The file may be too large or corrupted.`));
      }, timeoutMs);
      
      // Primary method: readAsDataURL
      const primaryReader = new FileReader();
      
      primaryReader.onload = (e) => {
        clearTimeout(timeout);
        try {
          if (e.target?.result) {
            const result = e.target.result as string;
            if (result && result.length > 0 && result.startsWith('data:')) {
              logWithTimestamp('Primary file reader successful:', {
                fileName: file.name,
                resultLength: result.length,
                isDataURL: result.startsWith('data:')
              });
              resolveOnce(result);
              return;
            }
          }
          throw new Error('Primary reader produced invalid result');
        } catch (error) {
          logWithTimestamp('Primary reader failed, trying fallback:', error);
          
          // Fallback method: readAsArrayBuffer then convert
          const fallbackReader = new FileReader();
          
          fallbackReader.onload = (fallbackEvent) => {
            try {
              if (fallbackEvent.target?.result) {
                const arrayBuffer = fallbackEvent.target.result as ArrayBuffer;
                const bytes = new Uint8Array(arrayBuffer);
                const base64 = btoa(String.fromCharCode.apply(null, Array.from(bytes)));
                const mimeType = file.type || 'image/jpeg';
                const dataUrl = `data:${mimeType};base64,${base64}`;
                
                logWithTimestamp('Fallback file reader successful:', {
                  fileName: file.name,
                  arrayBufferLength: arrayBuffer.byteLength,
                  base64Length: base64.length,
                  dataUrlLength: dataUrl.length
                });
                
                resolveOnce(dataUrl);
              } else {
                throw new Error('Fallback reader produced no result');
              }
            } catch (fallbackError) {
              logWithTimestamp('Fallback reader also failed:', fallbackError);
              rejectOnce(new Error(`Both primary and fallback file readers failed. The file may be corrupted or in an unsupported format.`));
            }
          };
          
          fallbackReader.onerror = (fallbackError) => {
            logWithTimestamp('Fallback reader error:', fallbackError);
            rejectOnce(new Error('All file reading methods failed. Please try a different image or check if the file is corrupted.'));
          };
          
          fallbackReader.readAsArrayBuffer(file);
        }
      };
      
      primaryReader.onerror = (error) => {
        logWithTimestamp('Primary reader error, trying fallback immediately:', error);
        
        // Immediate fallback on primary reader error
        const fallbackReader = new FileReader();
        
        fallbackReader.onload = (fallbackEvent) => {
          clearTimeout(timeout);
          try {
            if (fallbackEvent.target?.result) {
              const arrayBuffer = fallbackEvent.target.result as ArrayBuffer;
              const bytes = new Uint8Array(arrayBuffer);
              const base64 = btoa(String.fromCharCode.apply(null, Array.from(bytes)));
              const mimeType = file.type || 'image/jpeg';
              const dataUrl = `data:${mimeType};base64,${base64}`;
              
              logWithTimestamp('Emergency fallback reader successful:', {
                fileName: file.name,
                method: 'ArrayBuffer->Base64'
              });
              
              resolveOnce(dataUrl);
            } else {
              throw new Error('Emergency fallback reader produced no result');
            }
          } catch (fallbackError) {
            rejectOnce(new Error('All file reading attempts failed. The file may be corrupted, too large, or in an unsupported format.'));
          }
        };
        
        fallbackReader.onerror = () => {
          clearTimeout(timeout);
          rejectOnce(new Error('Critical error: Unable to read file with any method. Please try a different image file.'));
        };
        
        fallbackReader.readAsArrayBuffer(file);
      };
      
      // Start primary reading
      primaryReader.readAsDataURL(file);
    });
  }, [logWithTimestamp]);

  // Enhanced error handling with detailed categorization and recovery strategies
  const handleUploadError = useCallback((error: any, source: string = 'upload') => {
    const errorMessage = error?.message || 'Upload failed';
    const errorInfo = getUploadErrorMessage(errorMessage);
    
    // Determine retry strategy based on error type
    let retryStrategy: 'immediate' | 'delayed' | 'exponential' | 'none' = 'exponential';
    let retryDelay = 2000;
    
    if (errorInfo.category === 'network') {
      retryStrategy = 'exponential';
      retryDelay = 3000;
    } else if (errorInfo.category === 'auth') {
      retryStrategy = 'none';
    } else if (errorInfo.category === 'format' || errorInfo.category === 'validation') {
      retryStrategy = 'none';
    } else if (source === 'reader') {
      retryStrategy = 'delayed';
      retryDelay = 1000;
    }
    
    logWithTimestamp('Upload error detected with enhanced categorization:', {
      source,
      errorMessage,
      errorCategory: errorInfo.category,
      canRetry: errorInfo.canRetry,
      retryStrategy,
      retryDelay,
      componentSource: 'SimpleInnovatorImageUpload',
      componentId: componentIdRef,
    });
    
    setUploadProgress({
      stage: 'error',
      percentage: 0,
      message: 'Upload failed',
      details: errorMessage,
    });
    
    setErrorRecoveryState(prev => ({
      ...prev,
      hasError: true,
      errorMessage,
      errorCategory: (source === 'reader' ? 'reader' : errorInfo.category) as any,
      canRetry: errorInfo.canRetry && retryStrategy !== 'none',
      retryCount: prev.retryCount + 1,
      lastErrorTime: new Date(),
      retryDelay: retryStrategy === 'exponential' ? Math.min(retryDelay * Math.pow(2, prev.retryCount), 30000) : retryDelay,
      recoveryAttempts: prev.recoveryAttempts + 1,
      suggestions: errorInfo.suggestions || [],
      retryStrategy,
    }));
    
    // Update upload tracking
    if (currentUploadId) {
      updateUpload(currentUploadId, {
        status: 'failed',
        error: errorMessage,
      });
    }
    
    // Call error callback with enhanced information
    if (onUploadError) {
      onUploadError({
        message: errorMessage,
        category: errorInfo.category,
        canRetry: errorInfo.canRetry,
        suggestions: errorInfo.suggestions,
        componentSource: 'SimpleInnovatorImageUpload',
        componentId: componentIdRef,
        retryStrategy,
        source,
      });
    }
    
    // Show user-friendly error message with category
    const categoryEmoji = {
      network: '🌐',
      format: '📁',
      size: '📏',
      processing: '⚙️',
      auth: '🔐',
      reader: '📖',
      validation: '✅',
      unknown: '❓'
    };
    
    const emoji = categoryEmoji[errorInfo.category as keyof typeof categoryEmoji] || '❌';
    toast.error(`${emoji} ${errorInfo.message}`, { duration: 8000 });
    
    // Show first suggestion as a helpful tip
    if (errorInfo.suggestions.length > 0) {
      setTimeout(() => {
        toast(`💡 ${errorInfo.suggestions[0]}`, {
          duration: 6000,
          style: { background: '#dbeafe', color: '#1e40af' }
        });
      }, 2000);
    }
  }, [logWithTimestamp, componentIdRef, currentUploadId, updateUpload, onUploadError]);

  // Graceful fallback mechanism
  const handleFallbackToAdvanced = useCallback(() => {
    logWithTimestamp('Triggering fallback to advanced upload', {
      errorCount: errorRecoveryState.retryCount,
      componentSource: 'SimpleInnovatorImageUpload',
    });
    
    // Dispatch custom event to signal fallback needed
    const fallbackEvent = new CustomEvent('uploadFallbackNeeded', {
      detail: {
        fromComponent: 'SimpleInnovatorImageUpload',
        toComponent: 'BulletproofImageUpload',
        reason: 'max_retries_exceeded',
        errorMessage: errorRecoveryState.errorMessage,
        componentId: componentIdRef,
        innovatorId,
      },
      bubbles: true,
    });
    
    window.dispatchEvent(fallbackEvent);
    
    toast(`🔄 Switching to advanced upload due to repeated failures`, {
      duration: 5000,
      style: { background: '#fef3c7', color: '#92400e' }
    });
  }, [errorRecoveryState, logWithTimestamp, componentIdRef, innovatorId]);

  // Enhanced retry mechanism with exponential backoff and error categorization
  const handleRetryUpload = useCallback(async () => {
    if (!errorRecoveryState.canRetry || errorRecoveryState.retryCount >= errorRecoveryState.maxRetries) {
      logWithTimestamp('Retry not available or max retries reached');
      return;
    }
    
    const newRetryCount = errorRecoveryState.retryCount + 1;
    
    logWithTimestamp('Executing manual retry:', {
      attempt: newRetryCount,
      maxRetries: errorRecoveryState.maxRetries,
      lastError: errorRecoveryState.errorMessage,
    });
    
    // Reset error state for retry
    setErrorRecoveryState(prev => ({
      ...prev,
      hasError: false,
      errorMessage: '',
      retryCount: newRetryCount,
    }));
    
    // Show retry notification
    toast(`🔄 Retrying upload (attempt ${newRetryCount}/${errorRecoveryState.maxRetries})...`, {
      duration: 3000,
      style: { background: '#dbeafe', color: '#1e40af' }
    });
    
    // Wait a moment before retry
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Trigger upload if we have a selected file
    if (selectedFile) {
      handleUpload();
    }
  }, [errorRecoveryState, selectedFile, logWithTimestamp]);

  // Enhanced upload mutation with comprehensive error handling and progress tracking
  const uploadMutation = useMutation(
    trpc.uploadSimpleInnovatorImage.mutationOptions({
      onMutate: () => {
        // Start upload tracking
        const uploadId = addUpload({
          fileName: selectedFile?.name || 'unknown',
          status: 'uploading',
          progress: 0,
          retryCount: 0,
        });
        setCurrentUploadId(uploadId);
        
        setUploadProgress({
          stage: 'uploading',
          percentage: 70,
          message: 'Processing on server...',
          details: 'Server is optimizing your image',
        });
        
        // Call progress callback
        if (onUploadProgress) {
          onUploadProgress(70);
        }
        
        logWithTimestamp('Upload mutation started with enhanced tracking:', {
          uploadId,
          fileName: selectedFile?.name,
          componentSource: 'SimpleInnovatorImageUpload',
        });
      },
      onSuccess: async (data) => {
        logWithTimestamp('Upload mutation successful with enhanced processing:', {
          data,
          componentSource: 'SimpleInnovatorImageUpload',
        });
        
        setUploadProgress({
          stage: 'verifying',
          percentage: 90,
          message: 'Verifying upload...',
          details: 'Confirming successful upload',
        });
        
        // Update upload tracking
        if (currentUploadId) {
          updateUpload(currentUploadId, {
            status: 'verified',
            progress: 100,
            filePath: `simple-upload-${Date.now()}`,
          });
        }
        
        // Progress callback
        if (onUploadProgress) {
          onUploadProgress(100);
        }
        
        // Complete progress
        setUploadProgress({
          stage: 'complete',
          percentage: 100,
          message: 'Upload completed successfully!',
          details: `${selectedFile?.name} uploaded`,
        });
        
        setSelectedFile(null);
        setPreviewUrl('');
        setIsUploading(false);
        
        // Reset error state on success
        setErrorRecoveryState(prev => ({
          ...prev,
          hasError: false,
          errorMessage: '',
          retryCount: 0,
          lastErrorTime: null,
          recoveryAttempts: 0,
          suggestions: [],
        }));
        
        // Refetch current image
        currentImageQuery.refetch();
        
        toast.success(`✅ Avatar updated for ${innovatorName}`, { duration: 4000 });
        
        // Enhanced form patching with retry logic
        const patchSuccess = await patchFormValueWithRetry(true);
        
        if (!patchSuccess && retryFormUpdate) {
          logWithTimestamp('Form patching failed, attempting direct fallback');
          // Fallback: try direct callbacks
          if (onChange) onChange(`simple-upload-${Date.now()}`);
          if (onFormValueSet) onFormValueSet(`simple-upload-${Date.now()}`);
          if (onImageUpdated) onImageUpdated(true);
        }
        
        // Call completion callback
        if (onUploadComplete) {
          onUploadComplete({
            success: true,
            filePath: `simple-upload-${Date.now()}`,
            component: 'SimpleInnovatorImageUpload',
            componentId: componentIdRef,
            metadata: data.metadata,
          });
        }
      },
      onError: (error) => {
        logWithTimestamp('Upload mutation failed with enhanced error handling:', {
          error,
          componentSource: 'SimpleInnovatorImageUpload',
        });
        
        setIsUploading(false);
        handleUploadError(error, 'upload_mutation');
      },
    })
  );

  // Remove mutation
  const removeMutation = useMutation(
    trpc.removeSimpleInnovatorImage.mutationOptions({
      onSuccess: async () => {
        console.log('✅ Simple image removal successful');
        
        // Reset error state on success
        setErrorRecoveryState(prev => ({
          ...prev,
          hasError: false,
          errorMessage: '',
          retryCount: 0,
          lastErrorTime: null,
          recoveryAttempts: 0,
          suggestions: [],
        }));
        
        // Refetch current image
        currentImageQuery.refetch();
        
        toast.success(`✅ Avatar removed for ${innovatorName}`, { duration: 4000 });
        
        // Enhanced form patching for removal
        const patchSuccess = await patchFormValueWithRetry(false);
        
        if (!patchSuccess && retryFormUpdate) {
          logWithTimestamp('Form patching failed for removal, attempting direct fallback');
          // Fallback: try direct callbacks
          if (onChange) onChange(null);
          if (onFormValueSet) onFormValueSet(null);
          if (onImageUpdated) onImageUpdated(false);
        }
      },
      onError: (error) => {
        console.error('❌ Simple image removal failed:', error);
        
        setErrorRecoveryState(prev => ({
          ...prev,
          hasError: true,
          errorMessage: error.message || 'Removal failed',
          errorCategory: 'network',
          canRetry: true,
          retryCount: 0,
          lastErrorTime: new Date(),
          suggestions: ['Try again', 'Check your connection'],
        }));
        
        toast.error(`❌ Removal failed: ${error.message || 'Unknown error'}`, { duration: 6000 });
      },
    })
  );

  // Auto-retry effect with intelligent error categorization
  useEffect(() => {
    if (errorRecoveryState.hasError && 
        errorRecoveryState.autoRetryEnabled && 
        errorRecoveryState.canRetry && 
        errorRecoveryState.retryCount < errorRecoveryState.maxRetries &&
        errorRecoveryState.errorCategory !== 'auth' && 
        errorRecoveryState.errorCategory !== 'format') {
      
      const retryDelay = errorRecoveryState.retryDelay;
      
      logWithTimestamp('Auto-retry scheduled:', {
        delay: retryDelay,
        attempt: errorRecoveryState.retryCount + 1,
        maxRetries: errorRecoveryState.maxRetries,
        errorType: errorRecoveryState.errorCategory,
      });
      
      toast(`⏰ Auto-retry in ${retryDelay / 1000} seconds...`, {
        duration: retryDelay - 500,
        style: { background: '#dbeafe', color: '#1e40af' }
      });
      
      const timer = setTimeout(() => {
        handleRetryUpload();
      }, retryDelay);
      
      return () => clearTimeout(timer);
    }
  }, [errorRecoveryState, handleRetryUpload, logWithTimestamp]);

  // Enhanced file selection with comprehensive progress tracking
  const handleFileSelect = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    
    if (fileArray.length === 0) return;
    
    const file = fileArray[0]; // Only take the first file
    
    try {
      setUploadProgress({
        stage: 'validating',
        percentage: 5,
        message: 'Starting file processing...',
        details: `Selected: ${file.name}`,
      });
      
      logWithTimestamp('File selection started with enhanced processing:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        lastModified: file.lastModified
      });
      
      // Reset error state
      setErrorRecoveryState(prev => ({
        ...prev,
        hasError: false,
        errorMessage: '',
        retryCount: 0,
        lastErrorTime: null,
        recoveryAttempts: 0,
        suggestions: [],
      }));
      
      // Enhanced validation with progress tracking
      const validation = validateFile(file);
      if (!validation.valid) {
        const errorMsg = validation.error || 'Invalid file selected';
        logWithTimestamp('File validation failed with details:', { 
          error: errorMsg, 
          file: file.name,
          category: validation.category 
        });
        
        handleUploadError({ 
          message: errorMsg, 
          category: validation.category || 'validation' 
        }, 'validation');
        return;
      }
      
      // Show validation warnings if any
      if (validation.warnings) {
        validation.warnings.forEach((warning, index) => {
          setTimeout(() => {
            toast(`⚠️ ${warning}`, {
              duration: 4000,
              style: { background: '#fef3c7', color: '#92400e' }
            });
          }, index * 1000);
        });
      }
      
      setSelectedFile(file);
      
      setUploadProgress({
        stage: 'reading',
        percentage: 15,
        message: 'Reading file data...',
        details: 'Preparing for upload',
      });
      
      // Enhanced file reading with robust error handling
      try {
        const result = await robustFileReader(file);
        setPreviewUrl(result);
        
        setUploadProgress({
          stage: 'complete',
          percentage: 100,
          message: 'File ready for upload',
          details: `${file.name} processed successfully`,
        });
        
        logWithTimestamp('File selection completed successfully:', {
          fileName: file.name,
          previewLength: result.length,
          isDataURL: result.startsWith('data:')
        });
        
      } catch (readerError) {
        logWithTimestamp('Enhanced file reader failed:', readerError);
        handleUploadError(readerError, 'reader');
      }
      
    } catch (error) {
      logWithTimestamp('Error in enhanced file selection:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred during file selection';
      handleUploadError({ message: errorMessage }, 'selection');
    }
  }, [validateFile, robustFileReader, logWithTimestamp, handleUploadError]);

  // Enhanced upload process with detailed progress tracking
  const handleUpload = useCallback(async () => {
    if (!selectedFile || !adminToken) {
      if (!adminToken) {
        logWithTimestamp('Upload failed: No admin token');
        handleUploadError({ 
          message: 'Authentication required. Please log in and try again.',
          category: 'auth'
        }, 'auth');
      }
      return;
    }
    
    setIsUploading(true);
    
    try {
      setUploadProgress({
        stage: 'optimizing',
        percentage: 30,
        message: 'Optimizing image...',
        details: 'Preparing for upload',
      });
      
      logWithTimestamp('Enhanced upload process started:', {
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileType: selectedFile.type,
        adminTokenPresent: !!adminToken
      });
      
      // Enhanced file reading with progress updates
      setUploadProgress({
        stage: 'reading',
        percentage: 40,
        message: 'Converting image data...',
        details: 'Reading file contents',
      });
      
      const base64Content = await robustFileReader(selectedFile);
      
      setUploadProgress({
        stage: 'uploading',
        percentage: 60,
        message: 'Uploading to server...',
        details: 'Sending data',
      });
      
      logWithTimestamp('Initiating enhanced upload mutation:', {
        innovatorId,
        fileName: selectedFile.name,
        fileType: selectedFile.type,
        contentLength: base64Content.length
      });
      
      uploadMutation.mutate({
        adminToken,
        innovatorId,
        fileName: selectedFile.name,
        fileContent: base64Content,
        fileType: selectedFile.type,
      });
      
    } catch (error) {
      logWithTimestamp('Enhanced upload preparation error:', error);
      setIsUploading(false);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to prepare image for upload';
      handleUploadError({ message: errorMessage }, 'preparation');
    }
  }, [selectedFile, adminToken, innovatorId, uploadMutation, logWithTimestamp, robustFileReader, handleUploadError]);

  const handleRemove = useCallback(() => {
    if (!adminToken) {
      toast.error('Authentication required. Please log in and try again.');
      return;
    }
    
    removeMutation.mutate({
      adminToken,
      innovatorId,
    });
  }, [adminToken, innovatorId, removeMutation]);

  const handleClear = useCallback(() => {
    setSelectedFile(null);
    setPreviewUrl('');
    setUploadProgress({
      stage: 'idle',
      percentage: 0,
      message: '',
    });
    setErrorRecoveryState(prev => ({
      ...prev,
      hasError: false,
      errorMessage: '',
      retryCount: 0,
      lastErrorTime: null,
      recoveryAttempts: 0,
      suggestions: [],
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Event handlers
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

  // Log current state for debugging
  useEffect(() => {
    logWithTimestamp('Component state update:', {
      innovatorId,
      innovatorName,
      hasCurrentImage,
      currentImageSrc: currentImageSrc ? 'Present' : 'None',
      isLoading: currentImageQuery.isLoading,
      isError: currentImageQuery.isError,
      selectedFile: selectedFile?.name || 'None',
      previewUrl: previewUrl ? 'Present' : 'None',
      errorState: errorRecoveryState,
      uploadProgress: uploadProgress,
      queryData: currentImageQuery.data,
      formValue: value,
    });
  }, [logWithTimestamp, innovatorId, innovatorName, hasCurrentImage, currentImageSrc, currentImageQuery.isLoading, currentImageQuery.isError, selectedFile, previewUrl, errorRecoveryState, uploadProgress, currentImageQuery.data, value]);

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Avatar for {innovatorName}
        </h3>
        {hasCurrentImage && (
          <button
            onClick={handleRemove}
            disabled={disabled || removeMutation.isPending}
            className="text-xs text-red-600 hover:text-red-700 disabled:opacity-50 flex items-center space-x-1"
          >
            <Trash2 className="h-3 w-3" />
            <span>Remove</span>
          </button>
        )}
      </div>

      {/* Enhanced Progress Indicator */}
      {(isUploading || uploadProgress.stage !== 'idle') && uploadProgress.stage !== 'complete' && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center space-x-3">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <div className="flex-1">
              <div className="flex justify-between text-sm text-blue-700 dark:text-blue-300 mb-1">
                <span className="font-medium capitalize">{uploadProgress.stage}</span>
                <span>{uploadProgress.percentage}%</span>
              </div>
              <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2 mb-1">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress.percentage}%` }}
                />
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                {uploadProgress.message}
              </p>
              {uploadProgress.details && (
                <p className="text-xs text-blue-500 dark:text-blue-500 mt-1">
                  {uploadProgress.details}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Current Image Display with comprehensive null checking */}
      {hasCurrentImage && !selectedFile && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 dark:text-gray-400">Current Avatar:</p>
          <div className="w-32 h-32 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden relative">
            {currentImageSrc ? (
              <img
                src={currentImageSrc}
                alt={`${innovatorName} avatar`}
                className="w-full h-full object-cover"
                onLoad={() => {
                  logWithTimestamp('Current image loaded successfully');
                  setErrorRecoveryState(prev => ({ ...prev, hasError: false }));
                }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  logWithTimestamp('Current image failed to load:', {
                    src: target.src,
                    error: 'Image load error'
                  });
                  
                  setErrorRecoveryState(prev => ({
                    ...prev,
                    hasError: true,
                    errorMessage: 'Failed to load current image',
                    errorCategory: 'network',
                    canRetry: true,
                    retryCount: 0,
                    lastErrorTime: new Date(),
                    suggestions: ['Refresh the page', 'Check your connection'],
                  }));
                  
                  target.style.display = 'none';
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <User className="h-8 w-8" />
              </div>
            )}
            
            {/* Loading overlay for current image */}
            {currentImageQuery.isLoading && (
              <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            )}
          </div>
          
          {/* Enhanced image info with null checking */}
          {currentImage?.isBase64 && currentImage?.imageData && (
            <p className="text-xs text-green-600">
              ✓ Stored inline ({Math.round((currentImage.imageData.length || 0) / 1024)}KB)
            </p>
          )}
          
          {currentImage?.imageUrl && !currentImage?.isBase64 && (
            <p className="text-xs text-blue-600">
              ✓ External URL
            </p>
          )}
        </div>
      )}

      {/* Enhanced Error State Display with Recovery Options */}
      {errorRecoveryState.hasError && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800 dark:text-red-200">
                Upload Error ({errorRecoveryState.errorCategory})
              </p>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                {errorRecoveryState.errorMessage}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Component: {errorRecoveryState.componentSource} | Recovery attempts: {errorRecoveryState.recoveryAttempts}
              </p>
              
              {/* Enhanced suggestions display */}
              {errorRecoveryState.suggestions.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs font-medium text-red-700 dark:text-red-300">Suggestions:</p>
                  {errorRecoveryState.suggestions.slice(0, 2).map((suggestion, index) => (
                    <p key={index} className="text-xs text-red-600 dark:text-red-400">
                      • {suggestion}
                    </p>
                  ))}
                </div>
              )}
              
              <div className="mt-3 flex items-center space-x-3 flex-wrap gap-2">
                {errorRecoveryState.canRetry && errorRecoveryState.retryCount < errorRecoveryState.maxRetries && (
                  <button
                    onClick={handleRetryUpload}
                    disabled={isUploading}
                    className="text-red-600 hover:text-red-700 underline text-xs disabled:opacity-50"
                  >
                    Retry ({errorRecoveryState.retryCount}/{errorRecoveryState.maxRetries})
                  </button>
                )}
                
                <button
                  onClick={() => setErrorRecoveryState(prev => ({ 
                    ...prev, 
                    autoRetryEnabled: !prev.autoRetryEnabled 
                  }))}
                  className="text-gray-600 hover:text-gray-700 underline text-xs"
                >
                  Auto-retry: {errorRecoveryState.autoRetryEnabled ? 'ON' : 'OFF'}
                </button>
                
                {errorRecoveryState.retryCount >= errorRecoveryState.maxRetries && errorRecoveryState.fallbackAvailable && (
                  <button
                    onClick={handleFallbackToAdvanced}
                    className="text-blue-600 hover:text-blue-700 underline text-xs"
                  >
                    Switch to Emergency Upload
                  </button>
                )}
                
                <button
                  onClick={handleClear}
                  className="text-gray-600 hover:text-gray-700 underline text-xs"
                >
                  Clear & Start Over
                </button>
              </div>
              
              {/* Category-specific help */}
              {errorRecoveryState.errorCategory === 'auth' && (
                <p className="mt-2 text-xs text-red-600">
                  Please refresh the page and log in again.
                </p>
              )}
              
              {errorRecoveryState.errorCategory === 'format' && (
                <p className="mt-2 text-xs text-red-600">
                  Try converting your image to JPEG or PNG format.
                </p>
              )}
              
              {errorRecoveryState.errorCategory === 'size' && (
                <p className="mt-2 text-xs text-red-600">
                  Try compressing your image or reducing its dimensions.
                </p>
              )}
              
              {errorRecoveryState.errorCategory === 'reader' && (
                <p className="mt-2 text-xs text-red-600">
                  File reading failed. The image may be corrupted or in an unsupported format.
                </p>
              )}
              
              {errorRecoveryState.lastErrorTime && (
                <p className="mt-1 text-xs text-gray-500">
                  Last error: {formatDate(errorRecoveryState.lastErrorTime)} | Strategy: {errorRecoveryState.retryStrategy}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

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
          accept="image/*"
          className="hidden"
          disabled={disabled}
          onChange={handleFileInputChange}
        />
        
        {isUploading || uploadMutation.isPending ? (
          <div className="flex flex-col items-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Processing avatar...
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-3">
            <div className="relative">
              <Upload className="h-8 w-8 text-gray-400" />
              <User className="h-4 w-4 absolute -bottom-1 -right-1 text-blue-600" />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Upload avatar for {innovatorName}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                JPEG, PNG, WebP • Max 10MB • Optimized to 500KB
              </p>
              <div className="flex items-center justify-center space-x-2 text-xs text-green-600">
                <Check className="h-3 w-3" />
                <span>Simple & Reliable</span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* File Preview */}
      {selectedFile && previewUrl && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Selected File
            </h4>
            <button
              onClick={handleClear}
              className="text-xs text-red-600 hover:text-red-700"
            >
              Clear
            </button>
          </div>
          
          <div className="flex items-start space-x-4">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            </div>
            
            <div className="flex-1 space-y-2">
              <div className="text-sm">
                <p className="font-medium text-gray-700 dark:text-gray-300 truncate">
                  {selectedFile.name}
                </p>
                <p className="text-gray-500 dark:text-gray-400">
                  {(selectedFile.size / (1024 * 1024)).toFixed(1)}MB
                </p>
              </div>
              
              <button
                onClick={handleUpload}
                disabled={disabled || isUploading || uploadMutation.isPending}
                className="w-full px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isUploading || uploadMutation.isPending ? (
                  <span className="flex items-center justify-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Uploading...</span>
                  </span>
                ) : (
                  'Upload Avatar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Loading State for Current Image Query */}
      {currentImageQuery.isLoading && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          <span className="ml-2 text-sm text-gray-500">Loading current avatar...</span>
        </div>
      )}
      
      {/* Error State for Current Image Query */}
      {currentImageQuery.isError && (
        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
            <div className="text-sm text-amber-700 dark:text-amber-300">
              <p>Could not load current avatar</p>
              <button
                onClick={() => currentImageQuery.refetch()}
                className="text-amber-600 hover:text-amber-700 underline"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced debug info panel with component identification */}
      {debugMode && (
        <div className="mt-4 p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs space-y-1">
          <div><strong>Debug Info (SimpleInnovatorImageUpload):</strong></div>
          <div>Component ID: {componentIdRef}</div>
          <div>Query Status: {currentImageQuery.isLoading ? 'Loading' : currentImageQuery.isError ? 'Error' : 'Success'}</div>
          <div>Has Current Image: {hasCurrentImage ? 'Yes' : 'No'}</div>
          <div>Current Image Source: {currentImageSrc ? 'Present' : 'None'}</div>
          <div>Selected File: {selectedFile?.name || 'None'}</div>
          <div>Form Value: {value || 'None'}</div>
          <div>Upload Progress: {uploadProgress.stage} ({uploadProgress.percentage}%)</div>
          <div>Error State: {errorRecoveryState.hasError ? errorRecoveryState.errorMessage : 'None'}</div>
          <div>Auto-retry: {errorRecoveryState.autoRetryEnabled ? 'Enabled' : 'Disabled'}</div>
          <div>Retry Count: {errorRecoveryState.retryCount}/{errorRecoveryState.maxRetries}</div>
          <div>Recovery Attempts: {errorRecoveryState.recoveryAttempts}</div>
          <div>Retry Strategy: {errorRecoveryState.retryStrategy}</div>
          <div>Admin Token: {adminToken ? 'Present' : 'Missing'}</div>
          <div>Upload ID: {currentUploadId || 'None'}</div>
        </div>
      )}
    </div>
  );
});

// Add display name for debugging
SimpleInnovatorImageUpload.displayName = 'SimpleInnovatorImageUpload';
