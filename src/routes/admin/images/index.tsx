import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useUserStore } from "~/stores/userStore";
import { useTRPC } from "~/trpc/react";
import { toast } from "react-hot-toast";
import { debounce } from "~/utils";
import {
  ArrowLeft,
  Upload,
  Trash2,
  Search,
  Filter,
  Grid3X3,
  List,
  Columns3,
  Image as ImageIcon,
  FolderPlus,
  Download,
  Settings,
  BarChart3,
  Tag,
  Calendar,
  HardDrive,
  Eye,
  Plus,
  X,
  RefreshCw,
  TrendingUp,
  AlertCircle,
  CheckSquare,
  Square,
  MoreHorizontal,
  Keyboard,
  SortAsc,
  SortDesc,
  Zap,
  FileText,
  Copy,
  Edit,
  Archive,
  Star,
  Clock,
  Users,
  Globe,
  Layers,
  Monitor,
  Smartphone,
  Tablet,
  ChevronDown,
  ChevronUp,
  Info,
  Lightbulb,
  Target,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { ImageUpload } from "~/components/ui/ImageUpload";
import { ImageGallery } from "~/components/ui/ImageGallery";
import { ImageBulkActions } from "~/components/admin/ImageBulkActions";
import { ImageQuickActions } from "~/components/admin/ImageQuickActions";
import { ImageFiltersPanel } from "~/components/admin/ImageFiltersPanel";

// Enhanced type definitions for better type safety
interface ImageData {
  id: number;
  fileName: string;
  filePath: string;
  fileSize: number;
  width?: number;
  height?: number;
  title?: string;
  description?: string;
  altText?: string;
  tags: string[];
  category?: string;
  createdAt: string;
  usageCount?: number;
  variants?: Array<{
    variantType: string;
    width: number;
    height: number;
    fileSize: number;
    format: string;
  }>;
}

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

interface ViewState {
  mode: "grid" | "list" | "masonry";
  showUpload: boolean;
  showFilters: boolean;
  showCollectionCreator: boolean;
  showBulkActions: boolean;
  showAnalytics: boolean;
  showKeyboardShortcuts: boolean;
  compactMode: boolean;
  previewMode: boolean;
}

interface BulkActionState {
  selectedImages: number[];
  operation: "delete" | "archive" | "tag" | "move" | "export" | null;
  metadata?: {
    tags?: string[];
    category?: string;
    collectionId?: number;
  };
}

export const Route = createFileRoute("/admin/images/")({
  component: AdminImagesPage,
});

// Custom hook for keyboard shortcuts
function useKeyboardShortcuts(callbacks: Record<string, () => void>) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when user is typing in inputs
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      const key = event.key.toLowerCase();
      const isCtrl = event.ctrlKey || event.metaKey;
      const isShift = event.shiftKey;
      const isAlt = event.altKey;

      // Define keyboard shortcuts
      if (isCtrl && key === 'u' && !isShift && !isAlt) {
        event.preventDefault();
        callbacks.toggleUpload?.();
      } else if (isCtrl && key === 'f' && !isShift && !isAlt) {
        event.preventDefault();
        callbacks.toggleFilters?.();
      } else if (isCtrl && key === 'a' && !isShift && !isAlt) {
        event.preventDefault();
        callbacks.selectAll?.();
      } else if (key === 'escape') {
        event.preventDefault();
        callbacks.escape?.();
      } else if (key === 'delete' || key === 'backspace') {
        if (isShift) {
          event.preventDefault();
          callbacks.bulkDelete?.();
        }
      } else if (key === 'r' && !isCtrl && !isShift && !isAlt) {
        event.preventDefault();
        callbacks.refresh?.();
      } else if (key === '1' && !isCtrl && !isShift && !isAlt) {
        event.preventDefault();
        callbacks.gridView?.();
      } else if (key === '2' && !isCtrl && !isShift && !isAlt) {
        event.preventDefault();
        callbacks.listView?.();
      } else if (key === '3' && !isCtrl && !isShift && !isAlt) {
        event.preventDefault();
        callbacks.masonryView?.();
      } else if (key === '?' && !isCtrl && !isShift && !isAlt) {
        event.preventDefault();
        callbacks.showShortcuts?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [callbacks]);
}

