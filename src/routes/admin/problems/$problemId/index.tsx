import { createFileRoute } from "@tanstack/react-router";
import { useUserStore } from "~/stores/userStore";
import { useTRPC } from "~/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "~/components/ui/Badge";
import {
  FileText,
  ArrowLeft,
  Edit,
  MessageSquare,
  Calendar,
  User,
  Building,
  Mail,
  Phone,
  Target,
  Clock,
  DollarSign,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/problems/$problemId/")({
  component: AdminProblemDetailPage,
});

function AdminProblemDetailPage() {
  const { problemId } = Route.useParams();
  const { adminToken } = useUserStore();
  
  const trpc = useTRPC();
  
  const problemQuery = useQuery(
    trpc.adminGetProblemSubmissionById.queryOptions({
      adminToken: adminToken || "",
      id: parseInt(problemId),
    })
  );

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

  if (problemQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-black">
        <div className="container-padding">
          <div className="text-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary border-t-transparent mx-auto mb-4"></div>
            <p className="text-text-muted dark:text-text-light/70">Loading problem details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (problemQuery.error || !problemQuery.data) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-black">
        <div className="container-padding">
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-text-muted dark:text-text-light/70">Problem submission not found</p>
            <Link
              to="/admin/problems"
              className="inline-flex items-center space-x-2 mt-4 px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Problems</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const problem = problemQuery.data;

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-black">
      <div className="container-padding">
        {/* Header */}
        <div className="flex items-center justify-between py-8 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-4">
            <Link
              to="/admin/problems"
              className="flex items-center space-x-2 text-text-muted dark:text-text-light/70 hover:text-text-dark dark:hover:text-text-light transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Problems</span>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <Link
              to="/admin/comments"
              search={{ problemId: problem.id }}
              className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              <MessageSquare className="h-4 w-4" />
              <span>View Comments ({problem._count.comments})</span>
            </Link>
            <Link
              to="/admin/problems/$problemId/edit"
              params={{ problemId: problemId }}
              className="flex items-center space-x-2 px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors"
            >
              <Edit className="h-4 w-4" />
              <span>Edit Problem</span>
            </Link>
          </div>
        </div>

        <div className="py-8">
          <div className="flex items-center space-x-4 mb-6">
            <div className="h-12 w-12 flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-text-dark dark:text-text-light mb-2">
                {problem.title}
              </h1>
              <div className="flex items-center space-x-4">
                <Badge variant="default">{problem.category}</Badge>
                {getStatusBadge(problem.status)}
                <div className="flex items-center space-x-1 text-sm text-text-muted dark:text-text-light/70">
                  <Calendar className="h-4 w-4" />
                  <span>Submitted: {new Date(problem.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Problem Description */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-text-dark dark:text-text-light mb-4">
                  Problem Description
                </h2>
                <p className="text-text-dark dark:text-text-light leading-relaxed whitespace-pre-wrap">
                  {problem.description}
                </p>
              </div>

              {/* Technical Requirements */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-text-dark dark:text-text-light mb-4 flex items-center space-x-2">
                  <Target className="h-5 w-5" />
                  <span>Technical Requirements</span>
                </h2>
                <p className="text-text-dark dark:text-text-light leading-relaxed whitespace-pre-wrap">
                  {problem.technicalRequirements}
                </p>
              </div>

              {/* Constraints */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-text-dark dark:text-text-light mb-4 flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5" />
                  <span>Constraints</span>
                </h2>
                <p className="text-text-dark dark:text-text-light leading-relaxed whitespace-pre-wrap">
                  {problem.constraints}
                </p>
              </div>

              {/* Success Criteria */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-text-dark dark:text-text-light mb-4 flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5" />
                  <span>Success Criteria</span>
                </h2>
                <p className="text-text-dark dark:text-text-light leading-relaxed whitespace-pre-wrap">
                  {problem.successCriteria}
                </p>
              </div>

              {/* Recent Comments */}
              {problem.comments.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-text-dark dark:text-text-light flex items-center space-x-2">
                      <MessageSquare className="h-5 w-5" />
                      <span>Recent Comments</span>
                    </h2>
                    <Link
                      to="/admin/comments"
                      search={{ problemId: problem.id }}
                      className="text-secondary hover:text-secondary/80 transition-colors text-sm"
                    >
                      View all {problem._count.comments} comments →
                    </Link>
                  </div>
                  <div className="space-y-4">
                    {problem.comments.slice(0, 3).map((comment) => (
                      <div key={comment.id} className="border-l-4 border-secondary/20 pl-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-text-dark dark:text-text-light">
                            {comment.author}
                          </span>
                          <span className="text-sm text-text-muted dark:text-text-light/70">
                            {new Date(comment.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-text-dark dark:text-text-light text-sm leading-relaxed">
                          {comment.content}
                        </p>
                        {comment.likes > 0 && (
                          <div className="text-xs text-text-muted dark:text-text-light/70 mt-1">
                            {comment.likes} likes
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Contact Information */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-text-dark dark:text-text-light mb-4">
                  Contact Information
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <User className="h-4 w-4 text-text-muted dark:text-text-light/70" />
                    <span className="text-text-dark dark:text-text-light">{problem.name}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Building className="h-4 w-4 text-text-muted dark:text-text-light/70" />
                    <span className="text-text-dark dark:text-text-light">{problem.organization}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Mail className="h-4 w-4 text-text-muted dark:text-text-light/70" />
                    <a
                      href={`mailto:${problem.email}`}
                      className="text-secondary hover:text-secondary/80 transition-colors"
                    >
                      {problem.email}
                    </a>
                  </div>
                  {problem.phone && (
                    <div className="flex items-center space-x-3">
                      <Phone className="h-4 w-4 text-text-muted dark:text-text-light/70" />
                      <a
                        href={`tel:${problem.phone}`}
                        className="text-secondary hover:text-secondary/80 transition-colors"
                      >
                        {problem.phone}
                      </a>
                    </div>
                  )}
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-text-muted dark:text-text-light/70">
                        {problem.consentToContact ? "Consented to contact" : "No consent to contact"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Project Details */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-text-dark dark:text-text-light mb-4">
                  Project Details
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <Clock className="h-4 w-4 text-text-muted dark:text-text-light/70" />
                      <span className="text-sm font-medium text-text-dark dark:text-text-light">Timeline</span>
                    </div>
                    <p className="text-sm text-text-muted dark:text-text-light/70 pl-6">
                      {problem.timeline}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <DollarSign className="h-4 w-4 text-text-muted dark:text-text-light/70" />
                      <span className="text-sm font-medium text-text-dark dark:text-text-light">Budget</span>
                    </div>
                    <p className="text-sm text-text-muted dark:text-text-light/70 pl-6">
                      {problem.budget}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
