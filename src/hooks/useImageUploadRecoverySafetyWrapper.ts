import { useState, useEffect, useMemo, useCallback } from 'react';
import { useImageUploadRecovery, type UseImageUploadRecoveryOptions } from './useImageUploadRecovery';
import { useUserStore } from '~/stores/userStore';
import { toast } from 'react-hot-toast';

interface SafetyWrapperConfig {
  enableRecoveryHook?: boolean;
  enableDiagnostics?: boolean;
  enableFallbackMode?: boolean;
  maxInitializationAttempts?: number;
  initializationRetryDelay?: number;
}

interface SafetyWrapperReturn {
  // Original hook return values with safe defaults
  componentHealth: {
    SimpleInnovatorImageUpload: {
      status: 'unknown' | 'healthy' | 'degraded' | 'unhealthy';
      errorCount: number;
      lastError: Date | null;
      lastSuccess: Date | null;
      totalUploads: number;
      successfulUploads: number;
    };
    EmergencyImageUpload: {
      status: 'unknown' | 'healthy' | 'degraded' | 'unhealthy';
      errorCount: number;
      lastError: Date | null;
      lastSuccess: Date | null;
      totalUploads: number;
      successfulUploads: number;
    };
  };
  recentErrors: any[];
  activeError: any | null;
  recoveryState: {
    isRecovering: boolean;
    recoveryAttempts: number;
    maxRecoveryAttempts: number;
    lastRecoveryTime: Date | null;
    recoveryStrategy: 'retry' | 'reset' | null;
  };
  reportError: (error: any, component: string) => void;
  reportSuccess: (component: string, result?: any) => void;
  clearErrors: () => void;
  triggerRecovery: (strategy?: 'retry' | 'reset') => Promise<boolean>;
  getRecommendedComponent: () => 'SimpleInnovatorImageUpload' | 'EmergencyImageUpload';
  shouldFallback: (fromComponent: string) => boolean;
  assessOverallHealth: () => 'healthy' | 'degraded' | 'unhealthy';
  getHealthReport: () => any;
  
  // Safety wrapper specific values
  isHookEnabled: boolean;
  safetyMode: boolean;
  hookError: Error | null;
  diagnostics: {
    initializationAttempts: number;
    lastError: Error | null;
    prerequisiteChecks: {
      userStoreAvailable: boolean;
      optionsValid: boolean;
      dependenciesLoaded: boolean;
    };
    performanceMetrics: {
      initializationTime: number;
      lastRenderTime: number;
      renderCount: number;
    };
  };
  resetSafety: () => void;
  enableDiagnosticMode: () => void;
  disableRecoveryHook: () => void;
}

const createSafeDefaults = () => ({
  componentHealth: {
    SimpleInnovatorImageUpload: {
      status: 'unknown' as const,
      errorCount: 0,
      lastError: null,
      lastSuccess: null,
      totalUploads: 0,
      successfulUploads: 0,
    },
    EmergencyImageUpload: {
      status: 'unknown' as const,
      errorCount: 0,
      lastError: null,
      lastSuccess: null,
      totalUploads: 0,
      successfulUploads: 0,
    },
  },
  recentErrors: [],
  activeError: null,
  recoveryState: {
    isRecovering: false,
    recoveryAttempts: 0,
    maxRecoveryAttempts: 3,
    lastRecoveryTime: null,
    recoveryStrategy: null,
  },
  reportError: () => {},
  reportSuccess: () => {},
  clearErrors: () => {},
  triggerRecovery: async () => false,
  getRecommendedComponent: () => 'SimpleInnovatorImageUpload' as const,
  shouldFallback: () => false,
  assessOverallHealth: () => 'healthy' as const,
  getHealthReport: () => ({}),
});