// Custom hook for enhanced analytics
function useImageAnalytics(images: ImageData[]) {
  return useMemo(() => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const recentImages = images.filter(img => new Date(img.createdAt) > oneWeekAgo);
    const monthlyImages = images.filter(img => new Date(img.createdAt) > oneMonthAgo);

    const totalSize = images.reduce((sum, img) => sum + img.fileSize, 0);
    const totalVariants = images.reduce((sum, img) => sum + (img.variants?.length || 0), 0);
    const avgFileSize = images.length > 0 ? totalSize / images.length : 0;

    // Category distribution
    const categoryDistribution = images.reduce((acc, img) => {
      const category = img.category || 'uncategorized';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Size distribution
    const sizeRanges = {
      'Small (< 1MB)': images.filter(img => img.fileSize < 1024 * 1024).length,
      'Medium (1-5MB)': images.filter(img => img.fileSize >= 1024 * 1024 && img.fileSize < 5 * 1024 * 1024).length,
      'Large (5-25MB)': images.filter(img => img.fileSize >= 5 * 1024 * 1024 && img.fileSize < 25 * 1024 * 1024).length,
      'XLarge (> 25MB)': images.filter(img => img.fileSize >= 25 * 1024 * 1024).length,
    };

    // Format distribution
    const formatDistribution = images.reduce((acc, img) => {
      const extension = img.fileName.split('.').pop()?.toLowerCase() || 'unknown';
      acc[extension] = (acc[extension] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Usage statistics
    const totalUsage = images.reduce((sum, img) => sum + (img.usageCount || 0), 0);
    const mostUsedImages = images
      .filter(img => (img.usageCount || 0) > 0)
      .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
      .slice(0, 5);

    // Dimension analysis
    const dimensions = images
      .filter(img => img.width && img.height)
      .map(img => ({ width: img.width!, height: img.height!, aspectRatio: img.width! / img.height! }));

    const avgDimensions = dimensions.length > 0 ? {
      width: Math.round(dimensions.reduce((sum, d) => sum + d.width, 0) / dimensions.length),
      height: Math.round(dimensions.reduce((sum, d) => sum + d.height, 0) / dimensions.length),
      aspectRatio: dimensions.reduce((sum, d) => sum + d.aspectRatio, 0) / dimensions.length,
    } : null;

    // Growth metrics
    const weeklyGrowth = recentImages.length;
    const monthlyGrowth = monthlyImages.length;
    const growthRate = monthlyImages.length > 0 ? (weeklyGrowth / (monthlyImages.length / 4)) * 100 : 0;

    return {
      totalImages: images.length,
      totalSize,
      totalVariants,
      avgFileSize,
      categoryDistribution,
      sizeRanges,
      formatDistribution,
      totalUsage,
      mostUsedImages,
      avgDimensions,
      recentImages: recentImages.length,
      monthlyImages: monthlyImages.length,
      weeklyGrowth,
      monthlyGrowth,
      growthRate,
      storageEfficiency: totalVariants > 0 ? (totalSize / (totalSize + totalVariants * avgFileSize)) * 100 : 100,
    };
  }, [images]);
}

// Custom hook for advanced filter management
function useAdvancedFilters(initialFilters: FilterState) {
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [savedFilters, setSavedFilters] = useState<Array<{ name: string; filters: FilterState }>>([]);

  const updateFilters = useCallback((newFilters: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  const saveCurrentFilter = useCallback((name: string) => {
    const newSavedFilter = { name, filters: { ...filters } };
    setSavedFilters(prev => [...prev.filter(f => f.name !== name), newSavedFilter]);
    toast.success(`Filter "${name}" saved successfully`);
  }, [filters]);

  const loadSavedFilter = useCallback((name: string) => {
    const savedFilter = savedFilters.find(f => f.name === name);
    if (savedFilter) {
      setFilters(savedFilter.filters);
      toast.success(`Filter "${name}" loaded`);
    }
  }, [savedFilters]);

  const deleteSavedFilter = useCallback((name: string) => {
    setSavedFilters(prev => prev.filter(f => f.name !== name));
    toast.success(`Filter "${name}" deleted`);
  }, []);

  const hasActiveFilters = useMemo(() => {
    return (
      filters.search !== '' ||
      filters.category !== '' ||
      filters.tags.length > 0 ||
      filters.dateRange !== undefined ||
      filters.sizeRange !== undefined ||
      filters.dimensionRange !== undefined
    );
  }, [filters]);

  return {
    filters,
    updateFilters,
    resetFilters,
    savedFilters,
    saveCurrentFilter,
    loadSavedFilter,
    deleteSavedFilter,
    hasActiveFilters,
  };
}

function AdminImagesPage() {
  const { adminToken } = useUserStore();

  // Enhanced state management with better organization
  const [viewState, setViewState] = useState<ViewState>({
    mode: "grid",
    showUpload: false,
    showFilters: false,
    showCollectionCreator: false,
    showBulkActions: false,
    showAnalytics: false,
    showKeyboardShortcuts: false,
    compactMode: false,
    previewMode: false,
  });

  const [bulkActions, setBulkActions] = useState<BulkActionState>({
    selectedImages: [],
    operation: null,
  });

  const [searchInput, setSearchInput] = useState("");
  const [collectionName, setCollectionName] = useState("");
  const [collectionDescription, setCollectionDescription] = useState("");

  // Enhanced filter management
  const {
    filters,
    updateFilters,
    resetFilters,
    savedFilters,
    saveCurrentFilter,
    loadSavedFilter,
    deleteSavedFilter,
    hasActiveFilters,
  } = useAdvancedFilters({
    search: "",
    category: "",
    tags: [],
    sortBy: "createdAt",
    sortOrder: "desc",
    page: 1,
    pageSize: 24,
  });

  // Debounced search to reduce API calls
  const debouncedSearch = useCallback(
    debounce((searchTerm: string) => {
      updateFilters({ search: searchTerm });
    }, 500),
    [updateFilters]
  );

  useEffect(() => {
    debouncedSearch(searchInput);
  }, [searchInput, debouncedSearch]);

  const trpc = useTRPC();

  // Enhanced queries with better error handling and caching
  const imagesQuery = trpc.adminListImages.useQuery({
    adminToken: adminToken || "",
    search: filters.search,
    category: filters.category,
    tags: filters.tags,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
    page: filters.page,
    pageSize: filters.pageSize,
    includeVariants: true,
  }, {
    enabled: !!adminToken,
    staleTime: 30000,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      if (error?.message?.includes('Authentication') || error?.message?.includes('token')) {
        return false;
      }
      return failureCount < 3;
    },
    onError: (error) => {
      console.error('Images query error:', error);
      if (error?.message?.includes('Authentication') || error?.message?.includes('token')) {
        toast.error('Authentication failed. Please log in again.');
      } else {
        toast.error('Failed to load images. Please try again.');
      }
    },
  });

  const collectionsQuery = trpc.adminListImageCollections.useQuery({
    adminToken: adminToken || "",
    includeImages: false,
  }, {
    enabled: !!adminToken,
    staleTime: 60000,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      if (error?.message?.includes('Authentication') || error?.message?.includes('token')) {
        return false;
      }
      return failureCount < 3;
    },
  });

  // Enhanced mutations with comprehensive error handling
  const deleteMutation = trpc.adminDeleteImage.useMutation({
    onSuccess: () => {
      imagesQuery.refetch();
      toast.success("Image deleted successfully");
      setBulkActions(prev => ({
        ...prev,
        selectedImages: prev.selectedImages.filter(id => !bulkActions.selectedImages.includes(id))
      }));
    },
    onError: (error) => {
      console.error('Delete mutation error:', error);
      const errorMessage = error?.message || "Failed to delete image";
      toast.error(errorMessage);
      
      if (errorMessage.includes('Authentication') || errorMessage.includes('token')) {
        setTimeout(() => {
          toast.error('Please log in again to continue.');
        }, 2000);
      }
    },
  });

  const createCollectionMutation = trpc.adminCreateImageCollection.useMutation({
    onSuccess: () => {
      collectionsQuery.refetch();
      toast.success("Collection created successfully");
      setViewState(prev => ({ ...prev, showCollectionCreator: false }));
      setBulkActions(prev => ({ ...prev, selectedImages: [] }));
      setCollectionName("");
      setCollectionDescription("");
    },
    onError: (error) => {
      console.error('Create collection mutation error:', error);
      const errorMessage = error?.message || "Failed to create collection";
      toast.error(errorMessage);
    },
  });

  // Enhanced data processing with better error handling
  const images = useMemo(() => {
    if (!imagesQuery.data?.images) {
      return [];
    }
    
    try {
      return imagesQuery.data.images.map(img => ({
        ...img,
        tags: Array.isArray(img.tags) ? img.tags : [],
        fileName: img.fileName || 'Unknown',
        filePath: img.filePath || '',
        fileSize: img.fileSize || 0,
        createdAt: img.createdAt || new Date().toISOString(),
        variants: img.variants?.map(variant => ({
          variantType: variant.variantType || 'original',
          width: variant.width || 0,
          height: variant.height || 0,
          fileSize: variant.fileSize || 0,
          format: variant.format || 'unknown',
        })) || [],
      }));
    } catch (error) {
      console.error('Error processing images data:', error);
      return [];
    }
  }, [imagesQuery.data?.images]);

  // Enhanced analytics
  const analytics = useImageAnalytics(images);

  // Enhanced event handlers with improved UX
  const handleDeleteImage = useCallback(async (image: ImageData) => {
    const confirmMessage = `Are you sure you want to delete "${image.fileName}"?\n\nThis will also delete:\n• All image variants\n• Any associated metadata\n\nThis action cannot be undone.`;
    if (!confirm(confirmMessage)) return;
    
    console.log(`🗑️ SINGLE DELETE: Starting deletion of ${image.fileName}`);
    
    // Show progress toast
    const progressToastId = toast.loading(`Deleting ${image.fileName}...`);
    
    try {
      const result = await deleteMutation.mutateAsync({
        adminToken: adminToken || "",
        filePath: image.filePath,
      });
      
      // Dismiss progress toast
      toast.dismiss(progressToastId);
      
      // Show success message with details
      if (result.warnings && result.warnings.length > 0) {
        toast.success(`${image.fileName} deleted with warnings`, {
          duration: 5000,
        });
        
        // Show warnings
        result.warnings.forEach(warning => {
          toast.warning(warning, { duration: 8000 });
        });
      } else {
        toast.success(`${image.fileName} deleted successfully`);
      }
      
      console.log(`✅ SINGLE DELETE: Successfully deleted ${image.fileName}:`, result);
      
    } catch (error) {
      // Dismiss progress toast
      toast.dismiss(progressToastId);
      
      console.error(`❌ SINGLE DELETE: Failed to delete ${image.fileName}:`, error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to delete ${image.fileName}: ${errorMessage}`, {
        duration: 8000,
      });
      
      // If it's a specific error type, show additional guidance
      if (error instanceof Error && 'category' in error) {
        const imageError = error as any;
        if (imageError.suggestions && imageError.suggestions.length > 0) {
          setTimeout(() => {
            toast.info(`Suggestion: ${imageError.suggestions[0]}`, {
              duration: 6000,
            });
          }, 2000);
        }
      }
    }
  }, [adminToken, deleteMutation]);

  const handleBulkDelete = useCallback(() => {
    if (bulkActions.selectedImages.length === 0) return;
    
    const confirmMessage = `Are you sure you want to delete ${bulkActions.selectedImages.length} image(s)? This action cannot be undone.`;
    if (confirm(confirmMessage)) {
      bulkActions.selectedImages.forEach(imageId => {
        const image = images.find(img => img.id === imageId);
        if (image) {
          deleteMutation.mutate({
            adminToken: adminToken || "",
            filePath: image.filePath,
          });
        }
      });
    }
  }, [bulkActions.selectedImages, images, adminToken, deleteMutation]);

  const handleCreateCollection = useCallback(() => {
    if (!collectionName.trim()) {
      toast.error("Collection name is required");
      return;
    }

    createCollectionMutation.mutate({
      adminToken: adminToken || "",
      name: collectionName.trim(),
      description: collectionDescription.trim(),
      isPublic: false,
      imageIds: bulkActions.selectedImages,
    });
  }, [adminToken, collectionName, collectionDescription, bulkActions.selectedImages, createCollectionMutation]);

  const handleSelectAll = useCallback(() => {
    if (bulkActions.selectedImages.length === images.length && images.length > 0) {
      setBulkActions(prev => ({ ...prev, selectedImages: [] }));
    } else {
      setBulkActions(prev => ({ ...prev, selectedImages: images.map(img => img.id) }));
    }
  }, [bulkActions.selectedImages.length, images]);

  const handleRefresh = useCallback(() => {
    imagesQuery.refetch();
    collectionsQuery.refetch();
    toast.success("Data refreshed");
  }, [imagesQuery, collectionsQuery]);

  const handleImageSelect = useCallback((imageId: number) => {
    setBulkActions(prev => ({
      ...prev,
      selectedImages: prev.selectedImages.includes(imageId)
        ? prev.selectedImages.filter(id => id !== imageId)
        : [...prev.selectedImages, imageId]
    }));
  }, []);

  const updateViewState = useCallback((updates: Partial<ViewState>) => {
    setViewState(prev => ({ ...prev, ...updates }));
  }, []);

  const toggleViewState = useCallback((key: keyof ViewState) => {
    setViewState(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // Enhanced keyboard shortcuts
  const keyboardCallbacks = useMemo(() => ({
    toggleUpload: () => toggleViewState('showUpload'),
    toggleFilters: () => toggleViewState('showFilters'),
    selectAll: handleSelectAll,
    escape: () => {
      setViewState(prev => ({
        ...prev,
        showUpload: false,
        showFilters: false,
        showCollectionCreator: false,
        showBulkActions: false,
        showAnalytics: false,
        showKeyboardShortcuts: false,
      }));
      setBulkActions(prev => ({ ...prev, selectedImages: [] }));
    },
    bulkDelete: handleBulkDelete,
    refresh: handleRefresh,
    gridView: () => updateViewState({ mode: 'grid' }),
    listView: () => updateViewState({ mode: 'list' }),
    masonryView: () => updateViewState({ mode: 'masonry' }),
    showShortcuts: () => toggleViewState('showKeyboardShortcuts'),
  }), [toggleViewState, handleSelectAll, handleBulkDelete, handleRefresh, updateViewState]);

  useKeyboardShortcuts(keyboardCallbacks);

  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-black">
      <div className="container-padding">
        {/* Enhanced Header with better navigation */}
        <div className="flex items-center justify-between py-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-4">
            <Link
              to="/admin"
              className="flex items-center space-x-2 text-text-muted dark:text-text-light/70 hover:text-text-dark dark:hover:text-text-light transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Link>
            
            {/* Breadcrumb */}
            <div className="flex items-center space-x-2 text-sm text-text-muted dark:text-text-light/70">
              <span>/</span>
              <span>Admin</span>
              <span>/</span>
              <span className="text-text-dark dark:text-text-light font-medium">Images</span>
            </div>
          </div>
          
          <ImageQuickActions
            onUpload={() => toggleViewState('showUpload')}
            onRefresh={handleRefresh}
            onToggleFilters={() => toggleViewState('showFilters')}
            onToggleAnalytics={() => toggleViewState('showAnalytics')}
            onShowShortcuts={() => toggleViewState('showKeyboardShortcuts')}
            onViewModeChange={(mode) => updateViewState({ mode })}
            currentViewMode={viewState.mode}
            isLoading={imagesQuery.isFetching}
            totalImages={analytics.totalImages}
            totalSize={analytics.totalSize}
            weeklyGrowth={analytics.weeklyGrowth}
            hasActiveFilters={hasActiveFilters}
            selectedCount={bulkActions.selectedImages.length}
          />
        </div>

        <div className="py-6">
          {/* Enhanced Title Section with live stats */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 flex items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/20">
                <ImageIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-text-dark dark:text-text-light">
                  Image Management
                </h1>
                <p className="text-text-muted dark:text-text-light/70">
                  Manage all images with variants, collections, and metadata
                  {analytics.weeklyGrowth > 0 && (
                    <span className="ml-2 text-green-600 text-sm">
                      +{analytics.weeklyGrowth} this week
                    </span>
                  )}
                </p>
              </div>
            </div>
            
            {/* Performance indicators */}
            <div className="hidden lg:flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-1 text-text-muted dark:text-text-light/70">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span>Storage: {analytics.storageEfficiency.toFixed(1)}% efficient</span>
              </div>
              {analytics.growthRate > 0 && (
                <div className="flex items-center space-x-1 text-green-600">
                  <Zap className="h-4 w-4" />
                  <span>Growth: +{analytics.growthRate.toFixed(1)}%</span>
                </div>
              )}
            </div>
          </div>

          {/* Enhanced Analytics Dashboard */}
          {viewState.showAnalytics && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-text-dark dark:text-text-light flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Image Analytics Dashboard</span>
                </h2>
                <button
                  onClick={() => updateViewState({ showAnalytics: false })}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <ImageIcon className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium text-text-muted dark:text-text-light/70">Total Images</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">{analytics.totalImages.toLocaleString()}</p>
                  <p className="text-xs text-text-muted dark:text-text-light/70">
                    +{analytics.weeklyGrowth} this week
                  </p>
                </div>

                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <HardDrive className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-text-muted dark:text-text-light/70">Storage Used</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600">{formatFileSize(analytics.totalSize)}</p>
                  <p className="text-xs text-text-muted dark:text-text-light/70">
                    Avg: {formatFileSize(analytics.avgFileSize)}
                  </p>
                </div>

                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Layers className="h-5 w-5 text-purple-600" />
                    <span className="text-sm font-medium text-text-muted dark:text-text-light/70">Variants</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-600">{analytics.totalVariants}</p>
                  <p className="text-xs text-text-muted dark:text-text-light/70">Optimized sizes</p>
                </div>

                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Eye className="h-5 w-5 text-orange-600" />
                    <span className="text-sm font-medium text-text-muted dark:text-text-light/70">Total Views</span>
                  </div>
                  <p className="text-2xl font-bold text-orange-600">{analytics.totalUsage.toLocaleString()}</p>
                  <p className="text-xs text-text-muted dark:text-text-light/70">All time</p>
                </div>

                <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <TrendingUp className="h-5 w-5 text-cyan-600" />
                    <span className="text-sm font-medium text-text-muted dark:text-text-light/70">Growth Rate</span>
                  </div>
                  <p className="text-2xl font-bold text-cyan-600">{analytics.growthRate.toFixed(1)}%</p>
                  <p className="text-xs text-text-muted dark:text-text-light/70">This month</p>
                </div>

                <div className="bg-pink-50 dark:bg-pink-900/20 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Zap className="h-5 w-5 text-pink-600" />
                    <span className="text-sm font-medium text-text-muted dark:text-text-light/70">Efficiency</span>
                  </div>
                  <p className="text-2xl font-bold text-pink-600">{analytics.storageEfficiency.toFixed(1)}%</p>
                  <p className="text-xs text-text-muted dark:text-text-light/70">Storage optimized</p>
                </div>
              </div>

              {/* Distribution Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Category Distribution */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-text-dark dark:text-text-light mb-3">Categories</h3>
                  <div className="space-y-2">
                    {Object.entries(analytics.categoryDistribution)
                      .sort(([,a], [,b]) => b - a)
                      .slice(0, 5)
                      .map(([category, count]) => (
                        <div key={category} className="flex items-center justify-between">
                          <span className="text-sm text-text-muted dark:text-text-light/70 capitalize">
                            {category}
                          </span>
                          <div className="flex items-center space-x-2">
                            <div className="w-16 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                              <div 
                                className="bg-blue-500 h-2 rounded-full" 
                                style={{ width: `${(count / analytics.totalImages) * 100}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-text-dark dark:text-text-light w-8">
                              {count}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Size Distribution */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-text-dark dark:text-text-light mb-3">File Sizes</h3>
                  <div className="space-y-2">
                    {Object.entries(analytics.sizeRanges).map(([range, count]) => (
                      <div key={range} className="flex items-center justify-between">
                        <span className="text-sm text-text-muted dark:text-text-light/70">{range}</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-16 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full" 
                              style={{ width: `${(count / analytics.totalImages) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-text-dark dark:text-text-light w-8">
                            {count}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Most Used Images */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-text-dark dark:text-text-light mb-3">Most Used</h3>
                  <div className="space-y-2">
                    {analytics.mostUsedImages.length > 0 ? (
                      analytics.mostUsedImages.map((image, index) => (
                        <div key={image.id} className="flex items-center space-x-2">
                          <span className="text-xs bg-orange-100 dark:bg-orange-900/20 text-orange-600 px-2 py-1 rounded">
                            #{index + 1}
                          </span>
                          <span className="text-sm text-text-muted dark:text-text-light/70 truncate flex-1">
                            {image.title || image.fileName}
                          </span>
                          <span className="text-sm font-medium text-text-dark dark:text-text-light">
                            {image.usageCount}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-text-muted dark:text-text-light/70 text-center py-4">
                        No usage data available
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Insights and Recommendations */}
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Lightbulb className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                      Optimization Insights
                    </h4>
                    <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                      {analytics.storageEfficiency < 80 && (
                        <p>• Consider creating more variants to improve storage efficiency</p>
                      )}
                      {analytics.totalUsage === 0 && (
                        <p>• Start tracking image usage to identify popular content</p>
                      )}
                      {analytics.avgDimensions && analytics.avgDimensions.width > 2000 && (
                        <p>• Average image size is large - consider automatic resizing</p>
                      )}
                      {Object.keys(analytics.categoryDistribution).length < 3 && (
                        <p>• Add more categories to better organize your images</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Upload Section */}
          {viewState.showUpload && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-text-dark dark:text-text-light flex items-center space-x-2">
                  <Upload className="h-5 w-5" />
                  <span>Upload New Images</span>
                </h2>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => updateViewState({ compactMode: !viewState.compactMode })}
                    className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    {viewState.compactMode ? 'Expand' : 'Compact'} View
                  </button>
                  <button
                    onClick={() => updateViewState({ showUpload: false })}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Upload tips */}
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-start space-x-2">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    <p className="font-medium mb-1">Upload Tips:</p>
                    <ul className="space-y-1 text-xs">
                      <li>• Upload up to 3 images at once for best performance</li>
                      <li>• JPEG and PNG formats are recommended</li>
                      <li>• Images will be automatically optimized and variants created</li>
                      <li>• Add metadata for better organization and searchability</li>
                    </ul>
                  </div>
                </div>
              </div>

              <ImageUpload
                value=""
                onChange={(filePath) => {
                  if (filePath) {
                    imagesQuery.refetch();
                    updateViewState({ showUpload: false });
                    toast.success("Upload completed! Gallery refreshed.");
                  }
                }}
                placeholder="Click to upload images or drag and drop here"
                previewClassName={viewState.compactMode ? "h-32" : "h-48"}
                multiple={true}
                maxImages={3}
                showMetadataEditor={true}
                generateVariants={true}
                showCollectionCreator={true}
              />
            </div>
          )}

          {/* ImageFiltersPanel */}
          {viewState.showFilters && (
            <ImageFiltersPanel
              filters={filters}
              onFiltersChange={updateFilters}
              onResetFilters={resetFilters}
              savedFilters={savedFilters}
              onSaveFilter={saveCurrentFilter}
              onLoadFilter={loadSavedFilter}
              onDeleteFilter={deleteSavedFilter}
              hasActiveFilters={hasActiveFilters}
              totalResults={imagesQuery.data?.pagination?.totalCount || 0}
              className="mb-6"
            />
          )}

          {/* ImageBulkActions Panel */}
          {bulkActions.selectedImages.length > 0 && (
            <ImageBulkActions
              selectedImages={bulkActions.selectedImages}
              images={images}
              adminToken={adminToken || ""}
              onSelectionChange={(selectedIds) => 
                setBulkActions(prev => ({ ...prev, selectedImages: selectedIds }))
              }
              onRefresh={handleRefresh}
              className="mb-6"
            />
          )}

          {/* Enhanced Loading State */}
          {imagesQuery.isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center space-y-3">
                <RefreshCw className="h-8 w-8 animate-spin text-secondary" />
                <span className="text-text-muted dark:text-text-light/70">Loading images...</span>
                <div className="text-xs text-text-muted dark:text-text-light/70 text-center max-w-md">
                  This may take a moment for large collections
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Error State */}
          {imagesQuery.isError && (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center space-y-4 text-center max-w-md">
                <AlertCircle className="h-12 w-12 text-red-500" />
                <div>
                  <h3 className="text-lg font-medium text-text-dark dark:text-text-light mb-2">
                    Failed to load images
                  </h3>
                  <p className="text-text-muted dark:text-text-light/70 mb-4">
                    {imagesQuery.error?.message || "An error occurred while loading images"}
                  </p>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => imagesQuery.refetch()}
                      className="px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors"
                    >
                      Try Again
                    </button>
                    <Link
                      to="/admin/images/debug"
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      Debug
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Images Gallery */}
          {!imagesQuery.isLoading && !imagesQuery.isError && (
            <ImageGallery
              images={images}
              viewMode={viewState.mode}
              selectable={true}
              selectedImages={bulkActions.selectedImages}
              onSelectionChange={(selectedIds) => 
                setBulkActions(prev => ({ ...prev, selectedImages: selectedIds }))
              }
              onImageDelete={handleDeleteImage}
              showMetadata={true}
              showVariants={true}
              loading={imagesQuery.isFetching}
              emptyMessage={
                hasActiveFilters
                  ? "No images found matching your filters. Try adjusting your search criteria."
                  : "No images uploaded yet. Click the Upload button to get started."
              }
              className={viewState.compactMode ? "compact-mode" : ""}
            />
          )}

          {/* Enhanced Pagination */}
          {imagesQuery.data?.pagination && imagesQuery.data.pagination.totalPages > 1 && (
            <div className="flex flex-col md:flex-row items-center justify-between mt-8 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 space-y-4 md:space-y-0">
              <div className="flex items-center space-x-4 text-sm text-text-muted dark:text-text-light/70">
                <span>
                  Showing {((filters.page - 1) * filters.pageSize) + 1} to {Math.min(filters.page * filters.pageSize, imagesQuery.data.pagination.totalCount)} of {imagesQuery.data.pagination.totalCount} images
                </span>
                {hasActiveFilters && (
                  <span className="text-blue-600">
                    (filtered from {imagesQuery.data.pagination.totalCount} total)
                  </span>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => updateFilters({ page: 1 })}
                  disabled={!imagesQuery.data.pagination.hasPreviousPage}
                  className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  First
                </button>
                
                <button
                  onClick={() => updateFilters({ page: filters.page - 1 })}
                  disabled={!imagesQuery.data.pagination.hasPreviousPage}
                  className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Previous
                </button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(7, imagesQuery.data.pagination.totalPages) }, (_, i) => {
                    let page: number;
                    if (imagesQuery.data.pagination.totalPages <= 7) {
                      page = i + 1;
                    } else {
                      const current = filters.page;
                      const total = imagesQuery.data.pagination.totalPages;
                      if (current <= 4) {
                        page = i + 1;
                      } else if (current >= total - 3) {
                        page = total - 6 + i;
                      } else {
                        page = current - 3 + i;
                      }
                    }
                    
                    return (
                      <button
                        key={page}
                        onClick={() => updateFilters({ page })}
                        className={`px-3 py-2 rounded-lg transition-colors text-sm ${
                          page === filters.page
                            ? 'bg-secondary text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  
                  {imagesQuery.data.pagination.totalPages > 7 && filters.page < imagesQuery.data.pagination.totalPages - 3 && (
                    <>
                      <span className="px-2 text-gray-400">...</span>
                      <button
                        onClick={() => updateFilters({ page: imagesQuery.data.pagination.totalPages })}
                        className="px-3 py-2 rounded-lg transition-colors text-sm bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                      >
                        {imagesQuery.data.pagination.totalPages}
                      </button>
                    </>
                  )}
                </div>
                
                <button
                  onClick={() => updateFilters({ page: filters.page + 1 })}
                  disabled={!imagesQuery.data.pagination.hasNextPage}
                  className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Next
                </button>
                
                <button
                  onClick={() => updateFilters({ page: imagesQuery.data.pagination.totalPages })}
                  disabled={!imagesQuery.data.pagination.hasNextPage}
                  className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Last
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Collection Creator Modal */}
      {viewState.showCollectionCreator && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-text-dark dark:text-text-light mb-4 flex items-center space-x-2">
              <FolderPlus className="h-5 w-5" />
              <span>Create Image Collection</span>
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCreateCollection();
              }}
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                    Collection Name *
                  </label>
                  <input
                    type="text"
                    value={collectionName}
                    onChange={(e) => setCollectionName(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
                    placeholder="Enter collection name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                    Description
                  </label>
                  <textarea
                    value={collectionDescription}
                    onChange={(e) => setCollectionDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
                    placeholder="Enter collection description (optional)"
                  />
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>{bulkActions.selectedImages.length}</strong> images will be added to this collection.
                  </p>
                  {bulkActions.selectedImages.length > 0 && (
                    <div className="mt-2 text-xs text-blue-700 dark:text-blue-300">
                      Total size: {formatFileSize(
                        bulkActions.selectedImages.reduce((total, id) => {
                          const image = images.find(img => img.id === id);
                          return total + (image?.fileSize || 0);
                        }, 0)
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => updateViewState({ showCollectionCreator: false })}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!collectionName.trim() || createCollectionMutation.isPending}
                  className="px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createCollectionMutation.isPending ? 'Creating...' : 'Create Collection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enhanced Keyboard Shortcuts Modal */}
      {viewState.showKeyboardShortcuts && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-text-dark dark:text-text-light flex items-center space-x-2">
                <Keyboard className="h-5 w-5" />
                <span>Keyboard Shortcuts</span>
              </h3>
              <button
                onClick={() => updateViewState({ showKeyboardShortcuts: false })}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-text-dark dark:text-text-light mb-3">Navigation</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-muted dark:text-text-light/70">Toggle Upload</span>
                    <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">Ctrl+U</code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted dark:text-text-light/70">Toggle Filters</span>
                    <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">Ctrl+F</code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted dark:text-text-light/70">Refresh</span>
                    <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">R</code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted dark:text-text-light/70">Close Modals</span>
                    <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">Esc</code>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-text-dark dark:text-text-light mb-3">Selection</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-muted dark:text-text-light/70">Select All</span>
                    <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">Ctrl+A</code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted dark:text-text-light/70">Delete Selected</span>
                    <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">Shift+Del</code>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-text-dark dark:text-text-light mb-3">View Modes</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-muted dark:text-text-light/70">Grid View</span>
                    <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">1</code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted dark:text-text-light/70">List View</span>
                    <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">2</code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted dark:text-text-light/70">Masonry View</span>
                    <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">3</code>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-text-dark dark:text-text-light mb-3">Help</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-muted dark:text-text-light/70">Show Shortcuts</span>
                    <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">?</code>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-start space-x-2">
                <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <p className="font-medium mb-1">Pro Tips:</p>
                  <ul className="space-y-1 text-xs">
                    <li>• Keyboard shortcuts don't work when typing in input fields</li>
                    <li>• Use Shift+Click to select ranges of images</li>
                    <li>• Ctrl+Click to select individual images</li>
                    <li>• Right-click on images for context menu (coming soon)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
