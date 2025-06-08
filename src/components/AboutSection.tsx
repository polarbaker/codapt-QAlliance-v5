import { useState, useCallback } from "react";
import { Building } from "lucide-react";
import { useTRPC } from "~/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { getCacheBustedImageUrl, isValidImagePath, normalizeImageUrl, getAbsoluteImageUrl } from "~/utils";
import { useBulkSiteContentText } from "~/hooks/useSiteContentText";

export default function AboutSection() {
  const [tRPCError, setTRPCError] = useState<string | null>(null);
  const trpc = useTRPC();
  
  // Fetch about section text content
  const { texts: aboutTexts } = useBulkSiteContentText([
    'about_title',
    'about_tagline',
    'about_mission_title',
    'about_mission_paragraph1',
    'about_mission_paragraph2',
    'about_approach_title',
    'about_approach_step1',
    'about_approach_step2',
    'about_approach_step3',
    'about_approach_step4',
    'about_approach_step5',
    'about_partners_title',
    'about_no_partners_message1',
    'about_no_partners_message2',
    'about_button_text',
  ]);
  
  // Create query options with error handling
  let partnersQueryOptions;
  try {
    partnersQueryOptions = trpc.getPartners.queryOptions();
  } catch (error) {
    console.error('tRPC query options error:', error);
    if (!tRPCError) {
      setTRPCError(error instanceof Error ? error.message : 'Failed to initialize tRPC query');
    }
  }
  
  // Fetch partners data using the correct pattern with error handling
  const { data: partnersData, isLoading: isLoadingPartners, error: partnersError } = useQuery({
    ...partnersQueryOptions,
    enabled: !!partnersQueryOptions && !tRPCError,
    retry: (failureCount, error) => {
      // Retry up to 3 times for network errors, but not for tRPC client errors
      if (error.message.includes('tRPC procedure') || error.message.includes('not found')) {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  const [imageLoading, setImageLoading] = useState<Set<number>>(new Set());
  const [imageRetryCount, setImageRetryCount] = useState<Map<number, number>>(new Map());

  // Enhanced image URL generation for partner logos
  const getPartnerLogoUrl = useCallback((partner: any) => {
    if (!partner.logoUrl || !isValidImagePath(partner.logoUrl)) {
      console.warn('Invalid logo URL for partner:', partner.name, partner.logoUrl);
      return '';
    }
    
    try {
      const url = getCacheBustedImageUrl(partner.logoUrl, partner.updatedAt);
      const normalizedUrl = normalizeImageUrl(url);
      
      console.log('🔍 AboutSection - Generated partner logo URL:', {
        partnerName: partner.name,
        logoUrl: partner.logoUrl,
        generatedUrl: url,
        normalizedUrl: normalizedUrl,
        updatedAt: partner.updatedAt,
      });
      
      return normalizedUrl;
    } catch (error) {
      console.warn('Error generating partner logo URL:', error, { partner: partner.name });
      
      // Fallback to absolute URL
      try {
        return getAbsoluteImageUrl(partner.logoUrl);
      } catch (fallbackError) {
        console.warn('Fallback URL generation failed for partner:', partner.name, fallbackError);
        return '';
      }
    }
  }, []);

  // Enhanced image error handling with retry logic
  const handleImageError = useCallback((partnerId: number, logoUrl: string) => {
    console.warn(`Partner logo load failed for ${partnerId}:`, logoUrl);
    
    setImageErrors(prev => new Set(prev).add(partnerId));
    setImageLoading(prev => {
      const newSet = new Set(prev);
      newSet.delete(partnerId);
      return newSet;
    });
    
    // Auto-retry logic with exponential backoff
    const currentRetryCount = imageRetryCount.get(partnerId) || 0;
    if (currentRetryCount < 2) {
      const retryDelay = Math.pow(2, currentRetryCount) * 1000; // Exponential backoff
      
      console.log(`AboutSection - Auto-retry scheduled for partner ${partnerId} in ${retryDelay}ms`, {
        currentRetryCount,
        logoUrl,
      });
      
      setTimeout(() => {
        setImageRetryCount(prev => new Map(prev).set(partnerId, currentRetryCount + 1));
        setImageErrors(prev => {
          const newSet = new Set(prev);
          newSet.delete(partnerId);
          return newSet;
        });
        setImageLoading(prev => new Set(prev).add(partnerId));
        
        // Force image reload by updating src with enhanced cache-busting
        const imgElement = document.querySelector(`img[data-partner-id="${partnerId}"]`) as HTMLImageElement;
        if (imgElement && logoUrl) {
          const newUrl = getCacheBustedImageUrl(logoUrl, new Date());
          const normalizedUrl = normalizeImageUrl(newUrl);
          
          console.log('AboutSection - Forcing partner logo reload with new URL:', {
            partnerId,
            oldSrc: imgElement.src,
            newUrl: normalizedUrl,
          });
          
          imgElement.src = normalizedUrl;
        }
      }, retryDelay);
    } else {
      console.log(`AboutSection - Max retry attempts reached for partner ${partnerId}`);
    }
  }, [imageRetryCount]);

  const handleImageLoad = useCallback((partnerId: number) => {
    setImageErrors(prev => {
      const newSet = new Set(prev);
      newSet.delete(partnerId);
      return newSet;
    });
    setImageLoading(prev => {
      const newSet = new Set(prev);
      newSet.delete(partnerId);
      return newSet;
    });
    setImageRetryCount(prev => {
      const newMap = new Map(prev);
      newMap.delete(partnerId);
      return newMap;
    });
  }, []);

  const handleImageLoadStart = useCallback((partnerId: number) => {
    setImageLoading(prev => new Set(prev).add(partnerId));
  }, []);

  const handleExploreClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    document.getElementById('pipeline')?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  return (
    <section
      id="about"
      className="section-padding relative overflow-hidden bg-background-light dark:bg-background-black"
    >
      <div className="mx-auto max-w-7xl container-padding">
        {/* Section header */}
        <div className="mb-24 max-w-3xl">
          <h2 className="mb-8 text-5xl font-extrabold leading-tight text-text-dark dark:text-text-light md:text-6xl">
            {aboutTexts.about_title}
          </h2>
          <p className="text-xl font-light text-text-dark/80 dark:text-text-light/80 md:text-2xl">
            {aboutTexts.about_tagline}
          </p>
        </div>

        {/* Main content in a restructured layout without video */}
        <div className="mb-24 grid grid-cols-1 gap-24 lg:grid-cols-3">
          {/* Left column: Mission & Vision - expanded to take more space */}
          <div className="lg:col-span-2">
            <div className="mb-12">
              <h3 className="mb-6 text-3xl font-bold text-text-dark dark:text-text-light">
                {aboutTexts.about_mission_title}
              </h3>
              <p className="mb-8 text-lg text-text-dark/80 dark:text-text-light/80">
                {aboutTexts.about_mission_paragraph1}
              </p>
              <p className="text-lg text-text-dark/80 dark:text-text-light/80">
                {aboutTexts.about_mission_paragraph2}
              </p>
            </div>

            <div>
              <h3 className="mb-6 text-3xl font-bold text-text-dark dark:text-text-light">
                {aboutTexts.about_approach_title}
              </h3>
              <ul className="space-y-4 text-lg text-text-dark/80 dark:text-text-light/80">
                <li className="flex items-start">
                  <span className="mr-4 mt-1 text-xl font-bold text-secondary">01</span>
                  <span>{aboutTexts.about_approach_step1}</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-4 mt-1 text-xl font-bold text-secondary">02</span>
                  <span>{aboutTexts.about_approach_step2}</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-4 mt-1 text-xl font-bold text-secondary">03</span>
                  <span>{aboutTexts.about_approach_step3}</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-4 mt-1 text-xl font-bold text-secondary">04</span>
                  <span>{aboutTexts.about_approach_step4}</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-4 mt-1 text-xl font-bold text-secondary">05</span>
                  <span>{aboutTexts.about_approach_step5}</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Right column: Partners Section - expanded */}
          <div className="lg:col-span-1">
            <div>
              <h3 className="mb-8 text-3xl font-bold text-text-dark dark:text-text-light">
                {aboutTexts.about_partners_title}
              </h3>
              {tRPCError ? (
                <div className="rounded-lg bg-yellow-50 p-4 text-center text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400">
                  <p className="font-medium">Service temporarily unavailable</p>
                  <p className="text-sm mt-1">We're working to restore full functionality.</p>
                </div>
              ) : isLoadingPartners ? (
                <div className="flex justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                </div>
              ) : partnersError ? (
                <div className="rounded-lg bg-red-50 p-4 text-center text-red-700 dark:bg-red-900/20 dark:text-red-400">
                  <p className="font-medium">Failed to load partners</p>
                  <p className="text-sm mt-1">
                    {partnersError.message.includes('tRPC procedure') 
                      ? 'Service configuration issue - please contact support.'
                      : 'Please try again later.'}
                  </p>
                </div>
              ) : partnersData?.partners && partnersData.partners.length > 0 ? (
                <div 
                  className="grid grid-cols-1 sm:grid-cols-2 gap-8 items-center justify-items-center"
                  aria-label="Partner Logos"
                >
                  {partnersData.partners.map((partner) => {
                    const partnerLogoUrl = getPartnerLogoUrl(partner);
                    const hasImageError = imageErrors.has(partner.id);
                    const isImageLoading = imageLoading.has(partner.id);
                    const retryCount = imageRetryCount.get(partner.id) || 0;
                    
                    return (
                      <div key={partner.id} className="flex items-center justify-center relative">
                        {hasImageError || !partnerLogoUrl ? (
                          <div className="h-[80px] w-32 bg-gray-100 dark:bg-gray-800 rounded border flex flex-col items-center justify-center space-y-1">
                            <Building className="h-8 w-8 text-gray-400" />
                            {retryCount < 3 && partnerLogoUrl && (
                              <button
                                onClick={() => {
                                  const currentRetryCount = imageRetryCount.get(partner.id) || 0;
                                  setImageRetryCount(prev => new Map(prev).set(partner.id, currentRetryCount + 1));
                                  setImageErrors(prev => {
                                    const newSet = new Set(prev);
                                    newSet.delete(partner.id);
                                    return newSet;
                                  });
                                  setImageLoading(prev => new Set(prev).add(partner.id));
                                }}
                                className="text-xs text-blue-600 hover:text-blue-700"
                              >
                                Retry
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="relative">
                            {isImageLoading && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                              </div>
                            )}
                            {partner.websiteUrl ? (
                              <a 
                                href={partner.websiteUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="transition-all hover:opacity-80 hover:scale-105 block"
                                title={`Visit ${partner.name} website`}
                              >
                                <img 
                                  data-partner-id={partner.id}
                                  src={partnerLogoUrl} 
                                  alt={partner.altText} 
                                  className={`max-h-[80px] max-w-full w-auto h-auto object-contain grayscale hover:grayscale-0 transition-all ${
                                    isImageLoading ? 'opacity-0' : 'opacity-100'
                                  }`}
                                  onError={() => handleImageError(partner.id, partner.logoUrl)}
                                  onLoad={() => handleImageLoad(partner.id)}
                                  onLoadStart={() => handleImageLoadStart(partner.id)}
                                  loading="lazy"
                                  crossOrigin="anonymous"
                                />
                              </a>
                            ) : (
                              <img 
                                data-partner-id={partner.id}
                                src={partnerLogoUrl} 
                                alt={partner.altText} 
                                className={`max-h-[80px] max-w-full w-auto h-auto object-contain grayscale transition-all ${
                                  isImageLoading ? 'opacity-0' : 'opacity-100'
                                }`}
                                onError={() => handleImageError(partner.id, partner.logoUrl)}
                                onLoad={() => handleImageLoad(partner.id)}
                                onLoadStart={() => handleImageLoadStart(partner.id)}
                                loading="lazy"
                                crossOrigin="anonymous"
                              />
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center text-text-dark/60 dark:text-text-light/60">
                  <Building className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>{aboutTexts.about_no_partners_message1}</p>
                  <p className="text-sm mt-1">{aboutTexts.about_no_partners_message2}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Call to action */}
        <div className="flex justify-center">
          <a
            href="#pipeline"
            className="inline-block rounded-full bg-secondary px-8 py-4 text-lg font-medium text-white transition-all hover:bg-secondary-light"
            onClick={handleExploreClick}
          >
            {aboutTexts.about_button_text}
          </a>
        </div>
      </div>
    </section>
  );
}
