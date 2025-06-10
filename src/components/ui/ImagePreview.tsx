import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { getImageUrl, getCacheBustedImageUrl, getAbsoluteImageUrl, normalizeImageUrl, formatDate, isValidImagePath, getImageUrlWithFallback } from '../../utils/common';
import {
  Image as ImageIcon,
  AlertCircle,
  Loader2,
  RefreshCw,
  Eye,
  EyeOff,
  ExternalLink,
  Copy,
} from 'lucide-react';

interface ImagePreviewProps {
  imagePath: string | null | undefined;
  alt?: string;
  className?: string;
  placeholderIcon?: React.ComponentType<{ className?: string }>;
  placeholderText?: string;
  showFileName?: boolean;
  updatedAt?: Date | string; // For cache busting
  enableEventListening?: boolean; // For listening to imageUpdated events
  debugMode?: boolean; // Enhanced debugging
  enableRetry?: boolean; // Enable retry button on error
  fallbackImagePath?: string; // Fallback image path
  onImageLoad?: () => void; // Callback when image loads successfully
  onImageError?: (error: string) => void; // Callback when image fails to load
  // New verification-specific props
  verificationMode?: boolean; // Enable verification-specific behavior
  onVerificationComplete?: (success: boolean, details?: any) => void; // Callback for verification results
  showVerificationStates?: boolean; // Show verification vs processing states
  maxVerificationAttempts?: number; // Max verification attempts
  // Integration with useImageUploadRecovery
  reportErrorToRecovery?: (error: any, component: string) => void;
  reportSuccessToRecovery?: (component: string, result?: any) => void;
  componentId?: string; // For identifying the source component in recovery
}

