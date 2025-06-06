import React, { useState, useCallback, useEffect, memo, useRef, useMemo } from 'react';
import { SimpleInnovatorImageUpload } from './SimpleInnovatorImageUpload';
import { EmergencyImageUpload } from './EmergencyImageUpload';
import ErrorBoundary from '~/components/ErrorBoundary';
import { useUserStore } from '~/stores/userStore';
import { getUploadErrorMessage } from '~/constants/validation';
import { toast } from 'react-hot-toast';
import { debounce } from '~/utils';
import {
  RefreshCw,
  AlertCircle,
  Zap,
  CheckCircle,
  XCircle,
} from 'lucide-react';

interface UnifiedImageUploadInterfaceProps {
  // Form integration
  value?: string;
  onChange: (filePath: string | null) => void;
  onFormValueSet?: (filePath: string | null) => void;
  validateImmediately?: boolean;
  retryFormUpdate?: boolean;
  
  // Component configuration
  innovatorId?: number;
  innovatorName?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  
  // Upload configuration
  maxFileSize?: number;
  enableAutoRetry?: boolean;
  enableClientOptimization?: boolean;
  
  // Callbacks
  onUploadProgress?: (progress: number) => void;
  onUploadComplete?: (result: any) => void;
  onUploadError?: (error: any) => void;
  
  // Mode control - simplified to only allow simple mode
  allowEmergencyFallback?: boolean;
  
  // Debug and monitoring
  debugMode?: boolean;
  componentId?: string;
}

interface ComponentState {
  activeComponent: 'simple' | 'emergency';
  componentHealth: {
    simple: 'unknown' | 'healthy' | 'degraded' | 'unhealthy';
    emergency: 'unknown' | 'healthy' | 'degraded' | 'unhealthy';
  };
  errorCounts: {
    simple: number;
    emergency: number;
  };
  lastSuccessfulComponent: 'simple' | 'emergency' | null;
  isTransitioning: boolean;
  autoFallbackEnabled: boolean;
  emergencyModeTriggered: boolean;
}

interface ErrorState {
  hasError: boolean;
  errorMessage: string;
  errorCategory: string;
  sourceComponent: 'simple' | 'emergency' | null;
  canRetry: boolean;
  retryCount: number;
  maxRetries: number;
  lastErrorTime: Date | null;
  recoveryAttempts: number;
}

