import { useState, useCallback } from "react";
import toast from "react-hot-toast";
import { Building } from "lucide-react";
import { useTRPC } from "~/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { getCacheBustedImageUrl, isValidImagePath, normalizeImageUrl, getAbsoluteImageUrl } from "~/utils";

export default function AboutSection() {
  const [tRPCError, setTRPCError] = useState<string | null>(null);
  const trpc = useTRPC();
  
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

  // Memoized click handlers
  const handleVideoClick = useCallback(() => {
    toast.info("Video preview coming soon! Check back later for our story.");
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
            Who We Are
          </h2>
          <p className="text-xl font-light text-text-dark/80 dark:text-text-light/80 md:text-2xl">
            Quantum Alliance bridges innovation gaps by connecting frontier technology with real-world problems.
          </p>
        </div>

        {/* Main content in a full-width layout */}
        <div className="mb-24 grid grid-cols-1 gap-24 lg:grid-cols-2">
          {/* Left column: Mission & Vision */}
          <div>
            <div className="mb-12">
              <h3 className="mb-6 text-3xl font-bold text-text-dark dark:text-text-light">
                Our Mission
              </h3>
              <p className="mb-8 text-lg text-text-dark/80 dark:text-text-light/80">
                We create structured challenges to address global needs in climate, digital infrastructure, and more. Our approach connects innovators directly with the organizations and governments that need their solutions most.
              </p>
              <p className="text-lg text-text-dark/80 dark:text-text-light/80">
                By focusing on real-world implementation and scale, we ensure that breakthrough technologies don't just remain interesting ideas, but become transformative solutions deployed where they're needed most.
              </p>
            </div>

            <div>
              <h3 className="mb-6 text-3xl font-bold text-text-dark dark:text-text-light">
                Our Approach
              </h3>
              <ul className="space-y-4 text-lg text-text-dark/80 dark:text-text-light/80">
                <li className="flex items-start">
                  <span className="mr-4 mt-1 text-xl font-bold text-secondary">01</span>
                  <span>Identify critical infrastructure challenges with global partners</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-4 mt-1 text-xl font-bold text-secondary">02</span>
                  <span>Source innovative solutions from our global network</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-4 mt-1 text-xl font-bold text-secondary">03</span>
                  <span>Structure challenges with clear objectives and incentives</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-4 mt-1 text-xl font-bold text-secondary">04</span>
                  <span>Support pilot implementations in real-world environments</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-4 mt-1 text-xl font-bold text-secondary">05</span>
                  <span>Scale successful solutions through our global network</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Right column: Video and Partners */}
          <div>
            {/* Video Section */}
            <div className="mb-12 aspect-video overflow-hidden rounded-lg">
              <div className="relative h-full w-full bg-[url('https://images.unsplash.com/photo-1551434678-e076c223a692?ixlib=rb-1.2.1&auto=format&fit=crop&w=2850&q=80')] bg-cover bg-center">
                <div className="absolute inset-0 bg-gradient-to-t from-background-black to-transparent opacity-60"></div>
                <div className="flex h-full w-full items-center justify-center">
                  <button 
                    onClick={handleVideoClick}
                    className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary text-white transition-transform hover:scale-110"
                    aria-label="Play video about Quantum Alliance's story"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  </button>
                </div>
                <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-background-black to-transparent p-6">
                  <h4 className="text-xl font-bold text-text-light">
                    Our Story: From Concept to Global Impact
                  </h4>
                  <p className="mt-2 text-sm text-text-light/80">
                    Learn how Quantum Alliance is transforming the way we solve global challenges through structured innovation.
                  </p>
                </div>
              </div>
            </div>

            {/* Partners Section */}
            <div>
              <h3 className="mb-6 text-2xl font-bold text-text-dark dark:text-text-light">
                Our Partners
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
                  className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 items-center justify-items-center"
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
                          <div className="h-[60px] w-24 bg-gray-100 dark:bg-gray-800 rounded border flex flex-col items-center justify-center space-y-1">
                            <Building className="h-6 w-6 text-gray-400" />
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
                                  className={`max-h-[60px] max-w-full w-auto h-auto object-contain grayscale hover:grayscale-0 transition-all ${
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
                                className={`max-h-[60px] max-w-full w-auto h-auto object-contain grayscale transition-all ${
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
                  <p>No partners available at the moment.</p>
                  <p className="text-sm mt-1">Check back soon for updates.</p>
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
            Explore Our Process
          </a>
        </div>
      </div>
    </section>
  );
}
