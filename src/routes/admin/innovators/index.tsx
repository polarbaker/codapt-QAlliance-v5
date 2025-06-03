import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useUserStore } from "~/stores/userStore";
import { useTRPC } from "~/trpc/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DebouncedSearchInput } from "~/components/ui/DebouncedSearchInput";
import { Badge } from "~/components/ui/Badge";
import { InnovatorBulkActions } from "~/components/admin/InnovatorBulkActions";
import { InnovatorStats } from "~/components/admin/InnovatorStats";
import { toast } from "react-hot-toast";
import { getCacheBustedImageUrl } from "~/utils";
import {
  Users,
  Plus,
  Edit,
  Trash2,
  ArrowLeft,
  Star,
  ExternalLink,
  Video,
  ArrowUp,
  ArrowDown,
  X,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/innovators/")({
  component: AdminInnovatorsPage,
});

function AdminInnovatorsPage() {
  const { adminToken } = useUserStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [featuredFilter, setFeaturedFilter] = useState<"all" | "featured" | "not-featured">("all");
  const [selectedInnovators, setSelectedInnovators] = useState<number[]>([]);
  const [isReorderMode, setIsReorderMode] = useState(false);
  
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  
  // Use the correct pattern for queries
  const innovatorsQuery = useQuery(
    trpc.adminGetInnovators.queryOptions({
      adminToken: adminToken || "",
      search: searchQuery || undefined,
      featured: featuredFilter === "all" ? undefined : featuredFilter === "featured",
      limit: 20,
    })
  );
  
  // Use the correct pattern for mutations with proper invalidation
  const deleteMutation = useMutation(
    trpc.adminDeleteInnovator.mutationOptions({
      onSuccess: async () => {
        // Invalidate all relevant queries to ensure immediate updates
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['adminGetInnovators'] }),
          queryClient.invalidateQueries({ queryKey: ['getInnovators'] }),
          queryClient.invalidateQueries({ queryKey: ['getFeaturedInnovators'] }),
        ]);
        toast.success("Innovator deleted successfully");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const toggleFeaturedMutation = useMutation(
    trpc.adminUpdateInnovator.mutationOptions({
      onSuccess: async () => {
        // Invalidate all relevant queries to ensure immediate updates
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['adminGetInnovators'] }),
          queryClient.invalidateQueries({ queryKey: ['getInnovators'] }),
          queryClient.invalidateQueries({ queryKey: ['getFeaturedInnovators'] }),
        ]);
        toast.success("Featured status updated");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const reorderMutation = useMutation(
    trpc.adminReorderInnovators.mutationOptions({
      onSuccess: async () => {
        // Invalidate all relevant queries to ensure immediate updates
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['adminGetInnovators'] }),
          queryClient.invalidateQueries({ queryKey: ['getInnovators'] }),
          queryClient.invalidateQueries({ queryKey: ['getFeaturedInnovators'] }),
        ]);
        toast.success("Innovator order updated");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const handleSelectAll = () => {
    if (selectedInnovators.length === innovatorsQuery.data?.innovators.length) {
      setSelectedInnovators([]);
    } else {
      setSelectedInnovators(innovatorsQuery.data?.innovators.map(i => i.id) || []);
    }
  };

  const handleSelectInnovator = (id: number) => {
    setSelectedInnovators(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const handleToggleFeatured = (id: number, currentFeatured: boolean) => {
    toggleFeaturedMutation.mutate({
      adminToken: adminToken || "",
      id,
      data: { featured: !currentFeatured },
    });
  };

  const handleMoveUp = (index: number) => {
    if (index === 0 || !innovatorsQuery.data?.innovators) return;
    
    const innovators = [...innovatorsQuery.data.innovators];
    const [movedItem] = innovators.splice(index, 1);
    innovators.splice(index - 1, 0, movedItem);
    
    const reorderedIds = innovators.map(i => i.id);
    reorderMutation.mutate({
      adminToken: adminToken || "",
      innovatorIds: reorderedIds,
    });
  };

  const handleMoveDown = (index: number) => {
    if (!innovatorsQuery.data?.innovators || index === innovatorsQuery.data.innovators.length - 1) return;
    
    const innovators = [...innovatorsQuery.data.innovators];
    const [movedItem] = innovators.splice(index, 1);
    innovators.splice(index + 1, 0, movedItem);
    
    const reorderedIds = innovators.map(i => i.id);
    reorderMutation.mutate({
      adminToken: adminToken || "",
      innovatorIds: reorderedIds,
    });
  };

  const handleExportInnovators = () => {
    if (!innovatorsQuery.data?.innovators) return;
    
    const csvData = innovatorsQuery.data.innovators.map(innovator => ({
      ID: innovator.id,
      Name: innovator.name,
      Role: innovator.role,
      Featured: innovator.featured ? 'Yes' : 'No',
      'Has Video': innovator.hasVideo ? 'Yes' : 'No',
      Order: innovator.order,
      'Created Date': new Date(innovator.createdAt).toLocaleDateString(),
      'Updated Date': new Date(innovator.updatedAt).toLocaleDateString(),
    }));
    
    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(value => `"${value}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `innovators-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Innovators exported successfully');
  };

  const handleDelete = (id: number, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      deleteMutation.mutate({
        adminToken: adminToken || "",
        id,
      });
    }
  };

  const parseAchievements = (achievementsString: string | null): string[] => {
    if (!achievementsString) return [];
    try {
      return JSON.parse(achievementsString);
    } catch {
      return [];
    }
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
          <div className="flex items-center space-x-4">
            {selectedInnovators.length > 0 && (
              <div className="flex items-center space-x-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <span className="text-sm text-blue-700 dark:text-blue-300">
                  {selectedInnovators.length} selected
                </span>
              </div>
            )}
            {isReorderMode && reorderMutation.isPending && (
              <div className="flex items-center space-x-2 px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-yellow-600 border-t-transparent"></div>
                <span className="text-sm text-yellow-700 dark:text-yellow-300">
                  Updating order...
                </span>
              </div>
            )}
            <button
              onClick={handleExportInnovators}
              disabled={!innovatorsQuery.data?.innovators.length}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Export CSV
            </button>
            <button
              onClick={() => setIsReorderMode(!isReorderMode)}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                isReorderMode 
                  ? 'bg-secondary text-white border-secondary' 
                  : 'bg-white dark:bg-gray-800 text-text-dark dark:text-text-light border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {isReorderMode ? 'Exit Reorder' : 'Reorder'}
            </button>
            <Link
              to="/admin/innovators/new"
              className="flex items-center space-x-2 px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>New Innovator</span>
            </Link>
          </div>
        </div>

        <div className="py-8">
          <div className="flex items-center space-x-4 mb-6">
            <div className="h-12 w-12 flex items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/20">
              <Users className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-text-dark dark:text-text-light">
                Hall of Innovators
              </h1>
              <p className="text-text-muted dark:text-text-light/70">
                Manage innovator profiles and achievements
              </p>
            </div>
          </div>

          {/* Stats Overview */}
          <InnovatorStats />

          {/* Batch Actions */}
          <InnovatorBulkActions
            selectedIds={selectedInnovators}
            onClear={() => setSelectedInnovators([])}
            onSuccess={async () => {
              // Invalidate all relevant queries to ensure immediate updates
              await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['adminGetInnovators'] }),
                queryClient.invalidateQueries({ queryKey: ['getInnovators'] }),
                queryClient.invalidateQueries({ queryKey: ['getFeaturedInnovators'] }),
              ]);
            }}
          />

          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                  Search
                </label>
                <DebouncedSearchInput
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search innovators..."
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                  Featured Status
                </label>
                <select
                  value={featuredFilter}
                  onChange={(e) => setFeaturedFilter(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
                >
                  <option value="all">All Innovators</option>
                  <option value="featured">Featured Only</option>
                  <option value="not-featured">Not Featured</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                  Selection
                </label>
                <label className="flex items-center space-x-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
                  <input
                    type="checkbox"
                    checked={selectedInnovators.length === innovatorsQuery.data?.innovators.length && innovatorsQuery.data?.innovators.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-secondary focus:ring-secondary"
                  />
                  <span className="text-sm text-text-dark dark:text-text-light">
                    Select All
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Innovators Grid */}
          {innovatorsQuery.isLoading ? (
            <div className="text-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary border-t-transparent mx-auto mb-4"></div>
              <p className="text-text-muted dark:text-text-light/70">Loading innovators...</p>
            </div>
          ) : innovatorsQuery.data?.innovators.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-text-muted dark:text-text-light/70 mb-4">No innovators found</p>
              <Link
                to="/admin/innovators/new"
                className="inline-flex items-center space-x-2 px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Add Your First Innovator</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {innovatorsQuery.data?.innovators.map((innovator, index) => {
                const achievements = parseAchievements(innovator.achievements);
                const isSelected = selectedInnovators.includes(innovator.id);
                
                return (
                  <div
                    key={innovator.id}
                    className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow ${
                      isSelected ? 'ring-2 ring-secondary' : ''
                    }`}
                  >
                    <div className="relative">
                      <img
                        src={getCacheBustedImageUrl(innovator.avatar, innovator.updatedAt)}
                        alt={innovator.name}
                        className="w-full h-48 object-cover"
                      />
                      
                      {/* Selection checkbox */}
                      <div className="absolute top-3 left-3">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectInnovator(innovator.id)}
                            className="rounded border-gray-300 text-secondary focus:ring-secondary bg-white"
                          />
                        </label>
                      </div>
                      
                      {/* Featured and Video badges */}
                      <div className="absolute top-3 right-3 flex flex-col space-y-2">
                        {innovator.featured && (
                          <Badge variant="warning" className="flex items-center space-x-1">
                            <Star className="h-3 w-3" />
                            <span>Featured</span>
                          </Badge>
                        )}
                        {innovator.hasVideo && (
                          <Badge variant="info" className="flex items-center space-x-1">
                            <Video className="h-3 w-3" />
                            <span>Video</span>
                          </Badge>
                        )}
                      </div>
                      
                      {/* Reorder controls */}
                      {isReorderMode && (
                        <div className="absolute bottom-3 left-3 flex space-x-1">
                          <button
                            onClick={() => handleMoveUp(index)}
                            disabled={index === 0}
                            className="p-1 bg-white rounded shadow hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Move Up"
                          >
                            <ArrowUp className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleMoveDown(index)}
                            disabled={index === (innovatorsQuery.data?.innovators.length || 0) - 1}
                            className="p-1 bg-white rounded shadow hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Move Down"
                          >
                            <ArrowDown className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                    
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-lg font-semibold text-text-dark dark:text-text-light">
                          {innovator.name}
                        </h3>
                      </div>
                      
                      <p className="text-sm text-text-muted dark:text-text-light/70 mb-2">
                        {innovator.role}
                      </p>
                      
                      <p className="text-sm text-text-dark dark:text-text-light mb-4 line-clamp-2">
                        {innovator.impact}
                      </p>
                      
                      {achievements.length > 0 && (
                        <div className="mb-4">
                          <p className="text-xs font-medium text-text-muted dark:text-text-light/70 mb-2">
                            Key Achievements:
                          </p>
                          <ul className="text-xs text-text-dark dark:text-text-light space-y-1">
                            {achievements.slice(0, 2).map((achievement, index) => (
                              <li key={index} className="line-clamp-1">
                                • {achievement}
                              </li>
                            ))}
                            {achievements.length > 2 && (
                              <li className="text-text-muted dark:text-text-light/70">
                                + {achievements.length - 2} more
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between text-xs text-text-muted dark:text-text-light/70 mb-4">
                        <span>Order: {innovator.order}</span>
                        <span>Created: {new Date(innovator.createdAt).toLocaleDateString()}</span>
                      </div>
                      
                      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                        {/* Quick featured toggle */}
                        <button
                          onClick={() => handleToggleFeatured(innovator.id, innovator.featured)}
                          disabled={toggleFeaturedMutation.isPending}
                          className={`px-2 py-1 text-xs rounded transition-colors ${
                            innovator.featured
                              ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                          } disabled:opacity-50`}
                        >
                          {innovator.featured ? 'Unfeature' : 'Feature'}
                        </button>
                        
                        {/* Edit and Delete buttons */}
                        <div className="flex items-center space-x-2">
                          <Link
                            to="/admin/innovators/$innovatorId/edit"
                            params={{ innovatorId: innovator.id.toString() }}
                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="Edit Innovator"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => handleDelete(innovator.id, innovator.name)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Delete Innovator"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
