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
  Copy,
  Search,
  Grid3X3,
  List,
  Image as ImageIcon,
  Download,
  Eye,
  Calendar,
  HardDrive,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { ImageUpload } from "~/components/ui/ImageUpload";

export const Route = createFileRoute("/admin/images/")({
  component: AdminImagesPage,
});

function AdminImagesPage() {
  const { adminToken } = useUserStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  
  const trpc = useTRPC();
  
  // Fetch images
  const imagesQuery = useQuery(
    trpc.adminListImages.queryOptions({
      adminToken: adminToken || "",
      prefix: searchQuery || undefined,
    })
  );
  
  // Delete image mutation
  const deleteMutation = useMutation(
    trpc.adminDeleteImage.mutationOptions({
      onSuccess: () => {
        imagesQuery.refetch();
        toast.success("Image deleted successfully");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete image");
      },
    })
  );
  
  // Filter images based on search
  const filteredImages = imagesQuery.data?.images.filter(image =>
    image.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];
  
  const handleDeleteImage = (imageName: string) => {
    if (confirm(`Are you sure you want to delete "${imageName}"?`)) {
      deleteMutation.mutate({
        adminToken: adminToken || "",
        filePath: imageName,
      });
    }
  };
  
  const handleCopyPath = (imageName: string) => {
    navigator.clipboard.writeText(imageName);
    toast.success("Image path copied to clipboard");
  };
  
  const handleCopyUrl = (imageName: string) => {
    const url = getImageUrl(imageName);
    navigator.clipboard.writeText(url);
    toast.success("Image URL copied to clipboard");
  };
  
  const handleSelectImage = (imageName: string) => {
    setSelectedImages(prev =>
      prev.includes(imageName)
        ? prev.filter(name => name !== imageName)
        : [...prev, imageName]
    );
  };
  
  const handleSelectAll = () => {
    if (selectedImages.length === filteredImages.length) {
      setSelectedImages([]);
    } else {
      setSelectedImages(filteredImages.map(img => img.name));
    }
  };
  
  const handleBulkDelete = () => {
    if (selectedImages.length === 0) return;
    
    if (confirm(`Are you sure you want to delete ${selectedImages.length} image(s)?`)) {
      selectedImages.forEach(imageName => {
        deleteMutation.mutate({
          adminToken: adminToken || "",
          filePath: imageName,
        });
      });
      setSelectedImages([]);
    }
  };
  
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  const totalSize = filteredImages.reduce((sum, img) => sum + img.size, 0);

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
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="flex items-center space-x-2 px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors"
          >
            <Upload className="h-4 w-4" />
            <span>Upload Images</span>
          </button>
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
                Manage all images used across the site
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
                    toast.success("Image uploaded successfully");
                  }
                }}
                placeholder="Upload images for use across the site"
                previewClassName="h-48"
              />
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-2">
                <ImageIcon className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-text-muted dark:text-text-light/70">Total Images</span>
              </div>
              <p className="text-2xl font-bold text-text-dark dark:text-text-light">
                {imagesQuery.data?.images.length || 0}
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
                <Search className="h-5 w-5 text-purple-600" />
                <span className="text-sm font-medium text-text-muted dark:text-text-light/70">Filtered</span>
              </div>
              <p className="text-2xl font-bold text-text-dark dark:text-text-light">
                {filteredImages.length}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-orange-600" />
                <span className="text-sm font-medium text-text-muted dark:text-text-light/70">Selected</span>
              </div>
              <p className="text-2xl font-bold text-text-dark dark:text-text-light">
                {selectedImages.length}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search images..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
                  />
                </div>
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
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleSelectAll}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {selectedImages.length === filteredImages.length ? "Deselect All" : "Select All"}
                </button>
                {selectedImages.length > 0 && (
                  <button
                    onClick={handleBulkDelete}
                    className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Delete Selected ({selectedImages.length})
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Images */}
          {imagesQuery.isLoading ? (
            <div className="text-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary border-t-transparent mx-auto mb-4"></div>
              <p className="text-text-muted dark:text-text-light/70">Loading images...</p>
            </div>
          ) : imagesQuery.error ? (
            <div className="text-center py-12">
              <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-text-muted dark:text-text-light/70 mb-4">Error loading images</p>
              <p className="text-sm text-red-600">{imagesQuery.error.message}</p>
            </div>
          ) : filteredImages.length === 0 ? (
            <div className="text-center py-12">
              <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-text-muted dark:text-text-light/70 mb-4">
                {searchQuery ? "No images found matching your search" : "No images uploaded yet"}
              </p>
              <button
                onClick={() => setShowUpload(true)}
                className="px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors"
              >
                Upload Your First Image
              </button>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {filteredImages.map((image) => (
                <div
                  key={image.name}
                  className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow ${
                    selectedImages.includes(image.name) ? "ring-2 ring-secondary" : ""
                  }`}
                >
                  <div className="aspect-square bg-gray-50 dark:bg-gray-700 relative">
                    <img
                      src={getImageUrl(image.name)}
                      alt={image.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute top-2 left-2">
                      <input
                        type="checkbox"
                        checked={selectedImages.includes(image.name)}
                        onChange={() => handleSelectImage(image.name)}
                        className="rounded border-gray-300 text-secondary focus:ring-secondary"
                      />
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-medium text-text-dark dark:text-text-light mb-2 truncate">
                      {image.name}
                    </h3>
                    <p className="text-xs text-text-muted dark:text-text-light/70 mb-2">
                      {formatFileSize(image.size)}
                    </p>
                    <p className="text-xs text-text-muted dark:text-text-light/70 mb-4">
                      {new Date(image.lastModified).toLocaleDateString()}
                    </p>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleCopyPath(image.name)}
                        className="flex-1 px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
                        title="Copy file path"
                      >
                        <Copy className="h-3 w-3 mx-auto" />
                      </button>
                      <button
                        onClick={() => handleCopyUrl(image.name)}
                        className="flex-1 px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition-colors"
                        title="Copy URL"
                      >
                        <Eye className="h-3 w-3 mx-auto" />
                      </button>
                      <button
                        onClick={() => handleDeleteImage(image.name)}
                        className="flex-1 px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors"
                        title="Delete image"
                      >
                        <Trash2 className="h-3 w-3 mx-auto" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          checked={selectedImages.length === filteredImages.length && filteredImages.length > 0}
                          onChange={handleSelectAll}
                          className="rounded border-gray-300 text-secondary focus:ring-secondary"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Preview
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Size
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Modified
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredImages.map((image) => (
                      <tr key={image.name} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedImages.includes(image.name)}
                            onChange={() => handleSelectImage(image.name)}
                            className="rounded border-gray-300 text-secondary focus:ring-secondary"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <img
                            src={getImageUrl(image.name)}
                            alt={image.name}
                            className="h-12 w-12 object-cover rounded"
                            loading="lazy"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-dark dark:text-text-light">
                          {image.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted dark:text-text-light/70">
                          {formatFileSize(image.size)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted dark:text-text-light/70">
                          {new Date(image.lastModified).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                          <button
                            onClick={() => handleCopyPath(image.name)}
                            className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
                            title="Copy file path"
                          >
                            Copy Path
                          </button>
                          <button
                            onClick={() => handleCopyUrl(image.name)}
                            className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition-colors"
                            title="Copy URL"
                          >
                            Copy URL
                          </button>
                          <button
                            onClick={() => handleDeleteImage(image.name)}
                            className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors"
                            title="Delete image"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
