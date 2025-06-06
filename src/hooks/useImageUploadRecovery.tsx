import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useUserStore } from '~/stores/userStore';
import { getUploadErrorMessage } from '~/constants/validation';
import { toast } from 'react-hot-toast';
import { debounce } from '~/utils';

interface ComponentHealth {
  status: 'unknown' | 'healthy' | 'degraded' | 'unhealthy';
  errorCount: number;
  lastError: Date | null;
  lastSuccess: Date | null;
  totalUploads: number;
  successfulUploads: number;
}

interface RecoveryState {
  isRecovering: boolean;
  recoveryAttempts: number;
  maxRecoveryAttempts: number;
  lastRecoveryTime: Date | null;
  recoveryStrategy: 'retry' | 'reset' | null;
}

interface UploadError {
  message: string;
  category: 'network' | 'format' | 'size' | 'processing' | 'auth' | 'verification' | 'unknown';
  component: string;
  timestamp: Date;
  canRetry: boolean;
  suggestions: string[];
  recoveryAction?: string;
  filePath?: string;
}

interface UseImageUploadRecoveryOptions {
  enableAutoRecovery?: boolean;
  enableAutoFallback?: boolean;
  maxErrorsBeforeFallback?: number;
  recoveryDelay?: number;
  debugMode?: boolean;
  componentId?: string;
}

interface UseImageUploadRecoveryReturn {
  // Component health monitoring - simplified to only simple and emergency
  componentHealth: {
    SimpleInnovatorImageUpload: ComponentHealth;
    EmergencyImageUpload: ComponentHealth;
  };
  
  // Error tracking
  recentErrors: UploadError[];
  activeError: UploadError | null;
  
  // Recovery state
  recoveryState: RecoveryState;
  
  // Recovery actions
  reportError: (error: any, component: string) => void;
  reportSuccess: (component: string, result?: any) => void;
  clearErrors: () => void;
  triggerRecovery: (strategy?: 'retry' | 'reset') => Promise<boolean>;
  
  // Component selection - simplified
  getRecommendedComponent: () => 'SimpleInnovatorImageUpload' | 'EmergencyImageUpload';
  shouldFallback: (fromComponent: string) => boolean;
  
  // Health assessment
  assessOverallHealth: () => 'healthy' | 'degraded' | 'unhealthy';
  getHealthReport: () => any;
}

// Safe default values to prevent uninitialized variables
const createDefaultComponentHealth = (): ComponentHealth => ({
  status: 'unknown',
  errorCount: 0,
  lastError: null,
  lastSuccess: null,
  totalUploads: 0,
  successfulUploads: 0,
});

const createDefaultRecoveryState = (): RecoveryState => ({
  isRecovering: false,
  recoveryAttempts: 0,
  maxRecoveryAttempts: 3,
  lastRecoveryTime: null,
  recoveryStrategy: null,
});

const createDefaultOptions = (options: UseImageUploadRecoveryOptions = {}): Required<UseImageUploadRecoveryOptions> => ({
  enableAutoRecovery: options.enableAutoRecovery ?? true,
  enableAutoFallback: options.enableAutoFallback ?? true,
  maxErrorsBeforeFallback: options.maxErrorsBeforeFallback ?? 3,
  recoveryDelay: options.recoveryDelay ?? 2000,
  debugMode: options.debugMode ?? false,
  componentId: options.componentId ?? 'upload-recovery',
});