export const UnifiedImageUploadInterface = memo(function UnifiedImageUploadInterface({
  // Form integration
  value,
  onChange,
  onFormValueSet,
  validateImmediately = true,
  retryFormUpdate = true,
  
  // Component configuration
  innovatorId,
  innovatorName = "User",
  placeholder = "Upload image with reliable processing",
  className = "",
  disabled = false,
  
  // Upload configuration
  maxFileSize = 10, // Reduced to 10MB for simple upload
  enableAutoRetry = true,
  enableClientOptimization = true,
  
  // Callbacks
  onUploadProgress,
  onUploadComplete,
  onUploadError,
  
  // Mode control - simplified
  allowEmergencyFallback = true,
  
  // Debug and monitoring
  debugMode = false,
  componentId = 'unified-upload',
}: UnifiedImageUploadInterfaceProps) {
  
  // Circuit breaker: render counter to detect infinite loops
  const renderCountRef = useRef(0);
  const lastRenderTimeRef = useRef(Date.now());
  const maxRendersPerSecond = 12; // Emergency circuit breaker threshold
  const emergencyStopRef = useRef(false);
  
  // Reference equality checks for previous state values
  const prevComponentStateRef = useRef<ComponentState>();
  const prevErrorStateRef = useRef<ErrorState>();
  const prevValueRef = useRef<string>();
  
  // Enhanced logging
  const logWithTimestamp = useCallback((message: string, data?: any) => {
    if (debugMode) {
      console.log(`🔍 DEBUG: UnifiedImageUploadInterface [${componentId}] [${new Date().toISOString()}] - ${message}`, data || '');
    }
  }, [debugMode, componentId]);
  
  // Increment render counter and check for excessive renders
  useEffect(() => {
    renderCountRef.current++;
    const now = Date.now();
    const timeSinceLastRender = now - lastRenderTimeRef.current;
    
    // Reset counter every second
    if (timeSinceLastRender > 1000) {
      renderCountRef.current = 1;
      lastRenderTimeRef.current = now;
      emergencyStopRef.current = false; // Reset emergency stop
    } else if (renderCountRef.current > maxRendersPerSecond && !emergencyStopRef.current) {
      emergencyStopRef.current = true;
      logWithTimestamp(`🚨 CIRCUIT BREAKER: UnifiedImageUploadInterface [${componentId}] exceeded ${maxRendersPerSecond} renders per second. Emergency stop activated.`, {
        renderCount: renderCountRef.current,
        timeSinceLastRender,
        activeComponent: componentState.activeComponent,
        isTransitioning: componentState.isTransitioning,
      });
      
      toast.error(`🚨 Upload interface paused due to excessive activity. Please refresh if needed.`, { 
        duration: 10000 
      });
    }
  });
  
  // Component state management with debouncing to prevent excessive updates
  const [componentState, setComponentState] = useState<ComponentState>({
    activeComponent: 'simple', // Always start with simple
    componentHealth: {
      simple: 'unknown',
      emergency: 'unknown',
    },
    errorCounts: {
      simple: 0,
      emergency: 0,
    },
    lastSuccessfulComponent: null,
    isTransitioning: false,
    autoFallbackEnabled: true,
    emergencyModeTriggered: false,
  });
  
  // Error state management with debouncing
  const [errorState, setErrorState] = useState<ErrorState>({
    hasError: false,
    errorMessage: '',
    errorCategory: 'unknown',
    sourceComponent: null,
    canRetry: true,
    retryCount: 0,
    maxRetries: 3,
    lastErrorTime: null,
    recoveryAttempts: 0,
  });
  
  // Upload tracking
  const { addUpload, updateUpload } = useUserStore();
  const [currentUploadId, setCurrentUploadId] = useState<string | null>(null);
  
  // Debounced state updates to prevent excessive re-renders
  const debouncedSetComponentState = useMemo(
    () => debounce((updateFn: (prev: ComponentState) => ComponentState) => {
      if (emergencyStopRef.current) return;
      setComponentState(updateFn);
    }, 100),
    []
  );
  
  const debouncedSetErrorState = useMemo(
    () => debounce((updateFn: (prev: ErrorState) => ErrorState) => {
      if (emergencyStopRef.current) return;
      setErrorState(updateFn);
    }, 100),
    []
  );
  
  // Memoized values to prevent unnecessary re-renders
  const memoizedComponentState = useMemo(() => {
    if (JSON.stringify(prevComponentStateRef.current) !== JSON.stringify(componentState)) {
      prevComponentStateRef.current = componentState;
    }
    return prevComponentStateRef.current || componentState;
  }, [componentState]);
  
  const memoizedErrorState = useMemo(() => {
    if (JSON.stringify(prevErrorStateRef.current) !== JSON.stringify(errorState)) {
      prevErrorStateRef.current = errorState;
    }
    return prevErrorStateRef.current || errorState;
  }, [errorState]);
  
  const memoizedValue = useMemo(() => {
    if (prevValueRef.current !== value) {
      prevValueRef.current = value;
    }
    return prevValueRef.current;
  }, [value]);
  
  // Component health assessment with conditional guards
  const assessComponentHealth = useCallback((component: 'simple' | 'emergency', success: boolean) => {
    if (emergencyStopRef.current) {
      logWithTimestamp('Component health assessment blocked by emergency stop');
      return;
    }
    
    debouncedSetComponentState(prev => {
      const newErrorCount = success ? 0 : prev.errorCounts[component] + 1;
      let newHealth: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      
      if (newErrorCount >= 3) {
        newHealth = 'unhealthy';
      } else if (newErrorCount >= 1) {
        newHealth = 'degraded';
      }
      
      // Reference equality check: only update if values actually changed
      const currentHealth = prev.componentHealth[component];
      const currentErrorCount = prev.errorCounts[component];
      
      if (currentHealth === newHealth && currentErrorCount === newErrorCount && 
          prev.lastSuccessfulComponent === (success ? component : prev.lastSuccessfulComponent)) {
        logWithTimestamp('Component health unchanged, skipping update');
        return prev;
      }
      
      return {
        ...prev,
        componentHealth: {
          ...prev.componentHealth,
          [component]: newHealth,
        },
        errorCounts: {
          ...prev.errorCounts,
          [component]: newErrorCount,
        },
        lastSuccessfulComponent: success ? component : prev.lastSuccessfulComponent,
      };
    });
  }, [debouncedSetComponentState, logWithTimestamp]);
  
  // Auto-fallback logic with emergency escalation and conditional guards
  const shouldAutoFallback = useCallback((fromComponent: 'simple' | 'emergency'): 'emergency' | null => {
    if (!memoizedComponentState.autoFallbackEnabled || emergencyStopRef.current) return null;
    
    const errorCount = memoizedComponentState.errorCounts[fromComponent];
    const health = memoizedComponentState.componentHealth[fromComponent];
    
    // Only fallback from simple to emergency
    if (fromComponent === 'simple' && (errorCount >= 3 || health === 'unhealthy')) {
      return 'emergency';
    }
    
    return null; // No fallback from emergency
  }, [memoizedComponentState.autoFallbackEnabled, memoizedComponentState.errorCounts, memoizedComponentState.componentHealth]);
  
  // Mode switching with transition management and conditional guards
  const switchMode = useCallback(async (targetMode: 'simple' | 'emergency', reason: string = 'manual') => {
    if (memoizedComponentState.isTransitioning || emergencyStopRef.current) {
      logWithTimestamp('Mode switch blocked - transition in progress or emergency stop active');
      return;
    }
    
    // Only allow switching to emergency mode
    if (targetMode !== 'emergency') {
      logWithTimestamp('Mode switch blocked - only emergency mode is allowed as fallback');
      return;
    }
    
    logWithTimestamp('Starting mode switch:', {
      from: memoizedComponentState.activeComponent,
      to: targetMode,
      reason,
    });
    
    debouncedSetComponentState(prev => ({
      ...prev,
      isTransitioning: true,
      emergencyModeTriggered: true,
    }));
    
    // Clear error state during transition
    debouncedSetErrorState(prev => ({
      ...prev,
      hasError: false,
      errorMessage: '',
      retryCount: 0,
    }));
    
    // Wait for UI to update
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Complete the mode switch
    debouncedSetComponentState(prev => ({
      ...prev,
      activeComponent: targetMode,
      isTransitioning: false,
    }));
    
    toast(`🚨 Emergency mode activated - minimal processing enabled`, {
      duration: 5000,
      style: { background: '#fef3c7', color: '#92400e' }
    });
    
    logWithTimestamp('Mode switch completed:', { newMode: targetMode });
  }, [memoizedComponentState.isTransitioning, memoizedComponentState.activeComponent, debouncedSetComponentState, debouncedSetErrorState, logWithTimestamp]);
  
  // Unified error handling with emergency escalation and batched updates
  const handleComponentError = useCallback((error: any, sourceComponent: 'simple' | 'emergency') => {
    if (emergencyStopRef.current) {
      logWithTimestamp('Error handling blocked by emergency stop');
      return;
    }
    
    const errorMessage = error?.message || 'Upload failed';
    const errorInfo = getUploadErrorMessage(errorMessage);
    
    logWithTimestamp('Component error detected:', {
      sourceComponent,
      errorMessage,
      errorCategory: errorInfo.category,
      canRetry: errorInfo.canRetry,
    });
    
    // Update component health
    assessComponentHealth(sourceComponent, false);
    
    // Update error state
    debouncedSetErrorState(prev => ({
      ...prev,
      hasError: true,
      errorMessage,
      errorCategory: errorInfo.category,
      sourceComponent,
      canRetry: errorInfo.canRetry,
      retryCount: prev.retryCount + 1,
      lastErrorTime: new Date(),
      recoveryAttempts: prev.recoveryAttempts + 1,
    }));
    
    // Update upload tracking
    if (currentUploadId) {
      updateUpload(currentUploadId, {
        status: 'failed',
        error: errorMessage,
      });
    }
    
    // Call error callback
    if (onUploadError) {
      onUploadError({
        ...error,
        sourceComponent,
        unifiedInterface: true,
        componentId,
      });
    }
    
    // Show error message
    toast.error(`❌ ${errorInfo.message} (${sourceComponent} upload)`, { duration: 8000 });
    
    // Auto-fallback logic - only to emergency
    const fallbackTarget = shouldAutoFallback(sourceComponent);
    
    if (fallbackTarget === 'emergency' && sourceComponent === 'simple') {
      setTimeout(() => {
        if (emergencyStopRef.current) return;
        
        toast(
          <div className="space-y-2">
            <p>🚨 Simple upload failed multiple times. Switch to emergency mode?</p>
            <button
              onClick={() => switchMode('emergency', 'emergency_escalation')}
              className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
            >
              Activate Emergency Upload
            </button>
          </div>,
          {
            duration: 15000,
            style: { background: '#fef3c7', color: '#92400e' }
          }
        );
      }, 2000);
    }
  }, [logWithTimestamp, assessComponentHealth, debouncedSetErrorState, currentUploadId, updateUpload, onUploadError, componentId, shouldAutoFallback, switchMode]);
  
  // Unified success handling with conditional guards
  const handleComponentSuccess = useCallback((result: any, sourceComponent: 'simple' | 'emergency') => {
    if (emergencyStopRef.current) {
      logWithTimestamp('Success handling blocked by emergency stop');
      return;
    }
    
    logWithTimestamp('Component success:', {
      sourceComponent,
      result,
    });
    
    // Batch state updates to prevent multiple re-renders
    Promise.resolve().then(() => {
      // Update component health
      assessComponentHealth(sourceComponent, true);
      
      // Reset error state
      debouncedSetErrorState(prev => ({
        ...prev,
        hasError: false,
        errorMessage: '',
        retryCount: 0,
        recoveryAttempts: 0,
      }));
    });
    
    // Update upload tracking
    if (currentUploadId) {
      updateUpload(currentUploadId, {
        status: 'verified',
        progress: 100,
        filePath: result?.filePath || memoizedValue,
      });
    }
    
    // Call success callback
    if (onUploadComplete) {
      onUploadComplete({
        ...result,
        sourceComponent,
        unifiedInterface: true,
        componentId,
      });
    }
    
    toast.success(`✅ Image uploaded successfully via ${sourceComponent} upload`, { duration: 4000 });
  }, [logWithTimestamp, assessComponentHealth, debouncedSetErrorState, currentUploadId, updateUpload, onUploadComplete, memoizedValue, componentId]);
  
  // Progress tracking
  const handleProgress = useCallback((progress: number, sourceComponent: 'simple' | 'emergency') => {
    logWithTimestamp('Upload progress:', { progress, sourceComponent });
    
    if (onUploadProgress) {
      onUploadProgress(progress);
    }
  }, [logWithTimestamp, onUploadProgress]);
  
  // Custom error boundary for each component
  const ComponentErrorBoundary = ({ children, componentName }: { children: React.ReactNode; componentName: string }) => (
    <ErrorBoundary
      fallback={
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <div className="flex items-center space-x-2">
            <XCircle className="h-5 w-5 text-red-600" />
            <div>
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                {componentName} Component Crashed
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                The {componentName.toLowerCase()} component has crashed and been disabled.
              </p>
              <div className="mt-3 flex items-center space-x-3">
                <button
                  onClick={() => window.location.reload()}
                  className="text-red-600 hover:text-red-700 underline text-xs"
                >
                  Reload Page
                </button>
                {allowEmergencyFallback && componentName === 'Simple Upload' && (
                  <button
                    onClick={() => switchMode('emergency', 'component_crash')}
                    className="text-blue-600 hover:text-blue-700 underline text-xs"
                  >
                    Switch to Emergency Upload
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
  
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Component Status and Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Simple Image Upload
          </h3>
          
          {/* Component Health Indicators */}
          <div className="flex items-center space-x-2 text-xs">
            <div className="flex items-center space-x-1">
              <div className={`w-2 h-2 rounded-full ${
                memoizedComponentState.componentHealth.simple === 'healthy' ? 'bg-green-500' :
                memoizedComponentState.componentHealth.simple === 'degraded' ? 'bg-yellow-500' :
                memoizedComponentState.componentHealth.simple === 'unhealthy' ? 'bg-red-500' : 'bg-gray-400'
              }`} />
              <Zap className="h-3 w-3 text-gray-500" />
              <span className="text-gray-500">Simple</span>
              <span className="text-gray-400">({memoizedComponentState.errorCounts.simple})</span>
            </div>
            
            {memoizedComponentState.emergencyModeTriggered && (
              <div className="flex items-center space-x-1">
                <div className={`w-2 h-2 rounded-full ${
                  memoizedComponentState.componentHealth.emergency === 'healthy' ? 'bg-green-500' :
                  memoizedComponentState.componentHealth.emergency === 'degraded' ? 'bg-yellow-500' :
                  memoizedComponentState.componentHealth.emergency === 'unhealthy' ? 'bg-red-500' : 'bg-gray-400'
                }`} />
                <AlertCircle className="h-3 w-3 text-gray-500" />
                <span className="text-gray-500">Emergency</span>
                <span className="text-gray-400">({memoizedComponentState.errorCounts.emergency})</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Emergency Mode Button - Show only when simple has failed */}
        {allowEmergencyFallback && memoizedComponentState.errorCounts.simple >= 2 && !memoizedComponentState.isTransitioning && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => switchMode('emergency', 'manual')}
              disabled={memoizedComponentState.activeComponent === 'emergency'}
              className={`px-2 py-1 rounded text-xs transition-all ${
                memoizedComponentState.activeComponent === 'emergency'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              <AlertCircle className="h-3 w-3 inline mr-1" />
              Emergency Mode
            </button>
          </div>
        )}
        
        {memoizedComponentState.isTransitioning && (
          <div className="flex items-center space-x-1 text-xs text-blue-600">
            <RefreshCw className="h-3 w-3 animate-pulse" />
            <span>Switching to Emergency...</span>
          </div>
        )}
      </div>
      
      {/* Error Display */}
      {memoizedErrorState.hasError && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 text-sm text-red-700 dark:text-red-300">
              <p className="font-medium">Upload Error ({memoizedErrorState.errorCategory})</p>
              <p className="mt-1">{memoizedErrorState.errorMessage}</p>
              <p className="text-xs text-gray-500 mt-1">
                Source: {memoizedErrorState.sourceComponent} upload | Recovery attempts: {memoizedErrorState.recoveryAttempts}
              </p>
              
              <div className="mt-2 flex items-center space-x-3 flex-wrap gap-2">
                {memoizedErrorState.canRetry && memoizedErrorState.retryCount < memoizedErrorState.maxRetries && (
                  <button
                    onClick={() => {
                      debouncedSetErrorState(prev => ({ ...prev, hasError: false, errorMessage: '' }));
                    }}
                    className="text-red-600 hover:text-red-700 underline text-xs"
                  >
                    Retry ({memoizedErrorState.retryCount}/{memoizedErrorState.maxRetries})
                  </button>
                )}
                
                {allowEmergencyFallback && memoizedErrorState.sourceComponent === 'simple' && (
                  <button
                    onClick={() => switchMode('emergency', 'error_recovery')}
                    className="text-blue-600 hover:text-blue-700 underline text-xs"
                  >
                    Switch to Emergency Upload
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Active Component */}
      {memoizedComponentState.activeComponent === 'simple' ? (
        <ComponentErrorBoundary componentName="Simple Upload">
          <SimpleInnovatorImageUpload
            innovatorId={innovatorId || 0}
            innovatorName={innovatorName}
            value={memoizedValue}
            onChange={onChange}
            onUploadProgress={(progress) => handleProgress(progress, 'simple')}
            onUploadComplete={(result) => handleComponentSuccess(result, 'simple')}
            onUploadError={(error) => handleComponentError(error, 'simple')}
            onFormValueSet={onFormValueSet}
            disabled={disabled || memoizedComponentState.isTransitioning}
            validateImmediately={validateImmediately}
            retryFormUpdate={retryFormUpdate}
            enableAutoRetry={enableAutoRetry}
            maxRetries={3}
            componentId={`${componentId}-simple`}
          />
        </ComponentErrorBoundary>
      ) : (
        <ComponentErrorBoundary componentName="Emergency Upload">
          <EmergencyImageUpload
            onSuccess={(filePath) => {
              // Handle emergency upload success
              onChange(filePath);
              handleComponentSuccess({ filePath, sourceComponent: 'emergency' }, 'emergency');
            }}
            onError={(error) => handleComponentError(error, 'emergency')}
            disabled={disabled || memoizedComponentState.isTransitioning}
            className="mt-2"
          />
        </ComponentErrorBoundary>
      )}
      
      {/* Debug Information */}
      {debugMode && (
        <div className="mt-4 p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs space-y-1">
          <div><strong>Simple Upload Debug Info:</strong></div>
          <div>Component ID: {componentId}</div>
          <div>Active Component: {memoizedComponentState.activeComponent}</div>
          <div>Is Transitioning: {memoizedComponentState.isTransitioning ? 'Yes' : 'No'}</div>
          <div>Last Successful: {memoizedComponentState.lastSuccessfulComponent || 'None'}</div>
          <div>Error Counts: Simple({memoizedComponentState.errorCounts.simple}) Emergency({memoizedComponentState.errorCounts.emergency})</div>
          <div>Health: Simple({memoizedComponentState.componentHealth.simple}) Emergency({memoizedComponentState.componentHealth.emergency})</div>
          <div>Auto Fallback: {memoizedComponentState.autoFallbackEnabled ? 'Enabled' : 'Disabled'}</div>
          <div>Emergency Triggered: {memoizedComponentState.emergencyModeTriggered ? 'Yes' : 'No'}</div>
          <div>Current Upload ID: {currentUploadId || 'None'}</div>
          <div>Circuit Breaker: Renders/sec: {renderCountRef.current}, Emergency Stop: {emergencyStopRef.current ? '🚨 ACTIVE' : '✅ Normal'}</div>
          <div>Value Reference: {typeof memoizedValue === 'string' ? memoizedValue.substring(0, 30) + '...' : 'None'}</div>
          
          <div className="mt-2 flex flex-wrap gap-1">
            <button
              onClick={() => {
                emergencyStopRef.current = false;
                renderCountRef.current = 0;
                toast('🔄 Circuit breaker reset', { duration: 2000 });
              }}
              className="px-2 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700"
            >
              Reset Circuit Breaker
            </button>
            
            <button
              onClick={() => {
                logWithTimestamp('Manual state dump:', {
                  componentState: memoizedComponentState,
                  errorState: memoizedErrorState,
                  value: memoizedValue,
                  renderCount: renderCountRef.current,
                  emergencyStop: emergencyStopRef.current,
                });
                toast('📊 State dumped to console', { duration: 2000 });
              }}
              className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
            >
              Dump State
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

// Add display name for debugging
UnifiedImageUploadInterface.displayName = 'UnifiedImageUploadInterface';
