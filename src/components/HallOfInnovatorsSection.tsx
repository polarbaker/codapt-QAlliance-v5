import { useState, Fragment, useEffect, useCallback } from "react";
import { X, Award, User, RefreshCw } from "lucide-react";
import { useTRPC } from "~/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, Transition } from "@headlessui/react";
import { getCacheBustedImageUrl, isValidImagePath } from "~/utils/common";
import { useBulkSiteContentText } from "~/hooks/useSiteContentText";

// Type for innovator data from API
interface InnovatorData {
  id: number;
  name: string;
  role: string;
  impact: string;
  avatar: string; // Now a file path instead of a URL
  hasVideo: boolean;
  videoUrl?: string | null;
  bio?: string | null;
  achievements?: string | null;
  featured: boolean;
  createdAt: Date;
  updatedAt: Date; // Add updatedAt for cache busting
  order: number;
}

interface InnovatorCardProps {
  innovator: InnovatorData;
  onClick: (innovator: InnovatorData) => void;
}

function InnovatorCard({ innovator, onClick }: InnovatorCardProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  // Enhanced image event handlers with retry logic
  const handleImageError = useCallback(() => {
    console.warn(`Image load failed for ${innovator.name}:`, innovator.avatar);
    setImageError(true);
    setImageLoading(false);
    
    // Auto-retry logic (up to 2 times)
    if (retryCount < 2) {
      const retryDelay = Math.pow(2, retryCount) * 1000; // Exponential backoff
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        setImageError(false);
        setImageLoading(true);
        
        // Force image reload by updating the key
        const imgElement = document.querySelector(`img[data-card-innovator-id="${innovator.id}"]`) as HTMLImageElement;
        if (imgElement) {
          const newSrc = getCacheBustedImageUrl(innovator.avatar, new Date());
          imgElement.src = newSrc;
        }
      }, retryDelay);
    }
  }, [innovator.name, innovator.avatar, retryCount]);

  const handleImageLoad = useCallback(() => {
    setImageError(false);
    setImageLoading(false);
    setRetryCount(0); // Reset retry count on success
  }, []);

  const handleImageLoadStart = useCallback(() => {
    setImageLoading(true);
    setImageError(false);
  }, []);

  const handleManualRetry = useCallback(() => {
    setRetryCount(prev => prev + 1);
    setImageError(false);
    setImageLoading(true);
  }, []);

  // Enhanced image URL generation with validation
  const getInnovatorImageUrl = useCallback(() => {
    if (!innovator.avatar || !isValidImagePath(innovator.avatar)) {
      console.warn('Invalid avatar path for innovator:', innovator.name, innovator.avatar);
      return '';
    }
    return getCacheBustedImageUrl(innovator.avatar, innovator.updatedAt);
  }, [innovator.avatar, innovator.name, innovator.updatedAt]);

  const innovatorImageUrl = getInnovatorImageUrl();

  return (
    <div 
      className="group cursor-pointer overflow-hidden rounded-lg bg-background-light dark:bg-neutral-dark/30 transition-all duration-300 hover:-translate-y-2"
      onClick={() => onClick(innovator)}
    >
      {/* Image */}
      <div className="aspect-[3/4] relative overflow-hidden">
        {imageError ? (
          <div className="h-full w-full flex flex-col items-center justify-center bg-neutral-light/20 dark:bg-neutral-dark/20 space-y-2">
            <User className="h-16 w-16 text-text-dark/40 dark:text-text-light/40" />
            <p className="text-xs text-text-dark/60 dark:text-text-light/60 text-center px-2">
              Image not available
            </p>
            {retryCount < 3 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleManualRetry();
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
            {imageLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-neutral-light/20 dark:bg-neutral-dark/20 z-10">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-secondary"></div>
              </div>
            )}
            {innovatorImageUrl && (
              <img
                data-card-innovator-id={innovator.id}
                src={innovatorImageUrl}
                alt={`${innovator.name} - ${innovator.role}`}
                className={`h-full w-full object-cover transition-opacity duration-300 ${
                  imageLoading ? 'opacity-0' : 'opacity-100'
                }`}
                onError={handleImageError}
                onLoad={handleImageLoad}
                onLoadStart={handleImageLoadStart}
                loading="lazy"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background-black via-background-black/40 to-transparent"></div>
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="p-6">
        <h3 className="mb-2 text-2xl font-bold text-text-dark dark:text-text-light">{innovator.name}</h3>
        <p className="mb-3 text-sm font-medium text-secondary">{innovator.role}</p>
        <p className="text-sm text-text-dark/70 dark:text-text-light/70">{innovator.impact}</p>
      </div>
    </div>
  );
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
  
  // Enhanced modal image event handlers
  const handleModalImageError = useCallback(() => {
    console.warn(`Modal image load failed for ${innovator.name}:`, innovator.avatar);
    setModalImageError(true);
    setModalImageLoading(false);
    
    // Auto-retry logic for modal
    if (modalRetryCount < 2) {
      const retryDelay = Math.pow(2, modalRetryCount) * 1000;
      setTimeout(() => {
        setModalRetryCount(prev => prev + 1);
        setModalImageError(false);
        setModalImageLoading(true);
        
        // Force image reload
        const imgElements = document.querySelectorAll(`img[data-modal-innovator-id="${innovator.id}"]`);
        imgElements.forEach(img => {
          const imgEl = img as HTMLImageElement;
          const newSrc = getCacheBustedImageUrl(innovator.avatar, new Date());
          imgEl.src = newSrc;
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
  const getModalImageUrl = useCallback(() => {
    if (!innovator.avatar || !isValidImagePath(innovator.avatar)) {
      console.warn('Invalid avatar path for modal:', innovator.name, innovator.avatar);
      return '';
    }
    return getCacheBustedImageUrl(innovator.avatar, innovator.updatedAt);
  }, [innovator.avatar, innovator.name, innovator.updatedAt]);

  const modalImageUrl = getModalImageUrl();

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
                  {/* Left column: Large image display instead of video */}
                  <div>
                    <div className="aspect-[4/5] overflow-hidden rounded-lg bg-neutral-dark/20 relative">
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
                          {modalImageUrl && (
                            <img
                              data-modal-innovator-id={innovator.id}
                              src={modalImageUrl}
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
                  </div>
                  
                  {/* Right column: Innovator details */}
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
                            {modalImageUrl && (
                              <img
                                data-modal-innovator-id={innovator.id}
                                src={modalImageUrl}
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

export default function HallOfInnovatorsSection() {
  const [selectedInnovator, setSelectedInnovator] = useState<InnovatorData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const trpc = useTRPC();
  
  // Fetch innovators section text content
  const { texts: innovatorsTexts } = useBulkSiteContentText([
    'innovators_title',
    'innovators_description',
    'innovators_button_text',
  ]);
  
  // Fetch innovators using tRPC
  const innovatorsQuery = useQuery(
    trpc.getInnovators.queryOptions(
      {
        featuredOnly: true,
        limit: 4
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

  // Sort innovators by order if data is available
  const sortedInnovators = innovatorsQuery.data?.innovators.slice().sort((a, b) => a.order - b.order);

  return (
    <section
      id="innovators"
      className="section-padding relative overflow-hidden bg-background-light dark:bg-background-black"
    >
      <div className="mx-auto max-w-7xl container-padding">
        <div className="mb-16 max-w-3xl">
          <h2 className="mb-8 text-5xl font-extrabold leading-tight text-text-dark dark:text-text-light md:text-6xl">
            {innovatorsTexts.innovators_title}
          </h2>
          <p className="text-xl font-light text-text-dark/80 dark:text-text-light/80 md:text-2xl">
            {innovatorsTexts.innovators_description}
          </p>
        </div>

        {/* Innovator Cards */}
        <div className="mb-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {innovatorsQuery.isLoading ? (
            // Loading state
            Array.from({ length: 4 }).map((_, index) => (
              <div 
                key={index} 
                className="animate-pulse rounded-lg bg-neutral-light/20 dark:bg-neutral-dark/20 h-[400px]"
              ></div>
            ))
          ) : innovatorsQuery.isError ? (
            // Error state
            <div className="col-span-full rounded-lg bg-red-500/10 p-6 text-center text-red-500">
              <p className="mb-2">Error loading innovators: {innovatorsQuery.error.message}</p>
              <button
                onClick={() => innovatorsQuery.refetch()}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Retry</span>
              </button>
            </div>
          ) : (
            // Loaded state - use sorted innovators
            sortedInnovators?.map((innovator) => (
              <InnovatorCard
                key={innovator.id}
                innovator={innovator}
                onClick={handleInnovatorClick}
              />
            ))
          )}
        </div>

        <div className="text-center">
          <a
            href="/innovators"
            className="inline-block rounded-full bg-secondary px-8 py-4 text-lg font-medium text-white transition-all hover:bg-secondary-light hover:scale-105"
            aria-label="View all innovators in our network"
          >
            {innovatorsTexts.innovators_button_text}
          </a>
        </div>
      </div>
      
      {/* Innovator Modal */}
      <InnovatorModal 
        innovator={selectedInnovator} 
        isOpen={isModalOpen} 
        onClose={closeModal} 
      />
    </section>
  );
}