export function useImageUploadRecoverySafetyWrapper(
  options: UseImageUploadRecoveryOptions = {},
  config: SafetyWrapperConfig = {}
): SafetyWrapperReturn {
  const {
    enableRecoveryHook = true,
    enableDiagnostics = false,
    enableFallbackMode = true,
    maxInitializationAttempts = 3,
    initializationRetryDelay = 1000,
  } = config;
  
  // Safety state
  const [isHookEnabled, setIsHookEnabled] = useState(false);
  const [safetyMode, setSafetyMode] = useState(false);
  const [hookError, setHookError] = useState<Error | null>(null);
  const [initializationAttempts, setInitializationAttempts] = useState(0);
  const [renderCount, setRenderCount] = useState(0);
  const [initializationStartTime] = useState(Date.now());
  const [lastRenderTime, setLastRenderTime] = useState(Date.now());
  
  // Track render performance
  useEffect(() => {
    setRenderCount(prev => prev + 1);
    setLastRenderTime(Date.now());
  });
  
  // Safe defaults
  const safeDefaults = useMemo(() => createSafeDefaults(), []);
  
  // Diagnostic logging
  const logDiagnostic = useCallback((message: string, data?: any) => {
    if (enableDiagnostics) {
      console.log(`🔍 SAFETY WRAPPER: ${message}`, data || '');
    }
  }, [enableDiagnostics]);
  
  // Prerequisites check
  const checkPrerequisites = useCallback(() => {
    try {
      // Check if useUserStore is available
      const userStoreAvailable = typeof useUserStore === 'function';
      
      // Validate options
      const optionsValid = options && typeof options === 'object' &&
        (options.componentId === undefined || typeof options.componentId === 'string') &&
        (options.debugMode === undefined || typeof options.debugMode === 'boolean');
      
      // Check if dependencies are loaded
      const dependenciesLoaded = typeof toast === 'function';
      
      const allChecksPass = userStoreAvailable && optionsValid && dependenciesLoaded;
      
      logDiagnostic('Prerequisites check:', {
        userStoreAvailable,
        optionsValid,
        dependenciesLoaded,
        allChecksPass,
        options,
      });
      
      return {
        userStoreAvailable,
        optionsValid,
        dependenciesLoaded,
        allChecksPass,
      };
    } catch (error) {
      logDiagnostic('Error during prerequisites check:', error);
      return {
        userStoreAvailable: false,
        optionsValid: false,
        dependenciesLoaded: false,
        allChecksPass: false,
      };
    }
  }, [options, logDiagnostic]);
  
  // Initialize hook with retry logic
  useEffect(() => {
    if (!enableRecoveryHook) {
      logDiagnostic('Recovery hook disabled by configuration');
      setSafetyMode(true);
      setIsHookEnabled(false);
      return;
    }
    
    const attemptInitialization = async () => {
      try {
        const prerequisites = checkPrerequisites();
        
        if (prerequisites.allChecksPass) {
          logDiagnostic('Prerequisites met, enabling hook');
          setIsHookEnabled(true);
          setSafetyMode(false);
          setHookError(null);
        } else {
          throw new Error(`Prerequisites not met: ${JSON.stringify(prerequisites)}`);
        }
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error));
        logDiagnostic('Initialization attempt failed:', errorObj);
        setHookError(errorObj);
        
        const nextAttempt = initializationAttempts + 1;
        setInitializationAttempts(nextAttempt);
        
        if (nextAttempt < maxInitializationAttempts) {
          logDiagnostic(`Retrying initialization in ${initializationRetryDelay}ms (attempt ${nextAttempt}/${maxInitializationAttempts})`);
          setTimeout(() => {
            attemptInitialization();
          }, initializationRetryDelay);
        } else {
          logDiagnostic('Max initialization attempts reached, enabling safety mode');
          setSafetyMode(true);
          setIsHookEnabled(false);
          
          if (enableFallbackMode && typeof toast?.error === 'function') {
            toast.error('Upload recovery system unavailable, using basic mode', { duration: 5000 });
          }
        }
      }
    };
    
    attemptInitialization();
  }, [enableRecoveryHook, checkPrerequisites, initializationAttempts, maxInitializationAttempts, initializationRetryDelay, enableFallbackMode, logDiagnostic]);
  
  // Conditionally use the hook
  let hookResult;
  try {
    if (isHookEnabled && !hookError && !safetyMode) {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      hookResult = useImageUploadRecovery(options);
      logDiagnostic('Hook executed successfully');
    } else {
      hookResult = safeDefaults;
      logDiagnostic('Using safe defaults', { isHookEnabled, hasHookError: !!hookError, safetyMode });
    }
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    logDiagnostic('Hook execution failed:', errorObj);
    setHookError(errorObj);
    setSafetyMode(true);
    setIsHookEnabled(false);
    hookResult = safeDefaults;
    
    if (typeof toast?.error === 'function') {
      toast.error('Upload recovery system error, using safe mode', { duration: 5000 });
    }
  }
  
  // Safety wrapper functions
  const resetSafety = useCallback(() => {
    logDiagnostic('Resetting safety state');
    setHookError(null);
    setSafetyMode(false);
    setInitializationAttempts(0);
    
    if (typeof toast?.success === 'function') {
      toast.success('Upload recovery system reset', { duration: 3000 });
    }
  }, [logDiagnostic]);
  
  const enableDiagnosticMode = useCallback(() => {
    logDiagnostic('Diagnostic mode enabled');
    // This would typically update the config, but since we can't modify props,
    // we'll just log the current state
    console.log('🔍 DIAGNOSTIC MODE - Current State:', {
      isHookEnabled,
      safetyMode,
      hookError,
      initializationAttempts,
      renderCount,
      options,
      config,
    });
  }, [isHookEnabled, safetyMode, hookError, initializationAttempts, renderCount, options, config, logDiagnostic]);
  
  const disableRecoveryHook = useCallback(() => {
    logDiagnostic('Manually disabling recovery hook');
    setIsHookEnabled(false);
    setSafetyMode(true);
    
    if (typeof toast?.warning === 'function') {
      toast('Upload recovery hook disabled manually', { duration: 3000 });
    }
  }, [logDiagnostic]);
  
  // Build diagnostics
  const diagnostics = useMemo(() => {
    const prerequisites = checkPrerequisites();
    
    return {
      initializationAttempts,
      lastError: hookError,
      prerequisiteChecks: prerequisites,
      performanceMetrics: {
        initializationTime: Date.now() - initializationStartTime,
        lastRenderTime,
        renderCount,
      },
    };
  }, [initializationAttempts, hookError, checkPrerequisites, initializationStartTime, lastRenderTime, renderCount]);
  
  return {
    ...hookResult,
    isHookEnabled,
    safetyMode,
    hookError,
    diagnostics,
    resetSafety,
    enableDiagnosticMode,
    disableRecoveryHook,
  };
}
