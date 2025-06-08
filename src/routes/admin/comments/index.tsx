import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useUserStore } from "~/stores/userStore";
import { useTRPC } from "~/trpc/react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DebouncedSearchInput } from "~/components/ui/DebouncedSearchInput";
import { Badge } from "~/components/ui/Badge";
import { toast } from "react-hot-toast";
import { z } from "zod";
import {
  MessageSquare,
  Trash2,
  ArrowLeft,
  User,
  Calendar,
  Heart,
  ExternalLink,
  Filter,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

const commentsSearchSchema = z.object({
  problemId: z.number().int().positive().optional(),
});

export const Route = createFileRoute("/admin/comments/")({
  component: AdminCommentsPage,
  validateSearch: commentsSearchSchema,
});

function AdminCommentsPage() {
  const { adminToken } = useUserStore();
  const [searchQuery, setSearchQuery] = useState("");
  const search = Route.useSearch();
  const { problemId } = search;
  
  const trpc = useTRPC();
  
  const commentsQuery = useQuery(
    trpc.adminGetComments.queryOptions({
      adminToken: adminToken || "",
      search: searchQuery || undefined,
      problemId: problemId,
      limit: 50,
    })
  );
  
  const deleteMutation = useMutation(
    trpc.adminDeleteComment.mutationOptions({
      onSuccess: () => {
        commentsQuery.refetch();
        toast.success("Comment deleted successfully");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const handleDelete = (id: number, author: string) => {
    if (confirm(`Are you sure you want to delete the comment by "${author}"?`)) {
      deleteMutation.mutate({
        adminToken: adminToken || "",
        id,
      });
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
        </div>

        <div className="py-8">
          <div className="flex items-center space-x-4 mb-6">
            <div className="h-12 w-12 flex items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/20">
              <MessageSquare className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-text-dark dark:text-text-light">
                Comments Management
              </h1>
              <p className="text-text-muted dark:text-text-light/70">
                Moderate and manage user comments
              </p>
            </div>
          </div>

          {/* Filter Indicator */}
          {problemId && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Filter className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    Showing comments for a specific problem
                  </span>
                </div>
                <Link
                  to="/admin/problems/$problemId"
                  params={{ problemId: problemId.toString() }}
                  className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                >
                  View Problem Details →
                </Link>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                  Search Comments
                </label>
                <DebouncedSearchInput
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search by content or author..."
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Comments List */}
          {commentsQuery.isLoading ? (
            <div className="text-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary border-t-transparent mx-auto mb-4"></div>
              <p className="text-text-muted dark:text-text-light/70">Loading comments...</p>
            </div>
          ) : commentsQuery.data?.comments.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-text-muted dark:text-text-light/70">No comments found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {commentsQuery.data?.comments.map((comment) => (
                <div
                  key={comment.id}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 bg-secondary/10 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-secondary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-text-dark dark:text-text-light">
                          {comment.author}
                        </h3>
                        <div className="flex items-center space-x-2 text-sm text-text-muted dark:text-text-light/70">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(comment.createdAt).toLocaleDateString()}</span>
                          {comment.likes > 0 && (
                            <>
                              <span>•</span>
                              <div className="flex items-center space-x-1">
                                <Heart className="h-3 w-3" />
                                <span>{comment.likes}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(comment.id, comment.author)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Delete Comment"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-text-dark dark:text-text-light leading-relaxed">
                      {comment.content}
                    </p>
                  </div>
                  
                  {comment.problem && (
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center space-x-2 text-sm text-text-muted dark:text-text-light/70">
                        <span>On problem:</span>
                        <Link
                          to="/admin/problems/$problemId"
                          params={{ problemId: comment.problem.id.toString() }}
                          className="text-secondary hover:text-secondary/80 transition-colors font-medium"
                        >
                          {comment.problem.title}
                        </Link>
                      </div>
                      <Link
                        to="/admin/problems/$problemId"
                        params={{ problemId: comment.problem.id.toString() }}
                        className="text-secondary hover:text-secondary/80 transition-colors"
                        title="View Problem"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
