import React, { useState, useCallback } from 'react';
import { useTRPC } from '~/trpc/react';
import { useUserStore } from '~/stores/userStore';
import { toast } from 'react-hot-toast';
import {
  Server,
  Database,
  HardDrive,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Users,
  Image as ImageIcon,
  BarChart3,
  Settings,
  Play,
  FileImage,
  Zap,
} from 'lucide-react';

interface ImageSystemDashboardProps {
  className?: string;
}

export const ImageSystemDashboard: React.FC<ImageSystemDashboardProps> = ({
  className = "",
}) => {
  const [runningHealthCheck, setRunningHealthCheck] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'health' | 'innovators' | 'diagnostics'>('overview');
  const [safeMode, setSafeMode] = useState(false); // Safe mode to disable health checks
  const [healthCheckError, setHealthCheckError] = useState<string | null>(null);
  
  const { adminToken } = useUserStore();
  const trpc = useTRPC();

  // Storage health check query with enhanced error handling
  const healthCheckQuery = trpc.storageHealthCheck.useQuery(
    {
      adminToken: adminToken || '',
      testUpload: false,
    },
    {
      enabled: !!adminToken && !safeMode, // Disable in safe mode
      refetchInterval: safeMode ? false : 5 * 60 * 1000, // Disable auto-refetch in safe mode
      retry: (failureCount, error) => {
        if (safeMode) return false; // Don't retry in safe mode
        
        // Don't retry on 404 or auth errors
        if (error?.message?.includes('404') || 
            error?.message?.includes('No procedure found') ||
            error?.message?.includes('Unauthorized')) {
          setHealthCheckError(error.message);
          return false;
        }
        
        return failureCount < 2; // Limited retries
      },
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 10000),
      onError: (error) => {
        console.error('❌ Storage health check failed:', error);
        setHealthCheckError(error.message);
        
        // Show user-friendly error message
        if (error.message.includes('No procedure found')) {
          toast.error('🔧 Storage health check is temporarily unavailable', { duration: 5000 });
        } else if (!error.message.includes('Network')) {
          toast.error(`❌ Health check error: ${error.message}`, { duration: 8000 });
        }
      },
      onSuccess: () => {
        setHealthCheckError(null); // Clear error on success
      },
    }
  );

  // Innovators with image status query
  const innovatorsStatusQuery = trpc.listInnovatorsWithImageStatus.useQuery(
    {
      adminToken: adminToken || '',
    },
    {
      enabled: !!adminToken,
    }
  );

  // Health check with test upload mutation with enhanced error handling
  const runHealthCheckMutation = trpc.storageHealthCheck.useMutation({
    onSuccess: (data) => {
      setRunningHealthCheck(false);
      setHealthCheckError(null);
      
      if (data.success) {
        toast.success(`✅ Storage system is ${data.summary.status} (Score: ${data.summary.score}/100)`, { 
          duration: 5000 
        });
      } else {
        toast.error(`❌ Storage system issues detected (Score: ${data.summary.score}/100)`, { 
          duration: 8000 
        });
      }
      
      // Refetch the regular health check
      healthCheckQuery.refetch();
    },
    onError: (error) => {
      setRunningHealthCheck(false);
      setHealthCheckError(error.message);
      
      console.error('❌ Manual health check failed:', error);
      
      if (error.message.includes('No procedure found')) {
        toast.error('🔧 Storage health check procedure is not available. Running in safe mode.', { 
          duration: 8000 
        });
        setSafeMode(true); // Auto-enable safe mode
      } else {
        toast.error(`❌ Health check failed: ${error.message}`, { duration: 8000 });
      }
    },
  });

  const runFullHealthCheck = useCallback(() => {
    if (!adminToken) {
      toast.error('Authentication required');
      return;
    }
    
    if (safeMode) {
      toast.error('Health checks are disabled in safe mode');
      return;
    }
    
    setRunningHealthCheck(true);
    setHealthCheckError(null);
    toast('🔍 Running comprehensive storage health check...', { duration: 3000 });
    
    try {
      runHealthCheckMutation.mutate({
        adminToken,
        testUpload: true, // Run with test upload
      });
    } catch (error) {
      setRunningHealthCheck(false);
      console.error('❌ Failed to start health check:', error);
      toast.error('Failed to start health check');
    }
  }, [adminToken, runHealthCheckMutation, safeMode]);

  const refreshData = useCallback(() => {
    healthCheckQuery.refetch();
    innovatorsStatusQuery.refetch();
    toast('🔄 Refreshing data...', { duration: 2000 });
  }, [healthCheckQuery, innovatorsStatusQuery]);

  if (!adminToken) {
    return (
      <div className="p-6 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <span className="text-red-800 dark:text-red-200">Authentication required to access image system dashboard</span>
        </div>
      </div>
    );
  }

  const healthData = healthCheckQuery.data;
  const innovatorsData = innovatorsStatusQuery.data;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Image System Dashboard
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Monitor and manage the image upload and storage system
            {safeMode && (
              <span className="ml-2 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 text-xs rounded-full">
                Safe Mode
              </span>
            )}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setSafeMode(prev => !prev)}
            className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors ${
              safeMode 
                ? 'bg-green-600 text-white hover:bg-green-700' 
                : 'bg-yellow-600 text-white hover:bg-yellow-700'
            }`}
            title={safeMode ? 'Disable safe mode to enable health checks' : 'Enable safe mode to disable health checks'}
          >
            <span>{safeMode ? '🔒 Safe Mode' : '🔓 Normal Mode'}</span>
          </button>
          
          <button
            onClick={refreshData}
            disabled={healthCheckQuery.isLoading || innovatorsStatusQuery.isLoading}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 flex items-center space-x-2"
          >
            <RefreshCw className={`h-4 w-4 ${healthCheckQuery.isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          
          <button
            onClick={runFullHealthCheck}
            disabled={runningHealthCheck || runHealthCheckMutation.isPending || safeMode}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
          >
            <Play className={`h-4 w-4 ${runningHealthCheck ? 'animate-spin' : ''}`} />
            <span>{safeMode ? 'Disabled in Safe Mode' : 'Run Health Check'}</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'health', label: 'System Health', icon: Activity },
            { id: 'innovators', label: 'Innovator Images', icon: Users },
            { id: 'diagnostics', label: 'Diagnostics', icon: Settings },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                selectedTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {selectedTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Server className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Storage Status</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {healthData?.success ? (
                      <span className="text-green-600">Healthy</span>
                    ) : healthCheckQuery.isLoading ? (
                      <span className="text-gray-400">Loading...</span>
                    ) : safeMode ? (
                      <span className="text-yellow-600">Safe Mode</span>
                    ) : (
                      <span className="text-red-600">Issues</span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Users className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Innovators</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {innovatorsData?.summary?.total || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ImageIcon className="h-8 w-8 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">With Images</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {innovatorsData?.summary?.withImages || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Zap className="h-8 w-8 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Base64 Storage</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {innovatorsData?.summary?.withBase64Images || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* System Status Overview with Fallback UI */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              System Status Overview
            </h3>
            
            {safeMode ? (
              <div className="text-center py-8">
                <div className="h-12 w-12 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Settings className="h-6 w-6 text-yellow-600" />
                </div>
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Safe Mode Enabled
                </h4>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  Storage health checks are disabled. The image upload system will work with basic functionality.
                </p>
                <button
                  onClick={() => setSafeMode(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Enable Health Checks
                </button>
              </div>
            ) : healthCheckError ? (
              <div className="text-center py-8">
                <div className="h-12 w-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Health Check Unavailable
                </h4>
                <p className="text-red-600 mb-4 text-sm">
                  {healthCheckError.includes('No procedure found') 
                    ? 'The storage health check service is not available. This may be temporary.'
                    : `Error: ${healthCheckError}`}
                </p>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setHealthCheckError(null);
                      healthCheckQuery.refetch();
                    }}
                    className="block w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Retry Health Check
                  </button>
                  <button
                    onClick={() => setSafeMode(true)}
                    className="block w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                  >
                    Enable Safe Mode
                  </button>
                </div>
              </div>
            ) : healthCheckQuery.isLoading ? (
              <div className="flex items-center space-x-2">
                <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />
                <span className="text-gray-500">Loading system status...</span>
              </div>
            ) : healthData ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Overall Health Score
                  </span>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${
                      healthData.summary.score >= 80 ? 'bg-green-500' :
                      healthData.summary.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                    }`} />
                    <span className="text-sm font-semibold">
                      {healthData.summary.score}/100
                    </span>
                  </div>
                </div>
                
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      healthData.summary.score >= 80 ? 'bg-green-500' :
                      healthData.summary.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${healthData.summary.score}%` }}
                  />
                </div>
                
                {healthData.summary.recommendations.length > 0 && (
                  <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                      Recommendations:
                    </h4>
                    <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                      {healthData.summary.recommendations.map((rec, index) => (
                        <li key={index}>• {rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                <p className="text-gray-500 mb-4">Failed to load system status</p>
                <button
                  onClick={() => healthCheckQuery.refetch()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedTab === 'health' && (
        <div className="space-y-6">
          {safeMode ? (
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="text-center">
                <div className="h-16 w-16 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Settings className="h-8 w-8 text-yellow-600" />
                </div>
                <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
                  Health Monitoring Disabled
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  Safe mode is enabled. Health monitoring is disabled to prevent potential issues.
                  The image upload system will continue to work with basic functionality.
                </p>
                <div className="space-y-3">
                  <button
                    onClick={() => setSafeMode(false)}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Enable Health Monitoring
                  </button>
                  <p className="text-sm text-gray-500">
                    Re-enabling will allow health checks but may cause errors if the storage system is unavailable.
                  </p>
                </div>
              </div>
            </div>
          ) : healthCheckError ? (
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="text-center">
                <div className="h-16 w-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <XCircle className="h-8 w-8 text-red-600" />
                </div>
                <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
                  Health Check Service Unavailable
                </h3>
                <p className="text-red-600 mb-4">
                  {healthCheckError}
                </p>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  The storage health check service is currently unavailable. This may be due to:
                </p>
                <ul className="text-left text-gray-500 dark:text-gray-400 mb-6 space-y-1">
                  <li>• The service is temporarily down</li>
                  <li>• A recent deployment removed the health check endpoint</li>
                  <li>• Network connectivity issues</li>
                  <li>• Server configuration problems</li>
                </ul>
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      setHealthCheckError(null);
                      healthCheckQuery.refetch();
                    }}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mr-3"
                  >
                    Retry Health Check
                  </button>
                  <button
                    onClick={() => setSafeMode(true)}
                    className="px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                  >
                    Enable Safe Mode
                  </button>
                </div>
              </div>
            </div>
          ) : healthCheckQuery.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
              <span className="ml-3 text-gray-500">Loading health data...</span>
            </div>
          ) : healthData ? (
            <>
              {/* Health Status Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  {
                    title: 'Bucket Exists',
                    status: healthData.health.bucketExists,
                    icon: Database,
                  },
                  {
                    title: 'Bucket Accessible',
                    status: healthData.health.bucketAccessible,
                    icon: HardDrive,
                  },
                  {
                    title: 'Memory Status',
                    status: healthData.health.memoryStatus === 'low',
                    icon: Activity,
                    subtitle: healthData.health.memoryStatus,
                  },
                ].map((item, index) => (
                  <div key={index} className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <item.icon className={`h-8 w-8 ${item.status ? 'text-green-600' : 'text-red-600'}`} />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{item.title}</p>
                        <div className="flex items-center space-x-2">
                          {item.status ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )}
                          <span className={`text-sm font-semibold ${item.status ? 'text-green-600' : 'text-red-600'}`}>
                            {item.status ? 'OK' : 'Error'}
                          </span>
                          {item.subtitle && (
                            <span className="text-xs text-gray-500">({item.subtitle})</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Detailed Health Information */}
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Detailed Health Information
                </h3>
                
                <div className="space-y-4">
                  {/* Memory Details */}
                  {healthData.health.details.memory && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Memory Usage
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Heap Used:</span>
                          <span className="ml-2 font-mono">{healthData.health.details.memory.heapUsed}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Heap Total:</span>
                          <span className="ml-2 font-mono">{healthData.health.details.memory.heapTotal}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">RSS:</span>
                          <span className="ml-2 font-mono">{healthData.health.details.memory.rss}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Available:</span>
                          <span className="ml-2 font-mono">{healthData.health.details.memory.available}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Environment Details */}
                  {healthData.health.details.environment && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Configuration
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Max File Size:</span>
                          <span className="ml-2 font-mono">{healthData.health.details.environment.uploadMaxFileSize}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Chunk Size:</span>
                          <span className="ml-2 font-mono">{healthData.health.details.environment.chunkSize}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Memory Limit:</span>
                          <span className="ml-2 font-mono">{healthData.health.details.environment.memoryLimit}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Errors and Warnings */}
              {(healthData.health.errors.length > 0 || healthData.health.warnings.length > 0) && (
                <div className="space-y-4">
                  {healthData.health.errors.length > 0 && (
                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                      <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                        Errors ({healthData.health.errors.length})
                      </h4>
                      <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                        {healthData.health.errors.map((error, index) => (
                          <li key={index}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {healthData.health.warnings.length > 0 && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                        Warnings ({healthData.health.warnings.length})
                      </h4>
                      <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                        {healthData.health.warnings.map((warning, index) => (
                          <li key={index}>• {warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Health Check Failed
              </h3>
              <p className="text-gray-500 mb-4">
                Unable to retrieve system health information
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => healthCheckQuery.refetch()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mr-3"
                >
                  Retry
                </button>
                <button
                  onClick={() => setSafeMode(true)}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                >
                  Enable Safe Mode
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {selectedTab === 'innovators' && (
        <div className="space-y-6">
          {innovatorsStatusQuery.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
              <span className="ml-3 text-gray-500">Loading innovator data...</span>
            </div>
          ) : innovatorsData ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="text-center">
                    <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                      {innovatorsData.summary.total}
                    </p>
                    <p className="text-sm text-gray-500">Total Innovators</p>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="text-center">
                    <ImageIcon className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                      {innovatorsData.summary.withImages}
                    </p>
                    <p className="text-sm text-gray-500">With Images</p>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="text-center">
                    <FileImage className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                      {innovatorsData.summary.withBase64Images}
                    </p>
                    <p className="text-sm text-gray-500">Base64 Storage</p>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="text-center">
                    <Server className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                      {innovatorsData.summary.withExternalImages}
                    </p>
                    <p className="text-sm text-gray-500">External URLs</p>
                  </div>
                </div>
              </div>

              {/* Innovators List */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Innovator Image Status
                  </h3>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Innovator
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Image Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Storage Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Size
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Updated
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {innovatorsData.innovators.map((innovator) => (
                        <tr key={innovator.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                {innovator.hasImage ? (
                                  <img
                                    className="h-10 w-10 rounded-full object-cover"
                                    src={innovator.avatar || ''}
                                    alt={innovator.name}
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <div className="h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                                    <Users className="h-5 w-5 text-gray-500" />
                                  </div>
                                )}
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {innovator.name}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {innovator.role}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {innovator.hasImage ? (
                                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                              ) : (
                                <XCircle className="h-4 w-4 text-gray-400 mr-2" />
                              )}
                              <span className={`text-sm ${innovator.hasImage ? 'text-green-600' : 'text-gray-500'}`}>
                                {innovator.hasImage ? 'Has Image' : 'No Image'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {innovator.hasImage && (
                              <div className="flex items-center">
                                {innovator.isBase64 ? (
                                  <>
                                    <FileImage className="h-4 w-4 text-purple-500 mr-2" />
                                    <span className="text-sm text-purple-600">Base64</span>
                                  </>
                                ) : innovator.isExternalUrl ? (
                                  <>
                                    <Server className="h-4 w-4 text-orange-500 mr-2" />
                                    <span className="text-sm text-orange-600">External URL</span>
                                  </>
                                ) : (
                                  <>
                                    <HardDrive className="h-4 w-4 text-blue-500 mr-2" />
                                    <span className="text-sm text-blue-600">File Storage</span>
                                  </>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {innovator.imageSize || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {new Date(innovator.updatedAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Failed to Load Innovators
              </h3>
              <p className="text-gray-500 mb-4">
                Unable to retrieve innovator image status
              </p>
              <button
                onClick={() => innovatorsStatusQuery.refetch()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      )}

      {selectedTab === 'diagnostics' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              System Diagnostics
            </h3>
            
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                  Image Upload Systems Available:
                </h4>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• Standard Image Upload (File Storage)</li>
                  <li>• Bulletproof Image Upload (Enhanced Processing)</li>
                  <li>• Progressive Upload (Large Files)</li>
                  <li>• Simple Base64 Storage (Fallback)</li>
                </ul>
              </div>
              
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <h4 className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
                  Recommendations for Optimal Performance:
                </h4>
                <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                  <li>• Use bulletproof upload for critical images</li>
                  <li>• Use progressive upload for files &gt; 25MB</li>
                  <li>• Use simple base64 storage for innovator avatars</li>
                  <li>• Monitor memory usage during bulk operations</li>
                </ul>
              </div>
              
              <div className="text-center py-8">
                <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">
                  Additional diagnostic tools and configuration options will be available here.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
