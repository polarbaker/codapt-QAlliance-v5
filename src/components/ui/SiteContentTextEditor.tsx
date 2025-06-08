import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useUserStore } from "~/stores/userStore";
import { useTRPC } from "~/trpc/react";
import { 
  SITE_CONTENT_TEXT_TYPES, 
  SITE_CONTENT_TEXT_LABELS, 
  siteContentTextSchema,
  type SiteContentTextFormData,
  type SiteContentTextType 
} from "~/constants/validation";
import { 
  Type, 
  Save, 
  RotateCcw, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  FileText,
  Edit3,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";

interface SiteContentTextEditorProps {
  contentType: SiteContentTextType;
  onTextUpdated?: (hasCustomText: boolean, contentType?: string) => void;
}

export function SiteContentTextEditor({ contentType, onTextUpdated }: SiteContentTextEditorProps) {
  const { adminToken } = useUserStore();
  const [isEditing, setIsEditing] = useState(false);
  const trpc = useTRPC();

  // Fetch current text content
  const textQuery = useQuery(
    trpc.getSiteContentText.queryOptions({
      contentType,
    })
  );

  // Upload text mutation
  const uploadTextMutation = useMutation(
    trpc.uploadSiteContentText.mutationOptions({
      onSuccess: (data) => {
        toast.success(`Text updated successfully!`);
        setIsEditing(false);
        textQuery.refetch();
        onTextUpdated?.(true, contentType);
      },
      onError: (error) => {
        toast.error(`Failed to update text: ${error.message}`);
      },
    })
  );

  // Remove text mutation
  const removeTextMutation = useMutation(
    trpc.removeSiteContentText.mutationOptions({
      onSuccess: () => {
        toast.success("Text reset to default successfully!");
        textQuery.refetch();
        onTextUpdated?.(false, contentType);
      },
      onError: (error) => {
        toast.error(`Failed to reset text: ${error.message}`);
      },
    })
  );

  // Form setup
  const form = useForm<SiteContentTextFormData>({
    resolver: zodResolver(siteContentTextSchema),
    defaultValues: {
      adminToken: adminToken || "",
      contentType,
      textData: "",
      description: "",
    },
  });

  // Update form when text data loads
  const currentTextData = textQuery.data?.textData || "";
  const currentDescription = textQuery.data?.description || "";

  // Update form values when data changes
  useState(() => {
    if (textQuery.data) {
      form.reset({
        adminToken: adminToken || "",
        contentType,
        textData: currentTextData,
        description: currentDescription,
      });
    }
  });

  const handleSave = useCallback(async (data: SiteContentTextFormData) => {
    if (!adminToken) {
      toast.error("Admin authentication required");
      return;
    }

    uploadTextMutation.mutate({
      ...data,
      adminToken,
    });
  }, [adminToken, uploadTextMutation]);

  const handleReset = useCallback(() => {
    if (!adminToken) {
      toast.error("Admin authentication required");
      return;
    }

    if (window.confirm("Are you sure you want to reset this text to its default value?")) {
      removeTextMutation.mutate({
        adminToken,
        contentType,
      });
    }
  }, [adminToken, contentType, removeTextMutation]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    form.reset({
      adminToken: adminToken || "",
      contentType,
      textData: currentTextData,
      description: currentDescription,
    });
  }, [form, adminToken, contentType, currentTextData, currentDescription]);

  const isLoading = textQuery.isLoading;
  const isUpdating = uploadTextMutation.isPending || removeTextMutation.isPending;
  const hasCustomText = textQuery.data?.hasCustomText || false;
  const textLength = currentTextData.length;

  const label = SITE_CONTENT_TEXT_LABELS[contentType];

  if (!adminToken) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
          <span className="text-red-700 dark:text-red-300 font-medium">
            Authentication required
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
            <Type className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {label}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {contentType}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {hasCustomText ? (
            <div className="flex items-center space-x-1 text-green-600 dark:text-green-400">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Custom</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1 text-amber-600 dark:text-amber-400">
              <FileText className="h-4 w-4" />
              <span className="text-sm font-medium">Default</span>
            </div>
          )}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600 dark:text-gray-400">Loading text content...</span>
        </div>
      )}

      {/* Content */}
      {!isLoading && (
        <>
          {!isEditing ? (
            // Display Mode
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Current Text
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {textLength} characters
                  </span>
                </div>
                <p className="text-gray-900 dark:text-white whitespace-pre-wrap break-words">
                  {currentTextData || "No text content"}
                </p>
              </div>

              {currentDescription && (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
                    Description
                  </span>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {currentDescription}
                  </p>
                </div>
              )}

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                >
                  <Edit3 className="h-4 w-4" />
                  <span>Edit Text</span>
                </button>

                {hasCustomText && (
                  <button
                    onClick={handleReset}
                    disabled={isUpdating}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isUpdating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    <span>Reset to Default</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            // Edit Mode
            <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Text Content
                </label>
                <textarea
                  {...form.register("textData")}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-vertical"
                  placeholder="Enter text content..."
                />
                {form.formState.errors.textData && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {form.formState.errors.textData.message}
                  </p>
                )}
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Maximum 5000 characters
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {form.watch("textData")?.length || 0} / 5000
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description (Optional)
                </label>
                <input
                  {...form.register("description")}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Brief description of this text content..."
                />
                {form.formState.errors.description && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {form.formState.errors.description.message}
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-3">
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isUpdating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  <span>{isUpdating ? "Saving..." : "Save Text"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isUpdating}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Cancel</span>
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}
