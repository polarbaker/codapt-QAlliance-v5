'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef, MouseEvent } from 'react';
import { getImageUrl, formatImageDimensions, formatFileSize } from '../../utils/common';
import {
  Grid3X3,
  List,
  Columns3,
  Eye,
  Download,
  Edit,
  Trash2,
  Copy,
  Tag,
  Calendar,
  Image as ImageIcon,
  ZoomIn,
  Heart,
  Share2,
  X,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';

interface ImageData {
  id: number;
  fileName: string;
  filePath: string;
  fileSize: number;
  width?: number;
  height?: number;
  title?: string;
  description?: string;
  altText?: string;
  tags: string[];
  category?: string;
  createdAt: string;
  usageCount?: number;
  variants?: Array<{
    variantType: string;
    width: number;
    height: number;
    fileSize: number;
    format: string;
  }>;
}

interface ImageGalleryProps {
  images: ImageData[];
  viewMode?: 'grid' | 'list' | 'masonry';
  selectable?: boolean;
  selectedImages?: number[];
  onSelectionChange?: (selectedIds: number[]) => void;
  onImageClick?: (image: ImageData) => void;
  onImageEdit?: (image: ImageData) => void;
  onImageDelete?: (image: ImageData) => void;
  showMetadata?: boolean;
  showVariants?: boolean;
  className?: string;
  emptyMessage?: string;
  loading?: boolean;
}

// Custom hook for intersection observer
function useIntersectionObserver<T extends Element>(
  elementRef: React.RefObject<T | null>,
  { threshold = 0.1, root = null, rootMargin = '50px' }: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]) {
          setIsIntersecting(entries[0].isIntersecting);
        }
      },
      { threshold, root, rootMargin }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [elementRef, threshold, root, rootMargin]);

  return isIntersecting;
}

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
  onClick?: (e: React.MouseEvent<HTMLImageElement>) => void;
  fallbackSrc?: string;
}

// Optimized image component with lazy loading
const LazyImage = React.memo(({ 
  src, 
  alt, 
  className, 
  onLoad, 
  onError,
  onClick,
  fallbackSrc 
}: LazyImageProps) => {
  const [imageState, setImageState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [currentSrc, setCurrentSrc] = useState(src);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isVisible = useIntersectionObserver(containerRef);

  const handleLoad = useCallback(() => {
    setImageState('loaded');
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    if (fallbackSrc && currentSrc !== fallbackSrc) {
      console.log('Trying fallback image for:', currentSrc);
      setCurrentSrc(fallbackSrc);
    } else {
      console.warn('Image failed to load:', currentSrc);
      setImageState('error');
      onError?.();
    }
  }, [fallbackSrc, currentSrc, onError]);

  const retry = useCallback(() => {
    console.log('Retrying image load for:', src);
    setImageState('loading');
    setCurrentSrc(src);
    // Add a small delay to prevent immediate retry loops
    setTimeout(() => {
      if (imageRef.current) {
        imageRef.current.src = src;
      }
    }, 100);
  }, [src]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {isVisible && (
        <>
          {imageState === 'loading' && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-700">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-secondary border-t-transparent"></div>
            </div>
          )}
          
          {imageState === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-700 text-red-500 p-4">
              <AlertTriangle className="h-8 w-8 mb-2" />
              <p className="text-sm text-center mb-2">Failed to load</p>
              <button 
                onClick={retry}
                className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 flex items-center space-x-1"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Retry</span>
              </button>
            </div>
          )}
          
          <img
            ref={imageRef}
            src={currentSrc}
            alt={alt}
            className={`transition-opacity duration-300 ${
              imageState === 'loaded' ? 'opacity-100' : 'opacity-0'
            } ${className}`}
            onLoad={handleLoad}
            onError={handleError}
            onClick={onClick}
            loading="lazy"
            style={{ 
              display: imageState === 'error' ? 'none' : 'block',
            }}
          />
        </>
      )}
      
      {!isVisible && (
        <div className={`bg-gray-100 dark:bg-gray-700 ${className}`}>
          <div className="flex items-center justify-center h-full">
            <ImageIcon className="h-8 w-8 text-gray-400" />
          </div>
        </div>
      )}
    </div>
  );
});

LazyImage.displayName = 'LazyImage';

