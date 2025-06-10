import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useTRPC } from '../../trpc/react';
import { useMutation } from '@tanstack/react-query';
import { useUserStore } from '../../stores/userStore';
import { 
  validateImageFile, 
  fileToBase64, 
  formatFileSize,
  getUploadErrorMessage 
} from '../../constants/validation';
import { toast } from 'react-hot-toast';
import {
  Upload,
  X,
  Loader2,
  AlertCircle,
  Check,
  RefreshCw,
  Zap,
  Shield,
  Clock,
  Wifi,
  WifiOff,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface ChunkedImageUploadProps {
  onSuccess: (filePath: string) => void;
  onError?: (error: any) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  maxFileSize?: number; // in MB
  chunkSize?: number; // in MB
  maxRetries?: number;
  showAdvancedOptions?: boolean;
  autoRetry?: boolean;
}

interface ChunkInfo {
  index: number;
  data: string; // base64
  size: number;
  uploaded: boolean;
  retries: number;
  error?: string;
}

interface UploadState {
  phase: 'idle' | 'preparing' | 'uploading' | 'complete' | 'error' | 'retrying';
  progress: number;
  message: string;
  chunksTotal: number;
  chunksUploaded: number;
  chunksFailed: number;
  currentChunk?: number;
  error?: string;
  canRetry: boolean;
  useChunking: boolean;
  connectionStatus: 'online' | 'offline' | 'unstable';
}

interface RetryState {
  attempts: number;
  maxAttempts: number;
  nextRetryIn: number;
  retryTimer?: NodeJS.Timeout;
  exponentialBackoff: boolean;
}

export function ChunkedImageUpload({
  onSuccess,
  onError,
  placeholder = "Upload large images with automatic chunking",
  className = "",
  disabled = false,
  maxFileSize = 200, // 200MB default
  chunkSize = 2, // 2MB default chunks
  maxRetries = 3,
  showAdvancedOptions = false,
  autoRetry = true,
}: ChunkedImageUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [dragOver, setDragOver] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>({
    phase: 'idle',
    progress: 0,
    message: '',
    chunksTotal: 0,
    chunksUploaded: 0,
    chunksFailed: 0,
    canRetry: false,
    useChunking: false,
    connectionStatus: 'online',
  });
  const [chunks, setChunks] = useState<ChunkInfo[]>([]);
  const [retryState, setRetryState] = useState<RetryState>({
    attempts: 0,
    maxAttempts: maxRetries,
    nextRetryIn: 0,
    exponentialBackoff: true,
  });
  const [sessionId, setSessionId] = useState<string>("");
  const [showDetails, setShowDetails] = useState(false);
  const [adaptiveChunkSize, setAdaptiveChunkSize] = useState(chunkSize);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { adminToken } = useUserStore();
  const trpc = useTRPC();

  // Monitor connection status
  useEffect(() => {
    const updateConnectionStatus = () => {
      if (!navigator.onLine) {
        setUploadState(prev => ({ ...prev, connectionStatus: 'offline' }));
      } else {
        // Test connection stability with a small request
        fetch('/api/health', { method: 'HEAD' })
          .then(() => setUploadState(prev => ({ ...prev, connectionStatus: 'online' })))
          .catch(() => setUploadState(prev => ({ ...prev, connectionStatus: 'unstable' })));
      }
    };

    updateConnectionStatus();
    
    window.addEventListener('online', updateConnectionStatus);
    window.addEventListener('offline', updateConnectionStatus);
    
    const connectionCheckInterval = setInterval(updateConnectionStatus, 30000); // Check every 30s
    
    return () => {
      window.removeEventListener('online', updateConnectionStatus);
      window.removeEventListener('offline', updateConnectionStatus);
      clearInterval(connectionCheckInterval);
    };
  }, []);

  // Progressive upload mutation for chunks
  const progressiveUploadMutation = useMutation(
    trpc.bulletproofProgressiveUpload.mutationOptions({
      onSuccess: async (data: any) => {
        if (data.complete && data.filePath) {
          setUploadState(prev => ({
            ...prev,
            phase: 'complete',
            progress: 100,
            message: 'Upload completed successfully!',
          }));
          
          onSuccess(data.filePath);
          toast.success('🎉 Large file uploaded successfully with chunked upload!', { duration: 5000 });
          
          // Cleanup
          setSelectedFile(null);
          setPreviewUrl("");
          setChunks([]);
          setSessionId("");
        } else {
          // Update progress for chunk completion
          setUploadState(prev => ({
            ...prev,
            chunksUploaded: data.receivedChunks || prev.chunksUploaded,
            progress: ((data.receivedChunks || 0) / prev.chunksTotal) * 100,
            message: `Uploaded chunk ${data.receivedChunks}/${prev.chunksTotal}`,
          }));
        }
      },
      onError: (error: any) => {
        console.error('Chunk upload error:', error);
        
        const errorInfo = getUploadErrorMessage(error.message || 'Chunk upload failed');
        
        // Handle 413 errors by reducing chunk size
        if (error.message?.includes('413') || error.message?.includes('too large')) {
          const newChunkSize = Math.max(0.5, adaptiveChunkSize / 2); // Minimum 0.5MB chunks
          setAdaptiveChunkSize(newChunkSize);
          
          toast.error(`Server rejected chunk size. Reducing to ${newChunkSize}MB chunks and retrying...`, { 
            duration: 6000 
          });
          
          // Retry with smaller chunks
          setTimeout(() => {
            if (selectedFile) {
              handleUpload(selectedFile, newChunkSize);
            }
          }, 2000);
          return;
        }
        
        setUploadState(prev => ({
          ...prev,
          phase: 'error',
          error: errorInfo.message,
          canRetry: errorInfo.canRetry,
          chunksFailed: prev.chunksFailed + 1,
        }));
        
        if (autoRetry && errorInfo.canRetry && retryState.attempts < retryState.maxAttempts) {
          // Using default delay as retryDelay property is not guaranteed
          scheduleRetry(5000);
        }
        
        toast.error(`❌ ${errorInfo.message}`, { duration: 8000 });
        onError?.(error);
      },
    })
  );

  // Standard upload mutation for smaller files
  const standardUploadMutation = useMutation(
    trpc.bulletproofSingleUpload.mutationOptions({
      onSuccess: async (data: any) => {
        setUploadState(prev => ({
          ...prev,
          phase: 'complete',
          progress: 100,
          message: 'Upload completed successfully!',
        }));
        
        if (data.filePath) {
          onSuccess(data.filePath);
          toast.success('✅ Image uploaded successfully!', { duration: 3000 });
          
          // Cleanup
          setSelectedFile(null);
          setPreviewUrl("");
        }
      },
      onError: (error: any) => {
        console.error('Standard upload error:', error);
        
        const errorInfo = getUploadErrorMessage(error.message || 'Upload failed');
        
        // Handle 413 errors by switching to chunked upload
        if ((error.message?.includes('413') || error.message?.includes('too large')) && selectedFile) {
          toast.error('File too large for standard upload. Switching to chunked upload...', { 
            duration: 4000 
          });
          
          setTimeout(() => {
            handleUpload(selectedFile, adaptiveChunkSize, true); // Force chunking
          }, 1000);
          return;
        }
        
        setUploadState(prev => ({
          ...prev,
          phase: 'error',
          error: errorInfo.message,
          canRetry: errorInfo.canRetry,
        }));
        
        if (autoRetry && errorInfo.canRetry && retryState.attempts < retryState.maxAttempts) {
          // Using default delay as retryDelay property is not guaranteed
          scheduleRetry(5000);
        }
        
        toast.error(`❌ ${errorInfo.message}`, { duration: 8000 });
        onError?.(error);
      },
    })
  );

  const createFileChunks = useCallback(async (file: File, chunkSizeMB: number): Promise<ChunkInfo[]> => {
    const chunkSizeBytes = chunkSizeMB * 1024 * 1024;
    const totalChunks = Math.ceil(file.size / chunkSizeBytes);
    const chunks: ChunkInfo[] = [];
    
    setUploadState(prev => ({
      ...prev,
      phase: 'preparing',
      message: `Creating ${totalChunks} chunks...`,
      chunksTotal: totalChunks,
    }));
    
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSizeBytes;
      const end = Math.min(start + chunkSizeBytes, file.size);
      const chunkBlob = file.slice(start, end);
      
      try {
        // Create a File from Blob to satisfy type requirements
        const chunkFile = new File([chunkBlob], file.name, { type: file.type });
        const base64Data = await fileToBase64(chunkFile);
        chunks.push({
          index: i,
          data: base64Data,
          size: chunkBlob.size,
          uploaded: false,
          retries: 0,
        });
        
        setUploadState(prev => ({
          ...prev,
          progress: ((i + 1) / totalChunks) * 30, // 30% for chunk creation
          message: `Created chunk ${i + 1}/${totalChunks}`,
        }));
      } catch (error) {
        throw new Error(`Failed to create chunk ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    return chunks;
  }, []);

  const uploadChunksSequentially = useCallback(async (
    chunks: ChunkInfo[], 
    file: File, 
    sessionId: string
  ): Promise<void> => {
    setUploadState(prev => ({
      ...prev,
      phase: 'uploading',
      message: 'Starting chunk upload...',
    }));
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      if (!chunk || chunk.uploaded) continue; // Skip undefined or already uploaded chunks
      
      // Check if upload was aborted
      if (abortControllerRef.current?.signal.aborted) {
        throw new Error('Upload cancelled by user');
      }
      
      // Wait for connection if offline
      if (uploadState.connectionStatus === 'offline') {
        setUploadState(prev => ({
          ...prev,
          message: 'Waiting for connection...',
        }));
        
        await new Promise(resolve => {
          const checkConnection = () => {
            if (navigator.onLine) {
              resolve(void 0);
            } else {
              setTimeout(checkConnection, 1000);
            }
          };
          checkConnection();
        });
      }
      
      setUploadState(prev => ({
        ...prev,
        currentChunk: i + 1,
        message: `Uploading chunk ${i + 1}/${chunks.length}...`,
      }));
      
      try {
        // Only proceed if chunk exists
        if (!chunk) {
          throw new Error(`Chunk ${i} is undefined`);
        }

        await new Promise<void>((resolve, reject) => {
          // Use type assertion to avoid return type error
          (progressiveUploadMutation.mutate as any)({
            adminToken: adminToken!,
            chunkId: `${sessionId}_${i}`,
            chunkIndex: i,
            totalChunks: chunks.length,
            data: chunk.data,
            fileName: file.name,
            fileType: file.type || 'image/jpeg',
            sessionId,
          }, {
            onSuccess: (data: any) => {
              if (chunk) {
                chunk.uploaded = true;
                setChunks(prev => [...prev]); // Trigger re-render
              }
              resolve();
            },
            onError: (error: any) => {
              if (chunk) {
                chunk.error = error.message;
                chunk.retries++;
              }
              reject(error);
            },
          });
        });
        
        setUploadState(prev => ({
          ...prev,
          chunksUploaded: prev.chunksUploaded + 1,
          progress: 30 + ((prev.chunksUploaded + 1) / prev.chunksTotal) * 70, // 30% base + 70% for upload
        }));
        
      } catch (error) {
        // Handle chunk upload failure
        console.error(`Chunk ${i + 1} upload failed:`, error);
        
        if (chunk && chunk.retries < 3) {
          // Retry chunk with exponential backoff
          const delay = Math.pow(2, chunk.retries) * 1000;
          toast(`⏰ Retrying chunk ${i + 1} in ${delay / 1000}s...`, {
            duration: delay - 500,
            style: { background: '#dbeafe', color: '#1e40af' }
          });
          
          await new Promise(resolve => setTimeout(resolve, delay));
          i--; // Retry this chunk
          continue;
        } else {
          // Max retries exceeded for this chunk
          setUploadState(prev => ({
            ...prev,
            chunksFailed: prev.chunksFailed + 1,
          }));
          
          const retries = chunk ? chunk.retries : 0;
          throw new Error(`Chunk ${i + 1} failed after ${retries} retries: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }
  }, [progressiveUploadMutation, adminToken, uploadState.connectionStatus]);

  const scheduleRetry = useCallback((delay: number = 5000) => {
    setRetryState(prev => {
      const newAttempts = prev.attempts + 1;
      const retryDelay = prev.exponentialBackoff ? Math.pow(2, newAttempts) * delay : delay;
      
      return {
        ...prev,
        attempts: newAttempts,
        nextRetryIn: retryDelay,
      };
    });
    
    setUploadState(prev => ({
      ...prev,
      phase: 'retrying',
      message: `Retrying in ${Math.ceil(retryState.nextRetryIn / 1000)}s...`,
    }));
    
    const timer = setTimeout(() => {
      if (selectedFile) {
        handleUpload(selectedFile, adaptiveChunkSize);
      }
    }, retryState.nextRetryIn);
    
    setRetryState(prev => ({ ...prev, retryTimer: timer }));
  }, [selectedFile, adaptiveChunkSize, retryState.nextRetryIn]);

  const handleUpload = useCallback(async (
    file: File, 
    chunkSizeMB: number = adaptiveChunkSize, 
    forceChunking: boolean = false
  ) => {
    if (!adminToken) {
      toast.error('Authentication required. Please log in and try again.');
      return;
    }
    
    // Reset state
    setUploadState({
      phase: 'preparing',
      progress: 0,
      message: 'Preparing upload...',
      chunksTotal: 0,
      chunksUploaded: 0,
      chunksFailed: 0,
      canRetry: false,
      useChunking: forceChunking || file.size > 25 * 1024 * 1024, // 25MB threshold
      connectionStatus: uploadState.connectionStatus,
    });
    
    setRetryState({
      attempts: 0,
      maxAttempts: maxRetries,
      nextRetryIn: 0,
      exponentialBackoff: true,
    });
    
    // Create new abort controller
    abortControllerRef.current = new AbortController();
    
    try {
      const shouldUseChunking = forceChunking || file.size > 25 * 1024 * 1024;
      
      if (shouldUseChunking) {
        // Use chunked upload
        const newSessionId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        setSessionId(newSessionId);
        
        const fileChunks = await createFileChunks(file, chunkSizeMB);
        setChunks(fileChunks);
        
        await uploadChunksSequentially(fileChunks, file, newSessionId);
      } else {
        // Use standard upload
        setUploadState(prev => ({
          ...prev,
          phase: 'uploading',
          message: 'Converting and uploading...',
          progress: 20,
        }));
        
        const base64Content = await fileToBase64(file);
        
        setUploadState(prev => ({
          ...prev,
          progress: 60,
          message: 'Processing on server...',
        }));
        
        // Use type assertion to avoid return type error
        (standardUploadMutation.mutate as any)({
          adminToken,
          fileName: file.name,
          fileContent: base64Content,
          fileType: file.type || 'image/jpeg',
        });
      }
      
    } catch (error) {
      console.error('Upload error:', error);
      
      const errorInfo = getUploadErrorMessage(error instanceof Error ? error.message : 'Upload failed');
      
      setUploadState(prev => ({
        ...prev,
        phase: 'error',
        error: errorInfo.message,
        canRetry: errorInfo.canRetry,
      }));
      
      toast.error(`❌ ${errorInfo.message}`, { duration: 8000 });
      onError?.(error);
    }
  }, [adminToken, adaptiveChunkSize, maxRetries, createFileChunks, uploadChunksSequentially, standardUploadMutation, onError, uploadState.connectionStatus]);

  const handleFileSelect = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    
    if (fileArray.length === 0) return;
    
    // Only handle single file and ensure it's a File object
    const file = fileArray[0] as File;
    if (!file) return; // Safety check
    
    // Validate file
    const validation = validateImageFile(file);
    
    if (!validation.valid) {
      const errorInfo = getUploadErrorMessage(validation.error || 'Invalid file');
      toast.error(`❌ ${file.name}: ${errorInfo.message}`, { duration: 8000 });
      
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
    
    // Set selected file and create preview
    setSelectedFile(file);
    
    try {
      const previewUrl = URL.createObjectURL(file);
      setPreviewUrl(previewUrl);
      
      // Auto-upload - file is guaranteed to be defined here
      const uploadFile = file;
      setTimeout(() => handleUpload(uploadFile, adaptiveChunkSize), 500);
      
    } catch (error: unknown) {
      console.error('Failed to create preview:', error);
      toast.error('Failed to create image preview');
    }
  }, [handleUpload, onError]);

  const handleCancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    if (retryState.retryTimer) {
      clearTimeout(retryState.retryTimer);
    }
    
    setUploadState(prev => ({
      ...prev,
      phase: 'idle',
      progress: 0,
      message: '',
      error: undefined,
    }));
    
    setSelectedFile(null);
    setPreviewUrl("");
    setChunks([]);
    setSessionId("");
    
    toast('Upload cancelled', { duration: 2000 });
  }, [retryState.retryTimer]);

  const handleRetry = useCallback(() => {
    if (selectedFile) {
      handleUpload(selectedFile, adaptiveChunkSize);
    }
  }, [selectedFile, adaptiveChunkSize, handleUpload]);

  const isUploading = uploadState.phase === 'uploading' || uploadState.phase === 'preparing';
  const canCancel = isUploading || uploadState.phase === 'retrying';

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Connection Status Indicator */}
      {uploadState.connectionStatus !== 'online' && (
        <div className={`flex items-center space-x-2 p-2 rounded-lg text-sm ${
          uploadState.connectionStatus === 'offline' 
            ? 'bg-red-50 text-red-700 border border-red-200' 
            : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
        }`}>
          {uploadState.connectionStatus === 'offline' ? (
            <WifiOff className="h-4 w-4" />
          ) : (
            <Wifi className="h-4 w-4" />
          )}
          <span>
            {uploadState.connectionStatus === 'offline' 
              ? 'No internet connection - uploads will resume when connection is restored'
              : 'Unstable connection detected - chunked upload recommended'
            }
          </span>
        </div>
      )}

      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 ${
          dragOver
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10 scale-[1.02]'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const files = Array.from(e.dataTransfer.files);
          if (files.length > 0) handleFileSelect(files);
        }}
        onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          disabled={disabled || isUploading}
          onChange={(e) => {
            const files = e.target.files;
            if (files) handleFileSelect(files);
          }}
        />
        
        {isUploading ? (
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              {uploadState.useChunking && (
                <Shield className="h-4 w-4 absolute -top-1 -right-1 text-green-600" />
              )}
            </div>
            
            <div className="w-full max-w-xs">
              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                <span>{uploadState.phase}</span>
                <span>{uploadState.progress.toFixed(0)}%</span>
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
            
            {uploadState.useChunking && (
              <div className="flex items-center space-x-2 text-xs text-green-600">
                <Zap className="h-3 w-3" />
                <span>Chunked Upload: {uploadState.chunksUploaded}/{uploadState.chunksTotal}</span>
              </div>
            )}
            
            {canCancel && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCancel();
                }}
                className="text-xs text-red-600 hover:text-red-700 underline"
              >
                Cancel Upload
              </button>
            )}
          </div>
        ) : uploadState.phase === 'error' ? (
          <div className="flex flex-col items-center space-y-3">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <p className="text-sm text-red-600 dark:text-red-400">
              {uploadState.error}
            </p>
            {uploadState.canRetry && (
              <div className="flex items-center space-x-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRetry();
                  }}
                  className="inline-flex items-center space-x-1 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Retry</span>
                </button>
                
                {autoRetry && retryState.attempts < retryState.maxAttempts && (
                  <span className="text-xs text-red-600">
                    Auto-retry in {Math.ceil(retryState.nextRetryIn / 1000)}s
                  </span>
                )}
              </div>
            )}
          </div>
        ) : uploadState.phase === 'complete' ? (
          <div className="flex flex-col items-center space-y-3">
            <Check className="h-8 w-8 text-green-600" />
            <p className="text-sm font-medium text-green-800 dark:text-green-200">
              Upload completed successfully!
            </p>
            {uploadState.useChunking && (
              <p className="text-xs text-green-700 dark:text-green-300">
                Uploaded using chunked transfer for reliability
              </p>
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
                <span>Chunked Upload</span>
                <span>•</span>
                <RefreshCw className="h-3 w-3" />
                <span>Auto Retry</span>
                <span>•</span>
                <Clock className="h-3 w-3" />
                <span>413 Recovery</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                Supports files up to {maxFileSize}MB • Automatic chunking for large files
              </p>
            </div>
          </div>
        )}
      </div>
      
      {/* Upload Details */}
      {(uploadState.useChunking || chunks.length > 0) && (
        <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center justify-between w-full text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            <span>Upload Details</span>
            {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          
          {showDetails && (
            <div className="mt-3 space-y-2 text-xs text-gray-600 dark:text-gray-400">
              <div className="grid grid-cols-2 gap-4">
                <div>Chunk Size: {adaptiveChunkSize}MB</div>
                <div>Session ID: {sessionId.slice(-8) || 'Not started'}</div>
                <div>Total Chunks: {uploadState.chunksTotal}</div>
                <div>Uploaded: {uploadState.chunksUploaded}</div>
                <div>Failed: {uploadState.chunksFailed}</div>
                <div>Connection: {uploadState.connectionStatus}</div>
              </div>
              
              {chunks.length > 0 && (
                <div className="mt-3">
                  <div className="text-xs font-medium mb-1">Chunk Status:</div>
                  <div className="grid grid-cols-10 gap-1">
                    {chunks.map((chunk, index) => (
                      <div
                        key={index}
                        className={`h-2 rounded-sm ${
                          chunk.uploaded 
                            ? 'bg-green-500' 
                            : chunk.error 
                            ? 'bg-red-500' 
                            : 'bg-gray-300'
                        }`}
                        title={`Chunk ${index + 1}: ${chunk.uploaded ? 'Uploaded' : chunk.error ? 'Failed' : 'Pending'}`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Preview */}
      {previewUrl && (
        <div className="mt-4">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Selected Image:
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
          {selectedFile && (
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {selectedFile.name} • {formatFileSize(selectedFile.size)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
