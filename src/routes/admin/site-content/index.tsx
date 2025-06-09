import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUserStore } from "~/stores/userStore";
import { useTRPC } from "~/trpc/react";
import { SiteContentImageUpload } from "~/components/ui/SiteContentImageUpload";
import { SiteContentTextEditor } from "~/components/ui/SiteContentTextEditor";
import { SITE_CONTENT_TEXT_TYPES, SITE_CONTENT_TEXT_LABELS, SITE_CONTENT_IMAGE_CONTEXT } from "~/constants/validation";
import { 
  Monitor, 
  Image as ImageIcon, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  Info,
  Settings,
  Upload,
  Eye,
  Clock,
  Type,
  Edit,
} from "lucide-react";
import toast from "react-hot-toast";

export const Route = createFileRoute("/admin/site-content/")({
  component: SiteContentPage,
});

function SiteContentPage() {
  const { adminToken } = useUserStore();
  const [refreshKey, setRefreshKey] = useState(0);
  const trpc = useTRPC();

  // Fetch site content images list
  const siteContentQuery = useQuery(
    trpc.listSiteContentImages.queryOptions(
      { adminToken: adminToken || "" },
      {
        enabled: !!adminToken,
        refetchOnWindowFocus: false,
        queryKey: [`site-content-images-${refreshKey}`],
        staleTime: 30000, // 30 seconds
      }
    )
  );

  // Fetch site content texts list
  const siteContentTextsQuery = useQuery(
    trpc.listSiteContentTexts.queryOptions(
      { adminToken: adminToken || "" },
      {
        enabled: !!adminToken,
        refetchOnWindowFocus: false,
        queryKey: [`site-content-texts-${refreshKey}`],
        staleTime: 30000, // 30 seconds
      }
    )
  );

  const handleRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
    toast.success("Refreshing content...");
  }, []);

  const handleImageUpdated = useCallback((hasImage: boolean, imageType?: string) => {
    // Auto-refresh the list when any image is updated
    handleRefresh();
    
    // Show success feedback
    if (imageType) {
      const action = hasImage ? "uploaded" : "removed";
      toast.success(`Image ${action} successfully!`);
    }
  }, [handleRefresh]);

  const handleTextUpdated = useCallback((hasCustomText: boolean, contentType?: string) => {
    // Auto-refresh the list when any text is updated
    handleRefresh();
    
    // Show success feedback
    if (contentType) {
      const action = hasCustomText ? "updated" : "reset to default";
      toast.success(`Text ${action} successfully!`);
    }
  }, [handleRefresh]);

  if (!adminToken) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Authentication Required
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Please log in to access site content management.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Monitor className="h-6 w-6 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                  Site Content Management
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Manage text and images displayed throughout the website
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={handleRefresh}
                disabled={siteContentQuery.isLoading || siteContentTextsQuery.isLoading}
                className="inline-flex items-center px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${(siteContentQuery.isLoading || siteContentTextsQuery.isLoading) ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="mb-8">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-800/50 rounded-lg flex items-center justify-center">
                  <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  About Site Content Management
                </h3>
                <p className="text-blue-800 dark:text-blue-200 mb-4">
                  Manage all text and images displayed throughout the main website. Text changes are applied immediately, 
                  while images are automatically optimized for web use and stored securely.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center space-x-2 text-blue-700 dark:text-blue-300">
                    <Upload className="h-4 w-4" />
                    <span>Maximum: 15MB per image</span>
                  </div>
                  <div className="flex items-center space-x-2 text-blue-700 dark:text-blue-300">
                    <ImageIcon className="h-4 w-4" />
                    <span>Formats: JPEG, PNG, WebP, GIF</span>
                  </div>
                  <div className="flex items-center space-x-2 text-blue-700 dark:text-blue-300">
                    <Settings className="h-4 w-4" />
                    <span>Auto-optimized to ≤800KB</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {(siteContentQuery.isLoading || siteContentTextsQuery.isLoading) && (
          <div className="space-y-6">
            {/* Summary Stats Skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
                      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-16"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Content Cards Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                  <div className="animate-pulse">
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                    <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg mb-4"></div>
                    <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error State */}
        {(siteContentQuery.isError || siteContentTextsQuery.isError) && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-red-200 dark:border-red-800 p-6">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-1">
                  Failed to load site content
                </h3>
                <p className="text-red-700 dark:text-red-300 mb-4">
                  {siteContentQuery.error?.message || siteContentTextsQuery.error?.message || "An unexpected error occurred"}
                </p>
                <button
                  onClick={handleRefresh}
                  className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Summary Stats */}
        {(siteContentQuery.data || siteContentTextsQuery.data) && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                    <ImageIcon className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Images</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {siteContentQuery.data?.summary.total || 0}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Images Uploaded</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {siteContentQuery.data?.summary.withImages || 0}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                    <Type className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Text Content</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {siteContentTextsQuery.data?.summary.total || 0}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                    <Edit className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Custom Text</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {siteContentTextsQuery.data?.summary.withCustomText || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Text Content Management Section */}
        <div className="mb-12">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Text Content Management
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Edit all text content displayed throughout the main website. Changes will be reflected immediately on the live site.
            </p>
          </div>

          {/* Loading State for Text Content */}
          {siteContentTextsQuery.isLoading && (
            <div className="space-y-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                  <div className="animate-pulse">
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                    <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg mb-4"></div>
                    <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error State for Text Content */}
          {siteContentTextsQuery.isError && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-red-200 dark:border-red-800 p-6">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                    <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-1">
                    Failed to load text content
                  </h3>
                  <p className="text-red-700 dark:text-red-300 mb-4">
                    {siteContentTextsQuery.error?.message || "An unexpected error occurred"}
                  </p>
                  <button
                    onClick={handleRefresh}
                    className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Text Content Grid */}
          {siteContentTextsQuery.data && (
            <div className="space-y-6">
              {/* Group text content by section */}
              {[
                { title: "Hero Section", prefix: "hero_", description: "Main landing page hero content" },
                { title: "Bold Statement", prefix: "bold_statement_", description: "Statement section content" },
                { title: "About Section", prefix: "about_", description: "About us section content" },
                { title: "Innovation Pipeline", prefix: "pipeline_", description: "Process pipeline content" },
                { title: "Innovators Section", prefix: "innovators_", description: "Hall of innovators content" },
                { title: "Impact Metrics", prefix: "impact_", description: "Impact metrics section content" },
                { title: "Data Insights", prefix: "insights_", description: "Data insights section content" },
                { title: "Challenge CTA", prefix: "challenge_cta_", description: "Challenge call-to-action content" },
                { title: "Community", prefix: "community_", description: "Community engagement content" },
                { title: "Investor Section", prefix: "investor_", description: "Investor engagement content" },
                { title: "Join Us", prefix: "join_", description: "Join us section content" },
                { title: "Social Media", prefix: "social_", description: "Social media section content" },
                { title: "Footer", prefix: "footer_", description: "Footer section content" },
              ].map((section) => {
                const sectionTypes = SITE_CONTENT_TEXT_TYPES.filter(type => type.startsWith(section.prefix));
                
                if (sectionTypes.length === 0) return null;
                
                return (
                  <div key={section.prefix} className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-6">
                    <div className="mb-6">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        {section.title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        {section.description}
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {sectionTypes.map((contentType) => (
                        <SiteContentTextEditor
                          key={contentType}
                          contentType={contentType}
                          onTextUpdated={handleTextUpdated}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Image Content Management Section */}
        <div className="mb-12">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Default Images Management
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Manage the default images displayed throughout the main website. These images appear in key sections and help create the visual identity of your site.
            </p>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-amber-100 dark:bg-amber-800/50 rounded-lg flex items-center justify-center">
                    <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                </div>
                <div className="flex-1 text-sm">
                  <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                    About Default Images
                  </h4>
                  <p className="text-amber-800 dark:text-amber-200 mb-3">
                    When you upload a custom image, it replaces the default stock photo for that section. 
                    If you remove a custom image, the system will automatically fall back to a curated default image.
                  </p>
                  <ul className="text-amber-800 dark:text-amber-200 space-y-1 text-xs">
                    <li>• Each image is automatically optimized for web performance</li>
                    <li>• Images are resized and compressed to ensure fast loading</li>
                    <li>• All images should be high-quality and relevant to the section</li>
                    <li>• Consider how the image will look with text overlays where applicable</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Image Content Grid with Section Grouping */}
          {siteContentQuery.data && (
            <div className="space-y-8">
              {/* Hero & Landing Images */}
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Hero & Landing Page Images
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  These images appear prominently on the homepage and create the first impression for visitors.
                </p>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {siteContentQuery.data.images
                    .filter(image => ['hero_background', 'bold_statement_background'].includes(image.imageType))
                    .map((image) => (
                      <div
                        key={image.imageType}
                        className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
                      >
                        <div className="p-6">
                          <SiteContentImageUpload
                            imageType={image.imageType as any}
                            onImageUpdated={(hasImage) => handleImageUpdated(hasImage, image.imageType)}
                          />
                        </div>
                        
                        {/* Image Status Footer */}
                        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-600">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              {image.hasImage ? (
                                <>
                                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                  <span className="text-sm font-medium text-green-700 dark:text-green-400">
                                    Custom image active
                                  </span>
                                  {image.imageSize && (
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      • {image.imageSize}
                                    </span>
                                  )}
                                </>
                              ) : (
                                <>
                                  <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                                  <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                                    Using default image
                                  </span>
                                </>
                              )}
                            </div>
                            
                            {image.updatedAt && (
                              <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
                                <Clock className="h-3 w-3" />
                                <span>{new Date(image.updatedAt).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>
                          
                          {image.fileName && (
                            <p className="mt-2 text-xs text-gray-600 dark:text-gray-400 truncate">
                              <Eye className="h-3 w-3 inline mr-1" />
                              {image.fileName}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Content Section Images */}
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Content Section Images
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  These images support specific content sections and help illustrate key concepts and stories.
                </p>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {siteContentQuery.data.images
                    .filter(image => ['innovation_pipeline_image', 'impact_metrics_featured_image', 'community_engagement_featured_image'].includes(image.imageType))
                    .map((image) => (
                      <div
                        key={image.imageType}
                        className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
                      >
                        <div className="p-6">
                          <SiteContentImageUpload
                            imageType={image.imageType as any}
                            onImageUpdated={(hasImage) => handleImageUpdated(hasImage, image.imageType)}
                          />
                        </div>
                        
                        {/* Image Status Footer */}
                        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-600">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              {image.hasImage ? (
                                <>
                                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                  <span className="text-sm font-medium text-green-700 dark:text-green-400">
                                    Custom image active
                                  </span>
                                  {image.imageSize && (
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      • {image.imageSize}
                                    </span>
                                  )}
                                </>
                              ) : (
                                <>
                                  <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                                  <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                                    Using default image
                                  </span>
                                </>
                              )}
                            </div>
                            
                            {image.updatedAt && (
                              <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
                                <Clock className="h-3 w-3" />
                                <span>{new Date(image.updatedAt).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>
                          
                          {image.fileName && (
                            <p className="mt-2 text-xs text-gray-600 dark:text-gray-400 truncate">
                              <Eye className="h-3 w-3 inline mr-1" />
                              {image.fileName}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Background Images */}
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Background Images
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  These images appear as subtle backgrounds behind content sections and should not interfere with text readability.
                </p>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {siteContentQuery.data.images
                    .filter(image => ['challenge_cta_background'].includes(image.imageType))
                    .map((image) => (
                      <div
                        key={image.imageType}
                        className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
                      >
                        <div className="p-6">
                          <SiteContentImageUpload
                            imageType={image.imageType as any}
                            onImageUpdated={(hasImage) => handleImageUpdated(hasImage, image.imageType)}
                          />
                        </div>
                        
                        {/* Image Status Footer */}
                        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-600">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              {image.hasImage ? (
                                <>
                                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                  <span className="text-sm font-medium text-green-700 dark:text-green-400">
                                    Custom image active
                                  </span>
                                  {image.imageSize && (
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      • {image.imageSize}
                                    </span>
                                  )}
                                </>
                              ) : (
                                <>
                                  <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                                  <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                                    Using default image
                                  </span>
                                </>
                              )}
                            </div>
                            
                            {image.updatedAt && (
                              <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
                                <Clock className="h-3 w-3" />
                                <span>{new Date(image.updatedAt).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>
                          
                          {image.fileName && (
                            <p className="mt-2 text-xs text-gray-600 dark:text-gray-400 truncate">
                              <Eye className="h-3 w-3 inline mr-1" />
                              {image.fileName}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
