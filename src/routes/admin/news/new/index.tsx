import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
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
import { BulletproofImageUpload } from "~/components/ui/BulletproofImageUpload";
import { getImageUrl } from "~/utils";

export const Route = createFileRoute("/admin/news/new/")({
  component: NewNewsPage,
});

function NewNewsPage() {
  const { adminToken } = useUserStore();
  const navigate = useNavigate();
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [previewImageLoading, setPreviewImageLoading] = useState(false);
  const [previewImageError, setPreviewImageError] = useState(false);
  
  const trpc = useTRPC();
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty, dirtyFields },
    setValue,
    watch,
  } = useForm<NewsFormData>({
    resolver: zodResolver(newsSchema),
    defaultValues: {
      featured: false,
      tags: "[]",
      publishedAt: new Date().toISOString().split('T')[0],
      category: NEWS_CATEGORIES[0],
    },
  });

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
                    <div>
                      <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                        Image
                      </label>
                      <BulletproofImageUpload
                        value={watch("imageUrl") || ""}
                        onChange={(filePath) => {
                          console.log('🔍 DEBUG: News NEW form - BulletproofImageUpload onChange called with:', {
                            filePath: filePath,
                            filePathType: typeof filePath,
                            filePathLength: typeof filePath === 'string' ? filePath?.length : (Array.isArray(filePath) ? filePath.length : 0),
                            isString: typeof filePath === 'string',
                            isNonEmptyString: typeof filePath === 'string' && filePath.trim() !== '',
                            trimmedValue: typeof filePath === 'string' ? filePath.trim() : filePath,
                            currentFormImageUrlValue: watch("imageUrl"),
                            timestamp: new Date().toISOString()
                          });
                          
                          // Ensure filePath is a string before setting
                          const pathValue = typeof filePath === 'string' ? filePath : null;
                          
                          if (pathValue && pathValue.trim() !== '') {
                            console.log('🔍 DEBUG: News NEW form - About to call setValue with valid pathValue:', {
                              valueToSet: pathValue,
                              shouldValidate: true, 
                              shouldDirty: true,
                              shouldTouch: true,
                              timestamp: new Date().toISOString()
                            });
                            
                            setValue("imageUrl", pathValue, { 
                              shouldValidate: true, 
                              shouldDirty: true,
                              shouldTouch: true
                            });
                            
                            console.log('🔍 DEBUG: News NEW form - setValue called, checking immediate state:', {
                              setValueWith: pathValue,
                              newFormImageUrlValue: watch("imageUrl"),
                              formErrors: errors,
                              imageUrlFieldError: errors.imageUrl,
                              isDirty: isDirty,
                              dirtyFields: dirtyFields,
                              timestamp: new Date().toISOString()
                            });
                            
                          } else if (pathValue === null) {
                            // Handle clearing the image
                            setValue("imageUrl", "", { 
                              shouldValidate: true, 
                              shouldDirty: true,
                              shouldTouch: true
                            });
                          }
                        }}
                        placeholder="Upload news article image - bulletproof processing enabled"
                        className="mb-4"
                        multiple={false}
                        enableProgressiveUpload={true}
                        enableAutoRetry={true}
                        enableClientOptimization={true}
                        maxFileSize={200} // 200MB for bulletproof system
                        onUploadError={(error) => {
                          console.error('❌ DEBUG: News NEW form - BulletproofImageUpload error:', error);
                        }}
                        // Enhanced form integration props
                        onFormValueSet={(filePath) => {
                          console.log('🔍 DEBUG: News NEW form - BulletproofImageUpload onFormValueSet called:', {
                            filePath: filePath,
                            timestamp: new Date().toISOString()
                          });
                        }}
                        retryFormUpdate={true} // Enable retry logic for form value patching
                      />
                      {errors.imageUrl && (
                        <p className="mt-1 text-sm text-red-600">{errors.imageUrl.message}</p>
                      )}
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
                  {watch("imageUrl") ? (
                    <>
                      {previewImageLoading && (
                        <div className="flex flex-col items-center space-y-2">
                          <div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary border-t-transparent"></div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Loading preview...</p>
                        </div>
                      )}
                      {previewImageError ? (
                        <div className="flex flex-col items-center space-y-2 text-amber-600">
                          <Newspaper className="h-8 w-8" />
                          <p className="text-sm text-center">Preview not available</p>
                          <p className="text-xs text-center opacity-75">Image will be processed when form is submitted</p>
                        </div>
                      ) : (
                        <img
                          src={getImageUrl(watch("imageUrl"))}
                          alt="News article image preview"
                          className={`max-w-full max-h-full object-cover rounded-lg transition-opacity ${previewImageLoading ? 'opacity-0' : 'opacity-100'}`}
                          onLoad={() => {
                            setPreviewImageLoading(false);
                            setPreviewImageError(false);
                          }}
                          onLoadStart={() => {
                            setPreviewImageLoading(true);
                            setPreviewImageError(false);
                          }}
                          onError={() => {
                            setPreviewImageLoading(false);
                            setPreviewImageError(true);
                          }}
                          style={{ display: previewImageLoading ? 'none' : 'block' }}
                        />
                      )}
                    </>
                  ) : (
                    <div className="text-center text-gray-500 dark:text-gray-400">
                      <Newspaper className="h-8 w-8 mx-auto mb-2" />
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
