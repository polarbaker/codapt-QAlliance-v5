import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useUserStore } from "~/stores/userStore";
import { useTRPC } from "~/trpc/react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { getImageUrl } from "~/utils";
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
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { ImageUpload } from "~/components/ui/ImageUpload";
import { ImageGallery } from "~/components/ui/ImageGallery";

export const Route = createFileRoute("/admin/images/")({
  component: AdminImagesPage,
});

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

function AdminImagesPage() {
  const { adminToken } = useUserStore();
  
  // State management
  const [viewMode, setViewMode] = useState<"grid" | "list" | "masonry">("grid");
  const [selectedImages, setSelectedImages] = useState<number[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showCollectionCreator, setShowCollectionCreator] = useState(false);
  
  // Filter state
  const [filters, setFilters] = useState({
    search: "",
    category: "",
    tags: [] as string[],
    sortBy: "createdAt" as "createdAt" | "fileName" | "fileSize" | "usageCount",
    sortOrder: "desc" as "asc" | "desc",
    page: 1,
    pageSize: 20,
  });
  
  const trpc = useTRPC();
  
  // Fetch images with enhanced filtering
  const imagesQuery = useQuery(
    trpc.adminListImages.queryOptions({
      adminToken: adminToken || "",
      ...filters,
      includeVariants: true,
    })
  );
  
  // Fetch collections
  const collectionsQuery = useQuery(
    trpc.adminListImageCollections.queryOptions({
      adminToken: adminToken || "",
      includeImages: false,
    })
  );
  
  // Delete image mutation
  const deleteMutation = useMutation(
    trpc.adminDeleteImage.mutationOptions({
      onSuccess: () => {
        imagesQuery.refetch();
        toast.success("Image deleted successfully");
        setSelectedImages(prev => prev.filter(id => !selectedImages.includes(id)));
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete image");
      },
    })
  );
  
  // Create collection mutation
  const createCollectionMutation = useMutation(
    trpc.adminCreateImageCollection.mutationOptions({
      onSuccess: () => {
        collectionsQuery.refetch();
        toast.success("Collection created successfully");
        setShowCollectionCreator(false);
        setSelectedImages([]);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create collection");
      },
    })
  );
  
  const images: ImageData[] = imagesQuery.data?.images.map(img => ({
    ...img,
    tags: Array.isArray(img.tags) ? img.tags : JSON.parse(img.tags || '[]'),
  })) || [];
  
  const handleDeleteImage = (image: ImageData) => {
    if (confirm(`Are you sure you want to delete "${image.fileName}"?`)) {
      deleteMutation.mutate({
        adminToken: adminToken || "",
        filePath: image.filePath,
      });
    }
  };
  
  const handleBulkDelete = () => {
    if (selectedImages.length === 0) return;
    
    if (confirm(`Are you sure you want to delete ${selectedImages.length} image(s)?`)) {
      selectedImages.forEach(imageId => {
        const image = images.find(img => img.id === imageId);
        if (image) {
          deleteMutation.mutate({
            adminToken: adminToken || "",
            filePath: image.filePath,
          });
        }
      });
    }
  };
  
  const handleCreateCollection = (name: string, description: string) => {
    createCollectionMutation.mutate({
      adminToken: adminToken || "",
      name,
      description,
      isPublic: false,
      imageIds: selectedImages,
    });
  };
  
  const updateFilters = (newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  };
  
  const totalSize = images.reduce((sum, img) => sum + img.fileSize, 0);
  const totalVariants = images.reduce((sum, img) => sum + (img.variants?.length || 0), 0);
  
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-black">
      <div className="container-padding">
        {/* Header */}
        <div className="flex items-center justify-between py-8 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-4">
            <Link
              to="/admin"
              className="flex items-center space-x-2 text-text-muted dark:text-text-light/70 hover:text-text-dark dark:hover:text-text-light transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Link>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                showFilters 
                  ? 'bg-secondary text-white' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Filter className="h-4 w-4" />
              <span>Filters</span>
            </button>
            <button
              onClick={() => setShowUpload(!showUpload)}
              className="flex items-center space-x-2 px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors"
            >
              <Upload className="h-4 w-4" />
              <span>Upload Images</span>
            </button>
          </div>
        </div>

        <div className="py-8">
          <div className="flex items-center space-x-4 mb-6">
            <div className="h-12 w-12 flex items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/20">
              <ImageIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-text-dark dark:text-text-light">
                Image Management
              </h1>
              <p className="text-text-muted dark:text-text-light/70">
                Manage all images with variants, collections, and metadata
              </p>
            </div>
          </div>

          {/* Enhanced Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-2">
                <ImageIcon className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-text-muted dark:text-text-light/70">Total Images</span>
              </div>
              <p className="text-2xl font-bold text-text-dark dark:text-text-light">
                {imagesQuery.data?.pagination.totalCount || 0}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-2">
                <HardDrive className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-text-muted dark:text-text-light/70">Total Size</span>
              </div>
              <p className="text-2xl font-bold text-text-dark dark:text-text-light">
                {formatFileSize(totalSize)}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-2">
                <Eye className="h-5 w-5 text-purple-600" />
                <span className="text-sm font-medium text-text-muted dark:text-text-light/70">Variants</span>
              </div>
              <p className="text-2xl font-bold text-text-dark dark:text-text-light">
                {totalVariants}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-2">
                <FolderPlus className="h-5 w-5 text-orange-600" />
                <span className="text-sm font-medium text-text-muted dark:text-text-light/70">Collections</span>
              </div>
              <p className="text-2xl font-bold text-text-dark dark:text-text-light">
                {collectionsQuery.data?.collections.length || 0}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-2">
                <Search className="h-5 w-5 text-cyan-600" />
                <span className="text-sm font-medium text-text-muted dark:text-text-light/70">Filtered</span>
              </div>
              <p className="text-2xl font-bold text-text-dark dark:text-text-light">
                {images.length}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-pink-600" />
                <span className="text-sm font-medium text-text-muted dark:text-text-light/70">Selected</span>
              </div>
              <p className="text-2xl font-bold text-text-dark dark:text-text-light">
                {selectedImages.length}
              </p>
            </div>
          </div>

          {/* Upload Section */}
          {showUpload && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-8">
              <h2 className="text-lg font-semibold text-text-dark dark:text-text-light mb-4">
                Upload New Images
              </h2>
              <ImageUpload
                value=""
                onChange={(filePath) => {
                  if (filePath) {
                    imagesQuery.refetch();
                    setShowUpload(false);
                  }
                }}
                placeholder="Upload single or multiple images"
                previewClassName="h-48"
                multiple={true}
                maxImages={10}
                showMetadataEditor={true}
                generateVariants={true}
                showCollectionCreator={true}
              />
            </div>
          )}

          {/* Filters Section */}
          {showFilters && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-8">
              <h2 className="text-lg font-semibold text-text-dark dark:text-text-light mb-4">
                Filter Images
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                    Search
                  </label>
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => updateFilters({ search: e.target.value })}
                    placeholder="Search images..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                    Category
                  </label>
                  <select
                    value={filters.category}
                    onChange={(e) => updateFilters({ category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
                  >
                    <option value="">All Categories</option>
                    <option value="hero">Hero Images</option>
                    <option value="gallery">Gallery</option>
                    <option value="profile">Profile Pictures</option>
                    <option value="logo">Logos</option>
                    <option value="content">Content Images</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                    Sort By
                  </label>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => updateFilters({ sortBy: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
                  >
                    <option value="createdAt">Date Created</option>
                    <option value="fileName">File Name</option>
                    <option value="fileSize">File Size</option>
                    <option value="usageCount">Usage Count</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                    Order
                  </label>
                  <select
                    value={filters.sortOrder}
                    onChange={(e) => updateFilters({ sortOrder: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
                  >
                    <option value="desc">Descending</option>
                    <option value="asc">Ascending</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-2 rounded-lg transition-colors ${
                      viewMode === "grid"
                        ? "bg-secondary text-white"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-2 rounded-lg transition-colors ${
                      viewMode === "list"
                        ? "bg-secondary text-white"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                  >
                    <List className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("masonry")}
                    className={`p-2 rounded-lg transition-colors ${
                      viewMode === "masonry"
                        ? "bg-secondary text-white"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                    disabled
                    title="Masonry view coming soon"
                  >
                    <Columns3 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {selectedImages.length > 0 && (
                  <>
                    <button
                      onClick={() => setShowCollectionCreator(true)}
                      className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Create Collection ({selectedImages.length})
                    </button>
                    <button
                      onClick={handleBulkDelete}
                      className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Delete Selected ({selectedImages.length})
                    </button>
                  </>
                )}
                <button
                  onClick={() => {
                    if (selectedImages.length === images.length) {
                      setSelectedImages([]);
                    } else {
                      setSelectedImages(images.map(img => img.id));
                    }
                  }}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {selectedImages.length === images.length ? "Deselect All" : "Select All"}
                </button>
              </div>
            </div>
          </div>

          {/* Images Gallery */}
          <ImageGallery
            images={images}
            viewMode={viewMode}
            selectable={true}
            selectedImages={selectedImages}
            onSelectionChange={setSelectedImages}
            onImageDelete={handleDeleteImage}
            showMetadata={true}
            showVariants={true}
            loading={imagesQuery.isLoading}
            emptyMessage={
              filters.search || filters.category 
                ? "No images found matching your filters" 
                : "No images uploaded yet"
            }
          />

          {/* Pagination */}
          {imagesQuery.data?.pagination && imagesQuery.data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-center space-x-4 mt-8">
              <button
                onClick={() => updateFilters({ page: filters.page - 1 })}
                disabled={!imagesQuery.data.pagination.hasPreviousPage}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-text-muted dark:text-text-light/70">
                Page {imagesQuery.data.pagination.page} of {imagesQuery.data.pagination.totalPages}
              </span>
              <button
                onClick={() => updateFilters({ page: filters.page + 1 })}
                disabled={!imagesQuery.data.pagination.hasNextPage}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Collection Creator Modal */}
      {showCollectionCreator && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-text-dark dark:text-text-light mb-4">
              Create Image Collection
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const name = formData.get('name') as string;
                const description = formData.get('description') as string;
                handleCreateCollection(name, description);
              }}
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                    Collection Name
                  </label>
                  <input
                    type="text"
                    name="name"
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
                    name="description"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
                    placeholder="Enter collection description"
                  />
                </div>
                <p className="text-sm text-text-muted dark:text-text-light/70">
                  {selectedImages.length} images will be added to this collection.
                </p>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCollectionCreator(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors"
                >
                  Create Collection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
