import React, { useState, useCallback } from 'react';
import { useTRPC } from '~/trpc/react';
import { toast } from 'react-hot-toast';
import {
  FolderPlus,
  Edit,
  Download,
  Trash2,
  Tag,
  Archive,
  Copy,
  X,
  Save,
  Plus,
  Minus,
  FileText,
  Users,
  Globe,
  Lock,
  Unlock,
  Star,
  StarOff,
} from 'lucide-react';

interface ImageData {
  id: number;
  fileName: string;
  filePath: string;
  fileSize: number;
  title?: string;
  description?: string;
  altText?: string;
  tags: string[];
  category?: string;
  createdAt: string;
}

interface ImageBulkActionsProps {
  selectedImages: number[];
  images: ImageData[];
  adminToken: string;
  onSelectionChange: (selectedIds: number[]) => void;
  onRefresh: () => void;
  className?: string;
}

interface BulkMetadata {
  tags: string[];
  category: string;
  addTags: string[];
  removeTags: string[];
  title?: string;
  description?: string;
  altText?: string;
}

export function ImageBulkActions({
  selectedImages,
  images,
  adminToken,
  onSelectionChange,
  onRefresh,
  className = "",
}: ImageBulkActionsProps) {
  const [showMetadataEditor, setShowMetadataEditor] = useState(false);
  const [showCollectionCreator, setShowCollectionCreator] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  
  const [bulkMetadata, setBulkMetadata] = useState<BulkMetadata>({
    tags: [],
    category: '',
    addTags: [],
    removeTags: [],
  });
  
  const [collectionData, setCollectionData] = useState({
    name: '',
    description: '',
    isPublic: false,
  });
  
  const [exportOptions, setExportOptions] = useState({
    format: 'zip',
    includeMetadata: true,
    includeVariants: false,
    quality: 'original',
  });

  const trpc = useTRPC();

  // Mutations
  const deleteMutation = trpc.adminDeleteImage.useMutation({
    onSuccess: () => {
      onRefresh();
      toast.success("Images deleted successfully");
    },
    onError: (error) => {
      toast.error(`Delete failed: ${error.message}`);
    },
  });

  const createCollectionMutation = trpc.adminCreateImageCollection.useMutation({
    onSuccess: () => {
      onRefresh();
      setShowCollectionCreator(false);
      setCollectionData({ name: '', description: '', isPublic: false });
      toast.success("Collection created successfully");
    },
    onError: (error) => {
      toast.error(`Collection creation failed: ${error.message}`);
    },
  });

  // Calculate selection stats
  const selectedImageData = images.filter(img => selectedImages.includes(img.id));
  const totalSize = selectedImageData.reduce((sum, img) => sum + img.fileSize, 0);
  const categories = [...new Set(selectedImageData.map(img => img.category).filter(Boolean))];
  const allTags = [...new Set(selectedImageData.flatMap(img => img.tags))];

  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  const handleBulkDelete = useCallback(async () => {
    if (selectedImages.length === 0) return;
    
    const confirmMessage = `Are you sure you want to delete ${selectedImages.length} image(s)? This action cannot be undone and will also delete all image variants.`;
    if (!confirm(confirmMessage)) return;
    
    console.log(`🗑️ BULK DELETE: Starting bulk deletion of ${selectedImages.length} images`);
    
    // Show progress toast
    const progressToastId = toast.loading(`Deleting ${selectedImages.length} images...`);
    
    let successCount = 0;
    let errorCount = 0;
    const errors: Array<{ fileName: string; error: string }> = [];
    
    try {
      // Process deletions one by one to avoid overwhelming the server
      for (let i = 0; i < selectedImageData.length; i++) {
        const image = selectedImageData[i];
        
        try {
          console.log(`🗑️ BULK DELETE: Deleting ${i + 1}/${selectedImageData.length}: ${image.fileName}`);
          
          // Update progress toast
          toast.loading(`Deleting ${i + 1}/${selectedImageData.length}: ${image.fileName}`, {
            id: progressToastId,
          });
          
          await deleteMutation.mutateAsync({
            adminToken,
            filePath: image.filePath,
          });
          
          successCount++;
          console.log(`✅ BULK DELETE: Successfully deleted ${image.fileName} (${successCount}/${selectedImageData.length})`);
          
        } catch (error) {
          errorCount++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push({
            fileName: image.fileName,
            error: errorMessage,
          });
          
          console.error(`❌ BULK DELETE: Failed to delete ${image.fileName}:`, errorMessage);
        }
        
        // Brief pause between deletions to prevent server overload
        if (i < selectedImageData.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      // Dismiss progress toast
      toast.dismiss(progressToastId);
      
      // Show final results
      if (errorCount === 0) {
        toast.success(`Successfully deleted all ${successCount} images`);
        console.log(`✅ BULK DELETE: All ${successCount} images deleted successfully`);
      } else if (successCount > 0) {
        toast.success(`Deleted ${successCount} images successfully. ${errorCount} failed.`, {
          duration: 6000,
        });
        console.warn(`⚠️ BULK DELETE: Partial success - ${successCount} deleted, ${errorCount} failed`);
        
        // Show detailed error information
        if (errors.length > 0) {
          console.error('BULK DELETE: Failed deletions:', errors);
          
          // Show first few errors to user
          const errorSummary = errors.slice(0, 3).map(e => `${e.fileName}: ${e.error}`).join('\n');
          toast.error(`Deletion errors:\n${errorSummary}${errors.length > 3 ? `\n...and ${errors.length - 3} more` : ''}`, {
            duration: 10000,
          });
        }
      } else {
        toast.error(`Failed to delete all ${errorCount} images`);
        console.error(`❌ BULK DELETE: All ${errorCount} deletions failed`);
        
        // Show first error as example
        if (errors.length > 0) {
          toast.error(`Example error: ${errors[0].error}`, {
            duration: 8000,
          });
        }
      }
      
      // Clear selection and refresh regardless of partial failures
      onSelectionChange([]);
      onRefresh();
      
    } catch (error) {
      // Dismiss progress toast
      toast.dismiss(progressToastId);
      
      console.error('❌ BULK DELETE: Bulk deletion process failed:', error);
      toast.error(`Bulk deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [selectedImages, selectedImageData, adminToken, deleteMutation, onSelectionChange, onRefresh]);

  const handleCreateCollection = useCallback(() => {
    if (!collectionData.name.trim()) {
      toast.error("Collection name is required");
      return;
    }

    createCollectionMutation.mutate({
      adminToken,
      name: collectionData.name.trim(),
      description: collectionData.description.trim(),
      isPublic: collectionData.isPublic,
      imageIds: selectedImages,
    });
  }, [adminToken, collectionData, selectedImages, createCollectionMutation]);

  const handleBulkMetadataUpdate = useCallback(() => {
    // TODO: Implement bulk metadata update mutation
    toast.info('Bulk metadata update will be implemented in the next version');
    setShowMetadataEditor(false);
  }, []);

  const handleExport = useCallback(() => {
    // TODO: Implement export functionality
    toast.info('Export functionality will be implemented in the next version');
    setShowExportOptions(false);
  }, []);

  const addTag = useCallback((tag: string) => {
    if (tag.trim() && !bulkMetadata.addTags.includes(tag.trim())) {
      setBulkMetadata(prev => ({
        ...prev,
        addTags: [...prev.addTags, tag.trim()]
      }));
    }
  }, [bulkMetadata.addTags]);

  const removeTag = useCallback((tag: string) => {
    if (tag.trim() && !bulkMetadata.removeTags.includes(tag.trim())) {
      setBulkMetadata(prev => ({
        ...prev,
        removeTags: [...prev.removeTags, tag.trim()]
      }));
    }
  }, [bulkMetadata.removeTags]);

  if (selectedImages.length === 0) {
    return null;
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 ${className}`}>
      {/* Selection Summary */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <div className="text-sm font-medium text-text-dark dark:text-text-light">
            {selectedImages.length} image{selectedImages.length !== 1 ? 's' : ''} selected
          </div>
          <div className="text-xs text-text-muted dark:text-text-light/70">
            Total size: {formatFileSize(totalSize)}
          </div>
          {categories.length > 0 && (
            <div className="text-xs text-text-muted dark:text-text-light/70">
              Categories: {categories.join(', ')}
            </div>
          )}
        </div>
        
        <button
          onClick={() => onSelectionChange([])}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          title="Clear selection"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setShowCollectionCreator(true)}
          className="flex items-center space-x-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
        >
          <FolderPlus className="h-4 w-4" />
          <span>Create Collection</span>
        </button>
        
        <button
          onClick={() => setShowMetadataEditor(true)}
          className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
        >
          <Edit className="h-4 w-4" />
          <span>Edit Metadata</span>
        </button>
        
        <button
          onClick={() => setShowExportOptions(true)}
          className="flex items-center space-x-1 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
        >
          <Download className="h-4 w-4" />
          <span>Export</span>
        </button>
        
        <button
          onClick={() => {
            // TODO: Implement archive functionality
            toast.info('Archive functionality coming soon!');
          }}
          className="flex items-center space-x-1 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
        >
          <Archive className="h-4 w-4" />
          <span>Archive</span>
        </button>
        
        <button
          onClick={handleBulkDelete}
          className="flex items-center space-x-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
        >
          <Trash2 className="h-4 w-4" />
          <span>Delete</span>
        </button>
      </div>

      {/* Collection Creator Modal */}
      {showCollectionCreator && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-text-dark dark:text-text-light mb-4 flex items-center space-x-2">
              <FolderPlus className="h-5 w-5" />
              <span>Create Image Collection</span>
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                  Collection Name *
                </label>
                <input
                  type="text"
                  value={collectionData.name}
                  onChange={(e) => setCollectionData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
                  placeholder="Enter collection name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                  Description
                </label>
                <textarea
                  value={collectionData.description}
                  onChange={(e) => setCollectionData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
                  placeholder="Enter collection description (optional)"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={collectionData.isPublic}
                  onChange={(e) => setCollectionData(prev => ({ ...prev, isPublic: e.target.checked }))}
                  className="rounded border-gray-300 text-secondary focus:ring-secondary"
                />
                <label htmlFor="isPublic" className="text-sm text-text-dark dark:text-text-light">
                  Make collection public
                </label>
              </div>
              
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>{selectedImages.length}</strong> images will be added to this collection.
                </p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCollectionCreator(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCollection}
                disabled={!collectionData.name.trim() || createCollectionMutation.isPending}
                className="px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createCollectionMutation.isPending ? 'Creating...' : 'Create Collection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Metadata Editor Modal */}
      {showMetadataEditor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
            <h3 className="text-lg font-semibold text-text-dark dark:text-text-light mb-4 flex items-center space-x-2">
              <Edit className="h-5 w-5" />
              <span>Bulk Edit Metadata</span>
            </h3>
            
            <div className="space-y-6">
              {/* Current Tags Summary */}
              <div>
                <h4 className="text-sm font-medium text-text-dark dark:text-text-light mb-2">
                  Current Tags ({allTags.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {allTags.map(tag => (
                    <span key={tag} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-sm">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              
              {/* Add Tags */}
              <div>
                <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                  Add Tags
                </label>
                <div className="flex space-x-2 mb-2">
                  <input
                    type="text"
                    placeholder="Enter tag and press Enter"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addTag(e.currentTarget.value);
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {bulkMetadata.addTags.map(tag => (
                    <span key={tag} className="inline-flex items-center space-x-1 px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 rounded text-sm">
                      <Plus className="h-3 w-3" />
                      <span>{tag}</span>
                      <button
                        onClick={() => setBulkMetadata(prev => ({
                          ...prev,
                          addTags: prev.addTags.filter(t => t !== tag)
                        }))}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
              
              {/* Remove Tags */}
              <div>
                <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                  Remove Tags
                </label>
                <div className="flex flex-wrap gap-2">
                  {allTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => removeTag(tag)}
                      className={`px-2 py-1 rounded text-sm transition-colors ${
                        bulkMetadata.removeTags.includes(tag)
                          ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/10'
                      }`}
                    >
                      {bulkMetadata.removeTags.includes(tag) ? (
                        <span className="flex items-center space-x-1">
                          <Minus className="h-3 w-3" />
                          <span>{tag}</span>
                        </span>
                      ) : (
                        tag
                      )}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                  Set Category (will replace existing categories)
                </label>
                <select
                  value={bulkMetadata.category}
                  onChange={(e) => setBulkMetadata(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
                >
                  <option value="">No change</option>
                  <option value="hero">Hero Images</option>
                  <option value="gallery">Gallery</option>
                  <option value="profile">Profile Pictures</option>
                  <option value="logo">Logos</option>
                  <option value="content">Content Images</option>
                  <option value="background">Backgrounds</option>
                  <option value="icon">Icons</option>
                  <option value="product">Products</option>
                </select>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowMetadataEditor(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkMetadataUpdate}
                className="px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors"
              >
                Update Metadata
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Options Modal */}
      {showExportOptions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-text-dark dark:text-text-light mb-4 flex items-center space-x-2">
              <Download className="h-5 w-5" />
              <span>Export Options</span>
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                  Export Format
                </label>
                <select
                  value={exportOptions.format}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, format: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
                >
                  <option value="zip">ZIP Archive</option>
                  <option value="tar">TAR Archive</option>
                  <option value="folder">Folder Structure</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                  Image Quality
                </label>
                <select
                  value={exportOptions.quality}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, quality: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
                >
                  <option value="original">Original Quality</option>
                  <option value="high">High Quality (90%)</option>
                  <option value="medium">Medium Quality (75%)</option>
                  <option value="low">Low Quality (60%)</option>
                </select>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="includeMetadata"
                    checked={exportOptions.includeMetadata}
                    onChange={(e) => setExportOptions(prev => ({ ...prev, includeMetadata: e.target.checked }))}
                    className="rounded border-gray-300 text-secondary focus:ring-secondary"
                  />
                  <label htmlFor="includeMetadata" className="text-sm text-text-dark dark:text-text-light">
                    Include metadata file
                  </label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="includeVariants"
                    checked={exportOptions.includeVariants}
                    onChange={(e) => setExportOptions(prev => ({ ...prev, includeVariants: e.target.checked }))}
                    className="rounded border-gray-300 text-secondary focus:ring-secondary"
                  />
                  <label htmlFor="includeVariants" className="text-sm text-text-dark dark:text-text-light">
                    Include image variants
                  </label>
                </div>
              </div>
              
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Exporting <strong>{selectedImages.length}</strong> images ({formatFileSize(totalSize)})
                </p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowExportOptions(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                className="px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors"
              >
                Export Images
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
