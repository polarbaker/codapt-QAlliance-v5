import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useUserStore } from "~/stores/userStore";
import { useTRPC } from "~/trpc/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { useCallback } from "react";
import {
  ArrowLeft,
  Save,
  Users,
  Plus,
  X,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { innovatorCreateFormSchema, type InnovatorCreateFormSchemaData } from "~/constants/validation";

type InnovatorFormData = InnovatorCreateFormSchemaData;

export const Route = createFileRoute("/admin/innovators/new/")({
  component: NewInnovatorPage,
});

function NewInnovatorPage() {
  const { adminToken } = useUserStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const trpc = useTRPC();
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    control,
    watch,
  } = useForm<InnovatorFormData>({
    resolver: zodResolver(innovatorCreateFormSchema),
    defaultValues: {
      featured: false,
      hasVideo: false,
      achievements: [{ value: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "achievements",
  });

  const createMutation = useMutation(
    trpc.adminCreateInnovator.mutationOptions({
      onSuccess: async () => {
        // Invalidate all relevant queries to ensure immediate updates
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['adminGetInnovators'] }),
          queryClient.invalidateQueries({ queryKey: ['getInnovators'] }),
          queryClient.invalidateQueries({ queryKey: ['getFeaturedInnovators'] }),
        ]);
        
        toast.success("Innovator created successfully");
        navigate({ to: "/admin/innovators" });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  // Memoized form submission handler to prevent re-creation on every render
  const handleFormSubmit = useCallback((data: InnovatorFormData) => {
    const achievements = data.achievements.map(a => a.value).filter(Boolean);
    
    createMutation.mutate({
      adminToken: adminToken || "",
      data: {
        name: data.name,
        title: data.title,
        bio: data.bio,
        // Don't include image since it's not supported for new innovators
        achievements,
        linkedinUrl: data.linkedinUrl || undefined,
        twitterUrl: data.twitterUrl || undefined,
        websiteUrl: data.websiteUrl || undefined,
        featured: data.featured,
        hasVideo: data.hasVideo,
        videoUrl: data.hasVideo && data.videoUrl ? data.videoUrl : undefined,
      },
    });
  }, [adminToken, createMutation]);

  // Memoized achievement handlers
  const handleAddAchievement = useCallback(() => {
    append({ value: "" });
  }, [append]);

  const handleRemoveAchievement = useCallback((index: number) => {
    remove(index);
  }, [remove]);

  const hasVideo = watch("hasVideo");

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
        </div>

        <div className="py-8">
          <div className="flex items-center space-x-4 mb-8">
            <div className="h-12 w-12 flex items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/20">
              <Users className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-text-dark dark:text-text-light">
                Add Innovator
              </h1>
              <p className="text-text-muted dark:text-text-light/70">
                Add a new innovator to the Hall of Innovators
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl">
            {/* Form */}
            <div className="lg:col-span-2">
              <form onSubmit={handleSubmit(handleFormSubmit)}>
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Name */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                        Name *
                      </label>
                      <input
                        type="text"
                        {...register("name")}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
                        placeholder="Enter innovator name"
                      />
                      {errors.name && (
                        <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                      )}
                    </div>

                    {/* Title */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                        Title *
                      </label>
                      <input
                        type="text"
                        {...register("title")}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
                        placeholder="e.g., CEO & Founder at TechCorp"
                      />
                      {errors.title && (
                        <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
                      )}
                    </div>

                    {/* Profile Image Note */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                        Profile Image
                      </label>
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex items-start space-x-3">
                          <Users className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                              Add Image After Creation
                            </p>
                            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                              You can upload a profile image after creating the innovator by clicking "Edit" from the innovators list.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Social Links */}
                    <div>
                      <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                        LinkedIn URL
                      </label>
                      <input
                        type="url"
                        {...register("linkedinUrl")}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
                        placeholder="https://linkedin.com/in/username"
                      />
                      {errors.linkedinUrl && (
                        <p className="mt-1 text-sm text-red-600">{errors.linkedinUrl.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                        Twitter URL
                      </label>
                      <input
                        type="url"
                        {...register("twitterUrl")}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
                        placeholder="https://twitter.com/username"
                      />
                      {errors.twitterUrl && (
                        <p className="mt-1 text-sm text-red-600">{errors.twitterUrl.message}</p>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                        Website URL
                      </label>
                      <input
                        type="url"
                        {...register("websiteUrl")}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
                        placeholder="https://website.com"
                      />
                      {errors.websiteUrl && (
                        <p className="mt-1 text-sm text-red-600">{errors.websiteUrl.message}</p>
                      )}
                    </div>

                    {/* Featured */}
                    <div className="md:col-span-2">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          {...register("featured")}
                          className="rounded border-gray-300 text-secondary focus:ring-secondary"
                        />
                        <span className="text-sm font-medium text-text-dark dark:text-text-light">
                          Featured Innovator
                        </span>
                      </label>
                    </div>

                    {/* Has Video */}
                    <div className="md:col-span-2">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          {...register("hasVideo")}
                          className="rounded border-gray-300 text-secondary focus:ring-secondary"
                        />
                        <span className="text-sm font-medium text-text-dark dark:text-text-light">
                          Has Video
                        </span>
                      </label>
                    </div>

                    {/* Video URL - only show if hasVideo is checked */}
                    {hasVideo && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                          Video URL
                        </label>
                        <input
                          type="url"
                          {...register("videoUrl")}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
                          placeholder="https://youtube.com/watch?v=..."
                        />
                        {errors.videoUrl && (
                          <p className="mt-1 text-sm text-red-600">{errors.videoUrl.message}</p>
                        )}
                      </div>
                    )}

                    {/* Achievements */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                        Achievements *
                      </label>
                      <div className="space-y-2">
                        {fields.map((field, index) => (
                          <div key={field.id} className="flex space-x-2">
                            <input
                              type="text"
                              {...register(`achievements.${index}.value` as const)}
                              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
                              placeholder="Enter an achievement"
                            />
                            {fields.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveAchievement(index)}
                                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                        {errors.achievements && (
                          <p className="mt-1 text-sm text-red-600">
                            {errors.achievements.message || errors.achievements.root?.message}
                          </p>
                        )}
                        <button
                          type="button"
                          onClick={handleAddAchievement}
                          className="flex items-center space-x-2 px-3 py-2 text-secondary hover:bg-secondary/10 rounded-lg transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                          <span>Add Achievement</span>
                        </button>
                      </div>
                    </div>

                    {/* Bio */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                        Bio *
                      </label>
                      <textarea
                        {...register("bio")}
                        rows={6}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
                        placeholder="Detailed biography of the innovator"
                      />
                      {errors.bio && (
                        <p className="mt-1 text-sm text-red-600">{errors.bio.message}</p>
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
                        {isSubmitting || createMutation.isPending ? "Creating..." : "Create Innovator"}
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
                  Profile Preview
                </h3>
                
                <div className="h-48 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-600">
                  <div className="text-center">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Profile image can be added after creation
                    </p>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    <strong>Next step:</strong> After creating the innovator, click "Edit" to upload a profile image.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
