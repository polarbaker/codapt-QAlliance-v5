import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useCallback, useEffect } from "react";
import { useUserStore } from "~/stores/userStore";
import { useTRPC } from "~/trpc/react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { newsSchema, type NewsFormData, NEWS_CATEGORIES } from "~/constants/validation";
import {
  ArrowLeft,
  Save,
  Newspaper,
  Plus,
  X,
  Calendar,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { SimpleNewsImageUpload } from "~/components/ui/SimpleNewsImageUpload";
import { ImagePreview } from "~/components/ui/ImagePreview";

export const Route = createFileRoute("/admin/news/new/")({
  component: NewNewsPage,
});

function NewNewsPage() {
  const { adminToken } = useUserStore();
  const navigate = useNavigate();
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [previewKey, setPreviewKey] = useState(0); // Force preview re-render
  const [lastImageUpdate, setLastImageUpdate] = useState<Date | null>(null);
  const [debugMode] = useState(true); // Enable debugging
  
  const trpc = useTRPC();
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty, dirtyFields, isValid: formIsValid },
    setValue,
    watch,
    trigger,
  } = useForm<NewsFormData>({
    resolver: zodResolver(newsSchema),
    defaultValues: {
      featured: false,
      tags: "[]",
      publishedAt: new Date().toISOString().split('T')[0],
      category: NEWS_CATEGORIES[0],
      imageUrl: "", // Initialize with explicit empty string
      order: 0, // Add default order value
    },
  });

  // Enhanced logging with timestamps - memoized to prevent re-creation
  const logWithTimestamp = useCallback((message: string, data?: any) => {
    if (debugMode) {
      console.log(`🔍 DEBUG: NewNewsForm [${new Date().toISOString()}] - ${message}`, data || '');
    }
  }, [debugMode]);

  const imageUrl = watch("imageUrl");

  // Memoized onChange handler to prevent re-creation on every render
  const handleImageChange = useCallback((filePath: string | string[] | null) => {
    logWithTimestamp('SimpleNewsImageUpload onChange called with:', {
      filePath: filePath,
      filePathType: typeof filePath,
      filePathLength: typeof filePath === 'string' ? filePath?.length : (Array.isArray(filePath) ? filePath.length : 0),
      isString: typeof filePath === 'string',
      isNonEmptyString: typeof filePath === 'string' && filePath.trim() !== '',
      trimmedValue: typeof filePath === 'string' ? filePath.trim() : filePath,
      currentFormImageValue: watch("imageUrl"),
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
      
      setValue("imageUrl", pathValue, { 
        shouldValidate: true, 
        shouldDirty: true,
        shouldTouch: true
      });
      
      // Force preview update
      setPreviewKey(prev => prev + 1);
      setLastImageUpdate(new Date());
      
      logWithTimestamp('setValue called, checking immediate state:', {
        setValueWith: pathValue,
        newFormImageValue: watch("imageUrl"),
        formErrors: errors,
        imageFieldError: errors.imageUrl,
        isDirty: isDirty,
        dirtyFields: dirtyFields,
        newPreviewKey: previewKey + 1,
      });
      
      // Manual trigger call after setValue
      const timeoutId = setTimeout(async () => {
        logWithTimestamp('Manual trigger call for image validation');
        const isValid = await trigger("imageUrl");
        logWithTimestamp('Manual trigger result:', {
          isValid: isValid,
          currentImageValue: watch("imageUrl"),
          imageFieldError: errors.imageUrl,
          formIsValid: formIsValid,
        });
      }, 100);
      
    } else if (filePath === null) {
      // Handle clearing the image
      setValue("imageUrl", "", { 
        shouldValidate: true, 
        shouldDirty: true,
        shouldTouch: true
      });
      setPreviewKey(prev => prev + 1);
    }
  }, [setValue, trigger, watch, errors, isDirty, dirtyFields, formIsValid, previewKey, logWithTimestamp]);

  // Custom event listener for crosscutting image updates
  useEffect(() => {
    const handleImageUpdated = (event: CustomEvent) => {
      const { filePath: eventFilePath, timestamp, component } = event.detail || {};
      
      logWithTimestamp('Received imageUpdated event:', {
        eventFilePath: eventFilePath,
        currentImageUrl: imageUrl,
        eventTimestamp: timestamp,
        eventComponent: component,
        shouldUpdate: eventFilePath && (eventFilePath === imageUrl || component === 'SimpleNewsImageUpload'),
      });
      
      // Check if this event is for our current image or if it's a new upload
      if (eventFilePath && (eventFilePath === imageUrl || component === 'SimpleNewsImageUpload')) {
        logWithTimestamp('Event matches current context - forcing form and preview update');
        
        // Update form state if the path is different
        if (eventFilePath !== imageUrl && eventFilePath.trim() !== '') {
          logWithTimestamp('Updating form state from event');
          setValue("imageUrl", eventFilePath, { 
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
          trigger("imageUrl");
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
    logWithTimestamp('News NEW form - Image field validation watcher triggered:', {
      imageUrl: imageUrl,
      imageUrlType: typeof imageUrl,
      imageUrlLength: imageUrl?.length,
      imageUrlTrimmed: imageUrl?.trim(),
      isEmpty: !imageUrl || imageUrl.trim() === '',
      formErrors: errors,
      imageFieldError: errors.imageUrl,
      hasImageValidationError: !!errors.imageUrl,
      formIsValid: formIsValid,
      formIsDirty: isDirty,
      dirtyFields: dirtyFields,
      previewKey: previewKey,
    });
    
    // Force preview re-render when image URL changes
    if (imageUrl && imageUrl.trim() !== '') {
      logWithTimestamp('Image URL changed - forcing preview update');
      setPreviewKey(prev => prev + 1);
      setLastImageUpdate(new Date());
    }
    
    // Force re-validation if we have a valid image but still have an error
    if (imageUrl && imageUrl.trim() !== '' && errors.imageUrl) {
      logWithTimestamp('Detected valid image with validation error, triggering re-validation');
      const timeoutId = setTimeout(() => {
        trigger("imageUrl");
      }, 100);
      return () => clearTimeout(timeoutId);
    }
    
    // Force validation after setValue to ensure form state is updated
    if (imageUrl && imageUrl.trim() !== '') {
      const timeoutId = setTimeout(async () => {
        logWithTimestamp('Forcing validation after image change');
        const isValid = await trigger("imageUrl");
        logWithTimestamp('Validation result:', {
          isValid: isValid,
          currentImageValue: imageUrl,
          imageFieldError: errors.imageUrl,
        });
      }, 200);
      return () => clearTimeout(timeoutId);
    }
  }, [imageUrl, errors.imageUrl, formIsValid, isDirty, dirtyFields, trigger, logWithTimestamp]);

  const createMutation = useMutation(
    trpc.adminCreateNews.mutationOptions({
      onSuccess: () => {
        toast.success("News article created successfully");
        navigate({ to: "/admin/news" });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const onSubmit = (data: NewsFormData) => {
    createMutation.mutate({
      adminToken: adminToken || "",
      data: {
        ...data,
        tags: JSON.stringify(tags),
      },
    });
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      const newTags = [...tags, tagInput.trim()];
      setTags(newTags);
      setTagInput("");
      setValue("tags", JSON.stringify(newTags));
    }
  };

  const removeTag = (tagToRemove: string) => {
    const newTags = tags.filter(tag => tag !== tagToRemove);
    setTags(newTags);
    setValue("tags", JSON.stringify(newTags));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-black">
      <div className="container-padding">
        {/* Header */}
        <div className="flex items-center justify-between py-8 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-4">
            <Link
              to="/admin/news"
              className="flex items-center space-x-2 text-text-muted dark:text-text-light/70 hover:text-text-dark dark:hover:text-text-light transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to News</span>
            </Link>
          </div>
        </div>

        <div className="py-8">
          <div className="flex items-center space-x-4 mb-8">
            <div className="h-12 w-12 flex items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/20">
              <Newspaper className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-text-dark dark:text-text-light">
                Create News Article
              </h1>
              <p className="text-text-muted dark:text-text-light/70">
                Add a new news article or announcement
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
                        placeholder="Enter article title"
                      />
                      {errors.title && (
                        <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
                      )}
                    </div>

                    {/* Excerpt */}
                    <div className="lg:col-span-2">
                      <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                        Excerpt *
                      </label>
                      <textarea
                        {...register("excerpt")}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
                        placeholder="Brief excerpt or summary of the article"
                      />
                      {errors.excerpt && (
                        <p className="mt-1 text-sm text-red-600">{errors.excerpt.message}</p>
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
                        {NEWS_CATEGORIES.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                      {errors.category && (
                        <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>
                      )}
                    </div>

                    {/* Published Date */}
                    <div>
                      <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                        Published Date *
                      </label>
                      <input
                        type="date"
                        {...register("publishedAt")}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
                      />
                      {errors.publishedAt && (
                        <p className="mt-1 text-sm text-red-600">{errors.publishedAt.message}</p>
                      )}
                    </div>

                    {/* Image Upload */}
                    <div className="lg:col-span-2">
                      <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                        Image
                      </label>
                      <SimpleNewsImageUpload
                        newsId={0} // Use 0 for new news articles
                        newsTitle="New News Article"
                        value={imageUrl || ""}
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
                        componentId="simple-news-upload-new"
                      />
                      {errors.imageUrl && (
                        <p className="mt-1 text-sm text-red-600">{errors.imageUrl.message}</p>
                      )}
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Simple & reliable: Images will be automatically optimized and stored securely.
                      </p>
                      <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                        Note: For new news articles, you'll need to create the article first, then edit it to upload an image.
                      </p>
                    </div>

                    {/* Author */}
                    <div>
                      <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                        Author
                      </label>
                      <input
                        type="text"
                        {...register("author")}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
                        placeholder="Author name"
                      />
                      {errors.author && (
                        <p className="mt-1 text-sm text-red-600">{errors.author.message}</p>
                      )}
                    </div>

                    {/* Order */}
                    <div>
                      <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                        Order
                      </label>
                      <input
                        type="number"
                        {...register("order", { valueAsNumber: true })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
                        placeholder="Display order (optional)"
                      />
                      {errors.order && (
                        <p className="mt-1 text-sm text-red-600">{errors.order.message}</p>
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
                          Featured Article
                        </span>
                      </label>
                    </div>

                    {/* Tags */}
                    <div className="lg:col-span-2">
                      <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                        Tags
                      </label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {tags.map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-secondary/10 text-secondary"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => removeTag(tag)}
                              className="ml-1 text-secondary/70 hover:text-secondary"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyPress={handleKeyPress}
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
                          placeholder="Add a tag"
                        />
                        <button
                          type="button"
                          onClick={addTag}
                          className="px-3 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="lg:col-span-2">
                      <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                        Content *
                      </label>
                      <textarea
                        {...register("content")}
                        rows={12}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
                        placeholder="Full article content (supports Markdown)"
                      />
                      {errors.content && (
                        <p className="mt-1 text-sm text-red-600">{errors.content.message}</p>
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
                        {isSubmitting || createMutation.isPending ? "Creating..." : "Create Article"}
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
                    alt="News article image preview"
                    className="h-48"
                    placeholderIcon={Newspaper}
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
                      <div>Form Valid: {formIsValid ? '✅' : '❌'}</div>
                      <div>Image Error: {errors.imageUrl ? '❌' : '✅'}</div>
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
