import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useUserStore } from "~/stores/userStore";
import { useTRPC } from "~/trpc/react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { challengeSchema, type ChallengeFormData, CHALLENGE_CATEGORIES, CHALLENGE_REGIONS, CHALLENGE_STATUSES } from "~/constants/validation";
import {
  ArrowLeft,
  Save,
  Trophy,
  Calendar,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { ImageUpload } from "~/components/ui/ImageUpload";
import { getImageUrl } from "~/utils";

export const Route = createFileRoute("/admin/challenges/new/")({
  component: NewChallengePage,
});

function NewChallengePage() {
  const { adminToken } = useUserStore();
  const navigate = useNavigate();
  
  const trpc = useTRPC();
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<ChallengeFormData>({
    resolver: zodResolver(challengeSchema),
    defaultValues: {
      featured: false,
      category: CHALLENGE_CATEGORIES[0],
      region: CHALLENGE_REGIONS[0],
      status: CHALLENGE_STATUSES[0],
    },
  });

  const createMutation = useMutation(
    trpc.adminCreateChallenge.mutationOptions({
      onSuccess: () => {
        toast.success("Challenge created successfully");
        navigate({ to: "/admin/challenges" });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const onSubmit = (data: ChallengeFormData) => {
    createMutation.mutate({
      adminToken: adminToken || "",
      data,
    });
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-black">
      <div className="container-padding">
        {/* Header */}
        <div className="flex items-center justify-between py-8 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-4">
            <Link
              to="/admin/challenges"
              className="flex items-center space-x-2 text-text-muted dark:text-text-light/70 hover:text-text-dark dark:hover:text-text-light transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Challenges</span>
            </Link>
          </div>
        </div>

        <div className="py-8">
          <div className="flex items-center space-x-4 mb-8">
            <div className="h-12 w-12 flex items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/20">
              <Trophy className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-text-dark dark:text-text-light">
                Create Challenge
              </h1>
              <p className="text-text-muted dark:text-text-light/70">
                Add a new innovation challenge
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl">
            {/* Form */}
            <div className="lg:col-span-2">
              <form onSubmit={handleSubmit(onSubmit)}>
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Title */}
                    <div className="lg:col-span-2">
                      <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                        Title *
                      </label>
                      <input
                        type="text"
                        {...register("title")}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
                        placeholder="Enter challenge title"
                      />
                      {errors.title && (
                        <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
                      )}
                    </div>

                    {/* Tagline */}
                    <div className="lg:col-span-2">
                      <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                        Tagline *
                      </label>
                      <input
                        type="text"
                        {...register("tagline")}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
                        placeholder="Brief tagline for the challenge"
                      />
                      {errors.tagline && (
                        <p className="mt-1 text-sm text-red-600">{errors.tagline.message}</p>
                      )}
                    </div>

                    {/* Category */}
                    <div>
                      <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                        Category *
                      </label>
                      <select
                        {...register("category")}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
                      >
                        {CHALLENGE_CATEGORIES.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                      {errors.category && (
                        <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>
                      )}
                    </div>

                    {/* Region */}
                    <div>
                      <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                        Region *
                      </label>
                      <select
                        {...register("region")}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
                      >
                        {CHALLENGE_REGIONS.map((region) => (
                          <option key={region} value={region}>
                            {region}
                          </option>
                        ))}
                      </select>
                      {errors.region && (
                        <p className="mt-1 text-sm text-red-600">{errors.region.message}</p>
                      )}
                    </div>

                    {/* Status */}
                    <div>
                      <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                        Status *
                      </label>
                      <select
                        {...register("status")}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
                      >
                        {CHALLENGE_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                      {errors.status && (
                        <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>
                      )}
                    </div>

                    {/* Prize */}
                    <div>
                      <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                        Prize *
                      </label>
                      <input
                        type="text"
                        {...register("prize")}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
                        placeholder="e.g., $50,000 USD"
                      />
                      {errors.prize && (
                        <p className="mt-1 text-sm text-red-600">{errors.prize.message}</p>
                      )}
                    </div>

                    {/* Image Upload */}
                    <div className="lg:col-span-2">
                      <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                        Image *
                      </label>
                      <ImageUpload
                        value={watch("image")}
                        onChange={(filePath) => {
                          if (filePath) {
                            setValue("image", filePath);
                          } else {
                            setValue("image", "");
                          }
                        }}
                        placeholder="Upload challenge image"
                        previewClassName="h-48"
                      />
                      {errors.image && (
                        <p className="mt-1 text-sm text-red-600">{errors.image.message}</p>
                      )}
                    </div>

                    {/* Open Date */}
                    <div>
                      <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                        Open Date
                      </label>
                      <input
                        type="date"
                        {...register("openDate")}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
                      />
                      {errors.openDate && (
                        <p className="mt-1 text-sm text-red-600">{errors.openDate.message}</p>
                      )}
                    </div>

                    {/* Close Date */}
                    <div>
                      <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                        Close Date
                      </label>
                      <input
                        type="date"
                        {...register("closeDate")}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
                      />
                      {errors.closeDate && (
                        <p className="mt-1 text-sm text-red-600">{errors.closeDate.message}</p>
                      )}
                    </div>

                    {/* Pilot Start Date */}
                    <div className="lg:col-span-2">
                      <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                        Pilot Start Date
                      </label>
                      <input
                        type="date"
                        {...register("pilotStartDate")}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
                      />
                      {errors.pilotStartDate && (
                        <p className="mt-1 text-sm text-red-600">{errors.pilotStartDate.message}</p>
                      )}
                    </div>

                    {/* Partners */}
                    <div className="lg:col-span-2">
                      <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                        Partners
                      </label>
                      <textarea
                        {...register("partners")}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
                        placeholder="List of challenge partners"
                      />
                      {errors.partners && (
                        <p className="mt-1 text-sm text-red-600">{errors.partners.message}</p>
                      )}
                    </div>

                    {/* Eligibility */}
                    <div className="lg:col-span-2">
                      <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                        Eligibility
                      </label>
                      <textarea
                        {...register("eligibility")}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
                        placeholder="Eligibility criteria and requirements"
                      />
                      {errors.eligibility && (
                        <p className="mt-1 text-sm text-red-600">{errors.eligibility.message}</p>
                      )}
                    </div>

                    {/* Featured */}
                    <div className="lg:col-span-2">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          {...register("featured")}
                          className="rounded border-gray-300 text-secondary focus:ring-secondary"
                        />
                        <span className="text-sm font-medium text-text-dark dark:text-text-light">
                          Featured Challenge
                        </span>
                      </label>
                    </div>

                    {/* Description */}
                    <div className="lg:col-span-2">
                      <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                        Description *
                      </label>
                      <textarea
                        {...register("description")}
                        rows={8}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
                        placeholder="Full challenge description (supports Markdown)"
                      />
                      {errors.description && (
                        <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-700 mt-8">
                    <button
                      type="submit"
                      disabled={isSubmitting || createMutation.isPending}
                      className="flex items-center space-x-2 px-6 py-3 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="h-4 w-4" />
                      <span>
                        {isSubmitting || createMutation.isPending ? "Creating..." : "Create Challenge"}
                      </span>
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Preview */}
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 sticky top-8">
                <h3 className="text-lg font-semibold text-text-dark dark:text-text-light mb-4">
                  Image Preview
                </h3>
                <div className="w-full h-48 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-600">
                  {watch("image") ? (
                    <img
                      src={getImageUrl(watch("image"))}
                      alt="Challenge image preview"
                      className="max-w-full max-h-full object-cover rounded-lg"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = '<div class="text-red-500 text-sm text-center">Invalid image</div>';
                        }
                      }}
                    />
                  ) : (
                    <div className="text-center text-gray-500 dark:text-gray-400">
                      <Trophy className="h-8 w-8 mx-auto mb-2" />
                      <p className="text-sm">Image preview will appear here</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
