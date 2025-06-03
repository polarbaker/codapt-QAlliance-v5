import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useUserStore } from "~/stores/userStore";
import { useTRPC } from "~/trpc/react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DebouncedSearchInput } from "~/components/ui/DebouncedSearchInput";
import { Badge } from "~/components/ui/Badge";
import { PartnerBulkActions } from "~/components/admin/PartnerBulkActions";
import { PartnerStats } from "~/components/admin/PartnerStats";
import { toast } from "react-hot-toast";
import { getCacheBustedImageUrl } from "~/utils";
import {
  Handshake,
  Plus,
  Edit,
  Trash2,
  ArrowLeft,
  ExternalLink,
  Eye,
  EyeOff,
  Building,
  ArrowUp,
  ArrowDown,
  GripVertical,
  CheckSquare,
  Square,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/partners/")({
  component: AdminPartnersPage,
});

function AdminPartnersPage() {
  const { adminToken } = useUserStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState<"all" | "visible" | "hidden">("all");
  const [selectedPartners, setSelectedPartners] = useState<number[]>([]);
  const [isReorderMode, setIsReorderMode] = useState(false);
  
  const trpc = useTRPC();
  
  const partnersQuery = useQuery(
    trpc.adminGetPartners.queryOptions({
      adminToken: adminToken || "",
      search: searchQuery || undefined,
      visible: visibilityFilter === "all" ? undefined : visibilityFilter === "visible",
      limit: 50,
    })
  );
  
  const deleteMutation = useMutation(
    trpc.adminDeletePartner.mutationOptions({
      onSuccess: () => {
        partnersQuery.refetch();
        toast.success("Partner deleted successfully");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const toggleVisibilityMutation = useMutation(
    trpc.adminTogglePartnerVisibility.mutationOptions({
      onSuccess: () => {
        partnersQuery.refetch();
        toast.success("Partner visibility updated");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const reorderMutation = useMutation(
    trpc.adminReorderPartners.mutationOptions({
      onSuccess: () => {
        partnersQuery.refetch();
        toast.success("Partners reordered successfully");
        setIsReorderMode(false);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const handleDelete = (id: number, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      deleteMutation.mutate({
        adminToken: adminToken || "",
        id,
      });
    }
  };

  const handleToggleVisibility = (id: number, currentVisibility: boolean) => {
    toggleVisibilityMutation.mutate({
      adminToken: adminToken || "",
      id,
      visible: !currentVisibility,
    });
  };

  const handleToggleSelection = (partnerId: number) => {
    setSelectedPartners(prev => 
      prev.includes(partnerId) 
        ? prev.filter(id => id !== partnerId)
        : [...prev, partnerId]
    );
  };

  const handleSelectAll = () => {
    const allPartnerIds = partnersQuery.data?.partners.map(p => p.id) || [];
    setSelectedPartners(
      selectedPartners.length === allPartnerIds.length ? [] : allPartnerIds
    );
  };

  const handleMoveUp = (index: number) => {
    if (index === 0 || !partnersQuery.data?.partners) return;
    
    const partners = [...partnersQuery.data.partners];
    const newOrder = partners.map((partner, i) => {
      if (i === index) return partners[index - 1].id;
      if (i === index - 1) return partners[index].id;
      return partner.id;
    });
    
    reorderMutation.mutate({
      adminToken: adminToken || "",
      partnerIds: newOrder,
    });
  };

  const handleMoveDown = (index: number) => {
    if (!partnersQuery.data?.partners || index === partnersQuery.data.partners.length - 1) return;
    
    const partners = [...partnersQuery.data.partners];
    const newOrder = partners.map((partner, i) => {
      if (i === index) return partners[index + 1].id;
      if (i === index + 1) return partners[index].id;
      return partner.id;
    });
    
    reorderMutation.mutate({
      adminToken: adminToken || "",
      partnerIds: newOrder,
    });
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
          <Link
            to="/admin/partners/new"
            className="flex items-center space-x-2 px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>New Partner</span>
          </Link>
        </div>

        <div className="py-8">
          <div className="flex items-center space-x-4 mb-6">
            <div className="h-12 w-12 flex items-center justify-center rounded-full bg-teal-100 dark:bg-teal-900/20">
              <Handshake className="h-6 w-6 text-teal-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-text-dark dark:text-text-light">
                Partners
              </h1>
              <p className="text-text-muted dark:text-text-light/70">
                Manage partner organizations and logos
              </p>
            </div>
          </div>

          {/* Stats */}
          <PartnerStats />

          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                  Search
                </label>
                <DebouncedSearchInput
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search partners..."
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                  Visibility
                </label>
                <select
                  value={visibilityFilter}
                  onChange={(e) => setVisibilityFilter(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
                >
                  <option value="all">All Partners</option>
                  <option value="visible">Visible Only</option>
                  <option value="hidden">Hidden Only</option>
                </select>
              </div>
            </div>
          </div>

          {/* Bulk Actions */}
          <PartnerBulkActions
            selectedPartners={selectedPartners}
            onClearSelection={() => setSelectedPartners([])}
            onRefresh={() => partnersQuery.refetch()}
            partnerNames={
              partnersQuery.data?.partners
                .filter(p => selectedPartners.includes(p.id))
                .map(p => p.name) || []
            }
          />

          {/* Controls */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleSelectAll}
                className="flex items-center space-x-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {selectedPartners.length === partnersQuery.data?.partners.length ? (
                  <CheckSquare className="h-4 w-4" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                <span className="text-sm">Select All</span>
              </button>
              <button
                onClick={() => setIsReorderMode(!isReorderMode)}
                className={`flex items-center space-x-2 px-3 py-2 border rounded-lg transition-colors ${
                  isReorderMode
                    ? 'border-secondary bg-secondary text-white'
                    : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <GripVertical className="h-4 w-4" />
                <span className="text-sm">{isReorderMode ? 'Exit Reorder' : 'Reorder'}</span>
              </button>
            </div>
          </div>

          {/* Partners Grid */}
          {partnersQuery.isLoading ? (
            <div className="text-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary border-t-transparent mx-auto mb-4"></div>
              <p className="text-text-muted dark:text-text-light/70">Loading partners...</p>
            </div>
          ) : partnersQuery.data?.partners.length === 0 ? (
            <div className="text-center py-12">
              <Handshake className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-text-muted dark:text-text-light/70 mb-4">No partners found</p>
              <Link
                to="/admin/partners/new"
                className="inline-flex items-center space-x-2 px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Add Your First Partner</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {partnersQuery.data?.partners.map((partner, index) => (
                <div
                  key={partner.id}
                  className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow ${
                    selectedPartners.includes(partner.id) ? 'ring-2 ring-secondary' : ''
                  }`}
                >
                  <div className="relative">
                    <div className="w-full h-32 bg-gray-50 dark:bg-gray-700 flex items-center justify-center p-4">
                      <img
                        src={getCacheBustedImageUrl(partner.logoUrl, partner.updatedAt)}
                        alt={partner.altText}
                        className="max-w-full max-h-full object-contain"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML = `<div class="flex items-center justify-center w-full h-full"><Building class="h-8 w-8 text-gray-400" /></div>`;
                          }
                        }}
                      />
                    </div>
                    
                    {/* Selection Checkbox */}
                    <div className="absolute top-2 left-2">
                      <button
                        onClick={() => handleToggleSelection(partner.id)}
                        className="p-1 bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        {selectedPartners.includes(partner.id) ? (
                          <CheckSquare className="h-4 w-4 text-secondary" />
                        ) : (
                          <Square className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                    
                    {/* Visibility Badge */}
                    <div className="absolute top-2 right-2">
                      <button
                        onClick={() => handleToggleVisibility(partner.id, partner.visible)}
                        disabled={toggleVisibilityMutation.isPending}
                        className="flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium transition-colors hover:opacity-80"
                        style={{
                          backgroundColor: partner.visible ? '#10b981' : '#6b7280',
                          color: 'white'
                        }}
                      >
                        {partner.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                        <span>{partner.visible ? "Visible" : "Hidden"}</span>
                      </button>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-semibold text-text-dark dark:text-text-light line-clamp-1">
                        {partner.name}
                      </h3>
                      {partner.websiteUrl && (
                        <a
                          href={partner.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-secondary hover:text-secondary/80 transition-colors"
                          title="Visit Website"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                    
                    <p className="text-sm text-text-muted dark:text-text-light/70 mb-4">
                      Alt Text: {partner.altText}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs text-text-muted dark:text-text-light/70 mb-4">
                      <span>Order: {partner.order}</span>
                      <span>Created: {new Date(partner.createdAt).toLocaleDateString()}</span>
                    </div>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                      {/* Reorder Controls */}
                      {isReorderMode && (
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleMoveUp(index)}
                            disabled={index === 0 || reorderMutation.isPending}
                            className="p-1 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Move Up"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleMoveDown(index)}
                            disabled={index === (partnersQuery.data?.partners.length || 0) - 1 || reorderMutation.isPending}
                            className="p-1 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Move Down"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                      
                      {/* Action Buttons */}
                      <div className="flex items-center space-x-2 ml-auto">
                        <Link
                          to="/admin/partners/$partnerId/edit"
                          params={{ partnerId: partner.id.toString() }}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Edit Partner"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(partner.id, partner.name)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Delete Partner"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
