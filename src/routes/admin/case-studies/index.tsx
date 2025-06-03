import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useUserStore } from "~/stores/userStore";
import { useTRPC } from "~/trpc/react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DebouncedSearchInput } from "~/components/ui/DebouncedSearchInput";
import { Badge } from "~/components/ui/Badge";
import { toast } from "react-hot-toast";
import {
  BookOpen,
  Plus,
  Edit,
  Trash2,
  ArrowLeft,
  Star,
  ExternalLink,
  FileText,
  Video,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/case-studies/")({
  component: AdminCaseStudiesPage,
});

function AdminCaseStudiesPage() {
  const { adminToken } = useUserStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [featuredFilter, setFeaturedFilter] = useState<"all" | "featured" | "not-featured">("all");
  
  const trpc = useTRPC();
  
  const caseStudiesQuery = useQuery(
    trpc.adminGetCaseStudies.queryOptions({
      adminToken: adminToken || "",
      search: searchQuery || undefined,
      featured: featuredFilter === "all" ? undefined : featuredFilter === "featured",
      limit: 20,
    })
  );
  
  const deleteMutation = useMutation(
    trpc.adminDeleteCaseStudy.mutationOptions({
      onSuccess: () => {
        caseStudiesQuery.refetch();
        toast.success("Case study deleted successfully");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const handleDelete = (id: number, title: string) => {
    if (confirm(`Are you sure you want to delete "${title}"?`)) {
      deleteMutation.mutate({
        adminToken: adminToken || "",
        id,
      });
    }
  };

  const parseTags = (tagsString: string | null): string[] => {
    if (!tagsString) return [];
    try {
      return JSON.parse(tagsString);
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
          <Link
            to="/admin/case-studies/new"
            className="flex items-center space-x-2 px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>New Case Study</span>
          </Link>
        </div>

        <div className="py-8">
          <div className="flex items-center space-x-4 mb-6">
            <div className="h-12 w-12 flex items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
              <BookOpen className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-text-dark dark:text-text-light">
                Case Studies
              </h1>
              <p className="text-text-muted dark:text-text-light/70">
                Manage success stories and case studies
              </p>
            </div>
          </div>

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
                  placeholder="Search case studies..."
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
                  <option value="all">All Case Studies</option>
                  <option value="featured">Featured Only</option>
                  <option value="not-featured">Not Featured</option>
                </select>
              </div>
            </div>
          </div>

          {/* Case Studies Grid */}
          {caseStudiesQuery.isLoading ? (
            <div className="text-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary border-t-transparent mx-auto mb-4"></div>
              <p className="text-text-muted dark:text-text-light/70">Loading case studies...</p>
            </div>
          ) : caseStudiesQuery.data?.caseStudies.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-text-muted dark:text-text-light/70 mb-4">No case studies found</p>
              <Link
                to="/admin/case-studies/new"
                className="inline-flex items-center space-x-2 px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Create Your First Case Study</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {caseStudiesQuery.data?.caseStudies.map((caseStudy) => {
                const tags = parseTags(caseStudy.tags);
                
                return (
                  <div
                    key={caseStudy.id}
                    className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    <div className="relative">
                      <img
                        src={caseStudy.image}
                        alt={caseStudy.title}
                        className="w-full h-48 object-cover"
                      />
                      {caseStudy.featured && (
                        <div className="absolute top-3 left-3">
                          <Badge variant="warning" className="flex items-center space-x-1">
                            <Star className="h-3 w-3" />
                            <span>Featured</span>
                          </Badge>
                        </div>
                      )}
                      <div className="absolute top-3 right-3 flex space-x-2">
                        {caseStudy.video && (
                          <Badge variant="info" className="flex items-center space-x-1">
                            <Video className="h-3 w-3" />
                            <span>Video</span>
                          </Badge>
                        )}
                        {caseStudy.pdfUrl && (
                          <Badge variant="default" className="flex items-center space-x-1">
                            <FileText className="h-3 w-3" />
                            <span>PDF</span>
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-lg font-semibold text-text-dark dark:text-text-light line-clamp-2">
                          {caseStudy.title}
                        </h3>
                      </div>
                      
                      <p className="text-sm text-text-muted dark:text-text-light/70 mb-4 line-clamp-3">
                        {caseStudy.summary}
                      </p>
                      
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-4">
                          {tags.slice(0, 3).map((tag, index) => (
                            <Badge key={index} variant="default" size="sm">
                              {tag}
                            </Badge>
                          ))}
                          {tags.length > 3 && (
                            <Badge variant="default" size="sm">
                              +{tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                      
                      {caseStudy.impactMetrics && (
                        <div className="mb-4">
                          <p className="text-xs font-medium text-text-muted dark:text-text-light/70 mb-1">
                            Impact Metrics:
                          </p>
                          <p className="text-xs text-text-dark dark:text-text-light line-clamp-2">
                            {caseStudy.impactMetrics}
                          </p>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between text-xs text-text-muted dark:text-text-light/70 mb-4">
                        <span>Order: {caseStudy.order || 0}</span>
                        <span>Created: {new Date(caseStudy.createdAt).toLocaleDateString()}</span>
                      </div>
                      
                      <div className="flex items-center justify-end space-x-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <Link
                          to="/admin/case-studies/$caseStudyId/edit"
                          params={{ caseStudyId: caseStudy.id.toString() }}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Edit Case Study"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(caseStudy.id, caseStudy.title)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Delete Case Study"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
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
