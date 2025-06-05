import { createFileRoute } from "@tanstack/react-router";
import { useState, Fragment, useEffect, useCallback } from "react";
import { Search, Filter, Play, X, Award, User, MapPin, Briefcase, RefreshCw, AlertTriangle } from "lucide-react";
import { useTRPC } from "~/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, Transition } from "@headlessui/react";
import { getCacheBustedImageUrl, isValidImagePath, getImageUrlWithFallback, normalizeImageUrl, getAbsoluteImageUrl } from "~/utils";

export const Route = createFileRoute("/innovators/")({
  component: Innovators,
});

interface InnovatorData {
  id: number;
  name: string;
  role: string;
  impact: string;
  avatar: string;
  hasVideo: boolean;
  videoUrl?: string | null;
  bio?: string | null;
  achievements?: string | null;
  featured: boolean;
  createdAt: Date;
  updatedAt: Date;
  order: number;
}

interface InnovatorModalProps {
  innovator: InnovatorData | null;
  isOpen: boolean;
  onClose: () => void;
}

function InnovatorModal({ innovator, isOpen, onClose }: InnovatorModalProps) {
  const [modalImageError, setModalImageError] = useState(false);
  const [modalImageLoading, setModalImageLoading] = useState(true);
  const [modalRetryCount, setModalRetryCount] = useState(0);
  
  // Reset image states when modal opens with new innovator
  useEffect(() => {
    if (isOpen && innovator) {
      setModalImageError(false);
      setModalImageLoading(true);
      setModalRetryCount(0);
    }
  }, [isOpen, innovator?.id]);
  
  if (!innovator) return null;
  
  // Enhanced image event handlers for modal
  const handleModalImageError = useCallback(() => {
    console.warn(`Modal image load failed for ${innovator.name}:`, innovator.avatar);
    setModalImageError(true);
    setModalImageLoading(false);
    
    // Auto-retry logic for modal images
    if (modalRetryCount < 2) {
      const retryDelay = Math.pow(2, modalRetryCount) * 1000;
      setTimeout(() => {
        setModalRetryCount(prev => prev + 1);
        setModalImageError(false);
        setModalImageLoading(true);
        
        // Force image reload by updating src
        const imgElements = document.querySelectorAll(`img[alt*="${innovator.name}"]`);
        imgElements.forEach(img => {
          const imgEl = img as HTMLImageElement;
          if (imgEl.src.includes(innovator.avatar)) {
            const newSrc = getCacheBustedImageUrl(innovator.avatar, new Date());
            imgEl.src = newSrc;
          }
        });
      }, retryDelay);
    }
  }, [innovator.name, innovator.avatar, modalRetryCount]);

  const handleModalImageLoad = useCallback(() => {
    setModalImageError(false);
    setModalImageLoading(false);
    setModalRetryCount(0);
  }, []);

  const handleModalImageLoadStart = useCallback(() => {
    setModalImageLoading(true);
    setModalImageError(false);
  }, []);

  const handleModalRetry = useCallback(() => {
    setModalRetryCount(prev => prev + 1);
    setModalImageError(false);
    setModalImageLoading(true);
  }, []);
  
  // Parse achievements if they exist
  let achievementsList: string[] = [];
  try {
    if (innovator.achievements) {
      const parsed = JSON.parse(innovator.achievements);
      achievementsList = Array.isArray(parsed) ? parsed : [];
    }
  } catch (error) {
    console.error("Error parsing achievements:", error);
  }

  // Enhanced image URL generation with validation
  const getInnovatorImageUrl = useCallback((path: string) => {
    if (!path || !isValidImagePath(path)) {
      console.warn('Invalid image path for innovator:', path);
      return '';
    }
    return getCacheBustedImageUrl(path, innovator.updatedAt);
  }, [innovator.updatedAt]);

  const innovatorImageUrl = getInnovatorImageUrl(innovator.avatar);

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-background-black bg-opacity-90" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-lg bg-background-black p-8 text-left align-middle transition-all">
                <div className="flex justify-between mb-6">
                  <Dialog.Title
                    as="h3"
                    className="text-3xl font-bold text-text-light"
                  >
                    {innovator.name}
                  </Dialog.Title>
                  <button
                    type="button"
                    className="rounded-full bg-neutral-dark/50 p-2 text-text-light hover:bg-neutral-dark"
                    onClick={onClose}
                  >
                    <X size={24} />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                  <div>
                    {innovator.videoUrl ? (
                      <div className="aspect-video overflow-hidden rounded-lg">
                        <iframe
                          className="h-full w-full"
                          src={innovator.videoUrl}
                          title={`${innovator.name} Video`}
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        ></iframe>
                      </div>
                    ) : (
                      <div className="aspect-video overflow-hidden rounded-lg bg-neutral-dark/20 relative">
                        {modalImageError ? (
                          <div className="h-full w-full flex flex-col items-center justify-center space-y-2">
                            <User className="h-16 w-16 text-text-light/40" />
                            <p className="text-sm text-text-light/60">Image not available</p>
                            {modalRetryCount < 3 && (
                              <button
                                onClick={handleModalRetry}
                                className="text-xs text-blue-400 hover:text-blue-300 flex items-center space-x-1"
                              >
                                <RefreshCw className="h-3 w-3" />
                                <span>Retry ({modalRetryCount}/3)</span>
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="relative h-full w-full">
                            {modalImageLoading && (
                              <div className="absolute inset-0 flex items-center justify-center bg-neutral-dark/20 z-10">
                                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-secondary"></div>
                              </div>
                            )}
                            {innovatorImageUrl && (
                              <img
                                src={innovatorImageUrl}
                                alt={`${innovator.name} - ${innovator.role}`}
                                className={`h-full w-full object-cover transition-opacity duration-300 ${
                                  modalImageLoading ? 'opacity-0' : 'opacity-100'
                                }`}
                                onError={handleModalImageError}
                                onLoad={handleModalImageLoad}
                                onLoadStart={handleModalImageLoadStart}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <div className="mb-4 flex items-center">
                      <div className="mr-4 h-12 w-12 rounded-full overflow-hidden bg-neutral-dark/20 relative">
                        {modalImageError ? (
                          <div className="h-full w-full flex items-center justify-center">
                            <User className="h-6 w-6 text-text-light/40" />
                          </div>
                        ) : (
                          <>
                            {modalImageLoading && (
                              <div className="absolute inset-0 flex items-center justify-center bg-neutral-dark/20 z-10">
                                <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-t-2 border-secondary"></div>
                              </div>
                            )}
                            {innovatorImageUrl && (
                              <img
                                src={innovatorImageUrl}
                                alt={`${innovator.name} avatar`}
                                className={`h-full w-full object-cover transition-opacity duration-300 ${
                                  modalImageLoading ? 'opacity-0' : 'opacity-100'
                                }`}
                                onError={handleModalImageError}
                                onLoad={handleModalImageLoad}
                                onLoadStart={handleModalImageLoadStart}
                              />
                            )}
                          </>
                        )}
                      </div>
                      <div>
                        <p className="text-xl font-bold text-text-light">{innovator.name}</p>
                        <p className="text-secondary">{innovator.role}</p>
                      </div>
                    </div>
                    
                    <div className="mb-6">
                      <h4 className="mb-3 text-xl font-bold text-text-light">About</h4>
                      <p className="text-text-light/80">{innovator.bio || innovator.impact}</p>
                    </div>
                    
                    {achievementsList.length > 0 && (
                      <div>
                        <h4 className="mb-3 flex items-center text-xl font-bold text-text-light">
                          <Award size={20} className="mr-2 text-secondary" />
                          Achievements
                        </h4>
                        <ul className="space-y-2">
                          {achievementsList.map((achievement, index) => (
                            <li key={index} className="flex items-start text-text-light/80">
                              <span className="mr-2 text-secondary">•</span>
                              {achievement}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

function Innovators() {
  const [searchTerm, setSearchTerm] = useState("");
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [hasVideoOnly, setHasVideoOnly] = useState(false);
  const [selectedInnovator, setSelectedInnovator] = useState<InnovatorData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  const [imageLoading, setImageLoading] = useState<Set<number>>(new Set());
  const [imageRetryCount, setImageRetryCount] = useState<Map<number, number>>(new Map());
  const trpc = useTRPC();
  
  // Enhanced image event handlers with retry logic
  const handleImageError = useCallback((innovatorId: number, imagePath: string) => {
    console.warn(`Image load failed for innovator ${innovatorId}:`, imagePath);
    
    setImageErrors(prev => new Set(prev).add(innovatorId));
    setImageLoading(prev => {
      const newSet = new Set(prev);
      newSet.delete(innovatorId);
      return newSet;
    });
    
    // Enhanced auto-retry logic with better URL generation
    const currentRetryCount = imageRetryCount.get(innovatorId) || 0;
    if (currentRetryCount < 2) {
      const retryDelay = Math.pow(2, currentRetryCount) * 1000; // Exponential backoff
      
      console.log(`Innovators page - Auto-retry scheduled for innovator ${innovatorId} in ${retryDelay}ms`, {
        currentRetryCount,
        imagePath,
      });
      
      setTimeout(() => {
        setImageRetryCount(prev => new Map(prev).set(innovatorId, currentRetryCount + 1));
        setImageErrors(prev => {
          const newSet = new Set(prev);
          newSet.delete(innovatorId);
          return newSet;
        });
        setImageLoading(prev => new Set(prev).add(innovatorId));
        
        // Force image reload by updating src with enhanced cache-busting
        const imgElement = document.querySelector(`img[data-innovator-id="${innovatorId}"]`) as HTMLImageElement;
        if (imgElement && imagePath) {
          const newUrl = getCacheBustedImageUrl(imagePath, new Date());
          const normalizedUrl = normalizeImageUrl(newUrl);
          
          console.log('Innovators page - Forcing image reload with new URL:', {
            innovatorId,
            oldSrc: imgElement.src,
            newUrl: normalizedUrl,
          });
          
          imgElement.src = normalizedUrl;
        }
      }, retryDelay);
    } else {
      console.log(`Innovators page - Max retry attempts reached for innovator ${innovatorId}`);
    }
  }, [imageRetryCount]);

  const handleImageLoad = useCallback((innovatorId: number) => {
    setImageErrors(prev => {
      const newSet = new Set(prev);
      newSet.delete(innovatorId);
      return newSet;
    });
    setImageLoading(prev => {
      const newSet = new Set(prev);
      newSet.delete(innovatorId);
      return newSet;
    });
    setImageRetryCount(prev => {
      const newMap = new Map(prev);
      newMap.delete(innovatorId);
      return newMap;
    });
  }, []);

  const handleImageLoadStart = useCallback((innovatorId: number) => {
    setImageLoading(prev => new Set(prev).add(innovatorId));
  }, []);

  const handleManualRetry = useCallback((innovatorId: number, imagePath: string) => {
    const currentRetryCount = imageRetryCount.get(innovatorId) || 0;
    console.log(`Innovators page - Manual retry for innovator ${innovatorId}`, { currentRetryCount });
    
    setImageRetryCount(prev => new Map(prev).set(innovatorId, currentRetryCount + 1));
    setImageErrors(prev => {
      const newSet = new Set(prev);
      newSet.delete(innovatorId);
      return newSet;
    });
    setImageLoading(prev => new Set(prev).add(innovatorId));
    
    // Force image reload with enhanced URL generation
    const imgElement = document.querySelector(`img[data-innovator-id="${innovatorId}"]`) as HTMLImageElement;
    if (imgElement) {
      const newUrl = getCacheBustedImageUrl(imagePath, new Date());
      const normalizedUrl = normalizeImageUrl(newUrl);
      
      console.log('Innovators page - Manual retry with new URL:', {
        innovatorId,
        newUrl: normalizedUrl,
      });
      
      imgElement.src = normalizedUrl;
    }
  }, [imageRetryCount]);
  
  // Fetch innovators using tRPC
  const innovatorsQuery = useQuery(
    trpc.getInnovators.queryOptions(
      {
        limit: 50,
        featuredOnly,
        hasVideo: hasVideoOnly || undefined,
        searchTerm: searchTerm || undefined,
      },
      {
        refetchOnWindowFocus: false,
        staleTime: 1000 * 60 * 5, // 5 minutes
      }
    )
  );
  
  // Handle innovator click
  const handleInnovatorClick = (innovator: InnovatorData) => {
    setSelectedInnovator(innovator);
    setIsModalOpen(true);
  };
  
  // Close the modal
  const closeModal = () => {
    setIsModalOpen(false);
  };

  // Enhanced image URL generation with validation and absolute URL support
  const getInnovatorImageUrl = useCallback((innovator: InnovatorData) => {
    if (!innovator.avatar || !isValidImagePath(innovator.avatar)) {
      console.warn('Invalid avatar path for innovator:', innovator.name, innovator.avatar);
      return '';
    }
    
    try {
      const url = getCacheBustedImageUrl(innovator.avatar, innovator.updatedAt);
      const normalizedUrl = normalizeImageUrl(url);
      
      console.log('🔍 Innovators page - Generated image URL:', {
        innovatorName: innovator.name,
        avatarPath: innovator.avatar,
        generatedUrl: url,
        normalizedUrl: normalizedUrl,
        updatedAt: innovator.updatedAt,
      });
      
      return normalizedUrl;
    } catch (error) {
      console.warn('Error generating innovator image URL:', error, { innovator: innovator.name });
      
      // Fallback to absolute URL
      try {
        return getAbsoluteImageUrl(innovator.avatar);
      } catch (fallbackError) {
        console.warn('Fallback URL generation failed for innovator:', innovator.name, fallbackError);
        return '';
      }
    }
  }, []);

  // Sort innovators by order if data is available
  const sortedInnovators = innovatorsQuery.data?.innovators.slice().sort((a, b) => a.order - b.order);

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-black pt-24">
      {/* Hero Section */}
      <section className="section-padding">
        <div className="mx-auto max-w-7xl container-padding">
          <div className="text-center mb-16">
            <h1 className="mb-8 text-6xl font-extrabold leading-tight text-text-dark dark:text-text-light md:text-7xl">
              Our <span className="bg-gradient-to-r from-secondary to-accent bg-clip-text text-transparent">Innovators</span>
            </h1>
            <p className="mx-auto max-w-3xl text-xl font-light text-text-dark/80 dark:text-text-light/80 md:text-2xl">
              Meet the brilliant minds from around the world who are transforming how we approach humanity's most pressing challenges.
            </p>
          </div>
        </div>
      </section>

      {/* Search and Filters */}
      <section className="section-padding bg-neutral-light/20 dark:bg-neutral-dark/20">
        <div className="mx-auto max-w-7xl container-padding">
          {/* Search Bar */}
          <div className="mb-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-dark/40 dark:text-text-light/40" />
              <input
                type="text"
                placeholder="Search innovators by name, role, or expertise..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-full border-0 bg-background-light dark:bg-background-black py-4 pl-12 pr-6 text-text-dark dark:text-text-light placeholder-text-dark/40 dark:placeholder-text-light/40 shadow-sm focus:ring-2 focus:ring-secondary"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={featuredOnly}
                onChange={(e) => setFeaturedOnly(e.target.checked)}
                className="mr-2 rounded border-gray-300 text-secondary focus:ring-secondary"
              />
              <span className="text-text-dark dark:text-text-light">Featured Innovators Only</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={hasVideoOnly}
                onChange={(e) => setHasVideoOnly(e.target.checked)}
                className="mr-2 rounded border-gray-300 text-secondary focus:ring-secondary"
              />
              <span className="text-text-dark dark:text-text-light">Has Video Content</span>
            </label>
            
            <button
              onClick={() => {
                setSearchTerm("");
                setFeaturedOnly(false);
                setHasVideoOnly(false);
              }}
              className="rounded-lg bg-secondary px-4 py-2 text-white transition-colors hover:bg-secondary-light"
            >
              Clear Filters
            </button>
          </div>

          {/* Results Count */}
          <div className="mt-6 text-text-dark/60 dark:text-text-light/60">
            {innovatorsQuery.data && (
              <>Showing {innovatorsQuery.data.innovators.length} innovators</>
            )}
          </div>
        </div>
      </section>

      {/* Innovators Grid */}
      <section className="section-padding">
        <div className="mx-auto max-w-7xl container-padding">
          {innovatorsQuery.isLoading ? (
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div 
                  key={index} 
                  className="animate-pulse rounded-lg bg-neutral-light/20 dark:bg-neutral-dark/20 h-[400px]"
                ></div>
              ))}
            </div>
          ) : innovatorsQuery.isError ? (
            <div className="text-center py-16">
              <AlertTriangle className="mx-auto h-16 w-16 text-red-500 mb-4" />
              <h3 className="text-2xl font-bold text-text-dark dark:text-text-light mb-2">Error loading innovators</h3>
              <p className="text-text-dark/60 dark:text-text-light/60">{innovatorsQuery.error.message}</p>
              <button
                onClick={() => innovatorsQuery.refetch()}
                className="mt-4 inline-flex items-center space-x-2 px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary-light"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Retry</span>
              </button>
            </div>
          ) : sortedInnovators?.length === 0 ? (
            <div className="text-center py-16">
              <User className="mx-auto h-16 w-16 text-text-dark/40 dark:text-text-light/40 mb-4" />
              <h3 className="text-2xl font-bold text-text-dark dark:text-text-light mb-2">No innovators found</h3>
              <p className="text-text-dark/60 dark:text-text-light/60">Try adjusting your search criteria or filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {sortedInnovators?.map((innovator) => {
                const innovatorImageUrl = getInnovatorImageUrl(innovator);
                const hasImageError = imageErrors.has(innovator.id);
                const isImageLoading = imageLoading.has(innovator.id);
                const retryCount = imageRetryCount.get(innovator.id) || 0;
                
                return (
                  <div 
                    key={innovator.id}
                    className="group cursor-pointer overflow-hidden rounded-lg bg-background-light dark:bg-neutral-dark/30 transition-all duration-300 hover:-translate-y-2 hover:shadow-lg"
                    onClick={() => handleInnovatorClick(innovator)}
                  >
                    {/* Innovator Image */}
                    <div className="aspect-[3/4] relative overflow-hidden bg-neutral-light/10 dark:bg-neutral-dark/10">
                      {hasImageError ? (
                        <div className="h-full w-full flex flex-col items-center justify-center bg-neutral-light/20 dark:bg-neutral-dark/20 space-y-2">
                          <User className="h-16 w-16 text-text-dark/40 dark:text-text-light/40" />
                          <p className="text-xs text-text-dark/60 dark:text-text-light/60 text-center px-2">
                            Image not available
                          </p>
                          {retryCount < 3 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleManualRetry(innovator.id, innovator.avatar);
                              }}
                              className="text-xs text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                            >
                              <RefreshCw className="h-3 w-3" />
                              <span>Retry ({retryCount}/3)</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="relative h-full w-full">
                          {isImageLoading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-neutral-light/20 dark:bg-neutral-dark/20 z-10">
                              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-secondary"></div>
                            </div>
                          )}
                          {innovatorImageUrl && (
                            <img
                              data-innovator-id={innovator.id}
                              src={innovatorImageUrl}
                              alt={`${innovator.name} - ${innovator.role}`}
                              className={`h-full w-full object-cover transition-opacity duration-300 ${
                                isImageLoading ? 'opacity-0' : 'opacity-100'
                              }`}
                              onError={() => handleImageError(innovator.id, innovator.avatar)}
                              onLoad={() => handleImageLoad(innovator.id)}
                              onLoadStart={() => handleImageLoadStart(innovator.id)}
                              loading="lazy"
                            />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-background-black via-background-black/40 to-transparent"></div>
                        </div>
                      )}
                      
                      {/* Featured Badge */}
                      {innovator.featured && (
                        <div className="absolute top-4 right-4">
                          <span className="inline-block rounded-full bg-secondary px-3 py-1 text-xs font-medium text-white">
                            Featured
                          </span>
                        </div>
                      )}
                      
                      {/* Play button for videos */}
                      {innovator.hasVideo && !hasImageError && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                          <button className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-white transition-transform hover:scale-110">
                            <Play size={32} className="ml-1" />
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {/* Innovator Content */}
                    <div className="p-6">
                      <h3 className="mb-2 text-xl font-bold text-text-dark dark:text-text-light group-hover:text-secondary transition-colors">
                        {innovator.name}
                      </h3>
                      <div className="mb-3 flex items-center text-sm text-secondary">
                        <Briefcase className="mr-1 h-4 w-4" />
                        <span>{innovator.role}</span>
                      </div>
                      <p className="text-sm text-text-dark/80 dark:text-text-light/80 line-clamp-3">
                        {innovator.impact}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Call to Action */}
      <section className="section-padding bg-neutral-light/20 dark:bg-neutral-dark/20">
        <div className="mx-auto max-w-7xl container-padding">
          <div className="text-center">
            <h2 className="mb-6 text-4xl font-bold text-text-dark dark:text-text-light">
              Join Our Network of Innovators
            </h2>
            <p className="mb-8 text-xl text-text-dark/80 dark:text-text-light/80">
              Are you working on breakthrough solutions? Apply to join our global community of changemakers.
            </p>
            <a
              href="/apply"
              className="inline-block rounded-full bg-secondary px-8 py-4 text-lg font-medium text-white transition-all hover:bg-secondary-light hover:scale-105"
            >
              Apply as Innovator
            </a>
          </div>
        </div>
      </section>
      
      {/* Innovator Modal */}
      <InnovatorModal 
        innovator={selectedInnovator} 
        isOpen={isModalOpen} 
        onClose={closeModal} 
      />
    </div>
  );
}
