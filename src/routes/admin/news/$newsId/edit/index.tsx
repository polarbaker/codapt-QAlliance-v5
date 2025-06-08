import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import React, { useState, useCallback, useEffect } from "react";
import { useUserStore } from "~/stores/userStore";
import { useTRPC } from "~/trpc/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { newsSchema, type NewsFormData, NEWS_CATEGORIES } from "~/constants/validation";
import {
  ArrowLeft,
  Save,
  Newspaper,
  Plus,
  X,
  Loader2,
  AlertCircle,
  Calendar,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { SimpleNewsImageUpload } from "~/components/ui/SimpleNewsImageUpload";
import { ImagePreview } from "~/components/ui/ImagePreview";

export const Route = createFileRoute("/admin/news/$newsId/edit/")({
  component: EditNewsPage,
});

// Helper to format date for input type="date"
const formatDateForInput = (dateString: string | Date | null | undefined) => {
  if (!dateString) return "";
  try {
    return new Date(dateString).toISOString().split("T")[0];
  } catch (e) {
    return "";
  }
};

function EditNewsPage() {
  const { adminToken } = useUserStore();
  const navigate = useNavigate();
  const params = useParams({ from: "/admin/news/$newsId/edit/" });
  const newsId = parseInt(params.newsId);
  const queryClient = useQueryClient();

  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [previewKey, setPreviewKey] = useState(0);
  const [lastImageUpdate, setLastImageUpdate] = useState<Date | null>(null);
  const [debugMode] = useState(true);

  const trpc = useTRPC();

  const newsQuery = useQuery(
    trpc.adminGetNewsById.queryOptions({ // Assuming this procedure exists or will be created
      adminToken: adminToken || "",
      id: newsId,
    })
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, ...formState },
    setValue,
    watch,
    reset,
    trigger,
  } = useForm<NewsFormData>({
    resolver: zodResolver(newsSchema),
    defaultValues: {
      imageUrl: "", 
    },
  });

  useEffect(() => {
    if (newsQuery.data) {
      const newsItem = newsQuery.data;
      reset({
        ...newsItem,
        imageUrl: newsItem.imageUrl || "",
        publishedAt: formatDateForInput(newsItem.publishedAt),
      });
      if (newsItem.tags) {
        try {
          setTags(JSON.parse(newsItem.tags));
        } catch (e) {
          console.error("Failed to parse tags JSON:", e);
          setTags([]);
        }
      }
      setLastImageUpdate(new Date(newsItem.updatedAt));
      setPreviewKey(prev => prev + 1);
    }
  }, [newsQuery.data, reset]);

  const logWithTimestamp = useCallback((message: string, data?: any) => {
    if (debugMode) {
      console.log(`🔍 DEBUG: EditNewsForm [${new Date().toISOString()}] - ${message}`, data || '');
    }
  }, [debugMode]);

  const imageUrl = watch("imageUrl");

  const handleImageChange = useCallback((filePath: string | string[] | null) => {
    const pathValue = typeof filePath === 'string' ? filePath : null;
    if (pathValue !== null) {
      setValue("imageUrl", pathValue, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
      setPreviewKey(prev => prev + 1);
      setLastImageUpdate(new Date());
      setTimeout(() => trigger("imageUrl"), 100);
    } else {
      setValue("imageUrl", "", { shouldValidate: true, shouldDirty: true, shouldTouch: true });
      setPreviewKey(prev => prev + 1);
    }
  }, [setValue, trigger, logWithTimestamp]);

  useEffect(() => {
    const handleImageUpdated = (event: CustomEvent) => {
      const { filePath: eventFilePath, component } = event.detail || {};
      if (eventFilePath && (eventFilePath === imageUrl || component === 'SimpleNewsImageUpload')) {
        if (eventFilePath !== imageUrl && eventFilePath.trim() !== '') {
          setValue("imageUrl", eventFilePath, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
        }
        setPreviewKey(prev => prev + 1);
        setLastImageUpdate(new Date());
        setTimeout(() => trigger("imageUrl"), 100);
      }
    };
    window.addEventListener('imageUpdated', handleImageUpdated as EventListener);
    document.addEventListener('imageUpdated', handleImageUpdated as EventListener);
    return () => {
      window.removeEventListener('imageUpdated', handleImageUpdated as EventListener);
      document.removeEventListener('imageUpdated', handleImageUpdated as EventListener);
    };
  }, [imageUrl, setValue, trigger, logWithTimestamp]);
  
  useEffect(() => {
    if (imageUrl && imageUrl.trim() !== '') {
      setPreviewKey(prev => prev + 1);
      setLastImageUpdate(new Date());
    }
    if (imageUrl && imageUrl.trim() !== '' && errors.imageUrl) {
      setTimeout(() => trigger("imageUrl"), 100);
    }
  }, [imageUrl, errors.imageUrl, trigger, logWithTimestamp]);

  const updateMutation = useMutation(
    trpc.adminUpdateNews.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: ['adminGetNews'] });
        await queryClient.invalidateQueries({ queryKey: ['adminGetNewsById', { id: newsId }] });
        toast.success("News article updated successfully");
        navigate({ to: "/admin/news" });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const onSubmit = (data: NewsFormData) => {
    updateMutation.mutate({
      adminToken: adminToken || "",
      id: newsId,
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

  if (newsQuery.isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
        <p className="ml-2">Loading news article...</p>
      </div>
    );
  }

  if (newsQuery.isError || !newsQuery.data) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen text-red-600">
        <AlertCircle className="h-8 w-8 mb-2" />
        <p>Error loading news article: {newsQuery.error?.message || "News article not found."}</p>
        <Link to="/admin/news" className="mt-4 text-blue-600 hover:underline">
          Back to News
        </Link>
      </div>
    );
  }

  const currentNewsTitle = watch("title") || newsQuery.data?.title || "News Article";

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-black">
      <div className="container-padding">
        <div className="flex items-center justify-between py-8 border-b border-gray-200 dark:border-gray-700">
          <Link to="/admin/news" className="flex items-center space-x-2 text-text-muted dark:text-text-light/70 hover:text-text-dark dark:hover:text-text-light transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to News</span>
          </Link>
        </div>

        <div className="py-8">
          <div className="flex items-center space-x-4 mb-8">
            <div className="h-12 w-12 flex items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/20">
              <Newspaper className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-text-dark dark:text-text-light">
                Edit News Article
              </h1>
              <p className="text-text-muted dark:text-text-light/70 line-clamp-1">
                {currentNewsTitle}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl">
            <div className="lg:col-span-2">
              <form onSubmit={handleSubmit(onSubmit)}>
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Fields similar to NewNewsPage, pre-filled */}
                    <div className="lg:col-span-2">
                      <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">Title *</label>
                      <input type="text" {...register("title")} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary" />
                      {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>}
                    </div>

                    <div className="lg:col-span-2">
                      <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">Excerpt *</label>
                      <textarea {...register("excerpt")} rows={3} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary" />
                      {errors.excerpt && <p className="mt-1 text-sm text-red-600">{errors.excerpt.message}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">Category *</label>
                      <select {...register("category")} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary">
                        {NEWS_CATEGORIES.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}
                      </select>
                      {errors.category && <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">Published Date *</label>
                      <input type="date" {...register("publishedAt")} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary" />
                      {errors.publishedAt && <p className="mt-1 text-sm text-red-600">{errors.publishedAt.message}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">Image</label>
                      <SimpleNewsImageUpload
                        newsId={newsId}
                        newsTitle={currentNewsTitle}
                        value={imageUrl || ""}
                        onChange={handleImageChange}
                        componentId={`simple-news-upload-edit-${newsId}`}
                      />
                      {errors.imageUrl && <p className="mt-1 text-sm text-red-600">{errors.imageUrl.message}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">Author</label>
                      <input type="text" {...register("author")} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary" />
                      {errors.author && <p className="mt-1 text-sm text-red-600">{errors.author.message}</p>}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">Order</label>
                      <input type="number" {...register("order", {valueAsNumber: true})} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary" placeholder="Display order (optional)" />
                      {errors.order && <p className="mt-1 text-sm text-red-600">{errors.order.message}</p>}
                    </div>

                    <div className="lg:col-span-2">
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" {...register("featured")} className="rounded border-gray-300 text-secondary focus:ring-secondary" />
                        <span className="text-sm font-medium text-text-dark dark:text-text-light">Featured Article</span>
                      </label>
                    </div>

                    <div className="lg:col-span-2">
                      <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">Tags</label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {tags.map((tag, index) => (
                          <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-secondary/10 text-secondary">
                            {tag}
                            <button type="button" onClick={() => removeTag(tag)} className="ml-1 text-secondary/70 hover:text-secondary">
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex space-x-2">
                        <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyPress={handleKeyPress} className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary" placeholder="Add a tag" />
                        <button type="button" onClick={addTag} className="px-3 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors"><Plus className="h-4 w-4" /></button>
                      </div>
                    </div>

                    <div className="lg:col-span-2">
                      <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">Content *</label>
                      <textarea {...register("content")} rows={12} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary" />
                      {errors.content && <p className="mt-1 text-sm text-red-600">{errors.content.message}</p>}
                    </div>
                  </div>
                  <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-700 mt-8">
                    <button type="submit" disabled={isSubmitting || updateMutation.isPending} className="flex items-center space-x-2 px-6 py-3 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                      <Save className="h-4 w-4" />
                      <span>{isSubmitting || updateMutation.isPending ? "Saving..." : "Save Changes"}</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 sticky top-8">
                <h3 className="text-lg font-semibold text-text-dark dark:text-text-light mb-4">Image Preview</h3>
                <div className="w-full h-48 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-600">
                  <ImagePreview
                    imagePath={imageUrl}
                    alt="News article image preview"
                    className="h-full"
                    placeholderIcon={Newspaper}
                    updatedAt={lastImageUpdate || undefined}
                    key={previewKey}
                    debugMode={debugMode}
                  />
                </div>
                {debugMode && (
                  <div className="mt-4 p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs">
                    <div>Image URL: {imageUrl || 'None'}</div>
                    <div>Preview Key: {previewKey}</div>
                    <div>Last Update: {lastImageUpdate ? lastImageUpdate.toISOString() : 'None'}</div>
                    <div>Form Valid: {formState.isValid ? '✅' : '❌'}</div>
                    <div>Image Error: {errors.imageUrl ? `❌ ${errors.imageUrl.message}` : '✅'}</div>
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
