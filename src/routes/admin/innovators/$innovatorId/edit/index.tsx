import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useUserStore } from "~/stores/userStore";
import { useTRPC } from "~/trpc/react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import * as z from "zod";
import {
  ArrowLeft,
  Save,
  Users,
  Plus,
  X,
  Loader2,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useEffect } from "react";

const innovatorFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  title: z.string().min(1, "Title is required").max(150, "Title must be less than 150 characters"),
  bio: z.string().min(1, "Bio is required"),
  image: z.string().min(1, "Image URL is required").url("Please enter a valid image URL"),
  achievements: z.array(z.object({
    value: z.string().min(1, "Achievement cannot be empty")
  })).min(1, "At least one achievement is required"),
  linkedinUrl: z.string().url("Please enter a valid LinkedIn URL").optional().or(z.literal("")),
  twitterUrl: z.string().url("Please enter a valid Twitter URL").optional().or(z.literal("")),
  websiteUrl: z.string().url("Please enter a valid website URL").optional().or(z.literal("")),
  featured: z.boolean().default(false),
  hasVideo: z.boolean().default(false),
  videoUrl: z.string().url("Please enter a valid video URL").optional().or(z.literal("")),
});

type InnovatorFormData = z.infer<typeof innovatorFormSchema>;

export const Route = createFileRoute("/admin/innovators/$innovatorId/edit/")({
  component: EditInnovatorPage,
});

function EditInnovatorPage() {
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
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    control,
    watch,
    reset,
  } = useForm<InnovatorFormData>({
    resolver: zodResolver(innovatorFormSchema),
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

  // Pre-populate form when data is loaded
  useEffect(() => {
    if (innovatorQuery.data) {
      const innovator = innovatorQuery.data;
      
      // Parse achievements from JSON string
      let achievements = [{ value: "" }];
      try {
        const parsedAchievements = JSON.parse(innovator.achievements || "[]");
        if (Array.isArray(parsedAchievements) && parsedAchievements.length > 0) {
          achievements = parsedAchievements.map((achievement: string) => ({ value: achievement }));
        }
      } catch (error) {
        console.error("Error parsing achievements:", error);
      }
      
      reset({
        name: innovator.name,
        title: innovator.role, // Map role back to title for the form
        bio: innovator.bio || innovator.impact, // Use bio if available, fallback to impact
        image: innovator.avatar, // Map avatar back to image for the form
        achievements,
        linkedinUrl: "",
        twitterUrl: "",
        websiteUrl: "",
        featured: innovator.featured,
        hasVideo: innovator.hasVideo,
        videoUrl: innovator.videoUrl || "",
      });
    }
  }, [innovatorQuery.data, reset]);

  const updateMutation = useMutation(
    trpc.adminUpdateInnovator.mutationOptions({
      onSuccess: () => {
        toast.success("Innovator updated successfully");
        navigate({ to: "/admin/innovators" });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const onSubmit = (data: InnovatorFormData) => {
    const achievements = data.achievements.map(a => a.value).filter(Boolean);
    
    updateMutation.mutate({
      adminToken: adminToken || "",
      id: parseInt(innovatorId),
      data: {
        name: data.name,
        title: data.title,
        bio: data.bio,
        image: data.image,
        achievements,
        linkedinUrl: data.linkedinUrl || undefined,
        twitterUrl: data.twitterUrl || undefined,
        websiteUrl: data.websiteUrl || undefined,
        featured: data.featured,
        hasVideo: data.hasVideo,
        videoUrl: data.hasVideo && data.videoUrl ? data.videoUrl : undefined,
      },
    });
  };

  const imageUrl = watch("image");
  const hasVideo = watch("hasVideo");

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
                Edit Innovator
              </h1>
              <p className="text-text-muted dark:text-text-light/70">
                Update innovator details and achievements
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl">
            {/* Form */}
            <div className="lg:col-span-2">
              <form onSubmit={handleSubmit(onSubmit)}>
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

                    {/* Image URL */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                        Image URL *
                      </label>
                      <input
                        type="url"
                        {...register("image")}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
                        placeholder="https://example.com/profile.jpg"
                      />
                      {errors.image && (
                        <p className="mt-1 text-sm text-red-600">{errors.image.message}</p>
                      )}
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
                                onClick={() => remove(index)}
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
                          onClick={() => append({ value: "" })}
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
                      disabled={isSubmitting || updateMutation.isPending}
                      className="flex items-center space-x-2 px-6 py-3 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="h-4 w-4" />
                      <span>
                        {isSubmitting || updateMutation.isPending ? "Updating..." : "Update Innovator"}
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
                <div className="w-full h-48 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-600">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt="Innovator profile preview"
                      className="max-w-full max-h-full object-cover rounded-lg"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = '<div class="text-red-500 text-sm text-center">Invalid image URL</div>';
                        }
                      }}
                    />
                  ) : (
                    <div className="text-center text-gray-500 dark:text-gray-400">
                      <Users className="h-8 w-8 mx-auto mb-2" />
                      <p className="text-sm">Profile image preview will appear here</p>
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
