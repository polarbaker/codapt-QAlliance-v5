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

  console.log('🔍 DEBUG: SimpleImageUpload - Component render state:', {
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
                
                console.log(`🔧 Client compression: ${formatFileSize(file.size)} → ${formatFileSize(compressedFile.size)}`);
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
        console.log('🔍 DEBUG: SimpleImageUpload - Upload success:', {
          data: data,
          filePath: data.filePath,
          filePathType: typeof data.filePath,
          timestamp: new Date().toISOString()
        });
        
        setUploadState({
          isUploading: false,
          progress: 100,
          message: 'Upload completed successfully!',
        });
        
        if (data.filePath && typeof data.filePath === 'string' && data.filePath.trim() !== '') {
          console.log('🔍 DEBUG: SimpleImageUpload - Calling onSuccess with filePath:', {
            filePath: data.filePath,
            timestamp: new Date().toISOString()
          });
          
          onSuccess(data.filePath);
          
          toast.success('✅ Image uploaded successfully!', { duration: 3000 });
          
          // Clear local state after successful upload
          setSelectedFile(null);
          setPreviewUrl("");
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        } else {
          console.error('❌ DEBUG: SimpleImageUpload - Invalid filePath in response:', {
            data: data,
            filePath: data.filePath,
            timestamp: new Date().toISOString()
          });
          
          const error = new Error('Upload completed but file path is missing');
          onError?.(error);
          toast.error('Upload completed but file path is missing. Please try again.');
        }
      },
      onError: async (error) => {
        console.error('❌ DEBUG: SimpleImageUpload - Upload error:', error);
        
        const errorInfo = getUploadErrorMessage(error.message || 'Upload failed');
        
        // Handle 413 errors specifically with automatic fallback strategies
        if (error.message?.includes('413') || error.message?.includes('too large') || error.message?.includes('payload')) {
          console.log('🔧 413 error detected - attempting automatic fallback strategies');
          
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
                const compressedFile = await compressImageOnClient(selectedFile, 0.7); // More aggressive compression
                
                // Retry with compressed file
                setTimeout(() => {
                  handleUpload(compressedFile, true); // Mark as compressed attempt
                }, 1000);
                return;
              } catch (compressionError) {
                console.error('Compression failed:', compressionError);
              }
            }
            
            // Strategy 2: Suggest chunked upload for very large files
            const fileSizeMB = selectedFile.size / (1024 * 1024);
            if (fileSizeMB > 25) {
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
          toast.error('Server memory issue detected. Trying smaller image size...', { 
            duration: 6000 
          });
          
          if (selectedFile && !uploadState.compressionAttempted) {
            setUploadState(prev => ({
              ...prev,
              compressionAttempted: true,
            }));
            
            try {
              const compressedFile = await compressImageOnClient(selectedFile, 0.6); // Aggressive compression for memory issues
              setTimeout(() => handleUpload(compressedFile, true), 2000);
              return;
            } catch (compressionError) {
              console.error('Memory-saving compression failed:', compressionError);
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
    
    if (fileArray.length === 0) return;
    
    // Only handle single file
    const file = fileArray[0];
    
    console.log('🔍 DEBUG: SimpleImageUpload - File selected:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      timestamp: new Date().toISOString()
    });
    
    // Validate file
    const validation = validateImageFile(file);
    
    if (!validation.valid) {
      const errorInfo = getUploadErrorMessage(validation.error || 'Invalid file');
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
        toast(`⚠️ ${warning}`, {
          duration: 4000,
          style: { background: '#fef3c7', color: '#92400e' }
        });
      });
    }
    
    // Check if we should automatically compress the image
    let fileToUpload = file;
    if (shouldCompressImage(file)) {
      setUploadState({
        isUploading: true,
        progress: 5,
        message: 'Optimizing large image...',
        compressionAttempted: false,
      });
      
      try {
        fileToUpload = await compressImageOnClient(file);
        
        const originalMB = (file.size / (1024 * 1024)).toFixed(1);
        const compressedMB = (fileToUpload.size / (1024 * 1024)).toFixed(1);
        
        toast.success(`✨ Image optimized: ${originalMB}MB → ${compressedMB}MB`, { 
          duration: 3000 
        });
        
        setUploadState(prev => ({
          ...prev,
          compressionAttempted: true,
        }));
      } catch (error) {
        console.warn('Automatic compression failed:', error);
        toast('⚠️ Automatic compression failed, uploading original file', {
          duration: 3000,
          style: { background: '#fef3c7', color: '#92400e' }
        });
      }
    }
    
    // Set selected file and create preview
    setSelectedFile(fileToUpload);
    
    try {
      const previewUrl = URL.createObjectURL(fileToUpload);
      setPreviewUrl(previewUrl);
      
      console.log('🔍 DEBUG: SimpleImageUpload - Preview created:', {
        fileName: fileToUpload.name,
        previewUrl: 'created',
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Failed to create preview:', error);
      toast.error('Failed to create image preview');
    }
    
  }, [onError, shouldCompressImage, compressImageOnClient]);

  const handleUpload = useCallback(async (fileOverride?: File, isCompressedAttempt: boolean = false) => {
    const fileToUpload = fileOverride || selectedFile;
    
    if (!fileToUpload || !adminToken) {
      if (!adminToken) {
        toast.error('Authentication required. Please log in and try again.');
      }
      return;
    }
    
    console.log('🔍 DEBUG: SimpleImageUpload - Starting upload:', {
      fileName: fileToUpload.name,
      fileSize: fileToUpload.size,
      isCompressedAttempt,
      timestamp: new Date().toISOString()
    });
    
    try {
      setUploadState(prev => ({
        ...prev,
        isUploading: true,
        progress: isCompressedAttempt ? 30 : 10,
        message: isCompressedAttempt ? 'Uploading compressed image...' : 'Converting image...',
        compressionAttempted: isCompressedAttempt || prev.compressionAttempted,
      }));
      
      const base64Content = await fileToBase64(fileToUpload);
      
      setUploadState(prev => ({
        ...prev,
        progress: 50,
        message: 'Uploading to server...',
      }));
      
      uploadMutation.mutate({
        adminToken,
        fileName: fileToUpload.name,
        fileContent: base64Content,
        fileType: fileToUpload.type || 'image/jpeg',
      });
      
    } catch (error) {
      console.error('Upload preparation failed:', error);
      
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
    console.log('🔍 DEBUG: SimpleImageUpload - Clearing selection');
    
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
      console.log('🔍 DEBUG: SimpleImageUpload - Auto-uploading selected file');
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
        onClick={() => !disabled && !uploadState.isUploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          className="hidden"
          disabled={disabled || uploadState.isUploading}
          onChange={(e) => {
            const files = e.target.files;
            if (files) handleFileSelect(files);
          }}
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
    </div>
  );
}