export function ImageGallery({
  images,
  viewMode = 'grid',
  selectable = false,
  selectedImages = [],
  onSelectionChange,
  onImageClick,
  onImageEdit,
  onImageDelete,
  showMetadata = false,
  showVariants = false,
  className = '',
  emptyMessage = 'No images found',
  loading = false,
}: ImageGalleryProps) {
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  const [imageLoading, setImageLoading] = useState<Set<number>>(new Set());
  const [lightboxImage, setLightboxImage] = useState<ImageData | null>(null);
  const [retryCount, setRetryCount] = useState<Record<number, number>>({});

  // Memoized handlers to prevent unnecessary re-renders
  const handleImageError = useCallback((imageId: number) => {
    setImageErrors(prev => new Set(prev).add(imageId));
    setImageLoading(prev => {
      const newSet = new Set(prev);
      newSet.delete(imageId);
      return newSet;
    });
    
    // Track retry attempts
    setRetryCount(prev => ({
      ...prev,
      [imageId]: (prev[imageId] || 0) + 1
    }));
  }, []);

  const handleImageLoad = useCallback((imageId: number) => {
    setImageErrors(prev => {
      const newSet = new Set(prev);
      newSet.delete(imageId);
      return newSet;
    });
    setImageLoading(prev => {
      const newSet = new Set(prev);
      newSet.delete(imageId);
      return newSet;
    });
    
    // Reset retry count on successful load
    setRetryCount(prev => {
      const newCount = { ...prev };
      delete newCount[imageId];
      return newCount;
    });
  }, []);

  const handleImageLoadStart = useCallback((imageId: number) => {
    setImageLoading(prev => new Set(prev).add(imageId));
  }, []);

  const handleImageSelect = useCallback((imageId: number) => {
    if (!selectable || !onSelectionChange) return;
    
    const newSelection = selectedImages.includes(imageId)
      ? selectedImages.filter(id => id !== imageId)
      : [...selectedImages, imageId];
    
    onSelectionChange(newSelection);
  }, [selectable, onSelectionChange, selectedImages]);

  const handleCopyPath = useCallback(async (image: ImageData) => {
    try {
      await navigator.clipboard.writeText(image.filePath);
      // Could add a toast notification here
    } catch (error) {
      console.error('Failed to copy path:', error);
    }
  }, []);

  const handleCopyUrl = useCallback(async (image: ImageData) => {
    try {
      const url = getImageUrl(image.filePath);
      await navigator.clipboard.writeText(url);
      // Could add a toast notification here
    } catch (error) {
      console.error('Failed to copy URL:', error);
    }
  }, []);

  // Memoized image source generation
  const getImageSrc = useCallback((filePath: string, size?: string) => {
    try {
      if (!filePath || typeof filePath !== 'string') {
        console.warn('Invalid filePath provided to getImageSrc:', filePath);
        return '';
      }
      
      const imageUrl = getImageUrl(filePath, size);
      if (!imageUrl) {
        console.warn('Failed to generate image URL for:', filePath, size);
        return '';
      }
      
      return imageUrl;
    } catch (error) {
      console.error('Error generating image URL:', error, { filePath, size });
      return '';
    }
  }, []);

  // Memoized select all handler
  const handleSelectAll = useCallback(() => {
    if (!selectable || !onSelectionChange) return;
    
    if (selectedImages.length === images.length && images.length > 0) {
      onSelectionChange([]);
    } else {
      onSelectionChange(images.map(img => img.id));
    }
  }, [selectable, onSelectionChange, selectedImages.length, images]);

  // Memoized loading skeleton
  const LoadingSkeleton = useMemo(() => (
    <div className={`${className}`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
        {Array.from({ length: 12 }).map((_, index) => (
          <div key={index} className="animate-pulse">
            <div className="bg-gray-200 dark:bg-gray-700 aspect-square rounded-lg"></div>
            <div className="mt-2 space-y-2">
              <div className="bg-gray-200 dark:bg-gray-700 h-4 rounded"></div>
              <div className="bg-gray-200 dark:bg-gray-700 h-3 rounded w-2/3"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  ), [className]);

  if (loading) {
    return LoadingSkeleton;
  }

  if (images.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-text-muted dark:text-text-light/70">{emptyMessage}</p>
      </div>
    );
  }

  // Grid View - Optimized
  if (viewMode === 'grid') {
    return (
      <div className={`${className}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
          {images.map((image) => (
            <div
              key={image.id}
              className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-all duration-200 ${
                selectedImages.includes(image.id) ? 'ring-2 ring-secondary' : ''
              }`}
            >
              {/* Image Container */}
              <div 
                className="aspect-square bg-gray-50 dark:bg-gray-700 relative cursor-pointer group"
                onClick={() => onImageClick?.(image)}
              >
                <LazyImage
                  src={getImageSrc(image.filePath, 'medium')}
                  alt={image.altText || image.title || image.fileName}
                  className="w-full h-full object-cover"
                  onLoad={() => handleImageLoad(image.id)}
                  onError={() => handleImageError(image.id)}
                  fallbackSrc={getImageSrc(image.filePath, 'small')}
                />
                
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxImage(image);
                    }}
                    className="p-2 bg-white text-gray-800 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </button>
                </div>
                
                {/* Selection checkbox */}
                {selectable && (
                  <div className="absolute top-2 left-2">
                    <input
                      type="checkbox"
                      checked={selectedImages.includes(image.id)}
                      onChange={() => handleImageSelect(image.id)}
                      onClick={(e: MouseEvent<HTMLInputElement>) => e.stopPropagation()}
                      className="rounded border-gray-300 text-secondary focus:ring-secondary"
                    />
                  </div>
                )}
                
                {/* Variant indicator */}
                {showVariants && image.variants && image.variants.length > 0 && (
                  <div className="absolute top-2 right-2">
                    <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded">
                      {image.variants.length} variants
                    </span>
                  </div>
                )}
                
                {/* Error indicator */}
                {imageErrors.has(image.id) && (
                  <div className="absolute bottom-2 right-2">
                    <span className="px-2 py-1 bg-red-600 text-white text-xs rounded flex items-center space-x-1">
                      <AlertTriangle className="h-3 w-3" />
                      <span>Error</span>
                    </span>
                  </div>
                )}
              </div>
              
              {/* Image Info */}
              <div className="p-4">
                <h3 className="text-sm font-medium text-text-dark dark:text-text-light mb-1 truncate">
                  {image.title || image.fileName}
                </h3>
                
                {showMetadata && (
                  <div className="space-y-1 mb-3">
                    {image.description && (
                      <p className="text-xs text-text-muted dark:text-text-light/70 line-clamp-2">
                        {image.description}
                      </p>
                    )}
                    {image.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {image.tags.slice(0, 2).map((tag, index) => (
                          <span
                            key={index}
                            className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 text-xs rounded"
                          >
                            {tag}
                          </span>
                        ))}
                        {image.tags.length > 2 && (
                          <span className="text-xs text-text-muted dark:text-text-light/70">
                            +{image.tags.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                <div className="text-xs text-text-muted dark:text-text-light/70 mb-3 space-y-1">
                  <p>{formatFileSize(image.fileSize)}</p>
                  {image.width && image.height && (
                    <p>{formatImageDimensions(image.width, image.height)}</p>
                  )}
                  <p>{new Date(image.createdAt).toLocaleDateString()}</p>
                </div>
                
                {/* Action buttons */}
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleCopyPath(image)}
                    className="flex-1 px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
                    title="Copy file path"
                  >
                    <Copy className="h-3 w-3 mx-auto" />
                  </button>
                  <button
                    onClick={() => handleCopyUrl(image)}
                    className="flex-1 px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition-colors"
                    title="Copy URL"
                  >
                    <Eye className="h-3 w-3 mx-auto" />
                  </button>
                  {onImageEdit && (
                    <button
                      onClick={() => onImageEdit(image)}
                      className="flex-1 px-2 py-1 bg-orange-600 text-white rounded text-xs hover:bg-orange-700 transition-colors"
                      title="Edit image"
                    >
                      <Edit className="h-3 w-3 mx-auto" />
                    </button>
                  )}
                  {onImageDelete && (
                    <button
                      onClick={() => onImageDelete(image)}
                      className="flex-1 px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors"
                      title="Delete image"
                    >
                      <Trash2 className="h-3 w-3 mx-auto" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Enhanced Lightbox */}
        {lightboxImage && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
            onClick={() => setLightboxImage(null)}
          >
            <div className="max-w-4xl max-h-full relative">
              <LazyImage
                src={getImageSrc(lightboxImage.filePath, 'large')}
                alt={lightboxImage.altText || lightboxImage.title || lightboxImage.fileName}
                className="max-w-full max-h-full object-contain"
                onClick={(e: React.MouseEvent<HTMLImageElement>) => e.stopPropagation()}
              />
              <button
                onClick={() => setLightboxImage(null)}
                className="absolute top-4 right-4 p-2 bg-white text-gray-800 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
              
              {/* Image info in lightbox */}
              <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-75 text-white p-4 rounded">
                <h3 className="font-medium mb-1">
                  {lightboxImage.title || lightboxImage.fileName}
                </h3>
                {lightboxImage.description && (
                  <p className="text-sm text-gray-300 mb-2">
                    {lightboxImage.description}
                  </p>
                )}
                <div className="flex items-center space-x-4 text-xs text-gray-400">
                  <span>{formatFileSize(lightboxImage.fileSize)}</span>
                  {lightboxImage.width && lightboxImage.height && (
                    <span>{formatImageDimensions(lightboxImage.width, lightboxImage.height)}</span>
                  )}
                  <span>{new Date(lightboxImage.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // List View - Keep existing implementation but add lazy loading
  if (viewMode === 'list') {
    return (
      <div className={`${className}`}>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {selectable && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={selectedImages.length === images.length && images.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300 text-secondary focus:ring-secondary"
                      />
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Preview
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Dimensions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {images.map((image) => (
                  <tr key={image.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    {selectable && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedImages.includes(image.id)}
                          onChange={() => handleImageSelect(image.id)}
                          className="rounded border-gray-300 text-secondary focus:ring-secondary"
                        />
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <LazyImage
                        src={getImageSrc(image.filePath, 'thumbnail')}
                        alt={image.altText || image.title || image.fileName}
                        className="h-12 w-12 object-cover rounded cursor-pointer"
                        onClick={() => onImageClick?.(image)}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-text-dark dark:text-text-light">
                          {image.title || image.fileName}
                        </div>
                        {image.description && (
                          <div className="text-sm text-text-muted dark:text-text-light/70 truncate max-w-xs">
                            {image.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted dark:text-text-light/70">
                      {formatFileSize(image.fileSize)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted dark:text-text-light/70">
                      {image.width && image.height ? formatImageDimensions(image.width, image.height) : 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted dark:text-text-light/70">
                      {new Date(image.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      <button
                        onClick={() => handleCopyPath(image)}
                        className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
                        title="Copy file path"
                      >
                        Copy Path
                      </button>
                      <button
                        onClick={() => handleCopyUrl(image)}
                        className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition-colors"
                        title="Copy URL"
                      >
                        Copy URL
                      </button>
                      {onImageEdit && (
                        <button
                          onClick={() => onImageEdit(image)}
                          className="px-2 py-1 bg-orange-600 text-white rounded text-xs hover:bg-orange-700 transition-colors"
                          title="Edit image"
                        >
                          Edit
                        </button>
                      )}
                      {onImageDelete && (
                        <button
                          onClick={() => onImageDelete(image)}
                          className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors"
                          title="Delete image"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // Masonry View - Enhanced with lazy loading
  if (viewMode === 'masonry') {
    return (
      <div className={`${className}`}>
        <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-6 space-y-6">
          {images.map((image) => (
            <div
              key={image.id}
              className="break-inside-avoid bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-all mb-6"
            >
              <div 
                className="bg-gray-50 dark:bg-gray-700 relative cursor-pointer group"
                onClick={() => onImageClick?.(image)}
              >
                <LazyImage
                  src={getImageSrc(image.filePath, 'medium')}
                  alt={image.altText || image.title || image.fileName}
                  className="w-full h-auto object-cover"
                />
                
                {/* Selection checkbox for masonry */}
                {selectable && (
                  <div className="absolute top-2 left-2">
                    <input
                      type="checkbox"
                      checked={selectedImages.includes(image.id)}
                      onChange={() => handleImageSelect(image.id)}
                      onClick={(e: MouseEvent<HTMLInputElement>) => e.stopPropagation()}
                      className="rounded border-gray-300 text-secondary focus:ring-secondary"
                    />
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="text-sm font-medium text-text-dark dark:text-text-light mb-1 truncate">
                  {image.title || image.fileName}
                </h3>
                <div className="text-xs text-text-muted dark:text-text-light/70">
                  {formatFileSize(image.fileSize)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
