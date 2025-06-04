import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useUserStore } from "~/stores/userStore";
import { useTRPC } from "~/trpc/react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { partnerSchema } from "~/constants/validation";
import * as z from "zod";
import {
  ArrowLeft,
  Save,
  Handshake,
  Eye,
  EyeOff,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { BulletproofImageUpload } from "~/components/ui/BulletproofImageUpload";
import { getImageUrl } from "~/utils";

type PartnerFormData = z.infer<typeof partnerSchema>;

export const Route = createFileRoute("/admin/partners/new/")({
  component: NewPartnerPage,
});

function NewPartnerPage() {
  const { adminToken } = useUserStore();
  const navigate = useNavigate();
  
  const trpc = useTRPC();
  
  const [previewImageLoading, setPreviewImageLoading] = useState(false);
  const [previewImageError, setPreviewImageError] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
  } = useForm<PartnerFormData>({
    resolver: zodResolver(partnerSchema),
    defaultValues: {
      visible: true,
      order: 0,
    },
  });

  const createMutation = useMutation(
    trpc.adminCreatePartner.mutationOptions({
      onSuccess: () => {
        toast.success("Partner created successfully");
        navigate({ to: "/admin/partners" });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const onSubmit = (data: PartnerFormData) => {
    createMutation.mutate({
      adminToken: adminToken || "",
      data: {
        ...data,
        websiteUrl: data.websiteUrl || undefined,
      },
    });
  };

  const visible = watch("visible");
  const logoUrl = watch("logoUrl");

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-black">
      <div className="container-padding">
        {/* Header */}
        <div className="flex items-center justify-between py-8 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-4">
            <Link
              to="/admin/partners"
              className="flex items-center space-x-2 text-text-muted dark:text-text-light/70 hover:text-text-dark dark:hover:text-text-light transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Partners</span>
            </Link>
          </div>
        </div>

        <div className="py-8">
          <div className="flex items-center space-x-4 mb-8">
            <div className="h-12 w-12 flex items-center justify-center rounded-full bg-teal-100 dark:bg-teal-900/20">
              <Handshake className="h-6 w-6 text-teal-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-text-dark dark:text-text-light">
                Add Partner
              </h1>
              <p className="text-text-muted dark:text-text-light/70">
                Add a new partner organization
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
                        Partner Name *
                      </label>
                      <input
                        type="text"
                        {...register("name")}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
                        placeholder="Enter partner name"
                      />
                      {errors.name && (
                        <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                      )}
                    </div>

                    {/* Logo Upload with Bulletproof Processing */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                        Logo *
                      </label>
                      <BulletproofImageUpload
                        value={watch("logoUrl")}
                        onChange={(filePath) => {
                          if (filePath) {
                            setValue("logoUrl", filePath);
                          } else {
                            setValue("logoUrl", "");
                          }
                        }}
                        placeholder="Upload partner logo - any format, optimized automatically"
                        previewClassName="h-32"
                        enableClientOptimization={true}
                        enableAutoRetry={true}
                        enableProgressiveUpload={true}
                        maxFileSize={50} // 50MB for partner logos
                        onUploadComplete={(result) => {
                          console.log('Partner logo uploaded successfully:', result);
                        }}
                        onUploadError={(error) => {
                          console.error('Partner logo upload error:', error);
                        }}
                      />
                      {errors.logoUrl && (
                        <p className="mt-1 text-sm text-red-600">{errors.logoUrl.message}</p>
                      )}
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Bulletproof processing: Logos will be automatically optimized for web display while preserving transparency.
                      </p>
                    </div>

                    {/* Alt Text */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                        Alt Text *
                      </label>
                      <input
                        type="text"
                        {...register("altText")}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
                        placeholder="Descriptive text for the logo"
                      />
                      {errors.altText && (
                        <p className="mt-1 text-sm text-red-600">{errors.altText.message}</p>
                      )}
                    </div>

                    {/* Website URL */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                        Website URL
                      </label>
                      <input
                        type="url"
                        {...register("websiteUrl")}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
                        placeholder="https://partner-website.com"
                      />
                      {errors.websiteUrl && (
                        <p className="mt-1 text-sm text-red-600">{errors.websiteUrl.message}</p>
                      )}
                    </div>

                    {/* Order */}
                    <div>
                      <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                        Display Order
                      </label>
                      <input
                        type="number"
                        {...register("order", { valueAsNumber: true })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
                        placeholder="0"
                      />
                      {errors.order && (
                        <p className="mt-1 text-sm text-red-600">{errors.order.message}</p>
                      )}
                    </div>

                    {/* Visible */}
                    <div className="flex items-center justify-center">
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          {...register("visible")}
                          className="sr-only"
                        />
                        <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${visible ? 'bg-secondary' : 'bg-gray-300 dark:bg-gray-600'}`}>
                          <div className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${visible ? 'translate-x-6' : 'translate-x-1'}`} />
                        </div>
                        <span className="text-sm font-medium text-text-dark dark:text-text-light flex items-center space-x-1">
                          {visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                          <span>{visible ? "Visible" : "Hidden"}</span>
                        </span>
                      </label>
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
                        {isSubmitting || createMutation.isPending ? "Creating..." : "Create Partner"}
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
                  Logo Preview
                </h3>
                <div className="w-full h-32 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-600">
                  {logoUrl ? (
                    <>
                      {previewImageLoading && (
                        <div className="flex flex-col items-center space-y-2">
                          <div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary border-t-transparent"></div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Loading preview...</p>
                        </div>
                      )}
                      {previewImageError ? (
                        <div className="flex flex-col items-center space-y-2 text-amber-600">
                          <Handshake className="h-8 w-8" />
                          <p className="text-sm text-center">Preview not available</p>
                          <p className="text-xs text-center opacity-75">Logo will be processed when form is submitted</p>
                        </div>
                      ) : (
                        <img
                          src={getImageUrl(logoUrl)}
                          alt="Partner logo preview"
                          className={`max-w-full max-h-full object-contain transition-opacity ${previewImageLoading ? 'opacity-0' : 'opacity-100'}`}
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
                      <Handshake className="h-8 w-8 mx-auto mb-2" />
                      <p className="text-sm">Logo preview will appear here</p>
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
