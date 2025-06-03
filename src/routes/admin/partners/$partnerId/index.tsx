import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useUserStore } from "~/stores/userStore";
import { useTRPC } from "~/trpc/react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  ExternalLink,
  Calendar,
  Hash,
  Building,
  Loader2,
  Handshake,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/partners/$partnerId/")({
  component: PartnerDetailPage,
});

function PartnerDetailPage() {
  const { partnerId } = Route.useParams();
  const { adminToken } = useUserStore();
  const navigate = useNavigate();
  
  const trpc = useTRPC();
  
  const partnerQuery = useQuery(
    trpc.adminGetPartnerById.queryOptions({
      adminToken: adminToken || "",
      id: parseInt(partnerId),
    })
  );

  const deleteMutation = useMutation(
    trpc.adminDeletePartner.mutationOptions({
      onSuccess: () => {
        toast.success("Partner deleted successfully");
        navigate({ to: "/admin/partners" });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const toggleVisibilityMutation = useMutation(
    trpc.adminTogglePartnerVisibility.mutationOptions({
      onSuccess: () => {
        partnerQuery.refetch();
        toast.success("Partner visibility updated");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const handleDelete = () => {
    if (!partnerQuery.data) return;
    
    if (confirm(`Are you sure you want to delete "${partnerQuery.data.name}"?`)) {
      deleteMutation.mutate({
        adminToken: adminToken || "",
        id: parseInt(partnerId),
      });
    }
  };

  const handleToggleVisibility = () => {
    if (!partnerQuery.data) return;
    
    toggleVisibilityMutation.mutate({
      adminToken: adminToken || "",
      id: parseInt(partnerId),
      visible: !partnerQuery.data.visible,
    });
  };

  if (partnerQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-black">
        <div className="container-padding">
          <div className="flex items-center justify-center py-32">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-secondary mx-auto mb-4" />
              <p className="text-text-muted dark:text-text-light/70">Loading partner...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (partnerQuery.error || !partnerQuery.data) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-black">
        <div className="container-padding">
          <div className="flex items-center justify-center py-32">
            <div className="text-center">
              <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-text-muted dark:text-text-light/70 mb-4">Partner not found</p>
              <Link
                to="/admin/partners"
                className="inline-flex items-center space-x-2 px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Partners</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const partner = partnerQuery.data;

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-black">
      <div className="container-padding">
        {/* Header */}
        <div className="flex items-center justify-between py-8 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-4">
            <Link
              to="/admin/partners"
              className="flex items-center space-x-2 text-text-muted dark:text-text-light/70 hover:text-text-dark dark:hover:text-text-light transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Partners</span>
            </Link>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center space-x-3">
            <button
              onClick={handleToggleVisibility}
              disabled={toggleVisibilityMutation.isPending}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                partner.visible
                  ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 hover:bg-yellow-200 dark:hover:bg-yellow-900/40'
                  : 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-900/40'
              }`}
            >
              {partner.visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              <span>{partner.visible ? "Hide" : "Show"}</span>
            </button>
            
            <Link
              to="/admin/partners/$partnerId/edit"
              params={{ partnerId }}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Edit className="h-4 w-4" />
              <span>Edit</span>
            </Link>
            
            <button
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete</span>
            </button>
          </div>
        </div>

        <div className="py-8">
          {/* Partner Header */}
          <div className="flex items-start space-x-6 mb-8">
            <div className="h-16 w-16 flex items-center justify-center rounded-full bg-teal-100 dark:bg-teal-900/20">
              <Handshake className="h-8 w-8 text-teal-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-4 mb-2">
                <h1 className="text-3xl font-bold text-text-dark dark:text-text-light">
                  {partner.name}
                </h1>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  partner.visible
                    ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                    : 'bg-gray-100 dark:bg-gray-900/20 text-gray-800 dark:text-gray-200'
                }`}>
                  {partner.visible ? "Visible" : "Hidden"}
                </div>
              </div>
              <p className="text-text-muted dark:text-text-light/70">
                Partner organization details and management
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Partner Information */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-xl font-semibold text-text-dark dark:text-text-light mb-6">
                  Partner Information
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-text-muted dark:text-text-light/70 mb-2">
                      Partner Name
                    </label>
                    <p className="text-text-dark dark:text-text-light font-medium">
                      {partner.name}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-text-muted dark:text-text-light/70 mb-2">
                      Website
                    </label>
                    {partner.websiteUrl ? (
                      <a
                        href={partner.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-2 text-secondary hover:text-secondary/80 transition-colors"
                      >
                        <span>{partner.websiteUrl}</span>
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    ) : (
                      <p className="text-text-muted dark:text-text-light/70">No website provided</p>
                    )}
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-text-muted dark:text-text-light/70 mb-2">
                      Alt Text
                    </label>
                    <p className="text-text-dark dark:text-text-light">
                      {partner.altText}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-text-muted dark:text-text-light/70 mb-2">
                      Display Order
                    </label>
                    <div className="flex items-center space-x-2">
                      <Hash className="h-4 w-4 text-text-muted dark:text-text-light/70" />
                      <span className="text-text-dark dark:text-text-light font-medium">
                        {partner.order}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-text-muted dark:text-text-light/70 mb-2">
                      Visibility Status
                    </label>
                    <div className="flex items-center space-x-2">
                      {partner.visible ? (
                        <Eye className="h-4 w-4 text-green-600" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-gray-600" />
                      )}
                      <span className="text-text-dark dark:text-text-light font-medium">
                        {partner.visible ? "Visible to public" : "Hidden from public"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Metadata */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-xl font-semibold text-text-dark dark:text-text-light mb-6">
                  Metadata
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-text-muted dark:text-text-light/70 mb-2">
                      Created Date
                    </label>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-text-muted dark:text-text-light/70" />
                      <span className="text-text-dark dark:text-text-light">
                        {new Date(partner.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-text-muted dark:text-text-light/70 mb-2">
                      Last Updated
                    </label>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-text-muted dark:text-text-light/70" />
                      <span className="text-text-dark dark:text-text-light">
                        {new Date(partner.updatedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-text-muted dark:text-text-light/70 mb-2">
                      Partner ID
                    </label>
                    <div className="flex items-center space-x-2">
                      <Hash className="h-4 w-4 text-text-muted dark:text-text-light/70" />
                      <span className="text-text-dark dark:text-text-light font-mono">
                        {partner.id}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              {/* Logo Preview */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
                <h3 className="text-lg font-semibold text-text-dark dark:text-text-light mb-4">
                  Partner Logo
                </h3>
                <div className="w-full h-48 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-600">
                  <img
                    src={partner.logoUrl}
                    alt={partner.altText}
                    className="max-w-full max-h-full object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = '<div class="flex flex-col items-center text-red-500"><Building class="h-8 w-8 mb-2" /><span class="text-sm text-center">Failed to load logo</span></div>';
                      }
                    }}
                  />
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-text-muted dark:text-text-light/70 mb-1">
                    Logo URL
                  </label>
                  <a
                    href={partner.logoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-secondary hover:text-secondary/80 transition-colors break-all"
                  >
                    {partner.logoUrl}
                  </a>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-text-dark dark:text-text-light mb-4">
                  Quick Actions
                </h3>
                <div className="space-y-3">
                  <Link
                    to="/admin/partners/$partnerId/edit"
                    params={{ partnerId }}
                    className="flex items-center space-x-3 w-full px-4 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                    <span>Edit Partner</span>
                  </Link>
                  
                  <button
                    onClick={handleToggleVisibility}
                    disabled={toggleVisibilityMutation.isPending}
                    className={`flex items-center space-x-3 w-full px-4 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      partner.visible
                        ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-900/40'
                        : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/40'
                    }`}
                  >
                    {partner.visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    <span>{partner.visible ? "Hide Partner" : "Show Partner"}</span>
                  </button>
                  
                  <button
                    onClick={handleDelete}
                    disabled={deleteMutation.isPending}
                    className="flex items-center space-x-3 w-full px-4 py-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete Partner</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
