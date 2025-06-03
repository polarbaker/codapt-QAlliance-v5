import { useState, Fragment, useEffect } from "react";
import { Play, X, Award, User } from "lucide-react";
import { useTRPC } from "~/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, Transition } from "@headlessui/react";
import { getCacheBustedImageUrl } from "~/utils";

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

  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };

  const handleImageLoad = () => {
    setImageError(false);
    setImageLoading(false);
  };

  const handleImageLoadStart = () => {
    setImageLoading(true);
    setImageError(false);
  };

  return (
    <div 
      className="group cursor-pointer overflow-hidden rounded-lg bg-background-light dark:bg-neutral-dark/30 transition-all duration-300 hover:-translate-y-2"
      onClick={() => onClick(innovator)}
    >
      {/* Image */}
      <div className="aspect-[3/4] relative overflow-hidden">
        {imageError ? (
          <div className="h-full w-full flex items-center justify-center bg-neutral-light/20 dark:bg-neutral-dark/20">
            <User className="h-16 w-16 text-text-dark/40 dark:text-text-light/40" />
          </div>
        ) : (
          <div className="relative h-full w-full">
            {imageLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-neutral-light/20 dark:bg-neutral-dark/20 z-10">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-secondary"></div>
              </div>
            )}
            <img
              src={getCacheBustedImageUrl(innovator.avatar, innovator.updatedAt)}
              alt={`${innovator.name} - ${innovator.role}`}
              className={`h-full w-full object-cover transition-opacity duration-300 ${
                imageLoading ? 'opacity-0' : 'opacity-100'
              }`}
              onError={handleImageError}
              onLoad={handleImageLoad}
              onLoadStart={handleImageLoadStart}
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background-black via-background-black/40 to-transparent"></div>
          </div>
        )}
        
        {/* Play button for videos */}
        {innovator.hasVideo && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <button className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-white transition-transform hover:scale-110">
              <Play size={32} className="ml-1" />
            </button>
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
  
  // Reset image states when modal opens with new innovator
  useEffect(() => {
    if (isOpen && innovator) {
      setModalImageError(false);
      setModalImageLoading(true);
    }
  }, [isOpen, innovator?.id]);
  
  if (!innovator) return null;
  
  // Handle modal image loading events
  const handleModalImageError = () => {
    setModalImageError(true);
    setModalImageLoading(false);
  };

  const handleModalImageLoad = () => {
    setModalImageError(false);
    setModalImageLoading(false);
  };

  const handleModalImageLoadStart = () => {
    setModalImageLoading(true);
    setModalImageError(false);
  };
  
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
                      <div className="aspect-video overflow-hidden rounded-lg bg-neutral-dark/20">
                        {modalImageError ? (
                          <div className="h-full w-full flex items-center justify-center">
                            <User className="h-16 w-16 text-text-light/40" />
                          </div>
                        ) : (
                          <div className="relative h-full w-full">
                            {modalImageLoading && (
                              <div className="absolute inset-0 flex items-center justify-center bg-neutral-dark/20 z-10">
                                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-secondary"></div>
                              </div>
                            )}
                            <img
                              src={getCacheBustedImageUrl(innovator.avatar, innovator.updatedAt)}
                              alt={`${innovator.name} - ${innovator.role}`}
                              className={`h-full w-full object-cover transition-opacity duration-300 ${
                                modalImageLoading ? 'opacity-0' : 'opacity-100'
                              }`}
                              onError={handleModalImageError}
                              onLoad={handleModalImageLoad}
                              onLoadStart={handleModalImageLoadStart}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <div className="mb-4 flex items-center">
                      <div className="mr-4 h-12 w-12 rounded-full overflow-hidden bg-neutral-dark/20">
                        {modalImageError ? (
                          <div className="h-full w-full flex items-center justify-center">
                            <User className="h-6 w-6 text-text-light/40" />
                          </div>
                        ) : (
                          <img
                            src={getCacheBustedImageUrl(innovator.avatar, innovator.updatedAt)}
                            alt={`${innovator.name} avatar`}
                            className="h-full w-full object-cover"
                            onError={handleModalImageError}
                          />
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
            Meet Our Innovators
          </h2>
          <p className="text-xl font-light text-text-dark/80 dark:text-text-light/80 md:text-2xl">
            Brilliant minds from around the world transforming how we approach humanity's most pressing challenges.
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
              Error loading innovators: {innovatorsQuery.error.message}
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
            View All Innovators
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
