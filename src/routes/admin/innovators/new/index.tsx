import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useUserStore } from "~/stores/userStore";
import { useTRPC } from "~/trpc/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { useEffect, useState, useCallback } from "react";
import * as z from "zod";
import {
  ArrowLeft,
  Save,
  Users,
  Plus,
  X,
  ExternalLink,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { BulletproofImageUpload } from "~/components/ui/BulletproofImageUpload";
import { ImagePreview } from "~/components/ui/ImagePreview";

const innovatorFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  title: z.string().min(1, "Title is required").max(150, "Title must be less than 150 characters"),
  bio: z.string().min(1, "Bio is required"),
  image: z.string().min(1, "Image is required"),
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

export const Route = createFileRoute("/admin/innovators/new/")({
  component: NewInnovatorPage,
});

function NewInnovatorPage() {
  const { adminToken } = useUserStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const trpc = useTRPC();
  
  const [previewKey, setPreviewKey] = useState(0); // Force preview re-render
  const [lastImageUpdate, setLastImageUpdate] = useState<Date | null>(null);
  const [debugMode] = useState(true); // Enable debugging
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    control,
    watch,
    setValue,
    trigger,
    formState,
  } = useForm<InnovatorFormData>({
    resolver: zodResolver(innovatorFormSchema),
    defaultValues: {
      featured: false,
      hasVideo: false,
      achievements: [{ value: "" }],
      image: "", // Initialize with explicit empty string
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "achievements",
  });

  // Enhanced logging with timestamps - memoized to prevent re-creation
  const logWithTimestamp = useCallback((message: string, data?: any) => {
    if (debugMode) {
      console.log(`🔍 DEBUG: NewInnovatorForm [${new Date().toISOString()}] - ${message}`, data || '');
    }
  }, [debugMode]);

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
  }, [adminToken, createMutation]);

  // Memoized achievement handlers
  const handleAddAchievement = useCallback(() => {
    append({ value: "" });
  }, [append]);

  const handleRemoveAchievement = useCallback((index: number) => {
    remove(index);
  }, [remove]);

  const imageUrl = watch("image");
  const hasVideo = watch("hasVideo");

  // Memoized onChange handler to prevent re-creation on every render
  const handleImageChange = useCallback((filePath: string | string[] | null) => {
    logWithTimestamp('BulletproofImageUpload onChange called with:', {
      filePath: filePath,
      filePathType: typeof filePath,
      filePathLength: typeof filePath === 'string' ? filePath?.length : (Array.isArray(filePath) ? filePath.length : 0),
      isString: typeof filePath === 'string',
      isNonEmptyString: typeof filePath === 'string' && filePath.trim() !== '',
      trimmedValue: typeof filePath === 'string' ? filePath.trim() : filePath,
      currentFormImageValue: watch("image"),
      previewKey: previewKey,
    });
    
    // Ensure filePath is a string before setting
    const pathValue = typeof filePath === 'string' ? filePath : null;
    
    if (pathValue && pathValue.trim() !== '') {
      logWithTimestamp('About to call setValue with valid pathValue:', {
        valueToSet: pathValue,
        shouldValidate: true, 
        shouldDirty: true,
        shouldTouch: true,
      });
      
      setValue("image", pathValue, { 
        shouldValidate: true, 
        shouldDirty: true,
        shouldTouch: true
      });
      
      // Force preview update
      setPreviewKey(prev => prev + 1);
      setLastImageUpdate(new Date());
      
      logWithTimestamp('setValue called, checking immediate state:', {
        setValueWith: pathValue,
        newFormImageValue: watch("image"),
        formErrors: errors,
        imageFieldError: errors.image,
        isDirty: formState.isDirty,
        dirtyFields: formState.dirtyFields,
        newPreviewKey: previewKey + 1,
      });
      
      // Manual trigger call after setValue
      const timeoutId = setTimeout(async () => {
        logWithTimestamp('Manual trigger call for image validation');
        const isValid = await trigger("image");
        logWithTimestamp('Manual trigger result:', {
          isValid: isValid,
          currentImageValue: watch("image"),
          imageFieldError: errors.image,
          formIsValid: formState.isValid,
        });
      }, 100);
      
    } else if (filePath === null) {
      // Handle clearing the image
      setValue("image", "", { 
        shouldValidate: true, 
        shouldDirty: true,
        shouldTouch: true
      });
      setPreviewKey(prev => prev + 1);
    }
  }, [setValue, trigger, watch, errors, formState, previewKey, logWithTimestamp]);

  // Custom event listener for crosscutting image updates - Fixed dependency array
  useEffect(() => {
    const handleImageUpdated = (event: CustomEvent) => {
      const { filePath: eventFilePath, timestamp, component } = event.detail || {};
      
      logWithTimestamp('Received imageUpdated event:', {
        eventFilePath: eventFilePath,
        currentImageUrl: imageUrl,
        eventTimestamp: timestamp,
        eventComponent: component,
        shouldUpdate: eventFilePath && (eventFilePath === imageUrl || component === 'BulletproofImageUpload'),
      });
      
      // Check if this event is for our current image or if it's a new upload
      if (eventFilePath && (eventFilePath === imageUrl || component === 'BulletproofImageUpload')) {
        logWithTimestamp('Event matches current context - forcing form and preview update');
        
        // Update form state if the path is different
        if (eventFilePath !== imageUrl && eventFilePath.trim() !== '') {
          logWithTimestamp('Updating form state from event');
          setValue("image", eventFilePath, { 
            shouldValidate: true, 
            shouldDirty: true,
            shouldTouch: true
          });
        }
        
        // Force preview update
        setPreviewKey(prev => prev + 1);
        setLastImageUpdate(new Date());
        
        // Trigger validation
        const timeoutId = setTimeout(() => {
          trigger("image");
        }, 100);
        
        return () => clearTimeout(timeoutId);
      }
    };

    window.addEventListener('imageUpdated', handleImageUpdated as EventListener);
    document.addEventListener('imageUpdated', handleImageUpdated as EventListener);
    
    return () => {
      window.removeEventListener('imageUpdated', handleImageUpdated as EventListener);
      document.removeEventListener('imageUpdated', handleImageUpdated as EventListener);
    };
  }, [imageUrl, setValue, trigger, logWithTimestamp]); // Removed state setters to prevent loops

  // Enhanced image field validation watcher - Fixed dependency array
  useEffect(() => {
    logWithTimestamp('Innovator NEW form - Image field validation watcher triggered:', {
      imageUrl: imageUrl,
      imageUrlType: typeof imageUrl,
      imageUrlLength: imageUrl?.length,
      imageUrlTrimmed: imageUrl?.trim(),
      isEmpty: !imageUrl || imageUrl.trim() === '',
      formErrors: errors,
      imageFieldError: errors.image,
      hasImageValidationError: !!errors.image,
      formIsValid: formState.isValid,
      formIsDirty: formState.isDirty,
      dirtyFields: formState.dirtyFields,
      previewKey: previewKey,
    });
    
    // Force preview re-render when image URL changes
    if (imageUrl && imageUrl.trim() !== '') {
      logWithTimestamp('Image URL changed - forcing preview update');
      setPreviewKey(prev => prev + 1);
      setLastImageUpdate(new Date());
    }
    
    // Force re-validation if we have a valid image but still have an error
    if (imageUrl && imageUrl.trim() !== '' && errors.image) {
      logWithTimestamp('Detected valid image with validation error, triggering re-validation');
      const timeoutId = setTimeout(() => {
        trigger("image");
      }, 100);
      return () => clearTimeout(timeoutId);
    }
    
    // Force validation after setValue to ensure form state is updated
    if (imageUrl && imageUrl.trim() !== '') {
      const timeoutId = setTimeout(async () => {
        logWithTimestamp('Forcing validation after image change');
        const isValid = await trigger("image");
        logWithTimestamp('Validation result:', {
          isValid: isValid,
          currentImageValue: imageUrl,
          imageFieldError: errors.image,
        });
      }, 200);
      return () => clearTimeout(timeoutId);
    }
  }, [imageUrl, errors.image, formState.isValid, trigger, logWithTimestamp]); // Fixed: removed previewKey from deps to prevent loop

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

                    {/* Profile Image Upload with Bulletproof System */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                        Profile Image *
                      </label>
                      
                      {/* Hidden input for form validation */}
                      <input
                        type="hidden"
                        {...register("image")}
                      />
                      
                      <BulletproofImageUpload
                        value={imageUrl}
                        onChange={handleImageChange}
                        placeholder="Upload innovator profile image - bulletproof processing enabled"
                        className="mb-4"
                        multiple={false}
                        enableProgressiveUpload={true}
                        enableAutoRetry={true}
                        enableClientOptimization={true}
                        maxFileSize={200} // 200MB for bulletproof system
                        onUploadError={(error) => {
                          console.error('❌ DEBUG: Innovator NEW form - BulletproofImageUpload error:', error);
                        }}
                        // Enhanced form integration props
                        onFormValueSet={(filePath) => {
                          // This is an additional callback, main logic is in onChange
                          console.log('🔍 DEBUG: Innovator NEW form - BulletproofImageUpload onFormValueSet called:', {
                            filePath: filePath,
                            timestamp: new Date().toISOString()
                          });
                        }}
                        retryFormUpdate={true} // Enable retry logic for form value patching
                      />
                      
                      {errors.image && (
                        <p className="mt-1 text-sm text-red-600">{errors.image.message}</p>
                      )}
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Bulletproof processing: Images will be automatically optimized, chunked for large sizes, and retried on failure.
                      </p>
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
                
                <ImagePreview
                  imagePath={imageUrl}
                  alt="Innovator profile preview"
                  className="h-48"
                  placeholderIcon={Users}
                  placeholderText="Profile image preview will appear here"
                  showFileName={true}
                  key={previewKey} // Force re-render when previewKey changes
                  updatedAt={lastImageUpdate} // Cache busting
                  enableEventListening={true} // Enable event listening
                  debugMode={debugMode} // Enhanced debugging
                />

                {/* Debug info panel */}
                {debugMode && (
                  <div className="mt-4 p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs">
                    <div>Image URL: {imageUrl || 'None'}</div>
                    <div>Preview Key: {previewKey}</div>
                    <div>Last Update: {lastImageUpdate ? lastImageUpdate.toISOString() : 'None'}</div>
                    <div>Form Valid: {formState.isValid ? '✅' : '❌'}</div>
                    <div>Image Error: {errors.image ? '❌' : '✅'}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
