import React, { useState, useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import {
  Filter,
  Search,
  Tag,
  Calendar,
  HardDrive,
  Sliders,
  X,
  Save,
  Bookmark,
  Trash2,
  RotateCcw,
  SortAsc,
  SortDesc,
  Grid,
  List as ListIcon,
  Columns,
  Eye,
  EyeOff,
  Star,
  Clock,
  FileText,
  Image as ImageIcon,
} from 'lucide-react';

interface FilterState {
  search: string;
  category: string;
  tags: string[];
  sortBy: "createdAt" | "fileName" | "fileSize" | "usageCount";
  sortOrder: "asc" | "desc";
  page: number;
  pageSize: number;
  dateRange?: {
    start: string;
    end: string;
  };
  sizeRange?: {
    min: number;
    max: number;
  };
  dimensionRange?: {
    minWidth: number;
    maxWidth: number;
    minHeight: number;
    maxHeight: number;
  };
}

interface SavedFilter {
  name: string;
  filters: FilterState;
}

interface ImageFiltersPanelProps {
  filters: FilterState;
  onFiltersChange: (filters: Partial<FilterState>) => void;
  onResetFilters: () => void;
  savedFilters: SavedFilter[];
  onSaveFilter: (name: string) => void;
  onLoadFilter: (name: string) => void;
  onDeleteFilter: (name: string) => void;
  hasActiveFilters: boolean;
  totalResults: number;
  className?: string;
}

const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'hero', label: 'Hero Images' },
  { value: 'gallery', label: 'Gallery' },
  { value: 'profile', label: 'Profile Pictures' },
  { value: 'logo', label: 'Logos' },
  { value: 'content', label: 'Content Images' },
  { value: 'background', label: 'Backgrounds' },
  { value: 'icon', label: 'Icons' },
  { value: 'product', label: 'Products' },
];

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Date Created' },
  { value: 'fileName', label: 'File Name' },
  { value: 'fileSize', label: 'File Size' },
  { value: 'usageCount', label: 'Usage Count' },
];

const PAGE_SIZE_OPTIONS = [
  { value: 12, label: '12 per page' },
  { value: 24, label: '24 per page' },
  { value: 48, label: '48 per page' },
  { value: 96, label: '96 per page' },
];

