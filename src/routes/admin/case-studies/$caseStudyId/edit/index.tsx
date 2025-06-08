import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import React, { useState, useCallback, useEffect } from "react";
import { useUserStore } from "~/stores/userStore";
import { useTRPC } from "~/trpc/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { caseStudySchema, type CaseStudyFormData } from "~/constants/validation";
import {
  ArrowLeft,
  Save,
  BookOpen,
  Plus,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { SimpleCaseStudyImageUpload } from "~/components/ui/SimpleCaseStudyImageUpload";
import { ImagePreview } from "~/components/ui/ImagePreview";

export const Route = createFileRoute("/admin/case-studies/$caseStudyId/edit/")({
  component: EditCaseStudyPage,
});

function EditCaseStudyPage() {
  const { adminToken } = useUserStore();
  const navigate = useNavigate();
  const params = useParams({ from: "/admin/case-studies/$caseStudyId/edit/" });
  const caseStudyId = parseInt(params.caseStudyId);
  const queryClient = useQueryClient();

  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [previewKey, setPreviewKey] = useState(0);
  const [lastImageUpdate, setLastImageUpdate] = useState<Date | null>(null);
  const [debugMode] = useState(true);

  const trpc = useTRPC();

  const caseStudyQuery = useQuery(
    trpc.adminGetCaseStudyById.queryOptions({
      adminToken: adminToken || "",
      id: caseStudyId,
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
  } = useForm<CaseStudyFormData>({
    resolver: zodResolver(caseStudySchema),
    defaultValues: {
      image: "", // Initialize with explicit empty string
    },
  });

  useEffect(() => {
    if (caseStudyQuery.data) {
      const caseStudy = caseStudyQuery.data;
      reset({
        title: caseStudy.title,
        summary: caseStudy.summary,
        content: caseStudy.content,
        image: caseStudy.image || "",
        video: caseStudy.video || "",
        pdfUrl: caseStudy.pdfUrl || "",
        tags: caseStudy.tags, // Will be parsed into `tags` state
        impactMetrics: caseStudy.impactMetrics || "",
        featured: caseStudy.featured,
        order: caseStudy.order,
      });
      if (caseStudy.tags) {
        try {
          setTags(JSON.parse(caseStudy.tags));
        } catch (e) {
          console.error("Failed to parse tags JSON:", e);
          setTags([]);
        }
      }
      setLastImageUpdate(new Date(caseStudy.updatedAt));
      setPreviewKey(prev => prev + 1); // Force preview update on load
    }
  }, [caseStudyQuery.data, reset, setValue]);

  const logWithTimestamp = useCallback((message: string, data?: any) => {
    if (debugMode) {
      console.log(`🔍 DEBUG: EditCaseStudyForm [${new Date().toISOString()}] - ${message}`, data || '');
    }
  }, [debugMode]);

  const imageUrl = watch("image");

  const handleImageChange = useCallback((filePath: string | string[] | null) => {
    const pathValue = typeof filePath === 'string' ? filePath : null;
    if (pathValue !== null) {
      setValue("image", pathValue, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
      setPreviewKey(prev => prev + 1);
      setLastImageUpdate(new Date());
      setTimeout(() => trigger("image"), 100);
    } else {
      setValue("image", "", { shouldValidate: true, shouldDirty: true, shouldTouch: true });
      setPreviewKey(prev => prev + 1);
    }
  }, [setValue, trigger, logWithTimestamp]);

  useEffect(() => {
    const handleImageUpdated = (event: CustomEvent) => {
      const { filePath: eventFilePath, component } = event.detail || {};
      if (eventFilePath && (eventFilePath === imageUrl || component === 'SimpleCaseStudyImageUpload')) {
        if (eventFilePath !== imageUrl && eventFilePath.trim() !== '') {
          setValue("image", eventFilePath, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
        }
        setPreviewKey(prev => prev + 1);
        setLastImageUpdate(new Date());
        setTimeout(() => trigger("image"), 100);
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
    if (imageUrl && imageUrl.trim() !== '' && errors.image) {
      setTimeout(() => trigger("image"), 100);
    }
  }, [imageUrl, errors.image, trigger, logWithTimestamp]);

  const updateMutation = useMutation(
    trpc.adminUpdateCaseStudy.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: ['adminGetCaseStudies'] });
        await queryClient.invalidateQueries({ queryKey: ['adminGetCaseStudyById', { id: caseStudyId }] });
        toast.success("Case study updated successfully");
        navigate({ to: "/admin/case-studies" });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const onSubmit = (data: CaseStudyFormData) => {
    updateMutation.mutate({
      adminToken: adminToken || "",
      id: caseStudyId,
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

  if (caseStudyQuery.isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
        <p className="ml-2">Loading case study...</p>
      </div>
    );
  }

  if (caseStudyQuery.isError || !caseStudyQuery.data) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen text-red-600">
        <AlertCircle className="h-8 w-8 mb-2" />
        <p>Error loading case study: {caseStudyQuery.error?.message || "Case study not found."}</p>
        <Link to="/admin/case-studies" className="mt-4 text-blue-600 hover:underline">
          Back to Case Studies
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-black">
      <div className="container-padding">
        <div className="flex items-center justify-between py-8 border-b border-gray-200 dark:border-gray-700">
          <Link to="/admin/case-studies" className="flex items-center space-x-2 text-text-muted dark:text-text-light/70 hover:text-text-dark dark:hover:text-text-light transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Case Studies</span>
          </Link>
        </div>

        <div className="py-8">
          <div className="flex items-center space-x-4 mb-8">
            <div className="h-12 w-12 flex items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
              <BookOpen className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-text-dark dark:text-text-light">
                Edit Case Study
              </h1>
              <p className="text-text-muted dark:text-text-light/70 line-clamp-1">
                {caseStudyQuery.data?.title || "Loading..."}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl">
            <div className="lg:col-span-2">
              <form onSubmit={handleSubmit(onSubmit)}>
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="lg:col-span-2">
                      <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">Title *</label>
                      <input type="text" {...register("title")} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary" />
                      {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>}
                    </div>

                    <div className="lg:col-span-2">
                      <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">Summary *</label>
                      <textarea {...register("summary")} rows={3} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary" />
                      {errors.summary && <p className="mt-1 text-sm text-red-600">{errors.summary.message}</p>}
                    </div>

                    <div className="lg:col-span-2">
                      <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">Image *</label>
                      <SimpleCaseStudyImageUpload
                        caseStudyId={caseStudyId}
                        caseStudyTitle={watch("title") || "Case Study"}
                        value={imageUrl}
                        onChange={handleImageChange}
                        componentId={`simple-casestudy-upload-edit-${caseStudyId}`}
                      />
                      {errors.image && <p className="mt-1 text-sm text-red-600">{errors.image.message}</p>}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">Video URL</label>
                      <input type="url" {...register("video")} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary" />
                      {errors.video && <p className="mt-1 text-sm text-red-600">{errors.video.message}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">PDF URL</label>
                      <input type="url" {...register("pdfUrl")} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary" />
                      {errors.pdfUrl && <p className="mt-1 text-sm text-red-600">{errors.pdfUrl.message}</p>}
                    </div>

                    <div className="lg:col-span-2">
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" {...register("featured")} className="rounded border-gray-300 text-secondary focus:ring-secondary" />
                        <span className="text-sm font-medium text-text-dark dark:text-text-light">Featured Case Study</span>
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
                      <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">Impact Metrics</label>
                      <textarea {...register("impactMetrics")} rows={3} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary" />
                      {errors.impactMetrics && <p className="mt-1 text-sm text-red-600">{errors.impactMetrics.message}</p>}
                    </div>
                    
                    <div className="lg:col-span-2">
                      <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">Order</label>
                      <input type="number" {...register("order", {valueAsNumber: true})} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary" />
                      {errors.order && <p className="mt-1 text-sm text-red-600">{errors.order.message}</p>}
                    </div>

                    <div className="lg:col-span-2">
                      <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">Content *</label>
                      <textarea {...register("content")} rows={10} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary" />
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
                    alt="Case study image preview"
                    className="h-full" 
                    placeholderIcon={BookOpen}
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
                    <div>Image Error: {errors.image ? `❌ ${errors.image.message}` : '✅'}</div>
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