export function useImageUploadRecovery(options: UseImageUploadRecoveryOptions = {}): UseImageUploadRecoveryReturn {
  // Defensive initialization of all options with safe defaults
  const safeOptions = useMemo(() => createDefaultOptions(options), [
    options.enableAutoRecovery,
    options.enableAutoFallback,
    options.maxErrorsBeforeFallback,
    options.recoveryDelay,
    options.debugMode,
    options.componentId,
  ]);
  
  const {
    enableAutoRecovery,
    enableAutoFallback,
    maxErrorsBeforeFallback,
    recoveryDelay,
    debugMode,
    componentId,
  } = safeOptions;
  
  // Circuit breaker: render counter to detect excessive re-renders
  const renderCountRef = useRef(0);
  const lastRenderTimeRef = useRef(Date.now());
  const maxRendersPerSecond = 10; // Emergency circuit breaker threshold
  
  // Reference equality checks for previous values - initialized with safe defaults
  const prevComponentHealthRef = useRef<typeof componentHealth>();
  const prevRecentErrorsRef = useRef<UploadError[]>([]);
  const prevActiveErrorRef = useRef<UploadError | null>(null);
  const prevRecoveryStateRef = useRef<RecoveryState>();
  
  // Component health tracking - initialized with safe defaults
  const [componentHealth, setComponentHealth] = useState<{
    SimpleInnovatorImageUpload: ComponentHealth;
    EmergencyImageUpload: ComponentHealth;
  }>(() => ({
    SimpleInnovatorImageUpload: createDefaultComponentHealth(),
    EmergencyImageUpload: createDefaultComponentHealth(),
  }));
  
  // Error tracking - initialized with safe defaults
  const [recentErrors, setRecentErrors] = useState<UploadError[]>([]);
  const [activeError, setActiveError] = useState<UploadError | null>(null);
  
  // Recovery state - initialized with safe defaults
  const [recoveryState, setRecoveryState] = useState<RecoveryState>(createDefaultRecoveryState);
  
  // User store integration with safe defaults
  const userStore = useUserStore();
  const { addUpload = () => '', updateUpload = () => {}, getUploadsByStatus = () => [] } = userStore ?? {};
  
  // Recovery timeout ref
  const recoveryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Increment render counter and check for excessive renders
  useEffect(() => {
    renderCountRef.current++;
    const now = Date.now();
    const timeSinceLastRender = now - lastRenderTimeRef.current;
    
    // Reset counter every second
    if (timeSinceLastRender > 1000) {
      renderCountRef.current = 1;
      lastRenderTimeRef.current = now;
    } else if (renderCountRef.current > maxRendersPerSecond) {
      console.error(`🚨 CIRCUIT BREAKER: useImageUploadRecovery [${componentId}] exceeded ${maxRendersPerSecond} renders per second. Possible infinite loop detected.`);
      // Emergency stop: disable auto-recovery temporarily
      if (debugMode && typeof toast?.error === 'function') {
        toast.error(`🚨 Upload recovery system paused due to excessive re-renders`, { duration: 10000 });
      }
      return;
    }
  });
  
  // Debounced state updates to prevent excessive re-renders
  const debouncedSetComponentHealth = useMemo(
    () => debounce((updateFn: (prev: typeof componentHealth) => typeof componentHealth) => {
      if (typeof updateFn === 'function') {
        setComponentHealth(updateFn);
      }
    }, 100),
    []
  );
  
  const debouncedSetRecentErrors = useMemo(
    () => debounce((updateFn: (prev: UploadError[]) => UploadError[]) => {
      if (typeof updateFn === 'function') {
        setRecentErrors(updateFn);
      }
    }, 50),
    []
  );
  
  const debouncedSetActiveError = useMemo(
    () => debounce((error: UploadError | null) => {
      setActiveError(error);
    }, 100),
    []
  );
  
  // Enhanced logging with null safety
  const logWithTimestamp = useCallback((message: string, data?: any) => {
    if (debugMode && typeof message === 'string') {
      try {
        console.log(`🔍 DEBUG: useImageUploadRecovery [${componentId}] [${new Date().toISOString()}] - ${message}`, data || '');
      } catch (error) {
        // Silently fail logging to prevent cascading errors
      }
    }
  }, [debugMode, componentId]);
  
  // Memoized computed values to prevent unnecessary recalculations
  const memoizedComponentHealth = useMemo(() => {
    // Only recalculate if the reference has actually changed
    if (prevComponentHealthRef.current !== componentHealth) {
      prevComponentHealthRef.current = componentHealth;
      return componentHealth;
    }
    return prevComponentHealthRef.current || componentHealth;
  }, [componentHealth]);
  
  const memoizedRecentErrors = useMemo(() => {
    // Only recalculate if the reference has actually changed
    if (prevRecentErrorsRef.current !== recentErrors) {
      prevRecentErrorsRef.current = recentErrors;
      return recentErrors;
    }
    return prevRecentErrorsRef.current;
  }, [recentErrors]);
  
  const memoizedActiveError = useMemo(() => {
    // Only recalculate if the reference has actually changed
    if (prevActiveErrorRef.current !== activeError) {
      prevActiveErrorRef.current = activeError;
      return activeError;
    }
    return prevActiveErrorRef.current;
  }, [activeError]);
  
  // Should fallback - MOVED BEFORE reportError to fix circular dependency
  const shouldFallback = useCallback((fromComponent: string): boolean => {
    if (!enableAutoFallback || typeof fromComponent !== 'string') return false;
    
    // Only allow fallback from SimpleInnovatorImageUpload to EmergencyImageUpload
    if (fromComponent !== 'SimpleInnovatorImageUpload') return false;
    
    const health = memoizedComponentHealth?.SimpleInnovatorImageUpload;
    if (!health) return false;
    
    // More conservative fallback threshold since we only have emergency as fallback
    return (health.errorCount ?? 0) >= maxErrorsBeforeFallback || health.status === 'unhealthy';
  }, [enableAutoFallback, memoizedComponentHealth, maxErrorsBeforeFallback]);
  
  // Clear errors - MOVED BEFORE reportError for proper initialization order
  const clearErrors = useCallback(() => {
    logWithTimestamp('Clearing all errors');
    
    setRecentErrors([]);
    setActiveError(null);
    setRecoveryState(prev => ({
      ...prev,
      isRecovering: false,
      recoveryAttempts: 0,
      recoveryStrategy: null,
    }));
  }, [logWithTimestamp]);
  
  // Trigger recovery - MOVED BEFORE reportError to fix circular dependency
  const triggerRecovery = useCallback(async (strategy: 'retry' | 'reset' = 'retry'): Promise<boolean> => {
    if (recoveryState?.isRecovering) {
      logWithTimestamp('Recovery already in progress');
      return false;
    }
    
    if ((recoveryState?.recoveryAttempts ?? 0) >= (recoveryState?.maxRecoveryAttempts ?? 3)) {
      logWithTimestamp('Max recovery attempts reached');
      return false;
    }
    
    logWithTimestamp('Triggering recovery for simple upload system:', { strategy, activeError: memoizedActiveError });
    
    setRecoveryState(prev => ({
      ...prev,
      isRecovering: true,
      recoveryAttempts: (prev?.recoveryAttempts ?? 0) + 1,
      lastRecoveryTime: new Date(),
      recoveryStrategy: strategy,
    }));
    
    try {
      switch (strategy) {
        case 'retry':
          // Clear active error and allow retry
          setActiveError(null);
          if (typeof toast === 'function') {
            toast(`🔄 Retrying simple upload (attempt ${(recoveryState?.recoveryAttempts ?? 0) + 1})...`, {
              duration: 3000,
              style: { background: '#dbeafe', color: '#1e40af' }
            });
          }
          break;
          
        case 'reset':
          // Reset all component health for simple upload system
          setComponentHealth({
            SimpleInnovatorImageUpload: createDefaultComponentHealth(),
            EmergencyImageUpload: createDefaultComponentHealth(),
          });
          
          clearErrors();
          
          if (typeof toast === 'function') {
            toast(`🔄 Reset simple upload system health...`, {
              duration: 3000,
              style: { background: '#f0f9ff', color: '#0369a1' }
            });
          }
          break;
      }
      
      // Wait for recovery to take effect
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setRecoveryState(prev => ({
        ...prev,
        isRecovering: false,
      }));
      
      logWithTimestamp('Recovery completed for simple upload system:', { strategy });
      return true;
      
    } catch (error) {
      logWithTimestamp('Recovery failed for simple upload system:', { strategy, error });
      
      setRecoveryState(prev => ({
        ...prev,
        isRecovering: false,
      }));
      
      return false;
    }
  }, [recoveryState, memoizedActiveError, logWithTimestamp, clearErrors]);
  
  // Update component health with debouncing and reference equality checks
  const updateComponentHealth = useCallback((
    component: string,
    success: boolean,
    error?: UploadError
  ) => {
    if (typeof component !== 'string') {
      logWithTimestamp('Invalid component type for health update:', { component, componentType: typeof component });
      return;
    }
    
    // Only handle SimpleInnovatorImageUpload and EmergencyImageUpload
    const baseComponent = component.replace('_Verification', '') as 'SimpleInnovatorImageUpload' | 'EmergencyImageUpload';
    
    if (!memoizedComponentHealth?.[baseComponent]) {
      logWithTimestamp('Unknown component for health update:', { component, baseComponent });
      return;
    }
    
    debouncedSetComponentHealth(prev => {
      const current = prev?.[baseComponent];
      if (!current) {
        logWithTimestamp('No current health data for component:', { baseComponent });
        return prev;
      }
      
      const newErrorCount = success ? Math.max(0, (current.errorCount ?? 0) - 1) : (current.errorCount ?? 0) + 1;
      const newTotalUploads = (current.totalUploads ?? 0) + 1;
      const newSuccessfulUploads = success ? (current.successfulUploads ?? 0) + 1 : (current.successfulUploads ?? 0);
      
      // Determine health status with more lenient thresholds for simple upload
      let newStatus: ComponentHealth['status'] = 'healthy';
      if (newErrorCount >= 5) { // Increased threshold since we only have simple upload
        newStatus = 'unhealthy';
      } else if (newErrorCount >= 3) {
        newStatus = 'degraded';
      }
      
      // Consider success rate
      const successRate = newTotalUploads > 0 ? newSuccessfulUploads / newTotalUploads : 1;
      if (successRate < 0.4 && newTotalUploads >= 5) { // More lenient thresholds
        newStatus = 'unhealthy';
      } else if (successRate < 0.7 && newTotalUploads >= 3) {
        newStatus = 'degraded';
      }
      
      const updatedHealth = {
        ...current,
        status: newStatus,
        errorCount: newErrorCount,
        lastError: success ? current.lastError : new Date(),
        lastSuccess: success ? new Date() : current.lastSuccess,
        totalUploads: newTotalUploads,
        successfulUploads: newSuccessfulUploads,
      };
      
      // Reference equality check: only update if values actually changed
      if (JSON.stringify(updatedHealth) === JSON.stringify(current)) {
        logWithTimestamp('Component health unchanged, skipping update');
        return prev;
      }
      
      logWithTimestamp('Component health updated for simple upload system:', {
        component,
        baseComponent,
        success,
        newHealth: updatedHealth,
      });
      
      return {
        ...prev,
        [baseComponent]: updatedHealth,
      };
    });
  }, [memoizedComponentHealth, logWithTimestamp, debouncedSetComponentHealth]);
  
  // Report error with debouncing and conditional guards - NOW PROPERLY INITIALIZED
  const reportError = useCallback((error: any, component: string) => {
    // Defensive parameter validation
    if (typeof component !== 'string' || !component.trim()) {
      logWithTimestamp('Invalid component parameter in reportError:', { component, componentType: typeof component });
      return;
    }
    
    // Conditional guard: prevent duplicate error reports
    if (memoizedActiveError && 
        memoizedActiveError.component === component && 
        memoizedActiveError.message === (error?.message || 'Upload failed') &&
        Date.now() - (memoizedActiveError.timestamp?.getTime?.() ?? 0) < 1000) {
      logWithTimestamp('Duplicate error report ignored', { component, message: error?.message });
      return;
    }
    
    const errorMessage = error?.message || 'Upload failed';
    let errorInfo;
    
    try {
      errorInfo = getUploadErrorMessage(errorMessage);
    } catch (getErrorInfoError) {
      logWithTimestamp('Error getting error info, using defaults:', getErrorInfoError);
      errorInfo = {
        category: 'unknown',
        canRetry: true,
        suggestions: ['Please try again'],
        adaptiveAction: 'retry',
        message: errorMessage,
      };
    }
    
    // Determine category, prioritizing error.category if provided
    let category: UploadError['category'] = error?.category || errorInfo.category || 'unknown';
    if (component.endsWith('_Verification')) {
      category = 'verification';
    }

    const uploadError: UploadError = {
      message: errorMessage,
      category,
      component,
      timestamp: new Date(),
      canRetry: error?.canRetry !== undefined ? error.canRetry : (errorInfo.canRetry ?? true),
      suggestions: error?.suggestions || errorInfo.suggestions || [],
      recoveryAction: error?.adaptiveAction || errorInfo.adaptiveAction,
      filePath: error?.filePath, // Capture filePath if available
    };
    
    logWithTimestamp('Error reported:', {
      error: uploadError,
      component,
    });
    
    // Update error tracking with debouncing
    debouncedSetRecentErrors(prev => {
      const newErrors = [uploadError, ...(prev || [])].slice(0, 10); // Keep last 10 errors
      return newErrors;
    });
    
    debouncedSetActiveError(uploadError);
    
    // Update component health
    updateComponentHealth(component, false, uploadError);
    
    // Trigger auto-recovery if enabled with conditional guard
    if (enableAutoRecovery && uploadError.canRetry && !(recoveryState?.isRecovering)) {
      const strategy = shouldFallback(component) ? 'reset' : 'retry';
      
      setTimeout(() => {
        triggerRecovery(strategy);
      }, recoveryDelay);
    }
  }, [memoizedActiveError, logWithTimestamp, debouncedSetRecentErrors, debouncedSetActiveError, updateComponentHealth, enableAutoRecovery, recoveryState?.isRecovering, recoveryDelay, shouldFallback, triggerRecovery]);
  
  // Report success with conditional guards
  const reportSuccess = useCallback((component: string, result?: any) => {
    if (typeof component !== 'string' || !component.trim()) {
      logWithTimestamp('Invalid component parameter in reportSuccess:', { component, componentType: typeof component });
      return;
    }
    
    logWithTimestamp('Success reported:', {
      component,
      result,
    });
    
    // Clear active error if from same component with conditional guard
    if (memoizedActiveError?.component === component) {
      debouncedSetActiveError(null);
    }
    
    // Update component health
    updateComponentHealth(component, true);
    
    // Reset recovery state on success with conditional guard
    if (recoveryState?.isRecovering || (recoveryState?.recoveryAttempts ?? 0) > 0) {
      setRecoveryState(prev => ({
        ...prev,
        isRecovering: false,
        recoveryAttempts: 0,
        recoveryStrategy: null,
      }));
    }
  }, [logWithTimestamp, memoizedActiveError, debouncedSetActiveError, updateComponentHealth, recoveryState?.isRecovering, recoveryState?.recoveryAttempts]);
  
  // Get recommended component
  const getRecommendedComponent = useCallback((): 'SimpleInnovatorImageUpload' | 'EmergencyImageUpload' => {
    const simpleHealth = memoizedComponentHealth?.SimpleInnovatorImageUpload;
    const emergencyHealth = memoizedComponentHealth?.EmergencyImageUpload;
    
    if (!simpleHealth) {
      return 'SimpleInnovatorImageUpload'; // Default fallback
    }
    
    // Always prefer simple upload unless it's completely unhealthy
    if (simpleHealth.status === 'unhealthy' && (simpleHealth.errorCount ?? 0) >= 5) {
      // Only recommend emergency if simple is severely compromised
      return 'EmergencyImageUpload';
    }
    
    // Default to simple upload in all other cases
    return 'SimpleInnovatorImageUpload';
  }, [memoizedComponentHealth]);
  
  // Assess overall health
  const assessOverallHealth = useCallback((): 'healthy' | 'degraded' | 'unhealthy' => {
    const simpleHealth = memoizedComponentHealth?.SimpleInnovatorImageUpload?.status ?? 'unknown';
    const emergencyHealth = memoizedComponentHealth?.EmergencyImageUpload?.status ?? 'unknown';
    
    // Simple upload is primary, so its health determines overall health
    if (simpleHealth === 'healthy') {
      return 'healthy';
    }
    
    if (simpleHealth === 'degraded') {
      return 'degraded';
    }
    
    // If simple is unhealthy, check if emergency is available
    if (emergencyHealth === 'healthy' || emergencyHealth === 'degraded') {
      return 'degraded'; // Emergency can serve as backup
    }
    
    return 'unhealthy';
  }, [memoizedComponentHealth]);
  
  // Get health report
  const getHealthReport = useCallback(() => {
    const verificationErrors = (memoizedRecentErrors || []).filter(e => e?.category === 'verification');
    return {
      overall: assessOverallHealth(),
      components: memoizedComponentHealth || {},
      recentErrors: (memoizedRecentErrors || []).length,
      verificationErrors: verificationErrors.map(e => ({
        component: e?.component ?? 'unknown',
        filePath: e?.filePath,
        message: e?.message ?? 'Unknown error',
        timestamp: e?.timestamp,
      })),
      activeError: memoizedActiveError ? {
        component: memoizedActiveError.component ?? 'unknown',
        category: memoizedActiveError.category ?? 'unknown',
        age: Date.now() - (memoizedActiveError.timestamp?.getTime?.() ?? Date.now()),
        filePath: memoizedActiveError.filePath,
      } : null,
      recovery: {
        isActive: recoveryState?.isRecovering ?? false,
        attempts: recoveryState?.recoveryAttempts ?? 0,
        strategy: recoveryState?.recoveryStrategy,
      },
      recommendations: {
        preferredComponent: getRecommendedComponent(),
        shouldUseEmergency: shouldFallback('SimpleInnovatorImageUpload'),
        systemStatus: 'simple_upload_only',
      },
    };
  }, [assessOverallHealth, memoizedComponentHealth, memoizedRecentErrors, memoizedActiveError, recoveryState, getRecommendedComponent, shouldFallback]);
  
  // Cleanup effect
  useEffect(() => {
    return () => {
      if (recoveryTimeoutRef.current) {
        clearTimeout(recoveryTimeoutRef.current);
      }
    };
  }, []);
  
  // Auto-cleanup old errors
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      
      setRecentErrors(prev => (prev || []).filter(error => (error?.timestamp?.getTime?.() ?? 0) > fiveMinutesAgo));
      
      // Clear active error if it's old
      if (memoizedActiveError && (memoizedActiveError.timestamp?.getTime?.() ?? 0) < fiveMinutesAgo) {
        setActiveError(null);
      }
    }, 60000); // Check every minute
    
    return () => clearInterval(cleanupInterval);
  }, [memoizedActiveError]);
  
  return {
    // Use memoized values to prevent unnecessary re-renders
    componentHealth: memoizedComponentHealth || {
      SimpleInnovatorImageUpload: createDefaultComponentHealth(),
      EmergencyImageUpload: createDefaultComponentHealth(),
    },
    recentErrors: memoizedRecentErrors || [],
    activeError: memoizedActiveError,
    recoveryState: recoveryState || createDefaultRecoveryState(),
    reportError,
    reportSuccess,
    clearErrors,
    triggerRecovery,
    getRecommendedComponent,
    shouldFallback,
    assessOverallHealth,
    getHealthReport,
  };
}