export const ImagePreview = memo(function ImagePreview({
  imagePath,
  alt = "Image preview",
  className = "h-32",
  placeholderIcon: PlaceholderIcon = ImageIcon,
  placeholderText = "Image preview will appear here",
  showFileName = false,
  updatedAt,
  enableEventListening = true,
  debugMode = false,
  enableRetry = true,
  fallbackImagePath,
  onImageLoad,
  onImageError,
  verificationMode = false,
  onVerificationComplete,
  showVerificationStates = false,
  maxVerificationAttempts = 5,
  reportErrorToRecovery,
  reportSuccessToRecovery,
  componentId = 'ImagePreview',
}: ImagePreviewProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [retryCount, setRetryCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0); // Force re-render key
  const [visualIndicator, setVisualIndicator] = useState<'updating' | 'processing' | 'verifying' | 'success' | 'error' | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string>('');
  // New verification-specific states
  const [verificationState, setVerificationState] = useState<{
    isVerifying: boolean;
    attempts: number;
    maxAttempts: number;
    startTime?: number;
  }>({
    isVerifying: false,
    attempts: 0,
    maxAttempts: maxVerificationAttempts,
  });
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Enhanced validation
  const hasValidImagePath = imagePath && isValidImagePath(imagePath);
  const hasFallback = fallbackImagePath && isValidImagePath(fallbackImagePath);
  
  // Check if imagePath is a base64 data URL
  const isBase64Image = imagePath && imagePath.startsWith('data:image/');
  
  // Enhanced debugging with timestamps - memoized to prevent re-creation
  const logWithTimestamp = useCallback((message: string, data?: any) => {
    if (debugMode) {
      console.log(`🔍 DEBUG: ${componentId} [${new Date().toISOString()}] - ${message}`, data || '');
    }
  }, [debugMode, componentId]);
  
  logWithTimestamp('Render evaluation:', {
    imagePath: imagePath,
    imagePathType: typeof imagePath,
    imagePathLength: imagePath?.length,
    hasValidImagePath: hasValidImagePath,
    isBase64Image: isBase64Image,
    hasFallback: hasFallback,
    isLoading: isLoading,
    hasError: hasError,
    retryCount: retryCount,
    updatedAt: updatedAt,
    refreshKey: refreshKey,
    visualIndicator: visualIndicator,
    currentImageUrl: currentImageUrl,
    verificationMode: verificationMode,
    verificationState: verificationState,
  });

  // Enhanced visual indicator with verification states
  const showVisualIndicator = useCallback((type: 'updating' | 'processing' | 'verifying' | 'success' | 'error') => {
    setVisualIndicator(type);
    
    const duration = type === 'success' ? 2000 : 
                    type === 'verifying' ? 0 : // Keep verifying indicator until complete
                    3000;
    
    if (duration > 0) {
      setTimeout(() => setVisualIndicator(null), duration);
    }
  }, []);

  // Enhanced retry mechanism
  const handleRetry = useCallback(() => {
    logWithTimestamp('Manual retry triggered', { retryCount, imagePath });
    setHasError(false);
    setErrorMessage('');
    setRetryCount(prev => prev + 1);
    setRefreshKey(prev => prev + 1);
    showVisualIndicator('updating');
  }, [retryCount, imagePath, logWithTimestamp, showVisualIndicator]);

  // Method to trigger verification from external components
  const triggerVerification = useCallback(() => {
    if ((!hasValidImagePath && !isBase64Image) || verificationState.isVerifying) {
      return false;
    }
    
    logWithTimestamp('Triggering image verification:', {
      imagePath,
      isBase64Image,
      maxAttempts: verificationState.maxAttempts,
    });
    
    setVerificationState({
      isVerifying: true,
      attempts: 0,
      maxAttempts: verificationState.maxAttempts,
      startTime: Date.now(),
    });
    
    setHasError(false);
    setErrorMessage('');
    setRetryCount(0);
    setRefreshKey(prev => prev + 1);
    showVisualIndicator('verifying');
    
    return true;
  }, [hasValidImagePath, isBase64Image, verificationState.isVerifying, verificationState.maxAttempts, imagePath, logWithTimestamp, showVisualIndicator]);

  // Expose verification trigger via ref or callback
  useEffect(() => {
    if (verificationMode && window) {
      // Store verification trigger globally for access by upload component
      (window as any).__imagePreviewVerificationTrigger = triggerVerification;
    }
    
    return () => {
      if (verificationMode && window) {
        delete (window as any).__imagePreviewVerificationTrigger;
      }
    };
  }, [verificationMode, triggerVerification]);

  // Memoized image event handlers to prevent re-creation on every render
  const handleImageLoadStart = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.target as HTMLImageElement;
    logWithTimestamp('Image loading started:', {
      imagePath: imagePath,
      imageUrl: target.src,
      refreshKey: refreshKey,
      retryCount: retryCount,
    });
    setIsLoading(true);
    setHasError(false);
    setErrorMessage('');
  }, [logWithTimestamp, imagePath, refreshKey, retryCount]);

  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.target as HTMLImageElement;
    logWithTimestamp('Image loaded successfully:', {
      imagePath: imagePath,
      imageUrl: target.src,
      refreshKey: refreshKey,
      retryCount: retryCount,
      naturalWidth: target.naturalWidth,
      naturalHeight: target.naturalHeight,
      verificationMode: verificationMode,
      isVerifying: verificationState.isVerifying,
    });
    
    setIsLoading(false);
    setHasError(false);
    setErrorMessage('');
    setRetryCount(0); // Reset retry count on success
    
    // Handle verification completion
    if (verificationMode && verificationState.isVerifying) {
      setVerificationState(prev => ({
        ...prev,
        isVerifying: false,
        attempts: prev.attempts + 1,
      }));
      
      showVisualIndicator('success');
      onVerificationComplete?.(true);
      
      logWithTimestamp('Image verification completed successfully:', {
        imagePath,
        attempts: verificationState.attempts + 1,
        verificationTime: verificationState.startTime ? Date.now() - verificationState.startTime : 0,
      });
    } else {
      showVisualIndicator('success');
    }
    
    if (reportSuccessToRecovery) {
      reportSuccessToRecovery(componentId, {
        filePath: imagePath,
        imageUrl: target.src,
        naturalWidth: target.naturalWidth,
        naturalHeight: target.naturalHeight,
      });
    }
    
    onImageLoad?.();
  }, [logWithTimestamp, imagePath, refreshKey, retryCount, showVisualIndicator, onImageLoad, verificationMode, verificationState, onVerificationComplete, reportSuccessToRecovery, componentId]);

  // Generate image URL with enhanced error handling and absolute URL support
  const generateImageUrl = useCallback((path: string | null | undefined, useCache: boolean = true): string => {
    // Early return for null/undefined values
    if (!path) {
      logWithTimestamp('Null or undefined path provided to generateImageUrl');
      return '';
    }
    try {
      let url = '';
      
      // If it's already a base64 data URL, return it as-is (no cache busting or processing needed)
      if (path.startsWith('data:')) {
        logWithTimestamp('Path is base64 data URL, returning as-is:', {
          pathLength: path.length,
          isJpeg: path.includes('image/jpeg'),
          isPng: path.includes('image/png'),
          isValid: path.includes('base64,'),
        });
        return path;
      }
      
      // For non-base64 paths, use cache busting if requested
      if (useCache && updatedAt) {
        url = getCacheBustedImageUrl(path, updatedAt);
      } else if (useCache) {
        url = getCacheBustedImageUrl(path, new Date());
      } else {
        url = getImageUrl(path);
      }
      
      // Normalize URL to ensure it's absolute for better cross-origin handling
      const normalizedUrl = normalizeImageUrl(url);
      
      logWithTimestamp('Generated image URL:', {
        originalPath: path,
        generatedUrl: url,
        normalizedUrl: normalizedUrl,
        useCache: useCache,
        updatedAt: updatedAt,
      });
      
      return normalizedUrl;
    } catch (error) {
      logWithTimestamp('Error generating image URL:', { path, error });
      
      // Fallback: if it's a base64 string, return it directly
      if (path.startsWith('data:')) {
        return path;
      }
      
      // Fallback: try to get a basic absolute URL
      try {
        const fallbackUrl = getAbsoluteImageUrl(path);
        logWithTimestamp('Using fallback absolute URL:', { path, fallbackUrl });
        return fallbackUrl;
      } catch (fallbackError) {
        logWithTimestamp('Fallback URL generation also failed:', { path, fallbackError });
        return '';
      }
    }
  }, [updatedAt, logWithTimestamp]);

  const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.target as HTMLImageElement;
    const errorMsg = `Failed to load image from ${target.src}`;
    
    // Enhanced error diagnostics
    const errorDiagnostics = {
      imagePath: imagePath,
      imageUrl: target.src,
      naturalWidth: target.naturalWidth,
      naturalHeight: target.naturalHeight,
      complete: target.complete,
      crossOrigin: target.crossOrigin,
      currentSrc: target.currentSrc,
      refreshKey: refreshKey,
      retryCount: retryCount,
      verificationMode: verificationMode,
      isVerifying: verificationState.isVerifying,
      timestamp: new Date().toISOString(),
    };
    
    logWithTimestamp('Image failed to load with detailed diagnostics:', errorDiagnostics);
    
    // Check if it's a CORS issue
    if (target.src.includes('http') && !target.src.startsWith(window.location.origin)) {
      logWithTimestamp('Potential CORS issue detected - image URL is cross-origin');
    }
    
    // Check if it's a network issue
    if (!navigator.onLine) {
      logWithTimestamp('Network offline detected');
    }
    
    setIsLoading(false);
    setHasError(true);
    setErrorMessage(errorMsg);
    showVisualIndicator('error');
    
    if (reportErrorToRecovery) {
      reportErrorToRecovery({
        message: errorMsg,
        diagnostics: errorDiagnostics,
      }, componentId);
    }
    
    onImageError?.(errorMsg);
    
    // Handle verification failure
    if (verificationMode && verificationState.isVerifying) {
      const newAttempts = verificationState.attempts + 1;
      
      if (newAttempts >= verificationState.maxAttempts) {
        setVerificationState(prev => ({
          ...prev,
          isVerifying: false,
          attempts: newAttempts,
        }));
        
        onVerificationComplete?.(false);
        
        logWithTimestamp('Image verification failed after all attempts:', {
          imagePath,
          totalAttempts: newAttempts,
          maxAttempts: verificationState.maxAttempts,
        });
      } else {
        // Continue verification with exponential backoff
        const retryDelay = Math.min(1000 * Math.pow(2, newAttempts - 1), 8000);
        
        setVerificationState(prev => ({
          ...prev,
          attempts: newAttempts,
        }));
        
        logWithTimestamp(`Verification retry scheduled in ${retryDelay}ms`, {
          attempt: newAttempts,
          maxAttempts: verificationState.maxAttempts,
        });
        
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          setRefreshKey(prev => prev + 1);
          setHasError(false);
          setErrorMessage('');
          showVisualIndicator('verifying');
          
          // Try to regenerate URL with different cache-busting
          const newUrl = generateImageUrl(imagePath, true);
          setCurrentImageUrl(newUrl);
        }, retryDelay);
      }
    } else {
      // Standard auto-retry logic for non-verification mode
      if (retryCount < 3 && (hasValidImagePath || isBase64Image)) {
        const retryDelay = Math.pow(2, retryCount) * 1000; // Exponential backoff
        logWithTimestamp(`Enhanced auto-retry scheduled in ${retryDelay}ms`, { 
          retryCount, 
          maxRetries: 3,
          errorDiagnostics 
        });
        
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          setRefreshKey(prev => prev + 1);
          setHasError(false);
          setErrorMessage('');
          showVisualIndicator('updating');
          
          // Try to regenerate URL with different cache-busting
          const newUrl = generateImageUrl(imagePath, true);
          setCurrentImageUrl(newUrl);
          
          logWithTimestamp('Auto-retry attempt with new URL:', {
            attempt: retryCount + 1,
            newUrl: newUrl,
            previousUrl: target.src,
          });
        }, retryDelay);
      } else {
        logWithTimestamp('Max retry attempts reached or invalid image path', {
          retryCount,
          hasValidImagePath,
          isBase64Image,
          maxRetries: 3,
        });
      }
    }
  }, [logWithTimestamp, imagePath, refreshKey, retryCount, showVisualIndicator, onImageError, hasValidImagePath, isBase64Image, generateImageUrl, verificationMode, verificationState, onVerificationComplete, reportErrorToRecovery, componentId]);

  // Update current image URL when dependencies change
  useEffect(() => {
    if (hasValidImagePath || isBase64Image) {
      // For base64 images, use them directly without processing
      if (isBase64Image) {
        setCurrentImageUrl(imagePath);
        logWithTimestamp('Set currentImageUrl to base64 data directly:', {
          imagePath: imagePath ? 'Present' : 'None',
          imagePathLength: imagePath?.length,
          refreshKey,
        });
      } else {
        const newUrl = generateImageUrl(imagePath, true);
        setCurrentImageUrl(newUrl);
        logWithTimestamp('Generated new image URL:', {
          imagePath,
          newUrl,
          refreshKey,
          isBase64Image,
        });
      }
    } else if (hasFallback) {
      const fallbackUrl = generateImageUrl(fallbackImagePath, true);
      setCurrentImageUrl(fallbackUrl);
      logWithTimestamp('Using fallback image URL:', {
        fallbackImagePath,
        fallbackUrl,
      });
    } else {
      setCurrentImageUrl('');
      logWithTimestamp('No valid image path available, clearing currentImageUrl');
    }
  }, [imagePath, fallbackImagePath, hasValidImagePath, isBase64Image, hasFallback, generateImageUrl, refreshKey, logWithTimestamp]);

  // Reset error state when image path changes - Fixed dependency array to prevent loops
  useEffect(() => {
    if (hasValidImagePath || isBase64Image) {
      logWithTimestamp('Image path changed, resetting error state');
      setHasError(false);
      setErrorMessage('');
      setRetryCount(0);
      showVisualIndicator('updating');
      
      // Force refresh key change to ensure re-render
      setRefreshKey(prev => prev + 1);
    }
  }, [imagePath, hasValidImagePath, isBase64Image, logWithTimestamp, showVisualIndicator]);

  // Enhanced useEffect for form state changes - Fixed dependency array to prevent loops
  useEffect(() => {
    logWithTimestamp('Form state change detected - forcing preview update:', {
      imagePath: imagePath,
      imagePathType: typeof imagePath,
      imagePathLength: imagePath?.length,
      isBase64: imagePath?.startsWith('data:'),
      updatedAt: updatedAt,
      refreshKey: refreshKey,
    });
    
    // Force preview re-render when form state changes
    if (hasValidImagePath || isBase64Image) {
      // For base64 images, update URL directly without refresh key increment
      if (isBase64Image) {
        setCurrentImageUrl(imagePath);
        showVisualIndicator('updating');
      } else {
        setRefreshKey(prev => prev + 1);
        showVisualIndicator('updating');
      }
    }
  }, [imagePath, updatedAt, hasValidImagePath, isBase64Image, logWithTimestamp, showVisualIndicator]);

  // Custom event listener for crosscutting image updates - Fixed dependency array
  useEffect(() => {
    if (!enableEventListening) return;

    const handleImageUpdated = (event: CustomEvent) => {
      const { 
        filePath: eventFilePath, 
        timestamp, 
        component: sourceComponent, 
        componentId: sourceComponentId,
        partnerId: eventPartnerId,
      } = event.detail || {};
      
      logWithTimestamp('Received imageUpdated event:', {
        eventFilePath,
        currentImagePath: imagePath,
        eventTimestamp: timestamp,
        sourceComponent,
        sourceComponentId,
        eventPartnerId,
        componentId,
        shouldUpdate: eventFilePath && (
          eventFilePath === imagePath || 
          sourceComponent === 'SimplePartnerImageUpload' ||
          sourceComponent === 'UnifiedImageUploadInterface'
        ),
      });
      
      // Enhanced matching logic for partner images
      const shouldUpdate = eventFilePath && (
        // Direct path match
        eventFilePath === imagePath ||
        // Partner-specific component match
        (sourceComponent === 'SimplePartnerImageUpload' && eventFilePath.trim() !== '') ||
        // General unified interface update
        (sourceComponent === 'UnifiedImageUploadInterface' && eventFilePath.trim() !== '') ||
        // Base64 data URL update (for inline storage)
        (eventFilePath.startsWith('data:image/') && sourceComponent === 'SimplePartnerImageUpload')
      );
      
      if (shouldUpdate) {
        logWithTimestamp('Event matches - forcing preview update with new image data');
        setHasError(false);
        setErrorMessage('');
        setRetryCount(0);
        
        // For base64 data URLs, update the current image URL directly
        if (eventFilePath.startsWith('data:image/')) {
          setCurrentImageUrl(eventFilePath);
          logWithTimestamp('Updated currentImageUrl with base64 data:', {
            dataLength: eventFilePath.length,
            isJpeg: eventFilePath.includes('image/jpeg'),
            isPng: eventFilePath.includes('image/png'),
          });
        } else {
          // For regular file paths, trigger refresh
          setRefreshKey(prev => prev + 1);
        }
        
        showVisualIndicator('success');
      }
    };

    window.addEventListener('imageUpdated', handleImageUpdated as EventListener);
    document.addEventListener('imageUpdated', handleImageUpdated as EventListener);
    
    return () => {
      window.removeEventListener('imageUpdated', handleImageUpdated as EventListener);
      document.removeEventListener('imageUpdated', handleImageUpdated as EventListener);
    };
  }, [imagePath, enableEventListening, logWithTimestamp, showVisualIndicator, componentId]);

  if (!hasValidImagePath && !hasFallback && !isBase64Image) {
    logWithTimestamp('Showing placeholder (no valid image path)');
    
    return (
      <div 
        ref={containerRef}
        className={`w-full ${className} bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-600`}
      >
        <div className="text-center text-gray-500 dark:text-gray-400">
          <PlaceholderIcon className="h-8 w-8 mx-auto mb-2" />
          <p className="text-sm">{placeholderText}</p>
          <p className="text-xs mt-1 opacity-75">Upload an image using the form above</p>
        </div>
      </div>
    );
  }

  if (hasError && !currentImageUrl) {
    logWithTimestamp('Showing error state');
    
    return (
      <div 
        ref={containerRef}
        className={`w-full ${className} bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-600`}
      >
        <div className="flex flex-col items-center space-y-2 text-amber-600">
          <AlertCircle className="h-8 w-8" />
          <p className="text-sm text-center">Preview not available</p>
          <p className="text-xs text-center opacity-75">
            {errorMessage || 'Image uploaded successfully - preview will be available after page refresh'}
          </p>
          {showFileName && imagePath && (
            <p className="text-xs text-center text-green-600 mt-1">✓ File: {imagePath}</p>
          )}
          {enableRetry && retryCount < 3 && (
            <button
              onClick={handleRetry}
              className="text-xs text-blue-600 hover:text-blue-700 flex items-center space-x-1 mt-2"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Retry ({retryCount}/3)</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  logWithTimestamp('Rendering image:', {
    imagePath: imagePath,
    currentImageUrl: currentImageUrl,
    isLoading: isLoading,
    hasError: hasError,
    updatedAt: updatedAt,
    refreshKey: refreshKey,
  });

  return (
    <div 
      ref={containerRef}
      className={`w-full ${className} bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden relative ${
        visualIndicator ? 'ring-2 ring-offset-2' : ''
      } ${
        visualIndicator === 'updating' ? 'ring-blue-500' :
        visualIndicator === 'processing' ? 'ring-purple-500' :
        visualIndicator === 'verifying' ? 'ring-yellow-500' :
        visualIndicator === 'success' ? 'ring-green-500' :
        visualIndicator === 'error' ? 'ring-red-500' : ''
      }`}
    >
      {/* Enhanced visual indicator overlay */}
      {visualIndicator && (
        <div className={`absolute top-2 right-2 z-10 px-2 py-1 rounded text-xs font-medium ${
          visualIndicator === 'updating' ? 'bg-blue-100 text-blue-800' :
          visualIndicator === 'processing' ? 'bg-purple-100 text-purple-800' :
          visualIndicator === 'verifying' ? 'bg-yellow-100 text-yellow-800' :
          visualIndicator === 'success' ? 'bg-green-100 text-green-800' :
          'bg-red-100 text-red-800'
        }`}>
          {visualIndicator === 'updating' ? '🔄 Updating' :
           visualIndicator === 'processing' ? '⚙️ Processing' :
           visualIndicator === 'verifying' ? '🔍 Verifying' :
           visualIndicator === 'success' ? '✅ Ready' : '❌ Error'}
        </div>
      )}

      {/* Verification progress indicator */}
      {verificationState.isVerifying && showVerificationStates && (
        <div className="absolute bottom-2 left-2 z-10 px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
          Verifying {verificationState.attempts + 1}/{verificationState.maxAttempts}
        </div>
      )}

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 z-10">
          <div className="flex flex-col items-center space-y-2">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {verificationState.isVerifying ? 'Verifying image...' : 'Loading preview...'}
            </p>
          </div>
        </div>
      )}
      
      {currentImageUrl && (
        <img
          ref={imgRef}
          src={currentImageUrl}
          alt={alt}
          key={`${refreshKey}-${retryCount}`} // Force re-mount when refreshKey or retryCount changes
          className={`w-full h-full object-cover transition-opacity ${isLoading ? 'opacity-0' : 'opacity-100'}`}
          onLoadStart={handleImageLoadStart}
          onLoad={handleImageLoad}
          onError={handleImageError}
          style={{ display: isLoading ? 'none' : 'block' }}
          crossOrigin="anonymous" // Enable CORS for better cross-origin handling
          loading="lazy" // Enable lazy loading for performance
          decoding="async" // Enable async decoding for better performance
        />
      )}
      
      {/* Error overlay with retry option */}
      {hasError && enableRetry && retryCount < 3 && !verificationState.isVerifying && (
        <div className="absolute bottom-2 right-2 z-10">
          <button
            onClick={handleRetry}
            className="bg-red-600 text-white text-xs px-2 py-1 rounded hover:bg-red-700 flex items-center space-x-1"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Retry</span>
          </button>
        </div>
      )}
      
      {/* Enhanced Debug info panel with URL testing (only in debug mode) */}
      {debugMode && (
        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-90 text-white text-xs p-3 opacity-0 hover:opacity-100 transition-opacity z-20">
          <div className="space-y-1">
            <div>Component ID: {componentId}</div>
            <div>Path: {imagePath || 'None'}</div>
            <div>URL: {currentImageUrl || 'None'}</div>
            <div>Absolute URL: {currentImageUrl ? getAbsoluteImageUrl(imagePath || '') : 'None'}</div>
            <div>Key: {refreshKey} | Retry: {retryCount}</div>
            <div>Base64: {isBase64Image ? 'Yes' : 'No'}</div>
            {verificationMode && (
              <div>Verification: {verificationState.isVerifying ? 'Active' : 'Inactive'} | Attempts: {verificationState.attempts}/{verificationState.maxAttempts}</div>
            )}
            {updatedAt && <div>Updated: {formatDate(updatedAt)}</div>}
            {hasError && <div className="text-red-300">Error: {errorMessage}</div>}
            <div className="flex items-center space-x-2 mt-2">
              {currentImageUrl && (
                <>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(currentImageUrl);
                      logWithTimestamp('URL copied to clipboard:', { url: currentImageUrl });
                    }}
                    className="flex items-center space-x-1 px-2 py-1 bg-blue-600 rounded text-xs hover:bg-blue-700"
                  >
                    <Copy className="h-3 w-3" />
                    <span>Copy URL</span>
                  </button>
                  <button
                    onClick={() => {
                      window.open(currentImageUrl, '_blank');
                      logWithTimestamp('Opening URL in new tab:', { url: currentImageUrl });
                    }}
                    className="flex items-center space-x-1 px-2 py-1 bg-green-600 rounded text-xs hover:bg-green-700"
                  >
                    <ExternalLink className="h-3 w-3" />
                    <span>Test URL</span>
                  </button>
                </>
              )}
              {verificationMode && (
                <button
                  onClick={triggerVerification}
                  disabled={verificationState.isVerifying || (!hasValidImagePath && !isBase64Image)}
                  className="flex items-center space-x-1 px-2 py-1 bg-yellow-600 rounded text-xs hover:bg-yellow-700 disabled:opacity-50"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Verify</span>
                </button>
              )}
            </div>
            <div>Event Listening: {enableEventListening ? 'Enabled' : 'Disabled'}</div>
          </div>
        </div>
      )}
    </div>
  );
});

// Add display name for debugging
ImagePreview.displayName = 'ImagePreview';
