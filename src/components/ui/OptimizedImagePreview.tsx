import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { getImageUrl, getCacheBustedImageUrl, getAbsoluteImageUrl, normalizeImageUrl, formatDate, isValidImagePath } from '~/utils';
import {
  Image as ImageIcon,
  AlertCircle,
  Loader2,
  RefreshCw,
  Copy,
  ExternalLink,
} from 'lucide-react';

interface OptimizedImagePreviewProps {
  imagePath: string | null | undefined;
  alt?: string;
  className?: string;
  placeholderIcon?: React.ComponentType<{ className?: string }>;
  placeholderText?: string;
  showFileName?: boolean;
  updatedAt?: Date | string;
  enableRetry?: boolean;
  fallbackImagePath?: string;
  onImageLoad?: () => void;
  onImageError?: (error: string) => void;
  maxRetries?: number;
}

export const OptimizedImagePreview = memo(function OptimizedImagePreview({
  imagePath,
  alt = "Image preview",
  className = "h-32",
  placeholderIcon: PlaceholderIcon = ImageIcon,
  placeholderText = "Image preview will appear here",
  showFileName = false,
  updatedAt,
  enableRetry = true,
  fallbackImagePath,
  onImageLoad,
  onImageError,
  maxRetries = 3,
}: OptimizedImagePreviewProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [retryCount, setRetryCount] = useState(0);
  const [imageUrl, setImageUrl] = useState<string>('');
  
  const imgRef = useRef<HTMLImageElement>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Validate image path
  const hasValidImagePath = imagePath && isValidImagePath(imagePath);
  const hasFallback = fallbackImagePath && isValidImagePath(fallbackImagePath);
  
  // Generate image URL with enhanced error handling and absolute URL support
  const generateImageUrl = useCallback((path: string): string => {
    try {
      let url = '';
      
      if (updatedAt) {
        url = getCacheBustedImageUrl(path, updatedAt);
      } else {
        url = getCacheBustedImageUrl(path, new Date());
      }
      
      // Normalize URL to ensure it's absolute for better cross-origin handling
      const normalizedUrl = normalizeImageUrl(url);
      
      console.log('🔍 OptimizedImagePreview - Generated URL:', {
        originalPath: path,
        generatedUrl: url,
        normalizedUrl: normalizedUrl,
        updatedAt: updatedAt,
      });
      
      return normalizedUrl;
    } catch (error) {
      console.warn('OptimizedImagePreview - Error generating image URL:', { path, error });
      
      // Fallback: try to get a basic absolute URL
      try {
        const fallbackUrl = getAbsoluteImageUrl(path);
        console.log('OptimizedImagePreview - Using fallback absolute URL:', { path, fallbackUrl });
        return fallbackUrl;
      } catch (fallbackError) {
        console.warn('OptimizedImagePreview - Fallback URL generation also failed:', { path, fallbackError });
        return '';
      }
    }
  }, [updatedAt]);
  
  // Update image URL when dependencies change
  useEffect(() => {
    let newUrl = '';
    
    if (hasValidImagePath) {
      newUrl = generateImageUrl(imagePath);
    } else if (hasFallback) {
      newUrl = generateImageUrl(fallbackImagePath);
    }
    
    if (newUrl !== imageUrl) {
      setImageUrl(newUrl);
      setHasError(false);
      setErrorMessage('');
      setRetryCount(0);
    }
  }, [imagePath, fallbackImagePath, hasValidImagePath, hasFallback, generateImageUrl, imageUrl]);
  
  // Handle image load start
  const handleImageLoadStart = useCallback(() => {
    setIsLoading(true);
    setHasError(false);
    setErrorMessage('');
  }, []);
  
  // Handle successful image load
  const handleImageLoad = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
    setErrorMessage('');
    setRetryCount(0);
    onImageLoad?.();
  }, [onImageLoad]);
  
  // Handle image load error with enhanced diagnostics
  const handleImageError = useCallback(() => {
    const errorMsg = `Failed to load image: ${imagePath}`;
    
    // Enhanced error diagnostics
    const errorDiagnostics = {
      imagePath: imagePath,
      imageUrl: imageUrl,
      retryCount: retryCount,
      timestamp: new Date().toISOString(),
      hasValidImagePath: hasValidImagePath,
      hasFallback: hasFallback,
    };
    
    console.warn('OptimizedImagePreview - Image failed to load:', errorDiagnostics);
    
    setIsLoading(false);
    setHasError(true);
    setErrorMessage(errorMsg);
    onImageError?.(errorMsg);
    
    // Auto-retry logic with exponential backoff
    if (enableRetry && retryCount < maxRetries && hasValidImagePath) {
      const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 10000); // Max 10 seconds
      
      console.log(`OptimizedImagePreview - Auto-retry scheduled in ${retryDelay}ms`, { 
        retryCount, 
        maxRetries,
        errorDiagnostics 
      });
      
      retryTimeoutRef.current = setTimeout(() => {
        setRetryCount(prev => prev + 1);
        setHasError(false);
        setErrorMessage('');
        
        // Force image reload by updating the URL with a new timestamp
        const newUrl = generateImageUrl(imagePath);
        setImageUrl(newUrl);
        
        console.log('OptimizedImagePreview - Auto-retry attempt with new URL:', {
          attempt: retryCount + 1,
          newUrl: newUrl,
          previousUrl: imageUrl,
        });
      }, retryDelay);
    } else {
      console.log('OptimizedImagePreview - Max retry attempts reached or invalid image path', {
        retryCount,
        maxRetries,
        hasValidImagePath,
      });
    }
  }, [imagePath, imageUrl, enableRetry, retryCount, maxRetries, hasValidImagePath, hasFallback, onImageError, generateImageUrl]);
  
  // Manual retry function
  const handleManualRetry = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    
    setRetryCount(prev => prev + 1);
    setHasError(false);
    setErrorMessage('');
    
    // Force image reload
    const newUrl = getCacheBustedImageUrl(imagePath || fallbackImagePath || '', new Date());
    setImageUrl(newUrl);
  }, [imagePath, fallbackImagePath]);
  
  // Listen for image update events
  useEffect(() => {
    const handleImageUpdated = (event: CustomEvent) => {
      const { filePath: eventFilePath } = event.detail || {};
      
      if (eventFilePath && eventFilePath === imagePath) {
        // Force reload with new timestamp
        const newUrl = getCacheBustedImageUrl(eventFilePath, new Date());
        setImageUrl(newUrl);
        setHasError(false);
        setErrorMessage('');
        setRetryCount(0);
      }
    };

    window.addEventListener('imageUpdated', handleImageUpdated as EventListener);
    
    return () => {
      window.removeEventListener('imageUpdated', handleImageUpdated as EventListener);
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [imagePath]);
  
  // Show placeholder if no valid image path
  if (!hasValidImagePath && !hasFallback) {
    return (
      <div className={`w-full ${className} bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-600`}>
        <div className="text-center text-gray-500 dark:text-gray-400">
          <PlaceholderIcon className="h-8 w-8 mx-auto mb-2" />
          <p className="text-sm">{placeholderText}</p>
          <p className="text-xs mt-1 opacity-75">Upload an image using the form above</p>
        </div>
      </div>
    );
  }
  
  // Show error state
  if (hasError && retryCount >= maxRetries) {
    return (
      <div className={`w-full ${className} bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-600`}>
        <div className="flex flex-col items-center space-y-2 text-amber-600">
          <AlertCircle className="h-8 w-8" />
          <p className="text-sm text-center">Preview not available</p>
          <p className="text-xs text-center opacity-75">
            {errorMessage || 'Image uploaded successfully - preview will be available after page refresh'}
          </p>
          {showFileName && imagePath && (
            <p className="text-xs text-center text-green-600 mt-1">✓ File: {imagePath}</p>
          )}
          {enableRetry && (
            <button
              onClick={handleManualRetry}
              className="text-xs text-blue-600 hover:text-blue-700 flex items-center space-x-1 mt-2"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Try Again</span>
            </button>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <div className={`w-full ${className} bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden relative`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 z-10">
          <div className="flex flex-col items-center space-y-2">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading preview...</p>
          </div>
        </div>
      )}
      
      {imageUrl && (
        <img
          ref={imgRef}
          src={imageUrl}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity ${isLoading ? 'opacity-0' : 'opacity-100'}`}
          onLoadStart={handleImageLoadStart}
          onLoad={handleImageLoad}
          onError={handleImageError}
          crossOrigin="anonymous" // Enable CORS for better cross-origin handling
          loading="lazy" // Enable lazy loading for performance
          decoding="async" // Enable async decoding for better performance
        />
      )}
      
      {/* Retry button for failed loads */}
      {hasError && enableRetry && retryCount < maxRetries && (
        <div className="absolute bottom-2 right-2 z-10">
          <button
            onClick={handleManualRetry}
            className="bg-red-600 text-white text-xs px-2 py-1 rounded hover:bg-red-700 flex items-center space-x-1"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Retry ({retryCount}/{maxRetries})</span>
          </button>
        </div>
      )}
      
      {/* Enhanced debug info with URL testing (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-90 text-white text-xs p-2 opacity-0 hover:opacity-100 transition-opacity z-20">
          <div className="space-y-1">
            <div>Path: {imagePath}</div>
            <div>URL: {imageUrl}</div>
            <div>Absolute URL: {imageUrl ? getAbsoluteImageUrl(imagePath || '') : 'None'}</div>
            <div>Retry: {retryCount}/{maxRetries}</div>
            {updatedAt && <div>Updated: {formatDate(updatedAt)}</div>}
            {hasError && <div className="text-red-300">Error: {errorMessage}</div>}
            <div className="flex items-center space-x-2 mt-2">
              {imageUrl && (
                <>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(imageUrl);
                      console.log('OptimizedImagePreview - URL copied to clipboard:', { url: imageUrl });
                    }}
                    className="flex items-center space-x-1 px-2 py-1 bg-blue-600 rounded text-xs hover:bg-blue-700"
                  >
                    <Copy className="h-3 w-3" />
                    <span>Copy</span>
                  </button>
                  <button
                    onClick={() => {
                      window.open(imageUrl, '_blank');
                      console.log('OptimizedImagePreview - Opening URL in new tab:', { url: imageUrl });
                    }}
                    className="flex items-center space-x-1 px-2 py-1 bg-green-600 rounded text-xs hover:bg-green-700"
                  >
                    <ExternalLink className="h-3 w-3" />
                    <span>Test</span>
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
OptimizedImagePreview.displayName = 'OptimizedImagePreview';
