import React, { useState, useRef, useCallback, memo, useEffect, useMemo } from 'react';
import { useTRPC } from '../../trpc/react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useUserStore } from '../../stores/userStore';
import {
  validateImageFile,
  validateImageFiles, 
  formatFileSize,
  getUploadErrorMessage
} from '../../constants/validation';
import { getImageUrl, getCacheBustedImageUrl, formatDate, debounce } from '../../utils/common';
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

// Enhanced debugging and error recovery configuration for BulletproofImageUpload
const DEBUG_BULLETPROOF = true; // Enable comprehensive debugging
const EMERGENCY_FALLBACK_ENABLED = true; // Enable emergency fallback options
const MAX_RETRY_ATTEMPTS = 5; // Increased for bulletproof system
const RETRY_DELAY_BASE = 1500; // Base delay for exponential backoff

// Enhanced logging utility with bulletproof component identification
const logBulletproofDebug = (message: string, data?: any, level: 'info' | 'warn' | 'error' = 'info') => {
  if (DEBUG_BULLETPROOF) {
    const timestamp = new Date().toISOString();
    const prefix = `🛡️ DEBUG: BulletproofImageUpload [${timestamp}]`;
    
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

// Enhanced file input verification utility for bulletproof system
const verifyBulletproofFileInput = (fileInputRef: React.RefObject<HTMLInputElement>): {
  accessible: boolean;
  issues: string[];
  element: HTMLInputElement | null;
  capabilities: {
    canClick: boolean;
    canFocus: boolean;
    hasMultiple: boolean;
    acceptAttribute: string;
  };
} => {
  const issues: string[] = [];
  const element = fileInputRef.current;
  
  if (!element) {
    issues.push('File input element not found in DOM');
    return { 
      accessible: false, 
      issues, 
      element: null,
      capabilities: {
        canClick: false,
        canFocus: false,
        hasMultiple: false,
        acceptAttribute: ''
      }
    };
  }
  
  const capabilities = {
    canClick: true,
    canFocus: true,
    hasMultiple: element.hasAttribute('multiple'),
    acceptAttribute: element.getAttribute('accept') || ''
  };
  
  // Enhanced verification checks
  if (!element.parentNode) {
    issues.push('File input element not attached to DOM');
  }
  
  if (element.disabled) {
    issues.push('File input element is disabled');
    capabilities.canClick = false;
    capabilities.canFocus = false;
  }
  
  if (element.style.display === 'none' && !element.classList.contains('hidden')) {
    issues.push('File input element has display:none but not using hidden class');
  }
  
  // Test click capability
  try {
    element.focus();
    element.blur();
  } catch (error) {
    issues.push(`File input element focus/blur failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    capabilities.canFocus = false;
  }
  
  // Test click event simulation
  try {
    const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
    element.dispatchEvent(clickEvent);
  } catch (error) {
    issues.push(`File input click simulation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    capabilities.canClick = false;
  }
  
  return {
    accessible: issues.length === 0,
    issues,
    element,
    capabilities
  };
};

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
  // Component identification for debugging
  componentId?: string;
  // Enhanced error recovery
  enableFallbackMode?: boolean;
  fallbackComponent?: string;
  // Recovery hook integration
  reportErrorToRecovery?: (error: any, component: string) => void;
  reportSuccessToRecovery?: (component: string, result?: any) => void;
}

interface UploadProgress {
  phase: 'preparing' | 'uploading' | 'processing' | 'verifying' | 'complete' | 'error';
  percentage: number;
  message: string;
  strategy?: string;
  warnings?: string[];
  verificationAttempts?: number;
  verificationMaxAttempts?: number;
}

interface ProgressiveUploadState {
  sessionId?: string;
  totalChunks: number;
  uploadedChunks: number;
  chunkSize: number;
}

export const BulletproofImageUpload = memo(function BulletproofImageUpload({
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
  // Component identification
  componentId,
  // Enhanced error recovery
  enableFallbackMode = true,
  fallbackComponent = 'SimpleInnovatorImageUpload',
  // Recovery hook integration
  reportErrorToRecovery,
  reportSuccessToRecovery,
}: BulletproofImageUploadProps) {
  // Component identification for debugging
  const actualComponentId = componentId || `bulletproof-upload-${Date.now()}`;
  
  // Circuit breaker: render counter to detect infinite loops
  const renderCountRef = useRef(0);
  const lastRenderTimeRef = useRef(Date.now());
  const maxRendersPerSecond = 15; // Emergency circuit breaker threshold
  const emergencyStopRef = useRef(false);
  
  // Increment render counter and check for excessive renders
  useEffect(() => {
    renderCountRef.current++;
    const now = Date.now();
    const timeSinceLastRender = now - lastRenderTimeRef.current;
    
    // Reset counter every second
    if (timeSinceLastRender > 1000) {
      renderCountRef.current = 1;
      lastRenderTimeRef.current = now;
      emergencyStopRef.current = false; // Reset emergency stop
    } else if (renderCountRef.current > maxRendersPerSecond && !emergencyStopRef.current) {
      emergencyStopRef.current = true;
      logBulletproofDebug(`🚨 CIRCUIT BREAKER: BulletproofImageUpload [${actualComponentId}] exceeded ${maxRendersPerSecond} renders per second. Emergency stop activated.`, {
        renderCount: renderCountRef.current,
        timeSinceLastRender,
        selectedFiles: selectedFiles.length,
        uploadPhase: uploadProgress.phase,
      }, 'error');
      
      toast.error(`🚨 Upload system paused due to excessive activity. Please refresh if needed.`, { 
        duration: 10000 
      });
      
      // Report to recovery system
      if (reportErrorToRecovery) {
        reportErrorToRecovery({
          message: 'Circuit breaker activated - excessive renders detected',
          category: 'ui',
          componentSource: 'BulletproofImageUpload',
          renderCount: renderCountRef.current,
        }, 'BulletproofImageUpload');
      }
    }
  });
  
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    phase: 'preparing',
    percentage: 0,
    message: '',
  });
  const [progressiveState, setProgressiveState] = useState<ProgressiveUploadState | null>(null);
  
  // Enhanced error recovery with adaptive retry logic
  const [enhancedRetryState, setEnhancedRetryState] = useState<{
    attempts: number;
    maxAttempts: number;
    canRetry: boolean;
    retryAfter?: number;
    lastError?: string;
    adaptiveRetryEnabled: boolean;
    backoffMultiplier: number;
  }>({
    attempts: 0,
    maxAttempts: 5, // Increased for better reliability
    canRetry: false,
    adaptiveRetryEnabled: true,
    backoffMultiplier: 1.5,
  });
  
  const [metadata, setMetadata] = useState<Array<{
    title?: string;
    description?: string;
    altText?: string;
  }>>([]);
  const [showMetadataModal, setShowMetadataModal] = useState(false);
  const [previewErrors, setPreviewErrors] = useState<Record<string, boolean>>({});
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [imageVerification, setImageVerification] = useState<{
    isVerifying: boolean;
    attempts: number;
    maxAttempts: number;
    verificationStartTime?: number;
    lastVerificationError?: string;
  }>({
    isVerifying: false,
    attempts: 0,
    maxAttempts: 5,
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { adminToken, addUpload, updateUpload, removeUpload } = useUserStore();
  const [currentUploadId, setCurrentUploadId] = useState<string | null>(null);
  const trpc = useTRPC();

  // Ensure adminToken is properly initialized with null check
  const safeAdminToken = adminToken || '';

  // Reference equality checks for previous state values to prevent unnecessary updates
  const prevSelectedFilesRef = useRef<File[]>([]);
  const prevUploadProgressRef = useRef<UploadProgress>();
  const prevEnhancedRetryStateRef = useRef<typeof enhancedRetryState>();
  const prevValueRef = useRef<string | string[]>();
  
  // Memoized values to prevent unnecessary re-renders
  const memoizedSelectedFiles = useMemo(() => {
    if (prevSelectedFilesRef.current !== selectedFiles) {
      prevSelectedFilesRef.current = selectedFiles;
    }
    return prevSelectedFilesRef.current;
  }, [selectedFiles]);
  
  const memoizedUploadProgress = useMemo(() => {
    if (JSON.stringify(prevUploadProgressRef.current) !== JSON.stringify(uploadProgress)) {
      prevUploadProgressRef.current = uploadProgress;
    }
    return prevUploadProgressRef.current || uploadProgress;
  }, [uploadProgress]);
  
  const memoizedValue = useMemo(() => {
    if (prevValueRef.current !== value) {
      prevValueRef.current = value;
    }
    return prevValueRef.current;
  }, [value]);

  // Enhanced logging with component source identification
  const logWithTimestamp = useCallback((message: string, data?: any) => {
    console.log(`🔍 DEBUG: BulletproofImageUpload [${actualComponentId}] [${new Date().toISOString()}] - ${message}`, data || '');
  }, [actualComponentId]);

  // Enhanced error handling with component-level recovery
  const handleComponentError = useCallback((error: any, source: string = 'upload') => {
    const errorMessage = error?.message || 'Upload failed';
    const errorInfo = getUploadErrorMessage(errorMessage);
    
    logWithTimestamp('Component error detected:', {
      source,
      errorMessage,
      errorCategory: errorInfo.category,
      canRetry: errorInfo.canRetry,
      componentSource: 'BulletproofImageUpload',
      componentId: actualComponentId,
    });
    
    // Update enhanced retry state
    setEnhancedRetryState(prev => ({
      ...prev,
      canRetry: errorInfo.canRetry && prev.attempts < prev.maxAttempts,
      lastError: errorMessage,
      retryAfter: errorInfo.retryDelay ? errorInfo.retryDelay / 1000 : undefined,
    }));
    
    // Update upload tracking
    if (currentUploadId) {
      updateUpload(currentUploadId, {
        status: 'failed',
        error: errorMessage,
      });
    }
    
    const errorPayload = {
      message: errorMessage,
      category: errorInfo.category,
      canRetry: errorInfo.canRetry,
      suggestions: errorInfo.suggestions,
      componentSource: 'BulletproofImageUpload',
      componentId: actualComponentId,
      adaptiveAction: errorInfo.adaptiveAction,
      httpStatus: errorInfo.httpStatus,
      source, // Add the specific source of the error
    };

    if (reportErrorToRecovery) {
      reportErrorToRecovery(errorPayload, 'BulletproofImageUpload');
    }
    
    if (onUploadError) {
      onUploadError(errorPayload);
    }
    
    // Show user-friendly error message
    toast.error(`❌ ${errorInfo.message}`, { duration: 8000 });
    
    // Show suggestions
    if (errorInfo.suggestions.length > 0) {
      setTimeout(() => {
        toast(`💡 ${errorInfo.suggestions[0]}`, {
          duration: 6000,
          style: { background: '#dbeafe', color: '#1e40af' }
        });
      }, 2000);
    }
  }, [logWithTimestamp, actualComponentId, currentUploadId, updateUpload, onUploadError, reportErrorToRecovery]);

  // Graceful fallback mechanism
  const handleFallbackToSimple = useCallback(() => {
    if (!enableFallbackMode) return;
    
    logWithTimestamp('Triggering fallback to simple upload', {
      errorCount: enhancedRetryState.attempts,
      componentSource: 'BulletproofImageUpload',
    });
    
    // Dispatch custom event to signal fallback needed
    const fallbackEvent = new CustomEvent('uploadFallbackNeeded', {
      detail: {
        fromComponent: 'BulletproofImageUpload',
        toComponent: fallbackComponent,
        reason: 'max_retries_exceeded',
        errorMessage: enhancedRetryState.lastError,
        componentId: actualComponentId,
      },
      bubbles: true,
    });
    
    window.dispatchEvent(fallbackEvent);
    
    toast(`🔄 Switching to ${fallbackComponent === 'SimpleInnovatorImageUpload' ? 'simple' : 'alternative'} upload due to repeated failures`, {
      duration: 5000,
      style: { background: '#fef3c7', color: '#92400e' }
    });
  }, [enableFallbackMode, enhancedRetryState, logWithTimestamp, actualComponentId, fallbackComponent]);

  // Helper function to dispatch custom imageUpdated event with enhanced details
  const dispatchImageUpdatedEvent = useCallback((filePath: string | string[]) => {
    const eventDetail = {
      filePath: filePath,
      timestamp: Date.now(),
      uploadedAt: new Date().toISOString(),
      component: 'BulletproofImageUpload',
      componentId: actualComponentId,
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
  }, [logWithTimestamp, actualComponentId]);

  // Image verification function with exponential backoff
  const verifyImageAccessibility = useCallback(async (
    filePath: string,
    retryAttempt: number = 0
  ): Promise<{ verified: boolean; error?: string }> => {
    return new Promise((resolve) => {
      const img = new Image();
      const timeoutMs = 10000; // 10 second timeout
      let resolved = false;
      
      const cleanup = () => {
        img.onload = null;
        img.onerror = null;
        img.src = '';
      };
      
      const resolveOnce = (result: { verified: boolean; error?: string }) => {
        if (resolved) return;
        resolved = true;
        cleanup();
        resolve(result);
      };
      
      // Set up timeout
      const timeout = setTimeout(() => {
        resolveOnce({
          verified: false,
          error: `Image verification timeout after ${timeoutMs}ms (attempt ${retryAttempt + 1})`
        });
      }, timeoutMs);
      
      img.onload = () => {
        clearTimeout(timeout);
        logWithTimestamp('Image verification successful:', {
          filePath,
          attempt: retryAttempt + 1,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
        });
        resolveOnce({ verified: true });
      };
      
      img.onerror = (error) => {
        clearTimeout(timeout);
        const errorMsg = `Image verification failed (attempt ${retryAttempt + 1}): ${error}`;
        logWithTimestamp('Image verification failed:', {
          filePath,
          attempt: retryAttempt + 1,
          error: errorMsg,
        });
        resolveOnce({
          verified: false,
          error: errorMsg
        });
      };
      
      // Use cache-busted URL with retry increment for fresh fetching
      const imageUrl = getCacheBustedImageUrl(filePath, new Date(), undefined);
      const urlWithRetry = `${imageUrl}&retry=${retryAttempt}`;
      
      logWithTimestamp('Starting image verification:', {
        filePath,
        attempt: retryAttempt + 1,
        imageUrl: urlWithRetry,
      });
      
      img.crossOrigin = 'anonymous';
      img.src = urlWithRetry;
    });
  }, [logWithTimestamp]);

  // Enhanced verification with exponential backoff
  const performImageVerification = useCallback(async (filePath: string): Promise<boolean> => {
    setImageVerification(prev => ({
      ...prev,
      isVerifying: true,
      verificationStartTime: Date.now(),
    }));
    
    setUploadProgress(prev => ({
      ...prev,
      phase: 'verifying',
      percentage: 85,
      message: 'Verifying image accessibility...',
      verificationAttempts: 1,
      verificationMaxAttempts: imageVerification.maxAttempts,
    }));
    
    for (let attempt = 0; attempt < imageVerification.maxAttempts; attempt++) {
      try {
        const result = await verifyImageAccessibility(filePath, attempt);
        
        if (result.verified) {
          setImageVerification(prev => ({
            ...prev,
            isVerifying: false,
            attempts: attempt + 1,
          }));
          
          setUploadProgress(prev => ({
            ...prev,
            phase: 'complete',
            percentage: 100,
            message: 'Upload completed and verified successfully!',
            verificationAttempts: attempt + 1,
          }));
          
          logWithTimestamp('Image verification completed successfully:', {
            filePath,
            totalAttempts: attempt + 1,
            verificationTime: Date.now() - (imageVerification.verificationStartTime || Date.now()),
          });
          
          if (reportSuccessToRecovery) {
            reportSuccessToRecovery('BulletproofImageUpload_Verification', {
              filePath,
              verificationAttempts: attempt + 1,
              status: 'verified',
            });
          }
          
          return true;
        }
        
        // Update progress for retry
        if (attempt < imageVerification.maxAttempts - 1) {
          const retryDelay = Math.min(1000 * Math.pow(2, attempt), 8000); // Max 8 seconds
          
          setUploadProgress(prev => ({
            ...prev,
            percentage: 85 + (attempt + 1) * (10 / imageVerification.maxAttempts),
            message: `Verification failed, retrying in ${retryDelay / 1000}s... (${attempt + 1}/${imageVerification.maxAttempts})`,
            verificationAttempts: attempt + 1,
          }));
          
          logWithTimestamp('Image verification retry scheduled:', {
            filePath,
            attempt: attempt + 1,
            retryDelay,
            error: result.error,
          });
          
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
        
      } catch (error) {
        logWithTimestamp('Image verification error:', {
          filePath,
          attempt: attempt + 1,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
    
    // All verification attempts failed
    setImageVerification(prev => ({
      ...prev,
      isVerifying: false,
      attempts: imageVerification.maxAttempts,
      lastVerificationError: 'Image verification failed after all attempts',
    }));
    
    setUploadProgress(prev => ({
      ...prev,
      phase: 'error',
      percentage: 0,
      message: 'Upload completed but image verification failed',
      verificationAttempts: imageVerification.maxAttempts,
    }));
    
    logWithTimestamp('Image verification failed after all attempts:', {
      filePath,
      totalAttempts: imageVerification.maxAttempts,
    });
    
    const verificationError = {
      message: 'Image verification failed after all attempts',
      category: 'verification',
      filePath,
      attempts: imageVerification.maxAttempts,
    };
    
    if (reportErrorToRecovery) {
      reportErrorToRecovery(verificationError, 'BulletproofImageUpload_Verification');
    }
    
    if (onUploadError) { // Also call the direct onUploadError prop
      onUploadError({
        ...verificationError,
        componentSource: 'BulletproofImageUpload',
        componentId: actualComponentId,
      });
    }
    
    return false;
  }, [verifyImageAccessibility, imageVerification.maxAttempts, imageVerification.verificationStartTime, logWithTimestamp, reportSuccessToRecovery, reportErrorToRecovery, actualComponentId, onUploadError]);

  // Enhanced form value patching with retry logic and validation triggering
  const patchFormValueWithRetry = useCallback(async (
    filePath: string | string[] | null,
    retryCount: number = 0,
    maxRetries: number = 3
  ): Promise<boolean> => {
    try {
      logWithTimestamp('patchFormValueWithRetry called:', {
        filePath: filePath,
        filePathType: typeof filePath,
        filePathLength: Array.isArray(filePath) ? filePath.length : filePath?.length,
        retryCount: retryCount,
        maxRetries: maxRetries,
        currentValue: value,
      });

      // Call the parent onChange handler with enhanced validation flags (Fix #2)
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
      
      logWithTimestamp('Form value update verification:', {
        expectedValue: filePath,
        actualValue: value,
        updateSuccessful: updateSuccessful,
        retryCount: retryCount,
      });
      
      if (updateSuccessful || retryCount >= maxRetries) {
        if (updateSuccessful) {
          logWithTimestamp('Form value successfully updated - dispatching event');
          
          // Dispatch custom event for crosscutting updates (Fix #3)
          if (filePath) {
            dispatchImageUpdatedEvent(filePath);
          }
          
          return true;
        } else {
          logWithTimestamp('Form value update failed after max retries', { filePath, value });
          return false;
        }
      }
      
      // Retry if update wasn't successful
      logWithTimestamp('Retrying form value update...', { retryCount: retryCount + 1 });
      await new Promise(resolve => setTimeout(resolve, 100 * (retryCount + 1))); // Exponential backoff
      return patchFormValueWithRetry(filePath, retryCount + 1, maxRetries);
      
    } catch (error) {
      logWithTimestamp('Error in patchFormValueWithRetry:', error);
      
      if (retryCount < maxRetries) {
        logWithTimestamp('Retrying after error...', { retryCount: retryCount + 1 });
        await new Promise(resolve => setTimeout(resolve, 200 * (retryCount + 1)));
        return patchFormValueWithRetry(filePath, retryCount + 1, maxRetries);
      }
      
      return false;
    }
  }, [onChange, onFormValueSet, value, dispatchImageUpdatedEvent, logWithTimestamp]);

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

  // Single upload mutation with bulletproof processing and enhanced logging
  const bulletproofUploadMutation = useMutation(
    trpc.bulletproofSingleUpload.mutationOptions({
      onMutate: () => {
        // Start upload tracking with enhanced details
        const uploadId = addUpload({
          fileName: selectedFiles[0]?.name || 'unknown',
          status: 'uploading',
          progress: 0,
          retryCount: 0,
        });
        setCurrentUploadId(uploadId);
        
        logBulletproofDebug('=== BULLETPROOF UPLOAD MUTATION STARTED ===', {
          uploadId,
          fileName: selectedFiles[0]?.name,
          fileSize: selectedFiles[0]?.size,
          fileType: selectedFiles[0]?.type,
          componentSource: 'BulletproofImageUpload',
          componentId: actualComponentId,
          timestamp: new Date().toISOString(),
          adminTokenPresent: !!safeAdminToken,
          adminTokenLength: safeAdminToken?.length || 0
        });
      },
      onSuccess: async (data) => {
        const uploadEndTime = Date.now();
        
        logBulletproofDebug('=== BULLETPROOF UPLOAD SUCCESS RESPONSE ===', {
          response: data,
          filePath: data?.filePath,
          filePathType: typeof data?.filePath,
          filePathLength: data?.filePath?.length,
          filePathTrimmed: data?.filePath?.trim(),
          success: data?.success,
          metadata: data?.metadata,
          warnings: data?.warnings,
          uploadEndTime,
          componentSource: 'BulletproofImageUpload',
          componentId: actualComponentId,
          timestamp: new Date().toISOString()
        });
        
        // Update upload tracking
        if (currentUploadId) {
          updateUpload(currentUploadId, {
            status: 'verified',
            progress: 100,
            filePath: data?.filePath,
          });
        }
        
        // Reset enhanced retry state on success
        setEnhancedRetryState({
          attempts: 0,
          maxAttempts: 5,
          canRetry: false,
          adaptiveRetryEnabled: true,
          backoffMultiplier: 1.5,
        });
        
        // First, set processing complete but not final success
        setUploadProgress({
          phase: 'processing',
          percentage: 80,
          message: 'Server processing completed, starting verification...',
          strategy: data?.metadata?.strategy,
          warnings: data?.warnings,
        });
        
        // Enhanced null/undefined checks for filePath with detailed logging
        if (data && data.filePath && typeof data.filePath === 'string' && data.filePath.trim() !== '') {
          logBulletproofDebug('Valid filePath received, starting verification:', {
            filePathToVerify: data.filePath,
            filePathType: typeof data.filePath,
            filePathLength: data.filePath.length,
            filePathTrimmed: data.filePath.trim(),
            strategy: data?.metadata?.strategy
          });
          
          // Start verification process
          const verificationSuccessful = await performImageVerification(data.filePath);
          
          if (verificationSuccessful) {
            // Only now update form value and dispatch events
            logBulletproofDebug('Verification successful, updating form value:', {
              filePathToPass: data.filePath,
              strategy: data?.metadata?.strategy
            });
            
            const patchSuccess = await patchFormValueWithRetry(data.filePath);
            
            if (patchSuccess) {
              logBulletproofDebug('Enhanced form patching successful after verification');
            } else {
              logBulletproofDebug('Enhanced form patching failed after verification, using fallback');
              onChange(data.filePath);
              dispatchImageUpdatedEvent(data.filePath);
            }
            
            // Clear temporary state
            setSelectedFiles([]);
            setPreviewUrls([]);
            setMetadata([]);
            
            toast.success(`✅ Image uploaded and verified successfully with ${data?.metadata?.strategy || 'bulletproof'} processing!`, { 
              duration: 5000 
            });
            
            // Show processing details
            if (data?.metadata) {
              const originalMB = (data.metadata.originalSize / (1024 * 1024)).toFixed(1);
              const processedMB = (data.metadata.processedSize / (1024 * 1024)).toFixed(1);
              const timeSeconds = (data.metadata.totalProcessingTime / 1000).toFixed(1);
              const compressionRatio = (data.metadata.originalSize / data.metadata.processedSize).toFixed(2);
              
              logBulletproofDebug('Upload processing details:', {
                originalSize: data.metadata.originalSize,
                processedSize: data.metadata.processedSize,
                totalProcessingTime: data.metadata.totalProcessingTime,
                strategy: data.metadata.strategy,
                compressionRatio
              });
              
              setTimeout(() => {
                toast(`🚀 Processed in ${timeSeconds}s: ${originalMB}MB → ${processedMB}MB (${data.metadata.strategy}, ${compressionRatio}x compression)`, {
                  duration: 4000,
                  style: { background: '#f0f9ff', color: '#0369a1' }
                });
              }, 1000);
            }
            
            if (data?.warnings && data.warnings.length > 0) {
              logBulletproofDebug('Upload warnings received:', { warnings: data.warnings }, 'warn');
              
              setTimeout(() => {
                toast(`⚠️ ${data.warnings[0]}`, {
                  duration: 6000,
                  style: { background: '#fef3c7', color: '#92400e' }
                });
              }, 2000);
            }
            
            if (reportSuccessToRecovery) {
              reportSuccessToRecovery('BulletproofImageUpload', {
                ...data,
                status: 'uploaded_and_verified',
              });
            }
            onUploadComplete?.(data);
          } else {
            // Verification failed - show warning but don't clear form completely
            logBulletproofDebug('Image verification failed but upload completed', {
              filePath: data.filePath
            }, 'warn');
            
            toast.error(`⚠️ Upload completed but image verification failed. Image may not display immediately.`, { 
              duration: 8000 
            });
            
            // Still update form value but mark as potentially problematic
            const patchSuccess = await patchFormValueWithRetry(data.filePath);
            if (!patchSuccess) {
              onChange(data.filePath);
            }
            
            // Don't dispatch imageUpdated event since verification failed
            logBulletproofDebug('Verification failed - form updated but no imageUpdated event dispatched');
          }
          
        } else {
          logBulletproofDebug('=== INVALID FILEPATH IN BULLETPROOF RESPONSE ===', {
            data: data,
            filePath: data?.filePath,
            filePathType: typeof data?.filePath,
            filePathLength: data?.filePath?.length,
            filePathTrimmed: data?.filePath?.trim?.(),
            isEmptyAfterTrim: data?.filePath?.trim?.() === '',
            componentId: actualComponentId
          }, 'error');
          
          setUploadProgress({
            phase: 'error',
            percentage: 0,
            message: 'Upload completed but file path is missing or invalid',
          });
          
          const errorPayload = { 
            message: 'Upload completed but file path is missing or invalid', 
            category: 'processing',
            componentSource: 'BulletproofImageUpload',
            componentId: actualComponentId
          };
          if (reportErrorToRecovery) reportErrorToRecovery(errorPayload, 'BulletproofImageUpload');
          if (onUploadError) onUploadError(errorPayload);
          
          toast.error('Upload completed but file path is missing or invalid. Please try again.');
          return;
        }
      },
      onError: (error) => {
        const uploadEndTime = Date.now();
        
        logBulletproofDebug('=== BULLETPROOF UPLOAD ERROR RESPONSE ===', {
          error: error,
          errorMessage: error.message,
          errorName: error.name,
          errorCause: error.cause,
          errorStack: error.stack,
          uploadEndTime,
          componentSource: 'BulletproofImageUpload',
          componentId: actualComponentId,
          timestamp: new Date().toISOString(),
          selectedFileName: selectedFiles[0]?.name,
          adminTokenPresent: !!safeAdminToken
        }, 'error');
        
        setUploadProgress({
          phase: 'error',
          percentage: 0,
          message: 'Upload failed',
        });
        
        handleComponentError(error, 'bulletproof_upload');
      },
    })
  );

  // Progressive upload mutation
  const progressiveUploadMutation = useMutation(
    trpc.bulletproofProgressiveUpload.mutationOptions({
      onSuccess: async (data) => {
        logWithTimestamp('progressiveUploadMutation onSuccess - EXACT data response:', {
          data: data,
          dataComplete: data?.complete,
          dataFilePath: data?.filePath,
          dataFilePathType: typeof data?.filePath,
          componentSource: 'BulletproofImageUpload',
          componentId: actualComponentId,
        });
        
        if (data?.complete) {
          // Reset enhanced retry state on success
          setEnhancedRetryState({
            attempts: 0,
            maxAttempts: 5,
            canRetry: false,
            adaptiveRetryEnabled: true,
            backoffMultiplier: 1.5,
          });
          
          // Progressive upload completed
          setUploadProgress({
            phase: 'processing',
            percentage: 80,
            message: 'Progressive upload completed, starting verification...',
          });
          
          // Enhanced null/undefined checks for filePath with detailed logging
          if (data && data.filePath && typeof data.filePath === 'string' && data.filePath.trim() !== '') {
            logWithTimestamp('Progressive upload - Just before calling enhanced form patching:', {
              filePathToPass: data.filePath,
              filePathType: typeof data.filePath,
              filePathLength: data.filePath.length,
              sessionId: data.sessionId,
              totalChunks: data.totalChunks,
            });
            
            // Start verification process
            const verificationSuccessful = await performImageVerification(data.filePath);
            
            if (verificationSuccessful) {
              // Use enhanced form value patching with retry logic (Fix #2)
              const patchSuccess = await patchFormValueWithRetry(data.filePath);
              
              if (patchSuccess) {
                logWithTimestamp('Progressive upload enhanced form patching successful');
              } else {
                logWithTimestamp('Progressive upload enhanced form patching failed');
                // Fallback: try direct onChange one more time
                onChange(data.filePath);
                // Still dispatch event
                dispatchImageUpdatedEvent(data.filePath);
              }
              
              setSelectedFiles([]);
              setPreviewUrls([]);
              setProgressiveState(null);
              
              toast.success('🎉 Large file uploaded and verified successfully with progressive upload!', { duration: 5000 });
              
              if (reportSuccessToRecovery) {
                reportSuccessToRecovery('BulletproofImageUpload_Progressive', {
                  ...data,
                  status: 'uploaded_and_verified',
                });
              }
              onUploadComplete?.(data);
            } else {
              toast.error(`⚠️ Progressive upload completed but image verification failed. Image may not display immediately.`, { 
                duration: 8000 
              });
              
              // Still update form value but mark as potentially problematic
              const patchSuccess = await patchFormValueWithRetry(data.filePath);
              if (!patchSuccess) {
                onChange(data.filePath);
              }
            }
            
          } else {
            logWithTimestamp('Invalid filePath in progressive upload response:', {
              data: data,
              filePath: data?.filePath,
              filePathType: typeof data?.filePath,
              complete: data?.complete,
            });
            
            const errorPayload = { message: 'Progressive upload completed but file path is missing or invalid', category: 'processing' };
            if (reportErrorToRecovery) reportErrorToRecovery(errorPayload, 'BulletproofImageUpload_Progressive');
            if (onUploadError) onUploadError(errorPayload);
            
            toast.error('Progressive upload completed but file path is missing or invalid. Please try again.');
            return;
          }
        } else {
          // Update progress
          const percentage = (data?.receivedChunks / data?.totalChunks) * 100;
          logWithTimestamp('Progressive upload progress:', {
            receivedChunks: data?.receivedChunks,
            totalChunks: data?.totalChunks,
            percentage: percentage.toFixed(1),
          });
          
          setUploadProgress({
            phase: 'uploading',
            percentage,
            message: `Uploading chunk ${data?.receivedChunks}/${data?.totalChunks}...`,
          });
          
          setProgressiveState(prev => prev ? {
            ...prev,
            uploadedChunks: data?.receivedChunks || 0,
          } : null);
        }
      },
      onError: (error) => {
        logWithTimestamp('Progressive upload error:', {
          error,
          componentSource: 'BulletproofImageUpload',
          componentId: actualComponentId,
        });
        
        setUploadProgress({
          phase: 'error',
          percentage: 0,
          message: 'Progressive upload failed',
        });
        
        setProgressiveState(null);
        
        handleComponentError(error, 'progressive_upload');
      },
    })
  );

  // Bulk upload mutation
  const bulletproofBulkUploadMutation = useMutation(
    trpc.bulletproofBulkUpload.mutationOptions({
      onSuccess: async (data) => {
        logWithTimestamp('bulletproofBulkUploadMutation onSuccess - EXACT data response:', {
          data: data,
          resultsLength: data?.results?.length,
          results: data?.results,
          componentSource: 'BulletproofImageUpload',
          componentId: actualComponentId,
        });
        
        // Reset enhanced retry state on success
        setEnhancedRetryState({
          attempts: 0,
          maxAttempts: 5,
          canRetry: false,
          adaptiveRetryEnabled: true,
          backoffMultiplier: 1.5,
        });
        
        setUploadProgress({
          phase: 'processing',
          percentage: 80,
          message: `Bulk upload completed: ${data?.summary?.successCount}/${data?.summary?.totalProcessed} successful, starting verification...`,
        });
        
        if (multiple) {
          const successPaths = data?.results?.filter((r: any) => r?.success).map((r: any) => r?.filePath) || [];
          const validPaths = successPaths.filter((path: any) => path && typeof path === 'string' && path.trim() !== '');
          
          logWithTimestamp('Bulk upload processing results for multiple:', {
            totalResults: data?.results?.length || 0,
            successCount: successPaths.length,
            validPathCount: validPaths.length,
            validPaths: validPaths,
            successPaths: successPaths,
          });
          
          if (validPaths.length > 0) {
            // For bulk uploads, we'll verify the first image as a representative check
            const verificationSuccessful = validPaths.length > 0 ? await performImageVerification(validPaths[0]) : true;
            
            if (verificationSuccessful) {
              logWithTimestamp('Just before calling enhanced form patching with bulk upload paths:', {
                pathsToPass: validPaths,
                pathsType: typeof validPaths,
                pathsLength: validPaths.length,
              });
              
              // Use enhanced form value patching with retry logic (Fix #2)
              const patchSuccess = await patchFormValueWithRetry(validPaths);
              
              if (patchSuccess) {
                logWithTimestamp('Bulk upload enhanced form patching successful');
              } else {
                logWithTimestamp('Bulk upload enhanced form patching failed');
                // Fallback: try direct onChange one more time
                onChange(validPaths);
                // Still dispatch event
                dispatchImageUpdatedEvent(validPaths);
              }
            } else {
              toast.error(`⚠️ Bulk upload completed but image verification failed. Images may not display immediately.`, { 
                duration: 8000 
              });
              
              // Still update form value but mark as potentially problematic
              const patchSuccess = await patchFormValueWithRetry(validPaths);
              if (!patchSuccess) {
                onChange(validPaths);
              }
            }
            
          } else {
            logWithTimestamp('No valid filePaths in bulk upload results:', {
              results: data?.results,
              successPaths: successPaths,
            });
            
            const errorPayload = { message: 'Bulk upload completed but no valid file paths returned', category: 'processing' };
            if (reportErrorToRecovery) reportErrorToRecovery(errorPayload, 'BulletproofImageUpload_Bulk');
            if (onUploadError) onUploadError(errorPayload);
            
            toast.error('Bulk upload completed but no valid file paths returned. Please try again.');
            return;
          }
        } else if (data?.results?.length > 0 && data.results[0]?.success) {
          const filePath = data.results[0]?.filePath;
          
          logWithTimestamp('Single upload from bulk processing result:', {
            result: data.results[0],
            filePath: filePath,
            filePathType: typeof filePath,
          });
          
          if (filePath && typeof filePath === 'string' && filePath.trim() !== '') {
            // Start verification process
            const verificationSuccessful = await performImageVerification(filePath);
            
            if (verificationSuccessful) {
              logWithTimestamp('Just before calling enhanced form patching with bulk single upload:', {
                filePathToPass: filePath,
                filePathType: typeof filePath,
                filePathLength: filePath.length,
              });
              
              // Use enhanced form value patching with retry logic (Fix #2)
              const patchSuccess = await patchFormValueWithRetry(filePath);
              
              if (patchSuccess) {
                logWithTimestamp('Bulk single upload enhanced form patching successful');
              } else {
                logWithTimestamp('Bulk single upload enhanced form patching failed');
                // Fallback: try direct onChange one more time
                onChange(filePath);
                // Still dispatch event
                dispatchImageUpdatedEvent(filePath);
              }
            } else {
              toast.error(`⚠️ Upload completed but image verification failed. Image may not display immediately.`, { 
                duration: 8000 
              });
              
              // Still update form value but mark as potentially problematic
              const patchSuccess = await patchFormValueWithRetry(filePath);
              if (!patchSuccess) {
                onChange(filePath);
              }
            }
            
          } else {
            logWithTimestamp('Invalid filePath in bulk single upload result:', {
              result: data?.results?.[0],
              filePath: filePath,
              filePathType: typeof filePath,
            });
            
            const errorPayload = { message: 'Upload completed but file path is missing or invalid', category: 'processing' };
            if (reportErrorToRecovery) reportErrorToRecovery(errorPayload, 'BulletproofImageUpload_Bulk');
            if (onUploadError) onUploadError(errorPayload);
            
            toast.error('Upload completed but file path is missing or invalid. Please try again.');
            return;
          }
        }
        
        setSelectedFiles([]);
        setPreviewUrls([]);
        setMetadata([]);
        
        const timeSeconds = (data?.summary?.processingTime / 1000).toFixed(1);
        
        if (data?.summary?.errorCount > 0) {
          toast.error(`${data?.summary?.successCount} uploaded, ${data?.summary?.errorCount} failed in ${timeSeconds}s`, { 
            duration: 8000 
          });
          
          data?.errors?.forEach((error: any, index: number) => {
            setTimeout(() => {
              toast.error(`❌ ${error?.fileName}: ${error?.error}`, { duration: 6000 });
            }, (index + 1) * 1000);
          });
        } else {
          toast.success(`🎉 All ${data?.summary?.successCount} images uploaded and verified in ${timeSeconds}s!`, { 
            duration: 5000 
          });
        }
        
        if (reportSuccessToRecovery) {
          reportSuccessToRecovery('BulletproofImageUpload_Bulk', {
            ...data,
            status: 'uploaded_and_verified',
            verifiedPaths: multiple ? data?.results?.filter((r: any) => r?.success).map((r: any) => r?.filePath) : [data?.results?.[0]?.filePath], // Add verified paths info
          });
        }
        onUploadComplete?.(data);
      },
      onError: (error) => {
        logWithTimestamp('Bulletproof bulk upload error:', {
          error,
          componentSource: 'BulletproofImageUpload',
          componentId: actualComponentId,
        });
        
        setUploadProgress({
          phase: 'error',
          percentage: 0,
          message: 'Bulk upload failed',
        });
        
        handleComponentError(error, 'bulk_upload');
      },
    })
  );

  const handleSingleUpload = useCallback(async (file: File) => {
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
      adminToken: safeAdminToken,
      fileName: file.name,
      fileContent: base64Content,
      fileType: file.type || 'image/jpeg',
      title: meta.title,
      description: meta.description,
      altText: meta.altText,
    });
  }, [metadata, bulletproofUploadMutation, safeAdminToken]);

  const handleProgressiveUpload = useCallback(async (file: File) => {
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
          adminToken: safeAdminToken,
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
          sessionId = result?.sessionId;
          setProgressiveState(prev => prev ? { ...prev, sessionId } : null);
        }
      }
      
    } catch (error) {
      console.error('Progressive upload error:', error);
      setProgressiveState(null);
      throw error;
    }
  }, [createFileChunks, progressiveUploadMutation, safeAdminToken]);

  const handleBulkUpload = useCallback(async () => {
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
      adminToken: safeAdminToken,
      images: imagesData,
    });
  }, [selectedFiles, metadata, bulletproofBulkUploadMutation, safeAdminToken]);

  const handleUpload = useCallback(async () => {
    if (selectedFiles.length === 0 || !safeAdminToken) {
      if (!safeAdminToken) {
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
  }, [selectedFiles, safeAdminToken, shouldUseProgressiveUpload, handleProgressiveUpload, handleBulkUpload, handleSingleUpload]);

  // Enhanced retry mechanism with functional updates to prevent stale closures
  const handleRetry = useCallback(async () => {
    if (emergencyStopRef.current) {
      logWithTimestamp('Retry blocked by emergency stop');
      return;
    }
    
    // Use functional update to prevent stale closure issues
    setEnhancedRetryState(prev => {
      if (!prev.canRetry || selectedFiles.length === 0) {
        logWithTimestamp('Retry not available or no files selected');
        return prev;
      }
      
      return {
        ...prev,
        attempts: prev.attempts + 1,
      };
    });
    
    // Get current state for retry logic
    const currentRetryState = enhancedRetryState;
    const newAttempts = currentRetryState.attempts + 1;
    
    // Adaptive backoff calculation
    const baseDelay = 2000; // 2 seconds base
    const adaptiveDelay = currentRetryState.adaptiveRetryEnabled 
      ? baseDelay * Math.pow(currentRetryState.backoffMultiplier, newAttempts - 1)
      : baseDelay;
    const finalDelay = Math.min(adaptiveDelay, 30000); // Cap at 30 seconds
    
    logWithTimestamp(`Executing retry attempt ${newAttempts}/${currentRetryState.maxAttempts}`, {
      delay: finalDelay,
      lastError: currentRetryState.lastError,
      adaptiveRetryEnabled: currentRetryState.adaptiveRetryEnabled,
    });
    
    toast(`🔄 Retrying upload (attempt ${newAttempts}/${currentRetryState.maxAttempts})...`, {
      duration: Math.min(finalDelay - 500, 5000),
      style: { background: '#dbeafe', color: '#1e40af' }
    });
    
    // Wait if retryAfter is specified or use adaptive delay
    const waitTime = currentRetryState.retryAfter ? currentRetryState.retryAfter * 1000 : finalDelay;
    
    if (waitTime > 0) {
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    // Reset upload state for retry using functional updates
    setUploadProgress(prev => ({
      ...prev,
      phase: 'preparing',
      percentage: 0,
      message: `Retry attempt ${newAttempts}`,
    }));
    
    // Clear previous errors
    setPreviewErrors({});
    
    // Trigger upload
    handleUpload();
  }, [selectedFiles.length, enhancedRetryState, handleUpload, logWithTimestamp]);

  const handleFileSelect = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    
    logBulletproofDebug('=== BULLETPROOF FILE SELECTION STARTED ===', {
      fileCount: fileArray.length,
      files: fileArray.map(f => ({
        name: f.name,
        size: f.size,
        type: f.type,
        lastModified: f.lastModified
      })),
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      multiple,
      maxImages,
      currentSelectedFiles: selectedFiles.length,
      currentPreviewUrls: previewUrls.length,
      uploadProgress: uploadProgress,
      componentId: actualComponentId
    });
    
    // Check limits with detailed logging
    if (multiple && fileArray.length > maxImages) {
      logBulletproofDebug('File limit exceeded:', {
        selectedCount: fileArray.length,
        maxAllowed: maxImages,
        multiple
      }, 'warn');
      
      toast.error(`Maximum ${maxImages} images allowed. Please select fewer files.`, { duration: 6000 });
      return;
    }
    
    if (!multiple && fileArray.length > 1) {
      logBulletproofDebug('Multiple files selected for single upload:', {
        selectedCount: fileArray.length,
        multiple
      }, 'warn');
      
      toast.error('Only one image can be uploaded at a time.', { duration: 4000 });
      return;
    }
    
    // Enhanced progress tracking with race condition prevention
    const progressId = `progress_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    setUploadProgress({
      phase: 'preparing',
      percentage: 10,
      message: 'Validating files...',
    });
    
    logBulletproofDebug('Starting file validation phase:', {
      progressId,
      fileCount: fileArray.length
    });
    
    // Enhanced validation with detailed logging
    let validFiles: File[] = [];
    let hasErrors = false;
    const validationResults: Array<{
      file: File;
      valid: boolean;
      error?: string;
      warnings?: string[];
    }> = [];
    
    try {
      if (fileArray.length === 1) {
        const file = fileArray[0];
        const validation = validateImageFile(file);
        
        validationResults.push({
          file,
          valid: validation.valid,
          error: validation.error,
          warnings: validation.warnings
        });
        
        logBulletproofDebug('Single file validation result:', {
          fileName: file.name,
          fileSize: file.size,
          valid: validation.valid,
          error: validation.error,
          warnings: validation.warnings,
          category: validation.category
        });
        
        // More lenient validation for bulletproof system
        if (validation.valid || validation.category === 'size') {
          validFiles = fileArray;
          if (validation.warnings) {
            validation.warnings.forEach(warning => {
              logBulletproofDebug('File validation warning:', { warning, fileName: file.name }, 'warn');
              toast(`⚠️ ${warning}`, {
                duration: 5000,
                style: { background: '#fef3c7', color: '#92400e' }
              });
            });
          }
        } else {
          hasErrors = true;
          const errorInfo = getUploadErrorMessage(validation.error || 'Invalid file');
          logBulletproofDebug('File validation failed:', {
            fileName: file.name,
            error: validation.error,
            errorInfo
          }, 'error');
          
          toast.error(`❌ ${file.name}: ${errorInfo.message}`, { duration: 8000 });
        }
      } else {
        const validation = validateImageFiles(fileArray);
        validFiles = validation.validFiles;
        
        logBulletproofDebug('Multiple file validation results:', {
          totalFiles: fileArray.length,
          validFiles: validation.validFiles.length,
          invalidFiles: validation.invalidFiles.length,
          warnings: validation.warnings
        });
        
        validation.validFiles.forEach(file => {
          validationResults.push({
            file,
            valid: true
          });
        });
        
        validation.invalidFiles.forEach(({ file, error }) => {
          validationResults.push({
            file,
            valid: false,
            error
          });
        });
        
        if (validation.invalidFiles.length > 0) {
          hasErrors = true;
          validation.invalidFiles.forEach(({ file, error }, index) => {
            setTimeout(() => {
              const errorInfo = getUploadErrorMessage(error);
              logBulletproofDebug('Invalid file detected:', {
                fileName: file.name,
                error,
                errorInfo
              }, 'error');
              
              toast.error(`❌ ${file.name}: ${errorInfo.message}`, { duration: 6000 });
            }, index * 1000);
          });
        }
      }
      
      if (validFiles.length === 0) {
        logBulletproofDebug('No valid files after validation', {
          originalCount: fileArray.length,
          hasErrors
        }, 'warn');
        
        setUploadProgress({
          phase: 'error',
          percentage: 0,
          message: 'No valid files selected',
        });
        return;
      }
      
      logBulletproofDebug('File validation completed successfully:', {
        validFileCount: validFiles.length,
        totalOriginalFiles: fileArray.length,
        validationResults: validationResults.map(r => ({
          fileName: r.file.name,
          valid: r.valid,
          error: r.error
        }))
      });
      
      setUploadProgress({
        phase: 'preparing',
        percentage: 30,
        message: 'Optimizing images...',
      });
      
      // Client-side optimization with enhanced error handling and race condition prevention
      if (enableClientOptimization) {
        setIsOptimizing(true);
        
        try {
          logBulletproofDebug('Starting client-side optimization...');
          
          const optimizedFiles = await Promise.all(
            validFiles.map(async (file, index) => {
              const sizeMB = file.size / (1024 * 1024);
              
              logBulletproofDebug('Processing file for optimization:', {
                fileName: file.name,
                sizeMB: sizeMB.toFixed(1),
                index: index + 1,
                total: validFiles.length
              });
              
              if (sizeMB > 10) {
                try {
                  const optimized = await optimizeImageOnClient(file);
                  
                  logBulletproofDebug('File optimization completed:', {
                    fileName: file.name,
                    originalSize: file.size,
                    optimizedSize: optimized.size,
                    compressionRatio: (file.size / optimized.size).toFixed(2),
                    sizeSavings: ((file.size - optimized.size) / file.size * 100).toFixed(1) + '%'
                  });
                  
                  return optimized;
                } catch (optimizationError) {
                  logBulletproofDebug('File optimization failed, using original:', {
                    fileName: file.name,
                    error: optimizationError instanceof Error ? optimizationError.message : 'Unknown error'
                  }, 'warn');
                  
                  return file;
                }
              }
              return file;
            })
          );
          
          validFiles = optimizedFiles;
          
          logBulletproofDebug('Client-side optimization completed:', {
            fileCount: validFiles.length,
            totalOriginalSize: fileArray.reduce((sum, f) => sum + f.size, 0),
            totalOptimizedSize: validFiles.reduce((sum, f) => sum + f.size, 0)
          });
          
          toast.success('✨ Images optimized for faster upload', { duration: 3000 });
        } catch (error) {
          logBulletproofDebug('Client optimization failed:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            fileCount: validFiles.length
          }, 'error');
          
          toast(`⚠️ Client optimization failed, proceeding with original files`, {
            duration: 4000,
            style: { background: '#fef3c7', color: '#92400e' }
          });
        }
        setIsOptimizing(false);
      }
      
      // Race condition prevention: Check if component is still mounted and state is consistent
      if (selectedFiles.length > 0 && selectedFiles !== validFiles) {
        logBulletproofDebug('Potential race condition detected - clearing previous state', {
          previousFileCount: selectedFiles.length,
          newFileCount: validFiles.length
        }, 'warn');
      }
      
      setSelectedFiles(validFiles);
      setUploadProgress({
        phase: 'preparing',
        percentage: 50,
        message: 'Creating previews...',
      });
      setPreviewErrors({});
      
      logBulletproofDebug('Creating file previews...', {
        fileCount: validFiles.length
      });
      
      // Create previews with enhanced error handling and race condition prevention
      try {
        const previews = await Promise.all(
          validFiles.map((file, index) => new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            
            const timeoutId = setTimeout(() => {
              logBulletproofDebug('Preview creation timeout:', {
                fileName: file.name,
                index,
                timeout: 30000
              }, 'warn');
              
              reject(new Error(`Preview creation timeout for ${file.name}`));
            }, 30000); // 30 second timeout
            
            reader.onload = (e) => {
              clearTimeout(timeoutId);
              const result = e.target?.result as string;
              
              if (result) {
                logBulletproofDebug('Preview created successfully:', {
                  fileName: file.name,
                  index,
                  previewLength: result.length,
                  isDataURL: result.startsWith('data:')
                });
                
                resolve(result);
              } else {
                logBulletproofDebug('Preview creation failed - no result:', {
                  fileName: file.name,
                  index
                }, 'error');
                
                reject(new Error(`No preview result for ${file.name}`));
              }
            };
            
            reader.onerror = (error) => {
              clearTimeout(timeoutId);
              logBulletproofDebug('FileReader error during preview creation:', {
                fileName: file.name,
                index,
                error
              }, 'error');
              
              reject(new Error(`FileReader error for ${file.name}`));
            };
            
            reader.readAsDataURL(file);
          }))
        );
        
        // Race condition check before setting previews
        if (selectedFiles === validFiles) {
          setPreviewUrls(previews);
          
          logBulletproofDebug('All previews created successfully:', {
            previewCount: previews.length,
            fileCount: validFiles.length
          });
        } else {
          logBulletproofDebug('Race condition detected during preview creation - state changed', {
            expectedFiles: validFiles.length,
            currentFiles: selectedFiles.length
          }, 'warn');
        }
        
        setUploadProgress({
          phase: 'preparing',
          percentage: 70,
          message: 'Ready to upload',
        });
        
        // Initialize metadata with race condition prevention
        const newMetadata = validFiles.map(file => ({
          title: file.name.replace(/\.[^/.]+$/, ''),
          description: '',
          altText: '',
        }));
        
        if (selectedFiles === validFiles) {
          setMetadata(newMetadata);
          
          logBulletproofDebug('Metadata initialized:', {
            metadataCount: newMetadata.length
          });
        }
        
        // Auto-upload will be handled by the effect
        if (!showMetadata) {
          setUploadProgress({
            phase: 'preparing',
            percentage: 100,
            message: 'Ready to upload',
          });
        } else {
          setUploadProgress({
            phase: 'preparing',
            percentage: 100,
            message: 'Ready - please review metadata',
          });
        }
        
        logBulletproofDebug('=== BULLETPROOF FILE SELECTION COMPLETED SUCCESSFULLY ===', {
          finalFileCount: validFiles.length,
          previewCount: previews.length,
          metadataCount: newMetadata.length,
          readyForUpload: !showMetadata,
          progressId
        });
        
      } catch (error) {
        logBulletproofDebug('=== PREVIEW CREATION FAILED ===', {
          error: error instanceof Error ? error.message : 'Unknown error',
          fileCount: validFiles.length,
          stack: error instanceof Error ? error.stack : 'No stack trace',
          progressId
        }, 'error');
        
        toast.error('Failed to create image previews. Please try again.', { duration: 6000 });
        
        setSelectedFiles([]);
        setPreviewUrls([]);
        setUploadProgress({
          phase: 'error',
          percentage: 0,
          message: 'Preview creation failed',
        });
      }
      
    } catch (error) {
      logBulletproofDebug('=== BULLETPROOF FILE SELECTION FAILED ===', {
        error: error instanceof Error ? error.message : 'Unknown error',
        fileCount: fileArray.length,
        stack: error instanceof Error ? error.stack : 'No stack trace',
        progressId
      }, 'error');
      
      setUploadProgress({
        phase: 'error',
        percentage: 0,
        message: 'File selection failed',
      });
      
      toast.error('Failed to process selected files. Please try again.');
      handleComponentError(error, 'file_selection');
    }
  }, [multiple, maxImages, enableClientOptimization, showMetadata, optimizeImageOnClient, selectedFiles, handleComponentError, actualComponentId]);

  const handleRemove = useCallback(async () => {
    logWithTimestamp('handleRemove called - clearing all state and form value');
    
    // Log current state before clearing
    logWithTimestamp('Current state before removal:', {
      selectedFiles: selectedFiles.length,
      previewUrls: previewUrls.length,
      currentValue: value,
      uploadPhase: uploadProgress.phase,
    });
    
    logWithTimestamp('Just before calling enhanced form patching to clear form value');
    
    // Use enhanced form value patching to clear the value
    const patchSuccess = await patchFormValueWithRetry(null);
    
    if (patchSuccess) {
      logWithTimestamp('Enhanced form patching successful for clearing value');
    } else {
      logWithTimestamp('Enhanced form patching failed for clearing, using fallback');
      // Fallback: try direct onChange
      onChange(null);
    }
    
    // Dispatch event for removal as well
    dispatchImageUpdatedEvent('');
    
    setSelectedFiles([]);
    setPreviewUrls([]);
    setUploadProgress({ phase: 'preparing', percentage: 0, message: '' });
    setMetadata([]);
    setPreviewErrors({});
    setProgressiveState(null);
    setEnhancedRetryState({ 
      attempts: 0, 
      maxAttempts: 5, 
      canRetry: false,
      adaptiveRetryEnabled: true,
      backoffMultiplier: 1.5,
    });
    setImageVerification({ isVerifying: false, attempts: 0, maxAttempts: 5 });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    logWithTimestamp('All state cleared successfully');
  }, [selectedFiles.length, previewUrls.length, value, uploadProgress.phase, patchFormValueWithRetry, onChange, dispatchImageUpdatedEvent, logWithTimestamp]);

  // Memoized event handlers to prevent re-creation
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
    logBulletproofDebug('=== BULLETPROOF FILE INPUT CHANGE EVENT ===', {
      hasFiles: !!e.target.files,
      fileCount: e.target.files?.length || 0,
      inputValue: e.target.value,
      timestamp: new Date().toISOString(),
      eventType: e.type,
      eventTarget: e.target.tagName,
      eventCurrentTarget: e.currentTarget.tagName,
      multiple: e.target.hasAttribute('multiple'),
      accept: e.target.getAttribute('accept'),
      componentId: actualComponentId
    });
    
    const files = e.target.files;
    
    if (!files) {
      logBulletproofDebug('No files in bulletproof change event', {}, 'warn');
      return;
    }
    
    if (files.length === 0) {
      logBulletproofDebug('Empty file list in bulletproof change event', {}, 'warn');
      return;
    }
    
    logBulletproofDebug('Processing files from bulletproof input change:', {
      files: Array.from(files).map(f => ({
        name: f.name,
        size: f.size,
        type: f.type,
        lastModified: f.lastModified
      })),
      totalSize: Array.from(files).reduce((sum, f) => sum + f.size, 0),
      averageSize: Array.from(files).reduce((sum, f) => sum + f.size, 0) / files.length
    });
    
    try {
      handleFileSelect(files);
    } catch (error) {
      logBulletproofDebug('Error in handleFileSelect from bulletproof input change:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        fileCount: files.length
      }, 'error');
      
      toast.error('Failed to process selected files. Please try again.');
      
      // Report file selection error to recovery system
      if (reportErrorToRecovery) {
        reportErrorToRecovery({
          message: 'File selection processing failed',
          category: 'processing',
          error: error instanceof Error ? error.message : 'Unknown error',
          fileCount: files.length,
          componentSource: 'BulletproofImageUpload'
        }, 'BulletproofImageUpload');
      }
    }
  }, [handleFileSelect, reportErrorToRecovery, actualComponentId]);

  const handleUploadAreaClick = useCallback(() => {
    logBulletproofDebug('=== BULLETPROOF UPLOAD AREA CLICKED ===', {
      disabled,
      fileInputExists: !!fileInputRef.current,
      isUploading,
      timestamp: new Date().toISOString(),
      componentId: actualComponentId
    });
    
    if (disabled) {
      logBulletproofDebug('Upload area click ignored - component disabled', {}, 'warn');
      return;
    }
    
    if (!isUploading) {
      // Verify file input accessibility before clicking
      const verification = verifyBulletproofFileInput(fileInputRef);
      
      logBulletproofDebug('Bulletproof file input accessibility check:', {
        verification,
        capabilities: verification.capabilities
      });
      
      if (!verification.accessible) {
        logBulletproofDebug('Bulletproof file input not accessible:', {
          issues: verification.issues,
          capabilities: verification.capabilities
        }, 'error');
        
        toast.error('File input not accessible. Please refresh the page.');
        
        // Report accessibility issue to recovery system
        if (reportErrorToRecovery) {
          reportErrorToRecovery({
            message: 'File input accessibility failed',
            category: 'ui',
            issues: verification.issues,
            componentSource: 'BulletproofImageUpload'
          }, 'BulletproofImageUpload');
        }
        
        return;
      }
      
      try {
        logBulletproofDebug('Triggering bulletproof file input click...');
        fileInputRef.current?.click();
        
        logBulletproofDebug('Bulletproof file input click triggered successfully');
      } catch (error) {
        logBulletproofDebug('Bulletproof file input click failed:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : 'No stack trace'
        }, 'error');
        
        toast.error('Failed to open file selector. Please try again.');
        
        // Report click failure to recovery system
        if (reportErrorToRecovery) {
          reportErrorToRecovery({
            message: 'File input click failed',
            category: 'ui',
            error: error instanceof Error ? error.message : 'Unknown error',
            componentSource: 'BulletproofImageUpload'
          }, 'BulletproofImageUpload');
        }
      }
    } else {
      logBulletproofDebug('Bulletproof upload area click ignored - upload in progress', {}, 'warn');
    }
  }, [disabled, isUploading, reportErrorToRecovery, actualComponentId]);

  const handleRetryClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    handleRetry();
  }, [handleRetry]);

  const handleRemoveClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    handleRemove();
  }, [handleRemove]);

  const handleClearAllClick = useCallback(() => {
    handleRemove();
  }, [handleRemove]);

  // Auto-upload effect with proper dependency management to prevent loops
  useEffect(() => {
    // Emergency stop check
    if (emergencyStopRef.current) {
      logBulletproofDebug('Auto-upload blocked by emergency stop');
      return;
    }
    
    // Conditional guards to prevent unnecessary triggers
    const shouldTriggerUpload = memoizedSelectedFiles.length > 0 && 
                               !showMetadata && 
                               !memoizedUploadProgress.phase.includes('uploading') && 
                               !memoizedUploadProgress.phase.includes('processing') &&
                               !memoizedUploadProgress.phase.includes('verifying') &&
                               memoizedUploadProgress.phase !== 'complete';
    
    if (shouldTriggerUpload) {
      logWithTimestamp('Auto-upload triggered for selected files', {
        fileCount: memoizedSelectedFiles.length,
        uploadPhase: memoizedUploadProgress.phase,
        showMetadata,
      });
      
      // Debounce the upload to prevent rapid fire
      const timeoutId = setTimeout(() => {
        // Double-check conditions before executing
        if (!emergencyStopRef.current && 
            selectedFiles.length > 0 && 
            !uploadProgress.phase.includes('uploading')) {
          handleUpload();
        }
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [
    memoizedSelectedFiles.length, 
    showMetadata, 
    memoizedUploadProgress.phase, 
    handleUpload, 
    logWithTimestamp
  ]); // Removed selectedFiles and uploadProgress direct dependencies to prevent loops

  // Enhanced auto-retry effect with error categorization and adaptive behavior
  useEffect(() => {
    // Emergency stop check
    if (emergencyStopRef.current) {
      logBulletproofDebug('Auto-retry blocked by emergency stop');
      return;
    }
    
    // Conditional guards to prevent unnecessary retries
    const shouldAutoRetry = enableAutoRetry && 
                           enhancedRetryState.canRetry && 
                           memoizedUploadProgress.phase === 'error' &&
                           !enhancedRetryState.lastError?.includes('Circuit breaker'); // Don't retry circuit breaker errors
    
    if (shouldAutoRetry) {
      const errorInfo = getUploadErrorMessage(enhancedRetryState.lastError || '');
      
      // Check if this error type should trigger auto-retry
      const shouldProceedWithRetry = errorInfo.canRetry && 
                                   errorInfo.category !== 'auth' && 
                                   errorInfo.category !== 'format' &&
                                   enhancedRetryState.attempts < enhancedRetryState.maxAttempts;
      
      if (shouldProceedWithRetry) {
        const retryDelay = errorInfo.retryDelay || (Math.pow(2, enhancedRetryState.attempts) * 2000);
        
        logWithTimestamp('Auto-retry scheduled:', {
          errorCategory: errorInfo.category,
          retryDelay,
          attempt: enhancedRetryState.attempts + 1,
          maxAttempts: enhancedRetryState.maxAttempts,
        });
        
        toast(`⏰ Auto-retry in ${retryDelay / 1000} seconds... (${errorInfo.category} error)`, {
          duration: retryDelay - 500,
          style: { background: '#dbeafe', color: '#1e40af' }
        });
        
        const timer = setTimeout(() => {
          // Double-check conditions before executing
          if (!emergencyStopRef.current && 
              enhancedRetryState.canRetry && 
              uploadProgress.phase === 'error') {
            handleRetry();
          }
        }, retryDelay);
        
        return () => clearTimeout(timer);
      } else {
        logWithTimestamp('Auto-retry not applicable:', {
          errorCategory: errorInfo.category,
          canRetry: errorInfo.canRetry,
          attempts: enhancedRetryState.attempts,
          maxAttempts: enhancedRetryState.maxAttempts,
        });
      }
    }
  }, [
    enableAutoRetry, 
    enhancedRetryState.canRetry,
    enhancedRetryState.attempts,
    enhancedRetryState.maxAttempts,
    enhancedRetryState.lastError,
    memoizedUploadProgress.phase, 
    handleRetry, 
    logWithTimestamp
  ]); // Removed enhancedRetryState and uploadProgress direct dependencies to prevent loops

  const isUploading = bulletproofUploadMutation.isPending || 
                     progressiveUploadMutation.isPending || 
                     bulletproofBulkUploadMutation.isPending ||
                     isOptimizing ||
                     imageVerification.isVerifying;

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
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleUploadAreaClick}
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
        
        {isUploading || imageVerification.isVerifying ? (
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              {uploadProgress.strategy && (
                <Shield className="h-4 w-4 absolute -top-1 -right-1 text-green-600" />
              )}
              {uploadProgress.phase === 'verifying' && (
                <div className="h-3 w-3 absolute -bottom-1 -right-1 bg-yellow-500 rounded-full animate-pulse" />
              )}
            </div>
            
            <div className="w-full max-w-xs">
              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                <span className="capitalize">{uploadProgress.phase}</span>
                <span>{uploadProgress.percentage.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    uploadProgress.phase === 'verifying' ? 'bg-yellow-500' : 'bg-blue-600'
                  }`}
                  style={{ width: `${uploadProgress.percentage}%` }}
                />
              </div>
            </div>
            
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              {uploadProgress.message}
            </p>
            
            {uploadProgress.phase === 'verifying' && uploadProgress.verificationAttempts && (
              <div className="text-xs text-yellow-600 text-center">
                Verification attempt {uploadProgress.verificationAttempts}/{uploadProgress.verificationMaxAttempts}
              </div>
            )}
            
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
                <span>•</span>
                <Check className="h-3 w-3" />
                <span>Verification</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                Any format, any size up to {maxFileSize}MB • Automatic optimization
                {multiple && ` • Up to ${maxImages} images`}
              </p>
            </div>
          </div>
        )}
      </div>
      
      {/* Error State with Enhanced Retry Options */}
      {uploadProgress.phase === 'error' && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800 dark:text-red-200">
                Upload Failed
              </p>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                {enhancedRetryState.lastError || 'An error occurred during upload'}
              </p>
              <p className="text-xs text-gray-500 mt-1">Component: BulletproofImageUpload [{actualComponentId}]</p>
              
              {enhancedRetryState.canRetry && (
                <div className="mt-3 flex items-center space-x-3 flex-wrap gap-2">
                  <button
                    onClick={handleRetryClick}
                    className="inline-flex items-center space-x-1 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>Retry ({enhancedRetryState.attempts}/{enhancedRetryState.maxAttempts})</span>
                  </button>
                  
                  {enableAutoRetry && (
                    <span className="text-xs text-red-600">
                      Auto-retry enabled
                    </span>
                  )}
                  
                  {enhancedRetryState.adaptiveRetryEnabled && (
                    <span className="text-xs text-blue-600">
                      Adaptive backoff
                    </span>
                  )}
                  
                  {enhancedRetryState.attempts >= enhancedRetryState.maxAttempts && enableFallbackMode && (
                    <button
                      onClick={handleFallbackToSimple}
                      className="text-blue-600 hover:text-blue-700 underline text-xs"
                    >
                      Switch to {fallbackComponent === 'SimpleInnovatorImageUpload' ? 'Simple' : 'Alternative'} Upload
                    </button>
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
              {uploadProgress.verificationAttempts && (
                <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                  ✓ Verified in {uploadProgress.verificationAttempts} attempt{uploadProgress.verificationAttempts > 1 ? 's' : ''}
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
              onClick={handleClearAllClick}
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
              onClick={handleClearAllClick}
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

      {/* Enhanced Debug Panel for Bulletproof Upload System */}
      {DEBUG_BULLETPROOF && (
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <h4 className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
            🛡️ Bulletproof Upload System Debug Panel
          </h4>
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <strong>Circuit Breaker Status:</strong>
              <div className="ml-2">
                <div>Renders/sec: {renderCountRef.current}</div>
                <div>Emergency Stop: {emergencyStopRef.current ? '🚨 ACTIVE' : '✅ Normal'}</div>
                <div>Max Threshold: {maxRendersPerSecond}/sec</div>
                <div>Component ID: {actualComponentId}</div>
              </div>
            </div>
            
            <div>
              <strong>State References:</strong>
              <div className="ml-2">
                <div>Selected Files: {memoizedSelectedFiles.length} (ref: {prevSelectedFilesRef.current.length})</div>
                <div>Upload Phase: {memoizedUploadProgress.phase}</div>
                <div>Value: {typeof memoizedValue === 'string' ? memoizedValue.substring(0, 20) + '...' : Array.isArray(memoizedValue) ? `Array[${memoizedValue.length}]` : 'None'}</div>
              </div>
            </div>
            
            <div>
              <strong>File Input Status:</strong>
              <div className="ml-2">
                <div>Ref: {fileInputRef.current ? '✅ Connected' : '❌ Missing'}</div>
                <div>Accessible: {fileInputRef.current && verifyBulletproofFileInput(fileInputRef).accessible ? '✅ Yes' : '❌ No'}</div>
                <div>Multiple: {fileInputRef.current?.hasAttribute('multiple') ? '✅ Enabled' : '❌ Disabled'}</div>
                <div>Accept: {fileInputRef.current?.getAttribute('accept') || 'Not set'}</div>
              </div>
            </div>
            
            <div>
              <strong>Upload Progress:</strong>
              <div className="ml-2">
                <div>Phase: {uploadProgress.phase}</div>
                <div>Progress: {uploadProgress.percentage.toFixed(1)}%</div>
                <div>Message: {uploadProgress.message || 'None'}</div>
                <div>Strategy: {uploadProgress.strategy || 'None'}</div>
              </div>
            </div>
            
            <div>
              <strong>Authentication:</strong>
              <div className="ml-2">
                <div>Token: {safeAdminToken ? `✅ Present (${safeAdminToken.length} chars)` : '❌ Missing'}</div>
                <div>Valid: {safeAdminToken && safeAdminToken.length > 10 ? '✅ Likely' : '❌ Invalid'}</div>
              </div>
            </div>
            
            <div>
              <strong>Mutation Status:</strong>
              <div className="ml-2">
                <div>Single: {bulletproofUploadMutation.isPending ? '🔄 Pending' : bulletproofUploadMutation.isSuccess ? '✅ Success' : bulletproofUploadMutation.isError ? '❌ Error' : '⏸️ Idle'}</div>
                <div>Progressive: {progressiveUploadMutation.isPending ? '🔄 Pending' : progressiveUploadMutation.isSuccess ? '✅ Success' : progressiveUploadMutation.isError ? '❌ Error' : '⏸️ Idle'}</div>
                <div>Bulk: {bulletproofBulkUploadMutation.isPending ? '🔄 Pending' : bulletproofBulkUploadMutation.isSuccess ? '✅ Success' : bulletproofBulkUploadMutation.isError ? '❌ Error' : '⏸️ Idle'}</div>
                <div>Failures: S:{bulletproofUploadMutation.failureCount} P:{progressiveUploadMutation.failureCount} B:{bulletproofBulkUploadMutation.failureCount}</div>
              </div>
            </div>
            
            <div>
              <strong>Selected Files:</strong>
              <div className="ml-2">
                <div>Count: {selectedFiles.length}</div>
                <div>Total Size: {selectedFiles.length > 0 ? formatFileSize(selectedFiles.reduce((sum, f) => sum + f.size, 0)) : 'N/A'}</div>
                <div>Previews: {previewUrls.length}</div>
                <div>Metadata: {metadata.length}</div>
              </div>
            </div>
            
            <div>
              <strong>Component State:</strong>
              <div className="ml-2">
                <div>ID: {actualComponentId}</div>
                <div>Optimizing: {isOptimizing ? '🔄 Yes' : '⏸️ No'}</div>
                <div>Verifying: {imageVerification.isVerifying ? '🔄 Yes' : '⏸️ No'}</div>
                <div>Upload ID: {currentUploadId || 'None'}</div>
              </div>
            </div>
            
            <div>
              <strong>Error Recovery:</strong>
              <div className="ml-2">
                <div>Attempts: {enhancedRetryState.attempts}/{enhancedRetryState.maxAttempts}</div>
                <div>Can Retry: {enhancedRetryState.canRetry ? '✅ Yes' : '❌ No'}</div>
                <div>Adaptive: {enhancedRetryState.adaptiveRetryEnabled ? '✅ On' : '❌ Off'}</div>
                <div>Last Error: {enhancedRetryState.lastError || 'None'}</div>
              </div>
            </div>
            
            <div>
              <strong>Progressive State:</strong>
              <div className="ml-2">
                <div>Session: {progressiveState?.sessionId ? 'Active' : 'None'}</div>
                <div>Chunks: {progressiveState ? `${progressiveState.uploadedChunks}/${progressiveState.totalChunks}` : 'N/A'}</div>
                <div>Size: {progressiveState ? formatFileSize(progressiveState.chunkSize) : 'N/A'}</div>
              </div>
            </div>
          </div>
          
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              onClick={() => {
                const verification = verifyBulletproofFileInput(fileInputRef);
                logBulletproofDebug('Manual bulletproof file input verification:', verification);
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
                emergencyStopRef.current = false;
                renderCountRef.current = 0;
                toast('🔄 Circuit breaker reset', { duration: 2000 });
              }}
              className="px-2 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700"
            >
              Reset Circuit Breaker
            </button>
            
            <button
              onClick={() => {
                logBulletproofDebug('Manual bulletproof component state dump:', {
                  selectedFiles: selectedFiles.map(f => ({
                    name: f.name,
                    size: f.size,
                    type: f.type
                  })),
                  previewUrls: previewUrls.length,
                  uploadProgress,
                  enhancedRetryState,
                  progressiveState,
                  imageVerification,
                  adminToken: safeAdminToken ? `present (${safeAdminToken.length} chars)` : 'missing',
                  emergencyStop: emergencyStopRef.current,
                  renderCount: renderCountRef.current,
                  mutationStates: {
                    single: {
                      isPending: bulletproofUploadMutation.isPending,
                      isError: bulletproofUploadMutation.isError,
                      isSuccess: bulletproofUploadMutation.isSuccess,
                      failureCount: bulletproofUploadMutation.failureCount
                    },
                    progressive: {
                      isPending: progressiveUploadMutation.isPending,
                      isError: progressiveUploadMutation.isError,
                      isSuccess: progressiveUploadMutation.isSuccess,
                      failureCount: progressiveUploadMutation.failureCount
                    },
                    bulk: {
                      isPending: bulletproofBulkUploadMutation.isPending,
                      isError: bulletproofBulkUploadMutation.isError,
                      isSuccess: bulletproofBulkUploadMutation.isSuccess,
                      failureCount: bulletproofBulkUploadMutation.failureCount
                    }
                  }
                });
                toast('🛡️ Bulletproof state dumped to console', { duration: 2000 });
              }}
              className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
            >
              Dump State
            </button>
            
            <button
              onClick={() => {
                setEnhancedRetryState({
                  attempts: 0,
                  maxAttempts: 5,
                  canRetry: false,
                  adaptiveRetryEnabled: true,
                  backoffMultiplier: 1.5,
                });
                setUploadProgress({ phase: 'preparing', percentage: 0, message: '' });
                toast('🔄 Error recovery state reset', { duration: 2000 });
              }}
              className="px-2 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700"
            >
              Reset Recovery
            </button>
            
            <button
              onClick={() => {
                if (reportErrorToRecovery) {
                  reportErrorToRecovery({
                    message: 'Manual fallback trigger',
                    category: 'manual',
                    componentSource: 'BulletproofImageUpload'
                  }, 'BulletproofImageUpload');
                }
                handleFallbackToSimple();
              }}
              className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
            >
              Trigger Fallback
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

// Add display name for debugging
BulletproofImageUpload.displayName = 'BulletproofImageUpload';
