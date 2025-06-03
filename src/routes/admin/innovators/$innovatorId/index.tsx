import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useUserStore } from "~/stores/userStore";
import { useTRPC } from "~/trpc/react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Star,
  Video,
  Users,
  Calendar,
  ExternalLink,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Badge } from "~/components/ui/Badge";

export const Route = createFileRoute("/admin/innovators/$innovatorId/")({
  component: InnovatorDetailPage,
});

function InnovatorDetailPage() {
  const { innovatorId } = Route.useParams();
  const { adminToken } = useUserStore();
  const navigate = useNavigate();
  
  const trpc = useTRPC();
  
  const innovatorQuery = useQuery(
    trpc.adminGetInnovatorById.queryOptions({
      adminToken: adminToken || "",
      id: parseInt(innovatorId),
    })
  );
  
  const deleteMutation = useMutation(
    trpc.adminDeleteInnovator.mutationOptions({
      onSuccess: () => {
        toast.success("Innovator deleted successfully");
        navigate({ to: "/admin/innovators" });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const toggleFeaturedMutation = useMutation(
    trpc.adminUpdateInnovator.mutationOptions({
      onSuccess: () => {
        innovatorQuery.refetch();
        toast.success("Featured status updated");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const handleDelete = () => {
    if (!innovatorQuery.data) return;
    
    const confirmMessage = `Are you sure you want to delete "${innovatorQuery.data.name}"? This action cannot be undone.`;
    if (confirm(confirmMessage)) {
      deleteMutation.mutate({
        adminToken: adminToken || "",
        id: parseInt(innovatorId),
      });
    }
  };

  const handleToggleFeatured = () => {
    if (!innovatorQuery.data) return;
    
    toggleFeaturedMutation.mutate({
      adminToken: adminToken || "",
      id: parseInt(innovatorId),
      data: { featured: !innovatorQuery.data.featured },
    });
  };

  const parseAchievements = (achievementsString: string | null): string[] => {
    if (!achievementsString) return [];
    try {
      return JSON.parse(achievementsString);
    } catch {
      return [];
    }
  };

  if (innovatorQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-secondary" />
          <p className="text-text-muted dark:text-text-light/70">Loading innovator...</p>
        </div>
      </div>
    );
  }

  if (innovatorQuery.error) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error loading innovator: {innovatorQuery.error.message}</p>
          <Link
            to="/admin/innovators"
            className="text-secondary hover:underline"
          >
            Back to Innovators
          </Link>
        </div>
      </div>
    );
  }

  const innovator = innovatorQuery.data!;
  const achievements = parseAchievements(innovator.achievements);

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-black">
      <div className="container-padding">
        {/* Header */}
        <div className="flex items-center justify-between py-8 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-4">
            <Link
              to="/admin/innovators"
              className="flex items-center space-x-2 text-text-muted dark:text-text-light/70 hover:text-text-dark dark:hover:text-text-light transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Innovators</span>
            </Link>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleToggleFeatured}
              disabled={toggleFeaturedMutation.isPending}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                innovator.featured
                  ? 'bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200'
                  : 'bg-white dark:bg-gray-800 text-text-dark dark:text-text-light border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              } disabled:opacity-50`}
            >
              {innovator.featured ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              <span>{innovator.featured ? 'Unfeature' : 'Feature'}</span>
            </button>
            <Link
              to="/admin/innovators/$innovatorId/edit"
              params={{ innovatorId: innovatorId }}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Edit className="h-4 w-4" />
              <span>Edit</span>
            </Link>
            <button
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              <span>{deleteMutation.isPending ? 'Deleting...' : 'Delete'}</span>
            </button>
          </div>
        </div>

        <div className="py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Basic Info */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8">
                <div className="flex items-start space-x-6">
                  <img
                    src={innovator.avatar}
                    alt={innovator.name}
                    className="w-32 h-32 object-cover rounded-lg border-4 border-white shadow-lg"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-4 mb-4">
                      <h1 className="text-3xl font-bold text-text-dark dark:text-text-light">
                        {innovator.name}
                      </h1>
                      <div className="flex space-x-2">
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
                    </div>
                    <p className="text-lg text-text-muted dark:text-text-light/70 mb-4">
                      {innovator.role}
                    </p>
                    <p className="text-text-dark dark:text-text-light mb-6">
                      {innovator.impact}
                    </p>
                    {innovator.hasVideo && innovator.videoUrl && (
                      <a
                        href={innovator.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-2 text-secondary hover:underline"
                      >
                        <Video className="h-4 w-4" />
                        <span>Watch Video</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Bio */}
              {innovator.bio && innovator.bio !== innovator.impact && (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8">
                  <h2 className="text-xl font-semibold text-text-dark dark:text-text-light mb-4">
                    Biography
                  </h2>
                  <p className="text-text-dark dark:text-text-light leading-relaxed whitespace-pre-wrap">
                    {innovator.bio}
                  </p>
                </div>
              )}

              {/* Achievements */}
              {achievements.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8">
                  <h2 className="text-xl font-semibold text-text-dark dark:text-text-light mb-6">
                    Key Achievements
                  </h2>
                  <ul className="space-y-3">
                    {achievements.map((achievement, index) => (
                      <li key={index} className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-secondary rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-text-dark dark:text-text-light">{achievement}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              {/* Quick Stats */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-text-dark dark:text-text-light mb-4">
                  Quick Stats
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted dark:text-text-light/70">Status</span>
                    <Badge variant={innovator.featured ? "warning" : "default"}>
                      {innovator.featured ? "Featured" : "Regular"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted dark:text-text-light/70">Order</span>
                    <span className="text-text-dark dark:text-text-light font-medium">
                      {innovator.order}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted dark:text-text-light/70">Has Video</span>
                    <Badge variant={innovator.hasVideo ? "success" : "default"}>
                      {innovator.hasVideo ? "Yes" : "No"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted dark:text-text-light/70">Achievements</span>
                    <span className="text-text-dark dark:text-text-light font-medium">
                      {achievements.length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Metadata */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-text-dark dark:text-text-light mb-4">
                  Metadata
                </h3>
                <div className="space-y-4">
                  <div>
                    <span className="text-text-muted dark:text-text-light/70 text-sm">Created</span>
                    <div className="flex items-center space-x-2 mt-1">
                      <Calendar className="h-4 w-4 text-text-muted dark:text-text-light/70" />
                      <span className="text-text-dark dark:text-text-light">
                        {new Date(innovator.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-text-muted dark:text-text-light/70 text-sm">Last Updated</span>
                    <div className="flex items-center space-x-2 mt-1">
                      <Calendar className="h-4 w-4 text-text-muted dark:text-text-light/70" />
                      <span className="text-text-dark dark:text-text-light">
                        {new Date(innovator.updatedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-text-muted dark:text-text-light/70 text-sm">ID</span>
                    <p className="text-text-dark dark:text-text-light font-mono text-sm mt-1">
                      {innovator.id}
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-text-dark dark:text-text-light mb-4">
                  Quick Actions
                </h3>
                <div className="space-y-3">
                  <Link
                    to="/innovators"
                    className="flex items-center space-x-2 w-full px-3 py-2 text-left text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>View on Public Site</span>
                  </Link>
                  <Link
                    to="/admin/innovators/$innovatorId/edit"
                    params={{ innovatorId: innovatorId }}
                    className="flex items-center space-x-2 w-full px-3 py-2 text-left text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                    <span>Edit Details</span>
                  </Link>
                  <button
                    onClick={handleToggleFeatured}
                    disabled={toggleFeaturedMutation.isPending}
                    className="flex items-center space-x-2 w-full px-3 py-2 text-left text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {innovator.featured ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    <span>{innovator.featured ? 'Remove from Featured' : 'Add to Featured'}</span>
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleteMutation.isPending}
                    className="flex items-center space-x-2 w-full px-3 py-2 text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>{deleteMutation.isPending ? 'Deleting...' : 'Delete Innovator'}</span>
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
