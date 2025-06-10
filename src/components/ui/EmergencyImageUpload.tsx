import React, { useState, useRef, useCallback } from 'react';
import { useUserStore } from '../../stores/userStore';
import { formatFileSize } from '../../constants/validation';
import { toast } from 'react-hot-toast';
import {
  Upload,
  AlertTriangle,
  Loader2,
  Check,
  X,
  RefreshCw,
  FileText,
} from 'lucide-react';

interface EmergencyImageUploadProps {
  onSuccess: (filePath: string) => void;
  onError?: (error: any) => void;
  className?: string;
  disabled?: boolean;
  maxFileSize?: number; // in MB, default 50MB for emergency
}

interface EmergencyUploadState {
  isUploading: boolean;
  progress: number;
  message: string;
  error?: string;
  lastAttempt?: Date;
  requestId?: string;
}

export function EmergencyImageUpload({
  onSuccess,
  onError,
  className = "",
  disabled = false,
  maxFileSize = 50, // 50MB emergency limit
}: EmergencyImageUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [uploadState, setUploadState] = useState<EmergencyUploadState>({
    isUploading: false,
    progress: 0,
    message: '',
  });
  const [apiLogs, setApiLogs] = useState<Array<{
    timestamp: Date;
    type: 'request' | 'response' | 'error';
    data: any;
  }>>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { adminToken } = useUserStore();

  // Enhanced logging for emergency upload debugging
  const logEmergency = useCallback((message: string, data?: any, type: 'info' | 'warn' | 'error' = 'info') => {
    const timestamp = new Date();
    const logEntry = {
      timestamp,
      type: type as 'request' | 'response' | 'error',
      data: { message, ...data }
    };
    
    setApiLogs(prev => [...prev.slice(-9), logEntry]); // Keep last 10 logs
    
    const prefix = `🚨 EMERGENCY UPLOAD [${timestamp.toISOString()}]`;
    
    switch (type) {
      case 'error':
        console.error(`❌ ${prefix} - ${message}`, data || '');
        break;
      case 'warn':
        console.warn(`⚠️ ${prefix} - ${message}`, data || '');
        break;
      default:
        console.log(`${prefix} - ${message}`, data || '');
    }
  }, []);

  // Minimal file validation for emergency upload
  const validateEmergencyFile = useCallback((file: File): { valid: boolean; error?: string } => {
    logEmergency('Starting emergency file validation', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });
    
    // Basic type check
    if (!file.type.startsWith('image/')) {
      return { valid: false, error: 'File must be an image' };
    }
    
    // Size check
    const maxBytes = maxFileSize * 1024 * 1024;
    if (file.size > maxBytes) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      return { 
        valid: false, 
        error: `File too large (${sizeMB}MB). Emergency upload limit is ${maxFileSize}MB.` 
      };
    }
    
    // Minimum size check
    if (file.size < 100) {
      return { valid: false, error: 'File too small or corrupted' };
    }
    
    logEmergency('Emergency file validation passed', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });
    
    return { valid: true };
  }, [maxFileSize, logEmergency]);

  const handleFileSelect = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    
    if (fileArray.length === 0) return;
    
    const file = fileArray[0]; // Only take first file for emergency
    
    logEmergency('Emergency file selected', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      lastModified: file.lastModified
    });
    
    // Clear previous state
    setUploadState({
      isUploading: false,
      progress: 0,
      message: '',
    });
    
    // Validate file
    const validation = validateEmergencyFile(file);
    if (!validation.valid) {
      logEmergency('Emergency file validation failed', {
        error: validation.error,
        fileName: file.name
      }, 'error');
      
      setUploadState({
        isUploading: false,
        progress: 0,
        message: '',
        error: validation.error,
      });
      
      toast.error(`❌ ${validation.error}`, { duration: 6000 });
      onError?.(new Error(validation.error || 'Invalid file'));
      return;
    }
    
    setSelectedFile(file);
    
    // Create preview with error handling
    try {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        if (e.target?.result) {
          setPreviewUrl(e.target.result as string);
          logEmergency('Emergency preview created', {
            fileName: file.name,
            previewLength: (e.target.result as string).length
          });
        }
      };
      
      reader.onerror = () => {
        logEmergency('Emergency preview creation failed', {
          fileName: file.name
        }, 'error');
        toast.error('Failed to create preview');
      };
      
      reader.readAsDataURL(file);
      
    } catch (error) {
      logEmergency('Emergency preview error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        fileName: file.name
      }, 'error');
    }
    
  }, [validateEmergencyFile, onError, logEmergency]);

  const handleEmergencyUpload = useCallback(async () => {
    if (!selectedFile || !adminToken) {
      if (!adminToken) {
        logEmergency('Emergency upload failed - no admin token', {}, 'error');
        toast.error('Authentication required. Please log in and try again.');
      }
      return;
    }
    
    const requestId = `emergency_req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    setUploadState({
      isUploading: true,
      progress: 10,
      message: 'Starting emergency upload...',
      requestId,
      lastAttempt: new Date(),
    });
    
    logEmergency('=== EMERGENCY UPLOAD STARTED ===', {
      requestId,
      fileName: selectedFile.name,
      fileSize: selectedFile.size,
      fileType: selectedFile.type,
      adminTokenPresent: !!adminToken,
      adminTokenLength: adminToken.length,
      timestamp: new Date().toISOString()
    });
    
    try {
      // Convert to base64 with progress tracking
      setUploadState(prev => ({
        ...prev,
        progress: 20,
        message: 'Converting file...',
      }));
      
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = (e) => {
          if (e.target?.result) {
            resolve(e.target.result as string);
          } else {
            reject(new Error('Failed to read file'));
          }
        };
        reader.onerror = () => reject(new Error('FileReader error'));
        reader.readAsDataURL(selectedFile);
      });
      
      const base64Content = await base64Promise;
      
      logEmergency('Emergency file conversion completed', {
        requestId,
        fileName: selectedFile.name,
        base64Length: base64Content.length,
        estimatedSize: Math.round(base64Content.length * 0.75)
      });
      
      setUploadState(prev => ({
        ...prev,
        progress: 40,
        message: 'Uploading to server...',
      }));
      
      // Prepare emergency payload
      const emergencyPayload = {
        adminToken,
        fileName: `emergency_${Date.now()}_${selectedFile.name}`,
        fileContent: base64Content,
        fileType: selectedFile.type || 'image/jpeg',
      };
      
      logEmergency('=== EMERGENCY API CALL ===', {
        requestId,
        endpoint: '/api/trpc/adminUploadImage',
        method: 'POST',
        payload: {
          fileName: emergencyPayload.fileName,
          fileType: emergencyPayload.fileType,
          adminTokenLength: emergencyPayload.adminToken.length,
          contentLength: emergencyPayload.fileContent.length,
        },
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      });
      
      setApiLogs(prev => [...prev.slice(-9), {
        timestamp: new Date(),
        type: 'request',
        data: {
          requestId,
          endpoint: '/api/trpc/adminUploadImage',
          payload: {
            fileName: emergencyPayload.fileName,
            fileType: emergencyPayload.fileType,
            adminTokenLength: emergencyPayload.adminToken.length,
            contentLength: emergencyPayload.fileContent.length,
          }
        }
      }]);
      
      setUploadState(prev => ({
        ...prev,
        progress: 60,
        message: 'Sending request...',
      }));
      
      // Make direct fetch call to bypass mutation complexity
      const fetchStartTime = Date.now();
      const response = await fetch('/api/trpc/adminUploadImage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          json: emergencyPayload,
        }),
      });
      
      const fetchDuration = Date.now() - fetchStartTime;
      
      logEmergency('=== EMERGENCY API RESPONSE ===', {
        requestId,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        fetchDuration,
        timestamp: new Date().toISOString()
      });
      
      setUploadState(prev => ({
        ...prev,
        progress: 80,
        message: 'Processing response...',
      }));
      
      const responseText = await response.text();
      
      logEmergency('Emergency API raw response received', {
        requestId,
        responseLength: responseText.length,
        responsePreview: responseText.substring(0, 200) + (responseText.length > 200 ? '...' : ''),
        status: response.status,
        ok: response.ok
      });
      
      setApiLogs(prev => [...prev.slice(-9), {
        timestamp: new Date(),
        type: 'response',
        data: {
          requestId,
          status: response.status,
          statusText: response.statusText,
          responseLength: responseText.length,
          fetchDuration
        }
      }]);
      
      if (!response.ok) {
        throw new Error(`Emergency upload failed: ${response.status} ${response.statusText}\n${responseText}`);
      }
      
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        logEmergency('Emergency response parsing failed', {
          requestId,
          parseError: parseError instanceof Error ? parseError.message : 'Unknown parse error',
          responseText: responseText.substring(0, 500)
        }, 'error');
        
        throw new Error(`Failed to parse server response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
      }
      
      logEmergency('Emergency upload response parsed', {
        requestId,
        result: result,
        hasFilePath: !!(result.result?.data?.filePath || result.result?.data?.json?.filePath),
        success: result.result?.data?.success
      });
      
      setUploadState(prev => ({
        ...prev,
        progress: 100,
        message: 'Upload completed!',
      }));
      
      // Extract file path from various possible response structures
      const filePath = result.result?.data?.filePath || 
                      result.result?.data?.json?.filePath ||
                      result.data?.filePath ||
                      result.filePath;
      
      if (filePath && typeof filePath === 'string' && filePath.trim() !== '') {
        logEmergency('=== EMERGENCY UPLOAD SUCCESS ===', {
          requestId,
          filePath,
          filePathLength: filePath.length,
          totalDuration: Date.now() - (uploadState.lastAttempt?.getTime() || Date.now()),
          fileName: selectedFile.name
        });
        
        onSuccess(filePath);
        toast.success('✅ Emergency upload successful!');
        
        // Clear state
        setSelectedFile(null);
        setPreviewUrl("");
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        
        setUploadState({
          isUploading: false,
          progress: 0,
          message: '',
        });
        
      } else {
        throw new Error('Emergency upload completed but no file path returned');
      }
      
    } catch (error) {
      const totalDuration = Date.now() - (uploadState.lastAttempt?.getTime() || Date.now());
      
      logEmergency('=== EMERGENCY UPLOAD FAILED ===', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        fileName: selectedFile.name,
        totalDuration,
        stack: error instanceof Error ? error.stack : 'No stack trace'
      }, 'error');
      
      setApiLogs(prev => [...prev.slice(-9), {
        timestamp: new Date(),
        type: 'error',
        data: {
          requestId,
          error: error instanceof Error ? error.message : 'Unknown error',
          totalDuration
        }
      }]);
      
      setUploadState({
        isUploading: false,
        progress: 0,
        message: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      toast.error(`❌ Emergency upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      onError?.(error);
    }
  }, [selectedFile, adminToken, onSuccess, onError, uploadState.lastAttempt, logEmergency]);

  const handleClear = useCallback(() => {
    logEmergency('Clearing emergency upload state');
    
    setSelectedFile(null);
    setPreviewUrl("");
    setUploadState({
      isUploading: false,
      progress: 0,
      message: '',
    });
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [logEmergency]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files);
    }
  }, [handleFileSelect]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Emergency Upload Header */}
      <div className="flex items-center space-x-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
        <AlertTriangle className="h-5 w-5 text-yellow-600" />
        <div>
          <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
            🚨 Emergency Upload Mode
          </h3>
          <p className="text-xs text-yellow-700 dark:text-yellow-300">
            Simplified upload with minimal processing and comprehensive logging
          </p>
        </div>
      </div>

      {/* Upload Area */}
      <div
        className="relative border-2 border-dashed border-yellow-300 dark:border-yellow-600 rounded-lg p-6 text-center transition-all duration-200 hover:border-yellow-400 dark:hover:border-yellow-500 cursor-pointer"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && !uploadState.isUploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          disabled={disabled || uploadState.isUploading}
          onChange={(e) => {
            const files = e.target.files;
            if (files) handleFileSelect(files);
          }}
        />
        
        {uploadState.isUploading ? (
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-yellow-600" />
            <div className="w-full max-w-xs">
              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                <span>Emergency Upload</span>
                <span>{uploadState.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-yellow-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadState.progress}%` }}
                />
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {uploadState.message}
            </p>
            {uploadState.requestId && (
              <p className="text-xs text-gray-500">
                Request ID: {uploadState.requestId}
              </p>
            )}
          </div>
        ) : uploadState.error ? (
          <div className="flex flex-col items-center space-y-3">
            <X className="h-8 w-8 text-red-500" />
            <p className="text-sm text-red-600 dark:text-red-400">
              {uploadState.error}
            </p>
            <button
              onClick={handleClear}
              className="text-xs text-blue-600 hover:text-blue-700 underline"
            >
              Clear and Try Again
            </button>
          </div>
        ) : selectedFile ? (
          <div className="flex flex-col items-center space-y-3">
            <Check className="h-8 w-8 text-green-600" />
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {selectedFile.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEmergencyUpload();
                }}
                disabled={!adminToken}
                className="px-4 py-2 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 disabled:opacity-50"
              >
                Emergency Upload
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear();
                }}
                className="px-4 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
              >
                Clear
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-3">
            <Upload className="h-8 w-8 text-yellow-600" />
            <div className="space-y-1">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Emergency Upload - Minimal Processing
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                Click to browse or drag and drop • Max {maxFileSize}MB • Bypasses complex processing
              </p>
            </div>
          </div>
        )}
      </div>
      
      {/* File Preview */}
      {previewUrl && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Preview:
          </p>
          <div className="w-full h-32 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
            <img
              src={previewUrl}
              alt="Emergency upload preview"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      )}

      {/* API Logs Panel */}
      {apiLogs.length > 0 && (
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center space-x-1">
              <FileText className="h-4 w-4" />
              <span>API Call Logs</span>
            </h4>
            <button
              onClick={() => setApiLogs([])}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Clear
            </button>
          </div>
          
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {apiLogs.map((log, index) => (
              <div key={index} className="text-xs p-2 rounded bg-white dark:bg-gray-700">
                <div className="flex items-center justify-between">
                  <span className={`font-medium ${
                    log.type === 'error' ? 'text-red-600' :
                    log.type === 'response' ? 'text-green-600' :
                    'text-blue-600'
                  }`}>
                    {log.type.toUpperCase()}
                  </span>
                  <span className="text-gray-500">
                    {log.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <div className="mt-1 text-gray-600 dark:text-gray-400">
                  {JSON.stringify(log.data, null, 2).substring(0, 200)}
                  {JSON.stringify(log.data).length > 200 && '...'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Debug Information */}
      <div className="mt-4 p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs space-y-1">
        <div><strong>Emergency Upload Debug:</strong></div>
        <div>Selected File: {selectedFile?.name || 'None'}</div>
        <div>File Size: {selectedFile ? formatFileSize(selectedFile.size) : 'N/A'}</div>
        <div>Admin Token: {adminToken ? `Present (${adminToken.length} chars)` : 'Missing'}</div>
        <div>Upload State: {uploadState.isUploading ? 'Uploading' : 'Ready'}</div>
        <div>Last Attempt: {uploadState.lastAttempt?.toLocaleString() || 'None'}</div>
        <div>Request ID: {uploadState.requestId || 'None'}</div>
        <div>API Logs: {apiLogs.length} entries</div>
      </div>
    </div>
  );
}
