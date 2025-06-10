import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useUserStore } from "~/stores/userStore";
import { useTRPC } from "~/trpc/react";
import { toast } from "react-hot-toast";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Database,
  Server,
  Image as ImageIcon,
  Upload,
  Download,
  Trash2,
  Info,
  Eye,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/images/debug")({
  component: AdminImagesDebugPage,
});

function AdminImagesDebugPage() {
  const { adminToken } = useUserStore();
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [cleanupResults, setCleanupResults] = useState<Record<string, any>>({});
  const [isRunningCleanup, setIsRunningCleanup] = useState(false);
  const [cleanupType, setCleanupType] = useState<'scan' | 'cleanup' | 'comprehensive'>('scan');
  
  const trpc = useTRPC();
  
  // Test queries
  const imagesQuery = trpc.adminListImages.useQuery({
    adminToken: adminToken || "",
    page: 1,
    pageSize: 5,
  }, {
    enabled: !!adminToken,
    retry: false,
  });
  
  const collectionsQuery = trpc.adminListImageCollections.useQuery({
    adminToken: adminToken || "",
    includeImages: false,
  }, {
    enabled: !!adminToken,
    retry: false,
  });
  
  const runDiagnostics = async () => {
    if (!adminToken) {
      toast.error('Admin token required for diagnostics');
      return;
    }
    
    setIsRunningTests(true);
    const results: Record<string, any> = {};
    
    try {
      // Test 1: Authentication
      results.auth = { status: 'testing', message: 'Testing authentication...' };
      setTestResults({ ...results });
      
      try {
        await trpc.verifyAdminToken.query({ adminToken });
        results.auth = { status: 'success', message: 'Authentication successful' };
      } catch (error) {
        results.auth = { status: 'error', message: `Authentication failed: ${error}` };
      }
      
      // Test 2: Database Connection
      results.database = { status: 'testing', message: 'Testing database connection...' };
      setTestResults({ ...results });
      
      try {
        const dbTest = await trpc.adminListImages.query({
          adminToken,
          page: 1,
          pageSize: 1,
        });
        results.database = { 
          status: 'success', 
          message: `Database connection successful. Found ${dbTest.pagination?.totalCount || 0} images.` 
        };
      } catch (error) {
        results.database = { status: 'error', message: `Database error: ${error}` };
      }
      
      // Test 3: Image Collections
      results.collections = { status: 'testing', message: 'Testing image collections...' };
      setTestResults({ ...results });
      
      try {
        const collectionsTest = await trpc.adminListImageCollections.query({
          adminToken,
          includeImages: false,
        });
        results.collections = { 
          status: 'success', 
          message: `Collections working. Found ${collectionsTest.collections?.length || 0} collections.` 
        };
      } catch (error) {
        results.collections = { status: 'error', message: `Collections error: ${error}` };
      }
      
      // Test 4: Storage Health Check
      results.storage = { status: 'testing', message: 'Testing storage system...' };
      setTestResults({ ...results });
      
      try {
        const storageTest = await trpc.storageHealthCheck.query({
          adminToken,
        });
        results.storage = { 
          status: storageTest.healthy ? 'success' : 'warning', 
          message: `Storage ${storageTest.healthy ? 'healthy' : 'has issues'}: ${storageTest.message}`,
          details: storageTest
        };
      } catch (error) {
        results.storage = { status: 'error', message: `Storage error: ${error}` };
      }
      
      // Test 5: Image URL Generation
      results.urls = { status: 'testing', message: 'Testing image URL generation...' };
      setTestResults({ ...results });
      
      try {
        // Test with a sample UUID
        const testPath = 'test-image.jpg';
                const { getImageUrl } = await import('~/utils/common');
        const testUrl = getImageUrl(testPath);
        
        results.urls = { 
          status: testUrl ? 'success' : 'warning', 
          message: testUrl ? 'URL generation working' : 'URL generation may have issues',
          details: { testPath, generatedUrl: testUrl }
        };
      } catch (error) {
        results.urls = { status: 'error', message: `URL generation error: ${error}` };
      }
      
    } catch (error) {
      console.error('Diagnostics error:', error);
      toast.error('Diagnostics failed');
    } finally {
      setIsRunningTests(false);
      setTestResults(results);
    }
  };

  const runOrphanedFilesScan = async () => {
    if (!adminToken) {
      toast.error('Admin token required for cleanup operations');
      return;
    }
    
    setIsRunningCleanup(true);
    const results: Record<string, any> = { ...cleanupResults };
    
    try {
      results.orphanedFilesScan = { status: 'running', message: 'Scanning for orphaned files...' };
      setCleanupResults({ ...results });
      
      const scanResult = await trpc.adminScanOrphanedFiles.query({
        adminToken,
        maxFiles: 100,
        dryRun: true,
      });
      
      results.orphanedFilesScan = { 
        status: 'success', 
        message: `Found ${scanResult.orphanedFiles.total} orphaned files`,
        data: scanResult
      };
      
      toast.success(`Scan completed: ${scanResult.orphanedFiles.total} orphaned files found`);
    } catch (error) {
      results.orphanedFilesScan = { 
        status: 'error', 
        message: `Scan failed: ${error}`,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      toast.error('Orphaned files scan failed');
    } finally {
      setIsRunningCleanup(false);
      setCleanupResults(results);
    }
  };

  const runOrphanedRecordsScan = async () => {
    if (!adminToken) {
      toast.error('Admin token required for cleanup operations');
      return;
    }
    
    setIsRunningCleanup(true);
    const results: Record<string, any> = { ...cleanupResults };
    
    try {
      results.orphanedRecordsScan = { status: 'running', message: 'Scanning for orphaned database records...' };
      setCleanupResults({ ...results });
      
      const scanResult = await trpc.adminScanOrphanedRecords.query({
        adminToken,
        maxRecords: 100,
        dryRun: true,
      });
      
      results.orphanedRecordsScan = { 
        status: 'success', 
        message: `Found ${scanResult.orphanedRecords.total} orphaned records`,
        data: scanResult
      };
      
      toast.success(`Scan completed: ${scanResult.orphanedRecords.total} orphaned records found`);
    } catch (error) {
      results.orphanedRecordsScan = { 
        status: 'error', 
        message: `Scan failed: ${error}`,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      toast.error('Orphaned records scan failed');
    } finally {
      setIsRunningCleanup(false);
      setCleanupResults(results);
    }
  };

  const runComprehensiveCleanup = async (dryRun: boolean = true) => {
    if (!adminToken) {
      toast.error('Admin token required for cleanup operations');
      return;
    }
    
    if (!dryRun && !confirm('Are you sure you want to perform actual cleanup? This will permanently delete orphaned files and records.')) {
      return;
    }
    
    setIsRunningCleanup(true);
    const results: Record<string, any> = { ...cleanupResults };
    
    try {
      results.comprehensiveCleanup = { 
        status: 'running', 
        message: `Running comprehensive cleanup (${dryRun ? 'dry run' : 'actual cleanup'})...` 
      };
      setCleanupResults({ ...results });
      
      const cleanupResult = await trpc.adminComprehensiveCleanup.mutate({
        adminToken,
        operations: {
          scanOrphanedFiles: true,
          scanOrphanedRecords: true,
          cleanupTempFiles: true,
          cleanupOldOrphans: false, // Conservative default
        },
        limits: {
          maxFiles: 100,
          maxRecords: 100,
          maxCleanupItems: 20,
        },
        dryRun,
        force: !dryRun,
      });
      
      results.comprehensiveCleanup = { 
        status: 'success', 
        message: `Cleanup completed: ${cleanupResult.summary.totalCleanedUp} items processed`,
        data: cleanupResult
      };
      
      if (dryRun) {
        toast.success(`Dry run completed: Found ${cleanupResult.summary.totalFilesIdentified} orphaned files and ${cleanupResult.summary.totalRecordsIdentified} orphaned records`);
      } else {
        toast.success(`Cleanup completed: ${cleanupResult.summary.totalCleanedUp} items cleaned up`);
      }
    } catch (error) {
      results.comprehensiveCleanup = { 
        status: 'error', 
        message: `Cleanup failed: ${error}`,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      toast.error('Comprehensive cleanup failed');
    } finally {
      setIsRunningCleanup(false);
      setCleanupResults(results);
    }
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'testing':
      case 'running':
        return <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'testing':
      case 'running':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-black">
      <div className="container-padding">
        {/* Header */}
        <div className="flex items-center justify-between py-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-4">
            <Link
              to="/admin/images"
              className="flex items-center space-x-2 text-text-muted dark:text-text-light/70 hover:text-text-dark dark:hover:text-text-light transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Images</span>
            </Link>
          </div>
          
          <button
            onClick={runDiagnostics}
            disabled={isRunningTests || !adminToken}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`h-4 w-4 ${isRunningTests ? 'animate-spin' : ''}`} />
            <span>{isRunningTests ? 'Running Tests...' : 'Run Diagnostics'}</span>
          </button>
        </div>

        <div className="py-6">
          <div className="flex items-center space-x-4 mb-6">
            <div className="h-12 w-12 flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20">
              <ImageIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-text-dark dark:text-text-light">
                Image System Diagnostics
              </h1>
              <p className="text-text-muted dark:text-text-light/70">
                Debug and test the admin image management system
              </p>
            </div>
          </div>

          {/* System Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-text-dark dark:text-text-light mb-4">
                Query Status
              </h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  {imagesQuery.isLoading ? (
                    <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
                  ) : imagesQuery.isError ? (
                    <XCircle className="h-4 w-4 text-red-600" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  )}
                  <span className="text-sm">Images Query</span>
                </div>
                <div className="flex items-center space-x-3">
                  {collectionsQuery.isLoading ? (
                    <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
                  ) : collectionsQuery.isError ? (
                    <XCircle className="h-4 w-4 text-red-600" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  )}
                  <span className="text-sm">Collections Query</span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-text-dark dark:text-text-light mb-4">
                Data Summary
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-text-muted dark:text-text-light/70">Total Images:</span>
                  <span className="text-sm font-medium">
                    {imagesQuery.data?.pagination?.totalCount || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-text-muted dark:text-text-light/70">Collections:</span>
                  <span className="text-sm font-medium">
                    {collectionsQuery.data?.collections?.length || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-text-muted dark:text-text-light/70">Auth Status:</span>
                  <span className="text-sm font-medium">
                    {adminToken ? 'Authenticated' : 'Not Authenticated'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-text-dark dark:text-text-light mb-4">
                Error Details
              </h3>
              <div className="space-y-2">
                {imagesQuery.isError && (
                  <div className="text-sm text-red-600">
                    Images: {imagesQuery.error?.message || 'Unknown error'}
                  </div>
                )}
                {collectionsQuery.isError && (
                  <div className="text-sm text-red-600">
                    Collections: {collectionsQuery.error?.message || 'Unknown error'}
                  </div>
                )}
                {!imagesQuery.isError && !collectionsQuery.isError && (
                  <div className="text-sm text-green-600">No errors detected</div>
                )}
              </div>
            </div>
          </div>

          {/* Diagnostic Test Results */}
          {Object.keys(testResults).length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-8">
              <h3 className="text-lg font-semibold text-text-dark dark:text-text-light mb-4">
                Diagnostic Test Results
              </h3>
              <div className="space-y-4">
                {Object.entries(testResults).map(([testName, result]) => (
                  <div
                    key={testName}
                    className={`p-4 rounded-lg border ${getStatusColor(result.status)}`}
                  >
                    <div className="flex items-start space-x-3">
                      {getStatusIcon(result.status)}
                      <div className="flex-1">
                        <h4 className="font-medium text-text-dark dark:text-text-light capitalize">
                          {testName.replace(/([A-Z])/g, ' $1').trim()}
                        </h4>
                        <p className="text-sm text-text-muted dark:text-text-light/70 mt-1">
                          {result.message}
                        </p>
                        {result.details && (
                          <details className="mt-2">
                            <summary className="text-xs text-blue-600 cursor-pointer">
                              Show Details
                            </summary>
                            <pre className="text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded mt-2 overflow-auto">
                              {JSON.stringify(result.details, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cleanup Operations */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-8">
            <h3 className="text-lg font-semibold text-text-dark dark:text-text-light mb-4">
              Cleanup Operations
            </h3>
            
            <div className="space-y-4 mb-6">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                      About Cleanup Operations
                    </h4>
                    <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                      <p>• <strong>Orphaned Files:</strong> Files in storage without database records (failed uploads)</p>
                      <p>• <strong>Orphaned Records:</strong> Database records without corresponding storage files</p>
                      <p>• <strong>Temporary Files:</strong> Upload chunks and temporary files that weren't cleaned up</p>
                      <p>• <strong>Dry Run:</strong> Safe preview mode that shows what would be deleted without actually deleting</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <button
                onClick={runOrphanedFilesScan}
                disabled={isRunningCleanup}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`h-4 w-4 ${isRunningCleanup ? 'animate-spin' : ''}`} />
                <span>Scan Orphaned Files</span>
              </button>
              
              <button
                onClick={runOrphanedRecordsScan}
                disabled={isRunningCleanup}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Database className={`h-4 w-4 ${isRunningCleanup ? 'animate-spin' : ''}`} />
                <span>Scan Orphaned Records</span>
              </button>
              
              <button
                onClick={() => runComprehensiveCleanup(true)}
                disabled={isRunningCleanup}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Eye className={`h-4 w-4 ${isRunningCleanup ? 'animate-spin' : ''}`} />
                <span>Dry Run Cleanup</span>
              </button>
              
              <button
                onClick={() => runComprehensiveCleanup(false)}
                disabled={isRunningCleanup}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className={`h-4 w-4 ${isRunningCleanup ? 'animate-spin' : ''}`} />
                <span>Actual Cleanup</span>
              </button>
            </div>
          </div>

          {/* Cleanup Results */}
          {Object.keys(cleanupResults).length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-8">
              <h3 className="text-lg font-semibold text-text-dark dark:text-text-light mb-4">
                Cleanup Results
              </h3>
              <div className="space-y-4">
                {Object.entries(cleanupResults).map(([operationName, result]) => (
                  <div
                    key={operationName}
                    className={`p-4 rounded-lg border ${getStatusColor(result.status)}`}
                  >
                    <div className="flex items-start space-x-3">
                      {getStatusIcon(result.status)}
                      <div className="flex-1">
                        <h4 className="font-medium text-text-dark dark:text-text-light capitalize">
                          {operationName.replace(/([A-Z])/g, ' $1').trim()}
                        </h4>
                        <p className="text-sm text-text-muted dark:text-text-light/70 mt-1">
                          {result.message}
                        </p>
                        {result.data && (
                          <details className="mt-2">
                            <summary className="text-xs text-blue-600 cursor-pointer">
                              Show Detailed Results
                            </summary>
                            <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-700 rounded">
                              {/* Orphaned Files Results */}
                              {result.data.orphanedFiles && (
                                <div className="mb-4">
                                  <h5 className="font-medium text-sm mb-2">Orphaned Files Summary:</h5>
                                  <div className="text-xs space-y-1">
                                    <p>Total: {result.data.orphanedFiles.total} files ({((result.data.orphanedFiles.totalSize || 0) / (1024 * 1024)).toFixed(1)}MB)</p>
                                    <p>Temporary: {result.data.orphanedFiles.categories?.temporaryFiles?.count || 0}</p>
                                    <p>Failed Uploads: {result.data.orphanedFiles.categories?.possibleFailedUploads?.count || 0}</p>
                                    <p>Unknown: {result.data.orphanedFiles.categories?.unknownFiles?.count || 0}</p>
                                  </div>
                                  {result.data.recommendations && result.data.recommendations.length > 0 && (
                                    <div className="mt-2">
                                      <p className="font-medium text-xs">Recommendations:</p>
                                      <ul className="text-xs list-disc list-inside space-y-1">
                                        {result.data.recommendations.map((rec: string, index: number) => (
                                          <li key={index}>{rec}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {/* Orphaned Records Results */}
                              {result.data.orphanedRecords && (
                                <div className="mb-4">
                                  <h5 className="font-medium text-sm mb-2">Orphaned Records Summary:</h5>
                                  <div className="text-xs space-y-1">
                                    <p>Total: {result.data.orphanedRecords.total} records</p>
                                    <p>Recent: {result.data.orphanedRecords.categories?.recent?.count || 0}</p>
                                    <p>Today: {result.data.orphanedRecords.categories?.today?.count || 0}</p>
                                    <p>This Week: {result.data.orphanedRecords.categories?.thisWeek?.count || 0}</p>
                                    <p>Older: {result.data.orphanedRecords.categories?.older?.count || 0}</p>
                                  </div>
                                </div>
                              )}
                              
                              {/* Comprehensive Cleanup Results */}
                              {result.data.summary && (
                                <div className="mb-4">
                                  <h5 className="font-medium text-sm mb-2">Cleanup Summary:</h5>
                                  <div className="text-xs space-y-1">
                                    <p>Operations: {result.data.summary.completedOperations}/{result.data.summary.totalOperations}</p>
                                    <p>Files Identified: {result.data.summary.totalFilesIdentified}</p>
                                    <p>Records Identified: {result.data.summary.totalRecordsIdentified}</p>
                                    <p>Items Cleaned: {result.data.summary.totalCleanedUp}</p>
                                    <p>Size Reclaimed: {((result.data.summary.totalSizeReclaimed || 0) / (1024 * 1024)).toFixed(1)}MB</p>
                                    {result.data.summary.errors > 0 && (
                                      <p className="text-red-600">Errors: {result.data.summary.errors}</p>
                                    )}
                                  </div>
                                </div>
                              )}
                              
                              <details>
                                <summary className="text-xs text-gray-600 cursor-pointer">
                                  Show Raw Data
                                </summary>
                                <pre className="text-xs bg-gray-200 dark:bg-gray-800 p-2 rounded mt-2 overflow-auto max-h-40">
                                  {JSON.stringify(result.data, null, 2)}
                                </pre>
                              </details>
                            </div>
                          </details>
                        )}
                        {result.error && (
                          <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-700 dark:text-red-300">
                            Error: {result.error}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-text-dark dark:text-text-light mb-4">
              Quick Actions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                onClick={() => {
                  imagesQuery.refetch();
                  collectionsQuery.refetch();
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Refresh Queries</span>
              </button>
              
              <Link
                to="/admin/images"
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <ImageIcon className="h-4 w-4" />
                <span>View Images</span>
              </Link>
              
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify({
                    adminToken: adminToken ? 'present' : 'missing',
                    imagesQuery: {
                      isLoading: imagesQuery.isLoading,
                      isError: imagesQuery.isError,
                      error: imagesQuery.error?.message,
                      dataCount: imagesQuery.data?.images?.length,
                    },
                    collectionsQuery: {
                      isLoading: collectionsQuery.isLoading,
                      isError: collectionsQuery.isError,
                      error: collectionsQuery.error?.message,
                      dataCount: collectionsQuery.data?.collections?.length,
                    },
                    testResults,
                  }, null, 2));
                  toast.success('Debug info copied to clipboard');
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Download className="h-4 w-4" />
                <span>Copy Debug Info</span>
              </button>
              
              <button
                onClick={() => {
                  setTestResults({});
                  toast.success('Test results cleared');
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                <span>Clear Results</span>
              </button>
              
              <button
                onClick={() => {
                  setCleanupResults({});
                  toast.success('Cleanup results cleared');
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                <span>Clear Cleanup Results</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
