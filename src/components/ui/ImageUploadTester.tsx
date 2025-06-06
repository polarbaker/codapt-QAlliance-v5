import React, { useState, useCallback } from 'react';
import { SimpleInnovatorImageUpload } from './SimpleInnovatorImageUpload';
import { ImagePreview } from './ImagePreview';
import { useImageUploadState } from '~/hooks/useImageUploadState';
import { useConnectionState, useEventQueue } from '~/trpc/react';
import { useUserStore } from '~/stores/userStore';
import { 
  testImageAccessibility, 
  isConnectionStable, 
  getOptimalTimeout,
  calculateRetryDelay 
} from '~/utils';
import {
  Shield,
  Wifi,
  WifiOff,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Database,
  Eye,
} from 'lucide-react';

interface ImageUploadTesterProps {
  className?: string;
}

export function ImageUploadTester({ className = '' }: ImageUploadTesterProps) {
  const [uploadedImagePath, setUploadedImagePath] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<{
    uploadPhases: string[];
    verificationResults: any[];
    connectionEvents: string[];
    persistenceTests: any[];
  }>({
    uploadPhases: [],
    verificationResults: [],
    connectionEvents: [],
    persistenceTests: [],
  });
  
  const { connectionState } = useConnectionState();
  const { queueEvent, queuedEvents, isConnected } = useEventQueue();
  const { 
    getUploadStats, 
    getActiveUploads, 
    startUpload,
    updateUploadProgress,
    completeUpload 
  } = useImageUploadState();
  const { recentUploads, getUploadsByStatus } = useUserStore();
  
  // Test phase tracking
  const trackPhase = useCallback((phase: string) => {
    setTestResults(prev => ({
      ...prev,
      uploadPhases: [...prev.uploadPhases, `${new Date().toISOString()}: ${phase}`],
    }));
  }, []);
  
  // Test verification manually
  const testVerification = useCallback(async (filePath: string) => {
    if (!filePath) return;
    
    trackPhase('Starting manual verification test');
    
    const maxAttempts = 3;
    const results = [];
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const timeout = getOptimalTimeout();
      const result = await testImageAccessibility(filePath, attempt, timeout);
      
      results.push({
        attempt: attempt + 1,
        ...result,
        timestamp: new Date().toISOString(),
      });
      
      trackPhase(`Verification attempt ${attempt + 1}: ${result.accessible ? 'SUCCESS' : 'FAILED'}`);
      
      if (result.accessible) break;
      
      if (attempt < maxAttempts - 1) {
        const delay = calculateRetryDelay(attempt);
        trackPhase(`Waiting ${Math.round(delay)}ms before retry`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    setTestResults(prev => ({
      ...prev,
      verificationResults: [...prev.verificationResults, ...results],
    }));
  }, [trackPhase]);
  
  // Test connection state
  const testConnection = useCallback(() => {
    const connectionInfo = {
      status: connectionState.status,
      isOnline: connectionState.isOnline,
      reconnectAttempts: connectionState.reconnectAttempts,
      queuedEvents: queuedEvents.length,
      isStable: isConnectionStable(),
      timestamp: new Date().toISOString(),
    };
    
    setTestResults(prev => ({
      ...prev,
      connectionEvents: [...prev.connectionEvents, JSON.stringify(connectionInfo)],
    }));
    
    trackPhase(`Connection test: ${JSON.stringify(connectionInfo)}`);
  }, [connectionState, queuedEvents, trackPhase]);
  
  // Test persistence
  const testPersistence = useCallback(() => {
    const persistenceInfo = {
      recentUploadsCount: recentUploads.uploads.length,
      activeUploads: getActiveUploads().length,
      uploadStats: getUploadStats(),
      uploadsByStatus: {
        uploading: getUploadsByStatus('uploading').length,
        processing: getUploadsByStatus('processing').length,
        verifying: getUploadsByStatus('verifying').length,
        verified: getUploadsByStatus('verified').length,
        failed: getUploadsByStatus('failed').length,
      },
      timestamp: new Date().toISOString(),
    };
    
    setTestResults(prev => ({
      ...prev,
      persistenceTests: [...prev.persistenceTests, persistenceInfo],
    }));
    
    trackPhase(`Persistence test: ${JSON.stringify(persistenceInfo)}`);
  }, [recentUploads, getActiveUploads, getUploadStats, getUploadsByStatus, trackPhase]);
  
  // Handle upload completion
  const handleUploadComplete = useCallback((result: any) => {
    trackPhase(`Upload completed: ${result.filePath}`);
    setUploadedImagePath(result.filePath);
    
    // Auto-test verification
    if (result.filePath) {
      setTimeout(() => testVerification(result.filePath), 2000);
    }
  }, [trackPhase, testVerification]);
  
  // Handle upload progress
  const handleUploadProgress = useCallback((progress: number) => {
    trackPhase(`Upload progress: ${progress}%`);
  }, [trackPhase]);
  
  // Handle upload error
  const handleUploadError = useCallback((error: any) => {
    trackPhase(`Upload error: ${error.message || 'Unknown error'}`);
  }, [trackPhase]);
  
  // Clear test results
  const clearResults = useCallback(() => {
    setTestResults({
      uploadPhases: [],
      verificationResults: [],
      connectionEvents: [],
      persistenceTests: [],
    });
    setUploadedImagePath(null);
  }, []);
  
  const uploadStats = getUploadStats();
  
  return (
    <div className={`space-y-6 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg ${className}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Image Upload Race Condition Tester
        </h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={clearResults}
            className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Clear Results
          </button>
        </div>
      </div>
      
      {/* Connection Status */}
      <div className="p-4 bg-white dark:bg-gray-700 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-gray-900 dark:text-gray-100">Connection Status</h3>
          <button
            onClick={testConnection}
            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Test Connection
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            {isConnected ? (
              <Wifi className="h-4 w-4 text-green-600" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-600" />
            )}
            <span>{connectionState.status}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Database className="h-4 w-4 text-blue-600" />
            <span>{queuedEvents.length} queued</span>
          </div>
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4 text-purple-600" />
            <span>{connectionState.reconnectAttempts} reconnects</span>
          </div>
          <div className="flex items-center space-x-2">
            <Shield className="h-4 w-4 text-green-600" />
            <span>{isConnectionStable() ? 'Stable' : 'Unstable'}</span>
          </div>
        </div>
      </div>
      
      {/* Upload Statistics */}
      <div className="p-4 bg-white dark:bg-gray-700 rounded-lg">
        <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Upload Statistics</h3>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4 text-sm">
          <div className="text-center">
            <div className="text-lg font-semibold text-blue-600">{uploadStats.total}</div>
            <div className="text-gray-600 dark:text-gray-400">Total</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-yellow-600">{uploadStats.active}</div>
            <div className="text-gray-600 dark:text-gray-400">Active</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-purple-600">{uploadStats.processing}</div>
            <div className="text-gray-600 dark:text-gray-400">Processing</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-orange-600">{uploadStats.verifying}</div>
            <div className="text-gray-600 dark:text-gray-400">Verifying</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-green-600">{uploadStats.completed}</div>
            <div className="text-gray-600 dark:text-gray-400">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-red-600">{uploadStats.failed}</div>
            <div className="text-gray-600 dark:text-gray-400">Failed</div>
          </div>
        </div>
        <button
          onClick={testPersistence}
          className="mt-3 px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
        >
          Test Persistence
        </button>
      </div>
      
      {/* Upload Component */}
      <div className="p-4 bg-white dark:bg-gray-700 rounded-lg">
        <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
          Simple Innovator Image Upload Component
        </h3>
        <SimpleInnovatorImageUpload
          innovatorId={1}
          innovatorName="Test Innovator"
          value={uploadedImagePath || undefined}
          onChange={(path) => setUploadedImagePath(path)}
          onUploadComplete={handleUploadComplete}
          onUploadProgress={handleUploadProgress}
          onUploadError={handleUploadError}
          className="max-w-md"
          enableAutoRetry={true}
          maxRetries={3}
        />
      </div>
      
      {/* Preview Component */}
      {uploadedImagePath && (
        <div className="p-4 bg-white dark:bg-gray-700 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-900 dark:text-gray-100">
              Enhanced Preview Component
            </h3>
            <button
              onClick={() => testVerification(uploadedImagePath)}
              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 flex items-center space-x-1"
            >
              <Eye className="h-3 w-3" />
              <span>Test Verification</span>
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Standard Preview</h4>
              <ImagePreview
                imagePath={uploadedImagePath}
                className="h-32"
                debugMode={true}
                enableRetry={true}
                showFileName={true}
              />
            </div>
            <div>
              <h4 className="text-sm font-medium mb-2">Verification Mode</h4>
              <ImagePreview
                imagePath={uploadedImagePath}
                className="h-32"
                debugMode={true}
                enableRetry={true}
                verificationMode={true}
                showVerificationStates={true}
                onVerificationComplete={(success) => {
                  trackPhase(`Preview verification: ${success ? 'SUCCESS' : 'FAILED'}`);
                }}
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Test Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Upload Phases */}
        <div className="p-4 bg-white dark:bg-gray-700 rounded-lg">
          <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
            Upload Phases ({testResults.uploadPhases.length})
          </h3>
          <div className="space-y-1 max-h-48 overflow-y-auto text-xs font-mono">
            {testResults.uploadPhases.slice(-10).map((phase, index) => (
              <div key={index} className="text-gray-600 dark:text-gray-400">
                {phase}
              </div>
            ))}
          </div>
        </div>
        
        {/* Verification Results */}
        <div className="p-4 bg-white dark:bg-gray-700 rounded-lg">
          <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
            Verification Results ({testResults.verificationResults.length})
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {testResults.verificationResults.slice(-5).map((result, index) => (
              <div key={index} className="flex items-center space-x-2 text-sm">
                {result.accessible ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <span>
                  Attempt {result.attempt}: {result.loadTime}ms
                  {result.imageSize && ` (${result.imageSize.width}x${result.imageSize.height})`}
                </span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Connection Events */}
        <div className="p-4 bg-white dark:bg-gray-700 rounded-lg">
          <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
            Connection Events ({testResults.connectionEvents.length})
          </h3>
          <div className="space-y-1 max-h-48 overflow-y-auto text-xs font-mono">
            {testResults.connectionEvents.slice(-5).map((event, index) => (
              <div key={index} className="text-gray-600 dark:text-gray-400">
                {event}
              </div>
            ))}
          </div>
        </div>
        
        {/* Persistence Tests */}
        <div className="p-4 bg-white dark:bg-gray-700 rounded-lg">
          <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
            Persistence Tests ({testResults.persistenceTests.length})
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto text-xs">
            {testResults.persistenceTests.slice(-3).map((test, index) => (
              <div key={index} className="p-2 bg-gray-50 dark:bg-gray-600 rounded">
                <div>Recent: {test.recentUploadsCount}</div>
                <div>Active: {test.activeUploads}</div>
                <div>Stats: {JSON.stringify(test.uploadStats)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Instructions */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
          Testing Instructions
        </h3>
        <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
          <p>1. Upload an image and observe the staged progress (uploading → processing → verifying → complete)</p>
          <p>2. Watch for verification attempts and success/failure indicators</p>
          <p>3. Test connection stability and event queuing</p>
          <p>4. Verify persistence across page refreshes</p>
          <p>5. Check that images only show success after verification completes</p>
        </div>
      </div>
    </div>
  );
}
