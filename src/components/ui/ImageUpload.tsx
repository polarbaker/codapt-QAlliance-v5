import React, { useState, useRef } from 'react';
import { useTRPC } from '~/trpc/react';
import { useMutation } from '@tanstack/react-query';
import { useUserStore } from '~/stores/userStore';
import { validateImageFile, fileToBase64 } from '~/constants/validation';
import { getImageUrl } from '~/utils';
import { toast } from 'react-hot-toast';
import {
  Upload,
  X,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
  Check,
} from 'lucide-react';

interface ImageUploadProps {
  value?: string; // Current image path
  onChange: (imagePath: string | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  previewClassName?: string;
}

export function ImageUpload({
  value,
  onChange,
  placeholder = "Click to upload an image",
  className = "",
  disabled = false,
  previewClassName = "h-32",
}: ImageUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { adminToken } = useUserStore();
  const trpc = useTRPC();
  
  const uploadMutation = useMutation(
    trpc.adminUploadImage.mutationOptions({
      onSuccess: (data) => {
        onChange(data.filePath);
        setSelectedFile(null);
        setPreviewUrl(null);
        toast.success('Image uploaded successfully');
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to upload image');
      },
    })
  );
  
  const handleFileSelect = async (file: File) => {
    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast.error(validation.error || 'Invalid file');
      return;
    }
    
    setSelectedFile(file);
    
    // Create preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };
  
  const handleUpload = async () => {
    if (!selectedFile || !adminToken) return;
    
    try {
      const base64Content = await fileToBase64(selectedFile);
      
      uploadMutation.mutate({
        adminToken,
        fileName: selectedFile.name,
        fileType: selectedFile.type,
        fileContent: base64Content,
      });
    } catch (error) {
      toast.error('Failed to process image');
    }
  };
  
  const handleRemove = () => {
    onChange(null);
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };
  
  const currentImageUrl = previewUrl || (value ? getImageUrl(value) : null);
  
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragOver
            ? 'border-secondary bg-secondary/5'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          disabled={disabled}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelect(file);
          }}
        />
        
        {uploadMutation.isPending ? (
          <div className="flex flex-col items-center space-y-2">
            <Loader2 className="h-8 w-8 animate-spin text-secondary" />
            <p className="text-sm text-gray-600 dark:text-gray-400">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-2">
            <Upload className="h-8 w-8 text-gray-400" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {placeholder}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              Drag and drop or click to select • Any image format supported
            </p>
          </div>
        )}
      </div>
      
      {/* Selected File Info */}
      {selectedFile && !uploadMutation.isPending && (
        <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center space-x-3">
            <ImageIcon className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                {selectedFile.name}
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleUpload}
              disabled={uploadMutation.isPending}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              Upload
            </button>
            <button
              onClick={() => {
                setSelectedFile(null);
                setPreviewUrl(null);
              }}
              className="p-1 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-800 rounded"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      
      {/* Current Image Preview */}
      {currentImageUrl && !selectedFile && (
        <div className="relative">
          <div className={`bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden ${previewClassName}`}>
            <img
              src={currentImageUrl}
              alt="Current image"
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  parent.innerHTML = '<div class="flex items-center justify-center h-full text-red-500"><AlertCircle class="h-8 w-8" /></div>';
                }
              }}
            />
          </div>
          <button
            onClick={handleRemove}
            className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
            title="Remove image"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      
      {/* Upload Success */}
      {uploadMutation.isSuccess && (
        <div className="flex items-center space-x-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <Check className="h-5 w-5 text-green-600" />
          <p className="text-sm text-green-800 dark:text-green-200">
            Image uploaded successfully
          </p>
        </div>
      )}
      
      {/* Error State */}
      {uploadMutation.isError && (
        <div className="flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <p className="text-sm text-red-800 dark:text-red-200">
            {uploadMutation.error?.message || 'Failed to upload image'}
          </p>
        </div>
      )}
    </div>
  );
}
