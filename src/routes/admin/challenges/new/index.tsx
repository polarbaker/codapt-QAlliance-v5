import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useCallback, useEffect } from "react";
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
import { SimpleChallengeImageUpload } from "~/components/ui/SimpleChallengeImageUpload";
import { ImagePreview } from "~/components/ui/ImagePreview";

export const Route = createFileRoute("/admin/challenges/new/")({
  component: NewChallengePage,
});

function NewChallengePage() {
  const { adminToken } = useUserStore();
  const navigate = useNavigate();
  const [previewKey, setPreviewKey] = useState(0); // Force preview re-render
  const [lastImageUpdate, setLastImageUpdate] = useState<Date | null>(null);
  const [debugMode] = useState(true); // Enable debugging
  
  const trpc = useTRPC();
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, ...formState },
    setValue,
    watch,
    trigger,
  } = useForm<ChallengeFormData>({
    resolver: zodResolver(challengeSchema),
    defaultValues: {
      featured: false,
      category: CHALLENGE_CATEGORIES[0],
      region: CHALLENGE_REGIONS[0],
      status: CHALLENGE_STATUSES[0],
      image: "", // Initialize with explicit empty string, but now optional
    },
  });

  // Enhanced logging with timestamps - memoized to prevent re-creation
  const logWithTimestamp = useCallback((message: string, data?: any) => {
    if (debugMode) {
      console.log(`🔍 DEBUG: NewChallengeForm [${new Date().toISOString()}] - ${message}`, data || '');
    }
  }, [debugMode]);

  const imageUrl = watch("image");

  // Memoized onChange handler to prevent re-creation on every render
  const handleImageChange = useCallback((filePath: string | string[] | null) => {
    logWithTimestamp('SimpleChallengeImageUpload onChange called with:', {
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

  // Custom event listener for crosscutting image updates
  useEffect(() => {
    const handleImageUpdated = (event: CustomEvent) => {
      const { filePath: eventFilePath, timestamp, component } = event.detail || {};
      
      logWithTimestamp('Received imageUpdated event:', {
        eventFilePath: eventFilePath,
        currentImageUrl: imageUrl,
        eventTimestamp: timestamp,
        eventComponent: component,
        shouldUpdate: eventFilePath && (eventFilePath === imageUrl || component === 'SimpleChallengeImageUpload'),
      });
      
      // Check if this event is for our current image or if it's a new upload
      if (eventFilePath && (eventFilePath === imageUrl || component === 'SimpleChallengeImageUpload')) {
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
  }, [imageUrl, setValue, trigger, logWithTimestamp]);

  // Enhanced image field validation watcher
  useEffect(() => {
    logWithTimestamp('Challenge NEW form - Image field validation watcher triggered:', {
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
  }, [imageUrl, errors.image, formState.isValid, trigger, logWithTimestamp]);

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
                        Image (Optional)
                      </label>
                      <SimpleChallengeImageUpload
                        challengeId={0} // Use 0 for new challenges
                        challengeTitle="New Challenge"
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
                        componentId="simple-challenge-upload-new"
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        You can add an image after creating the challenge by editing it.
                      </p>
                      <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                        Note: Images can be added after challenge creation. Create the challenge first, then edit to upload an image.
                      </p>
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
                  <ImagePreview
                    imagePath={imageUrl}
                    alt="Challenge image preview"
                    className="h-48"
                    placeholderIcon={Trophy}
                    placeholderText="Image preview will appear here"
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
    </div>
  );
}
