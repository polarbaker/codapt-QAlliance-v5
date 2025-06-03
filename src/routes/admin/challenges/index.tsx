import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useUserStore } from "~/stores/userStore";
import { useTRPC } from "~/trpc/react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DebouncedSearchInput } from "~/components/ui/DebouncedSearchInput";
import { Badge } from "~/components/ui/Badge";
import { toast } from "react-hot-toast";
import {
  Trophy,
  Plus,
  Edit,
  Trash2,
  ArrowLeft,
  Star,
  Calendar,
  DollarSign,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { CHALLENGE_CATEGORIES, CHALLENGE_STATUSES } from "~/constants/validation";

export const Route = createFileRoute("/admin/challenges/")({
  component: AdminChallengesPage,
});

function AdminChallengesPage() {
  const { adminToken } = useUserStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  const trpc = useTRPC();
  
  // Create query options first
  const challengesQueryOptions = trpc.adminGetChallenges.queryOptions({
    adminToken: adminToken || "",
    search: searchQuery || undefined,
    category: categoryFilter === "all" ? undefined : categoryFilter,
    status: statusFilter === "all" ? undefined : statusFilter,
    limit: 20,
  });
  
  const challengesQuery = useQuery(challengesQueryOptions);
  
  // Create mutation options
  const deleteMutationOptions = trpc.adminDeleteChallenge.mutationOptions({
    onSuccess: () => {
      challengesQuery.refetch();
      toast.success("Challenge deleted successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const deleteMutation = useMutation(deleteMutationOptions);

  const handleDelete = (id: number, title: string) => {
    if (confirm(`Are you sure you want to delete "${title}"?`)) {
      deleteMutation.mutate({
        adminToken: adminToken || "",
        id,
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Active":
        return <Badge variant="success">Active</Badge>;
      case "Submissions Open":
        return <Badge variant="info">Submissions Open</Badge>;
      case "Coming Soon":
        return <Badge variant="warning">Coming Soon</Badge>;
      case "Closed":
        return <Badge variant="default">Closed</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
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
          <Link
            to="/admin/challenges/new"
            className="flex items-center space-x-2 px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>New Challenge</span>
          </Link>
        </div>

        <div className="py-8">
          <div className="flex items-center space-x-4 mb-6">
            <div className="h-12 w-12 flex items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/20">
              <Trophy className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-text-dark dark:text-text-light">
                Innovation Challenges
              </h1>
              <p className="text-text-muted dark:text-text-light/70">
                Create and manage innovation challenges for the community
              </p>
            </div>
          </div>

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
                  placeholder="Search challenges..."
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                  Category
                </label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
                >
                  <option value="all">All Categories</option>
                  {CHALLENGE_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
                >
                  <option value="all">All Status</option>
                  {CHALLENGE_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Challenges Grid */}
          {challengesQuery.isLoading ? (
            <div className="text-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary border-t-transparent mx-auto mb-4"></div>
              <p className="text-text-muted dark:text-text-light/70">Loading challenges...</p>
            </div>
          ) : challengesQuery.data?.challenges.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-text-muted dark:text-text-light/70 mb-4">No challenges found</p>
              <Link
                to="/admin/challenges/new"
                className="inline-flex items-center space-x-2 px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Create Your First Challenge</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {challengesQuery.data?.challenges.map((challenge) => (
                <div
                  key={challenge.id}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <div className="relative">
                    <img
                      src={challenge.image}
                      alt={challenge.title}
                      className="w-full h-48 object-cover"
                    />
                    {challenge.featured && (
                      <div className="absolute top-3 left-3">
                        <Badge variant="warning" className="flex items-center space-x-1">
                          <Star className="h-3 w-3" />
                          <span>Featured</span>
                        </Badge>
                      </div>
                    )}
                    <div className="absolute top-3 right-3">
                      {getStatusBadge(challenge.status)}
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-semibold text-text-dark dark:text-text-light line-clamp-2">
                        {challenge.title}
                      </h3>
                    </div>
                    
                    <p className="text-sm text-text-muted dark:text-text-light/70 mb-4 line-clamp-2">
                      {challenge.tagline}
                    </p>
                    
                    <div className="flex items-center justify-between text-sm text-text-muted dark:text-text-light/70 mb-4">
                      <div className="flex items-center space-x-1">
                        <Badge variant="default" size="sm">{challenge.category}</Badge>
                      </div>
                      <div className="flex items-center space-x-1">
                        <DollarSign className="h-4 w-4" />
                        <span>{challenge.prize}</span>
                      </div>
                    </div>
                    
                    {challenge.closeDate && (
                      <div className="flex items-center space-x-1 text-sm text-text-muted dark:text-text-light/70 mb-4">
                        <Calendar className="h-4 w-4" />
                        <span>Closes: {new Date(challenge.closeDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-end space-x-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <Link
                        to="/admin/challenges/$challengeId/edit"
                        params={{ challengeId: challenge.id.toString() }}
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="Edit Challenge"
                      >
                        <Edit className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(challenge.id, challenge.title)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Delete Challenge"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
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
