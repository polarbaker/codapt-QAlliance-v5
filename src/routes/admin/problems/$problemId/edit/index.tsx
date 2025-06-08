import React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useUserStore } from "~/stores/userStore";
import { useTRPC } from "~/trpc/react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import {
  FileText,
  ArrowLeft,
  Save,
  AlertCircle,
} from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { CHALLENGE_CATEGORIES } from "~/constants/validation";

const problemEditSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  description: z.string().min(1, "Description is required"),
  category: z.string().min(1, "Category is required"),
  technicalRequirements: z.string().min(1, "Technical requirements are required"),
  constraints: z.string().min(1, "Constraints are required"),
  successCriteria: z.string().min(1, "Success criteria are required"),
  timeline: z.string().min(1, "Timeline is required"),
  budget: z.string().min(1, "Budget is required"),
  name: z.string().min(1, "Name is required"),
  organization: z.string().min(1, "Organization is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  consentToContact: z.boolean(),
  status: z.enum(['pending', 'approved', 'rejected']),
});

type ProblemEditFormData = z.infer<typeof problemEditSchema>;

export const Route = createFileRoute("/admin/problems/$problemId/edit/")({
  component: AdminProblemEditPage,
});

function AdminProblemEditPage() {
  const { problemId } = Route.useParams();
  const { adminToken } = useUserStore();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const trpc = useTRPC();
  
  const problemQuery = useQuery(
    trpc.adminGetProblemSubmissionById.queryOptions({
      adminToken: adminToken || "",
      id: parseInt(problemId),
    })
  );

  const updateMutation = useMutation(
    trpc.adminUpdateProblemSubmission.mutationOptions({
      onSuccess: () => {
        toast.success("Problem submission updated successfully");
        navigate({ to: "/admin/problems/$problemId", params: { problemId } });
      },
      onError: (error) => {
        toast.error(error.message);
        setIsSubmitting(false);
      },
    })
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProblemEditFormData>({
    resolver: zodResolver(problemEditSchema),
  });

  // Reset form when data loads
  React.useEffect(() => {
    if (problemQuery.data) {
      const problem = problemQuery.data;
      reset({
        title: problem.title,
        description: problem.description,
        category: problem.category,
        technicalRequirements: problem.technicalRequirements,
        constraints: problem.constraints,
        successCriteria: problem.successCriteria,
        timeline: problem.timeline,
        budget: problem.budget,
        name: problem.name,
        organization: problem.organization,
        email: problem.email,
        phone: problem.phone || "",
        consentToContact: problem.consentToContact,
        status: problem.status as 'pending' | 'approved' | 'rejected',
      });
    }
  }, [problemQuery.data, reset]);

  const onSubmit = async (data: ProblemEditFormData) => {
    setIsSubmitting(true);
    updateMutation.mutate({
      adminToken: adminToken || "",
      id: parseInt(problemId),
      data,
    });
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

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-black">
      <div className="container-padding">
        {/* Header */}
        <div className="flex items-center justify-between py-8 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-4">
            <Link
              to="/admin/problems/$problemId"
              params={{ problemId }}
              className="flex items-center space-x-2 text-text-muted dark:text-text-light/70 hover:text-text-dark dark:hover:text-text-light transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Problem</span>
            </Link>
          </div>
          <button
            type="submit"
            form="problem-edit-form"
            disabled={isSubmitting}
            className="flex items-center space-x-2 px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4" />
            <span>{isSubmitting ? "Saving..." : "Save Changes"}</span>
          </button>
        </div>

        <div className="py-8">
          <div className="flex items-center space-x-4 mb-6">
            <div className="h-12 w-12 flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-text-dark dark:text-text-light">
                Edit Problem Submission
              </h1>
              <p className="text-text-muted dark:text-text-light/70">
                Update the details of this problem submission
              </p>
            </div>
          </div>

          <form id="problem-edit-form" onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Basic Information */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-text-dark dark:text-text-light mb-6">
                Basic Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                    Problem Title *
                  </label>
                  <input
                    type="text"
                    {...register("title")}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
                  />
                  {errors.title && (
                    <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                    Category *
                  </label>
                  <select
                    {...register("category")}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
                  >
                    <option value="">Select Category</option>
                    {CHALLENGE_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                  {errors.category && (
                    <p className="text-red-500 text-sm mt-1">{errors.category.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                    Status *
                  </label>
                  <select
                    {...register("status")}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  {errors.status && (
                    <p className="text-red-500 text-sm mt-1">{errors.status.message}</p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                    Problem Description *
                  </label>
                  <textarea
                    {...register("description")}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
                  />
                  {errors.description && (
                    <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Technical Details */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-text-dark dark:text-text-light mb-6">
                Technical Details
              </h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                    Technical Requirements *
                  </label>
                  <textarea
                    {...register("technicalRequirements")}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
                  />
                  {errors.technicalRequirements && (
                    <p className="text-red-500 text-sm mt-1">{errors.technicalRequirements.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                    Constraints *
                  </label>
                  <textarea
                    {...register("constraints")}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
                  />
                  {errors.constraints && (
                    <p className="text-red-500 text-sm mt-1">{errors.constraints.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                    Success Criteria *
                  </label>
                  <textarea
                    {...register("successCriteria")}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
                  />
                  {errors.successCriteria && (
                    <p className="text-red-500 text-sm mt-1">{errors.successCriteria.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Project Details */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-text-dark dark:text-text-light mb-6">
                Project Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                    Timeline *
                  </label>
                  <input
                    type="text"
                    {...register("timeline")}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
                  />
                  {errors.timeline && (
                    <p className="text-red-500 text-sm mt-1">{errors.timeline.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                    Budget *
                  </label>
                  <input
                    type="text"
                    {...register("budget")}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
                  />
                  {errors.budget && (
                    <p className="text-red-500 text-sm mt-1">{errors.budget.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-text-dark dark:text-text-light mb-6">
                Contact Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                    Contact Name *
                  </label>
                  <input
                    type="text"
                    {...register("name")}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
                  />
                  {errors.name && (
                    <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                    Organization *
                  </label>
                  <input
                    type="text"
                    {...register("organization")}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
                  />
                  {errors.organization && (
                    <p className="text-red-500 text-sm mt-1">{errors.organization.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    {...register("email")}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
                  />
                  {errors.email && (
                    <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    {...register("phone")}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
                  />
                  {errors.phone && (
                    <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      {...register("consentToContact")}
                      className="rounded border-gray-300 text-secondary focus:ring-secondary"
                    />
                    <span className="text-sm text-text-dark dark:text-text-light">
                      Consent to contact for follow-up
                    </span>
                  </label>
                  {errors.consentToContact && (
                    <p className="text-red-500 text-sm mt-1">{errors.consentToContact.message}</p>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
