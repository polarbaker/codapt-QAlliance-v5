import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import React, { useCallback, useState } from "react";
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
import { ImagePreview } from "~/components/ui/ImagePreview";

type PartnerFormData = z.infer<typeof partnerSchema>;

export const Route = createFileRoute("/admin/partners/new/")({
  component: NewPartnerPage,
});

function NewPartnerPage() {
  const { adminToken } = useUserStore();
  const navigate = useNavigate();
  
  const trpc = useTRPC();
  
  const [previewKey, setPreviewKey] = useState(0); // Force preview re-render
  const [lastImageUpdate, setLastImageUpdate] = useState<Date | null>(null);
  const [debugMode] = useState(true); // Enable debugging
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
    trigger,
    formState,
  } = useForm<PartnerFormData>({
    resolver: zodResolver(partnerSchema),
    defaultValues: {
      visible: true,
      order: 0,
      logoUrl: "", // Initialize with explicit empty string
    },
  });

  // Enhanced logging with timestamps - memoized to prevent re-creation
  const logWithTimestamp = useCallback((message: string, data?: any) => {
    if (debugMode) {
      console.log(`🔍 DEBUG: NewPartnerForm [${new Date().toISOString()}] - ${message}`, data || '');
    }
  }, [debugMode]);

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

  // Memoized onChange handler to prevent re-creation on every render
  const handleLogoChange = useCallback((filePath: string | string[] | null) => {
    logWithTimestamp('BulletproofImageUpload onChange called with:', {
      filePath: filePath,
      filePathType: typeof filePath,
      filePathLength: typeof filePath === 'string' ? filePath?.length : (Array.isArray(filePath) ? filePath.length : 0),
      isString: typeof filePath === 'string',
      isNonEmptyString: typeof filePath === 'string' && filePath.trim() !== '',
      trimmedValue: typeof filePath === 'string' ? filePath.trim() : filePath,
      currentFormLogoUrlValue: watch("logoUrl"),
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
      
      setValue("logoUrl", pathValue, { 
        shouldValidate: true, 
        shouldDirty: true,
        shouldTouch: true
      });
      
      // Force preview update
      setPreviewKey(prev => prev + 1);
      setLastImageUpdate(new Date());
      
      logWithTimestamp('setValue called, checking immediate state:', {
        setValueWith: pathValue,
        newFormLogoUrlValue: watch("logoUrl"),
        formErrors: errors,
        logoUrlFieldError: errors.logoUrl,
        isDirty: formState.isDirty,
        dirtyFields: formState.dirtyFields,
        newPreviewKey: previewKey + 1,
      });
      
      // Manual trigger call after setValue
      const timeoutId = setTimeout(async () => {
        logWithTimestamp('Manual trigger call for logoUrl validation');
        const isValid = await trigger("logoUrl");
        logWithTimestamp('Manual trigger result:', {
          isValid: isValid,
          currentLogoUrlValue: watch("logoUrl"),
          logoUrlFieldError: errors.logoUrl,
          formIsValid: formState.isValid,
        });
      }, 100);
      
    } else if (filePath === null) {
      // Handle clearing the logo
      setValue("logoUrl", "", { 
        shouldValidate: true, 
        shouldDirty: true,
        shouldTouch: true
      });
      setPreviewKey(prev => prev + 1);
    }
  }, [setValue, trigger, watch, errors, formState, previewKey, logWithTimestamp]);

  // Enhanced logoUrl field validation watcher - Fixed dependency array
  React.useEffect(() => {
    logWithTimestamp('Partner NEW form - LogoUrl field validation watcher triggered:', {
      logoUrl: logoUrl,
      logoUrlType: typeof logoUrl,
      logoUrlLength: logoUrl?.length,
      logoUrlTrimmed: logoUrl?.trim(),
      isEmpty: !logoUrl || logoUrl.trim() === '',
      formErrors: errors,
      logoUrlFieldError: errors.logoUrl,
      hasLogoUrlValidationError: !!errors.logoUrl,
      formIsValid: formState.isValid,
      formIsDirty: formState.isDirty,
      dirtyFields: formState.dirtyFields,
      previewKey: previewKey,
    });
    
    // Conditional guard: Force preview re-render when logo URL changes
    if (logoUrl && logoUrl.trim() !== '') {
      logWithTimestamp('Logo URL changed - forcing preview update');
      setPreviewKey(prev => prev + 1);
      setLastImageUpdate(new Date());
    }
    
    // Conditional guard: Force re-validation if we have a valid logo but still have an error
    if (logoUrl && logoUrl.trim() !== '' && errors.logoUrl) {
      logWithTimestamp('Detected valid logoUrl with validation error, triggering re-validation');
      const timeoutId = setTimeout(() => {
        trigger("logoUrl");
      }, 100);
      return () => clearTimeout(timeoutId);
    }
    
    // Conditional guard: Force validation after setValue to ensure form state is updated
    if (logoUrl && logoUrl.trim() !== '') {
      const timeoutId = setTimeout(async () => {
        logWithTimestamp('Forcing validation after logoUrl change');
        const isValid = await trigger("logoUrl");
        logWithTimestamp('Validation result:', {
          isValid: isValid,
          currentLogoUrlValue: logoUrl,
          logoUrlFieldError: errors.logoUrl,
        });
      }, 200);
      return () => clearTimeout(timeoutId);
    }
  }, [logoUrl, errors.logoUrl, formState.isValid, trigger, logWithTimestamp]); // Fixed: removed previewKey and state setters from deps to prevent loop

  // Custom event listener for crosscutting image updates - Fixed dependency array
  React.useEffect(() => {
    const handleImageUpdated = (event: CustomEvent) => {
      const { filePath: eventFilePath, timestamp, component } = event.detail || {};
      
      logWithTimestamp('Received imageUpdated event:', {
        eventFilePath: eventFilePath,
        currentLogoUrl: logoUrl,
        eventTimestamp: timestamp,
        eventComponent: component,
        shouldUpdate: eventFilePath && (eventFilePath === logoUrl || component === 'BulletproofImageUpload'),
      });
      
      // Conditional guard: Check if this event is for our current logo or if it's a new upload
      if (eventFilePath && (eventFilePath === logoUrl || component === 'BulletproofImageUpload')) {
        logWithTimestamp('Event matches current context - forcing form and preview update');
        
        // Conditional guard: Update form state if the path is different
        if (eventFilePath !== logoUrl && eventFilePath.trim() !== '') {
          logWithTimestamp('Updating form state from event');
          setValue("logoUrl", eventFilePath, { 
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
          trigger("logoUrl");
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
  }, [logoUrl, setValue, trigger, logWithTimestamp]); // Fixed: removed state setters to prevent loops

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
                      
                      {/* Hidden input for form validation */}
                      <input
                        type="hidden"
                        {...register("logoUrl")}
                      />
                      
                      <BulletproofImageUpload
                        value={logoUrl}
                        onChange={handleLogoChange}
                        placeholder="Upload partner logo - bulletproof processing enabled"
                        className="mb-4"
                        multiple={false}
                        enableProgressiveUpload={true}
                        enableAutoRetry={true}
                        enableClientOptimization={true}
                        maxFileSize={200} // 200MB for bulletproof system
                        onUploadError={(error) => {
                          console.error('❌ DEBUG: Partner NEW form - BulletproofImageUpload error:', error);
                        }}
                        // Enhanced form integration props
                        onFormValueSet={(filePath) => {
                          // This is an additional callback, main logic is in onChange
                          console.log('🔍 DEBUG: Partner NEW form - BulletproofImageUpload onFormValueSet called:', {
                            filePath: filePath,
                            timestamp: new Date().toISOString()
                          });
                        }}
                        retryFormUpdate={true} // Enable retry logic for form value patching
                      />
                      
                      {errors.logoUrl && (
                        <p className="mt-1 text-sm text-red-600">{errors.logoUrl.message}</p>
                      )}
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Bulletproof processing: Logos will be automatically optimized, chunked for large sizes, and retried on failure.
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
                
                <ImagePreview
                  imagePath={logoUrl}
                  alt="Partner logo preview"
                  className="h-32"
                  placeholderIcon={Handshake}
                  placeholderText="Logo preview will appear here"
                  showFileName={true}
                  key={previewKey} // Force re-render when previewKey changes
                  updatedAt={lastImageUpdate} // Cache busting
                  enableEventListening={true} // Enable event listening
                  debugMode={debugMode} // Enhanced debugging
                />

                {/* Debug info panel */}
                {debugMode && (
                  <div className="mt-4 p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs">
                    <div>Logo URL: {logoUrl || 'None'}</div>
                    <div>Preview Key: {previewKey}</div>
                    <div>Last Update: {lastImageUpdate ? lastImageUpdate.toISOString() : 'None'}</div>
                    <div>Form Valid: {formState.isValid ? '✅' : '❌'}</div>
                    <div>Logo Error: {errors.logoUrl ? '❌' : '✅'}</div>
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
