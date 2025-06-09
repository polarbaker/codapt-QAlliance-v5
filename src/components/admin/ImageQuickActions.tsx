import React, { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import {
  Zap,
  Upload,
  Search,
  Filter,
  Grid3X3,
  List,
  Columns3,
  RefreshCw,
  Settings,
  BarChart3,
  Keyboard,
  Star,
  Clock,
  TrendingUp,
  HardDrive,
  Eye,
  Target,
  Lightbulb,
  Bookmark,
  Download,
  CheckSquare,
} from 'lucide-react';

interface ImageQuickActionsProps {
  onUpload: () => void;
  onRefresh: () => void;
  onToggleFilters: () => void;
  onToggleAnalytics: () => void;
  onShowShortcuts: () => void;
  onViewModeChange: (mode: 'grid' | 'list' | 'masonry') => void;
  currentViewMode: 'grid' | 'list' | 'masonry';
  isLoading?: boolean;
  totalImages: number;
  totalSize: number;
  weeklyGrowth: number;
  className?: string;
  hasActiveFilters?: boolean;
  selectedCount?: number;
}

export function ImageQuickActions({
  onUpload,
  onRefresh,
  onToggleFilters,
  onToggleAnalytics,
  onShowShortcuts,
  onViewModeChange,
  currentViewMode,
  isLoading = false,
  totalImages,
  totalSize,
  weeklyGrowth,
  className = "",
  hasActiveFilters = false,
  selectedCount = 0,
}: ImageQuickActionsProps) {
  const [showQuickStats, setShowQuickStats] = useState(false);

  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  const quickActions = [
    {
      id: 'upload',
      label: 'Upload Images',
      icon: Upload,
      action: onUpload,
      shortcut: 'Ctrl+U',
      color: 'bg-blue-600 hover:bg-blue-700',
      description: 'Upload new images to the gallery',
    },
    {
      id: 'refresh',
      label: 'Refresh',
      icon: RefreshCw,
      action: onRefresh,
      shortcut: 'R',
      color: 'bg-green-600 hover:bg-green-700',
      description: 'Refresh the image gallery',
      loading: isLoading,
    },
    {
      id: 'filters',
      label: 'Toggle Filters',
      icon: Filter,
      action: onToggleFilters,
      shortcut: 'Ctrl+F',
      color: 'bg-purple-600 hover:bg-purple-700',
      description: 'Show or hide advanced filters',
    },
    {
      id: 'analytics',
      label: 'View Analytics',
      icon: BarChart3,
      action: onToggleAnalytics,
      shortcut: 'A',
      color: 'bg-orange-600 hover:bg-orange-700',
      description: 'View image analytics and insights',
    },
    {
      id: 'shortcuts',
      label: 'Keyboard Shortcuts',
      icon: Keyboard,
      action: onShowShortcuts,
      shortcut: '?',
      color: 'bg-gray-600 hover:bg-gray-700',
      description: 'View all keyboard shortcuts',
    },
  ];

  const viewModeActions = [
    {
      id: 'grid',
      label: 'Grid View',
      icon: Grid3X3,
      mode: 'grid' as const,
      shortcut: '1',
    },
    {
      id: 'list',
      label: 'List View',
      icon: List,
      mode: 'list' as const,
      shortcut: '2',
    },
    {
      id: 'masonry',
      label: 'Masonry View',
      icon: Columns3,
      mode: 'masonry' as const,
      shortcut: '3',
    },
  ];

  const handleQuickAction = useCallback((actionId: string, action: () => void) => {
    action();
    toast.success(`${actionId} activated`, { duration: 1500 });
  }, []);

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Zap className="h-5 w-5 text-yellow-500" />
          <h3 className="text-lg font-semibold text-text-dark dark:text-text-light">
            Quick Actions
          </h3>
        </div>
        
        <button
          onClick={() => setShowQuickStats(!showQuickStats)}
          className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
        >
          {showQuickStats ? 'Hide Stats' : 'Show Stats'}
        </button>
      </div>

      {/* Quick Stats */}
      {showQuickStats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1 text-blue-600 mb-1">
              <Eye className="h-4 w-4" />
              <span className="text-sm font-medium">Images</span>
            </div>
            <p className="text-lg font-bold text-text-dark dark:text-text-light">
              {totalImages.toLocaleString()}
            </p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1 text-green-600 mb-1">
              <HardDrive className="h-4 w-4" />
              <span className="text-sm font-medium">Storage</span>
            </div>
            <p className="text-lg font-bold text-text-dark dark:text-text-light">
              {formatFileSize(totalSize)}
            </p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1 text-purple-600 mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm font-medium">This Week</span>
            </div>
            <p className="text-lg font-bold text-text-dark dark:text-text-light">
              +{weeklyGrowth}
            </p>
          </div>

          {hasActiveFilters && (
            <div className="text-center">
              <div className="flex items-center justify-center space-x-1 text-yellow-600 mb-1">
                <Filter className="h-4 w-4" />
                <span className="text-sm font-medium">Filtered</span>
              </div>
              <p className="text-lg font-bold text-text-dark dark:text-text-light">
                Active
              </p>
            </div>
          )}

          {selectedCount > 0 && (
            <div className="text-center">
              <div className="flex items-center justify-center space-x-1 text-pink-600 mb-1">
                <CheckSquare className="h-4 w-4" />
                <span className="text-sm font-medium">Selected</span>
              </div>
              <p className="text-lg font-bold text-text-dark dark:text-text-light">
                {selectedCount}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Main Actions */}
      <div className="space-y-3 mb-4">
        <h4 className="text-sm font-medium text-text-muted dark:text-text-light/70">
          Main Actions
        </h4>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
          {quickActions.map(action => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={() => handleQuickAction(action.label, action.action)}
                disabled={action.loading}
                className={`flex items-center space-x-2 p-3 text-white rounded-lg transition-colors text-sm font-medium ${action.color} disabled:opacity-50 disabled:cursor-not-allowed`}
                title={`${action.description} (${action.shortcut})`}
              >
                <Icon className={`h-4 w-4 ${action.loading ? 'animate-spin' : ''}`} />
                <span className="hidden lg:inline">{action.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* View Mode Selector */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-text-muted dark:text-text-light/70">
          View Mode
        </h4>
        <div className="flex space-x-1">
          {viewModeActions.map(viewMode => {
            const Icon = viewMode.icon;
            const isActive = currentViewMode === viewMode.mode;
            return (
              <button
                key={viewMode.id}
                onClick={() => onViewModeChange(viewMode.mode)}
                className={`flex-1 flex items-center justify-center space-x-2 p-3 rounded-lg transition-colors text-sm font-medium ${
                  isActive
                    ? 'bg-secondary text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
                title={`${viewMode.label} (${viewMode.shortcut})`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{viewMode.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tips */}
      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <div className="flex items-start space-x-2">
          <Lightbulb className="h-4 w-4 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <p className="font-medium mb-1">Pro Tips:</p>
            <ul className="space-y-1 text-xs">
              <li>• Use keyboard shortcuts for faster navigation</li>
              <li>• Drag and drop images to upload multiple files</li>
              <li>• Use filters to quickly find specific images</li>
              <li>• Select multiple images for bulk operations</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
