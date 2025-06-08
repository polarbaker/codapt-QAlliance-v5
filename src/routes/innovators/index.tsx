import { createFileRoute } from "@tanstack/react-router";
import { useState, Fragment, useEffect, useCallback, useMemo } from "react";
import { Search, Filter, Play, X, Award, User, MapPin, Briefcase, RefreshCw, AlertTriangle, SortAsc, SortDesc, Grid, List, ChevronDown } from "lucide-react";
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
          <div className="fixed inset-0 bg-background-black/90 backdrop-blur-sm" />
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
              <Dialog.Panel className="w-full max-w-6xl transform overflow-hidden rounded-2xl bg-gradient-to-br from-background-light to-neutral-light/20 dark:from-background-black dark:to-neutral-dark/20 text-left align-middle transition-all shadow-2xl">
                {/* Enhanced Header */}
                <div className="relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-secondary/10 to-accent/10 dark:from-secondary/20 dark:to-accent/20" />
                  <div className="relative px-8 pt-8 pb-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-6">
                        {/* Enhanced Avatar */}
                        <div className="relative h-20 w-20 rounded-full overflow-hidden bg-neutral-light/20 dark:bg-neutral-dark/20 ring-4 ring-white/20 shadow-xl">
                          {modalImageError ? (
                            <div className="h-full w-full flex items-center justify-center">
                              <User className="h-10 w-10 text-text-dark/40 dark:text-text-light/40" />
                            </div>
                          ) : (
                            <div className="relative h-full w-full">
                              {modalImageLoading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-neutral-light/20 dark:bg-neutral-dark/20 z-10">
                                  <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-t-2 border-secondary"></div>
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
                            </div>
                          )}
                          {/* Status indicators */}
                          <div className="absolute -bottom-1 -right-1 flex space-x-1">
                            {innovator.featured && (
                              <div className="h-6 w-6 rounded-full bg-accent text-white flex items-center justify-center text-xs font-bold shadow-lg">
                                ⭐
                              </div>
                            )}
                            {innovator.hasVideo && (
                              <div className="h-6 w-6 rounded-full bg-secondary text-white flex items-center justify-center shadow-lg">
                                <Play size={12} />
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Header Info */}
                        <div>
                          <Dialog.Title
                            as="h3"
                            className="text-4xl font-bold text-text-dark dark:text-text-light mb-2"
                          >
                            {innovator.name}
                          </Dialog.Title>
                          <div className="flex items-center space-x-4 text-lg">
                            <div className="flex items-center text-secondary">
                              <Briefcase className="mr-2 h-5 w-5" />
                              <span className="font-medium">{innovator.role}</span>
                            </div>
                            {innovator.featured && (
                              <span className="inline-flex items-center rounded-full bg-accent/20 px-3 py-1 text-sm font-medium text-accent-dark">
                                Featured Innovator
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Close Button */}
                      <button
                        type="button"
                        className="rounded-full bg-white/10 dark:bg-black/20 p-3 text-text-dark dark:text-text-light hover:bg-white/20 dark:hover:bg-black/30 transition-all hover:scale-110 backdrop-blur-sm shadow-lg"
                        onClick={onClose}
                      >
                        <X size={24} />
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Enhanced Content */}
                <div className="px-8 pb-8">
                  <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                    {/* Left Column: Media */}
                    <div className="space-y-6">
                      {/* Main Media Display */}
                      <div className="relative">
                        {innovator.videoUrl ? (
                          <div className="aspect-video overflow-hidden rounded-xl shadow-xl">
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
                          <div className="aspect-video overflow-hidden rounded-xl bg-neutral-light/10 dark:bg-neutral-dark/10 relative shadow-xl">
                            {modalImageError ? (
                              <div className="h-full w-full flex flex-col items-center justify-center space-y-4 bg-gradient-to-br from-neutral-light/20 to-neutral-light/10 dark:from-neutral-dark/20 dark:to-neutral-dark/10">
                                <User className="h-20 w-20 text-text-dark/40 dark:text-text-light/40" />
                                <div className="text-center">
                                  <p className="text-lg text-text-dark/60 dark:text-text-light/60 mb-2">Image not available</p>
                                  {modalRetryCount < 3 && (
                                    <button
                                      onClick={handleModalRetry}
                                      className="inline-flex items-center space-x-2 text-sm text-secondary hover:text-secondary-light transition-colors"
                                    >
                                      <RefreshCw className="h-4 w-4" />
                                      <span>Retry ({modalRetryCount}/3)</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="relative h-full w-full">
                                {modalImageLoading && (
                                  <div className="absolute inset-0 flex items-center justify-center bg-neutral-light/20 dark:bg-neutral-dark/20 z-10 backdrop-blur-sm">
                                    <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-secondary"></div>
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
                                <div className="absolute inset-0 bg-gradient-to-t from-background-black/20 via-transparent to-transparent"></div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Impact Summary Card */}
                      <div className="rounded-xl bg-gradient-to-br from-secondary/5 to-accent/5 dark:from-secondary/10 dark:to-accent/10 p-6 border border-secondary/20">
                        <h4 className="text-xl font-bold text-text-dark dark:text-text-light mb-3 flex items-center">
                          <Award className="mr-2 h-5 w-5 text-secondary" />
                          Impact Summary
                        </h4>
                        <p className="text-text-dark/80 dark:text-text-light/80 leading-relaxed">
                          {innovator.impact}
                        </p>
                      </div>
                    </div>
                    
                    {/* Right Column: Details */}
                    <div className="space-y-6">
                      {/* About Section */}
                      <div className="rounded-xl bg-white/50 dark:bg-black/20 p-6 backdrop-blur-sm border border-white/20 dark:border-black/20">
                        <h4 className="text-2xl font-bold text-text-dark dark:text-text-light mb-4 flex items-center">
                          <User className="mr-2 h-6 w-6 text-secondary" />
                          About {innovator.name}
                        </h4>
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <p className="text-text-dark/80 dark:text-text-light/80 leading-relaxed">
                            {innovator.bio || innovator.impact}
                          </p>
                        </div>
                      </div>
                      
                      {/* Achievements Section */}
                      {achievementsList.length > 0 && (
                        <div className="rounded-xl bg-white/50 dark:bg-black/20 p-6 backdrop-blur-sm border border-white/20 dark:border-black/20">
                          <h4 className="text-2xl font-bold text-text-dark dark:text-text-light mb-4 flex items-center">
                            <Award className="mr-2 h-6 w-6 text-accent" />
                            Key Achievements
                          </h4>
                          <ul className="space-y-3">
                            {achievementsList.map((achievement, index) => (
                              <li key={index} className="flex items-start group">
                                <div className="flex-shrink-0 h-2 w-2 rounded-full bg-secondary mt-2 mr-3 group-hover:bg-accent transition-colors"></div>
                                <span className="text-text-dark/80 dark:text-text-light/80 leading-relaxed">
                                  {achievement}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {/* Quick Stats */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-xl bg-gradient-to-br from-secondary/10 to-secondary/5 dark:from-secondary/20 dark:to-secondary/10 p-4 text-center border border-secondary/20">
                          <div className="text-2xl font-bold text-secondary mb-1">
                            {innovator.featured ? 'Featured' : 'Member'}
                          </div>
                          <div className="text-sm text-text-dark/60 dark:text-text-light/60">
                            Status
                          </div>
                        </div>
                        <div className="rounded-xl bg-gradient-to-br from-accent/10 to-accent/5 dark:from-accent/20 dark:to-accent/10 p-4 text-center border border-accent/20">
                          <div className="text-2xl font-bold text-accent-dark mb-1">
                            {innovator.hasVideo ? 'Available' : 'Coming Soon'}
                          </div>
                          <div className="text-sm text-text-dark/60 dark:text-text-light/60">
                            Video Content
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Enhanced Footer Actions */}
                  <div className="mt-8 pt-6 border-t border-neutral-light/20 dark:border-neutral-dark/20">
                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                      <a
                        href="/apply"
                        className="inline-flex items-center space-x-2 rounded-full bg-secondary px-6 py-3 text-white font-medium transition-all hover:bg-secondary-light hover:scale-105 shadow-lg hover:shadow-xl"
                      >
                        <User className="h-5 w-5" />
                        <span>Join Our Network</span>
                      </a>
                      <a
                        href="/challenges"
                        className="inline-flex items-center space-x-2 rounded-full bg-transparent border-2 border-accent px-6 py-3 text-accent font-medium transition-all hover:bg-accent hover:text-white hover:scale-105"
                      >
                        <Briefcase className="h-5 w-5" />
                        <span>View Challenges</span>
                      </a>
                    </div>
                    <div className="mt-4 text-center text-sm text-text-dark/60 dark:text-text-light/60">
                      Inspired by {innovator.name}'s work? Connect with innovators like them.
                    </div>
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
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [hasVideoOnly, setHasVideoOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'role' | 'featured' | 'newest'>('featured');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedInnovator, setSelectedInnovator] = useState<InnovatorData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  const [imageLoading, setImageLoading] = useState<Set<number>>(new Set());
  const [imageRetryCount, setImageRetryCount] = useState<Map<number, number>>(new Map());
  const trpc = useTRPC();

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchTerm]);
  
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
  
  // Fetch innovators using tRPC with debounced search
  const innovatorsQuery = useQuery(
    trpc.getInnovators.queryOptions(
      {
        limit: 50,
        featuredOnly,
        hasVideo: hasVideoOnly || undefined,
        searchTerm: debouncedSearchTerm || undefined,
      },
      {
        refetchOnWindowFocus: false,
        staleTime: 1000 * 60 * 5, // 5 minutes
      }
    )
  );

  // Enhanced sorting and filtering logic
  const sortedAndFilteredInnovators = useMemo(() => {
    if (!innovatorsQuery.data?.innovators) return [];
    
    let filtered = [...innovatorsQuery.data.innovators];
    
    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'role':
          comparison = a.role.localeCompare(b.role);
          break;
        case 'featured':
          comparison = (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
          break;
        case 'newest':
          comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          break;
        default:
          comparison = a.order - b.order;
      }
      
      return sortOrder === 'desc' ? -comparison : comparison;
    });
    
    return filtered;
  }, [innovatorsQuery.data?.innovators, sortBy, sortOrder]);

  // Enhanced filter clearing function
  const clearAllFilters = useCallback(() => {
    setSearchTerm("");
    setDebouncedSearchTerm("");
    setFeaturedOnly(false);
    setHasVideoOnly(false);
    setSortBy('featured');
    setSortOrder('asc');
  }, []);

  // Active filters count calculation
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (debouncedSearchTerm) count++;
    if (featuredOnly) count++;
    if (hasVideoOnly) count++;
    return count;
  }, [debouncedSearchTerm, featuredOnly, hasVideoOnly]);
  
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

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-black pt-24">
      {/* Enhanced Hero Section */}
      <section className="section-padding bg-gradient-to-br from-background-light via-neutral-light/10 to-background-light dark:from-background-black dark:via-neutral-dark/10 dark:to-background-black">
        <div className="mx-auto max-w-7xl container-padding">
          <div className="text-center mb-16">
            <h1 className="mb-8 text-6xl font-extrabold leading-tight text-text-dark dark:text-text-light md:text-7xl lg:text-8xl animate-fadeIn">
              Meet Our <span className="bg-gradient-to-r from-secondary to-accent bg-clip-text text-transparent">Innovators</span>
            </h1>
            <p className="mx-auto max-w-4xl text-xl font-light text-text-dark/80 dark:text-text-light/80 md:text-2xl animate-fadeIn animation-delay-150">
              Discover the brilliant minds from around the world who are transforming how we approach humanity's most pressing challenges through innovation and collaboration.
            </p>
          </div>
        </div>
      </section>

      {/* Enhanced Search and Filters */}
      <section className="sticky top-20 z-30 bg-background-light/95 dark:bg-background-black/95 backdrop-blur-md border-b border-neutral-light/20 dark:border-neutral-dark/20">
        <div className="mx-auto max-w-7xl container-padding py-6">
          {/* Main Search Bar */}
          <div className="mb-6">
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-dark/40 dark:text-text-light/40" />
              <input
                type="text"
                placeholder="Search innovators by name, role, expertise, or impact..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-2xl border-0 bg-neutral-light/30 dark:bg-neutral-dark/30 py-4 pl-12 pr-6 text-text-dark dark:text-text-light placeholder-text-dark/40 dark:placeholder-text-light/40 shadow-sm focus:ring-2 focus:ring-secondary transition-all duration-300 hover:shadow-md"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-neutral-light/50 dark:hover:bg-neutral-dark/50 transition-colors"
                >
                  <X className="h-4 w-4 text-text-dark/60 dark:text-text-light/60" />
                </button>
              )}
            </div>
          </div>

          {/* Filter and Sort Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Left side: Filters */}
            <div className="flex flex-wrap items-center gap-4">
              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center space-x-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ${
                  showFilters || activeFiltersCount > 0
                    ? 'bg-secondary text-white shadow-md'
                    : 'bg-neutral-light/50 dark:bg-neutral-dark/50 text-text-dark dark:text-text-light hover:bg-neutral-light dark:hover:bg-neutral-dark'
                }`}
              >
                <Filter className="h-4 w-4" />
                <span>Filters</span>
                {activeFiltersCount > 0 && (
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              {/* Quick Filters */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFeaturedOnly(!featuredOnly)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-all duration-200 ${
                    featuredOnly
                      ? 'bg-accent text-white shadow-md'
                      : 'bg-neutral-light/50 dark:bg-neutral-dark/50 text-text-dark dark:text-text-light hover:bg-neutral-light dark:hover:bg-neutral-dark'
                  }`}
                >
                  Featured Only
                </button>
                
                <button
                  onClick={() => setHasVideoOnly(!hasVideoOnly)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-all duration-200 ${
                    hasVideoOnly
                      ? 'bg-secondary text-white shadow-md'
                      : 'bg-neutral-light/50 dark:bg-neutral-dark/50 text-text-dark dark:text-text-light hover:bg-neutral-light dark:hover:bg-neutral-dark'
                  }`}
                >
                  Has Video
                </button>
              </div>

              {/* Active Filters */}
              {activeFiltersCount > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="text-xs text-text-dark/60 dark:text-text-light/60 hover:text-secondary transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>

            {/* Right side: Sort and View */}
            <div className="flex items-center gap-4">
              {/* Sort Options */}
              <div className="relative">
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [newSortBy, newSortOrder] = e.target.value.split('-') as [typeof sortBy, typeof sortOrder];
                    setSortBy(newSortBy);
                    setSortOrder(newSortOrder);
                  }}
                  className="appearance-none rounded-lg bg-neutral-light/50 dark:bg-neutral-dark/50 px-3 py-2 pr-8 text-sm text-text-dark dark:text-text-light border-0 focus:ring-2 focus:ring-secondary"
                >
                  <option value="featured-asc">Featured First</option>
                  <option value="name-asc">Name A-Z</option>
                  <option value="name-desc">Name Z-A</option>
                  <option value="role-asc">Role A-Z</option>
                  <option value="newest-desc">Newest First</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-text-dark/60 dark:text-text-light/60 pointer-events-none" />
              </div>

              {/* View Mode Toggle */}
              <div className="flex rounded-lg bg-neutral-light/50 dark:bg-neutral-dark/50 p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`rounded-md p-2 transition-all duration-200 ${
                    viewMode === 'grid'
                      ? 'bg-secondary text-white shadow-sm'
                      : 'text-text-dark/60 dark:text-text-light/60 hover:text-text-dark dark:hover:text-text-light'
                  }`}
                >
                  <Grid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`rounded-md p-2 transition-all duration-200 ${
                    viewMode === 'list'
                      ? 'bg-secondary text-white shadow-sm'
                      : 'text-text-dark/60 dark:text-text-light/60 hover:text-text-dark dark:hover:text-text-light'
                  }`}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>

              {/* Results Count */}
              <div className="text-sm text-text-dark/60 dark:text-text-light/60">
                {sortedAndFilteredInnovators.length} results
              </div>
            </div>
          </div>

          {/* Expandable Filters */}
          {showFilters && (
            <div className="mt-6 rounded-xl bg-neutral-light/30 dark:bg-neutral-dark/30 p-6 animate-slideUp">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                    Status
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={featuredOnly}
                        onChange={(e) => setFeaturedOnly(e.target.checked)}
                        className="mr-2 rounded border-gray-300 text-secondary focus:ring-secondary"
                      />
                      <span className="text-sm text-text-dark dark:text-text-light">Featured Innovators</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={hasVideoOnly}
                        onChange={(e) => setHasVideoOnly(e.target.checked)}
                        className="mr-2 rounded border-gray-300 text-secondary focus:ring-secondary"
                      />
                      <span className="text-sm text-text-dark dark:text-text-light">Has Video Content</span>
                    </label>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                    Sort By
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: 'featured', label: 'Featured Status' },
                      { value: 'name', label: 'Name' },
                      { value: 'role', label: 'Role' },
                      { value: 'newest', label: 'Date Added' },
                    ].map((option) => (
                      <label key={option.value} className="flex items-center">
                        <input
                          type="radio"
                          name="sortBy"
                          value={option.value}
                          checked={sortBy === option.value}
                          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                          className="mr-2 text-secondary focus:ring-secondary"
                        />
                        <span className="text-sm text-text-dark dark:text-text-light">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                    Order
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="sortOrder"
                        value="asc"
                        checked={sortOrder === 'asc'}
                        onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
                        className="mr-2 text-secondary focus:ring-secondary"
                      />
                      <span className="text-sm text-text-dark dark:text-text-light">Ascending</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="sortOrder"
                        value="desc"
                        checked={sortOrder === 'desc'}
                        onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
                        className="mr-2 text-secondary focus:ring-secondary"
                      />
                      <span className="text-sm text-text-dark dark:text-text-light">Descending</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Enhanced Innovators Grid */}
      <section className="section-padding">
        <div className="mx-auto max-w-7xl container-padding">
          {innovatorsQuery.isLoading ? (
            <div className={`grid gap-8 ${
              viewMode === 'grid'
                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'
                : 'grid-cols-1'
            }`}>
              {Array.from({ length: 12 }).map((_, index) => (
                <div 
                  key={index} 
                  className={`animate-pulse rounded-xl bg-neutral-light/20 dark:bg-neutral-dark/20 ${
                    viewMode === 'grid' ? 'h-[480px]' : 'h-32'
                  } animate-fadeIn`}
                  style={{ animationDelay: `${index * 50}ms` }}
                />
              ))}
            </div>
          ) : innovatorsQuery.isError ? (
            <div className="text-center py-24 animate-fadeIn">
              <div className="mx-auto max-w-md">
                <AlertTriangle className="mx-auto h-20 w-20 text-red-500 mb-6" />
                <h3 className="text-3xl font-bold text-text-dark dark:text-text-light mb-4">Unable to load innovators</h3>
                <p className="text-text-dark/60 dark:text-text-light/60 mb-6">
                  We're having trouble connecting to our servers. Please check your internet connection and try again.
                </p>
                <button
                  onClick={() => innovatorsQuery.refetch()}
                  className="inline-flex items-center space-x-2 px-6 py-3 bg-secondary text-white rounded-full hover:bg-secondary-light transition-all hover:scale-105 shadow-md"
                >
                  <RefreshCw className="h-5 w-5" />
                  <span>Try Again</span>
                </button>
              </div>
            </div>
          ) : sortedAndFilteredInnovators?.length === 0 ? (
            <div className="text-center py-24 animate-fadeIn">
              <div className="mx-auto max-w-md">
                <User className="mx-auto h-20 w-20 text-text-dark/40 dark:text-text-light/40 mb-6" />
                <h3 className="text-3xl font-bold text-text-dark dark:text-text-light mb-4">No innovators found</h3>
                <p className="text-text-dark/60 dark:text-text-light/60 mb-6">
                  We couldn't find any innovators matching your search criteria. Try adjusting your filters or search terms.
                </p>
                <button
                  onClick={clearAllFilters}
                  className="inline-flex items-center space-x-2 px-6 py-3 bg-secondary text-white rounded-full hover:bg-secondary-light transition-all hover:scale-105 shadow-md"
                >
                  <Filter className="h-5 w-5" />
                  <span>Clear All Filters</span>
                </button>
              </div>
            </div>
          ) : (
            <div className={`grid gap-8 ${
              viewMode === 'grid'
                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'
                : 'grid-cols-1 max-w-4xl mx-auto'
            }`}>
              {sortedAndFilteredInnovators?.map((innovator, index) => {
                const innovatorImageUrl = getInnovatorImageUrl(innovator);
                const hasImageError = imageErrors.has(innovator.id);
                const isImageLoading = imageLoading.has(innovator.id);
                const retryCount = imageRetryCount.get(innovator.id) || 0;
                
                if (viewMode === 'list') {
                  // List view layout
                  return (
                    <div 
                      key={innovator.id}
                      className="group cursor-pointer overflow-hidden rounded-xl bg-background-light dark:bg-neutral-dark/30 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] animate-fadeIn"
                      style={{ animationDelay: `${index * 50}ms` }}
                      onClick={() => handleInnovatorClick(innovator)}
                    >
                      <div className="flex items-center p-6 space-x-6">
                        {/* Avatar */}
                        <div className="flex-shrink-0 h-20 w-20 relative overflow-hidden rounded-xl bg-neutral-light/10 dark:bg-neutral-dark/10">
                          {hasImageError ? (
                            <div className="h-full w-full flex items-center justify-center">
                              <User className="h-8 w-8 text-text-dark/40 dark:text-text-light/40" />
                            </div>
                          ) : (
                            <div className="relative h-full w-full">
                              {isImageLoading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-neutral-light/20 dark:bg-neutral-dark/20 z-10">
                                  <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-t-2 border-secondary"></div>
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
                            </div>
                          )}
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="text-xl font-bold text-text-dark dark:text-text-light group-hover:text-secondary transition-colors truncate">
                              {innovator.name}
                            </h3>
                            <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
                              {innovator.featured && (
                                <span className="inline-block rounded-full bg-accent px-2 py-1 text-xs font-medium text-white">
                                  Featured
                                </span>
                              )}
                              {innovator.hasVideo && (
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary/20 text-secondary">
                                  <Play size={14} />
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="mb-2 flex items-center text-sm text-secondary">
                            <Briefcase className="mr-1 h-4 w-4" />
                            <span>{innovator.role}</span>
                          </div>
                          <p className="text-sm text-text-dark/80 dark:text-text-light/80 line-clamp-2">
                            {innovator.impact}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                }
                
                // Grid view layout (enhanced)
                return (
                  <div 
                    key={innovator.id}
                    className="group cursor-pointer overflow-hidden rounded-xl bg-background-light dark:bg-neutral-dark/30 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl animate-fadeIn"
                    style={{ animationDelay: `${index * 50}ms` }}
                    onClick={() => handleInnovatorClick(innovator)}
                  >
                    {/* Enhanced Image Container */}
                    <div className="aspect-[4/5] relative overflow-hidden bg-neutral-light/10 dark:bg-neutral-dark/10">
                      {hasImageError ? (
                        <div className="h-full w-full flex flex-col items-center justify-center bg-neutral-light/20 dark:bg-neutral-dark/20 space-y-3">
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
                              className="text-xs text-secondary hover:text-secondary-light flex items-center space-x-1 transition-colors"
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
                              className={`h-full w-full object-cover transition-all duration-300 group-hover:scale-105 ${
                                isImageLoading ? 'opacity-0' : 'opacity-100'
                              }`}
                              onError={() => handleImageError(innovator.id, innovator.avatar)}
                              onLoad={() => handleImageLoad(innovator.id)}
                              onLoadStart={() => handleImageLoadStart(innovator.id)}
                              loading="lazy"
                            />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-background-black/60 via-background-black/20 to-transparent"></div>
                        </div>
                      )}
                      
                      {/* Enhanced Badges */}
                      <div className="absolute top-4 right-4 flex flex-col space-y-2">
                        {innovator.featured && (
                          <span className="inline-block rounded-full bg-accent px-3 py-1 text-xs font-medium text-white shadow-lg backdrop-blur-sm">
                            ⭐ Featured
                          </span>
                        )}
                      </div>
                      
                      {/* Enhanced Play button for videos */}
                      {innovator.hasVideo && !hasImageError && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:backdrop-blur-sm">
                          <button className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary/90 text-white transition-all hover:scale-110 hover:bg-secondary shadow-xl">
                            <Play size={24} className="ml-1" />
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {/* Enhanced Content */}
                    <div className="p-6">
                      <h3 className="mb-2 text-xl font-bold text-text-dark dark:text-text-light group-hover:text-secondary transition-colors line-clamp-1">
                        {innovator.name}
                      </h3>
                      <div className="mb-3 flex items-center text-sm text-secondary">
                        <Briefcase className="mr-1 h-4 w-4" />
                        <span className="line-clamp-1">{innovator.role}</span>
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

      {/* Enhanced Call to Action */}
      <section className="section-padding bg-gradient-to-br from-secondary/5 via-accent/5 to-secondary/5 dark:from-secondary/10 dark:via-accent/10 dark:to-secondary/10">
        <div className="mx-auto max-w-7xl container-padding">
          <div className="text-center">
            <h2 className="mb-6 text-4xl font-bold text-text-dark dark:text-text-light lg:text-5xl">
              Ready to Join Our Network?
            </h2>
            <p className="mb-8 text-xl text-text-dark/80 dark:text-text-light/80 max-w-3xl mx-auto">
              Are you working on breakthrough solutions to global challenges? Apply to join our community of innovators and connect with like-minded changemakers from around the world.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <a
                href="/apply"
                className="inline-flex items-center space-x-2 rounded-full bg-secondary px-8 py-4 text-lg font-medium text-white transition-all hover:bg-secondary-light hover:scale-105 shadow-lg hover:shadow-xl"
              >
                <User className="h-5 w-5" />
                <span>Apply as Innovator</span>
              </a>
              <a
                href="/challenges"
                className="inline-flex items-center space-x-2 rounded-full bg-transparent border-2 border-secondary px-8 py-4 text-lg font-medium text-secondary transition-all hover:bg-secondary hover:text-white hover:scale-105"
              >
                <Briefcase className="h-5 w-5" />
                <span>View Challenges</span>
              </a>
            </div>
            <div className="mt-8 text-sm text-text-dark/60 dark:text-text-light/60">
              Join {sortedAndFilteredInnovators.length}+ innovators already making an impact
            </div>
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
