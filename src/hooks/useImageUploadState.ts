import { useCallback, useEffect, useState } from 'react';
import { useUserStore } from '~/stores/userStore';

interface UploadProgressState {
  phase: 'preparing' | 'uploading' | 'processing' | 'verifying' | 'complete' | 'error';
  percentage: number;
  message: string;
  strategy?: string;
  warnings?: string[];
  verificationAttempts?: number;
  verificationMaxAttempts?: number;
}

interface ImageUploadState {
  id?: string;
  fileName: string;
  filePath?: string;
  progress: UploadProgressState;
  retryCount: number;
  maxRetries: number;
  error?: string;
  startTime: number;
  endTime?: number;
  isActive: boolean;
}

export function useImageUploadState() {
  const { 
    addUpload, 
    updateUpload, 
    removeUpload, 
    getUploadById, 
    getUploadsByStatus,
    clearOldUploads 
  } = useUserStore();
  
  const [activeUploads, setActiveUploads] = useState<Map<string, ImageUploadState>>(new Map());
  
  // Clean old uploads on mount
  useEffect(() => {
    clearOldUploads();
  }, [clearOldUploads]);
  
  // Start a new upload
  const startUpload = useCallback((fileName: string): string => {
    const uploadState: ImageUploadState = {
      fileName,
      progress: {
        phase: 'preparing',
        percentage: 0,
        message: 'Preparing upload...',
      },
      retryCount: 0,
      maxRetries: 3,
      startTime: Date.now(),
      isActive: true,
    };
    
    // Add to persistent store
    const id = addUpload({
      fileName,
      status: 'uploading',
      progress: 0,
      retryCount: 0,
    });
    
    uploadState.id = id;
    
    // Add to active uploads
    setActiveUploads(prev => new Map(prev).set(id, uploadState));
    
    console.log('Started upload tracking:', { id, fileName });
    
    return id;
  }, [addUpload]);
  
  // Update upload progress
  const updateUploadProgress = useCallback((
    id: string, 
    progress: Partial<UploadProgressState>,
    additionalData?: Partial<ImageUploadState>
  ) => {
    setActiveUploads(prev => {
      const current = prev.get(id);
      if (!current) return prev;
      
      const updated = {
        ...current,
        progress: { ...current.progress, ...progress },
        ...additionalData,
      };
      
      // Update persistent store
      updateUpload(id, {
        status: progress.phase === 'complete' ? 'verified' :
                progress.phase === 'error' ? 'failed' :
                progress.phase === 'verifying' ? 'verifying' :
                progress.phase === 'processing' ? 'processing' : 'uploading',
        progress: progress.percentage || current.progress.percentage,
        error: additionalData?.error,
        retryCount: additionalData?.retryCount || current.retryCount,
        verificationAttempts: progress.verificationAttempts,
      });
      
      const newMap = new Map(prev);
      newMap.set(id, updated);
      return newMap;
    });
  }, [updateUpload]);
  
  // Complete upload successfully
  const completeUpload = useCallback((id: string, filePath: string) => {
    setActiveUploads(prev => {
      const current = prev.get(id);
      if (!current) return prev;
      
      const updated = {
        ...current,
        filePath,
        progress: {
          ...current.progress,
          phase: 'complete' as const,
          percentage: 100,
          message: 'Upload completed successfully!',
        },
        endTime: Date.now(),
        isActive: false,
      };
      
      // Update persistent store
      updateUpload(id, {
        filePath,
        status: 'verified',
        progress: 100,
      });
      
      const newMap = new Map(prev);
      newMap.set(id, updated);
      return newMap;
    });
    
    console.log('Completed upload tracking:', { id, filePath });
  }, [updateUpload]);
  
  // Fail upload
  const failUpload = useCallback((id: string, error: string) => {
    setActiveUploads(prev => {
      const current = prev.get(id);
      if (!current) return prev;
      
      const updated = {
        ...current,
        error,
        progress: {
          ...current.progress,
          phase: 'error' as const,
          message: 'Upload failed',
        },
        endTime: Date.now(),
        isActive: false,
      };
      
      // Update persistent store
      updateUpload(id, {
        status: 'failed',
        error,
      });
      
      const newMap = new Map(prev);
      newMap.set(id, updated);
      return newMap;
    });
    
    console.log('Failed upload tracking:', { id, error });
  }, [updateUpload]);
  
  // Retry upload
  const retryUpload = useCallback((id: string) => {
    setActiveUploads(prev => {
      const current = prev.get(id);
      if (!current) return prev;
      
      const updated = {
        ...current,
        retryCount: current.retryCount + 1,
        progress: {
          ...current.progress,
          phase: 'preparing' as const,
          percentage: 0,
          message: `Retrying upload (${current.retryCount + 1}/${current.maxRetries})...`,
        },
        error: undefined,
        isActive: true,
      };
      
      // Update persistent store
      updateUpload(id, {
        status: 'uploading',
        progress: 0,
        retryCount: updated.retryCount,
        error: undefined,
      });
      
      const newMap = new Map(prev);
      newMap.set(id, updated);
      return newMap;
    });
    
    console.log('Retrying upload:', { id });
  }, [updateUpload]);
  
  // Remove upload from tracking
  const removeUploadTracking = useCallback((id: string) => {
    setActiveUploads(prev => {
      const newMap = new Map(prev);
      newMap.delete(id);
      return newMap;
    });
    
    // Remove from persistent store
    removeUpload(id);
    
    console.log('Removed upload tracking:', { id });
  }, [removeUpload]);
  
  // Get upload by ID
  const getUpload = useCallback((id: string): ImageUploadState | undefined => {
    return activeUploads.get(id);
  }, [activeUploads]);
  
  // Get all active uploads
  const getActiveUploads = useCallback((): ImageUploadState[] => {
    return Array.from(activeUploads.values()).filter(upload => upload.isActive);
  }, [activeUploads]);
  
  // Get uploads by phase
  const getUploadsByPhase = useCallback((phase: UploadProgressState['phase']): ImageUploadState[] => {
    return Array.from(activeUploads.values()).filter(upload => upload.progress.phase === phase);
  }, [activeUploads]);
  
  // Check if any uploads are in progress
  const hasActiveUploads = useCallback((): boolean => {
    return Array.from(activeUploads.values()).some(upload => upload.isActive);
  }, [activeUploads]);
  
  // Get upload statistics
  const getUploadStats = useCallback(() => {
    const uploads = Array.from(activeUploads.values());
    
    return {
      total: uploads.length,
      active: uploads.filter(u => u.isActive).length,
      completed: uploads.filter(u => u.progress.phase === 'complete').length,
      failed: uploads.filter(u => u.progress.phase === 'error').length,
      verifying: uploads.filter(u => u.progress.phase === 'verifying').length,
      processing: uploads.filter(u => u.progress.phase === 'processing').length,
    };
  }, [activeUploads]);
  
  // Recovery: restore active uploads from persistent store on mount
  useEffect(() => {
    const persistentUploads = getUploadsByStatus('uploading')
      .concat(getUploadsByStatus('processing'))
      .concat(getUploadsByStatus('verifying'));
    
    if (persistentUploads.length > 0) {
      console.log('Recovering uploads from persistent store:', persistentUploads.length);
      
      const recoveredUploads = new Map<string, ImageUploadState>();
      
      persistentUploads.forEach(upload => {
        const uploadState: ImageUploadState = {
          id: upload.id,
          fileName: upload.fileName,
          filePath: upload.filePath,
          progress: {
            phase: upload.status === 'verifying' ? 'verifying' :
                   upload.status === 'processing' ? 'processing' : 'uploading',
            percentage: upload.progress,
            message: 'Recovered from previous session',
          },
          retryCount: upload.retryCount,
          maxRetries: 3,
          startTime: upload.timestamp,
          isActive: false, // Mark as inactive since we're recovering
        };
        
        recoveredUploads.set(upload.id, uploadState);
      });
      
      setActiveUploads(recoveredUploads);
    }
  }, [getUploadsByStatus]);
  
  return {
    // State management
    startUpload,
    updateUploadProgress,
    completeUpload,
    failUpload,
    retryUpload,
    removeUploadTracking,
    
    // Queries
    getUpload,
    getActiveUploads,
    getUploadsByPhase,
    hasActiveUploads,
    getUploadStats,
    
    // Current state
    activeUploads: Array.from(activeUploads.values()),
  };
}
