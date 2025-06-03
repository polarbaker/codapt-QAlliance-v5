import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useUserStore } from "~/stores/userStore";
import { useTRPC } from "~/trpc/react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DebouncedSearchInput } from "~/components/ui/DebouncedSearchInput";
import { Badge } from "~/components/ui/Badge";
import { toast } from "react-hot-toast";
import {
  FileText,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Check,
  X,
  Trash2,
  ArrowLeft,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/problems/")({
  component: AdminProblemsPage,
});

function AdminProblemsPage() {
  const { adminToken } = useUserStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  
  const trpc = useTRPC();
  
  // Create query options first
  const problemsQueryOptions = trpc.adminGetProblemSubmissions.queryOptions({
    adminToken: adminToken || "",
    search: searchQuery || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
    category: categoryFilter === "all" ? undefined : categoryFilter,
    limit: 20,
  });
  
  const problemsQuery = useQuery(problemsQueryOptions);
  
  const statsQueryOptions = trpc.adminGetProblemStats.queryOptions({
    adminToken: adminToken || "",
  });
  
  const statsQuery = useQuery(statsQueryOptions);
  
  // Create mutation options
  const updateStatusMutationOptions = trpc.adminUpdateProblemStatus.mutationOptions({
    onSuccess: () => {
      problemsQuery.refetch();
      statsQuery.refetch();
      toast.success("Status updated successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const updateStatusMutation = useMutation(updateStatusMutationOptions);
  
  const deleteMutationOptions = trpc.adminDeleteProblemSubmission.mutationOptions({
    onSuccess: () => {
      problemsQuery.refetch();
      statsQuery.refetch();
      toast.success("Problem submission deleted");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const deleteMutation = useMutation(deleteMutationOptions);

  const handleStatusUpdate = (id: number, status: "pending" | "approved" | "rejected") => {
    updateStatusMutation.mutate({
      adminToken: adminToken || "",
      id,
      status,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this problem submission?")) {
      deleteMutation.mutate({
        adminToken: adminToken || "",
        id,
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="warning">Pending</Badge>;
      case "approved":
        return <Badge variant="success">Approved</Badge>;
      case "rejected":
        return <Badge variant="error">Rejected</Badge>;
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
        </div>

        <div className="py-8">
          <div className="flex items-center space-x-4 mb-6">
            <div className="h-12 w-12 flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-text-dark dark:text-text-light">
                Problem Submissions
              </h1>
              <p className="text-text-muted dark:text-text-light/70">
                Manage and review problem submissions from organizations
              </p>
            </div>
          </div>

          {/* Statistics */}
          {statsQuery.data && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-text-dark dark:text-text-light mb-2">
                  Total Submissions
                </h3>
                <p className="text-3xl font-bold text-blue-600">{statsQuery.data.total}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-text-dark dark:text-text-light mb-2">
                  Pending Review
                </h3>
                <p className="text-3xl font-bold text-yellow-600">{statsQuery.data.pending}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-text-dark dark:text-text-light mb-2">
                  Approved
                </h3>
                <p className="text-3xl font-bold text-green-600">{statsQuery.data.approved}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-text-dark dark:text-text-light mb-2">
                  Rejected
                </h3>
                <p className="text-3xl font-bold text-red-600">{statsQuery.data.rejected}</p>
              </div>
            </div>
          )}

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
                  placeholder="Search by title, organization, or contact..."
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
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
                  <option value="Climate">Climate</option>
                  <option value="Digital">Digital</option>
                  <option value="Health">Health</option>
                  <option value="Education">Education</option>
                  <option value="Energy">Energy</option>
                  <option value="Agriculture">Agriculture</option>
                </select>
              </div>
            </div>
          </div>

          {/* Problem Submissions List */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            {problemsQuery.isLoading ? (
              <div className="p-8 text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary border-t-transparent mx-auto mb-4"></div>
                <p className="text-text-muted dark:text-text-light/70">Loading problem submissions...</p>
              </div>
            ) : problemsQuery.data?.submissions.length === 0 ? (
              <div className="p-8 text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-text-muted dark:text-text-light/70">No problem submissions found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Title & Organization
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Submitted
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Comments
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {problemsQuery.data?.submissions.map((submission) => (
                      <tr key={submission.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-text-dark dark:text-text-light">
                              {submission.title}
                            </div>
                            <div className="text-sm text-text-muted dark:text-text-light/70">
                              {submission.organization}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="default">{submission.category}</Badge>
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(submission.status)}
                        </td>
                        <td className="px-6 py-4 text-sm text-text-muted dark:text-text-light/70">
                          {new Date(submission.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-text-muted dark:text-text-light/70">
                          {submission._count.comments}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            {submission.status === "pending" && (
                              <>
                                <button
                                  onClick={() => handleStatusUpdate(submission.id, "approved")}
                                  className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                                  title="Approve"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleStatusUpdate(submission.id, "rejected")}
                                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                  title="Reject"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => handleDelete(submission.id)}
                              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
