import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { getImageUrl, getCacheBustedImageUrl, getAbsoluteImageUrl, normalizeImageUrl, formatDate, isValidImagePath, getImageUrlWithFallback } from '~/utils';
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
}: ImagePreviewProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [retryCount, setRetryCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0); // Force re-render key
  const [visualIndicator, setVisualIndicator] = useState<'updating' | 'success' | 'error' | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string>('');
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Enhanced validation
  const hasValidImagePath = imagePath && isValidImagePath(imagePath);
  const hasFallback = fallbackImagePath && isValidImagePath(fallbackImagePath);
  
  // Enhanced debugging with timestamps - memoized to prevent re-creation
  const logWithTimestamp = useCallback((message: string, data?: any) => {
    if (debugMode) {
      console.log(`🔍 DEBUG: ImagePreview [${new Date().toISOString()}] - ${message}`, data || '');
    }
  }, [debugMode]);
  
  logWithTimestamp('Render evaluation:', {
    imagePath: imagePath,
    imagePathType: typeof imagePath,
    imagePathLength: imagePath?.length,
    hasValidImagePath: hasValidImagePath,
    hasFallback: hasFallback,
    isLoading: isLoading,
    hasError: hasError,
    retryCount: retryCount,
    updatedAt: updatedAt,
    refreshKey: refreshKey,
    visualIndicator: visualIndicator,
    currentImageUrl: currentImageUrl,
  });

  // Visual indicator effect - memoized to prevent re-creation
  const showVisualIndicator = useCallback((type: 'updating' | 'success' | 'error') => {
    setVisualIndicator(type);
    setTimeout(() => setVisualIndicator(null), type === 'success' ? 2000 : 3000);
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
    });
    setIsLoading(false);
    setHasError(false);
    setErrorMessage('');
    setRetryCount(0); // Reset retry count on success
    showVisualIndicator('success');
    onImageLoad?.();
  }, [logWithTimestamp, imagePath, refreshKey, retryCount, showVisualIndicator, onImageLoad]);

  // Generate image URL with enhanced error handling and absolute URL support
  const generateImageUrl = useCallback((path: string, useCache: boolean = true): string => {
    try {
      let url = '';
      
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
    onImageError?.(errorMsg);
    
    // Enhanced auto-retry logic with exponential backoff
    if (retryCount < 3 && hasValidImagePath) {
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
        maxRetries: 3,
      });
    }
  }, [logWithTimestamp, imagePath, refreshKey, retryCount, showVisualIndicator, onImageError, hasValidImagePath, generateImageUrl]);

  // Update current image URL when dependencies change
  useEffect(() => {
    if (hasValidImagePath) {
      const newUrl = generateImageUrl(imagePath, true);
      setCurrentImageUrl(newUrl);
      logWithTimestamp('Image URL updated:', {
        imagePath,
        newUrl,
        refreshKey,
      });
    } else if (hasFallback) {
      const fallbackUrl = generateImageUrl(fallbackImagePath, true);
      setCurrentImageUrl(fallbackUrl);
      logWithTimestamp('Using fallback image URL:', {
        fallbackImagePath,
        fallbackUrl,
      });
    } else {
      setCurrentImageUrl('');
      logWithTimestamp('No valid image path available');
    }
  }, [imagePath, fallbackImagePath, hasValidImagePath, hasFallback, generateImageUrl, refreshKey, logWithTimestamp]);

  // Reset error state when image path changes - Fixed dependency array to prevent loops
  useEffect(() => {
    if (hasValidImagePath) {
      logWithTimestamp('Image path changed, resetting error state');
      setHasError(false);
      setErrorMessage('');
      setRetryCount(0);
      showVisualIndicator('updating');
      
      // Force refresh key change to ensure re-render
      setRefreshKey(prev => prev + 1);
    }
  }, [imagePath, hasValidImagePath, logWithTimestamp, showVisualIndicator]);

  // Enhanced useEffect for form state changes - Fixed dependency array to prevent loops
  useEffect(() => {
    logWithTimestamp('Form state change detected - forcing preview update:', {
      imagePath: imagePath,
      updatedAt: updatedAt,
      refreshKey: refreshKey,
    });
    
    // Force preview re-render when form state changes
    if (hasValidImagePath) {
      setRefreshKey(prev => prev + 1);
      showVisualIndicator('updating');
    }
  }, [imagePath, updatedAt, hasValidImagePath, logWithTimestamp, showVisualIndicator]);

  // Custom event listener for crosscutting image updates - Fixed dependency array
  useEffect(() => {
    if (!enableEventListening) return;

    const handleImageUpdated = (event: CustomEvent) => {
      const { filePath: eventFilePath, timestamp } = event.detail || {};
      
      logWithTimestamp('Received imageUpdated event:', {
        eventFilePath: eventFilePath,
        currentImagePath: imagePath,
        eventTimestamp: timestamp,
        shouldUpdate: eventFilePath === imagePath,
      });
      
      // Check if this event is for our current image
      if (eventFilePath && eventFilePath === imagePath) {
        logWithTimestamp('Event matches current image - forcing update');
        setHasError(false);
        setErrorMessage('');
        setRetryCount(0);
        setRefreshKey(prev => prev + 1);
        showVisualIndicator('success');
        
        // Direct DOM update as fallback
        if (imgRef.current) {
          const newUrl = getCacheBustedImageUrl(eventFilePath, new Date());
          logWithTimestamp('Direct DOM update - setting new src:', {
            oldSrc: imgRef.current.src,
            newSrc: newUrl,
          });
          imgRef.current.src = newUrl;
          setCurrentImageUrl(newUrl);
        }
      }
    };

    window.addEventListener('imageUpdated', handleImageUpdated as EventListener);
    
    return () => {
      window.removeEventListener('imageUpdated', handleImageUpdated as EventListener);
    };
  }, [imagePath, enableEventListening, logWithTimestamp, showVisualIndicator]);

  if (!hasValidImagePath && !hasFallback) {
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
        visualIndicator === 'success' ? 'ring-green-500' :
        visualIndicator === 'error' ? 'ring-red-500' : ''
      }`}
    >
      {/* Visual indicator overlay */}
      {visualIndicator && (
        <div className={`absolute top-2 right-2 z-10 px-2 py-1 rounded text-xs font-medium ${
          visualIndicator === 'updating' ? 'bg-blue-100 text-blue-800' :
          visualIndicator === 'success' ? 'bg-green-100 text-green-800' :
          'bg-red-100 text-red-800'
        }`}>
          {visualIndicator === 'updating' ? '🔄 Updating' :
           visualIndicator === 'success' ? '✅ Updated' : '❌ Error'}
        </div>
      )}

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 z-10">
          <div className="flex flex-col items-center space-y-2">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading preview...</p>
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
      {hasError && enableRetry && retryCount < 3 && (
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
            <div>Path: {imagePath || 'None'}</div>
            <div>URL: {currentImageUrl || 'None'}</div>
            <div>Absolute URL: {currentImageUrl ? getAbsoluteImageUrl(imagePath || '') : 'None'}</div>
            <div>Key: {refreshKey} | Retry: {retryCount}</div>
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

// Add display name for debugging
ImagePreview.displayName = 'ImagePreview';
