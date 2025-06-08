import React, { useState, useEffect } from 'react';
import { getImageUrl, getResponsiveImageUrls, formatImageDimensions, formatFileSize } from '~/utils';
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

  const handleImageError = (imageId: number) => {
    setImageErrors(prev => new Set(prev).add(imageId));
    setImageLoading(prev => {
      const newSet = new Set(prev);
      newSet.delete(imageId);
      return newSet;
    });
  };

  const handleImageLoad = (imageId: number) => {
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
  };

  const handleImageLoadStart = (imageId: number) => {
    setImageLoading(prev => new Set(prev).add(imageId));
  };

  const handleImageSelect = (imageId: number) => {
    if (!selectable || !onSelectionChange) return;
    
    const newSelection = selectedImages.includes(imageId)
      ? selectedImages.filter(id => id !== imageId)
      : [...selectedImages, imageId];
    
    onSelectionChange(newSelection);
  };

  const handleCopyPath = async (image: ImageData) => {
    try {
      await navigator.clipboard.writeText(image.filePath);
    } catch (error) {
      console.error('Failed to copy path:', error);
    }
  };

  const handleCopyUrl = async (image: ImageData) => {
    try {
      const url = getImageUrl(image.filePath);
      await navigator.clipboard.writeText(url);
    } catch (error) {
      console.error('Failed to copy URL:', error);
    }
  };

  const getImageSrc = (filePath: string, size?: string) => {
    try {
      return getImageUrl(filePath, size);
    } catch (error) {
      console.error('Failed to get image URL:', error);
      return '';
    }
  };

  if (loading) {
    return (
      <div className={`${className}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, index) => (
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
    );
  }

  if (images.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-text-muted dark:text-text-light/70">{emptyMessage}</p>
      </div>
    );
  }

  // Grid View
  if (viewMode === 'grid') {
    return (
      <div className={`${className}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {images.map((image) => (
            <div
              key={image.id}
              className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-all ${
                selectedImages.includes(image.id) ? 'ring-2 ring-secondary' : ''
              }`}
            >
              {/* Image Container */}
              <div 
                className="aspect-square bg-gray-50 dark:bg-gray-700 relative cursor-pointer"
                onClick={() => onImageClick?.(image)}
              >
                {imageErrors.has(image.id) ? (
                  <div className="flex flex-col items-center justify-center h-full text-red-500 p-4">
                    <ImageIcon className="h-8 w-8 mb-2" />
                    <p className="text-sm text-center">Failed to load</p>
                  </div>
                ) : (
                  <>
                    {imageLoading.has(image.id) && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-secondary border-t-transparent"></div>
                      </div>
                    )}
                    <img
                      src={getImageSrc(image.filePath, 'medium')}
                      alt={image.altText || image.title || image.fileName}
                      className={`w-full h-full object-cover transition-opacity ${
                        imageLoading.has(image.id) ? 'opacity-0' : 'opacity-100'
                      }`}
                      onError={() => handleImageError(image.id)}
                      onLoad={() => handleImageLoad(image.id)}
                      onLoadStart={() => handleImageLoadStart(image.id)}
                      loading="lazy"
                    />
                    
                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-all flex items-center justify-center opacity-0 hover:opacity-100">
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
                  </>
                )}
                
                {/* Selection checkbox */}
                {selectable && (
                  <div className="absolute top-2 left-2">
                    <input
                      type="checkbox"
                      checked={selectedImages.includes(image.id)}
                      onChange={() => handleImageSelect(image.id)}
                      onClick={(e) => e.stopPropagation()}
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
        
        {/* Lightbox */}
        {lightboxImage && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
            onClick={() => setLightboxImage(null)}
          >
            <div className="max-w-4xl max-h-full relative">
              <img
                src={getImageSrc(lightboxImage.filePath, 'large')}
                alt={lightboxImage.altText || lightboxImage.title || lightboxImage.fileName}
                className="max-w-full max-h-full object-contain"
                onClick={(e) => e.stopPropagation()}
                onError={() => {
                  console.error('Failed to load lightbox image');
                }}
              />
              <button
                onClick={() => setLightboxImage(null)}
                className="absolute top-4 right-4 p-2 bg-white text-gray-800 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // List View
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
                        onChange={() => {
                          if (selectedImages.length === images.length) {
                            onSelectionChange?.([]);
                          } else {
                            onSelectionChange?.(images.map(img => img.id));
                          }
                        }}
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
                      <img
                        src={getImageSrc(image.filePath, 'thumbnail')}
                        alt={image.altText || image.title || image.fileName}
                        className="h-12 w-12 object-cover rounded cursor-pointer"
                        onClick={() => onImageClick?.(image)}
                        loading="lazy"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
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

  // Masonry View
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
                className="bg-gray-50 dark:bg-gray-700 relative cursor-pointer"
                onClick={() => onImageClick?.(image)}
              >
                <img
                  src={getImageSrc(image.filePath, 'medium')}
                  alt={image.altText || image.title || image.fileName}
                  className="w-full h-auto object-cover"
                  loading="lazy"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
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
