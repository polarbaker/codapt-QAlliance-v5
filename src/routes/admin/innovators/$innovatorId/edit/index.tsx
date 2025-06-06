import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useUserStore } from "~/stores/userStore";
import { useTRPC } from "~/trpc/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import * as z from "zod";
import {
  ArrowLeft,
  Save,
  Users,
  Plus,
  X,
  Loader2,
  AlertCircle,
  XCircle,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { SimpleInnovatorImageUpload } from "~/components/ui/SimpleInnovatorImageUpload";
import { ImagePreview } from "~/components/ui/ImagePreview";
import { getCacheBustedImageUrl } from "~/utils";
import { innovatorFormSchema, type InnovatorFormSchemaData } from "~/constants/validation";
import ErrorBoundary from "~/components/ErrorBoundary";

type InnovatorFormData = InnovatorFormSchemaData;

export const Route = createFileRoute("/admin/innovators/$innovatorId/edit/")({
  component: EditInnovatorPage,
});

function EditInnovatorPage() {
  const { innovatorId } = Route.useParams();
  const { adminToken } = useUserStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const trpc = useTRPC();
  
  // Simple state management
  const [previewKey, setPreviewKey] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Early validation - check if innovatorId is valid
  const parsedInnovatorId = parseInt(innovatorId || '');
  if (!innovatorId || isNaN(parsedInnovatorId)) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-black flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="mb-4">
            <Users className="h-12 w-12 text-gray-400 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-text-dark dark:text-text-light mb-2">
            Invalid Innovator ID
          </h3>
          <p className="text-red-600 mb-4">
            The innovator ID "{innovatorId}" is not valid.
          </p>
          <Link
            to="/admin/innovators"
            className="block px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors"
          >
            Back to Innovators
          </Link>
        </div>
      </div>
    );
  }

  // Early validation - check if admin token exists
  if (!adminToken) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-black flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="mb-4">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-text-dark dark:text-text-light mb-2">
            Authentication Required
          </h3>
          <p className="text-red-600 mb-4">
            You must be logged in as an admin to edit innovators.
          </p>
          <Link
            to="/admin"
            className="block px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors"
          >
            Go to Admin Login
          </Link>
        </div>
      </div>
    );
  }

  // Query to get innovator data
  const innovatorQuery = trpc.adminGetInnovatorById.useQuery({
    adminToken: adminToken,
    id: parsedInnovatorId,
  }, {
    enabled: !!adminToken && !isNaN(parsedInnovatorId),
    retry: (failureCount, error) => {
      const errorMessage = error?.message || '';
      if (errorMessage.includes('404') || errorMessage.includes('Unauthorized')) {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const innovatorData = innovatorQuery.data;
  const isLoading = innovatorQuery.isLoading;
  const queryError = innovatorQuery.error;

  // Form setup
  const {
    register,
    handleSubmit,
    formState,
    control,
    watch,
    reset,
    setValue,
  } = useForm<InnovatorFormData>({
    resolver: zodResolver(innovatorFormSchema),
    defaultValues: {
      name: "",
      title: "",
      bio: "",
      image: "",
      achievements: [{ value: "" }],
      linkedinUrl: "",
      twitterUrl: "",
      websiteUrl: "",
      featured: false,
      hasVideo: false,
      videoUrl: "",
    },
    mode: 'onChange',
  });

  const { errors } = formState;
  const { fields, append, remove } = useFieldArray({
    control,
    name: "achievements",
  });

  const imageUrl = watch("image") || "";
  const hasVideo = watch("hasVideo") ?? false;

  // Pre-populate form when data is loaded
  useEffect(() => {
    if (!innovatorData || isLoading) {
      return;
    }
    
    try {
      // Parse achievements
      let achievements = [{ value: "" }];
      try {
        if (innovatorData.achievements && typeof innovatorData.achievements === 'string') {
          const parsedAchievements = JSON.parse(innovatorData.achievements);
          if (Array.isArray(parsedAchievements) && parsedAchievements.length > 0) {
            achievements = parsedAchievements.map((achievement: any) => ({ 
              value: typeof achievement === 'string' ? achievement : String(achievement || "") 
            }));
          }
        }
      } catch (parseError) {
        console.warn("Error parsing achievements, using default:", parseError);
        achievements = [{ value: "" }];
      }

      const formData = {
        name: innovatorData.name || "",
        title: innovatorData.role || "",
        bio: innovatorData.bio || innovatorData.impact || "",
        image: innovatorData.avatar || "",
        achievements,
        linkedinUrl: "",
        twitterUrl: "",
        websiteUrl: "",
        featured: innovatorData.featured ?? false,
        hasVideo: innovatorData.hasVideo ?? false,
        videoUrl: innovatorData.videoUrl || "",
      };

      reset(formData);
      setPreviewKey(prev => prev + 1);
    } catch (error) {
      console.error('Error during form pre-population:', error);
      toast.error('Error loading innovator data');
    }
  }, [innovatorData, reset, isLoading]);

  // Image change handler
  const handleImageChange = useCallback((filePath: string | null) => {
    if (filePath) {
      setValue("image", filePath, { 
        shouldValidate: true, 
        shouldDirty: true,
        shouldTouch: true
      });
      setPreviewKey(prev => prev + 1);
    } else {
      setValue("image", "", { 
        shouldValidate: true, 
        shouldDirty: true,
        shouldTouch: true
      });
      setPreviewKey(prev => prev + 1);
    }
  }, [setValue]);

  // Update mutation
  const updateMutation = trpc.adminUpdateInnovator.useMutation({
    onSuccess: async () => {
      try {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['adminGetInnovators'] }),
          queryClient.invalidateQueries({ queryKey: ['adminGetInnovatorById'] }),
          queryClient.invalidateQueries({ queryKey: ['getInnovators'] }),
          queryClient.invalidateQueries({ queryKey: ['getFeaturedInnovators'] }),
        ]);
        
        toast.success("Innovator updated successfully");
        navigate({ to: "/admin/innovators" });
      } catch (error) {
        console.error('Error in update success handler:', error);
      }
    },
    onError: (error) => {
      const errorMessage = error?.message || 'Update failed';
      console.error('Update mutation error:', errorMessage);
      toast.error(errorMessage);
    },
  });

  // Form submission handler
  const handleFormSubmit = useCallback(async (data: InnovatorFormData) => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      // Validate required fields
      if (!data.image || data.image.trim() === '') {
        toast.error('❌ Image is required. Please upload an image before saving.');
        return;
      }

      // Process achievements
      const achievements = (data.achievements || [])
        .map(a => a?.value || "")
        .filter(value => typeof value === 'string' && value.trim() !== '');

      if (achievements.length === 0) {
        toast.error('❌ At least one achievement is required.');
        return;
      }

      // Create update data
      const updateData = {
        name: data.name || "",
        title: data.title || "",
        bio: data.bio || "",
        image: data.image.trim(),
        achievements,
        linkedinUrl: data.linkedinUrl || undefined,
        twitterUrl: data.twitterUrl || undefined,
        websiteUrl: data.websiteUrl || undefined,
        featured: data.featured ?? false,
        hasVideo: data.hasVideo ?? false,
        videoUrl: (data.hasVideo && data.videoUrl) ? data.videoUrl : undefined,
      };

      await updateMutation.mutateAsync({
        adminToken: adminToken,
        id: parsedInnovatorId,
        data: updateData,
      });

    } catch (error) {
      console.error('Form submission failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('Network')) {
        toast.error('❌ Network error. Please check your connection and try again.');
      } else if (errorMessage.includes('Unauthorized') || errorMessage.includes('403')) {
        toast.error('❌ Authentication error. Please log in again.');
      } else if (errorMessage.includes('413')) {
        toast.error('❌ Image file too large. Please use a smaller image.');
      } else {
        toast.error(`❌ Update failed: ${errorMessage}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [adminToken, parsedInnovatorId, updateMutation, isSubmitting]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-black flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-secondary" />
          <p className="text-text-muted dark:text-text-light/70 mb-2">Loading innovator...</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            If this takes too long, please refresh the page
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  // Error state
  if (queryError) {
    const errorMessage = queryError?.message || 'Unknown error';
    const isNotFound = errorMessage.includes('404') || errorMessage.includes('not found');
    const isUnauthorized = errorMessage.includes('Unauthorized') || errorMessage.includes('403');
    
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-black flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="mb-4">
            {isNotFound ? (
              <Users className="h-12 w-12 text-gray-400 mx-auto" />
            ) : isUnauthorized ? (
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
            ) : (
              <XCircle className="h-12 w-12 text-red-500 mx-auto" />
            )}
          </div>
          
          <h3 className="text-lg font-medium text-text-dark dark:text-text-light mb-2">
            {isNotFound ? 'Innovator Not Found' : 
             isUnauthorized ? 'Access Denied' : 
             'Error Loading Innovator'}
          </h3>
          
          <p className="text-red-600 mb-4">
            {isNotFound ? 'The requested innovator could not be found.' :
             isUnauthorized ? 'You do not have permission to edit this innovator.' :
             `Error: ${errorMessage}`}
          </p>
          
          <div className="space-y-2">
            <Link
              to="/admin/innovators"
              className="block px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors"
            >
              Back to Innovators
            </Link>
            
            {!isNotFound && !isUnauthorized && (
              <button
                onClick={() => innovatorQuery.refetch()}
                className="block w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Try Again
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Final safety check
  if (!innovatorData) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-black flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-text-dark dark:text-text-light mb-2">
            No Data Available
          </h3>
          <p className="text-yellow-600 mb-4">
            Innovator data is not available. Please try refreshing the page.
          </p>
          <div className="space-y-2">
            <button
              onClick={() => innovatorQuery.refetch()}
              className="block w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
            >
              Refresh Data
            </button>
            <Link
              to="/admin/innovators"
              className="block px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Back to Innovators
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
                      {errors?.name && (
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
                      {errors?.title && (
                        <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
                      )}
                    </div>

                    {/* Image Upload */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                        Avatar Upload *
                      </label>
                      
                      <ErrorBoundary
                        fallback={
                          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                            <p>Image upload system crashed. Please reload the page.</p>
                            <button
                              onClick={() => window.location.reload()}
                              className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                            >
                              Reload Page
                            </button>
                          </div>
                        }
                      >
                        <SimpleInnovatorImageUpload
                          innovatorId={parsedInnovatorId}
                          innovatorName={innovatorData.name || "Innovator"}
                          value={imageUrl}
                          onChange={handleImageChange}
                          onUploadComplete={(result) => {
                            console.log('Upload completed:', result);
                            toast.success('✅ Image uploaded successfully');
                          }}
                          onUploadError={(error) => {
                            console.error('Upload error:', error);
                            toast.error(`❌ Upload failed: ${error.message || 'Unknown error'}`);
                          }}
                          enableAutoRetry={true}
                          maxRetries={3}
                          componentId={`simple-upload-${parsedInnovatorId}`}
                        />
                      </ErrorBoundary>
                      
                      {errors?.image && (
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
                      {errors?.linkedinUrl && (
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
                      {errors?.twitterUrl && (
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
                      {errors?.websiteUrl && (
                        <p className="mt-1 text-sm text-red-600">{errors.websiteUrl.message}</p>
                      )}
                    </div>

                    {/* Featured checkbox */}
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

                    {/* Has Video checkbox */}
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
                        {errors?.videoUrl && (
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
                        {errors?.achievements && (
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
                      {errors?.bio && (
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
                
                <ImagePreview
                  imagePath={imageUrl || ""}
                  alt="Innovator profile preview"
                  className="h-48"
                  placeholderIcon={Users}
                  placeholderText="Profile image preview will appear here"
                  showFileName={true}
                  key={previewKey}
                  updatedAt={innovatorData?.updatedAt}
                  onImageLoad={() => {
                    console.log('Preview image loaded successfully');
                  }}
                  onImageError={(error) => {
                    console.error('Preview image failed to load:', error);
                    toast.error('Preview image failed to load', { duration: 3000 });
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
