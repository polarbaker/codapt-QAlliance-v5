import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useUserStore } from "~/stores/userStore";
import { useTRPC } from "~/trpc/react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { caseStudySchema, type CaseStudyFormData } from "~/constants/validation";
import {
  ArrowLeft,
  Save,
  BookOpen,
  Plus,
  X,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { ImageUpload } from "~/components/ui/ImageUpload";
import { getImageUrl } from "~/utils";

export const Route = createFileRoute("/admin/case-studies/new/")({
  component: NewCaseStudyPage,
});

function NewCaseStudyPage() {
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
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<CaseStudyFormData>({
    resolver: zodResolver(caseStudySchema),
    defaultValues: {
      featured: false,
      tags: "[]",
    },
  });

  const createMutation = useMutation(
    trpc.adminCreateCaseStudy.mutationOptions({
      onSuccess: () => {
        toast.success("Case study created successfully");
        navigate({ to: "/admin/case-studies" });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const onSubmit = (data: CaseStudyFormData) => {
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
              to="/admin/case-studies"
              className="flex items-center space-x-2 text-text-muted dark:text-text-light/70 hover:text-text-dark dark:hover:text-text-light transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Case Studies</span>
            </Link>
          </div>
        </div>

        <div className="py-8">
          <div className="flex items-center space-x-4 mb-8">
            <div className="h-12 w-12 flex items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
              <BookOpen className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-text-dark dark:text-text-light">
                Create Case Study
              </h1>
              <p className="text-text-muted dark:text-text-light/70">
                Add a new success story or case study
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
                        placeholder="Enter case study title"
                      />
                      {errors.title && (
                        <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
                      )}
                    </div>

                    {/* Summary */}
                    <div className="lg:col-span-2">
                      <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                        Summary *
                      </label>
                      <textarea
                        {...register("summary")}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
                        placeholder="Brief summary of the case study"
                      />
                      {errors.summary && (
                        <p className="mt-1 text-sm text-red-600">{errors.summary.message}</p>
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
                        placeholder="Upload case study image"
                        previewClassName="h-48"
                      />
                      {errors.image && (
                        <p className="mt-1 text-sm text-red-600">{errors.image.message}</p>
                      )}
                    </div>

                    {/* Video URL */}
                    <div>
                      <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                        Video URL
                      </label>
                      <input
                        type="url"
                        {...register("video")}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
                        placeholder="https://youtube.com/watch?v=..."
                      />
                      {errors.video && (
                        <p className="mt-1 text-sm text-red-600">{errors.video.message}</p>
                      )}
                    </div>

                    {/* PDF URL */}
                    <div>
                      <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                        PDF URL
                      </label>
                      <input
                        type="url"
                        {...register("pdfUrl")}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
                        placeholder="https://example.com/document.pdf"
                      />
                      {errors.pdfUrl && (
                        <p className="mt-1 text-sm text-red-600">{errors.pdfUrl.message}</p>
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
                          Featured Case Study
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

                    {/* Impact Metrics */}
                    <div className="lg:col-span-2">
                      <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                        Impact Metrics
                      </label>
                      <textarea
                        {...register("impactMetrics")}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
                        placeholder="Quantifiable impact metrics (e.g., '50% reduction in costs, 1000+ users served')"
                      />
                      {errors.impactMetrics && (
                        <p className="mt-1 text-sm text-red-600">{errors.impactMetrics.message}</p>
                      )}
                    </div>

                    {/* Content */}
                    <div className="lg:col-span-2">
                      <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                        Content *
                      </label>
                      <textarea
                        {...register("content")}
                        rows={10}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
                        placeholder="Full case study content (supports Markdown)"
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
                        {isSubmitting || createMutation.isPending ? "Creating..." : "Create Case Study"}
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
                    <>
                      {previewImageLoading && (
                        <div className="flex flex-col items-center space-y-2">
                          <div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary border-t-transparent"></div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Loading preview...</p>
                        </div>
                      )}
                      {previewImageError ? (
                        <div className="flex flex-col items-center space-y-2 text-amber-600">
                          <BookOpen className="h-8 w-8" />
                          <p className="text-sm text-center">Preview not available</p>
                          <p className="text-xs text-center opacity-75">Image will be processed when form is submitted</p>
                        </div>
                      ) : (
                        <img
                          src={getImageUrl(watch("image"))}
                          alt="Case study image preview"
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
                      <BookOpen className="h-8 w-8 mx-auto mb-2" />
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
