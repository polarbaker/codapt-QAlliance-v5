import React, { useState } from 'react';
import { getImageUrl } from '~/utils';
import {
  Image as ImageIcon,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface ImagePreviewProps {
  imagePath: string | null | undefined;
  alt?: string;
  className?: string;
  placeholderIcon?: React.ComponentType<{ className?: string }>;
  placeholderText?: string;
  showFileName?: boolean;
}

export function ImagePreview({
  imagePath,
  alt = "Image preview",
  className = "h-32",
  placeholderIcon: PlaceholderIcon = ImageIcon,
  placeholderText = "Image preview will appear here",
  showFileName = false,
}: ImagePreviewProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  
  const hasValidImagePath = imagePath && imagePath.trim() !== '';
  
  console.log('🔍 DEBUG: ImagePreview - Render evaluation:', {
    imagePath: imagePath,
    imagePathType: typeof imagePath,
    imagePathLength: imagePath?.length,
    imagePathTrimmed: imagePath?.trim(),
    hasValidImagePath: hasValidImagePath,
    isLoading: isLoading,
    hasError: hasError,
    timestamp: new Date().toISOString()
  });

  // Reset error state when image path changes
  React.useEffect(() => {
    if (hasValidImagePath) {
      setHasError(false);
    }
  }, [imagePath, hasValidImagePath]);

  if (!hasValidImagePath) {
    console.log('🔍 DEBUG: ImagePreview - Showing placeholder (no valid image path)');
    
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

  if (hasError) {
    console.log('🔍 DEBUG: ImagePreview - Showing error state');
    
    return (
      <div className={`w-full ${className} bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-600`}>
        <div className="flex flex-col items-center space-y-2 text-amber-600">
          <AlertCircle className="h-8 w-8" />
          <p className="text-sm text-center">Preview not available</p>
          <p className="text-xs text-center opacity-75">Image uploaded successfully - preview will be available after page refresh</p>
          {showFileName && imagePath && (
            <p className="text-xs text-center text-green-600 mt-1">✓ File: {imagePath}</p>
          )}
        </div>
      </div>
    );
  }

  const imageUrl = getImageUrl(imagePath);
  
  console.log('🔍 DEBUG: ImagePreview - Rendering image:', {
    imagePath: imagePath,
    imageUrl: imageUrl,
    isLoading: isLoading,
    timestamp: new Date().toISOString()
  });

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
      
      <img
        src={imageUrl}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        onLoadStart={() => {
          console.log('🔍 DEBUG: ImagePreview - Image loading started:', {
            imagePath: imagePath,
            imageUrl: imageUrl,
            timestamp: new Date().toISOString()
          });
          setIsLoading(true);
          setHasError(false);
        }}
        onLoad={() => {
          console.log('🔍 DEBUG: ImagePreview - Image loaded successfully:', {
            imagePath: imagePath,
            imageUrl: imageUrl,
            timestamp: new Date().toISOString()
          });
          setIsLoading(false);
          setHasError(false);
        }}
        onError={(e) => {
          console.log('🔍 DEBUG: ImagePreview - Image failed to load:', {
            imagePath: imagePath,
            imageUrl: imageUrl,
            error: e,
            timestamp: new Date().toISOString()
          });
          setIsLoading(false);
          setHasError(true);
        }}
        style={{ display: isLoading ? 'none' : 'block' }}
      />
    </div>
  );
}