export function ImageFiltersPanel({
  filters,
  onFiltersChange,
  onResetFilters,
  savedFilters,
  onSaveFilter,
  onLoadFilter,
  onDeleteFilter,
  hasActiveFilters,
  totalResults,
  className = "",
}: ImageFiltersPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [newFilterName, setNewFilterName] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const handleSaveFilter = useCallback(() => {
    if (!newFilterName.trim()) {
      toast.error("Filter name is required");
      return;
    }
    
    onSaveFilter(newFilterName.trim());
    setNewFilterName("");
    setShowSaveDialog(false);
  }, [newFilterName, onSaveFilter]);

  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.category) count++;
    if (filters.tags.length > 0) count++;
    if (filters.dateRange) count++;
    if (filters.sizeRange) count++;
    if (filters.dimensionRange) count++;
    return count;
  }, [filters]);

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <Filter className="h-5 w-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-text-dark dark:text-text-light">
            Filters
          </h3>
          {activeFiltersCount > 0 && (
            <span className="bg-purple-100 dark:bg-purple-900/20 text-purple-600 text-xs px-2 py-1 rounded-full">
              {activeFiltersCount}
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
          >
            {showAdvanced ? 'Simple' : 'Advanced'}
          </button>
          
          {hasActiveFilters && (
            <button
              onClick={onResetFilters}
              className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
              title="Clear all filters"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
            Search
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => onFiltersChange({ search: e.target.value })}
              placeholder="Search by name, title, description..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
            />
            {filters.search && (
              <button
                onClick={() => onFiltersChange({ search: '' })}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Quick Filters Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
              Category
            </label>
            <select
              value={filters.category}
              onChange={(e) => onFiltersChange({ category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary text-sm"
            >
              {CATEGORIES.map(category => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
              Sort By
            </label>
            <div className="flex space-x-1">
              <select
                value={filters.sortBy}
                onChange={(e) => onFiltersChange({ sortBy: e.target.value as any })}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary text-sm"
              >
                {SORT_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                onClick={() => onFiltersChange({ 
                  sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' 
                })}
                className="px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light hover:bg-gray-50 dark:hover:bg-gray-600"
                title={`Currently: ${filters.sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
              >
                {filters.sortOrder === 'asc' ? (
                  <SortAsc className="h-4 w-4" />
                ) : (
                  <SortDesc className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Page Size */}
          <div>
            <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
              Per Page
            </label>
            <select
              value={filters.pageSize}
              onChange={(e) => onFiltersChange({ pageSize: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary text-sm"
            >
              {PAGE_SIZE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Results */}
          <div>
            <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
              Results
            </label>
            <div className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-text-dark dark:text-text-light text-sm">
              {totalResults.toLocaleString()} images
            </div>
          </div>
        </div>

        {/* Advanced Filters */}
        {showAdvanced && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                Upload Date Range
              </label>
              <select
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '') {
                    onFiltersChange({ dateRange: undefined });
                  } else {
                    const now = new Date();
                    let start: Date;
                    switch (value) {
                      case 'today':
                        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                        break;
                      case 'week':
                        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                        break;
                      case 'month':
                        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                        break;
                      case 'year':
                        start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                        break;
                      default:
                        return;
                    }
                    onFiltersChange({ 
                      dateRange: { 
                        start: start.toISOString(), 
                        end: now.toISOString() 
                      } 
                    });
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary text-sm"
              >
                <option value="">Any Date</option>
                <option value="today">Today</option>
                <option value="week">Past Week</option>
                <option value="month">Past Month</option>
                <option value="year">Past Year</option>
              </select>
            </div>

            {/* File Size Range */}
            <div>
              <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                File Size Range
              </label>
              <select
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '') {
                    onFiltersChange({ sizeRange: undefined });
                  } else {
                    const [min, max] = value.split('-').map(v => parseInt(v) * 1024 * 1024);
                    onFiltersChange({ sizeRange: { min, max: max || Infinity } });
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary text-sm"
              >
                <option value="">Any Size</option>
                <option value="0-1">Under 1MB</option>
                <option value="1-5">1MB - 5MB</option>
                <option value="5-25">5MB - 25MB</option>
                <option value="25">Over 25MB</option>
              </select>
            </div>

            {/* Dimension Range */}
            <div>
              <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                Image Dimensions
              </label>
              <select
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '') {
                    onFiltersChange({ dimensionRange: undefined });
                  } else {
                    const ranges: Record<string, any> = {
                      'small': { minWidth: 0, maxWidth: 800, minHeight: 0, maxHeight: 600 },
                      'medium': { minWidth: 800, maxWidth: 1920, minHeight: 600, maxHeight: 1080 },
                      'large': { minWidth: 1920, maxWidth: 4000, minHeight: 1080, maxHeight: 3000 },
                      'xlarge': { minWidth: 4000, maxWidth: Infinity, minHeight: 3000, maxHeight: Infinity },
                    };
                    onFiltersChange({ dimensionRange: ranges[value] });
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary text-sm"
              >
                <option value="">Any Size</option>
                <option value="small">Small (up to 800x600)</option>
                <option value="medium">Medium (800x600 to 1920x1080)</option>
                <option value="large">Large (1920x1080 to 4000x3000)</option>
                <option value="xlarge">Extra Large (4000x3000+)</option>
              </select>
            </div>
          </div>
        )}

        {/* Active Filters */}
        {hasActiveFilters && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-text-dark dark:text-text-light">
                Active Filters
              </span>
              <button
                onClick={() => setShowSaveDialog(true)}
                className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
              >
                Save Filter
              </button>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {filters.search && (
                <span className="inline-flex items-center space-x-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded text-xs">
                  <Search className="h-3 w-3" />
                  <span>{filters.search}</span>
                  <button onClick={() => onFiltersChange({ search: '' })}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              
              {filters.category && (
                <span className="inline-flex items-center space-x-1 px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 rounded text-xs">
                  <Tag className="h-3 w-3" />
                  <span>{filters.category}</span>
                  <button onClick={() => onFiltersChange({ category: '' })}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              
              {filters.tags.map(tag => (
                <span key={tag} className="inline-flex items-center space-x-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-200 rounded text-xs">
                  <Tag className="h-3 w-3" />
                  <span>{tag}</span>
                  <button onClick={() => onFiltersChange({ tags: filters.tags.filter(t => t !== tag) })}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              
              {filters.dateRange && (
                <span className="inline-flex items-center space-x-1 px-2 py-1 bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200 rounded text-xs">
                  <Calendar className="h-3 w-3" />
                  <span>Date Range</span>
                  <button onClick={() => onFiltersChange({ dateRange: undefined })}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              
              {filters.sizeRange && (
                <span className="inline-flex items-center space-x-1 px-2 py-1 bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 rounded text-xs">
                  <HardDrive className="h-3 w-3" />
                  <span>Size Range</span>
                  <button onClick={() => onFiltersChange({ sizeRange: undefined })}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
          </div>
        )}

        {/* Saved Filters */}
        {savedFilters.length > 0 && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-medium text-text-dark dark:text-text-light mb-2">
              Saved Filters
            </h4>
            <div className="flex flex-wrap gap-2">
              {savedFilters.map(savedFilter => (
                <div key={savedFilter.name} className="flex items-center space-x-1">
                  <button
                    onClick={() => onLoadFilter(savedFilter.name)}
                    className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-xs transition-colors"
                  >
                    {savedFilter.name}
                  </button>
                  <button
                    onClick={() => onDeleteFilter(savedFilter.name)}
                    className="text-red-500 hover:text-red-700 dark:hover:text-red-300"
                    title="Delete saved filter"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Save Filter Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-sm w-full p-6">
            <h3 className="text-lg font-semibold text-text-dark dark:text-text-light mb-4">
              Save Filter
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                  Filter Name
                </label>
                <input
                  type="text"
                  value={newFilterName}
                  onChange={(e) => setNewFilterName(e.target.value)}
                  placeholder="Enter filter name"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveFilter();
                    }
                  }}
                  autoFocus
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveFilter}
                disabled={!newFilterName.trim()}
                className="px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Filter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
